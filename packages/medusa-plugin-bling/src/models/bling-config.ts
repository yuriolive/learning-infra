import { Entity, PrimaryKey, Property, JsonType } from "@mikro-orm/core";

export type BlingSyncPreferences = {
  products: {
    enabled: boolean;
    import_images: boolean;
    import_descriptions: boolean;
    import_prices: boolean;
  };
  inventory: {
    enabled: boolean;
    bidirectional: boolean;
    locations: Array<{
      medusa_id: string;
      bling_id: string;
    }>;
  };
  orders: {
    enabled: boolean;
    send_to_bling: boolean;
    receive_from_bling: boolean;
    generate_nf: boolean;
  };
};

@Entity({ tableName: "bling_config" })
export class BlingConfig {
  @PrimaryKey({ type: "string", columnType: "text" })
  id: string = "bling_config";

  @Property({ nullable: true, columnType: "text", fieldName: "client_id" })
  clientId: string | null = null;

  @Property({ nullable: true, columnType: "text", fieldName: "client_secret" })
  clientSecret: string | null = null;

  @Property({ nullable: true, columnType: "text", fieldName: "access_token" })
  accessToken: string | null = null;

  @Property({ nullable: true, columnType: "text", fieldName: "webhook_secret" })
  webhookSecret: string | null = null;

  @Property({ nullable: true, columnType: "text", fieldName: "refresh_token" })
  refreshToken: string | null = null;

  @Property({ nullable: true, columnType: "integer", fieldName: "expires_in" })
  expiresIn: number | null = null;

  @Property({ nullable: true, columnType: "timestamptz", fieldName: "token_updated_at" })
  tokenUpdatedAt: Date | null = null;

  @Property({ nullable: true, type: JsonType, fieldName: "sync_preferences" })
  syncPreferences: BlingSyncPreferences | null = null;
}
