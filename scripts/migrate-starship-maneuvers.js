#!/usr/bin/env node

/**
 * Migration script to add Starship Maneuvers as ability cards
 * This script updates three data files:
 * 1. talent-granted-abilities.json - adds 27 maneuver ability cards
 * 2. feat-metadata.json - adds Starship Tactics feat
 * 3. talent-action-links.json - adds action mappings for all maneuvers
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dataDir = path.join(__dirname, '../data');

// Define all 27 Starship Maneuvers
const starshipManeuvers = {
  "ackbar-slash": {
    id: "ackbar-slash",
    name: "Ackbar Slash",
    talentName: "Ackbar Slash",
    talentTree: "Ace Pilot",
    description: "A starship tactic made famous by the Mon Calamari Admiral Ackbar. Move into the midst of enemy forces to cause an opponent to strike its own allies.",
    actionType: "reaction",
    trigger: "When you move through enemy formation",
    roll: {
      skillKey: "pilot",
      vsTarget: "attack",
      label: "Ackbar Slash (Pilot Check)"
    },
    tags: ["vehicle", "pilot", "tactics", "reaction"],
    icon: "fas fa-directions",
    linkedAction: "starship-maneuver"
  },
  "afterburn": {
    id: "afterburn",
    name: "Afterburn",
    talentName: "Afterburn",
    talentTree: "Ace Pilot",
    description: "Throttle up and blast past enemies to avoid becoming entangled in Dogfights.",
    actionType: "fullRound",
    roll: {
      skillKey: "pilot",
      label: "Afterburn (Pilot Check)"
    },
    tags: ["vehicle", "pilot", "mobility", "fullround"],
    icon: "fas fa-fire",
    linkedAction: "starship-maneuver"
  },
  "angle-deflector-shields": {
    id: "angle-deflector-shields",
    name: "Angle Deflector Shields",
    talentName: "Angle Deflector Shields",
    talentTree: "Ace Pilot",
    description: "[Attack Pattern] Focus deflector shields in a particular direction, making it easier to absorb incoming attacks from a certain angle.",
    actionType: "swift",
    tags: ["vehicle", "defense", "shields", "attack-pattern", "swift"],
    icon: "fas fa-shield-alt",
    linkedAction: "starship-maneuver",
    effects: [{
      type: "defenseBonus",
      defense: "reflex",
      value: 2,
      condition: "from one direction",
      duration: "untilEncounterEnd"
    }]
  },
  "attack-formation-zeta-nine": {
    id: "attack-formation-zeta-nine",
    name: "Attack Formation Zeta Nine",
    talentName: "Attack Formation Zeta Nine",
    talentTree: "Ace Pilot",
    description: "[Attack Pattern] Typically used to approach Capital Ships or other vessels with heavy firepower. Emphasizes shields over firepower.",
    actionType: "swift",
    tags: ["vehicle", "formation", "defense", "attack-pattern", "swift"],
    icon: "fas fa-cube",
    linkedAction: "starship-maneuver",
    effects: [{
      type: "defenseBonus",
      defense: "reflex",
      value: 3,
      duration: "untilEncounterEnd"
    }]
  },
  "attack-pattern-delta": {
    id: "attack-pattern-delta",
    name: "Attack Pattern Delta",
    talentName: "Attack Pattern Delta",
    talentTree: "Ace Pilot",
    description: "[Attack Pattern] Utilizes close-range maneuvering by allied ships to make it more difficult to target individual vessels. Vessels typically fly in a straight line toward target.",
    actionType: "swift",
    tags: ["vehicle", "formation", "defense", "attack-pattern", "swift"],
    icon: "fas fa-arrows-alt",
    linkedAction: "starship-maneuver",
    effects: [{
      type: "defenseBonus",
      defense: "reflex",
      value: 2,
      condition: "to rear ships",
      duration: "untilEncounterEnd"
    }]
  },
  "corellian-slip": {
    id: "corellian-slip",
    name: "Corellian Slip",
    talentName: "Corellian Slip",
    talentTree: "Ace Pilot",
    description: "A teamwork-focused Starfighter tactic. Destroy an opposing Starship that threatens one of your allies by flying at the enemy vessel head-on.",
    actionType: "fullRound",
    roll: {
      skillKey: "pilot",
      vsDefense: "reflex",
      label: "Corellian Slip (Pilot Check)"
    },
    tags: ["vehicle", "pilot", "offense", "teamwork", "fullround"],
    icon: "fas fa-arrow-right",
    linkedAction: "starship-maneuver"
  },
  "counter": {
    id: "counter",
    name: "Counter",
    talentName: "Counter",
    talentTree: "Ace Pilot",
    description: "[Dogfight] Take a quick action while engaged in a Dogfight after being the target of an attack.",
    actionType: "reaction",
    trigger: "After being targeted in a Dogfight",
    tags: ["vehicle", "pilot", "defense", "dogfight", "reaction"],
    icon: "fas fa-reply",
    linkedAction: "starship-maneuver"
  },
  "darklighter-spin": {
    id: "darklighter-spin",
    name: "Darklighter Spin",
    talentName: "Darklighter Spin",
    talentTree: "Ace Pilot",
    description: "Originally an improvised combat maneuver. Attack multiple targets with your Starship's weapons.",
    actionType: "standard",
    roll: {
      skillKey: "pilot",
      label: "Darklighter Spin (Pilot Check)"
    },
    tags: ["vehicle", "pilot", "offense", "standard"],
    icon: "fas fa-sync",
    linkedAction: "starship-maneuver"
  },
  "devastating-hit": {
    id: "devastating-hit",
    name: "Devastating Hit",
    talentName: "Devastating Hit",
    talentTree: "Ace Pilot",
    description: "[Gunner] Score an incredibly precise hit on the target, punching holes in vital systems and potentially disabling your target.",
    actionType: "standard",
    roll: {
      skillKey: "pilot",
      vsDefense: "reflex",
      label: "Devastating Hit (Gunner Check)"
    },
    tags: ["vehicle", "gunner", "offense", "standard"],
    icon: "fas fa-bullseye",
    linkedAction: "starship-maneuver"
  },
  "engine-hit": {
    id: "engine-hit",
    name: "Engine Hit",
    talentName: "Engine Hit",
    talentTree: "Ace Pilot",
    description: "[Gunner] Target an opponent's engines, slowing them down with a successful hit.",
    actionType: "reaction",
    roll: {
      skillKey: "pilot",
      vsDefense: "reflex",
      label: "Engine Hit (Gunner Check)"
    },
    tags: ["vehicle", "gunner", "debuff", "reaction"],
    icon: "fas fa-fan",
    linkedAction: "starship-maneuver"
  },
  "evasive-action": {
    id: "evasive-action",
    name: "Evasive Action",
    talentName: "Evasive Action",
    talentTree: "Ace Pilot",
    description: "[Dogfight] Slip free of close pursuit, escaping from a Dogfight more easily.",
    actionType: "move",
    roll: {
      skillKey: "pilot",
      label: "Evasive Action (Pilot Check)"
    },
    tags: ["vehicle", "pilot", "mobility", "dogfight", "move"],
    icon: "fas fa-wind",
    linkedAction: "starship-maneuver"
  },
  "explosive-shot": {
    id: "explosive-shot",
    name: "Explosive Shot",
    talentName: "Explosive Shot",
    talentTree: "Ace Pilot",
    description: "[Gunner] Target critical ship systems and fuel cells, causing your target to explode with incredible force.",
    actionType: "reaction",
    roll: {
      skillKey: "pilot",
      vsDefense: "reflex",
      label: "Explosive Shot (Gunner Check)"
    },
    tags: ["vehicle", "gunner", "offense", "reaction"],
    icon: "fas fa-explosion",
    linkedAction: "starship-maneuver"
  },
  "howlrunner-formation": {
    id: "howlrunner-formation",
    name: "Howlrunner Formation",
    talentName: "Howlrunner Formation",
    talentTree: "Ace Pilot",
    description: "[Attack Pattern] Divide an attacking force into two or more groups, making it easier to attack an enemy's flanks.",
    actionType: "swift",
    tags: ["vehicle", "formation", "offense", "attack-pattern", "swift"],
    icon: "fas fa-expand",
    linkedAction: "starship-maneuver"
  },
  "i-have-you-now": {
    id: "i-have-you-now",
    name: "I Have You Now",
    talentName: "I Have You Now",
    talentTree: "Ace Pilot",
    description: "Close in on your target, striking from short range with devastating effect.",
    actionType: "swift",
    roll: {
      skillKey: "pilot",
      vsDefense: "reflex",
      label: "I Have You Now (Pilot Check)"
    },
    tags: ["vehicle", "pilot", "offense", "swift"],
    icon: "fas fa-crosshairs",
    linkedAction: "starship-maneuver"
  },
  "intercept": {
    id: "intercept",
    name: "Intercept",
    talentName: "Intercept",
    talentTree: "Ace Pilot",
    description: "Fire thrusters and intercept a passing target, engaging in a Dogfight.",
    actionType: "reaction",
    roll: {
      skillKey: "pilot",
      label: "Intercept (Pilot Check)"
    },
    tags: ["vehicle", "pilot", "dogfight", "reaction"],
    icon: "fas fa-arrow-up",
    linkedAction: "starship-maneuver"
  },
  "overwhelming-assault": {
    id: "overwhelming-assault",
    name: "Overwhelming Assault",
    talentName: "Overwhelming Assault",
    talentTree: "Ace Pilot",
    description: "[Attack Pattern] Concentrate fire on a single target to the exclusion of all others.",
    actionType: "swift",
    tags: ["vehicle", "formation", "offense", "attack-pattern", "swift"],
    icon: "fas fa-bolt",
    linkedAction: "starship-maneuver",
    effects: [{
      type: "attackBonus",
      value: 2,
      condition: "when all ships attack same target",
      duration: "untilEncounterEnd"
    }]
  },
  "segnors-loop": {
    id: "segnors-loop",
    name: "Segnor's Loop",
    talentName: "Segnor's Loop",
    talentTree: "Ace Pilot",
    description: "Accelerate quickly away from an opponent before returning to make an attack.",
    actionType: "reaction",
    roll: {
      skillKey: "pilot",
      label: "Segnor's Loop (Pilot Check)"
    },
    tags: ["vehicle", "pilot", "mobility", "reaction"],
    icon: "fas fa-redo",
    linkedAction: "starship-maneuver"
  },
  "shield-hit": {
    id: "shield-hit",
    name: "Shield Hit",
    talentName: "Shield Hit",
    talentTree: "Ace Pilot",
    description: "[Gunner] Target an opponent's shield generators, reducing their effectiveness with a successful hit.",
    actionType: "standard",
    roll: {
      skillKey: "pilot",
      vsDefense: "reflex",
      label: "Shield Hit (Gunner Check)"
    },
    tags: ["vehicle", "gunner", "debuff", "standard"],
    icon: "fas fa-ban",
    linkedAction: "starship-maneuver"
  },
  "skim-the-surface": {
    id: "skim-the-surface",
    name: "Skim the Surface",
    talentName: "Skim the Surface",
    talentTree: "Ace Pilot",
    description: "Get beneath a larger ship's shields, dealing damage that bypasses shields and directly impacts the hull.",
    actionType: "fullRound",
    roll: {
      skillKey: "pilot",
      label: "Skim the Surface (Pilot Check)"
    },
    tags: ["vehicle", "pilot", "offense", "fullround"],
    icon: "fas fa-water",
    linkedAction: "starship-maneuver"
  },
  "skywalker-loop": {
    id: "skywalker-loop",
    name: "Skywalker Loop",
    talentName: "Skywalker Loop",
    talentTree: "Ace Pilot",
    description: "[Dogfight] Loop a Vehicle through the same location it just left, launching a surprise attack on an unsuspecting opponent.",
    actionType: "reaction",
    trigger: "During a Dogfight",
    tags: ["vehicle", "pilot", "dogfight", "reaction"],
    icon: "fas fa-circle",
    linkedAction: "starship-maneuver"
  },
  "snap-roll": {
    id: "snap-roll",
    name: "Snap Roll",
    talentName: "Snap Roll",
    talentTree: "Ace Pilot",
    description: "Peel away from current location with incredible speed, causing attackers to fire at where you were moments ago.",
    actionType: "reaction",
    roll: {
      skillKey: "pilot",
      label: "Snap Roll (Pilot Check)"
    },
    tags: ["vehicle", "pilot", "defense", "reaction"],
    icon: "fas fa-vial",
    linkedAction: "starship-maneuver"
  },
  "strike-formation": {
    id: "strike-formation",
    name: "Strike Formation",
    talentName: "Strike Formation",
    talentTree: "Ace Pilot",
    description: "[Attack Pattern] Devote yourself to overwhelming an enemy with damage rather than concerning yourself with your own defense.",
    actionType: "swift",
    tags: ["vehicle", "formation", "offense", "attack-pattern", "swift"],
    icon: "fas fa-hammer",
    linkedAction: "starship-maneuver",
    effects: [{
      type: "attackBonus",
      value: 2,
      duration: "untilEncounterEnd",
      penalty: "defenseBonus",
      penaltyValue: -2
    }]
  },
  "tallon-roll": {
    id: "tallon-roll",
    name: "Tallon Roll",
    talentName: "Tallon Roll",
    talentTree: "Ace Pilot",
    description: "[Dogfight] Stay with a maneuvering opponent even when its target is attempting to escape.",
    actionType: "reaction",
    roll: {
      skillKey: "pilot",
      label: "Tallon Roll (Pilot Check)"
    },
    tags: ["vehicle", "pilot", "dogfight", "reaction"],
    icon: "fas fa-infinity",
    linkedAction: "starship-maneuver"
  },
  "target-lock": {
    id: "target-lock",
    name: "Target Lock",
    talentName: "Target Lock",
    talentTree: "Ace Pilot",
    description: "[Dogfight] Focus on single target, lining up a shot with careful precision.",
    actionType: "standard",
    roll: {
      skillKey: "pilot",
      label: "Target Lock (Pilot Check)"
    },
    tags: ["vehicle", "pilot", "offense", "dogfight", "standard"],
    icon: "fas fa-lock",
    linkedAction: "starship-maneuver"
  },
  "target-sense": {
    id: "target-sense",
    name: "Target Sense",
    talentName: "Target Sense",
    talentTree: "Ace Pilot",
    description: "[Force] Target opponents without the use of a Vehicle's targeting computer.",
    actionType: "swift",
    roll: {
      skillKey: "useTheForce",
      label: "Target Sense (Use the Force)"
    },
    tags: ["vehicle", "force", "pilot", "swift"],
    icon: "fas fa-eye",
    linkedAction: "starship-maneuver",
    prerequisites: ["use-the-force-trained"]
  },
  "thruster-hit": {
    id: "thruster-hit",
    name: "Thruster Hit",
    talentName: "Thruster Hit",
    talentTree: "Ace Pilot",
    description: "[Gunner] Target an opponent's maneuvering thrusters, reducing the maneuverability they provide to a ship.",
    actionType: "reaction",
    roll: {
      skillKey: "pilot",
      vsDefense: "reflex",
      label: "Thruster Hit (Gunner Check)"
    },
    tags: ["vehicle", "gunner", "debuff", "reaction"],
    icon: "fas fa-forward",
    linkedAction: "starship-maneuver"
  },
  "wotan-weave": {
    id: "wotan-weave",
    name: "Wotan Weave",
    talentName: "Wotan Weave",
    talentTree: "Ace Pilot",
    description: "Fly in a corkscrew, moving forward as normal but making the ship difficult to hit.",
    actionType: "swift",
    roll: {
      skillKey: "pilot",
      label: "Wotan Weave (Pilot Check)"
    },
    tags: ["vehicle", "pilot", "defense", "swift"],
    icon: "fas fa-spiral",
    linkedAction: "starship-maneuver",
    effects: [{
      type: "defenseBonus",
      defense: "reflex",
      value: 2,
      duration: "nextTurn"
    }]
  }
};

// Read and modify talent-granted-abilities.json
console.log('Adding Starship Maneuvers to talent-granted-abilities.json...');
const abilitiesPath = path.join(dataDir, 'talent-granted-abilities.json');
const abilitiesData = JSON.parse(fs.readFileSync(abilitiesPath, 'utf-8'));

// Update metadata
abilitiesData._meta.totalAbilities += 27;
abilitiesData._meta.notes += " (27 Starship Maneuvers from Ace Pilot tree)";

// Add all maneuvers to abilities
Object.assign(abilitiesData.abilities, starshipManeuvers);

// Write back
fs.writeFileSync(abilitiesPath, JSON.stringify(abilitiesData, null, 2) + '\n');
console.log(`✓ Added 27 Starship Maneuvers to talent-granted-abilities.json`);

// Read and modify feat-metadata.json
console.log('Adding Starship Tactics feat to feat-metadata.json...');
const featPath = path.join(dataDir, 'feat-metadata.json');
const featData = JSON.parse(fs.readFileSync(featPath, 'utf-8'));

// Add Starship Tactics feat
featData.feats['Starship Tactics'] = {
  category: 'misc',
  tags: ['vehicle', 'pilot', 'tactics', 'starship'],
  description: 'Learn Starship Maneuvers for use during Starship Scale combat'
};

// Write back
fs.writeFileSync(featPath, JSON.stringify(featData, null, 2) + '\n');
console.log('✓ Added Starship Tactics feat to feat-metadata.json');

// Read and modify talent-action-links.json
console.log('Adding action links for Starship Maneuvers...');
const linksPath = path.join(dataDir, 'talent-action-links.json');
const linksData = JSON.parse(fs.readFileSync(linksPath, 'utf-8'));

// Add all maneuvers to talentToAction mapping
const maneuverMappings = {
  'Ackbar Slash': 'pilot-check',
  'Afterburn': 'pilot-check',
  'Angle Deflector Shields': 'swift-action',
  'Attack Formation Zeta Nine': 'swift-action',
  'Attack Pattern Delta': 'swift-action',
  'Corellian Slip': 'pilot-check',
  'Counter': 'reaction',
  'Darklighter Spin': 'pilot-check',
  'Devastating Hit': 'pilot-check',
  'Engine Hit': 'pilot-check',
  'Evasive Action': 'pilot-check',
  'Explosive Shot': 'pilot-check',
  'Howlrunner Formation': 'swift-action',
  'I Have You Now': 'pilot-check',
  'Intercept': 'pilot-check',
  'Overwhelming Assault': 'swift-action',
  'Segnor\'s Loop': 'pilot-check',
  'Shield Hit': 'pilot-check',
  'Skim the Surface': 'pilot-check',
  'Skywalker Loop': 'pilot-check',
  'Snap Roll': 'pilot-check',
  'Strike Formation': 'swift-action',
  'Tallon Roll': 'pilot-check',
  'Target Lock': 'pilot-check',
  'Target Sense': 'use-the-force-check',
  'Thruster Hit': 'pilot-check',
  'Wotan Weave': 'pilot-check'
};

Object.assign(linksData.talentToAction, maneuverMappings);

// Add reverse mapping in actionToTalents
for (const [talent, action] of Object.entries(maneuverMappings)) {
  if (!linksData.actionToTalents[action]) {
    linksData.actionToTalents[action] = [];
  }
  if (!linksData.actionToTalents[action].includes(talent)) {
    linksData.actionToTalents[action].push(talent);
  }
}

// Update totals
linksData.totalTalents += 27;

// Write back
fs.writeFileSync(linksPath, JSON.stringify(linksData, null, 2) + '\n');
console.log('✓ Added action links for all 27 Starship Maneuvers');

console.log('\n✅ Migration complete! All Starship Maneuvers added to the system.');
