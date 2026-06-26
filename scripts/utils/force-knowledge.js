import forcePowersCatalog from "/systems/foundryvtt-swse/data/force-powers.json" with { type: "json" };
import lightsaberFormPowersCatalog from "/systems/foundryvtt-swse/data/lightsaber-form-powers.json" with { type: "json" };

/**
 * Force knowledge helpers
 *
 * Canonical read-side adapter for Force Powers, Techniques, and Secrets.
 *
 * The project has carried several historical shapes for known Force knowledge:
 * - canonical item types: force-power / force-technique / force-secret
 * - old item types: forcetechnique / forcesecret
 * - older feat/tag rows: force_power / force_technique / force_secret
 * - legacy actor ledgers: system.forcePowers / system.forceTechniques / system.forceSecrets
 * - progression ledgers: system.progression.forceTechniques / forceSecrets
 *
 * Consumers should ask this helper instead of counting one shape directly.
 */

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function forceKnowledgeKey(value) {
  return normalizeText(value).replace(/\s+/g, '');
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function tagsOf(entry) {
  return [
    ...asArray(entry?.tags),
    ...asArray(entry?.system?.tags),
    ...asArray(entry?.flags?.swse?.tags),
  ].map(tag => String(tag ?? '').trim().toLowerCase()).filter(Boolean);
}

function entryName(entry) {
  return String(
    entry?.name
    || entry?.label
    || entry?.title
    || entry?.id
    || entry?._id
    || entry?.slug
    || entry?.system?.name
    || entry?.system?.canonicalName
    || (typeof entry === 'string' ? entry : '')
  ).trim();
}

function identityFragments(value) {
  const text = String(value ?? '').trim();
  if (!text) return [];
  const fragments = [text];
  const dotted = text.split(/[.#/]/).filter(Boolean);
  if (dotted.length > 1) fragments.push(dotted[dotted.length - 1]);
  const itemMatch = text.match(/(?:Item|Actor)\.([A-Za-z0-9_-]{8,})$/i);
  if (itemMatch?.[1]) fragments.push(itemMatch[1]);
  const hexMatch = text.match(/([A-Fa-f0-9]{12,})$/);
  if (hexMatch?.[1]) fragments.push(hexMatch[1]);
  return fragments;
}

function entryIdentities(entry) {
  const values = [
    entry?.id,
    entry?._id,
    entry?.uuid,
    entry?.slug,
    entry?.internalId,
    entry?.selectionId,
    entry?.techniqueId,
    entry?.secretId,
    entry?.powerId,
    entry?.basePowerId,
    entry?.baseTechniqueId,
    entry?.baseSecretId,
    entry?.sourceId,
    entry?.system?.id,
    entry?.system?._id,
    entry?.system?.slug,
    entry?.system?.selectionId,
    entry?.system?.sourceId,
    entry?.system?.acquisition?.selectionId,
    entry?.flags?.swse?.id,
    entry?.flags?.swse?.progression?.selectionId,
    entry?.flags?.swse?.acquisition?.selectionId,
    entry?.flags?.core?.sourceId,
  ];
  const name = entryName(entry);
  if (name) values.push(name);
  const expanded = values.flatMap(identityFragments);
  return Array.from(new Set(expanded.map(forceKnowledgeKey).filter(Boolean)));
}

function normalizeEntry(entry, source, domain) {
  const rawName = entryName(entry);
  const identities = entryIdentities(entry);
  let name = rawName;
  if (domain === 'power') {
    name = resolveCanonicalForcePowerName(rawName)
      || identities.map(identity => resolveCanonicalForcePowerName(identity)).find(Boolean)
      || rawName;
    const canonicalKey = forceKnowledgeKey(name);
    if (canonicalKey && !identities.includes(canonicalKey)) identities.push(canonicalKey);
  }
  if (!name && !identities.length) return null;
  return {
    id: entry?.id || entry?._id || entry?.uuid || null,
    name,
    key: forceKnowledgeKey(name),
    identities,
    source,
    domain,
    entry,
  };
}

function addEntry(out, seen, entry, source, domain) {
  const normalized = normalizeEntry(entry, source, domain);
  if (!normalized) return;
  const primary = normalized.identities[0] || normalized.key;
  if (!primary || seen.has(primary)) return;
  seen.add(primary);
  for (const identity of normalized.identities) seen.add(identity);
  out.push(normalized);
}

function objectValues(value) {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (typeof value !== 'object') return [];
  if (Array.isArray(value)) return value;
  const candidates = [value.known, value.list, value.entries, value.values, value.items, value.selected];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return Object.entries(value).flatMap(([entryKey, candidate]) => {
    if (typeof candidate === 'string') return [candidate, entryKey].filter(Boolean);
    if (candidate === true) return [entryKey];
    if (candidate && typeof candidate === 'object') {
      return [{ id: entryKey, ...candidate }];
    }
    return [];
  });
}

function collectLedgerEntries(actor, pending, domain) {
  const system = actor?.system || {};
  const progression = system.progression || {};
  const force = system.force || {};
  const derived = system.derived || {};
  const domainConfig = {
    power: {
      key: 'forcePowers',
      forceKey: 'powers',
      extraKeys: ['powers'],
      pendingKeys: ['forcePowers', 'selectedForcePowers', 'grantedForcePowers', 'powers'],
    },
    technique: {
      key: 'forceTechniques',
      forceKey: 'techniques',
      extraKeys: [],
      pendingKeys: ['forceTechniques', 'selectedForceTechniques', 'grantedForceTechniques'],
    },
    secret: {
      key: 'forceSecrets',
      forceKey: 'secrets',
      extraKeys: [],
      pendingKeys: ['forceSecrets', 'selectedForceSecrets', 'grantedForceSecrets'],
    },
  }[domain];
  if (!domainConfig) return [];

  const { key, forceKey, extraKeys, pendingKeys } = domainConfig;
  const receiptSelections = [
    progression.levelUpFinalizationReceipt?.selections?.[key],
    actor?.flags?.swse?.levelUpFinalizationReceipt?.selections?.[key],
    actor?.flags?.['foundryvtt-swse']?.levelUpFinalizationReceipt?.selections?.[key],
  ];
  const pools = [
    system[key],
    system[key]?.known,
    progression[key],
    force[forceKey],
    derived[key]?.list,
    ...receiptSelections,
    pending?.draftSelections?.[key],
    pending?.selections?.[key],
  ];

  if (domain === 'power') {
    pools.push(
      system.forcePowerSuite?.powers,
      system.forcePowerSuite?.known,
      system.forcePowerSuite?.entries,
      system.powerSuite?.powers
    );
  }

  for (const extraKey of extraKeys || []) {
    pools.push(progression?.[extraKey], pending?.draftSelections?.[extraKey], pending?.selections?.[extraKey]);
  }

  for (const pendingKey of pendingKeys) {
    pools.push(pending?.[pendingKey]);
  }

  return pools.flatMap(objectValues);
}

function forcePowerCatalogAliasMap() {
  const aliases = new Map();
  const add = (canonicalName, value) => {
    const name = String(canonicalName ?? '').trim();
    const text = String(value ?? '').trim();
    if (!name || !text) return;
    for (const fragment of identityFragments(text)) {
      const key = forceKnowledgeKey(fragment);
      if (key && !aliases.has(key)) aliases.set(key, name);
    }
  };
  for (const entry of [...asArray(forcePowersCatalog), ...asArray(lightsaberFormPowersCatalog)]) {
    const canonicalName = String(entry?.name || entry?.label || entry?.title || '').trim();
    if (!canonicalName) continue;
    add(canonicalName, canonicalName);
    add(canonicalName, entry?.label);
    add(canonicalName, entry?.title);
    add(canonicalName, entry?.id);
    add(canonicalName, entry?.sourceId);
    add(canonicalName, entry?.slug);
    add(canonicalName, entry?.uuid);
  }
  return aliases;
}

let FORCE_POWER_ALIAS_CACHE = null;

function getForcePowerAliasMap() {
  if (!FORCE_POWER_ALIAS_CACHE) FORCE_POWER_ALIAS_CACHE = forcePowerCatalogAliasMap();
  return FORCE_POWER_ALIAS_CACHE;
}

export function resolveCanonicalForcePowerName(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const cleaned = raw
    .replace(/^requires\s+/i, '')
    .replace(/^knows?\s+/i, '')
    .replace(/^must\s+(?:know|have)\s+/i, '')
    .replace(/^talent\s*[:\-]?\s*/i, '')
    .replace(/^force\s+power\s*[:\-]?\s*/i, '')
    .replace(/\s+(?:force\s+power|in\s+(?:your\s+)?force\s+power\s+suite)$/i, '')
    .trim();
  const aliases = getForcePowerAliasMap();
  const wantedKeys = [raw, cleaned].flatMap(identityFragments).map(forceKnowledgeKey).filter(Boolean);
  for (const key of wantedKeys) {
    const match = aliases.get(key);
    if (match) return match;
  }
  return '';
}

export function isKnownForcePowerItem(item) {
  const type = String(item?.type || '').trim().toLowerCase();
  const tags = tagsOf(item);
  const executionModel = String(item?.system?.executionModel || item?.system?.abilityMeta?.executionModel || '').trim().toLowerCase();
  return type === 'force-power'
    || type === 'forcepower'
    || type === 'force_power'
    || type === 'power'
    || tags.includes('force_power')
    || item?.system?.isForcePower === true
    || executionModel === 'force_power';
}

export function isKnownForceTechniqueItem(item) {
  const type = String(item?.type || '').trim().toLowerCase();
  const tags = tagsOf(item);
  return type === 'force-technique'
    || type === 'forcetechnique'
    || type === 'force_technique'
    || type === 'technique'
    || tags.includes('force_technique')
    || String(item?.system?.forceDomain || '').trim().toLowerCase() === 'technique';
}

export function isKnownForceSecretItem(item) {
  const type = String(item?.type || '').trim().toLowerCase();
  const tags = tagsOf(item);
  return type === 'force-secret'
    || type === 'forcesecret'
    || type === 'force_secret'
    || type === 'secret'
    || tags.includes('force_secret')
    || String(item?.system?.forceDomain || '').trim().toLowerCase() === 'secret';
}

export function collectKnownForcePowers(actor, pending = null) {
  const out = [];
  const seen = new Set();
  for (const item of Array.from(actor?.items || [])) {
    if (isKnownForcePowerItem(item)) addEntry(out, seen, item, 'item', 'power');
  }
  for (const entry of collectLedgerEntries(actor, pending, 'power')) {
    addEntry(out, seen, entry, 'ledger', 'power');
  }
  return out;
}

export function collectKnownForceTechniques(actor, pending = null) {
  const out = [];
  const seen = new Set();
  for (const item of Array.from(actor?.items || [])) {
    if (isKnownForceTechniqueItem(item)) addEntry(out, seen, item, 'item', 'technique');
  }
  for (const entry of collectLedgerEntries(actor, pending, 'technique')) {
    addEntry(out, seen, entry, 'ledger', 'technique');
  }
  return out;
}

export function collectKnownForceSecrets(actor, pending = null) {
  const out = [];
  const seen = new Set();
  for (const item of Array.from(actor?.items || [])) {
    if (isKnownForceSecretItem(item)) addEntry(out, seen, item, 'item', 'secret');
  }
  for (const entry of collectLedgerEntries(actor, pending, 'secret')) {
    addEntry(out, seen, entry, 'ledger', 'secret');
  }
  return out;
}

export function forceKnowledgeEntryMatchesName(entry, requiredName) {
  const required = forceKnowledgeKey(requiredName);
  if (!required) return true;
  return entry?.key === required || Array.from(entry?.identities || []).includes(required);
}

export function forceKnowledgeToLedgerEntries(entries = []) {
  return Array.from(entries || [])
    .map((entry) => ({
      id: entry?.id || entry?.entry?.id || entry?.entry?._id || null,
      name: entry?.name || entryName(entry?.entry || entry),
      source: entry?.source || 'unknown',
    }))
    .filter(entry => entry.name || entry.id);
}
