/**
 * API Cache Utility
 * 
 * Provides simple in-memory caching for API responses.
 * Helps with offline mode and reduces redundant API calls.
 * Works on both web and mobile.
 */

import logger from '@/utils/logger';

class APICache {
  constructor() {
    this.cache = new Map();
    this.cacheDurations = new Map();
  }

  /**
   * Generate cache key from URL and params
   */
  generateKey(url, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return sortedParams ? `${url}?${sortedParams}` : url;
  }

  /**
   * Store data in cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} duration - Cache duration in milliseconds (default: 5 minutes)
   */
  set(key, data, duration = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + duration
    });
    this.cacheDurations.set(key, duration);
  }

  /**
   * Get data from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null if expired/not found
   */
  get(key) {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      this.cacheDurations.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Check if key exists and is valid
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Invalidate (remove) a cache entry
   */
  invalidate(key) {
    this.cache.delete(key);
    this.cacheDurations.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
    this.cacheDurations.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
        this.cacheDurations.delete(key);
      }
    }
  }

  /**
   * Get cache size
   */
  get size() {
    return this.cache.size;
  }
}

// Export singleton instance
export const apiCache = new APICache();

// Clear expired entries every 10 minutes
setInterval(() => {
  apiCache.clearExpired();
}, 10 * 60 * 1000);

/**
 * Fetch with cache wrapper
 * 
 * Example usage:
 * const data = await cachedFetch('/api/providers', {}, 5 * 60 * 1000);
 */
export async function cachedFetch(url, options = {}, cacheDuration = 5 * 60 * 1000) {
  const cacheKey = apiCache.generateKey(url, options.params || {});
  
  // Return cached data if available
  const cached = apiCache.get(cacheKey);
  if (cached) {
    logger.log(`[Cache] Hit: ${cacheKey}`);
    return cached;
  }

  // Fetch fresh data
  logger.log(`[Cache] Miss: ${cacheKey}`);
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // Cache the response
    apiCache.set(cacheKey, data, cacheDuration);
    
    return data;
  } catch (error) {
    logger.error(`[Cache] Fetch error for ${url}:`, error);
    throw error;
  }
}

export default apiCache;
