/**
 * Validation logic for SWSE Level Up system
 * Handles prerequisite checking for classes, talents, and feats
 */

import { PrerequisiteValidator } from '../../utils/prerequisite-validator.js';
import { isBaseClass } from './levelup-shared.js';

/**
 * Get hardcoded prerequisites for prestige classes
 * Based on SWSE Core Rulebook and supplements
 * @param {string} className - Name of the prestige class
 * @returns {string|null} - Prerequisite string or null
 */
export function getPrestigeClassPrerequisites(className) {
  const prerequisites = {
    // Core Rulebook Prestige Classes
    "Ace Pilot": "Character Level 7, Trained in Pilot, Vehicular Combat",
    "Bounty Hunter": "Character Level 7, Trained in Survival, 2 Awareness Talents",
    "Crime Lord": "Character Level 7, Trained in Deception, Trained in Persuasion, 1 Fortune/Lineage/Misfortune Talent",
    "Elite Trooper": "BAB +7, Armor Proficiency (Medium), Martial Arts I, Point-Blank Shot or Flurry, 1 Armor Specialist/Commando/Mercenary/Weapon Specialist Talent",
    "Force Adept": "Character Level 7, Trained in Use the Force, Force Sensitivity, 3 Force Talents",
    "Force Disciple": "Character Level 12, Trained in Use the Force, Force Sensitivity, 2 Dark Side Devotee/Force Adept/Force Item Talents, Farseeing Power, 1 Force Technique",
    "Gunslinger": "Character Level 7, Point-Blank Shot, Precise Shot, Quick Draw, Weapon Proficiency (Pistols)",
    "Jedi Knight": "BAB +7, Trained in Use the Force, Force Sensitivity, Weapon Proficiency (Lightsabers), Member of The Jedi",
    "Jedi Master": "Character Level 12, Trained in Use the Force, Force Sensitivity, Weapon Proficiency (Lightsabers), 1 Force Technique, Member of The Jedi",
    "Officer": "Character Level 7, Trained in Knowledge (Tactics), 1 Leadership/Commando/Veteran Talent, Military/Paramilitary Organization",
    "Sith Apprentice": "Character Level 7, Trained in Use the Force, Force Sensitivity, Weapon Proficiency (Lightsabers), Dark Side Score Equal to Wisdom, Member of The Sith",
    "Sith Lord": "Character Level 12, Trained in Use the Force, Force Sensitivity, Weapon Proficiency (Lightsabers), 1 Force Technique, Dark Side Score Equal to Wisdom, Member of The Sith",

    // Knights of the Old Republic Campaign Guide
    "Corporate Agent": "Character Level 7, Trained in Gather Information, Trained in Knowledge (Bureaucracy), Skill Focus (Knowledge (Bureaucracy)), Employed by Major Corporation",
    "Gladiator": "Character Level 7, BAB +7, Improved Damage Threshold, Weapon Proficiency (Advanced Melee Weapons)",
    "Melee Duelist": "Character Level 7, BAB +7, Melee Defense, Rapid Strike, Weapon Focus (Melee Weapon)",

    // The Force Unleashed Campaign Guide
    "Enforcer": "Character Level 7, Trained in Gather Information, Trained in Perception, 1 Survivor Talent, Law Enforcement Organization",
    "Independent Droid": "Character Level 3, Trained in Use Computer, Heuristic Processor",
    "Infiltrator": "Character Level 7, Trained in Perception, Trained in Stealth, Skill Focus (Stealth), 2 Camouflage/Spy Talents",
    "Master Privateer": "Character Level 7, Trained in Deception, Trained in Pilot, Vehicular Combat, 2 Misfortune/Smuggling/Spacer Talents",
    "Medic": "Character Level 7, Trained in Knowledge (Life Sciences), Trained in Treat Injury, Surgical Expertise",
    "Saboteur": "Character Level 7, Trained in Deception, Trained in Mechanics, Trained in Use Computer",

    // Scum and Villainy
    "Assassin": "Character Level 7, Trained in Stealth, Sniper, Dastardly Strike Talent",
    "Charlatan": "Character Level 7, Trained in Deception, Trained in Persuasion, 1 Disgrace/Influence/Lineage Talent",
    "Outlaw": "Character Level 7, Trained in Stealth, Trained in Survival, 1 Disgrace/Misfortune Talent, Wanted in at Least One System",

    // Clone Wars Campaign Guide
    "Droid Commander": "Character Level 7, Trained in Knowledge (Tactics), Trained in Use Computer, 1 Leadership/Commando Talent, Must be a Droid",
    "Military Engineer": "BAB +7, Trained in Mechanics, Trained in Use Computer",
    "Vanguard": "Character Level 7, Trained in Perception, Trained in Stealth, 2 Camouflage/Commando Talents",

    // Legacy Era Campaign Guide
    "Imperial Knight": "BAB +7, Trained in Use the Force, Armor Proficiency (Medium), Force Sensitivity, Weapon Proficiency (Lightsabers), Sworn Defender of Fel Empire",
    "Shaper": "Character Level 7, Yuuzhan Vong Species, Trained in Knowledge (Life Sciences), Trained in Treat Injury, Biotech Specialist",

    // Rebellion Era Campaign Guide
    "Improviser": "Character Level 7, Trained in Mechanics, Trained in Use Computer, Skill Focus (Mechanics)",
    "Pathfinder": "Character Level 7, Trained in Perception, Trained in Survival, 2 Awareness/Camouflage/Survivor Talents",

    // Galaxy at War
    "Martial Arts Master": "BAB +7, Martial Arts II, Melee Defense, 1 Martial Arts Feat, 1 Brawler/Survivor Talent"
  };

  return prerequisites[className] || null;
}

/**
 * Check if character meets prerequisites for a class
 * @param {Object} classDoc - The class document
 * @param {Actor} actor - The actor
 * @param {Object} pendingData - Pending selections (feats, skills, etc.)
 * @returns {boolean}
 */
export function meetsClassPrerequisites(classDoc, actor, pendingData) {
  // Base classes have no prerequisites
  if (isBaseClass(classDoc.name)) return true;

  // Hardcoded prerequisites for prestige classes (from SWSE core rules)
  const prestigePrerequisites = getPrestigeClassPrerequisites(classDoc.name);

  // If we have hardcoded prerequisites, use those
  if (prestigePrerequisites) {
    const check = PrerequisiteValidator.checkClassPrerequisites(
      { system: { prerequisites: prestigePrerequisites } },
      actor,
      pendingData
    );
    return check.valid;
  }

  // Fall back to checking classDoc prerequisites
  const check = PrerequisiteValidator.checkClassPrerequisites(classDoc, actor, pendingData);
  return check.valid;
}

/**
 * Check if character meets prerequisites for a talent
 * @param {Object} talent - The talent document
 * @param {Actor} actor - The actor
 * @param {Object} pendingData - Pending selections (feats, talents, etc.)
 * @returns {{valid: boolean, reasons: string[]}}
 */
export function checkTalentPrerequisites(talent, actor, pendingData) {
  return PrerequisiteValidator.checkTalentPrerequisites(talent, actor, pendingData);
}

/**
 * Filter feats based on prerequisites
 * @param {Array} feats - Array of feat documents
 * @param {Actor} actor - The actor
 * @param {Object} pendingData - Pending selections
 * @returns {Array} Filtered feats with isQualified flag
 */
export function filterQualifiedFeats(feats, actor, pendingData) {
  return PrerequisiteValidator.filterQualifiedFeats(feats, actor, pendingData);
}
