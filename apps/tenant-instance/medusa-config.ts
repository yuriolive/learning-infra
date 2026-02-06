import { loadEnv, defineConfig } from "@medusajs/framework/utils";
console.log("[DEBUG] Starting medusa-config load");
console.log("[DEBUG] NODE_ENV:", process.env.NODE_ENV || "undefined!");
console.log("[DEBUG] DATABASE_URL:", process.env.DATABASE_URL || "undefined!");
console.log("[DEBUG] REDIS_URL:", process.env.REDIS_URL || "undefined!");
console.log("[DEBUG] JWT_SECRET:", process.env.JWT_SECRET || "undefined!");
console.log("[DEBUG] COOKIE_SECRET:", process.env.COOKIE_SECRET || "undefined!");
console.log("[DEBUG] GEMINI_API_KEY:", process.env.GEMINI_API_KEY || "undefined!");
console.log("[DEBUG] ADMIN_CORS:", process.env.ADMIN_CORS || "undefined!");
console.log("[DEBUG] STORE_CORS:", process.env.STORE_CORS || "undefined!");
console.log("[DEBUG] AUTH_CORS:", process.env.AUTH_CORS || "undefined!");
console.log("[DEBUG] cwd:", process.cwd());

loadEnv(process.env.NODE_ENV || "development", process.cwd());

console.log("[DEBUG] After loadEnv → DATABASE_URL:", process.env.DATABASE_URL || "still undefined!");

const jwtSecret = process.env.JWT_SECRET || "supersecret";
const cookieSecret = process.env.COOKIE_SECRET || "supersecret";

const redisPrefix = process.env.REDIS_PREFIX || "medusa:";

// Check if we are running a migration command
const isMigrating = process.argv.some((argument) => argument.startsWith("db:"));

console.log("[DEBUG] isMigrating:", isMigrating);

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
      // TEMPORARY: disabled modules for now
      // {
      //   resolve: "@vendin/medusa-ai-agent",
      //   options: {
      //     modelName: "gemini-3.0-flash",
      //   },
      // },
      // {
      //   resolve: "@vendin/medusa-search-neon",
      //   key: "search", // Using string literal since Modules.SEARCH might be missing in this version
      //   options: {
      //     gemini_api_key: process.env.GEMINI_API_KEY,
      //   },
      // },
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
