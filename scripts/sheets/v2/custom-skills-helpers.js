/**
 * Handlebars helpers for custom skills rendering
 *
 * Provides template helpers for computing and displaying custom skill data.
 */

import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";

/**
 * Register custom skills handlebars helpers
 */
export function registerCustomSkillsHelpers() {
  // Get ability modifier for a given ability key
  if (!Handlebars.helpers.getAbilityMod) {
    Handlebars.registerHelper('getAbilityMod', (actor, abilityKey) => {
      if (!actor || !abilityKey) return 0;
      return SchemaAdapters.getAbilityMod(actor, abilityKey) || 0;
    });
  }

  // Calculate custom skill total
  if (!Handlebars.helpers.customSkillTotal) {
    Handlebars.registerHelper('customSkillTotal', (actor, customSkill) => {
      if (!actor || !customSkill) return 0;

      const utils = game.swse.utils;
      const abilityKey = customSkill.ability || 'int';
      const abilMod = SchemaAdapters.getAbilityMod(actor, abilityKey) || 0;
      const trained = customSkill.trained ? 5 : 0;
      const focus = customSkill.focused ? 5 : 0;
      const halfLvl = utils.math.halfLevel(actor.system.level) || 0;
      const misc = Number(customSkill.miscMod || 0);

      return abilMod + trained + focus + halfLvl + misc;
    });
  }

  // Half level helper
  if (!Handlebars.helpers.halfLevel) {
    Handlebars.registerHelper('halfLevel', (level) => {
      const utils = game.swse.utils;
      return utils.math.halfLevel(Number(level) || 1) || 0;
    });
  }
}

export default registerCustomSkillsHelpers;
