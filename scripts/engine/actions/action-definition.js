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
export const ACTION_STATES = Object.freeze(['hidden', 'available', 'disabled', 'active', 'passive', 'external-workflow']);

/**
 * The reusable requirement-predicate vocabulary this groundwork's
 * ActionAvailabilityEngine understands (Part H). Deliberately small --
 * only what is needed to represent the ATTACK_OPTION gates
 * CombatOptionResolver.optionAllowedForWeapon() already implements. Grows
 * by adding a new type + evaluator function pair, never by adding a new
 * hardcoded predicate per feat/talent name.
 */
export const ACTION_REQUIREMENT_PREDICATE_TYPES = Object.freeze([
  'attackType', 'weaponGroup', 'weaponCapability',
  'context', // { key: 'aim'|'charge'|'flanking'|'autofire', value: true }
  'targetExists', 'targetType', 'targetFeat', 'targetTalent',
  'targetFlatFooted', 'targetDeniedDex',
  'selectedOption', 'areaAttack',
  // Explicit, never-satisfiable marker for a real gate (requiresManeuver /
  // requiresOpportunityAttack on the legacy ATTACK_OPTION shape) this
  // groundwork's predicate vocabulary deliberately does not model, because
  // the current attack dialog has no maneuver selector or
  // opportunity-attack/reaction framing at all -- round 8 correction #1's
  // EXTERNAL_WORKFLOW_GATED report bucket is this predicate's origin. The
  // normalizer emits this explicitly rather than silently omitting the
  // gate, so ActionAvailabilityEngine reports 'external-workflow', not a
  // false 'available'.
  'externalWorkflow'
]);
