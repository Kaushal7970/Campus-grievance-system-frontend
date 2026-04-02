import { HashRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import PrincipalDashboard from "./pages/PrincipalDashboard";
import HodDashboard from "./pages/HodDashboard";
import CommitteeDashboard from "./pages/CommitteeDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import Profile from "./pages/Profile";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import GrievanceDetails from "./pages/GrievanceDetails";
import Announcements from "./pages/Announcements";

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <HashRouter>
      <Routes>

        {/* 🌐 PUBLIC ROUTES */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* 🔐 PROTECTED ROUTES */}

        {/* STUDENT */}
        <Route
          path="/student"
          element={
            <ProtectedRoute role="STUDENT">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        {/* SUPER ADMIN */}
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute role="SUPER_ADMIN">
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* ADMIN */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="ADMIN">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* PRINCIPAL */}
        <Route
          path="/principal"
          element={
            <ProtectedRoute role="PRINCIPAL">
              <PrincipalDashboard />
            </ProtectedRoute>
          }
        />

        {/* HOD */}
        <Route
          path="/hod"
          element={
            <ProtectedRoute role="HOD">
              <HodDashboard />
            </ProtectedRoute>
          }
        />

        {/* COMMITTEE */}
        <Route
          path="/committee"
          element={
            <ProtectedRoute role="COMMITTEE">
              <CommitteeDashboard />
            </ProtectedRoute>
          }
        />

        {/* FACULTY */}
        <Route
          path="/faculty"
          element={
            <ProtectedRoute role="FACULTY">
              <FacultyDashboard />
            </ProtectedRoute>
          }
        />

        {/* 👤 PROFILE (ALL USERS) */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* 📄 GRIEVANCE DETAILS (ALL USERS) */}
        <Route
          path="/grievance/:id"
          element={
            <ProtectedRoute>
              <GrievanceDetails />
            </ProtectedRoute>
          }
        />

        {/* 📢 ANNOUNCEMENTS (ALL USERS) */}
        <Route
          path="/announcements"
          element={
            <ProtectedRoute>
              <Announcements />
            </ProtectedRoute>
          }
        />

        {/* ❌ 404 */}
        <Route path="*" element={<h1 className="p-10 text-2xl">404 Page Not Found</h1>} />

      </Routes>
    </HashRouter>
  );
}

export default App;