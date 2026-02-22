/* ========================================================================== */
/* SWSE PARTIAL REGISTRATION — EXACT KEY MATCH                               */
/* Must match template usage exactly                                          */
/* ========================================================================== */

const PARTIALS = [
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/identity-strip.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/abilities-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/hp-condition-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/defenses-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/xp-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/second-wind-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/dark-side-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/languages-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/Talents.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/Feats.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/Racial-ability.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/Force.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/skills-panel.hbs"
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