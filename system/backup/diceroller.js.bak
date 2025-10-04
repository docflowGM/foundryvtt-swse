// Dice Roller Utility - supports multiple dice and sides
function rollDice(numDice = 1, sides = 20) {
  let total = 0;
  for (let i = 0; i < numDice; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return total;
}

// Normalize ability keys to canonical form
function normalizeAbility(ability) {
  const map = {
    str: "Strength",
    dex: "Dexterity",
    con: "Constitution",
    int: "Intelligence",
    wis: "Wisdom",
    cha: "Charisma"
  };
  if (!ability) return null;
  return map[ability.toLowerCase()] || ability;
}

// Calculate Skill Bonus
function calculateSkillBonus(sheet, key) {
  if (!sheet.skills || !sheet.skills[key]) {
    console.warn(`Skill '${key}' not found on character sheet`);
    return 0;
  }
  const skill = sheet.skills[key];
  const abilityKey = normalizeAbility(skill.ability);
  const abilityMod = sheet.abilities && sheet.abilities[abilityKey] ? sheet.abilities[abilityKey].modifier : 0;
  return skill.rank + abilityMod + Math.floor(sheet.level / 2) + (skill.misc || 0);
}

// Calculate Attack Bonus
function calculateAttackBonus(sheet, key) {
  if (!sheet.attacks || !sheet.attacks[key]) {
    console.warn(`Attack '${key}' not found on character sheet`);
    return 0;
  }
  const atk = sheet.attacks[key];
  const abilityKey = normalizeAbility(atk.ability);
  const abilityMod = sheet.abilities && sheet.abilities[abilityKey] ? sheet.abilities[abilityKey].modifier : 0;
  return abilityMod + sheet.level + (atk.misc || 0);
}

// Calculate Save Bonus
function calculateSaveBonus(sheet, key) {
  if (!sheet.defenses || !sheet.defenses[key]) {
    console.warn(`Save '${key}' not found on character sheet`);
    return 0;
  }
  const def = sheet.defenses[key];
  const abilityKey = normalizeAbility(def.ability);
  const abilityMod = sheet.abilities && sheet.abilities[abilityKey] ? sheet.abilities[abilityKey].modifier : 0;
  // Saves are 10 + full level + ability mod + misc
  return 10 + sheet.level + abilityMod + (def.misc || 0);
}

// Main Roller
function rollCheck(sheet, type, key, misc = 0) {
  let roll = rollDice(1, 20);
  let bonus = 0;
  let details = null;

  switch (type.toLowerCase()) {
    case "skill":
      bonus = calculateSkillBonus(sheet, key);
      details = sheet.skills ? sheet.skills[key] : null;
      break;

    case "attack":
      bonus = calculateAttackBonus(sheet, key);
      details = sheet.attacks ? sheet.attacks[key] : null;
      break;

    case "save":
      bonus = calculateSaveBonus(sheet, key);
      details = sheet.defenses ? sheet.defenses[key] : null;
      break;

    default:
      console.error(`Invalid roll type '${type}'`);
      return null;
  }

  let total = roll + bonus + misc;
  return {
    roll,
    bonus: bonus + misc,
    total,
    type,
    key,
    details
  };
}

// Example Usage
let exampleCharacter = {
  level: 5,
  abilities: {
    Strength: { score: 16, modifier: 3 },
    Dexterity: { score: 14, modifier: 2 },
    Constitution: { score: 12, modifier: 1 },
    Intelligence: { score: 10, modifier: 0 },
    Wisdom: { score: 13, modifier: 1 },
    Charisma: { score: 8, modifier: -1 }
  },
  skills: {
    Stealth: { rank: 5, ability: "Dexterity", misc: 0 }
  },
  attacks: {
    Lightsaber: { ability: "Strength", misc: 1 }
  },
  defenses: {
    Reflex: { ability: "Dexterity", misc: 0 },
    Fortitude: { ability: "Constitution", misc: 0 },
    Will: { ability: "Wisdom", misc: 0 }
  }
};

console.log("Skill Check:", rollCheck(exampleCharacter, "skill", "Stealth"));
console.log("Attack Roll:", rollCheck(exampleCharacter, "attack", "Lightsaber"));
console.log("Save Roll:", rollCheck(exampleCharacter, "save", "Reflex"));
