/**
 * Custom starship construction workflow (Starships of the Galaxy pp. 52-53 stock frames; Starship Designer).
 *
 *   submitDesign  (designer, or a GM for homebrew)  -> a PENDING proposal stored on the designer Actor
 *   approveDesign (GM only)                          -> re-validates from the inputs with a system-verified authority,
 *                                                       then ONE TransactionEngine mutation charges the total cost and
 *                                                       creates the sealed custom-built vehicle Actor
 *   rejectDesign  (GM only)                          -> removes the proposal
 *
 * Nothing here trusts stored statistics: approval rebuilds the design from the proposal inputs (frame id, crew
 * quality, catalog system ids). The created Actor makes no publication claim and starts with no Items or weapons.
 * Charging the design total at approval (when the Actor comes into being) is an engineering decision, not a
 * published rule.
 */
import {
  DEFAULT_CONSTRUCTION_RULES, buildConstructionRecord, buildCustomVehicleActorData, validateDesign, verifyConstructionAuthority
} from "/systems/foundryvtt-swse/scripts/domain/vehicles/custom-vehicle-construction.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { TransactionEngine } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js";
import { StoreAcquisitionService } from "/systems/foundryvtt-swse/scripts/engine/store/acquisition-service.js";
import { VehicleInstallationService } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-installation-service.js";

export const DESIGN_PROPOSALS_FLAG_PATH = 'flags.swse.vehicleDesignProposals';

const hasFeat = actor => Array.from(actor?.items ?? []).some(i => i?.type === 'feat' && /^starship designer$/i.test(String(i.name ?? '').trim()));

export class CustomVehicleConstructionService {
  static _frames = null;
  /** Owner-ruling seam (design-time rounding etc.). */
  static rules = DEFAULT_CONSTRUCTION_RULES;

  static async loadFrames() {
    if (this._frames) return this._frames;
    const res = await fetch('systems/foundryvtt-swse/data/canonical/vehicles/construction/stock-frames.json');
    if (!res.ok) throw new Error('VEHICLE_STOCK_FRAMES_LOAD_FAILED');
    this._frames = (await res.json()).frames;
    return this._frames;
  }

  static proposalsOf(actor) {
    const raw = actor?.flags?.swse?.vehicleDesignProposals ?? actor?.getFlag?.('swse', 'vehicleDesignProposals');
    return Array.isArray(raw) ? raw : [];
  }

  /** Rebuild and validate a proposal from its INPUTS only. */
  static async #evaluate({ proposal, designerActor, authority, catalog, frames }) {
    const frame = frames.find(f => f.id === proposal.frameId) ?? null;
    const systems = proposal.systems.map(s => ({ catalogEntry: catalog.get(s.catalogId), installId: s.installId, mount: s.mount ?? null, nonstandard: s.nonstandard }));
    const homebrew = proposal.authorshipKind === 'gm-homebrew';
    const claims = homebrew
      ? { kind: 'gm-homebrew', gmUserId: authority ? globalThis.game.user.id : proposal.submittedBy }
      : { kind: 'rules-legal', designerActorId: designerActor.id, starshipDesigner: hasFeat(designerActor),
        shipyardAidApprovedBy: authority ? globalThis.game.user.id : 'PENDING_GM_APPROVAL' };
    const validation = validateDesign({
      designId: proposal.designId, name: proposal.name, frame, systems, authorship: claims, crewQuality: proposal.crewQuality,
      availableCredits: LedgerService.getCurrentCredits(designerActor), rules: this.rules, authority
    });
    return { frame, claims, validation };
  }

  /** Preview a design without storing anything (UI live preview). */
  static async preview({ designerActor, name = 'Preview', frameId, crewQuality = null, systemIds = [], authorshipKind = 'rules-legal' }) {
    const [frames, catalog] = [await this.loadFrames(), await VehicleInstallationService.loadCatalog()];
    const proposal = { designId: 'preview', name, frameId, crewQuality, authorshipKind, submittedBy: globalThis.game?.user?.id,
      systems: systemIds.map((catalogId, i) => ({ catalogId, installId: `preview-${i}` })) };
    return (await this.#evaluate({ proposal, designerActor, authority: null, catalog, frames })).validation;
  }

  static async submitDesign({ designerActor, name, frameId, crewQuality, systemIds = [], authorshipKind = 'rules-legal' }) {
    const game = globalThis.game;
    if (!designerActor?.id) return { success: false, reasons: ['DESIGNER_ACTOR_REQUIRED'] };
    if (authorshipKind === 'gm-homebrew' && game?.user?.isGM !== true) return { success: false, reasons: ['HOMEBREW_REQUIRES_GM'] };
    const [frames, catalog] = [await this.loadFrames(), await VehicleInstallationService.loadCatalog()];
    await VehicleInstallationService.loadRules();
    const proposal = {
      designId: foundry.utils.randomID(), name: String(name ?? '').trim(), frameId, crewQuality: crewQuality ?? null, authorshipKind,
      submittedBy: game.user.id, submittedAt: Date.now(),
      systems: systemIds.map(catalogId => ({ catalogId, installId: foundry.utils.randomID() }))
    };
    const { validation } = await this.#evaluate({ proposal, designerActor, authority: null, catalog, frames });
    if (!validation.ok || !validation.rulesValidated) return { success: false, reasons: [...validation.reasons, ...validation.unresolved], validation };
    const next = [...this.proposalsOf(designerActor), proposal];
    const tx = await TransactionEngine.executeMutationTransaction({
      actor: designerActor, mutationPlan: { set: { [DESIGN_PROPOSALS_FLAG_PATH]: next } }, cost: 0, transactionContext: 'vehicle-design-proposal',
      audit: { kind: 'vehicle-design-submitted', designId: proposal.designId }
    });
    return tx.success ? { success: true, proposal, validation } : { success: false, reasons: ['TRANSACTION_FAILED'], error: tx.error };
  }

  static async approveDesign({ designerActor, designId }) {
    const game = globalThis.game;
    if (game?.user?.isGM !== true) return { success: false, reasons: ['GM_REQUIRED'] };
    const proposals = this.proposalsOf(designerActor);
    const proposal = proposals.find(p => p.designId === designId);
    if (!proposal) return { success: false, reasons: ['DESIGN_NOT_FOUND'] };
    const [frames, catalog] = [await this.loadFrames(), await VehicleInstallationService.loadCatalog()];
    await VehicleInstallationService.loadRules();
    // The system - not the proposal - decides who the approver and designer are.
    const claims = proposal.authorshipKind === 'gm-homebrew'
      ? { kind: 'gm-homebrew', gmUserId: game.user.id }
      : { kind: 'rules-legal', designerActorId: designerActor.id, starshipDesigner: true, shipyardAidApprovedBy: game.user.id };
    const authority = verifyConstructionAuthority(claims, { getActor: id => game.actors.get(id), getUser: id => game.users.get(id) });
    if (!authority.verified) return { success: false, reasons: authority.reasons };
    const { frame, claims: used, validation } = await this.#evaluate({ proposal, designerActor, authority, catalog, frames });
    if (!validation.approved) return { success: false, reasons: [...validation.reasons, ...validation.unresolved], validation };
    const record = buildConstructionRecord({ designId, name: proposal.name, frame, validation, authorship: used, crewQuality: proposal.crewQuality });
    const actorData = buildCustomVehicleActorData({ record, frame });
    const spec = StoreAcquisitionService.prepareCreateActorSpec(
      { type: 'vehicle', temporaryId: `custom-${designId}`, data: actorData },
      { ownerActor: designerActor, source: 'vehicle-construction', transactionContext: 'store-purchase', transactionId: designId });
    const tx = await TransactionEngine.executeMutationTransaction({
      actor: designerActor, cost: record.totalCredits, transactionContext: 'store-purchase',
      mutationPlan: { set: { [DESIGN_PROPOSALS_FLAG_PATH]: proposals.filter(p => p.designId !== designId) }, create: { actors: [spec] } },
      audit: { kind: 'vehicle-design-approved', designId, approvedBy: game.user.id, totalCredits: record.totalCredits }
    });
    return tx.success ? { success: true, record, transactionId: tx.transactionId } : { success: false, reasons: ['TRANSACTION_FAILED'], error: tx.error };
  }

  static async rejectDesign({ designerActor, designId }) {
    if (globalThis.game?.user?.isGM !== true) return { success: false, reasons: ['GM_REQUIRED'] };
    const proposals = this.proposalsOf(designerActor);
    if (!proposals.some(p => p.designId === designId)) return { success: false, reasons: ['DESIGN_NOT_FOUND'] };
    const tx = await TransactionEngine.executeMutationTransaction({
      actor: designerActor, mutationPlan: { set: { [DESIGN_PROPOSALS_FLAG_PATH]: proposals.filter(p => p.designId !== designId) } }, cost: 0,
      transactionContext: 'vehicle-design-proposal', audit: { kind: 'vehicle-design-rejected', designId }
    });
    return tx.success ? { success: true } : { success: false, reasons: ['TRANSACTION_FAILED'], error: tx.error };
  }
}
