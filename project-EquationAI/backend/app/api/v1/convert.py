"""
EquationAI — Conversion Routes
LaTeX ↔ MathML bidirectional conversion endpoints.
"""

import time
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user_optional
from app.models.user import User
from app.schemas.convert import (
    LatexToMathmlRequest, LatexToMathmlResponse,
    MathmlToLatexRequest, MathmlToLatexResponse,
    ValidationResult,
)
from app.services.conversion_service import latex_to_mathml, mathml_to_latex
from app.services.validation_service import validate_latex
from app.services.equation_classifier import classify_equation
from app.services import history_service, analytics_service
from app.services.search_service import SearchService
from app.core.exceptions import ValidationError
from app.core.logging_config import get_logger
import re

logger = get_logger("convert")

router = APIRouter(prefix="/convert", tags=["Conversion"])


@router.post("/latex-to-mathml", response_model=LatexToMathmlResponse)
async def convert_latex_to_mathml_endpoint(
    request: LatexToMathmlRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_optional),
):
    """Convert a LaTeX expression to MathML markup."""
    start_time = time.time()

    if not request.latex or not request.latex.strip():
        raise ValidationError("LaTeX input is empty.")

    # Validate
    validation = validate_latex(request.latex)
    validation_result = ValidationResult(
        is_valid=validation.is_valid,
        errors=validation.errors,
        warnings=validation.warnings,
        suggested_fix=validation.suggested_fix,
    )

    # Convert
    generated_mathml = latex_to_mathml(request.latex)

    # Index into search
    try:
        category, explanation = classify_equation(request.latex)
        words = re.findall(r'\b[a-zA-Z]{3,}\b', (request.latex + " " + explanation).lower())
        tags = list(set(words))[:6]
        SearchService.index_equation(request.latex, category, explanation, tags)
    except Exception:
        pass

    processing_time_ms = int((time.time() - start_time) * 1000)

    # Save to history
    try:
        history_service.create_entry(
            db=db,
            latex=request.latex,
            mathml=generated_mathml,
            source="converter",
            user_id=user.id if user else None,
            processing_time_ms=processing_time_ms,
        )
    except Exception:
        pass

    # Track analytics
    try:
        analytics_service.track_event(
            db=db, event_type="conversion",
            user_id=user.id if user else None,
            metadata={"direction": "latex-to-mathml"},
            processing_time_ms=processing_time_ms,
        )
    except Exception:
        pass

    return LatexToMathmlResponse(
        mathml=generated_mathml,
        processing_time_ms=processing_time_ms,
        validation=validation_result,
    )


@router.post("/mathml-to-latex", response_model=MathmlToLatexResponse)
async def convert_mathml_to_latex_endpoint(
    request: MathmlToLatexRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_optional),
):
    """Convert MathML markup to LaTeX expression."""
    start_time = time.time()

    if not request.mathml or not request.mathml.strip():
        raise ValidationError("MathML input is empty.")

    # Convert
    latex_output = mathml_to_latex(request.mathml)

    processing_time_ms = int((time.time() - start_time) * 1000)

    # Save to history
    try:
        history_service.create_entry(
            db=db,
            latex=latex_output,
            mathml=request.mathml,
            source="converter",
            user_id=user.id if user else None,
            processing_time_ms=processing_time_ms,
        )
    except Exception:
        pass

    # Track analytics
    try:
        analytics_service.track_event(
            db=db, event_type="conversion",
            user_id=user.id if user else None,
            metadata={"direction": "mathml-to-latex"},
            processing_time_ms=processing_time_ms,
        )
    except Exception:
        pass

    return MathmlToLatexResponse(
        latex=latex_output,
        processing_time_ms=processing_time_ms,
    )
