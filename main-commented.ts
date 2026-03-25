import Redis from 'ioredis'; /* line 1: Import ioredis library for Redis client with full promise support, pub/sub, clustering capabilities. This is the primary Redis connection library used throughout the codebase. */

import crypto from 'crypto'; /* line 2: Import Node.js built-in crypto module for generating cryptographically secure random UUIDs. Used for collision-free cache keys. Connected to generateAutoKey function. */

import type { Request, Response, NextFunction } from 'express'; /* line 3: Import Express types for strict TypeScript typing in middleware function. Ensures ttlMiddleware has full type safety when used in Express apps. Connects to ttlMiddleware parameters. */

/* lines 5-8: Define TTLData interface - TypeScript type for options passed to dynamic TTL functions. 'priority' adjusts TTL multiplier (low=0.5x, medium=1x, high=2x for hot data). 'maxAgeSeconds' caps maximum TTL. Used by dynamicTTL, ttlCache, ttlMiddleware. */

interface TTLData {
  priority?: 'low' | 'medium' | 'high';
  maxAgeSeconds?: number;
}

/* lines 10-11: generateAutoKey function generates unique cache keys using 'auto-' prefix + crypto.randomUUID(). Returns string key safe for Redis. Called by users for unique keys. Independent but complements ttlCache key param. */

export function generateAutoKey(): string {
  return `auto-${crypto.randomUUID()}`;
}

/* lines 13-16: Global singleton Redis client instance. Config from env vars (REDIS_HOST/PORT) or defaults to localhost:6379. Exported for reuse across functions (ttlCache, cache, middleware). Connection pooled, reconnects automatically via ioredis. Used by all Redis ops. */

export const redis = new Redis({
  host: (process.env.REDIS_HOST as string) || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

/* lines 18-28: dynamicTTL core algorithm - calculates TTL based on JSON-serialized data size in KB + priority multiplier. baseTTL tiers: <1KB=3600s(1h), <10KB=1800s(30m), else 600s(10m). Logs size→TTL for observability. Called by ttlCache/middleware. 'str' temp var serializes data, 'sizeKB' computes bytes/1024, 'multipliers' object maps priority, 'ttl' final computed value capped by maxAgeSeconds. */

export function dynamicTTL(data: unknown, options: TTLData = {}): number {
  const str = JSON.stringify(data); /* Serialize to bytes for size calc. */
  const sizeKB = str.length / 1024;
  let baseTTL = sizeKB < 1 ? 3600 : sizeKB < 10 ? 1800 : 600;
  const multipliers = { low: 0.5, medium: 1, high: 2 }; /* Adaptive: Hot data longer-lived. */
  const ttl = Math.min(baseTTL * (multipliers[options.priority || 'medium'] || 1), options.maxAgeSeconds || Infinity);
  console.log(`TTL: ${sizeKB.toFixed(1)}KB → ${Math.floor(ttl)}s`);
  return Math.floor(ttl);
}

/* lines 30-42: cache function - basic fixed-TTL wrapper. Tries redis.get(key) → JSON.parse if hit. On miss/error, runs fn() (expensive op like DB call), JSON.stringify + redis.set EX ttl. Fail-open: errors bypass cache. 'cached' raw string from Redis, 'result' from fn. Connected to redis singleton. */

export async function cache(key: string, ttl: number, fn: () => Promise<unknown>): Promise<unknown> {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached); /* Cache hit: Deserialize JSON. */
    const result = await fn(); /* Miss: Execute expensive op. */
    await redis.set(key, JSON.stringify(result), 'EX', ttl); /* SETEX atomic. */
    return result;
  } catch (error) {
    console.error(`Cache error ${key}:`, error);
    return fn(); /* Fail-open. */
  }
}

/* lines 44-61: ttlCache 'hero' function - dynamic version. redis.get → parse with corruption check (del bad JSON). Miss: fn() → dynamicTTL → SETEX. Fail-open. 'cachedStr' raw Redis string, 'result' fn output feeds dynamicTTL. Uses global redis. Main API entrypoint. */

export async function ttlCache(key: string, fn: () => Promise<unknown>, options: TTLData = {}): Promise<unknown> {
  try {
    const cachedStr = await redis.get(key);
    if (cachedStr) {
      try {
        return JSON.parse(cachedStr); /* Parse w/ try-catch corrupt JSON. */
      } catch {
        await redis.del(key); /* Invalidate bad data. */
      }
    }
    const result = await fn();
    const ttl = dynamicTTL(result, options); /* Adaptive TTL. */
    await redis.set(key, JSON.stringify(result), 'EX', ttl);
    return result;
  } catch (error) {
    console.error(`Dynamic cache error ${key}:`, error);
    return fn();
  }
}

/* lines 63-89: ttlMiddleware factory - returns Express middleware fn. Async non-blocking: redis.get(key) where key=`${keyPrefix}:${id/query/default}`. Hit: res.json cached. Miss: monkey-patch res.json to ttlCache response post-handler. 'oldJson' saved original, res.locals store key/options. Connects ttlCache + global redis. */

export function ttlMiddleware(keyPrefix: string, options: TTLData = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${keyPrefix}:${(req.params as any).id || req.query.cacheKey || 'default'}`; /* Deterministic key. */
    redis.get(key).then((cachedStr) => { /* Non-blocking check. */
      if (cachedStr) {
        try {
          res.json({ fromCache: true, data: JSON.parse(cachedStr) }); /* Hit bypass. */
        } catch {
          redis.del(key); /* Self-heal. */
          next();
        }
      } else {
        const oldJson = res.json; /* Monkey-patch. */
        res.locals._cacheKey = key;
        res.locals._cacheOptions = options;
        res.json = function (data: unknown) { /* Post-handler cache. */
          ttlCache(this.locals._cacheKey!, () => Promise.resolve(data), this.locals._cacheOptions!).catch(console.error);
          return oldJson!.call(this, data); /* Chain. */
        };
        next(); /* Run handler. */
      }
    }).catch(next); /* Error → handler. */
  };
}

/* lines 91-94: SIGINT handler - graceful shutdown. Await redis.disconnect() closes connection pool. process.exit(0) clean. Global for lib usage. */

process.on('SIGINT', async () => {
  await redis.disconnect();
  process.exit(0);
});

/* EOF: All functions connected via shared 'redis' singleton + dynamicTTL called by ttlCache/middleware. cache independent but same pattern. Types strict, fail-open resilient. Used by demo/benchmark via import { ttlCache, redis }. */

