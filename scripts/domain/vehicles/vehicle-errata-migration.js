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

/**
 * State fingerprint for preview-vs-authorization freshness: the source record digest, the shield mirrors and the
 * printed groups mirror. A different fingerprint at authorization time means the Actor changed since the preview.
 */
export function migrationFingerprint(actor) {
  const raw = typeof actor?.toObject === 'function' ? actor.toObject() : actor;
  const sys = raw?.system ?? {};
  return digestUniversalVehicleSource({ recordDigest: raw?.flags?.swse?.universalVehicleSource?.recordDigest ?? null, shieldRating: sys.shieldRating ?? null,
    shields: sys.shields ?? null, sourceAttackGroups: sys.sourceAttackGroups ?? null, migrations: raw?.flags?.swse?.errataMigrations ?? [] });
}

/** After a migration write: does the PERSISTED Actor hold exactly the planned correction (and still verify)? */
export function verifyMigratedState(actor, plan) {
  const raw = typeof actor?.toObject === 'function' ? actor.toObject() : actor;
  const problems = [];
  const src = raw?.flags?.swse?.universalVehicleSource;
  const want = plan.update['flags.swse.universalVehicleSource'];
  if (src?.recordDigest !== want.recordDigest || JSON.stringify(src?.source) !== JSON.stringify(want.source)) problems.push('SOURCE_NOT_PERSISTED');
  for (const path of ['system.shieldRating', 'system.shields.max', 'system.shields.value', 'system.sourceAttackGroups']) {
    if (!(path in plan.update)) continue;
    const got = path.split('.').reduce((o, k) => o?.[k], raw);
    if (JSON.stringify(got) !== JSON.stringify(plan.update[path])) problems.push('MIRROR_NOT_PERSISTED:' + path);
  }
  if ('system.shieldRating' in plan.update && !('system.shields.value' in plan.update) && raw?.system?.shields?.value !== plan.preview.original.shieldsValue)
    problems.push('CURRENT_SHIELDS_CHANGED');
  if (!(raw?.flags?.swse?.errataMigrations ?? []).some(m => m.version === ERRATA_MIGRATION_VERSION && m.errataId === plan.errataId)) problems.push('MIGRATION_RECORD_MISSING');
  if (classifyVehicleActorSource(raw, undefined, { mode: 'runtime' }).kind !== 'canonical') problems.push('MIGRATED_ACTOR_INVALID');
  return { ok: problems.length === 0, problems };
}

/** Does the persisted Actor exactly match the backup (immediate failed-write recovery check)? */
export function verifyRestoredState(actor, backup) {
  const raw = typeof actor?.toObject === 'function' ? actor.toObject() : actor;
  const problems = [];
  if (JSON.stringify(raw?.flags?.swse?.universalVehicleSource) !== JSON.stringify(backup.universalVehicleSource)) problems.push('SOURCE_NOT_RESTORED');
  if (backup.shields && JSON.stringify(raw?.system?.shields) !== JSON.stringify(backup.shields)) problems.push('SHIELDS_NOT_RESTORED');
  if (backup.shieldRating !== null && raw?.system?.shieldRating !== backup.shieldRating) problems.push('SHIELD_RATING_NOT_RESTORED');
  if (backup.sourceAttackGroups && JSON.stringify(raw?.system?.sourceAttackGroups) !== JSON.stringify(backup.sourceAttackGroups)) problems.push('GROUPS_NOT_RESTORED');
  return { ok: problems.length === 0, problems };
}

/**
 * GM-requested MANUAL restoration (after gameplay may have happened). Restores the pre-errata publication record,
 * its digest, the shield MAXIMUM mirrors and the printed groups mirror, but never blindly the current shield value:
 *   - current shields <= the restored maximum: kept as they are (post-migration damage/recharge/repairs preserved);
 *   - current shields > the restored maximum: refused unless the GM chooses shieldDecision 'clamp-to-restored-max'.
 * Refuses when there is no active migration, the source no longer equals what the migration wrote (re-migrated,
 * tampered or otherwise changed), or the backup does not verify.
 * @param {{shieldDecision?: 'clamp-to-restored-max'}} [options]
 */
/** Deletion keys that undo what a migration ADDED to the source record (merge semantics never remove keys). */
export function restoreDeletions(backup) {
  return backup.universalVehicleSource?.source?.publication?.errataApplied ? {} : { 'flags.swse.universalVehicleSource.source.publication.-=errataApplied': null };
}

export function planManualRestore(actor, options = {}) {
  const raw = typeof actor?.toObject === 'function' ? actor.toObject() : actor;
  const flags = raw?.flags?.swse ?? {};
  const base = { actorId: raw?._id ?? actor?.id ?? null, name: raw?.name ?? null };
  const record = (flags.errataMigrations ?? []).find(m => m.version === ERRATA_MIGRATION_VERSION);
  const backup = flags.errataMigrationBackups?.[ERRATA_MIGRATION_VERSION];
  if (!record) return { ...base, status: 'REJECTED', reasons: ['NO_ACTIVE_MIGRATION'] };
  if (!backup) return { ...base, status: 'REJECTED', reasons: ['NO_BACKUP'] };
  const key = backup.universalVehicleSource?.source?.identity?.sourceEntryKey;
  const entry = errataEntryFor(key);
  const expected = entry && applyErrataToRecord(backup.universalVehicleSource.source, entry);
  if (!expected?.ok || digestUniversalVehicleSource(backup.universalVehicleSource.source) !== backup.universalVehicleSource.recordDigest)
    return { ...base, status: 'REJECTED', reasons: ['BACKUP_INVALID'] };
  if (JSON.stringify(flags.universalVehicleSource?.source) !== JSON.stringify(expected.record))
    return { ...base, status: 'REJECTED', reasons: ['CURRENT_SOURCE_DIFFERS_FROM_MIGRATED_STATE'] };

  const sys = raw.system ?? {};
  // Foundry merges object updates: keys the backup lacks (publication.errataApplied) must be deleted explicitly.
  const update = { 'flags.swse.universalVehicleSource': clone(backup.universalVehicleSource), ...restoreDeletions(backup) };
  const gameplayChanges = [];
  const shieldChange = entry.changes.find(c => c.path.join('.') === 'defenses.shieldRating');
  let shields = null;
  if (shieldChange) {
    const current = sys.shields?.value, restoredMax = backup.shields?.max ?? shieldChange.from;
    if (current !== record.corrected?.shieldsValue) gameplayChanges.push({ field: 'system.shields.value', atMigration: record.corrected?.shieldsValue ?? null, now: current });
    let value = current;
    if (Number.isFinite(current) && current > restoredMax) {
      if (options.shieldDecision !== 'clamp-to-restored-max')
        return { ...base, status: 'NEEDS_GM_DECISION', reasons: ['CURRENT_SHIELDS_EXCEED_RESTORED_MAXIMUM'], gameplayChanges, current, restoredMax };
      value = restoredMax;
    }
    update['system.shieldRating'] = backup.shieldRating ?? restoredMax;
    update['system.shields.max'] = restoredMax;
    if (value !== current) update['system.shields.value'] = value;
    shields = { before: { value: current, max: sys.shields?.max }, after: { value, max: restoredMax } };
  }
  if (backup.sourceAttackGroups) update['system.sourceAttackGroups'] = clone(backup.sourceAttackGroups);
  update['flags.swse.errataMigrations'] = (flags.errataMigrations ?? []).filter(m => m.version !== ERRATA_MIGRATION_VERSION);
  // the restored Actor must verify too
  const after = clone(raw);
  after.flags.swse.universalVehicleSource = clone(update['flags.swse.universalVehicleSource']);
  if ('system.shieldRating' in update) after.system = { ...after.system, shieldRating: update['system.shieldRating'], shields: { ...(after.system.shields ?? {}), max: update['system.shields.max'], value: update['system.shields.value'] ?? after.system.shields?.value } };
  if ('system.sourceAttackGroups' in update) after.system.sourceAttackGroups = update['system.sourceAttackGroups'];
  const post = classifyVehicleActorSource(after, undefined, { mode: 'runtime' });
  if (post.kind !== 'canonical') return { ...base, status: 'REJECTED', reasons: ['RESTORE_RESULT_INVALID', ...post.errors] };
  return { ...base, status: 'READY', reasons: [], errataId: record.errataId, gameplayChanges, shields, shieldDecision: options.shieldDecision ?? null, update };
}
