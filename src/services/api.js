import axios from "axios";
import { safeGetItem } from "./storage";

const rootUrl = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");

function normalizeToken(rawToken) {
  const token = String(rawToken || "").trim();
  if (!token) return "";
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

const API = axios.create({
  baseURL: `${rootUrl}/api`,
});

API.interceptors.request.use((req) => {
  const authHeader = normalizeToken(safeGetItem("token"));
  if (authHeader) {
    if (req.headers && typeof req.headers.set === "function") {
      req.headers.set("Authorization", authHeader);
    } else {
      req.headers = req.headers || {};
      req.headers.Authorization = authHeader;
    }
  }
  return req;
});

export default API;
