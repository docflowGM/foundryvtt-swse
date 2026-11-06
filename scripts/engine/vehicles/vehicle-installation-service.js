/**
 * Phase 4E P2: Shipyard installation/uninstall for source-backed vehicles.
 *
 * Plans with the pure ledger module, then settles credits and the ledger write in ONE
 * TransactionEngine.executeAssetCustomizationTransaction (snapshot + rollback of both
 * actors). The published base flags are never written. Replaces the canonical path that
 * VehicleFactory blocks with VEHICLE_FACTORY_CANONICAL_MODIFICATION_REQUIRES_CERTIFIED_P2_PATH.
 */
import { isRecordedOwnerId } from '/systems/foundryvtt-swse/scripts/domain/droids/droid-asset-owner.js';
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
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { readCertifiedInstallations } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-installation-ledger.js";
import { planInstalledWeaponItemSync } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-installed-weapon-items.js";
import { readStockBatteryConfigs } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-stock-battery-config.js";
import { readStockAmmoConfigs } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-stock-ammo-config.js";
import { planStockWeaponItemSync, INITIAL_AMMO_ISSUED_FLAG } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-stock-weapon-items.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { TransactionEngine } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js";
import { EFFECTS } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-modification-effects.js";
import { offerFor, stockUnitPrice } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-ammunition-shop.js";
import { VehicleAmmunitionService } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-ammunition-service.js";
import { LEDGER_FLAG, AFTERMARKET_AMMO_FLAG, aftermarketFamily, emptyAftermarketLedger, planPurchase, planStockPurchase } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-ammunition-ledger.js";

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
    // P6A overlay: PDF-reviewed rows (MECHANIC_SPECIFIED only where an effect is registered). certification.json wins.
    const p6aRes = await fetch('systems/foundryvtt-swse/data/vehicle-modifications/certification-p6a.json');
    const cert = { ...(p6aRes.ok ? (await p6aRes.json()).rows ?? {} : {}), ...((await certRes.json()).rows ?? {}) };
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
    return this.isRecordedOwner(ownerActor, vehicle);
  }
  /** Is this character RECORDED as an owner of the vehicle (no GM override)? */
  static isRecordedOwner(ownerActor, vehicle) {
    return isRecordedOwnerId(vehicle, ownerActor?.id);
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
    const weaponItems = await this.#afterLedgerChange(vehicle, tx);
    return this.#result(tx, { refundPolicyDecided: plan.refundPolicyDecided, weaponItems });
  }

  // ---------------------------------------------------------------------------------------------
  // Published installation procedure (Starships of the Galaxy pp. 38-40): the DEFAULT path.
  // Each attempt is charged when it begins; a failed Mechanics check is a game outcome, never a refund.
  // ---------------------------------------------------------------------------------------------

  static #isGM() { return globalThis.game?.user?.isGM === true; }

  /**
   * V-P2-04 trust boundary. Mount provenance is set HERE, never taken from the caller: printed "evidence" or a
   * certification supplied by a caller is refused (no published mount data exists for newly installed weapons).
   * A GM may certify the mount (recorded as GM-adjudicated with who, when and the stated reason); anyone else's mount
   * stays uncertified, which the planner refuses for weapons.
   */
  static normalizeMount(mount, { isGM = this.#isGM(), userId = globalThis.game?.user?.id ?? null, now = Date.now() } = {}) {
    if (!mount) return { mount: null };
    if (mount.evidence || mount.certification) return { error: 'MOUNT_PROVENANCE_SET_BY_SERVICE_ONLY' };
    const base = { mountKey: mount.mountKey, arc: mount.arc, operatorRole: mount.operatorRole };
    if (!isGM) return { mount: base };
    const reason = typeof mount.reason === 'string' ? mount.reason.trim() : '';
    if (!reason) return { error: 'MOUNT_CERTIFICATION_REASON_REQUIRED' };
    return { mount: { ...base, certification: { basis: 'GM_ADJUDICATED', gmUserId: userId, approvedAt: now, reason } } };
  }

  /**
   * Owned weapon Items follow their authorities: one Item per executable aftermarket installation (sealed ledger) and one
   * per executable published stock group (verified source record). Managed Items that are stale, duplicated or edited
   * are replaced; Items that are not managed are never touched. Idempotent; through ActorEngine; never charges anything.
   * After writing, the result is VERIFIED against the vehicle's Items: `synced` is true only when nothing more is needed.
   * `stock: false` limits the sync to aftermarket installations (used after ledger changes, so an install is never
   * entangled with arming factory weapons; stock arming happens at creation and in the explicit Resync).
   * @returns {{success:boolean, synced:boolean, created:number, deleted:number, reasons?:string[], error?:string}}
   */
  static async syncWeaponItems(vehicle, { stock = true } = {}) {
    const src = this.#source(vehicle);
    if (src.error) return { success: false, synced: false, created: 0, deleted: 0, reasons: [src.error] };
    const { entries } = readCertifiedInstallations(src.flags, src.record.identity.sourceEntryKey);
    // Owner house rule `initialVehicleAmmunitionIncluded` (world, default on): decides only what a NEW stock launcher Item is created with. A launcher that
    // was already issued its initial ammunition (the vehicle flag below) never receives it again, and an existing ledger is never touched.
    const included = HouseRuleService.getBoolean('initialVehicleAmmunitionIncluded', true) !== false;
    const issued = new Set(Object.keys(vehicle?.flags?.swse?.[INITIAL_AMMO_ISSUED_FLAG] ?? {}));
    const plan = () => {
      const items = Array.from(vehicle.items ?? []);
      const a = planInstalledWeaponItemSync({ items, entries }), b = stock ? planStockWeaponItemSync({ items, record: src.record, gmAmmo: readStockAmmoConfigs(vehicle), gmBattery: readStockBatteryConfigs(vehicle), included, issued }) : { create: [], deleteIds: [], issueKeys: [] };
      return { create: [...a.create, ...b.create], deleteIds: [...a.deleteIds, ...b.deleteIds], issueKeys: b.issueKeys ?? [] };
    };
    const first = plan();
    let deleted = 0, created = 0;
    try {
      if (first.deleteIds.length) { await ActorEngine.deleteEmbeddedDocuments(vehicle, 'Item', first.deleteIds); deleted = first.deleteIds.length; }
      if (first.create.length) { await ActorEngine.createEmbeddedDocuments(vehicle, 'Item', first.create); created = first.create.length; }
      // remember (once) which launchers have now been issued their initial ammunition, so a deleted Item is never a refill
      const fresh = first.issueKeys.filter(k => !issued.has(k));
      if (fresh.length) await ActorEngine.updateActor(vehicle, { [`flags.swse.${INITIAL_AMMO_ISSUED_FLAG}`]: { ...(vehicle?.flags?.swse?.[INITIAL_AMMO_ISSUED_FLAG] ?? {}), ...Object.fromEntries(fresh.map(k => [k, { policy: included ? 'included' : 'purchased', at: Date.now() }])) } });
    } catch (err) {
      return { success: false, synced: false, created, deleted, reasons: ['WEAPON_ITEM_SYNC_FAILED'], error: err?.message ?? String(err) };
    }
    const after = plan();
    const synced = after.create.length === 0 && after.deleteIds.length === 0;
    return synced ? { success: true, synced: true, created, deleted }
      : { success: false, synced: false, created, deleted, reasons: ['WEAPON_ITEM_SYNC_UNVERIFIED'] };
  }

  /**
   * Repair the owned weapon Items from the sealed ledger. Safe to repeat: no credits move, no ledger write, only
   * Shipyard-managed Items are touched. Allowed for a GM or the vehicle's owner.
   */
  static async reconcileWeaponItems(args) { return this.#exclusive(args?.vehicle, () => this.#reconcile(args)); }
  static async #reconcile({ vehicle }) {
    if (!(this.#isGM() || vehicle?.isOwner === true)) return { success: false, reasons: ['NOT_AUTHORIZED'] };
    const w = await this.syncWeaponItems(vehicle);
    return { success: w.success, operational: w.synced, weaponItems: w, reasons: w.success ? [] : w.reasons };
  }

  /** Items are synchronized after any ledger change; a failure never undoes the committed installation. */
  static async #afterLedgerChange(vehicle, tx) {
    if (!tx?.success) return null;
    try { return await this.syncWeaponItems(vehicle, { stock: false }); }
    catch (err) { return { success: false, synced: false, created: 0, deleted: 0, reasons: ['WEAPON_ITEM_SYNC_FAILED'], error: err?.message ?? String(err) }; }
  }

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

  /**
   * Three distinct outcomes (never conflated):
   *   success / installationCompleted : the transaction committed (credits, ledger, jobs) - it is NOT rolled back later;
   *   weaponItemsSynced               : the owned weapon Items match the ledger (true when no Item work was needed);
   *   operational                     : both - a weapon is usable only then.
   * When the transaction committed but the Items are not synchronized the result is `partial` and names the repair.
   */
  static #result(tx, extra) {
    if (!tx.success) return { success: false, installationCompleted: false, operational: false, reasons: ['TRANSACTION_FAILED'], error: tx.error };
    const { weaponItems, ...rest } = extra ?? {};
    const itemsOk = weaponItems == null || weaponItems.synced === true;
    return { success: true, installationCompleted: true, weaponItemsSynced: itemsOk, operational: itemsOk, transactionId: tx.transactionId, ...rest,
      ...(weaponItems ? { weaponItems } : {}),
      ...(itemsOk ? {} : { partial: true, reasons: ['WEAPON_ITEMS_NOT_SYNCHRONIZED'], repair: 'reconcileWeaponItems' }) };
  }


  /**
   * Buy ammunition for an installed, certified launcher (WE-L1). The credits and the ammunition ledger change in ONE
   * TransactionEngine transaction (snapshot + rollback of both actors): if any part fails the whole purchase fails. The
   * ammunition is a consumable (V-P6A-06) sold per unit at its certified price; it arrives in the launcher's RESERVE and is
   * loaded by the GM reload operation. Allowed for the vehicle's owner association or a GM, like every other Shipyard charge.
   */
  static async purchaseAmmunition(args) { return this.#exclusive(args?.vehicle, () => this.#purchaseAmmunition(args)); }
  static async #purchaseAmmunition({ ownerActor, vehicle, installId, units }) {
    const p = await this.#prepare({ ownerActor, vehicle });
    if (p.error) return { success: false, reasons: [p.error] };
    const { entries } = readCertifiedInstallations(p.src.flags, p.src.record.identity.sourceEntryKey);
    const entry = entries.find(e => e.installId === installId);
    if (!entry) return { success: false, reasons: ['INSTALL_NOT_FOUND'] };
    const family = entry.executable === true ? aftermarketFamily(EFFECTS[entry.catalogId], entry) : null;
    if (!family) return { success: false, reasons: ['INSTALLATION_IS_NOT_AN_AMMUNITION_LAUNCHER'] };
    const map = p.src.flags?.swse?.[AFTERMARKET_AMMO_FLAG] ?? {};
    const plan = planPurchase(map[installId] ?? emptyAftermarketLedger(family), family, { units, by: globalThis.game?.user?.id ?? null });
    if (!plan.ok) return { success: false, reasons: [plan.reason] };
    const next = { ...map, [installId]: plan.ledger };
    authorizeFlagWrite(vehicle.id, AFTERMARKET_AMMO_FLAG, next);
    let tx;
    try {
      tx = await TransactionEngine.executeAssetCustomizationTransaction({
        actor: ownerActor, assetActor: vehicle, cost: plan.cost, resaleCredit: 0,
        assetMutationPlan: { set: { [`flags.swse.${AFTERMARKET_AMMO_FLAG}`]: next } },
        reason: `Buy ${plan.units} x ${family.ammunition} for ${entry.name}`,
        audit: { kind: 'vehicle-ammunition-purchase', installId, catalogId: entry.catalogId, ammunition: family.ammunition, units: plan.units, unitPrice: family.unitPrice }
      });
    } finally { clearLedgerWrite(vehicle.id); }
    if (!tx.success) return { success: false, reasons: [/insufficient credits/i.test(tx.error ?? '') ? 'INSUFFICIENT_CREDITS' : 'TRANSACTION_FAILED'], error: tx.error };
    return { success: true, transactionId: tx.transactionId, units: plan.units, cost: plan.cost, ledger: plan.ledger };
  }

  /** May this character buy for this vehicle (a GM, or a character recorded as one of its owners)? Used by every ammunition payment path. */
  static authorizePurchaser({ ownerActor, vehicle }) {
    return this.#ownerAssociated(ownerActor, vehicle) ? { ok: true } : { ok: false, reason: 'OWNER_VEHICLE_NOT_ASSOCIATED' };
  }

  /**
   * THE ammunition purchase: both vehicle-sheet shortcuts and the store's vehicle-ammunition context call this one method with a launcher's stable key
   * (`installed:<installId>` for an aftermarket installation, `stock:<itemId>` for a stock launcher). It buys SUBSEQUENT ammunition only: it never
   * creates, resets or tops up a ledger, so repeated calls cannot produce free supplies. Credits and the ledger change in ONE TransactionEngine
   * transaction (rolled back together); the ammunition arrives in the launcher's RESERVE and is never loaded here (the existing GM reload does that).
   */
  static async purchaseLauncherAmmunition({ ownerActor, vehicle, launcherKey, units }) {
    const offer = offerFor(vehicle, launcherKey);
    if (!offer) return { success: false, reasons: ['LAUNCHER_NOT_A_FINITE_AMMUNITION_WEAPON'] };
    if (!offer.canBuy) return { success: false, reasons: [offer.disabledReason] };
    if (offer.origin === 'aftermarket') return this.purchaseAmmunition({ ownerActor, vehicle, installId: offer.installId, units });
    return this.#exclusive(vehicle, () => this.#purchaseStockAmmunition({ ownerActor, vehicle, itemId: offer.itemId, units }));
  }
  static async #purchaseStockAmmunition({ ownerActor, vehicle, itemId, units }) {
    // (the weapon authority below has already verified the stock Item against its published record; only the payer needs checking here)
    if (!this.#ownerAssociated(ownerActor, vehicle)) return { success: false, reasons: ['OWNER_VEHICLE_NOT_ASSOCIATED'] };
    const item = Array.from(vehicle.items ?? []).find(i => i?.id === itemId);
    const family = item ? VehicleAmmunitionService.familyOf(item) : null;
    const price = family ? stockUnitPrice(family) : null;
    if (!item || !family || family.origin === 'aftermarket') return { success: false, reasons: ['LAUNCHER_NOT_A_FINITE_AMMUNITION_WEAPON'] };
    // read the ledger as it IS: a missing ledger is never initialized (and so never filled) by a purchase
    const ledger = item.flags?.swse?.[LEDGER_FLAG] ?? item.getFlag?.('swse', LEDGER_FLAG) ?? null;
    if (!ledger) return { success: false, reasons: ['AMMO_LEDGER_MISSING_OR_ALLOCATION_REQUIRED'] };
    const plan = planStockPurchase(ledger, family, { units, unitPrice: price, by: globalThis.game?.user?.id ?? null });
    if (!plan.ok) return { success: false, reasons: [plan.reason] };
    let tx;
    tx = await TransactionEngine.executeAssetCustomizationTransaction({
      actor: ownerActor, assetActor: vehicle, cost: plan.cost, resaleCredit: 0,
      assetMutationPlan: { update: { items: [{ _id: item.id, [`flags.swse.==${LEDGER_FLAG}`]: plan.ledger }] } },
      reason: `Buy ${plan.units} x ${family.ammunition} for ${item.name}`,
      audit: { kind: 'vehicle-ammunition-purchase', origin: 'stock', itemId: item.id, launcherId: family.launcherId, ammunition: family.ammunition, units: plan.units, unitPrice: price }
    });
    if (!tx.success) return { success: false, reasons: [/insufficient credits/i.test(tx.error ?? '') ? 'INSUFFICIENT_CREDITS' : 'TRANSACTION_FAILED'], error: tx.error };
    return { success: true, transactionId: tx.transactionId, units: plan.units, cost: plan.cost, ledger: plan.ledger };
  }

  /**
   * GM operation: load a launcher from its reserve (V-P6C-06: moves reserve to loaded, creates nothing, invents no action cost).
   * The launcher is found by installation id, so the caller never names an Item.
   */
  static async reloadLauncher({ vehicle, installId, amount = Infinity }) {
    if (!this.#isGM()) return { success: false, reasons: ['GM_REQUIRED'] };
    const item = Array.from(vehicle?.items ?? []).find(i => i?.flags?.swse?.vehicleInstalledWeapon?.installId === installId);
    if (!item) return { success: false, reasons: ['WEAPON_ITEM_MISSING'] };
    const r = await VehicleAmmunitionService.gmReload(vehicle, item, { amount });
    return r.ok ? { success: true, moved: r.moved, ledger: r.ledger } : { success: false, reasons: [r.reason] };
  }

  /** Begin an installation job: validates like an installation, reserves EP, charges the first attempt. */
  static async startJob(args) { return this.#exclusive(args?.vehicle, () => this.#startJob(args)); }
  static async #startJob({ ownerActor, vehicle, catalogId, optionId = null, mount: requestedMount = null, nonstandard, catalog = null }) {
    const p = await this.#prepare({ ownerActor, vehicle, catalog, needCatalog: true });
    if (p.error) return { success: false, reasons: [p.error] };
    const nm = this.normalizeMount(requestedMount);
    if (nm.error) return { success: false, reasons: [nm.error] };
    const mount = nm.mount;
    const option = optionId ? p.entries.get(optionId) ?? null : null;
    if (optionId && !option) return { success: false, reasons: ['OPTION_NOT_IN_CATALOG'] };
    const plan = planJobStart({
      record: p.src.record, flags: p.src.flags, catalogEntry: p.entries.get(catalogId), jobId: foundry.utils.randomID(), installId: foundry.utils.randomID(),
      ownerActorId: ownerActor.id, availableCredits: LedgerService.getCurrentCredits(ownerActor), createdAt: Date.now(), rules: this.rules, mount, nonstandard, option
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
    const plan = planJobCheck({ record: p.src.record, flags: p.src.flags, jobId, total: checkTotal, installedAt: Date.now() });
    if (!plan.ok) return { success: false, reasons: plan.reasons };
    const tx = await this.#commit({ ownerActor, vehicle, nextJobs: plan.nextJobs, nextLedger: plan.nextLedger, reason: `Installation check: ${plan.outcome}`,
      audit: { kind: 'vehicle-install-check', jobId, outcome: plan.outcome, total: checkTotal } });
    const weaponItems = plan.nextLedger ? await this.#afterLedgerChange(vehicle, tx) : null;
    return this.#result(tx, { outcome: plan.outcome, job: plan.job, entry: plan.entry, total: checkTotal, roll, weaponItems });
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
    const weaponItems = await this.#afterLedgerChange(vehicle, tx);
    return this.#result(tx, { job: plan.job, entry: plan.entry, weaponItems });
  }

  /** GM override: instant installation. Full cost, EP, ownership and certification rules still apply. */
  static async gmInstantInstall(args) { return this.#exclusive(args?.vehicle, () => this.#gmInstantInstall(args)); }
  static async #gmInstantInstall({ ownerActor, vehicle, catalogId, optionId = null, mount: requestedMount = null, nonstandard, reason, catalog = null }) {
    if (!this.#isGM()) return { success: false, reasons: ['GM_REQUIRED'] };
    const p = await this.#prepare({ ownerActor, vehicle, catalog, needCatalog: true });
    if (p.error) return { success: false, reasons: [p.error] };
    const nm = this.normalizeMount(requestedMount);
    if (nm.error) return { success: false, reasons: [nm.error] };
    const mount = nm.mount;
    const option = optionId ? p.entries.get(optionId) ?? null : null;
    if (optionId && !option) return { success: false, reasons: ['OPTION_NOT_IN_CATALOG'] };
    const plan = planGmInstantInstall({
      record: p.src.record, flags: p.src.flags, catalogEntry: p.entries.get(catalogId), jobId: foundry.utils.randomID(), installId: foundry.utils.randomID(),
      ownerActorId: ownerActor.id, availableCredits: LedgerService.getCurrentCredits(ownerActor), createdAt: Date.now(), rules: this.rules, mount, nonstandard, option,
      userId: globalThis.game.user.id, reason
    });
    if (!plan.ok) return { success: false, reasons: plan.reasons };
    const tx = await this.#commit({ ownerActor, vehicle, cost: plan.charge, nextJobs: plan.nextJobs, nextLedger: plan.nextLedger, reason: `GM instant installation: ${plan.entry.name}`,
      audit: { kind: 'vehicle-install-gm-instant', catalogId, reason } });
    const weaponItems = await this.#afterLedgerChange(vehicle, tx);
    return this.#result(tx, { job: plan.job, entry: plan.entry, weaponItems });
  }
}
