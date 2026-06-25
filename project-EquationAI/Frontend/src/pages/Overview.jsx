import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  UploadCloud,
  PenTool,
  RefreshCw,
  Search,
  Clock,
  ArrowRight,
  FileCode,
  Copy,
  Check,
  Lightbulb,
  TrendingUp,
  BookOpen,
  FileImage,
  FileText,
  File,
  Zap,
  Layers,
  Download,
  ScanLine,
  ChevronRight,
} from "lucide-react";
import { BlockMath } from "../components/MathRenderer";
import { getHistory, getRelativeTime } from "../utils/historyService";
import "katex/dist/katex.min.css";
import "../styles/Dashboard.css";

/* ─── AI Tips Data ─── */
const AI_TIPS = [
  {
    title: "High Contrast = Better OCR",
    desc: "Use dark ink on white paper or high-contrast images. The AI model performs best when equations are clearly visible with minimal noise.",
  },
  {
    title: "PDF Text Extraction",
    desc: "PDFs with selectable text (not scanned images) are processed via text extraction much faster and more accurate than OCR.",
  },
  {
    title: "DOCX Equation Objects",
    desc: "Word documents with native equation objects (Insert → Equation) are parsed directly into LaTeX without needing OCR at all.",
  },
  {
    title: "MathML in Word",
    desc: "Copy the MathML output and paste it directly into Microsoft Word it auto-renders as a native formula. Perfect for reports!",
  },
  {
    title: "Multi-Equation Documents",
    desc: "When a PDF or DOCX contains multiple equations, all are extracted and you can pick the one you need from the results panel.",
  },
  {
    title: "Export Options",
    desc: "Every result can be exported as LaTeX (.tex), MathML (.mml), PDF report, or Word document` ideal for academic submissions.",
  },
];

export default function Overview() {
  const navigate = useNavigate();

  const [copiedId, setCopiedId] = useState(null);
  const [activeTip, setActiveTip] = useState(0);
  const [history, setHistory] = useState([]);

  // Load real history on mount
  useEffect(() => {
    setHistory(getHistory());
  }, []);

  // Rotate tips every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTip((prev) => (prev + 1) % AI_TIPS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Real stats from history
  const totalEquations = history.length;
  const uploadCount = history.filter((e) => e.source === "upload").length;
  const handwritingCount = history.filter((e) => e.source === "handwriting").length;
  const converterCount = history.filter((e) => e.source === "converter").length;
  const recentFive = history.slice(0, 5);

  const handleCopy = (id, latex) => {
    navigator.clipboard.writeText(latex);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="overview-container space-y-7 pb-8">

      {/* ─── Welcome Banner ─── */}
      <div className="overview-hero bg-gradient-to-br from-white via-[#EBF3FF] to-[#F5EBFF] text-[#0B1D33] p-8 md:p-10 rounded-2xl relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-400/20 rounded-full blur-3xl pointer-events-none -mr-40 -mt-40 animate-pulse duration-[6000ms]" />
        <div className="absolute -bottom-20 left-1/3 w-[300px] h-[300px] bg-purple-400/15 rounded-full blur-3xl pointer-events-none animate-pulse duration-[8000ms]" />
        
        <div className="grid md:grid-cols-5 gap-6 items-center relative z-10">
          {/* Left Side Content */}
          <div className="md:col-span-3 space-y-4">
            <span className="bg-[#0066CC]/8 text-[#0066CC] font-bold px-3.5 py-1 rounded-full text-[11px] uppercase tracking-wider inline-flex items-center gap-1.5 border border-[#0066CC]/15">
              <Sparkles size={11} className="text-[#0066CC]" /> AI-Powered Math Workspace
            </span>
            <h1 className="text-2xl md:text-3.5xl font-extrabold font-[Poppins] tracking-tight leading-tight">
              Welcome to EquationAI
            </h1>
            <p className="text-[#1F2937] text-base leading-relaxed max-w-lg">
              Unlock the power of AI to extract, recognize, and convert equations instantly. Upload documents, draw on canvas, or convert files with unmatched precision.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button 
                onClick={() => navigate("/dashboard/upload")}
                className="bg-white/80 hover:bg-white text-[#1F2937] font-semibold text-xs px-5 py-3 rounded-xl border border-slate-200 shadow-sm transition-all duration-300 cursor-pointer"
              >
                Get Started
              </button>
              <button 
                onClick={() => navigate("/dashboard/converter")}
                className="bg-white/80 hover:bg-white text-[#1F2937] font-semibold text-xs px-5 py-3 rounded-xl border border-slate-200 shadow-sm transition-all duration-300 cursor-pointer"
              >
                Try Equation Converter
              </button>
            </div>
          </div>

          {/* Right Side Visual (Mock Equation Card) */}
          <div className="md:col-span-2 flex justify-center md:justify-end">
            <div className="w-full max-w-[280px] bg-white/70 backdrop-blur-md rounded-xl p-5 border border-white shadow-md relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-2.5 py-0.5 rounded-full border border-purple-100">
                  AI OCR
                </span>
                <span className="text-[10px] text-[#1F2937] font-mono">Status: Ready</span>
              </div>
              
              <div className="bg-slate-50/50 rounded-lg p-3 mb-3 border border-slate-100 flex items-center justify-center min-h-[65px] overflow-hidden">
                {/* Rendered math */}
                <div className="scale-90">
                  <BlockMath math={"E=mc^2"} />
                </div>
              </div>
              
              <div className="flex items-center justify-between text-[11px] text-[#1F2937] pt-1">
                <span>Mass-Energy Equivalence</span>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500/80" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Real Stats from History ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <TrendingUp size={18} />, value: totalEquations, label: "Total Equations", color: "text-[#0066CC]", bg: "bg-blue-50" },
          { icon: <UploadCloud size={18} />, value: uploadCount, label: "From Documents OCR", color: "text-violet-600", bg: "bg-violet-50" },
          { icon: <PenTool size={18} />, value: handwritingCount, label: "From Handwriting OCR", color: "text-emerald-600", bg: "bg-emerald-50" },
          { icon: <RefreshCw size={18} />, value: converterCount, label: "From Equation Converter", color: "text-amber-600", bg: "bg-amber-50" },
        ].map((stat, i) => (
          <div key={i} className="overview-stat-card bg-white p-4 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center gap-3.5 hover:shadow-md transition-all duration-300">
            <div className={`${stat.bg} ${stat.color} w-11 h-11 rounded-xl flex items-center justify-center shrink-0`}>
              {stat.icon}
            </div>
            <div>
              <div className="text-xl font-bold text-[#0B1D33] font-[Poppins]">{stat.value}</div>
              <div className="text-[11px] text-[#1F2937] font-medium">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#0B1D33] font-[Poppins] flex items-center gap-2">
          <BookOpen className="text-[#0066CC]" size={18} />
          Core Math Workspaces
        </h2>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { path: "/dashboard/upload", icon: <UploadCloud size={18} />, title: "Document OCR", desc: "Upload images, PDFs, or DOCX files to extract LaTeX equations using AI OCR and text extraction.", link: "Open Tool", gradient: "from-blue-500 to-indigo-600", hoverBorder: "hover:shadow-[0_8px_24px_rgba(0,102,204,0.08)]", linkColor: "text-[#0066CC]" },
            { path: "/dashboard/handwriting", icon: <PenTool size={18} />, title: "Handwriting OCR", desc: "Draw math expressions with your mouse, stylus, or touch and let AI recognize them instantly.", link: "Open Canvas", gradient: "from-violet-500 to-purple-600", hoverBorder: "hover:shadow-[0_8px_24px_rgba(139,92,246,0.08)]", linkColor: "text-violet-600" },
            { path: "/dashboard/converter", icon: <RefreshCw size={18} />, title: "Equation Converter", desc: "Convert between MathML markup and LaTeX code bi-directionally with instant visual preview.", link: "Convert Now", gradient: "from-emerald-500 to-teal-600", hoverBorder: "hover:shadow-[0_8px_24px_rgba(16,185,129,0.08)]", linkColor: "text-emerald-600" },
            { path: "/dashboard/search", icon: <Search size={18} />, title: "Semantic Search", desc: "Find equations by structure or keyword using intelligent neural search across your library.", link: "Search Library", gradient: "from-amber-500 to-orange-600", hoverBorder: "hover:shadow-[0_8px_24px_rgba(245,158,11,0.08)]", linkColor: "text-amber-600" },
          ].map((card, i) => (
            <div
              key={i}
              onClick={() => navigate(card.path)}
              className={`overview-quick-card bg-white p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${card.hoverBorder} transition-all duration-300 cursor-pointer flex flex-col justify-between group`}
            >
              <div>
                <div className={`bg-linear-to-br ${card.gradient} text-white w-10 h-10 rounded-xl flex items-center justify-center mb-4 shadow-md group-hover:scale-105 transition-transform duration-300`}>
                  {card.icon}
                </div>
                <h3 className="text-sm font-bold text-[#0B1D33] font-[Poppins] mb-1.5 group-hover:text-[#0066CC] transition-colors">
                  {card.title}
                </h3>
                <p className="text-[#1F2937] text-[14px] leading-relaxed mb-4">
                  {card.desc}
                </p>
              </div>
              <div className={`flex items-center text-[11px] font-bold ${card.linkColor} gap-1 group-hover:translate-x-1 transition-transform`}>
                <span>{card.link}</span>
                <ArrowRight size={12} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── How It Works ─── */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#0B1D33] font-[Poppins] flex items-center gap-2">
          <Zap className="text-[#0066CC]" size={18} />
          How It Works
        </h2>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              step: "1",
              title: "Upload or Draw",
              desc: "Upload an image, PDF, or DOCX file or draw your equation directly on the handwriting canvas.",
              icon: <UploadCloud size={22} />,
              gradient: "from-blue-500 to-indigo-600",
            },
            {
              step: "2",
              title: "AI Extracts LaTeX",
              desc: "Our AI uses text extraction for documents and OCR for images to recognize equations and convert them to LaTeX.",
              icon: <ScanLine size={22} />,
              gradient: "from-violet-500 to-purple-600",
            },
            {
              step: "3",
              title: "Export Anywhere",
              desc: "Copy LaTeX or MathML, download as PDF report, Word document, or .tex file ready for your papers.",
              icon: <Download size={22} />,
              gradient: "from-emerald-500 to-teal-600",
            },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-all duration-300 relative overflow-hidden group">
              {/* Step number watermark */}
              <div className="absolute top-3 right-4 text-[64px] font-[Poppins] font-extrabold text-slate-300/80 leading-none select-none pointer-events-none group-hover:text-slate-400/80 transition-colors">
                {item.step}
              </div>

              <div className={`bg-linear-to-br ${item.gradient} text-white w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-md relative z-10`}>
                {item.icon}
              </div>
              <h3 className="text-sm font-bold text-[#0B1D33] font-[Poppins] mb-2 relative z-10">
                {item.title}
              </h3>
              <p className="text-[#1F2937] text-[13px] leading-relaxed relative z-10">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Feature Highlights ─── */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#0B1D33] font-[Poppins] flex items-center gap-2">
          <Layers className="text-[#0066CC]" size={18} />
          Key Features
        </h2>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              icon: <ScanLine size={20} />,
              title: "Smart Text Extraction",
              desc: "PDFs with selectable text are processed via direct extraction faster and more accurate than OCR.",
              color: "text-[#0066CC]",
              bg: "bg-blue-50",
            },
            {
              icon: <FileCode size={20} />,
              title: "OMML Equation Parsing",
              desc: "Word equation objects (fractions, integrals, matrices) are converted directly to LaTeX without OCR.",
              color: "text-violet-600",
              bg: "bg-violet-50",
            },
            {
              icon: <Layers size={20} />,
              title: "Multi-Equation Detection",
              desc: "When a document contains multiple equations, all are extracted and presented in a picker UI.",
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              icon: <Download size={20} />,
              title: "4 Export Formats",
              desc: "Export results as LaTeX (.tex), MathML (.mml), PDF report, or Word document for any workflow.",
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
          ].map((feat, i) => (
            <div key={i} className="bg-white p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-all duration-300">
              <div className={`${feat.bg} ${feat.color} w-11 h-11 rounded-xl flex items-center justify-center mb-3`}>
                {feat.icon}
              </div>
              <h3 className="text-sm font-bold text-[#0B1D33] font-[Poppins] mb-1.5">{feat.title}</h3>
              <p className="text-[#1F2937] text-[13px] leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Recent History (Live) + AI Tips ─── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Recent History */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0B1D33] font-[Poppins] flex items-center gap-2">
              <Clock size={18} className="text-[#0066CC]" />
              Recent Activity
            </h2>
            <button
              onClick={() => navigate("/dashboard/history")}
              className="text-xs font-bold text-[#0066CC] hover:underline cursor-pointer bg-transparent border-none"
            >
              View Full History
            </button>
          </div>

          <div className="space-y-3">
            {recentFive.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <Clock size={24} className="text-[#0066CC]" />
                </div>
                <h3 className="text-sm font-bold text-[#0B1D33] font-[Poppins] mb-1">No equations yet</h3>
                <p className="text-[12px] text-gray-400 mb-4">Upload an image or draw an equation to get started!</p>
                <button
                  onClick={() => navigate("/dashboard/upload")}
                  className="text-xs font-bold text-white bg-[#0066CC] hover:bg-[#0052A3] px-4 py-2 rounded-lg cursor-pointer border-none transition-colors"
                >
                  Upload First Equation
                </button>
              </div>
            ) : (
              recentFive.map((eq) => (
                <div 
                  key={eq.id} 
                  className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 hover:border-blue-100 hover:shadow-xs transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  {/* Left Column: Source Icon & LaTeX string */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Source Icon Badge */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-transform duration-300 group-hover:scale-105 ${
                      eq.source === "upload" ? "bg-blue-50 text-blue-600 border-blue-100/50" :
                      eq.source === "handwriting" ? "bg-violet-50 text-violet-600 border-violet-100/50" :
                      "bg-emerald-50 text-emerald-600 border-emerald-100/50"
                    }`}>
                      {eq.source === "upload" ? <UploadCloud size={18} /> :
                       eq.source === "handwriting" ? <PenTool size={18} /> :
                       <RefreshCw size={18} />}
                    </div>

                    {/* Meta & Code text */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          eq.source === "upload" ? "bg-blue-100/60 text-blue-700" :
                          eq.source === "handwriting" ? "bg-violet-100/60 text-violet-700" :
                          "bg-emerald-100/60 text-emerald-700"
                        }`}>
                          {eq.source === "upload" ? "Upload" : eq.source === "handwriting" ? "Handwriting" : "Converter"}
                        </span>
                        {eq.fileName && (
                          <span className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]" title={eq.fileName}>
                            {eq.fileName}
                          </span>
                        )}
                        <span className="text-[10.5px] text-slate-400 font-medium">• {getRelativeTime(eq.timestamp)}</span>
                      </div>
                      
                      <div className="font-mono text-[11px] text-[#1F2937] bg-slate-50 border border-slate-100 rounded-lg p-2 max-w-full overflow-x-auto select-all scrollbar-thin">
                        {eq.latex}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Rendered Math & Action */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto justify-between sm:justify-end w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-50">
                    {/* Rendered Equation Bubble */}
                    <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100/80 p-2.5 rounded-xl flex items-center justify-center min-w-[140px] max-w-[200px] min-h-[48px] overflow-hidden transition-colors">
                      <div className="scale-85 origin-center">
                        <BlockMath math={eq.latex} />
                      </div>
                    </div>

                    {/* Copy Button */}
                    <button
                      onClick={() => handleCopy(eq.id, eq.latex)}
                      className={`p-2.5 rounded-xl border transition-all duration-300 cursor-pointer shrink-0 ${
                        copiedId === eq.id
                          ? "bg-emerald-50 text-[#1F2937] border-emerald-200"
                          : "bg-white text-[#1F2937] border-slate-200 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/20"
                      }`}
                      title="Copy LaTeX"
                    >
                      {copiedId === eq.id ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar Info Column */}
        <div className="space-y-6">
          {/* AI Tips (Rotating) */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#0B1D33] font-[Poppins] flex items-center gap-2">
              <Lightbulb size={18} className="text-amber-500" />
              AI Pro Tips
            </h2>

            <div className="bg-gradient-to-br from-amber-50/50 via-orange-50/10 to-white rounded-2xl p-6 border border-amber-100/70 shadow-xs relative overflow-hidden min-h-[175px] flex flex-col justify-between group">
              <div className="absolute right-[-15px] bottom-[-15px] text-amber-500/5 select-none pointer-events-none group-hover:scale-105 transition-transform duration-500">
                <Lightbulb size={120} />
              </div>
              
              <div className="flex gap-4 relative z-10">
                <div className="bg-linear-to-br from-amber-400 to-orange-500 text-white w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                  <Lightbulb size={20} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-[#0B1D33] text-sm font-[Poppins] tracking-tight">
                    {AI_TIPS[activeTip].title}
                  </h4>
                  <p className="text-[#0B1D33] text-[13px] leading-relaxed pr-2">
                    {AI_TIPS[activeTip].desc}
                  </p>
                </div>
              </div>

              {/* Tip indicator dots */}
              <div className="flex items-center justify-center gap-2 mt-4 relative z-10">
                {AI_TIPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTip(i)}
                    className={`h-1.5 rounded-full transition-all border-none cursor-pointer ${
                      i === activeTip
                        ? "bg-amber-500 w-5"
                        : "bg-amber-200 hover:bg-amber-300 w-1.5"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Supported Formats */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 hover:shadow-xs transition-shadow duration-300">
            <h4 className="font-bold text-[#0B1D33] font-[Poppins] text-[14px] mb-4 flex items-center gap-2 border-b border-slate-50 pb-3">
              <FileCode size={16} className="text-[#0066CC]" />
              Supported Formats
            </h4>
            
            <div className="space-y-3 text-xs">
              {[
                { icon: <FileImage size={15} />, name: "PNG / JPG", desc: "AI Image OCR", color: "text-blue-600 bg-blue-50 border-blue-100/50" },
                { icon: <File size={15} />, name: "PDF", desc: "Direct Text Extraction + OCR fallback", color: "text-red-600 bg-red-50 border-red-100/50" },
                { icon: <FileText size={15} />, name: "DOCX", desc: "Native OMML equation parsing", color: "text-emerald-600 bg-emerald-50 border-emerald-100/50" },
              ].map((fmt, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-slate-50/80 border border-transparent hover:border-slate-100/80 transition-all duration-300 group/format cursor-default"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 group-hover/format:scale-105 transition-transform duration-300 ${fmt.color}`}>
                    {fmt.icon}
                  </div>
                  <div>
                    <div className="font-bold text-[#0B1D33] text-[14px]">{fmt.name}</div>
                    <div className="text-[#1F2937] text-[12px] mt-0.5 leading-snug">{fmt.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
