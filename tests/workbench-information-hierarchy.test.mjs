/**
 * Workbench UX Refactor — Phase 3: information hierarchy + density.
 *
 * Phase 1 (PR #942) established the canonical workbench-content.hbs partial
 * and Holopad-native inline hosting. Phase 2 (PR #943, head
 * 35d9f10c5686cb857e959935016cd5e9d0228c20) established native scroll
 * ownership and shell-size responsive authority. Neither is reopened here.
 *
 * Phase 3 addresses information hierarchy and density — the workbench had
 * plenty of *room* after Phase 1/2, but too much persistent chrome (a full
 * mentor panel, a tall item hero, a globally-visible Chassis Finish picker,
 * a three-box footer, noisy cards) was competing for that room all at once.
 *
 * This phase, specifically:
 *   - converts the mentor from a large bordered panel into a compact
 *     communications strip, and — the point most likely to regress — makes
 *     it survive every responsive tier. Before this phase,
 *     app-responsive-workbench.css set `.swse-customization-mentor {
 *     display: none !important; }` at is-shell-short/-tier-micro/-tiny,
 *     directly contradicting the mentor's role as an always-present
 *     narrator. That rule is gone; the mentor now shrinks (portrait size,
 *     padding, dialogue line-clamp) instead of disappearing;
 *   - makes the lightsaber Chassis Finish picker appear only when it's
 *     actually relevant. Before this phase it rendered unconditionally,
 *     between the step rail and every tab conditional, so it stayed on
 *     screen through Crystal, Hilt, and Review regardless of what the
 *     player was doing. It's now gated by a `lightsaber.showFinishPicker`
 *     view-model flag computed in item-customization-workbench.js: true
 *     during the Chassis step in construction mode, or during the Hilt step
 *     in tuning mode (tuning never has a reachable Chassis step at all —
 *     `_canChangeLightsaberChassis()` returns false whenever an existing
 *     lightsaber is being edited — so Hilt is the nearest step tuning can
 *     actually reach). This is a Handlebars `{{#if}}` around the markup, not
 *     a CSS visibility toggle: the finish-picker section is absent from the
 *     rendered DOM entirely outside those two cases, not just hidden;
 *   - compacts the item hero (smaller portrait, clamped description) while
 *     preserving name/subtitle/primary stats and the Full Stats expansion —
 *     given its own narrowly-scoped max-height/overflow so opening it can't
 *     squeeze the workspace/footer out of reach;
 *   - compacts the footer into a tighter single rail (same
 *     credits/cost/after/slot-meter/action markup, denser CSS at every
 *     tier) without dropping any of that data;
 *   - clamps card descriptions/rules text to 2 lines so cards read as
 *     scannable choices, while the Intel rail keeps carrying the complete,
 *     unclamped detail — the description text itself is not deleted, only
 *     visually subordinate on the card.
 *
 * None of this touches Phase 2's scroll-ownership or responsive-authority
 * selectors, and none of it touches any customization/commerce/slot/
 * lightsaber/energy-shield/Tech-Specialist rule engine.
 *
 * Static/source-level tests, following the pattern established in
 * tests/workbench-inline-structural-flattening.test.mjs and
 * tests/workbench-scroll-responsive-contract.test.mjs.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (rel) => readFile(new URL(rel, root), 'utf8');

const PARTIAL_PATH = 'templates/apps/customization/partials/workbench-content.hbs';
const WORKBENCH_JS = 'scripts/apps/customization/item-customization-workbench.js';
const WORKBENCH_CSS = 'styles/apps/item-customization-workbench.css';
const RESPONSIVE_CSS = 'styles/system/app-responsive-workbench.css';
const ADAPTER_PATH = 'scripts/ui/shell/WorkbenchSurfaceAdapter.js';

/** Extract rule bodies whose selector list matches `selectorRe` (tested
 * against the selector text with its delimiter re-appended). Mirrors the
 * helper in tests/workbench-scroll-responsive-contract.test.mjs. */
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

/* ------------------------------------------------------------------ *
 * 1. Mentor is never hidden at any responsive tier.
 * ------------------------------------------------------------------ */
{
  const responsive = await read(RESPONSIVE_CSS);
  const withoutComments = responsive.replace(/\/\*[\s\S]*?\*\//g, '');

  // The literal regression: any rule resolving to display: none on the
  // mentor, at any of the tiers the mentor must survive.
  for (const tier of ['is-shell-short', 'is-shell-tier-micro', 'is-shell-narrow', 'is-shell-tiny', 'is-shell-compact']) {
    const tierMentorBodies = findRuleBodies(
      withoutComments,
      new RegExp(`${tier}[^{]*\\.swse-customization-mentor(\\s*[,{])`)
    );
    for (const b of tierMentorBodies) {
      assertNoProperty(b, 'display', `.swse-customization-mentor must not be hidden (display set) at ${tier} — the mentor must survive every responsive tier`);
    }
  }
  assert.doesNotMatch(withoutComments, /\.swse-customization-mentor\s*\{[^}]*display\s*:\s*none/,
    'no rule anywhere may resolve .swse-customization-mentor to display: none');

  // Mentor markup itself: portrait, header, dialogue hook, mentor key, raw
  // text, and the accessible full-text affordance all present.
  const partial = await read(PARTIAL_PATH);
  assert.match(partial, /class="mentor-avatar"/, 'mentor portrait element must be present');
  assert.match(partial, /class="mentor-head"/, 'mentor header element must be present');
  assert.match(partial, /class="mentor-text"[^>]*data-workbench-mentor-text/, 'mentor dialogue hook must be present');
  assert.match(partial, /data-mentor="\{\{mentorKey\}\}"/, 'mentor key must be present for hydration');
  assert.match(partial, /data-raw-text="\{\{mentorText\}\}"/, 'raw mentor dialogue source must remain in the DOM (never destructively replaced with filler)');
  assert.match(partial, /title="\{\{mentorText\}\}"/, 'mentor dialogue must expose the full text via a native accessible affordance (title) for when it is visually clamped');

  // Adapter hydration path unchanged.
  const adapter = await read(ADAPTER_PATH);
  assert.match(adapter, /surfaceRoot\?\.querySelector\?\.\('\[data-workbench-mentor-text\]'\)/, 'WorkbenchSurfaceAdapter must still hydrate [data-workbench-mentor-text]');
  assert.match(adapter, /MentorTranslationIntegration\.render\(/, 'mentor translation pipeline must still be wired');
}

/* ------------------------------------------------------------------ *
 * 2. Mentor compact-strip contract: bounded portrait, tightened spacing,
 * dialogue clamp — not the old large-panel geometry, but not deleted
 * either. Structural properties, not exact pixel snapshots.
 * ------------------------------------------------------------------ */
{
  const css = await read(WORKBENCH_CSS);
  const responsive = await read(RESPONSIVE_CSS);

  // .swse-customization-mentor also appears in a shared clip-path selector
  // list (line ~53) — find specifically the grid-geometry rule, not that one.
  const baseMentorBody = findRuleBodies(css, /^\.swse-customization-mentor(\s*[,{])/m)
    .find(b => /grid-template-columns/.test(b));
  assert.ok(baseMentorBody, 'base .swse-customization-mentor grid-geometry rule must exist');
  const portraitColMatch = baseMentorBody.match(/grid-template-columns\s*:\s*(\d+)px/);
  assert.ok(portraitColMatch, 'mentor must use a fixed-portrait-width grid arrangement');
  const portraitWidth = Number(portraitColMatch[1]);
  assert.ok(portraitWidth <= 56, `desktop mentor portrait column must be bounded/compact (<=56px), was declared as ${portraitWidth}px — this must read as a communications strip, not the old large panel`);

  const baseAvatarBody = findRuleBodies(css, /^\.mentor-avatar(\s*[,{])/m)[0];
  assert.ok(baseAvatarBody, 'base .mentor-avatar rule must exist');
  assert.match(baseAvatarBody, /width\s*:\s*4[0-9]px/, 'desktop mentor portrait must be bounded to a compact size (40-49px)');

  const mentorTextBody = findRuleBodies(css, /^\.mentor-text(\s*[,{])/m)[0];
  assert.ok(mentorTextBody, 'base .mentor-text rule must exist');
  assert.match(mentorTextBody, /-webkit-line-clamp/, 'mentor dialogue should be softly clamped, not left to grow the strip without bound under long dialogue');

  // The compact/narrow/tiny tiers must shrink the strip further, not just
  // repeat the same geometry — proves this is an actual compact contract,
  // not a no-op override.
  const compactAvatarBodies = findRuleBodies(responsive, /is-shell-compact[^{]*\.mentor-avatar(\s*[,{])/);
  assert.ok(compactAvatarBodies.some(b => /width\s*:\s*\d{2}px/.test(b)), 'compact tier must set a bounded mentor portrait width');
  const tinyAvatarBodies = findRuleBodies(responsive, /is-shell-tiny[^{]*\.mentor-avatar(\s*[,{])/);
  assert.ok(tinyAvatarBodies.length > 0, 'tiny tier must still style (not remove) the mentor portrait');

  // Never let the compact/tiny geometry regress back toward the pre-Phase-3
  // large panel (72px portrait, 12px/14px padding).
  for (const b of [...compactAvatarBodies, ...tinyAvatarBodies]) {
    assertNoProperty(b, 'width: 72px', 'compact/tiny mentor portrait must not regress to the old 72px large-panel size');
  }
}

/* ------------------------------------------------------------------ *
 * 3. Lightsaber Chassis Finish is contextual, not globally persistent.
 * ------------------------------------------------------------------ */
{
  const partial = await read(PARTIAL_PATH);

  // The finish-picker markup must be gated by the computed flag, not
  // unconditionally rendered before the tab conditionals.
  assert.match(partial, /\{\{#if lightsaber\.showFinishPicker\}\}[\s\S]{0,40}<section class="ls-finish-picker"/,
    '.ls-finish-picker must be gated by {{#if lightsaber.showFinishPicker}}, not rendered unconditionally');

  // It must appear before the tab-panel conditionals in source order (so it
  // still reads as "part of the step area", just now conditional) and there
  // must be exactly one copy — not duplicated per tab.
  const finishPickerCount = (partial.match(/class="ls-finish-picker"/g) || []).length;
  assert.equal(finishPickerCount, 1, 'exactly one .ls-finish-picker must exist in the canonical partial — not duplicated per lightsaber tab');

  const finishIndex = partial.indexOf('class="ls-finish-picker"');
  const chassisTabIndex = partial.indexOf("{{#if lightsaber.tabChassis}}");
  const crystalTabIndex = partial.indexOf("{{#if lightsaber.tabCrystal}}");
  assert.ok(finishIndex > -1 && chassisTabIndex > -1 && crystalTabIndex > -1, 'expected markers must be present');
  assert.ok(finishIndex < chassisTabIndex && finishIndex < crystalTabIndex,
    '.ls-finish-picker must remain positioned before the tab panels (a sibling of the active panel, not nested inside one) — its visibility is now conditional, its position in the wizard flow is unchanged');

  // Action binding and preview machinery untouched.
  assert.match(partial, /data-action="set-lightsaber-finish"/, 'set-lightsaber-finish action binding must survive');
  assert.match(partial, /\{\{lightsaber\.selectedFinishLabel\}\}/, 'selected finish label must still be shown in the picker header');
  assert.match(partial, /\{\{#each lightsaber\.finishOptions\}\}/, 'finish option iteration must survive');

  // Review must still summarize the selected finish (it does not duplicate
  // the picker, just the chosen value).
  assert.match(partial, /<span>Finish<\/span><strong>\{\{lightsaber\.review\.finishLabel\}\}<\/strong>/,
    'Review step must still display the selected Finish');

  // The view-model computation: shown during Chassis, and during Hilt
  // specifically when an existing lightsaber is actually being tuned.
  //
  // This must be keyed to !!editItem, NOT !canChangeChassis:
  // _canChangeLightsaberChassis() returns false for two conceptually
  // different reasons — an existing saber is being edited (tuning), OR no
  // existing saber is being edited but construction is locked/ineligible.
  // Only the first is "tuning". Using the inverse of chassis permission as
  // the Hilt-fallback predicate would incorrectly surface Chassis Finish on
  // Hilt for a locked/ineligible construction route that never had an item
  // to tune.
  const workbenchJs = await read(WORKBENCH_JS);
  assert.match(workbenchJs, /showFinishPicker:\s*activeTab === 'chassis' \|\| \(!!editItem && activeTab === 'hilt'\)/,
    "showFinishPicker's Hilt fallback must be keyed to !!editItem (actually tuning an existing lightsaber), not !canChangeChassis (which is also true for locked/ineligible construction with no existing item)");
  assert.doesNotMatch(workbenchJs, /showFinishPicker:\s*activeTab === 'chassis' \|\| \(!canChangeChassis && activeTab === 'hilt'\)/,
    'showFinishPicker must not use !canChangeChassis as a tuning proxy — that flag conflates "editing an existing item" with "construction is unavailable"');
}

/* ------------------------------------------------------------------ *
 * 4. Footer: all financial/slot/action data present; footer is denser but
 * not a fresh three-independent-box layout.
 * ------------------------------------------------------------------ */
{
  const partial = await read(PARTIAL_PATH);
  assert.match(partial, /\{\{footer\.credits\}\}/, 'footer must show credits');
  assert.match(partial, /\{\{footer\.cost\}\}/, 'footer must show cost');
  assert.match(partial, /\{\{footer\.after\}\}/, 'footer must show after-balance');
  assert.match(partial, /\{\{footer\.slots\.usedSlots\}\}\s*\/\s*\{\{footer\.slots\.totalAvailable\}\}/, 'footer must show slot usage (used/total)');
  assert.match(partial, /class="meter-bar/, 'footer must retain the slot meter bar');
  assert.match(partial, /data-action="reset-item"/, 'reset-item action must survive');
  assert.match(partial, /data-action="close-workbench"/, 'close-workbench action must survive');
  assert.match(partial, /data-action="apply-item"/, 'apply-item action must survive');
  assert.match(partial, /\{\{#if footer\.blockedReason\}\}/, 'blocked-reason display must survive, associated with Apply');

  // Density guard: the footer must be denser than the pre-Phase-3 desktop
  // geometry (12px/16px padding, 26px credit values), not merely relabeled.
  const css = await read(WORKBENCH_CSS);
  const footerBody = findRuleBodies(css, /^\.swse-customization-footer(\s*[,{])/m)[0];
  assert.ok(footerBody, 'base .swse-customization-footer rule must exist');
  assert.doesNotMatch(footerBody, /padding\s*:\s*12px 16px/, 'footer padding must be reduced from the pre-Phase-3 12px/16px');
  const creditValueBody = findRuleBodies(css, /\.credit-box \.value(\s*[,{])/)[0];
  assert.ok(creditValueBody, '.credit-box .value rule must exist');
  assert.doesNotMatch(creditValueBody, /font-size\s*:\s*26px/, 'credit value font-size must be reduced from the pre-Phase-3 26px');

  // Regression guard: if a future pass reintroduces large independent boxed
  // financial cards, this should fail — .credit-box must not carry its own
  // background/box-shadow (only the shared border-right divider), which
  // would turn it back into a standalone card.
  const creditBoxBody = findRuleBodies(css, /^\.credit-box(\s*[,{])/m)[0];
  assert.ok(creditBoxBody, '.credit-box rule must exist');
  assertNoProperty(creditBoxBody, 'background', '.credit-box must not gain its own background — that would recreate the old "three large standalone financial cards" presentation this phase removed');
  assertNoProperty(creditBoxBody, 'box-shadow', '.credit-box must not gain its own box-shadow — same reasoning');
}

/* ------------------------------------------------------------------ *
 * 5. Hero contract: identity, image/SVG, primary stats, and Full Stats
 * expansion all remain; Full Stats is bounded so it can't push the
 * workspace/footer out of reach.
 * ------------------------------------------------------------------ */
{
  const partial = await read(PARTIAL_PATH);
  assert.match(partial, /<span>\{\{currentItem\.name\}\}<\/span>/, 'hero must show the current item name');
  assert.match(partial, /class="hint">\{\{currentItem\.subtitle\}\}/, 'hero must show subtitle/category context');
  assert.match(partial, /<img src="\{\{currentItem\.img\}\}" alt="\{\{currentItem\.name\}\}">/, 'hero must show item artwork for non-lightsaber items');
  assert.match(partial, /\{\{\{lightsaber\.heroSvg\}\}\}/, 'hero must render the lightsaber chassis/blade SVG for lightsabers');
  assert.match(partial, /\{\{#each currentItem\.stats\}\}/, 'hero must show primary stats');
  assert.match(partial, /class="ls-stat-expander"/, 'Full Stats expansion control must be present');
  assert.match(partial, /\{\{#each currentItem\.expandedStats\}\}/, 'Full Stats must still iterate the expanded stat list');

  const css = await read(WORKBENCH_CSS);
  // Description is present but visually subordinate (clamped), not deleted.
  const descBody = findRuleBodies(css, /\.hero-description(\s*[,{])(?!\s*\.)/)
    .find(b => /-webkit-line-clamp/.test(b));
  assert.ok(descBody, 'general-item .hero-description must be clamped so a long description cannot dominate the hero');
  assert.match(partial, /class="hero-description">\{\{currentItem\.description\}\}/, 'the full description text must still be rendered (clamped visually, not truncated in the DOM)');
}

/* ------------------------------------------------------------------ *
 * 5b. Hero / Full Stats scroll ownership: exactly one owner, never two
 * nested vertical scrollers. Correction: the collapsed hero must not scroll
 * (overflow: hidden); it becomes the sole scroll owner only while Full
 * Stats is open (a :has(.ls-stat-expander[open]) rule — the codebase
 * already relies on :has() elsewhere in this file). .hero-stats--expanded
 * itself must never independently declare overflow-y — that would nest a
 * second scroller inside the (now scrolling) hero.
 * ------------------------------------------------------------------ */
{
  const css = await read(WORKBENCH_CSS);
  const responsive = await read(RESPONSIVE_CSS);

  // .hero-stats--expanded owns no overflow of its own.
  const expandedBody = findRuleBodies(css, /\.hero-stats--expanded(\s*[,{])(?!\s*\.)/)[0];
  assert.ok(expandedBody, '.hero-stats--expanded rule must exist');
  assertNoProperty(expandedBody, 'overflow-y', '.hero-stats--expanded must not independently scroll — that would nest a second vertical scroller inside .item-hero while it is the expanded-state scroll owner');
  assertNoProperty(expandedBody, 'max-height', '.hero-stats--expanded must not be independently height-bounded either — the containing .item-hero owns both the bound and the scroll while expanded');

  // The collapsed (not-expanded) compact-tier .item-hero rule must not be a
  // permanent scroller.
  const compactHeroBaseBody = findRuleBodies(responsive, /is-shell-compact[^{]*\.item-hero(\s*[,{])(?!:has)/)
    .find(b => /max-height/.test(b));
  assert.ok(compactHeroBaseBody, 'compact-tier base .item-hero rule must exist');
  assertNoProperty(compactHeroBaseBody, 'overflow: auto', 'the collapsed compact .item-hero must not be a permanent overflow: auto scroller');
  assert.match(compactHeroBaseBody, /overflow\s*:\s*hidden/, 'the collapsed compact .item-hero must be bounded (overflow: hidden), not scrolling, until Full Stats is open');

  // The hero becomes the sole scroll owner only in the expanded state.
  const expandedHeroBodies = findRuleBodies(responsive, /\.item-hero:has\(\.ls-stat-expander\[open\]\)(\s*[,{])/);
  assert.ok(expandedHeroBodies.length > 0, '.item-hero:has(.ls-stat-expander[open]) must exist — the hero becomes the scroll owner only while Full Stats is actually open');
  assert.ok(expandedHeroBodies.some(b => /overflow-y\s*:\s*auto/.test(b)), '.item-hero:has(.ls-stat-expander[open]) must own the exceptional scroll');

  // No rule anywhere may resolve .item-hero to a plain (non-:has-scoped)
  // overflow: auto / overflow-y: auto — that is exactly the "permanent
  // scroller regardless of Full Stats state" regression.
  const withoutComments = responsive.replace(/\/\*[\s\S]*?\*\//g, '');
  const plainItemHeroBodies = findRuleBodies(withoutComments, /(?<!:has\(\.ls-stat-expander\[open\]\))\.item-hero(\s*[,{])(?!:has)/);
  for (const b of plainItemHeroBodies) {
    assertNoProperty(b, 'overflow: auto', 'no unconditional .item-hero rule may declare overflow: auto — the hero must only scroll while Full Stats is open');
    assertNoProperty(b, 'overflow-y: auto', 'no unconditional .item-hero rule may declare overflow-y: auto — the hero must only scroll while Full Stats is open');
  }
}

/* ------------------------------------------------------------------ *
 * 6. Card / Intel authority: representative inspection bindings and Intel
 * rail action bindings survive; descriptions remain in the view/markup even
 * where visually clamped.
 * ------------------------------------------------------------------ */
{
  const partial = await read(PARTIAL_PATH);
  for (const action of [
    'data-action="inspect-upgrade"',
    'data-action="inspect-template"',
    'data-action="inspect-structural"',
    'data-action="inspect-lightsaber-component"',
  ]) {
    assert.ok(partial.includes(action), `canonical partial is missing required inspection binding: ${action}`);
  }

  // Intel rail: hydration/action bindings intact.
  assert.match(partial, /class="detail-rail-scroll"/, 'Modification Intel scroll region must be present');
  assert.match(partial, /class="rail-select-btn/, 'Intel rail select/apply action button must be present');
  assert.match(partial, /<dd>\{\{description\}\}<\/dd>/, 'Intel rail must still render the full, unclamped description');

  // Card descriptions are visually clamped (Phase 3) but the description
  // text itself is still rendered — business logic/data untouched, this is
  // template-only.
  assert.match(partial, /class="card-desc">\{\{description\}\}/, 'card description text must still be rendered in the template (visually clamped by CSS, not removed)');

  const css = await read(WORKBENCH_CSS);
  const cardDescBody = findRuleBodies(css, /^\.card-desc(\s*,|\s*\{)/m)
    .concat(findRuleBodies(css, /\.card-desc,\s*\.variant-desc,\s*\.card-rules(\s*[,{])/))
    .find(b => /-webkit-line-clamp/.test(b));
  assert.ok(cardDescBody, '.card-desc must be visually clamped for scannability');
}

/* ------------------------------------------------------------------ *
 * 7. Phase 2 scroll/responsive contract remains intact, unweakened.
 * ------------------------------------------------------------------ */
{
  const css = await read(WORKBENCH_CSS);
  const responsive = await read(RESPONSIVE_CSS);

  // Established scroll owners untouched.
  const wcbPaneBody = findRuleBodies(css, /\.wcb-pane(\s*,|\s*\{)(?!\s*>)/)
    .find(b => /overflow-y\s*:\s*auto/.test(b));
  assert.ok(wcbPaneBody, '.wcb-pane must remain the primary workspace scroll owner');
  const lsTabPanelBody = findRuleBodies(css, /\.ls-tab-panel(\s*,|\s*\{)/)
    .find(b => /overflow-y\s*:\s*auto/.test(b));
  assert.ok(lsTabPanelBody, '.ls-tab-panel must remain the lightsaber wizard scroll owner');
  const detailRailScrollBody = findRuleBodies(css, /\.detail-rail-scroll(\s*,|\s*\{)/)
    .find(b => /overflow-y\s*:\s*auto/.test(b));
  assert.ok(detailRailScrollBody, '.detail-rail-scroll must remain the intel rail scroll owner');

  // No JS wheel bridge reintroduced.
  const adapter = await read(ADAPTER_PATH);
  assert.doesNotMatch(adapter, /_installScrollBridge/, 'no scroll bridge may be reintroduced');
  assert.doesNotMatch(adapter, /addEventListener\(\s*['"]wheel['"]/, 'no wheel listener may be reintroduced');

  // Bounded detail-grid row contract from the Phase 2 correction pass.
  const liveDetailGridBody = findRuleBodies(css, /\.detail-grid(\s*,|\s*\{)/)
    .find(b => /grid-template-areas\s*:\s*"tabs intel"/.test(b));
  assert.ok(liveDetailGridBody, 'the live "tabs intel" .detail-grid rule must exist');
  assert.match(liveDetailGridBody, /grid-template-rows\s*:\s*minmax\(\s*0\s*,\s*1fr\s*\)/, 'the bounded detail-grid row (Phase 2 correction) must remain intact');
  assert.match(liveDetailGridBody, /align-items\s*:\s*stretch/, 'align-items: stretch (Phase 2 correction) must remain intact');

  // Compact-wide lane retention and narrow reflow authority remain wired to
  // .is-shell-narrow, not .is-shell-compact alone.
  assert.match(responsive, /is-shell-narrow[^{]*\.swse-customization-workarea[^{]*\{[^}]*flex-direction:\s*column/,
    'workarea lane-stacking must remain keyed to .is-shell-narrow');
}

/* ------------------------------------------------------------------ *
 * 8. Phase 1 contract remains intact (single canonical partial, no
 * duplicated frame, frameless inline screen).
 * ------------------------------------------------------------------ */
{
  const shellHost = await read('styles/system/shell-host.css');
  const inlineScreenBody = findRuleBodies(shellHost, /\.swse-customization-screen(\s*[,{])/)[0];
  assert.ok(inlineScreenBody, 'shell-host.css inline .swse-customization-screen rule must still exist');
  for (const [prop, value] of [['padding', '0'], ['border-radius', '0'], ['background', 'transparent'], ['box-shadow', 'none']]) {
    assert.match(inlineScreenBody, new RegExp(`${prop}:\\s*${value}\\s*!important`),
      `Phase 1 frameless contract must remain intact: ${prop} must still be neutralized on the inline screen`);
  }

  const surface = await read('templates/shell/partials/surface-workbench.hbs');
  assert.doesNotMatch(surface, /\{\{>\s*"systems\/foundryvtt-swse\/templates\/apps\/customization\/item-customization-workbench\.hbs"/,
    'surface-workbench.hbs must not include the full standalone workbench template');
}

console.log('workbench-information-hierarchy: all assertions passed');
