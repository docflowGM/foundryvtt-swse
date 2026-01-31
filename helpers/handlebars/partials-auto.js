import { swseLogger } from '../../scripts/utils/logger.js';

export async function registerSWSEPartials() {
  const paths = [
    "systems/foundryvtt-swse/templates/partials/actor/persistent-header.hbs",
    "systems/foundryvtt-swse/templates/partials/ui/condition-track.hbs",
    "systems/foundryvtt-swse/templates/partials/ability-block.hbs",
    "systems/foundryvtt-swse/templates/partials/ability-scores.hbs",
    "systems/foundryvtt-swse/templates/partials/defenses.hbs",
    "systems/foundryvtt-swse/templates/partials/skill-row-static.hbs",
    "systems/foundryvtt-swse/templates/partials/tab-navigation.hbs",
    "systems/foundryvtt-swse/templates/partials/item-controls.hbs",
    "systems/foundryvtt-swse/templates/partials/skill-actions-panel.hbs",
    "systems/foundryvtt-swse/templates/partials/skill-action-card.hbs",
    "systems/foundryvtt-swse/templates/partials/assets-panel.hbs",
    "systems/foundryvtt-swse/templates/partials/talent-abilities-panel.hbs",
    "systems/foundryvtt-swse/templates/actors/droid/droid-diagnostic.hbs",
    "systems/foundryvtt-swse/templates/actors/vehicle/vehicle-image.hbs",
    "systems/foundryvtt-swse/templates/actors/vehicle/vehicle-callouts.hbs",
    "systems/foundryvtt-swse/templates/partials/crew-action-cards.hbs"
  ];

  for (const path of paths) {
    const name = path.split("/").pop().replace(".hbs", "");

    try {
      const response = await fetch(path);
      if (!response.ok) {
        swseLogger.warn(`SWSE | Failed to fetch partial: ${path} (${response.status})`);
        continue;
      }
      const html = await response.text();
      Handlebars.registerPartial(name, html);
      swseLogger.log(`SWSE | Registered partial: ${name}`);
    } catch (error) {
      swseLogger.error(`SWSE | Error registering partial ${name}:`, error);
    }
  }
}
