// scripts/rules/rules-engine.js
import { swseLogger } from "../utils/logger.js";
import { HouseRules } from "../houserules/houserules-engine.js";

export const RulesEngine = {
  init() {
    HouseRules.init();
    swseLogger.info("RulesEngine initialized");
  }
};
