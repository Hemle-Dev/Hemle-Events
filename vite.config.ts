import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command }) => ({
  // TanStack Start serves development requests directly. Nitro is only needed
  // to package the production Node server, not as a second dev proxy.
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart(),
    ...(command === "build" ? [nitro()] : []),
    viteReact(),
  ],
  server: {
    host: true,
    port: 3000,
  },
}));
