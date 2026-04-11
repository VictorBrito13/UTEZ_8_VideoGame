import axios from "axios";
import { BASE_URL } from "../common/utils/url";

/** WebSocket URL for matchmaking; JWT is sent as ``token`` query param (ASGI middleware). */
export function getMatchmakingWebSocketUrl(): string {
  const token = localStorage.getItem("access_token");
  const wsBase = BASE_URL.replace(/^http/i, (match) =>
    match.toLowerCase() === "https" ? "wss" : "ws",
  );
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${wsBase}/ws/matchmaking${qs}`;
}

const apiClient = axios.create({
  baseURL: BASE_URL,
});

// Interceptor to add Token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to refresh token if expired (401)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refresh = localStorage.getItem("refresh_token");
        const { data } = await axios.post(`${BASE_URL}/api/token/refresh`, {
          refresh,
        });
        localStorage.setItem("access_token", data.access);
        return apiClient(originalRequest);
      } catch {
        localStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
