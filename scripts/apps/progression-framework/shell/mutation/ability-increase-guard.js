/**
 * Ability-increase entitlement guard (Checkpoint A).
 *
 * An ability-score increase is ADDITIVE (`base = old + delta`), so it must never be applied twice for one entitlement and must always
 * be attributed to the level of the entitlement being resolved - never to "the actor's current level", never to 0/null.
 *
 * Pure helpers + one tiny in-process registry. No rules are decided here: the entitlement COUNT stays with the reconciler / progression
 * authorities; this module only enforces identity, "at most one active record per entitlement", and write-time revalidation.
 */
export const ABILITY_HISTORY_KEY = 'system.progression.abilityIncreaseHistory';
export const LAST_ABILITY_INCREASE_KEY = 'system.progression.lastAbilityIncrease';
const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ID_RE = /^ability-increase-level-(\d+)$/;

export class AbilityIncreaseError extends Error {
  constructor(code, message) { super(message); this.name = 'AbilityIncreaseError'; this.code = code; }
}

export const entitlementIdForLevel = (level) => `ability-increase-level-${level}`;

/** Strict positive integer or null. null / undefined / '' / 0 / negatives / NaN / non-integers / booleans are NOT levels. */
export function strictLevel(value) {
  if (typeof value === 'boolean' || value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

export function levelFromEntitlementId(id) {
  const m = ID_RE.exec(String(id ?? ''));
  return m ? strictLevel(m[1]) : null;
}

const present = (v) => v !== null && v !== undefined && v !== '';

/**
 * The level of the entitlement being resolved. Sources: the explicit level the attribute step carried, the slot / entitlement id, and the
 * level-up manifest. Anything present but invalid, or two valid sources that disagree, FAILS CLOSED. No source at all FAILS CLOSED.
 * @returns {{level:number, entitlementId:string}}
 */
export function resolveEntitlementLevel({ attr = {}, manifest = null } = {}) {
  const sources = [
    ['attr.abilityIncreaseLevel', attr?.abilityIncreaseLevel, strictLevel],
    ['attr.slotId', attr?.slotId, levelFromEntitlementId],
    ['manifest.characterLevel', manifest?.characterLevel, strictLevel],
  ];
  const found = new Map();
  for (const [name, raw, parse] of sources) {
    if (!present(raw)) continue;
    const level = parse(raw);
    if (level === null) throw new AbilityIncreaseError('INVALID_ENTITLEMENT_LEVEL', `Ability-increase entitlement level is invalid (${name} = ${JSON.stringify(raw)}); nothing was changed.`);
    found.set(name, level);
  }
  const distinct = new Set(found.values());
  if (distinct.size === 0) throw new AbilityIncreaseError('MISSING_ENTITLEMENT_LEVEL', 'Ability-increase entitlement level is missing; nothing was changed.');
  if (distinct.size > 1) throw new AbilityIncreaseError('ENTITLEMENT_LEVEL_CONFLICT', `Ability-increase entitlement level is ambiguous (${[...found].map(([k, v]) => `${k}=${v}`).join(', ')}); nothing was changed.`);
  const level = [...distinct][0];
  return { level, entitlementId: entitlementIdForLevel(level) };
}

export const recordLevel = (entry = {}) => strictLevel(entry?.level ?? entry?.characterLevel ?? entry?.acquiredAtLevel ?? entry?.sourceLevel);

export function recordsForLevel(history, level) {
  return (Array.isArray(history) ? history : []).filter(entry => recordLevel(entry) === level);
}

/** C1 / C2: one active record per entitlement. An existing record - complete, partial, or later a manual acknowledgment - blocks a new application. */
export function assertEntitlementOpen(history, level) {
  const existing = recordsForLevel(history, level);
  if (existing.length) {
    throw new AbilityIncreaseError('ENTITLEMENT_ALREADY_RECORDED', `The level ${level} ability increase already has a recorded entry; applying it again would increase the scores twice. Nothing was changed.`);
  }
}

/** The ability-increase transaction a mutation plan's `set` describes (from the latest-event record the builder emits), or null. */
export function describeAbilityTransaction(planSet) {
  const record = planSet?.[LAST_ABILITY_INCREASE_KEY];
  if (!record || typeof record !== 'object' || !record.increases) return null;
  const level = strictLevel(record.level);
  const bases = {};
  for (const key of ABILITY_KEYS) {
    const delta = Number(record.increases?.[key] || 0) || 0;
    const next = planSet?.[`system.attributes.${key}.base`];
    if (delta > 0 && Number.isFinite(Number(next))) bases[key] = { delta, next: Number(next) };
  }
  return { level, record, bases };
}

const inFlight = new Set();
export const _resetAbilityIncreaseGuard = () => inFlight.clear();

/**
 * Transaction-boundary guard, called immediately before the plan is handed to ActorEngine.
 *  - refuses a plan whose entitlement level is not a valid positive integer;
 *  - refuses a concurrent second application of the same entitlement from this client;
 *  - RE-READS the actor now: refuses if the entitlement has since been recorded, or if any increased score no longer has the value the plan
 *    was built from (another client or a manual edit changed it between preparation and commit).
 * Scores are written as absolute values, so two identical stale submissions also cannot stack; the residual cross-client race (two different
 * selections prepared from the same stale read) is narrowed to this revalidation window, not eliminated - Foundry has no document transaction.
 * @returns {{ok:boolean, error?:string, code?:string, release:Function}}
 */
export function beginAbilityIncreaseTransaction(actor, mutationPlan) {
  const noop = () => {};
  const info = describeAbilityTransaction(mutationPlan?.set);
  if (!info) return { ok: true, release: noop };
  const refuse = (code, error) => ({ ok: false, code, error, release: noop });
  if (info.level === null) return refuse('INVALID_ENTITLEMENT_LEVEL', 'The ability-increase record has no valid level; nothing was changed.');
  const key = `${actor?.id}:${info.level}`;
  if (inFlight.has(key)) return refuse('APPLICATION_IN_PROGRESS', `The level ${info.level} ability increase is already being applied; nothing was changed.`);
  const history = actor?.system?.progression?.abilityIncreaseHistory;
  if (recordsForLevel(history, info.level).length) return refuse('ENTITLEMENT_ALREADY_RECORDED', `The level ${info.level} ability increase was recorded since this was prepared; applying it again would increase the scores twice. Nothing was changed.`);
  for (const [ability, { delta, next }] of Object.entries(info.bases)) {
    const current = Number(actor?.system?.attributes?.[ability]?.base);
    if (current !== next - delta) return refuse('SCORES_CHANGED', `The ${ability.toUpperCase()} score changed since this was prepared; review the character and try again. Nothing was changed.`);
  }
  inFlight.add(key);
  return { ok: true, release: () => inFlight.delete(key) };
}

export default { resolveEntitlementLevel, assertEntitlementOpen, beginAbilityIncreaseTransaction, strictLevel, entitlementIdForLevel, levelFromEntitlementId };
