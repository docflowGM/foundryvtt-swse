
// Auto-generated partial loader for Foundry V12+
export function registerSWSEPartials() {
  const paths = [
    "systems/swse/templates/partials/actor/persistent-header.hbs",
    "systems/swse/templates/partials/ui/condition-track.hbs",
    "systems/swse/templates/partials/ability-block.hbs",
    "systems/swse/templates/partials/ability-scores.hbs",
    "systems/swse/templates/partials/defenses.hbs",
    "systems/swse/templates/partials/skill-row.hbs",
    "systems/swse/templates/partials/tab-navigation.hbs",
    "systems/swse/templates/partials/item-controls.hbs"
  ];

  for (const path of paths) {
    const name = path.split("/").pop().replace(".hbs", "");
    const tpl = foundry.templates.get(path);
    if (tpl) {
      Handlebars.registerPartial(name, tpl);
      console.log(`SWSE | Registered partial: ${name}`);
    } else {
      console.warn(`SWSE | Missing partial template: ${path}`);
    }
  }
}
