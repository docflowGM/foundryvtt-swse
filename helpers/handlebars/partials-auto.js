/* ========================================================================== */
/* SWSE PARTIAL REGISTRATION — EXACT KEY MATCH                               */
/* Must match template usage exactly                                          */
/* ========================================================================== */

const PARTIALS = [

  // Character V2
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/identity-strip.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/hp-condition-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/defenses-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/skills-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/feats-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/talents-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/attacks-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/actions-panel.hbs",

  // Droid V2
  "systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-systems-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-build-history.hbs",

  // Vehicle V2
  "systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/attacks-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/actions-panel.hbs",

  // Shared
  "systems/foundryvtt-swse/templates/partials/actor/persistent-header.hbs",
  "systems/foundryvtt-swse/templates/partials/ui/condition-track.hbs",
  "systems/foundryvtt-swse/templates/partials/skill-row-static.hbs",
  "systems/foundryvtt-swse/templates/partials/feat-actions-panel.hbs",
  "systems/foundryvtt-swse/templates/partials/talent-abilities-panel.hbs",
  "systems/foundryvtt-swse/templates/partials/assets-panel.hbs",
  "systems/foundryvtt-swse/templates/partials/suggestion-card.hbs",
  "systems/foundryvtt-swse/templates/partials/starship-maneuvers-panel.hbs"

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
