import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Suggestion request identity, scheduler accounting, scroll ownership, focus
// vocabulary, and card-action presentation.
//
// The five defects here share one shape: something was described by a proxy for
// itself, and the proxy was wrong in cases the proxy could not see.
//
//  - the suggestion cache key stood in for the request, but omitted the
//    candidate pool, the engine options and the class, so two genuinely
//    different questions collapsed onto one answer;
//  - invalidation stood in for cancellation, but a request already running
//    still wrote its pre-invalidation result into the cache that was just
//    cleared;
//  - the requested render scope stood in for the render that happened, so a
//    partial that fell back to a full repaint was counted as a partial;
//  - a request-time scroll snapshot stood in for the render that would consume
//    it, so a skipped request leaked its scroll state into a later one;
//  - `is-focused` stood in for "focused", on steps that style bare `focused`;
//  - and `verb + name` stood in for the button's meaning, so a card reading
//    LOCKED announced "Select X".

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

registerFoundryPathLoader();
installFoundryShimGlobals();

globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.deepClone = (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.utils.mergeObject = globalThis.foundry.utils.mergeObject ?? ((a, b) => ({ ...a, ...b }));
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

const { SuggestionService } = await import('/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js');
const { ProgressionRenderScheduler } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-render-scheduler.js'
);
const {
  resolveOptionCardAction,
  buildOptionCardAction,
} = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/option-card-action.js');

const actor = () => ({
  id: 'fingerprint-actor',
  documentName: 'Actor',
  system: { level: 3, abilities: {} },
  items: [],
});

/* ================================================================== *
 * 1. REQUEST IDENTITY
 *
 * Each field's removal must change a real outcome, not just a string.
 * ================================================================== */

/* 1a. The candidate pool is part of the question. */
{
  const a = SuggestionService.describeRequest(actor(), 'levelup', {
    domain: 'feats',
    available: [{ id: 'feat-a' }, { id: 'feat-b' }],
  });
  const b = SuggestionService.describeRequest(actor(), 'levelup', {
    domain: 'feats',
    available: [{ id: 'feat-a' }, { id: 'feat-c' }],
  });
  assert.notEqual(a.key, b.key,
    'two different legal candidate pools share one request identity, so the second caller receives suggestions drawn from a pool it never offered');

  // Pool ORDER is not part of the question — the same set in another order is
  // the same request, or every re-sort would miss the cache.
  const c = SuggestionService.describeRequest(actor(), 'levelup', {
    domain: 'feats',
    available: [{ id: 'feat-b' }, { id: 'feat-a' }],
  });
  assert.equal(a.key, c.key, 'candidate ordering forks the request identity');

  // Pool SIZE alone is not enough: same count, different members.
  const d = SuggestionService.describeRequest(actor(), 'levelup', {
    domain: 'feats',
    available: [{ id: 'feat-x' }, { id: 'feat-y' }],
  });
  assert.notEqual(a.key, d.key, 'pools of equal size collapse onto one identity');

  // An omitted pool is not the same as an empty one: omitted means "use the
  // engine's default list", which is a different question from "no candidates".
  const omitted = SuggestionService.describeRequest(actor(), 'levelup', { domain: 'feats' });
  const empty = SuggestionService.describeRequest(actor(), 'levelup', { domain: 'feats', available: [] });
  assert.notEqual(omitted.key, empty.key, 'an omitted pool and an empty pool are indistinguishable');
}

/* 1b. Engine options are part of the question, and key order is not. */
{
  const base = SuggestionService.describeRequest(actor(), 'levelup', {
    domain: 'talents', engineOptions: { weighting: 'defensive', limit: 5 },
  });
  const changed = SuggestionService.describeRequest(actor(), 'levelup', {
    domain: 'talents', engineOptions: { weighting: 'offensive', limit: 5 },
  });
  assert.notEqual(base.key, changed.key, 'engine options do not affect the request identity');

  const reordered = SuggestionService.describeRequest(actor(), 'levelup', {
    domain: 'talents', engineOptions: { limit: 5, weighting: 'defensive' },
  });
  assert.equal(base.key, reordered.key,
    'engine option key ORDER forks the identity, so the same request misses its own cache');

  // Nested options still count.
  const nestedA = SuggestionService.describeRequest(actor(), 'levelup', {
    domain: 'talents', engineOptions: { horizon: { near: 1, far: 2 } },
  });
  const nestedB = SuggestionService.describeRequest(actor(), 'levelup', {
    domain: 'talents', engineOptions: { horizon: { near: 1, far: 3 } },
  });
  assert.notEqual(nestedA.key, nestedB.key, 'nested engine options are ignored');

  // A live document or callback handed through must not throw or destabilize.
  class FakeDoc { constructor() { this.self = this; } }
  const withDoc = () => SuggestionService.describeRequest(actor(), 'levelup', {
    domain: 'talents', engineOptions: { doc: new FakeDoc(), cb: () => {} },
  });
  assert.doesNotThrow(withDoc, 'a cyclic value in engineOptions breaks the fingerprint');
  assert.equal(withDoc().key, withDoc().key, 'the fingerprint is not stable across calls');
}

/* 1c. className selects the default pool, so it is part of the question. */
{
  const soldier = SuggestionService.describeRequest(actor(), 'levelup', { domain: 'feats', className: 'Soldier' });
  const scout = SuggestionService.describeRequest(actor(), 'levelup', { domain: 'feats', className: 'Scout' });
  assert.notEqual(soldier.key, scout.key,
    'two classes at one revision share a request identity, so a Scout can be advised from the Soldier list');
}

/* 1d. The fields that always mattered still do, and invalidate()'s prefix
 *     match still lands on the key. */
{
  const base = SuggestionService.describeRequest(actor(), 'levelup', { domain: 'feats' });
  assert.ok(base.key.startsWith('fingerprint-actor::'),
    'the identity no longer starts with the actor id, so invalidate(actorId) matches nothing and never clears the cache');

  assert.notEqual(base.key, SuggestionService.describeRequest(actor(), 'chargen', { domain: 'feats' }).key);
  assert.notEqual(base.key, SuggestionService.describeRequest(actor(), 'levelup', { domain: 'talents' }).key);
  assert.notEqual(base.key, SuggestionService.describeRequest(actor(), 'levelup', { domain: 'feats', focus: 'combat' }).key);

  // Actor state still moves the revision.
  const levelled = { ...actor(), system: { level: 4, abilities: {} } };
  assert.notEqual(base.revision, SuggestionService.describeRequest(levelled, 'levelup', { domain: 'feats' }).revision);
}

/* ================================================================== *
 * 2. IN-FLIGHT AND INVALIDATION OWNERSHIP
 * ================================================================== */

/* 2a. Requests differing only by pool must not join each other. */
{
  const original = SuggestionService._computeSuggestions;
  let started = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  SuggestionService._computeSuggestions = async () => { started += 1; await gate; return []; };
  try {
    const a = SuggestionService.getSuggestions(actor(), 'levelup', { domain: 'feats', available: [{ id: 'x' }] });
    const b = SuggestionService.getSuggestions(actor(), 'levelup', { domain: 'feats', available: [{ id: 'y' }] });
    const c = SuggestionService.getSuggestions(actor(), 'levelup', { domain: 'feats', available: [{ id: 'x' }] });
    release();
    await Promise.all([a, b, c]);
    assert.equal(started, 2,
      `expected two computations (two distinct pools, one join), got ${started}`);
  } finally {
    SuggestionService._computeSuggestions = original;
    SuggestionService._inFlight.clear();
    SuggestionService._cache.clear();
  }
}

/* 2b. Cleanup deletes only its own entry.
 *
 * Invalidate between start and settle; a new request takes the same key. The
 * old request's finally must not evict the new one — it used to delete
 * unconditionally, so the newer work vanished from the map and a third caller
 * started a duplicate evaluation against state that was already being computed.
 */
{
  const original = SuggestionService._computeSuggestions;
  let releaseFirst;
  const first = new Promise((resolve) => { releaseFirst = resolve; });
  let call = 0;
  SuggestionService._computeSuggestions = async () => {
    call += 1;
    if (call === 1) { await first; return ['first']; }
    return new Promise(() => {}); // second request stays in flight
  };
  try {
    const options = { domain: 'feats', available: [{ id: 'x' }] };
    const key = SuggestionService.describeRequest(actor(), 'levelup', options).key;

    // getSuggestions awaits actor resolution before it registers, so let the
    // registration land before inspecting the map.
    void SuggestionService.getSuggestions(actor(), 'levelup', options);
    await Promise.resolve(); await Promise.resolve();
    assert.ok(SuggestionService._inFlight.has(key), 'the first request never registered');

    SuggestionService.invalidate('fingerprint-actor');
    assert.ok(!SuggestionService._inFlight.has(key), 'invalidate() left the old in-flight entry behind');

    void SuggestionService.getSuggestions(actor(), 'levelup', options);
    await Promise.resolve(); await Promise.resolve();
    const second = SuggestionService._inFlight.get(key);
    assert.ok(second, 'the new request did not register');

    releaseFirst();
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();

    assert.equal(SuggestionService._inFlight.get(key), second,
      'the superseded request evicted the newer in-flight entry on its way out');
  } finally {
    SuggestionService._computeSuggestions = original;
    SuggestionService._inFlight.clear();
    SuggestionService._cache.clear();
  }
}

/* 2c. Invalidation is generation-owned: a result computed before it is
 *     returned to its own caller but never cached. */
{
  const src = read('scripts/engine/suggestion/SuggestionService.js');
  assert.match(src, /static _generation = 0/, 'there is no generation counter');

  const invalidate = src.slice(src.indexOf('static invalidate(actorId)'));
  assert.match(invalidate.slice(0, 1200), /this\._generation \+= 1/,
    'invalidate() does not bump the generation, so a request already running still caches its pre-invalidation result');

  const compute = src.slice(src.indexOf('static async _computeSuggestions'));
  assert.match(compute, /const generation = this\._generation;/,
    '_computeSuggestions does not capture the generation it started under');
  const guardAt = compute.indexOf('if (generation !== this._generation)');
  const writeAt = compute.indexOf('this._cache.set(key,');
  assert.ok(guardAt > -1, 'the computation never compares its generation against the current one');
  assert.ok(writeAt > -1, 'the cache write could not be located');
  assert.ok(guardAt < writeAt,
    'the generation check does not sit BEFORE the cache write, so a superseded result is still stored');
  assert.match(compute.slice(guardAt, writeAt), /return focusFiltered;/,
    'a superseded computation does not return early, so it falls through to the cache write anyway');

  // The cleanup guard is an identity comparison, not a bare delete.
  assert.match(
    src,
    /if \(this\._inFlight\.get\(requestKey\) === promise\)\s*\{\s*this\._inFlight\.delete\(requestKey\);/,
    'in-flight cleanup deletes unconditionally and can evict a newer request under the same key'
  );
}

/* 2d. One identity function, used by both maps. */
{
  const src = read('scripts/engine/suggestion/SuggestionService.js');
  const calls = [...src.matchAll(/this\.describeRequest\(/g)];
  assert.ok(calls.length >= 2,
    'the in-flight map and the completed cache no longer share one identity function, so they can disagree about what a request is');
  const publicEntry = src.slice(src.indexOf('static async getSuggestions'), src.indexOf('static async _computeSuggestions'));
  assert.ok(!/SnapshotBuilder\.hashFromActor/.test(publicEntry),
    'getSuggestions builds its own key again instead of going through describeRequest');
}

/* ================================================================== *
 * 3. SCHEDULER OUTCOME ACCOUNTING
 * ================================================================== */

/* 3a. A requested partial that falls back to structural is counted as
 *     structural, not as a region update. */
{
  const scheduler = new ProgressionRenderScheduler({
    executeRender: async ({ regions }) => ({
      kind: 'structural',
      requestedRegions: regions,
      appliedRegions: [],
      fallbackReason: 'no-independent-seam:footer',
      structuralReason: 'preflight-fallback',
    }),
    captureScrollSnapshots: () => [],
    isDebugEnabled: () => false,
  });

  await scheduler.request({ reason: 'test', regions: ['footer'] });

  const stats = scheduler.stats();
  assert.equal(stats.fullRenders, 1, 'a fallback repaint was not counted as a full render');
  assert.deepEqual(stats.regionUpdates, {},
    'a region-scoped job satisfied by a full repaint is still counted as a partial render');
  assert.equal(stats.structuralFallbacks, 1, 'the requested-versus-actual gap is not reported');
}

/* 3b. A partial that really applied is still counted as a partial. */
{
  const scheduler = new ProgressionRenderScheduler({
    executeRender: async ({ regions }) => ({
      kind: 'partial',
      requestedRegions: regions,
      appliedRegions: ['details'],
      fallbackReason: null,
      structuralReason: null,
    }),
    captureScrollSnapshots: () => [],
    isDebugEnabled: () => false,
  });

  await scheduler.request({ reason: 'test', regions: ['details'] });

  const stats = scheduler.stats();
  assert.equal(stats.fullRenders, 0, 'a genuine partial was counted as a full render');
  assert.deepEqual(stats.regionUpdates, { details: 1 });
  assert.equal(stats.structuralFallbacks, 0);
}

/* 3bb. A partial that applied nothing contributes no region updates.
 *
 * The count must come from what the executor applied, not from what it was
 * handed; falling back to the requested list would re-introduce the same
 * requested-versus-actual gap one level down.
 */
{
  const scheduler = new ProgressionRenderScheduler({
    executeRender: async ({ regions }) => ({
      kind: 'partial',
      requestedRegions: regions,
      appliedRegions: [],
      fallbackReason: null,
      structuralReason: null,
    }),
    captureScrollSnapshots: () => [],
    isDebugEnabled: () => false,
  });
  await scheduler.request({ reason: 'test', regions: ['details'] });
  assert.deepEqual(scheduler.stats().regionUpdates, {},
    'a partial that applied nothing was still counted as a region update');
}

/* 3c. An executor that reports nothing is still accounted at the requested
 *     scope — the pre-existing behaviour, so the shell is not the only thing
 *     that may drive this scheduler. */
{
  const scheduler = new ProgressionRenderScheduler({
    executeRender: async () => undefined,
    captureScrollSnapshots: () => [],
    isDebugEnabled: () => false,
  });
  await scheduler.request({ reason: 'test', regions: ['details'] });
  assert.deepEqual(scheduler.stats().regionUpdates, { details: 1 });
}

/* 3d. The shell's executor actually reports outcomes. */
{
  const shell = read('scripts/apps/progression-framework/shell/progression-shell.js');
  const executor = shell.slice(
    shell.indexOf('async _executeScheduledRender('),
    shell.indexOf('async _updateRegion(')
  );
  assert.ok(executor.length > 200, 'the executor could not be located');

  // Every exit reports a kind.
  assert.ok(!/return this\.render\(/.test(executor),
    'the executor still returns a bare render result at some exit, which the scheduler cannot tell apart from a partial');
  assert.match(executor, /outcome\('structural', \{ structuralReason: 'requested'/);
  assert.match(executor, /fallbackReason: `no-independent-seam:/,
    'the preflight fallback does not report why it went structural');
  assert.match(executor, /fallbackReason: `region-update-failed:/,
    'the post-update fallback does not report why it went structural');
  assert.match(executor, /outcome\('partial', \{ appliedRegions/);

  // The outcome shape the scheduler destructures.
  for (const field of ['kind', 'requestedRegions', 'appliedRegions', 'fallbackReason', 'structuralReason']) {
    assert.ok(executor.includes(field), `the render outcome omits ${field}`);
  }
}

/* ================================================================== *
 * 4. SCROLL SNAPSHOT OWNERSHIP
 * ================================================================== */

/* 4a. A skipped job captures nothing. */
{
  let captures = 0;
  const scheduler = new ProgressionRenderScheduler({
    executeRender: async () => undefined,
    captureScrollSnapshots: () => { captures += 1; return [{ key: 'region:footer', top: 40 }]; },
    computeStateSignature: () => 'identical',
    isDebugEnabled: () => false,
  });

  // First render establishes the signature.
  await scheduler.request({ reason: 'first', structural: true, dedupe: true });
  const afterFirst = captures;

  // Second request is skipped as identical.
  await scheduler.request({ reason: 'second', structural: true, dedupe: true });
  assert.equal(scheduler.stats().skippedIdentical, 1, 'the identical-state skip did not fire');
  assert.equal(captures, afterFirst,
    'a request the scheduler skipped still captured a scroll snapshot, which the next render would restore');
}

/* 4b. A forbidden-region request captures nothing. */
{
  let captures = 0;
  const scheduler = new ProgressionRenderScheduler({
    executeRender: async () => undefined,
    captureScrollSnapshots: () => { captures += 1; return []; },
    isStrictMode: () => false,
    isDebugEnabled: () => false,
  });
  await scheduler.request({ reason: 'mentor-line', regions: ['mentor'] });
  assert.equal(captures, 0, 'a dropped forbidden-region request still captured scroll state');
}

/* 4c. An accepted job captures exactly once and hands it to the executor. */
{
  let captures = 0;
  let received = null;
  const scheduler = new ProgressionRenderScheduler({
    executeRender: async (job) => { received = job.scrollSnapshots; return undefined; },
    captureScrollSnapshots: () => { captures += 1; return [{ key: 'region:details', top: 12 }]; },
    isDebugEnabled: () => false,
  });
  await scheduler.request({ reason: 'accepted', structural: true });
  assert.equal(captures, 1, 'the accepted job did not capture exactly one snapshot');
  assert.deepEqual(received, [{ key: 'region:details', top: 12 }],
    'the accepted job\'s snapshot never reached the executor');
}

/* 4d. preserveScroll:false captures nothing. */
{
  let captures = 0;
  const scheduler = new ProgressionRenderScheduler({
    executeRender: async () => undefined,
    captureScrollSnapshots: () => { captures += 1; return []; },
    isDebugEnabled: () => false,
  });
  await scheduler.request({ reason: 'no-scroll', structural: true, preserveScroll: false });
  assert.equal(captures, 0, 'scroll was captured for a request that asked not to preserve it');
}

/* 4e. The shell no longer captures at request time. */
{
  const shell = read('scripts/apps/progression-framework/shell/progression-shell.js');
  const requestRender = shell.slice(
    shell.indexOf('  requestRender({'),
    shell.indexOf('_queueFollowUpRender(')
  );
  assert.ok(requestRender.length > 100, 'requestRender could not be located');
  assert.ok(!/this\._captureProgressionScrollSnapshots\(/.test(requestRender),
    'requestRender captures scroll before the scheduler has decided whether the request will run');
  assert.ok(!/_pendingScrollSnapshots\s*=/.test(requestRender),
    'requestRender still writes into the shell-level snapshot bucket');

  assert.match(shell, /captureScrollSnapshots: \(\) => this\._captureProgressionScrollSnapshots\(\)/,
    'the shell does not expose the accepted-job capture hook to the scheduler');

  // The render consumes the job's snapshot rather than re-reading the DOM a
  // frame later.
  assert.match(shell, /const jobSnapshots = Array\.isArray\(args\[0\]\?\.scrollSnapshots\)/);
  assert.match(shell, /\.\.\.\(jobSnapshots \?\? this\._captureProgressionScrollSnapshots\(renderRoot\)\)/,
    'a scheduled render re-captures instead of using the snapshot taken for its own job');
}

/* ================================================================== *
 * 5. FOCUSED-ROW VOCABULARY
 * ================================================================== */
{
  const shell = read('scripts/apps/progression-framework/shell/progression-shell.js');
  assert.match(shell, /export const FOCUSED_ROW_CLASSES = Object\.freeze\(\['is-focused', 'focused'\]\)/,
    'the focus vocabulary is not declared in one place');

  // Anchor on the method DEFINITION, not the earlier call site.
  const marker = shell.slice(
    shell.indexOf('\n  _markFocusedRow(root) {'),
    shell.indexOf('\n  _registerPersistenceHook() {')
  );
  assert.ok(marker.length > 100, '_markFocusedRow could not be located');
  assert.match(marker, /for \(const className of FOCUSED_ROW_CLASSES\) row\.classList\.toggle\(className, isFocused\)/,
    'the scoped focus patch applies only part of the vocabulary, so steps using the other spelling look focused only after a full repaint');
  assert.ok(!/toggle\('is-focused'/.test(marker),
    'the focus patch is hardcoded to one class name again');

  // Every focus class a progression work surface actually renders must be one
  // the shell knows how to apply.
  const declared = new Set(['is-focused', 'focused']);
  const dir = path.join(ROOT, 'templates/apps/progression-framework/steps');
  const rendered = new Set();
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.hbs')) continue;
    const src = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const m of src.matchAll(/\{\{#if [^}]*\}\}(is-focused|focused)\{\{\/if\}\}/g)) rendered.add(m[1]);
  }
  assert.ok(rendered.size > 0, 'no focus classes were found in the step templates; the scan is broken');
  for (const className of rendered) {
    assert.ok(declared.has(className),
      `templates render "${className}" but the shell's FOCUSED_ROW_CLASSES does not include it, so the scoped focus patch cannot apply it`);
  }
}

/* ================================================================== *
 * 6. CARD ACTION LABEL, ARIA AND LOCALIZATION
 * ================================================================== */

/* 6a. What the card SAYS and what it ANNOUNCES agree in every state. */
{
  const misleading = [];
  for (const state of ['owned', 'granted', 'locked', 'unavailable', 'maximum']) {
    const resolved = resolveOptionCardAction({ state, name: 'Point Blank Shot' });
    assert.notEqual(resolved.label, 'SELECT', `a ${state} card still reads SELECT`);
    if (/^Select /i.test(resolved.ariaLabel)) misleading.push(state);
  }
  assert.deepEqual(misleading, [],
    `these states are announced as "Select X" while visibly reading something else: ${misleading.join(', ')}`);

  // A verb override must not resurrect the lie on a card that cannot be taken.
  const locked = resolveOptionCardAction({ state: 'locked', name: 'Force Slam', verb: 'Add' });
  assert.ok(!/^Add /.test(locked.ariaLabel),
    'a verb override makes a locked card announce an action it does not offer');

  // ...but it still applies where the card IS actionable.
  assert.equal(resolveOptionCardAction({ name: 'Basic', verb: 'Add' }).ariaLabel, 'Add Basic');

  // The name reaches the announcement in every state.
  for (const state of ['owned', 'granted', 'locked', 'unavailable', 'maximum', 'again']) {
    assert.match(resolveOptionCardAction({ state, name: 'Skill Focus' }).ariaLabel, /Skill Focus/,
      `a ${state} card does not name what it is talking about`);
  }

  // Plain states.
  assert.equal(resolveOptionCardAction({}).label, 'SELECT');
  assert.equal(resolveOptionCardAction({ selected: true }).label, 'SELECTED');
  assert.equal(resolveOptionCardAction({ deselect: true }).label, 'DESELECT');
  assert.equal(resolveOptionCardAction({ state: 'again' }).label, 'SELECT AGAIN');
  // An explicit step state outranks the generic flags.
  assert.equal(resolveOptionCardAction({ state: 'owned', selected: true }).label, 'OWNED');
}

/* 6b. Labels are localized, with the shipped English as the fallback. */
{
  const previous = globalThis.game;
  globalThis.game = { i18n: { localize: (key) => (key === 'SWSE.Progression.CardAction.Select' ? 'CHOISIR' : key) } };
  try {
    assert.equal(resolveOptionCardAction({}).label, 'CHOISIR', 'card labels are not localized');
    // An untranslated key returns the key from Foundry; that must not surface.
    assert.equal(resolveOptionCardAction({ state: 'locked' }).label, 'LOCKED',
      'a missing translation renders the raw localization key');
  } finally {
    globalThis.game = previous;
  }

  const lang = JSON.parse(read('lang/en.json'));
  const bundle = lang.SWSE.Progression.CardAction;
  assert.ok(bundle, 'the card-action strings are not in the localization bundle');
  for (const key of ['Select', 'Selected', 'Deselect', 'Again', 'Owned', 'Granted', 'Locked', 'Unavailable', 'Maximum']) {
    assert.ok(bundle[key], `lang/en.json is missing SWSE.Progression.CardAction.${key}`);
    assert.ok(bundle[`${key}.Announce`], `lang/en.json is missing the announced form of ${key}`);
  }
  // The announced forms must be able to name the candidate.
  for (const [key, value] of Object.entries(bundle)) {
    if (!key.endsWith('.Announce')) continue;
    assert.ok(value.includes('{name}'), `${key} cannot name the candidate it describes`);
  }
}

/* 6c. The DTO carries the budget and never disables a removable selection. */
{
  const overBudget = buildOptionCardAction({ canSelect: false, name: 'Dodge' });
  assert.equal(overBudget.disabled, true, 'a card past the step budget is still enabled');

  const removable = buildOptionCardAction({ canSelect: false, deselect: true, name: 'Dodge' });
  assert.equal(removable.disabled, false,
    'a selected card became unremovable once the budget was spent, stranding the player');

  const explicit = buildOptionCardAction({ canSelect: true, disabled: true, name: 'Dodge' });
  assert.equal(explicit.disabled, true, 'an explicitly disabled card is enabled');

  // The DTO's title falls back to the announced text rather than to nothing.
  assert.ok(buildOptionCardAction({ state: 'locked', name: 'Dodge' }).title.includes('Dodge'));

  // The DTO decides no legality of its own: same inputs, same output, with no
  // reference to prerequisites anywhere in the module.
  const src = read('scripts/apps/progression-framework/shell/option-card-action.js');
  const code = src.split('\n').filter(line => !/^\s*(\*|\/\*|\/\/)/.test(line)).join('\n');
  for (const f of ['prerequisite', 'isAvailable', 'ForceRegistry']) {
    assert.ok(!code.includes(f), `the card-action resolver reaches into rules state (${f})`);
  }
}

/* 6d. The partial renders the resolver's output and computes nothing. */
{
  const partial = read('templates/apps/progression-framework/partials/option-card-action.hbs');
  const markup = partial.slice(partial.indexOf('<button'));
  assert.match(markup, /aria-label="\{\{optionCardAria /);
  assert.match(markup, /\{\{optionCardLabel /);
  assert.ok(!/\{\{~#if \(eq state "/.test(markup),
    'the partial computes its own label vocabulary again, which is how it diverged from the aria-label');

  // Both helpers exist and route through the one resolver.
  const init = read('scripts/core/init.js');
  assert.match(init, /registerHelper\("optionCardLabel"/);
  assert.match(init, /registerHelper\("optionCardAria"/);
  const helpers = init.slice(init.indexOf('optionCardLabel'), init.indexOf('Pluralization helper'));
  assert.equal((helpers.match(/resolveOptionCardAction\(/g) || []).length, 2,
    'the label and aria helpers do not both go through resolveOptionCardAction');
}

console.log('progression-suggestion-and-render-contracts: all assertions passed');
