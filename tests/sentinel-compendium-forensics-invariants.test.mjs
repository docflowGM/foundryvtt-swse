import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Architectural-invariant tests for
// docs/audits/compendium-interaction-forensics-2026-08.md, "Sentinel
// Architecture Alignment" section.
//
// These are static/source-level checks, matching this repo's established
// pattern (tools/check-*.mjs guard scripts) rather than a live-Foundry/DOM
// harness, since no DOM implementation (jsdom or otherwise) is available
// under plain Node in this repository (see tests/helpers/foundry-shim/ —
// it shims `foundry`/`game`/`ui` globals only, never `document`).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

const FORENSICS_PATH = 'scripts/governance/sentinel/sentinel-compendium-forensics.js';
const REPAIR_PATH = 'scripts/core/compendium-directory-click-repair.js';

// ---------------------------------------------------------------------------
// Ownership — the diagnostic must live under governance/sentinel/, not as an
// independent module elsewhere that merely coexists with Sentinel.
// ---------------------------------------------------------------------------
{
  assert.ok(
    fs.existsSync(path.join(ROOT, FORENSICS_PATH)),
    `Compendium interaction diagnostic must live at ${FORENSICS_PATH} (a Sentinel module), not as a standalone scripts/core/ subsystem.`
  );
  assert.ok(
    !fs.existsSync(path.join(ROOT, 'scripts/core/compendium-interaction-forensics.js')),
    'The pre-Sentinel-alignment standalone module (scripts/core/compendium-interaction-forensics.js) must not exist — it was superseded by the Sentinel-owned module.'
  );
}

// ---------------------------------------------------------------------------
// Sentinel owns lifecycle — the diagnostic registers itself as a
// SentinelEngine layer rather than self-installing unconditionally.
// ---------------------------------------------------------------------------
{
  const forensics = read(FORENSICS_PATH);
  assert.match(
    forensics,
    /SentinelEngine\.registerLayer\(\s*LAYER\s*,\s*\{\s*init:\s*_attachInstrumentation\s*\}\s*\)/,
    'sentinel-compendium-forensics.js must register itself via SentinelEngine.registerLayer(...) so Sentinel — not this module — decides whether/when it activates.'
  );

  // The listener-installing logic (document/root capture-bubble stages,
  // MutationObserver) must live ONLY inside the function passed to
  // registerLayer as `init` — never behind an independent top-level
  // Hooks.once('ready', ...)/Hooks.on(...) that would run regardless of
  // Sentinel's own enabled/mode state.
  const topLevelReadyHook = /^Hooks\.(once|on)\(\s*["']ready["']/m;
  assert.equal(
    topLevelReadyHook.test(forensics),
    false,
    'sentinel-compendium-forensics.js must not register its own independent Hooks.once("ready", ...) at module scope — installation must be driven exclusively by SentinelEngine calling the registered layer\'s init().'
  );
}

// ---------------------------------------------------------------------------
// No parallel initialization path in index.js — only Sentinel registration,
// no direct top-level "install the diagnostic" call outside that path.
// ---------------------------------------------------------------------------
{
  const indexJs = read('index.js');
  const forensicsIdx = indexJs.search(/^\s*registerCompendiumInteractionDiagnostic\(\);/m);
  const repairIdx = indexJs.search(/^\s*registerCompendiumDirectoryClickRepair\(\);/m);
  assert.ok(forensicsIdx > -1, 'index.js must call registerCompendiumInteractionDiagnostic() (the Sentinel layer registration entry point).');
  assert.ok(repairIdx > -1, 'index.js must call registerCompendiumDirectoryClickRepair().');
  assert.ok(
    forensicsIdx < repairIdx,
    'registerCompendiumInteractionDiagnostic() must be called before registerCompendiumDirectoryClickRepair() so — when the Sentinel layer is enabled — its document-capture stage registers, and therefore fires, before the fallback\'s own document-capture listener.'
  );

  assert.equal(
    /installCompendiumInteractionForensics/.test(indexJs),
    false,
    'index.js must not reference the old pre-Sentinel installCompendiumInteractionForensics() entry point.'
  );
}

// ---------------------------------------------------------------------------
// No duplicate diagnostic logger — the fallback reports observations into
// Sentinel via observeFallback(), rather than maintaining its own
// independent forensic history/ring buffer.
// ---------------------------------------------------------------------------
{
  const repair = read(REPAIR_PATH);
  assert.match(
    repair,
    /import\s*\{\s*observeFallback\s*\}\s*from\s*["'][^"']*sentinel-compendium-forensics\.js["']/,
    'compendium-directory-click-repair.js must import observeFallback from the Sentinel diagnostic module.'
  );

  const expectedObservations = ['fallback-reached', 'pack-resolved', 'native-only-bypass', 'consuming-event', 'render-succeeded', 'render-failed'];
  for (const type of expectedObservations) {
    assert.ok(
      repair.includes(`observeFallback(event, '${type}'`),
      `compendium-directory-click-repair.js must report a '${type}' observation into Sentinel via observeFallback().`
    );
  }

  // The fallback must not maintain its own bounded ring buffer of
  // finalized forensic records (that duplication is exactly what Sentinel
  // ownership is meant to eliminate).
  assert.equal(
    /const\s+(clickTraces|mutationLog)\s*=\s*\[\]/.test(repair),
    false,
    'compendium-directory-click-repair.js must not maintain its own click-trace/mutation ring buffer — that history belongs to Sentinel (SentinelEngine.#reportLog via observeFallback/SentinelEngine.report).'
  );
}

// ---------------------------------------------------------------------------
// No duplicate ring-buffer abstraction in the Sentinel module itself —
// finalized records must be stored via SentinelEngine.report(), not a
// second bounded array parallel to SentinelEngine's own #reportLog.
// ---------------------------------------------------------------------------
{
  const forensics = read(FORENSICS_PATH);
  assert.equal(
    /const\s+(clickTraces|mutationLog)\s*=\s*\[\]/.test(forensics),
    false,
    'sentinel-compendium-forensics.js must not maintain its own persistent ring buffer for finalized click traces/mutations — reuse SentinelEngine.report()/getReports() (SentinelEngine.#reportLog, bounded by SentinelConfig.MAX_REPORT_LOG) instead of a parallel history store.'
  );
  // The only local state permitted is transient (cleared per-event) or a
  // WeakMap (cannot leak into a report log with a live DOM reference).
  assert.match(forensics, /new WeakMap\(\)/, 'must use a WeakMap for DOM node identity (never a DOM mutation, never retained history).');
  assert.match(forensics, /SentinelEngine\.report\(/, 'finalized findings must be recorded via SentinelEngine.report(...).');
}

// ---------------------------------------------------------------------------
// Sentinel is the reporter — SWSE.debug.sentinel.diagnostics.compendium is
// wired to the same CompendiumInteractionDiagnostic object the layer uses,
// not a second, independent global namespace.
// ---------------------------------------------------------------------------
{
  const debugApi = read('scripts/governance/sentinel/sentinel-debug-api.js');
  assert.match(
    debugApi,
    /import\s*\{\s*CompendiumInteractionDiagnostic\s*\}\s*from\s*["'][^"']*sentinel-compendium-forensics\.js["']/
  );
  assert.match(
    debugApi,
    /diagnostics:\s*\{\s*compendium:\s*CompendiumInteractionDiagnostic\s*\}/,
    'SentinelDebugAPI must expose diagnostics.compendium as the canonical console surface (SWSE.debug.sentinel.diagnostics.compendium.*).'
  );

  assert.equal(
    /SWSE\.debug\.compendiumForensics\s*=/.test(read(FORENSICS_PATH)) || /SWSE\.debug\.compendiumForensics\s*=/.test(read('index.js')),
    false,
    'The old SWSE.debug.compendiumForensics global must not be independently installed — SWSE.debug.sentinel.diagnostics.compendium is the sole canonical surface.'
  );
}

// ---------------------------------------------------------------------------
// Non-mutating observation — the Sentinel diagnostic never mutates
// production UI or consumes events, regardless of enabled state.
// ---------------------------------------------------------------------------
{
  const forensics = read(FORENSICS_PATH);
  const forbiddenMutations = [
    /\.classList\.(add|remove|toggle)\s*\(/,
    /\.style\.[a-zA-Z]+\s*=/,
    /\.style\.(setProperty|removeProperty)\s*\(/,
    /\.innerHTML\s*=/,
    /\.outerHTML\s*=/,
    /\.setAttribute\s*\(/,
    /\.removeAttribute\s*\(/,
    /\.append\s*\(/,
    /\.prepend\s*\(/,
    /\.replaceWith\s*\(/,
    /\.replaceChildren\s*\(/,
    /\.preventDefault\s*\(/,
    /\.stopPropagation\s*\(/,
    /\.stopImmediatePropagation\s*\(/
  ];
  for (const pattern of forbiddenMutations) {
    assert.equal(
      pattern.test(forensics),
      false,
      `sentinel-compendium-forensics.js must never call ${pattern} — it is a read-only Sentinel diagnostic. armNativeOnlyClick() only sets a global flag; it never touches the DOM or an Event itself.`
    );
  }
}

// ---------------------------------------------------------------------------
// The Phase 9 native-only diagnostic toggle remains a strict one-shot,
// still owned and decided entirely by the fallback (Sentinel only records
// that it happened, via observeFallback('native-only-bypass', ...)).
// ---------------------------------------------------------------------------
{
  const repair = read(REPAIR_PATH);
  const armCheck = repair.match(
    /if\s*\(\s*globalThis\.SWSE_DEBUG_COMPENDIUM_NATIVE_ONLY\s*===\s*true\s*\)\s*\{\s*globalThis\.SWSE_DEBUG_COMPENDIUM_NATIVE_ONLY\s*=\s*false\s*;/
  );
  assert.ok(armCheck, 'SWSE_DEBUG_COMPENDIUM_NATIVE_ONLY must be read and immediately disarmed (set to false) in the same guarded block, guaranteeing exactly one diagnostic click.');
  assert.match(
    repair,
    /observeFallback\(event,\s*'native-only-bypass'/,
    'the native-only branch must report into Sentinel that the fallback deliberately abstained.'
  );
}

// ---------------------------------------------------------------------------
// The compendium click repair remains debug-instrumentable via its own
// pre-existing (unrelated to Sentinel ownership) debug gate.
// ---------------------------------------------------------------------------
{
  const repair = read(REPAIR_PATH);
  assert.match(repair, /function _isDebug\s*\(\s*\)/);
  assert.match(repair, /SWSE_DEBUG_COMPENDIUMS/);
}

// ---------------------------------------------------------------------------
// SentinelEngine.clearReports() supports a per-layer filter, so
// diagnostics.compendium.clear() clears only this diagnostic's evidence
// rather than every Sentinel layer's history — a minimal extension to the
// existing engine method rather than a parallel per-diagnostic store.
// ---------------------------------------------------------------------------
{
  const core = read('scripts/governance/sentinel/sentinel-core.js');
  assert.match(
    core,
    /static clearReports\(layerFilter = null\)\s*\{[\s\S]{0,300}filter\(r => r\.layer !== layerFilter\)/,
    'SentinelEngine.clearReports() must accept an optional layerFilter and, when given, remove only that layer\'s reports.'
  );
}

// ---------------------------------------------------------------------------
// Regression-pinned static interference audit — unchanged in substance from
// before the Sentinel alignment pass, only the file/line of the
// self-masking capture listener shifted with the refactor.
// ---------------------------------------------------------------------------
{
  const result = spawnSync(process.execPath, ['tools/audit-sidebar-compendium-interference.mjs'], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, `audit-sidebar-compendium-interference.mjs must run cleanly in report mode: ${result.stderr}`);

  const output = result.stdout;

  const expectedHighFindings = [
    'scripts/core/compendium-directory-click-repair.js:605', // self-masking capture listener (Phase 2/3/8 of the audit)
    'scripts/core/hardening-init.js:78',                      // classList.remove() on #compendium despite the file's own comment — dead code, never imported
    'scripts/core/hardening-init.js:92'                       // .style.removeProperty() reached via the same loop
  ];
  for (const finding of expectedHighFindings) {
    assert.ok(output.includes(finding), `Expected known HIGH finding "${finding}" in audit output — if the underlying code moved, update this pin; if it's now fixed, update this pin AND the audit doc together.`);
  }

  const highCount = (output.match(/^--- HIGH \((\d+)\)/m) ?? [])[1];
  assert.equal(
    Number(highCount),
    expectedHighFindings.length,
    `Expected exactly ${expectedHighFindings.length} unallowlisted HIGH finding(s); got ${highCount}. A new finding must be triaged (fixed, or added to tools/audit-sidebar-compendium-interference.mjs's ALLOWLIST with a written justification), not silently absorbed.`
  );
}

// ---------------------------------------------------------------------------
// hardening-init.js's _restoreSidebarDefaults is confirmed dead code:
// nothing in the live system imports scripts/core/hardening-init.js. This
// is a load-bearing fact for the audit's H1 conclusion, unaffected by the
// Sentinel alignment pass.
// ---------------------------------------------------------------------------
{
  const files = [];
  (function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) { walk(full); continue; }
      if (full.endsWith('.js') || full.endsWith('.mjs')) files.push(full);
    }
  })(path.join(ROOT, 'scripts'));
  files.push(path.join(ROOT, 'index.js'));

  const importPattern = /(?:from\s*|import\(|require\()\s*["'][^"']*hardening-init\.js["']/;
  const importers = files.filter((file) => {
    if (file === path.join(ROOT, 'scripts', 'core', 'hardening-init.js')) return false;
    const text = fs.readFileSync(file, 'utf8');
    return importPattern.test(text);
  });

  assert.deepEqual(
    importers.map(f => path.relative(ROOT, f)),
    [],
    'scripts/core/hardening-init.js is currently unimported dead code (confirmed by the 2026-08 compendium forensics audit). If this now fails, something started importing it — re-verify whether _restoreSidebarDefaults() runs at runtime before relying on this audit\'s H1 conclusion.'
  );
}

console.log('sentinel-compendium-forensics-invariants.test.mjs: all assertions passed');
