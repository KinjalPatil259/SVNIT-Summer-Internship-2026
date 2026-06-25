"""
EquationAI — Conversion Service
LaTeX ↔ MathML bidirectional conversion logic.
"""

import re
import xml.etree.ElementTree as ET
import latex2mathml.converter
from app.core.logging_config import get_logger
from app.core.exceptions import ProcessingError

logger = get_logger("conversion_service")


# ═══════════════════════════════════════════════════
#  LaTeX → MathML
# ═══════════════════════════════════════════════════

def latex_to_mathml(latex: str) -> str:
    """Convert a LaTeX expression to MathML markup."""
    try:
        mathml = latex2mathml.converter.convert(latex)
        return mathml
    except Exception as e:
        logger.warning(f"latex2mathml conversion failed for: {latex[:60]}... — {e}")
        # Fallback: wrap raw LaTeX in mtext
        return (
            f'<math xmlns="http://www.w3.org/1998/Math/MathML">'
            f'<mrow><mtext>{latex}</mtext></mrow></math>'
        )


# ═══════════════════════════════════════════════════
#  MathML → LaTeX
# ═══════════════════════════════════════════════════

# Greek letters mapping
GREEK_LETTERS = {
    "alpha": r"\alpha", "beta": r"\beta", "gamma": r"\gamma", "delta": r"\delta",
    "epsilon": r"\epsilon", "zeta": r"\zeta", "eta": r"\eta", "theta": r"\theta",
    "iota": r"\iota", "kappa": r"\kappa", "lambda": r"\lambda", "mu": r"\mu",
    "nu": r"\nu", "xi": r"\xi", "pi": r"\pi", "rho": r"\rho", "sigma": r"\sigma",
    "tau": r"\tau", "upsilon": r"\upsilon", "phi": r"\phi", "chi": r"\chi",
    "psi": r"\psi", "omega": r"\omega",
    # Uppercase
    "Alpha": r"\Alpha", "Beta": r"\Beta", "Gamma": r"\Gamma", "Delta": r"\Delta",
    "Theta": r"\Theta", "Lambda": r"\Lambda", "Xi": r"\Xi", "Pi": r"\Pi",
    "Sigma": r"\Sigma", "Phi": r"\Phi", "Psi": r"\Psi", "Omega": r"\Omega",
}

# MathML operators to LaTeX
OPERATORS = {
    "\u2062": " ",           # InvisibleTimes
    "\u00d7": r"\times",     # ×
    "\u00b7": r"\cdot",      # ·
    "\u00f7": r"\div",       # ÷
    "\u00b1": r"\pm",        # ±
    "\u2264": r"\le",        # ≤
    "\u2265": r"\ge",        # ≥
    "\u2260": r"\ne",        # ≠
    "\u2208": r"\in",        # ∈
    "\u221e": r"\infty",     # ∞
    "\u03c0": r"\pi",        # π
    "\u222b": r"\int",       # ∫
    "\u2211": r"\sum",       # Σ
    "\u220f": r"\prod",      # ∏
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
    "&pi;": r"\pi",
    "&int;": r"\int",
    "&sum;": r"\sum",
}


def _parse_mathml_element(elem) -> str:
    """Recursively parse a MathML XML element into a LaTeX string."""
    tag = elem.tag.split('}')[-1]  # strip namespace
    text = (elem.text or "").strip()

    # Handle basic tokens
    if tag in ("mi", "mn"):
        if text in GREEK_LETTERS:
            return GREEK_LETTERS[text]
        return text

    if tag == "mo":
        return OPERATORS.get(text, text)

    # Recursive children translation
    children_latex = "".join(_parse_mathml_element(child) for child in elem)

    if tag == "mfrac" and len(elem) == 2:
        return f"\\frac{{{_parse_mathml_element(elem[0])}}}{{{_parse_mathml_element(elem[1])}}}"

    elif tag == "msup" and len(elem) == 2:
        return f"{{{_parse_mathml_element(elem[0])}}}^{{{_parse_mathml_element(elem[1])}}}"

    elif tag == "msub" and len(elem) == 2:
        return f"{{{_parse_mathml_element(elem[0])}}}_{{{_parse_mathml_element(elem[1])}}}"

    elif tag == "msubsup" and len(elem) == 3:
        return (
            f"{{{_parse_mathml_element(elem[0])}}}"
            f"_{{{_parse_mathml_element(elem[1])}}}"
            f"^{{{_parse_mathml_element(elem[2])}}}"
        )

    elif tag == "msqrt":
        return f"\\sqrt{{{children_latex}}}"

    elif tag == "mroot" and len(elem) == 2:
        return f"\\sqrt[{_parse_mathml_element(elem[1])}]{{{_parse_mathml_element(elem[0])}}}"

    elif tag == "mfenced":
        open_brace = elem.attrib.get("open", "(")
        close_brace = elem.attrib.get("close", ")")
        return f"\\left{open_brace}{children_latex}\\right{close_brace}"

    elif tag == "munderover" and len(elem) == 3:
        return (
            f"{{{_parse_mathml_element(elem[0])}}}"
            f"_{{{_parse_mathml_element(elem[1])}}}"
            f"^{{{_parse_mathml_element(elem[2])}}}"
        )

    elif tag in ("mrow", "math", "mstyle", "mpadded", "mtd"):
        return children_latex

    elif tag == "mtr":
        return children_latex + r" \\ "

    elif tag == "mtable":
        rows = [_parse_mathml_element(child) for child in elem]
        return "".join(rows).rstrip(r" \\ ")

    elif tag == "mtext":
        return f"\\text{{{text}}}"

    return children_latex


def mathml_to_latex(mathml_str: str) -> str:
    """Convert a MathML markup string to LaTeX."""
    try:
        # Remove namespace attributes for clean parsing
        clean_str = re.sub(r'\sxmlns="[^"]+"', '', mathml_str)
        root = ET.fromstring(clean_str)
        result = _parse_mathml_element(root)
        return result
    except Exception as e:
        logger.error(f"MathML to LaTeX parsing failed: {e}")
        raise ProcessingError(str(e), operation="MathML to LaTeX conversion")
