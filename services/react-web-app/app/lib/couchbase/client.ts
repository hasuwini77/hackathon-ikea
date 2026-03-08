/**
 * Low-level REST client for Couchbase Edge Server
 *
 * Provides resilient network access with timeout handling,
 * retry logic, and offline state detection.
 */

import {
  getDatabaseUrl,
  getDocumentUrl,
  getAllDocsUrl,
  REQUEST_TIMEOUT,
  RETRY_ATTEMPTS,
  RETRY_DELAY,
} from './config';
import type {
  CouchbaseDocument,
  AllDocsResponse,
  CouchbaseError,
  ProductDocument,
} from './types';
import { captureException, addBreadcrumb } from '~/lib/sentry';

/**
 * Custom error class for Couchbase operations
 */
export class CouchbaseClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public isOffline: boolean = false,
    public originalError?: any
  ) {
    super(message);
    this.name = 'CouchbaseClientError';
  }
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Detect offline/network errors
    if (error.name === 'AbortError') {
      const clientError = new CouchbaseClientError(
        'Request timeout - server may be offline',
        undefined,
        true,
        error
      );

      // Add breadcrumb for timeout
      addBreadcrumb(
        `Request timeout: ${url}`,
        'couchbase',
        'warning',
        { url, timeout }
      );

      throw clientError;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      const clientError = new CouchbaseClientError(
        'Network error - unable to reach Edge Server',
        undefined,
        true,
        error
      );

      // Add breadcrumb for network error
      addBreadcrumb(
        `Network error: ${url}`,
        'couchbase',
        'error',
        { url, online: navigator.onLine }
      );

      throw clientError;
    }

    throw error;
  }
}

/**
 * Parse error response from Edge Server
 */
async function parseErrorResponse(response: Response): Promise<never> {
  let errorData: CouchbaseError;

  try {
    errorData = await response.json();
  } catch {
    const error = new CouchbaseClientError(
      `HTTP ${response.status}: ${response.statusText}`,
      response.status
    );

    // Capture HTTP errors in Sentry
    captureException(error, {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
    });

    throw error;
  }

  const error = new CouchbaseClientError(
    errorData.reason || errorData.error || 'Unknown error',
    response.status
  );

  // Capture Couchbase errors in Sentry
  captureException(error, {
    url: response.url,
    status: response.status,
    errorData,
  });

  throw error;
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  attempts: number = RETRY_ATTEMPTS,
  delay: number = RETRY_DELAY
): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      // Don't retry on client errors (4xx) or if we're offline
      if (error instanceof CouchbaseClientError) {
        if (error.status && error.status >= 400 && error.status < 500) {
          throw error;
        }
        if (error.isOffline && i < attempts - 1) {
          // For offline errors, wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
          continue;
        }
      }

      // On last attempt, throw the error
      if (i === attempts - 1) {
        throw error;
      }

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }

  throw new Error('Retry logic failed unexpectedly');
}

/**
 * Get a document by ID
 */
export async function getDocument(docId: string): Promise<CouchbaseDocument> {
  // Add breadcrumb for document fetch
  addBreadcrumb(
    `Fetching document: ${docId}`,
    'couchbase',
    'info',
    { operation: 'getDocument', docId }
  );

  return retryWithBackoff(async () => {
    const url = getDocumentUrl(docId);
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      if (response.status === 404) {
        // Don't capture 404s in Sentry - they're expected
        addBreadcrumb(
          `Document not found: ${docId}`,
          'couchbase',
          'warning',
          { docId }
        );
        throw new CouchbaseClientError(
          `Document not found: ${docId}`,
          404
        );
      }
      await parseErrorResponse(response);
    }

    return response.json();
  });
}

/**
 * Put (create or update) a document
 */
export async function putDocument(
  docId: string,
  document: Omit<CouchbaseDocument, '_id'>,
  rev?: string
): Promise<{ id: string; rev: string; ok: boolean }> {
  // Add breadcrumb for document update
  addBreadcrumb(
    rev ? `Updating document: ${docId}` : `Creating document: ${docId}`,
    'couchbase',
    'info',
    { operation: 'putDocument', docId, hasRev: !!rev }
  );

  return retryWithBackoff(async () => {
    const url = rev
      ? `${getDocumentUrl(docId)}?rev=${encodeURIComponent(rev)}`
      : getDocumentUrl(docId);

    const body = {
      ...document,
      _id: docId,
      ...(rev && { _rev: rev }),
    };

    const response = await fetchWithTimeout(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 409) {
        // Add breadcrumb for conflict
        addBreadcrumb(
          `Document conflict: ${docId}`,
          'couchbase',
          'warning',
          { docId, rev }
        );
        throw new CouchbaseClientError(
          'Document conflict - revision mismatch',
          409
        );
      }
      await parseErrorResponse(response);
    }

    return response.json();
  });
}

/**
 * Delete a document
 */
export async function deleteDocument(
  docId: string,
  rev: string
): Promise<{ id: string; rev: string; ok: boolean }> {
  // Add breadcrumb for document deletion
  addBreadcrumb(
    `Deleting document: ${docId}`,
    'couchbase',
    'info',
    { operation: 'deleteDocument', docId, rev }
  );

  return retryWithBackoff(async () => {
    const url = `${getDocumentUrl(docId)}?rev=${encodeURIComponent(rev)}`;

    const response = await fetchWithTimeout(url, {
      method: 'DELETE',
    });

    if (!response.ok) {
      if (response.status === 409) {
        // Add breadcrumb for conflict
        addBreadcrumb(
          `Delete conflict: ${docId}`,
          'couchbase',
          'warning',
          { docId, rev }
        );
        throw new CouchbaseClientError(
          'Document conflict - revision mismatch',
          409
        );
      }
      await parseErrorResponse(response);
    }

    return response.json();
  });
}

/**
 * Query all documents
 */
export async function getAllDocuments(
  includeDocs: boolean = true
): Promise<AllDocsResponse> {
  // Add breadcrumb for bulk query
  addBreadcrumb(
    'Fetching all documents',
    'couchbase',
    'info',
    { operation: 'getAllDocuments', includeDocs }
  );

  return retryWithBackoff(async () => {
    const url = `${getAllDocsUrl()}?include_docs=${includeDocs}`;
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      await parseErrorResponse(response);
    }

    return response.json();
  });
}

/**
 * Search/filter products by criteria
 */
export async function searchProducts(params: {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  query?: string;
}): Promise<ProductDocument[]> {
  // Get all documents and filter client-side
  // Note: For production, you'd want to use Couchbase's N1QL or views
  const allDocs = await getAllDocuments(true);

  let products = allDocs.rows
    .filter(row => row.doc && row.doc.type === 'product')
    .map(row => row.doc as ProductDocument);

  // Apply filters
  if (params.category) {
    products = products.filter(p =>
      p.category?.toLowerCase() === params.category?.toLowerCase()
    );
  }

  if (params.minPrice !== undefined) {
    products = products.filter(p => p.price !== undefined && p.price >= params.minPrice!);
  }

  if (params.maxPrice !== undefined) {
    products = products.filter(p => p.price !== undefined && p.price <= params.maxPrice!);
  }

  if (params.query) {
    const searchTerm = params.query.toLowerCase();
    products = products.filter(p =>
      p.name?.toLowerCase().includes(searchTerm) ||
      p.description?.toLowerCase().includes(searchTerm) ||
      p.articleNumber?.toLowerCase().includes(searchTerm) ||
      p.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  return products;
}

/**
 * Check if Edge Server is online
 */
export async function checkServerStatus(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      getDatabaseUrl(),
      {},
      2000 // Shorter timeout for status checks
    );
    return response.ok;
  } catch (error) {
    if (error instanceof CouchbaseClientError && error.isOffline) {
      return false;
    }
    // Other errors might still mean the server is reachable
    return false;
  }
}

/**
 * Get database information
 */
export async function getDatabaseInfo(): Promise<{
  db_name: string;
  doc_count: number;
  update_seq: number;
}> {
  return retryWithBackoff(async () => {
    const response = await fetchWithTimeout(getDatabaseUrl());

    if (!response.ok) {
      await parseErrorResponse(response);
    }

    return response.json();
  });
}

/**
 * Helper: Create a product document ID from an article number
 */
export function createProductId(articleNumber: string): string {
  return `product:${articleNumber}`;
}

/**
 * Helper: Extract article number from a product document ID
 */
export function getArticleNumberFromId(productId: string): string {
  return productId.replace('product:', '');
}
