import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Avoid CORS in dev: browser calls same origin, Vite forwards to API Gateway.
      // Set VITE_PROXY_TARGET to your API base (e.g. https://xxx.execute-api.us-east-1.amazonaws.com/Prod).
      "/api": {
        target: process.env.VITE_PROXY_TARGET || "https://e14945kjl2.execute-api.us-east-1.amazonaws.com/Prod",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src"
    }
  }
});
