/**
 * AllyAssignmentModal — styled GM NPC-assignment picker (ApplicationV2).
 *
 * Replaces the plain <select>-in-a-Dialog picker and the follow-up
 * generic-Dialog assignment-choice prompt with one modal: portrait radio
 * cards for the target Actor, radio cards for Assign as Ally / Convert to
 * Follower, and radio cards for the follower slot when converting.
 *
 * This modal never mutates an Actor and never calls ActorEngine. It reads
 * a read-only view model from AlliesSurfaceService.buildNpcAssignmentPickerViewModel
 * and, on confirm, resolves with ONE normalized result object for the
 * caller (AlliesSurfaceController) to hand to AlliesSurfaceService.
 */

import SWSEApplicationV2 from '/systems/foundryvtt-swse/scripts/apps/base/swse-application-v2.js';
import {
  AlliesSurfaceService,
  buildDefaultAllyAssignmentModalState,
  filterNpcAssignmentCandidates,
  findNpcAssignmentCandidate,
  findFollowerSlotById,
  followerTemplateLabel,
  isAllyAssignmentModeAvailable,
  resolveFollowerSlotSelectionOnModeChange,
  resolveFollowerSlotSelection,
  canConfirmAllyAssignment,
  buildAllyAssignmentResult
} from '/systems/foundryvtt-swse/scripts/ui/shell/AlliesSurfaceService.js';

function getAppRoot(app) {
  if (app?.element instanceof HTMLElement) return app.element;
  if (app?.element?.[0] instanceof HTMLElement) return app.element[0];
  return document.getElementById?.(app?.id) || null;
}

export class AllyAssignmentModal extends SWSEApplicationV2 {
  static DEFAULT_OPTIONS = {
    ...SWSEApplicationV2.DEFAULT_OPTIONS,
    id: 'swse-ally-assignment-modal',
    classes: [
      ...(SWSEApplicationV2.DEFAULT_OPTIONS?.classes || []),
      'swse-ally-assignment-modal-app'
    ],
    window: {
      title: 'Assign Existing NPC',
      icon: 'fas fa-user-plus',
      resizable: true,
      draggable: true,
      frame: true
    },
    position: {
      width: 760,
      height: 720
    }
  };

  static PARTS = {
    content: {
      template: 'systems/foundryvtt-swse/templates/apps/allies/ally-assignment-modal.hbs'
    }
  };

  constructor({ ownerActor = null, preselectedActorId = null, resolve = null } = {}) {
    super({});
    this.ownerActor = ownerActor;
    this.state = buildDefaultAllyAssignmentModalState({ targetActorId: preselectedActorId || null });
    this._viewModel = { candidates: [], followerSlots: [], hasOpenFollowerSlots: false };
    // The candidate/eligibility view model is built ONCE per modal session
    // (see _prepareContext) rather than on every render — search, mode, and
    // slot selection all re-render the template from the SAME cached view
    // model instead of re-scanning every world Actor's eligibility on every
    // keystroke. The service still independently re-validates at commit
    // time regardless (assignAsAlly/convertToFollower's own preflight).
    this._viewModelLoaded = false;
    this._resolve = typeof resolve === 'function' ? resolve : null;
    this._settled = false;
    this._focusSearchAfterRender = false;
  }

  /**
   * Open the modal for `ownerActor`, optionally preselecting a target Actor
   * (used by drag/drop). Resolves with a normalized
   * `{ targetActorId, assignmentMode, followerSlotId, grantOwnership }`
   * result, or `null` on cancel/close without a mutation.
   */
  static async wait({ ownerActor = null, preselectedActorId = null } = {}) {
    if (!ownerActor) return null;
    return new Promise((resolve) => {
      const modal = new this({ ownerActor, preselectedActorId, resolve });
      modal.render(true);
    });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    if (!this._viewModelLoaded) {
      this._viewModel = AlliesSurfaceService.buildNpcAssignmentPickerViewModel(this.ownerActor);
      this._viewModelLoaded = true;
    }
    const viewModel = this._viewModel;

    const visibleCandidates = filterNpcAssignmentCandidates(viewModel.candidates, this.state.search)
      .map(candidate => ({
        ...candidate,
        isSelected: candidate.id === this.state.targetActorId,
        // A card with no reachable action in either mode is shown (so the
        // GM can see it and why) but its radio input itself is disabled —
        // it must never be selectable into a dead-end state.
        radioDisabled: candidate.selectable === false
      }));

    const selectedCandidate = findNpcAssignmentCandidate(viewModel, this.state.targetActorId);
    const allyModeAvailable = isAllyAssignmentModeAvailable(selectedCandidate, 'ally');
    const followerModeAvailable = isAllyAssignmentModeAvailable(selectedCandidate, 'follower');
    const followerSlotCards = (viewModel.followerSlots || []).map(slot => ({
      ...slot,
      isSelected: slot.id === this.state.followerSlotId
    }));

    const selectedSlot = findFollowerSlotById(viewModel, this.state.followerSlotId);
    const templateChoices = Array.isArray(selectedSlot?.templateChoices) ? selectedSlot.templateChoices : [];
    const templateOptions = templateChoices.map(id => ({
      id,
      label: followerTemplateLabel(id),
      isSelected: id === this.state.templateType
    }));

    return {
      ...context,
      ownerActor: this.ownerActor,
      ownerName: this.ownerActor?.name || 'this character',
      search: this.state.search,
      candidates: visibleCandidates,
      hasCandidates: visibleCandidates.length > 0,
      totalCandidateCount: viewModel.candidates.length,
      selectedCandidate,
      hasSelection: Boolean(selectedCandidate),
      assignmentMode: this.state.assignmentMode,
      isAllyMode: this.state.assignmentMode === 'ally',
      isFollowerMode: this.state.assignmentMode === 'follower',
      allyModeAvailable,
      allyModeBlockedReason: selectedCandidate && !allyModeAvailable ? selectedCandidate.blockedReason : null,
      followerModeAvailable,
      followerModeBlockedReason: selectedCandidate && !followerModeAvailable ? selectedCandidate.convertBlockedReason : null,
      followerSlots: followerSlotCards,
      hasFollowerSlots: followerSlotCards.length > 0,
      hasMultipleFollowerSlots: followerSlotCards.length > 1,
      templateOptions,
      needsTemplateChoice: templateOptions.length > 1,
      grantOwnership: this.state.grantOwnership === true,
      submitting: this.state.submitting === true,
      canConfirm: canConfirmAllyAssignment(viewModel, this.state)
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const root = getAppRoot(this);
    if (!root) return;

    root.querySelectorAll('input[name="targetActorId"]').forEach(input => {
      input.addEventListener('change', () => this._onSelectCandidate(input.value));
    });

    root.querySelectorAll('input[name="assignmentMode"]').forEach(input => {
      input.addEventListener('change', () => this._onSelectAssignmentMode(input.value));
    });

    root.querySelectorAll('input[name="followerSlotId"]').forEach(input => {
      input.addEventListener('change', () => this._onSelectFollowerSlot(input.value));
    });

    root.querySelectorAll('input[name="templateType"]').forEach(input => {
      input.addEventListener('change', () => this._onSelectFollowerTemplate(input.value));
    });

    const ownershipToggle = root.querySelector('input[name="grantOwnership"]');
    ownershipToggle?.addEventListener('change', () => {
      this.state.grantOwnership = ownershipToggle.checked === true;
    });

    const searchInput = root.querySelector('input[name="search"]');
    searchInput?.addEventListener('input', () => {
      this.state.search = searchInput.value;
      this._focusSearchAfterRender = true;
      this.render(true);
    });

    // Enter submits the form only when the confirm button is enabled — the
    // native `disabled` attribute on a submit button already blocks a
    // browser-level Enter-triggered submit, but _onConfirm re-checks
    // canConfirmAllyAssignment defensively regardless of how submit fired.
    const form = root.querySelector('form.swse-ally-assignment-modal');
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      this._onConfirm();
    });

    root.querySelectorAll('[data-button="cancel"]').forEach(button => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        this._settle(null);
      });
    });

    if (this._focusSearchAfterRender) {
      this._focusSearchAfterRender = false;
      const restored = root.querySelector('input[name="search"]');
      if (restored) {
        restored.focus();
        const end = restored.value.length;
        restored.setSelectionRange?.(end, end);
      }
    }
  }

  _onSelectCandidate(targetActorId) {
    const candidate = findNpcAssignmentCandidate(this._viewModel, targetActorId);
    let nextMode = this.state.assignmentMode;
    if (!isAllyAssignmentModeAvailable(candidate, nextMode)) {
      nextMode = isAllyAssignmentModeAvailable(candidate, 'ally')
        ? 'ally'
        : (isAllyAssignmentModeAvailable(candidate, 'follower') ? 'follower' : nextMode);
    }
    this.state = resolveFollowerSlotSelectionOnModeChange(
      this._viewModel,
      { ...this.state, targetActorId },
      nextMode
    );
    this.render(true);
  }

  _onSelectAssignmentMode(mode) {
    this.state = resolveFollowerSlotSelectionOnModeChange(this._viewModel, this.state, mode);
    this.render(true);
  }

  _onSelectFollowerSlot(slotId) {
    this.state = resolveFollowerSlotSelection(this._viewModel, this.state, slotId);
    this.render(true);
  }

  _onSelectFollowerTemplate(templateId) {
    this.state = { ...this.state, templateType: templateId };
    this.render(true);
  }

  /** Synchronously disable every control so a double-click can't double-submit. */
  _lockControls() {
    const root = getAppRoot(this);
    if (!root) return;
    root.querySelectorAll('input, button').forEach(el => { el.disabled = true; });
  }

  async _onConfirm() {
    if (this.state.submitting === true) return;
    if (!canConfirmAllyAssignment(this._viewModel, this.state)) return;
    this.state = { ...this.state, submitting: true };
    this._lockControls();
    const result = buildAllyAssignmentResult(this.state);
    await this._settle(result);
  }

  async _settle(value) {
    if (this._settled) return;
    this._settled = true;
    const resolver = this._resolve;
    this._resolve = null;
    try {
      resolver?.(value);
    } finally {
      await this.close({ force: true });
    }
  }

  /** Escape / [X] close without a prior confirm resolves null and mutates nothing. */
  async close(options = {}) {
    if (!this._settled) {
      this._settled = true;
      const resolver = this._resolve;
      this._resolve = null;
      resolver?.(null);
    }
    return super.close(options);
  }
}

export default AllyAssignmentModal;
