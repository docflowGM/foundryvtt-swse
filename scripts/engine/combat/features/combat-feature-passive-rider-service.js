import {
  COMBAT_FEATURE_AUTOMATION_STATUS,
  COMBAT_FEATURE_PASSIVE_GROUP_ORDER,
  COMBAT_FEATURE_PASSIVE_GROUPS
} from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-contract.js';
import { canonicalCombatFeatureKey } from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-classifier.js';

/**
 * Combat Feature Passive Rider Service
 *
 * Phase 9 passive-rider registry. This module answers the player-facing
 * question: "is this combat rider already in the math?" It groups passive
 * features by what they affect and annotates automation status without changing
 * combat math.
 */

export const PASSIVE_RIDER_DESCRIPTORS = Object.freeze({
  'weapon-focus': {
    groupId: COMBAT_FEATURE_PASSIVE_GROUPS.ATTACK,
    appliesTo: 'Attack',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.AUTOMATED,
    automationLabel: 'Automated',
    automationHint: 'Included in attack math when the selected weapon group matches.'
  },
  'point-blank-shot': {
    groupId: COMBAT_FEATURE_PASSIVE_GROUPS.ATTACK,
    appliesTo: 'Attack / Damage',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL,
    automationLabel: 'Partial',
    automationHint: 'Requires target distance/context; verify the range condition before assuming the bonus is applied.'
  },
  'improved-damage-threshold': {
    groupId: COMBAT_FEATURE_PASSIVE_GROUPS.THRESHOLD,
    appliesTo: 'Damage Threshold',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.AUTOMATED,
    automationLabel: 'Automated',
    automationHint: 'Expected to be included in threshold/condition-track math.'
  },
  'running-attack': {
    groupId: COMBAT_FEATURE_PASSIVE_GROUPS.MOVEMENT,
    appliesTo: 'Movement',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL,
    automationLabel: 'Manual',
    automationHint: 'Movement sequencing is table/GM adjudicated.'
  },
  pin: {
    groupId: COMBAT_FEATURE_PASSIVE_GROUPS.GRAPPLE,
    appliesTo: 'Grapple',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL,
    automationLabel: 'Manual',
    automationHint: 'Grapple/control consequences are not fully automated yet.'
  },
  'melee-defense': {
    groupId: COMBAT_FEATURE_PASSIVE_GROUPS.DEFENSE,
    appliesTo: 'Reflex / Attack Tradeoff',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL,
    automationLabel: 'Partial',
    automationHint: 'Tracked as a state, but the selected tradeoff value still needs a dedicated picker.'
  },
  'armor-proficiency': {
    groupId: COMBAT_FEATURE_PASSIVE_GROUPS.DEFENSE,
    appliesTo: 'Defense / Armor',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.AUTOMATED,
    automationLabel: 'Automated',
    automationHint: 'Armor proficiency is expected to be consumed by armor/defense math.'
  },
  toughness: {
    groupId: COMBAT_FEATURE_PASSIVE_GROUPS.THRESHOLD,
    appliesTo: 'Hit Points / Durability',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL,
    automationLabel: 'Partial',
    automationHint: 'Verify HP/durability effects on the actor sheet until the feat audit confirms direct math parity.'
  }
});

function textFor(feature = {}) {
  return [feature.id, feature.name, feature.sourceName, feature.appliesTo, feature.summary, ...(Array.isArray(feature.tags) ? feature.tags : [])]
    .join(' ')
    .toLowerCase();
}

function descriptorFor(feature = {}) {
  const key = canonicalCombatFeatureKey(feature.id || feature.name || '');
  const direct = PASSIVE_RIDER_DESCRIPTORS[key];
  if (direct) return direct;
  const text = textFor(feature);

  if (/threshold|condition/.test(text)) return { groupId: COMBAT_FEATURE_PASSIVE_GROUPS.THRESHOLD, appliesTo: feature.appliesTo ?? 'Threshold' };
  if (/damage|dmg/.test(text)) return { groupId: COMBAT_FEATURE_PASSIVE_GROUPS.DAMAGE, appliesTo: feature.appliesTo ?? 'Damage' };
  if (/attack|atk|weapon focus|proficiency/.test(text)) return { groupId: COMBAT_FEATURE_PASSIVE_GROUPS.ATTACK, appliesTo: feature.appliesTo ?? 'Attack' };
  if (/reflex|fortitude|will|defense|armor|shield/.test(text)) return { groupId: COMBAT_FEATURE_PASSIVE_GROUPS.DEFENSE, appliesTo: feature.appliesTo ?? 'Defense' };
  if (/move|movement|speed|running|charge|position/.test(text)) return { groupId: COMBAT_FEATURE_PASSIVE_GROUPS.MOVEMENT, appliesTo: feature.appliesTo ?? 'Movement' };
  if (/grapple|pin|trip|throw|control/.test(text)) return { groupId: COMBAT_FEATURE_PASSIVE_GROUPS.GRAPPLE, appliesTo: feature.appliesTo ?? 'Grapple / Control' };
  if (/equipment|armor|weapon|shield|sr /.test(text)) return { groupId: COMBAT_FEATURE_PASSIVE_GROUPS.EQUIPMENT, appliesTo: feature.appliesTo ?? 'Equipment' };
  return { groupId: COMBAT_FEATURE_PASSIVE_GROUPS.OTHER, appliesTo: feature.appliesTo ?? 'Combat' };
}

function automationLabel(status) {
  switch (status) {
    case COMBAT_FEATURE_AUTOMATION_STATUS.AUTOMATED: return 'Automated';
    case COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL: return 'Partial';
    case COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL: return 'Manual';
    default: return 'Unknown';
  }
}

function automationHint(status) {
  switch (status) {
    case COMBAT_FEATURE_AUTOMATION_STATUS.AUTOMATED: return 'This rider should already be included by the combat math engine when its conditions match.';
    case COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL: return 'Some context may be automated, but the table should verify conditions or selected values.';
    case COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL: return 'This rider is shown as a reminder and is not automatically applied to roll math yet.';
    default: return 'Automation status has not been audited yet.';
  }
}

export function enrichPassiveCombatRider(feature = {}) {
  const descriptor = descriptorFor(feature);
  const automationStatus = descriptor.automationStatus ?? feature.automationStatus ?? COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL;
  return {
    ...feature,
    riderGroupId: descriptor.groupId,
    riderGroupLabel: COMBAT_FEATURE_PASSIVE_GROUP_ORDER.find(group => group.id === descriptor.groupId)?.label ?? 'Other Passive Riders',
    appliesTo: descriptor.appliesTo ?? feature.appliesTo ?? 'Combat',
    automationStatus,
    automationLabel: descriptor.automationLabel ?? automationLabel(automationStatus),
    automationHint: descriptor.automationHint ?? automationHint(automationStatus),
    tags: Array.from(new Set([...(Array.isArray(feature.tags) ? feature.tags : []), 'passive-rider', descriptor.groupId, automationStatus]))
  };
}

export function buildPassiveRiderGroups(passiveRiders = []) {
  const groups = COMBAT_FEATURE_PASSIVE_GROUP_ORDER.map(definition => ({
    ...definition,
    count: 0,
    automatedCount: 0,
    partialCount: 0,
    manualCount: 0,
    riders: []
  }));
  const byId = new Map(groups.map(group => [group.id, group]));

  for (const rawRider of passiveRiders) {
    const rider = enrichPassiveCombatRider(rawRider);
    const group = byId.get(rider.riderGroupId) ?? byId.get(COMBAT_FEATURE_PASSIVE_GROUPS.OTHER);
    group.riders.push(rider);
  }

  for (const group of groups) {
    group.riders.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    group.count = group.riders.length;
    group.automatedCount = group.riders.filter(rider => rider.automationStatus === COMBAT_FEATURE_AUTOMATION_STATUS.AUTOMATED).length;
    group.partialCount = group.riders.filter(rider => rider.automationStatus === COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL).length;
    group.manualCount = group.riders.filter(rider => rider.automationStatus === COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL).length;
    group.hasRiders = group.count > 0;
  }

  return groups.filter(group => group.hasRiders);
}
