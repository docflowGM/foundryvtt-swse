/**
 * Defense Calculations
 */

import { SIZE_AC_MODIFIERS } from '../core/constants.js';

export function calculateDefenses(actor) {
  const sys = actor.system;
  const level = sys.level || 1;
  const penalty = actor.conditionPenalty || 0;
  const sizeMod = SIZE_AC_MODIFIERS[sys.size] || 0;
  
  // Get equipped armor
  const armor = actor.items.find(i => i.type === 'armor' && i.system.equipped);
  
  // Check for Armored Defense talents
  const hasArmored = actor.items.some(i => 
    i.type === 'talent' && i.name === 'Armored Defense'
  );
  const hasImproved = actor.items.some(i => 
    i.type === 'talent' && i.name === 'Improved Armored Defense'
  );
  
  // REFLEX DEFENSE
  sys.defenses.reflex.total = calculateReflex(
    level, sys.abilities, armor, hasArmored, hasImproved, penalty, sizeMod
  );
  
  // FORTITUDE DEFENSE
  const isDroid = sys.isDroid || false;
  sys.defenses.fortitude.total = calculateFortitude(
    level, sys.abilities, armor, penalty, sizeMod, isDroid
  );
  
  // WILL DEFENSE
  sys.defenses.will.total = calculateWill(
    level, sys.abilities, penalty, sizeMod
  );
}

function calculateReflex(level, abilities, armor, hasArmored, hasImproved, penalty, sizeMod) {
  let base = 10;
  let abilMod = abilities.dex?.mod || 0;
  
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
  } else {
    // No armor = level bonus
    base += level;
  }
  
  return base + abilMod + penalty + sizeMod;
}

function calculateFortitude(level, abilities, armor, penalty, sizeMod, isDroid = false) {
  const base = 10 + level;

  // Droids use STR modifier for Fortitude Defense (they have no CON)
  const abilityMod = isDroid
    ? (abilities.str?.mod || 0)
    : (abilities.con?.mod || 0);

  const armorBonus = armor?.system.fortBonus || 0;

  return base + abilityMod + armorBonus + penalty + sizeMod;
}

function calculateWill(level, abilities, penalty, sizeMod) {
  const base = 10 + level;
  const wisMod = abilities.wis?.mod || 0;
  
  return base + wisMod + penalty + sizeMod;
}
