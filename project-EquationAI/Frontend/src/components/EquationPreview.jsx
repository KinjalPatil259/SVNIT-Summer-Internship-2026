import 'katex/dist/katex.min.css';
import { BlockMath } from './MathRenderer';

const cleanLatex = (str) => {
  if (!str) return '\\text{No equation}';
  let s = str.trim();
  
  // Remove wrapping $$ ... $$
  if (s.startsWith('$$') && s.endsWith('$$')) {
    s = s.substring(2, s.length - 2).trim();
  }
  // Remove wrapping $ ... $
  else if (s.startsWith('$') && s.endsWith('$')) {
    s = s.substring(1, s.length - 1).trim();
  }
  // Remove wrapping \[ ... \]
  else if (s.startsWith('\\[') && s.endsWith('\\]')) {
    s = s.substring(2, s.length - 2).trim();
  }
  
  // Check for empty display patterns
  const emptyPatterns = [
    /^\displaystyle\s*\{\s*\\displaylines\s*\{\s*\}\s*\}$/,
    /^\\displaylines\s*\{\s*\}$/,
    /^\\displaystyle\s*\{\s*\}$/,
    /^\\displaystyle$/,
    /^\\displaylines$/
  ];
  
  for (const pattern of emptyPatterns) {
    if (pattern.test(s)) {
      return '\\text{No equation detected}';
    }
  }
  
  // Unwrap \displaystyle{...} if it wraps everything
  if (s.startsWith('\\displaystyle{') && s.endsWith('}')) {
    s = s.substring(14, s.length - 1).trim();
  }
  // Unwrap \displaylines{...} if it wraps everything
  if (s.startsWith('\\displaylines{') && s.endsWith('}')) {
     s = s.substring(14, s.length - 1).trim();
  }
  
  if (!s) return '\\text{No equation detected}';
  return s;
};

const EquationPreview = ({ equation, hideCard = false }) => {
  const sanitized = cleanLatex(equation);

  if (hideCard) {
    return (
      <div className="overflow-x-auto text-2xl text-[#0B1D33] py-3 w-full flex justify-center">
        <BlockMath math={sanitized} />
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFF] rounded-xl p-6 w-full">
      <h4 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4">
        Equation Visual Preview
      </h4>

      <div className="overflow-x-auto text-2xl text-[#0B1D33] flex justify-center">
        <BlockMath math={sanitized} />
      </div>
    </div>
  );
};

export default EquationPreview;