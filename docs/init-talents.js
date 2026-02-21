
// ======================================================================
// init-talents.js
// Loads all backend talent registries during system initialization.
// ======================================================================

import { TalentTreeRegistry } from "../scripts/progression/talents/TalentTreeRegistry.js";
import { TalentTreeDB } from "../scripts/data/talent-tree-db.js";

// Wait for SSOT registries to be built first, then build TalentTreeRegistry
Hooks.once("swse:progression:initialized", async () => {
  console.log("[SWSE] Building TalentTreeRegistry (after SSOT registries)...");
  await TalentTreeRegistry.build();
  console.log("[SWSE] Talent trees ready.");
});

// Fallback: if progression hooks aren't registered, build on ready
Hooks.once("ready", async () => {
  // Give SystemInitHooks time to register and run
  setTimeout(async () => {
    if (TalentTreeRegistry.trees.size === 0) {
      console.log("[SWSE] Building TalentTreeRegistry (fallback)...");
      // Ensure TalentTreeDB is built first
      if (!TalentTreeDB.isBuilt) {
        await TalentTreeDB.build();
      }
      await TalentTreeRegistry.build();
      console.log("[SWSE] Talent trees ready (fallback).");
    }
  }, 2000);
});
