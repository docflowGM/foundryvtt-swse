/* ========================================================================== */
/* SWSE PARTIAL REGISTRATION — EXACT KEY MATCH                               */
/* Must match template usage exactly                                          */
/* ========================================================================== */

const PARTIALS = [
  // Character V2 Panels
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/identity-strip.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/abilities-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/actions-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/attacks-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/dark-side-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/defenses-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/feats-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/hp-condition-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/inventory-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/languages-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/second-wind-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/skills-panel.hbs",
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