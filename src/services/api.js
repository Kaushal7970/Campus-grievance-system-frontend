import axios from "axios";
import { safeGetItem } from "./storage";

const rootUrl = (process.env.REACT_APP_API_URL || "http://localhost:8081").replace(/\/$/, "");
const timeoutMs = Number(process.env.REACT_APP_API_TIMEOUT_MS || 15000);

function extractJwt(rawValue) {
  if (rawValue == null) return "";

  // Handle cases where older builds stored JSON (e.g. { token: "..." }).
  const raw = String(rawValue).trim();
  if (!raw) return "";

  // Strip accidental wrapping quotes.
  const unquoted = raw.replaceAll(/^['"]|['"]$/g, "").trim();

  if (unquoted.startsWith("{") && unquoted.endsWith("}")) {
    try {
      const parsed = JSON.parse(unquoted);
      if (parsed && typeof parsed === "object" && typeof parsed.token === "string") {
        return parsed.token.trim();
      }
    } catch {
      // fall through
    }
  }

  return unquoted;
}

function normalizeToken(rawToken) {
  const token = extractJwt(rawToken);
  if (!token) return "";
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

const API = axios.create({
  baseURL: `${rootUrl}/api`,
  timeout: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15000,
});

API.interceptors.request.use((req) => {
  const authHeader = normalizeToken(safeGetItem("token"));
  if (authHeader) {
    // Axios v1 may provide headers as AxiosHeaders (with .set) or a plain object.
    if (req.headers && typeof req.headers.set === "function") {
      req.headers.set("Authorization", authHeader);
    }

    req.headers = req.headers || {};
    req.headers["Authorization"] = authHeader;
  }
  return req;
});

export default API;
