import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  FileText,
  Image,
  Copy,
  Check,
  Download,
  X,
  FileCode,
  Sparkles,
  AlertCircle,
  Search,
  ExternalLink,
  CheckCircle2,
  FileSearch,
  Scan,
  List,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import EquationPreview from '../components/EquationPreview';
import { uploadEquationFile, convertLatexToMathml } from '../api/api';
import { addHistoryEntry } from '../utils/historyService';
import { extractVariables, applyVariableMapping, applyVariableMappingToMathML, getVariableDisplayName } from '../utils/variableMapper';
import { jsPDF } from 'jspdf';
import '../styles/Upload.css';
import '../styles/Dashboard.css';



/* ═══════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════ */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatXml(xmlString) {
  if (!xmlString) return '';
  let formatted = '';
  const reg = /(>)(<)(\/*)/;
  // Note: the 'g' flag is added below
  const regG = new RegExp(reg.source, 'g');
  const xml = xmlString.replace(regG, '$1\r\n$2$3');
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

/* ═══════════════════════════════════════════════════
   Animated Progress Hook
   ═══════════════════════════════════════════════════ */
function useSimulatedProgress(isActive) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setProgress(0);
      return;
    }

    setProgress(0);
    const stages = [
      { target: 25, duration: 800 },
      { target: 50, duration: 1200 },
      { target: 72, duration: 1500 },
      { target: 88, duration: 2000 },
      { target: 95, duration: 3000 },
    ];

    let currentStage = 0;
    let current = 0;

    const tick = () => {
      if (currentStage >= stages.length) return;
      const { target, duration } = stages[currentStage];
      const step = (target - current) / (duration / 50);

      const interval = setInterval(() => {
        current += step;
        if (current >= target) {
          current = target;
          clearInterval(interval);
          currentStage++;
          setTimeout(tick, 200);
        }
        setProgress(Math.round(current));
      }, 50);

      return () => clearInterval(interval);
    };

    const cleanup = tick();
    return () => { if (cleanup) cleanup(); };
  }, [isActive]);

  return progress;
}

/* ═══════════════════════════════════════════════════
   Framer Motion Variants
   ═══════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════
   Upload Page Component
   ═══════════════════════════════════════════════════ */
export default function Upload() {
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);

  // Results
  const [equation, setEquation] = useState('');
  const [mathml, setMathml] = useState('');
  const [similarityResults, setSimilarityResults] = useState([]);

  // Multi-equation extraction
  const [extractedEquations, setExtractedEquations] = useState([]);
  const [extractionMethod, setExtractionMethod] = useState(null);
  const [selectedEqIndex, setSelectedEqIndex] = useState(0);
  const [copiedEqIndex, setCopiedEqIndex] = useState(null);

  // Copy states
  const [copiedLatex, setCopiedLatex] = useState(false);
  const [copiedMathml, setCopiedMathml] = useState(false);

  // Variable mapping
  const [variableMappings, setVariableMappings] = useState({});
  const [detectedVariables, setDetectedVariables] = useState([]);
  const [showMappingPanel, setShowMappingPanel] = useState(true);

  // Animated progress
  const progress = useSimulatedProgress(loading);

  const debounceTimeoutRef = useRef(null);

  const handleEquationEdit = (e) => {
    const newEq = e.target.value;
    setEquation(newEq);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        if (newEq.trim() !== '') {
          const data = await convertLatexToMathml(newEq);
          setMathml(data.mathml);
        } else {
          setMathml('');
        }
        const vars = extractVariables(newEq);
        setDetectedVariables(vars);
      } catch (err) {
        console.error("Error updating equation:", err);
      }
    }, 600);
  };

  // Derived mapped outputs
  const mappedEquation = useMemo(
    () => applyVariableMapping(equation, variableMappings),
    [equation, variableMappings]
  );
  const mappedMathml = useMemo(
    () => applyVariableMappingToMathML(mathml, variableMappings),
    [mathml, variableMappings]
  );

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onDrop = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      setEquation('');
      setMathml('');
      setSimilarityResults([]);
      setError(null);

      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: false,
    noClick: false,
  });

  const handleUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    setEquation('');
    setMathml('');
    setSimilarityResults([]);
    setExtractedEquations([]);
    setExtractionMethod(null);
    setSelectedEqIndex(0);
    setVariableMappings({});
    setDetectedVariables([]);
    setShowMappingPanel(true);

    try {
      const data = await uploadEquationFile(selectedFile);
      setEquation(data.latex);
      setMathml(data.mathml);
      setSimilarityResults(data.similarity_results || []);
      setExtractedEquations(data.extracted_equations || []);
      setExtractionMethod(data.extraction_method || 'ocr');

      // Detect variables for mapping panel
      const vars = extractVariables(data.latex);
      setDetectedVariables(vars);

      // Auto-save to history
      addHistoryEntry({
        latex: data.latex,
        mathml: data.mathml,
        source: 'upload',
        fileName: selectedFile.name,
      });
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'An error occurred during AI processing.');
    } finally {
      setLoading(false);
    }
  };

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

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setEquation('');
    setMathml('');
    setSimilarityResults([]);
    setExtractedEquations([]);
    setExtractionMethod(null);
    setSelectedEqIndex(0);
    setError(null);
    setVariableMappings({});
    setDetectedVariables([]);
    setShowMappingPanel(true);
  };

  const handleSelectEquation = (idx) => {
    if (idx >= 0 && idx < extractedEquations.length) {
      setSelectedEqIndex(idx);
      setEquation(extractedEquations[idx]);
      // Re-detect variables for the newly selected equation
      const vars = extractVariables(extractedEquations[idx]);
      setDetectedVariables(vars);
      setVariableMappings({});
    }
  };

  const handleCopyEquation = (idx) => {
    navigator.clipboard.writeText(extractedEquations[idx]);
    setCopiedEqIndex(idx);
    setTimeout(() => setCopiedEqIndex(null), 2000);
  };

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleVariableChange = (original, newValue) => {
    setVariableMappings((prev) => {
      const updated = { ...prev };
      if (!newValue || !newValue.trim()) {
        delete updated[original];
      } else {
        updated[original] = newValue;
      }
      return updated;
    });
  };

  const resetVariableMapping = (original) => {
    setVariableMappings((prev) => {
      const updated = { ...prev };
      delete updated[original];
      return updated;
    });
  };

  const resetAllMappings = () => {
    setVariableMappings({});
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
    doc.text('AI Equation Analyzer Report', 20, 24);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Source File: ${selectedFile?.name || 'N/A'}`, 20, 33);

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
    const splitLatex = doc.splitTextToSize(mappedEquation, pageWidth - 40);
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
    const formattedMathml = formatXml(mappedMathml);
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

    doc.save('equation-analysis-report.pdf');
  };

  const exportToWord = () => {
    const wordHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>AI Equation Analyzer Export</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #333333; line-height: 1.5; padding: 20px; }
    h1 { color: #0066CC; font-size: 24px; border-bottom: 2px solid #0066CC; padding-bottom: 5px; margin-bottom: 20px; }
    h2 { color: #0B1D33; font-size: 16px; margin-top: 25px; border-left: 4px solid #0066CC; padding-left: 8px; }
    .latex-box { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; font-family: Consolas, monospace; margin: 10px 0; white-space: pre-wrap; word-break: break-all; color: #000000; }
    .math-render { margin: 15px 0; padding: 10px; background-color: #fafafa; border: 1px solid #cbd5e1; color: #000000; }
  </style>
</head>
<body>
  <h1>AI Equation Analyzer Report</h1>
  <div style="font-size:11px;color:#64748B;margin-bottom:20px">
    <strong>Generated on:</strong> ${new Date().toLocaleString()}<br>
    <strong>Source File:</strong> ${selectedFile?.name || 'N/A'}
  </div>
  
  <h2>1. LaTeX Source Code</h2>
  <div class="latex-box">${mappedEquation}</div>
  
  <h2>2. MathML Markup (XML)</h2>
  <div class="latex-box">${formatXml(mappedMathml).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  
  <h2>3. Rendered Equation (MathML)</h2>
  <div class="math-render">${mappedMathml}</div>
  
  <p style="font-size:11px;color:#000000;font-style:italic;margin-top:25px">
    Note: The MathML XML code can be copied and embedded into HTML or MS Word files to render the equation.
  </p>
</body>
</html>`;
    downloadFile(wordHtml, 'equation-analysis-report.doc', 'application/msword');
  };

  /* ═══════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════ */
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
            <UploadCloud size={24} className="text-white" />
          </div>
          <div>
            <h1
              className="text-2xl font-bold text-[#0B1D33]"
              style={{ fontFamily: "'Poppins', sans-serif", margin: 0 }}
            >
              Document OCR
            </h1>
            <p className="text-base text-[#1F2937] mt-1">
              Upload an image or document containing a mathematical equation and let AI extract the LaTeX.
            </p>
          </div>
        </motion.div>

        {/* ── Upload Card ── */}
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.08 }}
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
                    <div className="upload-error-title">Processing Failed</div>
                    <div className="upload-error-desc">{error}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dropzone */}
            {!selectedFile && (
              <div
                {...getRootProps()}
                className={`upload-dropzone-premium ${isDragActive ? 'drag-active' : ''}`}
              >
                <input {...getInputProps()} />

                <motion.div
                  animate={
                    isDragActive
                      ? { scale: 1.18, y: -8 }
                      : { scale: 1, y: 0 }
                  }
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="upload-dropzone-icon"
                  style={{
                    background: isDragActive
                      ? 'linear-gradient(135deg, #0066CC, #4F46E5)'
                      : 'linear-gradient(135deg, rgba(0, 102, 204, 0.1), rgba(79, 70, 229, 0.1))',
                    boxShadow: isDragActive
                      ? '0 8px 28px rgba(0, 102, 204, 0.3)'
                      : 'none',
                  }}
                >
                  <UploadCloud
                    size={34}
                    style={{ color: isDragActive ? '#ffffff' : '#0066CC' }}
                  />
                </motion.div>

                <div className="upload-dropzone-title">
                  {isDragActive ? 'Drop your file here' : 'Drag & drop your file here'}
                </div>
                <div className="upload-dropzone-sub">
                  or click to browse from your computer
                </div>

                {/* File type chips */}
                <div className="upload-chip-row">
                  <motion.span whileHover={{ scale: 1.05, y: -2 }} className="upload-chip image">
                    <Image size={14} /> PNG
                  </motion.span>
                  <motion.span whileHover={{ scale: 1.05, y: -2 }} className="upload-chip image">
                    <Image size={14} /> JPG
                  </motion.span>
                  <motion.span whileHover={{ scale: 1.05, y: -2 }} className="upload-chip doc">
                    <FileText size={14} /> DOCX
                  </motion.span>
                  <motion.span whileHover={{ scale: 1.05, y: -2 }} className="upload-chip pdf">
                    <FileCode size={14} /> PDF
                  </motion.span>
                </div>

                <motion.button
                  type="button"
                  className="upload-browse-btn"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    open();
                  }}
                >
                  Browse Files
                </motion.button>
              </div>
            )}

            {/* ── File Preview ── */}
            <AnimatePresence>
              {selectedFile && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <div className="upload-preview-card">
                    {/* Visual Preview */}
                    <div className="upload-preview-image-wrap">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" />
                      ) : (
                        <div className="flex flex-col items-center gap-3" style={{ color: '#94A3B8' }}>
                          {selectedFile.type === 'application/pdf' ? (
                            <FileCode size={52} />
                          ) : (
                            <FileText size={52} />
                          )}
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>
                            Document Preview Unavailable
                          </span>
                        </div>
                      )}
                      <motion.button
                        onClick={removeFile}
                        className="upload-preview-remove"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <X size={16} />
                      </motion.button>
                    </div>

                    <div className="upload-preview-info">
                      <div className="upload-preview-name">{selectedFile.name}</div>
                      <div className="upload-preview-size">{formatFileSize(selectedFile.size)}</div>
                    </div>

                    {/* Upload / Recognize button */}
                    {!loading && !equation && (
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 0.35 }}
                        onClick={handleUpload}
                        className="upload-process-btn"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Sparkles size={19} />
                        Generate MathML
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Processing State ── */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="upload-processing"
                >
                  <div className="upload-processing-spinner-wrap">
                    <div className="upload-processing-spinner-glow" />
                    <div className="upload-processing-spinner" />
                  </div>
                  <div className="upload-processing-text">Analyzing your equation…</div>
                  <div className="upload-processing-sub text-[#1F2937]">
                    Running neural OCR pipeline and extracting LaTeX
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="upload-progress-bar-wrap">
                    <div className="upload-progress-bar-track">
                      <motion.div
                        className="upload-progress-bar-fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="upload-progress-percent">{progress}%</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Result Section ── */}
        <AnimatePresence>
          {equation && !loading && (
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
                  {extractionMethod && (
                    <span className="upload-success-method">
                      {extractionMethod === 'text' ? 'via Text Extraction' : 'via AI OCR'}
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Multi-Equation Picker (when multiple equations found) */}
              {extractedEquations.length > 1 && (
                <motion.div {...cardChild} transition={{ ...cardChild.transition, delay: 0.06 }}>
                  <div className="upload-multi-eq-card">
                    <div className="upload-multi-eq-header">
                      <div className="upload-multi-eq-header-left">
                        <List size={18} style={{ color: '#0066CC' }} />
                        <h3>Extracted Equations</h3>
                      </div>
                      <span className="upload-multi-eq-count">
                        {extractedEquations.length} found
                      </span>
                    </div>
                    <div className="upload-multi-eq-list">
                      {extractedEquations.map((eq, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + idx * 0.05, duration: 0.3 }}
                          className={`upload-multi-eq-item ${idx === selectedEqIndex ? 'active' : ''}`}
                          onClick={() => handleSelectEquation(idx)}
                        >
                          <div className="upload-multi-eq-index">{idx + 1}</div>
                          <div className="upload-multi-eq-latex" title={eq}>{eq}</div>
                          <div className="upload-multi-eq-actions">
                            <button
                              className={`upload-multi-eq-copy-btn ${copiedEqIndex === idx ? 'copied' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyEquation(idx);
                              }}
                              title="Copy equation"
                            >
                              {copiedEqIndex === idx ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Variable Mapping Panel */}
              {detectedVariables.length > 0 && (
                <motion.div {...cardChild} transition={{ ...cardChild.transition, delay: 0.08 }}>
                  <div className="upload-varmap-card">
                    <div
                      className="upload-varmap-header"
                      onClick={() => setShowMappingPanel((v) => !v)}
                    >
                      <div className="upload-varmap-header-left">
                        <div className="upload-varmap-header-icon">
                          <span style={{ fontSize: '16px', fontWeight: 700, fontStyle: 'italic' }}>x→y</span>
                        </div>
                        <div>
                          <h3>Variable Mapping</h3>
                          <span className="upload-varmap-header-sub">
                            Rename variables across all outputs
                          </span>
                        </div>
                      </div>
                      <div className="upload-varmap-header-right">
                        <span className="upload-varmap-count">
                          {detectedVariables.length} variable{detectedVariables.length !== 1 ? 's' : ''}
                        </span>
                        {Object.keys(variableMappings).length > 0 && (
                          <motion.button
                            className="upload-varmap-reset-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              resetAllMappings();
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title="Reset all mappings"
                          >
                            <RotateCcw size={13} />
                            Reset All
                          </motion.button>
                        )}
                        <motion.div
                          animate={{ rotate: showMappingPanel ? 180 : 0 }}
                          transition={{ duration: 0.25 }}
                          className="upload-varmap-chevron"
                        >
                          <ChevronDown size={18} />
                        </motion.div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {showMappingPanel && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div className="upload-varmap-body">
                            {detectedVariables.map((v, idx) => (
                              <motion.div
                                key={v.original}
                                className="upload-varmap-row"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.04, duration: 0.25 }}
                              >
                                <div className="upload-varmap-original">
                                  <span className="upload-varmap-original-label">{v.display}</span>
                                </div>
                                <div className="upload-varmap-arrow">→</div>
                                <div className="upload-varmap-input-wrap">
                                  <input
                                    type="text"
                                    className="upload-varmap-input"
                                    placeholder={v.display}
                                    value={variableMappings[v.original] || ''}
                                    onChange={(e) => handleVariableChange(v.original, e.target.value)}
                                    spellCheck={false}
                                  />
                                  {variableMappings[v.original] && (
                                    <motion.button
                                      className="upload-varmap-row-reset"
                                      onClick={() => resetVariableMapping(v.original)}
                                      initial={{ scale: 0, y: '-50%' }}
                                      animate={{ scale: 1, y: '-50%' }}
                                      exit={{ scale: 0, y: '-50%' }}
                                      whileHover={{ scale: 1.1, y: '-50%' }}
                                      whileTap={{ scale: 0.9, y: '-50%' }}
                                      title="Reset to original"
                                    >
                                      <X size={12} />
                                    </motion.button>
                                  )}
                                </div>
                                {variableMappings[v.original] && (
                                  <motion.div
                                    className="upload-varmap-preview"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                  >
                                    {getVariableDisplayName(variableMappings[v.original])}
                                  </motion.div>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

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
                  <EquationPreview equation={mappedEquation} hideCard={true} />
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
                        onClick={() => handleCopy(mappedEquation, 'latex')}
                      >
                        {copiedLatex ? <Check size={14} /> : <Copy size={14} />}
                        {copiedLatex ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <textarea
                      className="upload-code-content"
                      value={equation}
                      onChange={handleEquationEdit}
                      spellCheck={false}
                      style={{ resize: 'vertical', minHeight: '80px', border: 'none', background: 'transparent', outline: 'none' }}
                    />
                  </div>
                </motion.div>

                {/* MathML Source */}
                <motion.div {...cardChild} transition={{ ...cardChild.transition, delay: 0.18 }}>
                  <div className="upload-code-block">
                    <div className="upload-code-header">
                      <span className="upload-code-label">MathML Markup</span>
                      <button
                        className={`upload-code-copy ${copiedMathml ? 'copied' : ''}`}
                        onClick={() => handleCopy(mappedMathml, 'mathml')}
                      >
                        {copiedMathml ? <Check size={14} /> : <Copy size={14} />}
                        {copiedMathml ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="upload-code-content" style={{ fontSize: '12px', maxHeight: 200, overflowY: 'auto' }}>
                      {mappedMathml}
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
                    onClick={() => downloadFile(mappedEquation, 'equation.tex', 'text/plain')}
                    className="upload-export-btn"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <FileCode size={16} />
                    LaTeX (.tex)
                  </motion.button>
                  <motion.button
                    onClick={() => downloadFile(mappedMathml, 'equation.mml', 'application/mathml+xml')}
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