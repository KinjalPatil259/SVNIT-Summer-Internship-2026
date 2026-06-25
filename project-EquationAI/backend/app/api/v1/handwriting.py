"""
EquationAI — Handwriting Recognition Route
"""

import re
import time
import base64
import io
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from PIL import Image

from app.database import get_db
from app.api.deps import get_current_user_optional
from app.models.user import User
from app.schemas.handwriting import HandwritingRequest, HandwritingResponse
from app.services.ocr_service import ocr_service
from app.services.conversion_service import latex_to_mathml
from app.services.equation_classifier import classify_equation
from app.services.handwriting_preprocessor import preprocess_handwriting
from app.services import history_service, analytics_service
from app.services.search_service import SearchService
from app.core.exceptions import ValidationError, ProcessingError
from app.core.logging_config import get_logger

logger = get_logger("handwriting")

router = APIRouter(prefix="/handwriting", tags=["Handwriting"])


@router.post("/recognize", response_model=HandwritingResponse)
async def recognize_handwriting(
    request: HandwritingRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_optional),
):
    """Recognize a handwritten equation from a base64-encoded canvas image."""
    start_time = time.time()

    if not request.image or not request.image.strip():
        raise ValidationError("No image data provided.")

    # Strip data URL prefix
    image_data = request.image
    if "," in image_data:
        image_data = image_data.split(",", 1)[1]

    # Decode base64
    try:
        image_bytes = base64.b64decode(image_data)
    except Exception as e:
        raise ValidationError(f"Invalid base64 image data: {str(e)}")

    # Open as PIL Image
    try:
        image = Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        raise ProcessingError(str(e), operation="Image loading")

    # Preprocess handwriting image for better OCR accuracy
    try:
        image = preprocess_handwriting(image)
    except Exception as e:
        logger.warning(f"Preprocessing failed, using raw image: {e}")
        if image.mode != "RGB":
            image = image.convert("RGB")

    # Run OCR
    recognized_latex = ocr_service.recognize(image)

    # Convert to MathML
    generated_mathml = latex_to_mathml(recognized_latex)

    # Classify and index
    try:
        category, explanation = classify_equation(recognized_latex)
        words = re.findall(r'\b[a-zA-Z]{3,}\b', (recognized_latex + " " + explanation).lower())
        tags = list(set(words))[:6]
        SearchService.index_equation(recognized_latex, category, explanation, tags)
    except Exception:
        pass

    processing_time_ms = int((time.time() - start_time) * 1000)

    # Save to history
    try:
        history_service.create_entry(
            db=db,
            latex=recognized_latex,
            mathml=generated_mathml,
            source="handwriting",
            user_id=user.id if user else None,
            processing_time_ms=processing_time_ms,
        )
    except Exception:
        pass

    # Track analytics
    try:
        analytics_service.track_event(
            db=db, event_type="ocr_recognition",
            user_id=user.id if user else None,
            metadata={"source": "handwriting"},
            processing_time_ms=processing_time_ms,
        )
    except Exception:
        pass

    return HandwritingResponse(
        latex=recognized_latex,
        mathml=generated_mathml,
        processing_time_ms=processing_time_ms,
    )
