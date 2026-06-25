import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Search,
  Upload,
  RefreshCw,
  PenTool,
  Trash2,
  X,
  Copy,
  Check,
  FileText,
  AlertTriangle,
  Inbox,
} from 'lucide-react';
import {
  getHistory,
  deleteHistoryEntry,
  clearHistory,
  getRelativeTime,
} from '../utils/historyService';
import HistoryCard from '../components/HistoryCard';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';
import '../styles/History.css';
import '../styles/Dashboard.css';

/* ── Animation Variants ── */
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
};

/* ── Source filter options ── */
const FILTERS = [
  { key: 'all', label: 'All', icon: null },
  { key: 'upload', label: 'Upload', icon: Upload },
  { key: 'converter', label: 'Converter', icon: RefreshCw },
  { key: 'handwriting', label: 'Handwriting', icon: PenTool },
];

export default function History() {
  const [entries, setEntries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [copiedLatex, setCopiedLatex] = useState(false);
  const [copiedMathml, setCopiedMathml] = useState(false);

  /* Load history from localStorage */
  const loadHistory = useCallback(() => {
    setEntries(getHistory());
  }, []);

  useEffect(() => {
    loadHistory();

    /* Re-sync when other tabs/pages update localStorage */
    const onStorage = (e) => {
      if (e.key === 'equationai_history') loadHistory();
    };
    window.addEventListener('storage', onStorage);

    /* Also poll every 2s for same-tab updates */
    const interval = setInterval(loadHistory, 2000);

    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
    };
  }, [loadHistory]);

  /* ── Filtering logic ── */
  const filtered = entries.filter((entry) => {
    // Source filter
    if (activeFilter !== 'all' && entry.source !== activeFilter) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchLatex = (entry.latex || '').toLowerCase().includes(q);
      const matchFile = (entry.fileName || '').toLowerCase().includes(q);
      if (!matchLatex && !matchFile) return false;
    }

    return true;
  });

  /* ── Stats ── */
  const totalCount = entries.length;
  const uploadCount = entries.filter((e) => e.source === 'upload').length;
  const converterCount = entries.filter((e) => e.source === 'converter').length;
  const handwritingCount = entries.filter((e) => e.source === 'handwriting').length;

  /* ── Handlers ── */
  const handleDelete = (id) => {
    deleteHistoryEntry(id);
    loadHistory();
    if (selectedEntry?.id === id) setSelectedEntry(null);
  };

  const handleClearAll = () => {
    clearHistory();
    loadHistory();
    setShowConfirmClear(false);
    setSelectedEntry(null);
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

  /* Safe KaTeX render */
  const renderEquation = (latex, fontSize = '1.4em') => {
    try {
      return (
        <span style={{ fontSize }}>
          <InlineMath math={latex} />
        </span>
      );
    } catch {
      return (
        <span style={{ fontFamily: "'Fira Code', monospace", fontSize: 14, color: '#475569' }}>
          {latex}
        </span>
      );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <motion.div {...fadeUp} className="flex items-center gap-4">
        <div
          className="flex items-center justify-center w-12 h-12 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, #0066CC, #4F46E5)',
            boxShadow: '0 4px 16px rgba(0, 102, 204, 0.2)',
          }}
        >
          <Clock size={24} className="text-white" />
        </div>
        <div>
          <h1
            className="text-2xl font-bold text-[#0B1D33]"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            History
          </h1>
          <p className="text-base text-[#1F2937] mt-1">
            View and manage your past equation conversions and exports.
          </p>
        </div>
      </motion.div>

      {/* ── Stats Bar ── */}
      <motion.div
        {...fadeUp}
        transition={{ ...fadeUp.transition, delay: 0.06 }}
        className="history-stats-bar"
      >
        {[
          { label: 'Total', value: totalCount, cssClass: 'total', Icon: Clock },
          { label: 'Uploads', value: uploadCount, cssClass: 'upload', Icon: Upload },
          { label: 'Conversions', value: converterCount, cssClass: 'converter', Icon: RefreshCw },
          { label: 'Handwriting', value: handwritingCount, cssClass: 'handwriting', Icon: PenTool },
        ].map((stat) => (
          <div className="history-stat-card" key={stat.label}>
            <div className={`history-stat-icon ${stat.cssClass}`}>
              <stat.Icon size={20} />
            </div>
            <div>
              <div className="history-stat-value">{stat.value}</div>
              <div className="history-stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Search + Filter Toolbar ── */}
      <motion.div
        {...fadeUp}
        transition={{ ...fadeUp.transition, delay: 0.12 }}
        className="history-toolbar"
      >
        <div className="history-search-wrap">
          <Search size={16} className="history-search-icon" />
          <input
            type="text"
            className="history-search-input"
            placeholder="Search equations by LaTeX or filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="history-filter-group">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`history-filter-btn ${activeFilter === f.key ? 'active' : ''}`}
              onClick={() => setActiveFilter(f.key)}
            >
              {f.icon && <f.icon size={13} />}
              {f.label}
            </button>
          ))}
        </div>

        {totalCount > 0 && (
          <button
            className="history-clear-btn"
            onClick={() => setShowConfirmClear(true)}
          >
            <Trash2 size={13} />
            Clear All
          </button>
        )}
      </motion.div>

      {/* ── Cards Grid or Empty State ── */}
      <motion.div
        {...fadeUp}
        transition={{ ...fadeUp.transition, delay: 0.18 }}
      >
        {filtered.length > 0 ? (
          <div className="history-grid">
            <AnimatePresence mode="popLayout">
              {filtered.map((entry) => (
                <HistoryCard
                  key={entry.id}
                  entry={entry}
                  onDelete={handleDelete}
                  onClick={setSelectedEntry}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="history-empty">
            <div className="history-empty-icon">
              <Inbox size={36} style={{ color: '#0066CC' }} />
            </div>
            <h2>
              {searchQuery || activeFilter !== 'all'
                ? 'No matching equations'
                : 'No history yet'}
            </h2>
            <p>
              {searchQuery || activeFilter !== 'all'
                ? 'Try adjusting your search or filter to find what you\'re looking for.'
                : 'Equations you upload, convert, or draw will automatically appear here.'}
            </p>
          </div>
        )}
      </motion.div>

      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {selectedEntry && (
          <motion.div
            className="history-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setSelectedEntry(null)}
          >
            <motion.div
              className="history-modal"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="history-modal-header">
                <div className="history-modal-title">
                  <FileText size={18} style={{ color: '#0066CC' }} />
                  Equation Details
                </div>
                <button
                  className="history-modal-close"
                  onClick={() => setSelectedEntry(null)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="history-modal-body">
                {/* Equation Preview */}
                <div className="history-modal-preview">
                  {renderEquation(selectedEntry.latex)}
                </div>

                {/* Meta chips */}
                <div className="history-modal-meta">
                  <span className="history-modal-meta-chip">
                    <Clock size={13} />
                    {new Date(selectedEntry.timestamp).toLocaleString()}
                  </span>
                  <span className={`history-card-source-badge ${selectedEntry.source}`}>
                    {selectedEntry.source === 'upload' && <Upload size={12} />}
                    {selectedEntry.source === 'converter' && <RefreshCw size={12} />}
                    {selectedEntry.source === 'handwriting' && <PenTool size={12} />}
                    {selectedEntry.source.charAt(0).toUpperCase() + selectedEntry.source.slice(1)}
                  </span>
                  {selectedEntry.fileName && (
                    <span className="history-modal-meta-chip">
                      <FileText size={13} />
                      {selectedEntry.fileName}
                    </span>
                  )}
                </div>

                {/* LaTeX Code Block */}
                <div className="history-modal-code-block">
                  <div className="history-modal-code-header">
                    <span className="history-modal-code-label">LaTeX Source</span>
                    <button
                      className={`history-modal-code-copy ${copiedLatex ? 'copied' : ''}`}
                      onClick={() => handleCopy(selectedEntry.latex, 'latex')}
                    >
                      {copiedLatex ? <Check size={12} /> : <Copy size={12} />}
                      {copiedLatex ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="history-modal-code-content">
                    {selectedEntry.latex}
                  </div>
                </div>

                {/* MathML Code Block */}
                {selectedEntry.mathml && (
                  <div className="history-modal-code-block">
                    <div className="history-modal-code-header">
                      <span className="history-modal-code-label">MathML Markup</span>
                      <button
                        className={`history-modal-code-copy ${copiedMathml ? 'copied' : ''}`}
                        onClick={() => handleCopy(selectedEntry.mathml, 'mathml')}
                      >
                        {copiedMathml ? <Check size={12} /> : <Copy size={12} />}
                        {copiedMathml ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div
                      className="history-modal-code-content"
                      style={{ fontSize: 12, maxHeight: 160 }}
                    >
                      {selectedEntry.mathml}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Clear All Confirmation ── */}
      <AnimatePresence>
        {showConfirmClear && (
          <motion.div
            className="history-confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowConfirmClear(false)}
          >
            <motion.div
              className="history-confirm-dialog"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="history-confirm-icon">
                <AlertTriangle size={26} />
              </div>
              <h3>Clear All History?</h3>
              <p>
                This will permanently delete all {totalCount} equation
                {totalCount !== 1 ? 's' : ''} from your history. This action
                cannot be undone.
              </p>
              <div className="history-confirm-actions">
                <button
                  className="history-confirm-cancel"
                  onClick={() => setShowConfirmClear(false)}
                >
                  Cancel
                </button>
                <button className="history-confirm-delete" onClick={handleClearAll}>
                  <Trash2 size={14} />
                  Delete All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
