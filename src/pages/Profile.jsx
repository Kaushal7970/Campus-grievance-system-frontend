import Sidebar from "../components/Sidebar";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import API from "../services/api";
import { getStoredUser, safeClear, safeSetItem } from "../services/storage";
import { THEMES, getStoredTheme, setTheme } from "../services/theme";

function initials(nameOrEmail) {
  const v = String(nameOrEmail || "").trim();
  if (!v) return "U";
  const parts = v.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (v.includes("@")) return v[0].toUpperCase();
  return (parts[0][0] || "U").toUpperCase();
}

function formatInstant(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
}

export default function Profile() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();
  const storedName = storedUser?.name || "";
  const storedPhoneNumber = storedUser?.phoneNumber || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState(null);

  const [name, setName] = useState(storedName);
  const [phoneNumber, setPhoneNumber] = useState(storedPhoneNumber);
  const [smsEnabled, setSmsEnabled] = useState(typeof storedUser?.smsNotificationsEnabled === "boolean" ? storedUser.smsNotificationsEnabled : true);
  const [emailEnabled, setEmailEnabled] = useState(typeof storedUser?.emailNotificationsEnabled === "boolean" ? storedUser.emailNotificationsEnabled : true);

  const [themeId, setThemeId] = useState(getStoredTheme() || (document.documentElement.dataset.theme || "light"));

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fileRef = useRef(null);

  const isAuthed = Boolean(storedUser?.id);

  const avatarSrc = useMemo(() => {
    const url = profile?.avatarUrl || storedUser?.avatarUrl;
    if (!url) return "";
    // Bust caching after upload.
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}t=${Date.now()}`;
  }, [profile?.avatarUrl, storedUser?.avatarUrl]);

  useEffect(() => {
    if (!isAuthed) return;

    let cancelled = false;
    (async () => {
      try {
        setError("");
        setLoading(true);
        const res = await API.get("/users/me");
        if (cancelled) return;

        const p = res?.data || null;
        setProfile(p);
        setName(p?.name || storedName);
        setPhoneNumber(p?.phoneNumber || storedPhoneNumber);
        setSmsEnabled(typeof p?.smsNotificationsEnabled === "boolean" ? p.smsNotificationsEnabled : true);
        setEmailEnabled(typeof p?.emailNotificationsEnabled === "boolean" ? p.emailNotificationsEnabled : true);

        if (p?.themeId) {
          setTheme(p.themeId);
          setThemeId(p.themeId);
        }
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Failed to load profile";
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthed, storedName, storedPhoneNumber]);

  if (!isAuthed) {
    safeClear();
    return <Navigate to="/" />;
  }

  const persistStoredUser = (patch) => {
    try {
      const next = { ...(storedUser || {}), ...(patch || {}) };
      safeSetItem("user", JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      setError("");

      const payload = {
        name: String(name || "").trim(),
        phoneNumber: String(phoneNumber || "").trim(),
        smsNotificationsEnabled: Boolean(smsEnabled),
        emailNotificationsEnabled: Boolean(emailEnabled),
        themeId: String(themeId || "").trim() || null
      };

      const res = await API.put("/users/me", payload);
      const p = res?.data || null;
      setProfile(p);
      persistStoredUser({
        name: p?.name ?? payload.name,
        phoneNumber: p?.phoneNumber ?? payload.phoneNumber,
        smsNotificationsEnabled: typeof p?.smsNotificationsEnabled === "boolean" ? p.smsNotificationsEnabled : payload.smsNotificationsEnabled,
        emailNotificationsEnabled: typeof p?.emailNotificationsEnabled === "boolean" ? p.emailNotificationsEnabled : payload.emailNotificationsEnabled,
        themeId: p?.themeId ?? payload.themeId,
        avatarUrl: p?.avatarUrl || storedUser?.avatarUrl || "",
        department: p?.department || storedUser?.department || "",
        role: p?.role || storedUser?.role
      });

      alert("Profile updated ✅");
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Profile update failed";
      setError(msg);
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFile = async (file) => {
    if (!file) return;
    try {
      setSaving(true);
      setError("");

      const form = new FormData();
      form.append("file", file);

      const res = await API.post("/users/me/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const p = res?.data || null;
      setProfile(p);
      persistStoredUser({ avatarUrl: p?.avatarUrl || "/api/users/me/avatar" });
      alert("Avatar updated ✅");
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Avatar upload failed";
      setError(msg);
      alert(msg);
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const changePassword = async () => {
    if (!currentPassword.trim()) {
      alert("Enter current password");
      return;
    }
    if (!newPassword.trim()) {
      alert("Enter new password");
      return;
    }
    if (newPassword.length < 6) {
      alert("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await API.put("/users/me/password", {
        currentPassword: currentPassword,
        newPassword: newPassword
      });
      alert("Password changed ✅ (other sessions logged out)");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Password change failed";
      setError(msg);
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const logoutAll = async () => {
    if (!window.confirm("Logout from all devices?")) return;
    try {
      await API.post("/users/me/logout-all");
    } catch {
      // Even if request fails, user can still clear locally.
    }
    safeClear();
    navigate("/");
  };

  const applyThemeSelection = (next) => {
    const t = String(next || "light");
    setTheme(t);
    setThemeId(t);
  };

  const displayEmail = profile?.email || storedUser?.email || "";
  const displayRole = profile?.role || storedUser?.role || "";
  const displayDept = profile?.department || storedUser?.department || "";
  const lastLoginAt = profile?.lastLoginAt || "";

  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1 p-8 bg-gray-100 dark:bg-gray-900 min-h-screen">
        <div className="max-w-5xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">👤 Profile & Settings</h1>
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Manage your profile, theme, notifications and security.</div>
            </div>
            <button
              onClick={logoutAll}
              className="text-sm bg-white dark:bg-gray-900 border dark:border-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              Logout all devices
            </button>
          </div>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
              {error}
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6 mt-6">
            {/* Left: profile card */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 bg-[rgb(var(--app-accent)/0.12)] flex items-center justify-center">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-lg font-bold text-[rgb(var(--app-accent))]">
                      {initials(name || displayEmail)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{name || profile?.name || "User"}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 truncate">{displayEmail}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {displayRole ? `Role: ${displayRole}` : ""}{displayDept ? ` • Dept: ${displayDept}` : ""}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAvatarFile(e.target.files?.[0])}
                  className="w-full text-sm text-gray-700 dark:text-gray-200"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">Max 2MB. JPG/PNG recommended.</div>
              </div>

              <div className="mt-6 border-t dark:border-gray-700 pt-4">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Account</div>
                <div className="mt-3 space-y-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Email</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-all">{displayEmail}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-3">Last login</div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">{formatInstant(lastLoginAt) || "—"}</div>
                </div>
              </div>
            </div>

            {/* Middle: profile + prefs */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Profile</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Update your personal details.</div>
                  </div>
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="bg-[rgb(var(--app-accent))] text-white px-4 py-2 rounded-xl hover:bg-[rgb(var(--app-accent-hover))] disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--app-accent)/0.45)]"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-5">
                  <div>
                    <label htmlFor="profile-full-name" className="text-xs text-gray-500 dark:text-gray-400">Full name</label>
                    <input
                      id="profile-full-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full border dark:border-gray-700 p-3 rounded-xl mt-1 bg-white dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--app-accent)/0.45)]"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-phone" className="text-xs text-gray-500 dark:text-gray-400">Phone</label>
                    <input
                      id="profile-phone"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+91XXXXXXXXXX"
                      className="w-full border dark:border-gray-700 p-3 rounded-xl mt-1 bg-white dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--app-accent)/0.45)]"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-role" className="text-xs text-gray-500 dark:text-gray-400">Role</label>
                    <input
                      id="profile-role"
                      value={displayRole}
                      disabled
                      className="w-full border dark:border-gray-700 p-3 rounded-xl mt-1 bg-gray-50 dark:bg-gray-900/40 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-department" className="text-xs text-gray-500 dark:text-gray-400">Department</label>
                    <input
                      id="profile-department"
                      value={displayDept || "(not set)"}
                      disabled
                      className="w-full border dark:border-gray-700 p-3 rounded-xl mt-1 bg-gray-50 dark:bg-gray-900/40 dark:text-gray-200"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">Department changes are managed by admins.</div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Preferences</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Control how you receive updates.</div>

                <div className="mt-4 space-y-3">
                  <label htmlFor="pref-sms-updates" className="flex items-center justify-between gap-4 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <span className="sr-only">SMS updates</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">SMS updates</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Complaint submitted/assigned/status updates/escalations.</div>
                    </div>
                    <input
                      id="pref-sms-updates"
                      type="checkbox"
                      checked={smsEnabled}
                      onChange={(e) => setSmsEnabled(e.target.checked)}
                      aria-label="SMS updates"
                      className="h-5 w-5"
                    />
                  </label>

                  <label htmlFor="pref-email-updates" className="flex items-center justify-between gap-4 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <span className="sr-only">Email updates</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Email updates</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">(Stored for future; email sending may not be enabled yet.)</div>
                    </div>
                    <input
                      id="pref-email-updates"
                      type="checkbox"
                      checked={emailEnabled}
                      onChange={(e) => setEmailEnabled(e.target.checked)}
                      aria-label="Email updates"
                      className="h-5 w-5"
                    />
                  </label>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Theme</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Pick a theme for the whole app.</div>

                <div className="mt-4 grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="profile-theme" className="text-xs text-gray-500 dark:text-gray-400">Theme</label>
                    <select
                      id="profile-theme"
                      value={themeId}
                      onChange={(e) => applyThemeSelection(e.target.value)}
                      className="w-full border dark:border-gray-700 p-3 rounded-xl mt-1 bg-white dark:bg-gray-900 dark:text-gray-100"
                    >
                      {THEMES.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">Theme is saved locally and to your profile.</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Quick pick</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {THEMES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => applyThemeSelection(t.id)}
                          className={`text-xs px-3 py-2 rounded-xl border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 ${themeId === t.id ? "border-[rgb(var(--app-accent))] text-[rgb(var(--app-accent))]" : "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Security</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Change your password securely.</div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label htmlFor="profile-current-password" className="text-xs text-gray-500 dark:text-gray-400">Current password</label>
                    <input
                      id="profile-current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full border dark:border-gray-700 p-3 rounded-xl mt-1 bg-white dark:bg-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-new-password" className="text-xs text-gray-500 dark:text-gray-400">New password</label>
                    <input
                      id="profile-new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full border dark:border-gray-700 p-3 rounded-xl mt-1 bg-white dark:bg-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-confirm-password" className="text-xs text-gray-500 dark:text-gray-400">Confirm new password</label>
                    <input
                      id="profile-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full border dark:border-gray-700 p-3 rounded-xl mt-1 bg-white dark:bg-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={changePassword}
                      disabled={saving}
                      className="w-full bg-[rgb(var(--app-accent))] text-white px-4 py-3 rounded-xl hover:bg-[rgb(var(--app-accent-hover))] disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--app-accent)/0.45)]"
                    >
                      {saving ? "Working..." : "Change password"}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400 mt-3">Changing password logs out other sessions.</div>
              </div>
            </div>
          </div>

          {loading && (
            <div className="mt-6 text-sm text-gray-600 dark:text-gray-300">Loading…</div>
          )}
        </div>
      </div>
    </div>
  );
}