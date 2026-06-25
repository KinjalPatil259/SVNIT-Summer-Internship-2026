import { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PenTool,
  Undo2,
  Redo2,
  Eraser,
  Trash2,
  Sparkles,
  Copy,
  Check,
  Download,
  FileCode,
  FileText,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { ReactSketchCanvas } from "react-sketch-canvas";
import EquationPreview from "../components/EquationPreview";
import { recognizeHandwriting } from '../api/api';
import { addHistoryEntry } from '../utils/historyService';
import { jsPDF } from 'jspdf';
import "../styles/Upload.css";
import "../styles/Dashboard.css";



/* ── Helpers ── */
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

/* ── Animation Variants (same as Upload) ── */
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

/* ═══════════════════════════════════════════
   HANDWRITING PAGE — Matching Upload Design
   ═══════════════════════════════════════════ */
const Handwriting = () => {
  const [loading, setLoading] = useState(false);
  const [equation, setEquation] = useState("");
  const [mathml, setMathml] = useState("");
  const [error, setError] = useState(null);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [copiedLatex, setCopiedLatex] = useState(false);
  const [copiedMathml, setCopiedMathml] = useState(false);

  const canvasRef = useRef(null);

  /* ── Canvas Actions ── */
  const handleClear = () => {
    canvasRef.current?.clearCanvas();
    setEquation("");
    setMathml("");
    setError(null);
  };

  const handleUndo = () => canvasRef.current?.undo();
  const handleRedo = () => canvasRef.current?.redo();

  const toggleEraser = () => {
    const next = !isEraser;
    setIsEraser(next);
    canvasRef.current?.eraseMode(next);
  };

  /* ── Recognize Handler ── */
  const handleRecognize = async () => {
    setLoading(true);
    setEquation("");
    setMathml("");
    setError(null);

    try {
      const imageDataUrl = await canvasRef.current?.exportImage("png");
      if (!imageDataUrl) {
        setError("Could not export canvas image. Please draw something first.");
        setLoading(false);
        return;
      }
      const data = await recognizeHandwriting(imageDataUrl);
      setEquation(data.latex);
      setMathml(data.mathml || "");
      addHistoryEntry({
        latex: data.latex,
        mathml: data.mathml || '',
        source: 'handwriting',
      });
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Handwriting recognition failed.';
      setError(detail);
      console.error("Handwriting recognition error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Copy ── */
  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'latex') {
      setCopiedLatex(true);
      setTimeout(() => setCopiedLatex(false), 2000);
    } else {
      setCopiedMathml(true);
      setTimeout(() => setCopiedMathml(false), 2000);
    }
  };

  /* ── Download ── */
  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

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
    doc.text('Handwriting Recognition Report', 20, 24);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Source: Handwritten Input Canvas', 20, 33);

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
    const splitLatex = doc.splitTextToSize(equation, pageWidth - 40);
    const latexBoxHeight = splitLatex.length * 5 + 10;
    
    checkPageOverflow(latexBoxHeight);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(20, y, pageWidth - 40, latexBoxHeight, 'FD');
    doc.text(splitLatex, 25, y + 7);
    y += latexBoxHeight + 15;

    // MathML Code
    if (mathml) {
      checkPageOverflow(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(11, 29, 51);
      doc.text('2. MathML Markup (XML)', 20, y);
      y += 10;
      
      doc.setFont('courier', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      const formattedMathml = formatXml(mathml);
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
    }

    doc.save('handwriting-equation-report.pdf');
  };

  const exportToWord = () => {
    const wordHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>Handwriting Recognition Export</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #333333; line-height: 1.5; padding: 20px; }
    h1 { color: #0066CC; font-size: 24px; border-bottom: 2px solid #0066CC; padding-bottom: 5px; margin-bottom: 20px; }
    h2 { color: #0B1D33; font-size: 16px; margin-top: 25px; border-left: 4px solid #0066CC; padding-left: 8px; }
    .latex-box { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; font-family: Consolas, monospace; margin: 10px 0; white-space: pre-wrap; word-break: break-all; color: #000000; }
    .math-render { margin: 15px 0; padding: 10px; background-color: #fafafa; border: 1px solid #cbd5e1; color: #000000; }
  </style>
</head>
<body>
  <h1>Handwriting Recognition Report</h1>
  <div style="font-size:11px;color:#64748B;margin-bottom:20px">
    <strong>Generated on:</strong> ${new Date().toLocaleString()}<br>
    <strong>Source:</strong> Handwritten Input Canvas
  </div>
  
  <h2>1. LaTeX Source Code</h2>
  <div class="latex-box">${equation}</div>
  
  ${mathml ? `
  <h2>2. MathML Markup (XML)</h2>
  <div class="latex-box">${formatXml(mathml).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  
  <h2>3. Rendered Equation (MathML)</h2>
  <div class="math-render">${mathml}</div>
  
  <p style="font-size:11px;color:#000000;font-style:italic;margin-top:25px">
    Note: The MathML XML code can be copied and embedded into HTML or MS Word files to render the equation.
  </p>
  ` : ''}
</body>
</html>`;
    downloadFile(wordHtml, 'handwriting-equation-report.doc', 'application/msword');
  };

  /* ── Pen Sizes ── */
  const penSizes = [
    { label: "S", size: 2 },
    { label: "M", size: 4 },
    { label: "L", size: 6 },
  ];

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
            <PenTool size={24} className="text-white" />
          </div>
          <div>
            <h1
              className="text-2xl font-bold text-[#0B1D33]"
              style={{ fontFamily: "'Poppins', sans-serif", margin: 0 }}
            >
              Handwriting OCR
            </h1>
            <p className="text-base text-[#1F2937] mt-1">
              Draw your equation on the canvas below and let AI recognize it instantly.
            </p>
          </div>
        </motion.div>

        {/* ── Canvas Card (Glass Card) ── */}
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.08 }}
          className="upload-glass-card"
        >
          <div className="upload-glass-card-inner" style={{ padding: 0 }}>
            {/* Toolbar */}
            <div className="canvas-toolbar">
              <button className="canvas-toolbar-btn" onClick={handleUndo} title="Undo">
                <Undo2 size={16} />
                <span>Undo</span>
              </button>

              <button className="canvas-toolbar-btn" onClick={handleRedo} title="Redo">
                <Redo2 size={16} />
                <span>Redo</span>
              </button>

              <div className="canvas-toolbar-divider" />

              <button
                className={`canvas-toolbar-btn ${isEraser ? "active" : ""}`}
                onClick={toggleEraser}
                title="Eraser"
              >
                <Eraser size={16} />
                <span>Eraser</span>
              </button>

              <button className="canvas-toolbar-btn danger" onClick={handleClear} title="Clear">
                <Trash2 size={16} />
                <span>Clear</span>
              </button>

              <div className="canvas-toolbar-divider" />

              {/* Pen Size Controls */}
              {penSizes.map((pen) => (
                <button
                  key={pen.label}
                  className={`canvas-toolbar-btn ${strokeWidth === pen.size && !isEraser ? "active" : ""}`}
                  onClick={() => {
                    setStrokeWidth(pen.size);
                    if (isEraser) {
                      setIsEraser(false);
                      canvasRef.current?.eraseMode(false);
                    }
                  }}
                  title={`Pen size: ${pen.size}px`}
                >
                  <div
                    style={{
                      width: pen.size + 4,
                      height: pen.size + 4,
                      borderRadius: "50%",
                      background:
                        strokeWidth === pen.size && !isEraser ? "white" : "#64748B",
                    }}
                  />
                  <span>{pen.label}</span>
                </button>
              ))}

              <div className="canvas-toolbar-divider" />

              {/* Recognize Button */}
              <button
                className="canvas-toolbar-btn recognize"
                onClick={handleRecognize}
                disabled={loading}
                style={{ marginLeft: "auto" }}
              >
                <Sparkles size={16} />
                <span>{loading ? "Recognizing…" : "Recognize Equation"}</span>
              </button>
            </div>

            {/* Canvas with visible grid background */}
            <div className="relative bg-white rounded-b-2xl overflow-hidden">
              <div
                className="absolute inset-0 pointer-events-none z-0"
                style={{
                  backgroundImage: 'linear-gradient(rgba(0, 102, 204, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 102, 204, 0.05) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />
              <ReactSketchCanvas
                ref={canvasRef}
                strokeWidth={strokeWidth}
                strokeColor="#0B1D33"
                canvasColor="transparent"
                width="100%"
                height="400px"
                eraserWidth={20}
                style={{ border: "none", position: "relative", zIndex: 1 }}
              />

              {/* Processing Overlay */}
              <AnimatePresence>
                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(255, 255, 255, 0.88)",
                      backdropFilter: "blur(8px)",
                      zIndex: 10,
                    }}
                  >
                    <div className="upload-processing">
                      <div className="upload-processing-spinner-wrap">
                        <div className="upload-processing-spinner-glow" />
                        <div className="upload-processing-spinner" />
                      </div>
                      <div className="upload-processing-text">Analyzing Your Handwriting…</div>
                      <div className="upload-processing-sub text-[#1F2937]">
                        Our AI is converting your strokes into a LaTeX equation
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* ── Error Alert ── */}
        <AnimatePresence>
          {error && !loading && (
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
                <div className="upload-error-title">Recognition Failed</div>
                <div className="upload-error-desc">{error}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Result Section (same structure as Upload) ── */}
        <AnimatePresence>
          {!loading && equation && (
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
                  Equation recognized successfully
                </div>
              </motion.div>

              {/* Equation Preview */}
              <motion.div {...cardChild} className="upload-result-card">
                <div className="upload-result-header">
                  <div className="upload-result-header-icon">
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="upload-result-header-title">Recognized Equation</div>
                    <div className="upload-result-header-sub text-[#1F2937]">AI-extracted visualization</div>
                  </div>
                </div>
                <div className="upload-result-body">
                  <EquationPreview equation={equation} hideCard={true} />
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
                        onClick={() => handleCopy(equation, 'latex')}
                      >
                        {copiedLatex ? <Check size={14} /> : <Copy size={14} />}
                        {copiedLatex ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="upload-code-content">{equation}</div>
                  </div>
                </motion.div>

                {/* MathML Source */}
                {mathml && (
                  <motion.div {...cardChild} transition={{ ...cardChild.transition, delay: 0.18 }}>
                    <div className="upload-code-block">
                      <div className="upload-code-header">
                        <span className="upload-code-label">MathML Markup</span>
                        <button
                          className={`upload-code-copy ${copiedMathml ? 'copied' : ''}`}
                          onClick={() => handleCopy(mathml, 'mathml')}
                        >
                          {copiedMathml ? <Check size={14} /> : <Copy size={14} />}
                          {copiedMathml ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div className="upload-code-content" style={{ fontSize: '12px', maxHeight: 200, overflowY: 'auto' }}>
                        {mathml}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Export Options */}
              <motion.div {...cardChild} transition={{ ...cardChild.transition, delay: 0.22 }}>
                <div className="upload-export-card">
                  <div className="upload-export-label">
                    <Download size={17} style={{ color: '#94A3B8' }} />
                    Export Options
                  </div>
                  <motion.button
                    onClick={() => downloadFile(equation, 'equation.tex', 'text/plain')}
                    className="upload-export-btn"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <FileCode size={16} />
                    LaTeX (.tex)
                  </motion.button>
                  {mathml && (
                    <motion.button
                      onClick={() => downloadFile(mathml, 'equation.mml', 'application/mathml+xml')}
                      className="upload-export-btn"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <FileCode size={16} />
                      MathML (.mml)
                    </motion.button>
                  )}
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
};

export default Handwriting;