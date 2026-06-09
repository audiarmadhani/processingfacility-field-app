import axios from "axios";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://processing-facility-backend.onrender.com";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export function apiUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}/api${normalized}`;
}
