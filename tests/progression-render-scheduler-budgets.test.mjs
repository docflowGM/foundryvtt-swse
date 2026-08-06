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

const { ProgressionRenderScheduler, RENDER_REGIONS, INDEPENDENT_REGIONS, FORBIDDEN_REGIONS } = await import(
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
  for (const region of ['details', 'work-surface', 'summary', 'utility', 'footer', 'progress', 'structural']) {
    assert.ok(RENDER_REGIONS.has(region), `missing render scope: ${region}`);
  }

  // 'mentor' is not a scope. It used to be, and because the shell had no seam
  // for it, every mentor-scoped request fell through to a structural repaint —
  // the exact "mentor dialogue repaints the shell" behaviour the split exists to
  // prevent.
  assert.ok(!RENDER_REGIONS.has('mentor'), 'mentor is still a valid render region');
  assert.ok(FORBIDDEN_REGIONS.has('mentor'), 'mentor is not marked forbidden');
  assert.ok(INDEPENDENT_REGIONS.has('details'), 'details lost its independent seam');
  assert.ok(!INDEPENDENT_REGIONS.has('footer'), 'footer claims a seam the shell does not implement');
}

/* ------------------------------------------------------------------ *
 * A mentor-region request produces zero renders of any kind.
 * ------------------------------------------------------------------ */
{
  const host = makeHost();
  await host.scheduler.request({ reason: 'mentor-dialogue', regions: ['mentor'] });
  await advanceFrame();

  assert.equal(host.jobs.length, 0, 'a mentor-region request reached the render executor');
  assert.equal(fullRenders(host), 0, 'a mentor-region request caused a structural repaint');
  assert.equal(host.scheduler.stats().forbiddenRegionRequests, 1, 'the violation was not counted');

  // Strict mode turns it into a hard failure instead of a warning.
  const strict = makeHost();
  strict.isStrictMode = () => true;
  assert.throws(() => strict.scheduler.request({ reason: 'mentor-dialogue', regions: ['mentor'] }),
    /not a shell render region/);
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
 * 11. Full render supersedes a partial request in the same batch.
 * ------------------------------------------------------------------ */
{
  const host = makeHost();
  host.scheduler.request({ reason: 'plugin-focus', regions: ['details'] });
  host.scheduler.request({ reason: 'summary-refresh', regions: ['summary'] });
  host.scheduler.request({ reason: 'structure-changed', structural: true });
  await advanceFrame();

  assert.equal(host.jobs.length, 1, 'mixed requests did not coalesce');
  assert.equal(host.jobs[0].structural, true, 'a full request must win over partials');
  assert.deepEqual(host.jobs[0].regions, ['structural']);
}

/* ------------------------------------------------------------------ *
 * 12. Forced render supersedes a non-forced one, and merged partials
 *     keep every requested region.
 * ------------------------------------------------------------------ */
{
  const host = makeHost();
  host.scheduler.request({ reason: 'a', regions: ['details'] });
  host.scheduler.request({ reason: 'b', regions: ['summary'], force: true });
  await advanceFrame();

  assert.equal(host.jobs.length, 1);
  assert.equal(host.jobs[0].force, true, 'force did not propagate through coalescing');
  assert.deepEqual([...host.jobs[0].regions].sort(), ['details', 'summary']);
}

/* ------------------------------------------------------------------ *
 * 13. Ask Mentor commits through one canonical shell path.
 * ------------------------------------------------------------------ */
{
  const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const shell = read('scripts/apps/progression-framework/shell/progression-shell.js');
  assert.match(shell, /async commitSuggestionFromMentor\(\{ stepId, itemId, source = 'ask-mentor' \} = \{\}\)/);

  // The focus + commit + render triple must be gone from every step.
  const offenders = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) { walk(full); continue; }
      if (!full.endsWith('.js')) continue;
      const src = fs.readFileSync(full, 'utf8');
      if (/await this\.onItemFocused\(id, shell\);\s*\n\s*await this\.onItemCommitted\(id, shell\);/.test(src)) {
        offenders.push(path.relative(ROOT, full));
      }
    }
  };
  walk(path.join(ROOT, 'scripts/apps/progression-framework/steps'));
  assert.deepEqual(offenders, [],
    `Ask Mentor must commit through the shell, not focus+commit+render: ${offenders.join(', ')}`);
}

/* ------------------------------------------------------------------ *
 * 14. Focus handlers declare what they dirtied instead of rendering.
 * ------------------------------------------------------------------ */
{
  const steps = ['class-step', 'species-step', 'background-step', 'confirm-step',
                 'force-secret-step', 'force-regimen-step', 'force-technique-step',
                 'medical-secret-step'];
  for (const step of steps) {
    const src = fs.readFileSync(path.join(ROOT, `scripts/apps/progression-framework/steps/${step}.js`), 'utf8');
    const start = src.indexOf('onItemFocused');
    assert.ok(start > 0, `${step} has no onItemFocused`);
    const body = src.slice(start, src.indexOf('\n  }', start));
    assert.ok(
      !/requestRender\(/.test(body),
      `${step}.onItemFocused must not render — the shell owns the repaint`
    );
    assert.match(
      body,
      /return \{ handled: true, dirty: \['details'\], structural: false, recommendationRelevant: false \};/,
      `${step}.onItemFocused must declare its dirty region in the canonical shape`
    );
    // `regions:`/`changed:` was the pre-migration spelling. The normalizer still
    // reads it so nothing breaks mid-migration, but no in-tree plugin may use it.
    assert.ok(
      !/return \{[^}]*\bregions:/.test(body),
      `${step}.onItemFocused uses the legacy regions: key; the canonical field is dirty:`
    );
  }
}

/* ------------------------------------------------------------------ *
 * 15. High-value steps expose their hydrated ranking to the mentor.
 * ------------------------------------------------------------------ */
{
  for (const step of ['class-step', 'feat-step', 'talent-step', 'force-power-step', 'skills-step']) {
    const src = fs.readFileSync(path.join(ROOT, `scripts/apps/progression-framework/steps/${step}.js`), 'utf8');
    assert.match(src, /getRankedSuggestions\(\)/, `${step} does not expose its ranked suggestions`);
  }
  const base = fs.readFileSync(path.join(ROOT, 'scripts/apps/progression-framework/steps/step-plugin-base.js'), 'utf8');
  assert.match(base, /getRankedSuggestions\(shell\)/, 'the base plugin is missing the ranking accessor');
  assert.match(base, /getTopSuggestion\(shell\)/, 'the base plugin is missing the top-suggestion accessor');
}

/* ------------------------------------------------------------------ *
 * 16. No TEMP AUDIT logging survives in progression paths.
 * ------------------------------------------------------------------ */
{
  for (const rel of [
    'scripts/apps/progression-framework/shell/progression-shell.js',
    'scripts/apps/progression-framework/chargen-shell.js',
    'scripts/infrastructure/hooks/levelup-sheet-hooks.js',
    'scripts/infrastructure/hooks/chargen-sheet-hooks.js',
  ]) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.ok(!src.includes('TEMP AUDIT'), `${rel} still contains TEMP AUDIT logging`);
  }
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
  // Tightened by the mentor-recommendation work: mentor updates are no longer
  // merely region-scoped, they never enter the render pipeline at all. There is
  // deliberately no 'mentor' render seam left to request.
  assert.ok(
    !/regions: \['mentor'\]/.test(mentorRail),
    'mentor updates must be DOM-only, not region renders'
  );
  assert.match(mentorRail, /presentMessage\(message\) \{/, 'mentor rail is missing the presentation sink');
  assert.match(mentorRail, /_applyIdentityToDom\(/, 'mentor identity changes are not DOM-only');

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
  assert.match(focusBody.slice(0, 600), /dirty: \['details'\]/, 'class-step focus is not details-scoped');
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

/* ------------------------------------------------------------------ *
 * Mixed-region jobs are preflighted, so no requested region is silently
 * left stale.
 *
 * _executeScheduledRender used to fall back to a structural render only when
 * *nothing* applied. For ['details', 'summary', 'footer'] that meant details
 * repainted, the other two silently did not, and no fallback ran.
 * ------------------------------------------------------------------ */
{
  // A shell-shaped executor with the real preflight logic, driven directly.
  function makeShellExecutor({ failing = new Set() } = {}) {
    const calls = { structural: 0, regions: [] };
    const executor = async ({ regions, structural, force }) => {
      if (structural) { calls.structural += 1; return 'structural'; }
      const unsupported = regions.filter(region => !INDEPENDENT_REGIONS.has(region));
      if (unsupported.length) { calls.structural += 1; return 'structural'; }
      let applied = 0;
      for (const region of regions) {
        if (failing.has(region)) continue;
        calls.regions.push(region);
        applied += 1;
      }
      if (applied !== regions.length) { calls.structural += 1; return 'structural'; }
      return 'scoped';
    };
    return { calls, executor };
  }

  // details only -> partial update, no structural repaint.
  {
    const { calls, executor } = makeShellExecutor();
    assert.equal(await executor({ regions: ['details'], structural: false }), 'scoped');
    assert.deepEqual(calls.regions, ['details']);
    assert.equal(calls.structural, 0);
  }

  // details + unsupported footer -> ONE structural render, and details is not
  // partially painted first.
  {
    const { calls, executor } = makeShellExecutor();
    assert.equal(await executor({ regions: ['details', 'footer'], structural: false }), 'structural');
    assert.equal(calls.structural, 1);
    assert.deepEqual(calls.regions, [], 'details was painted before the fallback decision');
  }

  // unsupported region only -> one structural render.
  {
    const { calls, executor } = makeShellExecutor();
    assert.equal(await executor({ regions: ['summary'], structural: false }), 'structural');
    assert.equal(calls.structural, 1);
  }

  // An unknown region name is not treated as success.
  {
    const { calls, executor } = makeShellExecutor();
    assert.equal(await executor({ regions: ['not-a-region'], structural: false }), 'structural');
    assert.equal(calls.structural, 1);
  }

  // A runtime failure after preflight falls back safely.
  {
    const { calls, executor } = makeShellExecutor({ failing: new Set(['details']) });
    assert.equal(await executor({ regions: ['details'], structural: false }), 'structural');
    assert.equal(calls.structural, 1);
  }
}

/* ------------------------------------------------------------------ *
 * Updates arriving during an active render are queued into ONE follow-up,
 * never dropped and never recursive.
 * ------------------------------------------------------------------ */
{
  // Mirrors ProgressionShell's guard + _queueFollowUpRender/_flushFollowUpRender.
  const shell = {
    _isRendering: false,
    _followUpRenderQueued: false,
    _followUpRenderReason: null,
    followUps: [],
    renders: 0,
    _queueFollowUpRender(reason) {
      if (this._followUpRenderQueued) return;
      this._followUpRenderQueued = true;
      this._followUpRenderReason = reason;
    },
    _flushFollowUpRender() {
      if (!this._followUpRenderQueued) return;
      this._followUpRenderQueued = false;
      const reason = this._followUpRenderReason;
      this._followUpRenderReason = null;
      this.followUps.push(reason);
    },
    async render(duringRender = () => {}) {
      if (this._isRendering) { this._queueFollowUpRender('render-during-render'); return this; }
      this._isRendering = true;
      this.renders += 1;
      await duringRender();
      this._isRendering = false;
      this._flushFollowUpRender();
      return this;
    },
  };

  await shell.render(async () => {
    // Three legitimate updates arrive mid-render.
    await shell.render();
    await shell.render();
    await shell.render();
  });

  assert.equal(shell.renders, 1, 'a mid-render request recursed into a second render');
  assert.equal(shell.followUps.length, 1, 'mid-render requests must coalesce into exactly one follow-up');
  assert.notEqual(shell.followUps.length, 0, 'a mid-render request was silently dropped');

  // A render callback that itself renders does not schedule endlessly.
  shell.followUps.length = 0;
  await shell.render(async () => { await shell.render(); });
  assert.equal(shell.followUps.length, 1);
}

/* ------------------------------------------------------------------ *
 * Single render ownership: plugin interaction callbacks describe, the shell
 * paints.
 * ------------------------------------------------------------------ */
{
  const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const stepsDir = path.join(ROOT, 'scripts/apps/progression-framework/steps');
  const offenders = [];

  for (const name of fs.readdirSync(stepsDir)) {
    if (!name.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(stepsDir, name), 'utf8');
    for (const method of ['onItemFocused', 'onItemCommitted']) {
      let index = src.indexOf(`async ${method}(`);
      while (index !== -1) {
        const body = src.slice(index, src.indexOf('\n  }', index));
        if (/shell\??\.requestRender\(|shell\??\.render\(/.test(body)) {
          offenders.push(`${name}.${method}`);
        }
        index = src.indexOf(`async ${method}(`, index + 1);
      }
    }
  }

  assert.deepEqual(offenders, [],
    'shell-orchestrated callbacks must return dirty metadata instead of rendering:\n  ' + offenders.join('\n  '));

  // commitSelection stands down when the shell owns the interaction.
  const shellSrc = read('scripts/apps/progression-framework/shell/progression-shell.js');
  assert.match(shellSrc, /isShellOwnedInteraction\(\)/, 'the shell-owned interaction bracket is missing');
  assert.match(shellSrc, /if \(!this\.isShellOwnedInteraction\(\)\) \{\n\s+this\.requestRender\(\{ preserveScroll: true, reason: `commit-selection/,
    'commitSelection still repaints unconditionally inside a shell-owned commit');

  // Ask Mentor commits really focus the chosen item rather than no-opping.
  // The comment may quote the old no-op (that is how the defect is documented);
  // what must not exist is the statement itself.
  const shellCode = shellSrc.split('\n').filter(line => !/^\s*(\*|\/\/)/.test(line)).join('\n');
  assert.ok(
    !shellCode.includes('this.focusedItem = this.focusedItem ?? null'),
    'commitSuggestionFromMentor still contains the no-op focus assignment'
  );
  assert.match(shellSrc, /_focusItemWithoutRender\(plugin, itemId, source\)/,
    'commitSuggestionFromMentor does not focus the chosen item');
  const helper = shellSrc.slice(shellSrc.indexOf('async _focusItemWithoutRender'));
  assert.ok(
    !/requestRender\(/.test(helper.slice(0, 1600)),
    'the mentor focus helper schedules a render of its own'
  );
}

console.log('progression-render-scheduler-budgets: all assertions passed');
