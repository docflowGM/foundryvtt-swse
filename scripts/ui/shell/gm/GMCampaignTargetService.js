/**
 * GMCampaignTargetService
 *
 * Ecosystem Redesign Phase 6 — a tiny, pure mapping from a campaign
 * object's {kind, id} to the exact destination-specific selection
 * contract `GMDatapad.navigateToSurface()` (Phase 2) already expects.
 *
 * This exists only because those contracts genuinely differ per
 * destination (statePatch vs hostPatch, and a different field name per
 * surface) and, as of this phase, four call sites (Locations, Factions,
 * Job Board, Intel) already hard-code them independently. It is NOT a
 * second router: it never calls navigateToSurface() itself, only returns
 * the {surfaceId, statePatch?, hostPatch?} object a caller passes
 * straight into that real contract. It knows nothing about HOW to
 * navigate, only how to ADDRESS a campaign object once you're navigating.
 *
 * Actor ({kind:'actor'}) is deliberately absent — every existing surface
 * (Locations' open-contact 'actor' branch, Job Board's issuer-actor
 * branch, Intel's open-actor branch, Workspace's open-actor control)
 * opens the real Foundry Actor sheet directly (`actor.sheet.render(true)`),
 * never a Datapad surface selection. Callers wanting an Actor sheet should
 * resolve and open it themselves, exactly as those controllers already do.
 * This behavior is NOT changed by Phase 7.
 *
 * `workspaceActor(id)` / {kind:'workspace-actor'} is a genuinely different,
 * additive destination (Phase 7): it selects an Actor inside the Workspace
 * surface's campaign-dossier detail (GMCampaignContextService.forActor()),
 * it does not open the Foundry sheet. The two must never be conflated —
 * "Open Sheet" and "Open in Workspace" are different GM intentions.
 */
export class GMCampaignTargetService {
  static location(id) {
    return { surfaceId: 'locations', statePatch: { selectedLocationId: id } };
  }

  static faction(id) {
    return { surfaceId: 'factions', statePatch: { focusedFactionId: id } };
  }

  static job(id) {
    return { surfaceId: 'jobs', hostPatch: { selectedJobThreadId: id } };
  }

  static intel(id) {
    return { surfaceId: 'intel', statePatch: { selectedRecordId: id } };
  }

  static skillChallenge(id) {
    return { surfaceId: 'skill-challenges', statePatch: { selectedChallengeId: id } };
  }

  static trade(recordId) {
    return { surfaceId: 'trade', hostPatch: { selectedTradeRecordId: recordId } };
  }

  static approval(key) {
    return { surfaceId: 'approvals', hostPatch: { selectedApprovalKey: key } };
  }

  /**
   * Phase 7 — select an Actor inside Workspace's campaign-dossier detail.
   * Genuinely distinct from an 'actor' target (which remains unsupported
   * here and always means "open the Foundry sheet" wherever it is used).
   */
  static workspaceActor(id) {
    return { surfaceId: 'workspace', statePatch: { selectedActorId: id } };
  }

  /**
   * Convert a {kind, id} campaign-target descriptor (the shape
   * GMCampaignContextService.attentionItems() rows carry as `.target`)
   * into the real navigateToSurface() call arguments. Returns null for an
   * unsupported/actor kind — callers must handle Actor targets themselves.
   */
  static resolve(target) {
    const kind = String(target?.kind || '');
    const id = target?.id;
    if (!id) return null;
    switch (kind) {
      case 'location': return this.location(id);
      case 'faction': return this.faction(id);
      case 'job': return this.job(id);
      case 'intel': return this.intel(id);
      case 'skill-challenge': return this.skillChallenge(id);
      case 'trade': return this.trade(id);
      case 'approval': return this.approval(id);
      case 'workspace-actor': return this.workspaceActor(id);
      default: return null;
    }
  }
}
