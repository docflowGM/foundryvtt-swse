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
  PRESENTATION,
  isArbitratedMessage,
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
function makeRail(shellRef = null) {
  const calls = [];
  const rail = {
    calls,
    mounted: true,
    shell: shellRef,
    // Mirrors MentorRail: an unarbitrated message is counted, not trusted.
    // Mirrors MentorRail: unauthorized messages are counted and REFUSED.
    presentMessage(message) {
      if (!isArbitratedMessage(message)) {
        rail.shell?.mentorRecommendations?.noteDirectBypass?.({ source: message?.source ?? 'unknown' });
        return 'unauthorized';
      }
      calls.push(message);
      return rail.mounted;
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
  // The rail reaches the controller the same way production does.
  shell.mentorRecommendations = shell.controller;
  shell.mentorRail.shell = shell;
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
    assert.equal(shell.controller.evaluatedRecommendation.targetId, 'exceptional-skill');
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

  assert.equal(shell.controller.evaluatedRecommendation.targetId, 'exceptional-skill',
    'an older evaluation overwrote the current recommendation');
  assert.equal(shell.mentorRail.calls.length, 1);
}

/* ------------------------------------------------------------------ *
 * 10. Step remount — reconnect restores once per mounted node, through the
 *     arbiter, and starts no new work.
 *
 * The previous version of this test asserted three rail writes after two
 * reconnects, which encoded the defect: reconnect() called the rail directly and
 * replayed on every call, restarting the typewriter each time.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();
  let evaluations = 0;

  // A mounted node whose identity the controller can pin the replay to.
  let node = {};
  shell.mentorRail._resolveDialogueContainer = () => node;

  await withStubbedService(async () => { evaluations += 1; return rec('force-training'); }, async () => {
    await shell.controller.requestRecommendation(buildMentorContext(shell));
    assert.equal(shell.mentorRail.calls.length, 1);

    // A legitimate structural render replaced the rail node.
    node = {};
    assert.equal(shell.controller.reconnect(), PRESENTATION.DISPLAYED);
    // Calling it again against the SAME node must not touch the DOM.
    assert.equal(shell.controller.reconnect(), PRESENTATION.REJECTED_DUPLICATE);
  });

  assert.equal(evaluations, 1, 'reconnect started a new evaluation (render feedback loop)');
  assert.equal(shell.mentorRail.calls.length, 2, 'reconnect must replay exactly once per new mount');
  assert.equal(shell.controller.stats().reconnectsSkipped, 1);
  assert.equal(shell.renderCalls.length, 0);
  assert.equal(shell.requestRenderCalls.length, 0);
  // The replay went through the arbiter, so it carries the ownership token.
  assert.ok(isArbitratedMessage(shell.mentorRail.calls[1]), 'the replay was not authorized by the arbiter');
  assert.equal(shell.controller.stats().directBypassCount, 0);
}

/* ------------------------------------------------------------------ *
 * 10b. Reconnect preserves the higher-priority message that owned the rail.
 *
 * A structural render must not silently demote a live Ask Mentor line back to
 * the build recommendation underneath it.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();
  let node = {};
  shell.mentorRail._resolveDialogueContainer = () => node;
  const c = shell.controller;

  await withStubbedService(async () => rec('force-training'), async () => {
    await c.requestRecommendation(buildMentorContext(shell));
  });
  assert.equal(c.present({ source: 'askMentor', text: 'Here are your options.' }), PRESENTATION.DISPLAYED);

  node = {};
  assert.equal(c.reconnect(), PRESENTATION.DISPLAYED);

  const restored = shell.mentorRail.calls.at(-1);
  assert.equal(restored.source, 'askMentor', 'reconnect replaced Ask Mentor with the recommendation');
  assert.equal(restored.text, 'Here are your options.');
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
  assert.equal(c.present({ source: 'recommendation', text: 'Exceptional Skill fits.', mood: 'encouraging' }), PRESENTATION.DISPLAYED);
  assert.equal(shell.mentorRail.calls.length, 1);

  // A lower-priority focus bark from the same context cannot displace it, and
  // the reason it lost is reported rather than folded into a bare false.
  assert.equal(c.present({ source: 'focusReaction', text: 'Hmm.' }), PRESENTATION.REJECTED_PRIORITY);
  assert.equal(shell.mentorRail.calls.length, 1);

  // The identical message is dropped, so nothing re-animates.
  assert.equal(
    c.present({ source: 'recommendation', text: 'Exceptional Skill fits.', mood: 'encouraging' }),
    PRESENTATION.REJECTED_DUPLICATE
  );
  assert.equal(shell.mentorRail.calls.length, 1);

  // Ask Mentor outranks everything and gets through.
  assert.equal(c.present({ source: 'askMentor', text: 'Here are your options.' }), PRESENTATION.DISPLAYED);
  assert.equal(shell.mentorRail.calls.length, 2);

  // A newer context lets a lower-priority message back in.
  c.currentRevision += 1;
  assert.equal(c.present({ source: 'commitReaction', text: 'An unconventional choice.' }), PRESENTATION.DISPLAYED);
  assert.equal(shell.mentorRail.calls.length, 3);

  // A message older than the current revision is discarded outright.
  assert.equal(c.present({ source: 'recommendation', text: 'Stale advice.', revision: 0 }), PRESENTATION.REJECTED_STALE);
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
  // it just cleared. Read the whole method body rather than a fixed character
  // window, which a comment could push the assertion out of.
  const invalidateStart = service.indexOf('static invalidate(actorId)');
  assert.ok(invalidateStart > -1, 'invalidate() is gone');
  const invalidate = service.slice(
    invalidateStart,
    service.indexOf('\n  }', invalidateStart)
  );
  assert.match(invalidate, /_inFlight/, 'invalidate() does not clear in-flight requests');
  assert.match(invalidate, /this\._generation \+= 1/,
    'invalidate() does not bump the generation, so a request already running can still cache its pre-invalidation result');
}

/* ------------------------------------------------------------------ *
 * 15b. In-flight deduplication actually collapses concurrent work,
 *      and different revisions do not join.
 * ------------------------------------------------------------------ */
{
  const actor = { id: 'dedupe-actor', documentName: 'Actor', system: { level: 1, abilities: {} }, items: [] };
  const original = SuggestionService._computeSuggestions;
  let computations = 0;

  SuggestionService._computeSuggestions = async () => {
    computations += 1;
    await new Promise(resolve => setTimeout(resolve, 20));
    return [{ id: 'force-training', name: 'Force Training', suggestion: { tier: 5, confidence: 0.9 } }];
  };

  try {
    SuggestionService._cache.clear();
    SuggestionService._inFlight.clear();

    // Two identical uncached requests issued concurrently.
    const [a, b] = await Promise.all([
      SuggestionService.getSuggestions(actor, 'chargen', { domain: 'feats', pendingData: {} }),
      SuggestionService.getSuggestions(actor, 'chargen', { domain: 'feats', pendingData: {} }),
    ]);

    assert.equal(computations, 1, 'identical concurrent requests ran the evaluation twice');
    assert.equal(a, b, 'joined callers did not receive the same result');
    assert.equal(SuggestionService._inFlight.size, 0, 'the in-flight entry was never released');

    // A different pending selection is a different revision and must not join.
    SuggestionService._cache.clear();
    await Promise.all([
      SuggestionService.getSuggestions(actor, 'chargen', { domain: 'feats', pendingData: {} }),
      SuggestionService.getSuggestions(actor, 'chargen', { domain: 'feats', pendingData: { feats: [{ id: 'point-blank-shot' }] } }),
    ]);
    assert.equal(computations, 3, 'a changed selection incorrectly joined an in-flight request');

    // A failing computation must still release its slot.
    SuggestionService._cache.clear();
    SuggestionService._inFlight.clear();
    SuggestionService._computeSuggestions = async () => { throw new Error('boom'); };
    await assert.rejects(() => SuggestionService.getSuggestions(actor, 'chargen', { domain: 'talents', pendingData: {} }));
    assert.equal(SuggestionService._inFlight.size, 0, 'a failed request left a stale in-flight entry');
  } finally {
    SuggestionService._computeSuggestions = original;
    SuggestionService._cache.clear();
    SuggestionService._inFlight.clear();
  }
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
 * 17. Static ownership guard — the low-level rail sink has one caller.
 *
 * "Single message owner" is only real if it is enforced. This fails the build
 * when ordinary progression code speaks directly instead of going through the
 * arbiter, which is exactly how step guidance and Ask Mentor drifted out of the
 * policy while the docs claimed otherwise.
 * ------------------------------------------------------------------ */
{
  // Files permitted to touch MentorRail.queueSpeak()/speak() directly.
  const ALLOWED = new Map([
    // The arbiter itself: this IS the owner.
    ['scripts/apps/progression-framework/shell/mentor-recommendation-controller.js',
     'the message arbiter — the single legitimate caller'],
    // The rail's own internals: pending pre-mount dialogue, post-remount replay,
    // and the plain-text error fallback cannot participate in message ordering
    // because they run when there is no live message to order.
    ['scripts/apps/progression-framework/shell/mentor-rail.js',
     'internal pending-DOM recovery and presentMessage sink'],
    // Documented last-resort path used only when no controller exists on the
    // shell (older embedded hosts); see mentor-choice-reaction-router._speak.
    ['scripts/apps/progression-framework/shell/mentor-choice-reaction-router.js',
     'documented emergency fallback when no controller is attached'],
  ]);

  const sinkCall = /(?<![\w.])(?:\w+\??\.)*(?:queueSpeak|speak)\??\.?\(/;
  const offenders = [];

  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) { walk(full); continue; }
      if (!full.endsWith('.js')) continue;
      const rel = path.relative(ROOT, full).replaceAll('\\', '/');
      if (ALLOWED.has(rel)) continue;

      for (const [index, line] of fs.readFileSync(full, 'utf8').split('\n').entries()) {
        const trimmed = line.trim();
        // Comments and log statements are not calls.
        if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;
        if (/console\.(log|warn|error|debug)/.test(line)) continue;
        if (!/mentorRail|\brail\b/.test(line)) continue;
        if (sinkCall.test(line)) offenders.push(`${rel}:${index + 1}  ${trimmed.slice(0, 90)}`);
      }
    }
  };
  walk(path.join(ROOT, 'scripts/apps/progression-framework'));

  assert.deepEqual(
    offenders,
    [],
    'mentor messages must go through MentorRecommendationController, not MentorRail directly:\n  ' + offenders.join('\n  ')
  );

  // And the arbiter really is wired to the sink.
  const controller = fs.readFileSync(
    path.join(ROOT, 'scripts/apps/progression-framework/shell/mentor-recommendation-controller.js'), 'utf8');
  for (const method of ['presentStepGuidance', 'presentFocusReaction', 'presentCommitReaction', 'presentAskMentor']) {
    assert.match(controller, new RegExp(`${method}\\(`), `controller is missing ${method}()`);
  }
}

/* ------------------------------------------------------------------ *
 * 18. Step identity is part of staleness.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell({ stepId: 'general-feat' });
  const c = shell.controller;

  assert.equal(c.presentStepGuidance({ text: 'Pick a feat.', stepId: 'general-feat' }), PRESENTATION.DISPLAYED);
  assert.equal(shell.mentorRail.calls.length, 1);

  // The player moves on; a late message for the previous step must not speak,
  // even at the highest priority.
  shell.steps = [{ stepId: 'general-talent' }];
  shell.progressionSession.currentStepId = 'general-talent';

  assert.notEqual(c.presentStepGuidance({ text: 'Late guidance for the old step.', stepId: 'general-feat' }), PRESENTATION.DISPLAYED);
  assert.notEqual(c.presentAskMentor({ text: 'Late Ask Mentor for the old step.', stepId: 'general-feat' }), PRESENTATION.DISPLAYED);
  assert.equal(shell.mentorRail.calls.length, 1, 'a message from the previous step spoke');

  // The new step can speak.
  assert.equal(c.presentStepGuidance({ text: 'Pick a talent.', stepId: 'general-talent' }), PRESENTATION.DISPLAYED);
  assert.equal(shell.mentorRail.calls.length, 2);
}

/* ------------------------------------------------------------------ *
 * 19. Delayed guidance cannot overwrite a recommendation, and Ask Mentor
 *     outranks a same-revision recommendation.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell({ stepId: 'general-feat' });
  const c = shell.controller;
  const revision = c.currentRevision;

  // Guidance starts, recommendation lands first.
  c.present({ source: 'recommendation', text: 'Exceptional Skill is the strongest fit.',
              stepId: 'general-feat', targetId: 'exceptional-skill', revision, temporary: false });
  assert.equal(shell.mentorRail.calls.length, 1);

  // The slow guidance now resolves — lower priority, same revision.
  assert.notEqual(c.presentStepGuidance({ text: 'Choose a feat that fits your build.', stepId: 'general-feat', revision }), PRESENTATION.DISPLAYED,
    'delayed step guidance overwrote a live recommendation'
  );
  assert.equal(shell.mentorRail.calls.length, 1);

  // Ask Mentor outranks the recommendation at the same revision.
  assert.equal(
    c.presentAskMentor({ text: 'Here are your strongest options.', stepId: 'general-feat', revision }),
    PRESENTATION.DISPLAYED
  );
  assert.equal(shell.mentorRail.calls.length, 2);

  // And an older recommendation cannot take the rail back from Ask Mentor.
  assert.equal(
    c.present({ source: 'recommendation', text: 'A different recommendation.',
                stepId: 'general-feat', targetId: 'other', revision: revision - 1, temporary: false }),
    PRESENTATION.REJECTED_STALE,
    'a stale recommendation displaced an Ask Mentor message'
  );
  assert.equal(shell.mentorRail.calls.length, 2);
  assert.equal(shell.renderCalls.length, 0);
  assert.equal(shell.requestRenderCalls.length, 0);
}

/* ------------------------------------------------------------------ *
 * 20. The audit harness exposes the three invariants and mutates nothing.
 * ------------------------------------------------------------------ */
{
  const src = fs.readFileSync(
    path.join(ROOT, 'scripts/apps/progression-framework/debug/progression-render-stats.js'), 'utf8');

  assert.match(src, /export function progressionMentorAudit\(/);
  assert.match(src, /export function resetProgressionMentorAudit\(/);
  assert.match(src, /SWSE\.debug\.progressionMentorAudit = progressionMentorAudit/);
  assert.match(src, /SWSE\.debug\.resetProgressionMentorAudit = resetProgressionMentorAudit/);

  // Every field the audit is specified to report.
  for (const field of [
    'stepId', 'activationToken', 'fullRenders', 'partialRenders',
    // Renamed to what it actually counts: total scheduler executions, plus a
    // real deferred-flush counter alongside it.
    'schedulerExecutions', 'deferredRenderFlushes',
    'duplicateRenderRequestsCoalesced', 'onDataReadyCalls',
    'revision', 'activeSource', 'activeStepId', 'activeTargetId', 'activeSignature',
    // Evaluated, displayed and persistent are three different things.
    'evaluatedRecommendationTarget', 'displayedRecommendationTarget',
    'persistentRecommendationTarget', 'staleMessagesDiscarded', 'unchangedMessagesSkipped',
    'directBypassCount', 'fullShellRendersCausedByMentor',
    'currentContextKey', 'cacheHits', 'cacheMisses', 'inFlightJoins',
    'animationsStarted', 'animationsCompleted', 'animationsAborted',
    'supersededFramesAfterAbort', 'activeWrapperCount',
  ]) {
    assert.match(src, new RegExp(`${field}:`), `audit is missing field: ${field}`);
  }

  // It reads counters; it must not write actor/session state.
  assert.ok(!/actor\.update|setFlag|commitSelection|createEmbeddedDocuments/.test(src),
    'the audit must be read-only');

  // No field may be a hardcoded literal pretending to be a measurement.
  assert.ok(!/shell render requested: false/.test(src),
    'the audit still prints a hardcoded invariant instead of the counter');
  assert.ok(!/directBypassCount: 0,/.test(src),
    'directBypassCount is hardcoded rather than read from the controller');

  // Node-importable: the translator block must not touch a bare `document`.
  assert.ok(!/[^.]\bdocument\?\./.test(src) || /globalThis\.document\?\./.test(src),
    'diagnostics reference a bare document, which breaks under Node tests');

  // The counters it reads actually exist at their sources.
  const service = fs.readFileSync(path.join(ROOT, 'scripts/engine/suggestion/SuggestionService.js'), 'utf8');
  for (const counter of ['cacheHits', 'cacheMisses', 'inFlightJoins']) {
    assert.match(service, new RegExp(`_stats = \\{[^}]*\\b${counter}: 0`),
      `SuggestionService no longer initializes the ${counter} counter the audit reads`);
  }
  assert.match(service, /this\._stats\.inFlightJoins \+= 1/);
  assert.match(service, /this\._stats\.cacheHits \+= 1/);

  const translator = fs.readFileSync(path.join(ROOT, 'scripts/ui/dialogue/aurebesh-translator.js'), 'utf8');
  assert.match(translator, /supersededFramesAfterAbort: 0/);
  // The superseded-frame counter must be measured after the DOM write, or it
  // would be a formality that can never trip.
  assert.match(translator,
    /container\.innerHTML = this\._buildMarkup\(revealed[\s\S]{0,400}supersededFramesAfterAbort \+= 1/,
    'supersededFramesAfterAbort must be measured after the write it guards');
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
  assert.match(rail, /presentMessage\(message\) \{/, 'MentorRail is missing the single presentation sink');
  // The sink proves ownership rather than trusting a source string.
  assert.match(rail, /!isArbitratedMessage\(message\)/, 'MentorRail no longer checks authorization');
  assert.match(rail, /return 'unauthorized';/, 'MentorRail no longer fails closed on an unauthorized message');
  assert.match(rail, /noteDirectBypass/, 'MentorRail no longer reports unarbitrated messages');
  // Step guidance resolves text; it does not speak it.
  assert.match(rail, /async resolveStepGuidance\(descriptor\)/, 'speakForStep was not converted to a resolver');
  assert.ok(!rail.includes('async speakForStep('), 'speakForStep still exists as a message producer');

  const controller = read('scripts/apps/progression-framework/shell/mentor-recommendation-controller.js');
  // Comments may *name* the render seam (that is how the ownership boundary is
  // documented); what must not exist is a call to it.
  const controllerCode = controller
    .split('\n')
    .filter(line => !/^\s*(\*|\/\/|\/\*)/.test(line))
    .join('\n');
  for (const forbidden of ['shell.render(', 'requestRender(', '_prepareContext']) {
    assert.ok(!controllerCode.includes(forbidden), `MentorRecommendationController must not call ${forbidden}`);
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
      /^(commit|step-enter|focus)/.test(trigger),
      `recommendations may only be requested on meaningful changes, found: ${trigger}`
    );
  }
  // Focus is only allowed to trigger evaluation when the plugin explicitly says
  // its focus changed the advice inputs. An unguarded focus trigger is the
  // render-storm-era behaviour and must not come back.
  const focusTrigger = shellSrc.indexOf("this.requestMentorRecommendation(`focus:");
  if (focusTrigger !== -1) {
    const guardWindow = shellSrc.slice(Math.max(0, focusTrigger - 200), focusTrigger);
    assert.match(
      guardWindow,
      /if \(declared\.recommendationRelevant\)/,
      'focus requests build advice without the recommendationRelevant guard'
    );
  }

  // The mentor has no render seam at all.
  assert.ok(!shellSrc.includes('_updateMentorRegion'), 'a mentor render seam still exists');
  assert.ok(!shellSrc.includes("regions: ['mentor']"), 'something still requests a mentor region render');

  // 'mentor' is not a render region at all, so a request for it can never be
  // silently upgraded into a structural repaint.
  const scheduler = read('scripts/apps/progression-framework/shell/progression-render-scheduler.js');
  assert.match(scheduler, /FORBIDDEN_REGIONS = Object\.freeze\(new Set\(\['mentor'\]\)\)/);
  const regionSet = scheduler.slice(scheduler.indexOf('RENDER_REGIONS = Object.freeze'), scheduler.indexOf('INDEPENDENT_REGIONS'));
  assert.ok(!regionSet.includes("'mentor'"), 'mentor is still a valid render region');

  // Focus must not request build advice unconditionally — only behind the
  // plugin's explicit recommendationRelevant opt-in, checked above.
  const focusBlock = shellSrc.slice(shellSrc.indexOf('async _onFocusItem'), shellSrc.indexOf('async _onCommitItem'));
  for (const [index, line] of focusBlock.split('\n').entries()) {
    if (!line.includes('requestMentorRecommendation')) continue;
    const guard = focusBlock.split('\n').slice(Math.max(0, index - 3), index + 1).join('\n');
    assert.match(
      guard,
      /if \(declared\.recommendationRelevant\)/,
      'focus triggers build-recommendation work without the recommendationRelevant guard'
    );
  }
}

/* ------------------------------------------------------------------ *
 * 21. Identical concurrent requests share one evaluation and display it.
 *
 * The revision used to be bumped on entry, before the duplicate check. Two
 * identical requests then raced: A started at revision 1, B bumped to 2 and
 * returned as a duplicate, and A's result was thrown away as stale — the
 * evaluation ran and the player saw nothing.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();
  let evaluations = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });

  await withStubbedService(async () => { evaluations += 1; await gate; return rec('exceptional-skill'); }, async () => {
    const context = buildMentorContext(shell);
    const a = shell.controller.requestRecommendation(context);
    const b = shell.controller.requestRecommendation(context);
    release();
    await Promise.all([a, b]);
  });

  assert.equal(evaluations, 1, 'identical concurrent requests evaluated twice');
  assert.equal(shell.mentorRail.calls.length, 1, 'the joined evaluation was never displayed');
  assert.equal(shell.controller.evaluatedRecommendation.targetId, 'exceptional-skill');
  assert.equal(shell.controller.stats().staleResultsDiscarded, 0,
    'a duplicate request invalidated the evaluation it joined');
}

/* ------------------------------------------------------------------ *
 * 22. A genuinely changed context still supersedes the earlier one, and a
 *     failed evaluation releases its in-flight entry.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();
  let calls = 0;

  await withStubbedService(async (context) => {
    calls += 1;
    return rec(context.availableIds?.[0] ?? `pick-${calls}`);
  }, async () => {
    await shell.controller.requestRecommendation(buildMentorContext(shell, { available: [{ id: 'a' }] }));
    await shell.controller.requestRecommendation(buildMentorContext(shell, { available: [{ id: 'b' }] }));
  });

  assert.equal(calls, 2, 'a changed context reused the previous evaluation');
  assert.equal(shell.controller.evaluatedRecommendation.targetId, 'b');

  // A rejected evaluation must not leave its context permanently "in flight".
  const failing = makeShell();
  await withStubbedService(async () => { throw new Error('service down'); }, async () => {
    await failing.controller.requestRecommendation(buildMentorContext(failing, { available: [{ id: 'x' }] }));
  });
  assert.equal(failing.controller._inFlightByContext.size, 0, 'a failed request stranded its in-flight entry');
}

/* ------------------------------------------------------------------ *
 * 23. A rejected recommendation is not counted as displayed, stays available,
 *     and can be restored later without re-evaluating.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();
  const c = shell.controller;

  assert.equal(c.presentAskMentor({ text: 'Here are your options.', stepId: 'general-feat' }), PRESENTATION.DISPLAYED);
  const displayedAfterAsk = c.stats().recommendationsDisplayed;

  // Same revision, lower priority: the player never sees this.
  const outcome = c.applyRecommendation(rec('exceptional-skill'), { revision: c.currentRevision });
  assert.equal(outcome, PRESENTATION.REJECTED_PRIORITY);
  assert.equal(c.stats().recommendationsDisplayed, displayedAfterAsk,
    'a recommendation the player never saw was counted as displayed');
  assert.equal(shell.mentorRail.calls.length, 1);

  // It is still the advice on file, so restoring it needs no evaluation.
  assert.equal(c.persistentRecommendation?.targetId, 'exceptional-skill');
  assert.equal(c.restorePersistentRecommendation(), PRESENTATION.DISPLAYED);
  assert.equal(shell.mentorRail.calls.length, 2);
  assert.equal(shell.mentorRail.calls[1].targetId, 'exceptional-skill');
  assert.equal(c.stats().recommendationsDisplayed, displayedAfterAsk + 1);
}

/* ------------------------------------------------------------------ *
 * 24. A queued pre-mount message is a deferral, not a rejection.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();
  shell.mentorRail.mounted = false;
  const c = shell.controller;

  const outcome = c.present({ source: 'recommendation', text: 'Pre-mount advice.', temporary: false });
  assert.equal(outcome, PRESENTATION.QUEUED, 'an unmounted rail reported a rejection');
  assert.notEqual(outcome, PRESENTATION.REJECTED_PRIORITY);
  assert.equal(shell.mentorRail.calls.length, 1, 'the queued message never reached the rail');
  assert.equal(c.stats().mentorDomUpdates, 0, 'a queued message was counted as a DOM update');
}

/* ------------------------------------------------------------------ *
 * 25. Bypass instrumentation is real: a forbidden direct write increments it,
 *     and the ordinary arbitrated path leaves it at zero.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();
  const c = shell.controller;

  c.presentAskMentor({ text: 'Arbitrated line.', stepId: 'general-feat' });
  assert.equal(c.stats().directBypassCount, 0, 'the normal path was counted as a bypass');
  assert.equal(c.stats().fullShellRendersCausedByMentor, 0);

  // Now do the forbidden thing: speak straight to the sink.
  shell.mentorRail.presentMessage({ source: 'stepGuidance', text: 'Smuggled line.' });
  assert.equal(c.stats().directBypassCount, 1, 'a direct rail write was not detected');

  // And a repaint requested while the mentor holds the stack is attributed to it.
  assert.equal(c.isPresenting(), false);
  let seenWhilePresenting = null;
  shell.mentorRail.presentMessage = (message) => {
    seenWhilePresenting = c.isPresenting();
    if (!isArbitratedMessage(message)) { c.noteDirectBypass({ source: message?.source }); return 'unauthorized'; }
    return true;
  };
  c.presentAskMentor({ text: 'Another line.', stepId: 'general-feat' });
  assert.equal(seenWhilePresenting, true, 'presentation is not observable to the shell');
  c.noteShellRenderAttempt('mentor-caused');
  assert.equal(c.stats().fullShellRendersCausedByMentor, 1);
}

/* ------------------------------------------------------------------ *
 * 26. Ask Mentor commit is one canonical path across every picker-backed step.
 *
 * Paired with the behavioural budget test in
 * tests/progression-render-scheduler-budgets.test.mjs; this half proves no step
 * still hand-rolls focus -> commit -> render.
 * ------------------------------------------------------------------ */
{
  const stepsDir = path.join(ROOT, 'scripts/apps/progression-framework/steps');
  const offenders = [];
  const migrated = [];

  for (const name of fs.readdirSync(stepsDir)) {
    if (!name.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(stepsDir, name), 'utf8');
    if (src.includes('commitSuggestionFromMentor')) migrated.push(name);

    const askBlocks = [...src.matchAll(/handleAskMentorWithPicker\([\s\S]*?\n\s{0,6}\}\);/g)].map(m => m[0]);
    for (const block of askBlocks) {
      const hasFocus = /this\.onItemFocused\(/.test(block);
      const hasCommit = /this\.onItemCommitted\(/.test(block);
      const hasRender = /requestRender\(|shell\.render\(/.test(block);
      if (hasFocus && hasCommit) offenders.push(`${name}: focus+commit triple in the Ask Mentor callback`);
      else if (hasCommit && hasRender) offenders.push(`${name}: commit+render in the Ask Mentor callback`);
    }
  }

  assert.deepEqual(offenders, [],
    'Ask Mentor commits must go through shell.commitSuggestionFromMentor():\n  ' + offenders.join('\n  '));
  for (const expected of ['species-step.js', 'class-step.js', 'feat-step.js']) {
    assert.ok(migrated.includes(expected), `${expected} has not migrated to commitSuggestionFromMentor()`);
  }
}

/* ------------------------------------------------------------------ *
 * 27. A reaction competes for the rail; it does not clear the board first.
 *
 * MentorChoiceReactionRouter used to call noteExternalDisplay() BEFORE
 * submitting the reaction, which wiped the active recommendation and its
 * signature — so a priority-20 focus bark never actually lost to a priority-40
 * recommendation, it emptied the room and walked in.
 * ------------------------------------------------------------------ */
{
  const router = fs.readFileSync(
    path.join(ROOT, 'scripts/apps/progression-framework/shell/mentor-choice-reaction-router.js'), 'utf8');

  const speakStart = router.indexOf('async _speak(');
  const speak = router.slice(speakStart, router.indexOf('\n  _flashRail(', speakStart));
  // The comment explains the old ordering; only executable lines are checked.
  const speakCode = speak.split('\n').filter(line => !/^\s*(\/\/|\*)/.test(line)).join('\n');
  const clearIndex = speakCode.indexOf('noteExternalDisplay');
  const presentIndex = speakCode.search(/present(Commit|Focus)Reaction/);
  assert.ok(presentIndex !== -1, 'the router no longer routes reactions through the arbiter');
  assert.ok(
    clearIndex === -1 || clearIndex > presentIndex,
    'the router clears the active recommendation before arbitration'
  );
  assert.match(speakCode, /outcome !== 'displayed' && outcome !== 'queued'/,
    'the router no longer checks the arbitration outcome');
  assert.match(speakCode, /return;/, 'a rejected reaction still falls through to the rail flash');

  // Behavioural: a same-revision focus reaction loses to a live recommendation.
  const shell = makeShell();
  const c = shell.controller;
  await withStubbedService(async () => rec('exceptional-skill'), async () => {
    await c.requestRecommendation(buildMentorContext(shell));
  });
  assert.equal(shell.mentorRail.calls.length, 1);

  const focusOutcome = c.presentFocusReaction({ text: 'Interesting.', stepId: 'general-feat' });
  assert.equal(focusOutcome, PRESENTATION.REJECTED_PRIORITY,
    'a focus reaction displaced a live recommendation');
  assert.equal(shell.mentorRail.calls.length, 1, 'the rejected reaction still wrote to the rail');

  const commitOutcome = c.presentCommitReaction({ text: 'Good pick.', stepId: 'general-feat' });
  assert.equal(commitOutcome, PRESENTATION.REJECTED_PRIORITY,
    'a same-revision commit reaction displaced a live recommendation');

  // Ask Mentor outranks both.
  assert.equal(c.presentAskMentor({ text: 'Here are your options.', stepId: 'general-feat' }), PRESENTATION.DISPLAYED);
  assert.equal(c.presentFocusReaction({ text: 'Hmm.', stepId: 'general-feat' }), PRESENTATION.REJECTED_PRIORITY);
}

/* ------------------------------------------------------------------ *
 * 28. Focus never speaks at Ask Mentor priority.
 * ------------------------------------------------------------------ */
{
  const stepsDir = path.join(ROOT, 'scripts/apps/progression-framework/steps');
  const offenders = [];
  for (const name of fs.readdirSync(stepsDir)) {
    if (!name.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(stepsDir, name), 'utf8');
    for (const match of src.matchAll(/async onItemFocused\(/g)) {
      const body = src.slice(match.index, src.indexOf('\n  }', match.index));
      for (const line of body.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
        if (/\b(handleAskMentor|presentAskMentor|onAskMentor)\s*\(/.test(line)) {
          offenders.push(`${name}: ${trimmed.slice(0, 70)}`);
        }
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'focus must not speak at Ask Mentor priority — that lets card inspection '
    + 'override the build recommendation:\n  ' + offenders.join('\n  ')
  );
}

console.log('mentor-recommendation-architecture: all assertions passed');
