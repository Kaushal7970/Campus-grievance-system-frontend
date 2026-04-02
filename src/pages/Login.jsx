import { useState } from "react";
import API from "../services/api";
import { Link } from "react-router-dom";
import { safeSetItem } from "../services/storage";

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

      const res = await API.post("/auth/login", payload);

      // Debug: verify backend login payload contains token
      console.log("TOKEN:", res.data);

      const token = res?.data?.token;
      if (!token) {
        throw new Error("Token missing in login response");
      }

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
        role: res.data.role
      };

      try {
        localStorage.setItem("user", JSON.stringify(user));
      } catch {
        safeSetItem("user", JSON.stringify(user));
      }

      // 🔹 Redirect based on role (hard reload ensures fresh auth state)
      const role = String(user.role || "").toUpperCase();
      if (role === "SUPER_ADMIN") globalThis.location.href = "/#/super-admin";
      else if (role === "ADMIN") globalThis.location.href = "/#/admin";
      else if (role === "PRINCIPAL") globalThis.location.href = "/#/principal";
      else if (role === "HOD") globalThis.location.href = "/#/hod";
      else if (role === "COMMITTEE") globalThis.location.href = "/#/committee";
      else if (role === "FACULTY") globalThis.location.href = "/#/faculty";
      else globalThis.location.href = "/#/student";

    } catch (err) {
      console.error("Login Error:", err);

      if (err.response) {
        alert(err.response.data.message || "Invalid credentials");
      } else {
        alert(err.message || "Server not responding");
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">

      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl w-96 border border-white/20 dark:border-gray-700">

        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">
          Welcome Back 👋
        </h2>

        {/* Email */}
        <input
          type="email"
          className="w-full p-3 mb-4 border rounded-xl bg-white dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="Enter Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password */}
        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            className="w-full p-3 border rounded-xl bg-white dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 pr-20"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-indigo-600 hover:underline"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {/* Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-all"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* Forgot Password */}
        <Link
          to="/forgot-password"
          className="block text-center text-sm mt-3 text-indigo-600 hover:underline"
        >
          Forgot password?
        </Link>

        {/* Register Link */}
        <Link
          to="/register"
          className="block text-center text-sm mt-4 text-indigo-600 hover:underline"
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