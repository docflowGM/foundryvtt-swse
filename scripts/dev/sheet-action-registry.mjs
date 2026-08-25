/**
 * Phase 5 — Sheet action-integrity registry.
 *
 * Statically derives, for each of the four actor-type render branches
 * (Vehicle / NPC-concept / Character-Droid-"common-else"), the complete set
 * of `data-action="..."` values rendered by templates reachable from the
 * single shared root template (character-sheet.hbs), and cross-references
 * them against string literals found in the sheet controller files that
 * actually own listener wiring for that branch.
 *
 * This is intentionally a source-text scan, not a Foundry-runtime import
 * (ApplicationV2 + the full Foundry global surface cannot be constructed
 * under this repo's Node test harness — see tests/phase4-sheet-architecture-contract.test.mjs
 * for the established precedent of source-contract tests for this file family).
 *
 * Deliberately NOT a hand-maintained action name list: template inclusion is
 * resolved by parsing `{{> "..."}}` partial references (a real, if partial,
 * proxy for Foundry's own Handlebars partial resolution), and "handled" is
 * derived by scanning the controller files for the literal action string
 * rather than asserting against a fixed catalog. Adding a new template
 * button with no matching string anywhere in the controller set will show up
 * as UNRESOLVED the next time this runs.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const TEMPLATES_ROOT = 'systems/foundryvtt-swse/templates/';

const ROOT_TEMPLATE = 'templates/actors/character/v2-concept/character-sheet.hbs';

// Actions handled by a document-level delegated listener registered once at
// system init (outside any per-sheet controller's own wiring). Verified live
// by direct inspection — see docs/audits/v2-phase-5-sheet-ux-action-integrity.md.
const GLOBALLY_DELEGATED_ACTIONS = new Set([
  'create-custom-talent-tree' // scripts/apps/talent-tree-workbench/custom-talent-tree-workbench-hooks.js, registered in index.js
]);

// Actions that are intentionally rendered but deliberately disabled with an
// explanation (Phase 5 fix policy C — "no trustworthy implementation exists").
// A control here must actually be disabled in its owning controller file
// (checked below, not just declared).
const INTENTIONALLY_DISABLED_ACTIONS = new Set([
  'import-vehicle' // vehicle-actor-sheet.js: disabled with an explicit title/aria-disabled, no implementation exists anywhere in the codebase.
]);

// Templates known-and-proven orphaned (not `{{> included}}` by anything in
// the live render tree) but preloaded/registered elsewhere (Handlebars cache
// warm-up or a dev audit script asserting their text content), so removing
// the *file* is out of scope for Phase 5 even though it never renders.
// Actions found ONLY inside these templates are excluded from the live
// registry entirely (they cannot be clicked because the template never
// renders), and are documented separately in the audit doc as DEAD_UI.
const KNOWN_ORPHANED_TEMPLATES = new Set([
  'templates/actors/character/v2-concept/partials/panels/force-panel.hbs',
  'templates/actors/character/v2/partials/force-panel.hbs',
  'templates/actors/character/v2/partials/inventory-panel.hbs',
  'templates/actors/character/tabs/starship-maneuvers-tab.hbs'
]);

const PARTIAL_RE = /\{\{>\s*"([^"]+)"/g;
const DATA_ACTION_RE = /data-action=["']([a-zA-Z0-9_-]+)["']/g;

async function readIfExists(relPath) {
  try {
    return await readFile(path.join(ROOT, relPath), 'utf8');
  } catch {
    return null;
  }
}

// Shell-hosted overlay surfaces (Store, GM Datapad, generic upgrade shell
// chrome, sheet settings) are separate Application/overlay controllers with
// their own action wiring (e.g. scripts/apps/store/store-main.js), not owned
// by the actor-sheet controller classes this phase is scoped to. The actor
// sheet only *hosts* these surfaces via ShellHostMixin; their action
// integrity is out of scope here (unrelated-UI boundary — see Phase 5 spec's
// "do not touch unrelated game UI" constraint).
const OUT_OF_SCOPE_TEMPLATE_PREFIXES = [
  'templates/shell/',
  'templates/apps/gm-datapad/',
  'templates/apps/upgrade/'
];

function toRelTemplatePath(includePath) {
  if (!includePath.startsWith(TEMPLATES_ROOT)) return null;
  const rel = `templates/${includePath.slice(TEMPLATES_ROOT.length)}`;
  if (OUT_OF_SCOPE_TEMPLATE_PREFIXES.some(prefix => rel.startsWith(prefix))) return null;
  return rel;
}

/**
 * BFS over `{{> "..."}}` partial inclusions starting from a set of seed
 * templates, returning { files: Set<relPath>, actions: Map<action, Set<relPath>> }.
 */
async function collectBranch(seedTemplates) {
  const visited = new Set();
  const actions = new Map();
  const queue = [...seedTemplates];

  while (queue.length) {
    const rel = queue.shift();
    if (visited.has(rel)) continue;
    visited.add(rel);
    if (KNOWN_ORPHANED_TEMPLATES.has(rel)) continue;

    const content = await readIfExists(rel);
    if (content === null) continue;

    for (const match of content.matchAll(DATA_ACTION_RE)) {
      const action = match[1];
      if (!actions.has(action)) actions.set(action, new Set());
      actions.get(action).add(rel);
    }

    for (const match of content.matchAll(PARTIAL_RE)) {
      const childRel = toRelTemplatePath(match[1]);
      if (childRel && !visited.has(childRel)) queue.push(childRel);
    }
  }

  return { files: visited, actions };
}

/**
 * Extract the root template's three mutually-exclusive branches by locating
 * the {{#if actorSheetMode.useVehicleSheet}} / {{else if ...useNpcConceptSheet}}
 * / {{else}} structure and returning each branch's own top-level partial
 * includes as BFS seeds (plus shared frame partials common to all).
 */
async function seedsFromRootTemplate() {
  const root = await readIfExists(ROOT_TEMPLATE);
  if (root === null) throw new Error(`Root template not found: ${ROOT_TEMPLATE}`);

  // The three-way branch is not a single balanced {{#if}}/{{/if}} pair we can
  // safely regex-match end-to-end (the common-else body itself contains many
  // nested {{#if}}...{{/if}} pairs). Instead, locate the three known marker
  // strings directly and slice between them — brittle to a marker string
  // changing, but that failure is loud (thrown error), not silent.
  const vehicleMarker = '{{#if actorSheetMode.useVehicleSheet}}';
  const npcMarker = '{{else if actorSheetMode.useNpcConceptSheet}}';
  const elseMarker = '{{else}}';
  const closeMarker = '{{> "systems/foundryvtt-swse/templates/shell/shell-surface.hbs"}}\n          {{/if}}';

  const vStart = root.indexOf(vehicleMarker);
  const nStart = root.indexOf(npcMarker, vStart);
  const eStart = root.indexOf(elseMarker, nStart);
  const eEnd = root.indexOf(closeMarker, eStart);
  if (vStart < 0 || nStart < 0 || eStart < 0 || eEnd < 0) {
    throw new Error('Could not locate the three-way actorSheetMode branch in the root template — has its structure changed?');
  }

  const vehicleBody = root.slice(vStart + vehicleMarker.length, nStart);
  const npcBody = root.slice(nStart + npcMarker.length, eStart);
  const commonElseBody = root.slice(eStart + elseMarker.length, eEnd);

  const extractIncludes = (body) => [...body.matchAll(PARTIAL_RE)].map(m => toRelTemplatePath(m[1])).filter(Boolean);

  return {
    vehicle: extractIncludes(vehicleBody),
    npc: extractIncludes(npcBody),
    commonElse: extractIncludes(commonElseBody)
  };
}

const CONTROLLER_FILES = {
  base: 'scripts/sheets/v2/actor-sheet-base.js',
  characterLike: 'scripts/sheets/v2/character-like-sheet.js',
  character: 'scripts/sheets/v2/character-sheet.js',
  npc: 'scripts/sheets/v2/npc-actor-sheet.js',
  droid: 'scripts/sheets/v2/droid-actor-sheet.js',
  vehicle: 'scripts/sheets/v2/vehicle-actor-sheet.js',
  // Imported, invoked-at-render modules that own a real slice of listener
  // wiring but live outside the six controller-class files above.
  vehicleCrew: 'scripts/sheets/v2/vehicle-sheet/vehicle-crew-assignment-controls.js',
  customSkills: 'scripts/sheets/v2/character-sheet/custom-skills-ui.js'
};

// Which controller files own listener wiring for each render branch.
const BRANCH_CONTROLLERS = {
  vehicle: ['base', 'vehicle', 'vehicleCrew'],
  npc: ['base', 'characterLike', 'npc'],
  commonElse: ['base', 'characterLike', 'character', 'droid', 'customSkills'] // Character + Droid + promoted-heroic-NPC
};

// Rendered only under a template-side {{#if}} this text-only scanner cannot
// evaluate (e.g. `{{#if (eq actor.type "character")}}`), so the branch this
// scan assigns them to (based purely on which template file contains the
// literal string) never actually renders them for that actor type. Verified
// by direct template inspection at Phase 5A time — see the audit doc.
const TEMPLATE_GATED_FALSE_POSITIVES = new Set([
  'vehicle:roll-attributes' // abilities-panel.hbs gates this to {{#if (eq actor.type "character")}}; vehicles never render it.
]);

// Verified live via a non-data-action selector (a shared CSS class or a
// `name`-attribute prefix match) rather than a `[data-action="..."]` string,
// so this scanner's string-matching cannot see the handler. Confirmed by
// direct code reading at Phase 5A time — see the audit doc.
const VERIFIED_LIVE_VIA_OTHER_SELECTOR = new Set([
  'commonElse:change-skill-ability', // character-like-sheet.js _activateSkillsUI: `.swse-concept-skill-row__math .ability-select` class listener
  'commonElse:change-custom-skill-ability' // custom-skills-ui.js: `[name^="system.customSkills."]` prefix listener
]);

/**
 * Collect every string that appears as a data-action selector literal
 * ([data-action="x"], [data-action='x']), OR as a quoted case label /
 * equality comparison against an `action`/`dataset.action`-shaped variable.
 * Intentionally permissive (a superset) — the goal is zero false "no
 * handler" reports for real handlers, not a tight reachability proof for
 * this half of the scan (the template side is the precise half).
 */
function collectHandledActions(sourceText) {
  const handled = new Set();
  for (const match of sourceText.matchAll(/\[data-action=["']([a-zA-Z0-9_-]+)["']\]/g)) handled.add(match[1]);
  for (const match of sourceText.matchAll(/dataset\.action\s*===?\s*["']([a-zA-Z0-9_-]+)["']/g)) handled.add(match[1]);
  for (const match of sourceText.matchAll(/\baction\s*===?\s*["']([a-zA-Z0-9_-]+)["']/g)) handled.add(match[1]);
  for (const match of sourceText.matchAll(/case\s+["']([a-zA-Z0-9_-]+)["']\s*:/g)) handled.add(match[1]);
  for (const match of sourceText.matchAll(/kind\s*===?\s*["']([a-zA-Z0-9_-]+)["']/g)) handled.add(match[1]);
  for (const match of sourceText.matchAll(/action:\s*['"]([a-zA-Z0-9_-]+)['"]/g)) handled.add(match[1]);
  // Object-literal key dispatch (e.g. `const stepMap = { 'cmd-select-class': ... }`,
  // `const forceTalentHandlers = { 'force-talent-aversion': ... }`) keyed off a
  // `dataset.action`/`.action` read on the same or a nearby line. Deliberately
  // permissive: any quoted-identifier object key that looks like a data-action
  // string counts, since this file's action names are always kebab-case.
  for (const match of sourceText.matchAll(/['"]([a-z][a-z0-9]*(?:-[a-z0-9]+)+)['"]\s*:/g)) handled.add(match[1]);
  return handled;
}

/**
 * Detect the small set of actions this Phase 5 pass deliberately disabled in
 * place (rendered, but `.setAttribute('disabled', ...)`'d at wire time). Only
 * trusted when the action string appears within ~4 lines of a `disabled`
 * mutation in the same controller file, so declaring an action "disabled"
 * without actually disabling it in code cannot silently pass this check.
 */
function collectActuallyDisabledActions(sourceText) {
  const disabled = new Set();
  const lines = sourceText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/querySelectorAll\(['"]\[data-action=["']([a-zA-Z0-9_-]+)["']\]['"]\)/);
    if (!m) continue;
    const windowText = lines.slice(i, i + 6).join('\n');
    if (/setAttribute\(['"]disabled['"]|\.disabled\s*=\s*true/.test(windowText)) {
      disabled.add(m[1]);
    }
  }
  return disabled;
}

export async function buildActionRegistry() {
  const seeds = await seedsFromRootTemplate();
  const controllerText = {};
  for (const [key, rel] of Object.entries(CONTROLLER_FILES)) {
    controllerText[key] = (await readIfExists(rel)) ?? '';
  }

  const branches = {};
  for (const [branchName, seedList] of Object.entries(seeds)) {
    const { files, actions } = await collectBranch(seedList);

    const handled = new Set();
    const disabled = new Set();
    for (const controllerKey of BRANCH_CONTROLLERS[branchName]) {
      for (const a of collectHandledActions(controllerText[controllerKey])) handled.add(a);
      for (const a of collectActuallyDisabledActions(controllerText[controllerKey])) disabled.add(a);
    }

    const entries = [];
    for (const [action, sourceFiles] of actions) {
      const branchActionKey = `${branchName}:${action}`;
      let status;
      if (TEMPLATE_GATED_FALSE_POSITIVES.has(branchActionKey)) {
        status = 'NOT_ACTUALLY_RENDERED_FOR_THIS_TYPE';
      } else if (VERIFIED_LIVE_VIA_OTHER_SELECTOR.has(branchActionKey)) {
        status = 'LIVE_HANDLED_OTHER_SELECTOR';
      } else if (INTENTIONALLY_DISABLED_ACTIONS.has(action) && disabled.has(action)) {
        status = 'INTENTIONALLY_DISABLED';
      } else if (GLOBALLY_DELEGATED_ACTIONS.has(action)) {
        status = 'LIVE_HANDLED_GLOBAL';
      } else if (handled.has(action)) {
        status = 'LIVE_HANDLED';
      } else {
        status = 'UNRESOLVED';
      }
      entries.push({ action, status, templates: [...sourceFiles] });
    }

    branches[branchName] = { templateFiles: [...files], actions: entries.sort((a, b) => a.action.localeCompare(b.action)) };
  }

  return branches;
}

export function unresolvedActions(branches) {
  const out = [];
  for (const [branchName, branch] of Object.entries(branches)) {
    for (const entry of branch.actions) {
      if (entry.status === 'UNRESOLVED') out.push({ branch: branchName, ...entry });
    }
  }
  return out;
}
