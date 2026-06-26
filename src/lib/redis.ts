import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is not defined in the environment variables.");
}

export const redis = new Redis(redisUrl);

// Catch connection errors to prevent server crash during build time when Redis is offline
redis.on("error", (err) => {
  console.warn(`[Redis] Connection warning (expected during build/offline): ${err.message}`);
});
