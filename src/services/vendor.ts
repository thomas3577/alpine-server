interface CacheEntry {
  path: string;
  content: Uint8Array;
  contentType: string;
  headers: Headers;
}

/**
 * In-memory cache for vendor CDN assets.
 */
export class VendorCache {
  #memoryCache = new Map<string, CacheEntry>();

  /**
   * Returns a cached entry for a URL when available.
   *
   * @param {string} path Vendor URL key.
   *
   * @returns {CacheEntry | null} Cached entry or null if not found.
   */
  get(path: string): CacheEntry | null {
    return this.#memoryCache.get(path) || null;
  }

  /**
   * Fetches a vendor asset from CDN and caches it in memory.
   *
   * @param {string} url Vendor CDN URL.
   *
   * @returns {Promise<CacheEntry>} Cached entry or newly fetched entry.
   */
  async fetch(url: string): Promise<CacheEntry> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`CDN fetch failed: ${response.status} ${response.statusText}`);
    }

    const content = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    const entry: CacheEntry = {
      path: url,
      content,
      contentType,
      headers: new Headers({
        'content-type': contentType,
        'cache-control': 'public, max-age=31536000, immutable',
      }),
    };

    // Save to memory cache
    this.#memoryCache.set(url, entry);

    return entry;
  }

  /**
   * Reads a vendor asset from cache or fetches and stores it.
   *
   * @param {string} url Vendor CDN URL.
   *
   * @returns {Promise<CacheEntry>} Cached entry or newly fetched entry.
   */
  async getOrFetch(url: string): Promise<CacheEntry> {
    const cached = this.get(url);
    if (cached) {
      return cached;
    }

    return await this.fetch(url);
  }
}

/** Shared vendor cache instance used by vendor middleware/routes. */
export const vendorCache = new VendorCache();
