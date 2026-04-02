import { safeClear, safeGetItem } from "./storage";

const baseURL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8081/api";

// One-time debug to confirm what the browser is calling.
if (typeof window !== "undefined" && !window.__GRIEVANCE_API_DEBUG__) {
  window.__GRIEVANCE_API_DEBUG__ = true;
  // eslint-disable-next-line no-console
  console.info("API baseURL:", baseURL);
}

let clientPromise;

async function getClient() {
  if (clientPromise) return clientPromise;

  clientPromise = (async () => {
    // Lazy-load axios so Jest doesn't try to parse axios at module-load time,
    // and so the browser bundle resolves the ESM entry correctly.
    const axiosMod = await import("axios");
    const axios = axiosMod?.default || axiosMod;

    if (!axios || typeof axios.create !== "function") {
      throw new Error("Axios failed to initialize");
    }

    const instance = axios.create({ baseURL });

    instance.interceptors.request.use((req) => {
      const token = safeGetItem("token");
      if (token) {
        // Axios v1 may use AxiosHeaders; handle both plain objects and AxiosHeaders.
        if (req.headers && typeof req.headers.set === "function") {
          req.headers.set("Authorization", `Bearer ${token}`);
        } else {
          req.headers = req.headers || {};
          req.headers.Authorization = `Bearer ${token}`;
        }
      }
      return req;
    });

    instance.interceptors.response.use(
      (res) => res,
      (err) => {
        const status = err?.response?.status;
        if (status === 401) {
          // Session expired / invalid token.
          safeClear();
          if (typeof window !== "undefined") {
            window.location.href = "/";
          }
        }
        return Promise.reject(err);
      }
    );

    return instance;
  })().catch((err) => {
    // Allow retry if initial load fails.
    clientPromise = undefined;
    throw err;
  });

  return clientPromise;
}

const API = {
  get: (url, config) => getClient().then((c) => c.get(url, config)),
  post: (url, data, config) => getClient().then((c) => c.post(url, data, config)),
  put: (url, data, config) => getClient().then((c) => c.put(url, data, config)),
  delete: (url, config) => getClient().then((c) => c.delete(url, config))
};

export default API;