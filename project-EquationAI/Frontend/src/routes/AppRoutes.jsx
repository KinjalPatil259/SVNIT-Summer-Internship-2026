import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import DashboardLayout from "../layouts/DashboardLayout";
import Overview from "../pages/Overview";
import Upload from "../pages/Upload";
import Handwriting from "../pages/Handwriting";
import Converter from "../pages/Converter";
import Search from "../pages/Search";
import History from "../pages/History";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<Home />} />

      {/* Dashboard with Sidebar Layout */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Overview />} />
        <Route path="upload" element={<Upload />} />
        <Route path="handwriting" element={<Handwriting />} />
        <Route path="converter" element={<Converter />} />
        <Route path="search" element={<Search />} />
        <Route path="history" element={<History />} />
      </Route>
    </Routes>
  );
}
