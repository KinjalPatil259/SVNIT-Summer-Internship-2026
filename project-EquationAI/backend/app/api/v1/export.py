"""
EquationAI — Export Routes
Download LaTeX, MathML, and PDF files.
"""

from fastapi import APIRouter
from fastapi.responses import Response
from app.schemas.export import ExportRequest
from app.services import export_service

router = APIRouter(prefix="/export", tags=["Export"])


@router.post("/latex")
async def download_latex(request: ExportRequest):
    """Download a LaTeX (.tex) file."""
    content = export_service.export_latex(request.latex, request.title)
    return Response(
        content=content,
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="equation.tex"'},
    )


@router.post("/mathml")
async def download_mathml(request: ExportRequest):
    """Download a MathML (.mml) file."""
    content = export_service.export_mathml(request.mathml, request.title)
    return Response(
        content=content,
        media_type="application/mathml+xml",
        headers={"Content-Disposition": f'attachment; filename="equation.mml"'},
    )


@router.post("/pdf")
async def download_pdf(request: ExportRequest):
    """Download a PDF report with equation details."""
    content = export_service.export_pdf(request.latex, request.mathml, request.title)
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="equation-report.pdf"'},
    )
