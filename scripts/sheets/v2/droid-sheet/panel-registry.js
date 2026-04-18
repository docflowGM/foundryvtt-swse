/**
 * scripts/sheets/v2/droid-sheet/panel-registry.js
 *
 * Minimal panel-registry adapter for the live droid sheet.
 *
 * The live droid sheet renders a single monolithic template
 * (`templates/actors/droid/v2/droid-sheet.hbs`) rather than composing
 * per-panel partials, so a full PanelContextBuilder/PANEL_REGISTRY transplant
 * (as the dormant droid implementation has) would be over-engineering for
 * Phase 2.
 *
 * Instead, this file:
 *   1. Declares the logical panel contracts the live droid context is
 *      expected to satisfy (required keys per panel).
 *   2. Exposes a `validateLivePanelContracts(context)` helper that flags drift
 *      without throwing — drift is logged via SWSELogger and returned as a
 *      report so callers (and tests) can react.
 *
 * If/when the live droid sheet is broken into per-panel partials, this
 * registry can grow into a full registry comparable to the character sheet's.
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
 * Phase 3A added the optional `partial` field on entries that correspond to
 * a concrete droid-owned partial (`templates/actors/droid/v2/partials/*.hbs`).
 * This is *documentation only* today — the live template still composes
 * partials by explicit `{{> ... }}` includes. No dynamic registry-driven
 * rendering is introduced yet.
 */
const DROID_PARTIAL_BASE = "systems/foundryvtt-swse/templates/actors/droid/v2/partials";

export const DROID_LIVE_PANEL_REGISTRY = Object.freeze([
  {
    panelName: "header",
    description: "Header strip (defenses summary, damage threshold, condition track)",
    requiredKeys: [
      "derived.defenses.fort",
      "derived.defenses.ref",
      "derived.defenses.will",
      "derived.damage.threshold"
    ]
  },
  {
    panelName: "summary",
    description: "Top-of-sheet summary (initiative, system shape, abilities)",
    requiredKeys: ["system", "derived"],
    partial: `${DROID_PARTIAL_BASE}/initiative-panel.hbs`
  },
  {
    panelName: "equipment",
    description: "Equipment ledger entries projected from actor.items",
    requiredKeys: ["equipment"],
    arrayKey: "equipment",
    rowContract: ["id", "name", "type", "img", "system"],
    partial: `${DROID_PARTIAL_BASE}/equipment-panel.hbs`
  },
  {
    panelName: "armor",
    description: "Armor ledger entries projected from actor.items",
    requiredKeys: ["armor"],
    arrayKey: "armor",
    rowContract: ["id", "name", "type", "img", "system"],
    partial: `${DROID_PARTIAL_BASE}/armor-panel.hbs`
  },
  {
    panelName: "weapons",
    description: "Weapons ledger entries projected from actor.items",
    requiredKeys: ["weapons"],
    arrayKey: "weapons",
    rowContract: ["id", "name", "type", "img", "system"],
    partial: `${DROID_PARTIAL_BASE}/weapons-panel.hbs`
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
    partial: `${DROID_PARTIAL_BASE}/owned-actors-panel.hbs`
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
    partial: `${DROID_PARTIAL_BASE}/droid-systems-panel.hbs`
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
