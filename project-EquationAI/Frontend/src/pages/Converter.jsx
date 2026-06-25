import { useState, useEffect, useRef, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Code2,
  FileCode2,
  Download,
  AlertCircle,
  ArrowRightLeft,
  Zap,
  ChevronRight,
  Terminal,
  Braces,
  FileCode,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import EquationPreview from '../components/EquationPreview';
import { convertLatexToMathml, convertMathmlToLatex } from '../api/api';
import { addHistoryEntry } from '../utils/historyService';
import '../styles/Upload.css';
import '../styles/Dashboard.css';



/* ── animation variants (same as Upload) ── */
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] },
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardChild = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
};

/* ── preset data ── */
const LATEX_PRESETS = [
  { label: 'Fraction', code: '\\frac{x^2 + y^2}{2}', icon: '½' },
  { label: 'Quadratic', code: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', icon: 'x²' },
  { label: 'Integral', code: '\\int_{a}^{b} x^3 dx', icon: '∫' },
  { label: 'Summation', code: '\\sum_{i=1}^{n} i^2 = \\frac{n(n+1)(2n+1)}{6}', icon: 'Σ' },
];

const MATHML_PRESETS = [
  {
    label: 'Fraction',
    code: '<math><mfrac><mrow><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><msup><mi>y</mi><mn>2</mn></msup></mrow><mn>2</mn></mfrac></math>',
    icon: '½',
  },
  {
    label: 'Quadratic',
    code: '<math><mi>x</mi><mo>=</mo><mfrac><mrow><mo>-</mo><mi>b</mi><mo>&PlusMinus;</mo><msqrt><msup><mi>b</mi><mn>2</mn></msup><mo>-</mo><mn>4</mn><mi>a</mi><mi>c</mi></msqrt></mrow><mrow><mn>2</mn><mi>a</mi></mrow></mfrac></math>',
    icon: 'x²',
  },
  {
    label: 'Integral',
    code: '<math><msubsup><mo>&int;</mo><mi>a</mi><mi>b</mi></msubsup><msup><mi>x</mi><mn>3</mn></msup><mo>&InvisibleTimes;</mo><mi>d</mi><mi>x</mi></math>',
    icon: '∫',
  },
  {
    label: 'Summation',
    code: '<math><munderover><mo>&sum;</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mi>n</mi></munderover><msup><mi>i</mi><mn>2</mn></msup></math>',
    icon: 'Σ',
  },
];

/* ── xml formatter ── */
function formatXml(xmlString) {
  if (!xmlString) return '';
  let formatted = '';
  const reg = /(>)(<)(\/*)*/g;
  const xml = xmlString.replace(reg, '$1\r\n$2$3');
  let pad = 0;
  xml.split('\r\n').forEach((node) => {
    let indent = 0;
    if (node.match(/.+<\/\w[^>]*>/)) {
      indent = 0;
    } else if (node.match(/^<\/\w/)) {
      if (pad !== 0) pad -= 1;
    } else if (node.match(/^<\w[^>]*[^/]>$/)) {
      indent = 1;
    }
    formatted += '  '.repeat(pad) + node + '\r\n';
    pad += indent;
  });
  return formatted.trim();
}

/* ═══════════════════════════════════════════
   CONVERTER PAGE — Matching Upload Design
   ═══════════════════════════════════════════ */
export default function Converter() {
  const [mode, setMode] = useState('latex-to-mathml');
  const [inputCode, setInputCode] = useState('');
  const [outputCode, setOutputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [copiedLatex, setCopiedLatex] = useState(false);
  const [copiedMathml, setCopiedMathml] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    setInputCode('');
    setOutputCode('');
    setError(null);
  }, [mode]);

  const isLatex = mode === 'latex-to-mathml';
  const presets = isLatex ? LATEX_PRESETS : MATHML_PRESETS;

  const handleConvert = async () => {
    if (!inputCode.trim()) return;
    setLoading(true);
    setError(null);
    setOutputCode('');
    try {
      if (isLatex) {
        const data = await convertLatexToMathml(inputCode);
        setOutputCode(data.mathml);
        addHistoryEntry({ latex: inputCode, mathml: data.mathml, source: 'converter' });
      } else {
        const data = await convertMathmlToLatex(inputCode);
        setOutputCode(data.latex);
        addHistoryEntry({ latex: data.latex, mathml: inputCode, source: 'converter' });
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Conversion failed. Please check syntax.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'output') {
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 2000);
    } else if (type === 'latex') {
      setCopiedLatex(true);
      setTimeout(() => setCopiedLatex(false), 2000);
    } else {
      setCopiedMathml(true);
      setTimeout(() => setCopiedMathml(false), 2000);
    }
  };

  const handleDownload = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const latexCode = isLatex ? inputCode : outputCode;
  const mathmlCode = isLatex ? outputCode : inputCode;

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header Band
    doc.setFillColor(0, 102, 204);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('MathML To LaTeX Converter Report', 20, 24);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Source: MathML To LaTeX Converter', 20, 33);

    y = 55;

    // Timestamp under header
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, y);
    y += 15;

    const checkPageOverflow = (neededHeight) => {
      if (y + neededHeight > 275) {
        doc.addPage();
        y = 20;
      }
    };

    // LaTeX Code
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(11, 29, 51);
    doc.text('1. LaTeX Source Code', 20, y);
    y += 10;

    doc.setFont('courier', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const splitLatex = doc.splitTextToSize(latexCode, pageWidth - 40);
    const latexBoxHeight = splitLatex.length * 5 + 10;

    checkPageOverflow(latexBoxHeight);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(20, y, pageWidth - 40, latexBoxHeight, 'FD');
    doc.text(splitLatex, 25, y + 7);
    y += latexBoxHeight + 15;

    // MathML Code
    checkPageOverflow(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(11, 29, 51);
    doc.text('2. MathML Markup (XML)', 20, y);
    y += 10;

    doc.setFont('courier', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    const formattedMathml = formatXml(mathmlCode);
    const splitMathml = doc.splitTextToSize(formattedMathml, pageWidth - 40);
    const mathmlBoxHeight = splitMathml.length * 4.5 + 10;

    checkPageOverflow(mathmlBoxHeight);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(20, y, pageWidth - 40, mathmlBoxHeight, 'FD');
    doc.text(splitMathml, 25, y + 7);
    y += mathmlBoxHeight + 15;

    // Note / Footnote
    checkPageOverflow(20);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Note: The MathML XML code can be copied and embedded into HTML or MS Word files to render the equation.', 20, y);

    doc.save('converter-equation-report.pdf');
  };

  const exportToWord = () => {
    const wordHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>Converter Export</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #333333; line-height: 1.5; padding: 20px; }
    h1 { color: #0066CC; font-size: 24px; border-bottom: 2px solid #0066CC; padding-bottom: 5px; margin-bottom: 20px; }
    h2 { color: #0B1D33; font-size: 16px; margin-top: 25px; border-left: 4px solid #0066CC; padding-left: 8px; }
    .latex-box { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; font-family: Consolas, monospace; margin: 10px 0; white-space: pre-wrap; word-break: break-all; color: #000000; }
    .math-render { margin: 15px 0; padding: 10px; background-color: #fafafa; border: 1px solid #cbd5e1; color: #000000; }
  </style>
</head>
<body>
  <h1>Converter Report</h1>
  <div style="font-size:11px;color:#64748B;margin-bottom:20px">
    <strong>Generated on:</strong> ${new Date().toLocaleString()}<br>
    <strong>Source:</strong> MathML ⇄ LaTeX Converter
  </div>
  
  <h2>1. LaTeX Source Code</h2>
  <div class="latex-box">${latexCode}</div>
  
  <h2>2. MathML Markup (XML)</h2>
  <div class="latex-box">${formatXml(mathmlCode).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  
  <h2>3. Rendered Equation (MathML)</h2>
  <div class="math-render">${mathmlCode}</div>
  
  <p style="font-size:11px;color:#000000;font-style:italic;margin-top:25px">
    Note: The MathML XML code can be copied and embedded into HTML or MS Word files to render the equation.
  </p>
</body>
</html>`;
    handleDownload(wordHtml, 'converter-equation-report.doc', 'application/msword');
  };

  /* ────────────────── RENDER ────────────────── */
  return (
    <div className="upload-page">

      <div className="upload-content">
        <motion.div {...fadeUp} className="flex items-center gap-4 mb-4">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
            style={{
              background: 'linear-gradient(135deg, #0066CC, #4F46E5)',
              boxShadow: '0 4px 16px rgba(0, 102, 204, 0.2)',
            }}
          >
            <ArrowRightLeft size={24} className="text-white" />
          </div>
          <div>
            <h1
              className="text-2xl font-bold text-[#0B1D33]"
              style={{ fontFamily: "'Poppins', sans-serif", margin: 0 }}
            >
              MathML ⇄ LaTeX Converter
            </h1>
            <p className="text-base text-[#1F2937] mt-1">
              Seamlessly translate between LaTeX source code and MathML markup with instant visual preview.
            </p>
          </div>
        </motion.div>

        {/* ── Mode Toggle ── */}
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.06 }}
          className="converter-mode-toggle-wrap"
        >
          <div className="converter-mode-toggle">
            <button
              onClick={() => setMode('latex-to-mathml')}
              className={`converter-mode-btn ${isLatex ? 'active' : ''}`}
            >
              <Terminal size={15} />
              LaTeX → MathML
            </button>
            <button
              className="converter-swap-btn"
              onClick={() => setMode(isLatex ? 'mathml-to-latex' : 'latex-to-mathml')}
              title="Swap direction"
              style={{ transform: isLatex ? 'rotate(0deg)' : 'rotate(180deg)' }}
            >
              <ArrowRightLeft size={16} />
            </button>
            <button
              onClick={() => setMode('mathml-to-latex')}
              className={`converter-mode-btn ${!isLatex ? 'active' : ''}`}
            >
              <Braces size={15} />
              MathML → LaTeX
            </button>
          </div>
        </motion.div>

        {/* ── Input Card (Glass Card) ── */}
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.1 }}
          className="upload-glass-card"
        >
          <div className="upload-glass-card-inner">
            {/* Error Alert */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ duration: 0.35 }}
                  className="upload-error-alert"
                >
                  <div className="upload-error-icon">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <div className="upload-error-title">Conversion Error</div>
                    <div className="upload-error-desc">{error}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Template Chips */}
            <div className="converter-templates-section">
              <span className="converter-templates-label">Quick Templates</span>
              <div className="upload-chip-row" style={{ justifyContent: 'flex-start', marginBottom: 0 }}>
                {presets.map((preset) => {
                  const isActive = inputCode === preset.code;
                  return (
                    <motion.button
                      key={preset.label}
                      whileHover={{ scale: 1.05, y: -2 }}
                      className={`converter-template-chip ${isActive ? 'active' : ''}`}
                      onClick={() => { setInputCode(preset.code); setError(null); setOutputCode(''); }}
                    >
                      <span className="converter-template-icon">{preset.icon}</span>
                      {preset.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Code Input Area */}
            <div className="converter-textarea-wrap">
              <div className="converter-textarea-header">
                <span className="converter-textarea-label">
                  <ChevronRight size={12} />
                  {isLatex ? 'Enter LaTeX expression' : 'Enter MathML markup'}
                </span>
                <span className="converter-textarea-count">{inputCode.length} chars</span>
              </div>
              <textarea
                ref={textareaRef}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder={
                  isLatex
                    ? 'e.g. \\frac{a}{b} + x^2'
                    : 'e.g. <math><mfrac><mi>a</mi><mi>b</mi></mfrac></math>'
                }
                className="converter-textarea"
              />
            </div>

            {/* Convert Button */}
            <motion.button
              onClick={handleConvert}
              disabled={loading || !inputCode.trim()}
              className={`upload-process-btn ${loading || !inputCode.trim() ? 'disabled' : ''}`}
              style={{ maxWidth: '100%' }}
              whileHover={!(loading || !inputCode.trim()) ? { scale: 1.02 } : {}}
              whileTap={!(loading || !inputCode.trim()) ? { scale: 0.98 } : {}}
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={19} />
                  Translating Formula…
                </>
              ) : (
                <>
                  <Sparkles size={19} />
                  Convert Format
                  <ChevronRight size={16} />
                </>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* ── Result Section ── */}
        <AnimatePresence>
          {outputCode && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="upload-results"
              variants={stagger}
            >
              {/* Success Badge */}
              <motion.div {...cardChild} className="flex justify-center">
                <div className="upload-success-badge">
                  <CheckCircle2 size={16} />
                  Conversion completed successfully
                </div>
              </motion.div>

              {/* Equation Preview */}
              <motion.div {...cardChild} className="upload-result-card">
                <div className="upload-result-header">
                  <div className="upload-result-header-icon">
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="upload-result-header-title">Visual Preview</div>
                    <div className="upload-result-header-sub">AI-rendered equation visualization</div>
                  </div>
                </div>
                <div className="upload-result-body">
                  <EquationPreview equation={latexCode} hideCard={true} />
                </div>
              </motion.div>

              {/* Code Blocks Grid */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* LaTeX Source */}
                <motion.div {...cardChild} transition={{ ...cardChild.transition, delay: 0.12 }}>
                  <div className="upload-code-block">
                    <div className="upload-code-header">
                      <span className="upload-code-label">LaTeX Source</span>
                      <button
                        className={`upload-code-copy ${copiedLatex ? 'copied' : ''}`}
                        onClick={() => handleCopy(latexCode, 'latex')}
                      >
                        {copiedLatex ? <Check size={14} /> : <Copy size={14} />}
                        {copiedLatex ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="upload-code-content">{latexCode}</div>
                  </div>
                </motion.div>

                {/* MathML Source */}
                <motion.div {...cardChild} transition={{ ...cardChild.transition, delay: 0.18 }}>
                  <div className="upload-code-block">
                    <div className="upload-code-header">
                      <span className="upload-code-label">MathML Markup</span>
                      <button
                        className={`upload-code-copy ${copiedMathml ? 'copied' : ''}`}
                        onClick={() => handleCopy(formatXml(mathmlCode), 'mathml')}
                      >
                        {copiedMathml ? <Check size={14} /> : <Copy size={14} />}
                        {copiedMathml ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="upload-code-content" style={{ fontSize: '12px', maxHeight: 200, overflowY: 'auto' }}>
                      {formatXml(mathmlCode)}
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Export Options */}
              <motion.div {...cardChild} transition={{ ...cardChild.transition, delay: 0.22 }}>
                <div className="upload-export-card">
                  <div className="upload-export-label">
                    <Download size={17} style={{ color: '#94A3B8' }} />
                    Export Options
                  </div>
                  <motion.button
                    onClick={() => handleDownload(latexCode, 'equation.tex', 'text/plain')}
                    className="upload-export-btn"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <FileCode size={16} />
                    LaTeX (.tex)
                  </motion.button>
                  <motion.button
                    onClick={() => handleDownload(formatXml(mathmlCode), 'equation.mml', 'application/mathml+xml')}
                    className="upload-export-btn"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <FileCode size={16} />
                    MathML (.mml)
                  </motion.button>
                  <motion.button
                    onClick={exportToPDF}
                    className="upload-export-btn"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <FileText size={16} style={{ color: '#EF4444' }} />
                    PDF Report (.pdf)
                  </motion.button>
                  <motion.button
                    onClick={exportToWord}
                    className="upload-export-btn"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <FileText size={16} style={{ color: '#2563EB' }} />
                    Word (.doc)
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
