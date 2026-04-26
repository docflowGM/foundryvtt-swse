/**
 * ============================================
 * FILE: scripts/engine/progression/droids/droid-trait-passive-adapter.js
 *
 * Droid Trait Passive Display Adapter
 * ============================================
 *
 * Converts droid trait rules data into passive ability cards for display on the droid sheet.
 * The authority remains droid-trait-rules.js; this adapter is purely a renderer.
 *
 * Consumed by: Droid sheet passive traits panel
 */

import {
  UNIVERSAL_DROID_TRAITS,
  getDroidDegreePackage,
  getDroidBehavioralInhibitorText,
  getDroidTalentTreeName,
  getDroidSizePackage
} from './droid-trait-rules.js';

/**
 * Generate passive trait cards for a droid actor
 * @param {Actor} actor - Droid actor
 * @returns {Array} Array of passive trait card objects
 */
export function getDroidPassiveTraitCards(actor) {
  if (!actor?.system?.isDroid) {
    return [];
  }

  const cards = [];
  const degree = actor.system.droidDegree || '1st-degree';
  const size = actor.system.droidSize || 'medium';

  // Add universal droid traits
  cards.push(..._buildUniversalTraitCards());

  // Add degree-specific traits
  cards.push(..._buildDegreeTraitCards(degree));

  // Add size-specific traits (if not medium, which is baseline)
  if (size !== 'medium') {
    cards.push(..._buildSizeTraitCards(size));
  }

  return cards;
}

/**
 * Build passive cards for universal droid traits
 * @private
 */
function _buildUniversalTraitCards() {
  const cards = [];

  // Nonliving trait
  cards.push({
    id: 'droid-nonliving',
    category: 'Droid Traits',
    name: 'Nonliving',
    source: 'SWSE Core',
    description: UNIVERSAL_DROID_TRAITS.nonliving.passiveText,
    passive: true
  });

  // Binary Interface
  cards.push({
    id: 'droid-binary-interface',
    category: 'Droid Traits',
    name: 'Binary Interface',
    source: 'SWSE Core',
    description: UNIVERSAL_DROID_TRAITS.binaryInterface.passiveText,
    passive: true
  });

  // Ion Vulnerability
  cards.push({
    id: 'droid-ion-vulnerability',
    category: 'Droid Traits',
    name: 'Ion Vulnerability',
    source: 'SWSE Core',
    description: UNIVERSAL_DROID_TRAITS.ionVulnerability.passiveText,
    passive: true
  });

  // Maintenance
  cards.push({
    id: 'droid-maintenance',
    category: 'Droid Traits',
    name: 'Maintenance Cycle',
    source: 'SWSE Core',
    description: UNIVERSAL_DROID_TRAITS.maintenance.passiveText,
    passive: true
  });

  // Memory Reassignment
  cards.push({
    id: 'droid-memory-reassignment',
    category: 'Droid Traits',
    name: 'Memory & Reprogramming',
    source: 'SWSE Core',
    description: UNIVERSAL_DROID_TRAITS.memoryReassignment.passiveText,
    passive: true
  });

  // Repair
  cards.push({
    id: 'droid-repair',
    category: 'Droid Traits',
    name: 'Repair Protocol',
    source: 'SWSE Core',
    description: UNIVERSAL_DROID_TRAITS.repair.passiveText,
    passive: true
  });

  // Shutdown
  cards.push({
    id: 'droid-shutdown',
    category: 'Droid Traits',
    name: 'Shutdown Capability',
    source: 'SWSE Core',
    description: UNIVERSAL_DROID_TRAITS.shutdown.passiveText,
    passive: true
  });

  // Systems Modularity
  cards.push({
    id: 'droid-systems-modularity',
    category: 'Droid Traits',
    name: 'Systems & Modularity',
    source: 'SWSE Core',
    description: UNIVERSAL_DROID_TRAITS.systemsModularity.passiveText,
    passive: true
  });

  return cards;
}

/**
 * Build passive cards for degree-specific traits
 * @private
 */
function _buildDegreeTraitCards(degree) {
  const cards = [];
  const degreePackage = getDroidDegreePackage(degree);

  // Degree profile
  cards.push({
    id: `droid-degree-${degree}`,
    category: 'Droid Traits',
    name: `Degree Profile: ${degreePackage.name}`,
    source: 'SWSE Core',
    description: `${degreePackage.description}\n\nTypical roles: ${degreePackage.typicalRoles}`,
    passive: true
  });

  // Behavioral Inhibitors (passive display only, not enforced)
  const behavioralText = getDroidBehavioralInhibitorText(degree);
  cards.push({
    id: `droid-behavioral-${degree}`,
    category: 'Droid Traits',
    name: 'Behavioral Inhibitors',
    source: 'SWSE Core',
    description: behavioralText,
    passive: true
  });

  // Talent tree eligibility
  const talentTreeName = getDroidTalentTreeName(degree);
  cards.push({
    id: `droid-talent-tree-${degree}`,
    category: 'Droid Traits',
    name: `Talent Tree Access: ${talentTreeName}`,
    source: 'SWSE Core',
    description: `This droid is eligible to select talents from the ${talentTreeName}.`,
    passive: true
  });

  return cards;
}

/**
 * Build passive cards for size-specific traits
 * @private
 */
function _buildSizeTraitCards(size) {
  const cards = [];
  const sizePackage = getDroidSizePackage(size);

  const sizeDisplayName = _getSizeDisplayName(size);

  // Size profile
  cards.push({
    id: `droid-size-${size}`,
    category: 'Droid Traits',
    name: `Size: ${sizeDisplayName}`,
    source: 'SWSE Core',
    description: `Base speed: ${sizePackage.baseSpeed} squares. Cost factor: ×${sizePackage.costFactor}. Reflex bonus: ${sizePackage.reflexBonus > 0 ? '+' : ''}${sizePackage.reflexBonus}. Stealth bonus: ${sizePackage.stealthBonus > 0 ? '+' : ''}${sizePackage.stealthBonus}.`,
    passive: true
  });

  return cards;
}

/**
 * Get human-readable size name
 * @private
 */
function _getSizeDisplayName(size) {
  const names = {
    'tiny': 'Tiny',
    'small': 'Small',
    'medium': 'Medium',
    'large': 'Large',
    'huge': 'Huge',
    'gargantuan': 'Gargantuan',
    'colossal': 'Colossal'
  };
  return names[size] || 'Medium';
}

/**
 * Format droid traits for display in a structured list
 * @param {Actor} actor - Droid actor
 * @returns {Object} Structured trait summary
 */
export function getDroidTraitSummary(actor) {
  if (!actor?.system?.isDroid) {
    return null;
  }

  const degree = actor.system.droidDegree || '1st-degree';
  const size = actor.system.droidSize || 'medium';
  const degreePackage = getDroidDegreePackage(degree);
  const sizePackage = getDroidSizePackage(size);

  return {
    isDroid: true,
    degree: {
      id: degree,
      name: degreePackage.name,
      description: degreePackage.description,
      typicalRoles: degreePackage.typicalRoles
    },
    size: {
      id: size,
      name: _getSizeDisplayName(size),
      baseSpeed: sizePackage.baseSpeed,
      costFactor: sizePackage.costFactor
    },
    behavioral: getDroidBehavioralInhibitorText(degree),
    talentTree: getDroidTalentTreeName(degree),
    traitCount: 8 // universal traits
  };
}
