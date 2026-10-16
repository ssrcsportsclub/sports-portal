import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Long-lived vendor chunks cache across deploys; app chunks change often.
const VENDOR_CHUNKS: Record<string, string[]> = {
  react: [
    "react",
    "react-dom",
    "react-router",
    "react-router-dom",
    "scheduler",
  ],
  state: ["@reduxjs/toolkit", "react-redux", "redux", "immer", "reselect"],
  motion: ["framer-motion", "motion-dom", "motion-utils"],
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          const pkg = id.split("node_modules/").pop()!.split("/");
          const name = pkg[0].startsWith("@") ? `${pkg[0]}/${pkg[1]}` : pkg[0];
          for (const [chunk, packages] of Object.entries(VENDOR_CHUNKS)) {
            if (packages.includes(name)) return `vendor-${chunk}`;
          }
        },
      },
    },
  },
});
