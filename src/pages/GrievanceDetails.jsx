import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import API from "../services/api";
import { subscribeTopic } from "../services/realtime";

function badgeClass(value) {
  const v = String(value || "").toUpperCase();
  if (v === "HIGH") return "bg-red-100 text-red-700";
  if (v === "MEDIUM") return "bg-yellow-100 text-yellow-700";
  if (v === "LOW") return "bg-green-100 text-green-700";
  if (v === "RESOLVED" || v === "CLOSED") return "bg-green-100 text-green-700";
  if (v === "IN_PROGRESS" || v === "ASSIGNED") return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-700";
}

export default function GrievanceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);

  const isPrivileged = ["ADMIN", "SUPER_ADMIN", "HOD", "COMMITTEE", "FACULTY"].includes(
    String(user?.role || "").toUpperCase()
  );
  const canAssign = ["ADMIN", "SUPER_ADMIN", "HOD", "COMMITTEE"].includes(
    String(user?.role || "").toUpperCase()
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [grievance, setGrievance] = useState(null);
  const [history, setHistory] = useState([]);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);

  const [commentText, setCommentText] = useState("");
  const [commentInternal, setCommentInternal] = useState(false);

  const [chatText, setChatText] = useState("");

  const [status, setStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [facultyEmail, setFacultyEmail] = useState("");
  const [facultyOptions, setFacultyOptions] = useState([]);

  const loadAll = useCallback(async () => {
    if (!id) return;
    setError("");

    setLoading(true);
    try {
      const [gRes, hRes, cRes, aRes, chatRes] = await Promise.allSettled([
        API.get(`/grievance/${id}`),
        API.get(`/grievance/${id}/history`),
        API.get(`/grievance/${id}/comments`),
        API.get(`/grievance/${id}/attachments`),
        API.get(`/grievance/${id}/chat`)
      ]);

      if (gRes.status === "fulfilled") {
        setGrievance(gRes.value.data);
        setStatus(gRes.value.data?.status || "");
        setRemarks("");
        setFacultyEmail(gRes.value.data?.assignedTo || "");
      } else {
        setGrievance(null);
        setError(gRes.reason?.response?.data?.message || "Failed to load grievance details");
        return;
      }

      if (hRes.status === "fulfilled") setHistory(hRes.value.data || []);
      if (cRes.status === "fulfilled") setComments(cRes.value.data || []);
      if (aRes.status === "fulfilled") setAttachments(aRes.value.data || []);
      if (chatRes.status === "fulfilled") setChatMessages(chatRes.value.data || []);

      if (canAssign) {
        try {
          const faculties = await API.get("/users/faculty");
          setFacultyOptions(faculties.data || []);
        } catch {
          setFacultyOptions([]);
        }
      } else {
        setFacultyOptions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [id, canAssign]);

  const loadChat = useCallback(async () => {
    if (!id) return;
    try {
      const res = await API.get(`/grievance/${id}/chat`);
      setChatMessages(res.data || []);
    } catch {
      // ignore chat refresh errors; main page can still function.
    }
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!id) return;

    let unsubscribe = null;
    let cancelled = false;

    (async () => {
      try {
        unsubscribe = await subscribeTopic(`/topic/grievance/${id}`, () => {
          if (!cancelled) loadAll();
        });
      } catch {
        // If realtime fails, the page still works via manual refresh.
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [id, loadAll]);

  useEffect(() => {
    if (!id) return;

    let unsubscribe = null;
    let cancelled = false;

    (async () => {
      try {
        unsubscribe = await subscribeTopic(`/topic/grievance/${id}/chat`, () => {
          if (!cancelled) loadChat();
        });
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [id, loadChat]);

  const addComment = async () => {
    if (!commentText.trim()) return;

    await API.post(`/grievance/${id}/comments`, {
      message: commentText.trim(),
      internalOnly: isPrivileged ? commentInternal : false
    });

    setCommentText("");
    setCommentInternal(false);
    loadAll();
  };

  const sendChat = async () => {
    if (!chatText.trim()) return;

    await API.post(`/grievance/${id}/chat`, {
      message: chatText.trim()
    });

    setChatText("");
    loadChat();
  };

  const uploadAttachment = async (file) => {
    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    await API.post(`/grievance/${id}/attachments`, form, {
      headers: { "Content-Type": "multipart/form-data" }
    });

    loadAll();
  };

  const downloadAttachment = async (attachmentId, originalName) => {
    const res = await API.get(`/grievance/attachments/${attachmentId}/download`, {
      responseType: "blob"
    });

    const url = URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", originalName || `attachment-${attachmentId}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const updateStatus = async () => {
    if (!status) return;
    const encoded = encodeURIComponent(remarks || "");
    await API.put(`/grievance/update-with-remarks/${id}?status=${encodeURIComponent(status)}&remarks=${encoded}`);
    setRemarks("");
    loadAll();
  };

  const assignFaculty = async () => {
    if (!facultyEmail) return;
    await API.put(`/grievance/assign/${id}?facultyEmail=${encodeURIComponent(facultyEmail)}`);
    loadAll();
  };

  const statusOptions = [
    "SUBMITTED",
    "UNDER_REVIEW",
    "ASSIGNED",
    "IN_PROGRESS",
    "RESOLVED",
    "CLOSED",
    "REOPENED",
    "PENDING",
    "ESCALATED_FACULTY",
    "ESCALATED_HOD",
    "ESCALATED_PRINCIPAL",
    "ESCALATED_ADMIN"
  ];

  const mainContent = (() => {
    if (loading) {
      return <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow text-gray-900 dark:text-gray-100">Loading…</div>;
    }
    if (!grievance) {
      return <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow text-gray-900 dark:text-gray-100">Not found.</div>;
    }

    return (
      <>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow mb-6 border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {grievance.complaintCode ? `Code: ${grievance.complaintCode}` : `ID: ${grievance.id}`}
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{grievance.title}</h2>
              <p className="text-gray-700 dark:text-gray-200 mt-2 whitespace-pre-wrap">{grievance.description}</p>

              <div className="flex flex-wrap gap-2 mt-4">
                <span className={`text-xs px-2 py-1 rounded font-bold ${badgeClass(grievance.priority)}`}>
                  {String(grievance.priority || "").toUpperCase()}
                </span>
                <span className={`text-xs px-2 py-1 rounded font-bold ${badgeClass(grievance.status)}`}>
                  {String(grievance.status || "").toUpperCase()}
                </span>
                {grievance.category && (
                  <span className="text-xs px-2 py-1 rounded font-bold bg-[rgb(var(--app-accent)/0.12)] text-[rgb(var(--app-accent))] dark:bg-[rgb(var(--app-accent)/0.18)]">
                    {String(grievance.category).toUpperCase()}
                  </span>
                )}
                {grievance.anonymous && (
                  <span className="text-xs px-2 py-1 rounded font-bold bg-gray-100 text-gray-700">🔒 Anonymous</span>
                )}
                {grievance.assignedTo && (
                  <span className="text-xs px-2 py-1 rounded font-bold bg-blue-50 text-blue-700">
                    Assigned: {grievance.assignedTo}
                  </span>
                )}
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                {grievance.studentEmail ? `Student: ${grievance.studentEmail}` : "Student: (hidden)"}
              </div>
            </div>

            {isPrivileged && (
              <div className="w-full md:w-96 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-2xl p-4">
                <div className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-3">Actions</div>

                <label htmlFor="statusSelect" className="text-xs text-gray-500 dark:text-gray-400">Update status</label>
                <select
                  id="statusSelect"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border p-2 rounded-lg mt-1 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <label htmlFor="remarksText" className="text-xs text-gray-500 dark:text-gray-400 mt-3 block">Remarks (optional)</label>
                <textarea
                  id="remarksText"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full border p-2 rounded-lg mt-1 h-20 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                  placeholder="Add remarks for the student/faculty…"
                />

                <button
                  onClick={updateStatus}
                  className="w-full mt-3 bg-[rgb(var(--app-accent))] text-white py-2 rounded-lg hover:bg-[rgb(var(--app-accent-hover))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--app-accent)/0.45)]"
                >
                  Save
                </button>

                {canAssign && (
                  <>
                    <label htmlFor="assignFaculty" className="text-xs text-gray-500 mt-4 block">Assign faculty</label>
                    <select
                      id="assignFaculty"
                      value={facultyEmail}
                      onChange={(e) => setFacultyEmail(e.target.value)}
                      className="w-full border p-2 rounded-lg mt-1 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                    >
                      <option value="">Select faculty</option>
                      {facultyOptions.map((f) => (
                        <option key={f.id} value={f.email}>{f.email}</option>
                      ))}
                    </select>
                    <button
                      onClick={assignFaculty}
                      className="w-full mt-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                    >
                      Assign
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Status History</h3>
            {history.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 italic">No history yet.</div>
            ) : (
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h.id || `${h.changedAt}-${h.toStatus}`} className="border dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {h.fromStatus ? `${h.fromStatus} → ` : ""}{h.toStatus}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{h.changedAt ? new Date(h.changedAt).toLocaleString() : ""}</div>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">By: {h.changedByEmail || "SYSTEM"}</div>
                    {h.note && <div className="text-sm text-gray-700 dark:text-gray-200 mt-2">{h.note}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Attachments</h3>

            <label htmlFor="uploadFile" className="text-xs text-gray-500">Upload file</label>
            <input
              id="uploadFile"
              type="file"
              className="w-full border rounded-lg p-2 mt-1 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
              onChange={(e) => uploadAttachment(e.target.files?.[0])}
            />

            <div className="mt-4 space-y-2">
              {attachments.length === 0 ? (
                <div className="text-gray-500 dark:text-gray-400 italic">No attachments.</div>
              ) : (
                attachments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between border dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.originalFileName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {a.uploadedAt ? new Date(a.uploadedAt).toLocaleString() : ""}
                        {a.uploadedByEmail ? ` • ${a.uploadedByEmail}` : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => downloadAttachment(a.id, a.originalFileName)}
                      className="text-sm bg-white dark:bg-gray-800 border dark:border-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      Download
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow mt-6 border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Live Chat</h3>

          <div className="space-y-2 max-h-72 overflow-auto pr-1">
            {chatMessages.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 italic">No messages yet.</div>
            ) : (
              chatMessages.map((m) => {
                const mine = String(m.senderEmail || "").toLowerCase() === String(user?.email || "").toLowerCase();
                return (
                  <div
                    key={m.id || `${m.createdAt}-${m.senderEmail}`}
                    className={`border dark:border-gray-700 rounded-2xl p-3 ${mine ? "bg-[rgb(var(--app-accent)/0.10)] dark:bg-[rgb(var(--app-accent)/0.18)]" : "bg-gray-50 dark:bg-gray-900"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {m.senderEmail || "UNKNOWN"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
                      </div>
                    </div>
                    <div className="text-gray-800 dark:text-gray-200 mt-2 whitespace-pre-wrap break-words">
                      {m.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 border-t dark:border-gray-700 pt-4">
            <label htmlFor="chatText" className="text-sm font-semibold text-gray-900 dark:text-gray-100">Send message</label>
            <textarea
              id="chatText"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              className="w-full border p-3 rounded-xl mt-2 h-24 bg-white dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
              placeholder="Write your message…"
            />
            <button
              onClick={sendChat}
              className="mt-3 bg-[rgb(var(--app-accent))] text-white px-4 py-2 rounded-lg hover:bg-[rgb(var(--app-accent-hover))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--app-accent)/0.45)]"
            >
              Send
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow mt-6 border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Comments</h3>

          <div className="space-y-3">
            {comments.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 italic">No comments yet.</div>
            ) : (
              comments.map((c) => (
                <div key={c.id || `${c.createdAt}-${c.authorEmail}`} className="border dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{c.authorEmail || "UNKNOWN"}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}</div>
                  </div>
                  <div className="text-gray-800 dark:text-gray-200 mt-2 whitespace-pre-wrap">{c.message}</div>
                  {c.internalOnly && (
                    <div className="text-xs mt-2 text-[rgb(var(--app-accent))] font-semibold">Internal</div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="mt-4 border-t pt-4">
            <label htmlFor="commentText" className="text-sm font-semibold text-gray-900 dark:text-gray-100">Add comment</label>
            <textarea
              id="commentText"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full border p-3 rounded-xl mt-2 h-24 bg-white dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
              placeholder="Write your message…"
            />

            {isPrivileged && (
              <label className="flex items-center gap-2 text-sm mt-2">
                <input
                  type="checkbox"
                  checked={commentInternal}
                  onChange={(e) => setCommentInternal(e.target.checked)}
                />
                Internal only (faculty/admin)
              </label>
            )}

            <button
              onClick={addComment}
              className="mt-3 bg-[rgb(var(--app-accent))] text-white px-4 py-2 rounded-lg hover:bg-[rgb(var(--app-accent-hover))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--app-accent)/0.45)]"
            >
              Post
            </button>
          </div>
        </div>
      </>
    );
  })();

  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1 p-8 bg-gray-100 dark:bg-gray-900 min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="text-sm text-[rgb(var(--app-accent))] hover:underline"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold mt-2 text-gray-900 dark:text-gray-100">Grievance Details</h1>
          </div>
          <button
            onClick={loadAll}
            className="text-sm bg-white dark:bg-gray-800 border dark:border-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        {mainContent}
      </div>
    </div>
  );
}
