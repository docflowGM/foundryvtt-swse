/**
 * Garage / Shipyard corrective engineering — Phase 5: visual polish +
 * accessibility.
 *
 * Phase 4 (PR #949, tests/customization-bay-information-hierarchy.test.mjs)
 * decided WHAT information belongs where. Phase 5 does not change
 * information architecture, rules, routing, scroll ownership, responsive
 * topology, or transaction behavior — it makes that information effortless
 * to read and operate: real :focus-visible coverage, state clarity that
 * does not rely on color alone, restrained hover affordance, safe text
 * truncation, and accessible labels/semantics on top of native controls.
 *
 * This is a CSS/HBS-only pass. No engine, adapter, or transaction file is
 * touched, and no new JS was written — the two view-model fields the
 * template newly consumes (budget.tone, installedRows[].selected) were
 * already computed by #buildBudget()/#decorateSystem() in Phase 4 and were
 * simply never rendered until now.
 *
 * Static/source-level tests, following the pattern established by every
 * other file in this suite (no Handlebars/CSS-cascade/DOM runtime here).
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (rel) => readFile(new URL(rel, root), 'utf8');

const PARTIAL_PATH = 'templates/apps/customization/partials/customization-bay-content.hbs';
const APP_JS_PATH = 'scripts/apps/customization/customization-bay-app.js';
const CSS_PATH = 'styles/apps/customization-bay.css';
const RESPONSIVE_CSS_PATH = 'styles/system/app-responsive-customization-bay.css';

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

function findRuleSelectors(css, selectorRe) {
  const selectors = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (selectorRe.test(`${selector}{`)) selectors.push(selector);
  }
  return selectors;
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
 * Test Contract A — focus visibility: every keyboard-interactive Bay
 * control gets a real, non-clipped :focus-visible treatment through one
 * shared, enumerated rule (not scattered one-offs, not outline:none with
 * nothing standing in for it).
 * ------------------------------------------------------------------ */
{
  const css = await read(CSS_PATH);

  const selectors = findRuleSelectors(css, /\.bay-mode-tab:focus-visible/);
  assert.equal(selectors.length, 1, 'exactly one shared :focus-visible rule should cover .bay-mode-tab (not scattered one-offs)');
  const sharedSelector = selectors[0];

  const requiredFocusSelectors = [
    '.bay-mode-tab:focus-visible',
    '.bay-context-pill:focus-visible',
    '.bay-filter-pill:focus-visible',
    '.bay-section-action:focus-visible',
    '.bay-part-card__action:focus-visible',
    '.bay-footer button:focus-visible',
    '.bay-summary__actions button:focus-visible',
    '.bay-secondary-actions__buttons button:focus-visible',
    '.bay-secondary-actions summary:focus-visible',
    '.bay-implementation-notes summary:focus-visible',
    '.bay-installed:focus-visible',
    '.bay-browser-search__input:focus-visible',
    '.bay-browser-search__submit:focus-visible',
    '.bay-browser-search__reset:focus-visible',
  ];
  for (const sel of requiredFocusSelectors) {
    assert.ok(sharedSelector.includes(sel), `shared :focus-visible rule must cover ${sel} (found: ${sharedSelector})`);
  }

  const sharedBody = findRuleBodies(css, /\.bay-mode-tab:focus-visible/)[0];
  assert.match(sharedBody, /outline\s*:\s*\d+px\s+solid/, 'shared :focus-visible rule must declare a real outline, not a no-op');
  assertHasProperty(sharedBody, 'outline-offset', 'shared :focus-visible rule should offset the outline so it is not clipped by adjacent borders');

  // .bay-part-card itself is not natively focusable (inspection is a card
  // click; the real focus target is its install/remove button), so it gets
  // a :focus-within fallback instead of appearing in the :focus-visible list.
  const cardFocusBody = findRuleBodies(css, /^\.bay-part-card:focus-within(\s*[,{])/m)[0];
  assert.ok(cardFocusBody, '.bay-part-card:focus-within rule must exist');
  assertHasProperty(cardFocusBody, 'outline', '.bay-part-card:focus-within must declare a real outline');

  // No rule anywhere may strip focus entirely without an equally strong
  // replacement (outline: none with nothing else standing in for it).
  const noneOutlineBodies = findRuleBodies(css, /:focus(-visible)?(\s*[,{])/).filter((b) => /outline\s*:\s*none/.test(b));
  for (const b of noneOutlineBodies) {
    assert.match(b, /box-shadow|border/, 'any :focus rule setting outline:none must supply an equally strong replacement cue');
  }
}

/* ------------------------------------------------------------------ *
 * Test Contract B — state clarity: AVAILABLE / INSTALLED / INCOMPATIBLE /
 * PENDING ADD / PENDING REMOVAL / INSPECTING must be distinguishable
 * without color alone. Pending Removal must not look identical to
 * Incompatible (both use a negative-family hue). Inspecting must connect
 * visually to Intel without an overwhelming glow.
 * ------------------------------------------------------------------ */
{
  const css = await read(CSS_PATH);

  const incompatibleBody = findRuleBodies(css, /^\.bay-part-card\.incompatible(\s*[,{])/m)[0];
  assert.ok(incompatibleBody, '.bay-part-card.incompatible rule must exist');
  assertHasProperty(incompatibleBody, 'border-style', 'incompatible must carry a shape cue (dashed border), not opacity alone');
  assert.match(incompatibleBody, /border-style\s*:\s*dashed/, 'incompatible must be dashed');

  const removeBody = findRuleBodies(css, /^\.bay-part-card\.selected-remove(\s*[,{])/m)[0];
  assert.ok(removeBody, '.bay-part-card.selected-remove rule must exist');
  assertNoProperty(removeBody, 'border-style', 'selected-remove must stay solid-bordered so it reads distinctly from dashed incompatible, even though both share a negative hue');
  assertNoProperty(removeBody, 'opacity', 'selected-remove is an active pending state, not a dimmed one — must not reuse incompatible\'s opacity treatment');

  const addBody = findRuleBodies(css, /^\.bay-part-card\.selected-add(\s*[,{])/m)[0];
  assert.ok(addBody, '.bay-part-card.selected-add rule must exist');

  const inspectingBody = findRuleBodies(css, /^\.bay-part-card\.inspecting(\s*[,{])/m)[0];
  assert.ok(inspectingBody, '.bay-part-card.inspecting rule must exist (previously had zero CSS despite the class being applied in the template)');
  assert.match(inspectingBody, /box-shadow\s*:\s*inset/, 'inspecting must use a restrained inset ring, not an outer blur glow');
  assert.doesNotMatch(addBody, /inset/, 'selected-add keeps its outer glow treatment, distinct from inspecting\'s inset ring');
  assert.doesNotMatch(removeBody, /inset/, 'selected-remove keeps its outer glow treatment, distinct from inspecting\'s inset ring');

  const installedInstalledBody = findRuleBodies(css, /\.bay-installed\.inspecting(\s*[,{])/)[0];
  assert.ok(installedInstalledBody, '.bay-installed.inspecting rule must exist so the quick-list echoes which entry is under inspection');

  // The underlying text labels (never color-only) remain the true state
  // authority — verified again, unweakened, in Contract F below.
  const appJs = await read(APP_JS_PATH);
  assert.match(appJs, /label:\s*"PENDING REMOVAL"/);
  assert.match(appJs, /label:\s*"PENDING ADD"/);
  assert.match(appJs, /label:\s*"INSTALLED"/);
  assert.match(appJs, /label:\s*"INCOMPATIBLE"/);
  assert.match(appJs, /label:\s*"AVAILABLE"/);
}

/* ------------------------------------------------------------------ *
 * Test Contract C — disabled clarity: Apply, incompatible Install/other
 * disabled buttons must read as disabled through more than the browser
 * default, and disabled Apply specifically needs a second, dedicated cue
 * beyond the shared opacity treatment.
 * ------------------------------------------------------------------ */
{
  const css = await read(CSS_PATH);

  const sharedDisabledSelectors = findRuleSelectors(css, /\.bay-part-card__action:disabled/)[0];
  assert.ok(sharedDisabledSelectors.includes('.bay-footer button:disabled'), 'shared disabled rule must cover .bay-footer button:disabled');
  assert.ok(sharedDisabledSelectors.includes('.bay-summary__actions button:disabled'), 'shared disabled rule must cover .bay-summary__actions button:disabled');
  const sharedDisabledBody = findRuleBodies(css, /\.bay-part-card__action:disabled/)[0];
  assertHasProperty(sharedDisabledBody, 'opacity', 'disabled controls must be visually de-emphasized');
  assertHasProperty(sharedDisabledBody, 'cursor', 'disabled controls must signal not-actionable via cursor too');

  const primaryDisabledBody = findRuleBodies(css, /^\.bay-footer\s+button\.primary:disabled(\s*[,{])/m)[0];
  assert.ok(primaryDisabledBody, 'disabled Apply must have its own dedicated rule beyond the shared opacity treatment');
  const primaryDisabledProps = ['filter', 'border-color'].filter((p) => new RegExp(`(?:^|[;{])\\s*${p}\\s*:`).test(primaryDisabledBody));
  assert.ok(primaryDisabledProps.length >= 1, 'disabled Apply needs at least one cue beyond opacity (e.g. desaturation or border-color)');
}

/* ------------------------------------------------------------------ *
 * Test Contract D — text overflow safety: system card title, installed-
 * list name, credit values, mentor metadata/text, Tech Specialist subject
 * line, and Core Profile values must all be protected from pushing layout
 * or the Apply button out of view.
 * ------------------------------------------------------------------ */
{
  const css = await read(CSS_PATH);

  const cardTitleBody = findRuleBodies(css, /^\.bay-part-card__head strong(\s*[,{])/m)[0];
  assert.ok(cardTitleBody, '.bay-part-card__head strong rule must exist');
  assertHasProperty(cardTitleBody, 'min-width', 'card title needs min-width: 0 to actually shrink inside its flex row');
  assertHasProperty(cardTitleBody, 'text-overflow', 'card title must truncate with an ellipsis');
  assertHasProperty(cardTitleBody, 'white-space', 'card title must not wrap');

  const installedSpanBody = findRuleBodies(css, /^\.bay-installed span(\s*[,{])/m)[0];
  assert.ok(installedSpanBody, '.bay-installed span rule must exist');
  assertHasProperty(installedSpanBody, 'min-width', 'installed-list name needs min-width: 0');
  assertHasProperty(installedSpanBody, 'text-overflow', 'installed-list name must truncate');

  const budgetMetaSpanBody = findRuleBodies(css, /^\.bay-budget-meta span(\s*[,{])/m)[0];
  assert.ok(budgetMetaSpanBody, '.bay-budget-meta span rule must exist');
  assertHasProperty(budgetMetaSpanBody, 'text-overflow', 'credit values (Wallet/Cost/After) must truncate rather than wrap the panel wider');

  const panelHeadStrongBody = findRuleBodies(css, /^\.bay-panel__head strong(\s*[,{])/m)[0];
  assert.ok(panelHeadStrongBody, '.bay-panel__head strong rule must exist (Credits panel header value)');
  assertHasProperty(panelHeadStrongBody, 'text-overflow', 'Credits panel header value must truncate for very large numbers');

  const mentorMetaBody = findRuleBodies(css, /^\.bay-mentor__meta(\s*[,{])/m)[0];
  assert.ok(mentorMetaBody, '.bay-mentor__meta rule must exist');
  assertHasProperty(mentorMetaBody, 'overflow-wrap', 'mentor metadata (name/title/channel/wallet) must wrap safely rather than overflow');

  const mentorBodyBody = findRuleBodies(css, /^\.bay-mentor__body p(\s*[,{])/m)[0];
  assert.ok(mentorBodyBody, '.bay-mentor__body p rule must exist');
  assertHasProperty(mentorBodyBody, 'overflow-wrap', 'mentor dialogue text must wrap safely');

  const techSubjectBody = findRuleBodies(css, /^\.bay-section__actions span(\s*[,{])/m)[0];
  assert.ok(techSubjectBody, '.bay-section__actions span rule must exist (Tech Specialist subject line)');
  assertHasProperty(techSubjectBody, 'overflow-wrap', 'Tech Specialist subject line ("<wallet> modifying <subject>") must wrap safely, not overflow');

  const statStrongBody = findRuleBodies(css, /^\.bay-stat strong(\s*[,{])/m)[0];
  assert.ok(statStrongBody, '.bay-stat strong rule must exist (Core Profile values)');
  assertHasProperty(statStrongBody, 'overflow-wrap', 'Core Profile values must wrap safely for unusually long values');

  const cardDescBody = findRuleBodies(css, /^\.bay-part-card p(\s*[,{])/m)[0];
  assert.ok(cardDescBody, '.bay-part-card p rule must exist (system description)');
  assert.match(cardDescBody, /-webkit-line-clamp\s*:\s*3/, 'card descriptions must clamp so cards in the same row do not grow uneven heights');
  assertHasProperty(cardDescBody, 'overflow', 'clamp requires overflow: hidden to actually cut the text');

  // Compact tier tightens the clamp further (density, not new architecture).
  const responsive = await read(RESPONSIVE_CSS_PATH);
  const compactClampBodies = findRuleBodies(responsive, /is-shell-compact[^{]*\.bay-part-card p(\s*[,{])/);
  assert.ok(compactClampBodies.length > 0, 'is-shell-compact must further tighten the card description clamp');
  assert.match(compactClampBodies[0], /-webkit-line-clamp\s*:\s*2/, 'compact tier should clamp to 2 lines');
}

/* ------------------------------------------------------------------ *
 * Test Contract E — search/filter accessibility: meaningful labeling,
 * active visual state beyond color, focus-visible, and no live-search
 * requirement (click/Search-button event architecture stays frozen).
 * ------------------------------------------------------------------ */
{
  const partial = await read(PARTIAL_PATH);
  const css = await read(CSS_PATH);

  assert.match(partial, /name="systemSearch"[^>]*aria-label="Search systems"/, 'search input must carry an accessible label');
  assert.match(partial, /class="bay-filter-pill[^"]*"\s+data-action="set-system-category-filter"[^>]*aria-pressed="/, 'category filter pills must expose pressed state');
  assert.match(partial, /class="bay-filter-pill[^"]*"\s+data-action="set-system-status-filter"[^>]*aria-pressed="/, 'status filter pills must expose pressed state');
  assert.match(partial, /class="bay-context-pill[^"]*"[\s\S]{0,300}?aria-pressed="/, 'context pills must expose pressed state');
  assert.match(partial, /class="bay-mode-tab[^"]*"[\s\S]{0,300}?aria-pressed="/, 'mode tabs must retain pressed state (pre-existing, must not regress)');

  const activeBody = findRuleBodies(css, /^\.bay-filter-pill\.active(\s*[,{])/m)[0];
  assert.ok(activeBody, '.bay-filter-pill.active rule must exist');
  assert.ok(/box-shadow|border-style|font-weight/.test(activeBody), 'active filter pill must carry a non-color cue (weight/shape/shadow), not color alone');

  const sharedFocusBody = findRuleBodies(css, /\.bay-filter-pill:focus-visible/)[0];
  assert.ok(sharedFocusBody, 'filter pills must be covered by the shared :focus-visible rule');

  // Frozen event architecture: no live-search JS. The click/Search-button
  // flow (#applySystemSearch / apply-system-search action) must remain the
  // only way search text is committed — no new 'input'/'keyup' listener on
  // the search field.
  const appJs = await read(APP_JS_PATH);
  assert.doesNotMatch(appJs, /input\[name="systemSearch"\][\s\S]{0,80}addEventListener\(['"](input|keyup|keydown)['"]/,
    'Phase 5 must not add live-search JavaScript — click/Search-button behavior is frozen');
  assert.match(partial, /data-action="apply-system-search"/, 'explicit Search button action must survive');
}

/* ------------------------------------------------------------------ *
 * Test Contract F — color-independent status: READY/BLOCKED/INSTALLED/
 * INCOMPATIBLE/PENDING ADD/PENDING REMOVAL/AVAILABLE must all remain
 * understandable via their textual label, not a color-only dot.
 * ------------------------------------------------------------------ */
{
  const appJs = await read(APP_JS_PATH);
  assert.match(appJs, /label:\s*"READY"/, 'READY textual label must survive');
  assert.match(appJs, /label:\s*"BLOCKED"/, 'BLOCKED textual label must survive');

  const partial = await read(PARTIAL_PATH);
  assert.match(partial, /class="bay-status bay-status--\{\{legality\.tone\}\}">\{\{legality\.label\}\}/, 'Build Status must render its own text label, not a bare color swatch');
  assert.match(partial, /class="bay-part-card__badge[^"]*"[\s\S]{0,40}\{\{stateLabel\}\}/, 'card state badge must render its own text label');
}

/* ------------------------------------------------------------------ *
 * Test Contract G — footer action hierarchy: Apply stays primary, Close
 * stays secondary, prototype/"More Actions" controls stay outside the
 * primary footer, disabled Apply gets dedicated styling (re-checked from
 * Contract C in terms of markup wiring, not just CSS).
 * ------------------------------------------------------------------ */
{
  const partial = await read(PARTIAL_PATH);

  const footerMatch = partial.match(/<footer class="bay-footer">[\s\S]*?<\/footer>/);
  assert.ok(footerMatch, '.bay-footer element must exist');
  const footer = footerMatch[0];
  assert.match(footer, /data-action="close-bay">Back \/ Close<\/button>/, 'Close must remain a plain (non-.primary) footer button');
  assert.doesNotMatch(footer, /data-action="close-bay"[^>]*class="[^"]*primary/, 'Close must not carry the primary class');
  assert.match(footer, /data-action="apply-build" class="primary"/, 'Apply must remain the sole .primary footer action');
  assert.match(footer, /\{\{#unless canApply\}\}disabled\{\{\/unless\}\}/, 'Apply must stay gated on canApply');

  // "More Actions" (Save Draft / Request GM Approval / Send to Store Quote)
  // must live outside .bay-footer, in the collapsed secondary disclosure.
  assert.doesNotMatch(footer, /data-action="save-draft"/, 'prototype actions must not be promoted into the primary footer');
  assert.doesNotMatch(footer, /data-action="request-gm-approval"/, 'prototype actions must not be promoted into the primary footer');
  assert.doesNotMatch(footer, /data-action="store-quote"/, 'prototype actions must not be promoted into the primary footer');
  assert.match(partial, /<details class="bay-secondary-actions">[\s\S]*?data-action="save-draft"[\s\S]*?data-action="request-gm-approval"[\s\S]*?data-action="store-quote"[\s\S]*?<\/details>/,
    'prototype actions must remain inside the collapsed More Actions disclosure with their required data-action hooks intact');
}

/* ------------------------------------------------------------------ *
 * Test Contract H — mentor hologram: canonical hologram styling
 * (grayscale/tint/scanlines/glow/motion-compliance) and mentor identity
 * (Garage=Seraphim, Shipyard=Marl Skindar) must not regress. This phase
 * must not touch styles/system/mentor-hologram.css at all.
 * ------------------------------------------------------------------ */
{
  await import('./mentor-hologram-contract.test.mjs');
}

/* ------------------------------------------------------------------ *
 * Test Contract I — responsive/scroll regression: Phase 3's scroll/
 * responsive contract stays frozen, and this phase introduces no new
 * scroll owner.
 * ------------------------------------------------------------------ */
{
  await import('./customization-bay-scroll-responsive-contract.test.mjs');
  await import('./customization-bay-inline-structural-flattening.test.mjs');

  const css = await read(CSS_PATH);
  const forbiddenScrollSelectors = [
    '.bay-browser-toolbar',
    '.bay-system-groups',
    '.bay-card-grid',
    '.bay-intel__desc',
    '.bay-installed-list',
    '.bay-warning-list',
    '.bay-footer',
    '.bay-mentor',
  ];
  for (const selector of forbiddenScrollSelectors) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const bodies = findRuleBodies(css, new RegExp(`^${escaped}(\\s*[,{])`, 'm'));
    for (const b of bodies) {
      assertNoProperty(b, 'overflow-y', `${selector} must not become a new independent vertical scroll owner in Phase 5`);
      assert.doesNotMatch(b, /overflow\s*:\s*(auto|scroll)/, `${selector} must not become a new independent scroll owner in Phase 5`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * Test Contract J — Phase 4 information hierarchy regression: no
 * visual-polish change may undo the region ownership Phase 4 established.
 * ------------------------------------------------------------------ */
{
  await import('./customization-bay-information-hierarchy.test.mjs');
}

/* ------------------------------------------------------------------ *
 * Test Contract K — no rule/authority change: Phase 5 must not add
 * pricing/legality/affordability/capacity calculations, transaction
 * calls, or wallet-resolution logic. The two view-model fields newly
 * rendered (budget.tone, installedRows[].selected) must be consumed as
 * plain property reads, never recomputed by a template helper.
 * ------------------------------------------------------------------ */
{
  const appJs = await read(APP_JS_PATH);
  assert.match(appJs, /tone:\s*resulting < 0 \? "negative" : cost > 0 \? "neutral" : "positive"/,
    'the canonical budget tone formula must be unchanged from Phase 4');
  assert.match(appJs, /selected:\s*id === this\.selectedSystemId/,
    'the canonical selected-system flag must be unchanged from Phase 4');

  const partial = await read(PARTIAL_PATH);
  const budgetToneOccurrences = (partial.match(/bay-value--\{\{budget\.tone\}\}/g) || []).length;
  assert.equal(budgetToneOccurrences, 2, 'budget.tone must be consumed as a plain property read on exactly the Credits header value and the After value, no more');
  assert.doesNotMatch(partial, /\{\{(multiply|subtract|divide|add)\s+budget/, 'Phase 5 must not introduce Handlebars math helpers over budget fields — After stays the canonical engine newCredits verbatim');
  assert.match(partial, /\{\{#if selected\}\}inspecting\{\{\/if\}\}/, 'the installed-list inspecting marker must consume the existing selected flag verbatim, not a new computed value');
}

/* ------------------------------------------------------------------ *
 * Test Contract L — motion safety: any hover/focus transition added by
 * this phase must be a plain color/border/box-shadow transition already
 * covered by the existing reduced-motion conventions (no new perpetual
 * animation, no second reduced-motion framework).
 * ------------------------------------------------------------------ */
{
  const css = await read(CSS_PATH);

  // The Phase 5 hover/focus transitions added to filter pills / footer
  // buttons / search buttons / installed rows are simple property
  // transitions (color/border/background/box-shadow), not perpetual
  // keyframe animations — those require motion-gating (see the mentor
  // hologram's scanline layer); simple transitions established at
  // Workbench Phase 4 precedent do not.
  const allTransitionBodies = [];
  {
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(css))) {
      if (/transition\s*:/.test(m[2])) allTransitionBodies.push(m[2]);
    }
  }
  assert.ok(allTransitionBodies.length > 0, 'expected at least one hover/focus transition to exist');
  for (const body of allTransitionBodies) {
    assert.doesNotMatch(body, /@keyframes/, 'transitions must not reference new keyframe animations');
    assert.doesNotMatch(body, /animation\s*:/, 'a plain :hover/:focus transition rule must not also declare a perpetual animation');
  }

  // No new @keyframes were introduced by this phase, and no second
  // reduced-motion gate was invented — the existing [data-motion-style]/
  // prefers-reduced-motion convention on the standalone frame's scanline
  // (already present pre-Phase-5) remains the only motion authority.
  const keyframeMatches = css.match(/@keyframes\s+[\w-]+/g) || [];
  assert.equal(keyframeMatches.length, 0, 'Phase 5 must not introduce new perpetual Bay animations');
}

console.log('customization-bay-visual-polish-contract: all assertions passed');
