import { safeClear, safeGetItem } from "./services/storage";

const apiBaseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const baseURL = apiBaseUrl ? `${apiBaseUrl}/api` : "/api";

let clientPromise;

async function getClient() {
  if (clientPromise) return clientPromise;

  clientPromise = (async () => {
    const axiosMod = await import("axios");
    const axiosClient = axiosMod?.default || axiosMod;

    if (!axiosClient || typeof axiosClient.create !== "function") {
      throw new Error("Axios failed to initialize");
    }

    const instance = axiosClient.create({ baseURL });

    instance.interceptors.request.use((req) => {
      const token = safeGetItem("token");
      if (token) {
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
          safeClear();
          if (globalThis.window?.location) {
            globalThis.window.location.href = "/";
          }
        }
        return Promise.reject(err);
      }
    );

    return instance;
  })().catch((err) => {
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