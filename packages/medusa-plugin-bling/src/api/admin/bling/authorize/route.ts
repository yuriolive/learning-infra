import { z } from "zod";

import { BLING_MODULE } from "../../../../modules/bling/index.js";

import type BlingModuleService from "../../../../modules/bling/service.js";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

const schema = z.object({
  redirect_uri: z.string().url(),
});

export const GET = async (request: MedusaRequest, response: MedusaResponse) => {
  const { redirect_uri } = schema.parse(request.query);

  const blingService: BlingModuleService = request.scope.resolve(BLING_MODULE);

  try {
    const url = await blingService.getAuthorizationUrl(redirect_uri);
    response.json({ url });
  } catch (error: any) {
    response.status(400).json({ message: error.message });
  }
};
