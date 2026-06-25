import time
import uuid
import math
import re
import io
import base64
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
from pix2tex.cli import LatexOCR
import latex2mathml.converter

from models.schemas import HandwritingRequest, HandwritingResponse, SimilarityResult, UploadResponse
from app.services.document_extractor import extract_equations as extract_doc_equations



app = FastAPI(title="EquationAI API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to specific frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
#  Register Routers
# ──────────────────────────────────────────────
from routes.semantic_search import router as semantic_search_router
from routes.history import router as history_router
from routes.stats import router as stats_router

app.include_router(semantic_search_router)
app.include_router(history_router)
app.include_router(stats_router)

# Initialize the AI Equation OCR model globally
ocr_model = LatexOCR()

# ──────────────────────────────────────────────
#  Pydantic Models
# ──────────────────────────────────────────────

# Models are now imported from models.schemas
# See above import statements




# ──────────────────────────────────────────────
#  Similarity Search Helpers (unchanged)
# ──────────────────────────────────────────────

# Predefined mathematical formulas database for similarity search
FORMULA_DATABASE = [
    {
        "title": "Pythagorean Theorem",
        "latex": r"a^2 + b^2 = c^2",
        "source": "Euclidean Geometry"
    },
    {
        "title": "Law of Cosines",
        "latex": r"c^2 = a^2 + b^2 - 2ab \cos(C)",
        "source": "Trigonometry"
    },
    {
        "title": "Einstein's Mass-Energy Equivalence",
        "latex": r"E = m c^2",
        "source": "General Relativity"
    },
    {
        "title": "Quadratic Formula",
        "latex": r"x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}",
        "source": "Algebra"
    },
    {
        "title": "Euler's Identity",
        "latex": r"e^{i\pi} + 1 = 0",
        "source": "Complex Analysis"
    },
    {
        "title": "Fourier Transform",
        "latex": r"\hat{f}(\xi) = \int_{-\infty}^{\infty} f(x)\,e^{-2 \pi i \xi x} \,dx",
        "source": "Fourier Analysis"
    },
    {
        "title": "Inverse Fourier Transform",
        "latex": r"f(x) = \int_{-\infty}^{\infty} \hat{f}(\xi)\,e^{2 \pi i \xi x} \,d\xi",
        "source": "Fourier Analysis"
    },
    {
        "title": "Gaussian Integral",
        "latex": r"\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}",
        "source": "Calculus"
    },
    {
        "title": "Area of a Circle",
        "latex": r"A = \pi r^2",
        "source": "Geometry"
    }
]

def get_character_set(s: str) -> set:
    """Helper to clean a LaTeX string and return a set of its characters for Jaccard similarity."""
    cleaned = s.replace(" ", "").replace("\\", "").replace("{", "").replace("}", "").replace("^", "").replace("_", "")
    return set(cleaned)

def calculate_jaccard_similarity(s1: str, s2: str) -> float:
    """Calculates string similarity using Jaccard index on character sets."""
    set1 = get_character_set(s1)
    set2 = get_character_set(s2)
    if not set1 or not set2:
        return 0.0
    return len(set1 & set2) / len(set1 | set2)

from vector_db.chroma_manager import chroma_manager
from services.history_service import history_service
from models.schemas import HandwritingRequest, HandwritingResponse

def classify_equation(latex: str):
    latex_lower = latex.lower()
    if "\\int" in latex_lower or "\\sum" in latex_lower or "\\lim" in latex_lower or "dx" in latex_lower:
        return "Calculus", "An integration, summation, or limit relation representing continuous change."
    elif "\\sin" in latex_lower or "\\cos" in latex_lower or "\\tan" in latex_lower or "\\theta" in latex_lower:
        return "Trigonometry", "Trigonometric equation defining relationships between angles and lengths."
    elif "\\pi" in latex_lower or "r^2" in latex_lower or "a^2+b^2" in latex_lower or "area" in latex_lower or "volume" in latex_lower:
        return "Geometry", "Geometric relation representing shapes, side ratios, areas, or dimensions."
    elif "e^" in latex_lower or "i" in latex_lower or "\\pi" in latex_lower and "=" in latex_lower:
        return "Complex Analysis", "Identities relating complex numbers, constants, and exponents."
    elif "\\psi" in latex_lower or "\\hbar" in latex_lower or "\\nabla" in latex_lower or "e=mc" in latex_lower.replace(" ", ""):
        return "Physics", "Fundamental equation describing quantum states, field changes, or physical laws."
    else:
        return "Algebra", "General algebraic statement expressing relations between mathematical variables."


# ──────────────────────────────────────────────
#  Post-OCR Correction Heuristics
# ──────────────────────────────────────────────

def correct_ocr_misrecognitions(latex: str) -> str:
    """
    Fix common pix2tex OCR misrecognitions by applying heuristic rules.
    
    Known issues:
    - 'x' misrecognized as '\\chi' (they look visually similar)
    - '\\nu' misrecognized as 'v' or vice-versa
    - Extra braces or spacing artifacts
    """
    if not latex:
        return latex

    corrected = latex

    # ── Fix 1: \\chi → x when context suggests Latin 'x' ──
    # Heuristics for when \\chi is actually 'x':
    #   - The equation has no other Greek letters (pure Latin-variable equation)
    #   - \\chi appears in typical 'x' contexts: f(\\chi), \\chi^2, \\frac{...}{\\chi}
    #   - \\chi is the only Greek letter → very likely misrecognized 'x'
    
    # Count genuine Greek letter usage (excluding \\chi itself and \\pi which is a constant)
    greek_cmds = re.findall(r'\\(?:alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|'
                            r'vartheta|iota|kappa|lambda|mu|nu|xi|rho|varrho|sigma|varsigma|'
                            r'tau|upsilon|phi|varphi|psi|omega|'
                            r'Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega)'
                            r'(?![a-zA-Z])', corrected)
    
    chi_count = len(re.findall(r'\\chi(?![a-zA-Z])', corrected))
    other_greek_count = len(greek_cmds) - chi_count
    
    if chi_count > 0:
        # Strong signal: no other Greek letters → \\chi is almost certainly 'x'
        # Also check if \\chi is used in contexts that strongly suggest 'x':
        #   - appears as function argument: f(\\chi), g(\\chi)
        #   - appears near = sign as main variable
        #   - appears with subscripts typical of x: \\chi_0, \\chi_1, \\chi_n
        
        should_correct_chi = False
        
        if other_greek_count == 0:
            # No other Greek letters at all → very likely misrecognized 'x'
            should_correct_chi = True
        else:
            # Some other Greek letters exist — only correct if \\chi appears
            # in strong 'x' contexts
            # Check for f(\\chi), g(\\chi), h(\\chi) — function argument pattern
            func_arg_pattern = re.search(r'[fgh]\s*\(\s*\\chi', corrected)
            # Check for dx-like patterns: d\\chi
            differential_pattern = re.search(r'd\s*\\chi(?![a-zA-Z])', corrected)
            # Check for \\chi appearing with Latin subscripts like \\chi_0, \\chi_1
            latin_sub_pattern = re.search(r'\\chi\s*_\s*[0-9]', corrected)
            
            if func_arg_pattern or differential_pattern or latin_sub_pattern:
                should_correct_chi = True
        
        if should_correct_chi:
            corrected = re.sub(r'\\chi(?![a-zA-Z])', 'x', corrected)
    
    # ── Fix 2: Clean up redundant spacing artifacts ──
    # Multiple consecutive spaces → single space
    corrected = re.sub(r'  +', ' ', corrected)
    
    # ── Fix 3: Remove empty brace pairs that sometimes appear from OCR ──
    # {} with nothing inside (but not \left{} \right{} or \begin{} etc.)
    corrected = re.sub(r'(?<!\\left)(?<!\\right)(?<!\\begin)(?<!\\end)\{\}', '', corrected)
    
    return corrected.strip()

# ──────────────────────────────────────────────
#  Health Check Endpoint
# ──────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    """Simple health check to verify backend connectivity."""
    return {
        "status": "ok",
        "model_loaded": ocr_model is not None,
        "timestamp": time.time(),
    }

# ──────────────────────────────────────────────
#  API Endpoints
# ──────────────────────────────────────────────

@app.post("/api/upload", response_model=UploadResponse)
async def process_equation_upload(file: UploadFile = File(...)):
    start_time = time.time()
    
    # Validate file extension
    allowed_extensions = ["png", "jpg", "jpeg", "pdf", "docx"]
    file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Unsupported file format")

    try:
        # Read uploaded file bytes
        file_bytes = await file.read()

        recognized_latex = ""
        extraction_method = "ocr"
        extracted_equations = []

        # ── Document files (PDF / DOCX): Text extraction first, OCR fallback ──
        if file_ext in ["pdf", "docx"]:
            try:
                extraction_result = extract_doc_equations(file_bytes, file_ext)

                if extraction_result.equations:
                    # Text extraction succeeded
                    extracted_equations = extraction_result.equations
                    recognized_latex = extraction_result.primary_latex
                    extraction_method = "text"
                elif extraction_result.fallback_image is not None:
                    # OCR fallback on rendered/extracted image
                    try:
                        recognized_latex = ocr_model(extraction_result.fallback_image)
                    except Exception as ocr_err:
                        raise HTTPException(status_code=500, detail=f"AI model inference failed: {str(ocr_err)}")
                    extraction_method = "ocr"
                else:
                    # Last resort: render PDF page to image for OCR
                    if file_ext == "pdf":
                        import fitz
                        pdf_doc = fitz.open(stream=file_bytes, filetype="pdf")
                        if pdf_doc.page_count == 0:
                            raise Exception("No pages found in PDF")
                        page = pdf_doc[0]
                        mat = fitz.Matrix(2, 2)
                        pix = page.get_pixmap(matrix=mat)
                        img_bytes = pix.tobytes("png")
                        pdf_doc.close()
                        image = Image.open(io.BytesIO(img_bytes))
                        if image.mode != "RGB":
                            image = image.convert("RGB")
                        try:
                            recognized_latex = ocr_model(image)
                        except Exception as ocr_err:
                            raise HTTPException(status_code=500, detail=f"AI model inference failed: {str(ocr_err)}")
                        extraction_method = "ocr"
                    else:
                        raise HTTPException(
                            status_code=400,
                            detail="No equations or equation images found in the DOCX file."
                        )
            except HTTPException:
                raise
            except Exception as doc_err:
                raise HTTPException(status_code=400, detail=f"Could not process document: {str(doc_err)}")

        # ── Image files: Direct OCR ──
        elif file_ext in ["png", "jpg", "jpeg"]:
            try:
                image = Image.open(io.BytesIO(file_bytes))
                if image.mode != "RGB":
                    image = image.convert("RGB")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to open image file: {str(e)}")

            try:
                recognized_latex = ocr_model(image)
            except Exception as ocr_err:
                raise HTTPException(status_code=500, detail=f"AI model inference failed: {str(ocr_err)}")
            extraction_method = "ocr"
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format for OCR extraction.")

        # ── Post-OCR Correction: fix common pix2tex misrecognitions ──
        recognized_latex = correct_ocr_misrecognitions(recognized_latex)

        # Clean/Format LaTeX if necessary
        cleaned_ocr = recognized_latex.strip() if recognized_latex else ""
        empty_delims = [
            "\\displaystyle{\\displaylines{}}", 
            "$$\\displaystyle{\\displaylines{}}$$", 
            "\\displaylines{}", 
            "\\displaystyle{}", 
            ""
        ]
        normalized_ocr = cleaned_ocr.replace(" ", "")
        
        if not cleaned_ocr or any(normalized_ocr == d.replace(" ", "") for d in empty_delims):
            raise HTTPException(status_code=422, detail="No equation could be recognized in the uploaded file.")

        # Convert LaTeX to MathML dynamically
        try:
            generated_mathml = latex2mathml.converter.convert(recognized_latex)
        except Exception:
            generated_mathml = f'<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mtext>{recognized_latex}</mtext></mrow></math>'

        # Dynamically auto-classify and index into Chroma DB/Seed database
        try:
            category, explanation = classify_equation(recognized_latex)
            words = re.findall(r'\b[a-zA-Z]{3,}\b', (recognized_latex + " " + explanation).lower())
            tags = list(set(words))[:6]
            chroma_manager.add_equation(recognized_latex, category, explanation, tags)
        except Exception as idx_err:
            pass

        # Calculate semantic/Jaccard similarity search results dynamically
        similarity_results = []
        for formula in FORMULA_DATABASE:
            similarity_score = calculate_jaccard_similarity(recognized_latex, formula["latex"])
            if similarity_score > 0.15:
                similarity_results.append(
                    SimilarityResult(
                        id=str(uuid.uuid4())[:8],
                        title=formula["title"],
                        latex=formula["latex"],
                        confidence=round(similarity_score, 2),
                        source=formula["source"]
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
                    source="AI Dynamic Matcher"
                )
            ]

        processing_time_ms = int((time.time() - start_time) * 1000)

        # Auto-save to backend history
        try:
            history_service.add_entry(
                latex=recognized_latex,
                mathml=generated_mathml,
                source="upload",
                file_name=file.filename,
            )
        except Exception:
            pass

        return UploadResponse(
            id=str(uuid.uuid4()),
            latex=recognized_latex,
            mathml=generated_mathml,
            similarity_results=similarity_results,
            processing_time_ms=processing_time_ms,
            extracted_equations=extracted_equations if extracted_equations else None,
            extraction_method=extraction_method
        )

    except HTTPException as http_exc:
        raise http_exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(exc)}")



# ──────────────────────────────────────────────
#  MathML <-> LaTeX Conversion Models & Endpoints
# ──────────────────────────────────────────────

class LatexToMathmlRequest(BaseModel):
    latex: str

class LatexToMathmlResponse(BaseModel):
    mathml: str
    processing_time_ms: int

class MathmlToLatexRequest(BaseModel):
    mathml: str

class MathmlToLatexResponse(BaseModel):
    latex: str
    processing_time_ms: int

def parse_mathml_element(elem) -> str:
    """Recursively parse a MathML XML element into a LaTeX string."""
    tag = elem.tag.split('}')[-1]  # strip namespace if any
    text = (elem.text or "").strip()
    
    # Handle basic tokens
    if tag in ("mi", "mn"):
        # Greek letters translation
        greek_letters = {
            "alpha": r"\alpha", "beta": r"\beta", "gamma": r"\gamma", "delta": r"\delta",
            "epsilon": r"\epsilon", "zeta": r"\zeta", "eta": r"\eta", "theta": r"\theta",
            "iota": r"\iota", "kappa": r"\kappa", "lambda": r"\lambda", "mu": r"\mu",
            "nu": r"\nu", "xi": r"\xi", "pi": r"\pi", "rho": r"\rho", "sigma": r"\sigma",
            "tau": r"\tau", "upsilon": r"\upsilon", "phi": r"\phi", "chi": r"\chi",
            "psi": r"\psi", "omega": r"\omega"
        }
        if text in greek_letters:
            return greek_letters[text]
        return text
        
    if tag == "mo":
        # Common operators mapping
        operators = {
            "&InvisibleTimes;": " ",
            "&times;": r"\times",
            "&middot;": r"\cdot",
            "&div;": r"\div",
            "&PlusMinus;": r"\pm",
            "&le;": r"\le",
            "&ge;": r"\ge",
            "&ne;": r"\ne",
            "&in;": r"\in",
            "&infin;": r"\infty",
            "&pi;": r"\pi"
        }
        return operators.get(text, text)
    
    # Recursive children translation
    children_latex = "".join(parse_mathml_element(child) for child in elem)
    
    if tag == "mfrac":
        if len(elem) == 2:
            return f"\\frac{{{parse_mathml_element(elem[0])}}}{{{parse_mathml_element(elem[1])}}}"
            
    elif tag == "msup":
        if len(elem) == 2:
            return f"{{{parse_mathml_element(elem[0])}}}^{{{parse_mathml_element(elem[1])}}}"
            
    elif tag == "msub":
        if len(elem) == 2:
            return f"{{{parse_mathml_element(elem[0])}}}_{{{parse_mathml_element(elem[1])}}}"
            
    elif tag == "msubsup":
        if len(elem) == 3:
            return f"{{{parse_mathml_element(elem[0])}}}_{{{parse_mathml_element(elem[1])}}}^{{{parse_mathml_element(elem[2])}}}"
            
    elif tag == "msqrt":
        return f"\\sqrt{{{children_latex}}}"
        
    elif tag == "mroot":
        if len(elem) == 2:
            return f"\\sqrt[{parse_mathml_element(elem[1])}]{{{parse_mathml_element(elem[0])}}}"
            
    elif tag == "mfenced":
        open_brace = elem.attrib.get("open", "(")
        close_brace = elem.attrib.get("close", ")")
        return f"\\left{open_brace}{children_latex}\\right{close_brace}"
        
    elif tag == "mrow":
        return children_latex
        
    elif tag == "math":
        return children_latex
        
    return children_latex

def translate_mathml_to_latex(mathml_str: str) -> str:
    """Cleans up MathML string and converts it to LaTeX."""
    try:
        # Remove standard XML and MathML namespace attributes for clean parsing
        clean_str = re.sub(r'\sxmlns="[^"]+"', '', mathml_str)
        # Parse XML
        root = ET.fromstring(clean_str)
        return parse_mathml_element(root)
    except Exception as e:
        return f"\\text{{MathML Parsing Error: {str(e)}}}"


@app.post("/api/convert/latex-to-mathml", response_model=LatexToMathmlResponse)
async def convert_latex_to_mathml(request: LatexToMathmlRequest):
    """Convert LaTeX equations into raw MathML strings."""
    start_time = time.time()
    if not request.latex or not request.latex.strip():
        raise HTTPException(status_code=400, detail="LaTeX input is empty.")
    
    try:
        generated_mathml = latex2mathml.converter.convert(request.latex)
        
        # Dynamically auto-classify and index into Chroma DB/Seed database
        try:
            category, explanation = classify_equation(request.latex)
            words = re.findall(r'\b[a-zA-Z]{3,}\b', (request.latex + " " + explanation).lower())
            tags = list(set(words))[:6]
            chroma_manager.add_equation(request.latex, category, explanation, tags)
        except Exception:
            pass

        # Auto-save to backend history
        try:
            history_service.add_entry(
                latex=request.latex,
                mathml=generated_mathml,
                source="converter",
            )
        except Exception:
            pass

        processing_time_ms = int((time.time() - start_time) * 1000)
        return LatexToMathmlResponse(
            mathml=generated_mathml,
            processing_time_ms=processing_time_ms
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"LaTeX to MathML conversion failed: {str(exc)}")


@app.post("/api/convert/mathml-to-latex", response_model=MathmlToLatexResponse)
async def convert_mathml_to_latex(request: MathmlToLatexRequest):
    """Convert MathML markup strings back into standard LaTeX representation."""
    start_time = time.time()
    if not request.mathml or not request.mathml.strip():
        raise HTTPException(status_code=400, detail="MathML input is empty.")
    
    try:
        latex_output = translate_mathml_to_latex(request.mathml)

        # Auto-save to backend history
        try:
            history_service.add_entry(
                latex=latex_output,
                mathml=request.mathml,
                source="converter",
            )
        except Exception:
            pass

        processing_time_ms = int((time.time() - start_time) * 1000)
        return MathmlToLatexResponse(
            latex=latex_output,
            processing_time_ms=processing_time_ms
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"MathML to LaTeX conversion failed: {str(exc)}")


# ──────────────────────────────────────────────
#  Handwriting Recognition Endpoint
# ──────────────────────────────────────────────

@app.post("/api/handwriting/recognize", response_model=HandwritingResponse)
async def recognize_handwriting(request: HandwritingRequest):
    """Recognize a handwritten equation from a base64-encoded canvas image."""
    start_time = time.time()

    if not request.image or not request.image.strip():
        raise HTTPException(status_code=400, detail="No image data provided.")

    try:
        # Strip data URL prefix if present (e.g., "data:image/png;base64,...")
        image_data = request.image
        if "," in image_data:
            image_data = image_data.split(",", 1)[1]

        # Decode base64 to bytes
        try:
            image_bytes = base64.b64decode(image_data)
        except Exception as decode_err:
            raise HTTPException(status_code=400, detail=f"Invalid base64 image data: {str(decode_err)}")

        # Open as PIL Image
        try:
            image = Image.open(io.BytesIO(image_bytes))
        except Exception as img_err:
            raise HTTPException(status_code=400, detail=f"Failed to open image: {str(img_err)}")

        # Preprocess handwriting image for better OCR accuracy
        try:
            from app.services.handwriting_preprocessor import preprocess_handwriting
            image = preprocess_handwriting(image)
        except Exception as prep_err:
            # Fallback: just convert to RGB if preprocessing fails
            if image.mode != "RGB":
                image = image.convert("RGB")

        # Run AI OCR model
        try:
            recognized_latex = ocr_model(image)
        except Exception as ocr_err:
            raise HTTPException(status_code=500, detail=f"AI model inference failed: {str(ocr_err)}")

        # ── Post-OCR Correction: fix common pix2tex misrecognitions ──
        recognized_latex = correct_ocr_misrecognitions(recognized_latex)

        # Clean up the result
        cleaned_ocr = recognized_latex.strip() if recognized_latex else ""
        empty_delims = [
            "\\displaystyle{\\displaylines{}}",
            "$$\\displaystyle{\\displaylines{}}$$",
            "\\displaylines{}",
            "\\displaystyle{}",
            ""
        ]
        normalized_ocr = cleaned_ocr.replace(" ", "")

        if not cleaned_ocr or any(normalized_ocr == d.replace(" ", "") for d in empty_delims):
            raise HTTPException(status_code=422, detail="No equation could be recognized from the handwriting.")

        # Convert LaTeX to MathML
        try:
            generated_mathml = latex2mathml.converter.convert(recognized_latex)
        except Exception:
            generated_mathml = f'<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mtext>{recognized_latex}</mtext></mrow></math>'

        # Auto-classify and index into Chroma DB
        try:
            category, explanation = classify_equation(recognized_latex)
            words = re.findall(r'\b[a-zA-Z]{3,}\b', (recognized_latex + " " + explanation).lower())
            tags = list(set(words))[:6]
            chroma_manager.add_equation(recognized_latex, category, explanation, tags)
        except Exception:
            pass

        # Auto-save to backend history
        try:
            history_service.add_entry(
                latex=recognized_latex,
                mathml=generated_mathml,
                source="handwriting",
            )
        except Exception:
            pass

        processing_time_ms = int((time.time() - start_time) * 1000)

        return HandwritingResponse(
            latex=recognized_latex,
            mathml=generated_mathml,
            processing_time_ms=processing_time_ms,
        )

    except HTTPException as http_exc:
        raise http_exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Handwriting recognition failed: {str(exc)}")
