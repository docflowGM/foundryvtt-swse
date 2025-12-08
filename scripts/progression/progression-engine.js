// scripts/progression/progression-engine.js
import { swseLogger } from "../utils/logger.js";

export const ProgressionEngine = {
  async applyLevel(actor, levelData) {
    try {
      // Apply level templates, grants, feats, HP etc.
      swseLogger.info("Applying level for", actor.name, levelData);
    } catch (e) {
      swseLogger.error("ProgressionEngine.applyLevel failed", e);
    }
  }
};
