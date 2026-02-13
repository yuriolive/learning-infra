import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import BlingModuleService from "../service.js";
import { BlingConfig } from "../../../models/bling-config.js";

// Mock axios
vi.mock("axios");

// Mock MedusaService
vi.mock("@medusajs/framework/utils", () => ({
  MedusaService: (_config: any) => {
    return class {
      protected container: any;
      constructor(container: any) {
        this.container = container;
      }
    };
  },
}));

describe("BlingModuleService", () => {
  let service: BlingModuleService;
  let loggerMock: any;
  let managerMock: any;
  let repoMock: any;
  let blingConfig: BlingConfig;

  beforeEach(() => {
    loggerMock = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    };

    blingConfig = new BlingConfig();
    blingConfig.id = "bling_config";
    blingConfig.clientId = "client_id";
    blingConfig.clientSecret = "client_secret";
    blingConfig.refreshToken = "refresh_token";
    blingConfig.accessToken = "access_token";
    blingConfig.expiresIn = 3600;
    blingConfig.tokenUpdatedAt = new Date();

    repoMock = {
      findOne: vi.fn().mockResolvedValue(blingConfig),
      create: vi.fn().mockReturnValue(new BlingConfig()),
      getEntityManager: vi.fn().mockReturnValue({
        persist: vi.fn(),
        flush: vi.fn(),
      }),
    };

    managerMock = {
      getRepository: vi.fn().mockReturnValue(repoMock),
    };

    service = new BlingModuleService({ logger: loggerMock, manager: managerMock });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getBlingConfig", () => {
    it("should return config", async () => {
      const config = await service.getBlingConfig();
      expect(config).toBe(blingConfig);
      expect(repoMock.findOne).toHaveBeenCalledWith({ id: "bling_config" });
    });

    it("should return null if not found", async () => {
      repoMock.findOne.mockResolvedValue(null);
      const config = await service.getBlingConfig();
      expect(config).toBeNull();
    });
  });

  describe("getAuthorizationUrl", () => {
    it("should return auth url", async () => {
      const url = await service.getAuthorizationUrl("https://redirect.com");
      expect(url).toContain("https://www.bling.com.br/Api/v3/oauth/authorize");
      expect(url).toContain("client_id=client_id");
      expect(url).toContain("redirect_uri=https%3A%2F%2Fredirect.com");
    });

    it("should throw if client id not set", async () => {
      blingConfig.clientId = "";
      await expect(service.getAuthorizationUrl("url")).rejects.toThrow("Bling Client ID is not configured");
    });
  });

  describe("handleOAuthCallback", () => {
    it("should exchange code for token", async () => {
      (axios.post as any).mockResolvedValue({
        data: {
          access_token: "new_access",
          refresh_token: "new_refresh",
          expires_in: 7200,
        },
      });

      const result = await service.handleOAuthCallback("code123");

      expect(result.success).toBe(true);
      expect(blingConfig.accessToken).toBe("new_access");
      expect(blingConfig.refreshToken).toBe("new_refresh");
      expect(repoMock.getEntityManager().persist).toHaveBeenCalledWith(blingConfig);
      expect(repoMock.getEntityManager().flush).toHaveBeenCalled();
    });

    it("should handle failures", async () => {
      (axios.post as any).mockRejectedValue(new Error("Auth failed"));

      const result = await service.handleOAuthCallback("code123");

      expect(result.success).toBe(false);
      expect(loggerMock.error).toHaveBeenCalled();
    });
  });

  describe("getAccessToken", () => {
    it("should return valid cached token", async () => {
      blingConfig.tokenUpdatedAt = new Date(); // now
      blingConfig.expiresIn = 3600; // 1 hour

      const token = await service.getAccessToken();
      expect(token).toBe("access_token");
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("should refresh expired token", async () => {
      const past = new Date();
      past.setHours(past.getHours() - 2);
      blingConfig.tokenUpdatedAt = past;
      blingConfig.expiresIn = 3600;

      (axios.post as any).mockResolvedValue({
        data: {
          access_token: "refreshed_access",
          refresh_token: "refreshed_refresh",
          expires_in: 7200,
        },
      });

      const token = await service.getAccessToken();

      expect(token).toBe("refreshed_access");
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/token"),
        expect.any(URLSearchParams),
        expect.any(Object)
      );
    });
  });

  describe("createOrder", () => {
    it("should create order", async () => {
        // Mock getAccessToken implicitly called by createAuthorizedClient
        // It returns existing token.

        const axiosInstanceMock = {
            get: vi.fn(),
            post: vi.fn().mockResolvedValue({ data: { id: 123 } }),
        };
        (axios.create as any).mockReturnValue(axiosInstanceMock);

        const payload = { numeroPedidoLoja: "123" };
        const result = await service.createOrder(payload);

        expect(result).toEqual({ id: 123 });
        expect(axiosInstanceMock.post).toHaveBeenCalledWith("/pedidos/vendas", payload);
    });
  });
});
