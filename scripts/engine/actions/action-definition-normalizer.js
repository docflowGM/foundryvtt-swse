/**
 * ActionDefinitionNormalizer — the migration boundary between the current
 * `type: 'ATTACK_OPTION'` compendium rule shape and the versioned
 * ActionDefinition schema (action-definition.js).
 *
 * Math Integrity Freeze, Attack Bonus round 8 correction #1 addendum
 * (groundwork only). This is a PURE function: no actor mutation, no
 * requirement evaluation, no roll math. Its input must already be a
 * strictly-filtered ATTACK_OPTION rule -- callers use
 * CombatOptionResolver.extractAttackOptionRules() (Blocker 1's fix) to
 * produce that input, so this normalizer never has to re-decide "is this
 * even an attack option" itself (Part C: one shared extraction contract).
 */
import { ACTION_DEFINITION_SCHEMA_VERSION } from '/systems/foundryvtt-swse/scripts/engine/actions/action-definition.js';

function normalizeKey(value) {
  return String(value ?? '').trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Builds the requirements.all[] predicate list this rule's "requires"
 * fields map to. Only fields this groundwork's
 * ActionAvailabilityEngine actually understands are translated (Part H) --
 * an untranslated gate is intentionally omitted here rather than guessed
 * at, since an omitted requirement can never wrongly block presentation
 * and the live CombatOptionResolver path (unaffected by this groundwork)
 * remains the actual gate enforced for real rolls.
 */
function buildRequirements(rule) {
  const all = [];
  if (rule.requiresAttackType) all.push({ type: 'attackType', value: String(rule.requiresAttackType).toLowerCase() });
  if (rule.requiresWeaponGroups) all.push({ type: 'weaponGroup', value: asArray(rule.requiresWeaponGroups) });
  if (rule.requiresAutofire) all.push({ type: 'weaponCapability', value: 'autofire' });
  if (rule.requiresAim) all.push({ type: 'context', key: 'aim', value: true });
  if (rule.requiresCharge) all.push({ type: 'context', key: 'charge', value: true });
  if (rule.requiresTargetType) all.push({ type: 'targetType', value: asArray(rule.requiresTargetType) });
  if (rule.requiresTargetFeat) all.push({ type: 'targetFeat', value: asArray(rule.requiresTargetFeat) });
  if (rule.requiresTargetTalent) all.push({ type: 'targetTalent', value: asArray(rule.requiresTargetTalent) });
  if (rule.requiresTargetFlatFooted) all.push({ type: 'targetFlatFooted', value: true });
  if (rule.requiresTargetDeniedDexBonus) all.push({ type: 'targetDeniedDex', value: true });
  if (rule.requiresOption) all.push({ type: 'selectedOption', value: rule.requiresOption });
  if (rule.requiresAreaAttack) all.push({ type: 'areaAttack', value: true });
  // A gate this predicate vocabulary does not model at all (maneuver
  // selection, opportunity-attack/reaction framing) must never be
  // silently dropped -- an omitted requirement would make the option
  // wrongly evaluate as fully available. Encoded explicitly so
  // ActionAvailabilityEngine can report the honest 'external-workflow'
  // state instead.
  if (rule.requiresManeuver || rule.requiresOpportunityAttack) all.push({ type: 'externalWorkflow', value: true });
  return { all };
}

/**
 * @param {object} sourceItem - the actor-owned feat/talent Item this rule
 *   came from
 * @param {object} rule - a rule already confirmed `type === 'ATTACK_OPTION'`
 *   by CombatOptionResolver.extractAttackOptionRules()
 * @returns {import('./action-definition.js').ActionDefinition}
 */
export function normalizeAttackOptionRule(sourceItem, rule) {
  const rawId = rule.option ?? rule.id ?? rule.key ?? rule.name ?? '';
  const id = normalizeKey(rawId) || normalizeKey(sourceItem?.name) || 'unknown-attack-option';
  const control = ['toggle', 'flag', 'slider', 'passive'].includes(String(rule.control ?? '').toLowerCase())
    ? String(rule.control).toLowerCase()
    : 'toggle';

  return {
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id,
    name: rule.label ?? sourceItem?.name ?? id,
    domain: 'attack',
    source: {
      type: String(sourceItem?.type ?? 'item').toLowerCase(),
      id: sourceItem?.id ?? null,
      uuid: sourceItem?.uuid ?? null,
      name: sourceItem?.name ?? null
    },
    ownership: { mode: 'source-item' },
    presentation: {
      section: 'attack-options',
      control,
      label: rule.label ?? sourceItem?.name ?? id
    },
    requirements: buildRequirements(rule),
    economy: { actionType: null },
    execution: { kind: 'attack-option', handler: null },
    // Informational only in this groundwork round -- nothing consumes
    // these yet. A future round routes them to ModifierEngine/
    // CombatOptionResolver.collectAttackModifiers() rather than
    // reimplementing roll math here (Part N).
    effects: [],
    tags: ['attack', control].filter(Boolean),
    // Preserves the original rule verbatim for anything a future
    // migration step needs that this v1 schema does not yet model
    // (targetText/damage-type gates, effect fields, etc.) -- not part of
    // the documented schema surface, so no consumer should rely on it
    // being stable.
    _legacyRule: rule
  };
}
