/**
 * PostgreSQL API Client
 *
 * Provides HTTP client functions to interact with the FastAPI backend
 * that connects to PostgreSQL database.
 */

const API_BASE = '/api/postgres';  // Will be proxied to FastAPI

/**
 * PostgreSQL Product type matching the FastAPI backend schema
 */
export interface PostgresProduct {
  id: string;
  article_number: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  product_type: string;
  price: number;
  currency: string;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  weight_kg: number | null;
  zone: string;
  aisle: number | null;
  bay: number | null;
  section: string | null;
  stock_quantity: number;
  stock_last_checked: string;
  image_url: string | null;
  tags: string[];
}

/**
 * Custom error class for PostgreSQL API errors
 */
export class PostgresAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public isOffline: boolean = false
  ) {
    super(message);
    this.name = 'PostgresAPIError';
  }
}

/**
 * Helper function to handle API responses
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;

    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMessage = errorData.detail;
      }
    } catch {
      // If we can't parse the error response, use the default message
    }

    throw new PostgresAPIError(errorMessage, response.status);
  }

  return response.json();
}

/**
 * Fetch products from the PostgreSQL backend
 *
 * @param params - Optional query parameters for filtering and pagination
 * @returns Promise resolving to array of products
 */
export async function fetchProducts(params?: {
  search?: string;
  category?: string;
  zone?: string;
  skip?: number;
  limit?: number;
}): Promise<PostgresProduct[]> {
  try {
    const queryParams = new URLSearchParams();

    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.zone) queryParams.append('zone', params.zone);
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const url = `${API_BASE}/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<PostgresProduct[]>(response);
  } catch (error) {
    // Handle network errors (offline scenarios)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new PostgresAPIError(
        'Unable to connect to the server. Please check your connection.',
        undefined,
        true
      );
    }
    throw error;
  }
}

/**
 * Fetch a single product by article number
 *
 * @param articleNumber - The IKEA article number (e.g., "123.456.78")
 * @returns Promise resolving to product details
 */
export async function fetchProduct(articleNumber: string): Promise<PostgresProduct> {
  try {
    const response = await fetch(`${API_BASE}/products/${encodeURIComponent(articleNumber)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<PostgresProduct>(response);
  } catch (error) {
    // Handle network errors (offline scenarios)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new PostgresAPIError(
        'Unable to connect to the server. Please check your connection.',
        undefined,
        true
      );
    }
    throw error;
  }
}

/**
 * Update stock quantity for a product
 *
 * @param articleNumber - The IKEA article number (e.g., "123.456.78")
 * @param quantity - New stock quantity (must be >= 0)
 * @returns Promise resolving to updated product details
 */
export async function updateStock(
  articleNumber: string,
  quantity: number
): Promise<PostgresProduct> {
  try {
    const response = await fetch(
      `${API_BASE}/products/${encodeURIComponent(articleNumber)}/stock`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stock_quantity: quantity }),
      }
    );

    return handleResponse<PostgresProduct>(response);
  } catch (error) {
    // Handle network errors (offline scenarios)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new PostgresAPIError(
        'Unable to connect to the server. Please check your connection.',
        undefined,
        true
      );
    }
    throw error;
  }
}
