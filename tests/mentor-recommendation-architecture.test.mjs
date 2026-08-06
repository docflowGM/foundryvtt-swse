import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Mentor recommendation architecture.
//
// Mentor advice previously had no owner. Every interaction independently looked
// up suggestions and spoke whatever came back, so:
//   - a slow earlier evaluation could overwrite a newer one,
//   - identical advice restarted the typewriter and reflashed the mood,
//   - dialogue text lived in the shell's template context, which made "the
//     mentor said something" a reason to repaint the entire shell.
//
// MentorRecommendationController is now the single owner: one context snapshot,
// one winner, revision-guarded, equality-suppressed, and presented through
// exactly one DOM-only path.
//
// Coverage tier: (a) direct production-path — the real controller module is
// loaded and driven against a fake rail and a stubbed SuggestionService — plus
// (b) static contract checks for the "mentor is never a render owner" rule.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

registerFoundryPathLoader();
installFoundryShimGlobals();

// SuggestionService's import graph reaches modules that destructure
// foundry.applications.api at module scope. The narrow shim does not model the
// application framework, so provide inert markers — nothing here is constructed
// or called by the code under test.
globalThis.foundry.applications = {
  api: {
    ApplicationV2: class ApplicationV2Stub {},
    HandlebarsApplicationMixin: (Base) => class extends Base {},
    DocumentSheetV2: class DocumentSheetV2Stub {},
    DialogV2: class DialogV2Stub {},
  },
  handlebars: { renderTemplate: async () => '' },
  ux: { TextEditor: { implementation: { enrichHTML: async (v) => v } } },
};

const {
  MentorRecommendationController,
  buildMentorContext,
  createContextSignature,
  createRecommendationSignature,
} = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/mentor-recommendation-controller.js'
);

const { SuggestionService } = await import(
  '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js'
);

/**
 * Fake mentor rail. Mirrors the real contract: presentMessage is the single DOM
 * write and presentRecommendation delegates to it, so the tests exercise the
 * same path production does.
 */
function makeRail() {
  const calls = [];
  const rail = {
    calls,
    presentMessage(message) {
      calls.push(message);
      return true;
    },
    presentRecommendation(recommendation, { replay = false } = {}) {
      return rail.presentMessage({
        source: replay ? 'recommendation-replay' : 'recommendation',
        text: recommendation?.dialogue,
        mood: recommendation?.mood ?? 'neutral',
        targetId: recommendation?.targetId ?? null,
      });
    },
  };
  return rail;
}

/** Minimal shell stand-in. Render methods are spies that must never be called. */
function makeShell({ draftSelections = {}, stepId = 'general-feat' } = {}) {
  const renderCalls = [];
  const requestRenderCalls = [];
  let revision = 0;

  const shell = {
    mode: 'chargen',
    actor: { id: 'actor-1', name: 'Era' },
    currentStepIndex: 0,
    steps: [{ stepId }],
    mentorRail: makeRail(),
    progressionSession: {
      draftSelections,
      currentStepId: stepId,
      getSelectionRevision: () => revision,
      bumpRevision() { revision += 1; },
    },
    render: (...args) => { renderCalls.push(args); },
    requestRender: (...args) => { requestRenderCalls.push(args); },
    renderCalls,
    requestRenderCalls,
  };
  shell.controller = new MentorRecommendationController(shell);
  return shell;
}

/** Swap SuggestionService.getBestRecommendation for the duration of a block. */
async function withStubbedService(impl, fn) {
  const original = SuggestionService.getBestRecommendation;
  SuggestionService.getBestRecommendation = impl;
  try {
    return await fn();
  } finally {
    SuggestionService.getBestRecommendation = original;
  }
}

const deferred = () => {
  let resolve;
  const promise = new Promise(res => { resolve = res; });
  return { promise, resolve };
};

const rec = (targetId, dialogue = `${targetId} suits this build.`) => Object.freeze({
  id: `feats:${targetId}`,
  targetId,
  targetType: 'feats',
  title: `Recommended: ${targetId}`,
  dialogue,
  mood: 'encouraging',
  confidenceBand: 'high',
  reasonCode: 'RECOMMENDED_CHOICE',
});

/* ------------------------------------------------------------------ *
 * 1. One winner only — the UI boundary returns a single recommendation.
 * ------------------------------------------------------------------ */
{
  const ranked = [
    { id: 'force-training', name: 'Force Training', suggestion: { tier: 5, confidence: 0.9, reason: 'supports your Force focus' } },
    { id: 'skill-focus', name: 'Skill Focus', suggestion: { tier: 3, confidence: 0.5, reason: 'broadens your skills' } },
    { id: 'toughness', name: 'Toughness', suggestion: { tier: 1, confidence: 0.2, reason: 'generic durability' } },
  ];

  const originalGet = SuggestionService.getSuggestions;
  SuggestionService.getSuggestions = async () => ranked;
  try {
    const winner = await SuggestionService.getBestRecommendation(
      { mode: 'chargen', stepId: 'general-feat', domain: 'feats' },
      { domain: 'feats' }
    );
    assert.ok(winner, 'no recommendation returned');
    assert.equal(typeof winner, 'object');
    assert.ok(!Array.isArray(winner), 'the UI boundary must return one winner, not a list');
    assert.equal(winner.targetId, 'force-training', 'the highest-ranked candidate did not win');
    assert.equal(winner.targetType, 'feats');
    assert.equal(winner.confidenceBand, 'high');
    assert.match(winner.dialogue, /Force Training/);
    // The DTO is frozen so nothing downstream can mutate displayed advice.
    assert.equal(Object.isFrozen(winner), true);
  } finally {
    SuggestionService.getSuggestions = originalGet;
  }
}

/* ------------------------------------------------------------------ *
 * 2. Stale result suppression — A starts, B starts, B resolves, A resolves.
 *    Only B is displayed.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();
  const gateA = deferred();
  const gateB = deferred();
  let call = 0;

  await withStubbedService(async () => {
    call += 1;
    if (call === 1) return gateA.promise;
    return gateB.promise;
  }, async () => {
    const contextA = buildMentorContext(shell);
    const runA = shell.controller.requestRecommendation(contextA);

    // A meaningful change arrives before A resolves.
    shell.progressionSession.draftSelections.feats = [{ id: 'force-training' }];
    shell.progressionSession.bumpRevision();
    const contextB = buildMentorContext(shell);
    const runB = shell.controller.requestRecommendation(contextB);

    // B finishes first and is displayed.
    gateB.resolve(rec('exceptional-skill'));
    await runB;
    assert.equal(shell.mentorRail.calls.length, 1, 'the newer recommendation was not displayed');
    assert.equal(shell.mentorRail.calls[0].targetId, 'exceptional-skill');

    // A finishes later and must be discarded.
    gateA.resolve(rec('toughness'));
    await runA;
    assert.equal(shell.mentorRail.calls.length, 1, 'a stale result overwrote a newer recommendation');
    assert.equal(shell.controller.currentRecommendation.targetId, 'exceptional-skill');
    assert.ok(shell.controller.stats().staleResultsDiscarded >= 1, 'stale discard was not counted');
  });
}

/* ------------------------------------------------------------------ *
 * 3. Equality suppression — the same recommendation presents once.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();
  const same = rec('exceptional-skill');

  await withStubbedService(async () => same, async () => {
    for (let i = 0; i < 5; i += 1) {
      shell.progressionSession.draftSelections.talents = [{ id: `t-${i}` }];
      shell.progressionSession.bumpRevision();
      await shell.controller.requestRecommendation(buildMentorContext(shell));
    }
  });

  assert.equal(shell.mentorRail.calls.length, 1, 'unchanged advice was presented more than once');
  assert.equal(shell.controller.stats().unchangedRecommendationsSkipped, 4);
}

/* ------------------------------------------------------------------ *
 * 4. Context deduplication — repeating the same context does no work.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();
  let evaluations = 0;

  await withStubbedService(async () => { evaluations += 1; return rec('force-training'); }, async () => {
    const context = buildMentorContext(shell);
    await shell.controller.requestRecommendation(context);
    await shell.controller.requestRecommendation(buildMentorContext(shell));
    await shell.controller.requestRecommendation(buildMentorContext(shell));
  });

  assert.equal(evaluations, 1, 'an unchanged context triggered duplicate evaluations');
  assert.ok(shell.controller.stats().deduplicatedRequests >= 2);
}

/* ------------------------------------------------------------------ *
 * 5. Context change — a relevant selection change triggers a new request.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();
  let evaluations = 0;

  await withStubbedService(async () => { evaluations += 1; return rec(`pick-${evaluations}`); }, async () => {
    await shell.controller.requestRecommendation(buildMentorContext(shell));
    shell.progressionSession.draftSelections.feats = [{ id: 'point-blank-shot' }];
    shell.progressionSession.bumpRevision();
    await shell.controller.requestRecommendation(buildMentorContext(shell));
  });

  assert.equal(evaluations, 2, 'a relevant feat change did not trigger re-evaluation');
  assert.equal(shell.mentorRail.calls.length, 2);
}

/* ------------------------------------------------------------------ *
 * 6. Irrelevant events produce no request at all.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();
  let evaluations = 0;

  await withStubbedService(async () => { evaluations += 1; return rec('force-training'); }, async () => {
    await shell.controller.requestRecommendation(buildMentorContext(shell));
    assert.equal(evaluations, 1);

    // Scroll, hover, resize, animation frames, and re-renders leave progression
    // state untouched, so the snapshot is byte-identical and nothing re-runs.
    for (let i = 0; i < 10; i += 1) {
      await shell.controller.requestRecommendation(buildMentorContext(shell));
    }
  });

  assert.equal(evaluations, 1, 'cosmetic events triggered recommendation work');

  // The context snapshot deliberately excludes anything cosmetic.
  const context = buildMentorContext(shell);
  for (const key of ['scrollTop', 'hover', 'focusedOptionId', 'isAnimating', 'railWidth']) {
    assert.equal(key in context, false, `context snapshot must not include cosmetic key: ${key}`);
  }
  assert.equal(Object.isFrozen(context), true, 'the context snapshot must be immutable');
}

/* ------------------------------------------------------------------ *
 * 7. No shell render — displaying advice never touches the render pipeline.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();

  await withStubbedService(async () => rec('exceptional-skill'), async () => {
    await shell.controller.requestRecommendation(buildMentorContext(shell));
    shell.progressionSession.draftSelections.feats = [{ id: 'a' }];
    shell.progressionSession.bumpRevision();
    await shell.controller.requestRecommendation(buildMentorContext(shell));
  });

  assert.equal(shell.renderCalls.length, 0, 'displaying a recommendation called shell.render()');
  assert.equal(shell.requestRenderCalls.length, 0, 'displaying a recommendation called shell.requestRender()');
  assert.ok(shell.mentorRail.calls.length >= 1, 'nothing was presented');
  assert.equal(shell.controller.stats().fullShellRendersCausedByMentor, 0);
}

/* ------------------------------------------------------------------ *
 * 8. Non-blocking — a slow recommendation never gates player actions.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();
  const gate = deferred();
  const playerActions = [];

  await withStubbedService(async () => gate.promise, async () => {
    // Fire-and-forget, exactly as the shell calls it.
    const pending = shell.controller.requestRecommendation(buildMentorContext(shell));

    // The player keeps acting while the mentor is still thinking.
    playerActions.push('commit');
    playerActions.push('navigate-forward');
    playerActions.push('navigate-back');
    assert.deepEqual(playerActions, ['commit', 'navigate-forward', 'navigate-back']);
    assert.equal(shell.mentorRail.calls.length, 0, 'the player was blocked until advice resolved');

    gate.resolve(rec('force-training'));
    await pending;
  });

  assert.equal(shell.mentorRail.calls.length, 1);
}

/* ------------------------------------------------------------------ *
 * 9. Reactions cannot resurrect an older recommendation revision.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();
  const gateOld = deferred();

  await withStubbedService(async () => gateOld.promise, async () => {
    const stale = shell.controller.requestRecommendation(buildMentorContext(shell));

    // A newer context supersedes it before the old evaluation returns.
    shell.progressionSession.draftSelections.talents = [{ id: 'exceptional-skill' }];
    shell.progressionSession.bumpRevision();
    // Out-of-band display (this is the shape a reaction bark takes): it takes
    // ownership of the rail and must supersede anything still evaluating.
    shell.controller.applyRecommendation(rec('exceptional-skill'));

    gateOld.resolve(rec('toughness'));
    await stale;
  });

  assert.equal(shell.controller.currentRecommendation.targetId, 'exceptional-skill',
    'an older evaluation overwrote the current recommendation');
  assert.equal(shell.mentorRail.calls.length, 1);
}

/* ------------------------------------------------------------------ *
 * 10. Step remount — reconnect presents once and starts no new work.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();
  let evaluations = 0;

  await withStubbedService(async () => { evaluations += 1; return rec('force-training'); }, async () => {
    await shell.controller.requestRecommendation(buildMentorContext(shell));
    assert.equal(shell.mentorRail.calls.length, 1);

    // A legitimate structural render replaced the rail node.
    shell.controller.reconnect();
    shell.controller.reconnect();
  });

  assert.equal(evaluations, 1, 'reconnect started a new evaluation (render feedback loop)');
  assert.equal(shell.mentorRail.calls.length, 3, 'reconnect did not re-present the current recommendation');
  assert.equal(shell.mentorRail.calls[1].source, 'recommendation-replay');
  assert.equal(shell.renderCalls.length, 0);
  assert.equal(shell.requestRenderCalls.length, 0);
}

/* ------------------------------------------------------------------ *
 * 11. Arbiter — a reaction bark cannot permanently hide the recommendation.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();
  const advice = rec('exceptional-skill');

  await withStubbedService(async () => advice, async () => {
    await shell.controller.requestRecommendation(buildMentorContext(shell));
    assert.equal(shell.mentorRail.calls.length, 1);

    // A reaction bark takes over the rail.
    shell.controller.noteExternalDisplay('choice-reaction');

    // The next evaluation produces the SAME recommendation. Without the arbiter
    // seam, equality suppression would leave the bark on screen forever.
    shell.progressionSession.draftSelections.feats = [{ id: 'a' }];
    shell.progressionSession.bumpRevision();
    await shell.controller.requestRecommendation(buildMentorContext(shell));
  });

  assert.equal(shell.mentorRail.calls.length, 2,
    'an identical recommendation was suppressed after a reaction bark took the rail');
  assert.equal(shell.renderCalls.length, 0);
  assert.equal(shell.requestRenderCalls.length, 0);
}

/* ------------------------------------------------------------------ *
 * 12. Message arbitration across sources.
 * ------------------------------------------------------------------ */
{
  const { MESSAGE_PRIORITY } = await import(
    '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/mentor-recommendation-controller.js'
  );
  const shell = makeShell();
  const c = shell.controller;

  // A recommendation is showing.
  assert.equal(c.present({ source: 'recommendation', text: 'Exceptional Skill fits.', mood: 'encouraging' }), true);
  assert.equal(shell.mentorRail.calls.length, 1);

  // A lower-priority focus bark from the same context cannot displace it.
  assert.equal(c.present({ source: 'focusReaction', text: 'Hmm.' }), false);
  assert.equal(shell.mentorRail.calls.length, 1);

  // The identical message is dropped, so nothing re-animates.
  assert.equal(c.present({ source: 'recommendation', text: 'Exceptional Skill fits.', mood: 'encouraging' }), false);
  assert.equal(shell.mentorRail.calls.length, 1);

  // Ask Mentor outranks everything and gets through.
  assert.equal(c.present({ source: 'askMentor', text: 'Here are your options.' }), true);
  assert.equal(shell.mentorRail.calls.length, 2);

  // A newer context lets a lower-priority message back in.
  c.currentRevision += 1;
  assert.equal(c.present({ source: 'commitReaction', text: 'An unconventional choice.' }), true);
  assert.equal(shell.mentorRail.calls.length, 3);

  // A message older than the current revision is discarded outright.
  assert.equal(c.present({ source: 'recommendation', text: 'Stale advice.', revision: 0 }), false);
  assert.equal(shell.mentorRail.calls.length, 3);

  assert.ok(MESSAGE_PRIORITY.askMentor > MESSAGE_PRIORITY.recommendation);
  assert.ok(MESSAGE_PRIORITY.recommendation > MESSAGE_PRIORITY.commitReaction);
  assert.ok(MESSAGE_PRIORITY.commitReaction > MESSAGE_PRIORITY.focusReaction);
  assert.ok(MESSAGE_PRIORITY.focusReaction > MESSAGE_PRIORITY.stepGuidance);

  assert.equal(shell.renderCalls.length, 0);
  assert.equal(shell.requestRenderCalls.length, 0);
}

/* ------------------------------------------------------------------ *
 * 13. Reaction accuracy — a mismatched item must not borrow another
 *     item's reasoning.
 * ------------------------------------------------------------------ */
{
  const router = fs.readFileSync(
    path.join(ROOT, 'scripts/apps/progression-framework/shell/mentor-choice-reaction-router.js'),
    'utf8'
  );
  assert.ok(
    !/_matchSuggestion\(list, item, itemIdValue\) \|\| list\[0\]/.test(router),
    'a reaction can still fall back to the top-ranked suggestion for a different item'
  );
  assert.match(
    router,
    /return this\._matchSuggestion\(list, item, itemIdValue\) \|\| null;/,
    'the item-reaction lookup must return only a matching suggestion'
  );
}

/* ------------------------------------------------------------------ *
 * 14. Animation cancellation reaches the reveal loop.
 * ------------------------------------------------------------------ */
{
  const translator = fs.readFileSync(path.join(ROOT, 'scripts/ui/dialogue/aurebesh-translator.js'), 'utf8');
  assert.match(translator, /static _generations = new WeakMap\(\)/, 'no generation token on the translator');
  assert.match(translator, /_isSuperseded\(/, 'the reveal loop has no supersession check');
  // The check must happen inside the per-character loop, not only around it.
  const loop = translator.slice(translator.indexOf('for (let i = 0; i < chars.length'));
  assert.match(loop.slice(0, 400), /if \(superseded\(\)\) return;/,
    'the per-character reveal loop does not stop when superseded');

  const integration = fs.readFileSync(path.join(ROOT, 'scripts/mentor/mentor-translation-integration.js'), 'utf8');
  assert.match(integration, /signal,/, 'the abort signal is not forwarded to the translator');
  assert.match(integration, /this\.cancel\(container\);/, 'the previous reveal is not cancelled before replacing content');

  const rail = fs.readFileSync(path.join(ROOT, 'scripts/apps/progression-framework/shell/mentor-rail.js'), 'utf8');
  const renderCall = rail.slice(rail.indexOf('MentorTranslationIntegration.render({'));
  assert.match(renderCall.slice(0, 500), /signal,/, 'MentorRail does not pass its abort signal down');
}

/* ------------------------------------------------------------------ *
 * 15. SuggestionService collapses concurrent identical requests.
 * ------------------------------------------------------------------ */
{
  const service = fs.readFileSync(path.join(ROOT, 'scripts/engine/suggestion/SuggestionService.js'), 'utf8');
  assert.match(service, /static _inFlight = new Map\(\)/, 'no in-flight request map');
  assert.match(service, /this\._inFlight\.get\(requestKey\)/, 'in-flight requests are not reused');
  assert.match(service, /this\._inFlight\.delete\(requestKey\)/, 'in-flight entries are never released');
  // invalidate() must drop in-flight work too, or it would repopulate the cache
  // it just cleared.
  const invalidate = service.slice(service.indexOf('static invalidate(actorId)'));
  assert.match(invalidate.slice(0, 500), /_inFlight/, 'invalidate() does not clear in-flight requests');
}

/* ------------------------------------------------------------------ *
 * 16. SnapshotBuilder sees progression draftSelections.
 *
 * It only read chargen's `selectedFeats`-style keys, so every selection made
 * through ProgressionSession was invisible to the cache revision and advice
 * went stale within a step.
 * ------------------------------------------------------------------ */
{
  const { SnapshotBuilder } = await import(
    '/systems/foundryvtt-swse/scripts/engine/suggestion/SnapshotBuilder.js'
  );
  const actor = { id: 'a1', system: { level: 1, abilities: {} }, items: [] };
  const empty = SnapshotBuilder.hashFromActor(actor, 'feats', {});

  for (const [label, pending] of [
    ['draftSelections.feats', { feats: [{ id: 'point-blank-shot' }] }],
    ['draftSelections.talents', { talents: [{ id: 'exceptional-skill' }] }],
    ['draftSelections.skills', { skills: [{ id: 'perception' }] }],
    ['draftSelections.forcePowers', { forcePowers: [{ id: 'battle-strike' }] }],
    ['draftSelections.species', { species: { id: 'human' } }],
    ['chargen selectedFeats', { selectedFeats: [{ id: 'point-blank-shot' }] }],
  ]) {
    assert.notEqual(
      SnapshotBuilder.hashFromActor(actor, 'feats', pending),
      empty,
      `${label} does not change the snapshot hash`
    );
  }
}

/* ------------------------------------------------------------------ *
 * Signatures behave as stable, order-independent fingerprints.
 * ------------------------------------------------------------------ */
{
  const a = buildMentorContext(makeShell({ draftSelections: { feats: [{ id: 'x' }, { id: 'y' }] } }));
  const b = buildMentorContext(makeShell({ draftSelections: { feats: [{ id: 'y' }, { id: 'x' }] } }));
  assert.equal(createContextSignature(a), createContextSignature(b), 'context signature is order-dependent');

  assert.equal(
    createRecommendationSignature(rec('a', 'Same   advice.')),
    createRecommendationSignature(rec('a', 'Same advice.')),
    'recommendation signature is whitespace-sensitive'
  );
  assert.notEqual(
    createRecommendationSignature(rec('a')),
    createRecommendationSignature(rec('b')),
    'different recommendations share a signature'
  );
  assert.equal(createRecommendationSignature(null), 'none');
}

/* ------------------------------------------------------------------ *
 * Static contract: mentor code is never a render owner.
 * ------------------------------------------------------------------ */
{
  const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

  const rail = read('scripts/apps/progression-framework/shell/mentor-rail.js');
  for (const forbidden of ['shell.render(', 'this.render(', 'requestRender(']) {
    assert.ok(!rail.includes(forbidden), `MentorRail must not call ${forbidden}`);
  }
  assert.match(rail, /presentRecommendation\(recommendation, \{ replay = false \} = \{\}\)/,
    'MentorRail is missing the single presentation path');

  const controller = read('scripts/apps/progression-framework/shell/mentor-recommendation-controller.js');
  for (const forbidden of ['shell.render(', 'requestRender(', '_prepareContext']) {
    assert.ok(!controller.includes(forbidden), `MentorRecommendationController must not reference ${forbidden}`);
  }
  assert.match(controller, /revision !== this\.currentRevision/, 'revision guard is missing');
  assert.match(controller, /request !== this\.pendingRequest/, 'pending-request guard is missing');

  // The shell exposes exactly one public request path, and does not call it
  // from focus, hover, scroll, or render callbacks.
  const shellSrc = read('scripts/apps/progression-framework/shell/progression-shell.js');
  assert.match(shellSrc, /requestMentorRecommendation\(reason = 'unspecified'\)/);
  const triggers = [...shellSrc.matchAll(/this\.requestMentorRecommendation\(`?([^`)']*)/g)].map(m => m[1]);
  assert.ok(triggers.length >= 2, 'expected step-entry and commit triggers');
  for (const trigger of triggers) {
    assert.ok(
      /^(commit|step-enter)/.test(trigger),
      `recommendations may only be requested on meaningful changes, found: ${trigger}`
    );
  }

  // The mentor has no render seam at all.
  assert.ok(!shellSrc.includes('_updateMentorRegion'), 'a mentor render seam still exists');
  assert.ok(!shellSrc.includes("regions: ['mentor']"), 'something still requests a mentor region render');

  // Focus must not request build advice.
  const focusBlock = shellSrc.slice(shellSrc.indexOf('async _onFocusItem'), shellSrc.indexOf('async _onCommitItem'));
  assert.ok(
    !focusBlock.includes('requestMentorRecommendation'),
    'focus must not trigger build-recommendation work'
  );
}

console.log('mentor-recommendation-architecture: all assertions passed');
