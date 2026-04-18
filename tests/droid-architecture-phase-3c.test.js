/**
 * Phase 3C: final droid architecture regression tests.
 *
 * Phase 3C resolved the two-implementation confusion around the droid
 * sheet by deleting the dormant `scripts/sheets/v2/droid/*` tree and the
 * parallel `templates/v2/droid/*` templates, and by collapsing the
 * duplicate `Actors.registerSheet(DroidSheet, ...)` call in `index.js`.
 *
 * These tests are structural guardrails — if any of them fail, someone
 * has resurrected a retired droid path (or a stale import slipped in).
 *
 * Coverage:
 *   - The dormant `scripts/sheets/v2/droid/` directory is gone.
 *   - The dormant `templates/v2/droid/` directory is gone.
 *   - No live file imports from the removed dormant paths.
 *   - index.js registers exactly one droid sheet (the live one).
 *   - The live drag/dragover listeners now honor the render AbortSignal.
 *   - The live panel-registry + context-builder modules still load.
 */

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

import {
  DROID_LIVE_PANEL_REGISTRY,
  validateLivePanelContracts
} from "/systems/foundryvtt-swse/scripts/sheets/v2/droid-sheet/panel-registry.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

function repoPath(...segments) {
  return path.join(REPO_ROOT, ...segments);
}

describe("Phase 3C — dormant droid tree is removed", () => {

  test("scripts/sheets/v2/droid/ directory no longer exists", () => {
    expect(fs.existsSync(repoPath("scripts/sheets/v2/droid"))).toBe(false);
  });

  test("templates/v2/droid/ directory no longer exists", () => {
    expect(fs.existsSync(repoPath("templates/v2/droid"))).toBe(false);
  });

  test.each([
    "scripts/sheets/v2/droid/DroidSheet.js",
    "scripts/sheets/v2/droid/DroidPanelContextBuilder.js",
    "scripts/sheets/v2/droid/DroidPanelValidators.js",
    "scripts/sheets/v2/droid/DroidPanelVisibilityManager.js",
    "scripts/sheets/v2/droid/PANEL_REGISTRY.js",
    "templates/v2/droid/droid-sheet.hbs",
    "templates/v2/droid/droid-sheet-header.hbs",
    "templates/v2/droid/droid-sheet-tabs.hbs",
    "templates/v2/droid/droid-sheet-body.hbs"
  ])("retired dormant file %s is absent", (relPath) => {
    expect(fs.existsSync(repoPath(relPath))).toBe(false);
  });
});

describe("Phase 3C — no live code references the retired dormant paths", () => {

  const LIVE_SOURCES = [
    "index.js",
    "scripts/sheets/v2/droid-sheet.js",
    "scripts/sheets/v2/droid-sheet/context-builder.js",
    "scripts/sheets/v2/droid-sheet/listeners.js",
    "scripts/sheets/v2/droid-sheet/panel-registry.js",
    "scripts/core/load-templates.js"
  ];

  const FORBIDDEN_IMPORT_PATTERNS = [
    /import\s+[^;]*from\s+["'][^"']*scripts\/sheets\/v2\/droid\/[^"']+["']/,
    /import\s+[^;]*\bDroidSheet\b[^;]*from/,
    /import\s+[^;]*\bDroidPanelContextBuilder\b[^;]*from/,
    /import\s+[^;]*\bDroidPanelValidators\b[^;]*from/,
    /import\s+[^;]*\bDroidPanelVisibilityManager\b[^;]*from/
  ];

  test.each(LIVE_SOURCES)("%s has no import referencing the retired dormant tree", (relPath) => {
    const abs = repoPath(relPath);
    expect(fs.existsSync(abs)).toBe(true);
    const src = fs.readFileSync(abs, "utf8");
    for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
      expect(src).not.toMatch(pattern);
    }
  });
});

describe("Phase 3C — index.js registers exactly one droid sheet", () => {

  const indexSrc = fs.readFileSync(repoPath("index.js"), "utf8");

  test("exactly one registerSheet call targets types: [\"droid\"]", () => {
    const matches = indexSrc.match(/registerSheet\([^)]*types:\s*\[\s*["']droid["']\s*\][^)]*\)/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  test("the live SWSEV2DroidSheet is the one being registered", () => {
    expect(indexSrc).toMatch(/registerSheet\(\s*["']foundryvtt-swse["']\s*,\s*SWSEV2DroidSheet\s*,/);
  });

  test("no stale `DroidSheet` identifier remains in index.js", () => {
    expect(indexSrc).not.toMatch(/\bDroidSheet\b/);
  });
});

describe("Phase 3C — drag/dragover listeners honor the render AbortSignal", () => {

  const listenersSrc = fs.readFileSync(
    repoPath("scripts/sheets/v2/droid-sheet/listeners.js"),
    "utf8"
  );

  test("wireDragAndDrop accepts `signal` (not `_signal`)", () => {
    expect(listenersSrc).toMatch(/function\s+wireDragAndDrop\s*\(\s*sheet\s*,\s*root\s*,\s*signal\s*\)/);
    expect(listenersSrc).not.toMatch(/function\s+wireDragAndDrop\s*\([^)]*\b_signal\b/);
  });

  test("both dragover and drop listeners pass `{ signal }`", () => {
    // We require exactly two `{ signal }`-tagged addEventListener calls inside
    // the wireDragAndDrop function body.
    const fnStart = listenersSrc.indexOf("function wireDragAndDrop");
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = listenersSrc.slice(fnStart, fnStart + 800);
    const signaled = fnBody.match(/addEventListener\([^)]*\{\s*signal\s*\}/g) ?? [];
    expect(signaled.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Phase 3C — live droid panel registry + context builder still load", () => {

  test("DROID_LIVE_PANEL_REGISTRY is a populated frozen array", () => {
    expect(Array.isArray(DROID_LIVE_PANEL_REGISTRY)).toBe(true);
    expect(DROID_LIVE_PANEL_REGISTRY.length).toBeGreaterThan(0);
    expect(Object.isFrozen(DROID_LIVE_PANEL_REGISTRY)).toBe(true);
  });

  test("validateLivePanelContracts tolerates an empty context (non-throwing)", () => {
    expect(() => validateLivePanelContracts({})).not.toThrow();
  });
});
