import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Brain,
  FileCode,
  PenTool,
  Image,
  FileText,
  Search,
  Download,
  Cpu,
  ArrowRight,
  Zap,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  Shield,
  Clock,
  CheckCircle2,
  Globe,
  MessageCircle,
  ExternalLink,
  ArrowUpRight,
} from "lucide-react";
import "../App.css";

/* ─── Animation Variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

/* ─── Floating Math Background ─── */
const MATH_SYMBOLS = ['∫', 'Σ', 'π', '∂', '∞', 'θ', '√', 'Δ', 'λ', '∇', 'φ', 'α'];

function FloatingMath() {
  const items = useMemo(() => {
    return MATH_SYMBOLS.map((symbol, i) => ({
      symbol,
      id: i,
      x: 5 + Math.random() * 90,
      y: 5 + Math.random() * 90,
      size: 14 + Math.random() * 20,
      duration: 20 + Math.random() * 15,
      delay: Math.random() * -20,
      opacity: 0.03 + Math.random() * 0.04,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {items.map((item) => (
        <motion.span
          key={item.id}
          className="absolute font-serif font-bold select-none"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            fontSize: `${item.size}px`,
            color: '#0066CC',
            opacity: item.opacity,
          }}
          animate={{
            y: [0, -20, 8, -12, 0],
            x: [0, 10, -6, 4, 0],
          }}
          transition={{
            duration: item.duration,
            delay: item.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {item.symbol}
        </motion.span>
      ))}
    </div>
  );
}

/* ─── Data ─── */
const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#workflow" },
  { label: "AI", href: "#ai" },
  { label: "Formats", href: "#formats" },
];

const FEATURES = [
  {
    icon: <Image size={26} />,
    title: "Image to LaTeX",
    desc: "Extract mathematical equations from images with AI-powered OCR.",
    iconBg: "from-blue-500 to-indigo-600",
  },
  {
    icon: <PenTool size={26} />,
    title: "Handwriting Recognition",
    desc: "Recognize and digitize handwritten equations instantly.",
    iconBg: "from-violet-500 to-purple-600",
  },
  {
    icon: <Search size={26} />,
    title: "Semantic Search",
    desc: "Find similar equations using intelligent vector matching.",
    iconBg: "from-cyan-500 to-blue-600",
  },
  {
    icon: <Download size={26} />,
    title: "Multi format Export",
    desc: "Export as MathML, LaTeX, PNG, or Word documents.",
    iconBg: "from-emerald-500 to-teal-600",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Upload or Draw",
    desc: "Upload an image, Word file, or draw your equation directly on the canvas.",
    icon: <ArrowUpRight size={22} />,
  },
  {
    step: "02",
    title: "AI Processing",
    desc: "Our deep learning models process your input using OCR and neural networks.",
    icon: <Cpu size={22} />,
  },
  {
    step: "03",
    title: "Equation Detection",
    desc: "Equations are detected, recognized, and converted with high accuracy.",
    icon: <Search size={22} />,
  },
  {
    step: "04",
    title: "Convert & Export",
    desc: "Get results in MathML, LaTeX, Word, or image format ready to use.",
    icon: <Download size={22} />,
  },
];

const AI_FEATURES = [
  { text: "OCR-based equation extraction from images", icon: <Image size={18} /> },
  { text: "Handwritten formula recognition using deep learning", icon: <PenTool size={18} /> },
  { text: "Semantic search with vector embeddings", icon: <Search size={18} /> },
];

const STATS = [
  { value: "5+", label: "Formats Supported", icon: <FileCode size={20} /> },
  { value: "99%", label: "Recognition Accuracy", icon: <Shield size={20} /> },
  { value: "<2s", label: "Processing Time", icon: <Clock size={20} /> },
  { value: "AI", label: "Powered Engine", icon: <Sparkles size={20} /> },
];

/* ─── Animated Counter ─── */
function AnimatedCounter({ value }) {
  const isNumber = /^\d+/.test(value);
  const num = parseInt(value);
  const suffix = value.replace(/^\d+/, "");
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isNumber) return;
    let start = 0;
    const end = num;
    const duration = 1500;
    const stepTime = duration / end;
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) clearInterval(timer);
    }, stepTime);
    return () => clearInterval(timer);
  }, [num, isNumber]);

  if (!isNumber) return <span>{value}</span>;
  return (
    <span>
      {count}
      {suffix}
    </span>
  );
}

/* ─── Main Component ─── */
export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const scrollTo = (href) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="bg-[#FAFBFF] text-[#0B1D33] min-h-screen overflow-x-hidden">
      {/* ─── NAVBAR ─── */}
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-white/75 shadow-[0_1px_0_rgba(226,232,240,0.4)]"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-3 flex items-center justify-between">

          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2.5 cursor-pointer bg-transparent border-none"
          >
            <div className="bg-linear-to-br from-[#0066CC] to-[#003D99] p-2 rounded-xl shadow-md shadow-blue-500/20">
              <Zap className="text-white" size={18} />
            </div>

            <span className="text-lg font-bold font-[Poppins] gradient-text">
              EquationAI
            </span>
          </button>

          {/* Desktop Nav */}
          <ul className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <button
                  onClick={() => scrollTo(link.href)}
                  className="text-[#6B7280] font-medium hover:text-[#0066CC] transition-colors duration-200 cursor-pointer bg-transparent border-none text-[14px]"
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>

          {/* Desktop CTA */}
          <button
            onClick={() => navigate("/dashboard")}
            className="hidden md:flex items-center gap-2 bg-[#0066CC] text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer border-none shadow-md shadow-[#0066CC]/20 hover:shadow-lg hover:shadow-[#0066CC]/25"
          >
            Get Started
            <ArrowRight size={15} />
          </button>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer bg-transparent border-none"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden overflow-hidden bg-white/95 backdrop-blur-lg"
            >
              <div className="px-6 py-4 space-y-3">
                {NAV_LINKS.map((link) => (
                  <button
                    key={link.label}
                    onClick={() => scrollTo(link.href)}
                    className="block w-full text-left text-[#4B5563] font-medium py-2 hover:text-[#0066CC] transition-colors duration-200 bg-transparent border-none cursor-pointer text-base"
                  >
                    {link.label}
                  </button>
                ))}

                <button
                  onClick={() => navigate("/dashboard")}
                  className="w-full bg-[#0066CC] text-white py-3 rounded-xl font-semibold transition-all duration-300 border-none"
                >
                  Get Started
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-32 pb-24 md:pt-44 md:pb-36 px-6 lg:px-8 overflow-hidden">
        <FloatingMath />
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center relative z-10">
          {/* Left — Text */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-8"
          >
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-5xl md:text-6xl lg:text-[68px] font-bold leading-[1.08] tracking-tight font-[Poppins]"
            >
              Equation
              <br />
              Conversion
              <br />
              Made Easy
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg text-[#1F2937] leading-relaxed max-w-lg"
            >
              Transform any mathematical equation from handwritten notes to
              complex images using advanced AI and deep learning. Instant,
              accurate, and in multiple formats.
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              className="flex flex-col sm:flex-row gap-4 pt-2"
            >
              <button
                onClick={() => navigate("/dashboard/upload")}
                className="group flex items-center justify-center gap-2 bg-[#0066CC] text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 cursor-pointer border-none shadow-lg shadow-[#0066CC]/20 hover:shadow-xl hover:shadow-[#0066CC]/25"
              >
                Upload Equation
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>

              <button
                onClick={() => scrollTo("#features")}
                className="flex items-center justify-center gap-2 text-[#0066CC] px-8 py-4 rounded-xl font-semibold transition-all duration-300 cursor-pointer bg-[#0066CC]/5 border-none hover:bg-[#0066CC]/8"
              >
                Explore Features
              </button>
            </motion.div>
          </motion.div>

          {/* Right — Hero Visual */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            <div className="absolute -inset-8 bg-linear-to-r from-blue-500/8 to-violet-500/8 rounded-4xl blur-3xl" />
            <div className="relative bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl shadow-blue-500/6">
              <div className="space-y-5">
                {/* Equation Card 1 */}
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="bg-[#F0F4FF] rounded-xl p-6"
                >
                  <p className="text-[11px] text-[#1F2937] mb-2 font-bold uppercase tracking-[0.16em]">
                    Pythagorean Theorem
                  </p>
                  <p className="text-2xl font-semibold text-[#1F2937] font-[Poppins]">
                    a² + b² = c²
                  </p>
                </motion.div>

                {/* Equation Card 2 */}
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1,
                  }}
                  className="bg-[#F5F0FF] rounded-xl p-6"
                >
                  <p className="text-[11px] text-[#1F2937] mb-2 font-bold uppercase tracking-[0.16em]">
                    Euler's Identity
                  </p>
                  <p className="text-2xl font-semibold text-[#1F2937] font-[Poppins] tracking-wide">
                    e<sup>iπ</sup> + 1 = 0
                  </p>
                </motion.div>

                {/* Bottom Pipeline */}
                <div className="flex items-center justify-center gap-4 pt-4">
                  <div className="bg-linear-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-md shadow-blue-500/20">
                    <Brain className="text-white" size={24} />
                  </div>
                  <div className="h-0.5 w-10 bg-linear-to-r from-blue-300 to-violet-300 rounded-full" />
                  <div className="bg-linear-to-br from-violet-500 to-purple-600 p-2.5 rounded-xl shadow-md shadow-violet-500/20">
                    <Cpu className="text-white" size={24} />
                  </div>
                  <div className="h-0.5 w-10 bg-linear-to-r from-violet-300 to-emerald-300 rounded-full" />
                  <div className="bg-linear-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl shadow-md shadow-emerald-500/20">
                    <Sparkles className="text-white" size={24} />
                  </div>
                </div>

                <p className="text-center text-[#1F2937] font-medium text-sm">
                  AI-Powered Recognition Pipeline
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── STATS SECTION ─── */}
      <section className="px-6 lg:px-8 pb-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
          className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6"
        >
          {STATS.map((stat, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              custom={i}
              className="text-center py-6 px-4"
            >
              <div className="flex justify-center mb-3 text-[#0066CC]">
                {stat.icon}
              </div>
              <div className="text-3xl font-bold text-[#0B1D33] font-[Poppins]">
                <AnimatedCounter value={stat.value} />
              </div>
              <div className="text-xs text-[#6B7280] font-medium mt-1.5">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── FEATURES SECTION ─── */}
      <section
        id="features"
        className="scroll-mt-20 px-6 lg:px-8 py-28 bg-white relative"
      >
        <div className="max-w-7xl mx-auto">

          {/* Section Heading */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="flex flex-col items-center justify-center text-center mb-16"
          >
            <motion.h2
              variants={fadeUp}
              className="text-4xl md:text-5xl font-bold font-[Poppins] text-[#0B1D33]"
            >
              Powerful Features
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className="mt-5 max-w-2xl text-lg leading-relaxed text-[#1F2937]"
            >
              Industry leading AI tools for comprehensive mathematical equation
              processing and conversion.
            </motion.p>
          </motion.div>

          {/* Feature Cards — Simple grid */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {FEATURES.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeUp}
                custom={index}
                className="group relative bg-white rounded-xl p-6 hover:shadow-md transition-all duration-300 border border-slate-100/50"
              >
                <div
                  className={`bg-linear-to-br ${feature.iconBg} w-10 h-10 rounded-lg flex items-center justify-center text-white mb-4 shadow-sm`}
                >
                  {feature.icon}
                </div>

                <h3 className="text-base font-bold mb-2 text-[#0B1D33] font-[Poppins]">
                  {feature.title}
                </h3>

                <p className="text-[#1F2937] leading-relaxed text-sm">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section
        id="workflow"
        className="scroll-mt-20 px-6 lg:px-8 py-28 bg-[#F8FAFF] relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Heading */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="flex flex-col items-center justify-center text-center mb-16"
          >
            <motion.h2
              variants={fadeUp}
              className="text-4xl md:text-5xl font-bold font-[Poppins] text-[#0B1D33]"
            >
              How It Works
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className="mt-5 max-w-2xl text-lg leading-relaxed text-[#1F2937]"
            >
              From input to output in four simple steps powered by advanced AI
              and deep learning.
            </motion.p>
          </motion.div>

          {/* Timeline Steps */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Connecting lines */}
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="hidden lg:flex absolute top-8 -translate-y-1/2 z-0 items-center"
                style={{
                  left: `${12.5 + i * 25 + 8}%`,
                  width: `${25 - 16}%`,
                }}
              >
                <div className="relative flex-1 h-1 overflow-hidden rounded-full bg-blue-100/60">
                  <motion.div
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "linear",
                      delay: i * 0.4,
                    }}
                    className="absolute inset-0 bg-linear-to-r from-transparent via-[#0066CC]/40 to-transparent"
                  />
                </div>
                <ChevronRight
                  size={30}
                  strokeWidth={2.5}
                  className="text-[#0066CC]/50 -ml-1"
                />
              </div>
            ))}

            {WORKFLOW_STEPS.map((item, index) => (
              <motion.div
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={index}
                className="relative z-10"
              >
                <div className="flex flex-col items-center text-center">
                  {/* Step Circle */}
                  <div className="relative w-14 h-14 rounded-full bg-linear-to-br from-[#0066CC] to-[#003D99] flex items-center justify-center text-white font-bold text-base shadow-lg shadow-blue-500/20 mb-6 font-[Poppins]">
                    {item.step}
                  </div>

                  {/* Content */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 w-full hover:shadow-md transition-all duration-300">
                    <div className="flex justify-center mb-3 text-[#0066CC]">
                      {item.icon}
                    </div>

                    <h3 className="text-lg font-bold text-[#0B1D33] mb-2 font-[Poppins]">
                      {item.title}
                    </h3>

                    <p className="text-sm text-[#1F2937] leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AI CAPABILITIES ─── */}
      <section
        id="ai"
        className="scroll-mt-20 px-6 lg:px-8 py-28 bg-white"
      >
        <div className="max-w-7xl mx-auto">

          {/* Section Heading */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="flex flex-col items-center justify-center text-center mb-16"
          >
            <motion.h2
              variants={fadeUp}
              className="text-4xl md:text-5xl font-bold font-[Poppins] text-[#0B1D33]"
            >
              Advanced AI & Machine Learning
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className="mt-5 max-w-2xl text-lg leading-relaxed text-[#1F2937]"
            >
              Cutting edge deep learning technologies powering our recognition
              and conversion platform.
            </motion.p>
          </motion.div>

          {/* Content */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left — Feature List (open layout, no card borders) */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="space-y-3"
            >
              {AI_FEATURES.map((feature, index) => (
                <motion.div
                  key={index}
                  variants={fadeUp}
                  custom={index}
                  className="rounded-xl px-5 py-4 flex items-center gap-4 hover:bg-[#F8FAFF] transition-all duration-300"
                >
                  <div className="bg-linear-to-br from-blue-500 to-indigo-600 p-2 rounded-lg text-white shrink-0">
                    {feature.icon}
                  </div>

                  <p className="text-[#0B1D33] font-semibold text-[15px]">
                    {feature.text}
                  </p>

                  <CheckCircle2
                    size={18}
                    className="ml-auto text-emerald-500 shrink-0"
                  />
                </motion.div>
              ))}
            </motion.div>

            {/* Right — Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative hidden lg:flex items-center justify-center"
            >
              <div className="absolute w-72 h-72 bg-linear-to-br from-blue-400/15 to-violet-400/15 rounded-full blur-3xl" />

              {/* Central Brain Icon */}
              <div className="relative">

                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 24,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="w-60 h-60 rounded-full border-2 border-dashed border-blue-200/40 flex items-center justify-center"
                >
                  {/* Orbiting Icons */}
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="absolute w-11 h-11 bg-white rounded-xl shadow-md flex items-center justify-center"
                      style={{
                        transform: `rotate(${i * 90}deg) translateX(110px) rotate(-${i * 90}deg)`,
                      }}
                    >
                      {
                        [
                          <PenTool size={18} className="text-violet-500" />,
                          <Image size={18} className="text-cyan-500" />,
                          <Search size={18} className="text-amber-500" />,
                          <FileCode size={18} className="text-emerald-500" />,
                        ][i]
                      }
                    </div>
                  ))}
                </motion.div>

                {/* Center Brain */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-linear-to-br from-[#0066CC] to-[#003D99] p-5 rounded-2xl shadow-xl shadow-blue-500/25">
                    <Brain className="text-white" size={40} />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── SUPPORTED FORMATS ─── */}
      <section
        id="formats" className="scroll-mt-20 px-6 lg:px-8 py-28 bg-[#F8FAFF]"
      >
        <div className="max-w-7xl mx-auto">

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeUp}
              className="text-4xl md:text-5xl font-bold font-[Poppins] mb-4"
            >
              Supported Formats
            </motion.h2>
          </motion.div>

          {/* Flowing Input → Output layout */}
          <div className="grid md:grid-cols-2 gap-10">

            {/* Input Formats */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={scaleIn}
            >
              <div className="bg-white rounded-2xl p-8 h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-linear-to-br from-blue-500 to-indigo-600 p-2 rounded-xl text-white">
                    <ArrowRight size={18} />
                  </div>

                  <h3 className="text-xl font-bold text-[#0B1D33] font-[Poppins]">
                    Input Formats
                  </h3>
                </div>

                <div className="flex flex-wrap gap-3">
                  {[
                    "Document",
                    "PDF",
                    "LaTeX",
                    "MathML",
                    "PNG / JPG",
                    "Handwritten",
                  ].map((item, i) => (
                    <span
                      key={i}
                      className="bg-blue-50/60 px-5 py-2.5 rounded-xl text-[#0066CC] font-semibold text-sm"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Output Formats */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={scaleIn}
            >
              <div className="bg-white rounded-2xl p-8 h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-linear-to-br from-emerald-500 to-teal-600 p-2 rounded-xl text-white">
                    <Download size={18} />
                  </div>

                  <h3 className="text-xl font-bold text-[#0B1D33] font-[Poppins]">
                    Output Formats
                  </h3>
                </div>

                <div className="flex flex-wrap gap-3">
                  {[
                    "Equation Image",
                    "MathML",
                    "LaTeX",
                    "Word Equation",
                    "PDF",
                    "PNG / JPG",
                  ].map((item, i) => (
                    <span
                      key={i}
                      className="bg-emerald-50/60 px-5 py-2.5 rounded-xl text-emerald-700 font-semibold text-sm"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-linear-to-br from-[#0F172A] via-[#112240] to-[#0F172A] text-white px-6 lg:px-8 pt-16 pb-8">
        <div className="max-w-7xl mx-auto">

          <div className="grid md:grid-cols-4 gap-8 mb-12">

            {/* Brand */}
            <div className="md:col-span-1">

              <div className="flex items-center gap-2.5 mb-4">
                <div className="bg-linear-to-br from-[#0066CC] to-[#003D99] p-2 rounded-xl shadow-md shadow-blue-500/15">
                  <Zap className="text-white" size={18} />
                </div>

                <h3 className="text-xl font-bold font-[Poppins]">
                  EquationAI
                </h3>
              </div>

              <p className="text-gray-400 leading-relaxed text-sm mb-6">
                Transform mathematical equations with advanced AI and deep
                learning technology. Built for researchers, students,
                and professionals.
              </p>

              {/* Social Icons */}
              <div className="flex gap-3">
                {[
                  { icon: <Globe size={16} />, label: "Website" },
                  { icon: <MessageCircle size={16} />, label: "Community" },
                  { icon: <ExternalLink size={16} />, label: "Portfolio" },
                ].map((social, i) => (
                  <button
                    key={i}
                    aria-label={social.label}
                    className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-blue-300 hover:bg-white/10 transition-all duration-300 cursor-pointer border-none"
                  >
                    {social.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Links */}
            {[
              {
                title: "Product",
                links: ["Features", "Pricing", "API Docs", "Changelog"],
              },
              {
                title: "Resources",
                links: ["Documentation", "Tutorials", "Blog", "Support"],
              },
              {
                title: "Company",
                links: ["About", "Careers", "Privacy", "Terms"],
              },
            ].map((col, i) => (
              <div key={i}>

                <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
                  {col.title}
                </h4>

                <ul className="space-y-3">
                  {col.links.map((link, j) => (
                    <li key={j}>
                      <button className="text-gray-400 hover:text-blue-300 transition-colors duration-200 cursor-pointer bg-transparent border-none text-sm">
                        {link}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">

            <p className="text-gray-500 text-sm">
              © 2026 EquationAI. All rights reserved.
            </p>

            <p className="text-gray-500 text-sm text-center">
              AI-Based Mathematical Equation Conversion System
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}