// client/src/api/axios.js
import axios from "axios";

// Use env var if set, else fall back to local server
const baseURL = "http://localhost:5000/api";

const API = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

// If later you use JWTs, you can uncomment this:
// API.interceptors.request.use((config) => {
//   const token = localStorage.getItem("token");
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

export default API;
