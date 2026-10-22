/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UMBRACO_BASE_URL?: string;
  readonly VITE_UMBRACO_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
