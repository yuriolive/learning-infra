import fs from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

import pactCore from "@pact-foundation/pact-core";
import { describe, it, expect } from "vitest";

import type { TenantService } from "../../src/domains/tenants/tenant.service";
import type {
  ListTenantsFilters,
  Tenant,
} from "../../src/domains/tenants/tenant.types";
import type { AddressInfo } from "node:net";

describe("Storefront Contract Verification", () => {
  it("verifies the storefront consumer contract", async () => {
    // Import dynamically so it's only loaded when needed
    const { createTenantRoutes } =
      await import("../../src/domains/tenants/tenant.routes");
    const { createCloudflareLogger } = await import("@vendin/logger");

    const logger = createCloudflareLogger({ nodeEnv: "test" });

    // Create a mock tenant service that responds with the expected tenant for the contract test
    const mockTenantService: Pick<TenantService, "listTenants"> = {
      listTenants: (filters?: ListTenantsFilters) => {
        if (filters?.subdomain === "test-store") {
          return Promise.resolve([
            {
              id: "tenant-123",
              name: "Test Tenant",
              subdomain: "test-store",
              apiUrl: "https://backend.example.com",
              metadata: {
                theme: {
                  primaryColor: "#000000",
                  fontFamily: "Inter",
                  logoUrl: "",
                },
              },
            } as unknown as Tenant,
          ]);
        }
        return Promise.resolve([]);
      },
    };

    const routes = createTenantRoutes({
      logger,
      tenantService: mockTenantService as TenantService,
    });

    const server = createServer((request, response_) => {
      // Create a wrapper function that returns a Promise to catch errors inside the callback
      const handle = async () => {
        try {
          logger.info({ url: request.url }, "SERVER RECEIVED URL");
          if (!request.url) {
            response_.statusCode = 404;
            response_.end();
            return;
          }

          const fullUrl = `http://127.0.0.1${request.url}`;
          const headers = new Headers();
          for (const [key, value] of Object.entries(request.headers)) {
            if (Array.isArray(value)) {
              value.forEach((v) => headers.append(key, v));
            } else if (value) {
              headers.append(key, value as string);
            }
          }

          const standardRequest = new Request(fullUrl, {
            method: request.method || "GET",
            headers,
          });

          const routeResponse = await routes.handleRequest(standardRequest);

          response_.statusCode = routeResponse.status;
          routeResponse.headers.forEach((value, key) => {
            response_.setHeader(key, value);
          });

          const text = await routeResponse.text();
          response_.end(text);
        } catch (error) {
          logger.error({ error }, "Server error");
          response_.statusCode = 500;
          response_.end("Internal Server Error");
        }
      };

      void handle();
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        resolve();
      });
    });

    const port = (server.address() as AddressInfo).port;

    const pactUrl = path.resolve(
      __dirname,
      "../../../../apps/storefront/.pact/pacts/storefront-control-plane.json",
    );

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (!fs.existsSync(pactUrl)) {
      logger.warn({ pactUrl }, "Pact file not found, skipping test");
      return;
    }

    const stateServer = createServer((request, response) => {
      if (request.url === "/_pactSetup") {
        response.setHeader("Content-Type", "application/json");
        response.statusCode = 200;
        response.end(JSON.stringify({}));
      } else {
        response.statusCode = 404;
        response.end();
      }
    });

    await new Promise<void>((resolve) => {
      stateServer.listen(0, "127.0.0.1", () => {
        resolve();
      });
    });

    const statePort = (stateServer.address() as AddressInfo).port;

    const options = {
      providerBaseUrl: `http://127.0.0.1:${port}`,
      pactUrls: [pactUrl],
      providerStatesSetupUrl: `http://127.0.0.1:${statePort}/_pactSetup`,
    };

    logger.info(
      { providerBaseUrl: `http://127.0.0.1:${port}` },
      "[TEST] pactCore verifying providerBaseUrl",
    );

    let success = false;
    try {
      await pactCore.verifyPacts(options);
      success = true;
    } finally {
      if (server) {
        server.close();
      }
      if (stateServer) {
        stateServer.close();
      }
    }

    expect(success).toBe(true);
  }, 30_000);
});
