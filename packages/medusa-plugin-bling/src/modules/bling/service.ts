import { MedusaService } from "@medusajs/framework/utils";
import { Logger } from "@medusajs/types";
import { EntityManager, EntityRepository } from "@mikro-orm/core";
import axios, { AxiosInstance } from "axios";
import { BlingConfig, BlingSyncPreferences } from "../../models/bling-config.js";

const BLING_CONFIG_ID = "bling_config";

const DEFAULT_MODULE_OPTIONS = {
  apiBaseUrl: "https://api.bling.com.br/Api/v3",
  oauthBaseUrl: "https://www.bling.com.br/Api/v3/oauth",
};

const DEFAULT_SYNC_PREFERENCES: BlingSyncPreferences = {
  products: {
    enabled: true,
    import_images: true,
    import_descriptions: true,
    import_prices: true,
  },
  inventory: {
    enabled: true,
    bidirectional: false,
    locations: [],
  },
  orders: {
    enabled: true,
    send_to_bling: true,
    receive_from_bling: true,
    generate_nfe: false,
    default_status: "Atendido",
    default_state_registration: "ISENTO"
  },
};

type BlingModuleOptions = {
  apiBaseUrl?: string;
  oauthBaseUrl?: string;
};

type InjectedDependencies = {
  manager: EntityManager;
  logger: Logger;
};

export default class BlingModuleService extends MedusaService({
  BlingConfig,
}) {
  protected readonly logger_: Logger;
  protected readonly configRepository_: EntityRepository<BlingConfig>;
  protected readonly apiBaseUrl: string;
  protected readonly oauthBaseUrl: string;

  constructor(
    deps: InjectedDependencies,
    options: BlingModuleOptions = {}
  ) {
    // @ts-ignore
    super(...arguments);

    this.logger_ = deps.logger;
    this.configRepository_ = deps.manager.getRepository(BlingConfig);

    const mergedOptions = {
      ...DEFAULT_MODULE_OPTIONS,
      ...options,
    };
    this.apiBaseUrl = mergedOptions.apiBaseUrl;
    this.oauthBaseUrl = mergedOptions.oauthBaseUrl;
  }
// ... rest
    async getBlingConfig(): Promise<BlingConfig | null> {
    const config = await this.configRepository_.findOne({ id: BLING_CONFIG_ID });
    if (!config) {
      return null;
    }
    config.syncPreferences = this.mergePreferences({}, config.syncPreferences ?? undefined);
    return config;
  }

  async saveBlingConfig(data: Partial<BlingConfig>): Promise<BlingConfig> {
    const existing = await this.configRepository_.findOne({ id: BLING_CONFIG_ID });
    const config = existing ?? this.configRepository_.create(new BlingConfig());

    if (data.clientId !== undefined) {
      const sanitized = data.clientId?.trim() ?? null;
      config.clientId = sanitized && sanitized.length > 0 ? sanitized : null;
    }

    if (data.clientSecret !== undefined) {
      const sanitized = data.clientSecret?.trim() ?? null;
      config.clientSecret = sanitized && sanitized.length > 0 ? sanitized : null;
    }

    if (data.webhookSecret !== undefined) {
      const sanitized = data.webhookSecret?.trim() ?? null;
      config.webhookSecret = sanitized && sanitized.length > 0 ? sanitized : null;
    }

    if (data.syncPreferences !== undefined) {
      const incoming = data.syncPreferences === null ? {} : data.syncPreferences;
      config.syncPreferences = this.mergePreferences(incoming, config.syncPreferences ?? undefined);
    } else if (!config.syncPreferences) {
      config.syncPreferences = this.mergePreferences();
    }

    const entityManager = this.configRepository_.getEntityManager();
    entityManager.persist(config);
    await entityManager.flush();

    return config;
  }

  async getAuthorizationUrl(redirectUri: string): Promise<string> {
    const config = await this.getBlingConfig();
    if (!config?.clientId) {
      throw new Error("Bling Client ID is not configured. Please save credentials first.");
    }

    const params = new URLSearchParams({
      response_type: "code",
      client_id: config.clientId,
      redirect_uri: redirectUri,
      state: "medusa-bling-auth",
    });

    return `${this.oauthBaseUrl}/authorize?${params.toString()}`;
  }

  async handleOAuthCallback(code: string): Promise<{ success: boolean }> {
    try {
      const config = await this.getBlingConfig();
      if (!config?.clientId || !config?.clientSecret) {
        throw new Error("Bling Client ID or Secret not configured.");
      }

      const params = new URLSearchParams();
      params.append("grant_type", "authorization_code");
      params.append("code", code);

      const response = await axios.post(`${this.oauthBaseUrl}/token`, params, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const { access_token, refresh_token, expires_in } = response.data;

      config.accessToken = access_token;
      config.refreshToken = refresh_token;
      config.expiresIn = expires_in;
      config.tokenUpdatedAt = new Date();

      const entityManager = this.configRepository_.getEntityManager();
      entityManager.persist(config);
      await entityManager.flush();

      this.logger_.info("Bling OAuth token saved successfully.");
      return { success: true };
    } catch (error) {
      this.logger_.error(`Bling OAuth callback failed: ${this.describeAxiosError(error)}`);
      return { success: false };
    }
  }

  async getAccessToken(): Promise<string> {
    const config = await this.getBlingConfig();

    if (!config?.accessToken || !config.tokenUpdatedAt || config.expiresIn === null) {
      throw new Error("Bling access token not found or invalid. Please authenticate.");
    }

    const now = new Date();
    // Refresh if token is about to expire (within 5 minutes)
    const expiryTime = new Date(config.tokenUpdatedAt.getTime() + (config.expiresIn - 300) * 1000);

    if (now < expiryTime) {
      return config.accessToken;
    }

    this.logger_.info("Bling access token expired, refreshing...");

    try {
      if (!config.clientId || !config.clientSecret || !config.refreshToken) {
        throw new Error("Missing Bling credentials or refresh token for renewal.");
      }

      const params = new URLSearchParams();
      params.append("grant_type", "refresh_token");
      params.append("refresh_token", config.refreshToken);

      const response = await axios.post(`${this.oauthBaseUrl}/token`, params, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const { access_token, refresh_token, expires_in } = response.data;

      config.accessToken = access_token;
      config.refreshToken = refresh_token;
      config.expiresIn = expires_in;
      config.tokenUpdatedAt = new Date();

      const entityManager = this.configRepository_.getEntityManager();
      entityManager.persist(config);
      await entityManager.flush();

      this.logger_.info("Bling access token refreshed successfully.");
      return access_token;
    } catch (error) {
      this.logger_.error(`Failed to refresh Bling access token: ${this.describeAxiosError(error)}`);
      throw new Error("Failed to refresh Bling token.");
    }
  }

  async createAuthorizedClient(): Promise<AxiosInstance> {
    const accessToken = await this.getAccessToken();
    return axios.create({
      baseURL: this.apiBaseUrl,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
  }

  mergePreferences(
    incoming: Partial<BlingSyncPreferences> = {},
    current?: BlingSyncPreferences
  ): BlingSyncPreferences {
    const source = current ?? DEFAULT_SYNC_PREFERENCES;

    return {
      products: {
        enabled: incoming.products?.enabled ?? source.products.enabled,
        import_images: incoming.products?.import_images ?? source.products.import_images,
        import_descriptions: incoming.products?.import_descriptions ?? source.products.import_descriptions,
        import_prices: incoming.products?.import_prices ?? source.products.import_prices,
      },
      inventory: {
        enabled: incoming.inventory?.enabled ?? source.inventory.enabled,
        bidirectional: incoming.inventory?.bidirectional ?? source.inventory.bidirectional,
        locations: Array.isArray(incoming.inventory?.locations)
          ? incoming.inventory.locations.map((location) => ({ ...location }))
          : source.inventory.locations.map((location) => ({ ...location })),
      },
      orders: {
        enabled: incoming.orders?.enabled ?? source.orders.enabled,
        send_to_bling: incoming.orders?.send_to_bling ?? source.orders.send_to_bling,
        receive_from_bling: incoming.orders?.receive_from_bling ?? source.orders.receive_from_bling,
        generate_nfe: incoming.orders?.generate_nfe ?? source.orders.generate_nfe,
        default_status: incoming.orders?.default_status ?? source.orders.default_status,
        default_state_registration: incoming.orders?.default_state_registration ?? source.orders.default_state_registration,
      },
    };
  }

  protected describeAxiosError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      if (error.response?.data) {
        if (typeof error.response.data === "string") {
          return error.response.data;
        }
        return JSON.stringify(error.response.data);
      }
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  async getProducts(params: Record<string, any> = {}) {
      const client = await this.createAuthorizedClient();
      const response = await client.get("/produtos", { params });
      return response.data;
  }

  async getOrder(id: string) {
      const client = await this.createAuthorizedClient();
      const response = await client.get(`/pedidos/vendas/${id}`);
      return response.data;
  }

  async createOrder(payload: any) {
      const client = await this.createAuthorizedClient();
      const response = await client.post("/pedidos/vendas", payload);
      return response.data;
  }
}
