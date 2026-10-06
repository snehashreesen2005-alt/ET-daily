import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // For `npm run dev:ui` (Vite only): forward API calls to a running `vercel dev`.
  server: { proxy: { "/api": "http://localhost:3000" } },
});
