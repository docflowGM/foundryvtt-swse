/**
 * GM Datapad recovery — action-integrity registry.
 *
 * Statically derives, for every registered GM Datapad surface, the complete
 * set of literal-valued `data-*="..."` attributes rendered on interactive
 * elements (buttons, links, form controls) reachable from that surface's
 * root partial.
 *
 * Three levels of proof, not one:
 *
 *   - ATTRIBUTE-LEVEL (`status: 'LIVE_HANDLED'`): the attribute *name* has a
 *     `dataset.<camelCase>` read (or an equivalent `[data-name]` selector)
 *     somewhere in the files allowed to wire that surface. This proves
 *     *something* listens for the attribute, but for an attribute whose
 *     value selects behaviour via a switch/if-chain (e.g.
 *     `data-gm-faction-action="approve-suggestion"`), attribute-level
 *     matching is a false positive risk: one legitimate
 *     `dataset.gmFactionAction` read anywhere would make *every* value of
 *     that attribute look handled, including a value the code never
 *     actually branches on. Attributes not in DISPATCH_CONTROLS or
 *     DYNAMIC_DISPATCH_SOURCES are reported at this level only — most of
 *     them (nav-to/app-card surface ids, tab/subtab switches validated
 *     against sibling panel attributes, id/reference attributes) do not
 *     dispatch through hardcoded string literals in code at all, so
 *     value-level proof does not apply to them the same way; each such
 *     family's actual proof shape is documented inline where it is wired.
 *   - ACTION-VALUE-LEVEL (`status: 'ACTION_VALUE_HANDLED'`, DISPATCH_CONTROLS
 *     below): for attributes known to dispatch on their LITERAL,
 *     template-authored value via `varName === 'x'` or `case 'x':` against a
 *     variable assigned from that exact `dataset.<name>` read, this scan
 *     extracts every literal value rendered in the template and every
 *     literal value branched on in the owning controller, and requires the
 *     template's values to be a subset of the controller's. This is the
 *     proof the task's original scanner did not attempt (flagged by review
 *     of PR #962 on this branch) — see
 *     `docs/audits/gm-datapad-recovery-action-integrity.md` §5.
 *   - DYNAMIC-ACTION-VALUE-LEVEL (`status: 'DYNAMIC_ACTION_SOURCE_VERIFIED'`,
 *     DYNAMIC_DISPATCH_SOURCES below): for attributes whose value is NOT a
 *     template literal at all — `data-trade-action="{{this.action}}"` in
 *     trade-board.hbs is generated per-row from
 *     GMTradeConsoleSurfaceService's view-model, so ACTION-VALUE-LEVEL
 *     matching cannot see it (the template regex requires a literal
 *     alphanumeric value and silently skips a Handlebars expression — this
 *     attribute was invisible to every prior version of this scanner, not
 *     merely under-proven, which is a materially different and worse gap
 *     than the original review flagged; see
 *     `docs/audits/gm-datapad-recovery-action-integrity.md` §1b). This scan
 *     instead derives the actual generated vocabulary from the same static
 *     source the controller reads at runtime, and proves every value that
 *     source can produce is accepted downstream.
 *
 * This is a source-text scan, not a Foundry-runtime import — ApplicationV2 +
 * the full Foundry global surface cannot be constructed under this repo's
 * Node test harness (same limitation documented in
 * tests/phase4-sheet-architecture-contract.test.mjs and
 * scripts/dev/sheet-action-registry.mjs, the Phase 5 precedent this file
 * mirrors for the GM Datapad).
 *
 * Known remaining gap, deliberately out of scope for this pass: two other
 * dynamic-valued dispatch attributes exist —
 * `data-job-transition-action="{{this.action}}"` in kanban-and-detail.hbs
 * (the actual dispatch key there is the sibling `data-status` attribute, also
 * dynamic, forwarded as a free-form string rather than validated against a
 * literal set in code, so the same derive-and-verify technique does not
 * apply the same way) and one dynamic
 * `data-skill-challenge-action="{{this.action}}"` row in
 * skill-challenge-surface.hbs (in addition to the eighteen literal
 * `data-skill-challenge-action` values already proven at action-value level
 * — this one dynamic row's source, `SkillChallengeFeatHooks.getTrackerOptions`,
 * was not traced in this pass). Neither regressed by this change; both were
 * already outside every prior version of this scanner's literal-value
 * matching for the same reason `data-trade-action` was.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const TEMPLATES_ROOT = 'systems/foundryvtt-swse/templates/';

// Mirrors templates/shell/shell-surface.hbs's `{{#if (eq shellSurface "gm-X")}}`
// partial routing and GMSurfaceControllerRegistry's surface->controller map.
export const SURFACES = {
  home: {
    template: 'templates/apps/gm-datapad/surfaces/home.hbs',
    controller: null // Home is a launcher grid wired by the host itself (data-app-card / data-nav-to), not a surface controller.
  },
  bulletin: {
    template: 'templates/apps/gm-datapad/surfaces/bulletin.hbs',
    controller: 'scripts/ui/shell/gm/controllers/GMBulletinSurfaceController.js'
  },
  jobs: {
    template: 'templates/apps/gm-datapad/surfaces/jobs.hbs',
    controller: 'scripts/ui/shell/gm/controllers/GMJobBoardSurfaceController.js'
  },
  trade: {
    template: 'templates/apps/gm-datapad/surfaces/trade.hbs',
    controller: 'scripts/ui/shell/gm/controllers/GMTradeConsoleSurfaceController.js'
  },
  'house-rules': {
    template: 'templates/apps/gm-datapad/surfaces/house-rules.hbs',
    controller: 'scripts/ui/shell/gm/controllers/GMHouseRulesSurfaceController.js'
  },
  store: {
    template: 'templates/apps/gm-datapad/surfaces/store.hbs',
    controller: 'scripts/ui/shell/gm/controllers/GMStoreControlSurfaceController.js'
  },
  approvals: {
    template: 'templates/apps/gm-datapad/surfaces/approvals.hbs',
    controller: 'scripts/ui/shell/gm/controllers/GMApprovalsSurfaceController.js'
  },
  healing: {
    template: 'templates/apps/gm-datapad/surfaces/healing.hbs',
    controller: 'scripts/ui/shell/gm/controllers/GMHealingSurfaceController.js'
  },
  workspace: {
    template: 'templates/apps/gm-datapad/surfaces/workspace.hbs',
    controller: 'scripts/ui/shell/gm/controllers/GMWorkspaceSurfaceController.js'
  },
  factions: {
    template: 'templates/apps/gm-datapad/surfaces/factions.hbs',
    controller: 'scripts/ui/shell/gm/controllers/GMFactionRelationshipSurfaceController.js'
  },
  intel: {
    template: 'templates/apps/gm-datapad/surfaces/intel.hbs',
    controller: 'scripts/ui/shell/gm/controllers/GMIntelSurfaceController.js'
  },
  locations: {
    template: 'templates/apps/gm-datapad/surfaces/locations.hbs',
    controller: 'scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js'
  },
  'skill-challenges': {
    template: 'templates/apps/gm/skill-challenges/skill-challenge-surface.hbs',
    controller: 'scripts/ui/shell/gm/controllers/GMSkillChallengeSurfaceController.js'
  },
  settings: {
    template: 'templates/apps/gm-datapad/surfaces/settings.hbs',
    controller: 'scripts/ui/shell/gm/controllers/GMSettingsSurfaceController.js'
  }
};

// Every surface's controls may also be wired by the shared host
// (data-nav-to / data-app-card / data-gm-v2-action / tablet chrome) or by the
// still-legitimate parts of GMInteractionRepairService. Neither is a
// per-surface file, so both are always in scope.
const ALWAYS_IN_SCOPE_WIRING_FILES = [
  'scripts/apps/gm-datapad.js',
  'scripts/ui/shell/gm/GMInteractionRepairService.js',
  // Shared GM Datapad services bound from multiple surface controllers
  // (Jobs/Factions/Locations/Intel), not owned by any single surface.
  'scripts/ui/shell/gm/utils/gm-smart-form-drop-service.js',
  'scripts/ui/dragdrop/dossier-drag-drop-service.js',
  'scripts/ui/holonet/HolonetComposerAssist.js',
  // Shared Job/Faction wizard page-transition logic (extracted from what
  // was duplicated inline in both controllers — see the recovery audit §1a).
  'scripts/ui/shell/gm/utils/gm-wizard-navigation.js',
  // The GM Settings surface delegates theme/language controls to the same
  // shared controller every datapad shell (actor + GM) uses.
  'scripts/ui/shell/SettingsSurfaceController.js'
];

// Attribute name (kebab) -> { file, varName }. `varName` is the identifier
// each owning controller assigns from `dataset.<camelCase(attribute)>`
// before branching on it (verified by direct reading, not inferred) — e.g.
// GMFactionRelationshipSurfaceController.js:
//   const action = String(button.dataset.gmFactionAction || '').trim();
//   switch (action) { case 'approve-suggestion': ... }
// `scope: 'file'` extracts every `case`/`=== ` literal for that varName
// anywhere in the file (each of these files has exactly one dispatch site
// for this varName, verified by direct reading — a second unrelated
// variable of the same name in the same file would silently widen the
// accepted set, which is why this is a small hand-verified table rather
// than a fully generic inference).
const DISPATCH_CONTROLS = {
  'gm-faction-action': { surfaceId: 'factions', file: 'scripts/ui/shell/gm/controllers/GMFactionRelationshipSurfaceController.js', varName: 'action' },
  'location-action': { surfaceId: 'locations', file: 'scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js', varName: 'action' },
  'intel-action': { surfaceId: 'intel', file: 'scripts/ui/shell/gm/controllers/GMIntelSurfaceController.js', varName: 'action' },
  // data-trade-action is NOT listed here — its template value is dynamic
  // (`data-trade-action="{{this.action}}"`), so there is no literal value
  // for this table's plain template-vs-code matching to compare. See
  // DYNAMIC_DISPATCH_SOURCES below instead.
  // data-economy-action is read by the Trade controller, forwarded to
  // GMDatapad._handleEconomyRepairAction() (game-kind actions are literal-
  // matched there), which for kind==='trade' forwards on again, untouched,
  // to HolonetMessengerService.threadAction()'s action switch.
  // alsoCheckMode: 'switch-only' — see collectDispatchValues' doc comment for
  // why an unscoped if-chain scan of holonet-messenger-service.js is unsafe.
  'economy-action': { surfaceId: 'trade', file: 'scripts/apps/gm-datapad.js', varName: 'action', alsoCheck: ['scripts/holonet/subsystems/holonet-messenger-service.js'], alsoCheckMode: 'switch-only' },
  'skill-challenge-action': { surfaceId: 'skill-challenges', file: 'scripts/ui/shell/gm/controllers/GMSkillChallengeSurfaceController.js', varName: 'action' }
  // Bare `data-action` is rendered by more than one surface (store,
  // bulletin, approvals), each with its own owning controller — see
  // PER_SURFACE_DISPATCH_OVERRIDES below instead of a single entry here.
};

// data-action is rendered by more than one surface (store, bulletin), each
// with its own controller owning the dispatch — DISPATCH_CONTROLS above
// can't express a one-attribute-to-many-controllers mapping, so those two
// are resolved directly by surfaceId here instead.
const PER_SURFACE_DISPATCH_OVERRIDES = {
  store: { 'action': { file: 'scripts/ui/shell/gm/controllers/GMStoreControlSurfaceController.js', varName: 'action' } },
  bulletin: { 'action': { file: 'scripts/ui/shell/gm/controllers/GMBulletinSurfaceController.js', varName: 'action' } },
  // GMApprovalsSurfaceController wires each data-action value with its own
  // querySelectorAll('[data-action="x"]') call rather than a single
  // delegated listener + switch, so it has no dispatch variable at all —
  // see collectDispatchValues style 3.
  approvals: { 'action': { file: 'scripts/ui/shell/gm/controllers/GMApprovalsSurfaceController.js', varName: null } }
};

// gm-v2-action is host-level (scripts/apps/gm-datapad.js), rendered by the
// shared surface-toolbar/sidebar partials included directly from
// gm-datapad.hbs (not from any individual surface's own template tree, so
// the per-surface BFS below never reaches them), dispatched via a single
// switch(action) in _wireGmDatapadV2Chrome.
const HOST_DISPATCH_CONTROLS = {
  'gm-v2-action': { file: 'scripts/apps/gm-datapad.js', varName: 'action' }
};

const HOST_CHROME_TEMPLATES = [
  'templates/apps/gm-datapad/partials/sidebar.hbs',
  'templates/apps/gm-datapad/partials/surface-toolbar.hbs',
  'templates/apps/gm-datapad/partials/dock.hbs'
];

/**
 * Given `sourceText` and the index immediately AFTER an opening `{`, returns
 * the substring up to (not including) its matching closing `}`, counting
 * nested braces. Shared by collectDispatchValues' switch-block extraction
 * and deriveTradeActionVocabulary's config/function-body extraction.
 */
function sliceBracedBlock(sourceText, afterOpenBrace) {
  let depth = 1;
  let i = afterOpenBrace;
  while (i < sourceText.length && depth > 0) {
    if (sourceText[i] === '{') depth += 1;
    else if (sourceText[i] === '}') depth -= 1;
    i += 1;
  }
  return sourceText.slice(afterOpenBrace, i - 1);
}

/**
 * Derives the complete set of action-string literals
 * GMTradeConsoleSurfaceService._buildActions() can generate for the
 * dynamic `data-trade-action="{{this.action}}"` template attribute —
 * verified by direct reading (scripts/ui/shell/gm/GMTradeConsoleSurfaceService.js):
 *   1. Every `<x>Action: 'value'` field inside the frozen TRANSFER_TYPES
 *      config object — _buildActions only ever pushes `action: config.<x>Action`
 *      using fields that exist there, so the full set of *Action values
 *      across all transfer types is exactly the reachable vocabulary from
 *      that source (which of those apply to a given render depends on
 *      `type`/`status`, but every one of them CAN be generated, which is
 *      what this reachability proof needs).
 *   2. Every hardcoded literal `action: 'value'` pushed directly in
 *      _buildActions (the gm-fail-trade / gm-reopen-trade /
 *      gm-mark-trade-reconciled / gm-unarchive-trade / gm-archive-trade
 *      diagnostic actions, which have no TRANSFER_TYPES config entry).
 * Returns an empty set (rather than throwing) if either source shape has
 * moved, so the caller can report that as a real discrepancy instead of a
 * crash.
 */
function deriveTradeActionVocabulary(sourceText) {
  const values = new Set();

  const transferTypesHeader = sourceText.match(/const TRANSFER_TYPES = Object\.freeze\(\{/);
  if (transferTypesHeader) {
    const body = sliceBracedBlock(sourceText, transferTypesHeader.index + transferTypesHeader[0].length);
    for (const match of body.matchAll(/[a-zA-Z]+Action:\s*'([a-zA-Z0-9_-]+)'/g)) values.add(match[1]);
  }

  const buildActionsHeader = sourceText.match(/_buildActions\([^)]*\)\s*\{/);
  if (buildActionsHeader) {
    const body = sliceBracedBlock(sourceText, buildActionsHeader.index + buildActionsHeader[0].length);
    for (const match of body.matchAll(/action:\s*'([a-zA-Z0-9_-]+)'/g)) values.add(match[1]);
  }

  return values;
}

// Attributes whose template value is a Handlebars expression, not a literal
// — DISPATCH_CONTROLS' plain literal-value matching cannot see these at
// all (see the "DYNAMIC-ACTION-VALUE-LEVEL" doc comment at the top of this
// file). Each entry names the static source this scan derives the runtime
// vocabulary from instead, and the file/variable the derived values are
// checked against downstream. `templateFile`/`templateMarker` are a
// regression guard: if the template stops rendering the expression this
// entry assumes, the deriver's output would silently stop meaning anything,
// so buildEntry below verifies the marker is still present and reports a
// discrepancy (not a silent pass) if it isn't.
const DYNAMIC_DISPATCH_SOURCES = {
  'trade-action': {
    surfaceId: 'trade',
    templateFile: 'templates/apps/gm-datapad/surfaces/trade/trade-board.hbs',
    templateMarker: 'data-trade-action="{{this.action}}"',
    vocabularySourceFile: 'scripts/ui/shell/gm/GMTradeConsoleSurfaceService.js',
    deriveVocabulary: deriveTradeActionVocabulary,
    dispatchFile: 'scripts/holonet/subsystems/holonet-messenger-service.js',
    dispatchVarName: 'action',
    // See collectDispatchValues' doc comment: an unscoped if-chain scan of
    // this file over-accepts (matches a second-layer dispatcher's own
    // internal `action === 'x'` check even when the outer switch case that
    // is supposed to route to it has been renamed/removed).
    dispatchMode: 'switch-only'
  }
};

// Attributes that intentionally carry no dataset-read wiring of their own:
// pure CSS state hooks, ids used only for cross-referencing (never read via
// `.dataset` in JS — read via a sibling `name=`/`value=` pair instead), or
// smart-drop-service-owned zones that key off a shared class, not a
// per-attribute dataset read.
const NON_ACTION_ATTRIBUTE_NAMES = new Set([
  'action-tone', 'shell-surface', 'gm-command-shell', 'gm-surface-scrollframe',
  'smart-document-zone', 'smart-doc-kind', 'smart-hint', 'smart-image-dropzone', 'smart-image-input',
  'concept-surface', 'concept-phase', 'has-prefill', 'job-has-prefill', 'theme',
  'job-draft-saved-label', 'job-board-tabs', 'gm-wizard-scope', 'gm-wizard-form',
  'gm-wizard', 'gm-wizard-current', 'job-status-note', 'thread-id',
  'clear-job-prefill', // read as a plain boolean flag alongside data-gm-wizard-open, not a dataset name of its own
  // Passive self-identification markers on a container (CSS/debugging hooks
  // or read only via closest()/querySelector() ancestry, never a per-value
  // dataset read): not a rendered action in their own right.
  'gm-surface', 'wizard-target', 'location-modal', 'intel-modal', 'location-wizard', 'shell-region'
]);

const PARTIAL_RE = /\{\{>\s*"([^"]+)"/g;
// Only literal-valued data-* attributes are candidate actions: a Handlebars
// expression (`data-x="{{this.id}}"`) is a reference/id binding, not an
// authored action token.
const DATA_ATTR_RE = /data-([a-zA-Z][a-zA-Z0-9-]*)="([a-zA-Z0-9_-]*)"/g;

async function readIfExists(relPath) {
  try {
    return await readFile(path.join(ROOT, relPath), 'utf8');
  } catch {
    return null;
  }
}

function toRelTemplatePath(includePath) {
  if (!includePath.startsWith(TEMPLATES_ROOT)) return null;
  return `templates/${includePath.slice(TEMPLATES_ROOT.length)}`;
}

function toCamelCase(kebab) {
  return kebab.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

async function collectTemplateTree(seedTemplates) {
  const visited = new Set();
  const attrs = new Map(); // attrName -> Set(templateFile)
  const values = new Map(); // attrName -> Map(value -> Set(templateFile))
  const queue = Array.isArray(seedTemplates) ? [...seedTemplates] : [seedTemplates];

  while (queue.length) {
    const rel = queue.shift();
    if (visited.has(rel)) continue;
    visited.add(rel);

    const content = await readIfExists(rel);
    if (content === null) continue;

    for (const match of content.matchAll(DATA_ATTR_RE)) {
      const [, attrName, value] = match;
      if (NON_ACTION_ATTRIBUTE_NAMES.has(attrName)) continue;
      if (!attrs.has(attrName)) attrs.set(attrName, new Set());
      attrs.get(attrName).add(rel);
      if (value) {
        if (!values.has(attrName)) values.set(attrName, new Map());
        const perValue = values.get(attrName);
        if (!perValue.has(value)) perValue.set(value, new Set());
        perValue.get(value).add(rel);
      }
    }

    for (const match of content.matchAll(PARTIAL_RE)) {
      const childRel = toRelTemplatePath(match[1]);
      if (childRel && !visited.has(childRel)) queue.push(childRel);
    }
  }

  return { files: visited, attrs, values };
}

function collectDatasetReads(sourceText) {
  const reads = new Set();
  for (const match of sourceText.matchAll(/dataset\.([a-zA-Z0-9]+)/g)) reads.add(match[1]);
  // querySelectorAll('[data-x]') / '[data-x="y"]' style delegated wiring also
  // proves an attribute is a live selector even when the value is read via a
  // different accessor.
  for (const match of sourceText.matchAll(/\[data-([a-zA-Z][a-zA-Z0-9-]*)/g)) reads.add(toCamelCase(match[1]));
  return reads;
}

/**
 * Extract every string literal a controller accepts for a given
 * `data-<attrKebab>` attribute, covering three real wiring styles found in
 * this codebase:
 *   1. `varName === 'x'` / `varName == 'x'` if-chains against a variable
 *      assigned from `dataset.<name>` (Locations/Intel/Factions/…). Skipped
 *      entirely when `mode === 'switch-only'`.
 *   2. `switch (varName) { case 'x': ... }` (brace-matched, so case labels
 *      belonging to a different switch on the same file are excluded).
 *   3. Per-value literal selectors — `querySelectorAll('[data-x="value"]')`
 *      or `[data-x="value"]` as a direct match target with no dispatch
 *      variable at all (GMApprovalsSurfaceController's style: one
 *      querySelectorAll call per action value instead of one delegated
 *      listener with a switch).
 * `varName` may be null when a controller only uses style 3.
 *
 * `mode: 'switch-only'` disables style 1's whole-file if-chain scan. Style 1
 * is safe for a small controller file whose only `varName === 'x'`
 * occurrences ARE the intended dispatch (verified by direct reading before
 * wiring it into DISPATCH_CONTROLS/DYNAMIC_DISPATCH_SOURCES). It is NOT safe
 * for a large multi-purpose service file: holonet-messenger-service.js
 * reuses the identifier `action` in several unrelated methods, including a
 * second-layer dispatcher (`_gmResolveCreditTransfer`) that
 * `_gmThreadAction`'s own switch calls for the credit-transfer action group
 * — an unscoped file-wide scan would keep matching `action === 'approve-transfer'`
 * inside that inner method even if `_gmThreadAction`'s switch case that
 * actually routes to it were renamed or removed, silently reporting a
 * broken dispatch as handled (caught by a deliberate regression check
 * during this pass — see docs/audits/gm-datapad-recovery-action-integrity.md
 * §1b). `_gmThreadAction`'s single `switch (action)` is the true, complete,
 * single entry point for every value this scanner checks against this file
 * (verified: all Trade/economy action values used by DISPATCH_CONTROLS and
 * DYNAMIC_DISPATCH_SOURCES appear there as `case` labels), so switch-only
 * mode is both sufficient and precise for it.
 */
function collectDispatchValues(sourceText, varName, attrKebab, mode = 'full') {
  const values = new Set();

  if (varName) {
    const escaped = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (mode !== 'switch-only') {
      for (const match of sourceText.matchAll(new RegExp(`\\b${escaped}\\s*===?\\s*['"]([a-zA-Z0-9_-]+)['"]`, 'g'))) {
        values.add(match[1]);
      }
    }

    const switchRe = new RegExp(`switch\\s*\\(\\s*${escaped}\\s*\\)\\s*\\{`, 'g');
    for (const switchMatch of sourceText.matchAll(switchRe)) {
      const body = sliceBracedBlock(sourceText, switchMatch.index + switchMatch[0].length);
      for (const caseMatch of body.matchAll(/case\s+['"]([a-zA-Z0-9_-]+)['"]\s*:/g)) values.add(caseMatch[1]);
    }
  }

  if (attrKebab) {
    const escapedAttr = attrKebab.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const match of sourceText.matchAll(new RegExp(`\\[data-${escapedAttr}=['"]([a-zA-Z0-9_-]+)['"]\\]`, 'g'))) {
      values.add(match[1]);
    }
  }

  return values;
}

async function buildEntry(surfaceId, seedTemplates, controllerFile, dispatchFileCache) {
  const { files, attrs, values } = await collectTemplateTree(seedTemplates);

  const wiringText = {};
  for (const rel of ALWAYS_IN_SCOPE_WIRING_FILES) wiringText[rel] = (await readIfExists(rel)) ?? '';

  const handled = new Set();
  for (const [, text] of Object.entries(wiringText)) {
    for (const name of collectDatasetReads(text)) handled.add(name);
  }
  if (controllerFile) {
    const controllerText = (await readIfExists(controllerFile)) ?? '';
    for (const name of collectDatasetReads(controllerText)) handled.add(name);
  }

  const dispatchTextFor = async (rel) => {
    if (!dispatchFileCache.has(rel)) dispatchFileCache.set(rel, (await readIfExists(rel)) ?? '');
    return dispatchFileCache.get(rel);
  };

  const controls = [];
  for (const [attrName, templateFiles] of attrs) {
    const camel = toCamelCase(attrName);
    const attributeLevelHandled = handled.has(camel);

    const dispatch = PER_SURFACE_DISPATCH_OVERRIDES[surfaceId]?.[attrName]
      ?? (DISPATCH_CONTROLS[attrName]?.surfaceId === surfaceId ? DISPATCH_CONTROLS[attrName] : null)
      ?? (attrName === 'gm-v2-action' ? HOST_DISPATCH_CONTROLS[attrName] : null);

    if (dispatch) {
      const dispatchText = await dispatchTextFor(dispatch.file);
      const acceptedValues = collectDispatchValues(dispatchText, dispatch.varName, attrName);
      for (const extraFile of dispatch.alsoCheck ?? []) {
        const extraText = await dispatchTextFor(extraFile);
        for (const v of collectDispatchValues(extraText, dispatch.alsoCheckVarName ?? dispatch.varName, attrName, dispatch.alsoCheckMode)) acceptedValues.add(v);
      }
      const renderedValues = [...(values.get(attrName)?.keys() ?? [])];

      for (const value of renderedValues) {
        controls.push({
          attribute: `data-${attrName}="${value}"`,
          status: acceptedValues.has(value) ? 'ACTION_VALUE_HANDLED' : 'UNRESOLVED',
          proof: 'action-value',
          templates: [...(values.get(attrName)?.get(value) ?? [])]
        });
      }
      continue;
    }

    controls.push({
      attribute: `data-${attrName}`,
      status: attributeLevelHandled ? 'LIVE_HANDLED' : 'UNRESOLVED',
      proof: 'attribute-name',
      templates: [...templateFiles]
    });
  }

  for (const [attrName, source] of Object.entries(DYNAMIC_DISPATCH_SOURCES)) {
    if (source.surfaceId !== surfaceId) continue;

    const templateText = await readIfExists(source.templateFile);
    if (templateText === null || !templateText.includes(source.templateMarker)) {
      controls.push({
        attribute: `data-${attrName} (dynamic)`,
        status: 'UNRESOLVED',
        proof: 'dynamic-action-value',
        templates: [source.templateFile],
        note: `Expected template marker not found — ${source.templateFile} no longer contains ${JSON.stringify(source.templateMarker)}. The derived vocabulary below may no longer reflect what actually renders; re-verify DYNAMIC_DISPATCH_SOURCES.`
      });
      continue;
    }

    const vocabularySourceText = await readIfExists(source.vocabularySourceFile);
    const vocabulary = vocabularySourceText ? source.deriveVocabulary(vocabularySourceText) : new Set();
    const dispatchText = await dispatchTextFor(source.dispatchFile);
    const acceptedValues = collectDispatchValues(dispatchText, source.dispatchVarName, attrName, source.dispatchMode);

    if (vocabulary.size === 0) {
      controls.push({
        attribute: `data-${attrName} (dynamic)`,
        status: 'UNRESOLVED',
        proof: 'dynamic-action-value',
        templates: [source.vocabularySourceFile],
        note: `Derived vocabulary was empty — ${source.vocabularySourceFile}'s expected config/function shape may have moved; re-verify deriveVocabulary.`
      });
      continue;
    }

    for (const value of [...vocabulary].sort()) {
      controls.push({
        attribute: `data-${attrName}="${value}" (dynamic)`,
        status: acceptedValues.has(value) ? 'DYNAMIC_ACTION_SOURCE_VERIFIED' : 'UNRESOLVED',
        proof: 'dynamic-action-value',
        templates: [source.templateFile, source.vocabularySourceFile]
      });
    }
  }

  return {
    templateFiles: [...files],
    controls: controls.sort((a, b) => a.attribute.localeCompare(b.attribute))
  };
}

export async function buildGmDatapadActionRegistry() {
  const dispatchFileCache = new Map();

  const surfaces = {};
  for (const [surfaceId, def] of Object.entries(SURFACES)) {
    surfaces[surfaceId] = await buildEntry(surfaceId, def.template, def.controller, dispatchFileCache);
  }

  // Host chrome (sidebar/dock/toolbar) is included directly from
  // gm-datapad.hbs, not from any surface's own template tree, so it needs
  // its own entry rather than silently going unscanned.
  surfaces.host = await buildEntry('host', HOST_CHROME_TEMPLATES, null, dispatchFileCache);

  return surfaces;
}

export function unresolvedControls(surfaces) {
  const out = [];
  for (const [surfaceId, surface] of Object.entries(surfaces)) {
    for (const control of surface.controls) {
      if (control.status === 'UNRESOLVED') out.push({ surfaceId, ...control });
    }
  }
  return out;
}
