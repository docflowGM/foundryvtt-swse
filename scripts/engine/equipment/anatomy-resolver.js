/**
 * Effective anatomy resolver (E2A) -- PURE and READ ONLY.
 *
 * Produces a derived, deterministic anatomy snapshot for an actor: which appendages can be identified, what each can do, whether
 * each is functional, where the fact came from, and what is still unknown. It stores nothing, mutates nothing (inputs are never
 * modified), and decides nothing about weapons: no hand occupancy, grips, readiness or attack permission (E3 / E7).
 *
 * Owner rulings applied (see docs/architecture/equipment-ecosystem-authority-contract-v1.md):
 *   OA-7  species anatomy will be an optional structured `anatomy` field on the EFFECTIVE species profile (not in the trait-rule
 *         vocabulary). It is read ONLY from the profile that is passed in -- never recovered from a base species.
 *   OA-8  slot / installed-instance / canonical-part identities are kept separate (see droid-appendage-projection.js).
 *   OA-4  functional state belongs to the actor's effective anatomy: functional | disabled | missing | unresolved.
 *   OA-2  the result is derived on demand; no persistent equipment state.
 *
 * Capabilities are tri-state (true | false | null; null = unknown). Unknown is never promoted to true.
 *
 * Provisional input shape for `speciesProfile.anatomy` (E2A test contract only; NOT an approved schema -- E2B decides the schema):
 *   { appendages: [{ id:string, kind:string, capabilities?:{canHold?,canWield?,canManipulate?}, functionalState?:string,
 *                    restrictions?:string[] }] }
 */
import { projectDroidAppendages } from "/systems/foundryvtt-swse/scripts/engine/equipment/droid-appendage-projection.js";

export const ANATOMY_STATUS = Object.freeze({ RESOLVED: 'resolved', PARTIAL: 'partial', UNRESOLVED: 'unresolved' });
export const FUNCTIONAL_STATES = Object.freeze(['functional', 'disabled', 'missing', 'unresolved']);
const STATE_RANK = Object.freeze({ functional: 0, unresolved: 1, disabled: 2, missing: 3 });

/** Anatomy `source` values. */
export const ANATOMY_SOURCE = Object.freeze({
  DEFAULT: 'default',
  SPECIES_ANATOMY: 'species-anatomy',
  DROID_COMPONENTS: 'droid-installed-component',
  NONE: 'none',
});

/**
 * Temporary E2A compatibility guards (REMOVE WHEN E2B SUPPLIES STRUCTURED ANATOMY).
 * Exact trait identities already present in complete-snapshot species variants whose published anatomical capability has not yet
 * been added to the structured species authority. They only mark the anatomy incomplete; they compute no capability and carry no
 * species-name special case. Matching is by exact trait `id`; trait prose is never parsed.
 */
export const TEMPORARY_UNRESOLVED_EXCEPTION_TRAIT_IDS = Object.freeze(['extra-arms', 'prehensile-tail']);

/** Thrown for input that violates the resolver API. Ordinary missing / ambiguous evidence is reported as `issues`, not thrown. */
export class AnatomyInputError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.name = 'AnatomyInputError';
    this.code = code;
  }
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const triState = (v, where, field) => {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v;
  throw new AnatomyInputError('INVALID_CAPABILITY', `${where}.${field} must be true, false or null`);
};

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

const issue = (code, severity, message, details = {}) => ({ code, severity, message, details });

function validateInput(input) {
  if (!isPlainObject(input)) throw new AnatomyInputError('INVALID_INPUT', 'input must be an object');
  const { actorType, speciesProfile, installedComponents, functionalOverrides } = input;
  if (actorType !== undefined && actorType !== null && typeof actorType !== 'string') throw new AnatomyInputError('INVALID_ACTOR_TYPE', 'actorType must be a string');
  if (speciesProfile !== undefined && speciesProfile !== null && !isPlainObject(speciesProfile)) throw new AnatomyInputError('INVALID_SPECIES_PROFILE', 'speciesProfile must be an object');
  if (installedComponents !== undefined && installedComponents !== null) {
    if (!isPlainObject(installedComponents) || !Array.isArray(installedComponents.components)) throw new AnatomyInputError('INVALID_INSTALLED_COMPONENTS', 'installedComponents must be the result of resolveInstalledDroidComponents() ({ components: [] })');
  }
  if (functionalOverrides !== undefined && functionalOverrides !== null) {
    if (!isPlainObject(functionalOverrides)) throw new AnatomyInputError('INVALID_FUNCTIONAL_OVERRIDES', 'functionalOverrides must be an object keyed by appendage id');
    for (const [id, raw] of Object.entries(functionalOverrides)) {
      const state = isPlainObject(raw) ? raw.state : raw;
      if (!FUNCTIONAL_STATES.includes(state)) throw new AnatomyInputError('INVALID_FUNCTIONAL_OVERRIDES', `override for "${id}" must be one of ${FUNCTIONAL_STATES.join(', ')}`);
    }
  }
}

/** Validate and copy a structured species anatomy (never mutates the input). */
function readSpeciesAnatomy(anatomy) {
  if (!isPlainObject(anatomy) || !Array.isArray(anatomy.appendages)) throw new AnatomyInputError('INVALID_ANATOMY', 'speciesProfile.anatomy must be { appendages: [] }');
  const seen = new Set();
  return anatomy.appendages.map((raw, index) => {
    const where = `anatomy.appendages[${index}]`;
    if (!isPlainObject(raw)) throw new AnatomyInputError('INVALID_ANATOMY', `${where} must be an object`);
    if (typeof raw.id !== 'string' || !raw.id.trim()) throw new AnatomyInputError('INVALID_ANATOMY', `${where}.id must be a non-empty string`);
    if (typeof raw.kind !== 'string' || !raw.kind.trim()) throw new AnatomyInputError('INVALID_ANATOMY', `${where}.kind must be a non-empty string`);
    if (seen.has(raw.id)) throw new AnatomyInputError('INVALID_ANATOMY', `duplicate appendage id "${raw.id}"`);
    seen.add(raw.id);
    const caps = raw.capabilities === undefined || raw.capabilities === null ? {} : raw.capabilities;
    if (!isPlainObject(caps)) throw new AnatomyInputError('INVALID_ANATOMY', `${where}.capabilities must be an object`);
    const state = raw.functionalState === undefined ? 'functional' : raw.functionalState;
    if (!FUNCTIONAL_STATES.includes(state)) throw new AnatomyInputError('INVALID_ANATOMY', `${where}.functionalState must be one of ${FUNCTIONAL_STATES.join(', ')}`);
    if (raw.restrictions !== undefined && !(Array.isArray(raw.restrictions) && raw.restrictions.every((r) => typeof r === 'string'))) throw new AnatomyInputError('INVALID_ANATOMY', `${where}.restrictions must be an array of strings`);
    return {
      id: raw.id,
      kind: raw.kind,
      source: ANATOMY_SOURCE.SPECIES_ANATOMY,
      identity: { slot: raw.id, instance: null, part: null },
      capabilities: { canHold: triState(caps.canHold, where, 'canHold'), canWield: triState(caps.canWield, where, 'canWield'), canManipulate: triState(caps.canManipulate, where, 'canManipulate') },
      functionalState: state,
      functionalStateSource: 'species-anatomy',
      ...(raw.restrictions ? { restrictions: [...raw.restrictions] } : {}),
    };
  });
}

function defaultNaturalArms() {
  return [1, 2].map((n) => ({
    id: `natural-arm-${n}`,
    kind: 'natural-arm',
    source: ANATOMY_SOURCE.DEFAULT,
    identity: { slot: `natural-arm-${n}`, instance: null, part: null },
    capabilities: { canHold: true, canWield: true, canManipulate: true },
    functionalState: 'functional',
    functionalStateSource: 'default',
  }));
}

/** Apply caller-supplied functional overrides. Overrides may only RESTRICT evidence-based state (conservative; see checkpoint doc). */
function applyOverrides(appendages, overrides, issues) {
  if (!overrides) return appendages;
  const ids = new Set(appendages.map((a) => a.id));
  for (const id of Object.keys(overrides)) {
    if (!ids.has(id)) issues.push(issue('override-unknown-appendage', 'warning', `Functional override for "${id}" does not match any identified appendage and was ignored.`, { id }));
  }
  return appendages.map((a) => {
    if (!Object.prototype.hasOwnProperty.call(overrides, a.id)) return a;
    const raw = overrides[a.id];
    const state = isPlainObject(raw) ? raw.state : raw;
    if (STATE_RANK[state] > STATE_RANK[a.functionalState]) return { ...a, functionalState: state, functionalStateSource: 'override' };
    if (state !== a.functionalState) issues.push(issue('override-less-restrictive-than-evidence', 'info', `Override "${state}" for "${a.id}" is less restrictive than recorded evidence "${a.functionalState}" and was not applied.`, { id: a.id, override: state, evidence: a.functionalState }));
    return a;
  });
}

function capabilityIssues(appendages, issues) {
  for (const a of appendages) {
    const unknown = Object.entries(a.capabilities).filter(([, v]) => v === null).map(([k]) => k);
    if (unknown.length) issues.push(issue('capability-unknown', 'warning', `Appendage "${a.id}" has unestablished capabilities: ${unknown.join(', ')}.`, { id: a.id, unknown }));
    if (a.functionalState === 'unresolved') issues.push(issue('functional-state-unresolved', 'warning', `Appendage "${a.id}" has an unresolved functional state.`, { id: a.id }));
  }
}

function traitIds(profile) {
  const out = [];
  for (const list of [profile?.canonicalTraits, profile?.traits]) {
    if (Array.isArray(list)) for (const t of list) if (t && typeof t.id === 'string') out.push(t.id);
  }
  return out;
}

const result = (r) => deepFreeze({ anatomyKind: r.anatomyKind, status: r.status, source: r.source, defaultApplied: r.defaultApplied, appendages: r.appendages, issues: r.issues, ...(r.unresolvedRecords ? { unresolvedRecords: r.unresolvedRecords } : {}) });

/**
 * Resolve the effective anatomy.
 *
 * @param {{actorType?:string, speciesProfile?:object, installedComponents?:{components:object[]}, functionalOverrides?:Object<string,string|{state:string}>, deps?:object}} input
 *   `deps` (optional): `projectInstalledComponents(installedComponents, deps) -> {appendages, unresolvedRecords, issues}` replaces the legacy droid
 *   adapter (the droid refactor is pending); other keys are forwarded to the adapter (getDefinition / catalogEntryFor for tests).
 * @returns {{anatomyKind:string, status:'resolved'|'partial'|'unresolved', source:string, defaultApplied:boolean, appendages:object[], issues:object[]}}
 * @throws {AnatomyInputError} for input that violates the API (documented codes: INVALID_INPUT, INVALID_ACTOR_TYPE,
 *   INVALID_SPECIES_PROFILE, INVALID_INSTALLED_COMPONENTS, INVALID_FUNCTIONAL_OVERRIDES, INVALID_ANATOMY, INVALID_CAPABILITY)
 */
export function resolveEffectiveAnatomy(input) {
  validateInput(input);
  const speciesProfile = input.speciesProfile ?? null;
  const actorType = typeof input.actorType === 'string' ? input.actorType.trim().toLowerCase() : '';
  const overrides = input.functionalOverrides ?? null;
  const issues = [];

  const isDroid = actorType === 'droid' || speciesProfile?.speciesActsAsDroid === true;

  // ---- installed-component (droid) anatomy ---------------------------------------------------------------------------
  if (isDroid) {
    if (!input.installedComponents) {
      issues.push(issue('installed-components-not-provided', 'blocking', 'A droid anatomy needs the installed-component resolution; none was provided, so no manipulator is granted.'));
      return result({ anatomyKind: 'installed-component', status: ANATOMY_STATUS.UNRESOLVED, source: ANATOMY_SOURCE.NONE, defaultApplied: false, appendages: [], issues });
    }
    // The droid adapter is isolated and replaceable (droid refactor pending): a future adapter can be injected via deps.projectInstalledComponents.
    const project = typeof input.deps?.projectInstalledComponents === 'function' ? input.deps.projectInstalledComponents : projectDroidAppendages;
    const raw = project(input.installedComponents, input.deps ?? {}) ?? {};
    const projected = { appendages: Array.isArray(raw.appendages) ? raw.appendages : [], unresolvedRecords: Array.isArray(raw.unresolvedRecords) ? raw.unresolvedRecords : [], issues: Array.isArray(raw.issues) ? raw.issues : [] };
    issues.push(...projected.issues);
    const appendages = applyOverrides(projected.appendages, overrides, issues);
    capabilityIssues(appendages, issues);
    if (!appendages.length && !projected.unresolvedRecords.length) issues.push(issue('no-appendage-evidence', 'blocking', 'No appendage component is recorded in the installed-component evidence; no manipulator is granted (a droid is not given default biological arms).'));
    // `resolved` is reserved for evidence sufficient for future allocation: every appendage has a confirmed slot AND installed-instance
    // identity, all three capabilities are booleans, the functional state is known, and no blocking issue remains. Unresolved records
    // (legacy evidence without installation identity) never count as appendages; they can raise `unresolved` to `partial` only when
    // they show installed, enabled hardware that is not stated to be unable to manipulate.
    const blocking = issues.some((i) => i.severity === 'blocking');
    const unknownFacts = issues.some((i) => i.code === 'capability-unknown' || i.code === 'functional-state-unresolved');
    const allocationGrade = appendages.length > 0 && appendages.every((a) => a.identity?.slot && a.identity?.instance);
    const usableRecordFacts = projected.unresolvedRecords.some((r) => (r.candidateInstances?.length ? r.candidateInstances.some((c) => c.functionalState === 'functional') : r.componentState === 'functional') && r.capabilities?.canManipulate !== false);
    let status;
    if (!appendages.length) status = usableRecordFacts ? ANATOMY_STATUS.PARTIAL : ANATOMY_STATUS.UNRESOLVED;
    else status = blocking || unknownFacts || !allocationGrade ? ANATOMY_STATUS.PARTIAL : ANATOMY_STATUS.RESOLVED;
    return result({ anatomyKind: 'installed-component', status, source: appendages.length || projected.unresolvedRecords.length ? ANATOMY_SOURCE.DROID_COMPONENTS : ANATOMY_SOURCE.NONE, defaultApplied: false, appendages, issues, unresolvedRecords: projected.unresolvedRecords });
  }

  if (!actorType) {
    issues.push(issue('actor-type-unknown', 'blocking', 'No explicit actor classification was provided; the biological default is not assumed.'));
    return result({ anatomyKind: 'unknown', status: ANATOMY_STATUS.UNRESOLVED, source: ANATOMY_SOURCE.NONE, defaultApplied: false, appendages: [], issues });
  }

  // ---- unsupported actor types -----------------------------------------------------------------------------------------
  if (!['character', 'npc'].includes(actorType)) {
    issues.push(issue('actor-type-unsupported', 'blocking', `Anatomy is not defined for actor type "${actorType}".`, { actorType }));
    return result({ anatomyKind: 'unsupported', status: ANATOMY_STATUS.UNRESOLVED, source: ANATOMY_SOURCE.NONE, defaultApplied: false, appendages: [], issues });
  }

  // ---- biological anatomy ----------------------------------------------------------------------------------------------
  if (speciesProfile && speciesProfile.anatomy !== undefined && speciesProfile.anatomy !== null) {
    const appendages = applyOverrides(readSpeciesAnatomy(speciesProfile.anatomy), overrides, issues);
    capabilityIssues(appendages, issues);
    const incomplete = issues.some((i) => i.code === 'capability-unknown' || i.code === 'functional-state-unresolved');
    return result({ anatomyKind: 'biological', status: incomplete ? ANATOMY_STATUS.PARTIAL : ANATOMY_STATUS.RESOLVED, source: ANATOMY_SOURCE.SPECIES_ANATOMY, defaultApplied: false, appendages, issues });
  }

  // Temporary guards: a known anatomical exception exists but its structured data does not. Never flatten it into a complete default.
  if (speciesProfile) {
    const guarded = traitIds(speciesProfile).filter((id) => TEMPORARY_UNRESOLVED_EXCEPTION_TRAIT_IDS.includes(id));
    if (guarded.length) {
      for (const traitId of [...new Set(guarded)].sort()) {
        issues.push(issue('anatomy-exception-unresolved', 'blocking', `The effective species profile carries trait "${traitId}", a known anatomical exception whose structured anatomy is not yet supplied (E2B). No appendage count or capability is inferred and the two-arm default is not applied.`, { traitId, temporary: true }));
      }
      return result({ anatomyKind: 'biological', status: ANATOMY_STATUS.UNRESOLVED, source: ANATOMY_SOURCE.NONE, defaultApplied: false, appendages: [], issues });
    }
  } else {
    issues.push(issue('species-profile-not-provided', 'warning', 'No effective species profile was provided; the provisional two-arm default was applied, but whether a species exception exists cannot be established.'));
  }

  const appendages = applyOverrides(defaultNaturalArms(), overrides, issues);
  capabilityIssues(appendages, issues);
  const defaultIncomplete = issues.some((i) => i.code === 'functional-state-unresolved' || i.code === 'species-profile-not-provided');
  return result({ anatomyKind: 'biological', status: defaultIncomplete ? ANATOMY_STATUS.PARTIAL : ANATOMY_STATUS.RESOLVED, source: ANATOMY_SOURCE.DEFAULT, defaultApplied: true, appendages, issues });
}

export default { resolveEffectiveAnatomy, AnatomyInputError, ANATOMY_STATUS, ANATOMY_SOURCE, FUNCTIONAL_STATES, TEMPORARY_UNRESOLVED_EXCEPTION_TRAIT_IDS };
