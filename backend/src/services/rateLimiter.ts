import { getRedisClient } from '../config/redis';
import { logger } from '../config/logger';

/**
 * Distributed Rate Limiter using Redis
 *
 * Strategy: fixed-window counter per campaign.
 * INCR + EXPIRE run in a Lua script, so check-and-increment is atomic across workers.
 *
 * Key format: rate_limit:{campaignId}:{windowTimestamp}
 *
 * Environment Variables:
 * - RATE_LIMIT_WINDOW_SECONDS: Window size in seconds (default: 60 = per minute,
 *   matching the "per minute" limit shown in the UI). Set 3600 for per-hour limits.
 */

const RATE_LIMIT_LUA = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call('INCR', key)
if current == 1 then
  redis.call('EXPIRE', key, window)
end

if current > limit then
  -- Decrement back since we exceeded limit
  redis.call('DECR', key)
  return -1
end

return current
`;

// Window size in seconds: default 60 (per minute, as shown in the UI); set 3600 for per-hour
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '60', 10);

export interface RateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  nextWindowAt: Date;
  windowSeconds: number;
}

export async function checkAndIncrementRateLimit(
  campaignId: string,
  hourlyLimit: number,
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const now = Math.floor(Date.now() / 1000);
  const windowSeconds = RATE_LIMIT_WINDOW;
  const windowTimestamp = Math.floor(now / windowSeconds);
  const key = `rate_limit:${campaignId}:${windowTimestamp}`;
  const nextWindowAt = new Date((windowTimestamp + 1) * windowSeconds * 1000);

  const result = await redis.eval(
    RATE_LIMIT_LUA,
    1,
    key,
    hourlyLimit.toString(),
    windowSeconds.toString(),
  ) as number;

  if (result === -1) {
    logger.warn('Rate limit reached', { 
      campaignId, 
      limit: hourlyLimit, 
      windowSeconds,
      nextWindowAt: nextWindowAt.toISOString(),
    });
    return { allowed: false, current: hourlyLimit, limit: hourlyLimit, nextWindowAt, windowSeconds };
  }

  logger.debug('Rate limit check passed', { 
    campaignId, 
    current: result, 
    limit: hourlyLimit,
    windowSeconds,
  });
  return { allowed: true, current: result, limit: hourlyLimit, nextWindowAt, windowSeconds };
}

export async function getCurrentRateLimitCount(
  campaignId: string,
): Promise<number> {
  const redis = getRedisClient();
  const now = Math.floor(Date.now() / 1000);
  const windowSeconds = RATE_LIMIT_WINDOW;
  const windowTimestamp = Math.floor(now / windowSeconds);
  const key = `rate_limit:${campaignId}:${windowTimestamp}`;

  const count = await redis.get(key);
  return count ? parseInt(count, 10) : 0;
}

export async function decrementRateLimit(campaignId: string): Promise<void> {
  const redis = getRedisClient();
  const now = Math.floor(Date.now() / 1000);
  const windowSeconds = RATE_LIMIT_WINDOW;
  const windowTimestamp = Math.floor(now / windowSeconds);
  const key = `rate_limit:${campaignId}:${windowTimestamp}`;
  await redis.decr(key);
}

export function getRateLimitWindowSeconds(): number {
  return RATE_LIMIT_WINDOW;
}
