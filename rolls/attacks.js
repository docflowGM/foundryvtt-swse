// ============================================
// FILE: rolls/attacks.js
// ============================================
import { getAbilityMod, halfLevel } from "./utils.js";

export async function rollAttack(actor, weapon) {
  const halfLvl = halfLevel(actor.system.level);
  const bab = actor.system.bab || 0;
  const abilMod = getAbilityMod(actor.system.abilities[weapon.attackAttr]?.base || 10);
  const focus = weapon.focus ? 1 : 0;
  const misc = weapon.modifier || 0;
  
  const attackBonus = halfLvl + bab + abilMod + focus + misc;
  const roll = await new Roll(`1d20 + ${attackBonus}`).evaluate({async: true});
  
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `${weapon.name} Attack`
  });
  return roll;
}

export async function rollDamage(actor, weapon) {
  const halfLvl = halfLevel(actor.system.level);
  let dmgMod = halfLvl + (weapon.modifier || 0);
  
  if (weapon.damageAttr === "str") {
    dmgMod += getAbilityMod(actor.system.abilities.str?.base || 10);
  } else if (weapon.damageAttr === "dex") {
    dmgMod += getAbilityMod(actor.system.abilities.dex?.base || 10);
  } else if (weapon.damageAttr === "2str") {
    dmgMod += getAbilityMod(actor.system.abilities.str?.base || 10) * 2;
  } else if (weapon.damageAttr === "2dex") {
    dmgMod += getAbilityMod(actor.system.abilities.dex?.base || 10) * 2;
  }
  
  if (weapon.specialization) dmgMod += 1;
  
  const formula = `${weapon.damage} + ${dmgMod}`;
  const roll = await new Roll(formula).evaluate({async: true});
  
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `${weapon.name} Damage`
  });
  return roll;
}
