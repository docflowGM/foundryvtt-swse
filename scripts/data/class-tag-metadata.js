/**
 * Canonical semantic metadata for class suggestion and build interpretation.
 * This enriches the class SSOT with the same general tag ecosystem used across
 * species, feats, talents, and attribute-driven suggestion work.
 */

export const CLASS_TAG_METADATA = {
  'Jedi': {
    abilities: ['wis', 'cha'],
    skills: ['useTheForce', 'perception', 'initiative'],
    feats: ['Force Sensitivity', 'Weapon Proficiency (Lightsabers)'],
    talentTrees: ['Lightsaber Combat', 'Jedi Mind Tricks', 'Telekinetic Savant'],
    theme: 'force',
    tags: ['force', 'lightsaber', 'melee', 'wisdom', 'charisma', 'will', 'control', 'mobility', 'damage', 'forceTraining', 'forcePower', 'forceSensitive', 'defense']
  },
  'Noble': {
    abilities: ['cha', 'int'],
    skills: ['persuasion', 'deception', 'gatherInformation', 'knowledge'],
    feats: ['Linguist', 'Skill Focus'],
    talentTrees: ['Inspiration', 'Influence', 'Leadership'],
    theme: 'social',
    tags: ['leader', 'support', 'socialSynergy', 'charisma', 'intelligence', 'skills', 'knowledge', 'utility', 'coordination']
  },
  'Scoundrel': {
    abilities: ['dex', 'cha'],
    skills: ['deception', 'stealth', 'mechanics', 'pilot'],
    feats: ['Point-Blank Shot', 'Precise Shot'],
    talentTrees: ['Fortune', 'Misfortune', 'Slicer'],
    theme: 'ranged',
    tags: ['dexterity', 'charisma', 'ranged', 'stealth', 'skills', 'tech', 'pilotSynergy', 'mobility', 'control', 'utility']
  },
  'Scout': {
    abilities: ['dex', 'wis'],
    skills: ['survival', 'perception', 'stealth', 'initiative'],
    feats: ['Armor Proficiency (Light)'],
    talentTrees: ['Awareness', 'Camouflage', 'Fringer'],
    theme: 'exploration',
    tags: ['dexterity', 'wisdom', 'stealth', 'ranged', 'survival', 'perception', 'mobility', 'defense', 'skills', 'initiative']
  },
  'Soldier': {
    abilities: ['str', 'con'],
    skills: ['endurance', 'mechanics', 'initiative'],
    feats: ['Armor Proficiency (Medium)', 'Armor Proficiency (Heavy)', 'Weapon Focus'],
    talentTrees: ['Armor Specialist', 'Commando', 'Weapon Specialist'],
    theme: 'combat',
    tags: ['strength', 'constitution', 'melee', 'ranged', 'damage', 'defense', 'fortitude', 'martial', 'durable']
  },
  'Ace Pilot': {
    abilities: ['dex', 'int'],
    skills: ['pilot', 'mechanics'],
    feats: ['Vehicular Combat', 'Skill Focus (Pilot)'],
    talentTrees: ['Spacer'],
    theme: 'vehicle',
    tags: ['dexterity', 'intelligence', 'pilotSynergy', 'vehicle', 'mobility', 'tech', 'skills']
  },
  'Assassin': {
    abilities: ['dex', 'int'],
    skills: ['stealth', 'deception', 'initiative'],
    feats: ['Sniper', 'Point-Blank Shot'],
    talents: ['Dastardly Strike'],
    talentTrees: ['Misfortune'],
    theme: 'stealth',
    tags: ['dexterity', 'intelligence', 'stealth', 'ranged', 'damage', 'control', 'mobility']
  },
  'Bounty Hunter': {
    abilities: ['wis', 'dex'],
    skills: ['survival', 'perception', 'initiative'],
    talentTrees: ['Awareness'],
    theme: 'tracking',
    tags: ['wisdom', 'dexterity', 'ranged', 'tracking', 'control', 'survival', 'perception', 'damage']
  },
  'Crime Lord': {
    abilities: ['cha', 'int'],
    skills: ['deception', 'persuasion', 'knowledge'],
    talentTrees: ['Fortune', 'Lineage', 'Misfortune'],
    theme: 'social',
    tags: ['charisma', 'intelligence', 'leader', 'socialSynergy', 'control', 'support', 'skills', 'utility']
  },
  'Elite Trooper': {
    abilities: ['str', 'con'],
    skills: ['endurance', 'initiative'],
    feats: ['Armor Proficiency (Medium)', 'Martial Arts I', 'Point-Blank Shot'],
    talentTrees: ['Armor Specialist', 'Commando', 'Weapon Specialist'],
    theme: 'combat',
    tags: ['strength', 'constitution', 'melee', 'ranged', 'damage', 'defense', 'durable', 'martial']
  },
  'Force Adept': {
    abilities: ['wis', 'cha'],
    skills: ['useTheForce', 'knowledge'],
    feats: ['Force Sensitivity'],
    talentTrees: ['Alter', 'Control', 'Sense'],
    theme: 'force',
    tags: ['force', 'wisdom', 'charisma', 'control', 'support', 'utility', 'forcePower', 'forceSensitive']
  },
  'Force Disciple': {
    abilities: ['wis', 'cha'],
    skills: ['useTheForce', 'knowledge'],
    feats: ['Force Sensitivity'],
    talentTrees: ['Dark Side Devotee', 'Force Adept', 'Force Item'],
    theme: 'force',
    tags: ['force', 'wisdom', 'charisma', 'control', 'support', 'utility', 'forcePower', 'forceSensitive']
  },
  'Gladiator': {
    abilities: ['str', 'con'],
    feats: ['Improved Damage Threshold', 'Weapon Proficiency (Advanced Melee Weapons)'],
    theme: 'melee',
    tags: ['strength', 'constitution', 'melee', 'damage', 'durable', 'martial']
  },
  'Gunslinger': {
    abilities: ['dex'],
    feats: ['Point-Blank Shot', 'Precise Shot', 'Quick Draw', 'Weapon Proficiency (Pistols)'],
    talentTrees: ['Fortune'],
    theme: 'ranged',
    tags: ['dexterity', 'ranged', 'damage', 'mobility', 'initiative']
  },
  'Imperial Knight': {
    abilities: ['str', 'wis'],
    skills: ['useTheForce', 'initiative'],
    feats: ['Force Sensitivity', 'Weapon Proficiency (Lightsabers)', 'Armor Proficiency (Medium)'],
    talentTrees: ['Lightsaber Combat'],
    theme: 'force',
    tags: ['force', 'strength', 'wisdom', 'lightsaber', 'melee', 'defense', 'durable', 'forceSensitive']
  },
  'Infiltrator': {
    abilities: ['dex', 'int'],
    skills: ['perception', 'stealth', 'useComputer'],
    feats: ['Skill Focus (Stealth)'],
    talentTrees: ['Camouflage', 'Spy'],
    theme: 'stealth',
    tags: ['dexterity', 'intelligence', 'stealth', 'control', 'mobility', 'skills', 'tech']
  },
  'Jedi Knight': {
    abilities: ['wis', 'cha'],
    skills: ['useTheForce', 'initiative'],
    feats: ['Force Sensitivity', 'Weapon Proficiency (Lightsabers)'],
    talentTrees: ['Lightsaber Combat', 'Jedi Mind Tricks'],
    theme: 'force',
    tags: ['force', 'wisdom', 'charisma', 'lightsaber', 'melee', 'control', 'defense', 'forceSensitive']
  },
  'Jedi Master': {
    abilities: ['wis', 'cha'],
    skills: ['useTheForce', 'knowledge'],
    feats: ['Force Sensitivity', 'Weapon Proficiency (Lightsabers)'],
    talentTrees: ['Lightsaber Combat', 'Jedi Mind Tricks'],
    theme: 'force',
    tags: ['force', 'wisdom', 'charisma', 'lightsaber', 'control', 'support', 'leader', 'forceSensitive']
  },
  'Martial Arts Master': {
    abilities: ['str', 'dex'],
    feats: ['Martial Arts II', 'Melee Defense'],
    talentTrees: ['Brawler', 'Survivor'],
    theme: 'melee',
    tags: ['strength', 'dexterity', 'melee', 'damage', 'defense', 'mobility']
  },
  'Medic': {
    abilities: ['int', 'wis'],
    skills: ['treatInjury', 'knowledge'],
    feats: ['Surgical Expertise'],
    theme: 'support',
    tags: ['intelligence', 'wisdom', 'support', 'healing', 'skills', 'utility', 'knowledge']
  },
  'Melee Duelist': {
    abilities: ['str', 'dex'],
    feats: ['Melee Defense', 'Rapid Strike', 'Weapon Focus'],
    theme: 'melee',
    tags: ['strength', 'dexterity', 'melee', 'damage', 'defense', 'mobility']
  },
  'Military Engineer': {
    abilities: ['int'],
    skills: ['mechanics', 'useComputer'],
    theme: 'tech',
    tags: ['intelligence', 'tech', 'skills', 'utility', 'support']
  },
  'Officer': {
    abilities: ['cha', 'int'],
    skills: ['knowledge', 'persuasion'],
    theme: 'leader',
    tags: ['charisma', 'intelligence', 'leader', 'support', 'knowledge', 'socialSynergy', 'utility']
  },
  'Outlaw': {
    abilities: ['dex', 'cha'],
    skills: ['stealth', 'deception', 'pilot'],
    theme: 'ranged',
    tags: ['dexterity', 'charisma', 'stealth', 'ranged', 'mobility', 'pilotSynergy', 'skills']
  },
  'Pathfinder': {
    abilities: ['dex', 'wis'],
    skills: ['survival', 'perception', 'pilot'],
    theme: 'exploration',
    tags: ['dexterity', 'wisdom', 'survival', 'perception', 'mobility', 'pilotSynergy', 'skills']
  },
  'Sith Apprentice': {
    abilities: ['wis', 'cha'],
    skills: ['useTheForce', 'deception'],
    feats: ['Force Sensitivity'],
    talentTrees: ['Sith Alchemy', 'Sith Lord'],
    theme: 'force',
    tags: ['force', 'wisdom', 'charisma', 'control', 'damage', 'socialSynergy', 'forceSensitive']
  },
  'Sith Lord': {
    abilities: ['wis', 'cha'],
    skills: ['useTheForce', 'deception'],
    feats: ['Force Sensitivity'],
    talentTrees: ['Sith Alchemy', 'Sith Lord'],
    theme: 'force',
    tags: ['force', 'wisdom', 'charisma', 'control', 'leader', 'damage', 'forceSensitive']
  }
};

export function getClassTagMetadata(className) {
  return CLASS_TAG_METADATA[className] || null;
}
