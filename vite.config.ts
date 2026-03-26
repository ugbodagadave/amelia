import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

function buildManualChunkName(id: string) {
  if (!id.includes("node_modules")) {
    return undefined
  }

  if (
    id.includes("/react/") ||
    id.includes("/react-dom/") ||
    id.includes("/react-router-dom/")
  ) {
    return "framework"
  }

  if (id.includes("/@clerk/") || id.includes("/convex/")) {
    return "auth-data"
  }

  if (id.includes("/recharts/")) {
    return "charts"
  }

  if (id.includes("/react-day-picker/") || id.includes("/date-fns/")) {
    return "claims-ui"
  }

  if (
    id.includes("/@radix-ui/") ||
    id.includes("/cmdk/") ||
    id.includes("/sonner/")
  ) {
    return "ui-vendor"
  }

  return undefined
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: [".ngrok-free.app", "localhost", "127.0.0.1"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    reportCompressedSize: false,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          return buildManualChunkName(id)
        },
      },
    },
  },
})
