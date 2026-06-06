// Resolve the backend URL with a safe fallback when localhost is wrong in production.
export const getApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_BACK_END_SERVER_URL;
  const isBrowser = typeof window !== "undefined";

  if (!configuredUrl) {
    return isBrowser ? window.location.origin : "";
  }

  const looksLocal = /localhost|127\.0\.0\.1/.test(configuredUrl);
  const runningOnLocalHost = isBrowser && /localhost|127\.0\.0\.1/.test(window.location.hostname);

  if (looksLocal && !runningOnLocalHost && isBrowser) {
    return window.location.origin;
  }

  return configuredUrl;
};
