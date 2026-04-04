import Sidebar from "../components/Sidebar";
import { useState } from "react";
import API from "../services/api";
import { Navigate } from "react-router-dom";
import { getStoredUser, safeClear, safeSetItem } from "../services/storage";

export default function Profile() {

  const storedUser = getStoredUser();

  const [email, setEmail] = useState(storedUser?.email || "");
  const [password, setPassword] = useState("");
  const [edit, setEdit] = useState(false);

  if (!storedUser?.id) {
    safeClear();
    return <Navigate to="/" />;
  }

  const updateProfile = async () => {
    try {
      await API.put(`/users/${storedUser.id}/update`, {
        email
      });

      alert("Profile Updated ✅");

      const updatedUser = { ...storedUser, email };
      safeSetItem("user", JSON.stringify(updatedUser));

      setEdit(false);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Profile update failed";
      alert(msg);
    }
  };

  const changePassword = async () => {
    if (!password) {
      alert("Enter password");
      return;
    }

    try {
      await API.put(`/users/${storedUser.id}/change-password?password=${password}`);

      alert("Password Changed ✅");
      setPassword("");
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Password change failed";
      alert(msg);
    }
  };

  return (
    <div className="flex">

      <Sidebar />

      <div className="flex-1 p-10 bg-gray-100 dark:bg-gray-900 min-h-screen">

        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">👤 Profile</h1>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow max-w-md space-y-4 border border-gray-100 dark:border-gray-700">

          {/* EMAIL */}
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Email</div>

            <input
              value={email}
              disabled={!edit}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border dark:border-gray-700 p-2 rounded bg-white dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          {/* ROLE */}
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Role</div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{storedUser.role}</p>
          </div>

          {/* EDIT BUTTON */}
          {edit ? (
            <button
              onClick={updateProfile}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Save Changes
            </button>
          ) : (
            <button
              onClick={() => setEdit(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Edit Profile
            </button>
          )}

          {/* PASSWORD CHANGE */}
          <div className="pt-4 border-t dark:border-gray-700">

            <div className="text-sm text-gray-500 dark:text-gray-400">New Password</div>

            <input
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border dark:border-gray-700 p-2 rounded mt-1 bg-white dark:bg-gray-900 dark:text-gray-100"
            />

            <button
              onClick={changePassword}
              className="bg-red-500 text-white px-4 py-2 rounded mt-2"
            >
              Change Password
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}