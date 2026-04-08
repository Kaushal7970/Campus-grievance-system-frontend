import React from "react";
import { safeClear } from "../services/storage";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Keep this as a console error; it helps diagnose blank screens.
    // eslint-disable-next-line no-console
    console.error("UI crashed:", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-lg bg-white border rounded-2xl p-6 shadow">
          <div className="text-lg font-semibold text-gray-900">Something went wrong</div>
          <div className="text-sm text-gray-600 mt-2">
            The UI hit a runtime error. Check the browser console for details.
          </div>
          {this.state.error?.message && (
            <div className="mt-4 text-sm bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl break-words">
              {this.state.error.message}
            </div>
          )}
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-[rgb(var(--app-accent))] text-white hover:bg-[rgb(var(--app-accent-hover))]"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={() => {
                safeClear();
                window.location.href = "/";
              }}
              className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50"
            >
              Clear session
            </button>
          </div>
        </div>
      </div>
    );
  }
}
