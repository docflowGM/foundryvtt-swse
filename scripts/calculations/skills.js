/**
 * Skill Calculations
 */

import { SKILL_ABILITY_MAP } from '../../helpers/constants.js';

export function calculateSkills(actor) {
  const sys = actor.system;
  const level = sys.level || 1;
  const halfLevel = Math.floor(level / 2);
  const penalty = actor.conditionPenalty || 0;
  
  for (const [skillKey, skill] of Object.entries(sys.skills)) {
    // Get ability modifier
    const abilityKey = SKILL_ABILITY_MAP[skillKey];
    const abilMod = sys.abilities[abilityKey]?.mod || 0;
    
    // Calculate total
    let total = abilMod + penalty;
    
    // Add half level if trained
    if (skill.trained) {
      total += halfLevel;
    }
    
    // Add Skill Focus bonus
    if (skill.focusRanks > 0) {
      total += 5 * skill.focusRanks;
    }
    
    // Add misc modifiers
    total += skill.misc || 0;
    
    skill.total = total;
  }
}
