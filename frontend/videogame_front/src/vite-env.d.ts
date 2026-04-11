/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** HTTP(S) base URL for REST API; WebSocket URLs are derived in apiClient. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
