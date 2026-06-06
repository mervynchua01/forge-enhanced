import axios from "axios";
import { supabase } from "../lib/supabaseClient";
import { getApiBaseUrl } from "../lib/apiBaseUrl";

const api = axios.create({
  baseURL: `${getApiBaseUrl()}/api`,
});

api.interceptors.request.use(
  async (config) => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
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
