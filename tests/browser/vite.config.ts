import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Isolated component fixture: no router, authentication or Supabase requests.
export default defineConfig({
  plugins: [tsconfigPaths(), tailwindcss(), react()],
  server: { host: "127.0.0.1", port: 3108, strictPort: true },
});
