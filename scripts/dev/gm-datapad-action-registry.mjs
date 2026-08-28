/**
 * GM Datapad recovery — action-integrity registry.
 *
 * Statically derives, for every registered GM Datapad surface, the complete
 * set of literal-valued `data-*="..."` attributes rendered on interactive
 * elements (buttons, links, form controls) reachable from that surface's
 * root partial, and cross-references each attribute *name* against
 * `dataset.<camelCase>` reads in the files allowed to wire that surface's
 * controls: the surface's own controller, the shared GM Datapad host
 * (scripts/apps/gm-datapad.js), and GMInteractionRepairService.js.
 *
 * This is a source-text scan, not a Foundry-runtime import — ApplicationV2 +
 * the full Foundry global surface cannot be constructed under this repo's
 * Node test harness (same limitation documented in
 * tests/phase4-sheet-architecture-contract.test.mjs and
 * scripts/dev/sheet-action-registry.mjs, the Phase 5 precedent this file
 * mirrors for the GM Datapad).
 *
 * Deliberately NOT a hand-maintained action list: the template side is
 * derived by parsing `{{> "..."}}` partial references starting from each
 * surface's registered root template, and "handled" is derived by scanning
 * the controller/host/repair files for the literal `dataset.<name>` read
 * rather than asserting against a fixed catalog. A new template control with
 * no matching dataset read anywhere in the allowed wiring files shows up as
 * UNRESOLVED the next time this runs.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const TEMPLATES_ROOT = 'systems/foundryvtt-swse/templates/';

// Mirrors templates/shell/shell-surface.hbs's `{{#if (eq shellSurface "gm-X")}}`
// partial routing and GMSurfaceControllerRegistry's surface->controller map.
// Both are small, stable, hand-authored contracts already asserted elsewhere
// (GMSurfaceRegistry / GMSurfaceControllerRegistry) — restating them here is
// the seed list a BFS scan needs, not a duplicate source of truth for what
// each surface *does*.
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
  // The GM Settings surface delegates theme/language controls to the same
  // shared controller every datapad shell (actor + GM) uses.
  'scripts/ui/shell/SettingsSurfaceController.js'
];

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

async function collectTemplateTree(seedTemplate) {
  const visited = new Set();
  const attrs = new Map(); // attrName -> Set(templateFile)
  const queue = [seedTemplate];

  while (queue.length) {
    const rel = queue.shift();
    if (visited.has(rel)) continue;
    visited.add(rel);

    const content = await readIfExists(rel);
    if (content === null) continue;

    for (const match of content.matchAll(DATA_ATTR_RE)) {
      const [, attrName] = match;
      if (NON_ACTION_ATTRIBUTE_NAMES.has(attrName)) continue;
      if (!attrs.has(attrName)) attrs.set(attrName, new Set());
      attrs.get(attrName).add(rel);
    }

    for (const match of content.matchAll(PARTIAL_RE)) {
      const childRel = toRelTemplatePath(match[1]);
      if (childRel && !visited.has(childRel)) queue.push(childRel);
    }
  }

  return { files: visited, attrs };
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

export async function buildGmDatapadActionRegistry() {
  const wiringText = {};
  for (const rel of ALWAYS_IN_SCOPE_WIRING_FILES) wiringText[rel] = (await readIfExists(rel)) ?? '';

  const surfaces = {};
  for (const [surfaceId, def] of Object.entries(SURFACES)) {
    const { files, attrs } = await collectTemplateTree(def.template);

    const handled = new Set();
    for (const [, text] of Object.entries(wiringText)) {
      for (const name of collectDatasetReads(text)) handled.add(name);
    }
    if (def.controller) {
      const controllerText = (await readIfExists(def.controller)) ?? '';
      for (const name of collectDatasetReads(controllerText)) handled.add(name);
    }

    const controls = [];
    for (const [attrName, templateFiles] of attrs) {
      const camel = toCamelCase(attrName);
      controls.push({
        attribute: `data-${attrName}`,
        status: handled.has(camel) ? 'LIVE_HANDLED' : 'UNRESOLVED',
        templates: [...templateFiles]
      });
    }

    surfaces[surfaceId] = {
      templateFiles: [...files],
      controls: controls.sort((a, b) => a.attribute.localeCompare(b.attribute))
    };
  }

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
