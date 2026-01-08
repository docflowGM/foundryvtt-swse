import { swseLogger } from '../../scripts/utils/logger.js';

// Auto-generated partial loader for Foundry V12+
export function registerSWSEPartials() {
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
    "systems/foundryvtt-swse/templates/partials/talent-abilities-panel.hbs"
  ];

  for (const path of paths) {
    const name = path.split("/").pop().replace(".hbs", "");
    const tpl = foundry.templates.get(path);
    if (tpl) {
      Handlebars.registerPartial(name, tpl);
      swseLogger.log(`SWSE | Registered partial: ${name}`);
    } else {
      swseLogger.warn(`SWSE | Missing partial template: ${path}`);
    }
  }
}