import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// SWSE Progression UX — Attribute Step Viewport-Fit / Density Pass.
//
// This is a presentation-only density correction: the Attribute step's
// center board (STR/DEX/CON/INT/WIS/CHA + generation controls + budget +
// Lock Attributes) must fit within a normal desktop progression-shell
// viewport (~1000x750) without vertical scrolling being the expected
// experience. No mechanics, data model, or prerequisite changes.
//
// A headless test can't perform real CSS layout, so these are static
// content/contract guards on the template and stylesheet: the ability
// board contract stays intact, the budget/Lock dock stays present and
// resilient, the previous 174px card and abrupt 3-to-1-column collapse
// regressions don't reappear, and the underlying attribute mechanics
// (POINT_BUY_COST, pool/level-up allocation entry points) are untouched.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const TEMPLATE_PATH = 'templates/apps/progression-framework/steps/attribute-work-surface.hbs';
const CSS_PATH = 'styles/progression-framework/steps/attribute-step.css';
const STEP_JS_PATH = 'scripts/apps/progression-framework/steps/attribute-step.js';

const template = read(TEMPLATE_PATH);
const css = read(CSS_PATH);
const stepJs = read(STEP_JS_PATH);
// Comments stripped once for structural (selector/block) matching below --
// keeps the regexes from tripping over prose in adjacent comment blocks.
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

/* ------------------------------------------------------------------ *
 * Test 1 — six abilities remain in one shared board contract: the
 * template still renders physicalAbilities/mentalAbilities with the
 * canonical per-ability interaction attributes the shell and details
 * rail depend on for focus/hydration.
 * ------------------------------------------------------------------ */
{
  assert.match(template, /\{\{#each physicalAbilities\}\}/,
    'template no longer iterates physicalAbilities -- ability board contract broken');
  assert.match(template, /\{\{#each mentalAbilities\}\}/,
    'template no longer iterates mentalAbilities -- ability board contract broken');

  for (const attr of ['data-item-id="{{id}}"', 'data-ability-row="{{id}}"', 'data-ability="{{id}}"']) {
    const count = template.split(attr).length - 1;
    assert.ok(count >= 2, `expected ${attr} on both physical and mental ability cards, found ${count} occurrence(s)`);
  }
}

/* ------------------------------------------------------------------ *
 * Test 2 — budget and lock remain in the Attribute surface.
 * ------------------------------------------------------------------ */
{
  assert.match(template, /pointBuyStatus/, 'template no longer references pointBuyStatus -- budget readout removed');
  assert.match(template, /data-action="attribute-lock"/, 'template no longer exposes the attribute-lock action -- Lock Attributes button removed');
}

/* ------------------------------------------------------------------ *
 * Test 3 — no 174px card-height regression. The old chrome-heavy card
 * (min-height: 174px) is the single biggest contributor to the Attribute
 * step needing a scroll on a normal desktop viewport. Guard against it
 * coming back, and enforce a real desktop density ceiling.
 * ------------------------------------------------------------------ */
{
  assert.doesNotMatch(css, /174px/, 'a 174px attribute-cell height reappeared in the stylesheet');

  const cellRuleMatch = css.match(/\.prog-attr-v2-cell\s*\{([^}]*)\}/);
  assert.ok(cellRuleMatch, '.prog-attr-v2-cell rule not found in stylesheet');
  const minHeightMatch = cellRuleMatch[1].match(/min-height:\s*(\d+)px/);
  assert.ok(minHeightMatch, '.prog-attr-v2-cell has no min-height declaration to guard');
  const minHeight = Number(minHeightMatch[1]);
  assert.ok(minHeight <= 125, `.prog-attr-v2-cell min-height is ${minHeight}px, expected <= 125px for desktop density`);
}

/* ------------------------------------------------------------------ *
 * Test 4 — no early one-column collapse. There must be an intermediate
 * two-column mode for .prog-attr-v2-cells before it collapses to a
 * single column, and the collapse must not fire as early as the old
 * bare `max-width: 980px` viewport breakpoint used to (that breakpoint
 * fires well before the actual work-surface column is anywhere near
 * that narrow, since the summary/detail rails eat into it first).
 * ------------------------------------------------------------------ */
{
  // The responsive model should be container-scoped (the work-surface
  // column, not the raw browser viewport) per the design requirement.
  assert.match(css, /container-type:\s*inline-size/, 'Attribute v2 surface does not establish a size container for scoped breakpoints');

  // There must be a two-column intermediate @container step, at a WIDER
  // threshold than the one-column collapse -- i.e. a genuine middle step,
  // not a direct 3-to-1 jump.
  const containerBlocks = [...css.matchAll(/@container\s+\S+\s*\(max-width:\s*(\d+)px\)\s*\{([\s\S]*?)\n\}/g)];
  assert.ok(containerBlocks.length >= 2, 'expected at least two @container breakpoints for the ability board');

  const twoColBlock = containerBlocks.find(b => /\.prog-attr-v2-cells\s*\{\s*grid-template-columns:\s*repeat\(2,/.test(b[2]));
  assert.ok(twoColBlock, 'no @container query drives an intermediate 2-column .prog-attr-v2-cells layout');
  const oneColBlock = containerBlocks.find(b => /\.prog-attr-v2-cells\s*\{\s*grid-template-columns:\s*1fr/.test(b[2]));
  assert.ok(oneColBlock, 'no @container query collapses .prog-attr-v2-cells to a single column');
  const twoColThreshold = Number(twoColBlock[1]);
  const oneColThreshold = Number(oneColBlock[1]);
  assert.ok(oneColThreshold < twoColThreshold,
    `one-column threshold (${oneColThreshold}px) must be narrower than the two-column threshold (${twoColThreshold}px) -- otherwise there is no intermediate step`);

  // Outside the legacy no-container-query @supports fallback, nothing may
  // collapse .prog-attr-v2-cells straight from 3 columns to 1 at the old
  // too-aggressive 980px viewport breakpoint. Extract the @supports block
  // by brace-counting (it nests @media blocks, so a simple regex can't
  // find its matching close) and exclude that span before checking.
  function extractBraceBlock(source, startIndex) {
    const openIndex = source.indexOf('{', startIndex);
    if (openIndex === -1) return null;
    let depth = 0;
    for (let i = openIndex; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') {
        depth--;
        if (depth === 0) return { start: startIndex, end: i + 1 };
      }
    }
    return null;
  }
  const supportsIndex = css.indexOf('@supports not (container-type: inline-size)');
  assert.ok(supportsIndex !== -1, 'no-container-query @supports fallback block not found');
  const supportsBlock = extractBraceBlock(css, supportsIndex);
  assert.ok(supportsBlock, '@supports fallback block braces did not balance');
  const cssOutsideFallback = css.slice(0, supportsBlock.start) + css.slice(supportsBlock.end);
  assert.doesNotMatch(cssOutsideFallback, /@media \(max-width: 980px\)\s*\{\s*\.prog-attr-v2-cells\s*\{\s*grid-template-columns:\s*1fr/,
    'a bare (non-fallback) @media(max-width:980px) rule still collapses .prog-attr-v2-cells straight from 3 to 1 column');
}

/* ------------------------------------------------------------------ *
 * Test 5 — dock sticky/resilient. The budget + Lock Attributes dock
 * must carry a persistent-visibility contract as a fallback on short
 * viewports, scoped to the Attribute surface (not the browser viewport).
 * ------------------------------------------------------------------ */
{
  // .prog-attr-v2-dock appears in more than one rule (the shared chrome
  // selector list, the dedicated sizing/sticky rule, and the responsive
  // column overrides) -- collect every `{...}` block whose selector list
  // includes `.prog-attr-v2-dock` (comments already stripped so selector
  // prefixes aren't polluted by adjacent prose) and require the sticky
  // contract to appear in at least one of them.
  const dockRuleBlocks = [...cssNoComments.matchAll(/([^{}]*)\{([^}]*)\}/g)]
    .filter(m => m[1].split(',').some(sel => sel.trim() === '.prog-attr-v2-dock'));
  assert.ok(dockRuleBlocks.length >= 1, '.prog-attr-v2-dock rule not found in stylesheet');
  const dockContent = dockRuleBlocks.map(m => m[2]).join('\n');
  assert.match(dockContent, /position:\s*sticky/, '.prog-attr-v2-dock is not position: sticky');
  assert.match(dockContent, /bottom:\s*0/, '.prog-attr-v2-dock has no bottom: 0 sticky anchor');
  assert.doesNotMatch(dockContent, /position:\s*fixed/,
    'dock uses position: fixed against the browser viewport instead of a scoped sticky treatment');
}

/* ------------------------------------------------------------------ *
 * Test 6 — no mechanic changes. Static guard on the point-buy cost
 * table and the pool/level-up allocation entry points this pass was
 * required to leave untouched.
 * ------------------------------------------------------------------ */
{
  const costTableMatch = stepJs.match(/const POINT_BUY_COST = Object\.freeze\(\{([^}]*)\}\);/);
  assert.ok(costTableMatch, 'POINT_BUY_COST table not found -- attribute-step.js structure changed unexpectedly');
  const expectedCosts = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 6, 15: 8, 16: 10, 17: 13, 18: 16 };
  const actualCosts = {};
  for (const [, score, cost] of costTableMatch[1].matchAll(/(\d+):\s*(\d+)/g)) {
    actualCosts[Number(score)] = Number(cost);
  }
  assert.deepEqual(actualCosts, expectedCosts, 'POINT_BUY_COST table values changed -- this pass must not alter attribute mechanics');

  assert.match(stepJs, /getPointBuyPool\(shell\)\s*\{/, 'getPointBuyPool(shell) entry point missing or renamed');
  assert.match(stepJs, /_getLevelUpAbilityIncreaseCount\(shell\)\s*\{/, '_getLevelUpAbilityIncreaseCount(shell) entry point missing or renamed');
}

console.log('progression-attribute-viewport-density: all assertions passed');
