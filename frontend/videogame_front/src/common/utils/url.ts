/** Local API default when VITE_API_BASE_URL is unset (e.g. `vite dev` without .env). */
const DEFAULT_DEV_API_BASE = "http://localhost:8000";

export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_DEV_API_BASE;
