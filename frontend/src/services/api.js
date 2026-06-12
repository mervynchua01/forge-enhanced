import axios from "axios";
import { getAccessToken } from "../lib/supabaseClient";
import { getApiBaseUrl } from "../lib/apiBaseUrl";

const api = axios.create({
  baseURL: `${getApiBaseUrl()}/api`,
});

api.interceptors.request.use(
  (config) => {
    // Read the cached token synchronously — no per-request getSession() stall.
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default api;
