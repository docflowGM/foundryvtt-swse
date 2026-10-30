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
  planVehicleInstallation, planVehicleUninstall, authorizeLedgerWrite, clearLedgerWrite
} from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-installation-ledger.js";
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

  static async install(args) {
    return this.#exclusive(args?.vehicle, () => this.#install(args));
  }

  static async uninstall(args) {
    return this.#exclusive(args?.vehicle, () => this.#uninstall(args));
  }

  static async #install({ ownerActor, vehicle, catalogId, mount = null, catalog = null }) {
    const src = this.#source(vehicle);
    if (src.error) return { success: false, reasons: [src.error] };
    if (!this.#ownerAssociated(ownerActor, vehicle)) return { success: false, reasons: ['OWNER_VEHICLE_NOT_ASSOCIATED'] };
    const entries = catalog ?? await this.loadCatalog();
    if (!catalog) await this.loadRules();
    const catalogEntry = entries.get(catalogId);
    const plan = planVehicleInstallation({
      record: src.record, flags: src.flags, catalogEntry, mount,
      installId: foundry.utils.randomID(), installedAt: Date.now(),
      availableCredits: LedgerService.getCurrentCredits(ownerActor), rules: this.rules
    });
    if (!plan.ok) return { success: false, reasons: plan.reasons };
    authorizeLedgerWrite(vehicle.id, plan.nextLedger);
    let tx;
    try { tx = await TransactionEngine.executeAssetCustomizationTransaction({
      actor: ownerActor, assetActor: vehicle, cost: plan.cost, resaleCredit: 0,
      assetMutationPlan: { set: { [VEHICLE_INSTALLATION_FLAG_PATH]: plan.nextLedger } },
      reason: `Install ${plan.entry.name}`,
      audit: { kind: 'vehicle-install', installId: plan.entry.installId, catalogId, sourceEntryKey: plan.entry.sourceEntryKey }
    }); } finally { clearLedgerWrite(vehicle.id); }
    return tx.success ? { success: true, entry: plan.entry, transactionId: tx.transactionId }
      : { success: false, reasons: ['TRANSACTION_FAILED'], error: tx.error };
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
}
