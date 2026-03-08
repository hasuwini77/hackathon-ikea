import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  const plugins = [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ];

  // Add Sentry plugin for source map uploads in production builds
  // This requires SENTRY_AUTH_TOKEN environment variable to be set
  if (mode === 'production' && env.SENTRY_AUTH_TOKEN && env.VITE_SENTRY_DSN) {
    plugins.push(
      sentryVitePlugin({
        // Organization and project can be found in your Sentry project settings
        org: env.SENTRY_ORG,
        project: env.SENTRY_PROJECT,

        // Auth token for uploading source maps
        // Get this from Sentry: Settings > Auth Tokens
        authToken: env.SENTRY_AUTH_TOKEN,

        // Automatically detect and upload source maps
        sourcemaps: {
          assets: './build/**',
          ignore: ['node_modules/**'],
          filesToDeleteAfterUpload: ['./build/**/*.map'],
        },

        // Release version tracking
        release: {
          name: env.VITE_APP_VERSION || 'development',
        },

        // Telemetry for Sentry plugin usage (optional, can be disabled)
        telemetry: false,

        // Silent mode for cleaner build output
        silent: false,

        // Enable debug mode if needed
        debug: false,
      })
    );
  }

  return {
    plugins,
    server: {
      proxy: {
        '/api/couchbase': {
          target: env.VITE_COUCHBASE_SERVER || 'http://127.0.0.1:59840',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/couchbase/, ''),
        },
        '/api/postgres': {
          target: env.VITE_FASTAPI_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/postgres/, ''),
        },
      },
    },
    build: {
      // Generate source maps for production
      sourcemap: mode === 'production' || mode === 'staging',
    },
  };
});
