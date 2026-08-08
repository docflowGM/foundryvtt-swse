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

// Detects a direct call into the shell's own render() — in any of its escape
// forms: `shell.render()`, `shell?.render()`, `shell?.render?.()`,
// `this._shell?.render?.(false)`, awaited or not. The previous version of this
// check (`/shell\.render\(\)/`) only matched the unguarded literal spelling,
// so a plugin could route around the ownership contract just by adding a `?`
// before the call — an actual escape found in this codebase (feat-step.js's
// `?? shell?.render?.()` fallback) that this regex must never miss again.
// Matches any `<word ending in "shell">` reference — optionally
// `?.`-chained — followed by `render(`, itself optionally `?.`-chained
// before the call parens (optional-chained *calls* spell that `render?.(`,
// not `render?(` — the `.` before the paren is part of the operator, not a
// separate member access, and is easy to under-match if you forget it).
const SHELL_RENDER_CALL_RE = /\b\w*[Ss]hell\??\.\s*render(?:\?\.)?\s*\(/;

// Self-check: prove the hardened regex actually catches every escape shape
// before relying on it below. If this block itself fails, the detector is
// the thing that regressed, not the production code it scans.
{
  const mustMatch = [
    'shell.render();',
    'shell.render(false);',
    'shell?.render();',
    'shell?.render?.();',
    'await shell.render();',
    'await shell?.render?.(false);',
    "shell?.requestRender?.({ reason: 'x' }) ?? shell?.render?.();",
    'this._shell?.render?.(false);',
    'this.shell?.render?.();',
    '  shell . render ( ) ;'.replace(/ (?=[.(])| (?=\))/g, ''), // sanity: still a literal call
  ];
  const mustNotMatch = [
    'shell.requestRender({ reason: "x" });',
    'shell?.requestRender?.({ reason: "x" });',
    'shellRouter.render();', // different identifier ("shellRouter"), not a "*shell" reference
    'renderScheduler.request();',
  ];
  // The regex is line-content-only and intentionally comment-agnostic — every
  // call site below strips `*`/`//`-prefixed lines itself before testing, so
  // that responsibility is proven at the call sites, not asserted here.
  for (const line of mustMatch) {
    assert.ok(SHELL_RENDER_CALL_RE.test(line), `hardened render-call detector failed to catch: ${line}`);
  }
  for (const line of mustNotMatch) {
    assert.ok(!SHELL_RENDER_CALL_RE.test(line), `hardened render-call detector false-positived on: ${line}`);
  }
}

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

  // Phase 2: every named region vocabulary except 'structural' itself now
  // has a real independent seam (ProgressionShell grew an updater and
  // lifecycle rehydration for each — see _updateWorkSurfaceRegion /
  // _updateSummaryRegion / _updateUtilityRegion / _updateProgressRegion /
  // _updateFooterRegion). 'structural' is the full-shell path, not a seam,
  // and is correctly excluded from this set.
  for (const region of ['details', 'work-surface', 'summary', 'utility', 'footer', 'progress']) {
    assert.ok(INDEPENDENT_REGIONS.has(region), `${region} lost its independent seam`);
  }
  assert.ok(!INDEPENDENT_REGIONS.has('structural'), '"structural" is a fallback path, not an independent seam');
  assert.ok(!INDEPENDENT_REGIONS.has('mentor'), 'mentor must never claim an independent seam — it is DOM-owned');
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
    !SHELL_RENDER_CALL_RE.test(mentorRail),
    'MentorRail still calls shell.render() directly (including optional-chained forms)'
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

  // No step plugin calls the raw shell renderer any more. Zero exceptions:
  // intro-step.js used to be excluded here on the strength of its own doc
  // comments ("NO shell.render() calls during animation"), but inspection
  // during the Phase 1 render-ownership sweep found it DID call
  // `this._shell?.render?.(false)` and `shell.render(false)` at two
  // deliberate, non-per-frame completion points — exactly the kind of call
  // the old literal-only regex (`shell\.render\(\)`) could not see past its
  // `?` chaining. Both were converted to requestRender(); the exemption did
  // not hold up and is not reinstated here.
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
    const src = fs.readFileSync(file, 'utf8');
    for (const [index, line] of src.split('\n').entries()) {
      const trimmed = line.trim();
      if (trimmed.startsWith('*') || trimmed.startsWith('//')) continue;
      if (SHELL_RENDER_CALL_RE.test(line)) {
        offenders.push(`${path.relative(ROOT, file)}:${index + 1}: ${trimmed}`);
      }
    }
  }
  assert.deepEqual(offenders, [],
    `step plugins must schedule renders via requestRender(), not call shell.render() in any optional-chained form:\n  ${offenders.join('\n  ')}`);

  // The same zero-tolerance check extends to shell orchestration helpers
  // outside steps/ that plugins and dialogs route through — build-intent.js's
  // legacy commit facade, the recovery manager, and the rail resizer all had
  // a bare or fallback `shell.render()`/`app.render()` before this phase.
  const orchestrationFiles = [
    'scripts/apps/progression-framework/shell/build-intent.js',
    'scripts/apps/progression-framework/ux/progression-recovery-manager.js',
    'scripts/apps/progression-framework/shell/progression-rail-resizer.js',
  ];
  const orchestrationOffenders = [];
  for (const rel of orchestrationFiles) {
    const src = read(rel);
    for (const [index, line] of src.split('\n').entries()) {
      const trimmed = line.trim();
      if (trimmed.startsWith('*') || trimmed.startsWith('//')) continue;
      if (SHELL_RENDER_CALL_RE.test(line)) {
        orchestrationOffenders.push(`${rel}:${index + 1}: ${trimmed}`);
      }
    }
  }
  assert.deepEqual(orchestrationOffenders, [],
    `shell orchestration helpers must schedule renders via requestRender(), not call render() directly:\n  ${orchestrationOffenders.join('\n  ')}`);

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

  // Phase 2: 'footer' now has a real seam, so a mixed job naming it must
  // paint scoped, not fall back — this used to be the "unsupported footer"
  // regression case; that scenario is retested below with a genuinely
  // unimplemented region name instead.
  {
    const { calls, executor } = makeShellExecutor();
    assert.equal(await executor({ regions: ['details', 'footer'], structural: false }), 'scoped');
    assert.equal(calls.structural, 0);
    assert.deepEqual(calls.regions, ['details', 'footer']);
  }

  // summary alone -> partial update, no structural repaint (Phase 2 seam).
  {
    const { calls, executor } = makeShellExecutor();
    assert.equal(await executor({ regions: ['summary'], structural: false }), 'scoped');
    assert.equal(calls.structural, 0);
    assert.deepEqual(calls.regions, ['summary']);
  }

  // details + a genuinely unsupported region -> ONE structural render, and
  // details is not partially painted first.
  {
    const { calls, executor } = makeShellExecutor();
    assert.equal(await executor({ regions: ['details', 'not-a-real-region'], structural: false }), 'structural');
    assert.equal(calls.structural, 1);
    assert.deepEqual(calls.regions, [], 'details was painted before the fallback decision');
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
        if (/shell\??\.\s*requestRender\??\s*\(/.test(body) || SHELL_RENDER_CALL_RE.test(body)) {
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
  assert.match(
    shellSrc,
    /if \(!this\.isShellOwnedInteraction\(\)\) \{[\s\S]{0,800}?this\.requestRender\(\{[\s\S]{0,200}?reason: `commit-selection/,
    'commitSelection still repaints unconditionally inside a shell-owned commit'
  );

  // Phase 2: a commit that actually rebuilt the active-step list (a step
  // unlocked/became inapplicable) must stay structural — declaring
  // work-surface/summary/footer/progress there would silently skip
  // repainting whatever changed about the step list itself.
  const commitSelectionBody = shellSrc.slice(
    shellSrc.indexOf('async commitSelection('),
    shellSrc.indexOf('\n  }', shellSrc.indexOf('async commitSelection('))
  );
  assert.match(commitSelectionBody, /const stepsChanged = await this\._recomputeActiveStepsIfNeeded\(\)/,
    'commitSelection must know whether the active-step list actually changed');
  assert.match(commitSelectionBody, /structural: stepsChanged/,
    'commitSelection must force a structural render when the step list changed');
  assert.match(commitSelectionBody, /regions: stepsChanged \? null : \[/,
    'commitSelection must declare real dirty regions for the ordinary (no step-list-change) case');

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

/* ------------------------------------------------------------------ *
 * Full-tree closure: every `*shell.render(...)` reference anywhere under
 * progression-framework/, in any optional-chained spelling, is either gone
 * or on this explicit, justified allowlist. New files or new call sites
 * cannot silently reintroduce a direct render — they show up as an
 * `unexpectedOffenders` failure below, and a removed exception shows up as
 * a `staleAllowlistEntries` failure so this list cannot go stale unnoticed.
 * ------------------------------------------------------------------ */
{
  // file path (relative to ROOT) -> justification. Both current entries are
  // in progression-entry.js, and both name a variable called `shell` — but
  // it is `const shell = ShellRouter.getShell(actor.id)`, the HOSTING
  // character-sheet shell that owns the holopad surface, not a
  // ProgressionShell/ChargenShell/LevelupShell/FollowerShell instance. These
  // calls render that host shell so it repaints with the inline
  // chargen/progression surface now attached (`shell.setSurface(...)`);
  // they are not a step plugin or shell method reaching into
  // ProgressionShell.render(), so ProgressionRenderScheduler never owned
  // them and there is nothing here to route through requestRender().
  const ALLOWLIST = new Map([
    ['scripts/apps/progression-framework/progression-entry.js', 2],
  ]);

  const root = path.join(ROOT, 'scripts/apps/progression-framework');
  const counts = new Map();
  const unexpectedOffenders = [];
  const walkAll = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) { walkAll(full); continue; }
      if (!full.endsWith('.js')) continue;
      const rel = path.relative(ROOT, full);
      const src = fs.readFileSync(full, 'utf8');
      let fileCount = 0;
      for (const [index, line] of src.split('\n').entries()) {
        const trimmed = line.trim();
        if (trimmed.startsWith('*') || trimmed.startsWith('//')) continue;
        if (!SHELL_RENDER_CALL_RE.test(line)) continue;
        fileCount += 1;
        if (!ALLOWLIST.has(rel)) unexpectedOffenders.push(`${rel}:${index + 1}: ${trimmed}`);
      }
      if (fileCount) counts.set(rel, fileCount);
    }
  };
  walkAll(root);

  assert.deepEqual(unexpectedOffenders, [],
    `direct shell.render() call outside the documented allowlist (route through requestRender() instead):\n  ${unexpectedOffenders.join('\n  ')}`);

  const staleAllowlistEntries = [];
  for (const [rel, expectedCount] of ALLOWLIST) {
    const actualCount = counts.get(rel) || 0;
    if (actualCount !== expectedCount) {
      staleAllowlistEntries.push(`${rel}: expected ${expectedCount}, found ${actualCount}`);
    }
  }
  assert.deepEqual(staleAllowlistEntries, [],
    `allowlist is stale — update ALLOWLIST counts (and their justification) to match the current source:\n  ${staleAllowlistEntries.join('\n  ')}`);
}

/* ------------------------------------------------------------------ *
 * Phase 1.1 closure: this.render() self-calls are the same ownership
 * violation as shell.render() from a plugin's perspective, just spelled
 * from inside the shell class itself. SHELL_RENDER_CALL_RE only matches
 * identifiers *ending in* "shell" — it does not, and structurally cannot,
 * match a bare `this`. That gap let a real direct `this.render();` sit
 * inside FollowerShell._onFinalizeProgression until the Phase 1 commit
 * removed it (an interaction-guard branch, not the scheduler's own executor
 * callback) — nothing would have caught a reintroduction of that line, or
 * one like it in ChargenShell or LevelupShell.
 * ------------------------------------------------------------------ */
{
  // Catches this.render(), this.render(false), this?.render?.(), awaited or
  // not. Deliberately does NOT match `app.render(...)`: a freshly constructed
  // instance mounting itself for the first time (`const app = new this(...);
  // app.render(...)` in a static open()) is a different, legitimate call
  // shape, carved out below by method scope rather than by narrowing this
  // regex to stay blind to it.
  const SELF_RENDER_CALL_RE = /\bthis\??\.\s*render(?:\?\.)?\s*\(/;

  {
    const mustMatch = [
      'this.render();',
      'this.render(false);',
      'this?.render?.();',
      'await this.render({ force: true });',
      'this.render({ force, scrollSnapshots });',
    ];
    const mustNotMatch = [
      'app.render({ force: true });',
      'this.requestRender({ reason: "x" });',
      'this?.requestRender?.({ reason: "x" });',
      'shell.render();', // a different receiver — SHELL_RENDER_CALL_RE's job, not this one
    ];
    for (const line of mustMatch) {
      assert.ok(SELF_RENDER_CALL_RE.test(line), `self-render detector failed to catch: ${line}`);
    }
    for (const line of mustNotMatch) {
      assert.ok(!SELF_RENDER_CALL_RE.test(line), `self-render detector false-positived on: ${line}`);
    }
  }

  // ProgressionShell plus every subclass under progression-framework/. A
  // future subclass added anywhere in this tree is exactly the case this
  // list exists to not silently miss — add it here when it appears.
  const SHELL_CLASS_FILES = [
    'scripts/apps/progression-framework/shell/progression-shell.js',
    'scripts/apps/progression-framework/chargen-shell.js',
    'scripts/apps/progression-framework/levelup-shell.js',
    'scripts/apps/progression-framework/follower-shell.js',
  ];

  // The scheduler's executor callback is the one place a `this.render()`
  // self-call is not an ownership violation — it IS the paint the scheduler
  // asked for, wired at `executeRender: (job) => this._executeScheduledRender(job)`.
  // Every other this.render() anywhere in these four files is a bypass.
  const shellSrcForScope = fs.readFileSync(
    path.join(ROOT, 'scripts/apps/progression-framework/shell/progression-shell.js'), 'utf8');
  const executorStart = shellSrcForScope.indexOf('async _executeScheduledRender(');
  assert.ok(executorStart > 0, '_executeScheduledRender not found — allowlist scope cannot be computed');
  const executorEnd = shellSrcForScope.indexOf('\n  }', executorStart);
  assert.ok(executorEnd > executorStart, '_executeScheduledRender body end not found');
  const executorStartLine = shellSrcForScope.slice(0, executorStart).split('\n').length;
  const executorEndLine = shellSrcForScope.slice(0, executorEnd).split('\n').length;

  const selfRenderOffenders = [];
  for (const rel of SHELL_CLASS_FILES) {
    const full = path.join(ROOT, rel);
    const src = fs.readFileSync(full, 'utf8');
    src.split('\n').forEach((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('*') || trimmed.startsWith('//')) return;
      if (!SELF_RENDER_CALL_RE.test(line)) return;
      const lineNo = i + 1;
      const insideExecutor = rel.endsWith('shell/progression-shell.js')
        && lineNo >= executorStartLine && lineNo <= executorEndLine;
      if (!insideExecutor) selfRenderOffenders.push(`${rel}:${lineNo}: ${trimmed}`);
    });
  }

  assert.deepEqual(selfRenderOffenders, [],
    `direct this.render() self-call outside the scheduler's own executor callback — route through this.requestRender() instead:\n  ${selfRenderOffenders.join('\n  ')}`);
}

/* ==================================================================== *
 * PHASE 2 — Independent region rendering.
 *
 * These tests drive the REAL ProgressionShell.prototype region updaters —
 * not a reimplementation — via Object.create(ProgressionShell.prototype)
 * plus a minimal instance fixture. A call from inside one real prototype
 * method into another (_updateWorkSurfaceRegion -> this._renderWorkSurfaceHtml,
 * this._captureProgressionScrollSnapshots, this._createRegionRenderJob, ...)
 * resolves to the real implementation exactly as it does in production,
 * because `this` is a genuine (if minimally populated) instance of the
 * class, not a hand-rolled stand-in for its methods.
 *
 * Full ApplicationV2 construction is not attempted — several unrelated
 * modules in ProgressionShell's import graph touch window/document/
 * localStorage at module load time (progression-debug-capture.js,
 * runtime-contract.js), so a minimal browser-global shim exists ONLY to
 * satisfy those load-time side effects. No test below depends on real
 * DOM/CSS-selector behavior: the fake DOM nodes resolve querySelector()
 * from an explicit fixture map, not by parsing selector syntax, so this
 * is a control-flow/contract test of the real methods, not a selector-
 * engine test. Static assertions further down check the selector strings
 * themselves match between the JS and the .hbs templates.
 * ==================================================================== */

// Additive-only browser-global shim, layered on top of what
// installFoundryShimGlobals() already provides (foundry.utils/game/ui/...).
globalThis.window = globalThis.window ?? {
  addEventListener: () => {}, removeEventListener: () => {}, __SWSE_CONTRACT_INITIALIZED__: false,
};
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.document = globalThis.document ?? {
  readyState: 'complete', addEventListener: () => {}, removeEventListener: () => {}, activeElement: null,
};

/** Minimal HTMLElement stand-in — exists only so `x instanceof HTMLElement`
 * (used throughout ProgressionShell's DOM helpers) resolves true for our
 * fixture nodes, exactly the way it would for a real Element in a browser. */
class FakeElement {
  constructor({ selectors = {}, html = '' } = {}) {
    this._selectors = selectors;
    this._html = html;
    this.dataset = {};
    this.scrollTop = 0;
    this.scrollLeft = 0;
    this.classList = { add() {}, remove() {}, toggle() {}, contains: () => false };
  }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = v; }
  querySelector(sel) { return this._selectors[sel] ?? null; }
  querySelectorAll() { return []; }
  closest() { return null; }
  contains() { return false; }
  matches() { return false; }
}
globalThis.HTMLElement = globalThis.HTMLElement ?? FakeElement;

globalThis.foundry.applications = globalThis.foundry.applications ?? {
  api: {
    ApplicationV2: class ApplicationV2Stub {},
    HandlebarsApplicationMixin: (Base) => class extends Base {},
    DocumentSheetV2: class DocumentSheetV2Stub {},
    DialogV2: class DialogV2Stub {},
  },
  handlebars: { renderTemplate: async () => '' },
  ux: { TextEditor: { implementation: { enrichHTML: async (v) => v } } },
};

const { ProgressionShell } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-shell.js'
);

async function withRenderTemplateStub(responder, fn) {
  const original = globalThis.foundry.applications.handlebars.renderTemplate;
  globalThis.foundry.applications.handlebars.renderTemplate = async (template, data) => responder(template, data);
  try { return await fn(); } finally { globalThis.foundry.applications.handlebars.renderTemplate = original; }
}

/** [data-region="work-surface"] + its nested body wrapper, sibling utility
 * bar, summary/progress/footer hosts — the fixture every updater test below
 * mounts against. */
function buildRegionFixture() {
  const bodyEl = new FakeElement({ html: '<div class="old-ws">old</div>' });
  const regionEl = new FakeElement({ selectors: { ':scope > [data-prog-region-body="work-surface"]': bodyEl } });
  const utilityEl = new FakeElement({ html: '<div class="old-utility"></div>' });
  const summaryBodyEl = new FakeElement({ html: '<div class="old-summary"></div>' });
  const progressEl = new FakeElement({ html: '<div class="old-progress"></div>' });
  const footerEl = new FakeElement({ html: '<div class="old-footer"></div>' });
  const detailsEl = new FakeElement({ html: '' });
  const root = new FakeElement({
    selectors: {
      '[data-region="work-surface"]': regionEl,
      '[data-region="utility-bar"]': utilityEl,
      '.prog-summary-panel__body': summaryBodyEl,
      '[data-region="progress-rail"]': progressEl,
      '[data-region="action-footer"]': footerEl,
      '[data-region="details-panel"]': detailsEl,
    },
  });
  return { root, regionEl, bodyEl, utilityEl, summaryBodyEl, progressEl, footerEl, detailsEl };
}

function makePlugin({ summaryHtml = undefined, utilityConfig = { mode: 'rich' } } = {}) {
  const calls = { getStepData: 0, renderWorkSurface: 0, afterRender: 0, onDataReady: 0 };
  return {
    calls,
    async getStepData() { calls.getStepData += 1; return { items: [] }; },
    renderWorkSurface(stepData) {
      calls.renderWorkSurface += 1;
      return { template: 'work-surface-template', data: { stepData } };
    },
    ...(summaryHtml === undefined ? {} : {
      async renderSummaryPanel() { return { template: 'summary-template', data: {} }; },
    }),
    getUtilityBarConfig() { return utilityConfig; },
    getBlockingIssues() { return []; },
    async afterRender() { calls.afterRender += 1; },
    async onDataReady() { calls.onDataReady += 1; },
  };
}

/** Object.create(ProgressionShell.prototype) + the minimal instance state
 * the region updaters actually read. Every method NOT explicitly stubbed
 * here (getStepData hydration path, scroll capture/restore, footer data
 * building, step-progress computation, ...) is the real prototype method. */
function makeFakeShell({ plugin, steps } = {}) {
  const shell = Object.create(ProgressionShell.prototype);
  const stepList = steps ?? [{ stepId: 'feats', label: 'Feats', icon: 'fa-star' }];
  Object.assign(shell, {
    steps: stepList,
    currentStepIndex: 0,
    stepPlugins: new Map([[stepList[0].stepId, plugin]]),
    actor: { id: 'actor-1' },
    mode: 'chargen',
    buildIntent: null,
    focusedItem: null,
    utilityBarCollapsed: false,
    progressRailCollapsed: false,
    summaryPanelCollapsed: false,
    committedSelections: new Map(),
    _dataReadyToken: new Map(),
    _stepDataRevision: 0,
    _onDataReadyCalls: 0,
    _normalizeCompletedStepIds: () => {},
    _evaluateStepStatus: () => ({
      canonical: 'neutral', isVisited: false, errors: [], warnings: [], remainingChoices: [],
    }),
    utilityBar: {
      setConfig() {},
      afterRender(node) { shell._utilityAfterRenderCalls = (shell._utilityAfterRenderCalls || 0) + 1; shell._utilityAfterRenderNode = node; },
    },
    progressRail: {
      afterRender(node) { shell._progressAfterRenderCalls = (shell._progressAfterRenderCalls || 0) + 1; shell._progressAfterRenderNode = node; },
    },
  });
  return shell;
}

// Mirrors summary-panel-body.hbs's own {{#if summaryPanelHtml}}...{{else}}
// <placeholder>{{/if}} branching, so tests exercise the real fallback
// contract _renderSummaryPanelBodyHtml() depends on, not a stand-in for it.
const SUMMARY_PLACEHOLDER_HTML = '<div class="prog-summary-placeholder">PLACEHOLDER</div>';
const footerTemplateResponder = (template, data) => {
  if (template === 'work-surface-template') return '<div class="new-ws">WS</div>';
  if (template === 'summary-template') return '<div class="new-summary">SUM</div>';
  if (String(template).endsWith('action-footer.hbs')) return '<div class="new-footer">FOOTER</div>';
  if (String(template).endsWith('progress-rail.hbs')) return '<div class="new-progress">PROGRESS</div>';
  if (String(template).endsWith('utility-bar.hbs')) return '<div class="new-utility">UTILITY</div>';
  if (String(template).endsWith('summary-panel-body.hbs')) {
    return data?.summaryPanelHtml ? data.summaryPanelHtml : SUMMARY_PLACEHOLDER_HTML;
  }
  return '';
};

/* ------------------------------------------------------------------ *
 * 1. Individual region partials: each real updater mounts into its own
 *    host and leaves every sibling untouched.
 * ------------------------------------------------------------------ */
{
  const fixture = buildRegionFixture();
  const plugin = makePlugin({ summaryHtml: true });
  const shell = makeFakeShell({ plugin });
  const job = shell._createRegionRenderJob();

  await withRenderTemplateStub(footerTemplateResponder, async () => {
    assert.equal(await shell._updateWorkSurfaceRegion(fixture.root, job), true);
    assert.equal(await shell._updateSummaryRegion(fixture.root, job), true);
    assert.equal(await shell._updateUtilityRegion(fixture.root, job), true);
    assert.equal(await shell._updateProgressRegion(fixture.root), true);
    assert.equal(await shell._updateFooterRegion(fixture.root, job), true);
  });

  assert.equal(fixture.bodyEl.innerHTML, '<div class="new-ws">WS</div>');
  assert.equal(fixture.summaryBodyEl.innerHTML, '<div class="new-summary">SUM</div>');
  assert.equal(fixture.utilityEl.innerHTML, '<div class="new-utility">UTILITY</div>');
  assert.equal(fixture.progressEl.innerHTML, '<div class="new-progress">PROGRESS</div>');
  assert.equal(fixture.footerEl.innerHTML, '<div class="new-footer">FOOTER</div>');

  assert.equal(plugin.calls.afterRender, 1, 'work-surface update did not call plugin.afterRender');
  assert.equal(shell._utilityAfterRenderCalls, 1, 'utility update did not call UtilityBar.afterRender');
  assert.equal(shell._utilityAfterRenderNode, fixture.utilityEl);
  assert.equal(shell._progressAfterRenderCalls, 1, 'progress update did not call ProgressRail.afterRender');
  assert.equal(shell._progressAfterRenderNode, fixture.progressEl);
}

/* ------------------------------------------------------------------ *
 * 2. Work-surface replacement does not destroy the nested utility-bar
 *    region or the step-context banner sibling — only the body wrapper
 *    is mutated.
 * ------------------------------------------------------------------ */
{
  const fixture = buildRegionFixture();
  const plugin = makePlugin();
  const shell = makeFakeShell({ plugin });
  const job = shell._createRegionRenderJob();

  await withRenderTemplateStub(footerTemplateResponder, () => shell._updateWorkSurfaceRegion(fixture.root, job));

  assert.equal(fixture.bodyEl.innerHTML, '<div class="new-ws">WS</div>');
  assert.equal(fixture.utilityEl.innerHTML, '<div class="old-utility"></div>',
    'a work-surface-only update touched the nested utility-bar sibling');
}

/* ------------------------------------------------------------------ *
 * 3. Utility replacement does not touch the work-surface body sibling.
 * ------------------------------------------------------------------ */
{
  const fixture = buildRegionFixture();
  const plugin = makePlugin();
  const shell = makeFakeShell({ plugin });
  const job = shell._createRegionRenderJob();

  await withRenderTemplateStub(footerTemplateResponder, () => shell._updateUtilityRegion(fixture.root, job));

  assert.equal(fixture.utilityEl.innerHTML, '<div class="new-utility">UTILITY</div>');
  assert.equal(fixture.bodyEl.innerHTML, '<div class="old-ws">old</div>',
    'a utility-only update touched the work-surface body sibling');
}

/* ------------------------------------------------------------------ *
 * 4. Job-scoped stepData is hydrated once, not once per region. This is
 *    the specific defect Phase 2 exists to avoid: a mixed job needing
 *    stepData for both work-surface and summary must call
 *    plugin.getStepData() exactly once.
 * ------------------------------------------------------------------ */
{
  const fixture = buildRegionFixture();
  const plugin = makePlugin({ summaryHtml: true });
  const shell = makeFakeShell({ plugin });
  const job = shell._createRegionRenderJob();

  await withRenderTemplateStub(footerTemplateResponder, async () => {
    await shell._updateWorkSurfaceRegion(fixture.root, job);
    await shell._updateSummaryRegion(fixture.root, job);
  });

  assert.equal(plugin.calls.getStepData, 1,
    'stepData was hydrated more than once for two regions in the same job');
}

/* ------------------------------------------------------------------ *
 * 5. Footer and progress regions never call getStepData at all — neither
 *    needs it, and a job requesting only those must not hydrate it.
 * ------------------------------------------------------------------ */
{
  const fixture = buildRegionFixture();
  const plugin = makePlugin();
  const shell = makeFakeShell({ plugin });
  const job = shell._createRegionRenderJob();

  await withRenderTemplateStub(footerTemplateResponder, async () => {
    await shell._updateFooterRegion(fixture.root, job);
    await shell._updateProgressRegion(fixture.root);
  });

  assert.equal(plugin.calls.getStepData, 0,
    'footer/progress updates hydrated stepData they do not need');
}

/* ------------------------------------------------------------------ *
 * 6. A genuine render failure (template engine throws for every template,
 *    including the work-surface error-surface fallback) returns false —
 *    the caller falls back to structural — and never touches the DOM.
 * ------------------------------------------------------------------ */
{
  const fixture = buildRegionFixture();
  const plugin = makePlugin();
  const shell = makeFakeShell({ plugin });
  const job = shell._createRegionRenderJob();

  const applied = await withRenderTemplateStub(
    () => { throw new Error('template engine unavailable'); },
    () => shell._updateWorkSurfaceRegion(fixture.root, job)
  );

  assert.equal(applied, false, 'a genuine render failure must fall back to structural, not succeed silently');
  assert.equal(fixture.bodyEl.innerHTML, '<div class="old-ws">old</div>', 'DOM was mutated despite the failure');
}

/* ------------------------------------------------------------------ *
 * 7. Missing mount point (the intro-mode work-surface variant has no
 *    [data-prog-region-body="work-surface"] wrapper) fails safe instead
 *    of guessing where to mount.
 * ------------------------------------------------------------------ */
{
  const regionEl = new FakeElement({}); // no wrapper registered
  const root = new FakeElement({ selectors: { '[data-region="work-surface"]': regionEl } });
  const plugin = makePlugin();
  const shell = makeFakeShell({ plugin });
  const job = shell._createRegionRenderJob();

  assert.equal(await shell._updateWorkSurfaceRegion(root, job), false);
}

/* ------------------------------------------------------------------ *
 * 8. _maybeRunOnDataReady is activation/revision-scoped: two scoped
 *    work-surface repaints in the same activation (the search/filter hot
 *    path) call onDataReady at most once, but afterRender every time.
 * ------------------------------------------------------------------ */
{
  const fixture = buildRegionFixture();
  const plugin = makePlugin();
  const shell = makeFakeShell({ plugin });

  await withRenderTemplateStub(footerTemplateResponder, async () => {
    await shell._updateWorkSurfaceRegion(fixture.root, shell._createRegionRenderJob());
    await shell._updateWorkSurfaceRegion(fixture.root, shell._createRegionRenderJob());
  });

  assert.equal(plugin.calls.onDataReady, 1,
    'a same-activation scoped work-surface repaint re-ran onDataReady');
  assert.equal(plugin.calls.afterRender, 2,
    'afterRender must still run on every scoped work-surface paint');

  shell._stepDataRevision += 1; // simulates invalidateStepData() on step (re-)activation
  await withRenderTemplateStub(footerTemplateResponder,
    () => shell._updateWorkSurfaceRegion(fixture.root, shell._createRegionRenderJob()));
  assert.equal(plugin.calls.onDataReady, 2, 'invalidateStepData did not release the onDataReady gate');
}

/* ------------------------------------------------------------------ *
 * 9. An unrecognized region name still fails safe through the real
 *    _updateRegion dispatcher.
 * ------------------------------------------------------------------ */
{
  const fixture = buildRegionFixture();
  const plugin = makePlugin();
  const shell = makeFakeShell({ plugin });
  shell.getRootElement = () => fixture.root;

  assert.equal(await shell._updateRegion('not-a-real-region'), false);
}

/* ------------------------------------------------------------------ *
 * 10. PERFORMANCE CONTRACT — full requestRender()->scheduler->
 *     _executeScheduledRender()->real region updaters round trip.
 *
 * Before Phase 2: ['work-surface', 'utility'] had no independent seam, so
 * this always structurally re-rendered the whole shell. After Phase 2:
 * both regions are real seams, so the SAME request produces zero
 * structural renders. `shell.render` is stubbed here (the one piece that
 * needs full ApplicationV2) purely to COUNT whether it was called, not to
 * fake region behavior — every region updater invoked below is the real
 * prototype method.
 * ------------------------------------------------------------------ */
{
  const fixture = buildRegionFixture();
  const plugin = makePlugin({ summaryHtml: true });
  const shell = makeFakeShell({ plugin });
  shell.getRootElement = () => fixture.root;
  shell.element = fixture.root;
  shell._structuralRenderCalls = 0;
  shell.render = async () => { shell._structuralRenderCalls += 1; return shell; };
  shell.renderScheduler = new ProgressionRenderScheduler({
    executeRender: (job) => shell._executeScheduledRender(job),
    computeStateSignature: () => 'sig',
    isDebugEnabled: () => false,
  });
  shell.requestRender = ProgressionShell.prototype.requestRender.bind(shell);

  // The scheduler defers its flush to requestAnimationFrame; this file's rAF
  // stub only fires queued callbacks when advanceFrame() is called (see top
  // of file), so every requestRender() below is paired with one.
  const requestAndFlush = async (opts) => {
    const pending = shell.requestRender(opts);
    await advanceFrame();
    return pending;
  };

  // 10a. Feat-search shape: ['work-surface', 'utility'].
  await withRenderTemplateStub(footerTemplateResponder,
    () => requestAndFlush({ preserveScroll: true, reason: 'feat-search', regions: ['work-surface', 'utility'] }));
  assert.equal(shell._structuralRenderCalls, 0, 'a supported-region search request fell back to structural');
  assert.equal(fixture.bodyEl.innerHTML, '<div class="new-ws">WS</div>');
  assert.equal(fixture.utilityEl.innerHTML, '<div class="new-utility">UTILITY</div>');

  // 10b. Standard commit shape: ['work-surface', 'summary', 'footer', 'progress'],
  // one scheduler execution, all four regions applied, stepData hydrated once.
  plugin.calls.getStepData = 0;
  await withRenderTemplateStub(footerTemplateResponder, () => requestAndFlush({
    preserveScroll: true,
    reason: 'commit-selection:feats',
    regions: ['work-surface', 'summary', 'footer', 'progress'],
  }));
  assert.equal(shell._structuralRenderCalls, 0, 'a supported-region commit request fell back to structural');
  assert.equal(fixture.summaryBodyEl.innerHTML, '<div class="new-summary">SUM</div>');
  assert.equal(fixture.footerEl.innerHTML, '<div class="new-footer">FOOTER</div>');
  assert.equal(fixture.progressEl.innerHTML, '<div class="new-progress">PROGRESS</div>');
  assert.equal(plugin.calls.getStepData, 1, 'the mixed commit job hydrated stepData more than once');

  // 10c. Search/filter burst — three requests inside one frame coalesce
  // into ONE scheduler execution and zero structural renders.
  plugin.calls.getStepData = 0;
  await withRenderTemplateStub(footerTemplateResponder, async () => {
    const p1 = shell.requestRender({ preserveScroll: true, reason: 'search-1', regions: ['work-surface', 'utility'] });
    const p2 = shell.requestRender({ preserveScroll: true, reason: 'search-2', regions: ['work-surface', 'utility'] });
    const p3 = shell.requestRender({ preserveScroll: true, reason: 'search-3', regions: ['work-surface', 'utility'] });
    await advanceFrame();
    await Promise.all([p1, p2, p3]);
  });
  assert.equal(shell._structuralRenderCalls, 0, 'a coalesced search burst fell back to structural');
  assert.equal(plugin.calls.getStepData, 1, 'a coalesced search burst hydrated stepData more than once');

  // 10d. A genuinely unsupported region still forces exactly one structural
  // render through the same real dispatch path.
  shell._structuralRenderCalls = 0;
  await withRenderTemplateStub(footerTemplateResponder,
    () => requestAndFlush({ preserveScroll: true, reason: 'unknown-region', regions: ['not-a-real-region'] }));
  assert.equal(shell._structuralRenderCalls, 1, 'an unsupported region did not fall back to structural');

  // 10e. An explicit structural request (step navigation) always renders
  // structurally, never through a region updater — the goal is zero
  // *unnecessary* structural renders, not zero structural renders.
  shell._structuralRenderCalls = 0;
  await requestAndFlush({ preserveScroll: false, reason: 'step-navigation', structural: true, force: true });
  assert.equal(shell._structuralRenderCalls, 1, 'an explicit structural request did not render structurally');
}

/* ------------------------------------------------------------------ *
 * 10.5. PHASE 2.1 CLOSURE — summary empty-state parity.
 *
 * Commit 15492f6's _updateSummaryRegion() mounted `host.innerHTML = html
 * || ''` on the (false) assumption that the placeholder markup lived
 * outside .prog-summary-panel__body. It does not — progression-shell.hbs
 * puts it INSIDE that body, so a scoped summary update with nothing
 * selected produced a truly blank panel where a structural render would
 * have shown the canonical placeholder icon. This test drives a real
 * "nothing selected" summary through both the real renderSummaryPanel-less
 * plugin path and the real SelectedRailContext.buildSnapshot() fallback
 * (short-circuited safely by the absence of shell.progressionSession, per
 * SelectedRailContext.buildSnapshot's own null-guard) and asserts the
 * scoped result contains the same placeholder markup a structural render's
 * summary-panel-body.hbs include would have produced.
 * ------------------------------------------------------------------ */
{
  const fixture = buildRegionFixture();
  const plugin = makePlugin(); // no renderSummaryPanel -> falls to SelectedRailContext
  plugin.renderSummaryPanel = async () => null; // explicit "no custom summary for this step"
  const shell = makeFakeShell({ plugin });
  // No shell.progressionSession set -> SelectedRailContext.buildSnapshot's
  // own guard returns an empty snapshot (snapshotSections: []) rather than
  // touching ProjectionEngine, exactly like a real chargen actor with
  // nothing selected in the current step yet.
  const job = shell._createRegionRenderJob();

  const applied = await withRenderTemplateStub(footerTemplateResponder,
    () => shell._updateSummaryRegion(fixture.root, job));

  assert.equal(applied, true, 'a legitimate empty summary must not be treated as a render failure');
  assert.notEqual(fixture.summaryBodyEl.innerHTML, '',
    'a scoped summary update with nothing selected mounted a blank body instead of the canonical placeholder — the exact 15492f6 defect');
  assert.ok(fixture.summaryBodyEl.innerHTML.includes('prog-summary-placeholder'),
    'the scoped empty-summary body must contain the same placeholder structural rendering shows');
}

/* ------------------------------------------------------------------ *
 * 11. Static contract: no region updater calls the full _prepareContext()
 *     to get a fragment of it back out — each shares only the extracted
 *     render helper it actually needs, and _prepareContext() itself calls
 *     the exact same helpers rather than keeping a second copy of the
 *     rendering logic inline.
 * ------------------------------------------------------------------ */
{
  const shellSrc = fs.readFileSync(
    path.join(ROOT, 'scripts/apps/progression-framework/shell/progression-shell.js'), 'utf8');

  const sliceMethod = (name) => {
    const start = shellSrc.indexOf(`${name}(`);
    assert.ok(start > 0, `${name} not found`);
    return shellSrc.slice(start, shellSrc.indexOf('\n  }', start));
  };

  const updaterExpectations = [
    ['async _updateWorkSurfaceRegion', '_renderWorkSurfaceHtml'],
    // _updateSummaryRegion renders the FULL body (summary content + the
    // canonical placeholder fallback) via _renderSummaryPanelBodyHtml(),
    // which itself wraps _renderSummaryPanelHtml() — checked separately
    // below so a scoped summary repaint can never mount a bare '' where a
    // structural render would have shown the placeholder (Phase 2.1 fix).
    ['async _updateSummaryRegion', '_renderSummaryPanelBodyHtml'],
    ['async _updateUtilityRegion', '_renderUtilityBarHtml'],
    ['async _updateProgressRegion', '_renderProgressRailHtml'],
    ['async _updateFooterRegion', '_renderFooterHtml'],
  ];
  for (const [methodDecl, sharedHelper] of updaterExpectations) {
    const body = sliceMethod(methodDecl);
    assert.ok(!/_prepareContext\(/.test(body),
      `${methodDecl} must not call the full _prepareContext() to render its fragment`);
    assert.ok(body.includes(`this.${sharedHelper}(`),
      `${methodDecl} must call the shared ${sharedHelper}() helper`);
  }

  // _renderSummaryPanelBodyHtml() must itself call _renderSummaryPanelHtml()
  // — one implementation of "what is this step's summary content," not a
  // third copy alongside _prepareContext()'s and the old _updateSummaryRegion's.
  const summaryBodyHelperBody = sliceMethod('async _renderSummaryPanelBodyHtml');
  assert.ok(summaryBodyHelperBody.includes('this._renderSummaryPanelHtml('),
    '_renderSummaryPanelBodyHtml must call the shared _renderSummaryPanelHtml() helper');
  assert.match(summaryBodyHelperBody, /summary-panel-body\.hbs/,
    '_renderSummaryPanelBodyHtml must render the canonical summary-panel-body.hbs partial');

  // _prepareContext() itself must call the same shared helpers, not a
  // second inline copy of the same rendering logic. It calls
  // _renderSummaryPanelHtml() directly (not the *Body* wrapper) because its
  // own template include of summary-panel-body.hbs already supplies the
  // placeholder fallback — see progression-shell.hbs.
  const prepareContextBody = sliceMethod('async _prepareContext');
  for (const helper of [
    '_computeStepProgress', '_renderWorkSurfaceHtml', '_renderSummaryPanelHtml',
    '_renderUtilityBarHtml', '_renderProgressRailHtml',
  ]) {
    assert.ok(prepareContextBody.includes(`this.${helper}(`),
      `_prepareContext must call the shared ${helper}() helper, not a duplicated inline implementation`);
  }

  // The work-surface updater mounts into the stable body wrapper, not the
  // outer region (which would delete the sibling utility-bar).
  const workSurfaceBody = sliceMethod('async _updateWorkSurfaceRegion');
  assert.match(workSurfaceBody, /data-prog-region-body="work-surface"/,
    '_updateWorkSurfaceRegion must mount into the stable body wrapper');

  // onDataReady stays activation/revision-scoped from the scoped path too.
  assert.ok(workSurfaceBody.includes('this._maybeRunOnDataReady('),
    '_updateWorkSurfaceRegion must use the shared, gated onDataReady helper');
}

/* ------------------------------------------------------------------ *
 * 12. Template seam: progression-shell.hbs actually has the wrapper the
 *     JS updater depends on, and the extracted action-footer partial
 *     exists and is included by the main template (not duplicated).
 * ------------------------------------------------------------------ */
{
  const shellHbs = fs.readFileSync(
    path.join(ROOT, 'templates/apps/progression-framework/progression-shell.hbs'), 'utf8');
  assert.match(shellHbs, /data-prog-region-body="work-surface"/,
    'progression-shell.hbs is missing the work-surface body wrapper the JS updater targets');

  const footerPartialPath = 'templates/apps/progression-framework/action-footer.hbs';
  assert.ok(fs.existsSync(path.join(ROOT, footerPartialPath)), 'action-footer.hbs partial was not created');
  assert.match(shellHbs, /\{\{>\s*"systems\/foundryvtt-swse\/templates\/apps\/progression-framework\/action-footer\.hbs"\s*\}\}/,
    'progression-shell.hbs must include the extracted action-footer partial rather than inlining the footer twice');

  // No duplicate footer markup left inline in the main template.
  assert.ok(!shellHbs.includes('data-action="previous-step"'),
    'progression-shell.hbs still has an inline copy of the footer markup');

  const loadTemplatesSrc = fs.readFileSync(path.join(ROOT, 'scripts/load-templates.js'), 'utf8');
  assert.ok(loadTemplatesSrc.includes("templates/apps/progression-framework/action-footer.hbs'"),
    'action-footer.hbs is not registered in the template preload manifest');

  // Phase 2.1: summary-panel-body.hbs — the placeholder fallback must live
  // in exactly one file, included by the structural template and rendered
  // directly by the scoped summary updater, never duplicated inline.
  const summaryBodyPartialPath = 'templates/apps/progression-framework/summary-panel/summary-panel-body.hbs';
  assert.ok(fs.existsSync(path.join(ROOT, summaryBodyPartialPath)), 'summary-panel-body.hbs partial was not created');
  const summaryBodyPartialSrc = fs.readFileSync(path.join(ROOT, summaryBodyPartialPath), 'utf8');
  assert.match(summaryBodyPartialSrc, /prog-summary-placeholder/,
    'summary-panel-body.hbs must contain the canonical placeholder markup');
  assert.match(shellHbs, /\{\{>\s*"systems\/foundryvtt-swse\/templates\/apps\/progression-framework\/summary-panel\/summary-panel-body\.hbs"\s*\}\}/,
    'progression-shell.hbs must include the extracted summary-panel-body partial rather than inlining the placeholder twice');
  assert.ok(!shellHbs.includes('prog-summary-placeholder'),
    'progression-shell.hbs still has an inline copy of the summary placeholder markup');
  assert.ok(loadTemplatesSrc.includes("templates/apps/progression-framework/summary-panel/summary-panel-body.hbs'"),
    'summary-panel-body.hbs is not registered in the template preload manifest');
}

/* ==================================================================== *
 * PHASE 2.1 CLOSURE — real caller region-contract audit.
 *
 * Phase 2 proved the scheduler treats ['work-surface', 'utility'] as a
 * cheap partial. It did not prove every real search/filter/sort caller
 * actually asks for that scope — several genuinely called requestRender()
 * with no regions and no structural: true, which the scheduler correctly
 * (if silently) treats as structural. This section closes that gap two
 * ways: exact coverage of the explicitly known defects, and a broader
 * scan across every step file known to wire prog:utility:* / onUtilityChange
 * so a FUTURE regionless utility handler fails loudly instead of quietly
 * reverting to structural rendering.
 * ==================================================================== */

/* ------------------------------------------------------------------ *
 * 13. Exact coverage of the known defects: Species search/filter/sort and
 *     the Feat filter-checkbox path must declare real dirty regions, not
 *     fall through to an implicit structural render.
 * ------------------------------------------------------------------ */
{
  const speciesSrc = fs.readFileSync(
    path.join(ROOT, 'scripts/apps/progression-framework/steps/species-step.js'), 'utf8');
  for (const reason of ['species-step:onSearch', 'species-step:onFilter', 'species-step:onSort']) {
    const idx = speciesSrc.indexOf(`reason: '${reason}'`);
    assert.ok(idx > 0, `species-step.js: ${reason} call not found`);
    const callStart = speciesSrc.lastIndexOf('requestRender', idx);
    const callEnd = speciesSrc.indexOf(');', idx);
    const callText = speciesSrc.slice(callStart, callEnd);
    assert.match(callText, /regions\s*:\s*\[/,
      `species-step.js: ${reason} must declare regions — this is the known Phase 2.1 defect`);
  }

  const featSrc = fs.readFileSync(
    path.join(ROOT, 'scripts/apps/progression-framework/steps/feat-step.js'), 'utf8');
  assert.ok(!featSrc.includes("reason: 'feat-step:onSort'"),
    "feat-step.js still has the misleading 'feat-step:onSort' reason on the filter-checkbox path");
  const checkboxIdx = featSrc.indexOf("reason: 'feat-filter-checkbox'");
  assert.ok(checkboxIdx > 0, 'feat-step.js: feat-filter-checkbox call not found');
  const checkboxCallStart = featSrc.lastIndexOf('requestRender', checkboxIdx);
  const checkboxCallEnd = featSrc.indexOf(');', checkboxIdx);
  assert.match(featSrc.slice(checkboxCallStart, checkboxCallEnd), /regions\s*:\s*\[/,
    'feat-step.js: the filter-checkbox path must declare regions — this is the known Phase 2.1 defect');
}

/* ------------------------------------------------------------------ *
 * 14. Broader scan: every step file that wires prog:utility:search/
 *     filter/sort listeners, or implements onUtilityChange(), must have
 *     every requestRender() call reached from onDataReady()/
 *     onUtilityChange() declare either regions: or structural: true.
 *     A future handler that omits both silently reverts to structural
 *     and must fail this test.
 * ------------------------------------------------------------------ */
{
  const stepsDir = path.join(ROOT, 'scripts/apps/progression-framework/steps');
  const stepFiles = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) { walk(full); continue; }
      if (full.endsWith('.js')) stepFiles.push(full);
    }
  };
  walk(stepsDir);

  const extractBalanced = (src, openIdx) => {
    let depth = 0, i = openIdx;
    while (i < src.length) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth -= 1; if (depth === 0) return src.slice(openIdx, i + 1); }
      i++;
    }
    return src.slice(openIdx);
  };

  const checkRequestRenderScopes = (body) => {
    const offenders = [];
    const re = /requestRender\??\.?\(\{/g;
    let m;
    while ((m = re.exec(body))) {
      const braceIdx = body.indexOf('{', m.index + (m[0].length - 1));
      const argObj = extractBalanced(body, braceIdx);
      if (!/regions\s*:/.test(argObj) && !/structural\s*:/.test(argObj)) {
        offenders.push(argObj.replace(/\s+/g, ' ').trim().slice(0, 120));
      }
    }
    return offenders;
  };

  const utilityDrivenOffenders = [];
  for (const file of stepFiles) {
    const rel = path.relative(ROOT, file);
    const src = fs.readFileSync(file, 'utf8');
    if (!/prog:utility:(search|filter|sort)|onUtilityChange\(/.test(src)) continue;

    // onDataReady() is where every audited file wires its prog:utility:*
    // listeners inline; onUtilityChange() is the alternate direct-call
    // contract a few steps (class-step, feat-step) implement instead.
    for (const methodDecl of ['async onDataReady(', 'onDataReady(', 'async onUtilityChange(', 'onUtilityChange(']) {
      const start = src.indexOf(methodDecl);
      if (start < 0) continue;
      const braceIdx = src.indexOf('{', start);
      if (braceIdx < 0) continue;
      const body = extractBalanced(src, braceIdx);
      for (const offender of checkRequestRenderScopes(body)) {
        utilityDrivenOffenders.push(`${rel} [${methodDecl.replace('(', '')}]: ${offender}`);
      }
    }
  }

  assert.deepEqual(utilityDrivenOffenders, [],
    `utility-driven requestRender() call(s) with neither regions: nor structural: true — these silently revert to a full structural render:\n  ${utilityDrivenOffenders.join('\n  ')}`);
}

/* ==================================================================== *
 * PHASE 3: Single-pass canonical status evaluation.
 *
 * _evaluateStepStatus() itself calls several plugin contracts per visited
 * step (validate/getBlockingIssues/getWarnings/getRemainingPicks/
 * getSelection) — not free. These tests drive the REAL evaluation logic
 * (not a stubbed _evaluateStepStatus, unlike the region-updater fixtures
 * above) through a minimal but real ProgressionShell instance, with
 * counting/throwing plugins standing in for the expensive contracts, to
 * prove a step's canonical status is computed at most once per
 * render/job — and that unvisited steps stay cheap.
 * ==================================================================== */

/** A step plugin whose status-contract methods count their own calls and
 * can optionally throw, so a test can assert exact call counts and prove
 * an unvisited step's expensive methods are never touched. */
function makeStatusCountingPlugin({
  blockingIssues = [],
  warnings = [],
  remainingPicks = [],
  selection = null,
  throwOnCall = false,
} = {}) {
  const calls = { validate: 0, getBlockingIssues: 0, getWarnings: 0, getRemainingPicks: 0, getSelection: 0 };
  const guard = (name) => {
    calls[name] += 1;
    if (throwOnCall) throw new Error(`${name}() should not have been called for an unvisited step`);
  };
  return {
    calls,
    validate() { guard('validate'); return { isValid: blockingIssues.length === 0 && warnings.length === 0, errors: [], warnings: [] }; },
    getBlockingIssues() { guard('getBlockingIssues'); return blockingIssues; },
    getWarnings() { guard('getWarnings'); return warnings; },
    getRemainingPicks() { guard('getRemainingPicks'); return remainingPicks; },
    getSelection() { guard('getSelection'); return selection; },
  };
}

/** A REAL ProgressionShell instance (Object.create(ProgressionShell.prototype),
 * not a stand-in) with the minimal state _evaluateStepStatus()/
 * _hasCommittedSelectionForStep()/_normalizeCompletedStepIds() actually
 * read, so these tests exercise the production evaluation logic itself. */
function makeStatusTestShell({ steps, visitedStepIds = [], invalidatedStepIds = [], completedStepIds = [], currentStepIndex = 0 } = {}) {
  const shell = Object.create(ProgressionShell.prototype);
  const stepPlugins = new Map(steps.map(({ descriptor, plugin }) => [descriptor.stepId, plugin]));
  Object.assign(shell, {
    steps: steps.map(({ descriptor }) => descriptor),
    stepPlugins,
    currentStepIndex,
    actor: null,
    mode: 'chargen',
    buildIntent: null,
    focusedItem: null,
    progressRailCollapsed: false,
    progressRail: { afterRender() {} },
    committedSelections: new Map(),
    progressionSession: {
      visitedStepIds: [...visitedStepIds],
      invalidatedStepIds: [...invalidatedStepIds],
      completedStepIds: [...completedStepIds],
      draftSelections: {},
      lastModifiedAt: 0,
    },
  });
  return shell;
}

/* ------------------------------------------------------------------ *
 * TEST 1 + 2 — one evaluation per step for progress, and completed-step
 * normalization reuses that SAME evaluation rather than evaluating a
 * completed step a second time. Fixture matches the addendum's spec:
 * 'a' is genuinely canonical-complete and must survive normalization;
 * 'b' is listed in completedStepIds but is NOT actually complete (still
 * has a remaining pick) and must be dropped — proving normalization's
 * verdict on 'b' came from a real (shared) evaluation, not a rubber stamp.
 * ------------------------------------------------------------------ */
{
  const completePlugin = makeStatusCountingPlugin({ selection: { isComplete: true } });
  const inProgressPlugin = makeStatusCountingPlugin({ remainingPicks: [{ label: 'Picks', count: 2 }] });
  const errorPlugin = makeStatusCountingPlugin({ blockingIssues: ['Something is wrong'] });

  const steps = [
    { descriptor: { stepId: 'a', label: 'A' }, plugin: completePlugin },
    { descriptor: { stepId: 'b', label: 'B' }, plugin: inProgressPlugin },
    { descriptor: { stepId: 'c', label: 'C' }, plugin: errorPlugin },
  ];
  const shell = makeStatusTestShell({
    steps,
    visitedStepIds: ['a', 'b', 'c'],
    completedStepIds: ['a', 'b'],
  });

  const stepProgress = shell._computeStepProgress();

  for (const [label, plugin] of [['complete', completePlugin], ['in-progress', inProgressPlugin], ['error', errorPlugin]]) {
    assert.equal(plugin.calls.getBlockingIssues, 1, `${label}-step plugin.getBlockingIssues() was called ${plugin.calls.getBlockingIssues} times, expected 1 — completed-step normalization re-evaluated it separately from the stepProgress build`);
    assert.equal(plugin.calls.getWarnings, 1, `${label}-step plugin.getWarnings() was called ${plugin.calls.getWarnings} times, expected 1`);
    assert.equal(plugin.calls.getRemainingPicks, 1, `${label}-step plugin.getRemainingPicks() was called ${plugin.calls.getRemainingPicks} times, expected 1`);
    assert.equal(plugin.calls.validate, 1, `${label}-step plugin.validate() was called ${plugin.calls.validate} times, expected 1`);
  }

  assert.deepEqual(shell.progressionSession.completedStepIds, ['a'],
    'completedStepIds normalization did not correctly keep the genuinely-complete step and drop the non-complete one');
  assert.ok(shell.progressionSession.lastModifiedAt > 0, 'lastModifiedAt was not updated when completedStepIds changed');

  assert.equal(stepProgress.length, 3);
  assert.equal(stepProgress[0].status, 'complete');
  assert.equal(stepProgress[1].status, 'in_progress');
  assert.equal(stepProgress[2].status, 'error');
}

/* ------------------------------------------------------------------ *
 * TEST 3 — structural status consumers do not re-evaluate.
 *
 * `visibleSteps` (a second full per-step _evaluateStepStatus() pass,
 * plus a redundant plugin.getWarnings() call) was confirmed dead — no
 * template, script, or test on this branch reads context.visibleSteps —
 * and was removed rather than rebuilt from the shared evaluator. This is
 * a static guard: the ONLY places `this._evaluateStepStatus(` may appear
 * as a literal call are _createStepStatusEvaluator() itself (the one
 * canonical entry point every other consumer goes through) and
 * _markStepCompleted() (an explicit action-boundary call that
 * deliberately wants a guaranteed-live result, not a cached one — see the
 * "explicit mutation/completion checks" classification). Any THIRD call
 * site is exactly the kind of reintroduced duplicate pass Phase 3 exists
 * to prevent.
 * ------------------------------------------------------------------ */
{
  const src = fs.readFileSync(
    path.join(ROOT, 'scripts/apps/progression-framework/shell/progression-shell.js'), 'utf8'
  );
  const callSites = [...src.matchAll(/this\._evaluateStepStatus\(/g)];
  assert.equal(callSites.length, 2,
    `expected exactly 2 direct this._evaluateStepStatus( call sites (inside _createStepStatusEvaluator() and _markStepCompleted()), found ${callSites.length} — a new direct caller should go through _createStepStatusEvaluator() instead`);
  assert.doesNotMatch(src, /visibleSteps\s*:/,
    'visibleSteps context field was reintroduced — it was confirmed to have zero consumers (no template/script/test reads it) and removed to eliminate its independent per-step _evaluateStepStatus() + getWarnings() pass');
}

/* ------------------------------------------------------------------ *
 * TEST — job-scoped evaluator memoizes across multiple consumers within
 * ONE job, order-independent (Map lookup by (stepIndex, stepId) is
 * inherently order-independent, but this proves it directly rather than
 * assuming it).
 * ------------------------------------------------------------------ */
{
  const plugin = makeStatusCountingPlugin({ selection: { isComplete: true } });
  const steps = [{ descriptor: { stepId: 'x', label: 'X' }, plugin }];
  const shell = makeStatusTestShell({ steps, visitedStepIds: ['x'] });
  const job = shell._createRegionRenderJob();

  assert.equal(plugin.calls.getBlockingIssues, 0, 'creating a job eagerly evaluated a step — the evaluator must be lazy');

  const first = job.statusEvaluator.get('x', 0);
  const second = job.statusEvaluator.get('x', 0);
  assert.equal(first, second, 'job.statusEvaluator.get() did not return the SAME cached evaluation object on a second call for the same step');
  assert.equal(plugin.calls.getBlockingIssues, 1, 'job-scoped evaluator re-evaluated the same step on a second get()');

  // A DIFFERENT job gets a fresh, empty cache — no persistence across jobs.
  const secondJob = shell._createRegionRenderJob();
  secondJob.statusEvaluator.get('x', 0);
  assert.equal(plugin.calls.getBlockingIssues, 2, 'a new job did not evaluate independently — evaluator state leaked across jobs');
}

/* ------------------------------------------------------------------ *
 * TEST — real _updateProgressRegion(root, job) reuses a job's evaluator:
 * pre-warming the evaluator for one step (as if something else in the
 * same job had already asked for it) means the progress-rail update does
 * not evaluate that step again.
 * ------------------------------------------------------------------ */
{
  const pluginA = makeStatusCountingPlugin({ selection: { isComplete: true } });
  const pluginB = makeStatusCountingPlugin({ remainingPicks: [{ label: 'Picks', count: 1 }] });
  const steps = [
    { descriptor: { stepId: 'a', label: 'A' }, plugin: pluginA },
    { descriptor: { stepId: 'b', label: 'B' }, plugin: pluginB },
  ];
  const shell = makeStatusTestShell({ steps, visitedStepIds: ['a', 'b'] });
  const job = shell._createRegionRenderJob();

  // Simulate another consumer in the same job already having asked for 'a'.
  job.statusEvaluator.get('a', 0);
  assert.equal(pluginA.calls.getBlockingIssues, 1);

  const fixture = buildRegionFixture();
  await withRenderTemplateStub(
    (template) => (String(template).endsWith('progress-rail.hbs') ? '<div class="new-progress">PROGRESS</div>' : ''),
    () => shell._updateProgressRegion(fixture.root, job)
  );

  assert.equal(pluginA.calls.getBlockingIssues, 1, '_updateProgressRegion() re-evaluated a step the job had already evaluated');
  assert.equal(pluginB.calls.getBlockingIssues, 1, '_updateProgressRegion() did not evaluate a step nothing had evaluated yet');
  assert.equal(fixture.progressEl.innerHTML, '<div class="new-progress">PROGRESS</div>');

  // A standalone call with no job still works (existing callers pass none).
  const pluginC = makeStatusCountingPlugin({ selection: { isComplete: true } });
  const soloShell = makeStatusTestShell({ steps: [{ descriptor: { stepId: 'c', label: 'C' }, plugin: pluginC }], visitedStepIds: ['c'] });
  const soloFixture = buildRegionFixture();
  await withRenderTemplateStub(
    (template) => (String(template).endsWith('progress-rail.hbs') ? '<div class="solo-progress">P</div>' : ''),
    () => soloShell._updateProgressRegion(soloFixture.root)
  );
  assert.equal(soloFixture.progressEl.innerHTML, '<div class="solo-progress">P</div>', '_updateProgressRegion() without a job argument regressed');
}

/* ------------------------------------------------------------------ *
 * TEST 5 (footer-only lazy-evaluation anti-regression) — a footer-only
 * scoped update must not evaluate ANY step's canonical status. The
 * action footer intentionally does NOT read job.statusEvaluator (see the
 * deliverable report: ActionFooter.build() calls plugin getters with the
 * shell argument, e.g. getBlockingIssues(shell), while
 * _evaluateStepStatus() calls them with none — at least 3 real step
 * plugins (attribute-step, reconciliation-overview-step, summary-step)
 * behave differently depending on that argument, so reusing
 * _evaluateStepStatus()'s cached values for the footer would silently
 * change footer output for those steps). This test locks in that the
 * job's canonical-status evaluator therefore stays completely untouched
 * by a footer-only update — proving footer-only really is lazy, not just
 * "lazy for other steps."
 * ------------------------------------------------------------------ */
{
  const currentPlugin = makeStatusCountingPlugin({ remainingPicks: [{ label: 'Picks', count: 1 }] });
  const otherPlugin = makeStatusCountingPlugin({ throwOnCall: true });
  const steps = [
    { descriptor: { stepId: 'current', label: 'Current' }, plugin: currentPlugin },
    { descriptor: { stepId: 'other', label: 'Other' }, plugin: otherPlugin },
  ];
  const shell = makeStatusTestShell({ steps, visitedStepIds: ['current', 'other'], currentStepIndex: 0 });
  const job = shell._createRegionRenderJob();

  const fixture = buildRegionFixture();
  await withRenderTemplateStub(
    (template) => (String(template).endsWith('action-footer.hbs') ? '<div class="new-footer">FOOTER</div>' : ''),
    () => shell._updateFooterRegion(fixture.root, job)
  );

  assert.equal(fixture.footerEl.innerHTML, '<div class="new-footer">FOOTER</div>');
  // ActionFooter.build() calls the CURRENT plugin's own getters directly
  // (unchanged, existing behavior) — that is expected and fine.
  assert.equal(currentPlugin.calls.getBlockingIssues, 1);
  // But the canonical evaluator itself must never have been touched: no
  // step's _evaluateStepStatus() ran, for the current step OR any other.
  assert.equal(otherPlugin.calls.getBlockingIssues, 0, 'footer-only update evaluated a non-current step\'s canonical status');
  assert.equal(otherPlugin.calls.validate, 0, 'footer-only update evaluated a non-current step\'s canonical status');
}

/* ------------------------------------------------------------------ *
 * TEST 6 — unvisited steps remain cheap: a step outside visitedStepIds
 * must resolve to 'neutral' WITHOUT ever calling validate/
 * getBlockingIssues/getWarnings/getRemainingPicks. Fixture plugin throws
 * if any of them are invoked, so any regression fails loudly.
 * ------------------------------------------------------------------ */
{
  const unvisitedPlugin = makeStatusCountingPlugin({ throwOnCall: true });
  const steps = [{ descriptor: { stepId: 'future', label: 'Future' }, plugin: unvisitedPlugin }];
  const shell = makeStatusTestShell({ steps, visitedStepIds: [] });

  const evaluator = shell._createStepStatusEvaluator();
  const status = evaluator.get('future', 0);

  assert.equal(status.canonical, 'neutral', 'an unvisited step did not resolve to neutral status');
  assert.equal(unvisitedPlugin.calls.validate, 0, 'unvisited step called validate() — lazy evaluation regressed');
  assert.equal(unvisitedPlugin.calls.getBlockingIssues, 0, 'unvisited step called getBlockingIssues() — lazy evaluation regressed');
  assert.equal(unvisitedPlugin.calls.getWarnings, 0, 'unvisited step called getWarnings() — lazy evaluation regressed');
  assert.equal(unvisitedPlugin.calls.getRemainingPicks, 0, 'unvisited step called getRemainingPicks() — lazy evaluation regressed');
}

/* ------------------------------------------------------------------ *
 * TEST 7 — status parity: representative states produce exactly the
 * canonical precedence documented on _evaluateStepStatus() —
 * error > caution > complete > in_progress > neutral — unchanged by the
 * Phase 3 memoization work.
 * ------------------------------------------------------------------ */
{
  const cases = [
    {
      name: 'neutral (unvisited)', visited: false,
      plugin: makeStatusCountingPlugin({ throwOnCall: true }),
      expect: 'neutral',
    },
    {
      name: 'in_progress (positive remaining count)', visited: true,
      plugin: makeStatusCountingPlugin({ remainingPicks: [{ label: 'Picks', count: 3 }] }),
      expect: 'in_progress',
    },
    {
      name: 'complete', visited: true,
      plugin: makeStatusCountingPlugin({ selection: { isComplete: true } }),
      expect: 'complete',
    },
    {
      name: 'caution due to warning', visited: true,
      plugin: makeStatusCountingPlugin({ warnings: ['Heads up'], selection: { isComplete: true } }),
      expect: 'caution',
    },
    {
      name: 'error due to blocking issue', visited: true,
      plugin: makeStatusCountingPlugin({ blockingIssues: ['Blocked'] }),
      expect: 'error',
    },
    {
      name: 'explicit selectionState.isComplete false falls back to in_progress', visited: true,
      plugin: makeStatusCountingPlugin({ selection: { isComplete: false } }),
      expect: 'in_progress',
    },
    {
      name: 'zero-count getRemainingPicks row does not block completion', visited: true,
      plugin: makeStatusCountingPlugin({ remainingPicks: [{ label: 'Picks', count: 0 }], selection: { isComplete: true } }),
      expect: 'complete',
    },
  ];

  for (const { name, visited, plugin, expect } of cases) {
    const steps = [{ descriptor: { stepId: 's', label: 'S' }, plugin }];
    const shell = makeStatusTestShell({ steps, visitedStepIds: visited ? ['s'] : [] });
    const status = shell._evaluateStepStatus('s', 0);
    assert.equal(status.canonical, expect, `status parity case "${name}" — expected ${expect}, got ${status.canonical}`);
  }

  // Caution due to staleness (invalidatedStepIds), independent of warnings.
  {
    const plugin = makeStatusCountingPlugin({ selection: { isComplete: true } });
    const steps = [{ descriptor: { stepId: 's', label: 'S' }, plugin }];
    const shell = makeStatusTestShell({ steps, visitedStepIds: ['s'], invalidatedStepIds: ['s'] });
    const status = shell._evaluateStepStatus('s', 0);
    assert.equal(status.canonical, 'caution', 'stale (invalidated) step did not resolve to caution');
    assert.equal(status.isStale, true);
  }

  // error due to a validation error (not a blocking issue) is still 'error'.
  {
    const plugin = {
      validate: () => ({ isValid: false, errors: ['Validation failed'], warnings: [] }),
      getBlockingIssues: () => [],
      getWarnings: () => [],
      getRemainingPicks: () => [],
      getSelection: () => null,
    };
    const steps = [{ descriptor: { stepId: 's', label: 'S' }, plugin }];
    const shell = makeStatusTestShell({ steps, visitedStepIds: ['s'] });
    const status = shell._evaluateStepStatus('s', 0);
    assert.equal(status.canonical, 'error', 'a validation error (distinct from a blocking issue) did not produce error status');
    assert.deepEqual(status.errors, ['Validation failed']);
  }
}

/* ------------------------------------------------------------------ *
 * TEST 9 — no persistent cross-render/job status cache: the cache lives
 * only inside the closure _createStepStatusEvaluator() returns. Static
 * guard against a shell-instance field reintroducing persistence.
 * ------------------------------------------------------------------ */
{
  const src = fs.readFileSync(
    path.join(ROOT, 'scripts/apps/progression-framework/shell/progression-shell.js'), 'utf8'
  );
  const forbiddenPatterns = [/this\._statusCache\b/, /this\._statusSnapshot\b/, /this\._stepStatusCache\b/];
  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(src, pattern,
      `found ${pattern} — status memoization must live inside _createStepStatusEvaluator()'s closure, not on the shell instance (that would persist across renders/jobs)`);
  }
  // The evaluator's cache is a local const, not assigned to `this`.
  const evaluatorSrc = src.slice(src.indexOf('_createStepStatusEvaluator() {'), src.indexOf('_createStepStatusEvaluator() {') + 800);
  assert.match(evaluatorSrc, /const cache = new Map\(\)/,
    '_createStepStatusEvaluator() no longer creates a local (non-persistent) cache');
}

console.log('progression-render-scheduler-budgets (phase 3): all assertions passed');

console.log('progression-render-scheduler-budgets: all assertions passed');
