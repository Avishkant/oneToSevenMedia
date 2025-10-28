/* eslint-env node */
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // load .env files and expose VITE_ variables under import.meta.env
  // process.cwd is available in node but ESLint may flag it in this ESM file; disable that rule for the next line
  // eslint-disable-next-line no-undef
  const env = loadEnv(mode, process.cwd(), "");
  const backend = env.VITE_BACKEND_URL || "http://localhost:4000";

  return {
    plugins: [react(), tailwindcss()],
    // Dev server proxy to backend API during local development
    server: {
      proxy: {
        "/api": {
          target: backend,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
