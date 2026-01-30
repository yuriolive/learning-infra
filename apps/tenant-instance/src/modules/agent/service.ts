import { MedusaService } from "@medusajs/framework/utils"

class AgentModuleService extends MedusaService({}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(container: any, options: any) {
    super(container, options)
  }

  async processMessage(phone: string, text: string): Promise<string> {
    return "Mock response from Agent A"
  }
}

export default AgentModuleService
