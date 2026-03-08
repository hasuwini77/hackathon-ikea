/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Couchbase Configuration
  readonly VITE_COUCHBASE_URL: string;
  readonly VITE_COUCHBASE_DB: string;

  // Network Configuration
  readonly VITE_REQUEST_TIMEOUT: string;
  readonly VITE_SYNC_POLL_INTERVAL: string;
  readonly VITE_RETRY_ATTEMPTS: string;
  readonly VITE_RETRY_DELAY: string;

  // Feature Flags
  readonly VITE_OFFLINE_MODE: string;
  readonly VITE_CAMERA_SCANNER: string;

  // API Configuration
  readonly VITE_FASTAPI_URL: string;

  // Sentry Configuration
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_ENV?: string;
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
