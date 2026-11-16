/**
 * MentorSurveyStep: the progression step for the Mentor surveys (V2). One base class; Level 1 and Multiclass differ only
 * in which controller they build and which live context they bind (see the subclass hooks below).
 *
 * Thin by design. All lifecycle logic lives in scripts/mentor/mentor-survey-v2 (pure, tested offline). This step only
 *  - loads content and binds the live chargen context (class, species) from the progression session,
 *  - renders the controller's view model,
 *  - forwards player actions,
 *  - stores the DRAFT in progressionSession.draftSelections.mentorSurvey (never on the actor).
 * The survey reaches the actor only through ProgressionFinalizer (buildSurveyLedgerPatch), in the same atomic update as
 * the advancement. Canceling or abandoning the session therefore persists nothing.
 *
 * Level 1 (this class) and Multiclass (MulticlassSurveyStep) are wired. Prestige uses its own controller when cut over.
 */
import { ProgressionStepPlugin } from './step-plugin-base.js';
import { getStepMentorObject } from './mentor-step-integration.js';
import { resolveMentorPortraitPath } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js';
import { MentorTranslationIntegration } from '/systems/foundryvtt-swse/scripts/mentor/mentor-translation-integration.js';
import { ArchetypeRegistry } from '/systems/foundryvtt-swse/scripts/engine/archetype/archetype-registry.js';
import { L1SurveyController } from '/systems/foundryvtt-swse/scripts/mentor/mentor-survey-v2/l1-controller.js';
import { PrestigeSurveyController } from '/systems/foundryvtt-swse/scripts/mentor/mentor-survey-v2/prestige-controller.js';
import { MulticlassSurveyController } from '/systems/foundryvtt-swse/scripts/mentor/mentor-survey-v2/multiclass-controller.js';
import { mergeIntoSessionValue } from '/systems/foundryvtt-swse/scripts/mentor/mentor-survey-v2/survey-controller.js';
import { projectActorEvidence } from '/systems/foundryvtt-swse/scripts/mentor/mentor-survey-v2/actor-evidence.js';
import { readLedger } from '/systems/foundryvtt-swse/scripts/mentor/mentor-survey-v2/intent-ledger.js';
import { IdentityEngine } from '/systems/foundryvtt-swse/scripts/engine/prestige/identity-engine.js';
import { loadSurveyContent } from '/systems/foundryvtt-swse/scripts/mentor/mentor-survey-v2/content-loader.js';
import { SESSION_SELECTION_KEY } from '/systems/foundryvtt-swse/scripts/mentor/mentor-survey-v2/contract.js';
import { canUseEditorialPreview } from '/systems/foundryvtt-swse/scripts/settings/mentor-survey-preview.js';

const slug = (s) => String(s ?? '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const esc = (v) => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function resolveClassId(shell) {
  const sel = shell?.progressionSession?.getSelection?.('class') || shell?.committedSelections?.get?.('class') || null;
  const name = sel?.name || sel?.className || sel?.id || null;
  return name ? slug(name).replace(/-/g, '_') : null;
}

function resolveSpeciesKeys(shell) {
  const sel = shell?.progressionSession?.getSelection?.('species') || null;
  const keys = [];
  if (sel?.name) keys.push(`species-${slug(sel.name)}`);
  if (sel?.id) keys.push(String(sel.id));
  return keys;
}

function portraitMarkup(portrait, name) {
  if (!portrait) return '';
  return `<img class="prog-l1-survey-stage__mentor-image prog-holo-media__image" src="${esc(portrait)}" alt="${esc(name || 'Mentor')}" title="${esc(name || 'Mentor')}"/>`;
}

export class MentorSurveyStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._ctl = null;
    this._loadError = null;
    this._renderAbort = null;
    this._lastTranslationKey = null;
  }

  // ---- subclass hooks ----
  get _packKind() { return 'l1'; }
  get _title() { return 'Where do you want your path to lead?'; }
  _createController(deps, stored) { return new L1SurveyController(deps, stored); }
  _liveContext(shell) { return { classId: resolveClassId(shell), speciesKeys: resolveSpeciesKeys(shell) }; }

  /** Persist the DRAFT into the progression session (session only; never an actor write). Merges, so other surveys' entries survive. */
  _persist(shell) {
    const entry = this._ctl?.entry();
    if (!entry) return;
    const current = shell?.progressionSession?.getSelection?.(SESSION_SELECTION_KEY) ?? null;
    shell?.progressionSession?.commitSelection?.(this.descriptor?.stepId || 'l1-survey', SESSION_SELECTION_KEY, mergeIntoSessionValue(current, entry));
  }

  async onStepEnter(shell) {
    this._loadError = null;
    try {
      const { pack, manifest } = await loadSurveyContent(this._packKind);
      try { await ArchetypeRegistry.initialize?.(); } catch (_e) { /* lookup below fails closed for restricted children */ }
      const stored = shell?.progressionSession?.getSelection?.(SESSION_SELECTION_KEY) ?? null;
      this._ctl = this._createController({
        pack, manifest, preview: canUseEditorialPreview(),
        archetypeLookup: (id) => ArchetypeRegistry.getArchetype?.(id) ?? null,
      }, stored);
      this._ctl.sync(this._liveContext(shell));
      this._persist(shell);
    } catch (err) {
      console.warn('[MentorSurveyStep] content unavailable; survey skipped (no fallback questionnaire):', err);
      this._loadError = err;
      this._ctl = null;
    }
  }

  async onDataReady(shell) {
    if (!shell?.element) return;
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    // MENTOR SIDECAR: deliberately not awaited. The Aurebesh reveal is cosmetic and must never hold the render lock.
    void this._renderInlineTranslation(shell).catch((err) => console.warn('[MentorSurveyStep] translation sidecar failed', err));
  }

  async _renderInlineTranslation(shell) {
    if (!shell?.element) return;
    const v = this._ctl?.view?.() || {};
    const key = `${v.phase}_${v.view?.questionId ?? ''}_${v.view?.page?.index ?? 0}`;
    if (this._lastTranslationKey === key) return;
    this._lastTranslationKey = key;
    const signal = this._renderAbort?.signal ?? null;
    for (const element of shell.element.querySelectorAll('[data-l1-survey-dialogue-text]')) {
      if (signal?.aborted) return;
      if (!element || element._translationApplied) continue;
      const text = element.textContent?.trim();
      if (!text) continue;
      element._translationApplied = true;
      try {
        // mentor-sidecar-await-ok: runs inside the fire-and-forgotten sidecar started by onDataReady().
        await MentorTranslationIntegration.render({ text, container: element, mentor: this._ctl?.ctx?.classId || this._ctl?.ctx?.destinationClassId || 'default', topic: 'l1-survey', force: true, signal });
      } catch (err) { console.warn('[MentorSurveyStep] translation failed, keeping plain text', err); }
    }
  }

  async onStepExit() { this._renderAbort?.abort(); }

  async handleAction(action, event, target, shell) {
    if (!String(action).startsWith('msurvey-')) return false;
    event?.preventDefault?.();
    const ctl = this._ctl; if (!ctl) return true;
    const ds = target?.dataset || {};
    const seq = Number(ds.seq);
    let changed = false;
    switch (action) {
      case 'msurvey-choose': changed = ctl.choose(ds.questionId, ds.optionId, seq); break;
      case 'msurvey-submit-many': { // multi-select stage: the toggled options are read from the DOM; the controller re-validates them
        const picked = [...(shell?.element?.querySelectorAll?.('[data-multi-option].is-selected') ?? [])].map((el) => el.dataset.optionId);
        changed = ctl.chooseMany(ds.questionId, picked, seq); break;
      }
      case 'msurvey-toggle': { // UI-only: no survey state changes until the selection is submitted
        target?.classList?.toggle?.('is-selected'); return true;
      }
      case 'msurvey-more': changed = ctl.more(ds.questionId, seq); break;
      case 'msurvey-skip-question': changed = ctl.skipQuestion(ds.questionId, seq); break;
      case 'msurvey-back': changed = ctl.back(seq); break;
      case 'msurvey-goto': changed = ctl.goTo(ds.questionId, seq); break;
      case 'msurvey-reconfirm': changed = ctl.reconfirm(ds.questionId, seq); break;
      case 'msurvey-skip-survey': changed = ctl.skipSurvey(seq); break;
      case 'msurvey-finish': changed = Boolean(ctl.finish(seq)); break;
      case 'msurvey-change': changed = ctl.reopen(); break;
      case 'msurvey-retake': changed = ctl.retake(); break;
      default: return false;
    }
    if (changed) { this._persist(shell); this._lastTranslationKey = null; shell.requestRender({ preserveScroll: true, reason: `mentor-survey:${action}` }); }
    return true;
  }

  async getStepData(context) {
    const shell = context?.shell ?? null;
    const mentor = getStepMentorObject(shell?.actor ?? null, shell);
    const mentorPortrait = resolveMentorPortraitPath(mentor?.portrait || null);
    const v = this._ctl ? this._ctl.view() : { phase: 'unavailable', reason: this._loadError ? 'content_unavailable' : 'not_ready' };
    // Inner stages (Q5's optional second purpose) belong to their question: count distinct question numbers.
    const qs = this._ctl?.flow?.questions ?? ['q1', 'q2', 'q3', 'q4', 'q5'];
    const numbers = [...new Set(qs.map((q) => Number(String(q).match(/\d/)[0])).filter((n) => n > 0))];
    const total = numbers.length;
    const resolvedNum = (n) => qs.filter((q) => Number(String(q).match(/\d/)[0]) === n).every((q) => this._ctl?.draft?.answers?.[q] || this._ctl?.draft?.skipped?.[q]);
    return {
      mentorName: mentor?.name || null, mentorTitle: mentor?.title || mentor?.class || null,
      mentorPortraitMarkup: portraitMarkup(mentorPortrait, mentor?.name),
      phase: v.phase, seq: v.seq ?? 0, preview: v.preview === true,
      view: v.view || null, multiSelect: v.view?.multiSelect === true, questionNumber: v.questionNumber ?? null, totalQuestions: total,
      reconfirm: v.reconfirm || null, staleNotice: v.staleNotice || null, selectedOptionId: v.selectedOptionId || null,
      canGoBack: v.canGoBack === true, progress: v.progress || { answered: 0, resolved: 0, total },
      progressDots: numbers.map((n) => ({ index: n, isDone: Boolean(this._ctl?.draft) && resolvedNum(n), isActive: n === v.questionNumber })),
      title: this._title,
      unavailableText: 'The Mentor interview is not available for this character right now. It is optional; continue when you are ready.',
    };
  }

  getSelection() {
    const c = this._ctl?.committed;
    return { selected: c ? [this._packKind] : [], count: c ? 1 : 0, isComplete: Boolean(c) };
  }

  renderWorkSurface(stepData) {
    return { template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/mentor-survey-work-surface.hbs', data: stepData };
  }

  renderDetailsPanel(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/mentor-survey-details.hbs',
      data: { preview: this._ctl?.preview === true, phase: this._ctl?.view?.()?.phase ?? 'unavailable' },
    };
  }

  /** The survey is optional: it never blocks progression. */
  validate() { return { isValid: true, errors: [], warnings: [] }; }
  getBlockingIssues() { return []; }
}

/**
 * Multiclass: shown only when a foundation class is acquired for the FIRST time (the trigger lives in
 * resolvers/multiclass.js and is also the activation rule in ActiveStepComputer). The origin class comes from FINALIZED
 * actor class levels, never from pending selections.
 */
export class MulticlassSurveyStep extends MentorSurveyStep {
  get _packKind() { return 'multiclass'; }
  get _title() { return 'What do you want from this new training?'; }
  _createController(deps, stored) { return new MulticlassSurveyController(deps, stored); }
  _liveContext(shell) {
    return {
      selectedClassId: resolveClassId(shell),
      classLevels: projectActorEvidence(shell?.actor).classLevels,
      seed: shell?.progressionSession?.sessionId || 'session',
      // Q6 reads FINALIZED actor state and the committed ledger only (never pending selections or draft answers).
      evidence: projectActorEvidence(shell?.actor),
      events: readLedger(shell?.actor),
      // Q2 reads the EXISTING observed-only accessor (finalized owned items, ability scores, trained skills). No new scorer;
      // if the primitive registries are not initialized it returns {} and Q2 is simply not offered.
      observedBias: (() => { try { return IdentityEngine.computeObservedBehaviorBias(shell?.actor)?.mechanicalBias || {}; } catch (_e) { return {}; } })(),
      observedProvenance: (() => { try { return IdentityEngine.computeObservedBehaviorBiasProvenance(shell?.actor) || null; } catch (_e) { return null; } })(),
      canonicalBiasKeys: this._ctl?.pack?.q2Content?.keys || [],
    };
  }
}

/**
 * Prestige: shown when a prestige class is newly acquired (a milestone, not a ladder). The survey is optional and never
 * forces a further class goal. The class comes from the session selection; finalized class levels decide "newly".
 */
export class PrestigeSurveyStep extends MentorSurveyStep {
  get _packKind() { return 'prestige'; }
  get _title() { return 'What does this achievement mean to you?'; }
  _createController(deps, stored) { return new PrestigeSurveyController(deps, stored); }
  _liveContext(shell) {
    return {
      selectedClassId: resolveClassId(shell), classLevels: projectActorEvidence(shell?.actor).classLevels,
      // Q2 reads the existing observed-only accessor and its read-only provenance (finalized owned items, trained skills); no new scorer.
      observedBias: (() => { try { return IdentityEngine.computeObservedBehaviorBias(shell?.actor)?.mechanicalBias || {}; } catch (_e) { return {}; } })(),
      observedProvenance: (() => { try { return IdentityEngine.computeObservedBehaviorBiasProvenance(shell?.actor) || null; } catch (_e) { return null; } })(),
      canonicalBiasKeys: this._ctl?.pack?.q2Content?.keys || [],
    };
  }
}
