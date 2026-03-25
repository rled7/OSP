# OSP: Advanced TypeScript Redis Cache with Dynamic TTL Middleware

Lightweight, promise-aware caching library built with TypeScript and Redis. This utility provides a simple wrapper function to cache the results of any async operation.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js**: [Download and install Node.js](https://nodejs.org/) (which includes npm).
- **Redis**: The caching utility requires a running Redis server.

### Installing Redis on macOS (using Homebrew)

If you are on macOS and have [Homebrew](https://brew.sh/) installed, you can easily install and start Redis:

```bash
# Install Redis
brew install redis

# Start the Redis service
brew services start redis
```

For other operating systems, please refer to the [official Redis installation guide](https://redis.io/docs/getting-started/installation/).

To verify that Redis is running, you can use the command `redis-cli ping`. It should respond with `PONG`.

## Setup (Already Done)

- `npm install` ✅
- Redis running ✅

## Quick Start

**1. Install & start Redis:**

```
brew install redis
brew services start redis
```

**2. Run:**

```
npm run dev  # Library watch mode
npm run demo # Dynamic TTL demo
npm start    # Prod built version (after npm run build)
```

**Sample Output:**

```
TTL: 5.2KB → 3600s
Demo result: { id: 123, ... }
```

## API

### `dynamicTTL(data, { priority, maxAgeSeconds })`

Computes TTL based on JSON size + priority.

### `ttlCache(key, fn, options)`

Dynamic TTL cache wrapper.

### `ttlMiddleware(keyPrefix, options)`

**Express middleware** - caches route responses.

Example:

```typescript
app.get("/user/:id", ttlMiddleware("user", { priority: "high" }), (req, res) =>
  res.json(expensiveCompute(req.params.id)),
);
```

### `cache(key, ttl, fn)`

The `cache` function accepts three arguments:

- `key` (string): Unique Redis key.
- `ttl` (number): Time-to-live seconds.
- `fn` (async function): Expensive op to cache.

Example:

```typescript
const product = await cache(`product:${productId}`, 3600, () =>
  getProduct(productId),
);
```

## Building the Code

This project uses TypeScript. To compile:

```bash
npx tsc  # → dist/
```

## Building & Scripts (All Available)

| Script                 | Purpose                                     |
| ---------------------- | ------------------------------------------- |
| `npm run build`        | `tsc` → dist/                               |
| `npm run dev`          | `tsx watch main.ts` (interactive watch)     |
| `npm run demo`         | Dynamic TTL test                            |
| `npm run bench`        | Speed comparison (100000% speedup example)  |
| `npm run start`        | `node dist/main.js` (lib after build)       |
| `npm run presentation` | Full demo: install+build+demo+bench+cleanup |

## Benchmark Results

```
Origin avg: 1001ms
Cache avg: 1ms
Speedup: 100000% (1000x faster)
```

## Updates & Enhancements (Added)

- Line-by-line comments (`*-commented.ts`).
- Hang fixes, speedup math >100%.
- All scripts verified.

## License

ISC
