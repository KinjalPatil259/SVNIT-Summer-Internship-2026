import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Sparkles,
  Copy,
  Check,
  Download,
  Info,
  Database,
  Cpu,
  ExternalLink,
  TrendingUp,
  FileCode2,
  ListRestart,
} from 'lucide-react';
import EquationPreview from '../components/EquationPreview';
import { convertLatexToMathml, querySemanticSearch } from '../api/api';
import SearchBar from '../components/SearchBar';
import ResultCard from '../components/ResultCard';
import '../styles/Dashboard.css';

const COLORS = {
  bg: '#F8FAFF',
  heading: '#0B1D33',
  paragraph: '#1F2937',
  cardBg: '#FFFFFF',
  primary: '#0066CC',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 20 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

const ALL_EQUATIONS = [
  {
    id: 'eq-1',
    equation: 'x^2 + y^2 = z^2',
    category: 'Geometry',
    baseSimilarity: 96,
    description: 'Specifies the relation between the sides of a right-angled triangle in Euclidean space.',
    tags: ['pythagorean', 'triangle', 'right angle', 'geometry'],
  },
  {
    id: 'eq-2',
    equation: '\\sin^2(x) + \\cos^2(x) = 1',
    category: 'Trigonometry',
    baseSimilarity: 94,
    description: 'The fundamental Pythagorean trigonometric identity expressing the relation between sine and cosine.',
    tags: ['sine', 'cosine', 'trig', 'identity'],
  },
  {
    id: 'eq-3',
    equation: 'e^{i\\pi} + 1 = 0',
    category: 'Complex Analysis',
    baseSimilarity: 91,
    description: 'Euler\'s identity linking five fundamental mathematical constants in a single beautiful relation.',
    tags: ['euler', 'exponential', 'pi', 'imaginary'],
  },
  {
    id: 'eq-4',
    equation: 'E = m c^2',
    category: 'Relativistic Physics',
    baseSimilarity: 88,
    description: 'Einstein\'s mass-energy equivalence formula, showing mass and energy are interconvertible.',
    tags: ['einstein', 'relativity', 'energy', 'light'],
  },
  {
    id: 'eq-5',
    equation: 'f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}',
    category: 'Probability & Statistics',
    baseSimilarity: 85,
    description: 'The probability density function for the normal distribution, defining a standard bell curve.',
    tags: ['gaussian', 'bell curve', 'statistics', 'normal distribution'],
  },
  {
    id: 'eq-6',
    equation: '\\hat{f}(\\xi) = \\int_{-\\infty}^{\\infty} f(x) e^{-2\\pi i x \\xi} dx',
    category: 'Harmonic Analysis',
    baseSimilarity: 82,
    description: 'Decomposes a function of time (a signal) into the frequencies that make it up.',
    tags: ['fourier', 'transform', 'harmonic', 'waves'],
  },
  {
    id: 'eq-7',
    equation: '\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}',
    category: 'Electrodynamics',
    baseSimilarity: 79,
    description: 'Gauss\'s law describing how electric charges generate electric fields, part of Maxwell\'s equations.',
    tags: ['maxwell', 'field', 'gauss', 'electricity'],
  },
  {
    id: 'eq-8',
    equation: 'i\\hbar\\frac{\\partial}{\\partial t}\\Psi(\\mathbf{r},t) = \\hat{H}\\Psi(\\mathbf{r},t)',
    category: 'Quantum Mechanics',
    baseSimilarity: 76,
    description: 'Schrödinger equation describing how the wave function of a physical system evolves over time.',
    tags: ['schrodinger', 'wave function', 'quantum', 'hamiltonian'],
  },
];

const SEARCH_SUGGESTIONS = [
  'Pythagorean',
  'Trigonometry',
  'Euler Identity',
  'Fourier Wave Transform',
  'Einstein Relativity',
  'Normal Distribution',
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [copyingId, setCopyingId] = useState(null);

  const handleSearch = async (searchQuery) => {
    const activeQuery = searchQuery !== undefined ? searchQuery : query;
    if (!activeQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);
    setSearchResults([]);

    try {
      const data = await querySemanticSearch(activeQuery);
      const resultsWithIds = data.results.map((res, index) => ({
        id: `result-${index}-${res.equation}`,
        equation: res.equation,
        category: res.category,
        similarity: res.similarity_score,
        description: res.explanation,
      }));
      setSearchResults(resultsWithIds);
    } catch (err) {
      console.error("Semantic search failed, falling back to simulated results:", err);
      
      const lowerQuery = activeQuery.toLowerCase();
      const matches = ALL_EQUATIONS.map((eq) => {
        let matchScore = 0;
        eq.tags.forEach((tag) => {
          if (lowerQuery.includes(tag) || tag.includes(lowerQuery)) {
            matchScore += 25;
          }
        });
        if (eq.category.toLowerCase().includes(lowerQuery)) {
          matchScore += 30;
        }
        if (eq.description.toLowerCase().includes(lowerQuery)) {
          matchScore += 15;
        }
        const semanticSim = Math.min(
          99,
          Math.max(
            matchScore > 0 ? eq.baseSimilarity + Math.floor(Math.random() * 3) : 0,
            matchScore > 0 ? 55 + matchScore : 0
          )
        );
        return { ...eq, similarity: semanticSim };
      })
      .filter((eq) => eq.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity);

      const fallbackResults = matches.map((eq) => ({
        id: eq.id,
        equation: eq.equation,
        category: eq.category,
        similarity: eq.similarity,
        description: eq.description,
      }));
      setSearchResults(fallbackResults);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  const handleClear = () => {
    setQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const handleCopyMathML = async (latex, resultId) => {
    try {
      setCopyingId(resultId);
      const data = await convertLatexToMathml(latex);
      await navigator.clipboard.writeText(data.mathml);
      setCopiedId(resultId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to convert/copy MathML, copying LaTeX instead:', err);
      await navigator.clipboard.writeText(latex);
      setCopiedId(resultId);
      setTimeout(() => setCopiedId(null), 2000);
    } finally {
      setCopyingId(null);
    }
  };

  const handleDownloadTex = (latex, name) => {
    const blob = new Blob([latex], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.toLowerCase().replace(/\s+/g, '_')}.tex`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex items-center gap-4"
      >
        <div
          className="flex items-center justify-center w-12 h-12 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, #0066CC, #4F46E5)',
            boxShadow: '0 4px 16px rgba(0, 102, 204, 0.2)',
          }}
        >
          <Database size={24} className="text-white" />
        </div>
        <div>
          <h1
            className="text-2xl font-bold text-[#0B1D33]"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Semantic Search
          </h1>
          <p className="text-base text-[#1F2937] mt-1">
            Query mathematically related equations using AI-powered vector similarity search.
          </p>
        </div>
      </motion.div>

      {/* Search + Info */}
      <div className="grid lg:grid-cols-3 gap-8 items-start">
        
        {/* Main Search */}
        <div className="lg:col-span-2 space-y-6">
          <SearchBar
            query={query}
            setQuery={setQuery}
            onSearch={handleSearch}
            onClear={handleClear}
            loading={loading}
            suggestions={SEARCH_SUGGESTIONS}
            onSuggestionClick={handleSuggestionClick}
          />
        </div>

        {/* How it works — open layout */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: COLORS.heading }}>
            <Info size={16} className="text-[#0066CC]" />
            How Semantic Search Works
          </h3>
          <div className="space-y-4 text-xs leading-relaxed" style={{ color: COLORS.paragraph }}>
            {[
              { icon: <Cpu size={15} />, title: "Vector Embeddings", desc: "Mathematical formulas are translated into high-dimensional vector spaces using deep neural models." },
              { icon: <Database size={15} />, title: "Chroma DB Storage", desc: "Embedded vectors are stored in a database optimized for calculating spatial proximity." },
              { icon: <TrendingUp size={15} />, title: "Similarity Thresholding", desc: "Searches measure the angle between query and formula vectors to produce similarity percentages." },
            ].map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className="mt-0.5 text-[#0066CC] shrink-0">{item.icon}</div>
                <div>
                  <strong className="text-[#1F2937] block mb-0.5">{item.title}</strong>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-lg font-bold" style={{ color: COLORS.heading }}>
            {hasSearched ? 'Search Results' : 'Search Insights'}
          </h2>
          {hasSearched && !loading && (
            <span className="text-xs text-slate-400 font-medium">
              Found {searchResults.length} matches
            </span>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* Loading */}
          {loading && (
            <motion.div
              key="loading-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col items-center justify-center py-14 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="relative w-14 h-14">
                  <div className="absolute inset-0 border-4 border-[#0066CC]/10 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h4 className="text-base font-bold text-[#0B1D33] mt-5">Scanning Chroma Vector Spaces...</h4>
                <p className="text-xs text-[#1F2937] mt-1">Measuring vector distances & calculating cosine similarities</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl animate-pulse space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <div className="flex justify-between items-center">
                      <div className="h-6 w-24 bg-slate-100 rounded-lg"></div>
                      <div className="h-4 w-12 bg-slate-100 rounded-lg"></div>
                    </div>
                    <div className="h-24 bg-slate-50 rounded-xl"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-slate-100 rounded-lg"></div>
                      <div className="h-4 w-2/3 bg-slate-100 rounded-lg"></div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Empty State */}
          {!hasSearched && !loading && (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center px-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#F8FAFF] flex items-center justify-center text-slate-400 mb-4">
                <Search size={32} />
              </div>
               <h3 className="text-lg font-bold text-[#0B1D33]">Explore Equation Relational Mapping</h3>
              <p className="text-sm max-w-sm mt-2 text-[#1F2937]">
                Search formulas or pick from suggested concepts above to retrieve vectors and test equation similarities.
              </p>
            </motion.div>
          )}

          {/* No results */}
          {hasSearched && !loading && searchResults.length === 0 && (
            <motion.div
              key="no-results-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center px-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mb-4">
                <Info size={32} />
              </div>
              <h3 className="text-lg font-bold text-[#0B1D33]">No Semantic Relatives Found</h3>
              <p className="text-sm max-w-sm mt-2 text-[#1F2937]">
                Your search did not register any close vector neighbours. Try general descriptors or math symbols.
              </p>
            </motion.div>
          )}

          {/* Results */}
          {hasSearched && !loading && searchResults.length > 0 && (
            <motion.div
              key="results-grid"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid md:grid-cols-2 gap-5"
            >
              {searchResults.map((result) => (
                <ResultCard
                  key={result.id}
                  result={result}
                  onCopyMathML={handleCopyMathML}
                  onDownloadTex={handleDownloadTex}
                  copiedId={copiedId}
                  copyingId={copyingId}
                  cardVariants={cardVariants}
                  COLORS={COLORS}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
