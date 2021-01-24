import redis from "redis";

const REDIS_PORT = parseInt(process.env.REDIS_PORT) || 6379;

const client = redis.createClient(REDIS_PORT);

export default client;
