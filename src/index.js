import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initTheme } from "./services/theme";
import ErrorBoundary from "./components/ErrorBoundary";

initTheme();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
	<ErrorBoundary>
		<App />
	</ErrorBoundary>
);