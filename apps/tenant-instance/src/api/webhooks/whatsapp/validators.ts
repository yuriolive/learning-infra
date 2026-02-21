import { z } from "zod";

export const WhatsAppMessageSchema = z.object({
  from: z.string(),
  id: z.string(),
  timestamp: z.string(),
  text: z
    .object({
      body: z.string(),
    })
    .optional(),
  type: z.string(),
});

export const WhatsAppContactSchema = z.object({
  profile: z.object({
    name: z.string(),
  }),
  wa_id: z.string(),
});

export const WhatsAppValueSchema = z.object({
  messaging_product: z.string(),
  metadata: z.object({
    display_phone_number: z.string(),
    phone_number_id: z.string(),
  }),
  contacts: z.array(WhatsAppContactSchema).optional(),
  messages: z.array(WhatsAppMessageSchema).optional(),
});

export const WhatsAppChangeSchema = z.object({
  value: WhatsAppValueSchema,
  field: z.string(),
});

export const WhatsAppEntrySchema = z.object({
  id: z.string(),
  changes: z.array(WhatsAppChangeSchema),
});

export const WhatsAppPayloadSchema = z.object({
  object: z.string(),
  entry: z.array(WhatsAppEntrySchema),
});

export type WhatsAppPayloadType = z.infer<typeof WhatsAppPayloadSchema>;
export type WhatsAppChangeType = z.infer<typeof WhatsAppChangeSchema>;
