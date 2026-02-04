export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  customDomain?: string;
  backendUrl: string; // Private Cloud Run URL
  theme: {
    primaryColor: string;
    fontFamily: string;
    logoUrl: string;
  };
}
