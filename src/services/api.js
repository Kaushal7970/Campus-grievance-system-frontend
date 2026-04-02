const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const getApiUrl = () => API_URL;

export const fetchData = async (endpoint) => {
  const response = await fetch(`${API_URL}/${endpoint}`);
  return response.json();
};