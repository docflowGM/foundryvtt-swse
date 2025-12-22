/**
 * Defense Calculations
 */

import { SIZE_AC_MODIFIERS } from '../../scripts/core/constants.js';

export function calculateDefenses(actor) {
  const sys = actor.system;
  const level = sys.level || 1;
  const penalty = actor.conditionPenalty || 0;
  const sizeMod = SIZE_AC_MODIFIERS[sys.size] || 0;

  // Get equipped armor
  const armor = actor.items.find(i => i.type === 'armor' && i.system.equipped);

  // Check for armor proficiency
  const isProficient = checkArmorProficiency(actor, armor);

  // Check for Armored Defense talents
  const hasArmored = actor.items.some(i =>
    i.type === 'talent' && i.name === 'Armored Defense'
  );
  const hasImproved = actor.items.some(i =>
    i.type === 'talent' && i.name === 'Improved Armored Defense'
  );

  // Get class bonuses (one-time per class, not per level)
  const fortClassBonus = sys.defenses?.fortitude?.class || 0;
  const refClassBonus = sys.defenses?.reflex?.class || 0;
  const willClassBonus = sys.defenses?.will?.class || 0;

  // REFLEX DEFENSE
  sys.defenses.reflex.total = calculateReflex(
    level, sys.abilities, armor, hasArmored, hasImproved, penalty, sizeMod, refClassBonus, isProficient
  );

  // FORTITUDE DEFENSE
  const isDroid = sys.isDroid || false;
  sys.defenses.fortitude.total = calculateFortitude(
    level, sys.abilities, armor, penalty, sizeMod, isDroid, fortClassBonus, isProficient
  );

  // WILL DEFENSE
  sys.defenses.will.total = calculateWill(
    level, sys.abilities, penalty, sizeMod, willClassBonus
  );
}

function calculateReflex(level, abilities, armor, hasArmored, hasImproved, penalty, sizeMod, classBonus = 0, isProficient = true) {
  let base = 10;
  let abilMod = abilities.dex?.mod || 0;
  let equipmentBonus = 0;

  if (armor) {
    const armorBonus = armor.system.defenseBonus || 0;

    // Apply max dex restriction
    if (Number.isInteger(armor.system.maxDexBonus)) {
      abilMod = Math.min(abilMod, armor.system.maxDexBonus);
    }

    // Armor vs Level calculation
    if (hasImproved) {
      base += Math.max(level + Math.floor(armorBonus / 2), armorBonus);
    } else if (hasArmored) {
      base += Math.max(level, armorBonus);
    } else {
      base += armorBonus;
    }

    // Equipment bonus only if proficient with armor
    if (isProficient) {
      equipmentBonus = armor.system.equipmentBonus || 0;
    }
  } else {
    // No armor = level bonus
    base += level;
  }

  return base + abilMod + equipmentBonus + penalty + sizeMod + classBonus;
}

function calculateFortitude(level, abilities, armor, penalty, sizeMod, isDroid = false, classBonus = 0, isProficient = true) {
  const base = 10 + level;

  // Droids use STR modifier for Fortitude Defense (they have no CON)
  const abilityMod = isDroid
    ? (abilities.str?.mod || 0)
    : (abilities.con?.mod || 0);

  // Equipment bonus only if proficient with armor
  let armorBonus = 0;
  if (armor && isProficient) {
    armorBonus = armor.system.equipmentBonus || armor.system.fortBonus || 0;
  }

  return base + abilityMod + armorBonus + penalty + sizeMod + classBonus;
}

function calculateWill(level, abilities, penalty, sizeMod, classBonus = 0) {
  const base = 10 + level;
  const wisMod = abilities.wis?.mod || 0;

  return base + wisMod + penalty + sizeMod + classBonus;
}

function checkArmorProficiency(actor, armor) {
  if (!armor) return true; // No armor equipped, always proficient

  const armorType = armor.system.armorType?.toLowerCase() || 'light';

  const armorProficiencies = actor.items.filter(i =>
    (i.type === 'feat' || i.type === 'talent') &&
    i.name.toLowerCase().includes('armor proficiency')
  ) || [];

  // SWSE Rule: Each armor proficiency only covers its specific type
  for (const prof of armorProficiencies) {
    const profName = prof.name.toLowerCase();
    if (profName.includes('light') && armorType === 'light') return true;
    if (profName.includes('medium') && armorType === 'medium') return true;
    if (profName.includes('heavy') && armorType === 'heavy') return true;
  }

  return false;
}
