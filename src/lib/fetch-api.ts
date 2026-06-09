import axios, { AxiosError } from "axios";
import { apiUrl } from "@/lib/api";

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string; message?: string }>;
    if (axiosError.response?.status === 0 || axiosError.code === "ERR_NETWORK") {
      return "Cannot reach the platform API. Check your connection and that the backend allows this app origin (CORS).";
    }
    return (
      axiosError.response?.data?.error ||
      axiosError.response?.data?.message ||
      axiosError.message ||
      fallback
    );
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await axios.get<T>(apiUrl(path));
  return response.data;
}
