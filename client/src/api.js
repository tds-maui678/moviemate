import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export const api = axios.create({
  baseURL,
  withCredentials: false,
});
const TOKEN_KEY = "mm_token"
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);   // must match your storage key
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
