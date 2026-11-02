/**
 * GM-controlled, versioned migration of existing world vehicle Actors to the P6A published-errata corrections
 * (Starships of the Galaxy Errata 1.0). Never runs on its own: a GM previews, chooses per-Actor shield handling,
 * and authorizes. All writes go through ActorEngine and the provenance guard (one-shot authorization).
 *
 * Integrity: duplicate ids are collapsed; a per-Actor lock refuses concurrent runs on this client; the preview
 * fingerprint must still match at authorization (catches changes made in between, including by another GM);
 * the backup is verified before migrating; the PERSISTED Actor is verified against the planned correction before
 * success is reported (catches refused or altered writes); a failed migration is recovered from the backup and the
 * recovery itself is verified and reported.
 *
 * Two different restore operations:
 *   - immediate failed-write recovery (internal): exact backup state, verified;
 *   - manual GM restoration (previewRestore / restore): preview, explicit confirmation, keeps post-migration
 *     gameplay changes (current shields), refuses unsafe or ambiguous cases, and records an audit entry.
 *
 * Unlinked token Actors are only REPORTED (scanUnlinkedTokens); migrating them is not implemented.
 */
import {
  ERRATA_MIGRATION_VERSION, planErrataMigration, planManualRestore, migrationFingerprint, verifyMigratedState, verifyRestoredState, restoreDeletions, verifyManualRestoreState
} from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-errata-migration.js";
import { authorizeProvenanceMigration, clearProvenanceMigration } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-source-identity.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

const isGM = () => globalThis.game?.user?.isGM === true;
const vehicles = () => Array.from(globalThis.game?.actors?.contents ?? globalThis.game?.actors ?? []).filter(a => a?.type === 'vehicle');
const fresh = id => globalThis.game?.actors?.get?.(id) ?? null; // re-read the persisted document

export class VehicleErrataMigrationService {
  static _busy = new Set();

  /** Plans for every affected world vehicle, each with a freshness fingerprint. */
  static preview(options = {}) {
    if (!isGM()) return { ok: false, reasons: ['GM_REQUIRED'], plans: [] };
    const plans = vehicles().map(a => ({ ...planErrataMigration(a, options[a.id] ?? {}), fingerprint: migrationFingerprint(a) })).filter(p => p.status !== 'NOT_AFFECTED');
    const counts = plans.reduce((m, p) => ((m[p.status] = (m[p.status] ?? 0) + 1), m), {});
    return { ok: true, version: ERRATA_MIGRATION_VERSION, counts, plans };
  }

  /** Read-only report of unlinked token Actors on scenes that hold an affected publication (never migrated). */
  static scanUnlinkedTokens() {
    if (!isGM()) return { ok: false, reasons: ['GM_REQUIRED'], tokens: [] };
    const tokens = [];
    for (const scene of Array.from(globalThis.game?.scenes?.contents ?? [])) for (const t of Array.from(scene.tokens?.contents ?? [])) {
      if (t.actorLink || !t.actor || t.actor.type !== 'vehicle') continue;
      const p = planErrataMigration(t.actor);
      if (p.status !== 'NOT_AFFECTED') tokens.push({ sceneId: scene.id, sceneName: scene.name, tokenId: t.id, name: t.name, status: p.status, reasons: p.reasons });
    }
    return { ok: true, tokens, note: 'Unlinked token Actors are reported only; the published-vehicle migration does not change tokens, scenes or combat state.' };
  }

  static async #write(actor, update) {
    authorizeProvenanceMigration(actor.id, update);
    try { await ActorEngine.updateActor(actor, update, { source: 'vehicle-errata-migration' }); }
    finally { clearProvenanceMigration(actor.id); }
  }

  /** Immediate failed-write recovery: back to the exact backup state, verified. */
  static async #recover(actorId, backup) {
    const actor = fresh(actorId);
    if (!actor) return { ok: false, problems: ['ACTOR_NOT_FOUND'] };
    const update = { 'flags.swse.universalVehicleSource': backup.universalVehicleSource, ...restoreDeletions(backup),
      'flags.swse.errataMigrations': (actor.flags?.swse?.errataMigrations ?? []).filter(m => m.version !== ERRATA_MIGRATION_VERSION) };
    if (backup.shieldRating !== null) update['system.shieldRating'] = backup.shieldRating;
    if (backup.shields) update['system.shields'] = backup.shields;
    if (backup.sourceAttackGroups) update['system.sourceAttackGroups'] = backup.sourceAttackGroups;
    try { await this.#write(actor, update); } catch (err) { return { ok: false, problems: ['RECOVERY_WRITE_FAILED'], error: err?.message ?? String(err) }; }
    return verifyRestoredState(fresh(actorId), backup);
  }

  /**
   * Apply to the GM-selected Actors.
   * @param {{actorIds:string[], options?:object, expectedFingerprints?:Object<string,string>}} p
   *   options[actorId] = { shieldPolicy: 'preserve'|'initialize-full', gmConfirmedUndamaged }
   *   expectedFingerprints[actorId] = fingerprint from the preview the GM approved (required)
   */
  static async apply({ actorIds = [], options = {}, expectedFingerprints = {} } = {}) {
    if (!isGM()) return { ok: false, reasons: ['GM_REQUIRED'], migrated: [], skipped: [], failed: [] };
    const game = globalThis.game, migrated = [], skipped = [], failed = [];
    for (const id of [...new Set(actorIds)]) {
      if (this._busy.has(id)) { skipped.push({ actorId: id, status: 'IN_PROGRESS', reasons: ['MIGRATION_ALREADY_RUNNING_FOR_ACTOR'] }); continue; }
      this._busy.add(id);
      try {
        const actor = fresh(id);
        if (!actor) { failed.push({ actorId: id, reasons: ['ACTOR_NOT_FOUND'] }); continue; }
        if (!expectedFingerprints[id] || expectedFingerprints[id] !== migrationFingerprint(actor)) { skipped.push({ actorId: id, status: 'STALE_PREVIEW', reasons: ['ACTOR_CHANGED_SINCE_PREVIEW'] }); continue; }
        const plan = planErrataMigration(actor, options[id] ?? {});
        if (plan.status !== 'READY') { skipped.push({ actorId: id, status: plan.status, reasons: plan.reasons }); continue; }
        const backupPath = `flags.swse.errataMigrationBackups.${ERRATA_MIGRATION_VERSION}`;
        // 1. backup (unprotected flag), verified before anything protected changes
        try { await ActorEngine.updateActor(actor, { [backupPath]: plan.backup }, { source: 'vehicle-errata-migration-backup' }); }
        catch (err) { failed.push({ actorId: id, reasons: ['BACKUP_WRITE_FAILED'], error: err?.message, migrated: false }); continue; }
        if (JSON.stringify(fresh(id)?.flags?.swse?.errataMigrationBackups?.[ERRATA_MIGRATION_VERSION]) !== JSON.stringify(plan.backup)) {
          failed.push({ actorId: id, reasons: ['BACKUP_NOT_PERSISTED'], migrated: false }); continue;
        }
        // 2. correction + migration record in ONE update, then verify what actually persisted
        const record = { version: ERRATA_MIGRATION_VERSION, errataId: plan.errataId, shieldPolicy: plan.shieldPolicy,
          original: plan.preview.original, corrected: plan.preview.corrected, at: Date.now(), gmUserId: game.user.id, gmUserName: game.user.name };
        let problems = [];
        try {
          await this.#write(fresh(id), { ...plan.update, 'flags.swse.errataMigrations': [...(fresh(id).flags?.swse?.errataMigrations ?? []), record] });
          problems = verifyMigratedState(fresh(id), plan).problems;
        } catch (err) { problems = ['UPDATE_FAILED: ' + (err?.message ?? String(err))]; }
        if (!problems.length) { migrated.push(id); continue; }
        const recovery = await this.#recover(id, plan.backup);
        failed.push({ actorId: id, reasons: problems, recovered: recovery.ok, recoveryProblems: recovery.problems ?? [], recoveryError: recovery.error ?? null });
      } finally { this._busy.delete(id); }
    }
    return { ok: failed.length === 0, migrated, skipped, failed };
  }

  /** Manual restoration preview (GM). */
  static previewRestore(actorId, options = {}) {
    if (!isGM()) return { status: 'REJECTED', reasons: ['GM_REQUIRED'] };
    const actor = fresh(actorId);
    if (!actor) return { status: 'REJECTED', reasons: ['ACTOR_NOT_FOUND'] };
    return { ...planManualRestore(actor, options), fingerprint: migrationFingerprint(actor) };
  }

  /**
   * Manual restoration (GM): requires gmConfirmed and the fingerprint of the preview; keeps post-migration gameplay
   * changes; records an audit entry; verifies the persisted result.
   */
  static async restore(actorId, { gmConfirmed = false, expectedFingerprint = null, shieldDecision } = {}) {
    if (!isGM()) return { ok: false, reasons: ['GM_REQUIRED'] };
    if (gmConfirmed !== true) return { ok: false, reasons: ['GM_CONFIRMATION_REQUIRED'] };
    if (this._busy.has(actorId)) return { ok: false, reasons: ['MIGRATION_ALREADY_RUNNING_FOR_ACTOR'] };
    this._busy.add(actorId);
    try {
      const actor = fresh(actorId);
      if (!actor) return { ok: false, reasons: ['ACTOR_NOT_FOUND'] };
      if (!expectedFingerprint || expectedFingerprint !== migrationFingerprint(actor)) return { ok: false, reasons: ['ACTOR_CHANGED_SINCE_PREVIEW'] };
      const plan = planManualRestore(actor, { shieldDecision });
      if (plan.status !== 'READY') return { ok: false, status: plan.status, reasons: plan.reasons };
      const audit = { version: ERRATA_MIGRATION_VERSION, errataId: plan.errataId, at: Date.now(), gmUserId: globalThis.game.user.id,
        gameplayChangesKept: plan.gameplayChanges, shields: plan.shields, shieldDecision: plan.shieldDecision };
      try {
        await this.#write(actor, { ...plan.update, 'flags.swse.errataMigrationRestorations': [...(actor.flags?.swse?.errataMigrationRestorations ?? []), audit] });
      } catch (err) { return { ok: false, reasons: ['RESTORE_WRITE_FAILED'], error: err?.message ?? String(err) }; }
      const { problems } = verifyManualRestoreState(fresh(actorId), plan, audit);
      return problems.length ? { ok: false, reasons: problems } : { ok: true, gameplayChangesKept: plan.gameplayChanges, shields: plan.shields };
    } finally { this._busy.delete(actorId); }
  }
}

/** GM dialog: preview, choose shield handling, authorize. */
export async function openVehicleErrataMigrationDialog() {
  const ui = globalThis.ui;
  const pv = VehicleErrataMigrationService.preview();
  if (!pv.ok) { ui.notifications.warn('Only a GM can run the vehicle errata migration.'); return null; }
  if (!pv.plans.length) { ui.notifications.info('No world vehicles are affected by the Starships of the Galaxy Errata 1.0 corrections.'); return null; }
  const ready = pv.plans.filter(p => p.status === 'READY');
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const rows = pv.plans.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(p.status)}</td><td>${esc(p.errataId ?? p.reasons.join(', '))}</td><td>${p.preview?.original?.shieldsValue !== undefined
    ? `SR ${esc(p.preview.original.shieldsValue)}/${esc(p.preview.original.shieldsMax)} &rarr; ${esc(p.preview.corrected.shieldsValue)}/${esc(p.preview.corrected.shieldsMax)}` : ''}</td>
    <td>${p.status === 'READY' ? `<label><input type="checkbox" name="select" value="${esc(p.actorId)}" checked> migrate</label>${p.preview.original.shieldsValue !== undefined
      ? ` <label><input type="checkbox" name="full" value="${esc(p.actorId)}"> ship is undamaged: set shields to the corrected maximum</label>` : ''}` : ''}</td></tr>`).join('');
  const unlinked = VehicleErrataMigrationService.scanUnlinkedTokens().tokens;
  const choice = await foundry.applications.api.DialogV2.prompt({
    window: { title: 'Vehicle Errata Migration (SotG Errata 1.0)' },
    content: `<p>Current shield values are preserved unless you confirm a ship is undamaged. A backup is stored on each Actor.</p><form><table>${rows}</table></form>`
      + (unlinked.length ? `<p>${unlinked.length} unlinked token(s) on scenes use an affected publication; they are not changed by this migration.</p>` : ''),
    ok: { label: `Migrate selected (${ready.length} ready)`, callback: (_ev, button) => {
      const f = new FormData(button.form);
      return { ids: f.getAll('select'), full: new Set(f.getAll('full')) };
    } },
    rejectClose: false
  });
  if (!choice) return null; // cancelled: nothing changes
  const options = Object.fromEntries(choice.ids.map(id => [id, choice.full.has(id) ? { shieldPolicy: 'initialize-full', gmConfirmedUndamaged: true } : { shieldPolicy: 'preserve' }]));
  const expectedFingerprints = Object.fromEntries(pv.plans.map(p => [p.actorId, p.fingerprint]));
  const r = await VehicleErrataMigrationService.apply({ actorIds: choice.ids, options, expectedFingerprints });
  ui.notifications[r.ok ? 'info' : 'warn'](`Errata migration: ${r.migrated.length} migrated, ${r.skipped.length} skipped, ${r.failed.length} failed${r.failed.length ? ' (see console for recovery status)' : ''}.`);
  if (r.failed.length || r.skipped.length) console.warn('[foundryvtt-swse] vehicle errata migration', { skipped: r.skipped, failed: r.failed });
  return r;
}

/** On ready: expose the GM entry point and tell GMs when affected Actors exist (no automatic changes). */
export function registerVehicleErrataMigration() {
  Hooks.once('ready', () => {
    game.swse = game.swse || {};
    game.swse.migrations = { ...(game.swse.migrations ?? {}), vehicleErrata: openVehicleErrataMigrationDialog, VehicleErrataMigrationService };
    if (!isGM()) return;
    const pv = VehicleErrataMigrationService.preview();
    if (pv.counts?.READY) ui.notifications.info(`${pv.counts.READY} vehicle(s) can be updated to the Starships of the Galaxy Errata 1.0 corrections. Run game.swse.migrations.vehicleErrata() to review.`);
  });
}
