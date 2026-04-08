import { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: ""
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;
    const phoneNumber = form.phoneNumber.trim();

    if (!name || !email || !phoneNumber || !password) {
      alert("Please fill all fields");
      return;
    }

    // Very small sanity-check; backend also validates.
    if (!/^\S+@\S+\.[^\s@]+$/.test(email)) {
      alert("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);

      await API.post("/auth/register", {
        name,
        email,
        password,
        phoneNumber,
        role: "STUDENT"
      });

      alert("✅ Registered Successfully");
      navigate("/");

    } catch (err) {
      console.error(err);

      const message = err?.response?.data?.message;
      if (message) {
        alert(message);
      } else {
        alert("❌ Registration Failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex justify-center items-center bg-gradient-to-r from-[rgb(var(--app-accent))] to-[rgb(var(--app-accent-2))] dark:from-gray-950 dark:to-gray-900">

      <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl w-96 border border-gray-100 dark:border-gray-700">

        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">
          Create Account 🚀
        </h2>

        <input
          placeholder="Full Name"
          className="w-full p-3 mb-4 border rounded-xl bg-white dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--app-accent)/0.45)]"
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 mb-4 border rounded-xl bg-white dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--app-accent)/0.45)]"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          type="tel"
          placeholder="Phone (e.g. +91XXXXXXXXXX)"
          className="w-full p-3 mb-4 border rounded-xl bg-white dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--app-accent)/0.45)]"
          onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 mb-4 border rounded-xl bg-white dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--app-accent)/0.45)]"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[rgb(var(--app-accent))] text-white p-3 rounded-xl hover:bg-[rgb(var(--app-accent-hover))] transition"
        >
          {loading ? "Registering..." : "Register"}
        </button>

        <p className="text-center mt-4 text-sm text-gray-800 dark:text-gray-200">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/")}
            className="text-[rgb(var(--app-accent))] cursor-pointer font-semibold"
          >
            Login
          </span>
        </p>

      </div>
    </div>
  );
}