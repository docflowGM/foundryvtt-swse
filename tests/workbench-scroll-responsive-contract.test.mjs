/**
 * Workbench UX Refactor — Phase 2: scroll ownership + responsive authority.
 *
 * Phase 1 (PR #942, merged to this branch at its approved head
 * a1dda34b04f1219b5e231ec4dd73fabb313cde47) established the canonical
 * workbench-content.hbs partial, Holopad-native inline hosting, and the
 * frameless inline .swse-customization-screen contract. This phase does not
 * touch any of that — it only addresses scroll ownership and responsive
 * authority.
 *
 * BEFORE this phase, the workbench had multiple competing vertical scroll
 * owners layered inside each other — most visibly:
 *   - .workbench-detail scrolled (overflow-y:auto) AND its children
 *     .detail-grid / .lightsaber-workspace ALSO scrolled independently;
 *   - .wcb-pane > .card-list had its own arbitrary max-height:clamp(...)
 *     cage and scrolled independently of its parent .wcb-pane;
 *   - .ls-tab-card-grid scrolled independently of its parent .ls-tab-panel;
 * and WorkbenchSurfaceAdapter._installScrollBridge() manually intercepted
 * wheel events and redirected them to whichever of these was actually
 * supposed to be the "real" scroller, because CSS alone couldn't decide.
 *
 * Responsive layout was ALSO split across two uncoordinated authorities:
 * the shared shell-size responsive observer (.is-shell-compact/-narrow/
 * -tiny, keyed off the Holopad's actual rendered size) and a dozen
 * `@media (max-width: 1180px)` browser-viewport rules in
 * item-customization-workbench.css that could fire independently of the
 * Holopad's real size. Worse, .is-shell-compact — which the observer sets
 * whenever EITHER width OR height drops below its threshold — was wired
 * directly to full lane-stacking (.swse-customization-workarea {
 * flex-direction: column }), so a wide-but-short Holopad collapsed to one
 * column despite having plenty of horizontal room.
 *
 * AFTER this phase:
 *   - each lane has exactly one scroll owner (.inventory-list, .wcb-pane /
 *     .ls-tab-panel, .detail-rail-scroll, .rail-detail-card) and its
 *     ancestors are bounded (overflow: hidden) layout containers instead of
 *     also-scrolling competitors;
 *   - the arbitrary max-height: clamp(...) card cages are gone — cards flow
 *     through their scrolling parent pane instead;
 *   - WorkbenchSurfaceAdapter no longer touches wheel events at all —
 *     native scrolling handles it now that ownership is unambiguous;
 *   - primary-layout browser-viewport media queries in
 *     item-customization-workbench.css are retired; the surviving lane-
 *     stacking decision lives in app-responsive-workbench.css, keyed off
 *     .is-shell-narrow (width-driven) rather than .is-shell-compact
 *     (which compact-wide, height-only shells also satisfy);
 *   - the Phase 1 frameless-screen contract (no padding/radius/background/
 *     box-shadow on the inline .swse-customization-screen) is preserved at
 *     every responsive tier, not just the unconditional base rule.
 *
 * Static/source-level tests, following the pattern established in
 * tests/gm-surface-render-seams.test.mjs and
 * tests/workbench-inline-structural-flattening.test.mjs — this repo has no
 * Handlebars/CSS-cascade runtime to render against, so these pin the actual
 * source contract (which selector owns which property) rather than a
 * rendered snapshot.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (rel) => readFile(new URL(rel, root), 'utf8');

const ADAPTER_PATH = 'scripts/ui/shell/WorkbenchSurfaceAdapter.js';
const WORKBENCH_CSS = 'styles/apps/item-customization-workbench.css';
const SHELL_HOST_CSS = 'styles/system/shell-host.css';
const RESPONSIVE_CSS = 'styles/system/app-responsive-workbench.css';

/** Extract the FIRST rule body whose selector list matches `selectorRe`
 * (tested against the whole comma-joined selector text). Returns the raw
 * `{...}` body string, or null. Mirrors the parsing approach used to audit
 * the actual cascade during this phase — not a full CSS parser, but
 * sufficient for this well-formed, comment-free-selector stylesheet. */
function findRuleBodies(css, selectorRe) {
  const bodies = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
    // Re-append the delimiter the outer regex consumed, so selector-matcher
    // patterns ending in `\s*\{` (mirroring how the selector reads in the
    // source file) still match the last selector in a comma-separated list.
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
 * 1. JavaScript scroll bridge retired.
 * ------------------------------------------------------------------ */
{
  const adapter = await read(ADAPTER_PATH);
  assert.doesNotMatch(adapter, /_installScrollBridge/, 'WorkbenchSurfaceAdapter must not define/call _installScrollBridge — native CSS scroll ownership replaces it');
  assert.doesNotMatch(adapter, /addEventListener\(\s*['"]wheel['"]/, 'WorkbenchSurfaceAdapter must not register a wheel listener');
  assert.doesNotMatch(adapter, /\.scrollTop\s*[+]?=/, 'WorkbenchSurfaceAdapter must not manually mutate scrollTop');
  assert.doesNotMatch(adapter, /workbenchScrollBridge/, 'WorkbenchSurfaceAdapter must not carry any scroll-bridge marker/state');
  // preventDefault() may legitimately appear elsewhere (form submission,
  // drag handling) — assert specifically that no wheel-context preventDefault
  // survives by checking the passive:false wheel-listener idiom is gone.
  assert.doesNotMatch(adapter, /\{\s*passive:\s*false\s*\}/, 'WorkbenchSurfaceAdapter must not register a non-passive event listener (the wheel bridge was the only user of this pattern)');
}

/* ------------------------------------------------------------------ *
 * 2. Desktop scroll ownership — normal items.
 * ------------------------------------------------------------------ */
{
  const css = await read(WORKBENCH_CSS);

  // Inventory: .inventory-list scrolls; .workbench-inventory is bounded.
  const inventoryListBodies = findRuleBodies(css, /(^|[\s,])\.inventory-list(\s*[,{]|$)/);
  assert.ok(inventoryListBodies.some(b => /overflow-y\s*:\s*auto/.test(b)), '.inventory-list must be a vertical scroll owner');
  const workbenchInventoryBodies = findRuleBodies(css, /^\.workbench-inventory(\s*,|\s*\{|$)/m);
  assert.ok(workbenchInventoryBodies.length > 0, '.workbench-inventory base rule must exist');
  for (const b of workbenchInventoryBodies) {
    assertNoProperty(b, 'overflow-y', '.workbench-inventory must not declare its own overflow-y (it is bounded; .inventory-list scrolls)');
  }

  // Primary workspace: .wcb-pane scrolls; .card-list flows through it, not
  // independently. .workbench-tabs-container and .detail-grid are bounded.
  const wcbPaneBodies = findRuleBodies(css, /\.wcb-pane(\s*,|\s*\{)/);
  assert.ok(wcbPaneBodies.some(b => /overflow-y\s*:\s*auto/.test(b) && /flex\s*:\s*1 1 auto/.test(b)),
    '.wcb-pane must be the primary workspace scroll owner (flex: 1 1 auto + overflow-y: auto)');

  const cardListInWcbPane = findRuleBodies(css, /\.wcb-pane\s*>\s*\.card-list/);
  assert.ok(cardListInWcbPane.length > 0, '.wcb-pane > .card-list rule must still exist (for padding/layout)');
  for (const b of cardListInWcbPane) {
    assertNoProperty(b, 'overflow-y', '.wcb-pane > .card-list must not independently scroll — it must flow through .wcb-pane');
    assertNoProperty(b, 'max-height', '.wcb-pane > .card-list must not have an arbitrary max-height cage');
  }

  const detailGridBodies = findRuleBodies(css, /\.detail-grid(\s*,|\s*\{)/);
  assert.ok(detailGridBodies.length > 0, '.detail-grid rules must exist');
  for (const b of detailGridBodies) {
    assertNoProperty(b, 'overflow-y', '.detail-grid must not declare overflow-y — it is a bounded layout container, not a scroll owner');
  }

  // Intel rail: .detail-rail-scroll scrolls; the outer aside does not.
  const detailRailScrollBodies = findRuleBodies(css, /\.detail-rail-scroll(\s*,|\s*\{)/);
  assert.ok(detailRailScrollBodies.some(b => /overflow-y\s*:\s*auto/.test(b)), '.detail-rail-scroll must be the intel rail scroll owner');
  const workbenchIntelPanelBodies = findRuleBodies(css, /\.workbench-intel-panel(\s*,|\s*\{)/);
  for (const b of workbenchIntelPanelBodies) {
    assertNoProperty(b, 'overflow-y', '.workbench-intel-panel (the outer aside) must not itself scroll — .detail-rail-scroll owns that');
  }

  // .workbench-detail itself must not scroll — it is a bounded container.
  const workbenchDetailBodies = findRuleBodies(css, /^\.workbench-detail(\s*,|\s*\{|\s*>)/m);
  for (const b of workbenchDetailBodies) {
    assertNoProperty(b, 'overflow-y', '.workbench-detail must not declare overflow-y — .wcb-pane/.ls-tab-panel own scrolling beneath it');
  }
  const inlineWorkbenchDetailBodies = findRuleBodies(css, /\.workbench-detail(\s*,|\s*\{)/);
  for (const b of inlineWorkbenchDetailBodies) {
    assertNoProperty(b, 'overflow-y', '.workbench-detail (any scope) must not declare overflow-y');
  }

  // The authoritative bounding for .workbench-detail/.detail-grid/
  // .workbench-inventory lives in shell-host.css, scoped to the character
  // sheet so nothing else can outrank it.
  const shellHost = await read(SHELL_HOST_CSS);
  const shellHostDetailBodies = findRuleBodies(shellHost, /\.workbench-detail(\s*,|\s*\{)/);
  assert.ok(shellHostDetailBodies.some(b => /overflow\s*:\s*hidden\s*!important/.test(b)), 'shell-host.css must authoritatively bound .workbench-detail to overflow: hidden');
  const shellHostDetailGridBodies = findRuleBodies(shellHost, /\.detail-grid(\s*,|\s*\{)/);
  assert.ok(shellHostDetailGridBodies.some(b => /overflow\s*:\s*hidden\s*!important/.test(b)), 'shell-host.css must authoritatively bound .detail-grid to overflow: hidden');
}

/* ------------------------------------------------------------------ *
 * 3. Lightsaber scroll ownership.
 * ------------------------------------------------------------------ */
{
  const css = await read(WORKBENCH_CSS);

  // Active tab panel scrolls; its card grid flows through it.
  const lsTabPanelBodies = findRuleBodies(css, /\.ls-tab-panel(\s*,|\s*\{)/);
  assert.ok(lsTabPanelBodies.some(b => /overflow-y\s*:\s*auto/.test(b) && /flex\s*:\s*1 1 auto/.test(b)),
    '.ls-tab-panel must be the lightsaber wizard scroll owner (flex: 1 1 auto + overflow-y: auto)');

  const lsTabCardGridBodies = findRuleBodies(css, /\.ls-tab-card-grid(\s*,|\s*\{)(?!\s*\.)/);
  assert.ok(lsTabCardGridBodies.length > 0, '.ls-tab-card-grid rules must exist');
  for (const b of lsTabCardGridBodies) {
    assertNoProperty(b, 'overflow-y', '.ls-tab-card-grid must not independently scroll — it must flow through .ls-tab-panel');
  }

  // Lightsaber workspace itself is bounded, not a scroller.
  const lightsaberWorkspaceBodies = findRuleBodies(css, /^\.lightsaber-workspace(\s*,|\s*\{|\s*>)/m)
    .concat(findRuleBodies(css, /\.lightsaber-workspace(\s*,|\s*\{)/));
  for (const b of lightsaberWorkspaceBodies) {
    assertNoProperty(b, 'overflow-y', '.lightsaber-workspace must not declare overflow-y — .ls-tab-panel owns scrolling beneath it');
  }

  // Right-side intel: exactly one deliberate scroll owner (.rail-detail-card
  // inside .ls-component-intel), not the rail or the intel section itself.
  const lsForgeRailBodies = findRuleBodies(css, /(?<!--intel-only[^{]*)\.ls-forge-rail(\s*,|\s*\{)(?!--)/);
  for (const b of lsForgeRailBodies) {
    assertNoProperty(b, 'overflow-y', '.ls-forge-rail must not declare its own overflow-y in the base desktop rules (only the narrow-width drawer variant may, in app-responsive-workbench.css)');
  }
  const lsComponentIntelBodies = findRuleBodies(css, /\.ls-component-intel(\s*,|\s*\{)(?!\s*\.rail-detail-card)/);
  const lsComponentIntelBounded = lsComponentIntelBodies.some(b => /overflow\s*:\s*hidden\s*!important/.test(b));
  assert.ok(lsComponentIntelBounded, '.ls-component-intel must be bounded (overflow: hidden) so it is not a second scroll owner');

  const railDetailCardInIntel = findRuleBodies(css, /\.ls-component-intel\s+\.rail-detail-card/);
  assert.ok(railDetailCardInIntel.some(b => /overflow-y\s*:\s*auto/.test(b)),
    '.ls-component-intel .rail-detail-card must be the sole lightsaber intel scroll owner');
}

/* ------------------------------------------------------------------ *
 * 4. No mini card-height cages remain (arbitrary max-height: clamp(...)
 * scrollboxes nested inside an already-scrolling parent pane).
 * ------------------------------------------------------------------ */
{
  const css = await read(WORKBENCH_CSS);
  for (const b of findRuleBodies(css, /\.wcb-pane\s*>\s*\.card-list(\s*,|\s*\{)/)) {
    assertNoProperty(b, 'max-height', '.wcb-pane > .card-list must not have a clamp(...)/fixed height cage');
  }
  for (const b of findRuleBodies(css, /\.ls-tab-card-grid(\s*,|\s*\{)(?!\s*\.)/)) {
    assertNoProperty(b, 'overflow-y', '.ls-tab-card-grid must not independently overflow-y: auto anywhere in the base stylesheet');
  }
}

/* ------------------------------------------------------------------ *
 * 5. Responsive authority: primary Workbench layout is not governed by
 * browser-viewport media queries once migrated to the shell-size observer.
 * ------------------------------------------------------------------ */
{
  const css = await read(WORKBENCH_CSS);

  // The specific primary-layout selectors this phase migrated must not
  // reappear inside any max-width/min-width media query in this file.
  const viewportQueryBodies = [];
  const mediaRe = /@media\s*\(\s*(?:max|min)-width[^)]*\)\s*\{/g;
  let m;
  while ((m = mediaRe.exec(css))) {
    let depth = 1, i = m.index + m[0].length;
    while (depth > 0 && i < css.length) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
    viewportQueryBodies.push(css.slice(m.index, i));
  }

  const primaryLayoutSelectors = [
    'swse-customization-workarea',
    '.detail-grid',
    '.lightsaber-workspace',
    '.workbench-tabs-container',
  ];
  for (const body of viewportQueryBodies) {
    for (const sel of primaryLayoutSelectors) {
      assert.ok(!body.includes(sel), `a browser-viewport media query still controls primary Workbench layout selector "${sel}":\n${body.slice(0, 200)}`);
    }
  }

  // Responsive authority for these selectors instead lives in
  // app-responsive-workbench.css, keyed off the shell-size observer classes.
  const responsive = await read(RESPONSIVE_CSS);
  for (const cls of ['is-shell-compact', 'is-shell-narrow', 'is-shell-tiny']) {
    assert.match(responsive, new RegExp(cls), `app-responsive-workbench.css must reference .${cls}`);
  }
  assert.match(responsive, /is-shell-narrow[^{]*\.swse-customization-workarea[^{]*\{[^}]*flex-direction:\s*column/,
    'workarea lane-stacking must be keyed to .is-shell-narrow in app-responsive-workbench.css');
  assert.match(responsive, /is-shell-narrow[^{]*\.detail-grid[^{]*\{[^}]*display:\s*flex/,
    'detail-grid lane-stacking must be keyed to .is-shell-narrow in app-responsive-workbench.css');
  assert.match(responsive, /is-shell-narrow[^{]*\.lightsaber-workspace[^{]*\{[^}]*display:\s*flex/,
    'lightsaber-workspace lane-stacking must be keyed to .is-shell-narrow in app-responsive-workbench.css');
}

/* ------------------------------------------------------------------ *
 * 6. Compact-wide does not force stacking: .is-shell-compact alone must not
 * set flex-direction: column on the primary lane-splitting containers —
 * only .is-shell-narrow (width-driven) may.
 * ------------------------------------------------------------------ */
{
  const responsive = await read(RESPONSIVE_CSS);
  const compactBodies = findRuleBodies(responsive, /is-shell-compact(?!.*is-shell-narrow)[^{]*\.swse-customization-workarea(\s*[,{])/);
  for (const b of compactBodies) {
    assertNoProperty(b, 'flex-direction', '.is-shell-compact alone must not set flex-direction on .swse-customization-workarea — only .is-shell-narrow may stack lanes');
  }
  const compactDetailGridBodies = findRuleBodies(responsive, /is-shell-compact(?!.*is-shell-narrow)[^{]*\.detail-grid(\s*[,{])/);
  for (const b of compactDetailGridBodies) {
    assertNoProperty(b, 'display', '.is-shell-compact alone must not change .detail-grid\'s display mode — only .is-shell-narrow may collapse it to a column');
  }
  const compactLightsaberBodies = findRuleBodies(responsive, /is-shell-compact(?!.*is-shell-narrow)[^{]*\.lightsaber-workspace(\s*[,{])(?!--)/);
  for (const b of compactLightsaberBodies) {
    assertNoProperty(b, 'display', '.is-shell-compact alone must not change .lightsaber-workspace\'s display mode — only .is-shell-narrow may stack it');
  }
  // And compact-wide must not clip .workbench-inventory to a short capped
  // band either — that band presentation only makes sense once stacked.
  const compactInventoryBodies = findRuleBodies(responsive, /is-shell-compact(?!.*is-shell-narrow)[^{]*\.workbench-inventory(\s*[,{])/);
  for (const b of compactInventoryBodies) {
    assertNoProperty(b, 'max-height', '.is-shell-compact alone must not cap .workbench-inventory\'s height — that is only correct once .is-shell-narrow has stacked the workarea');
  }
}

/* ------------------------------------------------------------------ *
 * 7. Phase 1 frameless-screen contract survives responsive rules at every
 * tier: no responsive rule may reintroduce outer padding, corner radius,
 * background, or box-shadow on the inline .swse-customization-screen.
 * ------------------------------------------------------------------ */
{
  const responsive = await read(RESPONSIVE_CSS);
  const screenBodies = findRuleBodies(responsive, /\.swse-customization-screen(\s*[,{])/);
  assert.ok(screenBodies.length > 0, 'app-responsive-workbench.css must still reference .swse-customization-screen (for gap/overflow adjustments)');
  for (const b of screenBodies) {
    assertNoProperty(b, 'padding', 'no responsive tier may reintroduce padding on .swse-customization-screen — the Holopad screen already supplies it');
    assertNoProperty(b, 'border-radius', 'no responsive tier may reintroduce border-radius on .swse-customization-screen');
    assertNoProperty(b, 'background', 'no responsive tier may reintroduce a background on .swse-customization-screen');
    assertNoProperty(b, 'box-shadow', 'no responsive tier may reintroduce a box-shadow on .swse-customization-screen');
  }

  // The Phase 1 inline-only neutralization itself (shell-host.css) must
  // still be intact and unchanged by this phase.
  const shellHost = await read(SHELL_HOST_CSS);
  const inlineScreenBody = findRuleBodies(shellHost, /\.swse-customization-screen(\s*[,{])/)[0];
  assert.ok(inlineScreenBody, 'shell-host.css inline .swse-customization-screen rule must still exist');
  for (const [prop, value] of [['padding', '0'], ['border-radius', '0'], ['background', 'transparent'], ['box-shadow', 'none']]) {
    assertPropertyValue(inlineScreenBody, prop, new RegExp(`:\\s*${value}\\s*!important`), `Phase 1 frameless contract regression: ${prop} must still be neutralized on the inline screen`);
  }
}

console.log('workbench-scroll-responsive-contract: all assertions passed');
