import { ttlCache, redis } from './main.js'; /* line 1: Import ttlCache function and redis singleton from main library. ttlCache provides dynamic caching, redis for final stats/disconnect. Connects benchmark to core lib. */

 /* lines 4-5: benchmark async main function - runs two loops: origin (no cache) vs cache. Logs timings with console.time for totals, performance.now for precision ms. Uses let totals for sum durations. */

async function benchmark() {
  console.log('Benchmark: Cache vs Origin (10 runs each)\n'); /* line 6: Header log. */

  /* lines 8-15: Origin loop - simulates 10x slow DB/API calls with 1s setTimeout Promise. 'start' timestamp before/after each, 'originTotal' accumulates ms deltas. console.time wraps for total wall time. No cache - baseline. 'i' loop counter unused beyond iterations. */

  console.time('Origin total (10x 1s sim)');
  let originTotal = 0;
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    await new Promise(r => setTimeout(r, 1000));  /* Simulate DB/API */
    originTotal += performance.now() - start;
  }
  console.timeEnd('Origin total (10x 1s sim)');
  console.log(`Origin avg: ${(originTotal/10).toFixed(0)}ms\n`); /* line 16: Avg calc/log (total/10). */

  /* lines 18-31: Cache loop - 10x ttlCache('bench', slow fn, high priority). First miss (runs fn 1s), next 9 hits (~1ms Redis). 'cacheTotal' accumulates. Uses same performance.now. fn returns JSON-safe object. key 'bench' fixed for hits. data var unused beyond await. */

  console.time('Cache total (10x)');
  let cacheTotal = 0;
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    const data = await ttlCache('bench', async () => {
      await new Promise(r => setTimeout(r, 1000));
      return { id: i, data: 'test' };  /* Valid JSON object */
    }, { priority: 'high' });
    cacheTotal += performance.now() - start;
  }
  console.timeEnd('Cache total (10x)');
  console.log(`Cache avg: ${(cacheTotal/10).toFixed(0)}ms`);
  /* lines 32-33: Speedup calc ((originTotal/cacheTotal -1)*100)% - fold speedup (>100% capable). Logs with avgs for context. */

  const speedup = ((originTotal / cacheTotal - 1) * 100).toFixed(0);
  console.log(`Cache speedup: ${speedup}% (cache avg ${(cacheTotal/10).toFixed(0)}ms vs origin avg ${(originTotal/10).toFixed(0)}ms)`);

  /* lines 36-42: Redis stats - dynamic import ioredis to list keys('*') without main lib conflict. New local Redis client (not global). .quit() closes. Logs active keys like 'user:123', 'bench'. */

  console.log('\nRedis keys:');
  import('ioredis').then(({ Redis }) => {
    const redis = new Redis();
    redis.keys('*').then(console.log);
    redis.quit();
  });
}

 /* line 45: Call benchmark async, .finally always runs redis.disconnect() (global from main) + process.exit(0) - ensures no hang from open connection. */

benchmark().finally(async () => { await redis.disconnect(); process.exit(0); });

/* EOF: benchmark tests ttlCache performance vs raw sim. Global redis shared. Output used in README. Runs via npm run bench/presentation. */

