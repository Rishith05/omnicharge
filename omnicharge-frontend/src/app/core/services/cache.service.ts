import { Injectable } from '@angular/core';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * CacheService wraps sessionStorage for API response caching.
 * Data is NOT fetched from API on every component load — only when:
 *   1. The cache entry doesn't exist
 *   2. The TTL has expired
 *   3. The caller explicitly requests a refresh (forceRefresh = true)
 */
@Injectable({ providedIn: 'root' })
export class CacheService {
  private memoryCache = new Map<string, CacheEntry<any>>();

  /**
   * Get cached data if available and not expired.
   * Checks in-memory first, then sessionStorage.
   */
  get<T>(key: string): T | null {
    // 1. Check in-memory cache (fastest)
    const memEntry = this.memoryCache.get(key);
    if (memEntry && !this.isExpired(memEntry)) {
      return memEntry.data as T;
    }

    // 2. Check sessionStorage
    try {
      const stored = sessionStorage.getItem(`omni_cache_${key}`);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        if (!this.isExpired(entry)) {
          // Restore to memory cache
          this.memoryCache.set(key, entry);
          return entry.data;
        }
        // Expired — remove from sessionStorage
        sessionStorage.removeItem(`omni_cache_${key}`);
      }
    } catch {
      // Corrupt data — ignore
    }

    return null;
  }

  /**
   * Store data in both memory and sessionStorage with TTL (in milliseconds).
   * Default TTL: 5 minutes (300000ms)
   */
  set<T>(key: string, data: T, ttlMs: number = 300000): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    };

    this.memoryCache.set(key, entry);

    try {
      sessionStorage.setItem(`omni_cache_${key}`, JSON.stringify(entry));
    } catch {
      // SessionStorage full or unavailable — memory cache still works
    }
  }

  /** Invalidate a specific cache key */
  invalidate(key: string): void {
    this.memoryCache.delete(key);
    try {
      sessionStorage.removeItem(`omni_cache_${key}`);
    } catch {
      /* ignore */
    }
  }

  /** Invalidate all cache entries matching a prefix */
  invalidateByPrefix(prefix: string): void {
    // Memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }

    // SessionStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(`omni_cache_${prefix}`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  }

  /** Clear all cache */
  clearAll(): void {
    this.memoryCache.clear();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('omni_cache_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }
}
