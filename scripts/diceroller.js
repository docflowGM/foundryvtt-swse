// Dice Roller Utility
function rollDice(sides = 20) {
  return Math.floor(Math.random() * sides) + 1;
}

// Main Roller
function rollCheck(sheet, type, key, misc = 0) {
  let roll = rollDice(20);
  let bonus = 0;

  switch (type.toLowerCase()) {
    case "skill":
      if (sheet.skills && sheet.skills[key]) {
        let skill = sheet.skills[key];
        bonus = skill.rank + sheet.abilities[skill.ability].modifier + Math.floor(sheet.level / 2) + (skill.misc || 0);
      }
      break;

    case "attack":
      if (sheet.attacks && sheet.attacks[key]) {
        let atk = sheet.attacks[key];
        bonus = sheet.abilities[atk.ability].modifier + sheet.level + (atk.misc || 0);
      }
      break;

    case "save":
      if (sheet.defenses && sheet.defenses[key]) {
        let def = sheet.defenses[key];
        // Defenses are 10 + full level + ability mod + misc
        bonus = sheet.abilities[def.ability].modifier + sheet.level + (def.misc || 0);
      }
      break;

    default:
      console.error("Invalid roll type");
  }

  let total = roll + bonus + misc;
  return {
    roll: roll,
    bonus: bonus + misc,
    total: total
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

// Rolling Examples
console.log("Skill Check:", rollCheck(exampleCharacter, "skill", "Stealth"));
console.log("Attack Roll:", rollCheck(exampleCharacter, "attack", "Lightsaber"));
console.log("Save Roll:", rollCheck(exampleCharacter, "save", "Reflex"));
