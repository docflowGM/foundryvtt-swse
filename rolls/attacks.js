import { rollDice } from "./dice.js";
import { getAbilityMod, fullLevel } from "./utils.js";

export async function rollAttack(actor, weapon) {
  const attackBonus = weapon.system.attackBonus || 0;
  const roll = await new Roll(`1d20 + ${attackBonus}`).evaluate({async: true});
  roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `${actor.name} attacks with ${weapon.name}`
  });
  return roll;
}

export async function rollDamage(actor, weapon) {
  const attr = weapon.damageAttr || "str";
  const abilityMod = getAbilityMod(actor.system.abilities[attr]?.base ?? 10);
  const formula = `${weapon.damage} + ${abilityMod}`;

  return rollDice(formula, {}, `Damage Roll: ${weapon.name}`);
}
