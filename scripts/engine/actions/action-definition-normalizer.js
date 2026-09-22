/**
 * ActionDefinitionNormalizer — the migration boundary between the current
 * `type: 'ATTACK_OPTION'` compendium rule shape and the versioned
 * ActionDefinition schema (action-definition.js).
 *
 * Math Integrity Freeze, Attack Bonus round 8 correction #2 (Blocker 1):
 * this used to translate only a subset of the requires-/excludes- fields
 * real records use, silently OMITTING the rest -- an omitted requirement
 * is fail-OPEN ("requires nothing" instead of "requires X"), the opposite
 * of what a gate model must guarantee. Every one of the 24 gate fields
 * confirmed present on real shipped ATTACK_OPTION records (see
 * ATTACK_OPTION_GATE_FIELD_DISPOSITION in action-definition.js) is now
 * either translated into a real requirement predicate, or explicitly
 * marked externalWorkflow/unsupported -- never silently dropped.
 * validateAttackOptionNormalization() enforces this as a guard any future
 * unrecognized gate field must fail loudly against, not disappear into.
 *
 * This is a PURE function: no actor mutation, no requirement evaluation,
 * no roll math. Its input must already be a strictly-filtered
 * ATTACK_OPTION rule -- callers use
 * CombatOptionResolver.extractAttackOptionRules() (Blocker 1 of the prior
 * correction round) to produce that input.
 */
import { ACTION_DEFINITION_SCHEMA_VERSION, ATTACK_OPTION_GATE_FIELD_DISPOSITION } from '/systems/foundryvtt-swse/scripts/engine/actions/action-definition.js';
import { normalizeKey } from '/systems/foundryvtt-swse/scripts/engine/combat/weapon-target-gate-classifiers.js';

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Every requires-/excludes- key actually present (truthy) on a raw rule
 * object, regardless of whether this normalizer currently knows how to
 * translate it. Used both to build the requirements tree and, separately,
 * by validateAttackOptionNormalization() to prove nothing was missed.
 */
export function getAttackOptionGateFields(rule) {
  return Object.keys(rule ?? {}).filter(key => (key.startsWith('requires') || key.startsWith('excludes')) && rule[key] !== undefined && rule[key] !== null && rule[key] !== false);
}

/**
 * Builds the requirements.all[] predicate list this rule's gate fields
 * map to. Every leaf/negation this function emits carries `sourceField`,
 * naming the exact raw rule field it was translated from -- the
 * traceability validateAttackOptionNormalization() checks against.
 */
function buildRequirements(rule) {
  const all = [];
  const add = (sourceField, predicate) => all.push({ ...predicate, sourceField });
  const addNot = (sourceField, inner) => all.push({ not: inner, sourceField });

  if (rule.requiresAttackType) add('requiresAttackType', { type: 'attackType', value: String(rule.requiresAttackType).toLowerCase() });
  if (rule.requiresAim) add('requiresAim', { type: 'context', key: 'aim', value: true });
  if (rule.requiresCharge) add('requiresCharge', { type: 'context', key: 'charge', value: true });
  if (rule.requiresAutofire) add('requiresAutofire', { type: 'weaponCapability', value: 'autofire' });
  if (rule.requiresUnarmed) add('requiresUnarmed', { type: 'unarmed', value: true });
  if (rule.requiresWeaponGroups) add('requiresWeaponGroups', { type: 'weaponGroup', value: asArray(rule.requiresWeaponGroups) });
  if (rule.requiresWeaponText) add('requiresWeaponText', { type: 'weaponTextMatch', value: asArray(rule.requiresWeaponText) });
  if (rule.requiresVehicleWeapon) add('requiresVehicleWeapon', { type: 'vehicleWeapon', value: true });
  if (rule.requiresFeatSelectedChoiceMatch) add('requiresFeatSelectedChoiceMatch', { type: 'featSelectedChoiceMatch', value: asArray(rule.requiresFeatSelectedChoiceMatch) });
  if (rule.requiresDamageType) add('requiresDamageType', { type: 'damageType', value: asArray(rule.requiresDamageType) });
  if (rule.excludesDamageType) addNot('excludesDamageType', { type: 'damageType', value: asArray(rule.excludesDamageType) });
  if (rule.requiresTargetType) add('requiresTargetType', { type: 'targetType', value: asArray(rule.requiresTargetType) });
  if (rule.requiresTargetFeat) add('requiresTargetFeat', { type: 'targetFeat', value: asArray(rule.requiresTargetFeat) });
  if (rule.requiresTargetTalent) add('requiresTargetTalent', { type: 'targetTalent', value: asArray(rule.requiresTargetTalent) });
  if (rule.requiresTargetItem) add('requiresTargetItem', { type: 'targetItem', value: asArray(rule.requiresTargetItem) });
  if (rule.requiresTargetText) add('requiresTargetText', { type: 'targetText', value: asArray(rule.requiresTargetText) });
  if (rule.requiresTargetFlatFooted) add('requiresTargetFlatFooted', { type: 'targetFlatFooted', value: true });
  if (rule.requiresTargetDeniedDexBonus) add('requiresTargetDeniedDexBonus', { type: 'targetDeniedDex', value: true });
  if (rule.requiresOption) add('requiresOption', { type: 'selectedOption', value: rule.requiresOption });
  if (rule.requiresRangeBand) add('requiresRangeBand', { type: 'rangeBand', value: asArray(rule.requiresRangeBand) });
  if (rule.requiresContextFlags) add('requiresContextFlags', { type: 'contextFlags', value: asArray(rule.requiresContextFlags) });
  if (rule.requiresAreaAttack) add('requiresAreaAttack', { type: 'areaAttack', value: true });
  // excludesAreaAttack uses the narrower raw-flag check
  // optionAllowedForWeapon() itself uses for this specific field (context/
  // weapon.system flags only, no text-heuristic scan) -- deliberately a
  // DIFFERENT predicate type (areaAttackFlag) from requiresAreaAttack's
  // full isAreaAttackContext() text-scanning check, so this translation
  // stays faithful to the certified authority's actual asymmetry rather
  // than approximating both fields with the same logic.
  if (rule.excludesAreaAttack) addNot('excludesAreaAttack', { type: 'areaAttackFlag', value: true });
  if (rule.excludesWeaponGroups) addNot('excludesWeaponGroups', { type: 'weaponGroup', value: asArray(rule.excludesWeaponGroups) });
  if (rule.excludesOptions) {
    const opts = asArray(rule.excludesOptions);
    all.push({ not: { any: opts.map(value => ({ type: 'selectedOption', value })) }, sourceField: 'excludesOptions' });
  }
  if (rule.requiresManeuver) add('requiresManeuver', { type: 'externalWorkflow', value: true });
  if (rule.requiresOpportunityAttack) add('requiresOpportunityAttack', { type: 'externalWorkflow', value: true });
  // Per explicit reviewer instruction: swift-action cost belongs to the
  // existing ActionEngine action-economy authority. This groundwork must
  // never independently calculate swift-action availability.
  if (rule.requiresSwiftActions) add('requiresSwiftActions', { type: 'unsupported', value: true });

  return { all };
}

/**
 * Math Integrity Freeze, Attack Bonus round 8 correction #2 (Blocker 1):
 * the lossless-ingestion guard. Confirms every requires-/excludes- field
 * actually present on the raw rule (per getAttackOptionGateFields()) is
 * BOTH a recognized member of ATTACK_OPTION_GATE_FIELD_DISPOSITION AND
 * produced at least one requirement leaf carrying that exact
 * `sourceField` in the normalized definition. Throws with the specific
 * unrecognized/missing field name(s) rather than allowing a gate to
 * vanish silently -- callers (the normalizer itself, and the 136-record
 * audit test) call this immediately after normalizeAttackOptionRule().
 * @param {object} rule
 * @param {import('./action-definition.js').ActionDefinition} definition
 * @throws if any gate field is unrecognized or was not translated
 */
export function validateAttackOptionNormalization(rule, definition) {
  const presentFields = getAttackOptionGateFields(rule);
  const coveredFields = new Set(collectSourceFields(definition.requirements));
  const unrecognized = presentFields.filter(field => !(field in ATTACK_OPTION_GATE_FIELD_DISPOSITION));
  if (unrecognized.length) {
    throw new Error(`validateAttackOptionNormalization(): unrecognized ATTACK_OPTION requirement field(s) [${unrecognized.join(', ')}] on "${rule.label ?? rule.option ?? rule.id ?? 'unknown'}" -- add a disposition entry (normalized/external-workflow/unsupported) in action-definition.js before this record can ship`);
  }
  const uncovered = presentFields.filter(field => !coveredFields.has(field));
  if (uncovered.length) {
    throw new Error(`validateAttackOptionNormalization(): field(s) [${uncovered.join(', ')}] present on "${rule.label ?? rule.option ?? rule.id ?? 'unknown'}" but not translated into any requirement leaf -- an omitted requirement is fail-open, never acceptable`);
  }
}

function collectSourceFields(node, out = []) {
  if (!node) return out;
  if (Array.isArray(node.all)) node.all.forEach(child => collectSourceFields(child, out));
  if (Array.isArray(node.any)) node.any.forEach(child => collectSourceFields(child, out));
  if (node.not) { if (node.sourceField) out.push(node.sourceField); collectSourceFields(node.not, out); }
  if (node.sourceField && !node.not) out.push(node.sourceField);
  return out;
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

  const definition = {
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
    // migration step needs that this v1 schema does not yet model -- not
    // part of the documented schema surface, so no consumer should rely
    // on it being stable. Never the mechanism that makes gate loss
    // acceptable -- validateAttackOptionNormalization() is that guard.
    _legacyRule: rule
  };

  validateAttackOptionNormalization(rule, definition);
  return definition;
}
