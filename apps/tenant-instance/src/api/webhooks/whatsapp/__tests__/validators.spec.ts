import { describe, it, expect } from "vitest";

import { WhatsAppPayloadSchema } from "../validators";

describe("WhatsApp Validators", () => {
  it("should validate a correct payload", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "entry_id",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "123",
                  phone_number_id: "456",
                },
                contacts: [{ profile: { name: "Test User" }, wa_id: "789" }],
                messages: [
                  {
                    from: "789",
                    id: "msg_id",
                    timestamp: "1234567890",
                    type: "text",
                    text: { body: "Hello World" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const result = WhatsAppPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should fail validation if object is missing", () => {
    const payload = {
      entry: [
        {
          id: "entry_id",
          changes: [],
        },
      ],
    };

    const result = WhatsAppPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("should fail validation if entry is not an array", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: "invalid_entry",
    };

    const result = WhatsAppPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("should allow optional contacts and messages", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "entry_id",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "123",
                  phone_number_id: "456",
                },
              },
            },
          ],
        },
      ],
    };

    const result = WhatsAppPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});
