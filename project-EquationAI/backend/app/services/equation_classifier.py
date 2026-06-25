"""
EquationAI — Equation Classifier
Classifies LaTeX equations into mathematical categories.
"""

from app.core.logging_config import get_logger

logger = get_logger("classifier")


def classify_equation(latex: str) -> tuple:
    """
    Classify a LaTeX equation into a mathematical category.
    Returns (category: str, explanation: str).
    """
    latex_lower = latex.lower()

    if "\\int" in latex_lower or "\\sum" in latex_lower or "\\lim" in latex_lower or "dx" in latex_lower:
        return "Calculus", "An integration, summation, or limit relation representing continuous change."

    elif "\\sin" in latex_lower or "\\cos" in latex_lower or "\\tan" in latex_lower or "\\theta" in latex_lower:
        return "Trigonometry", "Trigonometric equation defining relationships between angles and lengths."

    elif "\\pi" in latex_lower or "r^2" in latex_lower or "a^2+b^2" in latex_lower.replace(" ", ""):
        return "Geometry", "Geometric relation representing shapes, side ratios, areas, or dimensions."

    elif "\\psi" in latex_lower or "\\hbar" in latex_lower or "\\nabla" in latex_lower:
        return "Physics", "Fundamental equation describing quantum states, field changes, or physical laws."

    elif "e^" in latex_lower and ("i" in latex_lower or "\\pi" in latex_lower):
        return "Complex Analysis", "Identities relating complex numbers, constants, and exponents."

    elif "\\frac" in latex_lower or "\\sqrt" in latex_lower or "=" in latex_lower:
        return "Algebra", "General algebraic statement expressing relations between mathematical variables."

    else:
        return "Mathematics", "Mathematical expression or formula."
