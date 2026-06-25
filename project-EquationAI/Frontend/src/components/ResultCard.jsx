import { motion } from 'framer-motion';
import { Copy, Check, Download, FileCode2, ExternalLink } from 'lucide-react';
import EquationPreview from './EquationPreview';

export default function ResultCard({
  result,
  onCopyMathML,
  onDownloadTex,
  copiedId,
  copyingId,
  cardVariants,
  COLORS,
}) {
  return (
    <motion.div
      variants={cardVariants}
      className="p-6 rounded-2xl bg-white hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="space-y-3">
        {/* Badge / Similarity row */}
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-[#0066CC] bg-[#0066CC]/5 px-2.5 py-1 rounded-lg">
            {result.category}
          </span>
          <span className="text-sm font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
            {result.similarity}%
          </span>
        </div>

        {/* Equation preview */}
        <div className="p-4 bg-[#F8FAFF] rounded-lg flex justify-center items-center overflow-x-auto min-h-[80px]">
          <EquationPreview equation={result.equation} hideCard={true} />
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 leading-relaxed">
          {result.description}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100/80">
        <button
          onClick={() => onCopyMathML(result.equation, result.id)}
          disabled={copyingId !== null}
          className="flex-1 py-2 px-3 rounded-lg hover:bg-[#0066CC]/4 text-slate-500 hover:text-[#0066CC] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {copyingId === result.id ? (
            <div className="w-3.5 h-3.5 border-2 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
          ) : copiedId === result.id ? (
            <Check size={14} className="text-emerald-500" />
          ) : (
            <FileCode2 size={14} />
          )}
          {copiedId === result.id ? 'Copied!' : 'Copy'}
        </button>

        <button
          onClick={() => onDownloadTex(result.equation, result.category)}
          className="p-2 rounded-lg text-slate-400 hover:text-[#0066CC] hover:bg-[#0066CC]/4 transition-all cursor-pointer"
          title="Download LaTeX"
        >
          <Download size={14} />
        </button>
      </div>
    </motion.div>
  );
}
