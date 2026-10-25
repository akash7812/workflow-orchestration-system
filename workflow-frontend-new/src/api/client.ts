
import axios from "axios";

// Create one reusable Axios instance for our backend APIs.
export const apiClient = axios.create({
  // Read the backend URL from .env.
  // Use localhost as the fallback.
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://localhost:8080/api",

  // Tell the backend that request bodies are JSON.
  headers: {
    "Content-Type": "application/json",
  },
});

// Run this function before each request made with apiClient.
apiClient.interceptors.request.use((config) => {
  // Read the JWT saved after login.
  const token = localStorage.getItem("token");

  // Add authorization only when a token exists.
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Pass the updated request configuration to Axios.
  return config;
});
