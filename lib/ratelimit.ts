import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

// If Redis is not configured, ratelimiters are null — callers must handle this.
export const ratelimit: Ratelimit | null = redis
    ? new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(10, "10 s"),
          analytics: true,
          prefix: "@upstash/ratelimit",
      })
    : null;

// Stricter limiter for creating tests/content
export const strictRatelimit: Ratelimit | null = redis
    ? new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(2, "60 s"),
          analytics: true,
          prefix: "@upstash/strict-ratelimit",
      })
    : null;

// Speaking scoring rate limiter — allows 5 scoring requests per 60 seconds per user.
// This prevents abuse of AI credits while allowing reasonable practice sessions.
export const speakingRatelimit: Ratelimit | null = redis
    ? new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(5, "60 s"),
          analytics: true,
          prefix: "@upstash/speaking-ratelimit",
      })
    : null;

// Daily scoring limiter — max 30 scoring attempts per day per user (resets every 24h).
// Free tier users are additionally capped by their AI credits.
export const dailyScoringRatelimit: Ratelimit | null = redis
    ? new Ratelimit({
          redis,
          limiter: Ratelimit.fixedWindow(30, "86400 s"),
          analytics: true,
          prefix: "@upstash/daily-scoring-ratelimit",
      })
    : null;
