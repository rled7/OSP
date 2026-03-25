/* dist/main.js - Compiled main.ts (tsc output). This is the production JavaScript bundle. Lines correspond roughly to main.ts source. Comments added for technical explanation. Note: TS types erased, runtime JS. All async preserved. */

import Redis from 'ioredis'; /* line 1: ioredis runtime import - Redis client with promise support. */

import crypto from 'crypto'; /* line 2: Node crypto - randomUUID for keys. */

export function generateAutoKey() { /* lines 3-4: generateAutoKey - returns 'auto-' + UUID string. Runtime identical to source. */
    return `auto-${crypto.randomUUID()}`;
}

export const redis = new Redis({ /* lines 6-9: Global redis client - env host/port or default. Singleton used by all functions. Connection stays open until disconnect. */
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
});

export function dynamicTTL(data, options = {}) { /* lines 11-20: dynamicTTL - size-based TTL calc. JSON.stringify to 'str', sizeKB = bytes/1024. baseTTL tiers, multipliers object, ttl computed/capped/logged. Called by ttlCache. */
    const str = JSON.stringify(data);
    const sizeKB = str.length / 1024;
    let baseTTL = sizeKB < 1 ? 3600 : sizeKB < 10 ? 1800 : 600;
    const multipliers = { low: 0.5, medium: 1, high: 2 };
    const ttl = Math.min(baseTTL * (multipliers[options.priority || 'medium'] || 1), options.maxAgeSeconds || Infinity);
    console.log(`TTL: ${sizeKB.toFixed(1)}KB → ${Math.floor(ttl)}s`);
    return Math.floor(ttl);
}

export async function cache(key, ttl, fn) { /* lines 22-32: cache fixed TTL. await redis.get → JSON.parse hit. Miss: fn() → stringify → redis.set EX. Catch: fn() bypass. Uses global redis. */
    try {
        const cached = await redis.get(key);
        if (cached)
            return JSON.parse(cached);
        const result = await fn();
        await redis.set(key, JSON.stringify(result), 'EX', ttl);
        return result;
    }
    catch (error) {
        console.error(`Cache error ${key}:`, error);
        return fn();
    }
}

export async function ttlCache(key, fn, options = {}) { /* lines 34-48: ttlCache dynamic. redis.get → parse or del corrupt. Miss: fn → dynamicTTL → set EX. Catch bypass. Core function, calls dynamicTTL + redis. */
    try {
        const cachedStr = await redis.get(key);
        if (cachedStr) {
            try {
                return JSON.parse(cachedStr);
            }
            catch {
                await redis.del(key);
            }
        }
        const result = await fn();
        const ttl = dynamicTTL(result, options);
        await redis.set(key, JSON.stringify(result), 'EX', ttl);
        return result;
    }
    catch (error) {
        console.error(`Dynamic cache error ${key}:`, error);
        return fn();
    }
}

export function ttlMiddleware(keyPrefix, options = {}) { /* lines 50-68: ttlMiddleware - returns middleware fn. key from params/query. redis.get async then: hit res.json cached, miss patch res.json to ttlCache post-handler. Uses res.locals for state, oldJson chained. Calls ttlCache/redis. */
    return (req, res, next) => {
        const key = `${keyPrefix}:${req.params.id || req.query.cacheKey || 'default'}`;
        redis.get(key).then((cachedStr) => {
            if (cachedStr) {
                try {
                    res.json({ fromCache: true, data: JSON.parse(cachedStr) });
                }
                catch {
                    redis.del(key);
                    next();
                }
            }
            else {
                const oldJson = res.json;
                res.locals._cacheKey = key;
                res.locals._cacheOptions = options;
                res.json = function (data) {
                    ttlCache(this.locals._cacheKey, () => Promise.resolve(data), this.locals._cacheOptions).catch(console.error);
                    return oldJson.call(this, data);
                };
                next();
            }
        }).catch(next);
    };
} 

process.on('SIGINT', async () => { /* lines 70-73: Global SIGINT handler - Ctrl+C → await redis.disconnect (closes pool), process.exit(0). For long-running npm start/dev. */

    await redis.disconnect();
    process.exit(0);
});

/* EOF: Compiled lib - all exports runtime-ready. global redis connects everything. Run via npm start after tsc build. No TS types, pure JS for Node. */

