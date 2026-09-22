/**
 * ActionDefinition v1 — the normalized schema the future Action Authority
 * (ActionRegistry / ActorActionResolver / ActionAvailabilityEngine) is
 * built around. Attack Options (packs/feats.db, packs/talents.db `type:
 * 'ATTACK_OPTION'` rules) are the FIRST migration consumer of this schema,
 * not its permanent scope — see docs/architecture/action-authority-v1.md.
 *
 * Math Integrity Freeze, Attack Bonus round 8 correction #1 addendum
 * (groundwork only, per explicit reviewer instruction): this file defines
 * the shape and its versioning/domain/state vocabularies. It does not
 * mutate actors, evaluate requirements, or calculate any roll math --
 * CombatOptionResolver remains the live, certified authority for actual
 * attack-modifier composition during this migration.
 *
 * @typedef {Object} ActionDefinitionSource
 * @property {string} type - e.g. 'feat', 'talent', 'item'
 * @property {string|null} id - source item id, when known
 * @property {string|null} uuid - source item uuid, when known
 * @property {string} name - source item display name
 *
 * @typedef {Object} ActionDefinitionOwnership
 * @property {string} mode - currently only 'source-item' (owning the
 *   granting feat/talent/item IS the entitlement); reserved for future
 *   modes (e.g. 'class-feature', 'species-grant') that do not require an
 *   owned Item document.
 *
 * @typedef {Object} ActionDefinitionPresentation
 * @property {string} section - UI grouping hint, e.g. 'attack-options'
 * @property {string} control - 'toggle' | 'flag' | 'slider' | 'passive'
 * @property {string} label
 * @property {number} [priority]
 *
 * @typedef {Object} RequirementPredicate
 * @property {string} type - a name from ACTION_REQUIREMENT_PREDICATE_TYPES
 * @property {*} [value]
 * @property {string} [key]
 *
 * @typedef {Object} RequirementNode
 * @property {RequirementNode[]} [all]
 * @property {RequirementNode[]} [any]
 * @property {RequirementNode} [not]
 * @property {string} [type] - present on a leaf predicate node instead of
 *   all/any/not
 *
 * @typedef {Object} ActionDefinitionEconomy
 * @property {string|null} actionType - 'standard' | 'move' | 'swift' |
 *   'full-round' | 'reaction' | null (no action-economy cost of its own --
 *   most attack options ride the attack action itself). This is metadata
 *   only; the existing ActionEngine remains the action-economy authority
 *   (Part J) -- nothing here calculates or spends action economy.
 *
 * @typedef {Object} ActionDefinitionExecution
 * @property {string} kind - 'attack-option' (routes through the existing,
 *   certified CombatOptionResolver/attack-resolver math during this
 *   migration) | 'handler' (an escape hatch for mechanics too irregular
 *   for the declarative requirement/effect vocabulary)
 * @property {string|null} handler - a registered handler id, only when
 *   kind === 'handler'
 *
 * @typedef {Object} ActionDefinition
 * @property {number} schemaVersion
 * @property {string} id - stable, kebab-case, unique within a domain
 * @property {string} name
 * @property {string} domain - one of ACTION_DOMAINS
 * @property {ActionDefinitionSource} source
 * @property {ActionDefinitionOwnership} ownership
 * @property {ActionDefinitionPresentation} presentation
 * @property {RequirementNode} requirements
 * @property {ActionDefinitionEconomy} economy
 * @property {ActionDefinitionExecution} execution
 * @property {Array<Object>} effects - declarative effect descriptors,
 *   routed to existing authorities (ModifierEngine, CombatOptionResolver,
 *   ...) by a future consumer -- never interpreted or applied by anything
 *   in this groundwork layer itself.
 * @property {string[]} tags
 *
 * Math Integrity Freeze, Attack Bonus round 8 correction #2 (Blocker 3):
 * an ActionDefinition is WHAT the action IS -- one per logical action,
 * domain-qualified-id-unique, registry-canonical. It must never embed a
 * specific actor's provenance. WHY a given actor has access to it is a
 * separate concept, ActionEntitlement -- an actor can hold more than one
 * entitlement to the exact same definition (two different feats granting
 * the same logical action), which must never be mistaken for two
 * competing definitions.
 *
 * @typedef {Object} ActionEntitlement
 * @property {{domain: string, id: string}} actionKey - which
 *   ActionDefinition this entitlement grants access to
 * @property {string|null} actorId
 * @property {ActionDefinitionSource} source - the SPECIFIC granting item
 *   for THIS entitlement (an actor with two entitlements to the same
 *   actionKey has two ActionEntitlement records, each with its own
 *   source, never one record with an ambiguous/merged source)
 * @property {Object} configuration - per-grant configuration (e.g. a
 *   selectedChoice value), reserved for future use; empty in this
 *   groundwork round
 */

export const ACTION_DEFINITION_SCHEMA_VERSION = 1;

// The domain vocabulary is intentionally broader than 'attack' from the
// start (Part A/addendum) -- attack options are the pilot migration, not
// the permanent scope. Only 'attack' has a normalizer/consumer today.
export const ACTION_DOMAINS = Object.freeze([
  'attack', 'reaction', 'force', 'skill', 'movement', 'defense', 'utility'
]);

// Presentation control vocabulary, matching CombatOptionResolver's
// existing hydrateOption() control types exactly (round 8's dynamic
// option-state work already established these four for the attack
// domain).
export const ACTION_PRESENTATION_CONTROLS = Object.freeze(['toggle', 'flag', 'slider', 'passive']);

// Runtime availability states (Part F). 'hidden' covers both "actor does
// not own this" and "genuinely inapplicable to this weapon/attack-type" --
// the two cases CombatOptionResolver.getAvailableAttackOptions() already
// treats identically (never shown, either way). 'external-workflow' is a
// new, honest state for a requirement this dialog has no control for at
// all (maneuver selection, opportunity-attack framing) -- round 8
// correction #1 introduced the equivalent EXTERNAL_WORKFLOW_GATED report
// bucket; this is its runtime-state counterpart.
export const ACTION_STATES = Object.freeze(['hidden', 'available', 'disabled', 'active', 'passive', 'external-workflow', 'unsupported']);

/**
 * Math Integrity Freeze, Attack Bonus round 8 correction #2 (Blocker 1):
 * the reusable requirement-predicate vocabulary this groundwork's
 * ActionAvailabilityEngine understands (Part H). Every predicate type
 * here except the two provenance markers (externalWorkflow/unsupported)
 * delegates its actual evaluation to
 * scripts/engine/combat/weapon-target-gate-classifiers.js -- the SAME
 * pure functions CombatOptionResolver.optionAllowedForWeapon() (the
 * certified, live gate authority) uses, extracted into a neutral shared
 * module rather than duplicated (Blocker 4). Grows by adding a new type +
 * one delegating evaluator function pair, never by adding a new
 * hardcoded predicate per feat/talent name, and never by reimplementing a
 * classification that already exists.
 */
export const ACTION_REQUIREMENT_PREDICATE_TYPES = Object.freeze([
  'attackType', 'weaponGroup', 'weaponCapability', 'weaponTextMatch', 'unarmed',
  'vehicleWeapon', 'damageType', 'areaAttack', 'areaAttackFlag',
  'featSelectedChoiceMatch', 'rangeBand', 'contextFlags',
  'context', // { key: 'aim'|'charge'|'flanking'|'autofire', value: true }
  'targetExists', 'targetType', 'targetFeat', 'targetTalent', 'targetItem', 'targetText',
  'targetFlatFooted', 'targetDeniedDex',
  'selectedOption',
  // Explicit, never-satisfiable provenance markers for a real gate this
  // groundwork's predicate vocabulary deliberately does not evaluate.
  // Distinct from an ordinary unmet predicate: the normalizer emits one
  // of these explicitly rather than silently omitting the source field,
  // so ActionAvailabilityEngine reports the honest 'external-workflow' /
  // 'unsupported' state instead of a false 'available' (see
  // ATTACK_OPTION_GATE_FIELD_DISPOSITION below for which source field
  // maps to which).
  //   externalWorkflow: the current attack dialog has no control for this
  //     at all (maneuver selection, opportunity-attack/reaction framing) --
  //     genuinely, structurally unreachable from here, not merely
  //     unimplemented.
  //   unsupported: a real, dialog-reachable-in-principle gate this round
  //     deliberately does not evaluate yet (e.g. swift-action cost, which
  //     belongs to the existing ActionEngine and must not be
  //     independently recalculated here) -- may gain a real evaluator in
  //     a future round without a schema change.
  'externalWorkflow', 'unsupported'
]);

/**
 * The complete, closed inventory of every requires-/excludes- gate field
 * ever observed on a real, shipped `type: 'ATTACK_OPTION'` record (24
 * fields, verified directly against packs/feats.db + packs/talents.db --
 * see tests/action-authority-groundwork-normalization-audit.test.mjs).
 * Every field here MUST be classified as one of:
 *   'normalized'         - translated into a real requirement predicate
 *   'external-workflow'  - encoded via the externalWorkflow marker
 *   'unsupported'         - encoded via the unsupported marker
 * validateAttackOptionNormalization() (action-definition-normalizer.js)
 * enforces that every requires-/excludes- key on an incoming rule is a
 * member of this map -- an unrecognized future field (e.g. a hypothetical
 * `requiresMountedCombat`) fails validation loudly rather than silently
 * vanishing. This is the single source of truth both the normalizer's
 * translation logic and its own validator consult, so they cannot drift
 * apart.
 */
export const ATTACK_OPTION_GATE_FIELD_DISPOSITION = Object.freeze({
  requiresAttackType: 'normalized',
  requiresAim: 'normalized',
  requiresCharge: 'normalized',
  requiresAutofire: 'normalized',
  requiresUnarmed: 'normalized',
  requiresWeaponGroups: 'normalized',
  requiresWeaponText: 'normalized',
  requiresVehicleWeapon: 'normalized',
  requiresFeatSelectedChoiceMatch: 'normalized',
  requiresDamageType: 'normalized',
  excludesDamageType: 'normalized',
  requiresTargetType: 'normalized',
  requiresTargetFeat: 'normalized',
  requiresTargetTalent: 'normalized',
  requiresTargetItem: 'normalized',
  requiresTargetText: 'normalized',
  requiresTargetFlatFooted: 'normalized',
  requiresTargetDeniedDexBonus: 'normalized',
  requiresOption: 'normalized',
  requiresRangeBand: 'normalized',
  requiresContextFlags: 'normalized',
  requiresAreaAttack: 'normalized',
  excludesAreaAttack: 'normalized',
  excludesWeaponGroups: 'normalized',
  excludesOptions: 'normalized',
  requiresManeuver: 'external-workflow',
  requiresOpportunityAttack: 'external-workflow',
  // Per explicit reviewer instruction: swift-action cost belongs to the
  // existing ActionEngine action-economy authority. This groundwork must
  // not independently calculate swift-action availability -- encoded
  // unsupported (always fails closed) rather than guessed at.
  requiresSwiftActions: 'unsupported'
});
