import { Navigate, useNavigate, useLocation } from "react-router-dom";
import NotificationBell from "./NotificationBell";
import { toggleTheme } from "../services/theme";
import { getStoredUser, safeClear } from "../services/storage";

export default function Sidebar() {

  const navigate = useNavigate();
  const location = useLocation();

  const user = getStoredUser();
  if (!user) {
    // If session storage is missing/corrupt, redirect to login.
    safeClear();
    return <Navigate to="/" />;
  }

  const role = String(user?.role || "").toUpperCase();
  const dashboardByRole = {
    SUPER_ADMIN: { path: "/super-admin", label: "Super Admin Dashboard", icon: "📊" },
    ADMIN: { path: "/admin", label: "Admin Dashboard", icon: "📊" },
    PRINCIPAL: { path: "/principal", label: "Principal Dashboard", icon: "📊" },
    HOD: { path: "/hod", label: "HOD Dashboard", icon: "📊" },
    COMMITTEE: { path: "/committee", label: "Committee Dashboard", icon: "📊" },
    FACULTY: { path: "/faculty", label: "Faculty Dashboard", icon: "👨‍🏫" },
    WARDEN: { path: "/warden", label: "Warden Dashboard", icon: "🏨" },
    STUDENT: { path: "/student", label: "Student Dashboard", icon: "🎓" }
  };

  const logout = () => {
    safeClear();
    navigate("/");
  };

  const menuItem = (path, label, icon) => (
    <button
      onClick={() => navigate(path)}
      className={`w-full text-left p-3 rounded-xl transition flex items-center gap-2 ${
        location.pathname === path
          ? "bg-white text-[rgb(var(--app-accent))] font-semibold"
          : "hover:bg-white/20"
      }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  );

  return (
    <div className="h-screen w-64 bg-gradient-to-b from-[rgb(var(--app-accent))] to-[rgb(var(--app-accent-2))] text-white flex flex-col justify-between p-6">

      {/* TOP */}
      <div>
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-2xl font-bold">Grievance</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleTheme()}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition"
              title="Toggle dark mode"
            >
              <span className="text-lg">🌓</span>
            </button>
            <NotificationBell />
          </div>
        </div>

        <div className="space-y-3">

          {/* ROLE BASED DASHBOARD */}
          {dashboardByRole[role] && menuItem(dashboardByRole[role].path, dashboardByRole[role].label, dashboardByRole[role].icon)}

          {/* COMMON */}
          {menuItem("/profile", "Profile", "👤")}
          {menuItem("/announcements", "Announcements", "📢")}

        </div>
      </div>

      {/* BOTTOM */}
      <button
        onClick={logout}
        className="bg-red-500 hover:bg-red-600 p-3 rounded-xl text-center font-semibold transition"
      >
        🚪 Logout
      </button>

    </div>
  );
}