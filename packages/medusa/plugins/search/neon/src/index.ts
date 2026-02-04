import { Module } from "@medusajs/framework/utils";

import NeonSearchService from "./services/neon-search.js";

export const SEARCH_MODULE = "search";

export default Module(SEARCH_MODULE, {
  service: NeonSearchService,
});
