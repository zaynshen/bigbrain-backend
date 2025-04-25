import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  await redis.set("vercel_test", "hello redis!");
  const value = await redis.get("vercel_test");

  res.status(200).json({ message: "Redis working!", value });
}
