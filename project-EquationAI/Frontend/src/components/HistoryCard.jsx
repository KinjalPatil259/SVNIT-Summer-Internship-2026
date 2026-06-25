import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Trash2, Upload, RefreshCw, PenTool } from 'lucide-react';
import { getRelativeTime } from '../utils/historyService';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

const SOURCE_CONFIG = {
  upload: { label: 'Upload', icon: Upload, color: '#3B82F6' },
  converter: { label: 'Converter', icon: RefreshCw, color: '#6366F1' },
  handwriting: { label: 'Handwriting', icon: PenTool, color: '#EC4899' },
};

export default function HistoryCard({ entry, onDelete, onClick }) {
  const [copied, setCopied] = useState(false);

  const source = SOURCE_CONFIG[entry.source] || SOURCE_CONFIG.upload;
  const SourceIcon = source.icon;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(entry.latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(entry.id);
  };

  /* Safe KaTeX render — falls back to raw LaTeX on error */
  const renderEquation = () => {
    try {
      return <InlineMath math={entry.latex} />;
    } catch {
      return <span style={{ fontFamily: "'Fira Code', monospace", fontSize: 13, color: '#475569' }}>{entry.latex}</span>;
    }
  };

  return (
    <motion.div
      className="history-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.96 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      layout
      onClick={() => onClick(entry)}
    >
      {/* Header */}
      <div className="history-card-header">
        <span className={`history-card-source-badge ${entry.source}`}>
          <SourceIcon size={12} />
          {source.label}
        </span>
        <span className="history-card-time">{getRelativeTime(entry.timestamp)}</span>
      </div>

      {/* Equation Preview */}
      <div className="history-card-preview">
        {renderEquation()}
      </div>

      {/* LaTeX Code (truncated) */}
      <div className="history-card-latex" title={entry.latex}>
        {entry.latex}
      </div>

      {/* Footer */}
      <div className="history-card-footer">
        <span className="history-card-filename">
          {entry.fileName || `${source.label} conversion`}
        </span>
        <div className="history-card-actions">
          <motion.button
            className={`history-card-action-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Copy LaTeX"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </motion.button>
          <motion.button
            className="history-card-action-btn delete"
            onClick={handleDelete}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Delete"
          >
            <Trash2 size={14} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
