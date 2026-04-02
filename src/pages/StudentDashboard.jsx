import Sidebar from "../components/Sidebar";
import { useCallback, useEffect, useRef, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import AiChatbot from "../components/AiChatbot";
import { getStoredUser } from "../services/storage";

export default function StudentDashboard() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("LOW");
  const [category, setCategory] = useState("ADMINISTRATION");
  const [anonymous, setAnonymous] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);

  const [list, setList] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  const user = getStoredUser();
  const userEmail = user?.email || "";

  const load = useCallback(async () => {
    if (!userEmail) return;
    try {
      setError("");
      const res = await API.get(`/grievance/student/${userEmail}`);
      setList(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load grievances");
    }
  }, [userEmail]);

  useEffect(() => {
    load();
  }, [load]);

  const analyzeWithAi = async () => {
    const text = `${title}\n\n${description}`.trim();
    if (!text) {
      alert("Enter title/description first");
      return;
    }

    try {
      setAiLoading(true);
      setError("");
      const res = await API.post("/ai/chat", { message: text });
      setAiSuggestion(res.data);

      const suggestedCategory = String(res.data?.category || "").toUpperCase();
      if (["ACADEMIC", "HOSTEL", "INFRASTRUCTURE", "FACULTY_BEHAVIOR", "ADMINISTRATION"].includes(suggestedCategory)) {
        setCategory(suggestedCategory);
      }

      let suggestedPriority = String(res.data?.priority || "").toUpperCase();
      if (suggestedPriority === "CRITICAL") suggestedPriority = "HIGH";
      if (["LOW", "MEDIUM", "HIGH"].includes(suggestedPriority)) {
        setPriority(suggestedPriority);
      }
    } catch (e) {
      setError(e?.response?.data?.message || "AI suggestion failed");
    } finally {
      setAiLoading(false);
    }
  };

  const submit = async () => {
    if (!title.trim() || !description.trim()) {
      alert("Fill all fields");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const createRes = await API.post("/grievance/create", {
        title: title.trim(),
        description: description.trim(),
        priority: (priority || "LOW").toUpperCase(),
        category: (category || "ADMINISTRATION").toUpperCase(),
        anonymous
      });

      const grievanceId = createRes?.data?.id;
      if (grievanceId && attachments.length > 0) {
        const failed = [];
        for (const file of attachments) {
          try {
            const form = new FormData();
            form.append("file", file);
            await API.post(`/grievance/${grievanceId}/attachments`, form, {
              headers: { "Content-Type": "multipart/form-data" }
            });
          } catch {
            failed.push(file?.name || "(file)");
          }
        }

        if (failed.length > 0) {
          setError(`Complaint submitted, but failed to upload: ${failed.join(", ")}`);
        }
      }

      setTitle("");
      setDescription("");
      setPriority("LOW");
      setCategory("ADMINISTRATION");
      setAnonymous(false);
      setAiSuggestion(null);
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to submit grievance");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComplaint = async (id) => {
    if (!window.confirm("Delete complaint?")) return;
    await API.delete(`/grievance/delete/${id}`);
    load();
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-10 bg-gray-100 dark:bg-gray-900 min-h-screen">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">🎓 Student Dashboard</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 max-w-4xl">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mb-6 max-w-2xl border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-indigo-700">Submit Complaint</h2>

          <input
            className="w-full border dark:border-gray-700 p-3 mb-3 rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Issue Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full border dark:border-gray-700 p-3 mb-3 rounded-lg h-32 bg-white dark:bg-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Detailed Description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <button
            type="button"
            onClick={analyzeWithAi}
            disabled={aiLoading}
            className="w-full mb-3 bg-white border border-indigo-200 text-indigo-700 font-semibold py-3 rounded-lg hover:bg-indigo-50 transition-all disabled:opacity-60"
          >
            {aiLoading ? "Analyzing…" : "Analyze with AI"}
          </button>

          {aiSuggestion && (
            <div className="mb-4 p-4 rounded-xl border dark:border-gray-700 bg-indigo-50/50 dark:bg-gray-900">
              <div className="text-sm font-semibold text-indigo-800">AI Suggestion</div>
              <div className="text-sm text-gray-800 dark:text-gray-100 mt-1">{aiSuggestion.response}</div>
              <div className="text-xs text-gray-700 dark:text-gray-300 mt-2">
                Category: <span className="font-semibold">{aiSuggestion.category}</span> • Priority:{" "}
                <span className="font-semibold">{aiSuggestion.priority}</span>
              </div>
              {aiSuggestion.suggested_solution && (
                <div className="text-sm text-gray-800 dark:text-gray-100 mt-2">
                  <span className="font-semibold">Suggested:</span> {aiSuggestion.suggested_solution}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-4 mb-4">
            <select
              className="flex-1 border dark:border-gray-700 p-3 rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="LOW">🟢 LOW Priority</option>
              <option value="MEDIUM">🟡 MEDIUM Priority</option>
              <option value="HIGH">🔴 HIGH Priority</option>
            </select>

            <select
              className="flex-1 border dark:border-gray-700 p-3 rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="ACADEMIC">ACADEMIC</option>
              <option value="HOSTEL">HOSTEL</option>
              <option value="INFRASTRUCTURE">INFRASTRUCTURE</option>
              <option value="FACULTY_BEHAVIOR">FACULTY_BEHAVIOR</option>
              <option value="ADMINISTRATION">ADMINISTRATION</option>
            </select>
          </div>

          <div className="flex items-center gap-2 mb-4 px-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 py-3">
            <input
              id="anon"
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            <label htmlFor="anon" className="text-sm cursor-pointer select-none">
              Submit Anonymously 🔒
            </label>
          </div>

          <div className="mb-4">
            <label htmlFor="complaintAttachments" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Upload images/videos (optional)
            </label>
            <input
              id="complaintAttachments"
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="w-full border dark:border-gray-700 p-3 mt-2 rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100"
              onChange={(e) => setAttachments(Array.from(e.target.files || []))}
            />
            {attachments.length > 0 && (
              <div className="text-xs text-gray-600 dark:text-gray-300 mt-2">
                Selected: {attachments.length} file{attachments.length > 1 ? "s" : ""}
              </div>
            )}
          </div>

          <button
            onClick={submit}
            disabled={submitting}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 rounded-lg hover:shadow-xl transition-all disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit Now"}
          </button>
        </div>

        <AiChatbot />

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg max-w-4xl border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">My Recent Grievances</h2>
          {list.length === 0 && <p className="text-gray-500 dark:text-gray-400 italic">No complaints filed yet.</p>}
          <div className="grid gap-4">
            {list.map((g) => (
              <div key={g.id} className="bg-gray-50 dark:bg-gray-900 p-5 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate">{g.title}</h3>
                    <p className="text-gray-600 dark:text-gray-200 mt-1 break-words">{g.description}</p>
                    {g.complaintCode && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Code: {g.complaintCode}</p>}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className={`text-xs px-2 py-1 rounded font-bold ${g.priority === "HIGH" ? "bg-red-100 text-red-700" : g.priority === "MEDIUM" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                        {g.priority} Priority
                      </span>
                      <span className={`text-xs px-2 py-1 rounded font-bold ${g.status === "PENDING" ? "bg-yellow-100 text-yellow-700" : g.status === "RESOLVED" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                        {g.status}
                      </span>
                      {g.category && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold">{g.category}</span>}
                      {g.anonymous && <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded font-bold">🔒 Anonymous</span>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 items-end">
                    <button
                      onClick={() => navigate(`/grievance/${g.id}`)}
                      className="text-indigo-700 bg-white dark:bg-gray-800 border dark:border-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      View
                    </button>
                    {g.status === "PENDING" && (
                      <button
                        onClick={() => deleteComplaint(g.id)}
                        className="text-red-600 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900 px-3 py-2 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-gray-700"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}