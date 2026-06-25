"""
EquationAI — Export Schemas
"""

from pydantic import BaseModel
from typing import Optional


class ExportRequest(BaseModel):
    latex: str = ""
    mathml: str = ""
    title: Optional[str] = "Equation Report"
