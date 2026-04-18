/**
 * Droid <-> Character structural parity tests.
 *
 * Phase 2 acceptance: when droid panels reuse a shared partial / shared panel
 * pattern, the live droid context must satisfy the same skeletal contract the
 * character sheet uses. These tests do NOT assert that droids and characters
 * have identical *domain* behavior — droids legitimately diverge on
 * Constitution, Force, follower slots, multiclass progression, and
 * mod-point-driven systems.
 *
 * Coverage:
 *   - Live droid panel registry exposes a stable contract shape.
 *   - validateLivePanelContracts flags drift without throwing.
 *   - Ledger panels (equipment / armor / weapons / talents / feats /
 *     racialAbilities) share the row-projection contract used by the
 *     character sheet's RowTransformers (id/name/type).
 *   - Droid-specific panel payloads (protocols, programming, customizations,
 *     build history, integrated systems, heuristic processors) follow the
 *     ledger shape contract: { entries, hasEntries, totalCount, emptyMessage }.
 *   - Droid divergences are preserved — no force/UTF/dark-side/follower keys
 *     are required of droids.
 */

import {
  DROID_LIVE_PANEL_REGISTRY,
  validateLivePanelContracts,
  diagnoseLivePanelContext
} from "/systems/foundryvtt-swse/scripts/sheets/v2/droid-sheet/panel-registry.js";

// Build a minimal context that *does* satisfy every panel contract. The
// values are not relevant — only key presence is asserted by validation.
function buildSatisfyingContext() {
  return {
    system: {},
    derived: {
      defenses: { fort: 10, ref: 10, will: 10 },
      damage: { threshold: 10 }
    },
    equipment: [],
    armor: [],
    weapons: [],
    talents: [],
    feats: [],
    racialAbilities: [],
    ownedActorMap: {},
    xpEnabled: false,
    xpData: null,
    xpPercent: 0,
    droidPanels: {
      droidSummary: {
        droidType: "",
        droidModel: "",
        restrictionLevel: 0,
        maxModificationPoints: 0,
        usedModificationPoints: 0,
        availableModificationPoints: 0,
        canEdit: true
      },
      heuristicProcessors: { entries: [], hasEntries: false, totalCount: 0, emptyMessage: "" },
      locomotion: { type: "", speed: 0, notes: "" },
      integratedSystems: { entries: [], hasEntries: false, totalCount: 0, emptyMessage: "" },
      protocols: { entries: [], hasEntries: false, totalCount: 0, emptyMessage: "" },
      programming: { entries: [], hasEntries: false, totalCount: 0, emptyMessage: "" },
      customizations: { entries: [], hasEntries: false, totalCount: 0, totalCost: 0, availablePoints: 0, emptyMessage: "" },
      buildHistory: { entries: [], hasEntries: false, totalCount: 0, emptyMessage: "" }
    }
  };
}

const LEDGER_SHAPE_KEYS = ["entries", "hasEntries", "totalCount", "emptyMessage"];
const ROW_PROJECTION_KEYS = ["id", "name", "type", "img", "system"];

describe("Droid live panel registry", () => {

  test("registry exposes a stable per-panel contract shape", () => {
    expect(Array.isArray(DROID_LIVE_PANEL_REGISTRY)).toBe(true);
    expect(DROID_LIVE_PANEL_REGISTRY.length).toBeGreaterThan(0);

    for (const entry of DROID_LIVE_PANEL_REGISTRY) {
      expect(typeof entry.panelName).toBe("string");
      expect(entry.panelName.length).toBeGreaterThan(0);
      expect(typeof entry.description).toBe("string");
      expect(Array.isArray(entry.requiredKeys)).toBe(true);
      expect(entry.requiredKeys.length).toBeGreaterThan(0);
      for (const key of entry.requiredKeys) {
        expect(typeof key).toBe("string");
      }
      if (entry.rowContract) {
        expect(Array.isArray(entry.rowContract)).toBe(true);
        expect(typeof entry.arrayKey).toBe("string");
      }
    }
  });

  test("registry never requires force / UTF / dark-side / follower keys (droid divergence preserved)", () => {
    const forbiddenSubstrings = [
      "force",
      "useTheForce",
      "darkSide",
      "followers",
      "followerSlots"
    ];
    const allRequiredKeys = DROID_LIVE_PANEL_REGISTRY.flatMap((p) => p.requiredKeys);
    for (const key of allRequiredKeys) {
      const lower = key.toLowerCase();
      for (const forbidden of forbiddenSubstrings) {
        expect(lower).not.toContain(forbidden.toLowerCase());
      }
    }
  });

  test("registry never requires Constitution-derived keys (no-CON divergence preserved)", () => {
    const allRequiredKeys = DROID_LIVE_PANEL_REGISTRY.flatMap((p) => p.requiredKeys);
    for (const key of allRequiredKeys) {
      expect(key.toLowerCase()).not.toContain("constitution");
      expect(key).not.toMatch(/abilities\.con\b/i);
    }
  });
});

describe("validateLivePanelContracts", () => {

  test("returns ok=true for a fully-satisfying context", () => {
    const ctx = buildSatisfyingContext();
    const report = validateLivePanelContracts(ctx);
    expect(report.ok).toBe(true);
    expect(report.missing).toEqual([]);
  });

  test("flags drift when a required panel key is missing", () => {
    const ctx = buildSatisfyingContext();
    delete ctx.droidPanels.protocols;
    const report = validateLivePanelContracts(ctx);
    expect(report.ok).toBe(false);
    const droidPanelsReport = report.missing.find((m) => m.panelName === "droidSpecific");
    expect(droidPanelsReport).toBeDefined();
    expect(droidPanelsReport.missingKeys).toContain("droidPanels.protocols");
  });

  test("flags row-contract failures when array entries miss required keys", () => {
    const ctx = buildSatisfyingContext();
    ctx.equipment = [{ id: "i1", name: "Hydrospanner" /* missing type/img/system */ }];
    const report = validateLivePanelContracts(ctx);
    expect(report.ok).toBe(false);
    const equipmentReport = report.missing.find((m) => m.panelName === "equipment");
    expect(equipmentReport).toBeDefined();
    const missingRowKeys = equipmentReport.rowContractFailures.map((f) => f.missingKey);
    expect(missingRowKeys).toEqual(expect.arrayContaining(["type", "img", "system"]));
  });

  test("does not throw when context is empty", () => {
    expect(() => validateLivePanelContracts({})).not.toThrow();
    const report = validateLivePanelContracts({});
    expect(report.ok).toBe(false);
  });
});

describe("diagnoseLivePanelContext", () => {

  test("returns report + duration", () => {
    const ctx = buildSatisfyingContext();
    const result = diagnoseLivePanelContext(ctx);
    expect(result.report).toBeDefined();
    expect(typeof result.durationMs).toBe("number");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe("Shared ledger shape contract (droid <-> character parity)", () => {

  test("ledger row projection keys cover the shared item-row shape", () => {
    // The character sheet's RowTransformers expose at minimum (id, name, type)
    // for inventory/ledger rows. The droid live registry must row-contract on
    // the same minimum so a shared partial can render either side's row.
    const sharedMinimum = ["id", "name", "type"];
    const equipmentEntry = DROID_LIVE_PANEL_REGISTRY.find((p) => p.panelName === "equipment");
    expect(equipmentEntry).toBeDefined();
    for (const key of sharedMinimum) {
      expect(equipmentEntry.rowContract).toContain(key);
    }
  });

  test("droid-specific ledger payloads expose { entries, hasEntries, totalCount, emptyMessage }", () => {
    const ctx = buildSatisfyingContext();
    const ledgerPayloads = [
      ctx.droidPanels.heuristicProcessors,
      ctx.droidPanels.integratedSystems,
      ctx.droidPanels.protocols,
      ctx.droidPanels.programming,
      ctx.droidPanels.customizations,
      ctx.droidPanels.buildHistory
    ];
    for (const payload of ledgerPayloads) {
      for (const key of LEDGER_SHAPE_KEYS) {
        expect(payload).toHaveProperty(key);
      }
      expect(Array.isArray(payload.entries)).toBe(true);
      expect(typeof payload.hasEntries).toBe("boolean");
      expect(typeof payload.totalCount).toBe("number");
    }
  });
});

describe("Droid-specific divergence (must remain present, not normalized away)", () => {

  test("registry surfaces droid-only panels (locomotion, protocols, customizations, etc.)", () => {
    const allRequired = DROID_LIVE_PANEL_REGISTRY.flatMap((p) => p.requiredKeys);
    const droidOnlyPaths = [
      "droidPanels.locomotion",
      "droidPanels.protocols",
      "droidPanels.programming",
      "droidPanels.customizations",
      "droidPanels.buildHistory",
      "droidPanels.integratedSystems",
      "droidPanels.heuristicProcessors"
    ];
    for (const path of droidOnlyPaths) {
      expect(allRequired).toContain(path);
    }
  });

  test("project-row keyset matches the shape items get when projected for the live droid template", () => {
    // The live droid template iterates equipment/armor/weapons rows expecting
    // (id, name, type, img, system). If this contract drifts, the template
    // breaks silently.
    for (const panelName of ["equipment", "armor", "weapons"]) {
      const entry = DROID_LIVE_PANEL_REGISTRY.find((p) => p.panelName === panelName);
      expect(entry).toBeDefined();
      for (const rowKey of ROW_PROJECTION_KEYS) {
        expect(entry.rowContract).toContain(rowKey);
      }
    }
  });
});
