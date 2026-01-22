import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import { BLING_MODULE } from "../../../../modules/bling.js";
import BlingModuleService from "../../../../modules/bling/service.js";

const schema = z.object({
  redirect_uri: z.string().url(),
});

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { redirect_uri } = schema.parse(req.query);

  const blingService: BlingModuleService = req.scope.resolve(BLING_MODULE);

  try {
    const url = await blingService.getAuthorizationUrl(redirect_uri);
    res.json({ url });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
