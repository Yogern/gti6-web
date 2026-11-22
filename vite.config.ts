import { defineConfig } from "vite";
import { attachNetwork } from "./server/network";
export default defineConfig({
  server: { host: "0.0.0.0", allowedHosts: true },
  preview: { host: "0.0.0.0", allowedHosts: true },
  plugins: [
    {
      name: "leonida-rooms",
      configureServer(server) {
        if (server.httpServer) attachNetwork(server.httpServer);
      },
      configurePreviewServer(server) {
        attachNetwork(server.httpServer);
      },
    },
  ],
  build: { target: "es2022", chunkSizeWarningLimit: 3000 },
});
