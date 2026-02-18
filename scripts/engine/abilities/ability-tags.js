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
  'Tactics'
]);

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
}
