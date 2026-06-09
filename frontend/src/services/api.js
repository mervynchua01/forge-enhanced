import axios from "axios";
import { supabase } from "../lib/supabaseClient";
import { getApiBaseUrl } from "../lib/apiBaseUrl";

const api = axios.create({
  baseURL: `${getApiBaseUrl()}/api`,
});

api.interceptors.request.use(
  async (config) => {
    try {
      const timeout = new Promise((resolve) => setTimeout(resolve, 2000));
      const sessionFetch = supabase.auth.getSession();
      const { data } = await Promise.race([sessionFetch, timeout.then(() => ({ data: null }))]);
      const token = data?.session?.access_token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // no token — backend dev bypass will handle it
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default api;
