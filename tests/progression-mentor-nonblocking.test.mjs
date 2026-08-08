import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// SWSE Progression UX — Mentor Sidecar / Zero-Blocking Narration.
//
// The architecture this pass hardens: the mentor watches the progression
// engine, but the progression engine never waits for the mentor. Almost all
// of this was already built (MentorRecommendationController's arbitration,
// MentorRail's DOM-only presentation + AbortController-based cancellation,
// MentorChoiceReactionRouter's synchronous fire-and-forget entry point) --
// see mentor-recommendation-architecture.test.mjs and
// mentor-translator-cancellation.test.mjs for that existing coverage.
//
// The two real gaps this pass found and fixed: L1SurveyStep.onDataReady()
// and ConfirmStep.afterRender() each sequentially AWAITED an Aurebesh/
// translation reveal loop. Both hooks are awaited by the render scheduler's
// in-flight lock (both the structural _onRender() path and the scoped
// work-surface updater share _maybeRunOnDataReady()/afterRender()), so a
// slow multi-element translation pass held that lock open -- any render
// request that arrived while it ran (a Next click, another survey answer)
// was queued behind a purely cosmetic reveal instead of executing on the
// next frame. Both hooks now kick off their translation pass without
// awaiting it, cancelling the previous pass via AbortController exactly the
// way MentorRail.speak() already does.
//
// This file: (a) proves those two fixes directly against the real plugin
// classes, (b) exercises the wider non-blocking contract (speech, focus,
// commit, recommendations, Ask Mentor, isAnimating) against the real
// MentorRail / MentorRecommendationController / MentorChoiceReactionRouter /
// ProgressionShell prototype methods, and (c) adds a static regression
// scanner that would have caught the two real bugs before they were fixed.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

registerFoundryPathLoader();
installFoundryShimGlobals();

globalThis.window = globalThis.window ?? { addEventListener: () => {}, removeEventListener: () => {} };
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.document = globalThis.document ?? {
  readyState: 'complete', addEventListener: () => {}, removeEventListener: () => {}, activeElement: null,
};
globalThis.HTMLElement = globalThis.HTMLElement ?? class FakeHTMLElement {};
globalThis.Element = globalThis.Element ?? globalThis.HTMLElement;
globalThis.foundry.applications = globalThis.foundry.applications ?? {
  api: {
    ApplicationV2: class ApplicationV2Stub { async close() { return this; } },
    HandlebarsApplicationMixin: (Base) => class extends Base {},
    DocumentSheetV2: class DocumentSheetV2Stub {},
    DialogV2: class DialogV2Stub {},
  },
  handlebars: { renderTemplate: async () => '' },
  ux: { TextEditor: { implementation: { enrichHTML: async (v) => v } } },
};

const { MentorRail } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/mentor-rail.js'
);
const {
  MentorRecommendationController,
  buildMentorContext,
} = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/mentor-recommendation-controller.js'
);
const { MentorChoiceReactionRouter } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/mentor-choice-reaction-router.js'
);
const { ProgressionShell } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-shell.js'
);
const { L1SurveyStep } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/l1-survey-step.js'
);
const { ConfirmStep } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/confirm-step.js'
);
const { MentorTranslationIntegration } = await import(
  '/systems/foundryvtt-swse/scripts/mentor/mentor-translation-integration.js'
);
const { AurebeshTranslator } = await import(
  '/systems/foundryvtt-swse/scripts/ui/dialogue/aurebesh-translator.js'
);
const { SuggestionService } = await import(
  '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js'
);
const { MentorAdvisoryCoordinator } = await import(
  '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-advisory-coordinator.js'
);
const { handleAskMentorWithSuggestions } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/mentor-step-integration.js'
);

/* ==================================================================== *
 * Helpers
 * ==================================================================== */

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

/** Fails fast with a clear message instead of hanging when a promise that
 * should resolve quickly turns out to be waiting on something it must not
 * wait on. */
function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} did not resolve within ${ms}ms — it is blocking on something it must not wait for`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Replace a class's static `render` method with a controllable stub: each
 * call is captured (including the abort signal passed to it) and only
 * settles when the test explicitly resolves/rejects it. Mirrors the real
 * contract (calls onComplete() before resolving). */
function stubRender(owner) {
  const calls = [];
  const original = owner.render;
  owner.render = (options = {}) => {
    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    const record = {
      options,
      signal: options.signal ?? null,
      resolve: () => { options.onComplete?.(); resolve(options.container); },
      reject: (err) => reject(err),
    };
    calls.push(record);
    return promise;
  };
  return { calls, restore: () => { owner.render = original; } };
}

/** Fake DOM element that satisfies MentorRail's `instanceof HTMLElement`
 * checks (_resolveDialogueContainer, presentMessage, setMood, afterRender). */
class FakeElement extends HTMLElement {
  constructor(props = {}) {
    super();
    this.tagName = props.tagName ?? 'DIV';
    this.dataset = props.dataset ?? {};
    this.textContent = props.textContent ?? '';
    this._children = props.children ?? {};
    this._attrs = {};
  }
  querySelector(sel) { return this._children[sel] ?? null; }
  setAttribute(name, value) { this._attrs[name] = value; }
  getAttribute(name) { return this._attrs[name] ?? null; }
}

/** Minimal MentorRail host: just enough DOM/state surface for speak() to
 * find its container and write state, without a real Foundry document. */
function makeRailShell() {
  const textEl = new FakeElement({ tagName: 'SPAN' });
  const container = new FakeElement({ tagName: 'DIV', children: { '[data-mentor-text]': textEl } });
  const mentorRegion = new FakeElement({ tagName: 'DIV' });
  const rootEl = {
    querySelector: (sel) => {
      if (sel === '[data-mentor-dialogue]') return container;
      if (sel === '[data-region="mentor-rail"]') return mentorRegion;
      return null;
    },
  };
  const domOnlyUpdates = { count: 0 };
  const structuralRenderCalls = [];
  const shell = {
    element: rootEl,
    getRootElement: () => rootEl,
    mentor: {
      currentDialogue: null, pendingDialogue: null, animationState: 'idle',
      isAnimating: false, mood: 'neutral', name: 'Mentor', mentorId: 'default',
    },
    renderScheduler: { noteDomOnlyMentorUpdate: () => { domOnlyUpdates.count += 1; } },
    render: (...args) => structuralRenderCalls.push({ kind: 'render', args }),
    requestRender: (...args) => { structuralRenderCalls.push({ kind: 'requestRender', args }); return Promise.resolve(); },
    progressionSession: null,
  };
  return { shell, container, textEl, domOnlyUpdates, structuralRenderCalls };
}

/** Minimal shell for MentorRecommendationController: a spy rail (records
 * what reached presentMessage) rather than the real MentorRail, since these
 * tests exercise the controller's/shell-method's fire-and-forget seams, not
 * MentorRail's own DOM-writing internals -- mirrors the fixture already
 * established in mentor-recommendation-architecture.test.mjs. */
function makeRecommendationShell({ stepId = 'general-feat' } = {}) {
  const structuralRenderCalls = [];
  const railCalls = [];
  const shell = {
    mode: 'chargen',
    actor: { id: 'actor-1', name: 'Era' },
    currentStepIndex: 0,
    steps: [{ stepId }],
    stepPlugins: new Map(),
    progressionSession: {
      draftSelections: {},
      currentStepId: stepId,
    },
    render: (...args) => structuralRenderCalls.push({ kind: 'render', args }),
    requestRender: (...args) => { structuralRenderCalls.push({ kind: 'requestRender', args }); return Promise.resolve(); },
    structuralRenderCalls,
  };
  shell.controller = new MentorRecommendationController(shell);
  shell.mentorRecommendations = shell.controller;
  shell.mentorRail = {
    calls: railCalls,
    presentMessage(message) { railCalls.push(message); return true; },
  };
  return shell;
}

/** Swap a static async method for the duration of a block. */
async function withStub(owner, methodName, impl, fn) {
  const original = owner[methodName];
  owner[methodName] = impl;
  try {
    return await fn();
  } finally {
    owner[methodName] = original;
  }
}

/* ==================================================================== *
 * TEST 1 / real fix — L1SurveyStep.onDataReady() cannot block the render
 * pipeline behind its inline Aurebesh translation pass. This is the actual
 * bug found in this pass: onDataReady() is awaited by
 * ProgressionShell._maybeRunOnDataReady(), which the render scheduler holds
 * its in-flight lock open for. A slow, sequentially-awaited translation
 * loop here delayed every subsequent render request (a Next click, another
 * survey answer) until the reveal finished.
 * ==================================================================== */
{
  const control = stubRender(MentorTranslationIntegration);
  try {
    const dialogueEl = { textContent: 'A survey line long enough to animate.', _translationApplied: false };
    const fakeElement = { querySelectorAll: (sel) => (sel === '[data-l1-survey-dialogue-text]' ? [dialogueEl] : []) };
    const shell = { element: fakeElement };

    const step = new L1SurveyStep({ stepId: 'l1-survey' });
    step._surveyDefinition = { classId: 'test-class' };
    step._surveyPhase = 'question';
    step._activeQuestionIndex = 0;

    const order = [];
    const onDataReadyPromise = step.onDataReady(shell).then(() => order.push('onDataReady-resolved'));

    // Must resolve WITHOUT the translation ever settling.
    await withTimeout(onDataReadyPromise, 200, 'L1SurveyStep.onDataReady()');
    assert.deepEqual(order, ['onDataReady-resolved']);
    assert.equal(control.calls.length, 1, 'the translation sidecar was never invoked');
    assert.equal(control.calls[0].signal?.aborted, false, 'a fresh sidecar pass should not start pre-aborted');

    // The sidecar keeps running in the background and completes normally.
    control.calls[0].resolve();
    await Promise.resolve(); await Promise.resolve();
  } finally {
    control.restore();
  }
}

/* ------------------------------------------------------------------ *
 * Same fix, ConfirmStep.afterRender() -- the chargen datapad header
 * translation pass.
 * ------------------------------------------------------------------ */
{
  const control = stubRender(AurebeshTranslator);
  try {
    const classes = new Set();
    const header = {
      textContent: 'IDENTITY RECORD',
      classList: { contains: (c) => classes.has(c), add: (c) => classes.add(c) },
    };
    const workSurfaceEl = { querySelectorAll: (sel) => (sel === '[data-translate-header]' ? [header] : []) };

    const step = new ConfirmStep({ stepId: 'confirm', mode: 'chargen' });
    const shell = {};

    const order = [];
    const afterRenderPromise = step.afterRender(shell, workSurfaceEl).then(() => order.push('afterRender-resolved'));

    await withTimeout(afterRenderPromise, 200, 'ConfirmStep.afterRender()');
    assert.deepEqual(order, ['afterRender-resolved']);
    assert.equal(control.calls.length, 1, 'the header translation sidecar was never invoked');

    control.calls[0].resolve();
    await Promise.resolve(); await Promise.resolve();
  } finally {
    control.restore();
  }
}

/* ------------------------------------------------------------------ *
 * The generic contract behind both fixes: _maybeRunOnDataReady() (shared
 * by the structural render path and the scoped work-surface updater) must
 * never wait for a plugin's own fire-and-forget mentor sidecar work, for
 * ANY step plugin that follows the pattern.
 * ------------------------------------------------------------------ */
{
  const shell = Object.create(ProgressionShell.prototype);
  Object.assign(shell, { _dataReadyToken: new Map(), _stepDataRevision: 0, _onDataReadyCalls: 0 });

  const gate = deferred();
  const order = [];
  const plugin = {
    async onDataReady() {
      void gate.promise.then(() => order.push('mentor-sidecar-settled'));
    },
  };

  await withTimeout(
    shell._maybeRunOnDataReady({ stepId: 'fixture-step' }, plugin).then(() => order.push('onDataReady-resolved')),
    200,
    'ProgressionShell._maybeRunOnDataReady()'
  );
  assert.deepEqual(order, ['onDataReady-resolved']);
  assert.equal(shell._onDataReadyCalls, 1);

  gate.resolve();
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(order, ['onDataReady-resolved', 'mentor-sidecar-settled']);
}

/* ==================================================================== *
 * TEST 4 / 11 / 12 — rapid supersession aborts stale speech, the newest
 * dialogue wins, and a superseded call cannot resurrect stale dialogue
 * even if its underlying promise resolves late. MentorRail.speak() is
 * exercised directly with a controllable translation stub; the actual
 * "does the reveal loop stop writing" mechanics are the real
 * AurebeshTranslator's job and are covered by
 * mentor-translator-cancellation.test.mjs -- what belongs to MentorRail is
 * that it creates a fresh AbortController, aborts the previous one, and
 * wires the new signal through on every call, which is what this proves.
 * ==================================================================== */
{
  const control = stubRender(MentorTranslationIntegration);
  try {
    const { shell } = makeRailShell();
    const rail = new MentorRail(shell);

    rail.queueSpeak('Species line.', 'neutral');
    await Promise.resolve();
    assert.equal(control.calls.length, 1);
    const signalA = control.calls[0].signal;
    assert.equal(signalA.aborted, false);

    rail.queueSpeak('Class line.', 'neutral');
    await Promise.resolve();
    assert.equal(signalA.aborted, true, 'starting a new line did not abort the superseded one');
    assert.equal(control.calls.length, 2);
    const signalB = control.calls[1].signal;
    assert.equal(signalB.aborted, false);

    rail.queueSpeak('Attributes line.', 'neutral');
    await Promise.resolve();
    assert.equal(signalB.aborted, true);
    assert.equal(control.calls.length, 3);
    const signalC = control.calls[2].signal;
    assert.equal(signalC.aborted, false, 'the newest (currently active) line must not be pre-aborted');

    // The newest line completes normally.
    control.calls[2].resolve();
    await Promise.resolve(); await Promise.resolve();
    assert.equal(shell.mentor.currentDialogue, 'Attributes line.');
    assert.equal(shell.mentor.isAnimating, false);

    // The two superseded lines finally settle late (a slow network/animation
    // actually finishing after being superseded). Their own onComplete
    // handlers check signal.aborted before touching shell state, so this
    // must NOT resurrect stale dialogue.
    control.calls[0].resolve();
    control.calls[1].resolve();
    await Promise.resolve(); await Promise.resolve();
    assert.equal(shell.mentor.currentDialogue, 'Attributes line.',
      'a superseded speak() resurrected stale dialogue after resolving late');
  } finally {
    control.restore();
  }
}

/* ==================================================================== *
 * TEST 7 — real translator/speak() failure is non-fatal: MentorRail
 * cleans its own state up and does not leave isAnimating stuck true.
 * ==================================================================== */
{
  const control = stubRender(MentorTranslationIntegration);
  try {
    const { shell } = makeRailShell();
    const rail = new MentorRail(shell);

    rail.queueSpeak('This line will fail to translate.', 'neutral');
    await Promise.resolve();
    assert.equal(control.calls.length, 1);
    assert.equal(shell.mentor.isAnimating, true);

    control.calls[0].reject(new Error('simulated translation failure'));
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();

    assert.equal(shell.mentor.isAnimating, false, 'isAnimating stuck true after a translation failure');
    assert.equal(shell.mentor.animationState, 'complete');
    assert.equal(shell.mentor.currentDialogue, 'This line will fail to translate.',
      'plain-text fallback was not applied after translation failure');
  } finally {
    control.restore();
  }
}

/* ==================================================================== *
 * TEST 8 — zero shell/structural renders and zero host-sheet renders
 * caused by a complete mentor speech cycle; only DOM-only mentor updates.
 * ==================================================================== */
{
  const control = stubRender(MentorTranslationIntegration);
  try {
    const { shell, structuralRenderCalls, domOnlyUpdates } = makeRailShell();
    const rail = new MentorRail(shell);

    rail.queueSpeak('Structural render budget check.', 'neutral');
    await Promise.resolve();
    control.calls[0].resolve();
    await Promise.resolve(); await Promise.resolve();

    assert.equal(structuralRenderCalls.length, 0, 'mentor speech triggered shell.render()/requestRender()');
    assert.ok(domOnlyUpdates.count >= 1, 'speak() never announced a DOM-only mentor update');
  } finally {
    control.restore();
  }
}

/* ==================================================================== *
 * TEST 2 / 3 — MentorChoiceReactionRouter.reactToInteraction() (the
 * commit/focus reaction seam) is a plain synchronous method that always
 * returns immediately (undefined, never a pending Promise the caller could
 * be tempted to await), regardless of a currently-animating mentor line or
 * how long its own internal reaction lookup takes -- it hands off to
 * _runReaction() with `void`. A commit or a focus change is never made to
 * wait on it.
 * ==================================================================== */
function makeRouterShell() {
  return {
    steps: [{ stepId: 'general-feat' }],
    currentStepIndex: 0,
    currentDescriptor: null,
    actor: { id: 'actor-router' },
    mentor: { mentorId: 'ol_salty', name: 'Ol Salty', isAnimating: true }, // deliberately "mid-speech"
    stepPlugins: new Map(),
    mentorRail: { presentMessage: () => true },
    mentorRecommendations: null,
    progressionSession: { currentStepId: 'general-feat' },
  };
}

{
  const router = new MentorChoiceReactionRouter(makeRouterShell());
  const commitReturn = router.reactToInteraction({
    stepId: 'general-feat', action: 'commit-item', actionName: 'commit-item', itemId: 'weapon-focus',
  });
  assert.equal(commitReturn, undefined, 'reactToInteraction() for a commit did not return synchronously');
  assert.equal(typeof commitReturn?.then, 'undefined', 'reactToInteraction() returned a thenable -- a caller could be made to await it');
}

{
  const router = new MentorChoiceReactionRouter(makeRouterShell());
  const focusReturn = router.reactToInteraction({
    stepId: 'general-feat', action: 'focus-item', actionName: 'focus-item', itemId: 'point-blank-shot',
  });
  assert.equal(focusReturn, undefined, 'reactToInteraction() for a focus change did not return synchronously');
}

/* ==================================================================== *
 * TEST 5 — a slow build recommendation cannot delay navigation, exercised
 * through the real ProgressionShell.prototype.requestMentorRecommendation()
 * seam (not just the controller directly, which
 * mentor-recommendation-architecture.test.mjs already covers exhaustively).
 * ==================================================================== */
{
  const shell = makeRecommendationShell();
  const gate = deferred();

  await withStub(SuggestionService, 'getBestRecommendation', () => gate.promise, async () => {
    // The real shell method -- not async, must return before advice exists.
    const returnValue = ProgressionShell.prototype.requestMentorRecommendation.call(shell, 'test-trigger');
    assert.equal(returnValue, undefined, 'requestMentorRecommendation() did not return synchronously');

    // The player "navigates" immediately -- nothing here is gated on the
    // still-pending recommendation.
    const playerActions = ['focus-other-card', 'navigate-forward'];
    assert.deepEqual(playerActions, ['focus-other-card', 'navigate-forward']);
    assert.equal(shell.mentorRail.calls?.length ?? 0, 0, 'advice appeared before it was resolved');

    gate.resolve({ id: 'feats:x', targetId: 'x', dialogue: 'x suits this build.', mood: 'encouraging' });
    // Let the fire-and-forget chain settle before leaving the stub scope.
    await shell.controller._inFlightByContext.get(shell.controller.lastContextSignature)
      ?? Promise.resolve();
    await Promise.resolve(); await Promise.resolve();
  });
}

/* ==================================================================== *
 * TEST 6 — a failed recommendation lookup does not throw out of the
 * fire-and-forget seam and leaves nothing displayed.
 * ==================================================================== */
{
  const shell = makeRecommendationShell();

  await withStub(SuggestionService, 'getBestRecommendation', async () => { throw new Error('simulated suggestion failure'); }, async () => {
    let threw = false;
    try {
      await shell.controller.requestRecommendation(buildMentorContext(shell));
    } catch (_err) {
      threw = true;
    }
    assert.equal(threw, false, 'a failed recommendation lookup escaped requestRecommendation()');
  });

  assert.equal(shell.mentorRail.calls.length, 0, 'a failed lookup still displayed something');
}

/* ==================================================================== *
 * TEST 9 — Ask Mentor's advisory lookup is non-blocking: pending, it must
 * not touch the render pipeline, and once resolved it presents through the
 * arbiter like any other message.
 * ==================================================================== */
{
  const shell = makeRecommendationShell();
  const gate = deferred();

  await withStub(MentorAdvisoryCoordinator, 'generateSuggestionAdvisory', () => gate.promise, async () => {
    const pending = handleAskMentorWithSuggestions(
      shell.actor, 'general-feat', [{ id: 'weapon-focus' }], shell, { domain: 'feats' }
    );

    // Still pending: nothing has been presented, and nothing touched the
    // render pipeline.
    await Promise.resolve();
    assert.equal(shell.mentorRail.calls.length, 0);
    assert.equal(shell.structuralRenderCalls.length, 0);

    gate.resolve({ observation: 'Sharp instincts.', impact: 'Feeds your damage output.', guidance: 'Take it.', mood: 'encouraging' });
    await withTimeout(pending, 200, 'handleAskMentorWithSuggestions()');
  });

  assert.equal(shell.mentorRail.calls.length, 1, 'the advisory was never presented once resolved');
  assert.equal(shell.structuralRenderCalls.length, 0, 'Ask Mentor triggered a shell render');
}

/* ==================================================================== *
 * TEST 10 — mentor.isAnimating governs mentor presentation only; it can
 * never disable a mechanical progression action. Runtime half: flip it on
 * and prove reactToInteraction() and _maybeRunOnDataReady() are unaffected
 * (already implicitly proven above, since makeRouterShell() sets
 * isAnimating: true throughout tests 2/3). Static half: no progression
 * control-flow file may gate on it.
 * ==================================================================== */
{
  const shell = Object.create(ProgressionShell.prototype);
  Object.assign(shell, { _dataReadyToken: new Map(), _stepDataRevision: 0, _onDataReadyCalls: 0, mentor: { isAnimating: true } });
  let dataReadyRan = false;
  await shell._maybeRunOnDataReady({ stepId: 'fixture' }, { async onDataReady() { dataReadyRan = true; } });
  assert.equal(dataReadyRan, true, 'onDataReady() did not run while mentor.isAnimating was true');
}

/* ==================================================================== *
 * STATIC AUDIT — no progression control-flow file directly awaits mentor
 * presentation work. This is the guard that would have caught the two real
 * bugs this pass fixed (L1SurveyStep.onDataReady(),
 * ConfirmStep.afterRender()) before they were fixed, and prevents the next
 * one. Files that ARE the mentor sidecar's own implementation are exempt --
 * MentorRail.speak() legitimately awaits its own translation call.
 * ==================================================================== */
const MENTOR_SIDECAR_FILES = new Set([
  'scripts/apps/progression-framework/shell/mentor-rail.js',
  'scripts/mentor/mentor-translation-integration.js',
  'scripts/ui/dialogue/aurebesh-translator.js',
  // The intro boot-sequence cinematic is the CONTENT of the intro step
  // itself, not something progression control flow waits on.
  'scripts/apps/progression-framework/engine/swse-translation-engine.js',
]);

const BLOCKING_AWAIT_PATTERNS = [
  { label: 'await mentorRail.speak(...)', re: /await\s+[\w$.]*mentorRail\s*\??\.\s*speak\s*\??\.?\s*\(/ },
  { label: 'await ....requestRecommendation(...)', re: /await\s+[\w$.]*requestRecommendation\s*\??\.?\s*\(/ },
  { label: 'await MentorTranslationIntegration.render(...)', re: /await\s+MentorTranslationIntegration\s*\??\.?\s*render\s*\??\.?\s*\(/ },
  { label: 'await AurebeshTranslator.render(...)', re: /await\s+AurebeshTranslator\s*\??\.?\s*render\s*\??\.?\s*\(/ },
];

// A tiny, explicit, line-scoped escape hatch (not a whole-file allowlist):
// a step's own fire-and-forgotten sidecar helper (kicked off with `void
// someHelper(...)`, never awaited by the lifecycle hook that calls it) may
// legitimately await its own translation call internally, exactly like
// MentorRail.speak() does. Marking the exact line makes that reviewable and
// keeps the scanner able to catch a NEW direct await anywhere else in the
// same file.
const SIDECAR_AWAIT_MARKER = 'mentor-sidecar-await-ok';

function scanProgressionFrameworkForBlockingMentorAwaits() {
  const root = path.join(ROOT, 'scripts/apps/progression-framework');
  const violations = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.js')) continue;
      const rel = path.relative(ROOT, full).split(path.sep).join('/');
      if (MENTOR_SIDECAR_FILES.has(rel)) continue;
      const lines = fs.readFileSync(full, 'utf8').split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const { label, re } of BLOCKING_AWAIT_PATTERNS) {
          if (!re.test(line)) continue;
          // The marker may sit on the awaited line itself or the line(s)
          // immediately before it (a comment explaining the await).
          const nearby = lines.slice(Math.max(0, i - 3), i + 1).join('\n');
          if (nearby.includes(SIDECAR_AWAIT_MARKER)) continue;
          violations.push({ file: rel, line: i + 1, pattern: label });
        }
      }
    }
  };
  walk(root);
  return violations;
}

{
  const violations = scanProgressionFrameworkForBlockingMentorAwaits();
  assert.deepEqual(violations, [],
    `progression control-flow file(s) directly await mentor presentation work: ${JSON.stringify(violations)}`);
}

/* Companion static check for the isAnimating half of Test 10: no
 * progression control-flow file (excluding the mentor sidecar and debug
 * instrumentation, which only ever READ it for logging) may gate a branch
 * on mentor.isAnimating. */
{
  const violations = [];
  const root = path.join(ROOT, 'scripts/apps/progression-framework');
  const ALLOWLIST = new Set([...MENTOR_SIDECAR_FILES, 'scripts/apps/progression-framework/debug/progression-debug-capture.js']);
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.js')) continue;
      const rel = path.relative(ROOT, full).split(path.sep).join('/');
      if (ALLOWLIST.has(rel)) continue;
      const content = fs.readFileSync(full, 'utf8');
      if (/if\s*\([^)]*\bisAnimating\b[^)]*\)\s*(\{[^}]*\breturn\b|return\b)/.test(content)) {
        violations.push(rel);
      }
    }
  };
  walk(root);
  assert.deepEqual(violations, [], `mentor.isAnimating gates a progression control-flow branch in: ${JSON.stringify(violations)}`);
}

console.log('progression-mentor-nonblocking: all assertions passed');
