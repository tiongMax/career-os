import { createClient, type RedisClientType } from "redis";

export interface RedisConnection {
  readonly client: RedisClientType;
  ping(): Promise<void>;
  close(): Promise<void>;
}

export async function createRedisConnection(
  redisUrl: string,
  onError: (error: Error) => void,
): Promise<RedisConnection> {
  const client = createClient({ url: redisUrl });
  client.on("error", onError);
  await client.connect();

  return {
    client,
    async ping() {
      await client.ping();
    },
    async close() {
      if (client.isOpen) {
        await client.close();
      }
    },
  };
}
