/**
 * P6A published-errata correction of source-backed vehicle publications (Starships of the Galaxy Errata 1.0,
 * 2008-01-29), shared by the canonical source builder and the GM-controlled world-Actor migration.
 *
 * SOTG_ERRATA_AMENDMENT mirrors data/audits/vehicles/swse-universal-p6a-sotg-errata-amendment.json (a test keeps
 * them identical). Every change checks the printed value before replacing it; nothing else in a record changes.
 *
 * World migration is never automatic: planErrataMigration only PLANS. A GM previews and authorizes; the service
 * snapshots, writes through the provenance write-authorization, and records the migration. Current shield value is
 * preserved by default (a corrected maximum never heals a damaged ship).
 * Pure; no Foundry globals.
 */
import { digestUniversalVehicleSource } from './vehicle-source-digest.js';
import { classifyVehicleActorSource } from './vehicle-runtime-contract.js';

// Used as a flag key: no dots (Foundry expands dotted update paths).
export const ERRATA_MIGRATION_VERSION = 'p6a-sotg-errata-v1';

export const SOTG_ERRATA_AMENDMENT = Object.freeze({
  id: 'P6A-SOTG-ERRATA-1.0-PUBLICATION-001',
  errata: 'Starships of the Galaxy Errata 1.0 (Wizards of the Coast, 2008-01-29)',
  records: [
    { sourceEntryKey: 'sotg-immobilizer-418-interdictor-class-heavy-cruiser', errataId: 'SOTG-E1-GRAVITY-WELL-AREA', page: 100,
      changes: [
        { path: ['armament', 'firingGroups', 1, 'specialNotes'], kind: 'substring', from: '"areaPrintedWeaponRow":"4x4 starship squares"', to: '"areaPrintedWeaponRow":"3x3 starship squares (Errata 1.0; printed 4x4)"' },
        { path: ['exceptions', 'specialRules', 0, 'summary'], kind: 'substring', from: '"statblockAreaSquares":"4x4"', to: '"statblockAreaSquares":"3x3","statblockAreaSquaresPrinted":"4x4","errata":"SOTG-E1-GRAVITY-WELL-AREA"' }
      ] },
    { sourceEntryKey: 'sotg-koensayr-btl-s3-y-wing', errataId: 'SOTG-E1-Y-WING-SHIELDS', page: 158, changes: [{ path: ['defenses', 'shieldRating'], kind: 'value', from: 10, to: 25 }] },
    { sourceEntryKey: 'sotg-koensayr-btl-s3-courier', errataId: 'SOTG-E1-Y-WING-SHIELDS', page: 159, changes: [{ path: ['defenses', 'shieldRating'], kind: 'value', from: 10, to: 25 }] },
    { sourceEntryKey: 'sotg-koensayr-btl-a4-lp-longprobe', errataId: 'SOTG-E1-Y-WING-SHIELDS', page: 159, changes: [{ path: ['defenses', 'shieldRating'], kind: 'value', from: 10, to: 25 }] }
  ]
});

const clone = v => JSON.parse(JSON.stringify(v));
export const errataEntryFor = key => SOTG_ERRATA_AMENDMENT.records.find(r => r.sourceEntryKey === key) ?? null;

/** Apply one amendment entry to a source record. Returns { ok, record } or { ok:false, reason }. Never mutates the input. */
export function applyErrataToRecord(record, entry, amendment = SOTG_ERRATA_AMENDMENT) {
  const r = clone(record);
  for (const c of entry.changes) {
    const parent = c.path.slice(0, -1).reduce((o, k) => o?.[k], r), key = c.path.at(-1);
    if (parent == null) return { ok: false, reason: 'ERRATA_PATH_MISSING:' + c.path.join('.') };
    if (c.kind === 'value') { if (parent[key] !== c.from) return { ok: false, reason: 'PRINTED_VALUE_MISMATCH:' + c.path.join('.') }; parent[key] = c.to; }
    else { if (typeof parent[key] !== 'string' || !parent[key].includes(c.from)) return { ok: false, reason: 'PRINTED_TEXT_MISMATCH:' + c.path.join('.') }; parent[key] = parent[key].replace(c.from, c.to); }
  }
  r.publication.errataApplied = [...(r.publication.errataApplied ?? []), { id: entry.errataId, amendment: amendment.id, errata: amendment.errata, page: entry.page,
    changes: entry.changes.map(c => ({ path: c.path.join('.'), printed: c.from, corrected: c.to })) }];
  return { ok: true, record: r };
}

const isShieldEntry = entry => entry.changes.some(c => c.path.join('.') === 'defenses.shieldRating');

/**
 * Plan the migration of one world Actor. Status: NOT_AFFECTED | ALREADY_MIGRATED | REJECTED | READY.
 * @param {object} actor  Actor (or Actor-like with toObject)
 * @param {{shieldPolicy?: 'preserve'|'initialize-full', gmConfirmedUndamaged?: boolean}} [options]
 */
export function planErrataMigration(actor, options = {}) {
  const raw = typeof actor?.toObject === 'function' ? actor.toObject() : actor;
  const flags = raw?.flags?.swse ?? {};
  const key = flags.universalVehicleSource?.source?.identity?.sourceEntryKey ?? flags.canonicalPublication?.sourceEntryKey ?? raw?.system?.vehicleSourceEntryKey;
  const entry = raw?.type === 'vehicle' ? errataEntryFor(key) : null;
  const base = { actorId: raw?._id ?? actor?.id ?? null, name: raw?.name ?? null, sourceEntryKey: key ?? null };
  if (!entry) return { ...base, status: 'NOT_AFFECTED', reasons: [] };
  const assessment = classifyVehicleActorSource(raw, undefined, { mode: 'runtime' });
  if (assessment.kind !== 'canonical') return { ...base, status: 'REJECTED', reasons: ['INVALID_SOURCE_PROVENANCE', ...assessment.errors] };
  const record = flags.universalVehicleSource.source;
  if ((record.publication?.errataApplied ?? []).some(e => e.id === entry.errataId)) return { ...base, status: 'ALREADY_MIGRATED', reasons: [] };
  const applied = applyErrataToRecord(record, entry);
  if (!applied.ok) return { ...base, status: 'REJECTED', reasons: ['UNKNOWN_SOURCE_VERSION', applied.reason] };

  const update = {
    'flags.swse.universalVehicleSource': { ...clone(flags.universalVehicleSource), recordDigest: digestUniversalVehicleSource(applied.record), source: applied.record }
  };
  const original = {}, corrected = {};
  const sys = raw.system ?? {};
  if (isShieldEntry(entry)) {
    const to = entry.changes.find(c => c.path.join('.') === 'defenses.shieldRating').to;
    const current = sys.shields?.value;
    original.shieldRating = sys.shieldRating; original.shieldsMax = sys.shields?.max; original.shieldsValue = current;
    update['system.shieldRating'] = to;
    update['system.shields.max'] = to;
    let value = current;
    if (options.shieldPolicy === 'initialize-full') {
      if (options.gmConfirmedUndamaged !== true) return { ...base, status: 'REJECTED', reasons: ['SHIELD_INITIALIZATION_REQUIRES_GM_CONFIRMATION'] };
      value = to;
      update['system.shields.value'] = to;
    }
    Object.assign(corrected, { shieldRating: to, shieldsMax: to, shieldsValue: value });
  }
  if (Array.isArray(sys.sourceAttackGroups)) { update['system.sourceAttackGroups'] = clone(applied.record.armament?.firingGroups ?? []); }
  for (const c of entry.changes) { original[c.path.join('.')] = c.from; corrected[c.path.join('.')] = c.to; }

  // The migrated Actor must still verify as a valid source-backed vehicle.
  const after = clone(raw);
  after.flags.swse.universalVehicleSource = update['flags.swse.universalVehicleSource'];
  if ('system.shieldRating' in update) { after.system.shieldRating = update['system.shieldRating']; after.system.shields = { ...(after.system.shields ?? {}), max: update['system.shields.max'], ...('system.shields.value' in update ? { value: update['system.shields.value'] } : {}) }; }
  if ('system.sourceAttackGroups' in update) after.system.sourceAttackGroups = update['system.sourceAttackGroups'];
  const post = classifyVehicleActorSource(after, undefined, { mode: 'runtime' });
  if (post.kind !== 'canonical') return { ...base, status: 'REJECTED', reasons: ['MIGRATION_RESULT_INVALID', ...post.errors] };

  return { ...base, status: 'READY', reasons: [], errataId: entry.errataId, shieldPolicy: options.shieldPolicy ?? 'preserve',
    preview: { original, corrected, changes: entry.changes.map(c => ({ path: c.path.join('.'), from: c.from, to: c.to })) },
    update, backup: { universalVehicleSource: clone(flags.universalVehicleSource), shieldRating: sys.shieldRating ?? null, shields: clone(sys.shields ?? null),
      sourceAttackGroups: Array.isArray(sys.sourceAttackGroups) ? clone(sys.sourceAttackGroups) : null } };
}
