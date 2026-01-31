import { MedusaService } from "@medusajs/framework/utils";

class AgentModuleService extends MedusaService({}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(container: any, options: any) {
    super(container, options);
  }

  async processMessage(_phone: string, _text: string): Promise<string> {
    await Promise.resolve(); // satisfy require-await
    return "Mock response from Agent A";
  }
}

export default AgentModuleService;
