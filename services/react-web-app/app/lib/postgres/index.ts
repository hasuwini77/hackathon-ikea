/**
 * PostgreSQL API Integration
 *
 * Provides React hooks and client functions to interact with the
 * PostgreSQL backend via FastAPI.
 */

// Client functions
export {
  fetchProducts,
  fetchProduct,
  updateStock,
  PostgresAPIError,
} from './client';

// Types
export type { PostgresProduct } from './client';

// Hooks
export {
  usePostgresProducts,
  usePostgresProduct,
  usePostgresUpdateStock,
} from './hooks';
