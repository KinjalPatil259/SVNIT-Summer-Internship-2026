import { NavLink, useNavigate } from "react-router-dom";
import {
  Zap,
  LayoutDashboard,
  Upload,
  PenTool,
  RefreshCw,
  Search,
  Clock,
  ChevronLeft,
} from "lucide-react";

/* ─── Sidebar Navigation Items ─── */
const NAV_ITEMS = [
  {
    label: "Overview",
    path: "/dashboard",
    icon: <LayoutDashboard size={20} />,
    section: "General",
  },
  {
    label: "Document OCR",
    path: "/dashboard/upload",
    icon: <Upload size={20} />,
    section: "Tools",
  },
  {
    label: "Handwriting OCR",
    path: "/dashboard/handwriting",
    icon: <PenTool size={20} />,
    section: "Tools",
  },
  {
    label: "Equation Converter",
    path: "/dashboard/converter",
    icon: <RefreshCw size={20} />,
    section: "Tools",
  },
  {
    label: "Semantic Search",
    path: "/dashboard/search",
    icon: <Search size={20} />,
    section: "Explore",
  },
  {
    label: "History",
    path: "/dashboard/history",
    icon: <Clock size={20} />,
    section: "Explore",
  },
];

/* Group nav items by section */
const SECTIONS = NAV_ITEMS.reduce((acc, item) => {
  if (!acc[item.section]) acc[item.section] = [];
  acc[item.section].push(item);
  return acc;
}, {});

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const navigate = useNavigate();

  return (
    <aside
      className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
    >
      {/* Logo */}
      <button
        className="sidebar-logo"
        onClick={() => navigate("/")}
        title="Back to Home"
        style={{ border: "none" }}
      >
        <div className="sidebar-logo-icon">
          <Zap className="text-white" size={18} />
        </div>
        <span className="sidebar-logo-text">EquationAI</span>
      </button>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {Object.entries(SECTIONS).map(([section, items]) => (
          <div key={section}>
            <div className="sidebar-section-label">{section}</div>
            {items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/dashboard"}
                className={({ isActive }) =>
                  `sidebar-item ${isActive ? "active" : ""}`
                }
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
              >
                <div className="sidebar-item-icon">{item.icon}</div>
                <span className="sidebar-item-text">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="sidebar-footer">
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <div className="sidebar-item-icon">
            <ChevronLeft size={20} />
          </div>
          <span className="sidebar-collapse-label">Collapse</span>
        </button>
      </div>

      {/* Version Badge */}
      <div className="sidebar-version">v1.0 — AI Engine</div>
    </aside>
  );
}
