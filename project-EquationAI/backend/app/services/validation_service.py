"""
EquationAI — Formula Validation Service
Validates LaTeX expressions for syntax errors and structural issues.
"""

import re
from typing import Optional, List
from dataclasses import dataclass, field
from app.core.logging_config import get_logger

logger = get_logger("validation_service")


@dataclass
class ValidationResult:
    """Result of LaTeX formula validation."""
    is_valid: bool = True
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    suggested_fix: Optional[str] = None


# Known LaTeX commands and their expected argument counts
COMMANDS_WITH_ARGS = {
    r"\frac": 2,
    r"\sqrt": 1,
    r"\text": 1,
    r"\mathbf": 1,
    r"\mathrm": 1,
    r"\mathit": 1,
    r"\mathbb": 1,
    r"\mathcal": 1,
    r"\hat": 1,
    r"\bar": 1,
    r"\vec": 1,
    r"\dot": 1,
    r"\ddot": 1,
    r"\tilde": 1,
    r"\overline": 1,
    r"\underline": 1,
    r"\overbrace": 1,
    r"\underbrace": 1,
}

# Valid LaTeX commands (no-arg or variable-arg)
VALID_COMMANDS = {
    r"\alpha", r"\beta", r"\gamma", r"\delta", r"\epsilon", r"\zeta",
    r"\eta", r"\theta", r"\iota", r"\kappa", r"\lambda", r"\mu",
    r"\nu", r"\xi", r"\pi", r"\rho", r"\sigma", r"\tau",
    r"\upsilon", r"\phi", r"\chi", r"\psi", r"\omega",
    r"\Gamma", r"\Delta", r"\Theta", r"\Lambda", r"\Xi", r"\Pi",
    r"\Sigma", r"\Phi", r"\Psi", r"\Omega",
    r"\sin", r"\cos", r"\tan", r"\cot", r"\sec", r"\csc",
    r"\log", r"\ln", r"\exp", r"\lim", r"\inf", r"\sup",
    r"\min", r"\max", r"\det", r"\dim", r"\gcd",
    r"\int", r"\iint", r"\iiint", r"\oint", r"\sum", r"\prod",
    r"\partial", r"\nabla", r"\infty", r"\hbar",
    r"\left", r"\right", r"\bigl", r"\bigr", r"\Bigl", r"\Bigr",
    r"\cdot", r"\times", r"\div", r"\pm", r"\mp",
    r"\le", r"\leq", r"\ge", r"\geq", r"\ne", r"\neq",
    r"\approx", r"\equiv", r"\sim", r"\propto",
    r"\in", r"\notin", r"\subset", r"\supset",
    r"\cup", r"\cap", r"\setminus", r"\emptyset",
    r"\forall", r"\exists", r"\neg", r"\land", r"\lor",
    r"\rightarrow", r"\leftarrow", r"\Rightarrow", r"\Leftarrow",
    r"\to", r"\mapsto", r"\implies",
    r"\quad", r"\qquad", r"\,", r"\;", r"\!",
    r"\displaystyle", r"\textstyle", r"\scriptstyle",
    r"\begin", r"\end",
}

ALL_KNOWN_COMMANDS = VALID_COMMANDS | set(COMMANDS_WITH_ARGS.keys())


def validate_latex(latex: str) -> ValidationResult:
    """
    Validate a LaTeX expression for common errors.
    Returns a ValidationResult with errors, warnings, and optional suggested fix.
    """
    result = ValidationResult()

    if not latex or not latex.strip():
        result.is_valid = False
        result.errors.append("Expression is empty.")
        return result

    latex = latex.strip()

    # ── 1. Brace Matching ──
    brace_depth = 0
    for i, ch in enumerate(latex):
        if ch == '{':
            brace_depth += 1
        elif ch == '}':
            brace_depth -= 1
        if brace_depth < 0:
            result.is_valid = False
            result.errors.append(f"Unmatched closing brace '}}' at position {i}.")
            # Attempt fix
            result.suggested_fix = '{' + latex
            break

    if brace_depth > 0:
        result.is_valid = False
        result.errors.append(f"Missing {brace_depth} closing brace(s) '}}'. Expression has unclosed groups.")
        result.suggested_fix = latex + '}' * brace_depth

    # ── 2. Parenthesis Matching ──
    paren_depth = 0
    for ch in latex:
        if ch == '(':
            paren_depth += 1
        elif ch == ')':
            paren_depth -= 1

    if paren_depth != 0:
        result.warnings.append(f"Unbalanced parentheses: {'missing )' if paren_depth > 0 else 'extra )'}.")

    # ── 3. Command Validation ──
    commands_found = re.findall(r'\\[a-zA-Z]+', latex)
    for cmd in commands_found:
        if cmd not in ALL_KNOWN_COMMANDS:
            result.warnings.append(f"Unknown LaTeX command '{cmd}'. It may not render correctly.")

    # ── 4. Check \frac has two arguments ──
    frac_positions = [m.start() for m in re.finditer(r'\\frac(?![a-zA-Z])', latex)]
    for pos in frac_positions:
        after_frac = latex[pos + 5:]  # after '\frac'
        brace_count = 0
        arg_count = 0
        for ch in after_frac:
            if ch == '{':
                if brace_count == 0:
                    arg_count += 1
                brace_count += 1
            elif ch == '}':
                brace_count -= 1
            elif brace_count == 0 and ch not in ' \t':
                break  # Hit non-brace non-whitespace at depth 0
            if arg_count >= 2 and brace_count == 0:
                break
        if arg_count < 2:
            result.warnings.append(
                f"\\frac at position {pos} may be missing arguments. Expected: \\frac{{num}}{{den}}"
            )

    # ── 5. Dollar Sign Checking ──
    dollar_count = latex.count('$')
    if dollar_count % 2 != 0:
        result.warnings.append("Odd number of '$' signs. Math delimiters may be unbalanced.")

    # ── 6. Overall validity ──
    if not result.errors:
        result.is_valid = True

    return result
