import Sidebar from "../components/Sidebar";
import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import AiChatbot from "../components/AiChatbot";
import { getStoredUser } from "../services/storage";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";

export default function AdminDashboard({ dashboardTitle = "Admin" }) {
  const navigate = useNavigate();
  const currentRole = String(getStoredUser()?.role || "").toUpperCase();
  const canManageUsers = ["SUPER_ADMIN", "ADMIN"].includes(currentRole);
  const canDeleteUsers = canManageUsers;

  const [list, setList] = useState([]);
  const [stats, setStats] = useState([]);
  const [users, setUsers] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [assignedFilter, setAssignedFilter] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [remarksMap, setRemarksMap] = useState({});

  const [aiRulesText, setAiRulesText] = useState("");
  const [aiRulesLoading, setAiRulesLoading] = useState(false);
  const [aiRulesSaving, setAiRulesSaving] = useState(false);
  const [aiRulesError, setAiRulesError] = useState("");
  const [aiRulesSavedAt, setAiRulesSavedAt] = useState("");

  const COLORS = ["#facc15", "#22c55e", "#ef4444"];

  const load = useCallback(async () => {
    const res = await API.get("/grievance/all");
    setList(res.data);
    const counts = {};
    res.data.forEach((g) => {
      counts[g.status] = (counts[g.status] || 0) + 1;
    });
    setStats(Object.keys(counts).map((k) => ({ name: k, value: counts[k] })));
  }, []);

  const loadUsers = useCallback(async () => {
    if (!canManageUsers) return;
    const res = await API.get("/users");
    setUsers(res.data);
  }, [canManageUsers]);

  const loadAiRules = useCallback(async () => {
    if (!canManageUsers) return;
    try {
      setAiRulesLoading(true);
      setAiRulesError("");
      const res = await API.get("/admin/ai-rules");
      setAiRulesText(String(res?.data?.rules || ""));
      setAiRulesSavedAt(String(res?.data?.updatedAt || ""));
    } catch (e) {
      setAiRulesError(e?.response?.data?.message || e?.message || "Failed to load AI rules");
    } finally {
      setAiRulesLoading(false);
    }
  }, [canManageUsers]);

  const saveAiRules = async () => {
    if (!canManageUsers) return;
    try {
      setAiRulesSaving(true);
      setAiRulesError("");
      const res = await API.put("/admin/ai-rules", { rules: aiRulesText || "" });
      setAiRulesText(String(res?.data?.rules || ""));
      setAiRulesSavedAt(String(res?.data?.updatedAt || ""));
      alert("AI rules saved ✅");
    } catch (e) {
      setAiRulesError(e?.response?.data?.message || e?.message || "Failed to save AI rules");
    } finally {
      setAiRulesSaving(false);
    }
  };

  const resolve = async (id) => {
    const remarks = remarksMap[id] || "";
    await API.put(`/grievance/update-with-remarks/${id}?status=RESOLVED&remarks=${remarks}`);
    load();
  };

  const startWork = async (id) => {
    const remarks = remarksMap[id] || "";
    await API.put(`/grievance/update-with-remarks/${id}?status=IN_PROGRESS&remarks=${remarks}`);
    load();
  };

  const deleteComplaint = async (id) => {
    try {
      await API.delete(`/grievance/delete/${id}`);
      load();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to delete complaint";
      alert(msg);
    }
  };

  const assign = async (id, email) => {
    if (!email) return;
    await API.put(`/grievance/assign/${id}?facultyEmail=${email}`);
    load();
  };

  const changeRole = async (id, role) => {
    if (!canManageUsers) return;
    await API.put(`/users/${id}/role?role=${role}`);
    loadUsers();
  };

  const deleteUser = async (id) => {
    if (!canDeleteUsers) return;
    try {
      await API.delete(`/users/${id}`);
      loadUsers();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to delete user";
      alert(msg);
    }
  };

  useEffect(() => {
    load();
    if (canManageUsers) {
      loadUsers();
      loadAiRules();
    }
  }, [canManageUsers, load, loadUsers, loadAiRules]);

  const availableCategories = useMemo(() => {
    const set = new Set();
    (list || []).forEach((g) => {
      if (g?.category) set.add(String(g.category).toUpperCase());
    });
    return Array.from(set).sort();
  }, [list]);

  const availableAssignees = useMemo(() => {
    const set = new Set();
    (list || []).forEach((g) => {
      if (g?.assignedTo) set.add(String(g.assignedTo));
    });
    return Array.from(set).sort();
  }, [list]);

  const filteredList = useMemo(() => {
    const q = String(searchText || "").trim().toLowerCase();

    return (list || []).filter((g) => {
      const priorityOk =
        priorityFilter === "ALL" || String(g?.priority || "").toUpperCase() === priorityFilter;
      const statusOk =
        statusFilter === "ALL" || String(g?.status || "").toUpperCase() === statusFilter;
      const categoryOk =
        categoryFilter === "ALL" || String(g?.category || "").toUpperCase() === categoryFilter;
      const assignedOk =
        assignedFilter === "ALL" || String(g?.assignedTo || "") === assignedFilter;

      if (!priorityOk || !statusOk || !categoryOk || !assignedOk) return false;

      if (!q) return true;

      const haystack = [
        g?.complaintCode,
        g?.title,
        g?.description,
        g?.studentEmail,
        g?.assignedTo,
        g?.status,
        g?.priority,
        g?.category
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase())
        .join(" | ");

      return haystack.includes(q);
    });
  }, [list, priorityFilter, statusFilter, categoryFilter, assignedFilter, searchText]);

  const exportCsv = () => {
    const rows = filteredList || [];

    const escapeCsv = (value) => {
      const s = String(value ?? "");
      if (/[\n\r,"]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const header = [
      "ComplaintCode",
      "Title",
      "Description",
      "Status",
      "Priority",
      "Category",
      "Anonymous",
      "StudentEmail",
      "AssignedTo",
      "CreatedAt"
    ];

    const csv = [
      header.join(","),
      ...rows.map((g) => [
        escapeCsv(g?.complaintCode),
        escapeCsv(g?.title),
        escapeCsv(g?.description),
        escapeCsv(g?.status),
        escapeCsv(g?.priority),
        escapeCsv(g?.category),
        escapeCsv(Boolean(g?.anonymous)),
        escapeCsv(g?.studentEmail),
        escapeCsv(g?.assignedTo),
        escapeCsv(g?.createdAt)
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `complaints_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    const rows = filteredList || [];

    const jspdfModule = await import("jspdf");
    const JsPDF = jspdfModule.jsPDF || jspdfModule.default;
    const autotableModule = await import("jspdf-autotable");
    const autoTable = autotableModule.default || autotableModule;

    const doc = new JsPDF({ orientation: "landscape" });

    doc.setFontSize(14);
    doc.text("Complaints Export", 14, 14);

    doc.setFontSize(10);
    const subtitle = `Generated: ${new Date().toLocaleString()} • Rows: ${rows.length}`;
    doc.text(subtitle, 14, 20);

    autoTable(doc, {
      startY: 26,
      head: [["Code", "Title", "Status", "Priority", "Category", "Assigned", "Student"]],
      body: rows.map((g) => [
        g?.complaintCode || g?.id,
        String(g?.title || "").slice(0, 60),
        g?.status,
        g?.priority,
        g?.category,
        g?.assignedTo || "",
        g?.anonymous ? "Anonymous" : (g?.studentEmail || "")
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [99, 102, 241] }
    });

    doc.save(`complaints_export_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const total = list.length;
  const pending = list.filter((g) => g.status === "PENDING").length;
  const resolvedCount = list.filter((g) => g.status === "RESOLVED").length;

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-10 bg-gray-100 dark:bg-gray-900 min-h-screen">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">📊 {dashboardTitle} Dashboard</h1>

        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-500 text-white p-6 rounded-2xl shadow-lg"><h3>Total</h3><p className="text-3xl font-bold">{total}</p></div>
          <div className="bg-yellow-500 text-white p-6 rounded-2xl shadow-lg"><h3>Pending</h3><p className="text-3xl font-bold">{pending}</p></div>
          <div className="bg-green-500 text-white p-6 rounded-2xl shadow-lg"><h3>Resolved</h3><p className="text-3xl font-bold">{resolvedCount}</p></div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 p-5 rounded shadow border border-gray-100 dark:border-gray-700"><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={stats} dataKey="value" outerRadius={80}>{stats.map((e, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
          <div className="bg-white dark:bg-gray-800 p-5 rounded shadow border border-gray-100 dark:border-gray-700"><ResponsiveContainer width="100%" height={220}><BarChart data={stats}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#6366f1" /></BarChart></ResponsiveContainer></div>
        </div>

        {canManageUsers && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded shadow mb-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">🤖 AI Rules (Admin Control)</h2>
                <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  These rules are injected into the chatbot prompt and take priority.
                  {aiRulesSavedAt ? ` Last updated: ${aiRulesSavedAt}` : ""}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={loadAiRules}
                  disabled={aiRulesLoading || aiRulesSaving}
                  className="text-xs bg-white dark:bg-gray-900 border dark:border-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                >
                  {aiRulesLoading ? "Loading…" : "Reload"}
                </button>
                <button
                  type="button"
                  onClick={saveAiRules}
                  disabled={aiRulesSaving}
                  className="text-xs bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                >
                  {aiRulesSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            {aiRulesError && (
              <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-xl">
                {aiRulesError}
              </div>
            )}

            <textarea
              value={aiRulesText}
              onChange={(e) => setAiRulesText(e.target.value)}
              placeholder="Example: Always answer in Hindi. Mention escalation timeline 2/4/7/10 days. Provide helpdesk email."
              className="w-full min-h-[140px] border dark:border-gray-700 p-3 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
        )}

        <AiChatbot />

        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow mb-6 border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Complaints</h2>
              <div className="flex gap-2">
                <button
                  onClick={exportCsv}
                  className="text-xs bg-white dark:bg-gray-900 border dark:border-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  Export CSV
                </button>
                <button
                  onClick={exportPdf}
                  className="text-xs bg-white dark:bg-gray-900 border dark:border-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  Export PDF
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-5 gap-2">
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search title/description/code/email…"
                className="border px-3 py-2 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 md:col-span-2"
              />

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="border px-2 py-2 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
              >
                <option value="ALL">All Priority</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border px-2 py-2 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
              >
                <option value="ALL">All Status</option>
                {Array.from(new Set((list || []).map((g) => String(g?.status || "").toUpperCase()).filter(Boolean))).sort().map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border px-2 py-2 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
              >
                <option value="ALL">All Category</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={assignedFilter}
                onChange={(e) => setAssignedFilter(e.target.value)}
                className="border px-2 py-2 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
              >
                <option value="ALL">All Assignees</option>
                {availableAssignees.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredList.map((g) => (
            <div key={g.id} className="border dark:border-gray-700 p-4 mb-3 rounded-xl flex justify-between items-center bg-gray-50 dark:bg-gray-900 hover:bg-white dark:hover:bg-gray-800 transition-all">
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{g.title}</h3>
                <p className="text-gray-600 dark:text-gray-200 text-sm mt-1">{g.description}</p>
                
                {/* 🔥 EMAIL HIDE LOGIC */}
                <p className="text-xs text-gray-400 dark:text-gray-400 mt-2 font-medium">
                  👤 {g.anonymous ? <span className="italic text-gray-500">Anonymous User</span> : g.studentEmail}
                </p>

                <div className="flex gap-2 mt-2">
                  <span className={`text-xs px-2 py-1 rounded ${g.status === "RESOLVED" ? "bg-green-100 text-green-700" : g.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>{g.status}</span>
                  <span className={`text-xs px-2 py-1 rounded ${g.priority === "HIGH" ? "bg-red-100 text-red-700" : g.priority === "MEDIUM" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>{g.priority}</span>
                  {g.assignedTo && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">👨‍🏫 {g.assignedTo}</span>}
                </div>
                {g.remarks && <p className="text-sm text-gray-600 mt-2 italic">💬 {g.remarks}</p>}
              </div>

              <div className="flex flex-col gap-2 min-w-[200px]">
                <button
                  onClick={() => navigate(`/grievance/${g.id}`)}
                  className="bg-white dark:bg-gray-800 border dark:border-gray-700 py-2 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  View
                </button>
                <textarea placeholder="Remarks..." value={remarksMap[g.id] || ""} onChange={(e) => setRemarksMap({...remarksMap, [g.id]: e.target.value})} className="border dark:border-gray-700 p-2 rounded-lg text-xs bg-white dark:bg-gray-800 dark:text-gray-100" />
                <select value={g.assignedTo || ""} onChange={(e) => assign(g.id, e.target.value)} className="border dark:border-gray-700 px-2 py-1 rounded-lg text-xs bg-white dark:bg-gray-800 dark:text-gray-100">
                  <option value="">Assign Faculty</option>
                  {users.filter(u => u.role === "FACULTY").map(f => (<option key={f.id} value={f.email}>{f.email}</option>))}
                </select>
                <div className="flex gap-1">
                  {g.status === "PENDING" && <button onClick={() => startWork(g.id)} className="flex-1 bg-blue-500 text-white py-1 rounded text-xs hover:bg-blue-600">Start</button>}
                  {g.status !== "RESOLVED" && <button onClick={() => resolve(g.id)} className="flex-1 bg-green-500 text-white py-1 rounded text-xs hover:bg-green-600">Resolve</button>}
                  <button onClick={() => deleteComplaint(g.id)} className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>

    {/* 🔥 USERS MANAGEMENT (SUPER_ADMIN / ADMIN ONLY) */}
    {canManageUsers && (
      <div className="bg-white p-6 rounded shadow">
        <h2 className="font-semibold mb-4 text-lg">👥 User Management</h2>

        {users.map((u) => (
          <div
            key={u.id}
            className="flex justify-between items-center mb-3 p-3 border rounded-lg bg-gray-50"
          >
            <div>
              <p className="font-medium">{u.email}</p>
              <p className="text-xs text-gray-500">{u.role}</p>
            </div>

            <div className="flex gap-2 items-center">
              {/* 🔥 ROLE CHANGE */}
              <select
                value={u.role}
                onChange={(e) => changeRole(u.id, e.target.value)}
                className="border px-2 py-1 rounded text-sm"
              >
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                <option value="ADMIN">ADMIN</option>
                <option value="PRINCIPAL">PRINCIPAL</option>
                <option value="HOD">HOD</option>
                <option value="COMMITTEE">COMMITTEE</option>
                <option value="FACULTY">FACULTY</option>
                <option value="STUDENT">STUDENT</option>
              </select>

              {/* 🔥 DELETE (SUPER_ADMIN ONLY) */}
              {canDeleteUsers && !["ADMIN", "SUPER_ADMIN"].includes(String(u.role || "").toUpperCase()) && u.id !== getStoredUser()?.id && (
                <button
                  onClick={() => deleteUser(u.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
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
  );
}