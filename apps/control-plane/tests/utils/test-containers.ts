import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { RedisContainer, StartedRedisContainer } from "@testcontainers/redis";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as schema from "../../src/database/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TestEnvironment {
  private pgContainer?: StartedPostgreSqlContainer;
  private redisContainer?: StartedRedisContainer;
  private dbClient?: postgres.Sql;

  async startPostgres() {
    this.pgContainer = await new PostgreSqlContainer("public.ecr.aws/docker/library/postgres:15-alpine")
      .withDatabase("vendin_test")
      .withUsername("postgres")
      .withPassword("postgres")
      .start();

    const connectionUri = this.pgContainer.getConnectionUri();
    this.dbClient = postgres(connectionUri);
    const db = drizzle(this.dbClient, { schema });

    // Run migrations
    const migrationsFolder = path.resolve(__dirname, "../../drizzle");
    await migrate(db, { migrationsFolder });

    // Seed release channels required by schema
    await this.dbClient`
      INSERT INTO release_channels (id, auto_promote)
      VALUES ('stable', false), ('canary', false), ('internal', true)
      ON CONFLICT DO NOTHING;
    `;

    return {
      connectionUri,
      db,
      client: this.dbClient,
    };
  }

  async startRedis() {
    this.redisContainer = await new RedisContainer("public.ecr.aws/docker/library/redis:7-alpine").start();
    return {
      url: this.redisContainer.getConnectionUrl(),
    };
  }

  async stop() {
    if (this.dbClient) {
      await this.dbClient.end();
    }
    if (this.pgContainer) {
      await this.pgContainer.stop();
    }
    if (this.redisContainer) {
      await this.redisContainer.stop();
    }
  }
}
