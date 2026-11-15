/**
 * MentorSurveyStep: the single progression step for the Mentor surveys (V2).
 *
 * Thin by design. All lifecycle logic lives in scripts/mentor/mentor-survey-v2 (pure, tested offline). This step only
 *  - loads content and binds the live chargen context (class, species) from the progression session,
 *  - renders the controller's view model,
 *  - forwards player actions,
 *  - stores the DRAFT in progressionSession.draftSelections.mentorSurvey (never on the actor).
 * The survey reaches the actor only through ProgressionFinalizer (buildSurveyLedgerPatch), in the same atomic update as
 * the advancement. Canceling or abandoning the session therefore persists nothing.
 *
 * Level 1 is wired here. Multiclass and prestige use their own controllers when they are cut over.
 */
import { ProgressionStepPlugin } from './step-plugin-base.js';
import { getStepMentorObject } from './mentor-step-integration.js';
import { resolveMentorPortraitPath } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js';
import { MentorTranslationIntegration } from '/systems/foundryvtt-swse/scripts/mentor/mentor-translation-integration.js';
import { ArchetypeRegistry } from '/systems/foundryvtt-swse/scripts/engine/archetype/archetype-registry.js';
import { L1SurveyController } from '/systems/foundryvtt-swse/scripts/mentor/mentor-survey-v2/l1-controller.js';
import { SESSION_SELECTION_KEY } from '/systems/foundryvtt-swse/scripts/mentor/mentor-survey-v2/contract.js';
import { canUseEditorialPreview } from '/systems/foundryvtt-swse/scripts/settings/mentor-survey-preview.js';

const DATA = 'systems/foundryvtt-swse/data/mentor-survey';
let contentPromise = null;
/** Content packs are static data: load once per page load. They are not game state and have no invalidation. */
function loadContent() {
  contentPromise ||= Promise.all([
    fetch(`${DATA}/l1.json`).then((r) => r.json()),
    fetch(`${DATA}/release-manifest.json`).then((r) => r.json()),
  ]).then(([pack, manifest]) => ({ pack, manifest })).catch((err) => { contentPromise = null; throw err; });
  return contentPromise;
}

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

  /** Persist the DRAFT into the progression session (session only; never an actor write). */
  _persist(shell) {
    const value = this._ctl?.serialize();
    if (value) shell?.progressionSession?.commitSelection?.(this.descriptor?.stepId || 'l1-survey', SESSION_SELECTION_KEY, value);
  }

  async onStepEnter(shell) {
    this._loadError = null;
    try {
      const { pack, manifest } = await loadContent();
      try { await ArchetypeRegistry.initialize?.(); } catch (_e) { /* lookup below fails closed for restricted children */ }
      const stored = shell?.progressionSession?.getSelection?.(SESSION_SELECTION_KEY) ?? null;
      this._ctl = new L1SurveyController({
        pack, manifest, preview: canUseEditorialPreview(),
        archetypeLookup: (id) => ArchetypeRegistry.getArchetype?.(id) ?? null,
      }, stored);
      this._ctl.sync({ classId: resolveClassId(shell), speciesKeys: resolveSpeciesKeys(shell) });
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
        await MentorTranslationIntegration.render({ text, container: element, mentor: this._ctl?.ctx?.classId || 'default', topic: 'l1-survey', force: true, signal });
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
    const total = this._ctl?.flow?.questions?.length ?? 5;
    return {
      mentorName: mentor?.name || null, mentorTitle: mentor?.title || mentor?.class || null,
      mentorPortraitMarkup: portraitMarkup(mentorPortrait, mentor?.name),
      phase: v.phase, seq: v.seq ?? 0, preview: v.preview === true,
      view: v.view || null, questionNumber: v.questionNumber ?? null, totalQuestions: total,
      reconfirm: v.reconfirm || null, staleNotice: v.staleNotice || null, selectedOptionId: v.selectedOptionId || null,
      canGoBack: v.canGoBack === true, progress: v.progress || { answered: 0, resolved: 0, total },
      progressDots: Array.from({ length: total }, (_, i) => ({ index: i + 1, isDone: i < (v.progress?.resolved ?? 0), isActive: i + 1 === v.questionNumber })),
      unavailableText: 'The Mentor interview is not available for this character right now. It is optional; continue when you are ready.',
    };
  }

  getSelection() {
    const c = this._ctl?.committed;
    return { selected: c ? ['l1'] : [], count: c ? 1 : 0, isComplete: Boolean(c) };
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
