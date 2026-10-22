import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In development the browser talks to Vite (same origin) and Vite forwards
// API, media, video and content-page requests to Umbraco. This avoids CORS
// configuration and self-signed certificate errors on https://localhost:44322.
//
// `/recipes` and `/shop-online` are forwarded because the SPA does not
// implement those pages yet — the cards link to the CMS page. Remove them
// once React routes for those paths exist, otherwise the SPA will never serve
// them in dev.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_UMBRACO_BASE_URL;
  const proxy = target
    ? Object.fromEntries(
        ['/umbraco', '/media', '/video', '/recipes', '/shop-online'].map((path) => [
          path,
          { target, changeOrigin: true, secure: false },
        ]),
      )
    : undefined;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: '0.0.0.0',
      port: 5000,
      strictPort: true,
      allowedHosts: true,
      proxy,
    },
  };
});
