
// ======================================================================
// init-talents.js
// Loads all backend talent registries during system initialization.
// ======================================================================

import { TalentTreeRegistry } from "./scripts/progression/talents/TalentTreeRegistry.js";

Hooks.once("ready", async () => {
  console.log("[SWSE] Building TalentTreeRegistry...");
  await TalentTreeRegistry.build();
  console.log("[SWSE] Talent trees ready.");
});
