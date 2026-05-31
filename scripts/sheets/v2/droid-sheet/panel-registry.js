/**
 * scripts/sheets/v2/droid-sheet/panel-registry.js
 *
 * Minimal panel-registry adapter for the live droid sheet.
 *
 * The live droid sheet now renders through shared shell/frame partials plus
 * droid-owned frame/tab partials. This registry remains intentionally light:
 * it validates the logical context contracts consumed by those partials without
 * introducing a second rendering registry or a parallel derived-data system.
 *
 * This file:
 *   1. Declares the logical panel contracts the live droid partials are
 *      expected to satisfy (required keys per panel).
 *   2. Exposes a `validateLivePanelContracts(context)` helper that flags drift
 *      without throwing — drift is logged via SWSELogger and returned as a
 *      report so callers (and tests) can react.
 *
 * Phase 3C removed the dormant `scripts/sheets/v2/droid/*` tree — this file
 * is now the only droid panel registry in the repo.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * Shared shape primitives.
 *
 * These are deliberately loose: the live template's data is consumed by lots
 * of partials, and Phase 2 must not regress any of them. A key is "satisfied"
 * if it exists at the documented path (defined or null/empty value is fine —
 * we are not asserting non-null payloads here).
 *
 * The optional `partial` field documents the concrete droid-owned partial that
 * consumes a contract. Rendering is still explicit Handlebars composition, not
 * a dynamic registry-driven renderer.
 */
const DROID_PARTIAL_BASE = "systems/foundryvtt-swse/templates/actors/droid/v2/partials";
const DROID_FRAME_PARTIAL_BASE = `${DROID_PARTIAL_BASE}/frame`;
const DROID_TAB_PARTIAL_BASE = `${DROID_PARTIAL_BASE}/tabs`;

export const DROID_LIVE_PANEL_REGISTRY = Object.freeze([
  {
    panelName: "header",
    description: "Header frame and quick-glance data from canonical panel builders",
    requiredKeys: [
      "healthPanel.hp",
      "healthPanel.conditionTrack",
      "defensePanel.defenses",
      "quickGlance.hpLabel",
      "quickGlance.reflex",
      "quickGlance.fortitude"
    ],
    partial: `${DROID_FRAME_PARTIAL_BASE}/header-block.hbs`
  },
  {
    panelName: "overview",
    description: "Overview tab identity summary, defenses, and Garage/build status",
    requiredKeys: ["document", "system", "defensePanel.defenses", "droid.garage", "droid.sourceStatus"],
    partial: `${DROID_TAB_PARTIAL_BASE}/overview-tab.hbs`
  },
  {
    panelName: "abilities",
    description: "Ability tab rows projected from canonical ability context",
    requiredKeys: ["abilities"],
    arrayKey: "abilities",
    rowContract: ["key", "label", "base", "total", "mod"],
    partial: `${DROID_TAB_PARTIAL_BASE}/abilities-tab.hbs`
  },
  {
    panelName: "gear",
    description: "Gear tab equipment, armor, and weapon ledgers projected from actor.items",
    requiredKeys: ["equipment", "armor", "weapons", "combatWeapons.unarmed", "combatWeapons.handheld", "combatWeapons.integrated", "combatWeapons.integratedParts", "combatWeapons.hasAny"],
    partial: `${DROID_TAB_PARTIAL_BASE}/gear-tab.hbs`
  },
  {
    panelName: "talents",
    description: "Talent cards (filtered ability-engine card model)",
    requiredKeys: ["talents"],
    arrayKey: "talents"
  },
  {
    panelName: "feats",
    description: "Feat cards (filtered ability-engine card model)",
    requiredKeys: ["feats"],
    arrayKey: "feats"
  },
  {
    panelName: "racialAbilities",
    description: "Racial-ability cards (filtered ability-engine card model)",
    requiredKeys: ["racialAbilities"],
    arrayKey: "racialAbilities"
  },
  {
    panelName: "ownedActors",
    description: "Serializable map of related/owned actors",
    requiredKeys: ["ownedActorMap"],
    partial: `${DROID_FRAME_PARTIAL_BASE}/sidebar.hbs`
  },
  {
    panelName: "xp",
    description: "XP banner state",
    requiredKeys: ["xpEnabled", "xpData", "xpPercent"]
  },
  {
    panelName: "droidSpecific",
    description: "Droid-only panel payloads (locomotion, protocols, programming, customizations, etc.)",
    requiredKeys: [
      "droidPanels.droidSummary",
      "droidPanels.heuristicProcessors",
      "droidPanels.locomotion",
      "droidPanels.integratedSystems",
      "droidPanels.protocols",
      "droidPanels.programming",
      "droidPanels.customizations",
      "droidPanels.buildHistory"
    ],
    partial: `${DROID_TAB_PARTIAL_BASE}/systems-tab.hbs`
  }
]);

function readPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function hasPath(obj, path) {
  if (!obj || !path) return false;
  const segments = path.split(".");
  let cursor = obj;
  for (const segment of segments) {
    if (cursor == null || !Object.prototype.hasOwnProperty.call(cursor, segment)) {
      return false;
    }
    cursor = cursor[segment];
  }
  return true;
}

/**
 * Validate that the live droid context satisfies every declared panel
 * contract. Drift is reported, never thrown.
 *
 * @param {object} context - The merged context from `_prepareContext`
 * @param {object} [options]
 * @param {string} [options.actorId]
 * @param {string} [options.actorName]
 * @returns {{ ok: boolean, panels: Array, missing: Array }}
 */
export function validateLivePanelContracts(context, { actorId = null, actorName = null } = {}) {
  const panels = [];
  const missing = [];

  for (const panel of DROID_LIVE_PANEL_REGISTRY) {
    const panelReport = { panelName: panel.panelName, ok: true, missingKeys: [], rowContractFailures: [] };

    for (const key of panel.requiredKeys) {
      if (!hasPath(context, key)) {
        panelReport.ok = false;
        panelReport.missingKeys.push(key);
      }
    }

    if (panel.arrayKey && panel.rowContract) {
      const rows = readPath(context, panel.arrayKey);
      if (Array.isArray(rows)) {
        rows.forEach((row, idx) => {
          for (const rowKey of panel.rowContract) {
            if (row == null || !Object.prototype.hasOwnProperty.call(row, rowKey)) {
              panelReport.ok = false;
              panelReport.rowContractFailures.push({ index: idx, missingKey: rowKey });
            }
          }
        });
      }
    }

    if (!panelReport.ok) missing.push(panelReport);
    panels.push(panelReport);
  }

  const ok = missing.length === 0;
  if (!ok) {
    SWSELogger.warn("SWSE | DroidLivePanelRegistry: contract drift detected", {
      actorId,
      actorName,
      missing
    });
  }

  return { ok, panels, missing };
}

/**
 * Wrap `validateLivePanelContracts` in a perf timer so callers can lightly
 * track validation cost without pulling in the full PanelDiagnostics class.
 *
 * @param {object} context
 * @param {object} [options]
 * @returns {{ report: object, durationMs: number }}
 */
export function diagnoseLivePanelContext(context, options = {}) {
  const start = (typeof performance !== "undefined" && performance?.now)
    ? performance.now()
    : Date.now();
  const report = validateLivePanelContracts(context, options);
  const end = (typeof performance !== "undefined" && performance?.now)
    ? performance.now()
    : Date.now();
  return { report, durationMs: end - start };
}
