import { spawn } from "node:child_process";
import net from "node:net";

try {
  process.loadEnvFile(".env");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const services = [
  endpoint("PostgreSQL", process.env.DATABASE_URL),
  endpoint("Redis", process.env.REDIS_URL),
];

const readiness = await Promise.all(
  services.map(({ host, port }) => canConnect(host, port)),
);

if (readiness.every(Boolean)) {
  console.log("PostgreSQL and Redis are already reachable; skipping Docker Compose");
} else {
  const unavailable = services
    .filter((_, index) => !readiness[index])
    .map(({ name }) => name)
    .join(" and ");
  console.log(`${unavailable} not reachable; starting development infrastructure`);
  await run("docker", [
    "compose",
    "up",
    "-d",
    "--wait",
    "postgres",
    "redis",
  ]);
}

function endpoint(name, value) {
  if (!value) throw new Error(`${name} connection URL is not configured`);
  const url = new URL(value);
  const defaultPort = url.protocol === "postgres:" ? 5432 : 6379;
  return {
    name,
    host: url.hostname,
    port: Number(url.port || defaultPort),
  };
}

function canConnect(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (ready) => {
      socket.destroy();
      resolve(ready);
    };
    socket.setTimeout(500);
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.once("timeout", () => finish(false));
  });
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `${command} exited ${signal ? `from ${signal}` : `with code ${code}`}`,
          ),
        );
    });
  });
}
