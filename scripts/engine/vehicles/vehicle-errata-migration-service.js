/**
 * GM-controlled, versioned migration of existing world vehicle Actors to the P6A published-errata corrections
 * (Starships of the Galaxy Errata 1.0). Never runs on its own: a GM previews, chooses per-Actor shield handling,
 * and authorizes. Each migrated Actor gets a recoverable backup and a migration record; failures are restored from
 * the backup and reported. Idempotent (already-migrated Actors are skipped).
 *
 * Entry points: VehicleErrataMigrationService.preview(), .apply({ actorIds, options }), .restore(actorId),
 * and openVehicleErrataMigrationDialog() (exposed as game.swse.migrations.vehicleErrata).
 */
import { ERRATA_MIGRATION_VERSION, planErrataMigration } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-errata-migration.js";
import { authorizeProvenanceMigration, clearProvenanceMigration } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-source-identity.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

const isGM = () => globalThis.game?.user?.isGM === true;
const vehicles = () => Array.from(globalThis.game?.actors?.contents ?? globalThis.game?.actors ?? []).filter(a => a?.type === 'vehicle');

export class VehicleErrataMigrationService {
  /** Plans for every world vehicle that the errata affects (READY / ALREADY_MIGRATED / REJECTED). */
  static preview(options = {}) {
    if (!isGM()) return { ok: false, reasons: ['GM_REQUIRED'], plans: [] };
    const plans = vehicles().map(a => planErrataMigration(a, options[a.id] ?? {})).filter(p => p.status !== 'NOT_AFFECTED');
    const counts = plans.reduce((m, p) => ((m[p.status] = (m[p.status] ?? 0) + 1), m), {});
    return { ok: true, version: ERRATA_MIGRATION_VERSION, counts, plans };
  }

  static async #write(actor, update) {
    authorizeProvenanceMigration(actor.id, update);
    try { await ActorEngine.updateActor(actor, update, { source: 'vehicle-errata-migration' }); }
    finally { clearProvenanceMigration(actor.id); }
  }

  /**
   * Apply to the GM-selected Actors. options[actorId] = { shieldPolicy: 'preserve'|'initialize-full', gmConfirmedUndamaged }.
   * @returns {{ok:boolean, migrated:string[], skipped:object[], failed:object[]}}
   */
  static async apply({ actorIds = [], options = {} } = {}) {
    if (!isGM()) return { ok: false, reasons: ['GM_REQUIRED'], migrated: [], skipped: [], failed: [] };
    const game = globalThis.game, migrated = [], skipped = [], failed = [];
    for (const id of actorIds) {
      const actor = game.actors.get(id);
      if (!actor) { failed.push({ actorId: id, reasons: ['ACTOR_NOT_FOUND'] }); continue; }
      const plan = planErrataMigration(actor, options[id] ?? {});
      if (plan.status !== 'READY') { skipped.push({ actorId: id, status: plan.status, reasons: plan.reasons }); continue; }
      const record = { version: ERRATA_MIGRATION_VERSION, errataId: plan.errataId, shieldPolicy: plan.shieldPolicy,
        original: plan.preview.original, corrected: plan.preview.corrected, at: Date.now(), gmUserId: game.user.id, gmUserName: game.user.name };
      try {
        // 1. recoverable backup (unprotected flag) before anything protected changes
        await ActorEngine.updateActor(actor, { [`flags.swse.errataMigrationBackups.${ERRATA_MIGRATION_VERSION}`]: plan.backup }, { source: 'vehicle-errata-migration-backup' });
        // 2. the migration itself, through the one-shot provenance authorization
        await this.#write(actor, { ...plan.update, 'flags.swse.errataMigrations': [...(actor.flags?.swse?.errataMigrations ?? []), record] });
        migrated.push(id);
      } catch (err) {
        const restored = await this.restore(id).catch(e => ({ ok: false, error: e?.message }));
        failed.push({ actorId: id, reasons: ['UPDATE_FAILED'], error: err?.message ?? String(err), restored: restored?.ok === true });
      }
    }
    return { ok: failed.length === 0, migrated, skipped, failed };
  }

  /** Recovery: write the backup back (GM only). Safe to call when nothing was migrated. */
  static async restore(actorId) {
    if (!isGM()) return { ok: false, reasons: ['GM_REQUIRED'] };
    const actor = globalThis.game.actors.get(actorId);
    const backup = actor?.flags?.swse?.errataMigrationBackups?.[ERRATA_MIGRATION_VERSION];
    if (!actor || !backup) return { ok: false, reasons: ['NO_BACKUP'] };
    const update = { 'flags.swse.universalVehicleSource': backup.universalVehicleSource };
    if (backup.shieldRating !== null) update['system.shieldRating'] = backup.shieldRating;
    if (backup.shields) update['system.shields'] = backup.shields;
    if (backup.sourceAttackGroups) update['system.sourceAttackGroups'] = backup.sourceAttackGroups;
    update['flags.swse.errataMigrations'] = (actor.flags?.swse?.errataMigrations ?? []).filter(m => m.version !== ERRATA_MIGRATION_VERSION);
    await this.#write(actor, update);
    return { ok: true };
  }
}

/** GM dialog: preview, choose shield handling, authorize. */
export async function openVehicleErrataMigrationDialog() {
  const ui = globalThis.ui;
  const pv = VehicleErrataMigrationService.preview();
  if (!pv.ok) { ui.notifications.warn('Only a GM can run the vehicle errata migration.'); return null; }
  const ready = pv.plans.filter(p => p.status === 'READY');
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const rows = pv.plans.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(p.status)}</td><td>${esc(p.errataId ?? p.reasons.join(', '))}</td><td>${p.preview?.original?.shieldsValue !== undefined
    ? `SR ${esc(p.preview.original.shieldsValue)}/${esc(p.preview.original.shieldsMax)} &rarr; ${esc(p.preview.corrected.shieldsValue)}/${esc(p.preview.corrected.shieldsMax)}` : ''}</td>
    <td>${p.status === 'READY' ? `<label><input type="checkbox" name="select" value="${esc(p.actorId)}" checked> migrate</label>${p.preview.original.shieldsValue !== undefined
      ? ` <label><input type="checkbox" name="full" value="${esc(p.actorId)}"> ship is undamaged: set shields to the corrected maximum</label>` : ''}` : ''}</td></tr>`).join('');
  if (!pv.plans.length) { ui.notifications.info('No world vehicles are affected by the Starships of the Galaxy Errata 1.0 corrections.'); return null; }
  const choice = await foundry.applications.api.DialogV2.prompt({
    window: { title: 'Vehicle Errata Migration (SotG Errata 1.0)' },
    content: `<p>Current shield values are preserved unless you confirm a ship is undamaged. A backup is stored on each Actor.</p><form><table>${rows}</table></form>`,
    ok: { label: `Migrate selected (${ready.length} ready)`, callback: (_ev, button) => {
      const f = new FormData(button.form);
      return { ids: f.getAll('select'), full: new Set(f.getAll('full')) };
    } },
    rejectClose: false
  });
  if (!choice) return null;
  const options = Object.fromEntries(choice.ids.map(id => [id, choice.full.has(id) ? { shieldPolicy: 'initialize-full', gmConfirmedUndamaged: true } : { shieldPolicy: 'preserve' }]));
  const r = await VehicleErrataMigrationService.apply({ actorIds: choice.ids, options });
  ui.notifications[r.ok ? 'info' : 'warn'](`Errata migration: ${r.migrated.length} migrated, ${r.skipped.length} skipped, ${r.failed.length} failed${r.failed.length ? ' (restored from backup where possible; see console)' : ''}.`);
  if (r.failed.length) console.error('[foundryvtt-swse] vehicle errata migration failures', r.failed);
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
