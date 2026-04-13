import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await api.post("/auth/refresh");
        return api(originalRequest);
      } catch {
        // Dispatch a custom event so the AuthProvider can handle redirect via
        // Next.js router. Falls back to window.location in non-browser envs.
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth:unauthenticated"));
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
