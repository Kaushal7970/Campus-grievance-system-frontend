import axios from "axios";
import { safeGetItem } from "./storage";

const rootUrl = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");
const API = axios.create({
	baseURL: `${rootUrl}/api`,
});

API.interceptors.request.use((config) => {
	const token = safeGetItem("token");
	if (token) {
		if (config.headers && typeof config.headers.set === "function") {
			config.headers.set("Authorization", `Bearer ${token}`);
		} else {
			config.headers = config.headers || {};
			config.headers.Authorization = `Bearer ${token}`;
		}
	}
	return config;
});

export default API;