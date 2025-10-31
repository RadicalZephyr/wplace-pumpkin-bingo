import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  base: "/wplace-pumpkin-bingo/",
  build: {
    minify: false, // 👈 disable code minification
    sourcemap: true, // optional, useful for readable output
  },
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
});
