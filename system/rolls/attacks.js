import { rollDice } from "./dice.js";
import { getAbilityMod, fullLevel } from "./utils.js";

export async function rollAttack(actor, weapon) {
  const attr = weapon.attackAttr || "str";
  const abilityMod = getAbilityMod(actor.system.abilities[attr]?.base ?? 10);
  const lvlBonus = fullLevel(actor.system.level || 1);
  const misc = weapon.modifier || 0;

  const attackBonus = abilityMod + lvlBonus + misc;

  return rollDice(`1d20 + ${attackBonus}`, {}, `Attack Roll: ${weapon.name}`);
}

export async function rollDamage(actor, weapon) {
  const attr = weapon.damageAttr || "str";
  const abilityMod = getAbilityMod(actor.system.abilities[attr]?.base ?? 10);
  const formula = `${weapon.damage} + ${abilityMod}`;

  return rollDice(formula, {}, `Damage Roll: ${weapon.name}`);
}
