// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  // Load environment variables based on the mode (development, production, etc.)
  const env = loadEnv(mode, process.cwd(), "");

  // Use VITE_BASE_URL from .env file, or default to '/'
  // For development (npm run dev), it will look for .env.development or .env
  // For production build (npm run build), it will look for .env.production or .env
  const base = env.VITE_BASE_URL || "/";

  return {
    // Use the dynamically determined base path
    base: base,
    plugins: [react()],
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "./src"),
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      watch: {
        usePolling: true,
      },
      // Ensure historyApiFallback is true for client-side routing in dev
      historyApiFallback: true,
    },
    // build options can be added here if needed
    // build: {
    //   outDir: 'dist',
    // }
  };
});
