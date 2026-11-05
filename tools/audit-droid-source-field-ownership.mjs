/**
 * DROID_SYSTEMS field ownership census.
 *
 * Enumerates every directly authored field on source definitions; does not
 * confuse existence in a catalog or a UI label with applied gameplay rules.
 * The --catalog gate rejects NEW, unclassified fields. --certify is a future
 * release gate and intentionally fails while unresolved consumer work remains.
 */
import { DROID_SYSTEMS } from '../scripts/data/droid-systems.js';

const FIELD_TREATMENT = Object.freeze({
  // Quote calculations or validation actively consume these properties.
  QUOTE_OR_SOURCE_GATE: [
    'id', 'name', 'cost', 'weight', 'costFormula', 'weightFormula',
    'costMultiplier', 'baseSpeed', 'speeds', 'rangeOptions', 'sizeMinimum',
    'costWithHigherDefense', 'costIncrement', 'weightIncrement',
    // Source mechanical prerequisite gates are used by PC/follower builders
    // and Garage, not inferred from display descriptions.
    'sizeRestriction', 'requiredLocomotion', 'requiredSystems', 'requiresAppendage',
    // Shield generator SR is consumed by expansion's source price and mass;
    // this is NOT proof of live shield-damage mitigation parity.
    'sr'
  ],
  // These are currently primarily explanatory/presentation data, NOT mechanics.
  PRESENTATION_NOT_PROOF_OF_RULE: [
    'description', 'features', 'restrictions', 'notes',
    'availability', 'category', 'type', 'role', 'effects'
  ],
  // Real hydrated modifiers consumed by ModifierEngine, derived from the
  // indexed DROID_SYSTEMS catalog rather than hard-coded overlay numbers.
  SOURCE_TO_RUNTIME_MODIFIER: ['hpBonus', 'dtBonus', 'multiplier'],
  // Must have a verified runtime behavior, or be explicitly blocked/retired,
  // before any claim that every authored source field is consumed.
  NEEDS_MECHANICAL_CONSUMER_PROOF: [
    'armorType', 'armorCheckPenalty', 'armorBonus', 'maxDexBonus',
    'runningSpeedMultiplier', 'specialBonus', 'tier',
    'behavioralInhibitors',
    'dc',
    'damageType', 'canManipulate', 'canAttack', 'createsUnarmedAttack',
    'createsRangedWeapon', 'weaponStats',
    'isFree'
  ]
});

function walkDefinitions() {
  const entries = [];
  for (const [group, records] of Object.entries(DROID_SYSTEMS)) {
    if (Array.isArray(records)) {
      for (const entry of records) if (entry && typeof entry === 'object') entries.push({ path: group, entry });
    } else if (records && typeof records === 'object') {
      for (const [subgroup, subset] of Object.entries(records)) {
        if (Array.isArray(subset)) {
          for (const entry of subset) if (entry && typeof entry === 'object') entries.push({ path: group + '.' + subgroup, entry });
        }
      }
    }
  }
  return entries;
}

const definitions = walkDefinitions();
const occurrences = new Map();
for (const { path, entry } of definitions) {
  for (const key of Object.keys(entry)) {
    const locations = occurrences.get(key) || [];
    locations.push(path + ':' + (entry.id || entry.name || '[unnamed]'));
    occurrences.set(key, locations);
  }
}
const classified = new Map();
for (const [tier, fields] of Object.entries(FIELD_TREATMENT)) {
  for (const field of fields) {
    if (classified.has(field)) throw new Error('Duplicate field classification: ' + field);
    classified.set(field, tier);
  }
}
const missing = [...occurrences.keys()].filter(key => !classified.has(key));
const stale = [...classified.keys()].filter(key => !occurrences.has(key));
const summary = {
  definitionCount: definitions.length,
  uniqueTopLevelFieldCount: occurrences.size,
  quoteOrGateFields: [...occurrences.keys()].filter(key => classified.get(key) === 'QUOTE_OR_SOURCE_GATE').length,
  sourceDerivedModifierFields: [...occurrences.keys()].filter(key => classified.get(key) === 'SOURCE_TO_RUNTIME_MODIFIER').length,
  presentationOnlyFields: [...occurrences.keys()].filter(key => classified.get(key) === 'PRESENTATION_NOT_PROOF_OF_RULE').length,
  fieldsNeedingMechanicalConsumerProof: [...occurrences.keys()].filter(key => classified.get(key) === 'NEEDS_MECHANICAL_CONSUMER_PROOF').length,
  unclassifiedFields: missing,
  staleClassifications: stale,
  unresolvedFieldNames: [...occurrences.keys()].filter(key => classified.get(key) === 'NEEDS_MECHANICAL_CONSUMER_PROOF').sort()
};
console.log(JSON.stringify(summary, null, 2));
if (missing.length || stale.length) {
  throw new Error('Droid source field inventory has changed; adjudicate every field in FIELD_TREATMENT');
}
if (process.argv.includes('--certify') && summary.fieldsNeedingMechanicalConsumerProof > 0) {
  throw new Error('Droid source fields not certified: ' + summary.unresolvedFieldNames.join(', '));
}
