/**
 * Force V2 definition registry: the runtime reader of the source-certified, seven-book typed definition corpus
 * (`data/force-v2/definitions.json`, built by tools/build-force-v2-definition-registry.mjs from docs/audits/force-v2/bookwise-v2.9).
 *
 * Contract:
 *  - Definitions are DATA ONLY. Loading a definition makes nothing automatic: executable behavior must be implemented by the
 *    existing engines (ForceExecutor, ForcePowerMaintenance, SuiteInstanceRecovery, ForcePointsService) and read from here.
 *  - Identity: `definitionId` is canonical. A pack item is linked by its compendium id (`legacyPackId`); name matching is a
 *    labelled fallback (`via: 'name'`) and is never silently treated as the same strength of evidence.
 *  - A missing or invalid corpus leaves the previous behavior in force (all lookups return null).
 */
const SCHEMA_VERSION = 1;

export const FORCE_DEFINITION_DOMAINS = Object.freeze([
  'force-power', 'force-technique', 'force-secret', 'force-regimen', 'lightsaber-form-power', 'starship-maneuver', 'unleashed-overlay'
]);

const ITEM_TYPE_DOMAIN = Object.freeze({
  'force-power': 'force-power', forcepower: 'force-power', 'force-technique': 'force-technique', forcetechnique: 'force-technique',
  'force-secret': 'force-secret', forcesecret: 'force-secret', 'force-regimen': 'force-regimen', forceregimen: 'force-regimen',
  'lightsaber-form-power': 'lightsaber-form-power', 'starship-maneuver': 'starship-maneuver', starshipmaneuver: 'starship-maneuver'
});

let REGISTRY = null;

const norm = (v) => String(v ?? '').trim().toLowerCase();

/** Install an already-parsed corpus (system init, tests). Anything with another schema or inconsistent counts is refused. */
export function installForceDefinitions(json) {
  REGISTRY = null;
  if (!json || json.schemaVersion !== SCHEMA_VERSION || !Array.isArray(json.definitions)) return false;
  const byId = new Map(), byPackId = new Map(), byName = new Map(), byDomain = new Map();
  for (const def of json.definitions) {
    if (!def?.definitionId || !FORCE_DEFINITION_DOMAINS.includes(def.domain) || byId.has(def.definitionId)) return false;
    byId.set(def.definitionId, def);
    if (def.legacyPackId) byPackId.set(String(def.legacyPackId), def);
    const key = `${def.domain}|${norm(def.printedName)}`;
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(def);
    if (!byDomain.has(def.domain)) byDomain.set(def.domain, []);
    byDomain.get(def.domain).push(def);
  }
  if (Number.isFinite(json.total) && json.total !== byId.size) return false;
  REGISTRY = { byId, byPackId, byName, byDomain, total: byId.size };
  return true;
}

export function clearForceDefinitions() { REGISTRY = null; }
export function isForceDefinitionRegistryLoaded() { return REGISTRY !== null; }

/** Load through `fetchFn` (default global fetch). Never throws. */
export async function loadForceDefinitions(fetchFn = globalThis.fetch, url = 'systems/foundryvtt-swse/data/force-v2/definitions.json') {
  try {
    const response = await fetchFn(url);
    if (!response?.ok) return false;
    return installForceDefinitions(await response.json());
  } catch (_err) {
    return false;
  }
}

export function getForceDefinition(definitionId) { return REGISTRY?.byId.get(String(definitionId)) ?? null; }

export function listForceDefinitions({ domain = null, bookId = null } = {}) {
  if (!REGISTRY) return [];
  const pool = domain ? (REGISTRY.byDomain.get(domain) ?? []) : [...REGISTRY.byId.values()];
  return bookId ? pool.filter((d) => d.source?.bookId === bookId) : pool.slice();
}

export function forceDefinitionCounts() {
  const counts = {};
  if (!REGISTRY) return counts;
  for (const [domain, list] of REGISTRY.byDomain) counts[domain] = list.length;
  return counts;
}

function packIdOf(item) {
  for (const value of [item?._stats?.compendiumSource, item?.flags?.core?.sourceId, item?.sourceUuid, item?.uuid]) {
    const m = /Item\.([0-9a-zA-Z_]+)$/.exec(String(value ?? ''));
    if (m) return m[1];
  }
  return item?.system?.legacyPackId ?? item?.flags?.['foundryvtt-swse']?.packId ?? null;
}

/**
 * Definition for an owned/world/pack item. Returns `{ definition, via }` where via is 'pack-id' (strong) or 'name' (fallback:
 * same domain and an unambiguous printed name), or null. Ambiguous names return null rather than guessing.
 */
export function forceDefinitionForItem(item) {
  if (!REGISTRY || !item) return null;
  const packId = packIdOf(item);
  const byPack = packId ? REGISTRY.byPackId.get(String(packId)) : null;
  if (byPack) return { definition: byPack, via: 'pack-id' };
  const domain = ITEM_TYPE_DOMAIN[norm(item.type)];
  if (!domain) return null;
  const matches = REGISTRY.byName.get(`${domain}|${norm(item.name)}`) ?? [];
  return matches.length === 1 ? { definition: matches[0], via: 'name' } : null;
}
