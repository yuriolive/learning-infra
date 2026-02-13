export interface TenantTheme {
  primaryColor: string;
  fontFamily: string;
  logoUrl: string;
}

export interface TenantMetadata {
  theme?: TenantTheme;
  [key: string]: unknown;
}

export interface TenantApiResponse {
  id: string;
  name: string;
  subdomain?: string;
  apiUrl?: string;
  metadata?: TenantMetadata;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  customDomain?: string;
  backendUrl: string; // Private Cloud Run URL
  theme: TenantTheme;
  acmeChallenge?: {
    token: string;
    response: string;
  };
}
