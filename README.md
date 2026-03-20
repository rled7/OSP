# OSP: Advanced TypeScript Redis Cache with Dynamic TTL Middleware

Lightweight, promise-aware caching library with **dynamic TTL** based on data size/priority and **Express middleware** support.

A lightweight, promise-aware caching utility built with TypeScript and Redis. This utility provides a simple wrapper function to cache the results of any async operation.

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

## Setup and Installation

1.  Clone or download the project files into a directory.
2.  Navigate to the project directory in your terminal.
3.  Initialize a Node.js project:
    ```bash
    npm init -y
    ```
4.  Install the necessary dependencies:

    **Production Dependency:**

    ```bash
    npm install ioredis
    ```

    **Development Dependencies:**

    ```bash
    npm install -D typescript @types/node
    ```

## Quick Start

**1. Install & start Redis:**

```
brew install redis
brew services start redis
```

**2. Run:**

```
npm run dev  # Library watch mode (no demo)
npm run demo # Runs dynamic TTL demo
npm start    # Production built version

**Output:**

```

TTL: 5.2KB → 3600s
Fetching data... (cache miss)
Demo: { id: 123, ... }

````

## API

### `dynamicTTL(data, { priority, maxAgeSeconds })`

Computes TTL based on JSON size + priority.

### `ttlCache(key, fn, options)`

Dynamic TTL cache wrapper.

### `ttlMiddleware(keyPrefix, options)`

**Express middleware** - caches route responses.

Example:

```typescript
app.get(
  "/user/:id",
  ttlMiddleware("user", { priority: "high" }),
  (req, res) => {
    res.json(expensiveCompute(req.params.id));
  },
);
````

The `cache` function accepts three arguments:

- `key` (string): A unique key to identify the cached data in Redis.
- `ttl` (number): The "time-to-live" in seconds for how long the data should be cached.
- `fn` (function): The async function to execute if the data is not found in the cache. This function should return a promise.

### Example

Here is how you might use the utility in a file like `app.ts`:

```typescript
// app.ts
import { cache, redis } from "./main";

// A function that fetches data from a slow source (e.g., a database)
async function getProduct(productId: string) {
  console.log("Fetching product from database...");
  // Your actual database logic would go here
  return { id: productId, name: "A Great Product" };
}

async function handleRequest() {
  const productId = "abc-123";
  const product = await cache(`product:${productId}`, 3600, () =>
    getProduct(productId),
  );

  console.log("Final product:", product);

  // Gracefully disconnect the Redis client when your application shuts down
  redis.disconnect();
}

handleRequest();
```

## Building the Code

This project uses TypeScript. To compile the `.ts` files into JavaScript, run the TypeScript compiler (`tsc`). A `tsconfig.json` file is included with the correct settings.

```bash
npx tsc
```

This command will compile the files from the root directory and place the output `.js` files in the `dist/` directory.

## Running the Project

Since the `main.ts` file is now a library, running it directly will do nothing. To run the example code shown in the "Usage" section, you would save it as `app.ts`, compile it, and then run it with Node.js:

1.  **Compile:**
    ```bash
    npx tsc
    ```
2.  **Run:**
    ```bash
    node dist/app.js
    ```
