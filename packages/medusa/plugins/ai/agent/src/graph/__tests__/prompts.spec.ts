import { describe, expect, it } from "vitest";

import { getAdminSystemPrompt } from "../prompts/admin.js";
import { getCustomerSystemPrompt } from "../prompts/customer.js";

const getPromptContent = (prompt: { content: string | unknown }): string =>
  typeof prompt.content === "string"
    ? prompt.content
    : JSON.stringify(prompt.content);

describe("System Prompts", () => {
  describe("customer prompt", () => {
    it("references customer-facing tools (search_products, cart)", () => {
      const content = getPromptContent(getCustomerSystemPrompt());

      expect(content).toMatch(/search_products/i);
      expect(content).toMatch(/cart/i);
    });

    it("does not contain admin-only instructions", () => {
      const content = getPromptContent(getCustomerSystemPrompt());

      // Admin concepts that must NOT appear in the customer prompt
      const adminKeywords = [
        "administrator",
        "inventory",
        "analytics",
        "operational store tasks",
      ];
      for (const keyword of adminKeywords) {
        expect(content.toLowerCase()).not.toContain(keyword.toLowerCase());
      }
    });
  });

  describe("admin prompt", () => {
    it("references admin management capabilities", () => {
      const content = getPromptContent(getAdminSystemPrompt());

      expect(content).toMatch(/administrator/i);
      expect(content).toMatch(/product|inventory|order/i);
    });

    it("is distinct from the customer prompt", () => {
      const customerContent = getPromptContent(getCustomerSystemPrompt());
      const adminContent = getPromptContent(getAdminSystemPrompt());

      expect(adminContent).not.toBe(customerContent);
    });
  });
});
