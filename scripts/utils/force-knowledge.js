/**
 * Force knowledge helpers
 *
 * Canonical read-side adapter for Force Techniques and Force Secrets.
 *
 * The project has carried several historical shapes for known Force knowledge:
 * - canonical item types: force-technique / force-secret
 * - old item types: forcetechnique / forcesecret
 * - older feat/tag rows: force_technique / force_secret
 * - legacy actor ledgers: system.forceTechniques / system.forceSecrets
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
  return Array.from(new Set(values.map(forceKnowledgeKey).filter(Boolean)));
}

function normalizeEntry(entry, source, domain) {
  const name = entryName(entry);
  const identities = entryIdentities(entry);
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
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value;
  const candidates = [value.known, value.list, value.entries, value.values, value.items, value.selected];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return Object.values(value).filter(candidate => typeof candidate === 'string' || (candidate && typeof candidate === 'object'));
}

function collectLedgerEntries(actor, pending, domain) {
  const system = actor?.system || {};
  const progression = system.progression || {};
  const force = system.force || {};
  const derived = system.derived || {};
  const key = domain === 'technique' ? 'forceTechniques' : 'forceSecrets';
  const forceKey = domain === 'technique' ? 'techniques' : 'secrets';
  const pendingKeys = domain === 'technique'
    ? ['forceTechniques', 'selectedForceTechniques', 'grantedForceTechniques']
    : ['forceSecrets', 'selectedForceSecrets', 'grantedForceSecrets'];

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

  for (const pendingKey of pendingKeys) {
    pools.push(pending?.[pendingKey]);
  }

  return pools.flatMap(objectValues);
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
