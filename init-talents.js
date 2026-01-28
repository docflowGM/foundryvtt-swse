// ======================================================================
// init-talents.js
// Legacy TalentTreeRegistry bootstrap (SSOT-aware, safe, and idempotent)
// ======================================================================

import { TalentTreeRegistry } from "./scripts/progression/talents/TalentTreeRegistry.js";
import TalentTreeDB from "./scripts/data/talent-tree-db.js";
import TalentDB from "./scripts/data/talent-db.js";

/**
 * Build TalentTreeRegistry if and only if:
 * - SSOT registries exist
 * - SSOT registries are built
 * - TalentTreeRegistry has not already been built
 */
async function tryBuildTalentTreeRegistry(context) {
    // Defensive: SSOT globals must exist
    if (!TalentTreeDB || !TalentDB) {
        console.warn(`[SWSE] (${context}) TalentTreeRegistry skipped — SSOT modules missing`);
        return;
    }

    // SSOT must be built
    if (!TalentTreeDB.isBuilt || !TalentDB.isBuilt) {
        console.warn(`[SWSE] (${context}) TalentTreeRegistry skipped — SSOT not ready`);
        return;
    }

    // Registry already built
    if (TalentTreeRegistry.trees?.size > 0) {
        return;
    }

    console.log(`[SWSE] (${context}) Building TalentTreeRegistry…`);
    await TalentTreeRegistry.build();
    console.log(`[SWSE] (${context}) Talent trees ready.`);
}

/* ------------------------------------------------------------------ */
/* Primary Path: after SSOT initialization                             */
/* ------------------------------------------------------------------ */

Hooks.once("swse:progression:initialized", async () => {
    await tryBuildTalentTreeRegistry("post-SSOT");
});

/* ------------------------------------------------------------------ */
/* Fallback Path: late ready (legacy safety net)                       */
/* ------------------------------------------------------------------ */

Hooks.once("ready", () => {
    setTimeout(async () => {
        await tryBuildTalentTreeRegistry("ready-fallback");
    }, 2000);
});
