import { describe, expect, it } from "vitest";

import { getAdminSystemPrompt } from "../prompts/admin.js";
import { getCustomerSystemPrompt } from "../prompts/customer.js";

describe("System Prompts", () => {
  describe("customer prompt", () => {
    it("references customer-facing tools (search_products, cart)", () => {
      const prompt = getCustomerSystemPrompt();
      const content =
        typeof prompt.content === "string"
          ? prompt.content
          : JSON.stringify(prompt.content);

      expect(content).toMatch(/search_products/i);
      expect(content).toMatch(/cart/i);
    });

    it("does not contain admin-only instructions", () => {
      const prompt = getCustomerSystemPrompt();
      const content =
        typeof prompt.content === "string"
          ? prompt.content
          : JSON.stringify(prompt.content);

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
      const prompt = getAdminSystemPrompt();
      const content =
        typeof prompt.content === "string"
          ? prompt.content
          : JSON.stringify(prompt.content);

      expect(content).toMatch(/administrator/i);
      expect(content).toMatch(/product|inventory|order/i);
    });

    it("is distinct from the customer prompt", () => {
      const customerContent = String(getCustomerSystemPrompt().content);
      const adminContent = String(getAdminSystemPrompt().content);

      expect(adminContent).not.toBe(customerContent);
    });
  });
});
