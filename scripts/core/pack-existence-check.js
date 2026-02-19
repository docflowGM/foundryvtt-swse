/**
 * Lightweight Pack Existence Check
 *
 * Simple verification that required compendium packs exist.
 * No index inspection, no iteration, no corruption checking.
 */

export function checkRequiredPacks() {
  const required = [
    "foundryvtt-swse.classes",
    "foundryvtt-swse.skills",
    "foundryvtt-swse.talents",
    "foundryvtt-swse.talent_trees",
    "foundryvtt-swse.feats",
    "foundryvtt-swse.species"
  ];

  const missing = required.filter(id => !game.packs.get(id));

  if (missing.length) {
    console.error("[SWSE] Missing required compendium packs:", missing);
  } else {
    console.log("[SWSE] Required compendium packs verified.");
  }
}
