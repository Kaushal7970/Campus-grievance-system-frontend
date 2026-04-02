import axios from "axios";

import API_URL from "../api";
import { safeClear, safeGetItem } from "./storage";

const baseURL = `${API_URL.replace(/\/$/, "")}/api`;

const client = axios.create({ baseURL });

client.interceptors.request.use((req) => {
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

client.interceptors.response.use(
	(res) => res,
	(err) => {
		if (err?.response?.status === 401) {
			safeClear();
			if (typeof location !== "undefined") {
				location.href = "/";
			}
		}
		return Promise.reject(err);
	}
);

const API = {
	get: (url, config) => client.get(url, config),
	post: (url, data, config) => client.post(url, data, config),
	put: (url, data, config) => client.put(url, data, config),
	delete: (url, config) => client.delete(url, config)
};

export default API;