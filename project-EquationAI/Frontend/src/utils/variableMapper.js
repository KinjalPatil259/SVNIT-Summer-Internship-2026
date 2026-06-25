/* ═══════════════════════════════════════════════════
   Variable Mapper Utility
   Detects variables in LaTeX and applies custom mappings
   ═══════════════════════════════════════════════════ */

// Greek letter commands and their Unicode display characters
const GREEK_MAP = {
  '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
  '\\epsilon': 'ε', '\\varepsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η',
  '\\theta': 'θ', '\\vartheta': 'ϑ', '\\iota': 'ι', '\\kappa': 'κ',
  '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ',
  '\\pi': 'π', '\\varpi': 'ϖ', '\\rho': 'ρ', '\\varrho': 'ϱ',
  '\\sigma': 'σ', '\\varsigma': 'ς', '\\tau': 'τ', '\\upsilon': 'υ',
  '\\phi': 'φ', '\\varphi': 'φ', '\\chi': 'χ', '\\psi': 'ψ',
  '\\omega': 'ω',
  '\\Gamma': 'Γ', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ',
  '\\Xi': 'Ξ', '\\Pi': 'Π', '\\Sigma': 'Σ', '\\Upsilon': 'Υ',
  '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
};

// Common LaTeX function names to exclude from variable detection
const LATEX_FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh', 'coth',
  'log', 'ln', 'exp', 'lim', 'sup', 'inf',
  'max', 'min', 'arg', 'det', 'dim', 'deg',
  'gcd', 'hom', 'ker', 'mod', 'Pr',
]);

// LaTeX structural commands whose arguments should not be scanned for vars
const STRUCTURAL_COMMANDS = [
  'text', 'mathrm', 'mathbf', 'mathit', 'mathsf', 'mathtt', 'mathcal',
  'mathbb', 'mathfrak', 'operatorname', 'textrm', 'textbf', 'textit',
  'begin', 'end', 'label', 'ref', 'tag',
];

// Letters that are NOT standalone variables — they are operators, constants,
// indices, or function names when used alone in typical math equations
const NON_VARIABLE_LETTERS = new Set([
  'd',        // differential operator (dx, dy, dt)
  'e',        // Euler's number (e^x)
  'i', 'j',   // imaginary unit / common loop indices
  'f', 'g', 'h', // function names (f(x), g(x))
  'n', 'm', 'k', // summation / product indices
  'o', 'O',   // Big-O notation
  'l',        // often confused with 1, or "length" label
]);

/**
 * Blank out nested brace groups for a given set of LaTeX commands.
 * Handles nested braces correctly, e.g. \text{hello {world}}
 */
function blankCommandWithBraces(str, cmdName) {
  const prefix = '\\' + cmdName + '{';
  let result = str;
  let searchStart = 0;

  while (true) {
    const idx = result.indexOf(prefix, searchStart);
    if (idx === -1) break;

    // Walk forward from the opening brace to find the matching close
    const braceStart = idx + prefix.length - 1; // position of '{'
    let depth = 1;
    let pos = braceStart + 1;
    while (pos < result.length && depth > 0) {
      if (result[pos] === '{') depth++;
      else if (result[pos] === '}') depth--;
      pos++;
    }

    // Replace the entire \cmd{...} with spaces
    const matchLen = pos - idx;
    result = result.slice(0, idx) + ' '.repeat(matchLen) + result.slice(pos);
    searchStart = idx + matchLen;
  }

  return result;
}

/**
 * Check whether a letter at the given position in the original LaTeX
 * is acting as a subscript/superscript index (not a standalone variable).
 * For example, in x_n, y_{max}, a^2, the n/a are indices — but a in a^2 IS a variable.
 * We only skip letters that appear AFTER _ or ^ as simple single-char subscripts.
 */
function isSubscriptSuperscriptIndex(original, position) {
  // Check if this letter is preceded by _ or ^ (possibly with whitespace)
  let p = position - 1;
  while (p >= 0 && original[p] === ' ') p--;
  if (p >= 0 && (original[p] === '_' || original[p] === '^')) {
    return true;
  }
  return false;
}

/**
 * Extract variables from a LaTeX string.
 * Returns a deduplicated, sorted array of variable objects:
 *   { original: string, display: string }
 *
 * - `original` is the exact token in the LaTeX (e.g. 'x' or '\\alpha')
 * - `display` is a user-friendly label (e.g. 'x' or 'α')
 */
export function extractVariables(latex) {
  if (!latex) return [];

  // Strip wrapping delimiters
  let s = latex.trim();
  if (s.startsWith('$$') && s.endsWith('$$')) s = s.slice(2, -2);
  else if (s.startsWith('$') && s.endsWith('$')) s = s.slice(1, -1);
  else if (s.startsWith('\\[') && s.endsWith('\\]')) s = s.slice(2, -2);

  const found = new Map(); // original → display

  // ── 1. Detect Greek letter commands ──
  // Only count Greek letters that appear as standalone variables,
  // NOT inside subscripts/superscripts as indices
  const greekKeys = Object.keys(GREEK_MAP).sort((a, b) => b.length - a.length);
  const greekPattern = new RegExp(
    '(' + greekKeys.map(k => k.replace(/\\/g, '\\\\')).join('|') + ')(?![a-zA-Z])',
    'g'
  );
  let m;
  while ((m = greekPattern.exec(s)) !== null) {
    const cmd = m[1];
    const pos = m.index;

    // Skip if this Greek letter is used as a subscript/superscript index
    if (isSubscriptSuperscriptIndex(s, pos)) continue;

    if (!found.has(cmd)) {
      found.set(cmd, GREEK_MAP[cmd] || cmd);
    }
  }

  // ── 2. Detect single-letter Latin variables ──
  // Build a heavily cleaned version of the LaTeX string

  let cleaned = s;

  // Step 2a: Blank out all structural commands INCLUDING their nested brace content
  for (const cmd of STRUCTURAL_COMMANDS) {
    cleaned = blankCommandWithBraces(cleaned, cmd);
  }

  // Step 2b: Blank out \begin{env}...{formatting} and \end{env}
  cleaned = cleaned.replace(/\\begin\{[^}]*\}(\[[^\]]*\])?\{[^}]*\}/g, (match) => ' '.repeat(match.length));
  cleaned = cleaned.replace(/\\end\{[^}]*\}/g, (match) => ' '.repeat(match.length));

  // Step 2c: Blank out all \command tokens (Greek already detected above)
  cleaned = cleaned.replace(/\\[a-zA-Z]+/g, (match) => ' '.repeat(match.length));

  // Step 2d: Blank out the content of subscripts and superscripts
  // Simple subscripts: _x or _X (single char after _ or ^)
  cleaned = cleaned.replace(/[_^]([a-zA-Z0-9])/g, (match) => ' '.repeat(match.length));
  // Braced subscripts/superscripts: _{...} or ^{...} — blank the entire group
  cleaned = cleaned.replace(/[_^]\{[^}]*\}/g, (match) => ' '.repeat(match.length));

  // Step 2e: Blank out standalone brace groups that contain only formatting chars
  // (column specifiers like {c}, {cc}, {lcr|})
  cleaned = cleaned.replace(/\{[clr|.\s]+\}/g, (match) => ' '.repeat(match.length));

  // Step 2f: Blank out numbers (digits should never be variables)
  cleaned = cleaned.replace(/[0-9]+/g, (match) => ' '.repeat(match.length));

  // Step 2g: Blank out multi-letter words that are function names
  // (catches cases like "sin", "cos" that might not have \ prefix)
  for (const fn of LATEX_FUNCTIONS) {
    const fnRegex = new RegExp('(?<![a-zA-Z])' + fn + '(?![a-zA-Z])', 'g');
    cleaned = cleaned.replace(fnRegex, (match) => ' '.repeat(match.length));
  }

  // Step 2h: Blank out common operators and punctuation
  cleaned = cleaned.replace(/[+\-*/=<>!&|,;:.()[\]{}^_~`@#$%\\]/g, ' ');

  // Now scan for single-letter variables
  const letterRegex = /(?<![a-zA-Z])([a-zA-Z])(?![a-zA-Z])/g;
  while ((m = letterRegex.exec(cleaned)) !== null) {
    const letter = m[1];

    // Skip common non-variable letters
    if (NON_VARIABLE_LETTERS.has(letter)) continue;

    if (!found.has(letter)) {
      found.set(letter, letter);
    }
  }

  // ── 3. Post-processing: validate candidates against original context ──
  // Remove any letter that ONLY appears inside subscripts/superscripts
  // but never as a standalone base-level variable
  const result = [];
  for (const [original, display] of found) {
    // Greek letters were already filtered above
    if (original.startsWith('\\')) {
      result.push({ original, display });
      continue;
    }

    // For single Latin letters, verify they appear at least once
    // at the "base level" (not exclusively as a sub/superscript index)
    // We already blanked sub/superscripts in `cleaned`, so if the letter
    // survived the scan, it appeared at base level — just add it
    result.push({ original, display });
  }

  // Sort: single letters first (alphabetically), then Greek (alphabetically)
  result.sort((a, b) => {
    const aIsGreek = a.original.startsWith('\\');
    const bIsGreek = b.original.startsWith('\\');
    if (aIsGreek !== bIsGreek) return aIsGreek ? 1 : -1;
    return a.display.localeCompare(b.display);
  });

  return result;
}

/**
 * Apply variable mappings to a LaTeX string.
 * `mappings` is an object: { originalVar: newName, ... }
 *   e.g. { 'x': 'velocity', '\\alpha': '\\beta' }
 *
 * Empty or whitespace-only values are skipped (keeps original).
 */
export function applyVariableMapping(latex, mappings) {
  if (!latex || !mappings || Object.keys(mappings).length === 0) return latex;

  let result = latex;

  // Sort keys by length descending so longer tokens are replaced first
  // (e.g. \alpha before a)
  const keys = Object.keys(mappings).sort((a, b) => b.length - a.length);

  for (const original of keys) {
    const replacement = mappings[original];
    if (!replacement || !replacement.trim()) continue;
    if (replacement === original) continue;

    if (original.startsWith('\\')) {
      // Greek / command replacement
      // Match the command when NOT followed by another letter
      const escaped = original.replace(/\\/g, '\\\\');
      const regex = new RegExp(escaped + '(?![a-zA-Z])', 'g');
      result = result.replace(regex, replacement);
    } else {
      // Single-letter variable replacement
      // Match the letter only when not preceded/followed by another letter
      // and not preceded by a backslash (part of a command)
      const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(
        '(?<!\\\\)(?<![a-zA-Z])' + escaped + '(?![a-zA-Z])',
        'g'
      );

      // If the replacement is multi-character and not a LaTeX command,
      // wrap it in \text{} for proper rendering
      let finalReplacement = replacement;
      if (replacement.length > 1 && !replacement.startsWith('\\')) {
        finalReplacement = '\\text{' + replacement + '}';
      }

      result = result.replace(regex, finalReplacement);
    }
  }

  return result;
}

/**
 * Apply variable mappings to a MathML string.
 * Replaces content inside <mi> tags.
 */
export function applyVariableMappingToMathML(mathml, mappings) {
  if (!mathml || !mappings || Object.keys(mappings).length === 0) return mathml;

  let result = mathml;

  for (const [original, replacement] of Object.entries(mappings)) {
    if (!replacement || !replacement.trim()) continue;
    if (replacement === original) continue;

    // Determine what to look for inside <mi> tags
    let miContent = original;
    if (original.startsWith('\\')) {
      // Greek letters appear as Unicode chars in MathML
      miContent = GREEK_MAP[original] || original.replace('\\', '');
    }

    // Determine the replacement content for <mi>
    let miReplacement = replacement;
    if (replacement.startsWith('\\')) {
      // If replacing with a Greek command, use its Unicode form
      miReplacement = GREEK_MAP[replacement] || replacement.replace('\\', '');
    }

    // Replace inside <mi> tags
    // Match <mi> with optional attributes
    const miRegex = new RegExp(
      '(<mi[^>]*>)' + escapeRegExp(miContent) + '(</mi>)',
      'g'
    );
    result = result.replace(miRegex, '$1' + miReplacement + '$2');
  }

  return result;
}

/**
 * Get the display string for a variable value (for input placeholders etc.)
 */
export function getVariableDisplayName(value) {
  if (!value) return '';
  if (value.startsWith('\\') && GREEK_MAP[value]) {
    return GREEK_MAP[value];
  }
  return value;
}

// Utility: escape string for use in regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
