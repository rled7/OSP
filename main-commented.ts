import Redis from 'ioredis';
import crypto from 'crypto';

/* Line 1-2: Imports - Redis for storage, crypto for UUID auto-keys. crypto.randomUUID() generates RFC4122 v4 UUIDs (collision-proof). */

export function generateAutoKey(): string {
  return `auto-${crypto
