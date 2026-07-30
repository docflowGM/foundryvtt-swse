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

/** DOM/CSS-id-safe projection of an Actor id (Foundry ids are already safe, this is defense-in-depth). */
function sanitizeIdSegment(value) {
  return String(value ?? '').replace(/[^a-zA-Z0-9]/g, '');
}

export class AllyAssignmentModal extends SWSEApplicationV2 {
  // PHASE 10 ADDENDUM (P2-3) — one in-flight modal per owner Actor.
  //
  // A single fixed Application id ('swse-ally-assignment-modal') meant
  // opening the modal for a second owner Actor (or a second time for the
  // same owner) while one was already open collided with Foundry's
  // ApplicationV2 id-keyed rendering — the second `wait()` call created a
  // NEW Promise that could go permanently unsettled once the two
  // instances fought over the same DOM element, silently orphaning a
  // caller that was `await`-ing it. `#openByOwnerId` tracks the one
  // in-flight modal per owner Actor id; `wait()` re-focuses and returns
  // the SAME Promise for a repeat call on the same owner instead of
  // constructing a second one, and every exit path settles that Promise
  // exactly once via `_finalizeModal()` before removing the registry
  // entry.
  static #openByOwnerId = new Map();

  static DEFAULT_OPTIONS = {
    ...SWSEApplicationV2.DEFAULT_OPTIONS,
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

  constructor({ ownerActor = null, preselectedActorId = null, resolve = null, onSubmit = null } = {}) {
    // Scoped per owner Actor (not the old fixed 'swse-ally-assignment-modal')
    // so two owners can each have an open modal at once without one
    // instance's DOM element/render lifecycle colliding with the other's.
    super({ id: `swse-ally-assignment-modal-${sanitizeIdSegment(ownerActor?.id) || 'unknown'}` });
    this.ownerActor = ownerActor;
    this.state = buildDefaultAllyAssignmentModalState({ targetActorId: preselectedActorId || null });
    this._viewModel = { candidates: [], followerSlots: [], hasOpenFollowerSlots: false };
    // The candidate/eligibility view model is built ONCE per modal session
    // (see _prepareContext) rather than on every render — search, mode, and
    // slot selection all re-render the template from the SAME cached view
    // model instead of re-scanning every world Actor's eligibility on every
    // keystroke. Confirm always rebuilds a FRESH view model first (see
    // _onConfirm) so a change made elsewhere while the modal was open is
    // caught before anything is submitted.
    this._viewModelLoaded = false;
    this._resolve = typeof resolve === 'function' ? resolve : null;
    // When supplied, _onConfirm calls this instead of settling immediately —
    // it is expected to perform the actual mutation (via the controller/
    // service, never inside this file — see the module doc comment) and
    // return `{ok: true}` or `{ok: false, error}`. On failure the modal
    // stays open with its selections intact and shows `error`, rather than
    // closing and forcing the GM to reopen and reconstruct every choice.
    this._onSubmit = typeof onSubmit === 'function' ? onSubmit : null;
    this._settled = false;
    this._focusSearchAfterRender = false;
    this._submitError = null;
    this._composingSearch = false;
    this._searchDebounceTimer = null;
  }

  /**
   * Open the modal for `ownerActor`, optionally preselecting a target Actor
   * (used by drag/drop). Resolves with a normalized
   * `{ targetActorId, assignmentMode, followerSlotId, templateType, grantOwnership, requestToken }`
   * result, or `null` on cancel/close without a mutation.
   *
   * `onSubmit`, if supplied, is called with that same result object when the
   * GM confirms; the modal awaits it and only closes if it resolves
   * `{ok: true}` — a `{ok: false, error}` result reopens the same modal
   * state with `error` displayed instead of losing the GM's selections.
   *
   * A repeat call for the SAME owner Actor while its modal is still open
   * re-focuses that modal and returns its existing Promise rather than
   * constructing a second instance — see `#openByOwnerId`'s doc comment.
   */
  static async wait({ ownerActor = null, preselectedActorId = null, onSubmit = null } = {}) {
    if (!ownerActor) return null;

    const existing = this.#openByOwnerId.get(ownerActor.id);
    if (existing) {
      existing.modal.bringToFront?.();
      return existing.promise;
    }

    let resolveFn;
    const promise = new Promise((resolve) => { resolveFn = resolve; });
    const modal = new this({ ownerActor, preselectedActorId, resolve: resolveFn, onSubmit });
    this.#openByOwnerId.set(ownerActor.id, {
      modal,
      promise,
      resolve: resolveFn,
      ownerActorId: ownerActor.id,
      openedAt: Date.now()
    });

    try {
      await modal.render(true);
    } catch (err) {
      // A render failure must not leave an orphaned registry entry that
      // blocks every future wait() call for this owner — finalize(null)
      // both settles the Promise and removes the entry.
      modal._finalizeModal(null);
      throw err;
    }

    return promise;
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
        radioDisabled: candidate.canSelect === false
      }));

    const selectedCandidate = findNpcAssignmentCandidate(viewModel, this.state.targetActorId);
    const selectedHiddenBySearch = Boolean(selectedCandidate)
      && Boolean(this.state.search)
      && !visibleCandidates.some(c => c.id === selectedCandidate.id);
    const allyModeAvailable = isAllyAssignmentModeAvailable(selectedCandidate, 'ally');
    const followerModeAvailable = isAllyAssignmentModeAvailable(selectedCandidate, 'follower');
    // A reserved-but-open slot (another in-progress conversion) is shown,
    // not hidden — the GM can see it exists — but its radio input is
    // disabled so it can't be selected into a request that the service
    // would just reject at commit time anyway. This is UX only; the real
    // guarantee is FollowerSlotService.reserveFollowerSlot()'s own
    // token-verified reread, not this flag (see AlliesSurfaceService's
    // getOpenFollowerSlotsForConversion() doc comment).
    const followerSlotCards = (viewModel.followerSlots || []).map(slot => ({
      ...slot,
      isSelected: slot.id === this.state.followerSlotId,
      radioDisabled: slot.reserved === true
    }));

    const selectedSlot = findFollowerSlotById(viewModel, this.state.followerSlotId);
    const templateChoices = Array.isArray(selectedSlot?.templateChoices) ? selectedSlot.templateChoices : [];
    const templateOptions = templateChoices.map(id => ({
      id,
      label: followerTemplateLabel(id),
      isSelected: id === this.state.templateType
    }));
    const noValidTemplateForSlot = Boolean(selectedSlot) && templateChoices.length === 0;

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
      selectedHiddenBySearch,
      assignmentMode: this.state.assignmentMode,
      isAllyMode: this.state.assignmentMode === 'ally',
      isFollowerMode: this.state.assignmentMode === 'follower',
      allyModeAvailable,
      allyModeBlockedReason: selectedCandidate && !allyModeAvailable ? selectedCandidate.assignBlockedReason : null,
      followerModeAvailable,
      followerModeBlockedReason: selectedCandidate && !followerModeAvailable ? selectedCandidate.convertBlockedReason : null,
      followerSlots: followerSlotCards,
      hasFollowerSlots: followerSlotCards.length > 0,
      hasMultipleFollowerSlots: followerSlotCards.length > 1,
      templateOptions,
      needsTemplateChoice: templateOptions.length > 1,
      noValidTemplateForSlot,
      grantOwnership: this.state.grantOwnership === true,
      submitting: this.state.submitting === true,
      submitError: this._submitError,
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
    // Debounced (small, ~120ms) so a fast typist doesn't force a re-render
    // per keystroke, and IME-composition-safe: while the browser is mid-
    // composition (composingsearch true), input events are ignored — a
    // re-render mid-composition can replace the input's DOM node and drop
    // the in-progress IME state — and the queued update only fires once
    // composition actually ends.
    searchInput?.addEventListener('compositionstart', () => { this._composingSearch = true; });
    searchInput?.addEventListener('compositionend', () => {
      this._composingSearch = false;
      this._queueSearchUpdate(searchInput.value);
    });
    searchInput?.addEventListener('input', () => {
      if (this._composingSearch) return;
      this._queueSearchUpdate(searchInput.value);
    });
    // While the IME is composing, pressing Enter to confirm the composed
    // text must never also submit the form — event.isComposing (and the
    // legacy keyCode 229 fallback some browsers still use) is checked on
    // keydown, before the browser would otherwise treat Enter as a submit
    // trigger for this text field.
    searchInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.isComposing || event.keyCode === 229)) {
        event.preventDefault();
      }
    });

    root.querySelector('[data-button="clear-search"]')?.addEventListener('click', (event) => {
      event.preventDefault();
      this.state = { ...this.state, search: '' };
      this._submitError = null;
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

  /** Debounced search-state update — see the compositionstart/end wiring in _onRender. */
  _queueSearchUpdate(value) {
    this.state = { ...this.state, search: value };
    if (this._searchDebounceTimer) clearTimeout(this._searchDebounceTimer);
    this._searchDebounceTimer = setTimeout(() => {
      this._searchDebounceTimer = null;
      this._focusSearchAfterRender = true;
      this.render(true);
    }, 120);
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
    this._submitError = null;
    this.render(true);
  }

  _onSelectAssignmentMode(mode) {
    this.state = resolveFollowerSlotSelectionOnModeChange(this._viewModel, this.state, mode);
    this._submitError = null;
    this.render(true);
  }

  _onSelectFollowerSlot(slotId) {
    this.state = resolveFollowerSlotSelection(this._viewModel, this.state, slotId);
    this._submitError = null;
    this.render(true);
  }

  _onSelectFollowerTemplate(templateId) {
    this.state = { ...this.state, templateType: templateId };
    this._submitError = null;
    this.render(true);
  }

  /** Synchronously disable every control so a double-click can't double-submit. */
  _lockControls() {
    const root = getAppRoot(this);
    if (!root) return;
    root.querySelectorAll('input, button').forEach(el => { el.disabled = true; });
  }

  /**
   * Rebuild the picker view model fresh (bypassing the per-session cache)
   * and re-check that the current selection is still valid against it.
   * The cached view model can go stale while the modal sits open — another
   * GM action, a slot filling elsewhere, or the target becoming a follower
   * through some other path — so this is the LAST check before resolving,
   * on top of (never instead of) the service's own independent preflight.
   *
   * @returns {boolean} true if the current selection is still confirmable
   */
  _revalidateAgainstFreshViewModel() {
    const freshViewModel = AlliesSurfaceService.buildNpcAssignmentPickerViewModel(this.ownerActor);
    const stillValid = canConfirmAllyAssignment(freshViewModel, this.state);
    this._viewModel = freshViewModel;
    this._viewModelLoaded = true;
    return stillValid;
  }

  async _onConfirm() {
    if (this.state.submitting === true) return;
    if (!canConfirmAllyAssignment(this._viewModel, this.state)) return;

    if (!this._revalidateAgainstFreshViewModel()) {
      this._submitError = 'The selected NPC, slot, or template is no longer available. Your selections below have been refreshed — please review and try again.';
      this.render(true);
      return;
    }

    this._submitError = null;
    this.state = { ...this.state, submitting: true };
    this._lockControls();
    // A fresh token per confirm attempt — carried through to
    // FollowerSlotService.reserveFollowerSlot()/AllyAssignmentService so a
    // retried submission (after a transient failure) never gets confused
    // with a different attempt's in-flight slot/target reservation.
    const requestToken = foundry?.utils?.randomID?.() || globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
    const result = { ...buildAllyAssignmentResult(this.state), requestToken };

    if (this._onSubmit) {
      let outcome = null;
      try {
        outcome = await this._onSubmit(result);
      } catch (err) {
        outcome = { ok: false, error: err?.message || 'The action could not be completed.' };
      }
      if (!outcome || outcome.ok !== true) {
        // Stay open: restore an interactive (non-submitting) state, show
        // the failure, and refresh the view model — the GM's selections
        // remain exactly as they were, nothing needs to be reconstructed.
        this.state = { ...this.state, submitting: false };
        this._submitError = outcome?.error || 'The action could not be completed.';
        this._viewModel = AlliesSurfaceService.buildNpcAssignmentPickerViewModel(this.ownerActor);
        this._viewModelLoaded = true;
        this.render(true);
        return;
      }
    }

    await this._settle(result);
  }

  /**
   * Settle this modal's Promise exactly once and remove it from the
   * in-flight owner registry, regardless of which exit path triggered it
   * (submit, Cancel, Escape, the window's [X], a forced close, or a
   * render failure caught by `wait()`). Idempotent — a second call after
   * the first is a no-op, so `_settle()` and `close()` can each call this
   * unconditionally without double-resolving the Promise or double-
   * deleting a DIFFERENT (newer) registry entry for the same owner.
   */
  _finalizeModal(value) {
    if (this._settled) return;
    this._settled = true;

    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
      this._searchDebounceTimer = null;
    }

    const ownerId = this.ownerActor?.id;
    if (ownerId && AllyAssignmentModal.#openByOwnerId.get(ownerId)?.modal === this) {
      AllyAssignmentModal.#openByOwnerId.delete(ownerId);
    }

    const resolver = this._resolve;
    this._resolve = null;
    resolver?.(value);
  }

  async _settle(value) {
    this._finalizeModal(value);
    await this.close({ force: true });
  }

  /** Escape / [X] close without a prior confirm resolves null and mutates nothing. */
  async close(options = {}) {
    this._finalizeModal(null);
    return super.close(options);
  }
}

export default AllyAssignmentModal;
