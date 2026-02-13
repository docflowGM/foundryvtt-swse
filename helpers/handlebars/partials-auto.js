/**
 * FIX: Handlebars partial registration for Foundry VTT v13.
 *
 * Problem:
 * Sheet rendering fails with:
 *
 *   Failed to render template part "body":
 *   The partial systems/foundryvtt-swse/templates/.../partials/identity-strip.hbs could not be found
 *
 * Cause:
 * - Foundry does NOT support directory crawling via fetch().
 * - Recursive partial loaders fail in production.
 * - Partials must be registered using the FULL template path as the key.
 *
 * Requirements:
 * 1. Create a static manifest array of all required partial `.hbs` files.
 * 2. Register each partial using:
 *
 *      Handlebars.registerPartial(fullPath, templateString)
 *
 *    where fullPath is like:
 *
 *      "systems/foundryvtt-swse/templates/actors/character/v2/partials/identity-strip.hbs"
 *
 * 3. Must work in packaged Foundry environments.
 * 4. Must be async.
 * 5. Must log errors if a partial fails to load.
 */

const SYSTEM_ID = "foundryvtt-swse";

/**
 * Static manifest of Handlebars partial templates.
 * Keys MUST be full Foundry template paths.
 *
 * Regenerate via:
 *   node tools/generate-partials-manifest.mjs
 */
const PARTIAL_PATHS = [
  /* PARTIALS_MANIFEST_START */
  "systems/foundryvtt-swse/templates/actors/character/tabs/abilities-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/tabs/biography-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/tabs/combat-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/tabs/force-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/tabs/import-export-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/tabs/inventory-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/tabs/skills-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/tabs/starship-maneuvers-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/tabs/summary-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/tabs/talents-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/actions-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/attacks-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/defenses-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/feats-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/hp-condition-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/identity-strip.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/skills-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/talents-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/droid/droid-callouts-blueprint.hbs",
  "systems/foundryvtt-swse/templates/actors/droid/droid-callouts-operational.hbs",
  "systems/foundryvtt-swse/templates/actors/droid/droid-diagnostic.hbs",
  "systems/foundryvtt-swse/templates/actors/droid/droid-image-blueprint.hbs",
  "systems/foundryvtt-swse/templates/actors/droid/droid-image-operational.hbs",
  "systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-build-history.hbs",
  "systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-systems-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/npc/npc-core-stats.hbs",
  "systems/foundryvtt-swse/templates/actors/npc/npc-diagnostics-block.hbs",
  "systems/foundryvtt-swse/templates/actors/npc/npc-image.hbs",
  "systems/foundryvtt-swse/templates/actors/npc/npc-specials-block.hbs",
  "systems/foundryvtt-swse/templates/actors/npc/npc-talent-block.hbs",
  "systems/foundryvtt-swse/templates/actors/npc/npc-weapon-block.hbs",
  "systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/actions-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/attacks-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/vehicle/vehicle-callouts.hbs",
  "systems/foundryvtt-swse/templates/actors/vehicle/vehicle-image.hbs",
  "systems/foundryvtt-swse/templates/partials/ability-block.hbs",
  "systems/foundryvtt-swse/templates/partials/ability-card.hbs",
  "systems/foundryvtt-swse/templates/partials/ability-scores.hbs",
  "systems/foundryvtt-swse/templates/partials/actor/persistent-header.hbs",
  "systems/foundryvtt-swse/templates/partials/assets-panel.hbs",
  "systems/foundryvtt-swse/templates/partials/crew-action-cards.hbs",
  "systems/foundryvtt-swse/templates/partials/defenses.hbs",
  "systems/foundryvtt-swse/templates/partials/droid-builder-budget.hbs",
  "systems/foundryvtt-swse/templates/partials/feat-actions-panel.hbs",
  "systems/foundryvtt-swse/templates/partials/item-controls.hbs",
  "systems/foundryvtt-swse/templates/partials/ship-combat-actions-panel.hbs",
  "systems/foundryvtt-swse/templates/partials/skill-action-card.hbs",
  "systems/foundryvtt-swse/templates/partials/skill-actions-panel.hbs",
  "systems/foundryvtt-swse/templates/partials/skill-row-static.hbs",
  "systems/foundryvtt-swse/templates/partials/starship-maneuvers-panel.hbs",
  "systems/foundryvtt-swse/templates/partials/suggestion-card.hbs",
  "systems/foundryvtt-swse/templates/partials/tab-navigation.hbs",
  "systems/foundryvtt-swse/templates/partials/talent-abilities-panel.hbs",
  "systems/foundryvtt-swse/templates/partials/ui/condition-track.hbs",
  /* PARTIALS_MANIFEST_END */
];

let _registerPromise = null;

async function _fetchText(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.text();
}

/**
 * Register all SWSE Handlebars partials using their FULL template path.
 * Idempotent; safe to call multiple times.
 *
 * @returns {Promise<void>}
 */
export async function registerSWSEPartials() {
  if (_registerPromise) return _registerPromise;

  _registerPromise = (async () => {
    if (!globalThis.Handlebars?.registerPartial) {
      throw new Error("SWSE | Handlebars is not available; cannot register partials.");
    }

    let okCount = 0;

    for (const path of PARTIAL_PATHS) {
      if (typeof path !== "string" || !path.startsWith(`systems/${SYSTEM_ID}/`)) {
        console.error(`SWSE | Invalid partial path in manifest:`, path);
        continue;
      }

      try {
        const template = await _fetchText(path);
        Handlebars.registerPartial(path, template);
        okCount += 1;
      } catch (err) {
        console.error(`SWSE | Failed to register partial: ${path}`, err);
      }
    }

    console.log(`SWSE | Registered ${okCount}/${PARTIAL_PATHS.length} Handlebars partials`);
  })();

  return _registerPromise;
}
