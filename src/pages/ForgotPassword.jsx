import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(null);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const submit = async () => {
    if (!email.trim()) {
      alert("Enter your email");
      return;
    }

    try {
      setLoading(true);
      setOtp(null);
      setMessage("");

      const res = await API.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });

      setMessage(res?.data?.message || "If the email exists, an OTP has been generated.");
      if (res?.data?.otp) {
        setOtp(res.data.otp);
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Forgot password failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-r from-[rgb(var(--app-accent))] to-[rgb(var(--app-accent-2))]">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-96">
        <h2 className="text-2xl font-bold mb-2 text-center">Forgot Password</h2>
        <p className="text-sm text-gray-600 mb-6 text-center">We will generate an OTP for reset.</p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          className="w-full p-3 mb-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[rgb(var(--app-accent)/0.45)]"
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-[rgb(var(--app-accent))] text-white p-3 rounded-xl hover:bg-[rgb(var(--app-accent-hover))] transition"
        >
          {loading ? "Sending..." : "Generate OTP"}
        </button>

        {message && (
          <div className="mt-4 text-sm bg-[rgb(var(--app-accent)/0.08)] border border-[rgb(var(--app-accent)/0.18)] p-3 rounded-xl">
            <div className="text-gray-800">{message}</div>
            {otp && (
              <div className="mt-2">
                <div className="text-xs text-gray-500">DEV OTP (only shown in dev mode):</div>
                <div className="font-mono text-lg font-bold text-[rgb(var(--app-accent))]">{otp}</div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <button
            onClick={() => navigate("/")}
            className="flex-1 border border-gray-200 p-3 rounded-xl hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`)}
            className="flex-1 bg-green-600 text-white p-3 rounded-xl hover:bg-green-700"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
