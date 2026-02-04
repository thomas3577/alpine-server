interface CacheEntry {
  path: string;
  content: Uint8Array;
  contentType: string;
  headers: Headers;
}

export class VendorCache {
  #memoryCache = new Map<string, CacheEntry>();

  get(path: string): CacheEntry | null {
    return this.#memoryCache.get(path) || null;
  }

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

  async getOrFetch(url: string): Promise<CacheEntry> {
    const cached = this.get(url);
    if (cached) {
      return cached;
    }

    return await this.fetch(url);
  }
}

export const vendorCache = new VendorCache();
