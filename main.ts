import Redis from 'ioredis';
import crypto from 'crypto';

/**
 * Generates unique auto-key (UUID v4)
 */
export function generateAutoKey(): string {
  return `auto-${crypto.randomUUID()}`;
}

/**
 * Configurable Redis client
 */
export const redis
