export const skillHelpers = {
  // Get friendly skill name
  skillName: (key) => {
    const names = {
      acrobatics: "Acrobatics",
      climb: "Climb",
      deception: "Deception",
      endurance: "Endurance",
      gather_information: "Gather Information",
      initiative: "Initiative",
      jump: "Jump",
      knowledge_bureaucracy: "Knowledge (Bureaucracy)",
      knowledge_galactic_lore: "Knowledge (Galactic Lore)",
      knowledge_life_sciences: "Knowledge (Life Sciences)",
      knowledge_physical_sciences: "Knowledge (Physical Sciences)",
      knowledge_social_sciences: "Knowledge (Social Sciences)",
      knowledge_tactics: "Knowledge (Tactics)",
      knowledge_technology: "Knowledge (Technology)",
      mechanics: "Mechanics",
      perception: "Perception",
      persuasion: "Persuasion",
      pilot: "Pilot",
      ride: "Ride",
      stealth: "Stealth",
      survival: "Survival",
      swim: "Swim",
      treat_injury: "Treat Injury",
      use_computer: "Use Computer",
      use_the_force: "Use the Force"
    };
    return names[key] || key;
  },

  // Count trained skills
  countTrained: (skills) => {
    return Object.values(skills).filter(s => s.trained).length;
  },

  // Get max skills based on level and int
  maxSkills: (context) => {
    const level = context.system?.level?.heroic || 1;
    const intMod = context.system?.attributes?.int?.mod || 0;
    return level + intMod;
  }
};
