import { Search, ListRestart } from 'lucide-react';

export default function SearchBar({
  query,
  setQuery,
  onSearch,
  onClear,
  loading,
  suggestions = [],
  onSuggestionClick,
}) {
  return (
    <div className="space-y-5">
      {/* Large Search Input */}
      <div className="relative flex items-center">
        <div className="absolute left-5 text-slate-400">
          <Search size={20} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          placeholder="Search equations, formulas, or mathematical concepts..."
          className="w-full pl-14 pr-32 py-4.5 bg-white border border-slate-200/60 rounded-2xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066CC]/12 focus:border-[#0066CC]/40 transition-all shadow-sm"
        />
        <div className="absolute right-3 flex items-center gap-2">
          {query && (
            <button
              onClick={onClear}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <ListRestart size={18} />
            </button>
          )}
          <button
            onClick={() => onSearch()}
            disabled={!query.trim() || loading}
            className="px-5 py-2.5 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #0066CC, #0052A3)',
              boxShadow: '0 3px 12px rgba(0, 102, 204, 0.2)',
            }}
          >
            Search
          </button>
        </div>
      </div>

      {/* Query suggestions */}
      <div className="space-y-2.5">
        <span className="text-[10px] font-bold text-[#1F2937] uppercase tracking-wider block">
          Suggested Queries
        </span>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onSuggestionClick(suggestion)}
              className="px-3.5 py-1.5 bg-[#F8FAFF] hover:bg-[#0066CC]/5 text-[#1F2937] hover:text-[#0066CC] rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
