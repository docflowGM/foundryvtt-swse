// ============================================
// FILE: scripts/data/uuid-map.js
// UUID Reference Map - Phase 2 Compendium Injection
// ============================================
//
// This file documents all stable UUIDs generated for prestige class prerequisites.
// UUIDs are deterministic (same input → same UUID) for consistency.
//
// UUID Scheme:
// - Prestige Classes: swse-prestige-<class-slug>
// - Feats: swse-feat-<feat-slug>
// - Talent Trees: swse-talent-<tree-slug>
// - Force Powers: swse-power-<power-slug>
//
// These UUIDs should be injected into:
// 1. prestige-prerequisites.js (this phase)
// 2. Compendium entries (future: automated via hook)
// 3. Character data migrations (future: batch UUID assignment)
//
// ============================================

/**
 * PRESTIGE CLASS UUIDs
 * One UUID per prestige class (32 classes total)
 */
export const PRESTIGE_CLASS_UUIDS = {
    'Ace Pilot': 'swse-prestige-ace-pilot',
    'Assassin': 'swse-prestige-assassin',
    'Bounty Hunter': 'swse-prestige-bounty-hunter',
    'Charlatan': 'swse-prestige-charlatan',
    'Corporate Agent': 'swse-prestige-corporate-agent',
    'Crime Lord': 'swse-prestige-crime-lord',
    'Droid Commander': 'swse-prestige-droid-commander',
    'Elite Trooper': 'swse-prestige-elite-trooper',
    'Enforcer': 'swse-prestige-enforcer',
    'Force Adept': 'swse-prestige-force-adept',
    'Force Disciple': 'swse-prestige-force-disciple',
    'Gladiator': 'swse-prestige-gladiator',
    'Gunslinger': 'swse-prestige-gunslinger',
    'Imperial Knight': 'swse-prestige-imperial-knight',
    'Improviser': 'swse-prestige-improviser',
    'Independent Droid': 'swse-prestige-independent-droid',
    'Infiltrator': 'swse-prestige-infiltrator',
    'Jedi Knight': 'swse-prestige-jedi-knight',
    'Jedi Master': 'swse-prestige-jedi-master',
    'Martial Arts Master': 'swse-prestige-martial-arts-master',
    'Master Privateer': 'swse-prestige-master-privateer',
    'Medic': 'swse-prestige-medic',
    'Melee Duelist': 'swse-prestige-melee-duelist',
    'Military Engineer': 'swse-prestige-military-engineer',
    'Officer': 'swse-prestige-officer',
    'Outlaw': 'swse-prestige-outlaw',
    'Pathfinder': 'swse-prestige-pathfinder',
    'Saboteur': 'swse-prestige-saboteur',
    'Shaper': 'swse-prestige-shaper',
    'Sith Apprentice': 'swse-prestige-sith-apprentice',
    'Sith Lord': 'swse-prestige-sith-lord',
    'Vanguard': 'swse-prestige-vanguard'
};

/**
 * FEAT UUIDs
 * All feats referenced in prestige prerequisites
 * Note: These are local IDs only. Real UUIDs from compendium will be injected in Phase 3.
 */
export const FEAT_UUIDS = {
    'Armor Proficiency (Medium)': 'swse-feat-armor-proficiency-medium',
    'Biotech Specialist': 'swse-feat-biotech-specialist',
    'Dastardly Strike': 'swse-feat-dastardly-strike',
    'Force Sensitivity': 'swse-feat-force-sensitivity',
    'Improved Damage Threshold': 'swse-feat-improved-damage-threshold',
    'Martial Arts I': 'swse-feat-martial-arts-i',
    'Martial Arts II': 'swse-feat-martial-arts-ii',
    'Melee Defense': 'swse-feat-melee-defense',
    'Melee Focus (Melee Weapon)': 'swse-feat-melee-focus-melee-weapon',
    'Point-Blank Shot': 'swse-feat-point-blank-shot',
    'Precise Shot': 'swse-feat-precise-shot',
    'Quick Draw': 'swse-feat-quick-draw',
    'Rapid Strike': 'swse-feat-rapid-strike',
    'Skill Focus (Knowledge (Bureaucracy))': 'swse-feat-skill-focus-knowledge-bureaucracy',
    'Skill Focus (Mechanics)': 'swse-feat-skill-focus-mechanics',
    'Skill Focus (Stealth)': 'swse-feat-skill-focus-stealth',
    'Sniper': 'swse-feat-sniper',
    'Surgical Expertise': 'swse-feat-surgical-expertise',
    'Vehicular Combat': 'swse-feat-vehicular-combat',
    'Weapon Focus (Melee Weapon)': 'swse-feat-weapon-focus-melee-weapon',
    'Weapon Proficiency (Advanced Melee Weapons)': 'swse-feat-weapon-proficiency-advanced-melee-weapons',
    'Weapon Proficiency (Lightsabers)': 'swse-feat-weapon-proficiency-lightsabers',
    'Weapon Proficiency (Pistols)': 'swse-feat-weapon-proficiency-pistols',
    'Flurry': 'swse-feat-flurry'
};

/**
 * TALENT TREE UUIDs
 * All talent trees referenced in prestige prerequisites
 */
export const TALENT_TREE_UUIDS = {
    'Armor Specialist': 'swse-talent-armor-specialist',
    'Awareness': 'swse-talent-awareness',
    'Brawler': 'swse-talent-brawler',
    'Camouflage': 'swse-talent-camouflage',
    'Commando': 'swse-talent-commando',
    'Dark Side Devotee': 'swse-talent-dark-side-devotee',
    'Disgrace': 'swse-talent-disgrace',
    'Force Adept': 'swse-talent-force-adept',
    'Force Item': 'swse-talent-force-item',
    'Fortune': 'swse-talent-fortune',
    'Influence': 'swse-talent-influence',
    'Leadership': 'swse-talent-leadership',
    'Lineage': 'swse-talent-lineage',
    'Mercenary': 'swse-talent-mercenary',
    'Misfortune': 'swse-talent-misfortune',
    'Smuggling': 'swse-talent-smuggling',
    'Spacer': 'swse-talent-spacer',
    'Spy': 'swse-talent-spy',
    'Survivor': 'swse-talent-survivor',
    'Veteran': 'swse-talent-veteran',
    'Weapon Specialist': 'swse-talent-weapon-specialist'
};

/**
 * FORCE POWER UUIDs
 * All force powers referenced in prestige prerequisites
 */
export const FORCE_POWER_UUIDS = {
    'Farseeing': 'swse-power-farseeing'
};

/**
 * SKILL UUIDs (if needed for future)
 * All skills referenced in prestige prerequisites
 */
export const SKILL_UUIDS = {
    'Deception': 'swse-skill-deception',
    'Gather Information': 'swse-skill-gather-information',
    'Knowledge (Bureaucracy)': 'swse-skill-knowledge-bureaucracy',
    'Knowledge (Life Sciences)': 'swse-skill-knowledge-life-sciences',
    'Knowledge (Tactics)': 'swse-skill-knowledge-tactics',
    'Mechanics': 'swse-skill-mechanics',
    'Perception': 'swse-skill-perception',
    'Persuasion': 'swse-skill-persuasion',
    'Pilot': 'swse-skill-pilot',
    'Stealth': 'swse-skill-stealth',
    'Survival': 'swse-skill-survival',
    'Treat Injury': 'swse-skill-treat-injury',
    'Use Computer': 'swse-skill-use-computer',
    'Use the Force': 'swse-skill-use-the-force'
};

/**
 * DROID SYSTEM UUIDs (if needed for future)
 */
export const DROID_SYSTEM_UUIDS = {
    'Heuristic Processor': 'swse-droid-system-heuristic-processor'
};

/**
 * Helper: Get UUID for prestige class
 */
export function getPrestigeClassUuid(className) {
    return PRESTIGE_CLASS_UUIDS[className] || null;
}

/**
 * Helper: Get UUID for feat
 */
export function getFeatUuid(featName) {
    return FEAT_UUIDS[featName] || null;
}

/**
 * Helper: Get UUID for talent tree
 */
export function getTalentTreeUuid(treeName) {
    return TALENT_TREE_UUIDS[treeName] || null;
}

/**
 * Helper: Get UUID for force power
 */
export function getForcePowerUuid(powerName) {
    return FORCE_POWER_UUIDS[powerName] || null;
}

/**
 * MIGRATION NOTES
 *
 * Phase 2 (Current): Add UUIDs to prestige-prerequisites.js
 * - Each prestige class entry now includes uuid field
 * - Feat arrays optionally include uuid fields
 * - Talent tree references still use names (backward compatible)
 *
 * Phase 3 (Future): Compendium UUID Injection
 * - Hook: When items loaded from compendium, assign their real Foundry UUIDs
 * - Map: Local UUIDs → Real Foundry UUIDs for all items
 * - Result: Prerequisites resolve via real Foundry UUIDs
 *
 * Phase 4 (Future): Slug Deprecation
 * - Once all items have real Foundry UUIDs, remove slug field
 * - Simplify resolution: UUID → name only
 */
