const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const fetchData = async (endpoint) => {
  const cleanEndpoint = String(endpoint || "").replace(/^\/+/, "");
  const res = await fetch(`${API_URL}/${cleanEndpoint}`);
  return res.json();
};

export default API_URL;