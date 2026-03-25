import { ttlCache, redis } from './main.js'; /* line 1: Import ttlCache (dynamic cache fn) and redis (singleton for disconnect). Connects demo to core library functions. */

 /* lines 3-10: demo async fn - single ttlCache call on fixed key 'user:123'. Simulates slow API with 1s Promise delay. Returns large ~5KB user object (name + 5k 'x' profile). 'high' priority for longer TTL. Logs full result. */

async function demo() {
  const user = await ttlCache('user:123', async () => {
    await new Promise(r => setTimeout(r, 1000)); /* Simulate slow fetch. */
    return { id: 123, name: 'John', profile: 'x'.repeat(5000) }; /* ~5KB JSON for TTL test. */
  }, { priority: 'high' });
  console.log('Demo result:', user); /* Log cached/fresh data. Triggers dynamicTTL log if miss. */
}

 /* line 12: Run demo async, .finally awaits redis.disconnect() (closes global connection) + process.exit(0) - prevents Node hang from open Redis socket. */

demo().finally(async () => { await redis.disconnect(); process.exit(0); });

/* EOF: Simple usage example of ttlCache. First run miss (logs TTL calc), second hit instant. Used by npm run demo/presentation. Tests dynamicTTL + cache hit. */

