/**
 * Workbench UX Refactor — Phase 4: visual polish + runtime smoke hardening.
 *
 * Phases 1-3 (PRs #942/#943/#944) are frozen contracts, covered by their own
 * suites (tests/workbench-inline-structural-flattening.test.mjs,
 * tests/workbench-scroll-responsive-contract.test.mjs,
 * tests/workbench-information-hierarchy.test.mjs) and not reopened here.
 *
 * Phase 4 does not change layout/hierarchy/scroll architecture. It:
 *   - splits .tag.state's negative uses ("Incompatible", "No armor mods")
 *     from its positive uses ("Installed"/"Applied"/"Staged") — both
 *     previously rendered in the same positive/green color, which is a real
 *     state-clarity defect (a blocking reason read as a success indicator);
 *   - adds :hover feedback to .config-card/.variant-row/.inventory-item/
 *     .action, which previously relied on cursor:pointer alone;
 *   - adds one shared :focus-visible rule for the Workbench's interactive
 *     controls — the app root carries .swse-sheet-ui, not .swse-sheet, so
 *     swse-core.css's global :focus-visible rule never reached it;
 *   - truncates .mentor-head and .inventory-name/.inventory-subtitle/
 *     .inventory-meta (previously unbounded, so an unusually long name could
 *     wrap and grow that row/strip taller than its neighbors) and makes
 *     .credit-box shrink-safe (min-width:0 + value truncation) so the
 *     footer's Credits/Cost/After row can't push Apply out of reach at
 *     narrow shell sizes.
 *
 * This is presentation-only: no mechanics, no new responsive tiers, no new
 * scroll owners, no JS.
 *
 * Static/source-level tests, following the pattern established in
 * tests/workbench-information-hierarchy.test.mjs.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (rel) => readFile(new URL(rel, root), 'utf8');

const PARTIAL_PATH = 'templates/apps/customization/partials/workbench-content.hbs';
const WORKBENCH_CSS = 'styles/apps/item-customization-workbench.css';
const RESPONSIVE_CSS = 'styles/system/app-responsive-workbench.css';
const ADAPTER_PATH = 'scripts/ui/shell/WorkbenchSurfaceAdapter.js';

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

function assertNoProperty(body, prop, message) {
  const propRe = new RegExp(`(?:^|[;{])\\s*${prop}\\s*:`, '');
  assert.ok(!propRe.test(body), message);
}

function assertHasProperty(body, prop, message) {
  const propRe = new RegExp(`(?:^|[;{])\\s*${prop}\\s*:`, '');
  assert.ok(propRe.test(body), message);
}

/* ------------------------------------------------------------------ *
 * 1. State styling contracts: selected/installed/removing/disabled/
 * inspected all remain visually distinct, and the negative/positive tag
 * conflation is fixed.
 * ------------------------------------------------------------------ */
{
  const css = await read(WORKBENCH_CSS);
  const partial = await read(PARTIAL_PATH);

  const selectedBody = findRuleBodies(css, /\.config-card\.selected,\s*\.variant-row\.selected(\s*[,{])/)[0];
  assert.ok(selectedBody, '.config-card.selected rule must exist');
  assertHasProperty(selectedBody, 'border-left', 'selected must have a distinguishing border-left');

  const installedBody = findRuleBodies(css, /^\.config-card\.installed(\s*[,{])/m)[0];
  assert.ok(installedBody, '.config-card.installed rule must exist');
  assertHasProperty(installedBody, 'border-left', 'installed must have a distinguishing border-left');

  const disabledBody = findRuleBodies(css, /^\.config-card\.disabled(\s*[,{])/m)[0];
  assert.ok(disabledBody, '.config-card.disabled rule must exist');
  assertHasProperty(disabledBody, 'opacity', 'disabled must be visually de-emphasized (opacity)');

  const removingBody = findRuleBodies(css, /\.config-card\.removing,[\s\S]{0,120}?\.rail-detail-card\.removing(\s*[,{])/)[0];
  assert.ok(removingBody, '.config-card.removing rule must exist');
  assertHasProperty(removingBody, 'border-left', 'removing must have a distinguishing border-left');

  const inspectedBody = findRuleBodies(css, /\.config-card\.inspected,[\s\S]{0,120}?\.rail-detail-card\.inspected(\s*[,{])/)[0];
  assert.ok(inspectedBody, '.config-card.inspected rule must exist');
  assert.ok(/outline/.test(inspectedBody) || /box-shadow/.test(inspectedBody),
    'inspected must have a distinguishing outline or box-shadow');

  // Regression: selected/installed/removing/disabled must all differ from
  // each other's primary distinguishing colors — not asserting exact color
  // values, just that they are not all wired to the same CSS custom
  // property (which would make them visually indistinguishable).
  const colorTokens = [selectedBody, installedBody, removingBody]
    .map(b => (b.match(/var\(--icw-[a-z]+\)/) || [])[0])
    .filter(Boolean);
  assert.equal(new Set(colorTokens).size, colorTokens.length,
    'selected/installed/removing must not all resolve to the same color token');

  // The negative/positive .tag.state fix: "Incompatible" and "No armor mods"
  // must carry a class distinct from the plain positive .tag.state used for
  // Installed/Applied/Staged, and that class must resolve to a different
  // color than the bare .tag.state.
  const negativeTagOccurrences = (partial.match(/class="tag state negative"/g) || []).length;
  assert.ok(negativeTagOccurrences >= 3,
    `expected at least 3 negative-state tags ("Incompatible" x2, "No armor mods") to carry .negative, found ${negativeTagOccurrences}`);
  assert.doesNotMatch(partial, /class="tag state">Incompatible/,
    '"Incompatible" must not use the bare positive .tag.state class');
  assert.doesNotMatch(partial, /class="tag state">No armor mods/,
    '"No armor mods" must not use the bare positive .tag.state class');

  const positiveStateBody = findRuleBodies(css, /^\.tag\.state(\s*[,{])/m)[0];
  assert.ok(positiveStateBody, 'base .tag.state rule must exist');
  const negativeStateBody = findRuleBodies(css, /^\.tag\.state\.negative(\s*[,{])/m)[0];
  assert.ok(negativeStateBody, '.tag.state.negative rule must exist');
  assert.notEqual(positiveStateBody.trim(), negativeStateBody.trim(),
    '.tag.state.negative must resolve to different styling than the bare positive .tag.state');
  assert.match(negativeStateBody, /var\(--icw-negative\)/, '.tag.state.negative must use the negative color token');
}

/* ------------------------------------------------------------------ *
 * 2. Focus visibility: representative interactive Workbench controls have
 * a :focus-visible treatment, via one shared rule (not per-selector
 * duplicates).
 * ------------------------------------------------------------------ */
{
  const css = await read(WORKBENCH_CSS);

  const focusBodies = findRuleBodies(css, /\.config-card:focus-visible/);
  assert.ok(focusBodies.length > 0, 'a :focus-visible rule covering .config-card must exist');

  // Find the actual shared rule's full selector list to confirm it's one
  // rule covering multiple controls, not one-off duplicates.
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  let sharedFocusSelector = null;
  while ((m = re.exec(css))) {
    const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (/\.config-card:focus-visible/.test(selector) && /outline/.test(m[2])) {
      sharedFocusSelector = selector;
      break;
    }
  }
  assert.ok(sharedFocusSelector, 'shared :focus-visible rule must exist and declare an outline');
  for (const selector of ['.variant-row:focus-visible', '.inventory-item:focus-visible', '.action:focus-visible']) {
    assert.ok(sharedFocusSelector.includes(selector),
      `shared :focus-visible rule must cover ${selector} (found selector list: ${sharedFocusSelector})`);
  }
  assert.match(focusBodies[0], /outline\s*:\s*\d/, ':focus-visible must declare a real outline width, not a no-op');
}

/* ------------------------------------------------------------------ *
 * 3. Mentor survives: no responsive display:none, hydration hook intact.
 * Reasserted here (not weakened) per Phase 4 requirements — the
 * authoritative contract remains tests/workbench-information-hierarchy.test.mjs.
 * ------------------------------------------------------------------ */
{
  const responsive = await read(RESPONSIVE_CSS);
  const withoutComments = responsive.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(withoutComments, /\.swse-customization-mentor\s*\{[^}]*display\s*:\s*none/,
    'no rule anywhere may resolve .swse-customization-mentor to display: none');

  const partial = await read(PARTIAL_PATH);
  assert.match(partial, /class="mentor-text"[^>]*data-workbench-mentor-text/, 'mentor dialogue hook must be present');

  const adapter = await read(ADAPTER_PATH);
  assert.match(adapter, /surfaceRoot\?\.querySelector\?\.\('\[data-workbench-mentor-text\]'\)/, 'WorkbenchSurfaceAdapter must still hydrate [data-workbench-mentor-text]');

  // Phase 4: mentor-head must now truncate rather than wrap, so an unusually
  // long name can't eat into the height budget allocated to the dialogue.
  const css = await read(WORKBENCH_CSS);
  const mentorHeadBody = findRuleBodies(css, /^\.mentor-head(\s*[,{])/m)[0];
  assert.ok(mentorHeadBody, '.mentor-head rule must exist');
  assertHasProperty(mentorHeadBody, 'white-space', '.mentor-head must truncate to one line (white-space: nowrap)');
  assertHasProperty(mentorHeadBody, 'text-overflow', '.mentor-head must truncate with an ellipsis affordance');
}

/* ------------------------------------------------------------------ *
 * 4. Footer actions/data survive.
 * ------------------------------------------------------------------ */
{
  const partial = await read(PARTIAL_PATH);
  assert.match(partial, /\{\{footer\.credits\}\}/, 'footer must show credits');
  assert.match(partial, /\{\{footer\.cost\}\}/, 'footer must show cost');
  assert.match(partial, /\{\{footer\.after\}\}/, 'footer must show after-balance');
  assert.match(partial, /class="meter-bar/, 'footer must retain the slot meter bar');
  assert.match(partial, /data-action="reset-item"/, 'reset-item action must survive');
  assert.match(partial, /data-action="close-workbench"/, 'close-workbench action must survive');
  assert.match(partial, /data-action="apply-item"/, 'apply-item action must survive');
  assert.match(partial, /\{\{#if footer\.blockedReason\}\}/, 'blocked-reason display must survive, associated with Apply');

  // Phase 4: credit-box must be shrink-safe so the row can't push Apply out
  // of a bounded/clipped footer at narrow shell sizes.
  const css = await read(WORKBENCH_CSS);
  const creditBoxBody = findRuleBodies(css, /^\.credit-box(\s*[,{])/m)[0];
  assert.ok(creditBoxBody, '.credit-box rule must exist');
  assertHasProperty(creditBoxBody, 'min-width', '.credit-box must be shrink-safe (min-width: 0) inside its flex row');

  const actionHoverBodies = findRuleBodies(css, /\.action:not\(:disabled\):hover/);
  assert.ok(actionHoverBodies.length > 0, 'Reset/Close/Apply (.action) must have a :hover treatment');
}

/* ------------------------------------------------------------------ *
 * 5. Lightsaber responsive geometry survives (thin re-check — the
 * authoritative effective-cascade protection lives in
 * tests/workbench-information-hierarchy.test.mjs and is not duplicated or
 * weakened here).
 * ------------------------------------------------------------------ */
{
  const responsive = await read(RESPONSIVE_CSS);
  for (const tier of ['is-shell-compact', 'is-shell-short']) {
    const excluded = findRuleBodies(responsive, new RegExp(`${tier}[^{]*\\.item-hero:not\\(\\.item-hero--lightsaber\\)(\\s*[,{])`));
    assert.ok(excluded.length > 0, `${tier} must still exclude .item-hero--lightsaber from the generic .item-hero compaction`);
    const lightsaberCap = findRuleBodies(responsive, new RegExp(`${tier}[^{]*\\.item-hero--lightsaber(\\s*[,{])`))
      .map(b => b.match(/max-height\s*:\s*(\d+)px/)).find(Boolean);
    assert.ok(lightsaberCap, `${tier} must still declare a dedicated .item-hero--lightsaber max-height`);
    assert.ok(Number(lightsaberCap[1]) >= 200, `${tier} lightsaber max-height must remain sufficient for the 168px chassis SVG preview`);
  }
}

/* ------------------------------------------------------------------ *
 * 6. No new scroll cages: Phase 4 must not introduce new vertical scroll
 * owners in cards, hero descendants, footer, mentor, or the lightsaber card
 * grid. Existing Phase 2/3 scroll contracts (checked in their own suites)
 * remain authoritative; this only guards against this phase's own diff.
 * ------------------------------------------------------------------ */
{
  const css = await read(WORKBENCH_CSS);
  for (const selector of ['.card-list', '.ls-tab-card-grid', '.hero-stats--expanded', '.swse-customization-footer', '.swse-customization-mentor']) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const bodies = findRuleBodies(css, new RegExp(`^${escaped}(\\s*[,{])`, 'm'));
    for (const b of bodies) {
      assertNoProperty(b, 'overflow-y', `${selector} must not become a new independent vertical scroll owner`);
      assertNoProperty(b, 'overflow: auto', `${selector} must not become a new independent vertical scroll owner`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * 7. Primary responsive authority: .is-shell-compact/.is-shell-short must
 * not stack primary lanes; .is-shell-narrow remains the stacking trigger.
 * Thin re-check — the authoritative contract lives in
 * tests/workbench-scroll-responsive-contract.test.mjs / test block 7 of
 * tests/workbench-information-hierarchy.test.mjs.
 * ------------------------------------------------------------------ */
{
  const responsive = await read(RESPONSIVE_CSS);
  const withoutComments = responsive.replace(/\/\*[\s\S]*?\*\//g, '');

  assert.match(withoutComments, /is-shell-narrow[^{]*\.swse-customization-workarea[^{]*\{[^}]*flex-direction:\s*column/,
    'workarea lane-stacking must remain keyed to .is-shell-narrow');

  const compactWorkareaBodies = findRuleBodies(withoutComments, /^\.application\.swse-shell-responsive\.is-shell-compact:has\([^)]*\)\s*\.swse-customization-workarea(\s*[,{])/m);
  for (const b of compactWorkareaBodies) {
    assertNoProperty(b, 'flex-direction', '.is-shell-compact alone must not set flex-direction on .swse-customization-workarea — only .is-shell-narrow may stack lanes');
  }
  const shortWorkareaBodies = findRuleBodies(withoutComments, /^\.application\.swse-shell-responsive\.is-shell-short:has\([^)]*\)\s*\.swse-customization-workarea(\s*[,{])/m);
  for (const b of shortWorkareaBodies) {
    assertNoProperty(b, 'flex-direction', '.is-shell-short alone must not stack .swse-customization-workarea merely due to height');
  }
}

console.log('workbench-visual-polish-contract: all assertions passed');
