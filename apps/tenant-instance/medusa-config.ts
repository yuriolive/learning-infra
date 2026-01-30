import { loadEnv, defineConfig } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

const jwtSecret = process.env.JWT_SECRET || "supersecret";
const cookieSecret = process.env.COOKIE_SECRET || "supersecret";

const redisPrefix = process.env.REDIS_PREFIX || "medusa:";

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
  modules: [
    {
      resolve: "@medusajs/medusa/cache-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
        namespace: redisPrefix,
      },
    },
    {
      resolve: "@medusajs/medusa/event-bus-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
        queueOptions: {
          prefix: redisPrefix,
        },
      },
    },
    {
      resolve: "./src/modules/agent",
      options: {
        modelName: "gemini-3.0-flash",
      },
    },
  ],
});
