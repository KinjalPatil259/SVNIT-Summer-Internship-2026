import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import "../styles/Dashboard.css";

/* ─── Page Titles ─── */
const PAGE_TITLES = {
  "/dashboard": "Dashboard Overview",
  "/dashboard/upload": "Upload Equation",
  "/dashboard/handwriting": "Handwriting Recognition",
  "/dashboard/converter": "MathML-LaTeX Converter",
  "/dashboard/search": "Semantic Search",
  "/dashboard/history": "Conversion History",
};

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const currentTitle = PAGE_TITLES[location.pathname] || "Dashboard";

  return (
    <div className="dashboard">
      {/* ─── Mobile Overlay ─── */}
      <div
        className={`sidebar-overlay ${mobileOpen ? "visible" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* ─── Sidebar ─── */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* ─── Main Content ─── */}
      <main className={`dashboard-main ${collapsed ? "collapsed" : ""}`}>
        {/* Top Bar */}
        <Navbar
          currentTitle={currentTitle}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        {/* Page Content with Animation */}
        <div className="dashboard-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
