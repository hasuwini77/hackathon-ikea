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
import { getAllProductsFromIDB, getProductFromIDB, saveProductToIDB } from '../pwa/indexeddb';

export type SearchMode = 'strict' | 'smart';

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
    try {
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

      const doc = await response.json();
      await saveProductToIDB(doc).catch(console.error);
      return doc;
    } catch (err: any) {
      if (err instanceof CouchbaseClientError && err.isOffline) {
        console.warn(`[Offline] Falling back to IndexedDB for document: ${docId}`);
        const cachedDoc = await getProductFromIDB(docId);
        if (cachedDoc) return cachedDoc;
      }
      throw err;
    }
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
    try {
      const url = `${getAllDocsUrl()}?include_docs=${includeDocs}`;
      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        await parseErrorResponse(response);
      }

      const res = await response.json();
      if (includeDocs && res.rows) {
        Promise.all(res.rows.map((row: any) => saveProductToIDB(row.doc))).catch(console.error);
      }
      return res;
    } catch (err: any) {
      if (err instanceof CouchbaseClientError && err.isOffline) {
        console.warn(`[Offline] Falling back to IndexedDB for all documents...`);
        const cachedDocs = await getAllProductsFromIDB();
        return {
          total_rows: cachedDocs.length,
          offset: 0,
          rows: cachedDocs.map((doc: any) => ({
            id: doc._id,
            key: doc._id,
            value: { rev: doc._rev },
            doc: includeDocs ? doc : undefined
          }))
        };
      }
      throw err;
    }
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
  searchMode?: SearchMode;
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
    const searchTerm = normalizeSearchText(params.query);
    if (searchTerm.length > 0) {
      products = rankProductsBySearch(products, searchTerm, params.searchMode ?? 'smart');
    }
  }

  return products;
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const dp: number[] = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) dp[j] = j;

  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + cost
      );
      prev = temp;
    }
  }

  return dp[b.length];
}

function tokenOverlapScore(queryTokens: string[], targetTokens: string[]): number {
  if (queryTokens.length === 0 || targetTokens.length === 0) return 0;
  const targetSet = new Set(targetTokens);
  let overlap = 0;
  for (const token of queryTokens) {
    if (targetSet.has(token)) overlap += 1;
  }
  return overlap / queryTokens.length;
}

function fuzzyTextScore(query: string, target: string): number {
  if (!target) return 0;
  if (target.includes(query)) return 0.92;

  const queryTokens = query.split(' ').filter(Boolean);
  const targetTokens = target.split(' ').filter(Boolean);
  const overlap = tokenOverlapScore(queryTokens, targetTokens);

  const candidates = buildFuzzyCandidates(query, targetTokens);
  let bestEditScore = 0;

  for (const candidate of candidates) {
    const distance = levenshteinDistance(query, candidate);
    const maxLen = Math.max(query.length, candidate.length);
    const editScore = maxLen === 0 ? 1 : 1 - distance / maxLen;
    if (editScore > bestEditScore) bestEditScore = editScore;
  }

  return Math.max(overlap, bestEditScore * 0.95);
}

function buildFuzzyCandidates(query: string, targetTokens: string[]): string[] {
  const candidates: string[] = [];
  const minTokenLen = Math.max(3, query.length - 2);
  const maxTokenLen = query.length + 4;

  for (const token of targetTokens) {
    if (token.length >= minTokenLen && token.length <= maxTokenLen) {
      candidates.push(token);
    }
  }

  for (let i = 0; i < targetTokens.length - 1; i++) {
    const bigram = `${targetTokens[i]} ${targetTokens[i + 1]}`;
    if (bigram.length >= minTokenLen && bigram.length <= maxTokenLen + 8) {
      candidates.push(bigram);
    }
  }

  if (candidates.length === 0 && targetTokens.length > 0) {
    candidates.push(targetTokens[0]);
  }

  return Array.from(new Set(candidates)).slice(0, 30);
}

type SearchMatchKind = 'exact' | 'prefix' | 'contains' | 'fuzzy';

const SEARCH_MATCH_TIER: Record<SearchMatchKind, number> = {
  exact: 4,
  prefix: 3,
  contains: 2,
  fuzzy: 1,
};

export function rankProductsBySearch(products: ProductDocument[], query: string, mode: SearchMode): ProductDocument[] {
  const ranked = products
    .map((product) => {
      const name = normalizeSearchText(product.name ?? '');
      const description = normalizeSearchText(product.description ?? '');
      const articleNumber = normalizeSearchText(product.articleNumber ?? '');
      const tags = normalizeSearchText((product.tags ?? []).join(' '));

      let score = 0;
      let matchKind: SearchMatchKind | null = null;
      let fuzzyConfidence = 0;

      // Strict matches first.
      if (articleNumber === query && score < 1000) {
        score = 1000;
        matchKind = 'exact';
      }
      if (name === query && score < 950) {
        score = 950;
        matchKind = 'exact';
      }
      if (description === query && score < 900) {
        score = 900;
        matchKind = 'exact';
      }

      if (articleNumber.startsWith(query) && score < 850) {
        score = 850;
        matchKind = 'prefix';
      }
      if (name.startsWith(query) && score < 800) {
        score = 800;
        matchKind = 'prefix';
      }
      if (description.startsWith(query) && score < 750) {
        score = 750;
        matchKind = 'prefix';
      }

      if (articleNumber.includes(query) && score < 700) {
        score = 700;
        matchKind = 'contains';
      }
      if (name.includes(query) && score < 650) {
        score = 650;
        matchKind = 'contains';
      }
      if (description.includes(query) && score < 600) {
        score = 600;
        matchKind = 'contains';
      }
      if (tags.includes(query) && score < 500) {
        score = 500;
        matchKind = 'contains';
      }

      if (mode === 'smart' && query.length >= 3) {
        // Fuzzy fallback for near matches.
        const fuzzyBest = Math.max(
          fuzzyTextScore(query, name),
          fuzzyTextScore(query, description),
          fuzzyTextScore(query, articleNumber),
          fuzzyTextScore(query, tags)
        );

        // Boost fuzzy score into sortable range only when strict score is weak.
        if (score < 600 && fuzzyBest >= 0.42) {
          score = Math.max(score, Math.round(fuzzyBest * 500));
          if (score > 0) {
            matchKind = 'fuzzy';
            fuzzyConfidence = fuzzyBest;
          }
        }
      }

      return {
        product: {
          ...product,
          _searchMatchKind: matchKind ?? undefined,
          _searchScore: matchKind === 'fuzzy' ? fuzzyConfidence : undefined,
        },
        score,
        matchTier: matchKind ? SEARCH_MATCH_TIER[matchKind] : 0,
        fuzzyConfidence,
      };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.matchTier !== a.matchTier) return b.matchTier - a.matchTier;
      if (a.matchTier === SEARCH_MATCH_TIER.fuzzy && b.matchTier === SEARCH_MATCH_TIER.fuzzy) {
        if (b.fuzzyConfidence !== a.fuzzyConfidence) return b.fuzzyConfidence - a.fuzzyConfidence;
      }
      if (b.score !== a.score) return b.score - a.score;
      return (a.product.name ?? '').localeCompare(b.product.name ?? '');
    })
    .map(({ product }) => product);

  return ranked;
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
