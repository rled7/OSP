import { ttlCache, redis } from './main.js';

async function demo() {
  const user = await ttlCache('user:123', async () => {
    await new Promise(r => setTimeout(r, 1000));
    return { id: 123, name: 'John', profile: 'x'.repeat(5000) };
  }, { priority: 'high' });
  console.log('Demo result:', user);
}

demo().finally(async () => { await redis.disconnect(); process.exit(0); });

