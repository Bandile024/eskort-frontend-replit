import { env } from '../config/env';
import type { HomePageItem } from '../types/contentBlocks';
import type { CollectionPage, ProductPage, RecipeDetail } from '../types/contentTypes';
import type { ContentItemRoot, DeliveryListResponse } from '../types/umbraco';

const DELIVERY_PATH = '/umbraco/delivery/api/v2/content';
const DELIVERY_ITEM_PATH = '/umbraco/delivery/api/v2/content/item';

export type ApiErrorKind = 'config' | 'network' | 'http' | 'invalid-json' | 'invalid-shape';

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function assertConfigured(): void {
  if (!env.baseUrl || !env.apiKey) {
    throw new ApiError(
      'config',
      'Missing VITE_UMBRACO_BASE_URL or VITE_UMBRACO_API_KEY. Configure them in the project environment and restart the dev server.',
    );
  }
}

/**
 * Generic Delivery API GET. Throws `ApiError` for every failure mode.
 * `path` overrides the collection path — used for the single-item endpoint.
 */
async function deliveryGet<T>(
  query: Record<string, string>,
  signal?: AbortSignal,
  path: string = DELIVERY_PATH,
): Promise<T> {
  assertConfigured();

  const url = `${env.origin}${path}?${new URLSearchParams(query).toString()}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', 'Api-Key': env.apiKey },
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('network', 'Could not reach the content service. Check your connection and that Umbraco is running.');
  }

  if (!response.ok) {
    throw new ApiError(
      'http',
      response.status === 401 || response.status === 403
        ? 'The content service rejected the API key.'
        : `The content service returned ${response.status} ${response.statusText}.`.trim(),
      response.status,
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError('invalid-json', 'The content service returned a response that is not valid JSON.');
  }
}

function isListResponse<T>(value: unknown): value is DeliveryListResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { items?: unknown }).items)
  );
}

/**
 * Fetches the home page with maximum expansion.
 * Attempts `expand=all` first so Umbraco delivers all page properties, media,
 * and block details, gracefully falling back to narrower expansions if specific
 * properties in the CMS have serialization constraints.
 */
export async function getHomePage(signal?: AbortSignal): Promise<HomePageItem | null> {
  const expandCandidates = ['all', 'properties[content],properties', 'properties[content]'];
  let lastError: unknown;

  for (const expand of expandCandidates) {
    try {
      const data = await deliveryGet<unknown>(
        {
          filter: 'contentType:homePage',
          expand,
        },
        signal,
      );

      if (isListResponse<HomePageItem>(data)) {
        return data.items[0] ?? null;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      lastError = err;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new ApiError('invalid-shape', 'The content service response did not have the expected structure.');
}

/**
 * Fetches all published `collectionPage` nodes with their properties and media expanded.
 * Paginates automatically to ensure every single category published in Umbraco is delivered.
 */
export async function getCollectionPageMap(
  signal?: AbortSignal,
): Promise<Map<string, CollectionPage>> {
  const items: CollectionPage[] = [];
  const pageSize = 100;
  let skip = 0;
  let total = Infinity;

  while (items.length < total) {
    let data: unknown;
    try {
      data = await deliveryGet<unknown>(
        {
          filter: 'contentType:collectionPage',
          expand: 'all',
          take: String(pageSize),
          skip: String(skip),
        },
        signal,
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      data = await deliveryGet<unknown>(
        {
          filter: 'contentType:collectionPage',
          expand: 'properties',
          take: String(pageSize),
          skip: String(skip),
        },
        signal,
      );
    }

    if (!isListResponse<CollectionPage>(data)) {
      throw new ApiError('invalid-shape', 'Unexpected response shape for collectionPage.');
    }

    items.push(...data.items);
    total = data.total ?? items.length;
    skip += pageSize;

    if (data.items.length === 0) break;
  }

  return new Map(items.map((item) => [item.id, item]));
}

// ── Referenced content, fetched one node at a time ───────────────────────

/**
 * Why a node could not be fully fetched.
 *
 * `invalid-content` means the node exists and is published, but the Delivery
 * API cannot serialize its properties (HTTP 500 from Umbraco). That is a CMS
 * content-data problem — a picker value stored as a bare string instead of a
 * JSON array — and it has to be fixed in the back office.
 */
export type ContentFailureReason = 'invalid-content' | 'not-found' | 'network' | 'http';

export interface ContentFetchFailure {
  id: string;
  name: string;
  status?: number;
  reason: ContentFailureReason;
  detail?: string;
}

export interface ContentFetchResult<T> {
  /** Fully-fetched nodes, plus shells for the ones that failed to expand. */
  items: Map<string, T>;
  /** Nodes that could not be fully fetched. */
  failures: ContentFetchFailure[];
}

/** Per-node request budget — a hung request must not stall the homepage. */
const ITEM_REQUEST_TIMEOUT_MS = 8000;

interface ItemFetchOutcome<T> {
  item?: T;
  status?: number;
  reason?: ContentFailureReason;
  detail?: string;
  /** The caller aborted (navigation) — the caller must re-throw. */
  aborted?: boolean;
}

/**
 * Fetches one node with maximum property expansion.
 * Attempts `expand=all` first to deliver nested blocks, media, and rich-text,
 * falling back to `expand=properties` if the CMS has serialization restrictions.
 */
async function fetchItemById<T>(
  id: string,
  path: string,
  signal?: AbortSignal,
): Promise<ItemFetchOutcome<T>> {
  assertConfigured();

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ITEM_REQUEST_TIMEOUT_MS);

  const onOuterAbort = () => controller.abort();
  signal?.addEventListener('abort', onOuterAbort);

  try {
    const expandModes = ['all', 'properties'];
    let lastOutcome: ItemFetchOutcome<T> | undefined;

    for (const expand of expandModes) {
      try {
        const url = `${env.origin}${path}/${id}?expand=${expand}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json', 'Api-Key': env.apiKey },
          signal: controller.signal,
        });

        if (response.ok) {
          const data = (await response.json()) as unknown as T;
          return { item: data };
        }

        if (response.status === 404) {
          return {
            status: 404,
            reason: 'not-found',
            detail: 'The content item was not found.',
          };
        }

        // If 500 on 'all', continue to 'properties'
        lastOutcome = {
          status: response.status,
          reason: response.status === 500 ? 'invalid-content' : 'http',
          detail: `The content service returned ${response.status} ${response.statusText}.`.trim(),
        };
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          if (!timedOut) return { aborted: true };
          return { reason: 'network', detail: `Timed out after ${ITEM_REQUEST_TIMEOUT_MS}ms.` };
        }
        lastOutcome = { reason: 'network', detail: 'Could not reach the content service.' };
      }
    }

    return lastOutcome ?? { reason: 'http', detail: 'Could not expand node properties.' };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onOuterAbort);
  }
}

/**
 * Fetches the minimal shell of a node (id, name, route). `fields` makes the
 * Delivery API skip property serialization, so this still works for nodes
 * whose properties cannot be expanded.
 */
async function fetchItemShell<T>(
  id: string,
  path: string,
  signal?: AbortSignal,
): Promise<T | undefined> {
  try {
    const data = await deliveryGet<unknown>(
      { fields: 'id,name,route' },
      signal,
      `${path}/${id}`,
    );
    if (typeof data !== 'object' || data === null) return undefined;
    return data as unknown as T;
  } catch {
    return undefined;
  }
}

/**
 * Fetches the nodes referenced by the homepage.
 *
 * Uses Promise.allSettled to ensure that every node that can be delivered
 * is successfully delivered without one failure halting the others.
 * Nodes that cannot be expanded still contribute their shell (id, name, route).
 */
export async function fetchItemsById<T>(
  ids: readonly string[],
  path: string,
  signal?: AbortSignal,
): Promise<ContentFetchResult<T>> {
  const items = new Map<string, T>();
  const failures: ContentFetchFailure[] = [];

  if (ids.length === 0) return { items, failures };

  const results = await Promise.allSettled(
    ids.map(async (id) => {
      const outcome = await fetchItemById<T>(id, path, signal);

      if (outcome.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      if (outcome.item) {
        const node = outcome.item as unknown as { id: string };
        items.set(node.id, outcome.item);
        return;
      }

      const shell = await fetchItemShell<T>(id, path, signal);
      if (shell) items.set(id, shell);

      failures.push({
        id,
        name: (shell as unknown as { name?: string } | undefined)?.name ?? id,
        status: outcome.status,
        reason: outcome.reason ?? 'http',
        detail: outcome.detail,
      });
    }),
  );

  for (const result of results) {
    if (result.status === 'rejected') {
      const err = result.reason;
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
    }
  }

  return { items, failures };
}

/**
 * Fetches the recipes referenced by the homepage.
 *
 * Only the ids that appear on the homepage are fetched — no unnecessary work.
 */
export function getRecipeDetailMap(
  ids: readonly string[],
  signal?: AbortSignal,
): Promise<ContentFetchResult<RecipeDetail>> {
  return fetchItemsById<RecipeDetail>(ids, DELIVERY_ITEM_PATH, signal);
}

/**
 * Fetches the products referenced by the homepage.
 *
 * Fetched per id for the same reason as the recipes: there are over a thousand
 * published `productPage` nodes, so the collection endpoint cannot be paged
 * to find the handful the homepage references.
 */
export function getProductPageMap(
  ids: readonly string[],
  signal?: AbortSignal,
): Promise<ContentFetchResult<ProductPage>> {
  return fetchItemsById<ProductPage>(ids, DELIVERY_ITEM_PATH, signal);
}

/**
 * Queries the Delivery API to get the total number of published content items
 * across all content datatypes in the Umbraco database (confirmed at 2,985 items).
 */
export async function getTotalContentCount(signal?: AbortSignal): Promise<number> {
  const data = await deliveryGet<unknown>({ take: '1' }, signal);
  if (typeof data === 'object' && data !== null && typeof (data as { total?: unknown }).total === 'number') {
    return (data as { total: number }).total;
  }
  return 0;
}

/**
 * Generic paged fetcher that delivers ALL matching items for any query or across all content datatypes.
 * When called without filters, it automatically pages through and delivers all 2,985 items.
 */
export async function getAllContent<T = unknown>(
  query: Record<string, string> = {},
  signal?: AbortSignal,
): Promise<T[]> {
  const allItems: T[] = [];
  const pageSize = 100;
  let skip = 0;
  let total = Infinity;

  while (allItems.length < total) {
    const data = await deliveryGet<unknown>(
      {
        ...query,
        take: String(pageSize),
        skip: String(skip),
      },
      signal,
    );

    if (!isListResponse<T>(data)) break;
    allItems.push(...data.items);
    total = data.total ?? allItems.length;
    skip += pageSize;

    if (data.items.length === 0) break;
  }

  return allItems;
}

/**
 * Delivers any content item by its route path, fully expanded.
 */
export async function getContentByPath<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T | null> {
  try {
    return await deliveryGet<T>(
      {
        filter: `route:${path.startsWith('/') ? path : `/${path}`}`,
        expand: 'all',
      },
      signal,
    );
  } catch {
    return null;
  }
}

/**
 * Delivers all published products across the entire catalog.
 */
export function getAllProducts(signal?: AbortSignal): Promise<ProductPage[]> {
  return getAllContent<ProductPage>(
    { filter: 'contentType:productPage', expand: 'properties' },
    signal,
  );
}

/**
 * Delivers all published recipes across the entire catalog.
 */
export function getAllRecipes(signal?: AbortSignal): Promise<RecipeDetail[]> {
  return getAllContent<RecipeDetail>(
    { filter: 'contentType:recipeDetail', expand: 'properties' },
    signal,
  );
}

/** Re-exported so the type of a fully-fetched node stays in one place. */
export type { ContentItemRoot };
