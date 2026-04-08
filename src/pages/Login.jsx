import { useState } from "react";
import API from "../services/api";
import { Link } from "react-router-dom";
import { safeSetItem } from "../services/storage";
import { setTheme } from "../services/theme";

export default function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {

    // 🔹 Validation
    if (!email.trim() || !password.trim()) {
      alert("Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      // 🔥 MAIN FIX (IMPORTANT)
      const payload = {
        email: email.trim().toLowerCase(),
        password: password.trim()
      };

      console.log("Login Payload:", payload);

      // Render free-tier cold starts can exceed 60s; give auth a longer timeout.
      const authTimeoutMs = process.env.NODE_ENV === "production" ? 120000 : 15000;
      const res = await API.post("/auth/login", payload, { timeout: authTimeoutMs });

      // Debug: verify backend login payload contains token
      console.log("TOKEN:", res.data);

      const token = res?.data?.token;
      if (!token) {
        throw new Error("Token missing in login response");
      }

      // Ensure subsequent requests include the token immediately.
      API.defaults.headers.common["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

      // 🔹 Save token
      try {
        localStorage.setItem("token", token);
      } catch {
        safeSetItem("token", token);
      }

      // 🔹 Save user
      const user = {
        id: res.data.id,
        email: res.data.email,
        role: res.data.role,
        phoneNumber: res.data.phoneNumber || "",
        name: res.data.name || "",
        department: res.data.department || "",
        avatarUrl: res.data.avatarUrl || "",
        smsNotificationsEnabled: typeof res.data.smsNotificationsEnabled === "boolean" ? res.data.smsNotificationsEnabled : true,
        emailNotificationsEnabled: typeof res.data.emailNotificationsEnabled === "boolean" ? res.data.emailNotificationsEnabled : true,
        themeId: res.data.themeId || ""
      };

      // Apply server theme preference if present; fall back to existing localStorage otherwise.
      if (user.themeId) {
        setTheme(user.themeId);
      }

      try {
        localStorage.setItem("user", JSON.stringify(user));
      } catch {
        safeSetItem("user", JSON.stringify(user));
      }

      // 🔹 Redirect based on role (hard reload ensures fresh auth state)
      const role = String(user.role || "").toUpperCase();
      if (role === "SUPER_ADMIN") window.location.assign("/#/super-admin");
      else if (role === "ADMIN") window.location.assign("/#/admin");
      else if (role === "PRINCIPAL") window.location.assign("/#/principal");
      else if (role === "HOD") window.location.assign("/#/hod");
      else if (role === "COMMITTEE") window.location.assign("/#/committee");
      else if (role === "FACULTY") window.location.assign("/#/faculty");
      else if (role === "WARDEN") window.location.assign("/#/warden");
      else window.location.assign("/#/student");

    } catch (err) {
      console.error("Login Error:", err);

      if (err.response) {
        alert(err.response.data.message || "Invalid credentials");
      } else {
        const msg = String(err?.message || "");
        const isTimeout = err?.code === "ECONNABORTED" || /timeout\s+of\s+\d+ms\s+exceeded/i.test(msg);
        if (isTimeout) {
          alert("Login is taking longer than usual (server may be starting). Please wait ~30-60 seconds and try again.");
        } else {
          alert(msg || "Server not responding");
        }
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-r from-[rgb(var(--app-accent))] via-[rgb(var(--app-accent-2))] to-[rgb(var(--app-accent-3))] dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">

      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl w-96 border border-white/20 dark:border-gray-700">

        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">
          Welcome Back 👋
        </h2>

        {/* Email */}
        <input
          type="email"
          className="w-full p-3 mb-4 border rounded-xl bg-white dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--app-accent)/0.45)]"
          placeholder="Enter Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password */}
        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            className="w-full p-3 border rounded-xl bg-white dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--app-accent)/0.45)] pr-20"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[rgb(var(--app-accent))] hover:underline"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {/* Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-[rgb(var(--app-accent))] text-white p-3 rounded-xl hover:bg-[rgb(var(--app-accent-hover))] transition-all"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* Forgot Password */}
        <Link
          to="/forgot-password"
          className="block text-center text-sm mt-3 text-[rgb(var(--app-accent))] hover:underline"
        >
          Forgot password?
        </Link>

        {/* Register Link */}
        <Link
          to="/register"
          className="block text-center text-sm mt-4 text-[rgb(var(--app-accent))] hover:underline"
        >
          New user? Register here
        </Link>

        {/* Footer */}
        <p className="text-center text-xs mt-4 text-gray-500">
          Campus Grievance Management System
        </p>

      </div>
    </div>
  );
}