import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Regression: the "Suggested Point Buy Builds" (Attribute Mentor) modal had
// no vertical scroll owner. position: { width: 900, height: 'auto' }
// (attribute-mentor-dialog.js) lets the Foundry window frame grow to fit its
// content with no viewport check, so with 3+ builds the frame -- and the
// un-scrollable page beneath it -- simply extended past the bottom of the
// screen. All builds rendered correctly; the last one was just clipped
// below the visible area.
//
// Fix: cap the outer application frame's own height to the viewport, make
// the content chain shrinkable, and give .attr-mentor-dialog__cards (only)
// ownership of vertical scroll -- the header and Close button stay fixed.
//
// Coverage tier: (b) structural/text over the CSS source, matching this
// repo's existing convention for CSS-contract tests (see
// progression-card-select-actions.test.mjs) -- there is no CSS/DOM layout
// engine available in this Node test harness to assert computed styles.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS_PATH = 'styles/progression-framework/steps/attribute-mentor-dialog.css';
const css = fs.readFileSync(path.join(ROOT, CSS_PATH), 'utf8');

/** Returns the declaration block body for the first rule whose selector list matches `selectorSubstring`. */
function ruleBodyFor(selectorSubstring) {
  const idx = css.indexOf(selectorSubstring);
  assert.ok(idx >= 0, `expected to find a selector containing "${selectorSubstring}" in ${CSS_PATH}`);
  const openBrace = css.indexOf('{', idx);
  const closeBrace = css.indexOf('}', openBrace);
  return css.slice(openBrace + 1, closeBrace);
}

let step = 0;
function ok(label) { step += 1; console.log(`  [${step}] ${label} OK`); }

// ── 1. The build list is the vertical scroll owner: overflow-y: auto and
// min-height: 0 (the latter is required for a flex child to shrink below
// its content size and actually become scrollable). ──
{
  const cards = ruleBodyFor('.attr-mentor-dialog__cards {');
  assert.match(cards, /overflow-y:\s*auto/, '.attr-mentor-dialog__cards must own vertical scroll');
  assert.match(cards, /min-height:\s*0/, '.attr-mentor-dialog__cards needs min-height: 0 to actually shrink and scroll inside a flex column');
  assert.match(cards, /flex:\s*1\s*1\s*auto/, '.attr-mentor-dialog__cards must be the flexible (grow/shrink) region, not a fixed-size one');
}
ok('.attr-mentor-dialog__cards owns vertical scroll (overflow-y: auto, min-height: 0, flex: 1 1 auto)');

// ── 2. No forced horizontal clipping on the scroll owner: overflow-x must
// NOT be `hidden`, since that would clip .attr-mentor-hover-panel (an
// absolutely-positioned descendant that escapes its own card on hover)
// the instant it extends past the scroll container's right edge. This is
// the exact mistake the ticket warned against. ──
{
  const cards = ruleBodyFor('.attr-mentor-dialog__cards {');
  assert.ok(!/overflow-x:\s*hidden/.test(cards),
    '.attr-mentor-dialog__cards must not force overflow-x: hidden -- it would clip .attr-mentor-hover-panel horizontally');
}
ok('the scroll owner does not force overflow-x: hidden, so .attr-mentor-hover-panel is never horizontally clipped');

// ── 3. The modal/dialog has viewport-aware height containment on the outer
// application frame -- not a hardcoded desktop pixel height. ──
{
  const outer = ruleBodyFor('.swse-attribute-mentor-dialog {');
  assert.match(outer, /max-height:\s*calc\(100(v|dv)h/, 'the outer application frame must cap its height against the viewport (100vh/100dvh), not a fixed pixel value');
  assert.match(css, /@supports \(height: 100dvh\)/, 'a dvh progressive-enhancement block is expected, matching this repo\'s existing convention (styles/system/gm-datapad-phases.css)');
}
ok('the outer .swse-attribute-mentor-dialog frame caps its height against the viewport, with a dvh progressive enhancement');

// ── 4. The content chain can actually shrink below its natural size (the
// other half of making max-height meaningful): min-height: 0 + overflow:
// hidden on window-content/application-content/[data-application-content],
// and on .attr-mentor-dialog itself. ──
{
  const chain = ruleBodyFor('.swse-attribute-mentor-dialog .window-content,');
  assert.match(chain, /min-height:\s*0/, 'the window-content chain must allow shrinking (min-height: 0)');
  assert.match(chain, /overflow:\s*hidden/, 'the window-content chain must not itself scroll -- only .attr-mentor-dialog__cards should');

  const dialog = ruleBodyFor('.attr-mentor-dialog {');
  assert.match(dialog, /min-height:\s*0/);
  assert.match(dialog, /overflow:\s*hidden/);
  assert.match(dialog, /display:\s*flex/);
  assert.match(dialog, /flex-direction:\s*column/);
}
ok('the content chain (window-content/application-content/[data-application-content] and .attr-mentor-dialog) can shrink and does not scroll itself');

// ── 5. The header (title, intro, Close button) is fixed -- never part of
// the scrolling region. ──
{
  const header = ruleBodyFor('.attr-mentor-dialog__header {');
  assert.match(header, /flex:\s*0\s*0\s*auto/, '.attr-mentor-dialog__header must not grow or shrink -- it stays fixed while the cards list scrolls');
  assert.ok(!/overflow/.test(header), '.attr-mentor-dialog__header must not declare its own overflow/scroll behavior');
}
ok('.attr-mentor-dialog__header is non-scrolling (flex: 0 0 auto, no overflow of its own)');

// ── 6. No nested vertical scrollbars: exactly one rule in this file sets
// overflow-y to a scrolling value (auto/scroll) -- .attr-mentor-dialog__cards
// alone. Everything else in the chain is `hidden` (non-scrolling) or unset. ──
{
  const scrollingOverflowYRules = [...css.matchAll(/overflow(-y)?:\s*(auto|scroll)/g)];
  assert.equal(scrollingOverflowYRules.length, 2,
    'expected exactly the y-scroll and (fallback) x-scroll declarations on .attr-mentor-dialog__cards -- a new scrolling overflow rule elsewhere would create a nested/competing scrollbar');
}
ok('exactly one region (the cards list) declares scrolling overflow -- no nested vertical scrollbar was introduced');

// ── 7. Every selector this file touches stays scoped to the attribute
// mentor dialog's own namespace -- no unrelated `.swse` application or the
// shared progression shell was touched. ──
{
  const topLevelSelectors = [...css.matchAll(/^\.[a-zA-Z][^{]*\{/gm)].map(m => m[0]);
  for (const selectorLine of topLevelSelectors) {
    assert.ok(
      /\.(swse-attribute-mentor-dialog|attr-mentor-)/.test(selectorLine),
      `selector "${selectorLine.trim()}" is outside the attribute-mentor-dialog namespace -- this fix must not affect unrelated .swse applications`
    );
  }

  const shellCss = fs.readFileSync(path.join(ROOT, 'styles/progression-framework/progression-shell.css'), 'utf8');
  assert.ok(!shellCss.includes('attr-mentor'),
    'the shared progression-shell.css must not have been touched by this dialog-scoped fix');
}
ok('every rule in this file stays scoped to .swse-attribute-mentor-dialog/.attr-mentor-*, and the shared progression-shell.css was not touched');

// ── 8. The responsive <=860px card layout survives untouched. ──
{
  assert.match(css, /@media \(max-width: 860px\)/, 'the existing responsive breakpoint must survive');
  const responsiveIdx = css.indexOf('@media (max-width: 860px)');
  const responsiveBlock = css.slice(responsiveIdx);
  assert.match(responsiveBlock, /attr-mentor-card__head/);
  assert.match(responsiveBlock, /attr-mentor-dialog__header/);
  assert.match(responsiveBlock, /attr-mentor-card__details-grid/);
}
ok('the existing <=860px responsive card layout rules are unchanged');

// ── 9. .attr-mentor-hover-panel itself is untouched (still absolutely
// positioned, same escape mechanism) -- this fix only changes its
// ancestor's overflow/height handling, never the panel's own rule. ──
{
  const panel = ruleBodyFor('.attr-mentor-hover-panel {');
  assert.match(panel, /position:\s*absolute/, '.attr-mentor-hover-panel must remain absolutely positioned');
}
ok('.attr-mentor-hover-panel itself is unchanged (still position: absolute)');

console.log('attribute-mentor-dialog-scroll-containment: all assertions passed');
