import { ttlCache, redis, generateAutoKey } from './main.js';

function generateData(sizeKB: number) {
  const str = 'x'.repeat(Math.floor(sizeKB * 1024));
  return { data: str, sizeKB, timestamp: Date.now() };
}

async function benchVariation(label: string, sizeKB: number, options: any, keyPrefix: string) {
  const key = `${keyPrefix}:${sizeKB}`;
  const oStart = performance.now();
  await new Promise(r => setTimeout(r, 500));
  const originTime = performance.now() - oStart;
  const originRate = (sizeKB * 1024 / (originTime / 1000)).toFixed(1);
  console.log(`${label} Origin: ${originTime.toFixed(0)}ms, Rate: ${originRate} KB/s`);

  const cStart = performance.now();
  await ttlCache(key, async () => {
    await new Promise(r => setTimeout(r, 500));
    return generateData(sizeKB);
  }, options);
  const cacheTime = performance.now() - cStart;
  const cacheRate = (sizeKB * 1024 / (cacheTime / 1000)).toFixed(1);
  console.log(`${label} Cache: ${cacheTime.toFixed(0)}ms, Rate: ${cacheRate} KB/s`);
  const speedup = ((originTime / cacheTime - 1) * 100).toFixed(0);
  console.log(`${label} Speedup: ${speedup}%`);
}

async function runDemos() {
  console.log('=== OSP Cache Benchmarks (5 Tests) ===\n');

  await benchVariation('1. Small', 0.5, { priority: 'high' }, 'demo');
  await benchVariation('2. Med', 5, { priority: 'medium' }, 'demo');
  await benchVariation('3. Large', 50, { priority: 'low', maxAgeSeconds: 300 }, 'demo');
  await benchVariation('4. Extra-large', 100, { priority: 'low' }, 'demo');
  const uuidKey = generateAutoKey();
  await benchVariation('5. UUID', 1, { priority: 'high' }, uuidKey.slice(0,8));
  console.log(`Full UUID key: ${uuidKey}`);

  console.log('\\nRerun for hits!');
}

runDemos();
redis.on('end', () => process.exit(0));
