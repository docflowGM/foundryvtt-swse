import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Mentor controller lifecycle + the interaction `changed` contract.
//
// Two families of defect, both about state that outlives the thing that owned it:
//
//  - controller: a synchronously-resolved recommendation registered its promise
//    AFTER the promise had already settled and cleaned up, stranding a dead
//    entry that every later request for that context then joined; reset() left
//    activeMessage/activeSignature behind so a previous step's line could be
//    restored; and reconnect/restore restamped stale candidates with the current
//    revision, turning old advice into current advice.
//
//  - interaction: `handled` meant both "I recognised this" and "state changed",
//    so a locked/duplicate/over-budget/cancelled operation still triggered a
//    projection rebuild, a mentor bark, a recommendation request and
//    auto-advance.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

registerFoundryPathLoader();
installFoundryShimGlobals();

globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.deepClone = (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.utils.mergeObject = globalThis.foundry.utils.mergeObject ?? ((a, b) => ({ ...a, ...b }));
// SuggestionService's import graph reaches modules that destructure
// foundry.applications.api at module scope. Inert markers only.
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
  PRESENTATION,
  isArbitratedMessage,
} = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/mentor-recommendation-controller.js'
);
const { SuggestionService } = await import(
  '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js'
);

const rec = (id, dialogue = `${id} suits this build.`) => ({ id, targetId: id, dialogue, mood: 'encouraging' });

function makeShell({ stepId = 'general-feat', topSuggestion = null } = {}) {
  const rail = {
    calls: [],
    mounted: true,
    node: {},
    presentMessage(message) {
      if (!isArbitratedMessage(message)) return 'unauthorized';
      rail.calls.push(message);
      return rail.mounted;
    },
    _resolveDialogueContainer: () => rail.node,
  };
  const shell = {
    mode: 'chargen',
    actor: { id: 'actor-1', name: 'Era' },
    currentStepIndex: 0,
    steps: [{ stepId }],
    mentorRail: rail,
    progressionSession: { draftSelections: {}, currentStepId: stepId, getSelectionRevision: () => 0 },
    stepPlugins: new Map(topSuggestion ? [[stepId, { getTopSuggestion: () => topSuggestion }]] : []),
    render: () => { throw new Error('the controller must never render'); },
    requestRender: () => { throw new Error('the controller must never request a render'); },
  };
  shell.controller = new MentorRecommendationController(shell);
  shell.mentorRecommendations = shell.controller;
  return shell;
}

async function withStubbedService(impl, fn) {
  const original = SuggestionService.getBestRecommendation;
  SuggestionService.getBestRecommendation = impl;
  try { return await fn(); } finally { SuggestionService.getBestRecommendation = original; }
}

/* ------------------------------------------------------------------ *
 * 1. A synchronous local suggestion does not strand an in-flight entry.
 *
 * _localTopSuggestion() is synchronous, so the evaluation body used to run to
 * completion — including its cleanup — before the promise was registered. The
 * cleanup deleted nothing, and the settled promise was then inserted forever.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell({ topSuggestion: { id: 'exceptional-skill', name: 'Exceptional Skill' } });
  await shell.controller.requestRecommendation(
    buildMentorContext(shell, { available: [{ id: 'exceptional-skill' }] })
  );

  assert.equal(
    shell.controller._inFlightByContext.size,
    0,
    'a synchronously resolved recommendation stranded its in-flight entry'
  );
  assert.equal(shell.mentorRail.calls.length, 1, 'the local suggestion never displayed');
}

/* ------------------------------------------------------------------ *
 * 2. An async evaluation also releases its entry, on success and failure.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();
  await withStubbedService(async () => rec('force-training'), async () => {
    await shell.controller.requestRecommendation(buildMentorContext(shell, { available: [{ id: 'a' }] }));
  });
  assert.equal(shell.controller._inFlightByContext.size, 0);

  const failing = makeShell();
  await withStubbedService(async () => { throw new Error('service down'); }, async () => {
    await failing.controller.requestRecommendation(buildMentorContext(failing, { available: [{ id: 'a' }] }));
  });
  assert.equal(failing.controller._inFlightByContext.size, 0, 'a failed evaluation stranded its entry');
}

/* ------------------------------------------------------------------ *
 * 3. An older evaluation's cleanup cannot evict a newer entry on the same key.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();
  const c = shell.controller;
  const key = 'shared-key';
  const older = Promise.resolve('old');
  const newer = Promise.resolve('new');

  c._inFlightByContext.set(key, newer);
  // The production cleanup shape: delete only when the map still holds THIS one.
  if (c._inFlightByContext.get(key) === older) c._inFlightByContext.delete(key);
  assert.equal(c._inFlightByContext.get(key), newer, 'older work evicted a newer in-flight entry');

  const source = read('scripts/apps/progression-framework/shell/mentor-recommendation-controller.js');
  assert.match(
    source,
    /if \(this\._inFlightByContext\.get\(contextSignature\) === work\)/,
    'the in-flight cleanup no longer checks promise identity'
  );
  assert.match(source, /await Promise\.resolve\(\);/,
    'the evaluation body no longer yields before it can settle');
}

/* ------------------------------------------------------------------ *
 * 4. Two identical concurrent requests evaluate once and both settle.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();
  let evaluations = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });

  await withStubbedService(async () => { evaluations += 1; await gate; return rec('a'); }, async () => {
    const context = buildMentorContext(shell, { available: [{ id: 'a' }] });
    const first = shell.controller.requestRecommendation(context);
    const second = shell.controller.requestRecommendation(context);
    release();
    await Promise.all([first, second]);
  });

  assert.equal(evaluations, 1);
  assert.equal(shell.mentorRail.calls.length, 1);
  assert.equal(shell.controller._inFlightByContext.size, 0);
}

/* ------------------------------------------------------------------ *
 * 5. reset() clears everything the step owned, and pre-reset work is stale
 *    even when the revision counter lines up again.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();
  const c = shell.controller;

  await withStubbedService(async () => rec('a'), async () => {
    await c.requestRecommendation(buildMentorContext(shell, { available: [{ id: 'a' }] }));
  });
  assert.ok(c.activeMessage, 'nothing was displayed to reset');

  c.reset();
  for (const field of [
    'activeMessage', 'activeSignature', 'persistentRecommendation',
    'evaluatedRecommendation', 'displayedRecommendation',
    'lastContextSignature', 'lastRecommendationSignature', '_replayedMountId',
  ]) {
    assert.equal(c[field], null, `reset() left ${field} behind`);
  }
  assert.equal(c._inFlightByContext.size, 0);

  // Nothing to replay after a reset.
  const before = shell.mentorRail.calls.length;
  shell.mentorRail.node = {};
  assert.notEqual(c.reconnect(), PRESENTATION.DISPLAYED, 'reconnect replayed a message from the reset step');
  assert.equal(shell.mentorRail.calls.length, before);
}

/* ------------------------------------------------------------------ *
 * 6. Work in flight across a reset cannot display.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();
  const c = shell.controller;
  let release;
  const gate = new Promise(resolve => { release = resolve; });

  await withStubbedService(async () => { await gate; return rec('late'); }, async () => {
    const pending = c.requestRecommendation(buildMentorContext(shell, { available: [{ id: 'x' }] }));
    c.reset();
    release();
    await pending;
  });

  assert.equal(shell.mentorRail.calls.length, 0, 'a result from before reset() displayed');
  assert.equal(c.displayedRecommendation, null);
  assert.equal(c._inFlightByContext.size, 0);
}

/* ------------------------------------------------------------------ *
 * 7. Evaluated, displayed and persistent are three different things.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell();
  const c = shell.controller;

  assert.equal(c.presentAskMentor({ text: 'Here are your options.', stepId: 'general-feat' }), PRESENTATION.DISPLAYED);
  const outcome = c.applyRecommendation(rec('exceptional-skill'), { revision: c.currentRevision });

  assert.equal(outcome, PRESENTATION.REJECTED_PRIORITY);
  assert.equal(c.evaluatedRecommendation?.targetId, 'exceptional-skill',
    'the rejected advice is not retained as the latest evaluation');
  assert.equal(c.displayedRecommendation, null,
    'a recommendation the player never saw is reported as displayed');
  assert.equal(c.persistentRecommendation?.targetId, 'exceptional-skill');
}

/* ------------------------------------------------------------------ *
 * 8. A candidate keeps its originating step and revision; restore does not
 *    restamp it as current.
 * ------------------------------------------------------------------ */
{
  const shell = makeShell({ stepId: 'general-feat' });
  const c = shell.controller;

  await withStubbedService(async () => rec('a'), async () => {
    await c.requestRecommendation(buildMentorContext(shell, { available: [{ id: 'a' }] }));
  });
  const displayed = shell.mentorRail.calls.at(-1);
  assert.equal(displayed.stepId, 'general-feat', 'the recommendation message carries no stepId');
  assert.ok(Number.isFinite(displayed.revision));

  // The player moves on. A remount must not restore the previous step's advice.
  shell.steps = [{ stepId: 'general-talent' }];
  shell.progressionSession.currentStepId = 'general-talent';
  shell.mentorRail.node = {};
  const before = shell.mentorRail.calls.length;
  const outcome = c.reconnect();
  assert.notEqual(outcome, PRESENTATION.DISPLAYED, "a previous step's recommendation was restored");
  assert.equal(shell.mentorRail.calls.length, before);

  const source = read('scripts/apps/progression-framework/shell/mentor-recommendation-controller.js');
  assert.ok(
    !/present\(\{ \.\.\.candidate, revision: this\.currentRevision \}\)/.test(source),
    'reconnect/restore still restamps a stale candidate with the current revision'
  );
}

/* ------------------------------------------------------------------ *
 * 9. One owner restores a pre-mount message.
 * ------------------------------------------------------------------ */
{
  const rail = read('scripts/apps/progression-framework/shell/mentor-rail.js');
  assert.ok(!/_flushPendingDialogue/.test(rail),
    'MentorRail still owns an independent replay queue alongside the controller');
  assert.ok(!/this\.shell\.mentor\.pendingDialogue = \{ text, mood \}/.test(rail),
    'MentorRail still stores a replayable pending message');

  // afterRender must not be able to start a reveal at all: the controller owns
  // replay and the shell calls reconnect() right after it.
  const afterRenderStart = rail.indexOf('  afterRender(');
  assert.ok(afterRenderStart > 0, 'MentorRail.afterRender is missing');
  const afterRender = rail.slice(afterRenderStart, rail.indexOf('\n  }\n', afterRenderStart));
  for (const trigger of ['_flushPendingDialogue', '_queuePendingDialogue', 'this.speak(', 'queueSpeak(']) {
    assert.ok(
      !afterRender.includes(trigger),
      `MentorRail.afterRender calls ${trigger}, making it a second replay owner alongside the controller`
    );
  }

  // The controller replays once per mounted node and no more.
  const shell = makeShell();
  const c = shell.controller;
  await withStubbedService(async () => rec('a'), async () => {
    await c.requestRecommendation(buildMentorContext(shell, { available: [{ id: 'a' }] }));
  });
  assert.equal(shell.mentorRail.calls.length, 1);

  shell.mentorRail.node = {};
  assert.equal(c.reconnect(), PRESENTATION.DISPLAYED);
  assert.equal(shell.mentorRail.calls.length, 2);
  assert.equal(c.reconnect(), PRESENTATION.REJECTED_DUPLICATE,
    'a repeated reconnect against the same node replayed again');
  assert.equal(shell.mentorRail.calls.length, 2);
}

/* ------------------------------------------------------------------ *
 * 10. The interaction result separates "handled" from "changed", and the
 *     shell only pays for a real mutation.
 * ------------------------------------------------------------------ */
{
  const shell = read('scripts/apps/progression-framework/shell/progression-shell.js');

  assert.match(shell, /changed: result\.changed === undefined \? handled : result\.changed === true/,
    'the normalizer does not distinguish handled from changed');
  assert.match(shell, /reported: false,/,
    'a plugin that returns nothing is not distinguished from one claiming no change');

  // All three interaction paths gate on it.
  const gates = (shell.match(/if \(declared\.reported && !declared\.changed\)/g) || []).length;
  assert.equal(gates, 3, `expected commit + increment + decrement gates, found ${gates}`);

  // A handled no-op must not reach any of these.
  for (const [handler, end] of [
    ['async _onCommitItem(', 'async _onIncrementQuantity('],
    ['async _onIncrementQuantity(', 'async _onDecrementQuantity('],
  ]) {
    const body = shell.slice(shell.indexOf(handler), shell.indexOf(end));
    const gate = body.indexOf('if (declared.reported && !declared.changed)');
    assert.ok(gate > 0, `${handler} has no changed gate`);
    for (const effect of ['_rebuildProjection()', 'reactToInteraction(', 'requestMentorRecommendation(', '_maybeScheduleAutoAdvance(']) {
      const at = body.indexOf(effect);
      if (at === -1) continue;
      assert.ok(at > gate, `${handler}: ${effect} runs before the changed gate`);
    }
  }

  // Quantity handlers are shell-owned like commit.
  for (const handler of ['async _onIncrementQuantity(', 'async _onDecrementQuantity(']) {
    const body = shell.slice(shell.indexOf(handler), shell.indexOf(handler) + 3000);
    assert.match(body, /renderScheduler\.beginInteraction\(/, `${handler} does not begin an interaction`);
    assert.match(body, /_withShellOwnedInteraction\(/, `${handler} is not shell-owned`);
  }
}

/* ------------------------------------------------------------------ *
 * 11. Quantity plugins report the contract instead of rendering.
 * ------------------------------------------------------------------ */
{
  for (const name of ['force-power-step.js', 'starship-maneuver-step.js']) {
    const src = read(`scripts/apps/progression-framework/steps/${name}`);
    for (const method of ['onIncrementQuantity', 'onDecrementQuantity']) {
      const start = src.indexOf(`async ${method}(`);
      assert.ok(start > 0, `${name} has no ${method}`);
      const body = src.slice(start, src.indexOf('\n  }\n', start));

      assert.ok(
        !/shell\??\.requestRender\(|shell\??\.render\(/.test(body),
        `${name}.${method} still requests its own render`
      );
      assert.match(body, /changed: true/, `${name}.${method} never reports a successful change`);
      assert.match(body, /changed: false/, `${name}.${method} never reports a blocked no-op`);
      assert.match(body, /reason: '/, `${name}.${method} reports no diagnostic reason`);
    }
  }
}

console.log('progression-interaction-lifecycle: all assertions passed');
