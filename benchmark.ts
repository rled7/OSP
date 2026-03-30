import { ttlCache, redis } from './main.js';

function generateData(sizeKB: number) {
  const str = 'x'.repeat(sizeKB * 1024);
  return { data: str, sizeKB, id: Math.random() };
}

async function benchmark() {
  console.log('Benchmark: OSP Cache vs Origin (Transfer Rates)\\n');

  const SIZES = [0.5, 5, 10, 50];
  const RUNS = 5;

  for (const sizeKB of SIZES) {
    const key = `bench:${sizeKB}KB`;
    console.log(`\\n--- ${sizeKB}KB Data ---`);

    // Origin (slow)
    console.time(`Origin-${sizeKB}KB`);
    let originTotal = 0;
    for (let i = 0; i < RUNS; i++) {
      const start = performance.now();
      await new Promise(r => setTimeout(r, 1000));
      originTotal += performance.now() - start;
    }
    console.timeEnd(`Origin-${sizeKB}KB`);
    const originRate = (sizeKB * 1024 * RUNS / (originTotal / 1000)).toFixed(1); /* KB/s */
    console.log(`Origin avg: ${(originTotal/RUNS).toFixed(0)}ms, Rate: ${originRate} KB/s`);

    // Cache
    console.time(`Cache-${sizeKB}KB`);
    let cacheTotal = 0;
    for (let i = 0; i < RUNS; i++) {
      const start = performance.now();
      await ttlCache(key, () => Promise.resolve(generateData(sizeKB)), { priority: 'medium' });
      cacheTotal += performance.now() - start;
    }
    console.timeEnd(`Cache-${sizeKB}KB`);
    const cacheRate = (sizeKB * 1024 * RUNS / (cacheTotal / 1000)).toFixed(1);
    console.log(`Cache avg: ${(cacheTotal/RUNS).toFixed(0)}ms, Rate: ${cacheRate} KB/s`);
    const speedup = ((originTotal / cacheTotal - 1) * 100).toFixed(0);
    console.log(`Speedup: ${speedup}%`);
  }

  console.log('\\nKeys:');
  const { Redis } = await import('ioredis');
  const tempRedis = new Redis();
  const keys = await tempRedis.keys('*');
  console.log(keys);
  tempRedis.quit();
}

benchmark().finally(async () => {
  await redis.disconnect();
  process.exit(0);
});
