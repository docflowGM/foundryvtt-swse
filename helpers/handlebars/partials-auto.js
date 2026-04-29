/* ========================================================================== */
/* SWSE PARTIAL REGISTRATION — EXACT KEY MATCH                               */
/* Must match template usage exactly                                          */
/* ========================================================================== */

const CHARACTER_V2_CONCEPT_PARTIALS = [
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/frame/hud-bar.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/frame/title-strip.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/frame/header-block.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/frame/resource-strip.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/frame/tabs-bar.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/frame/sidebar.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/summary-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/abilities-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/skills-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/combat-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/talents-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/force-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/gear-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/biography-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/relationships-tab.hbs"
];

const PARTIALS = [
  ...CHARACTER_V2_CONCEPT_PARTIALS,

  // Character V2 Panels
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/identity-strip.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/abilities-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/actions-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/attacks-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/dark-side-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/defenses-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/feats-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/force-powers-known-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/hp-condition-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/inventory-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/languages-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/second-wind-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/skills-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/special-combat-actions-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/starship-maneuvers-known-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/talents-known-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/talents-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/xp-panel.hbs"
];

export async function registerSWSEPartials() {

  for (const path of PARTIALS) {
    try {
      const template = await fetch(path).then(r => r.text());

      // Register using EXACT same string as template reference
      Handlebars.registerPartial(path, template);

    } catch (err) {
      console.error(`SWSE | Failed to register partial: ${path}`, err);
    }
  }

  console.log(`SWSE | Registered ${PARTIALS.length} partials (exact keys)`);

}