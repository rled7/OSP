import Redis from 'ioredis';
import crypto from 'crypto';
export function generateAutoKey() {
    return `auto-${crypto.randomUUID()}`;
}
export const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
});
export function dynamicTTL(data, options = {}) {
    const str = JSON.stringify(data);
    const sizeKB = str.length / 1024;
    let baseTTL = sizeKB < 1 ? 3600 : sizeKB < 10 ? 1800 : 600;
    const multipliers = { low: 0.5, medium: 1, high: 2 };
    const ttl = Math.min(baseTTL * (multipliers[options.priority || 'medium'] || 1), options.maxAgeSeconds || Infinity);
    console.log(`TTL: ${sizeKB.toFixed(1)}KB → ${Math.floor(ttl)}s`);
    return Math.floor(ttl);
}
export async function cache(key, ttl, fn) {
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
export async function ttlCache(key, fn, options = {}) {
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
export function ttlMiddleware(keyPrefix, options = {}) {
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
process.on('SIGINT', async () => {
    await redis.disconnect();
    process.exit(0);
});
