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
    'Engine-sourced options',
    'current engine preview',
    'Concept / routing note',
    'Engine validation remains authoritative',
    'GM Review',
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

  // Player-facing JS notification/fallback strings must be equally clean —
  // these never go through the .hbs comment-stripping above.
  const appJs = await read(APP_JS_PATH);
  const FORBIDDEN_JS_PHRASES = [
    'apply through the Shipyard engine',
    'apply through the Droid Garage engine',
    'Engine validation remains authoritative',
    'let the engine apply the mutation',
    'apply through the engine',
    'future integration point',
    'Future production pass',
    'store/transaction engines',
    'future persistence hook',
  ];
  for (const phrase of FORBIDDEN_JS_PHRASES) {
    assert.ok(
      !appJs.includes(phrase),
      `player-facing notification strings in customization-bay-app.js must not expose implementation vocabulary: found "${phrase}"`
    );
  }

  // PR #949 Phase 4 final authority cleanup — a mentor fallback is
  // player-facing guidance shown whenever the mentor dialogue loader can't
  // resolve a better line. legalityFromPreview()/Contract O already
  // establish there is no canonical restricted/licensed/GM-review state in
  // this Bay, so no mentorFallback string (Garage or Shipyard) may assert
  // one either, even as in-world flavor — a player can reasonably read it
  // as mechanical advice.
  const fallbackMatches = [...appJs.matchAll(/mentorFallback:\s*\n?\s*"([^"]*)"/g)];
  assert.ok(fallbackMatches.length >= 2, `expected to find at least 2 mentorFallback string literals (Garage + Shipyard), found ${fallbackMatches.length}`);
  for (const match of fallbackMatches) {
    const fallbackText = match[1];
    for (const forbidden of [/GM review/i, /street-legal/i, /license required/i]) {
      assert.doesNotMatch(fallbackText, forbidden, `mentorFallback must not assert an unsupported legal/approval mechanic: "${fallbackText}" matched ${forbidden}`);
    }
  }
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

  // What replaced it must be backed by real, already-computed state — not
  // another hardcoded literal. PR #949 Phase 4 Final Correction — pending
  // counts moved from previewSummary.additions/removals.length (which the
  // engine's own failure preview shapes can omit, see Contract T) to the
  // staged UI Sets themselves.
  assert.match(partial, /bay-panel--status/, 'a Modification Status panel must exist in the left rail');
  assert.match(partial, /\{\{pendingAdditionsCount\}\}/, 'Modification Status must read the real staged-additions count from the UI draft state');
  assert.match(partial, /\{\{pendingRemovalsCount\}\}/, 'Modification Status must read the real staged-removals count from the UI draft state');
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
  // Phase 5 accessibility correction (independent review of PR #950 at
  // 80cfa41f) added a SECOND, dedicated native <button
  // data-action="inspect-system"> (.bay-part-card__inspect) so keyboard
  // users can inspect without going through the install/remove control —
  // that is a distinct, intentional control, not a collapse of the two
  // actions. The real invariant this contract protects is narrower: the
  // install/remove button itself (.bay-part-card__action) must never be
  // the one bound to inspect-system.
  const installActionButtonMatch = cardBody.match(/<button[^>]*class="bay-part-card__action"[^>]*>/);
  assert.ok(installActionButtonMatch, 'the card must contain the install/remove button (.bay-part-card__action)');
  assert.doesNotMatch(installActionButtonMatch[0], /data-action="inspect-system"/, 'the install/remove button (.bay-part-card__action) must never itself be bound to inspect-system — that would collapse inspection and staging into the same control');
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

  // PR #949 Phase 4 Correction — the widget count alone didn't catch that
  // Core Profile's profileStats array ALSO rendered a "Credits" stat for
  // both droid and vehicle, duplicating the one dedicated Credits panel.
  // Audit the actual live-runtime view-model source, not just the
  // template's widget markup.
  const appJs = await read(APP_JS_PATH);
  const profileStatsBlocks = [];
  {
    const re = /profileStats:\s*\[([\s\S]*?)\n {6}\]/g;
    let m;
    while ((m = re.exec(appJs))) profileStatsBlocks.push(m[1]);
  }
  assert.equal(profileStatsBlocks.length, 2, `expected exactly 2 inline profileStats array literals (the live droid and vehicle context builders), found ${profileStatsBlocks.length}`);
  for (const block of profileStatsBlocks) {
    assert.doesNotMatch(block, /label:\s*"Credits"/, 'Core Profile (profileStats) must not duplicate the one dedicated build-level Credits panel');
  }
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

/* ------------------------------------------------------------------ *
 * TEST CONTRACT M — prototype context navigation. CONTEXT_OPTIONS (the
 * primary context-strip navigation) must not present Store Quote or
 * Chargen Draft as first-class pills: their handlers
 * (#notifyStoreQuote/the app's own class-header docs) are explicitly
 * documented as future integration points with no live workflow behind
 * them, and #setContextMode()/this.contextMode never branch what
 * #buildDroidContext/#buildVehicleContext actually render — every context
 * produces identical output. openCustomizationBay()'s no-actor "Build New"
 * entry point has no caller anywhere in the codebase either. Only the one
 * context that reflects the screen's real, always-true behavior (modifying
 * /browsing an existing actor's systems) may render as primary navigation.
 * ------------------------------------------------------------------ */
{
  const appJs = await read(APP_JS_PATH);
  const optionsMatch = appJs.match(/const CONTEXT_OPTIONS = Object\.freeze\(\[([\s\S]*?)\]\);/);
  assert.ok(optionsMatch, 'could not locate CONTEXT_OPTIONS');
  const optionsBody = optionsMatch[1];

  for (const prototypeKey of ['CONTEXT_MODE.STORE_QUOTE', 'CONTEXT_MODE.CHARGEN_DRAFT', 'CONTEXT_MODE.BUILD_NEW']) {
    assert.doesNotMatch(
      optionsBody,
      new RegExp(`key:\\s*${prototypeKey.replace('.', '\\.')}`),
      `CONTEXT_OPTIONS must not expose ${prototypeKey} as primary navigation — it has no live workflow behind it`
    );
  }
  assert.match(optionsBody, /key:\s*CONTEXT_MODE\.MODIFY_EXISTING/, 'CONTEXT_OPTIONS must retain the one real context (Modify / Browse Systems)');

  // The frozen Phase 2 REQUIRED_ACTIONS contract still requires
  // data-action="set-context" to exist somewhere in the partial — confirm
  // it survives via the one remaining real option, not a prototype one.
  const partial = await read(PARTIAL_PATH);
  assert.match(partial, /data-action="set-context"/, 'data-action="set-context" must remain present (frozen Phase 2 contract)');
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT N — Apply consumes the canonical engine preview's own
 * success/failure, never an unconditional true. Both live runtime context
 * builders must derive canApply from previewResult — this is reading the
 * engine's own verdict, not a UI-side legality/affordability calculation.
 * ------------------------------------------------------------------ */
{
  const appJs = await read(APP_JS_PATH);
  assert.doesNotMatch(
    appJs,
    /\n\s*canApply:\s*true,\s*\n\s*runtimeLane:\s*true/,
    'a live runtime context must not return an unconditional canApply: true — it must derive canApply from the canonical engine preview result'
  );
  const canApplyMatches = appJs.match(/canApply:\s*previewResult\.success\s*===\s*true/g) || [];
  assert.equal(canApplyMatches.length, 2, `expected both live runtime context builders (#buildDroidContext and #buildVehicleContext) to derive canApply from previewResult.success, found ${canApplyMatches.length} occurrences`);
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT O — a blocked preview is BLOCKED, not GM REVIEW. Ordinary
 * engine rejections (insufficient credits, an incompatible system, a
 * missing backup processor slot, an unknown system id, a vehicle
 * slot-governance violation, ...) are build blockers, not GM-approval
 * states — no canonical droid/vehicle system definition carries a real
 * restricted/licensed/GM-review flag this bay could surface instead.
 * ------------------------------------------------------------------ */
{
  const appJs = await read(APP_JS_PATH);
  const fnMatch = appJs.match(/function legalityFromPreview\([^)]*\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(fnMatch, 'could not locate legalityFromPreview()');
  const body = fnMatch[1];
  assert.doesNotMatch(body, /GM REVIEW/, 'legalityFromPreview() must not map a failed preview to "GM REVIEW" — that misrepresents ordinary build blockers as GM-approval states');
  assert.doesNotMatch(body, /gmReview/, 'legalityFromPreview() must not fabricate a gmReview field — no canonical data source backs one');
  assert.match(body, /label:\s*"BLOCKED"/, 'a failed preview must be labeled BLOCKED');
  assert.match(body, /previewResult\.error\s*\|\|\s*previewResult\.blockingReason/, 'BLOCKED must surface the engine\'s own error/blockingReason text, not an invented reason');
  assert.match(body, /label:\s*"READY"/, 'a successful preview must be labeled READY');
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT P — no fabricated vehicle capacity. VehicleSlotGovernanceEngine
 * governs named slot CATEGORIES (single/multi/consumable) — it never
 * defines a universal numeric vehicle capacity. The old
 * Math.max(9, installedCount + 3) formula must not return, and no numeric
 * total-slot Capacity meter may render for a live (non-placeholder)
 * Shipyard context.
 * ------------------------------------------------------------------ */
{
  const appJs = await read(APP_JS_PATH);
  // Strip line comments first — the source carries an explanatory comment
  // that legitimately mentions the old formula in prose to document why it
  // is gone; only executable code may not contain it.
  const appJsCodeOnly = appJs.replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(appJsCodeOnly, /Math\.max\(\s*9\s*,\s*installedCount\s*\+\s*3\s*\)/, 'the fabricated total-vehicle-slot formula must not return');

  // The live vehicle context builder must not set slotMeter at all — only
  // the explicitly-labeled "(Concept)" placeholder context may (it is
  // never mistaken for real canonical data, since every other field on
  // that screen is already fictional/concept-labeled).
  const vehicleContextMatch = appJs.match(/async #buildVehicleContext\(config\) \{[\s\S]*?\n {2}\}\n/);
  assert.ok(vehicleContextMatch, 'could not locate #buildVehicleContext()');
  assert.doesNotMatch(vehicleContextMatch[0], /slotMeter:/, 'the live #buildVehicleContext() must not present a numeric slotMeter/Capacity value — no canonical total-vehicle-capacity source exists');
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT Q — Core Profile does not duplicate capacity. Whether or
 * not a build-level capacity/slot summary exists elsewhere, profileStats
 * (Core Profile) must never repeat a "Slots"-shaped total.
 * ------------------------------------------------------------------ */
{
  const appJs = await read(APP_JS_PATH);
  const profileStatsBlocks = [];
  {
    const re = /profileStats:\s*\[([\s\S]*?)\n {6}\]/g;
    let m;
    while ((m = re.exec(appJs))) profileStatsBlocks.push(m[1]);
  }
  assert.equal(profileStatsBlocks.length, 2, `expected exactly 2 inline profileStats array literals, found ${profileStatsBlocks.length}`);
  for (const block of profileStatsBlocks) {
    assert.doesNotMatch(block, /label:\s*"Slots"/, 'Core Profile (profileStats) must not duplicate a build-level Slots/Capacity total');
  }
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT R — a runtime load failure does not fall back to
 * fictional build data. #buildDroidContext/#buildVehicleContext must
 * route both the "no actor" and the "engine/profile hydration failed"
 * cases through the same honest error context — never the old
 * #buildPlaceholderContext(), whose fictional "Grey Kestrel (Concept)" /
 * "Unit R7-X9 (Concept)" systems, stats, and 6/9 slot meter are gone.
 * ------------------------------------------------------------------ */
{
  const appJs = await read(APP_JS_PATH);
  // Strip block comments — #buildErrorContext()'s own docstring legitimately
  // names the retired #buildPlaceholderContext() in prose to document why
  // it is gone; only executable code may not reference it.
  const appJsCodeOnly = appJs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(appJsCodeOnly, /#buildPlaceholderContext/, 'the fictional-data placeholder context builder must not return');
  assert.doesNotMatch(appJsCodeOnly, /Grey Kestrel/, 'the fabricated vehicle demo name must not return');
  assert.doesNotMatch(appJsCodeOnly, /Unit R7-X9/, 'the fabricated droid demo name must not return');
  assert.doesNotMatch(appJsCodeOnly, /#placeholderSystems/, 'the fictional system-card generator must not return');
  assert.doesNotMatch(appJsCodeOnly, /#placeholderStats/, 'the fictional profile-stat generator must not return');

  assert.match(appJs, /async #buildErrorContext\(config, message\)/, 'an honest error-context builder must exist');
  const errorContextMatch = appJs.match(/async #buildErrorContext\(config, message\) \{[\s\S]*?\n {2}\}\n/);
  assert.ok(errorContextMatch, 'could not locate #buildErrorContext()');
  assert.doesNotMatch(errorContextMatch[0], /slotMeter:/, '#buildErrorContext() must not present a numeric slot/capacity meter');

  // Both live context builders must route their failure branches through
  // the honest error context, not a fictional one, on both the "no actor"
  // and "engine returned success:false" paths.
  const droidContextMatch = appJs.match(/async #buildDroidContext\(config\) \{[\s\S]*?\n {2}\}\n/);
  const vehicleContextMatch = appJs.match(/async #buildVehicleContext\(config\) \{[\s\S]*?\n {2}\}\n/);
  assert.ok(droidContextMatch && vehicleContextMatch, 'could not locate both live context builders');
  for (const [label, match] of [['#buildDroidContext', droidContextMatch], ['#buildVehicleContext', vehicleContextMatch]]) {
    const occurrences = (match[0].match(/#buildErrorContext\(/g) || []).length;
    assert.equal(occurrences, 2, `${label} must route both its "no actor" and its "engine load failed" branches through #buildErrorContext(), found ${occurrences} occurrence(s)`);
  }

  // PR #949 Phase 4 final authority cleanup — the error context must not
  // compose a fabricated zero-Credits economics object either. The wallet
  // and resulting balance are UNKNOWN on a load failure, not 0 cr; budget
  // must be null, not this.#buildBudget(0, 0).
  assert.doesNotMatch(errorContextMatch[0], /budget:\s*this\.#buildBudget\(/, '#buildErrorContext() must not construct a fabricated zero-Credits budget object — the resulting balance is unknown, not 0 cr');
  assert.match(errorContextMatch[0], /budget:\s*null/, '#buildErrorContext() must present budget as null (unknown), not a fabricated zero economics object');

  // The canonical partial must gate the real Credits panel and the real
  // system browser on the same {{error}} flag the error context sets, and
  // present an honest "unavailable" state instead of the normal
  // filter-empty messaging (which implies a working, merely-filtered
  // browser rather than one that outright failed to load).
  const partial = await read(PARTIAL_PATH);
  const creditPanelMatch = partial.match(/\{\{#unless error\}\}\s*\n\s*<section class="bay-panel bay-panel--credit">/);
  assert.ok(creditPanelMatch, 'the Credits panel must be gated behind {{#unless error}} so it never renders fabricated economics during a load failure');

  const browserSectionMatch = partial.match(/<section class="bay-section bay-section--browser">([\s\S]*?)<\/section>\s*\n\s*<\/section>/);
  assert.ok(browserSectionMatch, 'could not locate the system browser section');
  assert.match(browserSectionMatch[1], /\{\{#if error\}\}/, 'the system browser section must branch on {{#if error}}');
  assert.match(browserSectionMatch[1], /Systems are unavailable for this customization target\./, 'a load failure must show an honest "systems unavailable" state, not the normal browser controls');
  // The normal filter-empty messaging must sit in the {{else}} branch (a
  // working browser that filtered down to zero results), never presented
  // as the {{#if error}} outcome.
  const errorBranchEnd = browserSectionMatch[1].indexOf('{{else}}');
  assert.ok(errorBranchEnd !== -1, 'the browser section must have an {{else}} branch for the normal (non-error) browser');
  const errorBranchBody = browserSectionMatch[1].slice(browserSectionMatch[1].indexOf('{{#if error}}'), errorBranchEnd);
  assert.doesNotMatch(errorBranchBody, /No systems match the current filters/, 'the {{#if error}} branch must not reuse the normal filter-empty message — a load failure is not a filter that matched zero results');
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT S — failed-preview economics are preserved. Both
 * customization engines' "Insufficient funds" rejection still returns a
 * real preview object (currentCredits/netCost/newCredits/walletActorId).
 * summarizePreview() must consume it whenever previewResult.preview
 * exists, regardless of previewResult.success — a guard keyed off success
 * would silently zero out real economic data the engine already computed.
 * ------------------------------------------------------------------ */
{
  const appJs = await read(APP_JS_PATH);
  const fnMatch = appJs.match(/function summarizePreview\(previewResult, currentCredits = 0\) \{([\s\S]*?)\n\}/);
  assert.ok(fnMatch, 'could not locate summarizePreview()');
  const body = fnMatch[1];

  const guardMatch = body.match(/if\s*\(([^)]*)\)\s*\{/);
  assert.ok(guardMatch, 'could not locate summarizePreview()\'s early-return guard');
  assert.doesNotMatch(guardMatch[1], /previewResult\?\.success/, 'summarizePreview()\'s early-return guard must not key off previewResult.success — a failed preview can still carry a real preview object');
  assert.match(guardMatch[1], /!previewResult\?\.preview/, 'summarizePreview() must early-return only when the engine supplied no preview object at all');

  assert.match(body, /preview\.netCost\s*\?\?\s*0/, 'summarizePreview() must read netCost from the engine preview whenever it exists');
  assert.match(body, /preview\.newCredits\s*\?\?\s*currentCredits/, 'summarizePreview() must read newCredits from the engine preview whenever it exists');
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT T — pending counts use the staged UI Sets, not
 * previewSummary.additions/removals (which several engine failure shapes
 * omit entirely, e.g. the "Insufficient funds" rejection only returns
 * currentCredits/netCost/newCredits — no systemsAdded/systemsRemoved).
 * ------------------------------------------------------------------ */
{
  const appJs = await read(APP_JS_PATH);
  assert.match(appJs, /pendingAdditionsCount:\s*this\.selectedAdditions\.size/, 'pendingAdditionsCount must be derived from the staged selectedAdditions Set');
  assert.match(appJs, /pendingRemovalsCount:\s*this\.selectedRemovals\.size/, 'pendingRemovalsCount must be derived from the staged selectedRemovals Set');

  const partial = await read(PARTIAL_PATH);
  assert.match(partial, /\{\{pendingAdditionsCount\}\}/, 'Modification Status must render pendingAdditionsCount');
  assert.match(partial, /\{\{pendingRemovalsCount\}\}/, 'Modification Status must render pendingRemovalsCount');
  assert.doesNotMatch(partial, /previewSummary\.additions\.length/, 'Modification Status must not fall back to previewSummary.additions.length — it is empty on several failed-preview shapes even when a system is genuinely staged');
  assert.doesNotMatch(partial, /previewSummary\.removals\.length/, 'Modification Status must not fall back to previewSummary.removals.length — it is empty on several failed-preview shapes even when a system is genuinely staged');
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT U — no unsupported GM-review guidance. Build Guidance may
 * only state proven behavior — the corrected legalityFromPreview()/
 * Contract O already establish that no canonical restricted/licensed/
 * GM-review state exists to back a claim like "some systems require GM
 * review."
 * ------------------------------------------------------------------ */
{
  const partial = await read(PARTIAL_PATH);
  const guidanceMatch = partial.match(/<details class="bay-implementation-notes">([\s\S]*?)<\/details>/);
  assert.ok(guidanceMatch, 'could not locate the Build Guidance disclosure');
  const guidanceBody = guidanceMatch[1];
  for (const forbidden of [/require GM review/i, /street-legal/i, /license required/i]) {
    assert.doesNotMatch(guidanceBody, forbidden, `Build Guidance must not claim an unsupported rule: matched ${forbidden}`);
  }
}

/* ------------------------------------------------------------------ *
 * TEST CONTRACT V — the displayed resulting balance ("After") comes from
 * the canonical engine preview's own newCredits (already captured by
 * summarizePreview() per Contract S), never independently recomputed as
 * available - cost. The engine is the authority on what a build resolves
 * to; UI-side settlement arithmetic has no standing to diverge from it.
 * ------------------------------------------------------------------ */
{
  const appJs = await read(APP_JS_PATH);
  const fnMatch = appJs.match(/#buildBudget\(currentCredits, netCost, newCredits\) \{([\s\S]*?)\n {2}\}/);
  assert.ok(fnMatch, '#buildBudget() must accept a third newCredits parameter');
  const body = fnMatch[1];
  assert.doesNotMatch(body, /newCreditsLabel:\s*formatCredits\(available - cost\)/, '#buildBudget() must not independently recompute the resulting balance as available - cost — it must consume the canonical newCredits parameter');
  assert.match(body, /const resulting = Number\(newCredits\s*\?\?\s*\(available - cost\)\)/, '#buildBudget() must consume the caller-supplied newCredits as the resulting balance (falling back to available - cost only when no canonical value was supplied at all)');
  assert.match(body, /newCreditsLabel:\s*formatCredits\(resulting\)/, 'the displayed After value must be formatCredits(resulting), sourced from the canonical newCredits');

  // Both live context builders must actually pass the canonical
  // previewSummary.newCredits through to #buildBudget() — capturing it in
  // summarizePreview() (Contract S) is meaningless if the caller never
  // forwards it.
  const buildBudgetCallMatches = appJs.match(/this\.#buildBudget\(currentCredits, previewSummary\.netCost, previewSummary\.newCredits\)/g) || [];
  assert.equal(buildBudgetCallMatches.length, 2, `expected both live runtime context builders to call #buildBudget() with previewSummary.newCredits as the third argument, found ${buildBudgetCallMatches.length} occurrence(s)`);
}

console.log('customization-bay-information-hierarchy: all assertions passed');
