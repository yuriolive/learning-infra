import { loadEnv, defineConfig } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

const jwtSecret = process.env.JWT_SECRET || "supersecret";
const cookieSecret = process.env.COOKIE_SECRET || "supersecret";

const redisPrefix = process.env.REDIS_PREFIX || "medusa:";

// Check if we are running a migration command
const isMigrating = process.argv.some((argument) => argument.startsWith("db:"));

const redisUrl = process.env.REDIS_URL;
const shouldForceTls =
  redisUrl?.includes("upstash") || redisUrl?.startsWith("rediss://");

const redisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  family: 0,
  ...(shouldForceTls ? { tls: { rejectUnauthorized: false } } : {}),
};

const modules = isMigrating
  ? []
  : [
      {
        resolve: "@medusajs/medusa/cache-redis",
        options: {
          redisUrl: process.env.REDIS_URL,
          namespace: redisPrefix,
          redisOptions,
        },
      },
      {
        resolve: "@medusajs/medusa/event-bus-redis",
        options: {
          redisUrl: process.env.REDIS_URL,
          queueOptions: {
            prefix: redisPrefix,
          },
          jobOptions: {
            removeOnComplete: true,
          },
          redisOptions,
        },
      },
      {
        resolve: "@vendin/medusa-ai-agent",
        options: {
          modelName: "gemini-3.0-flash",
        },
      },
      {
        resolve: "@vendin/medusa-search-neon",
        key: "search", // Using string literal since Modules.SEARCH might be missing in this version
        options: {
          gemini_api_key: process.env.GEMINI_API_KEY,
        },
      },
    ];

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseLogging: true,
    databaseDriverOptions:
      process.env.NODE_ENV === "development"
        ? {
            ssl: false,
            sslmode: "disable",
          }
        : { connection: { ssl: true } },
    redisUrl: process.env.REDIS_URL,
    redisPrefix,
    redisOptions,
    http: {
      storeCors: process.env.STORE_CORS || "",
      adminCors: process.env.ADMIN_CORS || "",
      authCors: process.env.AUTH_CORS || "",
      jwtSecret,
      cookieSecret,
    },
  },
  admin: {
    vite: (config) => {
      return {
        ...config,
        server: {
          host: "0.0.0.0",
          allowedHosts: ["localhost", ".localhost", "127.0.0.1"],
          hmr: {
            port: 5173,
            clientPort: 5173,
          },
        },
      };
    },
  },
  modules,
});
