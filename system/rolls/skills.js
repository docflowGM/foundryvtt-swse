import { rollDice } from "./dice.js";
import { getAbilityMod, halfLevel } from "./utils.js";

export async function rollSkill(actor, skillKey) {
  const skill = actor.system.skills[skillKey];
  if (!skill) return ui.notifications.warn(`Skill ${skillKey} not found`);

  const abilityMod = getAbilityMod(actor.system.abilities[skill.ability]?.base ?? 10);
  const trained = skill.trained ? 5 : 0;
  const focus = skill.focus ? 5 : 0;
  const halfLvl = halfLevel(actor.system.level || 1);

  const totalMod = abilityMod + trained + focus + halfLvl + (skill.value ?? 0);

  return rollDice(`1d20 + ${totalMod}`, {}, `Skill Check: ${skillKey}`);
}
