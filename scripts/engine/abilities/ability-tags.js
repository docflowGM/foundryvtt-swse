/**
 * AbilityTags
 * Canonical tag authority for all ability sources.
 */

const CANONICAL = new Set([
  'Passive',
  'Free Action',
  'Swift Action',
  'Move Action',
  'Standard Action',
  'Full-Round Action',
  'Reaction',
  'Situational',
  'Once Per Encounter',
  'Once Per Day',
  'Followers',
  'Force',
  'Dark Side',
  'Light Side',
  'Mind-Affecting',
  'Fear',
  'Vehicle',
  'Jet Pack',
  'Lightsaber',
  'Autofire',
  'Second Wind',
  'Condition Track',
  'Cover',
  'Disarm',
  'Movement',
  'Attack',
  'Defense',
  'Support',
  'Social',
  'Luck',
  'Resource',
  'Tactics',
  // Starship maneuver category tags
  'ship',
  'maneuver',
  // Starship crew role tags
  'pilot',
  'gunner',
  'copilot',
  'engineer',
  'commander',
  'systemOperator',
  // Starship maneuver semantic tags
  'attack-pattern',
  'dogfight',
  'force'
]);

/**
 * Structured tag namespaces for starship maneuvers.
 * Used by normalization and filtering logic.
 */
const MANEUVER_TAG_NAMESPACES = {
  category: ['ship', 'maneuver'],
  role: ['pilot', 'gunner', 'copilot', 'engineer', 'commander', 'systemOperator'],
  semantic: ['attack-pattern', 'dogfight', 'force']
};

const ACTION_LABELS = {
  passive: 'Passive',
  free: 'Free Action',
  swift: 'Swift Action',
  move: 'Move Action',
  standard: 'Standard Action',
  fullRound: 'Full-Round Action',
  reaction: 'Reaction'
};

const ACTION_TAGS = {
  passive: 'Passive',
  free: 'Free Action',
  swift: 'Swift Action',
  move: 'Move Action',
  standard: 'Standard Action',
  fullRound: 'Full-Round Action',
  reaction: 'Reaction'
};

function _norm(s) {
  return String(s ?? '').trim();
}

export class AbilityTags {
  static actionLabel(actionType) {
    return ACTION_LABELS[actionType] || ACTION_LABELS.passive;
  }

  static canonicalize(tags = [], actionType = 'passive') {
    const out = new Set();

    const actionTag = ACTION_TAGS[actionType] || ACTION_TAGS.passive;
    out.add(actionTag);

    for (const t of tags || []) {
      const tag = _norm(t);
      if (!tag) continue;
      if (!CANONICAL.has(tag)) continue;
      out.add(tag);
    }

    return Array.from(out).sort((a, b) => a.localeCompare(b));
  }

  static isCanonical(tag) {
    return CANONICAL.has(_norm(tag));
  }

  /**
   * Get starship maneuver tag namespaces.
   * @returns {object} {category, role, semantic}
   */
  static getManeuverTagNamespaces() {
    return structuredClone(MANEUVER_TAG_NAMESPACES);
  }

  /**
   * Check if a tag is in a specific namespace.
   * @param {string} tag
   * @param {string} namespace 'category' | 'role' | 'semantic'
   * @returns {boolean}
   */
  static isManeuverTagInNamespace(tag, namespace) {
    const ns = MANEUVER_TAG_NAMESPACES[namespace] || [];
    return ns.includes(_norm(tag).toLowerCase());
  }
}
