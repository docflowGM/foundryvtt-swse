import os

# Base path
base_path = r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse"
rolls_path = os.path.join(base_path, "rolls")

# Create rolls directory if it doesn't exist
os.makedirs(rolls_path, exist_ok=True)

# Refactored roll files that use the new utils
refactored_files = {
    "attacks.js": '''// ============================================
// FILE: rolls/attacks.js
// Attack roll handling using SWSE utils
// ============================================

/**
 * Roll an attack with a weapon
 * @param {Actor} actor - The attacking actor
 * @param {Item} weapon - The weapon being used
 * @returns {Promise<Roll>} The attack roll
 */
export async function rollAttack(actor, weapon) {
  const utils = game.swse.utils;
  
  // Get components
  const halfLvl = utils.math.halfLevel(actor.system.level);
  const bab = actor.system.bab || 0;
  const abilMod = utils.math.calculateAbilityModifier(
    actor.system.abilities[weapon.attackAttr]?.base || 10
  );
  const focus = weapon.focus ? 1 : 0;
  const misc = weapon.modifier || 0;
  
  // Calculate total attack bonus
  const attackBonus = utils.combat.calculateAttackBonus(
    bab,
    abilMod,
    [halfLvl, focus, misc]
  );
  
  // Roll the attack
  const roll = await new Roll(`1d20 + ${attackBonus}`).evaluate({async: true});
  
  // Send to chat
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `${weapon.name} Attack (${utils.string.formatModifier(attackBonus)})`
  });
  
  return roll;
}

/**
 * Roll damage with a weapon
 * @param {Actor} actor - The attacking actor
 * @param {Item} weapon - The weapon being used
 * @returns {Promise<Roll>} The damage roll
 */
export async function rollDamage(actor, weapon) {
  const utils = game.swse.utils;
  
  const halfLvl = utils.math.halfLevel(actor.system.level);
  let dmgMod = halfLvl + (weapon.modifier || 0);
  
  // Handle different damage attribute types
  const strMod = utils.math.calculateAbilityModifier(actor.system.abilities.str?.base || 10);
  const dexMod = utils.math.calculateAbilityModifier(actor.system.abilities.dex?.base || 10);
  
  switch (weapon.damageAttr) {
    case "str":
      dmgMod += strMod;
      break;
    case "dex":
      dmgMod += dexMod;
      break;
    case "2str":
      dmgMod += strMod * 2;
      break;
    case "2dex":
      dmgMod += dexMod * 2;
      break;
  }
  
  // Add specialization bonus
  if (weapon.specialization) dmgMod += 1;
  
  // Calculate damage
  const damageCalc = utils.combat.calculateDamage(
    weapon.damage || "1d6",
    0, // ability already added above
    [dmgMod]
  );
  
  // Roll damage
  const roll = await new Roll(damageCalc.formula).evaluate({async: true});
  
  // Send to chat
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `${weapon.name} Damage`
  });
  
  return roll;
}

/**
 * Roll a full attack (attack + damage on hit)
 * @param {Actor} actor - The attacking actor
 * @param {Item} weapon - The weapon being used
 * @returns {Promise<object>} Object containing attack and damage rolls
 */
export async function rollFullAttack(actor, weapon) {
  const attackRoll = await rollAttack(actor, weapon);
  
  // Check if attack hits (this would need target AC)
  const result = {
    attack: attackRoll,
    damage: null
  };
  
  // Optionally auto-roll damage on crit threat
  const utils = game.swse.utils;
  if (utils.dice.isCriticalThreat(attackRoll.total, weapon.critRange || 20)) {
    ui.notifications.info("Critical Threat!");
    // Could auto-roll damage here
  }
  
  return result;
}
''',

    "damage.js": '''// ============================================
// FILE: rolls/damage.js
// Damage roll handling using SWSE utils
// ============================================

/**
 * Roll generic damage
 * @param {Actor} actor - The actor dealing damage
 * @param {Item} weapon - The weapon or power being used
 * @returns {Promise<Roll>} The damage roll
 */
export async function rollDamage(actor, weapon) {
  const dmg = weapon.system?.damage || "1d6";
  const roll = await new Roll(dmg).evaluate({async: true});
  
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `${actor.name} deals damage with ${weapon.name}`
  });
  
  return roll;
}

/**
 * Roll damage with modifiers
 * @param {Actor} actor - The actor dealing damage
 * @param {string} formula - Damage dice formula
 * @param {number} modifier - Damage modifier
 * @param {string} label - Damage type/label
 * @returns {Promise<Roll>} The damage roll
 */
export async function rollDamageWithMod(actor, formula, modifier = 0, label = "Damage") {
  const utils = game.swse.utils;
  const fullFormula = `${formula} + ${modifier}`;
  
  const roll = await new Roll(fullFormula).evaluate({async: true});
  
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `${label} (${utils.string.formatModifier(modifier)})`
  });
  
  return roll;
}

/**
 * Apply damage to a token
 * @param {Token} token - The token to damage
 * @param {number} damage - Amount of damage
 * @returns {Promise<Actor>} Updated actor
 */
export async function applyDamage(token, damage) {
  const actor = token.actor;
  if (!actor) return null;
  
  const currentHP = actor.system.hp?.value || 0;
  const newHP = Math.max(0, currentHP - damage);
  
  await actor.update({"system.hp.value": newHP});
  
  ui.notifications.info(`${actor.name} takes ${damage} damage!`);
  
  return actor;
}
''',

    "defenses.js": '''// ============================================
// FILE: rolls/defenses.js
// Defense calculations using SWSE utils
// ============================================

/**
 * Calculate a defense value
 * @param {Actor} actor - The actor
 * @param {string} type - Defense type (fortitude, reflex, will)
 * @returns {number} Total defense value
 */
export function calculateDefense(actor, type) {
  const utils = game.swse.utils;
  const def = actor.system.defenses?.[type];
  
  if (!def) return 10;

  const base = 10;
  const lvl = actor.system.level || 1;
  const abilityScore = actor.system.abilities[def.ability]?.base ?? 10;
  const ability = utils.math.calculateAbilityModifier(abilityScore);
  const armor = def.armor || 0;
  const misc = def.modifier || 0;
  const cls = def.class || 0;

  return utils.math.calculateDefense(
    base,
    ability,
    armor,
    [lvl, cls, misc]
  );
}

/**
 * Calculate all defenses for an actor
 * @param {Actor} actor - The actor
 * @returns {object} All defense values
 */
export function calculateAllDefenses(actor) {
  return {
    fortitude: calculateDefense(actor, "fortitude"),
    reflex: calculateDefense(actor, "reflex"),
    will: calculateDefense(actor, "will")
  };
}

/**
 * Get defense with cover bonus
 * @param {Actor} actor - The actor
 * @param {string} type - Defense type
 * @param {string} coverType - Cover type (none, partial, cover, improved)
 * @returns {number} Defense with cover
 */
export function getDefenseWithCover(actor, type, coverType = "none") {
  const utils = game.swse.utils;
  const baseDefense = calculateDefense(actor, type);
  const coverBonus = utils.combat.getCoverBonus(coverType);
  
  return baseDefense + coverBonus;
}

/**
 * Calculate damage threshold
 * @param {Actor} actor - The actor
 * @returns {number} Damage threshold value
 */
export function calculateDamageThreshold(actor) {
  const utils = game.swse.utils;
  const fortitude = calculateDefense(actor, "fortitude");
  const size = actor.system.size || "medium";
  
  return utils.math.calculateDamageThreshold(fortitude, size);
}
''',

    "dice.js": '''// ============================================
// FILE: rolls/dice.js
// Generic dice rolling using SWSE utils
// ============================================

/**
 * Roll dice with a formula
 * @param {string} formula - Dice formula (e.g., "2d6+3")
 * @param {object} data - Data for formula variables
 * @param {string} label - Label for the roll
 * @returns {Promise<Roll>} The roll result
 */
export async function rollDice(formula, data = {}, label = "Roll") {
  try {
    const roll = await new Roll(formula, data).evaluate({async: true});
    
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker(),
      flavor: label
    });
    
    return roll;
  } catch (err) {
    ui.notifications.error(`Dice roll failed: ${err.message}`);
    console.error(err);
    return null;
  }
}

/**
 * Roll with advantage (roll twice, take higher)
 * @param {string} formula - Dice formula
 * @param {string} label - Label for the roll
 * @returns {Promise<Roll>} The higher roll
 */
export async function rollWithAdvantage(formula, label = "Roll with Advantage") {
  const roll1 = await new Roll(formula).evaluate({async: true});
  const roll2 = await new Roll(formula).evaluate({async: true});
  
  const higherRoll = roll1.total >= roll2.total ? roll1 : roll2;
  
  await higherRoll.toMessage({
    speaker: ChatMessage.getSpeaker(),
    flavor: `${label} (${roll1.total} vs ${roll2.total})`
  });
  
  return higherRoll;
}

/**
 * Roll with disadvantage (roll twice, take lower)
 * @param {string} formula - Dice formula
 * @param {string} label - Label for the roll
 * @returns {Promise<Roll>} The lower roll
 */
export async function rollWithDisadvantage(formula, label = "Roll with Disadvantage") {
  const roll1 = await new Roll(formula).evaluate({async: true});
  const roll2 = await new Roll(formula).evaluate({async: true});
  
  const lowerRoll = roll1.total <= roll2.total ? roll1 : roll2;
  
  await lowerRoll.toMessage({
    speaker: ChatMessage.getSpeaker(),
    flavor: `${label} (${roll1.total} vs ${roll2.total})`
  });
  
  return lowerRoll;
}

/**
 * Quick d20 roll
 * @param {number} modifier - Modifier to add
 * @param {string} label - Label for the roll
 * @returns {Promise<Roll>} The roll result
 */
export async function d20(modifier = 0, label = "d20") {
  return rollDice(`1d20 + ${modifier}`, {}, label);
}
''',

    "initiative.js": '''// ============================================
// FILE: rolls/initiative.js
// Initiative rolling using SWSE utils
// ============================================

/**
 * Roll initiative for an actor
 * @param {Actor} actor - The actor rolling initiative
 * @returns {Promise<Roll>} The initiative roll
 */
export async function rollInitiative(actor) {
  const utils = game.swse.utils;
  
  const dexScore = actor.system.abilities?.dex?.base || 10;
  const dexMod = utils.math.calculateAbilityModifier(dexScore);
  const initiativeBonus = actor.system.initiative?.bonus || 0;
  
  const totalBonus = dexMod + initiativeBonus;
  
  const roll = await new Roll(`1d20 + ${totalBonus}`).evaluate({async: true});
  
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `${actor.name} rolls initiative! (${utils.string.formatModifier(totalBonus)})`
  });
  
  return roll;
}

/**
 * Roll initiative for multiple actors
 * @param {Actor[]} actors - Array of actors
 * @returns {Promise<object[]>} Array of results
 */
export async function rollGroupInitiative(actors) {
  const results = [];
  
  for (const actor of actors) {
    const roll = await rollInitiative(actor);
    results.push({
      actor,
      roll,
      total: roll.total
    });
  }
  
  // Sort by initiative result (highest first)
  results.sort((a, b) => b.total - a.total);
  
  return results;
}

/**
 * Set initiative for a combatant
 * @param {Actor} actor - The actor
 * @param {number} initiative - Initiative value
 */
export async function setInitiative(actor, initiative) {
  const combatant = game.combat?.combatants?.find(c => c.actor.id === actor.id);
  
  if (combatant) {
    await game.combat.setInitiative(combatant.id, initiative);
    ui.notifications.info(`${actor.name} initiative set to ${initiative}`);
  }
}
''',

    "saves.js": '''// ============================================
// FILE: rolls/saves.js
// Saving throw rolls using SWSE utils
// ============================================

/**
 * Roll a saving throw (uses defense as save in SWSE)
 * @param {Actor} actor - The actor making the save
 * @param {string} type - Save type (fortitude, reflex, will)
 * @returns {Promise<Roll>} The save roll
 */
export async function rollSave(actor, type) {
  const utils = game.swse.utils;
  
  // In SWSE, "saves" are just defense checks
  const def = actor.system.defenses?.[type];
  if (!def) {
    ui.notifications.warn(`Defense type ${type} not found`);
    return null;
  }
  
  const defenseBonus = def.class || 0;
  const abilityScore = actor.system.abilities[def.ability]?.base || 10;
  const abilityMod = utils.math.calculateAbilityModifier(abilityScore);
  const halfLvl = utils.math.halfLevel(actor.system.level);
  
  const totalBonus = defenseBonus + abilityMod + halfLvl;
  
  const roll = await new Roll(`1d20 + ${totalBonus}`).evaluate({async: true});
  
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `${actor.name} rolls a ${utils.string.capitalize(type)} save (${utils.string.formatModifier(totalBonus)})`
  });
  
  return roll;
}

/**
 * Compare save roll against DC
 * @param {Roll} saveRoll - The save roll
 * @param {number} dc - Difficulty class
 * @returns {boolean} True if save succeeded
 */
export function checkSaveSuccess(saveRoll, dc) {
  const success = saveRoll.total >= dc;
  
  if (success) {
    ui.notifications.info(`Save succeeded! (${saveRoll.total} vs DC ${dc})`);
  } else {
    ui.notifications.warn(`Save failed! (${saveRoll.total} vs DC ${dc})`);
  }
  
  return success;
}
''',

    "skills.js": '''// ============================================
// FILE: rolls/skills.js
// Skill check rolling using SWSE utils
// ============================================

/**
 * Roll a skill check
 * @param {Actor} actor - The actor making the check
 * @param {string} skillKey - The skill key
 * @returns {Promise<Roll>} The skill check roll
 */
export async function rollSkill(actor, skillKey) {
  const utils = game.swse.utils;
  const skill = actor.system.skills?.[skillKey];
  
  if (!skill) {
    ui.notifications.warn(`Skill ${skillKey} not found`);
    return null;
  }
  
  // Get skill modifier (use actor's method if available)
  const mod = actor.getSkillMod ? actor.getSkillMod(skill) : calculateSkillMod(actor, skill);
  
  const roll = await new Roll(`1d20 + ${mod}`).evaluate({async: true});
  
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `${skill.label || skillKey} Check (${utils.string.formatModifier(mod)})`
  });
  
  return roll;
}

/**
 * Calculate skill modifier
 * @param {Actor} actor - The actor
 * @param {object} skill - The skill object
 * @returns {number} Total skill modifier
 */
export function calculateSkillMod(actor, skill) {
  const utils = game.swse.utils;
  
  const abilityScore = actor.system.abilities[skill.ability]?.base || 10;
  const abilMod = utils.math.calculateAbilityModifier(abilityScore);
  const trained = skill.trained ? 5 : 0;
  const focus = skill.focus ? 5 : 0;
  const halfLvl = utils.math.halfLevel(actor.system.level);
  const misc = skill.modifier || 0;
  
  return abilMod + trained + focus + halfLvl + misc;
}

/**
 * Roll skill check with DC comparison
 * @param {Actor} actor - The actor
 * @param {string} skillKey - The skill key
 * @param {number} dc - Difficulty class
 * @returns {Promise<object>} Result with roll and success
 */
export async function rollSkillCheck(actor, skillKey, dc) {
  const roll = await rollSkill(actor, skillKey);
  
  if (!roll) return null;
  
  const success = roll.total >= dc;
  
  if (success) {
    ui.notifications.info(`Success! (${roll.total} vs DC ${dc})`);
  } else {
    ui.notifications.warn(`Failed! (${roll.total} vs DC ${dc})`);
  }
  
  return { roll, success };
}

/**
 * Roll opposed skill check
 * @param {Actor} actor1 - First actor
 * @param {string} skill1 - First actor's skill
 * @param {Actor} actor2 - Second actor
 * @param {string} skill2 - Second actor's skill
 * @returns {Promise<object>} Results with winner
 */
export async function rollOpposedCheck(actor1, skill1, actor2, skill2) {
  const roll1 = await rollSkill(actor1, skill1);
  const roll2 = await rollSkill(actor2, skill2);
  
  if (!roll1 || !roll2) return null;
  
  const winner = roll1.total > roll2.total ? actor1 : 
                 roll2.total > roll1.total ? actor2 : null;
  
  return {
    roll1,
    roll2,
    winner,
    tie: winner === null
  };
}
'''
}

# Delete the old utils.js file since we're using the new utils folder
utils_file = os.path.join(rolls_path, "utils.js")
if os.path.exists(utils_file):
    os.remove(utils_file)
    print(f"✓ Deleted old utils.js (functionality moved to utils/ folder)")

# Delete old save.js (renamed to saves.js)
old_save_file = os.path.join(rolls_path, "save.js")
if os.path.exists(old_save_file):
    os.remove(old_save_file)
    print(f"✓ Deleted old save.js (renamed to saves.js)")

# Create each refactored file
created_files = []
for filename, content in refactored_files.items():
    filepath = os.path.join(rolls_path, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    created_files.append(filename)
    print(f"✓ Refactored: {filename}")

print(f"\n✅ Successfully refactored {len(created_files)} roll files in:")
print(f"   {rolls_path}")
print("\nRefactored files now use game.swse.utils:")
for filename in created_files:
    print(f"   - {filename}")

print("\n🗑️  Deleted old files:")
print("   - utils.js (moved to utils/ folder)")
print("   - save.js (renamed to saves.js)")

print("\n📝 IMPORTANT: Update your index.js!")
print("   Add these imports after your utils imports:")
print('''
   import * as Attacks from "./rolls/attacks.js";
   import * as Damage from "./rolls/damage.js";
   import * as Defenses from "./rolls/defenses.js";
   import * as Dice from "./rolls/dice.js";
   import * as Initiative from "./rolls/initiative.js";
   import * as Saves from "./rolls/saves.js";
   import * as Skills from "./rolls/skills.js";
''')
print("   And add to game.swse object:")
print('''
   rolls: {
     attacks: Attacks,
     damage: Damage,
     defenses: Defenses,
     dice: Dice,
     initiative: Initiative,
     saves: Saves,
     skills: Skills
   }
''')

print("\n✅ After updating index.js, you can use:")
print("   game.swse.rolls.attacks.rollAttack(actor, weapon)")
print("   game.swse.rolls.skills.rollSkill(actor, 'perception')")
print("   game.swse.rolls.initiative.rollInitiative(actor)")
print("   etc.")