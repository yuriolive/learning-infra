import { z } from "zod";

import { BLING_MODULE } from "../../../../../modules/bling/index.js";

import type BlingModuleService from "../../../../../modules/bling/service.js";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

const schema = z.object({
  code: z.string(),
});

export const POST = async (
  request: MedusaRequest,
  response: MedusaResponse,
) => {
  const { code } = schema.parse(request.body);

  const blingService: BlingModuleService = request.scope.resolve(BLING_MODULE);

  try {
    const result = await blingService.handleOAuthCallback(code);
    if (result.success) {
      response.json({ message: "Successfully authenticated with Bling" });
    } else {
      response
        .status(400)
        .json({ message: "Failed to authenticate with Bling" });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generic error";
    response.status(500).json({ message });
  }
};
