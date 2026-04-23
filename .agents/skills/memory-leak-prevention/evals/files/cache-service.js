const EventEmitter = require('events');

// Global cache object - bounded LRU
const globalCache = new Map();
const MAX_GLOBAL_CACHE_SIZE = 500;

// Global counter for debugging
let globalRequestCount = 0;

// Event emitter for application events
const appEvents = new EventEmitter();

const MAX_LOCAL_CACHE_SIZE = 100;

class CacheService {
  constructor() {
    this.cache = new Map();
    this.hitCount = 0;
    this.missCount = 0;
    
    this.onInvalidate = (key) => {
      this.cache.delete(key);
    };

    // Add listener on every instance creation
    appEvents.on('cache-invalidate', this.onInvalidate);
  }
  
  get(key) {
    globalRequestCount++;
    
    if (this.cache.has(key)) {
      this.hitCount++;
      const value = this.cache.get(key);
      // Refresh order for LRU: delete and re-set to move to the end
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    
    this.missCount++;
    return null;
  }

  destroy() {
    appEvents.removeListener('cache-invalidate', this.onInvalidate);
    this.cache.clear();
  }
  
  set(key, value) {
    // Implement LRU for local cache
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= MAX_LOCAL_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);

    // Implement LRU for global cache
    if (globalCache.has(key)) {
      globalCache.delete(key);
    } else if (globalCache.size >= MAX_GLOBAL_CACHE_SIZE) {
      const oldestKey = globalCache.keys().next().value;
      globalCache.delete(oldestKey);
    }
    globalCache.set(key, value);
  }
  
  // Simulate expensive operation
  async fetchAndCache(key, fetchFn) {
    const existing = this.get(key);
    if (existing) return existing;
    
    const value = await fetchFn();
    this.set(key, value);
    return value;
  }
  
  getStats() {
    return {
      size: this.cache.size,
      hits: this.hitCount,
      misses: this.missCount,
      globalCacheSize: globalCache.size,
      globalRequests: globalRequestCount,
      listenerCount: appEvents.listenerCount('cache-invalidate')
    };
  }
}

// Create multiple instances - each adds another listener!
const cache1 = new CacheService();
const cache2 = new CacheService();
const cache3 = new CacheService();

module.exports = { CacheService, appEvents, globalCache };
