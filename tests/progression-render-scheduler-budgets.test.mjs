import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Progression render-storm regression budgets.
//
// The shell used to call render() synchronously from requestRender(), and its
// render guard only rejected calls made *while* another render was running. A
// single click therefore produced at least two full _prepareContext cycles (the
// plugin's own render inside onItemFocused, then the shell's follow-up), and any
// async completion afterwards produced another. Observed: 70+ full renders from
// a handful of clicks.
//
// These tests pin the budgets that must hold now that ProgressionRenderScheduler
// owns *when* the shell repaints.
//
// Coverage tier: (a) direct production-path for the scheduler (the real module
// is loaded and driven), plus (b) static contract checks over the shell, mentor
// rail, and step plugins for the ownership rules the scheduler cannot enforce
// on its own.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

registerFoundryPathLoader();
installFoundryShimGlobals();

// The scheduler prefers requestAnimationFrame so that everything produced by one
// interaction lands in one paint. Drive it deterministically here.
const frameQueue = [];
globalThis.requestAnimationFrame = (fn) => {
  frameQueue.push(fn);
  return frameQueue.length;
};
globalThis.cancelAnimationFrame = (handle) => {
  if (handle >= 1 && handle <= frameQueue.length) frameQueue[handle - 1] = null;
};

/** Run every callback queued for the next frame, then let promises settle. */
async function advanceFrame() {
  const due = frameQueue.splice(0, frameQueue.length);
  for (const fn of due) if (fn) fn();
  // Two turns: one for the scheduler's own async flush, one for the executor.
  await Promise.resolve();
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
}

const { ProgressionRenderScheduler, RENDER_REGIONS } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-render-scheduler.js'
);

/** Minimal host recording what the scheduler asked it to paint. */
function makeHost({ signature = () => 'stable' } = {}) {
  const jobs = [];
  const host = {
    jobs,
    executeRender: async (job) => { jobs.push(job); return 'rendered'; },
    computeStateSignature: signature,
    isDebugEnabled: () => true,
  };
  host.scheduler = new ProgressionRenderScheduler(host);
  return host;
}

const fullRenders = (host) => host.jobs.filter(job => job.structural).length;
const regionUpdates = (host) => host.jobs.filter(job => !job.structural);

/* ------------------------------------------------------------------ *
 * Scope vocabulary
 * ------------------------------------------------------------------ */
{
  for (const region of ['mentor', 'details', 'work-surface', 'summary', 'utility', 'footer', 'progress', 'structural']) {
    assert.ok(RENDER_REGIONS.has(region), `missing render scope: ${region}`);
  }
}

/* ------------------------------------------------------------------ *
 * 1-2. Opening chargen / level-up: one structural render, plus at most
 *      one follow-up for async hydration.
 * ------------------------------------------------------------------ */
{
  let revision = 0;
  const host = makeHost({ signature: () => `rev-${revision}` });

  // Initial open.
  host.scheduler.request({ reason: 'open', structural: true });
  await advanceFrame();
  assert.equal(fullRenders(host), 1, 'opening produced more than one structural render');

  // Async hydration lands afterwards and genuinely changes state.
  revision = 1;
  host.scheduler.request({ reason: 'registries-ready', structural: true, dedupe: true });
  await advanceFrame();
  assert.equal(fullRenders(host), 2, 'hydration follow-up should be exactly one more render');

  // A third request with no state change must be dropped, not painted.
  host.scheduler.request({ reason: 'registries-ready', structural: true, dedupe: true });
  await advanceFrame();
  assert.equal(fullRenders(host), 2, 'identical-state request was not skipped');
  assert.equal(host.scheduler.stats().skippedIdentical, 1);
}

/* ------------------------------------------------------------------ *
 * 3. Focusing one option: zero full renders, one details update.
 * ------------------------------------------------------------------ */
{
  const host = makeHost();

  // This is the real shape of one focus click after the fix: the plugin scopes
  // its own request to the details rail, and the shell adds its follow-up. Both
  // land in the same frame.
  host.scheduler.beginInteraction('focus');
  host.scheduler.request({ reason: 'class-step:onItemFocused', regions: ['details'] });
  host.scheduler.request({ reason: 'focus-item:class', regions: ['details'] });
  await advanceFrame();

  assert.equal(fullRenders(host), 0, 'focusing an option triggered a full shell render');
  assert.equal(regionUpdates(host).length, 1, 'focus produced more than one details update');
  assert.deepEqual(regionUpdates(host)[0].regions, ['details']);
  assert.equal(host.scheduler.stats().coalesced, 1, 'the two focus requests did not coalesce');
}

/* ------------------------------------------------------------------ *
 * 4. Focusing 20 options rapidly: coalesced, latest wins, no full renders.
 * ------------------------------------------------------------------ */
{
  const host = makeHost();
  host.scheduler.beginInteraction('rapid-focus');

  const promises = [];
  for (let i = 0; i < 20; i += 1) {
    promises.push(host.scheduler.request({ reason: `focus-item:${i}`, regions: ['details'] }));
  }
  await advanceFrame();
  await Promise.all(promises);

  assert.equal(fullRenders(host), 0, 'rapid focus produced full shell renders');
  assert.equal(host.jobs.length, 1, '20 rapid focus changes did not coalesce into one update');
  assert.equal(host.scheduler.stats().coalesced, 19);
  // Every caller waits on the same scheduled update.
  assert.equal(new Set(promises).size, 1, 'callers did not share one render promise');
  assert.equal(host.scheduler.stats().maxUpdatesPerInteraction, 1);
}

/* ------------------------------------------------------------------ *
 * 5. Committing one option: one update, no plugin+shell duplicate.
 * ------------------------------------------------------------------ */
{
  let revision = 0;
  const host = makeHost({ signature: () => `rev-${revision}` });
  host.scheduler.beginInteraction('commit');

  revision = 1;
  host.scheduler.request({ reason: 'class-step:onItemCommitted', structural: true });
  host.scheduler.request({ reason: 'commit-item', structural: true });
  await advanceFrame();

  assert.equal(host.jobs.length, 1, 'commit produced a duplicate plugin + shell render');
  assert.equal(host.scheduler.stats().maxUpdatesPerInteraction, 1);
  // Both reasons survive for diagnostics.
  assert.deepEqual(
    [...host.jobs[0].reasons].sort(),
    ['class-step:onItemCommitted', 'commit-item']
  );
}

/* ------------------------------------------------------------------ *
 * 6. Mentor dialogue: zero renders of any kind.
 * ------------------------------------------------------------------ */
{
  const host = makeHost();
  for (let i = 0; i < 10; i += 1) host.scheduler.noteDomOnlyMentorUpdate();
  await advanceFrame();

  assert.equal(host.jobs.length, 0, 'mentor dialogue scheduled a shell update');
  assert.equal(host.scheduler.stats().domOnlyMentorUpdates, 10);
}

/* ------------------------------------------------------------------ *
 * 7. Async suggestions: unchanged results paint nothing; changed results
 *    paint once; stale results are detectable via the epoch token.
 * ------------------------------------------------------------------ */
{
  let revision = 5;
  const host = makeHost({ signature: () => `rev-${revision}` });

  host.scheduler.request({ reason: 'baseline', structural: true, dedupe: true });
  await advanceFrame();
  const baseline = fullRenders(host);

  // Suggestions resolved but produced an equivalent result.
  host.scheduler.request({ reason: 'suggestions-resolved', structural: true, dedupe: true });
  await advanceFrame();
  assert.equal(fullRenders(host), baseline, 'equivalent suggestions still triggered a render');

  // Suggestions genuinely changed.
  const capturedEpoch = host.scheduler.epoch;
  revision = 6;
  host.scheduler.request({ reason: 'suggestions-changed', structural: true, dedupe: true });
  await advanceFrame();
  assert.equal(fullRenders(host), baseline + 1, 'changed suggestions should paint exactly once');

  // Work captured before that render can now tell it is stale.
  assert.equal(host.scheduler.isCurrentEpoch(capturedEpoch), false, 'stale epoch not detected');
  assert.equal(host.scheduler.isCurrentEpoch(host.scheduler.epoch), true);
}

/* ------------------------------------------------------------------ *
 * 8. Search/filter typing: one keystroke burst, one update.
 * ------------------------------------------------------------------ */
{
  let revision = 0;
  const host = makeHost({ signature: () => `rev-${revision}` });
  host.scheduler.beginInteraction('search');

  for (const char of 'blaster') {
    revision += 1;
    host.scheduler.request({ reason: 'skills-step:onSearch', regions: ['work-surface', 'utility'], structural: true });
  }
  await advanceFrame();

  assert.equal(host.jobs.length, 1, 'each keystroke produced its own render');
  assert.equal(host.scheduler.stats().coalesced, 6);
}

/* ------------------------------------------------------------------ *
 * 9. Step navigation: exactly one structural render for the destination.
 * ------------------------------------------------------------------ */
{
  let revision = 0;
  const host = makeHost({ signature: () => `rev-${revision}` });
  host.scheduler.beginInteraction('navigate');

  // onStepEnter side effects queue work, then navigation asks for its repaint.
  revision = 1;
  host.scheduler.request({ reason: 'onStepEnter:hydrate', regions: ['details'] });
  host.scheduler.request({ reason: 'step-navigation', structural: true, force: true });
  await advanceFrame();

  assert.equal(host.jobs.length, 1, 'navigation produced more than one update');
  assert.equal(host.jobs[0].structural, true, 'navigation must end in one structural render');
}

/* ------------------------------------------------------------------ *
 * 10. A render in flight does not block or drop later requests.
 * ------------------------------------------------------------------ */
{
  const host = makeHost({ signature: () => `rev-${Math.random()}` });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  host.executeRender = async (job) => { host.jobs.push(job); await gate; return 'rendered'; };

  host.scheduler.request({ reason: 'first', structural: true });
  await advanceFrame();
  assert.equal(host.jobs.length, 1);

  // Arrives while the first render is still running.
  const second = host.scheduler.request({ reason: 'second', structural: true });
  await advanceFrame();
  assert.equal(host.jobs.length, 1, 'a second render started while the first was still running');

  release();
  await advanceFrame();
  await advanceFrame();
  await second;
  assert.equal(host.jobs.length, 2, 'the deferred request was dropped instead of re-armed');
}

/* ------------------------------------------------------------------ *
 * Ownership contract — static checks the scheduler cannot enforce alone.
 * ------------------------------------------------------------------ */
{
  const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

  const shell = read('scripts/apps/progression-framework/shell/progression-shell.js');

  // requestRender must schedule, never paint synchronously.
  assert.match(shell, /return this\.renderScheduler\.request\(/, 'requestRender no longer delegates to the scheduler');
  assert.ok(
    !/^\s*return this\.render\(\{ force \}\);\s*$/m.test(shell.split('requestRender(')[1]?.slice(0, 1200) ?? ''),
    'requestRender still calls render() directly'
  );

  // No bare self-renders left in the shell: everything is scheduled.
  assert.equal(
    (shell.match(/^\s*this\.render\(\);\s*$/gm) || []).length,
    0,
    'shell still contains unscheduled this.render() calls'
  );

  // Focus is details-scoped.
  assert.match(shell, /reason: `focus-item:\$\{stepId\}`/);
  assert.match(shell, /regions: declared\.structural \? null : \[\.\.\.new Set\(\['details', \.\.\.declared\.regions\]\)\]/);

  // onDataReady is gated on a step-activation/data-revision token.
  assert.match(shell, /_shouldRunDataReady\(descriptor\.stepId\)/);
  assert.match(shell, /invalidateStepData\(/);

  // Mentor dialogue never renders.
  assert.match(shell, /speakMentor\(text, mood = 'neutral'\) \{/);
  const speakBody = shell.slice(shell.indexOf("speakMentor(text, mood = 'neutral')"));
  assert.ok(
    !/this\.render\(/.test(speakBody.slice(0, 700)),
    'speakMentor still triggers a shell render'
  );

  const mentorRail = read('scripts/apps/progression-framework/shell/mentor-rail.js');
  assert.ok(
    !/shell\.render\(/.test(mentorRail),
    'MentorRail still calls shell.render() directly'
  );
  assert.match(mentorRail, /regions: \['mentor'\]/, 'mentor updates are not region-scoped');

  // Reaction router re-checks its sequence token after every await.
  const router = read('scripts/apps/progression-framework/shell/mentor-choice-reaction-router.js');
  assert.match(router, /_isStale\(token\)/);
  assert.ok(
    (router.match(/this\._isStale\(token\)/g) || []).length >= 3,
    'router does not re-check its token after each async boundary'
  );
  assert.ok(
    !/token !== this\._sequence && action === 'focus'/.test(router),
    'router still only guards focus reactions against staleness'
  );

  // No step plugin calls the raw shell renderer any more.
  const stepFiles = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (full.endsWith('.js')) stepFiles.push(full);
    }
  };
  walk(path.join(ROOT, 'scripts/apps/progression-framework/steps'));

  const offenders = [];
  for (const file of stepFiles) {
    // intro-step drives its own animation sequence and is documented as
    // deliberately rendering only at completion.
    if (file.endsWith('intro-step.js')) continue;
    const src = fs.readFileSync(file, 'utf8');
    for (const [index, line] of src.split('\n').entries()) {
      const trimmed = line.trim();
      if (trimmed.startsWith('*') || trimmed.startsWith('//')) continue;
      if (/(?<![\w.])shell\.render\(\)/.test(line)) {
        offenders.push(`${path.relative(ROOT, file)}:${index + 1}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `step plugins must schedule renders, not call shell.render(): ${offenders.join(', ')}`);

  // Focus handlers in plugins are details-scoped.
  const classStep = read('scripts/apps/progression-framework/steps/class-step.js');
  const focusBody = classStep.slice(classStep.indexOf('async onItemFocused'));
  assert.match(focusBody.slice(0, 600), /regions: \['details'\]/, 'class-step focus is not details-scoped');
}

/* ------------------------------------------------------------------ *
 * Mentor layout stability is declared and loaded.
 * ------------------------------------------------------------------ */
{
  const cssPath = 'styles/progression-framework/mentor-rail-stability.css';
  const css = fs.readFileSync(path.join(ROOT, cssPath), 'utf8');
  assert.match(css, /--prog-mentor-rail-height/);
  assert.match(css, /overflow-y:\s*auto/, 'long mentor dialogue must scroll internally');
  assert.match(css, /min-height:\s*var\(--prog-mentor-dialogue-min-height\)/, 'dialogue block can still collapse');

  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'system.json'), 'utf8'));
  assert.ok(manifest.styles.includes(cssPath), 'mentor stability stylesheet is not loaded by system.json');
  assert.ok(
    manifest.styles.indexOf(cssPath) > manifest.styles.indexOf('styles/progression-framework/progression-shell.css'),
    'mentor stability stylesheet must load after progression-shell.css to win the cascade'
  );
}

console.log('progression-render-scheduler-budgets: all assertions passed');
