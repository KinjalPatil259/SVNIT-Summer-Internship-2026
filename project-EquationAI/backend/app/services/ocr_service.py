"""
EquationAI — OCR Service
Wraps the pix2tex LatexOCR model with lazy loading and result validation.
"""

from PIL import Image
from app.core.logging_config import get_logger
from app.core.exceptions import ProcessingError

logger = get_logger("ocr_service")

# Empty equation patterns to reject
EMPTY_PATTERNS = [
    "\\displaystyle{\\displaylines{}}",
    "$$\\displaystyle{\\displaylines{}}$$",
    "\\displaylines{}",
    "\\displaystyle{}",
    "",
]


class OCRService:
    """Singleton service wrapping the pix2tex LatexOCR model."""

    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _ensure_model(self):
        """Lazy-load the OCR model on first use."""
        if self._model is None:
            logger.info("Loading pix2tex LatexOCR model (first use)...")
            try:
                from pix2tex.cli import LatexOCR
                self._model = LatexOCR()
                logger.info("LatexOCR model loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load LatexOCR model: {e}")
                raise ProcessingError(str(e), operation="OCR model loading")

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def recognize(self, image: Image.Image) -> str:
        """
        Run OCR on a PIL Image and return cleaned LaTeX string.
        Raises ProcessingError if recognition fails or produces empty output.
        """
        self._ensure_model()

        # Ensure RGB
        if image.mode != "RGB":
            image = image.convert("RGB")

        try:
            raw_latex = self._model(image)
        except Exception as e:
            logger.error(f"OCR inference failed: {e}")
            raise ProcessingError(str(e), operation="AI model inference")

        # Clean and validate
        cleaned = raw_latex.strip() if raw_latex else ""
        normalized = cleaned.replace(" ", "")

        if not cleaned or any(normalized == p.replace(" ", "") for p in EMPTY_PATTERNS):
            raise ProcessingError(
                "No equation could be recognized in the provided image.",
                operation="OCR recognition",
            )

        logger.info(f"OCR recognized: {cleaned[:80]}...")
        return cleaned


# Singleton instance
ocr_service = OCRService()
