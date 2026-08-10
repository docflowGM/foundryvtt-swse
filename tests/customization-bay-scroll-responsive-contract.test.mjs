/**
 * Garage / Shipyard corrective engineering — Phase 3: responsive + scroll
 * authority.
 *
 * Phase 1 (PR #946) established wallet/asset authority, Asset Bay routing
 * symmetry, and the shared mentor hologram primitive. Phase 2 (PR #947,
 * commits 1-3) extracted the canonical customization-bay-content.hbs
 * partial, gave the standalone window its own frame authority, and fixed a
 * cascade collision so the inline Holopad-hosted Bay carries no residual
 * device-frame chrome. This phase does not touch any of that — it only
 * addresses responsive layout authority and scroll ownership.
 *
 * BEFORE this phase, Bay topology was governed by two @media (max-width:
 * 1100px)/(max-width: 760px) browser-viewport queries in
 * styles/apps/customization-bay.css. Browser viewport width is not a
 * reliable proxy for the space Garage/Shipyard actually has: the Bay may be
 * hosted inline inside a character sheet's Holopad, which itself sits
 * inside a possibly much wider (or narrower) browser window, alongside
 * Foundry's own sidebar/UI chrome.
 *
 * AFTER this phase:
 *   - Bay layout topology is governed by the shared shell-size responsive
 *     observer (scripts/ui/shell/shell-responsive-observer.js) — the same
 *     authority already used by the approved Workbench (see
 *     app-responsive-workbench.css) and by ~20 other apps. It measures the
 *     actual rendered ApplicationV2/Holopad host element via ResizeObserver,
 *     never window.innerWidth/innerHeight.
 *   - WIDTH (.is-shell-narrow) controls topology: the three-lane
 *     .bay-workgrid (left rail / main / right rail) row becomes a stacked
 *     column only at narrow width.
 *   - HEIGHT alone (part of .is-shell-compact's OR-based definition, and
 *     .is-shell-short specifically) controls density only — gaps, padding,
 *     mentor footprint, card min-height — and never independently stacks
 *     the workgrid. A wide-but-short Holopad keeps three columns, just
 *     tighter.
 *   - Wide keeps the three native lane scroll owners established and
 *     approved in Phase 2 (.bay-left-rail/.bay-main/.bay-right-rail,
 *     overflow-y: auto, unchanged in styles/apps/customization-bay.css).
 *   - Narrow-stacked layout does not trap the player in three independently
 *     scrolling nested boxes: .bay-workgrid itself becomes the one vertical
 *     scroll owner for the stacked column, and the three lanes stop
 *     independently scrolling.
 *   - No JavaScript wheel bridge, no manual scrollTop synchronization, no
 *     Bay-specific ResizeObserver/window resize listener — CustomizationSurfaceAdapter.js
 *     and customization-bay-app.js are untouched by this phase; the one
 *     shared observer instance is reused via the existing Hooks-driven
 *     discovery mechanism (scripts/ui/shell/shell-responsive-observer.js's
 *     observeAllShellResponsive/initializeShellResponsiveObserver), the same
 *     mechanism Workbench already relies on with zero direct calls of its
 *     own.
 *
 * Static/source-level tests, following the pattern established in
 * tests/workbench-scroll-responsive-contract.test.mjs and
 * tests/customization-bay-inline-structural-flattening.test.mjs — this repo
 * has no Handlebars/CSS-cascade/DOM-ResizeObserver runtime to render
 * against, so these pin the actual source contract (which selector owns
 * which property, which file owns which state) rather than a rendered
 * snapshot or a browser harness this repo does not have.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (rel) => readFile(new URL(rel, root), 'utf8');

const OBSERVER_PATH = 'scripts/ui/shell/shell-responsive-observer.js';
const ADAPTER_PATH = 'scripts/ui/shell/CustomizationSurfaceAdapter.js';
const APP_JS_PATH = 'scripts/apps/customization/customization-bay-app.js';
const BAY_CSS_PATH = 'styles/apps/customization-bay.css';
const RESPONSIVE_CSS_PATH = 'styles/system/app-responsive-customization-bay.css';
const SHELL_HOST_CSS_PATH = 'styles/system/shell-host.css';

/** Extract the FIRST-or-ALL rule bodies whose selector list matches
 * `selectorRe` (tested against the whole comma-joined selector text, with
 * the trailing `{` re-appended so `\s*\{`-ending patterns still match).
 * Mirrors tests/workbench-scroll-responsive-contract.test.mjs's own parsing
 * approach — not a full CSS parser, but sufficient for this well-formed
 * stylesheet. */
function findRuleBodies(css, selectorRe) {
  const bodies = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (selectorRe.test(`${selector}{`)) bodies.push(m[2]);
  }
  return bodies;
}

function assertPropertyValue(body, prop, valueRe, message) {
  const propRe = new RegExp(`(?:^|[;{])\\s*${prop}\\s*:\\s*[^;]*`, 'g');
  const matches = body.match(propRe) || [];
  assert.ok(matches.length > 0, `${message} (property "${prop}" not found at all)`);
  const last = matches[matches.length - 1];
  assert.match(last, valueRe, `${message} (last "${prop}" declaration was: ${last.trim()})`);
}

function assertNoProperty(body, prop, message) {
  const propRe = new RegExp(`(?:^|[;{])\\s*${prop}\\s*:`, '');
  assert.ok(!propRe.test(body), message);
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT A — existing responsive authority is reused, not
 * duplicated. Garage/Shipyard binds to the shared shell-size observer via
 * the same passive Hooks-driven discovery mechanism Workbench uses (zero
 * direct calls from either adapter), not a Bay-specific ResizeObserver or
 * window resize listener.
 * ------------------------------------------------------------------ */
{
  const observer = await read(OBSERVER_PATH);
  assert.match(
    observer,
    /\.application:has\(\.swse-customization-bay\)/,
    'shell-responsive-observer.js must discover Garage/Shipyard application roots (standalone and inline) via the existing observeAllShellResponsive selector list'
  );
  assert.match(
    observer,
    /href:\s*'systems\/foundryvtt-swse\/styles\/system\/app-responsive-customization-bay\.css'/,
    'shell-responsive-observer.js must lazily load the new Bay responsive stylesheet via the existing STYLE_IDS mechanism'
  );

  // Neither Bay-hosting file may introduce its own measurement authority.
  const adapter = await read(ADAPTER_PATH);
  const appJs = await read(APP_JS_PATH);
  for (const [label, source] of [['CustomizationSurfaceAdapter.js', adapter], ['customization-bay-app.js', appJs]]) {
    assert.doesNotMatch(source, /new\s+ResizeObserver/, `${label} must not create its own ResizeObserver — the shared shell-size observer is the one authority`);
    assert.doesNotMatch(source, /addEventListener\(\s*['"]resize['"]/, `${label} must not register a window/element resize listener — a browser resize event is not a reliable proxy for the Bay's own rendered size anyway`);
    assert.doesNotMatch(source, /is-shell-/, `${label} must not reference is-shell-* state directly — that vocabulary is CSS-consumed only, per the "CSS should consume the resulting state" authority split`);
  }

  // The Bay responsive stylesheet must use the SAME canonical vocabulary as
  // the approved Workbench stylesheet — not parallel/invented class names.
  const responsive = await read(RESPONSIVE_CSS_PATH);
  for (const cls of ['is-shell-compact', 'is-shell-narrow', 'is-shell-short']) {
    assert.match(responsive, new RegExp(`\\.${cls}\\b`), `app-responsive-customization-bay.css must reuse the canonical .${cls} vocabulary`);
  }
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT B — no viewport-width topology authority. Bay layout must
 * not depend on @media (max-width/min-width: ...) anywhere in
 * styles/apps/customization-bay.css.
 * ------------------------------------------------------------------ */
{
  const css = await read(BAY_CSS_PATH);
  const mediaRe = /@media\s*\([^)]*(?:max|min)-width[^)]*\)\s*\{/g;
  assert.doesNotMatch(
    css.replace(/\/\*[\s\S]*?\*\//g, ''),
    mediaRe,
    'styles/apps/customization-bay.css must not contain any @media (max-width/min-width: ...) rule — Bay topology must be driven by the measured-host shell-size observer, not the browser viewport'
  );
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT C — width state controls .bay-workgrid topology: wide
 * (base/default, unconditional) is the three-column row; is-shell-narrow
 * is the only state that stacks it to a column.
 * ------------------------------------------------------------------ */
{
  const bayCss = await read(BAY_CSS_PATH);
  const baseWorkgridBodies = findRuleBodies(bayCss, /^\.bay-workgrid(\s*[,{])/m);
  assert.ok(baseWorkgridBodies.length > 0, 'base .bay-workgrid rule must exist');
  assert.ok(
    baseWorkgridBodies.some(b => /grid-template-columns\s*:\s*230px\s+minmax\(\s*0,\s*1fr\s*\)\s+280px/.test(b)),
    'default (wide) .bay-workgrid topology must remain the three-column row: 230px left rail, flexible main, 280px right rail'
  );

  const responsive = await read(RESPONSIVE_CSS_PATH);
  const narrowWorkgridBodies = findRuleBodies(responsive, /is-shell-narrow[^{]*\.bay-workgrid(\s*[,{])/);
  assert.ok(narrowWorkgridBodies.length > 0, 'app-responsive-customization-bay.css must define an is-shell-narrow .bay-workgrid rule');
  for (const b of narrowWorkgridBodies) {
    assertPropertyValue(b, 'display', /flex/, 'is-shell-narrow must stack .bay-workgrid via display: flex');
    assertPropertyValue(b, 'flex-direction', /column/, 'is-shell-narrow must stack .bay-workgrid via flex-direction: column');
  }
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT D — height state does not own topology. No rule scoped to
 * a non-width tier (is-shell-compact/is-shell-short/is-shell-tier-micro/
 * is-shell-tiny, WITHOUT also being scoped to is-shell-narrow) may set
 * grid-template-columns or flex-direction on .bay-workgrid — that remains
 * is-shell-narrow's exclusive authority. This directly protects a
 * wide-but-short Holopad from losing its three-column layout.
 * ------------------------------------------------------------------ */
{
  const responsive = await read(RESPONSIVE_CSS_PATH);
  // Every rule anywhere in the file whose selector targets .bay-workgrid
  // and does NOT mention is-shell-narrow (compact/short/tier-micro/tiny —
  // whichever non-width tiers this file happens to touch .bay-workgrid
  // with) must not set the two topology-owning properties.
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  let sawWorkgridRule = false;
  while ((match = ruleRe.exec(responsive))) {
    const selector = match[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (!/\.bay-workgrid\b/.test(selector)) continue;
    sawWorkgridRule = true;
    if (/is-shell-narrow/.test(selector)) continue; // narrow's own authority — allowed
    assertNoProperty(match[2], 'grid-template-columns', `non-narrow rule "${selector}" must not set grid-template-columns on .bay-workgrid — only is-shell-narrow may restructure topology`);
    assertNoProperty(match[2], 'flex-direction', `non-narrow rule "${selector}" must not set flex-direction on .bay-workgrid — only is-shell-narrow may restructure topology`);
  }
  assert.ok(sawWorkgridRule, 'app-responsive-customization-bay.css must contain at least one .bay-workgrid rule to check');
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT E — wide keeps the three approved Phase 2 native lane
 * scroll owners, and no Bay-related file routes scrolling through
 * JavaScript.
 * ------------------------------------------------------------------ */
{
  const bayCss = await read(BAY_CSS_PATH);
  assert.match(
    bayCss,
    /\.swse-customization-bay \.bay-left-rail,\s*\n\.swse-customization-bay \.bay-main,\s*\n\.swse-customization-bay \.bay-right-rail\s*\{\s*\n\s*min-height:\s*0;\s*\n\s*overflow-y:\s*auto;\s*\n\s*overflow-x:\s*hidden;\s*\n\s*scrollbar-gutter:\s*stable;\s*\n\s*padding-right:\s*4px;\s*\n\}/,
    'the approved Phase 2 three-native-lane scroll-owner rule (.bay-left-rail/.bay-main/.bay-right-rail) must be byte-for-byte unchanged'
  );

  for (const [label, path] of [['CustomizationSurfaceAdapter.js', ADAPTER_PATH], ['customization-bay-app.js', APP_JS_PATH]]) {
    const source = await read(path);
    assert.doesNotMatch(source, /addEventListener\(\s*['"]wheel['"]/, `${label} must not register a wheel listener`);
    assert.doesNotMatch(source, /\.scrollTop\s*[+]?=/, `${label} must not manually mutate scrollTop`);
    assert.doesNotMatch(source, /\.scrollLeft\s*[+]?=/, `${label} must not manually mutate scrollLeft`);
    assert.doesNotMatch(source, /deltaY/, `${label} must not reference wheel-event deltaY`);
    assert.doesNotMatch(source, /\{\s*passive:\s*false\s*\}/, `${label} must not register a non-passive event listener (the wheel-bridge idiom)`);
  }
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT F — narrow stacked layout is not three independently
 * scrolling nested boxes: once is-shell-narrow stacks the workgrid, the
 * three lanes stop independently scrolling and .bay-workgrid itself
 * becomes the one vertical scroll owner for the whole stacked column.
 *
 * PR #948 Phase 3 Correction: this contract originally checked ONLY
 * app-responsive-customization-bay.css in isolation. That let CI pass while
 * the EFFECTIVE cascade was wrong — styles/system/shell-host.css carries
 * pre-existing, higher-specificity, !important character-sheet inline-host
 * rules for the exact same .bay-workgrid/.bay-*-rail selectors. Since both
 * sides use !important, specificity (not source order) decides the winner,
 * and the old shell-host.css rules always won regardless of stylesheet load
 * order. The fix is not a stronger narrow override — it's making the two
 * rule sets apply to mutually-exclusive states (non-narrow vs narrow) so
 * there is exactly one scroll authority per responsive state. This section
 * now also reads shell-host.css to protect that cross-file contract.
 * ------------------------------------------------------------------ */
{
  const responsive = await read(RESPONSIVE_CSS_PATH);

  const narrowWorkgridBodies = findRuleBodies(responsive, /is-shell-narrow[^{]*\.bay-workgrid(\s*[,{])/);
  assert.ok(narrowWorkgridBodies.some(b => /overflow-y\s*:\s*auto/.test(b)), 'is-shell-narrow .bay-workgrid must become the single vertical scroll owner for the stacked column');

  // Scan rule-by-rule (rather than assuming exact selector-list formatting)
  // for the rule that targets all three lanes together under is-shell-narrow.
  const narrowLaneBodies = [];
  {
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = ruleRe.exec(responsive))) {
      const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (!/is-shell-narrow/.test(selector)) continue;
      if (!/\.bay-left-rail/.test(selector) || !/\.bay-main/.test(selector) || !/\.bay-right-rail/.test(selector)) continue;
      narrowLaneBodies.push(m[2]);
    }
  }
  assert.ok(narrowLaneBodies.length > 0, 'app-responsive-customization-bay.css must define an is-shell-narrow rule targeting all three lanes together');
  for (const b of narrowLaneBodies) {
    assertPropertyValue(b, 'overflow-y', /visible/, 'is-shell-narrow must cancel each lane\'s own independent vertical scroll (overflow-y: visible) once .bay-workgrid itself owns scrolling — leaving overflow-y: auto here would trap the player in three small nested scrollboxes');
  }

  // --- Cross-file contract: shell-host.css must not overlap is-shell-narrow ---
  const shellHost = await read(SHELL_HOST_CSS_PATH);

  // Non-narrow: the character-sheet inline host may still own workgrid
  // overflow:hidden / lane overflow-y:auto (the wide/default scroll
  // contract) — but ONLY once is-shell-narrow is explicitly excluded from
  // its selector, so the state never overlaps the narrow responsive rules.
  const nonNarrowWorkgridBodies = findRuleBodies(
    shellHost,
    /\.swse\.sheet\.actor\.character\.v2:not\(\.is-shell-narrow\)[^{]*\.bay-workgrid(\s*[,{])/
  );
  assert.ok(
    nonNarrowWorkgridBodies.length > 0,
    'shell-host.css must scope its character-sheet .bay-workgrid overflow:hidden rule to .swse.sheet.actor.character.v2:not(.is-shell-narrow), so it never overlaps the Phase 3 narrow responsive rule'
  );
  for (const b of nonNarrowWorkgridBodies) {
    assertPropertyValue(b, 'overflow', /hidden/, 'non-narrow shell-host .bay-workgrid must keep overflow: hidden (the wide/default scroll contract)');
  }

  const nonNarrowLaneBodies = [];
  {
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = ruleRe.exec(shellHost))) {
      const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (!/\.swse\.sheet\.actor\.character\.v2:not\(\.is-shell-narrow\)/.test(selector)) continue;
      if (!/\.bay-left-rail/.test(selector) || !/\.bay-main/.test(selector) || !/\.bay-right-rail/.test(selector)) continue;
      nonNarrowLaneBodies.push(m[2]);
    }
  }
  assert.ok(
    nonNarrowLaneBodies.length > 0,
    'shell-host.css must scope its character-sheet three-lane overflow-y:auto rule to .swse.sheet.actor.character.v2:not(.is-shell-narrow)'
  );
  for (const b of nonNarrowLaneBodies) {
    assertPropertyValue(b, 'overflow-y', /auto/, 'non-narrow shell-host lanes must keep overflow-y: auto (the wide/default per-lane scroll contract)');
  }

  // Narrow: no rule anywhere in shell-host.css may set !important overflow
  // on .bay-workgrid or the three lanes WITHOUT excluding is-shell-narrow —
  // that would silently defeat the Phase 3 narrow single-scroll-owner rules
  // by specificity, regardless of source order (both sides use !important).
  // This makes "no overlap" verifiable from the selector text itself, not
  // dependent on stylesheet load order.
  {
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    let sawWorkgridImportant = false;
    let sawLaneImportant = false;
    while ((m = ruleRe.exec(shellHost))) {
      const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
      const body = m[2];
      if (/\.bay-workgrid\b/.test(selector) && /overflow\s*:[^;]*!important/.test(body)) {
        sawWorkgridImportant = true;
        assert.match(
          selector,
          /:not\(\.is-shell-narrow\)/,
          `shell-host.css rule "${selector}" sets !important overflow on .bay-workgrid without excluding is-shell-narrow — this would defeat the Phase 3 narrow scroll rule by specificity regardless of source order`
        );
      }
      if (/\.bay-left-rail\b/.test(selector) && /\.bay-main\b/.test(selector) && /\.bay-right-rail\b/.test(selector) && /overflow-y\s*:[^;]*!important/.test(body)) {
        sawLaneImportant = true;
        assert.match(
          selector,
          /:not\(\.is-shell-narrow\)/,
          `shell-host.css rule "${selector}" sets !important overflow-y on the three Bay lanes without excluding is-shell-narrow — this would defeat the Phase 3 narrow single-scroll-owner rule by specificity regardless of source order`
        );
      }
    }
    assert.ok(sawWorkgridImportant, 'shell-host.css must still contain the character-sheet !important .bay-workgrid overflow rule (scoped non-narrow)');
    assert.ok(sawLaneImportant, 'shell-host.css must still contain the character-sheet !important three-lane overflow-y rule (scoped non-narrow)');
  }

  // Base structural fallback: once the high-specificity shell-host.css rule
  // stops applying in narrow, styles/apps/customization-bay.css's unscoped
  // Phase 2 .swse-customization-bay .bay-workgrid rule must still supply the
  // baseline flex/min-height contract for the workgrid to participate in
  // its ancestor's height chain.
  const bayCssForFallback = await read(BAY_CSS_PATH);
  const fallbackBodies = findRuleBodies(bayCssForFallback, /^\.swse-customization-bay \.bay-workgrid(\s*[,{])/m);
  assert.ok(fallbackBodies.length > 0, 'styles/apps/customization-bay.css must still define the unscoped Phase 2 .swse-customization-bay .bay-workgrid fallback rule');
  for (const b of fallbackBodies) {
    assertPropertyValue(b, 'flex', /1 1 auto/, 'the unscoped Phase 2 .bay-workgrid fallback must still supply flex: 1 1 auto');
    assertPropertyValue(b, 'min-height', /0/, 'the unscoped Phase 2 .bay-workgrid fallback must still supply min-height: 0');
  }

  // Host-state-location proof: is-shell-narrow must land on the SAME
  // .application element the corrected shell-host.css selector expects —
  // the literal .application root carrying "swse sheet actor character v2"
  // (see character-sheet.js DEFAULT_OPTIONS.classes). observeAllShellResponsive
  // queries `.application:has(.swse-customization-bay)` and calls
  // observeShellResponsive(target) with NO selector option, so
  // resolveTarget()'s no-selector branch falls through to `root` itself on
  // first discovery (no descendant/ancestor already carries
  // .swse-shell-responsive yet) — meaning classify() toggles is-shell-narrow
  // directly onto the queried .application element, not some inner wrapper.
  // Verified via the actual source contract, not a DOM harness this repo
  // does not have.
  const observerSrcForStateLocation = await read(OBSERVER_PATH);
  assert.match(
    observerSrcForStateLocation,
    /for \(const target of applicationTargets\) observeShellResponsive\(target\);/,
    'observeAllShellResponsive must call observeShellResponsive(target) with no selector option for .application:has(...) discovery targets — passing a selector would classify some descendant instead of the .application root shell-host.css\'s .swse.sheet.actor.character.v2 selector expects'
  );
  assert.match(
    observerSrcForStateLocation,
    /return root\.closest\?\.\('\.swse-shell-responsive'\) \|\| root\.querySelector\?\.\('\.swse-shell-responsive'\) \|\| root;/,
    'resolveTarget()\'s no-selector fallback must resolve to the root element itself so classify() (and is-shell-narrow) lands on the same .application element that carries swse/sheet/actor/character/v2 — not a wrapper below it'
  );
  assert.match(
    observerSrcForStateLocation,
    /target\.classList\.toggle\('is-shell-narrow', narrow\);/,
    'classify() must toggle is-shell-narrow directly on the resolved target element'
  );
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT G — host-local responsive state. The shared observer
 * stores classification state ON THE MEASURED TARGET ELEMENT itself
 * (WeakMap-free own-property keyed by a per-module Symbol), never in a
 * module-level structure keyed by actor id, mode, or any other shared key
 * — which is what actually guarantees two simultaneously-open hosts for
 * the same target actor/mode (e.g. an owner's Holopad and that same
 * vehicle's own sheet) never cross-contaminate responsive state, mirroring
 * the Phase 1/2 host-scoped CustomizationSurfaceAdapter WeakMap pattern.
 * ------------------------------------------------------------------ */
{
  const observer = await read(OBSERVER_PATH);
  assert.match(observer, /const OBSERVER_KEY = Symbol\.for\(/, 'observer state must be keyed by a per-target Symbol property, not a shared identifier');
  assert.match(observer, /target\[OBSERVER_KEY\]/, 'observer must store its state as an own-property directly on the measured target element');
  assert.doesNotMatch(
    observer,
    /actorId|actor\.id|byActor|byMode|ACTOR_MODE/i,
    'shell-responsive-observer.js must remain fully actor/mode-agnostic — any actor/mode-keyed state here would break host isolation for simultaneously-open Bay hosts targeting the same actor'
  );
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT H — responsive-state changes do not recreate app/adapter
 * state. Neither Bay-hosting file references the responsive observer or
 * its vocabulary at all, so a layout-measurement change can never be wired
 * to (accidentally or otherwise) reconstructing the adapter, the cached
 * CustomizationBayApp instance, or clearing staged selections/ownerActorId/
 * mode/context — those all remain governed exclusively by the Phase 1/2
 * host-scoped WeakMap registry and getOrCreate()'s wholesale-replace
 * options contract, both untouched by this phase.
 * ------------------------------------------------------------------ */
{
  const adapter = await read(ADAPTER_PATH);
  const appJs = await read(APP_JS_PATH);
  for (const [label, source] of [['CustomizationSurfaceAdapter.js', adapter], ['customization-bay-app.js', appJs]]) {
    assert.doesNotMatch(source, /ResizeObserver/, `${label} must not reference ResizeObserver at all — presentation-only responsive state must never be wired into app/adapter construction`);
    assert.doesNotMatch(source, /shell-responsive-observer/, `${label} must not import shell-responsive-observer.js — CSS consumes its state; app/adapter logic must not`);
  }
  // The host-scoped registry itself (Phase 1/2, frozen) must still exist
  // unmodified in shape — a real recreation regression would most likely
  // touch getOrCreate()'s wholesale-replace contract.
  assert.match(adapter, /static _hostRegistries = new WeakMap\(\);/, 'host-scoped WeakMap registry must remain intact');
  assert.match(adapter, /adapter\.options = \{ \.\.\.options, mode, bayMode: mode, inlineShell: true \};/, 'getOrCreate() wholesale-replace options contract must remain intact');
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT I/J — Phase 2 frame-ownership contract frozen. Responsive
 * work must not reintroduce swse-ui-shell/swse-sheet-ui/the standalone
 * frame class onto canonical inline content, and must not restore
 * swse-ui-shell to CustomizationBayApp.DEFAULT_OPTIONS or otherwise create
 * a second standalone frame authority. Composed by re-running the actual
 * Phase 2 structural contract suite (not re-implementing its assertions
 * here) — any assertion failure inside it propagates as a failure here.
 * ------------------------------------------------------------------ */
{
  await import('./customization-bay-inline-structural-flattening.test.mjs');
}

console.log('customization-bay-scroll-responsive-contract: all assertions passed');
