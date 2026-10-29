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
  planVehicleInstallation, planVehicleUninstall
} from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-installation-ledger.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { TransactionEngine } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js";

const CATALOG_FILES = ['accessories', 'defense-systems', 'movement-systems', 'weapon-systems'];

export class VehicleInstallationService {
  static _catalog = null;
  /** Owner-ruling seam; replaced only by a documented project ruling. */
  static rules = DEFAULT_VEHICLE_INSTALLATION_RULES;

  static async loadCatalog() {
    if (this._catalog) return this._catalog;
    const lists = await Promise.all(CATALOG_FILES.map(async f => {
      const res = await fetch(`systems/foundryvtt-swse/data/vehicle-modifications/${f}.json`);
      if (!res.ok) throw new Error(`VEHICLE_MODIFICATION_CATALOG_LOAD_FAILED:${f}`);
      return res.json();
    }));
    this._catalog = new Map(lists.flat().map(e => [e.id, e]));
    return this._catalog;
  }

  static #source(vehicle) {
    const assessment = classifyVehicleActorSource(vehicle);
    if (assessment.kind !== 'canonical') return { error: 'VEHICLE_NOT_SOURCE_BACKED:' + assessment.kind };
    const raw = vehicle.toObject();
    return { record: raw.flags.swse.universalVehicleSource.source, flags: raw.flags };
  }

  static async install({ ownerActor, vehicle, catalogId, mount = null, catalog = null }) {
    const src = this.#source(vehicle);
    if (src.error) return { success: false, reasons: [src.error] };
    const entries = catalog ?? await this.loadCatalog();
    const catalogEntry = entries.get(catalogId);
    const plan = planVehicleInstallation({
      record: src.record, flags: src.flags, catalogEntry, mount,
      installId: foundry.utils.randomID(), installedAt: Date.now(),
      availableCredits: LedgerService.getCurrentCredits(ownerActor), rules: this.rules
    });
    if (!plan.ok) return { success: false, reasons: plan.reasons };
    const tx = await TransactionEngine.executeAssetCustomizationTransaction({
      actor: ownerActor, assetActor: vehicle, cost: plan.cost, resaleCredit: 0,
      assetMutationPlan: { set: { [VEHICLE_INSTALLATION_FLAG_PATH]: plan.nextLedger } },
      reason: `Install ${plan.entry.name}`,
      audit: { kind: 'vehicle-install', installId: plan.entry.installId, catalogId, sourceEntryKey: plan.entry.sourceEntryKey }
    });
    return tx.success ? { success: true, entry: plan.entry, transactionId: tx.transactionId }
      : { success: false, reasons: ['TRANSACTION_FAILED'], error: tx.error };
  }

  static async uninstall({ ownerActor, vehicle, installId }) {
    const src = this.#source(vehicle);
    if (src.error) return { success: false, reasons: [src.error] };
    const plan = planVehicleUninstall({ record: src.record, flags: src.flags, installId, rules: this.rules });
    if (!plan.ok) return { success: false, reasons: plan.reasons };
    const tx = await TransactionEngine.executeAssetCustomizationTransaction({
      actor: ownerActor, assetActor: vehicle, cost: 0, resaleCredit: plan.refund,
      assetMutationPlan: { set: { [VEHICLE_INSTALLATION_FLAG_PATH]: plan.nextLedger } },
      reason: `Remove ${plan.entry.name}`,
      audit: { kind: 'vehicle-uninstall', installId, refundPolicyDecided: plan.refundPolicyDecided }
    });
    return tx.success ? { success: true, refundPolicyDecided: plan.refundPolicyDecided, transactionId: tx.transactionId }
      : { success: false, reasons: ['TRANSACTION_FAILED'], error: tx.error };
  }
}
