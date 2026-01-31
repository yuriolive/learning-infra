import { createHmac } from "node:crypto";

export const verifyMercadoPagoSignature = (
  headers: Record<string, string>,
  query: Record<string, string>,
  webhookSecret: string,
): boolean => {
  const signatureHeader = headers["x-signature"];
  const requestId = headers["x-request-id"];
  const dataId = query["data.id"];

  if (!signatureHeader || !webhookSecret) {
    return false;
  }

  const parts = signatureHeader.split(",");
  const tsPart = parts.find((p) => p.startsWith("ts="));
  const v1Part = parts.find((p) => p.startsWith("v1="));

  if (!tsPart || !v1Part) {
    return false;
  }

  const ts = tsPart.split("=")[1];
  const v1 = v1Part.split("=")[1];

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;

  const hmac = createHmac("sha256", webhookSecret);
  const generatedHash = hmac.update(manifest).digest("hex");

  return generatedHash === v1;
};
