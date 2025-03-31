import path from "path"
import react from "@vitejs/plugin-react"
//@ts-expect-error - Missing type definitions for vite-plugin-eslint
import eslint from 'vite-plugin-eslint';
import { defineConfig } from "vite"
 
export default defineConfig({
  plugins: [react(),eslint()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})