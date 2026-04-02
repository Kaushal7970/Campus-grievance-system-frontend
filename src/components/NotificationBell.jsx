import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../services/api";
import { subscribeTopic } from "../services/realtime";

export default function NotificationBell() {
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);

  const email = String(user?.email || "").trim();

  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    if (!email) return;
    try {
      const [countRes, listRes] = await Promise.all([
        API.get("/notifications/unread-count"),
        API.get("/notifications")
      ]);

      setUnread(Number(countRes.data?.count || 0));
      setItems(listRes.data || []);
    } catch {
      // Ignore notification failures; do not break navigation.
    }
  }, [email]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!email) return;

    let unsubscribe = null;
    let cancelled = false;

    (async () => {
      try {
        unsubscribe = await subscribeTopic(`/topic/notifications/${encodeURIComponent(email)}`, () => {
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
  }, [email, load]);

  const markRead = async (id) => {
    if (!id) return;
    try {
      await API.put(`/notifications/${id}/read`);
      load();
    } catch {
      // ignore
    }
  };

  const top = items.slice(0, 6);

  if (!email) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative bg-white/10 hover:bg-white/20 p-2 rounded-xl transition"
        title="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white text-gray-900 rounded-2xl shadow-xl border overflow-hidden z-[9999]">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="font-semibold text-sm">Notifications</div>
            <button
              type="button"
              onClick={() => {
                load();
              }}
              className="text-xs text-indigo-700 hover:underline"
            >
              Refresh
            </button>
          </div>

          <div className="max-h-96 overflow-auto">
            {top.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No notifications.</div>
            ) : (
              top.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markRead(n.id)}
                  className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {n.type || "INFO"}
                        {n.readAt ? "" : " • New"}
                      </div>
                      <div className="text-sm text-gray-800 mt-1 break-words">
                        {n.message}
                      </div>
                      {n.createdAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(n.createdAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                    {!n.readAt && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full font-bold">
                        UNREAD
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="p-3 bg-gray-50 text-xs text-gray-600">
            Tip: click a notification to mark read.
          </div>
        </div>
      )}
    </div>
  );
}
