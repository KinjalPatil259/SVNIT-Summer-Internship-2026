import { useNavigate, useLocation } from "react-router-dom";
import { Home, Menu, X, UploadCloud, PenTool, RefreshCw } from "lucide-react";

export default function Navbar({ currentTitle, mobileOpen, setMobileOpen }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="dashboard-topbar">
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Mobile hamburger */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Nav Links in Center */}
      <div className="hidden md:flex items-center gap-2">
        {[
          { label: "Document OCR", path: "/dashboard/upload",},
          { label: "Handwriting OCR", path: "/dashboard/handwriting",},
          { label: "Equation Converter", path: "/dashboard/converter",},
        ].map((link) => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            className={`flex items-center gap-1.5 font-bold text-[12px] transition-all bg-transparent border-none cursor-pointer py-1.5 px-3 rounded-lg ${
              isActive(link.path)
                ? "text-[#0066CC] bg-blue-50/70"
                : "text-[#1F2937] hover:text-[#0066CC] hover:bg-blue-50/70"
            }`}
          >
            <span>{link.label}</span>
          </button>
        ))}
      </div>

      <div className="dashboard-topbar-actions">
        <button
          className="topbar-home-btn"
          onClick={() => navigate("/dashboard")}
        >
          <Home size={15} />
          <span>Home</span>
        </button>
      </div>
    </header>
  );
}
