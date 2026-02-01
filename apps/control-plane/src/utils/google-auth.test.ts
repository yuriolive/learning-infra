import { describe, expect, it, vi } from "vitest";

// Mock crypto
const mockSign = {
  update: vi.fn().mockReturnThis(),
  end: vi.fn().mockReturnThis(),
  sign: vi.fn().mockReturnValue("mock-signature"),
};

vi.mock("node:crypto", () => ({
  createSign: vi.fn(() => mockSign),
}));

import { GoogleAuth } from "./google-auth";

describe("GoogleAuth", () => {
  const credentials = {
    private_key_id: "test-key-id",
    private_key: "test-private-key",
    client_email: "test@example.com",
  };

  const credentialsJson = JSON.stringify(credentials);

  it("should create Base64url encoded JWT", () => {
    const auth = new GoogleAuth(credentialsJson);
    // @ts-expect-error accessing private method for testing
    const jwt = auth.createJWT();

    const parts = jwt.split(".");
    expect(parts).toHaveLength(3);

    const [header, claim, signature] = parts;

    // Check Base64url (no padding, URL safe chars)
    expect(header).not.toContain("=");
    expect(header).not.toContain("+");
    expect(header).not.toContain("/");

    expect(claim).not.toContain("=");
    expect(claim).not.toContain("+");
    expect(claim).not.toContain("/");

    expect(signature).toBe("mock-signature");

    // Decode and verify content
    const decodedHeader = JSON.parse(
      Buffer.from(header!, "base64url").toString(),
    );
    expect(decodedHeader).toEqual({
      alg: "RS256",
      typ: "JWT",
      kid: credentials.private_key_id,
    });

    const decodedClaim = JSON.parse(
      Buffer.from(claim!, "base64url").toString(),
    );
    expect(decodedClaim.iss).toBe(credentials.client_email);
    expect(decodedClaim.sub).toBe(credentials.client_email);
    expect(decodedClaim.aud).toBe("https://www.googleapis.com/oauth2/v4/token");
    expect(decodedClaim.scope).toBe(
      "https://www.googleapis.com/auth/cloud-platform",
    );
  });

  it("should cache and reuse token", async () => {
    const auth = new GoogleAuth(credentialsJson);

    const mockToken = {
      access_token: "test-token",
      expires_in: 3600,
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockToken),
    } as Response);

    const token1 = await auth.getAccessToken();
    const token2 = await auth.getAccessToken();

    expect(token1).toBe("test-token");
    expect(token2).toBe("test-token");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    fetchSpy.mockRestore();
  });
});
