import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Architectural-invariant tests for
// docs/audits/compendium-interaction-forensics-2026-08.md.
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

// ---------------------------------------------------------------------------
// Invariant 5 — the diagnostic module never mutates production UI, regardless
// of debug-gate state (a diagnostic module that only *logs* conditionally but
// *mutates* unconditionally would still be unsafe).
// ---------------------------------------------------------------------------
{
  const forensics = read('scripts/core/compendium-interaction-forensics.js');
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
      `compendium-interaction-forensics.js must never call ${pattern} — it is a read-only instrument`
    );
  }
}

// ---------------------------------------------------------------------------
// Invariant — the Phase 9 native-only diagnostic toggle is a strict one-shot:
// it must disarm itself (set the flag back to false) in the same branch that
// reads it, so it can never silently stay armed and change behavior for more
// than the single click the operator intended.
// ---------------------------------------------------------------------------
{
  const repair = read('scripts/core/compendium-directory-click-repair.js');
  const armCheck = repair.match(
    /if\s*\(\s*globalThis\.SWSE_DEBUG_COMPENDIUM_NATIVE_ONLY\s*===\s*true\s*\)\s*\{\s*globalThis\.SWSE_DEBUG_COMPENDIUM_NATIVE_ONLY\s*=\s*false\s*;/
  );
  assert.ok(armCheck, 'SWSE_DEBUG_COMPENDIUM_NATIVE_ONLY must be read and immediately disarmed (set to false) in the same guarded block, guaranteeing exactly one diagnostic click.');
}

// ---------------------------------------------------------------------------
// Invariant 4 — the compendium click repair remains debug-instrumentable
// (the existing _isDebug()/_dlog() pattern must still exist; forensics reuses
// this pattern rather than reinventing a parallel debug-gate mechanism).
// ---------------------------------------------------------------------------
{
  const repair = read('scripts/core/compendium-directory-click-repair.js');
  assert.match(repair, /function _isDebug\s*\(\s*\)/);
  assert.match(repair, /SWSE_DEBUG_COMPENDIUMS/);
}

// ---------------------------------------------------------------------------
// Invariant — instrumentation must install BEFORE the click-repair fallback
// registers, in index.js's init hook, so its document-capture stage observes
// clicks before the fallback's own document-capture listener can
// stopImmediatePropagation() them. This is a strict ordering requirement,
// not a style preference — see Phase 2 of the audit doc.
// ---------------------------------------------------------------------------
{
  const indexJs = read('index.js');
  // Match only the actual call statements (leading whitespace, no trailing
  // comment context) — not the import line or the explanatory comment above
  // the calls, both of which also contain these substrings.
  const forensicsIdx = indexJs.search(/^\s*installCompendiumInteractionForensics\(\);/m);
  const repairIdx = indexJs.search(/^\s*registerCompendiumDirectoryClickRepair\(\);/m);
  assert.ok(forensicsIdx > -1, 'index.js must call installCompendiumInteractionForensics()');
  assert.ok(repairIdx > -1, 'index.js must call registerCompendiumDirectoryClickRepair()');
  assert.ok(
    forensicsIdx < repairIdx,
    'installCompendiumInteractionForensics() must be called before registerCompendiumDirectoryClickRepair() so the forensics document-capture listener registers first'
  );
}

// ---------------------------------------------------------------------------
// Invariant 3 (regression-pinned) — capture-phase click listeners on
// document/window that can call stop*Propagation for a compendium-scoped
// target must be an explicit, reviewed, closed set. This test runs the
// static interference auditor and pins the CURRENT known set of HIGH
// findings. Any new unexplained finding (a new stray capture listener, or a
// new unscoped #compendium DOM mutation) changes this count and must be
// triaged into either a fix or a reviewed, justified allowlist entry in
// tools/audit-sidebar-compendium-interference.mjs — never silently ignored.
// ---------------------------------------------------------------------------
{
  const result = spawnSync(process.execPath, ['tools/audit-sidebar-compendium-interference.mjs'], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, `audit-sidebar-compendium-interference.mjs must run cleanly in report mode: ${result.stderr}`);

  const output = result.stdout;

  // Known, currently-unresolved findings from the 2026-08 audit — see the
  // "Static findings" section of docs/audits/compendium-interaction-forensics-2026-08.md.
  // These are intentionally NOT fixed by this test/PR (audit discipline:
  // instrument and report, don't repair mid-investigation).
  const expectedHighFindings = [
    'scripts/core/compendium-directory-click-repair.js:583', // self-masking capture listener (Phase 2/3/8 of the audit)
    'scripts/core/hardening-init.js:78',                      // classList.remove() on #compendium despite the file's own comment — but see below: hardening-init.js is dead code, never imported
    'scripts/core/hardening-init.js:92'                       // .style.removeProperty() reached via the same loop
  ];
  for (const finding of expectedHighFindings) {
    assert.ok(output.includes(finding), `Expected known HIGH finding "${finding}" in audit output — if this is now fixed, update this pin AND the audit doc together.`);
  }

  const highCount = (output.match(/^--- HIGH \((\d+)\)/m) ?? [])[1];
  assert.equal(
    Number(highCount),
    expectedHighFindings.length,
    `Expected exactly ${expectedHighFindings.length} unallowlisted HIGH finding(s); got ${highCount}. A new finding must be triaged (fixed, or added to tools/audit-sidebar-compendium-interference.mjs's ALLOWLIST with a written justification), not silently absorbed.`
  );
}

// ---------------------------------------------------------------------------
// Invariant — hardening-init.js's _restoreSidebarDefaults is confirmed dead
// code: nothing in the live system imports scripts/core/hardening-init.js.
// This is a load-bearing fact for the audit's H1 conclusion (the function
// that mutates #compendium's classList never runs), so it is pinned here as
// a regression guard: if anything starts importing hardening-init.js, this
// test fails and forces the audit's H1 section to be re-evaluated against
// live wiring instead of stale static analysis.
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

console.log('compendium-interaction-forensics-invariants.test.mjs: all assertions passed');
