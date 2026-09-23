/**
 * ActionDefinitionNormalizer — the migration boundary between the current
 * `type: 'ATTACK_OPTION'` compendium rule shape and the versioned
 * ActionDefinition schema (action-definition.js).
 *
 * Math Integrity Freeze, Attack Bonus round 8 correction #2 (Blocker 1):
 * this used to translate only a subset of the requires-/excludes- fields
 * real records use, silently OMITTING the rest -- an omitted requirement
 * is fail-OPEN ("requires nothing" instead of "requires X"), the opposite
 * of what a gate model must guarantee. Every one of the 28 recognized
 * gate fields (25 confirmed present on real shipped ATTACK_OPTION
 * records + 3 proactively-supported compatibility fields -- see
 * ATTACK_OPTION_GATE_FIELD_DISPOSITION in action-definition.js) is now
 * either translated into a real requirement predicate, or explicitly
 * marked externalWorkflow/unsupported -- never silently dropped.
 * validateAttackOptionNormalization() enforces this as a guard any future
 * unrecognized gate field must fail loudly against, not disappear into,
 * and (round 8 correction #3) also reconciles each translated leaf's
 * actual VALUE against the raw rule's own value, not merely its field
 * name.
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
  // Math Integrity Freeze, Attack Bonus round 8 correction #4 (Blocker 1):
  // requiresManeuver/requiresSwiftActions used to normalize to a bare
  // `value: true` marker, discarding the raw field's actual content (the
  // specific maneuver -- 'disarm', 'grapple' -- or the specific swift-
  // action count -- 2). That is itself a lossy translation: this
  // groundwork correctly refuses to EVALUATE either gate (per the
  // externalWorkflow/unsupported contract below), but "we don't evaluate
  // it" and "we don't remember what it actually requires" are different
  // claims, and only the first one is true. `key`/`value` now preserve
  // the real requirement so a future consumer (or this file's own
  // validator) can see the exact maneuver/count without re-reading the
  // raw rule -- this does NOT change evaluation: the externalWorkflow()/
  // unsupported() predicate evaluators (action-availability-engine.js)
  // still ignore the predicate entirely and unconditionally fail closed,
  // never independently calculating swift-action availability.
  // requiresOpportunityAttack stays a plain boolean marker -- its own
  // source field IS boolean, so there is no additional value to preserve.
  if (rule.requiresManeuver) add('requiresManeuver', { type: 'externalWorkflow', key: 'maneuver', value: String(rule.requiresManeuver) });
  if (rule.requiresOpportunityAttack) add('requiresOpportunityAttack', { type: 'externalWorkflow', value: true });
  if (rule.requiresSwiftActions) add('requiresSwiftActions', { type: 'unsupported', key: 'swiftActions', value: Number(rule.requiresSwiftActions) });

  return { all };
}

/**
 * Math Integrity Freeze, Attack Bonus round 8 correction #2 (Blocker 1)
 * and round 8 correction #3 (Issue 5, value-level reconciliation): the
 * lossless-ingestion guard. Confirms every requires-/excludes- field
 * actually present on the raw rule (per getAttackOptionGateFields()) is:
 *   1. a recognized member of ATTACK_OPTION_GATE_FIELD_DISPOSITION;
 *   2. translated into a requirement leaf carrying that exact
 *      `sourceField` (field-NAME coverage);
 *   3. AND that leaf's actual translated VALUE matches what the raw
 *      field's own content requires (value-level reconciliation).
 * Correction #2's version only proved (1) and (2) -- a leaf tagged
 * `sourceField: 'requiresWeaponGroups'` whose `value` had been silently
 * truncated or altered (by a translation bug, or by anything mutating
 * the definition after normalization) would still pass, since only the
 * field NAME was checked against an allowlist, never the value itself.
 * (3) closes that gap: throws with the specific mismatched field name(s)
 * rather than allowing a translated-but-wrong requirement to ship as if
 * it were correct.
 * @param {object} rule
 * @param {import('./action-definition.js').ActionDefinition} definition
 * @throws if any gate field is unrecognized, was not translated, or was
 *   translated with a value that does not reconcile with the raw rule
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
  const mismatched = presentFields.filter(field => {
    const node = findGateNode(definition.requirements, field);
    return node && !gateValueReconciles(field, rule[field], node);
  });
  if (mismatched.length) {
    throw new Error(`validateAttackOptionNormalization(): field(s) [${mismatched.join(', ')}] present on "${rule.label ?? rule.option ?? rule.id ?? 'unknown'}" were translated but the resulting requirement's VALUE does not match the raw rule's own value -- field-name coverage alone is not lossless normalization`);
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
 * Finds the top-level requirement node tagged with the given raw
 * `sourceField` name. buildRequirements() always emits gate-derived nodes
 * as flat entries directly in `requirements.all[]` (never nested inside a
 * further all/any), so a single linear scan is sufficient and exact --
 * not a heuristic search.
 */
function findGateNode(requirements, field) {
  return (requirements?.all ?? []).find(node => node.sourceField === field) ?? null;
}

function normalizedArray(value) {
  return asArray(value).map(String);
}

function arraysReconcile(actual, expected) {
  const a = normalizedArray(actual);
  const b = normalizedArray(expected);
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

/**
 * Math Integrity Freeze, Attack Bonus round 8 correction #3 (Issue 5):
 * per-field value-level reconciliation. Fields whose leaf carries a
 * literal, data-independent value (a boolean flag, or a fixed constant
 * like requiresAutofire's `value: 'autofire'`) have nothing further to
 * reconcile once field-name coverage is already proven -- their "value"
 * isn't derived from the raw field's own content, so there's no
 * translation step that could silently corrupt it. Every field whose
 * raw content flows into the leaf (an id, a string, or an array) IS
 * checked here against that same content, independently recomputed from
 * `rawValue` rather than trusted from the tree that's being validated.
 */
function gateValueReconciles(field, rawValue, node) {
  switch (field) {
    case 'requiresAttackType':
      return node.value === String(rawValue).toLowerCase();
    case 'requiresWeaponGroups':
    case 'requiresWeaponText':
    case 'requiresFeatSelectedChoiceMatch':
    case 'requiresDamageType':
    case 'requiresTargetType':
    case 'requiresTargetFeat':
    case 'requiresTargetTalent':
    case 'requiresTargetItem':
    case 'requiresTargetText':
    case 'requiresRangeBand':
    case 'requiresContextFlags':
      return arraysReconcile(node.value, rawValue);
    case 'requiresOption':
      return node.value === rawValue;
    case 'requiresManeuver':
      // Math Integrity Freeze, Attack Bonus round 8 correction #4 (Blocker 1)
      return node.value === String(rawValue);
    case 'requiresSwiftActions':
      // Math Integrity Freeze, Attack Bonus round 8 correction #4 (Blocker 1)
      return node.value === Number(rawValue);
    case 'excludesDamageType':
    case 'excludesWeaponGroups':
      return arraysReconcile(node.not?.value, rawValue);
    case 'excludesOptions':
      return arraysReconcile((node.not?.any ?? []).map(entry => entry.value), rawValue);
    default:
      return true;
  }
}

/**
 * Math Integrity Freeze, Attack Bonus round 8 correction #3 (Blocker 1):
 * the definition is pure, source-independent content -- `sourceItem` is
 * never stored on the returned definition. Two different owned items
 * granting the exact same rule shape for the same logical action id must
 * normalize to byte-identical definitions, so the "canonical" one for a
 * given domain:id is never an accident of scan order. Per-grant
 * provenance (which item granted it, that item's own raw rule) belongs
 * on ActionEntitlement, built by ActorActionResolver.
 *
 * Math Integrity Freeze, Attack Bonus round 8 correction #4 (Blocker 3):
 * `sourceItem` is no longer consulted for identity AT ALL -- an earlier
 * version fell back to `sourceItem?.name` and then to the literal string
 * `'unknown-attack-option'` when the rule itself carried no
 * option/id/key/name, which meant `ActionDefinition.id` (canonical
 * identity) could still depend on which item happened to grant it, the
 * exact class of bug the source-independence fix (Blocker 1 of the prior
 * correction round) was meant to close everywhere. A rule with no stable
 * identifier of its own now fails normalization loudly instead of being
 * silently given a borrowed or placeholder one. Every one of the current
 * 136 real shipped ATTACK_OPTION records already carries its own
 * `option`/`id`/`key`/`name` (verified directly against
 * packs/feats.db + packs/talents.db), so this is not expected to reject
 * any real record.
 *
 * @param {object} sourceItem - the actor-owned feat/talent Item this rule
 *   came from. NOT read anywhere in this function's body (round 8
 *   correction #4, Blocker 3) -- ActionEntitlement provenance is built
 *   separately by the caller, ActorActionResolver, directly from its own
 *   `item` reference, not through this parameter. Kept for call-site
 *   stability rather than removed outright.
 * @param {object} rule - a rule already confirmed `type === 'ATTACK_OPTION'`
 *   by CombatOptionResolver.extractAttackOptionRules()
 * @returns {import('./action-definition.js').ActionDefinition}
 * @throws if the rule itself carries no stable identifier
 *   (option/id/key/name all absent)
 */
export function normalizeAttackOptionRule(sourceItem, rule) {
  const rawId = rule.option ?? rule.id ?? rule.key ?? rule.name ?? '';
  const id = normalizeKey(rawId);
  if (!id) {
    throw new Error(`normalizeAttackOptionRule(): rule "${rule.label ?? '(unlabeled)'}" has no stable action identifier (option/id/key/name) -- ActionDefinition identity must come from the rule itself, never a fallback to the granting item's name/id/uuid`);
  }
  const control = ['toggle', 'flag', 'slider', 'passive'].includes(String(rule.control ?? '').toLowerCase())
    ? String(rule.control).toLowerCase()
    : 'toggle';
  const name = rule.label ?? id;

  const definition = {
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id,
    name,
    domain: 'attack',
    ownership: { mode: 'source-item' },
    presentation: {
      section: 'attack-options',
      control,
      label: name
    },
    requirements: buildRequirements(rule),
    economy: { actionType: null },
    execution: { kind: 'attack-option', handler: null },
    // Informational only in this groundwork round -- nothing consumes
    // these yet. A future round routes them to ModifierEngine/
    // CombatOptionResolver.collectAttackModifiers() rather than
    // reimplementing roll math here (Part N).
    effects: [],
    tags: ['attack', control].filter(Boolean)
  };

  validateAttackOptionNormalization(rule, definition);
  return definition;
}
