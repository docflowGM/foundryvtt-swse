/**
 * Ability Score Calculations
 */

export function calculateAbilities(actor) {
  const abilities = actor.system.attributes;
  
  for (const [key, ability] of Object.entries(abilities)) {
    // Total = base + racial + enhancement + temp
    ability.total = (ability.base || 10) + 
                    (ability.racial || 0) + 
                    (ability.enhancement || 0) + 
                    (ability.temp || 0);
    
    // Modifier = (total - 10) / 2, rounded down
    ability.mod = Math.floor((ability.total - 10) / 2);
  }
}
