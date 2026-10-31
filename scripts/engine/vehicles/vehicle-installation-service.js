/**
 * Phase 4E P2: Shipyard installation/uninstall for source-backed vehicles.
 *
 * Plans with the pure ledger module, then settles credits and the ledger write in ONE
 * TransactionEngine.executeAssetCustomizationTransaction (snapshot + rollback of both
 * actors). The published base flags are never written. Replaces the canonical path that
 * VehicleFactory blocks with VEHICLE_FACTORY_CANONICAL_MODIFICATION_REQUIRES_CERTIFIED_P2_PATH.
 */
import { classifyVehicleActorSource } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-runtime-contract.js";
import {
  DEFAULT_VEHICLE_INSTALLATION_RULES, VEHICLE_INSTALLATION_FLAG_PATH,
  planVehicleInstallation, planVehicleUninstall, authorizeLedgerWrite, authorizeFlagWrite, clearLedgerWrite
} from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-installation-ledger.js";
import {
  VEHICLE_INSTALLATION_JOBS_FLAG, VEHICLE_INSTALLATION_JOBS_FLAG_PATH,
  readJobs, planJobStart, planJobCheck, planJobRetry, planLogWorkDays, planGmCompleteJob, planGmInstantInstall
} from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-installation-jobs.js";
import { makeUnusedEmplacementResolver } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-modification-rules.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { TransactionEngine } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js";

const CATALOG_FILES = ['accessories', 'defense-systems', 'movement-systems', 'weapon-systems'];

export class VehicleInstallationService {
  static _catalog = null;
  /** Vehicles with an install/uninstall in flight (plan -> transaction), per client. */
  static _busy = new Set();
  static _rulesLoaded = false;
  /** Owner-ruling seam; replaced only by a documented project ruling. */
  static rules = DEFAULT_VEHICLE_INSTALLATION_RULES;

  /** Rules with the published unused-EP table (call after loadCatalog). */
  static async loadRules() {
    if (this._rulesLoaded) return this.rules;
    const res = await fetch('systems/foundryvtt-swse/data/canonical/vehicles/construction/unused-emplacement-points.json');
    if (!res.ok) throw new Error('VEHICLE_UNUSED_EP_TABLE_LOAD_FAILED');
    this.rules = { ...this.rules, resolveEpBudget: makeUnusedEmplacementResolver(await res.json()) };
    this._rulesLoaded = true;
    return this.rules;
  }

  static async loadCatalog() {
    if (this._catalog) return this._catalog;
    const lists = await Promise.all(CATALOG_FILES.map(async f => {
      const res = await fetch(`systems/foundryvtt-swse/data/vehicle-modifications/${f}.json`);
      if (!res.ok) throw new Error(`VEHICLE_MODIFICATION_CATALOG_LOAD_FAILED:${f}`);
      return res.json();
    }));
    // Certification is a separate, generated overlay (data/vehicle-modifications/certification.json):
    // a catalog row without an entry there has no certification.
    const certRes = await fetch('systems/foundryvtt-swse/data/vehicle-modifications/certification.json');
    if (!certRes.ok) throw new Error('VEHICLE_MODIFICATION_CERTIFICATION_LOAD_FAILED');
    const cert = (await certRes.json()).rows ?? {};
    this._catalog = new Map(lists.flat().map(e => [e.id, cert[e.id] ? { ...e, certification: cert[e.id] } : e]));
    return this._catalog;
  }

  static #source(vehicle) {
    const assessment = classifyVehicleActorSource(vehicle, undefined, { mode: 'runtime' });
    if (assessment.kind !== 'canonical') return { error: 'VEHICLE_NOT_SOURCE_BACKED:' + assessment.kind };
    const raw = vehicle.toObject();
    return { record: raw.flags.swse.universalVehicleSource.source, flags: raw.flags };
  }

  /** The wallet actor must be the vehicle's recorded owner (or the user a GM). */
  static #ownerAssociated(ownerActor, vehicle) {
    if (!ownerActor?.id) return false;
    if (globalThis.game?.user?.isGM === true) return true;
    const s = vehicle.system ?? {};
    return [s.ownedByActorId, s.storeAcquisition?.ownerActorId, s.assetOwnership?.primaryOwnerActorId,
      vehicle.flags?.['foundryvtt-swse']?.storeAcquisition?.ownerActorId]
      .some(id => id && id === ownerActor.id) ||
      (Array.isArray(s.assetOwnership?.ownerActorIds) && s.assetOwnership.ownerActorIds.includes(ownerActor.id));
  }

  static async #exclusive(vehicle, work) {
    const id = vehicle?.id;
    if (!id) return { success: false, reasons: ['VEHICLE_ID_MISSING'] };
    if (this._busy.has(id)) return { success: false, reasons: ['INSTALLATION_IN_PROGRESS'] };
    this._busy.add(id);
    try { return await work(); } finally { this._busy.delete(id); }
  }

  /**
   * Instant installation is NOT the default procedure. Retained for callers of the old name: it is the
   * explicit GM override (gmInstantInstall) and needs a GM and a recorded reason.
   * @deprecated use startJob (published procedure) or gmInstantInstall
   */
  static async install(args) { return this.gmInstantInstall(args); }

  static async uninstall(args) {
    return this.#exclusive(args?.vehicle, () => this.#uninstall(args));
  }

  static async #uninstall({ ownerActor, vehicle, installId }) {
    const src = this.#source(vehicle);
    if (src.error) return { success: false, reasons: [src.error] };
    if (!this.#ownerAssociated(ownerActor, vehicle)) return { success: false, reasons: ['OWNER_VEHICLE_NOT_ASSOCIATED'] };
    const plan = planVehicleUninstall({ record: src.record, flags: src.flags, installId, rules: this.rules });
    if (!plan.ok) return { success: false, reasons: plan.reasons };
    authorizeLedgerWrite(vehicle.id, plan.nextLedger);
    let tx;
    try { tx = await TransactionEngine.executeAssetCustomizationTransaction({
      actor: ownerActor, assetActor: vehicle, cost: 0, resaleCredit: plan.refund,
      assetMutationPlan: { set: { [VEHICLE_INSTALLATION_FLAG_PATH]: plan.nextLedger } },
      reason: `Remove ${plan.entry.name}`,
      audit: { kind: 'vehicle-uninstall', installId, refundPolicyDecided: plan.refundPolicyDecided }
    }); } finally { clearLedgerWrite(vehicle.id); }
    return tx.success ? { success: true, refundPolicyDecided: plan.refundPolicyDecided, transactionId: tx.transactionId }
      : { success: false, reasons: ['TRANSACTION_FAILED'], error: tx.error };
  }

  // ---------------------------------------------------------------------------------------------
  // Published installation procedure (Starships of the Galaxy pp. 38-40): the DEFAULT path.
  // Each attempt is charged when it begins; a failed Mechanics check is a game outcome, never a refund.
  // ---------------------------------------------------------------------------------------------

  static #isGM() { return globalThis.game?.user?.isGM === true; }

  /** One transaction: credits (if any) + the jobs store (+ ledger on completion). Rolls back only on a database failure. */
  static async #commit({ ownerActor, vehicle, cost = 0, nextJobs, nextLedger = null, reason, audit }) {
    const set = { [VEHICLE_INSTALLATION_JOBS_FLAG_PATH]: nextJobs };
    authorizeFlagWrite(vehicle.id, VEHICLE_INSTALLATION_JOBS_FLAG, nextJobs);
    if (nextLedger) { set[VEHICLE_INSTALLATION_FLAG_PATH] = nextLedger; authorizeLedgerWrite(vehicle.id, nextLedger); }
    let tx;
    try {
      tx = await TransactionEngine.executeAssetCustomizationTransaction({
        actor: ownerActor, assetActor: vehicle, cost, resaleCredit: 0, assetMutationPlan: { set }, reason, audit
      });
    } finally { clearLedgerWrite(vehicle.id); }
    return tx;
  }

  static async #prepare({ ownerActor, vehicle, catalog = null, needCatalog = false }) {
    const src = this.#source(vehicle);
    if (src.error) return { error: src.error };
    if (!this.#ownerAssociated(ownerActor, vehicle)) return { error: 'OWNER_VEHICLE_NOT_ASSOCIATED' };
    let entries = catalog;
    if (needCatalog && !entries) { entries = await this.loadCatalog(); await this.loadRules(); }
    return { src, entries };
  }

  static #result(tx, extra) {
    return tx.success ? { success: true, transactionId: tx.transactionId, ...extra } : { success: false, reasons: ['TRANSACTION_FAILED'], error: tx.error };
  }

  /** Begin an installation job: validates like an installation, reserves EP, charges the first attempt. */
  static async startJob(args) { return this.#exclusive(args?.vehicle, () => this.#startJob(args)); }
  static async #startJob({ ownerActor, vehicle, catalogId, mount = null, nonstandard, catalog = null }) {
    const p = await this.#prepare({ ownerActor, vehicle, catalog, needCatalog: true });
    if (p.error) return { success: false, reasons: [p.error] };
    const plan = planJobStart({
      record: p.src.record, flags: p.src.flags, catalogEntry: p.entries.get(catalogId), jobId: foundry.utils.randomID(), installId: foundry.utils.randomID(),
      ownerActorId: ownerActor.id, availableCredits: LedgerService.getCurrentCredits(ownerActor), createdAt: Date.now(), rules: this.rules, mount, nonstandard
    });
    if (!plan.ok) return { success: false, reasons: plan.reasons };
    const tx = await this.#commit({ ownerActor, vehicle, cost: plan.charge, nextJobs: plan.nextJobs, reason: `Begin installing ${plan.job.name}`,
      audit: { kind: 'vehicle-install-attempt', jobId: plan.job.jobId, attempt: 1, catalogId } });
    return this.#result(tx, { job: plan.job });
  }

  /** GM downtime adjudication: log work days on the current attempt. No credits move. */
  static async logWorkDays(args) { return this.#exclusive(args?.vehicle, () => this.#logWorkDays(args)); }
  static async #logWorkDays({ ownerActor, vehicle, jobId, days }) {
    if (!this.#isGM()) return { success: false, reasons: ['GM_REQUIRED'] };
    const p = await this.#prepare({ ownerActor, vehicle });
    if (p.error) return { success: false, reasons: [p.error] };
    const plan = planLogWorkDays({ record: p.src.record, flags: p.src.flags, jobId, days });
    if (!plan.ok) return { success: false, reasons: plan.reasons };
    const tx = await this.#commit({ ownerActor, vehicle, nextJobs: plan.nextJobs, reason: `Log ${days} day(s) of installation work`, audit: { kind: 'vehicle-install-time', jobId, days } });
    return this.#result(tx, { job: plan.job });
  }

  /**
   * Record the Mechanics check. A player's check is rolled here (1d20 + the installer's Mechanics total) so a
   * total is never self-reported; only a GM may enter a total directly (a roll made at the table).
   */
  static async recordCheck(args) { return this.#exclusive(args?.vehicle, () => this.#recordCheck(args)); }
  static async #recordCheck({ ownerActor, vehicle, jobId, total, installerActor = null, roller = null }) {
    const p = await this.#prepare({ ownerActor, vehicle });
    if (p.error) return { success: false, reasons: [p.error] };
    const gm = this.#isGM();
    let checkTotal = total, roll = null;
    if (!(gm && Number.isFinite(total))) {
      const bonus = installerActor?.system?.skills?.mechanics?.total;
      if (!Number.isFinite(bonus)) return { success: false, reasons: ['MECHANICS_BONUS_UNKNOWN'] };
      const { jobs } = readJobs(p.src.flags, p.src.record.identity.sourceEntryKey);
      const job = jobs.find(j => j.jobId === jobId);
      const retryBonus = job?.attempts?.at(-1)?.bonus ?? 0;
      roll = roller ? await roller() : (await new Roll('1d20').evaluate()).total;
      checkTotal = roll + bonus + retryBonus;
    }
    const plan = planJobCheck({ record: p.src.record, flags: p.src.flags, jobId, total: checkTotal, gm, installedAt: Date.now() });
    if (!plan.ok) return { success: false, reasons: plan.reasons };
    const tx = await this.#commit({ ownerActor, vehicle, nextJobs: plan.nextJobs, nextLedger: plan.nextLedger, reason: `Installation check: ${plan.outcome}`,
      audit: { kind: 'vehicle-install-check', jobId, outcome: plan.outcome, total: checkTotal } });
    return this.#result(tx, { outcome: plan.outcome, job: plan.job, entry: plan.entry, total: checkTotal, roll });
  }

  /** After a partial failure: pay for the retry (half the original time and money; +5 on its check). */
  static async retryJob(args) { return this.#exclusive(args?.vehicle, () => this.#retryJob(args)); }
  static async #retryJob({ ownerActor, vehicle, jobId }) {
    const p = await this.#prepare({ ownerActor, vehicle });
    if (p.error) return { success: false, reasons: [p.error] };
    const plan = planJobRetry({ record: p.src.record, flags: p.src.flags, jobId, availableCredits: LedgerService.getCurrentCredits(ownerActor) });
    if (!plan.ok) return { success: false, reasons: plan.reasons };
    const tx = await this.#commit({ ownerActor, vehicle, cost: plan.charge, nextJobs: plan.nextJobs, reason: `Retry installation (${plan.job.name})`,
      audit: { kind: 'vehicle-install-attempt', jobId, attempt: plan.job.attempts.length } });
    return this.#result(tx, { job: plan.job });
  }

  /** GM override: adjudicate an existing job as completed outside the automated workflow (recorded with a reason). */
  static async gmCompleteJob(args) { return this.#exclusive(args?.vehicle, () => this.#gmCompleteJob(args)); }
  static async #gmCompleteJob({ ownerActor, vehicle, jobId, reason }) {
    if (!this.#isGM()) return { success: false, reasons: ['GM_REQUIRED'] };
    const p = await this.#prepare({ ownerActor, vehicle });
    if (p.error) return { success: false, reasons: [p.error] };
    const plan = planGmCompleteJob({ record: p.src.record, flags: p.src.flags, jobId, userId: globalThis.game.user.id, reason, installedAt: Date.now() });
    if (!plan.ok) return { success: false, reasons: plan.reasons };
    const tx = await this.#commit({ ownerActor, vehicle, nextJobs: plan.nextJobs, nextLedger: plan.nextLedger, reason: `GM-adjudicated installation (${plan.job.name})`,
      audit: { kind: 'vehicle-install-gm-complete', jobId, reason } });
    return this.#result(tx, { job: plan.job, entry: plan.entry });
  }

  /** GM override: instant installation. Full cost, EP, ownership and certification rules still apply. */
  static async gmInstantInstall(args) { return this.#exclusive(args?.vehicle, () => this.#gmInstantInstall(args)); }
  static async #gmInstantInstall({ ownerActor, vehicle, catalogId, mount = null, nonstandard, reason, catalog = null }) {
    if (!this.#isGM()) return { success: false, reasons: ['GM_REQUIRED'] };
    const p = await this.#prepare({ ownerActor, vehicle, catalog, needCatalog: true });
    if (p.error) return { success: false, reasons: [p.error] };
    const plan = planGmInstantInstall({
      record: p.src.record, flags: p.src.flags, catalogEntry: p.entries.get(catalogId), jobId: foundry.utils.randomID(), installId: foundry.utils.randomID(),
      ownerActorId: ownerActor.id, availableCredits: LedgerService.getCurrentCredits(ownerActor), createdAt: Date.now(), rules: this.rules, mount, nonstandard,
      userId: globalThis.game.user.id, reason
    });
    if (!plan.ok) return { success: false, reasons: plan.reasons };
    const tx = await this.#commit({ ownerActor, vehicle, cost: plan.charge, nextJobs: plan.nextJobs, nextLedger: plan.nextLedger, reason: `GM instant installation: ${plan.entry.name}`,
      audit: { kind: 'vehicle-install-gm-instant', catalogId, reason } });
    return this.#result(tx, { job: plan.job, entry: plan.entry });
  }
}
