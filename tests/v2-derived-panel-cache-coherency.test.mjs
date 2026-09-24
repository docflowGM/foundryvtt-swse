import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// V2 derived/cache-coherency regression — REQUIRED FAIL-BEFORE TEST A
// (Panel cache coherence) + REQUIRED CACHE RETENTION TEST D + adjacent-panel
// audit.
//
// SWSEV2ActorSheetBase's panel view-model cache (scripts/sheets/v2/
// actor-sheet-base.js: _buildPanelViewModelCacheSignature/
// _getCachedPanelViewModel/_setCachedPanelViewModel, introduced by the June
// 29 cache-optimization pass) keyed a cached panel purely off PERSISTED
// state: actor/item _stats.modifiedTime, equipped/quantity/uses/ammo,
// isEditable, help level, and shell surface. None of those change when
// SWSEV2BaseActor._computeDerivedAsync() or ActorEngine._applyDerivedUpdates()
// land an authoritative system.derived.* snapshot on the SAME actor/item
// revision -- that in-memory mutation never touches _stats.modifiedTime. So a
// defensePanel built and cached from an early, pre-async render (showing
// defaults, e.g. Fort/Ref/Will = 10/10/10 with zeroed Heroic/class/ability
// rows) would survive the corrective render that follows once the real
// derived values land, because the cache key never changed.
//
// The fix (scripts/actors/derived/derived-generation.js) adds a runtime-only
// derived-generation marker, stamped inside system.derived.meta by both
// derived-write paths, and folds it into the panel cache signature. This
// test exercises the REAL, unmodified _buildPanelViewModelCacheSignature/
// _getCachedPanelViewModel/_setCachedPanelViewModel methods (extracted from
// the committed source and executed via `new Function` against constructed
// inputs, following this repo's established pattern for sheet logic that
// cannot be loaded under this Node/Foundry-shim harness -- see
// tests/phase7-droid-editability-authority-contract.test.mjs for precedent
// and its documented reason) together with the REAL, imported
// PanelContextBuilder.buildDefensePanel() -- not a reimplementation of
// either.

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry.utils.duplicate = (v) => JSON.parse(JSON.stringify(v ?? {}));
globalThis.CONFIG = globalThis.CONFIG ?? { SWSE: {} };

const { PanelContextBuilder } = await import(
  '/systems/foundryvtt-swse/scripts/sheets/v2/context/PanelContextBuilder.js'
);

const actorSheetBaseSrc = await readFile(
  new URL('../scripts/sheets/v2/actor-sheet-base.js', import.meta.url),
  'utf8'
);

// ─── Extract the three REAL cache methods from committed source ───────────
// actor-sheet-base.js cannot be imported directly under this harness (its
// class body extends foundry.applications.sheets.ActorSheetV2 through a long
// shell-controller import chain), so the actual, current method bodies are
// extracted and executed via `new Function(...)` against constructed
// `this`/argument inputs -- the same technique
// phase7-droid-editability-authority-contract.test.mjs uses for
// canUseActorSheetEditControls, extended here to instance methods invoked
// via Function.prototype.call() so `this` binds to a constructed sheet-like
// object.

function extractMethodBody(src, signature) {
  const re = new RegExp(
    signature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([\\s\\S]*?)\\n  \\}'
  );
  const match = src.match(re);
  assert.ok(match, `actor-sheet-base.js must still define ${signature}`);
  return match[1];
}

const buildSignatureBody = extractMethodBody(actorSheetBaseSrc, '_buildPanelViewModelCacheSignature(actor)');
const getCachedBody = extractMethodBody(actorSheetBaseSrc, '_getCachedPanelViewModel(panelName, cacheKey)');
const setCachedBody = extractMethodBody(actorSheetBaseSrc, '_setCachedPanelViewModel(panelName, cacheKey, value)');

// eslint-disable-next-line no-new-func -- executing the real, just-extracted
// method bodies against constructed inputs, not a reimplementation.
const buildPanelViewModelCacheSignature = new Function('actor', buildSignatureBody);
// eslint-disable-next-line no-new-func
const getCachedPanelViewModel = new Function('panelName', 'cacheKey', getCachedBody);
// eslint-disable-next-line no-new-func
const setCachedPanelViewModel = new Function('panelName', 'cacheKey', 'value', setCachedBody);

function makeSheetLike({ isEditable = true, helpLevel = 'CORE', shellSurface = 'sheet' } = {}) {
  return {
    isEditable,
    _helpLevel: helpLevel,
    _shellSurface: shellSurface,
    _panelViewModelCache: new Map(),
    _panelViewModelCacheOrder: []
  };
}

// ─── Fixture: Scout 1 / Soldier 7, DEX 18 (+4), CON 17 (+3), WIS 14 (+2) ───
// Golden case from the problem statement:
//   Fortitude = 10 + heroic 8 + class 2 + CON 3 = 23
//   Reflex    = 10 + heroic 8 + class 2 + DEX 4 = 24
//   Will      = 10 + heroic 8 + class 0 + WIS 2 = 20

function makeGoldenActor() {
  return {
    id: 'panel-cache-golden-actor',
    name: 'Panel Cache Golden Actor',
    type: 'character',
    isOwner: true,
    _stats: { modifiedTime: 42 }, // persisted revision R — never changes in this test
    items: [],
    effects: [],
    flags: { swse: {} },
    system: {
      isDroid: false,
      // Pre-async state: system.level itself has not been threaded through
      // yet either (a freshly created actor, before its class items'
      // progression populates it) — heroicLevel/derived defenses have not
      // landed. This is exactly what a fresh sheet render sees before
      // _computeDerivedAsync() resolves — buildDefensePanel()'s own
      // Number.isFinite() fallback produces the flat "10" default per
      // defense with zeroed Heroic/Ability/Class rows, matching the live
      // bug screenshot in the problem statement.
      level: 0,
      defenses: {},
      derived: {}
    }
  };
}

function landAuthoritativeDefenses(actor) {
  // Simulates DerivedCalculator's real output being merged into
  // system.derived (what SWSEV2BaseActor._computeDerivedAsync() /
  // ActorEngine._applyDerivedUpdates() do) — same persisted actor/item
  // revision, corrected derived content only.
  actor.system.derived = {
    ...actor.system.derived,
    heroicLevel: 8,
    attributes: {
      con: { mod: 3 }, dex: { mod: 4 }, wis: { mod: 2 }
    },
    defenses: {
      fortitude: { total: 23, classBonus: 2, heroicLevel: 8, levelContribution: 8, abilityMod: 3, abilityKey: 'con' },
      reflex: { total: 24, classBonus: 2, heroicLevel: 8, levelContribution: 8, armorContribution: 8, abilityMod: 4, abilityKey: 'dex' },
      will: { total: 20, classBonus: 0, heroicLevel: 8, levelContribution: 8, abilityMod: 2, abilityKey: 'wis' }
    },
    damage: { conditionPenalty: 0 },
    meta: { ...(actor.system.derived.meta ?? {}), generation: (actor.system.derived.meta?.generation ?? 0) + 1 }
  };
}

function buildAndCachePanel(sheetLike, actor, panelName = 'defensePanel') {
  const signature = buildPanelViewModelCacheSignature.call(sheetLike, actor);
  const cacheKey = signature ? `${panelName}::${signature}` : null;
  const cached = getCachedPanelViewModel.call(sheetLike, panelName, cacheKey);
  if (cached) return { panel: cached, wasCacheHit: true, signature };

  const builder = new PanelContextBuilder(actor, { isEditable: sheetLike.isEditable });
  const panel = builder.buildDefensePanel();
  setCachedPanelViewModel.call(sheetLike, panelName, cacheKey, panel);
  return { panel, wasCacheHit: false, signature };
}

// ─── Test A: panel cached pre-async must not survive the derived correction ─

{
  const actor = makeGoldenActor();
  const sheetLike = makeSheetLike();

  // "Early sheet render": defensePanel is built and cached against the
  // pre-async (default) derived state.
  const first = buildAndCachePanel(sheetLike, actor);
  assert.equal(first.wasCacheHit, false, 'the first render must always build (nothing cached yet)');
  const fortFirst = first.panel.defenses.find(d => d.systemKey === 'fortitude');
  const refFirst = first.panel.defenses.find(d => d.systemKey === 'reflex');
  const willFirst = first.panel.defenses.find(d => d.systemKey === 'will');
  assert.equal(fortFirst.total, 10, 'pre-async render must show the flat default Fortitude (10)');
  assert.equal(refFirst.total, 10, 'pre-async render must show the flat default Reflex (10)');
  assert.equal(willFirst.total, 10, 'pre-async render must show the flat default Will (10)');

  // Authoritative derived output lands — SAME persisted actor/item revision.
  landAuthoritativeDefenses(actor);
  assert.equal(
    buildPanelViewModelCacheSignature.call(makeSheetLike(), actor) === null,
    false
  );

  // Corrective render: must NOT reuse the stale cached panel.
  const second = buildAndCachePanel(sheetLike, actor);
  assert.equal(
    second.wasCacheHit,
    false,
    'FAIL-BEFORE PROOF: a panel cached from the pre-async render must not survive the derived correction. ' +
    'Under the pre-fix cache signature (actor/item revision + editability + help level + shell surface only), ' +
    'this render would be served the stale, cached 10/10/10 panel because none of those inputs changed.'
  );

  const fortSecond = second.panel.defenses.find(d => d.systemKey === 'fortitude');
  const refSecond = second.panel.defenses.find(d => d.systemKey === 'reflex');
  const willSecond = second.panel.defenses.find(d => d.systemKey === 'will');

  assert.equal(fortSecond.total, 23, 'Fortitude must equal 10 + heroic 8 + class 2 + CON 3 = 23');
  assert.equal(refSecond.total, 24, 'Reflex must equal 10 + heroic 8 + class 2 + DEX 4 = 24');
  assert.equal(willSecond.total, 20, 'Will must equal 10 + heroic 8 + class 0 + WIS 2 = 20');

  // Component rows, not just totals.
  assert.equal(fortSecond.levelContribution, 8, 'Fortitude heroic/level contribution must be 8');
  assert.equal(fortSecond.classDef, 2, 'Fortitude class bonus must be 2');
  assert.equal(fortSecond.abilityMod, 3, 'Fortitude ability (CON) modifier must be 3');

  assert.equal(refSecond.levelContribution, 8, 'Reflex heroic/level contribution must be 8');
  assert.equal(refSecond.classDef, 2, 'Reflex class bonus must be 2');
  assert.equal(refSecond.abilityMod, 4, 'Reflex ability (DEX) modifier must be 4');

  assert.equal(willSecond.levelContribution, 8, 'Will heroic/level contribution must be 8');
  assert.equal(willSecond.classDef, 0, 'Will class bonus must be 0');
  assert.equal(willSecond.abilityMod, 2, 'Will ability (WIS) modifier must be 2');
}

console.log('  [1/2] Test A: stale pre-async panel does not survive the derived correction OK');

// ─── Test D: cache retention — unchanged state after correction still HITs ─

{
  const actor = makeGoldenActor();
  landAuthoritativeDefenses(actor); // authoritative from the start this time
  const sheetLike = makeSheetLike();

  let builds = 0;
  const spiedBuild = (sheetLikeArg, actorArg) => {
    const signature = buildPanelViewModelCacheSignature.call(sheetLikeArg, actorArg);
    const cacheKey = signature ? `defensePanel::${signature}` : null;
    const cached = getCachedPanelViewModel.call(sheetLikeArg, 'defensePanel', cacheKey);
    if (cached) return { panel: cached, wasCacheHit: true };
    builds++;
    const builder = new PanelContextBuilder(actorArg, { isEditable: sheetLikeArg.isEditable });
    const panel = builder.buildDefensePanel();
    setCachedPanelViewModel.call(sheetLikeArg, 'defensePanel', cacheKey, panel);
    return { panel, wasCacheHit: false };
  };

  const render1 = spiedBuild(sheetLike, actor);
  assert.equal(render1.wasCacheHit, false, 'first render always builds');
  assert.equal(builds, 1);

  // Same actor/item revision, same derived generation, same UI state —
  // an unrelated re-render (e.g. a different tab redraw) must reuse the
  // cached panel rather than rebuilding it.
  const render2 = spiedBuild(sheetLike, actor);
  assert.equal(
    render2.wasCacheHit,
    true,
    'an unrelated re-render with fully unchanged actor/item/derived-generation/UI state must reuse the cached panel'
  );
  assert.equal(builds, 1, 'the builder must not run again when nothing relevant changed — the fix must not have destroyed the optimization');
  assert.deepEqual(render2.panel, render1.panel, 'the reused panel must be identical to the one actually built');

  // Now land a NEW derived generation (e.g. a second, unrelated recompute
  // that happens to produce identical totals) — the fix intentionally
  // invalidates on generation change even when content coincidentally
  // matches, so this proves invalidation is live, not just "always missing".
  landAuthoritativeDefenses(actor);
  const render3 = spiedBuild(sheetLike, actor);
  assert.equal(render3.wasCacheHit, false, 'a new derived generation must invalidate the cache even if it lands identical totals');
  assert.equal(builds, 2);
}

console.log('  [2/2] Test D: cache-hit retention preserved for unrelated re-renders OK');

// ─── Adjacent-panel audit: the same fix must generalize beyond defensePanel ─
// (BAB/Grapple/Initiative live in system.derived alongside defenses; the
// panel cache signature change is actor-wide, not defense-specific, so any
// panel builder reading system.derived through the same cache is
// automatically covered. resourcesPanel is the live panel that surfaces
// BAB/Grapple/Initiative-shaped derived values, so it stands in as the
// representative non-defense assertion.)

{
  const actor = makeGoldenActor();
  actor.system.derived = {
    heroicLevel: 8,
    bab: 6,
    grappleBonus: 8,
    initiative: { total: 4 }
  };
  const sheetLike = makeSheetLike();
  const sig1 = buildPanelViewModelCacheSignature.call(sheetLike, actor);

  actor.system.derived = {
    ...actor.system.derived,
    bab: 8,
    grappleBonus: 10,
    initiative: { total: 6 },
    meta: { generation: (actor.system.derived.meta?.generation ?? 0) + 1 }
  };
  const sig2 = buildPanelViewModelCacheSignature.call(sheetLike, actor);

  assert.notEqual(
    sig1,
    sig2,
    'the same generation-aware cache signature that fixes defensePanel must also change when BAB/Grapple/' +
    'Initiative-bearing derived state is corrected on an unchanged actor/item revision — this is a general ' +
    'derived-cache fix, not a defense-only patch (any panel keyed by _buildPanelViewModelCacheSignature, ' +
    'e.g. resourcesPanel, is automatically covered)'
  );
}

console.log('adjacent-panel audit: generation-aware signature covers non-defense derived panels too OK');
console.log('v2-derived-panel-cache-coherency.test.mjs: all assertions passed');
