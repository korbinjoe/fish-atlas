import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "three-core": ["three"],
          globe: [
            "@react-three/fiber",
            "@react-three/drei",
            "d3-geo",
            "topojson-client",
          ],
        },
      },
    },
  },
});
