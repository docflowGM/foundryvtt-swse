/**
 * Garage / Shipyard corrective engineering — Phase 4: information hierarchy
 * + system browser UX.
 *
 * Phases 1-3 (PRs #946/#947/#948) established wallet/asset authority,
 * structural flattening (Holopad is the frame, Bay is the content), and
 * measured-host responsive/scroll authority. This phase does not touch any
 * of that — it only changes what information the player sees and how it is
 * organized, reusing the same view model every prior phase already reads.
 *
 * BEFORE this phase, the Bay exposed implementation vocabulary directly to
 * players ("Authority: Existing Engine", "UI Contract: No Direct Mutation",
 * "Mutation: Engine Only", "Runtime Lane", "Implementation Notes for Future
 * V2 Build"), a decorative Build Stages stepper whose active index was a
 * hardcoded literal (never derived from real selection state), three
 * separate credit widgets and three separate legality/readiness panels all
 * reading the same underlying preview result, and a "Systems / Parts"
 * section with no search/filter and no distinction between inspecting a
 * system and staging it.
 *
 * AFTER this phase:
 *   - The center workspace (bay-main) is the one canonical system browser:
 *     search, category filters, status filters, and inspection-first cards
 *     (clicking a card selects it for System Intel; installing/removing
 *     stays a separate, explicit button).
 *   - The right rail (bay-right-rail) is System Intel: the authoritative
 *     explanation of whatever is currently selected, with a clean
 *     no-selection empty state, plus a concise Installed quick-list.
 *   - The left rail (bay-left-rail) is build-level context/status:
 *     Modification Status, the one primary Credits summary, Capacity, and
 *     the one primary Build Status (validation) summary — all sourced from
 *     the same previewSummary/budget/legality fields every prior phase
 *     already computed, never recalculated here.
 *   - Controls with no functioning action path beyond a "future
 *     integration" notification (Save Draft / Request GM Approval / Send
 *     to Store Quote) are demoted into a collapsed secondary-actions
 *     disclosure rather than presented as primary footer controls — they
 *     could not be removed outright without breaking the frozen Phase 2
 *     REQUIRED_ACTIONS contract (tests/customization-bay-inline-structural-
 *     flattening.test.mjs), which still requires their data-action
 *     bindings to exist.
 *
 * Static/source-level tests, following the pattern established by every
 * other file in this suite — this repo has no Handlebars/CSS-cascade/DOM
 * runtime to render against, so these pin the actual source contract
 * (which region owns which information, which control is primary vs
 * secondary) rather than a rendered snapshot or a browser harness this repo
 * does not have.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (rel) => readFile(new URL(rel, root), 'utf8');

const PARTIAL_PATH = 'templates/apps/customization/partials/customization-bay-content.hbs';
const APP_JS_PATH = 'scripts/apps/customization/customization-bay-app.js';
const CSS_PATH = 'styles/apps/customization-bay.css';

/** Strip Handlebars comments ({{!-- ... --}}) before scanning for
 * player-facing text — several legitimately discuss removed vocabulary in
 * prose to explain why it is gone. */
function stripHbsComments(source) {
  return source.replace(/\{\{!--[\s\S]*?--\}\}/g, '');
}

/** Slice `source` between two literal anchor strings (both required to be
 * present exactly once — Phase 2's frozen CANONICAL_REGION_MARKERS
 * contract already guarantees bay-left-rail/bay-main/bay-right-rail each
 * appear exactly once, so indexOf-based slicing is safe here). `endAnchor`
 * of null means "to the end of the string". */
function sliceBetween(source, startAnchor, endAnchor) {
  const start = source.indexOf(startAnchor);
  assert.ok(start !== -1, `could not locate start anchor: ${startAnchor}`);
  if (endAnchor === null) return source.slice(start);
  const end = source.indexOf(endAnchor, start + startAnchor.length);
  assert.ok(end !== -1, `could not locate end anchor: ${endAnchor}`);
  return source.slice(start, end);
}

const LEFT_RAIL_ANCHOR = '<aside class="bay-left-rail">';
const MAIN_ANCHOR = '<section class="bay-main">';
const RIGHT_RAIL_ANCHOR = '<aside class="bay-right-rail">';
const MAIN_CLOSE_ANCHOR = '</main>';

/* ------------------------------------------------------------------ *
 * TEST CONTRACT A — no player-facing implementation language. Audited
 * against the actual current strings (not a blind "contains 'engine'"
 * check, which would false-positive on legitimate in-world vehicle
 * "Engines" component vocabulary still present in profileStats/category
 * labels).
 * ------------------------------------------------------------------ */
{
  const partial = stripHbsComments(await read(PARTIAL_PATH));
  const FORBIDDEN_PHRASES = [
    'Implementation Notes',
    'Authority:',
    'UI Contract',
    'Runtime Lane',
    'Engine Only',
  ];
  for (const phrase of FORBIDDEN_PHRASES) {
    assert.ok(
      !partial.includes(phrase),
      `canonical partial must not expose developer-facing implementation vocabulary to players: found "${phrase}"`
    );
  }
  // The disclosure that used to be titled "Implementation Notes for Future
  // V2 Build" must still exist (it is a frozen Phase 2 region marker —
  // class="bay-implementation-notes" — so it cannot be deleted outright)
  // but must now read as player-useful build guidance.
  assert.match(partial, /<summary>Build Guidance<\/summary>/, 'the frozen bay-implementation-notes disclosure must be relabeled as player-useful build guidance, not removed (removing it would break the frozen Phase 2 region-marker contract)');
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT B — fake Build Stages are gone, not replaced with another
 * decorative stepper. The old #buildStages() always passed a hardcoded
 * literal activeIndex (4 for droid, 5 for vehicle, 1 for placeholder),
 * never derived from real selection/preview state — protect that it (and
 * its markup) is gone, and that what replaced it (Modification Status /
 * Build Status) reads real preview-derived fields.
 * ------------------------------------------------------------------ */
{
  const partial = await read(PARTIAL_PATH);
  assert.doesNotMatch(partial, /class="bay-stage-list"/, 'the decorative Build Stages stepper markup must not return');
  assert.doesNotMatch(partial, /class="bay-stage[\s"]/, 'no bay-stage/bay-stage--* element may remain in the canonical partial');

  const appJs = await read(APP_JS_PATH);
  assert.doesNotMatch(appJs, /#buildStages\s*\(/, 'the hardcoded-activeIndex #buildStages() generator must not exist — its output was never derived from real state');
  assert.doesNotMatch(appJs, /stageLabels/, 'MODE_CONFIG must not retain stageLabels once the stage generator that consumed them is gone');

  // What replaced it must be backed by real, already-computed preview
  // fields — not another hardcoded literal.
  assert.match(partial, /bay-panel--status/, 'a Modification Status panel must exist in the left rail');
  assert.match(partial, /\{\{previewSummary\.additions\.length\}\}/, 'Modification Status must read the real staged-additions count from previewSummary, not a hardcoded value');
  assert.match(partial, /\{\{previewSummary\.removals\.length\}\}/, 'Modification Status must read the real staged-removals count from previewSummary, not a hardcoded value');
  assert.match(partial, /bay-panel--validation/, 'a Build Status (validation) panel must exist in the left rail');
  assert.match(partial, /\{\{legality\.label\}\}/, 'Build Status must read the real legality.label produced by legalityFromPreview(), not a hardcoded value');
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT C — one primary browser region. The full candidate/result
 * loop (bay-system-groups) must appear in the main workspace only, never
 * duplicated into the left or right rail. A concise Installed quick-list
 * in the right rail is explicitly allowed — it is a subset summary of
 * already-installed systems, not a second full candidate browser.
 * ------------------------------------------------------------------ */
{
  const partial = await read(PARTIAL_PATH);

  const fullMarkerCount = (partial.match(/class="bay-system-groups"/g) || []).length;
  assert.equal(fullMarkerCount, 1, `the canonical full system-candidate loop (bay-system-groups) must appear exactly once in the whole partial, found ${fullMarkerCount}`);

  const leftRail = sliceBetween(partial, LEFT_RAIL_ANCHOR, MAIN_ANCHOR);
  const main = sliceBetween(partial, MAIN_ANCHOR, RIGHT_RAIL_ANCHOR);
  const rightRail = sliceBetween(partial, RIGHT_RAIL_ANCHOR, MAIN_CLOSE_ANCHOR);

  assert.doesNotMatch(leftRail, /bay-system-groups/, 'the left rail must not contain a duplicate full system browser — it is build-level status/context only');
  assert.doesNotMatch(rightRail, /bay-system-groups/, 'the right rail must not contain a duplicate full system browser — it is System Intel plus a concise installed quick-list only');
  assert.match(main, /bay-system-groups/, 'the main workspace must contain the one canonical system browser region');

  // The right rail's Installed quick-list is allowed (a subset summary),
  // but it must iterate the already-filtered installedRows collection —
  // never the full systems/browser.groups candidate set.
  assert.match(rightRail, /\{\{#each installedRows\}\}/, 'the right rail Installed quick-list must iterate installedRows (already-installed systems only)');
  assert.doesNotMatch(rightRail, /\{\{#each browser\.groups\}\}/, 'the right rail must not iterate the full browser.groups candidate collection');
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT D — system cards remain inspection-first. A card click
 * (the <article> itself) must resolve to inspect-system; the explicit
 * install/remove control is a separate, distinct data-action on a nested
 * <button>, never the same action as the card body.
 * ------------------------------------------------------------------ */
{
  const partial = await read(PARTIAL_PATH);
  const cardMatch = partial.match(/<article class="bay-part-card[^>]*data-action="inspect-system"[^>]*data-system-id="\{\{id\}\}"[^>]*>([\s\S]*?)<\/article>/);
  assert.ok(cardMatch, 'the browser system card must be an <article> carrying data-action="inspect-system" directly on itself');
  const cardBody = cardMatch[1];
  assert.match(cardBody, /<button[^>]*data-action="\{\{action\}\}"[^>]*>/, 'the card must contain a separate, explicit install/remove <button> with its own data-action, distinct from the card\'s own inspect-system action');
  assert.doesNotMatch(cardBody, /<button[^>]*data-action="inspect-system"/, 'the card\'s inner action button must never itself be bound to inspect-system — that would collapse inspection and staging into the same control');
  assert.doesNotMatch(cardBody, /<button[^>]*data-action="apply-build"/, 'a browser card must never directly trigger the final apply-build commit action');
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT E — System Intel empty + selected states.
 * ------------------------------------------------------------------ */
{
  const partial = await read(PARTIAL_PATH);
  const intelBlockMatch = partial.match(/<section class="bay-summary bay-summary--intel">([\s\S]*?)<\/section>/);
  assert.ok(intelBlockMatch, 'the right rail must contain the System Intel section');
  const intelBlock = intelBlockMatch[1];

  assert.match(intelBlock, /\{\{#if intel\}\}/, 'System Intel must branch on the selected-system view model');
  assert.match(intelBlock, /bay-intel-empty/, 'System Intel must provide a distinct empty-state element');
  assert.match(intelBlock, /Select a system to inspect/, 'the empty state must give the player a clear, actionable prompt');

  assert.match(intelBlock, /\{\{intel\.name\}\}/, 'the selected state must show the system name');
  assert.match(intelBlock, /\{\{intel\.description\}\}/, 'the selected state must show the system description');
  assert.match(intelBlock, /\{\{intel\.costLabel\}\}/, 'the selected state must show cost');
  assert.match(intelBlock, /\{\{#if intel\.blockingReason\}\}/, 'the selected state must surface a blocking reason when the preview supplies one');
  assert.match(intelBlock, /data-action="\{\{intel\.action\}\}"/, 'the selected state must expose one explicit install/remove action, sourced from the same decorated system data as the browser card');
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT F — one primary build-level credit summary. Item-specific
 * cost labels (in browser cards / Intel) do not count as duplication —
 * only a second full build-level Credits/Cost/After-shaped widget would.
 * ------------------------------------------------------------------ */
{
  const partial = await read(PARTIAL_PATH);
  const budgetBarCount = (partial.match(/class="bay-budget-bar"/g) || []).length;
  assert.equal(budgetBarCount, 1, `exactly one build-level credit bar (bay-budget-bar) may exist, found ${budgetBarCount}`);
  assert.doesNotMatch(partial, /class="bay-summary__rows"/, 'the old duplicate Purchase/Resale/Net Cost/Legal build-level summary block must not return');
  assert.doesNotMatch(partial, /Cost Delta/, 'the old duplicate "Cost Delta" build-level credit label must not return');
  assert.doesNotMatch(partial, /Resulting Balance/, 'the old duplicate "Resulting Balance" build-level credit label must not return');
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT G — one primary build validation summary. Component-
 * specific requirement/compatibility details inside System Intel are
 * allowed — only a second full build-level Ready/Blocked/Warning-shaped
 * panel would be duplication.
 * ------------------------------------------------------------------ */
{
  const partial = await read(PARTIAL_PATH);
  const validationPanelCount = (partial.match(/bay-panel--validation/g) || []).length;
  assert.equal(validationPanelCount, 1, `exactly one build-level validation panel (bay-panel--validation) may exist, found ${validationPanelCount}`);

  const legalityLabelCount = (partial.match(/\{\{legality\.label\}\}/g) || []).length;
  assert.equal(legalityLabelCount, 1, `{{legality.label}} must be rendered exactly once at the build level (in the one Build Status panel), found ${legalityLabelCount} occurrences`);

  for (const removed of ['bay-section--compliance', 'bay-readiness-grid', 'bay-compliance-grid', 'Street-Legal Framework', 'Readiness / Integration']) {
    assert.doesNotMatch(partial, new RegExp(removed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `the old duplicate readiness/compliance panel must not return: found "${removed}"`);
  }
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT H — prototype/no-functioning-action controls are not
 * presented as primary player controls. Save Draft / Request GM Approval /
 * Send to Store Quote (whose handlers do nothing but show a "future
 * integration" notification — #notifyDraft/#notifyGmReview/
 * #notifyStoreQuote in customization-bay-app.js) must live inside the
 * collapsed bay-secondary-actions disclosure, not the primary footer or
 * summary action clusters. Their data-action bindings must still exist
 * (removing them outright would break the frozen Phase 2 REQUIRED_ACTIONS
 * contract in customization-bay-inline-structural-flattening.test.mjs).
 * ------------------------------------------------------------------ */
{
  const partial = await read(PARTIAL_PATH);
  const secondaryMatch = partial.match(/<details class="bay-secondary-actions">([\s\S]*?)<\/details>/);
  assert.ok(secondaryMatch, 'a collapsed secondary-actions disclosure must exist');
  const secondaryBody = secondaryMatch[1];

  const PROTOTYPE_ACTIONS = ['save-draft', 'request-gm-approval', 'store-quote'];
  for (const action of PROTOTYPE_ACTIONS) {
    assert.match(secondaryBody, new RegExp(`data-action="${action}"`), `data-action="${action}" must still exist (frozen Phase 2 contract) but demoted into the secondary-actions disclosure`);
  }

  const footerMatch = partial.match(/<div class="bay-footer__actions">([\s\S]*?)<\/div>/);
  assert.ok(footerMatch, 'the primary footer action cluster must exist');
  const footerBody = footerMatch[1];
  for (const action of PROTOTYPE_ACTIONS) {
    assert.doesNotMatch(footerBody, new RegExp(`data-action="${action}"`), `data-action="${action}" must not appear in the primary footer action cluster — it has no functioning action path beyond a notification`);
  }
  assert.match(footerBody, /data-action="close-bay"/, 'the footer must retain the real close action');
  assert.match(footerBody, /data-action="apply-build"/, 'the footer must retain the one real primary commit action');
  assert.doesNotMatch(footerBody, /data-action="validate-build"/, 'validate-build must not sit in the primary footer either — it is folded into the always-current Build Status panel');

  const summaryActionsMatch = partial.match(/<div class="bay-summary__actions">([\s\S]*?)<\/div>/);
  assert.ok(summaryActionsMatch, 'the right rail primary summary action cluster must exist');
  for (const action of PROTOTYPE_ACTIONS) {
    assert.doesNotMatch(summaryActionsMatch[1], new RegExp(`data-action="${action}"`), `data-action="${action}" must not appear in the primary summary action cluster`);
  }
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT I — Tech Specialist remains wired: its action hooks,
 * eligibility/state fields, and application route are all untouched.
 * Phase 4 may move presentation but must never disconnect it.
 * ------------------------------------------------------------------ */
{
  const partial = await read(PARTIAL_PATH);
  assert.match(partial, /data-action="open-tech-specialist"/, 'Tech Specialist install-trait action must remain wired');
  assert.match(partial, /data-action="designate-signature-device"/, 'Tech Specialist signature-device action must remain wired');
  assert.match(partial, /data-action="toggle-tech-signature-trait"/, 'Tech Specialist trait-toggle action must remain wired');
  assert.match(partial, /\{\{#if techSpecialist\.canUse\}\}/, 'Tech Specialist section must still gate on the real eligibility field');

  const appJs = await read(APP_JS_PATH);
  assert.match(appJs, /#buildTechSpecialistContext\s*\(/, 'the Tech Specialist eligibility/state builder must remain');
  assert.match(appJs, /#openTechSpecialist\s*\(/, 'the Tech Specialist install-trait handler must remain');
  assert.match(appJs, /#designateSignatureDevice\s*\(/, 'the Tech Specialist signature-device handler must remain');
  assert.match(appJs, /#toggleTechSignatureTrait\s*\(/, 'the Tech Specialist trait-toggle handler must remain');
  assert.match(appJs, /TechSpecialistModificationService/, 'Tech Specialist must still route through the real TechSpecialistModificationService, not a reimplementation');
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT J — Phase 1-3 composed regression. Composed by re-running
 * the actual frozen contract suites (not re-implementing their
 * assertions here) — any assertion failure inside any of them propagates
 * as a failure of this contract.
 * ------------------------------------------------------------------ */
{
  await import('./customization-bay-foundation-contract.test.mjs');
  await import('./mentor-hologram-contract.test.mjs');
  await import('./customization-bay-inline-structural-flattening.test.mjs');
  await import('./customization-bay-scroll-responsive-contract.test.mjs');
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT K — no new scroll owner. The approved Phase 3 scroll
 * matrix (three native lanes wide, one workgrid scroll owner narrow) must
 * remain the only overflow:auto/overflow-y:auto authority in this file —
 * new browser/filter/Intel markup must flow through its existing lane,
 * never open its own independent scroll region.
 * ------------------------------------------------------------------ */
{
  const css = await read(CSS_PATH);
  const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

  const overflowYAutoCount = (cssWithoutComments.match(/overflow-y:\s*auto/g) || []).length;
  assert.equal(overflowYAutoCount, 1, `exactly one overflow-y: auto rule (the approved Phase 2/3 three-lane scroll owner) may exist in ${CSS_PATH}, found ${overflowYAutoCount}`);

  for (const newSelector of ['.bay-browser-toolbar', '.bay-browser-search', '.bay-filter-pill', '.bay-intel', '.bay-secondary-actions', '.bay-part-card__badge']) {
    const ruleRe = new RegExp(`${newSelector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^{]*\\{([^}]*)\\}`, 'g');
    let match;
    while ((match = ruleRe.exec(cssWithoutComments))) {
      assert.doesNotMatch(match[1], /overflow(-y|-x)?:\s*(auto|scroll)/, `Phase 4 selector "${newSelector}" must not introduce its own independent scroll region — new markup must flow through the existing approved scroll lane`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT L — no business logic duplication. The Phase 4 view-model
 * additions (#buildSystemBrowser/#buildSystemIntel/#systemStateBadge) must
 * only filter/label data #decorateSystem already computed from the real
 * engine preview — never recompute credits, capacity, legality, pricing,
 * or transaction settlement themselves.
 * ------------------------------------------------------------------ */
{
  const appJs = await read(APP_JS_PATH);
  const FORBIDDEN_IN_VIEW_HELPERS = [
    'TransactionEngine',
    'previewDroidCustomization',
    'previewVehicleCustomization',
    'computeDroidPartCost',
    'walletActor',
    '.credits',
  ];
  for (const helperName of ['#buildSystemBrowser', '#buildSystemIntel', '#systemStateBadge']) {
    const helperMatch = appJs.match(new RegExp(`${helperName}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n  \\}\\n`));
    assert.ok(helperMatch, `could not locate ${helperName}() to audit for business-logic duplication`);
    const body = helperMatch[1];
    for (const forbidden of FORBIDDEN_IN_VIEW_HELPERS) {
      assert.ok(
        !body.includes(forbidden),
        `${helperName}() must not recompute business logic — found forbidden reference "${forbidden}" (it must only read fields #decorateSystem already derived from the real engine preview)`
      );
    }
  }
}

console.log('customization-bay-information-hierarchy: all assertions passed');
