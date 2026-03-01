import path from "node:path";
import { fileURLToPath } from "node:url";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { RedisContainer } from "@testcontainers/redis";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import * as schema from "../../src/database/schema";

import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedRedisContainer } from "@testcontainers/redis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TestEnvironment {
  private pgContainer?: StartedPostgreSqlContainer;
  private redisContainer?: StartedRedisContainer;
  private dbClient?: postgres.Sql;

  async startPostgres() {
    this.pgContainer = await new PostgreSqlContainer(
      "public.ecr.aws/docker/library/postgres:15-alpine",
    )
      .withDatabase("vendin_test")
      .withUsername("postgres")
      .withPassword("postgres")
      .start();

    const connectionUri = this.pgContainer.getConnectionUri();
    this.dbClient = postgres(connectionUri);
    const database = drizzle(this.dbClient, { schema });

    // Run migrations
    const migrationsFolder = path.resolve(__dirname, "../../drizzle");
    await migrate(database, { migrationsFolder });

    // Seed release channels required by schema
    await database
      .insert(schema.releaseChannels)
      .values([
        { id: "stable", autoPromote: false },
        { id: "canary", autoPromote: false },
        { id: "internal", autoPromote: true },
      ])
      .onConflictDoNothing();

    return {
      connectionUri,
      db: database,
      client: this.dbClient,
    };
  }

  async startRedis() {
    this.redisContainer = await new RedisContainer(
      "public.ecr.aws/docker/library/redis:7-alpine",
    ).start();
    return {
      url: this.redisContainer.getConnectionUrl(),
    };
  }

  async stop() {
    // It's important to close client connections before stopping the containers.
    if (this.dbClient) {
      await this.dbClient.end().catch(() => {
        // Suppress error to ensure container cleanup always runs.
      });
    }

    // Stop all started containers concurrently.
    const containerStopPromises = [this.pgContainer, this.redisContainer]
      .filter(Boolean)
      .map((container) => container!.stop());

    await Promise.allSettled(containerStopPromises);
  }
}
