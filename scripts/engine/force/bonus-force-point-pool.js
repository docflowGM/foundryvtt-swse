/**
 * Bonus Force Point pool — single read/write location (V2 realignment Phase 3B; findings F-TAL-007, F-FRC-003).
 *
 * WHY THIS EXISTS
 * The pool used to live in two flag scopes. `getFlag('swse', k)` prefers the canonical `foundryvtt-swse` copy, but
 * ActorEngine and most producers wrote the literal legacy path `flags.swse.bonusForcePoints`, while Guardian Spirit and the
 * sheet's manual adjustment wrote the canonical copy via `setFlag('swse', …)`. After any canonical write every later debit
 * landed in a copy nothing read, so the same bonus point could be spent again.
 *
 * CONTRACT
 *  - Persisted location: `flags.swse.bonusForcePoints` (the scope that already holds the rest of the Force Point state,
 *    e.g. `flags.swse.forcePointLedger`). Choosing a repository-wide flag namespace is a separate owner decision (AD-008);
 *    this module deliberately does not migrate any other key.
 *  - Every write goes through {@link bonusPoolUpdate}, which writes that location AND clears a canonical shadow copy in the
 *    SAME update, so exactly one copy exists after any governed write.
 *  - Every read goes through {@link readBonusPool}. With one stored copy it returns that copy unchanged. With two (data
 *    written by the old code) it merges them without discarding any balance and without letting any entry exceed the value
 *    either stored copy recorded; the next governed write heals the divergence. Reads never write.
 *
 * This module is a pure leaf (no engine imports) so any layer can use it without creating a dependency cycle.
 */
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const KEY = 'bonusForcePoints';
export const BONUS_POOL_LEGACY_SCOPE = 'swse';
export const BONUS_POOL_CANONICAL_SCOPE = 'foundryvtt-swse';
/** The single persisted location. */
export const BONUS_POOL_PATH = `flags.${BONUS_POOL_LEGACY_SCOPE}.${KEY}`;
/** Deletion key that clears a canonical shadow copy (Foundry `-=` update syntax). */
export const BONUS_POOL_SHADOW_DELETE_PATH = `flags.${BONUS_POOL_CANONICAL_SCOPE}.-=${KEY}`;

const WARNED = new Set();
const isPool = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Raw stored copies, read from the document data (never through the scope-redirecting getFlag). */
export function readBonusPoolCopies(actor) {
  const canonical = actor?.flags?.[BONUS_POOL_CANONICAL_SCOPE]?.[KEY];
  const legacy = actor?.flags?.[BONUS_POOL_LEGACY_SCOPE]?.[KEY];
  return { canonical: isPool(canonical) ? canonical : undefined, legacy: isPool(legacy) ? legacy : undefined };
}

const entriesOf = (pool) => (Array.isArray(pool?.entries) ? pool.entries.filter((e) => e && typeof e === 'object') : []);
const numberOr = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

/**
 * Merge two stored copies of the same pool. Legacy is the base (every writer except the old Guardian path wrote it).
 * Union by entry id; where both copies know an id, the SMALLER value wins (a value only ever decreases by spending);
 * an id known to one copy only is kept as stored. No value is ever raised above what a stored copy recorded.
 */
function mergeCopies(canonical, legacy) {
  const byId = new Map();
  const order = [];
  const add = (entry) => { if (entry.id !== undefined && !byId.has(entry.id)) order.push(entry.id); };
  for (const e of entriesOf(legacy)) { add(e); byId.set(e.id, { ...e }); }
  for (const e of entriesOf(canonical)) {
    const prev = byId.get(e.id);
    if (prev) {
      const value = Math.min(numberOr(prev.value, 0), numberOr(e.value, 0));
      byId.set(e.id, { ...prev, value });
    } else { add(e); byId.set(e.id, { ...e }); }
  }
  const entries = order.map((id) => byId.get(id)).filter((e) => numberOr(e.value, 0) > 0);
  const value = entries.reduce((s, e) => s + numberOr(e.value, 0), 0);
  const max = Math.max(value, entries.reduce((s, e) => s + numberOr(e.max ?? e.value, 0), 0));
  return {
    ...(isPool(canonical) ? canonical : {}), ...(isPool(legacy) ? legacy : {}),
    entries, value, max, sources: [...new Set(entries.map((e) => e.source).filter(Boolean))],
  };
}

/**
 * The effective bonus Force Point pool for an actor ({} when none). Read-only.
 * @param {Actor} actor
 */
export function readBonusPool(actor) {
  const { canonical, legacy } = readBonusPoolCopies(actor);
  if (canonical && legacy) {
    const merged = mergeCopies(canonical, legacy);
    // Warn once per actor per session: reads happen on every render until the next governed write heals the data.
    const warnKey = String(actor?.id ?? actor?.name ?? 'actor');
    if (!WARNED.has(warnKey)) WARNED.add(warnKey);
    else return merged;
    SWSELogger.warn?.(`[BonusForcePointPool] ${actor?.name ?? actor?.id ?? 'actor'} has the bonus Force Point pool in two flag scopes (written by an earlier version); merged without discarding balances. It is healed on the next Force Point write.`);
    return merged;
  }
  if (canonical) return canonical;
  if (legacy) return legacy;
  // Fixtures and non-document actors that expose only getFlag/flags.swse through other means:
  const viaGetFlag = (() => { try { return actor?.getFlag?.(BONUS_POOL_LEGACY_SCOPE, KEY); } catch { return undefined; } })();
  return isPool(viaGetFlag) ? viaGetFlag : {};
}

/**
 * The update fragment that persists `pool` to the single location and removes any canonical shadow copy, atomically.
 * Merge it into the caller's ActorEngine update: `Object.assign(update, bonusPoolUpdate(actor, pool))`.
 */
export function bonusPoolUpdate(actor, pool) {
  const { canonical } = readBonusPoolCopies(actor);
  const fragment = { [BONUS_POOL_PATH]: pool };
  if (canonical !== undefined) fragment[BONUS_POOL_SHADOW_DELETE_PATH] = null;
  return fragment;
}

/**
 * Normalize a stored pool into spendable entries (a legacy aggregate `value` becomes one entry).
 * Single implementation: previously duplicated verbatim in ForceExecutor and GuardianSpiritActions.
 */
export function normalizeBonusEntries(pool = {}) {
  const entries = Array.isArray(pool.entries) ? pool.entries.map((entry, index) => ({
    id: String(entry?.id ?? `bonus-${index}`),
    source: String(entry?.source ?? 'Bonus Force Point'),
    value: Math.max(0, Number(entry?.value ?? 0) || 0),
    max: Math.max(0, Number(entry?.max ?? entry?.value ?? 0) || 0),
    restrictions: entry?.restrictions ?? entry?.restriction ?? '',
    expires: entry?.expires ?? '',
    encounterId: entry?.encounterId ?? null,
    createdAt: entry?.createdAt ?? null
  })).filter(entry => entry.value > 0) : [];
  const legacyValue = Math.max(0, Number(pool.value ?? 0) || 0);
  const entryTotal = entries.reduce((sum, entry) => sum + entry.value, 0);
  if (!entries.length && legacyValue > 0) {
    entries.push({ id: 'legacy-bonus-force-points', source: Array.isArray(pool.sources) && pool.sources.length ? pool.sources.join(', ') : 'Bonus Force Point', value: legacyValue, max: Math.max(legacyValue, Number(pool.max ?? legacyValue) || legacyValue), restrictions: pool.note ?? '', expires: '', encounterId: null, createdAt: null });
  } else if (legacyValue > entryTotal) {
    entries.push({ id: 'legacy-bonus-force-points', source: 'Bonus Force Point', value: legacyValue - entryTotal, max: legacyValue - entryTotal, restrictions: pool.note ?? '', expires: '', encounterId: null, createdAt: null });
  }
  return entries;
}

/**
 * Build a persisted pool object from entries. Single implementation: previously duplicated verbatim in ForceExecutor and
 * the Force Point feat actions.
 */
export function buildBonusPool(entries = [], existing = {}) {
  const clean = entries.filter(entry => Math.max(0, Number(entry.value) || 0) > 0);
  const value = clean.reduce((sum, entry) => sum + Math.max(0, Number(entry.value) || 0), 0);
  const max = clean.reduce((sum, entry) => sum + Math.max(0, Number(entry.max ?? entry.value) || 0), 0);
  return {
    ...existing,
    value,
    max: Math.max(value, max),
    sources: [...new Set(clean.map(entry => entry.source).filter(Boolean))],
    entries: clean,
    note: existing.note || 'Bonus Force Points are spent before normal Force Points and may have source-specific restrictions.'
  };
}
