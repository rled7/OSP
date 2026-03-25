import { ttlCache, redis } from './main.js';

// Benchmark: Cache vs No-Cache (x10 runs)
async function benchmark() {
  console.log('Benchmark: Cache vs Origin (10 runs each)\n');

  // Origin only (slow)
  console.time('Origin total (10x 1s sim)');
  let originTotal = 0;
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    await new Promise(r => setTimeout(r, 1000));  /* Simulate DB/API */
    originTotal += performance.now() - start;
  }
  console.timeEnd('Origin total (10x 1s sim)');
  console.log(`Origin avg: ${(originTotal/10).toFixed(0)}ms\n`);

  // With cache (1st miss, 9 hits ~1ms)
  console.time('Cache total (10x)');
  let cacheTotal = 0;
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    const data = await ttlCache('bench', async () => {
      await new Promise(r => setTimeout(r, 1000));
      return { id: i, data: 'test' };  /* Valid object for JSON */
    }, { priority: 'high' });
    cacheTotal += performance.now() - start;
  }
  console.timeEnd('Cache total (10x)');
  console.log(`Cache avg: ${(cacheTotal/10).toFixed(0)}ms`);
const speedup = ((originTotal / cacheTotal - 1) * 100).toFixed(0);
console.log(`Cache speedup: ${speedup}% (cache avg ${ (cacheTotal/10).toFixed(0) }ms vs origin avg ${ (originTotal/10).toFixed(0) }ms)`);

  // Redis stats
  console.log('\nRedis keys:');
  import('ioredis').then(({ Redis }) => {
    const redis = new Redis();
    redis.keys('*').then(console.log);
    redis.quit();
  });
}

benchmark().finally(async () => { await redis.disconnect(); process.exit(0); });

