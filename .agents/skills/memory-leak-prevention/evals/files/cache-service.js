const EventEmitter = require('events');

// Global cache object - grows unbounded!
const globalCache = {};

// Global counter for debugging
let globalRequestCount = 0;

// Event emitter for application events
const appEvents = new EventEmitter();

class CacheService {
  constructor() {
    this.cache = {};
    this.hitCount = 0;
    this.missCount = 0;
    
    // Add listener on every instance creation - never removed!
    appEvents.on('cache-invalidate', (key) => {
      delete this.cache[key];
    });
  }
  
  get(key) {
    globalRequestCount++;
    
    if (this.cache[key]) {
      this.hitCount++;
      return this.cache[key];
    }
    
    this.missCount++;
    return null;
  }
  
  set(key, value) {
    // BUG: No limit on cache size - will grow forever!
    this.cache[key] = value;
    globalCache[key] = value;
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
      size: Object.keys(this.cache).length,
      hits: this.hitCount,
      misses: this.missCount,
      globalCacheSize: Object.keys(globalCache).length,
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
