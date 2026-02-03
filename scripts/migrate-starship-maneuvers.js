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
    trigger: "When an adjacent opponent misses an attack against you",
    targets: "One adjacent opponent",
    roll: {
      skillKey: "pilot",
      label: "Ackbar Slash (Pilot Check)"
    },
    mechanics: {
      type: "tiered",
      baseDC: 20,
      effects: [
        { dc: 20, effect: "Redirect missed attack to different adjacent opponent" },
        { dc: 25, effect: "Redirect attack with +1 maneuver bonus" },
        { dc: 30, effect: "Redirect attack with +2 maneuver bonus" },
        { dc: 35, effect: "Redirect attack with +5 maneuver bonus" }
      ]
    },
    special: "The new target of the redirected attack may not in turn use the Ackbar Slash maneuver to redirect that attack.",
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
    targets: "Self",
    roll: {
      skillKey: "pilot",
      label: "Afterburn (Pilot Check)"
    },
    mechanics: {
      type: "tiered",
      baseDC: 15,
      effects: [
        { dc: 15, effect: "All-Out Movement + +1 maneuver bonus to resist Dogfight initiation" },
        { dc: 20, effect: "All-Out Movement + +2 maneuver bonus to resist Dogfight initiation" },
        { dc: 25, effect: "All-Out Movement + +5 maneuver bonus to resist Dogfight initiation" },
        { dc: 30, effect: "All-Out Movement + +10 maneuver bonus to resist Dogfight initiation" }
      ]
    },
    special: "You take the All-Out Movement Action as a Free Action. The bonuses apply during this action to Pilot checks made to resist Dogfight initiation.",
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
    targets: "Self (special, choose one other vehicle)",
    roll: {
      skillKey: "pilot",
      label: "Angle Deflector Shields (Pilot Check)"
    },
    mechanics: {
      type: "fixed",
      baseDC: 15,
      effect: "Shield Rating doubled against chosen target, halved against all others. Change target as swift action."
    },
    special: "Requires vehicle with SR 5+. Shield Rating is considered double for chosen target, halved (rounded down) for all others. You may change target as a Swift Action. Deactivate as Swift Action.",
    tags: ["vehicle", "defense", "shields", "attack-pattern", "swift"],
    icon: "fas fa-shield-alt",
    linkedAction: "starship-maneuver"
  },
  "attack-formation-zeta-nine": {
    id: "attack-formation-zeta-nine",
    name: "Attack Formation Zeta Nine",
    talentName: "Attack Formation Zeta Nine",
    talentTree: "Ace Pilot",
    description: "[Attack Pattern] Typically used to approach Capital Ships or other vessels with heavy firepower. Emphasizes shields over firepower.",
    actionType: "swift",
    targets: "Self",
    roll: {
      skillKey: "pilot",
      label: "Attack Formation Zeta Nine (Pilot Check)"
    },
    mechanics: {
      type: "fixed",
      baseDC: 20,
      effect: "Subtract 1 die of damage from weapon damage rolls to add +20 to Shield Rating"
    },
    special: "Requires vehicle with SR 5+. Formation emphasizes defense over offense. Deactivate as Swift Action.",
    tags: ["vehicle", "formation", "defense", "attack-pattern", "swift"],
    icon: "fas fa-cube",
    linkedAction: "starship-maneuver"
  },
  "attack-pattern-delta": {
    id: "attack-pattern-delta",
    name: "Attack Pattern Delta",
    talentName: "Attack Pattern Delta",
    talentTree: "Ace Pilot",
    description: "[Attack Pattern] Utilizes close-range maneuvering by allied ships to make it more difficult to target individual vessels. Vessels typically fly in a straight line toward target.",
    actionType: "swift",
    targets: "Self",
    roll: {
      skillKey: "pilot",
      label: "Attack Pattern Delta (Pilot Check)"
    },
    mechanics: {
      type: "fixed",
      baseDC: 20,
      effect: "+1 maneuver bonus to Reflex Defense when adjacent to allied Starfighter or Airspeeder (+2 if allies also using Attack Pattern Delta)"
    },
    special: "Gain +1 maneuver bonus to vehicle Reflex Defense when adjacent to an allied Starfighter or Airspeeder. Bonus increases to +2 if any adjacent allies are also using Attack Pattern Delta.",
    tags: ["vehicle", "formation", "defense", "attack-pattern", "swift"],
    icon: "fas fa-arrows-alt",
    linkedAction: "starship-maneuver"
  },
  "corellian-slip": {
    id: "corellian-slip",
    name: "Corellian Slip",
    talentName: "Corellian Slip",
    talentTree: "Ace Pilot",
    description: "A teamwork-focused Starfighter tactic. Destroy an opposing Starship that threatens one of your allies by flying at the enemy vessel head-on.",
    actionType: "fullRound",
    targets: "One enemy Airspeeder or Starfighter within (2 x your Vehicle's Speed) squares",
    roll: {
      skillKey: "pilot",
      label: "Corellian Slip (Pilot Check)"
    },
    mechanics: {
      type: "tiered",
      baseDC: 15,
      effects: [
        { dc: 15, effect: "Move through opponent, make attack as free action. No Collision if target destroyed." },
        { dc: 20, effect: "As above + +1 circumstance bonus to attack roll" },
        { dc: 25, effect: "As above + +1 die of damage" },
        { dc: 30, effect: "+2 circumstance bonus to attack roll + +1 die of damage" },
        { dc: 35, effect: "+2 circumstance bonus to attack roll + +2 dice of damage" }
      ]
    },
    special: "Move up to twice your Vehicle's Speed in a straight line through opponent's square. Make an attack as Free Action when entering opponent's square. If movement is halted (such as being drawn into Dogfight), maneuver fails. If failed, you still move through opponent's square and Collision occurs normally—you don't get an attack and can't attempt to Avoid Collision. Opponent may attempt to Avoid Collision.",
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
    trigger: "When attacked by adjacent opponent in Dogfight",
    targets: "Self",
    roll: {
      skillKey: "pilot",
      label: "Counter (Pilot Check)"
    },
    mechanics: {
      type: "tiered",
      baseDC: 20,
      effects: [
        { dc: 20, effect: "Immediately take one Swift Action" },
        { dc: 25, effect: "Immediately take one Move Action" },
        { dc: 30, effect: "Immediately take one Standard Action" }
      ]
    },
    special: "Activate as Reaction to being attacked by a Vehicle in Dogfight. Attack is resolved before you take your Action. Initiative Order is not modified.",
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
    targets: "Self",
    roll: {
      skillKey: "pilot",
      label: "Darklighter Spin (Pilot Check)"
    },
    mechanics: {
      type: "tiered",
      baseDC: 25,
      effects: [
        { dc: 25, effect: "Make Autofire attack at -5 penalty" },
        { dc: 30, effect: "Make Autofire attack at -2 penalty" },
        { dc: 35, effect: "Make Autofire attack without penalty" }
      ]
    },
    special: "Make Starship Scale Area Attack with Autofire weapon even if not normally capable. Weapon must be capable of Autofire.",
    tags: ["vehicle", "pilot", "offense", "standard"],
    icon: "fas fa-arrows-rotate",
    linkedAction: "starship-maneuver"
  },
  "devastating-hit": {
    id: "devastating-hit",
    name: "Devastating Hit",
    talentName: "Devastating Hit",
    talentTree: "Ace Pilot",
    description: "[Gunner] Score an incredibly precise hit on the target, punching holes in vital systems and potentially disabling your target.",
    actionType: "standard",
    targets: "A single Vehicle within range",
    roll: {
      skillKey: "pilot",
      vsDefense: "reflex",
      label: "Devastating Hit (Gunner Check)"
    },
    mechanics: {
      type: "margin",
      effects: [
        { margin: 0, effect: "Normal weapon damage + 1 extra die" },
        { margin: 5, effect: "Normal weapon damage + 2 extra dice" },
        { margin: 10, effect: "Normal weapon damage + 3 extra dice" }
      ]
    },
    special: "Make attack roll. Compare to target's Reflex Defense. Effects depend on how much you exceed the defense.",
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
    trigger: "After dealing Critical Hit or damage >= Damage Threshold",
    targets: "One Vehicle you just attacked",
    roll: {
      skillKey: "pilot",
      vsDefense: "reflex",
      label: "Engine Hit (Gunner Check)"
    },
    mechanics: {
      type: "margin",
      effects: [
        { margin: 0, effect: "Target's Speed reduced by 1 square (DC 20 Mechanics to repair)" },
        { margin: 5, effect: "Target's Speed reduced by 2 squares (DC 25 Mechanics to repair)" },
        { margin: 10, effect: "Target's Speed reduced by 3 squares (DC 30 Mechanics to repair)" }
      ]
    },
    special: "Activate as Reaction after dealing Critical Hit or damage >= Damage Threshold. Reduction lasts remainder of encounter. Engineer on target can repair with Full-Round Action.",
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
    targets: "Self",
    roll: {
      skillKey: "pilot",
      label: "Evasive Action (Pilot Check)"
    },
    mechanics: {
      type: "tiered",
      baseDC: 15,
      effects: [
        { dc: 15, effect: "Disengage from Dogfight (no action) + +2 bonus on Disengage check" },
        { dc: 20, effect: "Disengage from Dogfight (no action) + +5 bonus on Disengage check" },
        { dc: 25, effect: "Disengage from Dogfight (no action) + +10 bonus on Disengage check" },
        { dc: 30, effect: "Disengage from Dogfight (no action) + +20 bonus on Disengage check" }
      ]
    },
    special: "Immediately attempt to disengage from Dogfight with no action required.",
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
    trigger: "After destroying a Vehicle",
    targets: "All targets adjacent to ship you just destroyed",
    roll: {
      skillKey: "pilot",
      vsDefense: "reflex",
      label: "Explosive Shot (Gunner Check)"
    },
    mechanics: {
      type: "margin",
      effects: [
        { margin: 0, effect: "3d10x2 damage" },
        { margin: 5, effect: "4d10x2 damage" },
        { margin: 10, effect: "5d10x2 damage" }
      ]
    },
    special: "Activate as Reaction to attack that destroys a Vehicle (reduces to 0 HP with damage >= Damage Threshold).",
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
    targets: "Self",
    roll: {
      skillKey: "pilot",
      label: "Howlrunner Formation (Pilot Check)"
    },
    mechanics: {
      type: "fixed",
      baseDC: 20,
      effect: "+1 maneuver bonus on attack rolls while adjacent to allied Airspeeder or Starfighter (+2 if adjacent allies also using Howlrunner)"
    },
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
    targets: "One adjacent Vehicle",
    roll: {
      skillKey: "pilot",
      label: "I Have You Now (Pilot Check)"
    },
    mechanics: {
      type: "tiered",
      baseDC: 15,
      effects: [
        { dc: 15, effect: "If damage dealt, compare attack roll to Fortitude Defense: exceeds = -1 condition track" },
        { dc: 20, effect: "+1 maneuver bonus to next attack + Fortitude Defense condition check" },
        { dc: 25, effect: "+2 maneuver bonus to next attack + Fortitude Defense condition check" },
        { dc: 30, effect: "+5 maneuver bonus to next attack + Fortitude Defense condition check" }
      ]
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
    trigger: "When enemy Starfighter or Airspeeder moves within 2 squares",
    targets: "Target within 2 squares",
    roll: {
      skillKey: "pilot",
      label: "Intercept (Pilot Check)"
    },
    mechanics: {
      type: "tiered",
      baseDC: 20,
      effects: [
        { dc: 20, effect: "Initiate Dogfight as Attack of Opportunity + move 1 square toward target" },
        { dc: 25, effect: "Initiate Dogfight with +1 maneuver bonus as AoO + move 1 square" },
        { dc: 30, effect: "Initiate Dogfight with +2 maneuver bonus as AoO + move 1 square" },
        { dc: 35, effect: "Initiate Dogfight with +5 maneuver bonus as AoO + move 1 square" }
      ]
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
    targets: "Self (choose one other Vehicle)",
    roll: {
      skillKey: "pilot",
      label: "Overwhelming Assault (Pilot Check)"
    },
    mechanics: {
      type: "fixed",
      baseDC: 20,
      effect: "Choose penalty to subtract from all attack rolls; add twice that to damage rolls (before multipliers). Penalty applies to all attacks, bonus only on chosen target."
    },
    special: "Change target as Swift Action. Damage bonus only applies to chosen target, penalty applies to all attacks until start of next turn. Deactivate as Swift Action.",
    tags: ["vehicle", "formation", "offense", "attack-pattern", "swift"],
    icon: "fas fa-bolt",
    linkedAction: "starship-maneuver"
  },
  "segnors-loop": {
    id: "segnors-loop",
    name: "Segnor's Loop",
    talentName: "Segnor's Loop",
    talentTree: "Ace Pilot",
    description: "Accelerate quickly away from an opponent before returning to make an attack.",
    actionType: "reaction",
    trigger: "If you end turn further away than when turn began",
    targets: "One target within range",
    roll: {
      skillKey: "pilot",
      label: "Segnor's Loop (Pilot Check)"
    },
    mechanics: {
      type: "tiered",
      baseDC: 20,
      effects: [
        { dc: 20, effect: "Attack Run with -10 Reflex Defense penalty" },
        { dc: 25, effect: "Attack Run with -5 Reflex Defense penalty" },
        { dc: 30, effect: "Attack Run with -2 Reflex Defense penalty" },
        { dc: 35, effect: "Attack Run with -1 Reflex Defense penalty" }
      ]
    },
    tags: ["vehicle", "pilot", "mobility", "reaction"],
    icon: "fas fa-rotate-right",
    linkedAction: "starship-maneuver"
  },
  "shield-hit": {
    id: "shield-hit",
    name: "Shield Hit",
    talentName: "Shield Hit",
    talentTree: "Ace Pilot",
    description: "[Gunner] Target an opponent's shield generators, reducing their effectiveness with a successful hit.",
    actionType: "standard",
    targets: "A single Vehicle within range",
    roll: {
      skillKey: "pilot",
      vsDefense: "reflex",
      label: "Shield Hit (Gunner Check)"
    },
    mechanics: {
      type: "margin",
      effects: [
        { margin: 0, effect: "Shield Rating reduced by 5" },
        { margin: 5, effect: "Shield Rating reduced by 10" },
        { margin: 10, effect: "Shield Rating reduced by 15" }
      ]
    },
    special: "Damage reduced normally by DR and SR. Effect applied after damage. If damage exceeds SR, additional -5 reduction applies. System Operator can Recharge Shields to restore SR.",
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
    targets: "One Colossal (Frigate)+ ship whose Fighting Space you fly through",
    roll: {
      skillKey: "pilot",
      label: "Skim the Surface (Pilot Check)"
    },
    mechanics: {
      type: "tiered",
      baseDC: 20,
      effects: [
        { dc: 20, effect: "-10 penalty on attack roll, ignores SR" },
        { dc: 25, effect: "-5 penalty on attack roll, ignores SR" },
        { dc: 30, effect: "-2 penalty on attack roll, ignores SR" },
        { dc: 35, effect: "-1 penalty on attack roll, ignores SR" }
      ]
    },
    special: "Move up to twice Speed through target's Fighting Space. Make attack ignoring SR. If result <20, Collision occurs. Gunners with Ready Actions take same penalties and ignore SR.",
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
    trigger: "When opponent fails opposed Pilot check in Dogfight",
    targets: "One target engaged in Dogfight with you",
    roll: {
      skillKey: "pilot",
      label: "Skywalker Loop (Pilot Check)"
    },
    mechanics: {
      type: "fixed",
      baseDC: 20,
      effect: "Make Attack of Opportunity against opponent who failed Dogfight check"
    },
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
    trigger: "When incoming attack declared",
    targets: "Self",
    roll: {
      skillKey: "pilot",
      label: "Snap Roll (Pilot Check)"
    },
    mechanics: {
      type: "fixed",
      effect: "Pilot check result replaces Reflex Defense until start of next turn (you may keep normal Reflex if higher)"
    },
    special: "Declare before attack is resolved and damage rolled. Check result becomes your Reflex Defense vs that attack.",
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
    targets: "Self",
    roll: {
      skillKey: "pilot",
      label: "Strike Formation (Pilot Check)"
    },
    mechanics: {
      type: "fixed",
      baseDC: 20,
      effect: "+1 die of maneuver bonus damage on all weapon rolls, but -2 penalty to Reflex Defense"
    },
    special: "Deactivate as Swift Action. Formation remains spent if deactivated.",
    tags: ["vehicle", "formation", "offense", "attack-pattern", "swift"],
    icon: "fas fa-hammer",
    linkedAction: "starship-maneuver"
  },
  "tallon-roll": {
    id: "tallon-roll",
    name: "Tallon Roll",
    talentName: "Tallon Roll",
    talentTree: "Ace Pilot",
    description: "[Dogfight] Stay with a maneuvering opponent even when its target is attempting to escape.",
    actionType: "reaction",
    trigger: "When opponent attempts to disengage from Dogfight",
    targets: "One target engaged in Dogfight with you",
    roll: {
      skillKey: "pilot",
      label: "Tallon Roll (Pilot Check)"
    },
    mechanics: {
      type: "tiered",
      baseDC: 20,
      effects: [
        { dc: 20, effect: "Target suffers no penalty; make AoO if disengagement fails" },
        { dc: 25, effect: "Target suffers -1 penalty on Disengage check; make AoO if fails" },
        { dc: 30, effect: "Target suffers -2 penalty on Disengage check; make AoO if fails" },
        { dc: 35, effect: "Target suffers -5 penalty on Disengage check; make AoO if fails" }
      ]
    },
    special: "Activate as Reaction after opponent declares Dogfight disengagement attempt, before opposed Pilot check.",
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
    targets: "One target engaged in Dogfight",
    roll: {
      skillKey: "pilot",
      label: "Target Lock (Pilot Check)"
    },
    mechanics: {
      type: "tiered",
      baseDC: 15,
      effects: [
        { dc: 15, effect: "+1 maneuver bonus on Dogfight checks and attack rolls" },
        { dc: 20, effect: "+2 maneuver bonus on Dogfight checks, +1 on attack rolls" },
        { dc: 25, effect: "+2 maneuver bonus on Dogfight checks and attack rolls" },
        { dc: 30, effect: "+5 maneuver bonus on Dogfight checks, +2 on attack rolls" },
        { dc: 35, effect: "+5 maneuver bonus on Dogfight checks and attack rolls" }
      ]
    },
    special: "If target successfully disengages, benefits are lost even if you initiate Dogfight again.",
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
    targets: "Self",
    roll: {
      skillKey: "useTheForce",
      label: "Target Sense (Use the Force)"
    },
    mechanics: {
      type: "tiered",
      baseDC: 20,
      effects: [
        { dc: 20, effect: "Add CHA bonus on attack rolls until start of next turn" },
        { dc: 25, effect: "Add CHA bonus + +2 maneuver bonus on attack rolls" },
        { dc: 30, effect: "Add CHA bonus + +5 maneuver bonus on attack rolls" }
      ]
    },
    special: "Replace Vehicle's INT bonus with your CHA bonus on attack rolls this round. Bonus stacks with Battle Strike Force Power.",
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
    trigger: "After dealing Critical Hit or damage >= Damage Threshold",
    targets: "One Vehicle you just attacked",
    roll: {
      skillKey: "pilot",
      vsDefense: "reflex",
      label: "Thruster Hit (Gunner Check)"
    },
    mechanics: {
      type: "margin",
      effects: [
        { margin: 0, effect: "-1 penalty to Reflex Defense, Initiative, and Pilot checks for remainder of encounter" },
        { margin: 5, effect: "-2 penalty to Reflex Defense, Initiative, and Pilot checks for remainder of encounter" },
        { margin: 10, effect: "-5 penalty to Reflex Defense, Initiative, and Pilot checks. Additionally, target can only move in straight line." }
      ]
    },
    special: "Activate as Reaction after dealing Critical Hit or damage >= Damage Threshold. Effects last remainder of encounter.",
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
    targets: "Self",
    roll: {
      skillKey: "pilot",
      label: "Wotan Weave (Pilot Check)"
    },
    mechanics: {
      type: "tiered",
      baseDC: 15,
      effects: [
        { dc: 15, effect: "Speed reduced by half (rounded down), +1 maneuver bonus to Reflex Defense" },
        { dc: 20, effect: "Speed reduced by half (rounded down), +2 maneuver bonus to Reflex Defense" },
        { dc: 25, effect: "Speed reduced by half (rounded down), +5 maneuver bonus to Reflex Defense" }
      ]
    },
    special: "Used when Fly Defensively. Bonuses until start of next turn. If Speed would be reduced to 0, you automatically fail.",
    tags: ["vehicle", "pilot", "defense", "swift"],
    icon: "fas fa-spiral",
    linkedAction: "starship-maneuver"
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
