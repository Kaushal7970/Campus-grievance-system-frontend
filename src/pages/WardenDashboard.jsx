import Sidebar from "../components/Sidebar";
import { useCallback, useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import { getStoredUser } from "../services/storage";

export default function WardenDashboard() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [remarksMap, setRemarksMap] = useState({});
  const [priorityStats, setPriorityStats] = useState([]);
  const [statusStats, setStatusStats] = useState([]);

  const COLORS = ["#22c55e", "#facc15", "#ef4444"];
  const user = getStoredUser();
  const userEmail = user?.email || "";

  const load = useCallback(async () => {
    if (!userEmail) return;

    // Department-filtered dashboard: warden sees grievances for their department.
    const res = await API.get(`/grievance/department/mine`);
    setList(res.data);

    const priorityCount = {};
    const statusCount = {};

    res.data.forEach((g) => {
      const p = g.priority || "LOW";
      priorityCount[p] = (priorityCount[p] || 0) + 1;
      const s = g.status || "PENDING";
      statusCount[s] = (statusCount[s] || 0) + 1;
    });

    setPriorityStats(Object.keys(priorityCount).map((k) => ({ name: k, value: priorityCount[k] })));
    setStatusStats(Object.keys(statusCount).map((k) => ({ name: k, value: statusCount[k] })));
  }, [userEmail]);

  const updateStatus = async (id, status) => {
    const remarks = remarksMap[id] || "";
    await API.put(`/grievance/update-with-remarks/${id}?status=${status}&remarks=${remarks}`);
    load();
  };

  useEffect(() => {
    load();
  }, [load]);

  const filtered = filter === "ALL" ? list : list.filter((g) => g.priority === filter);

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-10 bg-gray-100 dark:bg-gray-900 min-h-screen">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">🏨 Warden Dashboard</h1>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 p-5 rounded shadow border border-gray-100 dark:border-gray-700">
            <h3 className="mb-2 font-semibold text-sm text-gray-900 dark:text-gray-100">Priority Distribution</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={priorityStats} dataKey="value" outerRadius={60}>
                  {priorityStats.map((e, i) => (
                    <Cell key={e?.name || i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white dark:bg-gray-800 p-5 rounded shadow border border-gray-100 dark:border-gray-700">
            <h3 className="mb-2 font-semibold text-sm text-gray-900 dark:text-gray-100">Status Overview</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={statusStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill={`rgb(var(--app-accent))`} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mb-6 flex justify-between items-center">
          <h2 className="font-semibold text-lg text-[rgb(var(--app-accent))]">Department Complaints</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border dark:border-gray-700 p-2 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>
        </div>

        <div className="grid gap-4">
          {filtered.map((g) => (
            <div
              key={g.id}
              className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center"
            >
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{g.title}</h3>
                <p className="text-gray-600 dark:text-gray-200 text-sm">{g.description}</p>

                <p className="text-xs text-gray-400 mt-2 font-medium">
                  👤 {g.anonymous ? (
                    <span className="italic text-gray-500">Anonymous User</span>
                  ) : (
                    g.studentEmail
                  )}
                </p>

                <div className="flex gap-2 mt-2">
                  <span
                    className={`text-xs px-2 py-1 rounded font-bold ${
                      g.priority === "HIGH" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    }`}
                  >
                    {g.priority}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded font-bold ${
                      g.status === "RESOLVED" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {g.status}
                  </span>
                </div>

                {g.remarks && (
                  <p className="text-sm text-gray-600 dark:text-gray-200 mt-2 italic bg-gray-50 dark:bg-gray-900 p-2 rounded">
                    💬 {g.remarks}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 min-w-[180px]">
                <button
                  onClick={() => navigate(`/grievance/${g.id}`)}
                  className="bg-white dark:bg-gray-900 border dark:border-gray-700 py-1 rounded text-xs hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  View
                </button>
                <textarea
                  placeholder="Enter remarks..."
                  value={remarksMap[g.id] || ""}
                  onChange={(e) => setRemarksMap({ ...remarksMap, [g.id]: e.target.value })}
                  className="border dark:border-gray-700 p-2 rounded text-xs h-16 bg-white dark:bg-gray-900 dark:text-gray-100"
                />
                <div className="flex gap-2">
                  {g.status === "PENDING" && (
                    <button
                      onClick={() => updateStatus(g.id, "IN_PROGRESS")}
                      className="flex-1 bg-[rgb(var(--app-accent))] text-white py-1 rounded text-xs hover:bg-[rgb(var(--app-accent-hover))]"
                    >
                      Start
                    </button>
                  )}
                  {g.status !== "RESOLVED" && (
                    <button
                      onClick={() => updateStatus(g.id, "RESOLVED")}
                      className="flex-1 bg-green-500 text-white py-1 rounded text-xs"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
