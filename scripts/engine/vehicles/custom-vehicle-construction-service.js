/**
 * Custom starship construction workflow (Starships of the Galaxy pp. 52-53 stock frames; Starship Designer).
 *
 *   submitDesign          designer (or a GM for homebrew)  -> PENDING_APPROVAL project on the designer; nothing charged
 *   approveDesign         GM -> rebuilds/validates from inputs with system-verified authority; ONE transaction charges
 *                         the total; the project is UNDERWAY (funded) - NO vehicle exists yet
 *   logDesignDays         GM downtime adjudication of the published design time
 *   recordDesignCheck     the design Mechanics check after the design time; success delivers the vehicle Actor
 *   gmCompleteConstruction GM, with a recorded reason: completes now (waives time, a failed check, or homebrew)
 *   rejectDesign          GM, pending projects only
 *
 * Charging at approval is the project owner's direction (2026-10-31). The book gives no consequence for a failed
 * design check (V-P6-06) and no build time beyond the design time; neither is invented here.
 * Projects are sealed and write-guarded (VEHICLE_DESIGN_PROJECTS_FLAG). The delivered Actor makes no publication
 * claim and starts with no Items or weapons.
 */
import {
  DEFAULT_CONSTRUCTION_RULES, buildConstructionRecord, buildCustomVehicleActorData, validateDesign, verifyConstructionAuthority
} from "/systems/foundryvtt-swse/scripts/domain/vehicles/custom-vehicle-construction.js";
import {
  PROJECT_STATUS, readProjects, makePendingProject, fundProject, logProjectDays, recordProjectCheck, gmCompleteProject, describeProject
} from "/systems/foundryvtt-swse/scripts/domain/vehicles/custom-vehicle-construction-project.js";
import { VEHICLE_DESIGN_PROJECTS_FLAG, authorizeFlagWrite, clearLedgerWrite } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-installation-ledger.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { TransactionEngine } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js";
import { StoreAcquisitionService } from "/systems/foundryvtt-swse/scripts/engine/store/acquisition-service.js";
import { VehicleInstallationService } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-installation-service.js";

export const DESIGN_PROPOSALS_FLAG_PATH = `flags.swse.${VEHICLE_DESIGN_PROJECTS_FLAG}`;
export { PROJECT_STATUS, describeProject };

const hasFeat = actor => Array.from(actor?.items ?? []).some(i => i?.type === 'feat' && /^starship designer$/i.test(String(i.name ?? '').trim()));
const isGM = () => globalThis.game?.user?.isGM === true;

export class CustomVehicleConstructionService {
  static _frames = null;
  static _busy = new Set();
  /** Owner-ruling seam (design-time rounding etc.). */
  static rules = DEFAULT_CONSTRUCTION_RULES;

  static async loadFrames() {
    if (this._frames) return this._frames;
    const res = await fetch('systems/foundryvtt-swse/data/canonical/vehicles/construction/stock-frames.json');
    if (!res.ok) throw new Error('VEHICLE_STOCK_FRAMES_LOAD_FAILED');
    this._frames = (await res.json()).frames;
    return this._frames;
  }

  static #raw(actor) {
    const raw = actor?.flags?.swse?.[VEHICLE_DESIGN_PROJECTS_FLAG] ?? actor?.getFlag?.('swse', VEHICLE_DESIGN_PROJECTS_FLAG);
    return Array.isArray(raw) ? raw : [];
  }
  /** Verified projects only (tampered ones are ignored and block new writes). */
  static projectsOf(actor) { return readProjects(this.#raw(actor)).projects; }
  static proposalsOf(actor) { return this.projectsOf(actor); }
  static describe(project) { return describeProject(project); }

  static async #exclusive(actor, work) {
    if (!actor?.id) return { success: false, reasons: ['DESIGNER_ACTOR_REQUIRED'] };
    if (this._busy.has(actor.id)) return { success: false, reasons: ['CONSTRUCTION_ACTION_IN_PROGRESS'] };
    this._busy.add(actor.id);
    try { return await work(); } finally { this._busy.delete(actor.id); }
  }

  /** One transaction: optional charge + the guarded projects write (+ optional delivered Actor). */
  static async #commit({ designerActor, next, cost = 0, create = null, audit }) {
    authorizeFlagWrite(designerActor.id, VEHICLE_DESIGN_PROJECTS_FLAG, next);
    try {
      return await TransactionEngine.executeMutationTransaction({
        actor: designerActor, cost, transactionContext: 'store-purchase',
        mutationPlan: { set: { [DESIGN_PROPOSALS_FLAG_PATH]: next }, ...(create ? { create: { actors: [create] } } : {}) }, audit
      });
    } finally { clearLedgerWrite(designerActor.id); }
  }

  static #find(designerActor, designId) {
    const { projects, rejected, raw } = readProjects(this.#raw(designerActor));
    if (rejected) return { error: 'PROJECT_STORE_CONTAINS_UNVERIFIED_ENTRIES' };
    const project = projects.find(p => p.designId === designId);
    return project ? { project, raw } : { error: 'DESIGN_NOT_FOUND' };
  }
  static #replace(raw, project) { return raw.map(p => (p.designId === project.designId ? project : p)); }

  /** Rebuild and validate a design from its INPUTS only. */
  static async #evaluate({ project, designerActor, authority, catalog, frames, availableCredits }) {
    const frame = frames.find(f => f.id === project.frameId) ?? null;
    const systems = project.systems.map(s => ({ catalogEntry: catalog.get(s.catalogId), installId: s.installId, mount: s.mount ?? null, nonstandard: s.nonstandard }));
    const claims = project.authorshipKind === 'gm-homebrew'
      ? { kind: 'gm-homebrew', gmUserId: authority ? globalThis.game.user.id : project.submittedBy }
      : { kind: 'rules-legal', designerActorId: designerActor.id, starshipDesigner: hasFeat(designerActor),
        shipyardAidApprovedBy: authority ? globalThis.game.user.id : 'PENDING_GM_APPROVAL' };
    const validation = validateDesign({
      designId: project.designId, name: project.name, frame, systems, authorship: claims, crewQuality: project.crewQuality,
      availableCredits: availableCredits ?? LedgerService.getCurrentCredits(designerActor), rules: this.rules, authority
    });
    return { frame, claims, validation };
  }

  static async #load() {
    const [frames, catalog] = [await this.loadFrames(), await VehicleInstallationService.loadCatalog()];
    await VehicleInstallationService.loadRules();
    return { frames, catalog };
  }

  /** Preview a design without storing anything (UI live preview). */
  static async preview({ designerActor, name = 'Preview', frameId, crewQuality = null, systemIds = [], authorshipKind = 'rules-legal' }) {
    const { frames, catalog } = await this.#load();
    const project = { designId: 'preview', name, frameId, crewQuality, authorshipKind, submittedBy: globalThis.game?.user?.id,
      systems: systemIds.map((catalogId, i) => ({ catalogId, installId: `preview-${i}` })) };
    return (await this.#evaluate({ project, designerActor, authority: null, catalog, frames })).validation;
  }

  static async submitDesign(args) { return this.#exclusive(args?.designerActor, () => this.#submit(args)); }
  static async #submit({ designerActor, name, frameId, crewQuality, systemIds = [], authorshipKind = 'rules-legal' }) {
    const game = globalThis.game;
    if (authorshipKind === 'gm-homebrew' && !isGM()) return { success: false, reasons: ['HOMEBREW_REQUIRES_GM'] };
    const { rejected, raw } = readProjects(this.#raw(designerActor));
    if (rejected) return { success: false, reasons: ['PROJECT_STORE_CONTAINS_UNVERIFIED_ENTRIES'] };
    const { frames, catalog } = await this.#load();
    const project = makePendingProject({
      designId: foundry.utils.randomID(), name: String(name ?? '').trim(), frameId, crewQuality: crewQuality ?? null, authorshipKind,
      submittedBy: game.user.id, submittedAt: Date.now(), systems: systemIds.map(catalogId => ({ catalogId, installId: foundry.utils.randomID() }))
    });
    const { validation } = await this.#evaluate({ project, designerActor, authority: null, catalog, frames });
    if (!validation.ok || !validation.rulesValidated) return { success: false, reasons: [...validation.reasons, ...validation.unresolved], validation };
    const tx = await this.#commit({ designerActor, next: [...raw, project], audit: { kind: 'vehicle-design-submitted', designId: project.designId } });
    return tx.success ? { success: true, proposal: project, validation } : { success: false, reasons: ['TRANSACTION_FAILED'], error: tx.error };
  }

  /** GM approval funds the project (charges the total). The vehicle is NOT delivered yet. */
  static async approveDesign(args) { return this.#exclusive(args?.designerActor, () => this.#approve(args)); }
  static async #approve({ designerActor, designId }) {
    const game = globalThis.game;
    if (!isGM()) return { success: false, reasons: ['GM_REQUIRED'] };
    const f = this.#find(designerActor, designId); if (f.error) return { success: false, reasons: [f.error] };
    const { frames, catalog } = await this.#load();
    // The system - not the project - decides who the approver and designer are.
    const claims = f.project.authorshipKind === 'gm-homebrew'
      ? { kind: 'gm-homebrew', gmUserId: game.user.id }
      : { kind: 'rules-legal', designerActorId: designerActor.id, starshipDesigner: true, shipyardAidApprovedBy: game.user.id };
    const authority = verifyConstructionAuthority(claims, { getActor: id => game.actors.get(id), getUser: id => game.users.get(id) });
    if (!authority.verified) return { success: false, reasons: authority.reasons };
    const { frame, claims: used, validation } = await this.#evaluate({ project: f.project, designerActor, authority, catalog, frames });
    if (!validation.approved) return { success: false, reasons: [...validation.reasons, ...validation.unresolved], validation };
    const record = buildConstructionRecord({ designId, name: f.project.name, frame, validation, authorship: used, crewQuality: f.project.crewQuality });
    const funded = fundProject({ ...f.project, frameSnapshot: frame }, { record, design: validation.design, approvedBy: game.user.id, at: Date.now() });
    if (!funded.ok) return { success: false, reasons: funded.reasons };
    const tx = await this.#commit({ designerActor, next: this.#replace(f.raw, funded.project), cost: record.totalCredits,
      audit: { kind: 'vehicle-design-funded', designId, approvedBy: game.user.id, totalCredits: record.totalCredits } });
    return tx.success ? { success: true, record, project: funded.project, transactionId: tx.transactionId } : { success: false, reasons: ['TRANSACTION_FAILED'], error: tx.error };
  }

  static async logDesignDays(args) { return this.#exclusive(args?.designerActor, () => this.#logDays(args)); }
  static async #logDays({ designerActor, designId, days }) {
    if (!isGM()) return { success: false, reasons: ['GM_REQUIRED'] };
    const f = this.#find(designerActor, designId); if (f.error) return { success: false, reasons: [f.error] };
    const r = logProjectDays(f.project, days); if (!r.ok) return { success: false, reasons: r.reasons };
    const tx = await this.#commit({ designerActor, next: this.#replace(f.raw, r.project), audit: { kind: 'vehicle-design-time', designId, days } });
    return tx.success ? { success: true, project: r.project } : { success: false, reasons: ['TRANSACTION_FAILED'], error: tx.error };
  }

  /** The delivered Actor: from the sealed approved record, with how construction was completed. */
  static #deliverySpec(designerActor, project) {
    const data = buildCustomVehicleActorData({ record: project.record, frame: project.frameSnapshot });
    data.flags.swse.vehicleConstructionCompletion = { ...project.completion, designId: project.designId };
    return StoreAcquisitionService.prepareCreateActorSpec({ type: 'vehicle', temporaryId: `custom-${project.designId}`, data },
      { ownerActor: designerActor, source: 'vehicle-construction', transactionContext: 'store-purchase', transactionId: project.designId });
  }

  /**
   * The design Mechanics check. Players never type a total: the service rolls 1d20 + the designer's Mechanics total;
   * a GM may enter a table roll. Either way the design time must be complete.
   */
  static async recordDesignCheck(args) { return this.#exclusive(args?.designerActor, () => this.#check(args)); }
  static async #check({ designerActor, designId, total, roller = null }) {
    const f = this.#find(designerActor, designId); if (f.error) return { success: false, reasons: [f.error] };
    let checkTotal = total, roll = null;
    if (!(isGM() && Number.isFinite(total))) {
      const bonus = designerActor?.system?.skills?.mechanics?.total;
      if (!Number.isFinite(bonus)) return { success: false, reasons: ['MECHANICS_BONUS_UNKNOWN'] };
      roll = roller ? await roller() : (await new Roll('1d20').evaluate()).total;
      checkTotal = roll + bonus;
    }
    const r = recordProjectCheck(f.project, { total: checkTotal, at: Date.now() });
    if (!r.ok) return { success: false, reasons: r.reasons };
    const tx = await this.#commit({ designerActor, next: this.#replace(f.raw, r.project), create: r.success ? this.#deliverySpec(designerActor, r.project) : null,
      audit: { kind: 'vehicle-design-check', designId, total: checkTotal, success: r.success } });
    return tx.success ? { success: true, outcome: r.success ? 'SUCCESS' : 'FAILURE', total: checkTotal, roll, project: r.project }
      : { success: false, reasons: ['TRANSACTION_FAILED'], error: tx.error };
  }

  /** GM adjudication: complete now, with a recorded reason. Delivers the Actor. */
  static async gmCompleteConstruction(args) { return this.#exclusive(args?.designerActor, () => this.#gmComplete(args)); }
  static async #gmComplete({ designerActor, designId, reason }) {
    if (!isGM()) return { success: false, reasons: ['GM_REQUIRED'] };
    const f = this.#find(designerActor, designId); if (f.error) return { success: false, reasons: [f.error] };
    const r = gmCompleteProject(f.project, { userId: globalThis.game.user.id, reason, at: Date.now() });
    if (!r.ok) return { success: false, reasons: r.reasons };
    const tx = await this.#commit({ designerActor, next: this.#replace(f.raw, r.project), create: this.#deliverySpec(designerActor, r.project),
      audit: { kind: 'vehicle-design-gm-complete', designId, reason } });
    return tx.success ? { success: true, project: r.project } : { success: false, reasons: ['TRANSACTION_FAILED'], error: tx.error };
  }

  static async rejectDesign(args) { return this.#exclusive(args?.designerActor, () => this.#reject(args)); }
  static async #reject({ designerActor, designId }) {
    if (!isGM()) return { success: false, reasons: ['GM_REQUIRED'] };
    const f = this.#find(designerActor, designId); if (f.error) return { success: false, reasons: [f.error] };
    if (f.project.status !== PROJECT_STATUS.PENDING_APPROVAL) return { success: false, reasons: ['ONLY_PENDING_DESIGNS_CAN_BE_REJECTED'] };
    const tx = await this.#commit({ designerActor, next: f.raw.filter(p => p.designId !== designId), audit: { kind: 'vehicle-design-rejected', designId } });
    return tx.success ? { success: true } : { success: false, reasons: ['TRANSACTION_FAILED'], error: tx.error };
  }
}
