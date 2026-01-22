import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import { BLING_MODULE } from "../../../../modules/bling.js";
import BlingModuleService from "../../../../modules/bling/service.js";

const schema = z.object({
  code: z.string(),
});

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { code } = schema.parse(req.body);

  const blingService: BlingModuleService = req.scope.resolve(BLING_MODULE);

  try {
    const result = await blingService.handleOAuthCallback(code);
    if (result.success) {
        res.json({ message: "Successfully authenticated with Bling" });
    } else {
        res.status(400).json({ message: "Failed to authenticate with Bling" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
