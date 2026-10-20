let Redis;
try {
  Redis = require('ioredis');
} catch (e) {
  // ioredis optional fallback
}

/**
 * PCL Cache Factory
 * 
 * MOCK MODE (default, zero external dependencies):
 *   REDIS_URL not set or not a redis:// URL → returns a Map()-backed in-process cache
 *   Works in: local dev, unit tests, CI
 *
 * LIVE MODE (activate by setting REDIS_URL):
 *   REDIS_URL=redis://... or rediss://... → returns an ioredis-backed shared cache
 *   Works in: staging, production, multi-replica Kubernetes
 */
function createCache() {
  const redisUrl = process.env.REDIS_URL;
  const isLive = redisUrl && (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://'));

  if (isLive && Redis) {
    console.log('[cache] MODE=live using Redis:', redisUrl.replace(/:[^:@]+@/, ':***@'));
    const client = new Redis(redisUrl, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    client.on('error', (err) => console.error('[cache] Redis error:', err.message));

    return {
      async get(key) {
        try {
          const val = await client.get(key);
          return val ? JSON.parse(val) : null;
        } catch (err) {
          console.warn('[cache] Redis get failed, falling back to null:', err.message);
          return null;
        }
      },
      async set(key, value, ttlMs) {
        try {
          if (ttlMs) {
            await client.set(key, JSON.stringify(value), 'PX', ttlMs);
          } else {
            await client.set(key, JSON.stringify(value));
          }
        } catch (err) {
          console.warn('[cache] Redis set failed:', err.message);
        }
      },
      async del(key) {
        try {
          await client.del(key);
        } catch (err) {
          console.warn('[cache] Redis del failed:', err.message);
        }
      },
      async clear() {
        try {
          await client.flushdb();
        } catch (err) {
          console.warn('[cache] Redis clear failed:', err.message);
        }
      },
      async keys(pattern) {
        try {
          return await client.keys(pattern);
        } catch (err) {
          return [];
        }
      },
      _mode: 'live',
      _client: client,
    };
  }

  // MOCK MODE — in-process Map with TTL expiration, zero external dependencies
  console.log('[cache] MODE=mock using in-process Map (set REDIS_URL for Redis)');
  const store = new Map();

  return {
    async get(key) {
      const item = store.get(key);
      if (!item) return null;
      if (item.expiry && Date.now() > item.expiry) {
        store.delete(key);
        return null;
      }
      return item.value;
    },
    async set(key, value, ttlMs) {
      store.set(key, { value, expiry: ttlMs ? Date.now() + ttlMs : null });
    },
    async del(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    async keys(pattern) {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      return [...store.keys()].filter((k) => regex.test(k));
    },
    _mode: 'mock',
  };
}

module.exports = { createCache };
