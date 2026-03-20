import Redis from 'ioredis';

/**
 * Configurable Redis client
 */
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

/**
 * Dynamic TTL logic: size + priority
 */
export function dynamicTTL(data: unknown, options: { priority?: 'low' | 'medium' | 'high', maxAgeSeconds?: number } = {}): number {
  const str = JSON.stringify(data);
  const sizeKB = str.length / 1024;
  let baseTTL = sizeKB < 1 ? 3600 : sizeKB < 10 ? 1800 : 600;
  const multipliers = { low: 0.5, medium: 1, high: 2 };
  const ttl = Math.min(baseTTL * (multipliers[options.priority || 'medium'] || 1), options.maxAgeSeconds || Infinity);
  console.log(`TTL: ${sizeKB.toFixed(1)}KB → ${Math.floor(ttl)}s`);
  return Math.floor(ttl);
}

/**
 * Fixed TTL cache
 */
export async function cache<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as T;
    const result = await fn();
    await redis.set(key, JSON.stringify(result), 'EX', ttl);
    return result;
  } catch (error) {
    console.error(`Cache error ${key}:`, error);
    return fn();
  }
}

/**
 * Dynamic TTL cache
 */
export async function ttlCache<T>(key: string, fn: () => Promise<T>, options = {}): Promise<T> {
  try {
    const cachedStr = await redis.get(key);
    if (cachedStr) {
      try {
        return JSON.parse(cachedStr) as T;
      } catch {
        await redis.del(key);
      }
    }
    const result = await fn();
    const ttl = dynamicTTL(result, options);
    await redis.set(key, JSON.stringify(result), 'EX', ttl);
    return result;
  } catch (error) {
    console.error(`Dynamic cache error ${key}:`, error);
    return fn();
  }
}

/**
 * Express middleware for dynamic TTL caching
 * Usage: app.get('/user/:id', ttlMiddleware('user'), handler);
 */
export function ttlMiddleware(keyPrefix: string, options = {}) {
  return async (req: any, res: any, next: any) => {
    const key = `${keyPrefix}:${req.query.cacheKey || req.params.id || 'default'}`;
    try {
      const cachedStr = await redis.get(key);
      if (cachedStr) {
        try {
          return res.json({ fromCache: true, data: JSON.parse(cachedStr) });
        } catch {
          await redis.del(key);
        }
      }
      const originalSend = res.send.bind(res);
      res.send = (body: any) => {
        let data = body;
        if (typeof body === 'string') {
          try { data = JSON.parse(body); } catch { data = body; }
        }
        ttlCacheData(key, data, options).catch(console.error);
        originalSend(body);
      };
      next();
    } catch (error) {
      console.error('Middleware error:', error);
      next();
    }
  };
}

/**
 * Helper for caching data directly
 */
export async function ttlCacheData(key: string, data: unknown, options = {}) {
  const ttl = dynamicTTL(data, options);
  await redis.set(key, JSON.stringify(data), 'EX', ttl);
}

// Graceful shutdown
process.on('SIGINT', () => redis.disconnect());



