/**
 * Progression Framework — compact-mode details panel occlusion fix.
 *
 * BEFORE this fix, `.progression-shell.is-shell-compact
 * [data-region="details-panel"]` was `position: absolute`, pinned to the
 * bottom of `.prog-content-row` (`left/right/bottom: 8px`) with
 * `max-height: min(46%, 360px)` and `z-index: 80`, while
 * `[data-region="work-surface"]` was simultaneously stretched to
 * `flex: 1 1 100%; width: 100%`. Because `.prog-content-row` was given
 * `position: relative` in the same block, the details panel floated
 * directly on top of the bottom ~46%/360px of the work surface — e.g.
 * hiding the lower attribute rows whenever a step (like Attributes, with
 * Constitution focused) had a non-empty details panel.
 *
 * AFTER this fix, `.prog-content-row` switches to `flex-direction: column`
 * at `is-shell-compact`, and `[data-region="details-panel"]` becomes an
 * ordinary in-flow flex row (`flex: 0 0 auto`, capped by `max-height`, no
 * `position: absolute`/`left`/`right`/`bottom`) that shares the column with
 * `[data-region="work-surface"]` (`flex: 1 1 auto`, not `100%`) instead of
 * floating over it. This reuses the existing ResizeObserver-driven
 * `is-shell-compact`/`-narrow`/`-tiny` responsive authority
 * (`shell-responsive-observer.js`) and the same flex-layout primitive the
 * desktop 3-column layout already uses for `.prog-content-row` — no new
 * breakpoints or viewport-specific pixel hacks are introduced.
 *
 * Static/source-level tests, following the pattern established in
 * tests/workbench-scroll-responsive-contract.test.mjs (this repo has no
 * CSS-cascade runtime to render against, so these pin the actual source
 * contract rather than a rendered snapshot).
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (rel) => readFile(new URL(rel, root), 'utf8');

const STABILIZATION_CSS = 'styles/progression-framework/chargen-stabilization.css';

/** Extract every rule body whose selector list matches `selectorRe`. */
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

function assertPropertyValueNotMatching(body, prop, valueRe, message) {
  const propRe = new RegExp(`(?:^|[;{])\\s*${prop}\\s*:\\s*[^;]*`, 'g');
  const matches = body.match(propRe) || [];
  for (const match of matches) {
    assert.doesNotMatch(match, valueRe, `${message} (found: ${match.trim()})`);
  }
}

function assertPropertyValue(body, prop, valueRe, message) {
  const propRe = new RegExp(`(?:^|[;{])\\s*${prop}\\s*:\\s*[^;]*`, 'g');
  const matches = body.match(propRe) || [];
  assert.ok(matches.length > 0, `${message} (property "${prop}" not found at all)`);
  const last = matches[matches.length - 1];
  assert.match(last, valueRe, `${message} (last "${prop}" declaration was: ${last.trim()})`);
}

/* ------------------------------------------------------------------ *
 * 1. Compact-mode details panel must never be pulled out of flow — the
 * exact occlusion shape (position: absolute + left/right/bottom anchoring)
 * must not reappear at any responsive tier.
 * ------------------------------------------------------------------ */
{
  const css = await read(STABILIZATION_CSS);

  for (const tierSelector of [
    /\.progression-shell\.is-shell-compact\s+\[data-region="details-panel"\](?!.*>)(\s*[,{])/,
    /\.progression-shell\.is-shell-narrow\s+\[data-region="details-panel"\](?!.*>)(\s*[,{])/,
    /\.progression-shell\.is-shell-tiny\s+\[data-region="details-panel"\](?!.*>)(\s*[,{])/,
  ]) {
    const bodies = findRuleBodies(css, tierSelector);
    for (const b of bodies) {
      assertPropertyValueNotMatching(b, 'position', /absolute|fixed/, `[data-region="details-panel"] must not be pulled out of flow (position: absolute/fixed) at any is-shell-* tier — it must stay a reserved in-flow region`);
      assertNoProperty(b, 'left', `[data-region="details-panel"] must not be anchored via left/right/bottom offsets (the absolute-overlay occlusion shape) at any is-shell-* tier: ${b.slice(0, 120)}`);
      assertNoProperty(b, 'right', `[data-region="details-panel"] must not be anchored via left/right/bottom offsets (the absolute-overlay occlusion shape) at any is-shell-* tier: ${b.slice(0, 120)}`);
      assertNoProperty(b, 'bottom', `[data-region="details-panel"] must not be anchored via left/right/bottom offsets (the absolute-overlay occlusion shape) at any is-shell-* tier: ${b.slice(0, 120)}`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * 2. Compact mode must lay its content row out as a column so the details
 * panel becomes a reserved bottom row, not an overlay sibling of a
 * full-height work surface.
 * ------------------------------------------------------------------ */
{
  const css = await read(STABILIZATION_CSS);

  const contentRowBodies = findRuleBodies(css, /\.progression-shell\.is-shell-compact\s+\.prog-content-row(\s*[,{])/);
  assert.ok(contentRowBodies.length > 0, '.progression-shell.is-shell-compact .prog-content-row rule must exist');
  assert.ok(contentRowBodies.some(b => /flex-direction\s*:\s*column/.test(b)),
    '.progression-shell.is-shell-compact .prog-content-row must stack its children in a column so the details panel becomes a reserved row instead of an absolutely-positioned overlay');

  // The work surface must share the column with the details panel
  // (flex: 1 1 auto) rather than claim the full 100% height, which would
  // leave no room for an in-flow details row and force it back out of flow.
  const workSurfaceBodies = findRuleBodies(css, /\.progression-shell\.is-shell-compact\s+\[data-region="work-surface"\](\s*[,{])/);
  assert.ok(workSurfaceBodies.length > 0, '.progression-shell.is-shell-compact [data-region="work-surface"] rule must exist');
  for (const b of workSurfaceBodies) {
    assertPropertyValue(b, 'flex', /1\s+1\s+auto/, '.progression-shell.is-shell-compact [data-region="work-surface"] must use flex: 1 1 auto (not a fixed 100%) so it shares the column with the reserved details-panel row instead of covering it');
  }
}

/* ------------------------------------------------------------------ *
 * 3. Details panel still collapses to zero height when empty (unchanged
 * behavior — this fix must not remove the empty-state collapse).
 * ------------------------------------------------------------------ */
{
  const css = await read(STABILIZATION_CSS);
  assert.match(css, /\.progression-shell\.is-shell-compact\s+\[data-region="details-panel"\]:has\(\.prog-details-placeholder__empty\)\s*\{[^}]*display:\s*none/,
    'the empty-state collapse for [data-region="details-panel"] must still be present so the reserved row disappears when nothing is focused');
}

console.log('progression-details-panel-compact-layout-contract: all assertions passed');
