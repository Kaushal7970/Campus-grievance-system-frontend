import { Navigate } from "react-router-dom";
import { getStoredUser, isTokenExpired, safeClear, safeGetItem } from "../services/storage";

export default function ProtectedRoute({ children, role, roles }) {

  const user = getStoredUser();
  const token = safeGetItem("token");

  // If user storage is unreadable/corrupt, force re-login.
  if (user === null) {
    safeClear();
    return <Navigate to="/" />;
  }

  // ❌ NOT LOGGED IN
  if (!user || !token) {
    safeClear();
    return <Navigate to="/" />;
  }

  // If token is expired, clear stale session and force sign-in.
  if (isTokenExpired(token)) {
    safeClear();
    return <Navigate to="/" />;
  }

  const userRole = String(user?.role || "").toUpperCase();
  const allowedRoles = Array.isArray(roles) ? roles.map((r) => String(r || "").toUpperCase()) : null;

  // ❌ ROLE MISMATCH
  if (
    (role && userRole !== String(role || "").toUpperCase()) ||
    (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole))
  ) {

    // 🔥 REDIRECT BASED ON ROLE
    if (userRole === "SUPER_ADMIN") return <Navigate to="/super-admin" />;
    if (userRole === "ADMIN") return <Navigate to="/admin" />;
    if (userRole === "PRINCIPAL") return <Navigate to="/principal" />;
    if (userRole === "HOD") return <Navigate to="/hod" />;
    if (userRole === "COMMITTEE") return <Navigate to="/committee" />;
    if (userRole === "FACULTY") return <Navigate to="/faculty" />;
    if (userRole === "WARDEN") return <Navigate to="/warden" />;
    return <Navigate to="/student" />;
  }

  // ✅ ACCESS GRANTED
  return children;
}