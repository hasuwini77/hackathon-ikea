import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    proxy: {
      '/api/couchbase': {
        target: 'http://couchbase-edge-server:59840',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/couchbase/, ''),
      },
    },
  },
});
