import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API from "../services/api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const initialEmail = useMemo(() => params.get("email") || "", [params]);

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !otp.trim() || !newPassword.trim()) {
      alert("Fill all fields");
      return;
    }

    try {
      setLoading(true);
      await API.post("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword: newPassword.trim(),
      });

      alert("✅ Password reset successful");
      navigate("/");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Reset password failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Reset Password</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          className="w-full p-3 mb-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="OTP"
          value={otp}
          className="w-full p-3 mb-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
          onChange={(e) => setOtp(e.target.value)}
        />

        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          className="w-full p-3 mb-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-green-600 text-white p-3 rounded-xl hover:bg-green-700 transition"
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>

        <button
          onClick={() => navigate("/")}
          className="w-full mt-3 border border-gray-200 p-3 rounded-xl hover:bg-gray-50"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
