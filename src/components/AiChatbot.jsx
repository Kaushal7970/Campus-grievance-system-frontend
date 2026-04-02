import { useEffect, useRef, useState } from "react";
import API from "../services/api";

export default function AiChatbot() {
  const nextIdRef = useRef(1);
  const makeMessage = (role, text) => ({
    id: nextIdRef.current++,
    role,
    text
  });

  const [open, setOpen] = useState(false);

  const [messages, setMessages] = useState([
    makeMessage(
      "bot",
      "Hi! I’m your campus assistant. Ask me anything about grievances, process, or next steps."
    )
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [aiEnabled, setAiEnabled] = useState(null);

  const listRef = useRef(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await API.get("/ai/status");
        setAiEnabled(Boolean(res?.data?.enabled));
      } catch {
        // Status is best-effort; ignore failures.
        setAiEnabled(null);
      }
    };

    fetchStatus();
  }, []);

  useEffect(() => {
    if (!listRef.current) return;
    // Scroll to bottom (no smooth animation).
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setError("");
    setInput("");

    setMessages((prev) => [...prev, makeMessage("user", text)]);

    try {
      setSending(true);
      const res = await API.post("/ai/bot", { message: text });
      const reply = res?.data?.reply || "I couldn't generate a reply right now.";
      setMessages((prev) => [...prev, makeMessage("bot", reply)]);
    } catch (e) {
      const msg = e?.response?.data?.message || "AI chat failed";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        makeMessage("bot", "Sorry — I couldn't respond. Please try again.")
      ]);
    } finally {
      setSending(false);
    }
  };

  const clear = () => {
    nextIdRef.current = 1;
    setError("");
    setInput("");
    setMessages([
      makeMessage(
        "bot",
        "Hi! I’m your campus assistant. Ask me anything about grievances, process, or next steps."
      )
    ]);
  };

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close AI chatbot" : "Open AI chatbot"}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center hover:bg-indigo-700"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6"
        >
          <path
            d="M4 5.5C4 4.12 5.12 3 6.5 3h11C18.88 3 20 4.12 20 5.5v8c0 1.38-1.12 2.5-2.5 2.5H10l-4 4v-4H6.5C5.12 16 4 14.88 4 13.5v-8Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M8 7.75h8M8 11h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-xl border">
          <div className="p-4 border-b flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-indigo-700">AI Chatbot</div>
              {aiEnabled === false && (
                <div className="text-xs text-gray-600 mt-1">
                  AI is not configured on the server (missing `OPENAI_API_KEY`).
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clear}
                className="text-xs border px-3 py-2 rounded-lg bg-white hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="text-xs border px-3 py-2 rounded-lg bg-white hover:bg-gray-50"
              >
                ✕
              </button>
            </div>
          </div>

          <div ref={listRef} className="p-3 h-56 overflow-y-auto bg-gray-50">
            <div className="space-y-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[85%] bg-indigo-600 text-white px-3 py-2 rounded-xl text-sm"
                        : "max-w-[85%] bg-white border px-3 py-2 rounded-xl text-sm text-gray-800"
                    }
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mx-3 mt-3 text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="p-3 border-t flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Type a message…"
              className="flex-1 border p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400"
              disabled={sending}
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || !input.trim()}
              className="bg-indigo-600 text-white px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
