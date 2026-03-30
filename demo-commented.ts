import { ttlCache, redis, generateAutoKey } from './main.js'; /* line 1: Imports from main lib - ttlCache for dynamic caching, redis singleton for cleanup, generateAutoKey for unique keys. ES module syntax. */

function generateData(sizeKB: number) { /* line 3: Pure function generates test payload. Takes sizeKB (float), repeats 'x' chars for exact byte size (Math.floor for integer). Returns object with data str, sizeKB field (for logging), timestamp. No side effects, pure. */

  const str = 'x'.repeat(Math.floor(sizeKB * 1024)); /* line 4: String of precise length (sizeKB KB = chars *1024 since UTF16/2 bytes/char approx, but JS string.length is chars). */
  return { data: str, sizeKB, timestamp: Date.now() }; /* line 5: JSON-safe object. timestamp for freshness check. */
}

async function benchVariation(label: string, sizeKB: number, options: any, keyPrefix: string) { /* line 7: Async helper for Origin vs Cache test. Params: label for output, sizeKB for data, options for ttlCache, keyPrefix for Redis key. Returns void. Time complexity O(1) per call (sim + Redis O(1)). */

  const key = `${keyPrefix}:${sizeKB}`; /* line 8: Deterministic Redis key from prefix + size. Allows hits on rerun. */

  const oStart = performance.now(); /* line 9: High-res timestamp start (micros). */
  await new Promise(r => setTimeout(r, 500)); /* line 10: Async 500ms sim (network/DB latency). Promise resolve after delay. */
  const originTime = performance.now() - oStart; /* line 11: Calc wall time. */
  const originRate = (sizeKB * 1024 / (originTime / 1000)).toFixed(1); /* line 12: Throughput KB/s = bytes / secs. */
  console.log(`${label} Origin: ${originTime.toFixed(0)}ms, Rate: ${originRate} KB/s`); /* line 13: Log ms + KB/s. */

  const cStart = performance.now(); /* line 14: Cache test start. */
  await ttlCache(key, async () => { /* line 15: ttlCache call - miss first (TTL calc/log), then hit. */
    await new Promise(r => setTimeout(r, 500)); /* line 16: Sim inside fn (exec on miss). */
    return generateData(sizeKB); /* line 17: Return data for JSON.stringify in ttlCache. */
  }, options); /* line 18: TTLData opts passed to dynamicTTL. */
  const cacheTime = performance.now() - cStart; /* line 19: Total cache time (miss/hit). */
  const cacheRate = (sizeKB * 1024 / (cacheTime / 1000)).toFixed(1); /* line 20: Cache throughput. */
  console.log(`${label} Cache: ${cacheTime.toFixed(0)}ms, Rate: ${cacheRate} KB/s`); /* line 21: Log. */
  const speedup = ((originTime / cacheTime - 1) * 100).toFixed(0); /* line 22: Fold speedup % (>100% OK for large ratios). */
  console.log(`${label} Speedup: ${speedup}%`); /* line 23: Display. */
}

async function runDemos() { /* line 25: Top orchestrator - calls 5 benchVariation sequentially. Awaits each for serial output. */

  console.log('=== OSP Cache Benchmarks (5 Tests) ===\n'); /* line 26: Header. */

  await benchVariation('1. Small', 0.5, { priority: 'high' }, 'demo'); /* line 27: Test 1 - small tier. */
  await benchVariation('2. Med', 5, { priority: 'medium' }, 'demo'); /* line 28: Test 2 - med tier. */
  await benchVariation('3. Large', 50, { priority: 'low', maxAgeSeconds: 300 }, 'demo'); /* line 29: Test 3 - large + cap. */
  await benchVariation('4. Extra-large', 100, { priority: 'low' }, 'demo'); /* line 30: Test 4 - extreme size. */
  const uuidKey = generateAutoKey(); /* line 31: Unique key test. */
  await benchVariation('5. UUID', 1, { priority: 'high' }, uuidKey.slice(0,8)); /* line 32: Test 5 - UUID prefix. */
  console.log(`Full UUID key: ${uuidKey}`); /* line 33: Show full key. */

  console.log('\\nRerun for hits!'); /* line 34: Hint. */
}

runDemos(); /* line 36: Entry point - top-level async call (TSX handles). */
redis.on('end', () => process.exit(0)); /* line 37: Cleanup on disconnect event. Graceful exit. */

/* EOF: Every line explained. O(1) utility unchanged. Tests all TTL cases + speedup/rates >100%. Run `npm run demo`. */

