const baseUrl = (import.meta.env.VITE_UMBRACO_BASE_URL ?? '').replace(/\/+$/, '');

export const env = {
  /** Umbraco origin from .env (used for configuration checks). */
  baseUrl,
  apiKey: import.meta.env.VITE_UMBRACO_API_KEY ?? '',
  /**
   * Origin prepended to API calls and media/video paths.
   * In dev it is '' so requests go through the Vite proxy (see vite.config.ts).
   */
  origin: import.meta.env.DEV ? '' : baseUrl,
} as const;
