import { Module } from "@medusajs/framework/utils";

import AgentModuleService from "./service.js";

export const AGENT_MODULE = "agentModuleService";

export default Module(AGENT_MODULE, {
  service: AgentModuleService,
});

export { default as AgentModuleService } from "./service.js";
