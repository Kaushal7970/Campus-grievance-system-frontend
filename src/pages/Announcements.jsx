import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import API from "../services/api";
import { subscribeTopic } from "../services/realtime";

export default function Announcements() {
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);

  const role = String(user?.role || "").toUpperCase();
  const canManageAnnouncements = ["ADMIN", "SUPER_ADMIN", "HOD", "PRINCIPAL", "COMMITTEE"].includes(role);

  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audienceRole, setAudienceRole] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await API.get("/announcements");
      setItems(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load announcements");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let unsubscribe = null;
    let cancelled = false;

    (async () => {
      try {
        unsubscribe = await subscribeTopic("/topic/announcements", () => {
          if (!cancelled) load();
        });
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [load]);

  const create = async () => {
    if (!title.trim() || !message.trim()) return;

    try {
      await API.post("/announcements", {
        title: title.trim(),
        message: message.trim(),
        audienceRole: audienceRole || null
      });
      setTitle("");
      setMessage("");
      setAudienceRole("");
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create announcement");
    }
  };

  const remove = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete announcement?")) return;

    try {
      await API.delete(`/announcements/${id}`);
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to delete announcement");
    }
  };

  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1 p-10 bg-gray-100 dark:bg-gray-900 min-h-screen">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">📢 Announcements</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 max-w-3xl">
            {error}
          </div>
        )}

        {canManageAnnouncements && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow mb-6 max-w-3xl border border-gray-100 dark:border-gray-700">
            <div className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-4">Create Announcement</div>

            <label htmlFor="announcementTitle" className="text-xs text-gray-500 dark:text-gray-400">Title</label>
            <input
              id="announcementTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border p-3 rounded-xl mt-1 bg-white dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
              placeholder="e.g., Mid-sem exam schedule"
            />

            <label htmlFor="announcementMessage" className="text-xs text-gray-500 dark:text-gray-400 mt-4 block">Message</label>
            <textarea
              id="announcementMessage"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border p-3 rounded-xl mt-1 h-28 bg-white dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
              placeholder="Write announcement..."
            />

            <label htmlFor="announcementAudience" className="text-xs text-gray-500 dark:text-gray-400 mt-4 block">Audience (optional)</label>
            <select
              id="announcementAudience"
              value={audienceRole}
              onChange={(e) => setAudienceRole(e.target.value)}
              className="w-full border p-3 rounded-xl mt-1 bg-white dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
            >
              <option value="">All</option>
              <option value="STUDENT">STUDENT</option>
              <option value="FACULTY">FACULTY</option>
              <option value="HOD">HOD</option>
              <option value="PRINCIPAL">PRINCIPAL</option>
              <option value="COMMITTEE">COMMITTEE</option>
              <option value="ADMIN">ADMIN</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </select>

            <button
              onClick={create}
              className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700"
            >
              Publish
            </button>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow max-w-4xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Latest</h2>
            <button
              onClick={load}
              className="text-sm bg-white dark:bg-gray-900 border dark:border-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-100"
            >
              Refresh
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400 italic">No announcements.</div>
          ) : (
            <div className="space-y-4">
              {items.map((a) => (
                <div key={a.id} className="border rounded-2xl p-4 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100 break-words">{a.title}</div>
                      <div className="text-sm text-gray-700 dark:text-gray-200 mt-2 whitespace-pre-wrap break-words">{a.message}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                        {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                        {a.createdByEmail ? ` • ${a.createdByEmail}` : ""}
                        {a.audienceRole ? ` • Audience: ${a.audienceRole}` : ""}
                      </div>
                    </div>

                    {canManageAnnouncements && (
                      <button
                        onClick={() => remove(a.id)}
                        className="text-sm bg-white dark:bg-gray-900 border dark:border-gray-700 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-gray-800 text-red-600"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
