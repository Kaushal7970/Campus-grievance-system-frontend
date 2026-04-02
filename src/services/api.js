import axios from "axios";

const rootUrl = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");
const API = axios.create({
	baseURL: `${rootUrl}/api`,
});

API.interceptors.request.use((req) => {
	const token = localStorage.getItem("token");
	console.log("Sending Token:", token);
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

export default API;