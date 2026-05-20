import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const BACKEND = "http://127.0.0.1:10801";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 10800,
    strictPort: true,
    host: "127.0.0.1",
    proxy: {
      "/api": { target: BACKEND, changeOrigin: true },
      "/mcp":  { target: BACKEND, changeOrigin: true, ws: true },
    },
  },
});
