"""
EquationAI — Upload Route
Equation image upload, OCR recognition, and processing.
"""

import re
import uuid
import time
from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
from PIL import Image
import io

from app.database import get_db
from app.api.deps import get_current_user_optional
from app.models.user import User
from app.schemas.upload import UploadResponse, SimilarityResult, ValidationResult
from app.services.ocr_service import ocr_service
from app.services.conversion_service import latex_to_mathml
from app.services.validation_service import validate_latex
from app.services.equation_classifier import classify_equation
from app.services import history_service, analytics_service
from app.services.search_service import SearchService
from app.services import file_service
from app.core.exceptions import ProcessingError, FileTypeError
from app.core.logging_config import get_logger

logger = get_logger("upload")

# Predefined similarity database
FORMULA_DATABASE = [
    {"title": "Pythagorean Theorem", "latex": r"a^2 + b^2 = c^2", "source": "Euclidean Geometry"},
    {"title": "Law of Cosines", "latex": r"c^2 = a^2 + b^2 - 2ab \cos(C)", "source": "Trigonometry"},
    {"title": "Einstein's Mass-Energy Equivalence", "latex": r"E = m c^2", "source": "General Relativity"},
    {"title": "Quadratic Formula", "latex": r"x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}", "source": "Algebra"},
    {"title": "Euler's Identity", "latex": r"e^{i\pi} + 1 = 0", "source": "Complex Analysis"},
    {"title": "Fourier Transform", "latex": r"\hat{f}(\xi) = \int_{-\infty}^{\infty} f(x)\,e^{-2 \pi i \xi x} \,dx", "source": "Fourier Analysis"},
    {"title": "Gaussian Integral", "latex": r"\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}", "source": "Calculus"},
    {"title": "Area of a Circle", "latex": r"A = \pi r^2", "source": "Geometry"},
]


def _get_char_set(s: str) -> set:
    cleaned = s.replace(" ", "").replace("\\", "").replace("{", "").replace("}", "").replace("^", "").replace("_", "")
    return set(cleaned)


def _jaccard_similarity(s1: str, s2: str) -> float:
    set1, set2 = _get_char_set(s1), _get_char_set(s2)
    if not set1 or not set2:
        return 0.0
    return len(set1 & set2) / len(set1 | set2)


router = APIRouter(tags=["Upload"])


@router.post("/upload", response_model=UploadResponse)
async def process_equation_upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_optional),
):
    """Upload an equation image for AI-powered OCR recognition."""
    start_time = time.time()

    # Validate and save file
    file_path, original_name, file_bytes = await file_service.save_upload(file)

    # Determine file type
    ext = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""

    # Load image
    if ext in ("png", "jpg", "jpeg"):
        try:
            image = Image.open(io.BytesIO(file_bytes))
            if image.mode != "RGB":
                image = image.convert("RGB")
        except Exception as e:
            raise ProcessingError(str(e), operation="Image loading")
    elif ext == "pdf":
        try:
            import fitz  # PyMuPDF

            pdf_doc = fitz.open(stream=file_bytes, filetype="pdf")
            if pdf_doc.page_count == 0:
                raise ProcessingError("No pages found in PDF", operation="PDF processing")
            page = pdf_doc[0]
            pix = page.get_pixmap(dpi=300)
            img_bytes = pix.tobytes("png")
            pdf_doc.close()
            image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        except ImportError:
            raise ProcessingError(
                "PDF processing requires PyMuPDF. Install it with: pip install PyMuPDF",
                operation="PDF processing",
            )
    else:
        raise FileTypeError(ext, ["png", "jpg", "jpeg", "pdf"])

    # Run OCR
    recognized_latex = ocr_service.recognize(image)

    # Validate the recognized LaTeX
    validation = validate_latex(recognized_latex)
    validation_result = ValidationResult(
        is_valid=validation.is_valid,
        errors=validation.errors,
        warnings=validation.warnings,
        suggested_fix=validation.suggested_fix,
    )

    # Convert to MathML
    generated_mathml = latex_to_mathml(recognized_latex)

    # Classify and index
    category, explanation = classify_equation(recognized_latex)
    try:
        words = re.findall(r'\b[a-zA-Z]{3,}\b', (recognized_latex + " " + explanation).lower())
        tags = list(set(words))[:6]
        SearchService.index_equation(recognized_latex, category, explanation, tags)
    except Exception:
        pass

    # Similarity search
    similarity_results = []
    for formula in FORMULA_DATABASE:
        score = _jaccard_similarity(recognized_latex, formula["latex"])
        if score > 0.15:
            similarity_results.append(
                SimilarityResult(
                    id=str(uuid.uuid4())[:8],
                    title=formula["title"],
                    latex=formula["latex"],
                    confidence=round(score, 2),
                    source=formula["source"],
                )
            )
    similarity_results = sorted(similarity_results, key=lambda x: x.confidence, reverse=True)[:3]

    if not similarity_results:
        similarity_results = [
            SimilarityResult(
                id=str(uuid.uuid4())[:8],
                title="Custom Formula Pattern",
                latex=recognized_latex,
                confidence=1.0,
                source="AI Dynamic Matcher",
            )
        ]

    processing_time_ms = int((time.time() - start_time) * 1000)

    # Save to history
    try:
        history_service.create_entry(
            db=db,
            latex=recognized_latex,
            mathml=generated_mathml,
            source="upload",
            file_name=original_name,
            user_id=user.id if user else None,
            processing_time_ms=processing_time_ms,
            category=category,
            explanation=explanation,
        )
    except Exception:
        pass

    # Track analytics
    try:
        analytics_service.track_event(
            db=db,
            event_type="ocr_recognition",
            user_id=user.id if user else None,
            metadata={"source": "upload", "file": original_name},
            processing_time_ms=processing_time_ms,
        )
    except Exception:
        pass

    return UploadResponse(
        id=str(uuid.uuid4()),
        latex=recognized_latex,
        mathml=generated_mathml,
        similarity_results=similarity_results,
        processing_time_ms=processing_time_ms,
        validation=validation_result,
    )
