import { createSign } from "node:crypto";

export interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

export class GoogleAuth {
  private credentials: ServiceAccountCredentials;
  private token: string | null = null;
  private tokenExpiry = 0;

  constructor(credentialsJson: string) {
    try {
      this.credentials = JSON.parse(credentialsJson);
    } catch {
      throw new Error("Invalid GCP credentials JSON");
    }
  }

  private createJWT(): string {
    const header = {
      alg: "RS256",
      typ: "JWT",
      kid: this.credentials.private_key_id,
    };

    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: this.credentials.client_email,
      sub: this.credentials.client_email,
      aud: "https://www.googleapis.com/oauth2/v4/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/cloud-platform",
    };

    const encodedHeader = btoa(JSON.stringify(header));
    const encodedClaim = btoa(JSON.stringify(claim));

    const sign = createSign("SHA256");
    sign.update(`${encodedHeader}.${encodedClaim}`);
    sign.end();
    const signature = sign.sign(this.credentials.private_key, "base64");

    return `${encodedHeader}.${encodedClaim}.${signature}`;
  }

  async getAccessToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    const jwt = this.createJWT();
    const response = await fetch("https://www.googleapis.com/oauth2/v4/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get access token: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.token = data.access_token;
    // Set expiry to slightly less than actual expiry to be safe
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

    return this.token;
  }
}
