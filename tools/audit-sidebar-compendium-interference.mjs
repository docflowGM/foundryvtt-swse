#!/usr/bin/env node

/**
 * audit-sidebar-compendium-interference.mjs
 *
 * Static scanner supporting docs/audits/compendium-interaction-forensics-2026-08.md.
 * Scans ACTIVE runtime JS (scripts/) and CSS (styles/, as declared in
 * system.json) for patterns that could plausibly interfere with the native
 * Foundry v13 CompendiumDirectory sidebar app: DOM mutation of #compendium,
 * broad document-capture click listeners that can stop propagation inside
 * it, MutationObservers rooted near the sidebar, and CSS that could steal
 * hit-testing from the compendium panel.
 *
 * This is a classification aid, not a verdict machine: every finding is
 * reported with file:line and a short reason, categorized HIGH/MEDIUM/LOW/
 * INFORMATIONAL using a small, explicit, human-reviewed allowlist for known
 * intentional patterns (see ALLOWLIST below). It does not fail CI on its
 * own judgement; pass --strict to exit non-zero on any HIGH finding whose
 * exact file:line is not in the allowlist.
 *
 * Report-only by default.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const STRICT = process.argv.includes('--strict');

// ---------------------------------------------------------------------------
// Known-safe, human-reviewed findings. Each entry documents WHY it's safe so
// the allowlist can't silently grow into a rubber stamp.
// ---------------------------------------------------------------------------
const ALLOWLIST = new Map([
  [
    'scripts/core/compendium-directory-click-repair.js:553',
    'Writes a dataset flag (data-swseCompendiumClickRepairInstalled) onto the ' +
    'compendium root as an idempotency guard. Does not touch classList/style/ ' +
    'innerHTML and has no effect on native action delegation.'
  ],
  [
    'scripts/core/compendium-interaction-forensics.js',
    'Diagnostic-only forensics module audited in this same doc; never calls ' +
    'preventDefault/stopPropagation/stopImmediatePropagation and never mutates DOM.'
  ],
  [
    'scripts/infrastructure/hooks/actor-sidebar-controls.js',
    'DOM mutations here (row.className, button.className/innerHTML/setAttribute, ' +
    'header.append) are gated by isActorDirectoryRoot(), which requires ' +
    'documentName==="actor"/id==="actors"/tab==="actors" AND explicitly excludes ' +
    'anything inside #sidebar-tabs (isInsideSidebarTabs()). The generic ' +
    '[data-application-part="directory"] selector token this scanner keys on is a ' +
    'false-positive trigger here — verified by reading getLiveActorDirectoryRoot()/ ' +
    'isActorDirectoryRoot() in full; none of these candidates can resolve to #compendium.'
  ]
]);

const findings = [];

function addFinding(severity, file, line, message) {
  findings.push({ severity, file, line, message, key: `${file}:${line}` });
}

function relPath(p) {
  return path.relative(ROOT, p).replaceAll(path.sep, '/');
}

function walk(dir, extFilter) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      out.push(...walk(full, extFilter));
    } else if (extFilter(full)) {
      out.push(full);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// JS scan
// ---------------------------------------------------------------------------
const COMPENDIUM_SELECTOR_HINT = /#compendium|\.compendium-sidebar|\[data-tab=["']compendium["']\]|\[data-application-part=["']directory["']\]/;
const DOM_MUTATION_METHODS = /\.(classList\.(add|remove|toggle)|className\s*=|style\.[a-zA-Z]+\s*=|style\.setProperty|style\.removeProperty|setAttribute|removeAttribute|append|prepend|before|after|replaceWith|replaceChildren|innerHTML\s*=|outerHTML\s*=)/;
const CAPTURE_LISTENER = /addEventListener\s*\(\s*['"]click['"]\s*,[^)]*\{\s*capture\s*:\s*true/s;
const STOP_PROPAGATION = /stopImmediatePropagation|stopPropagation/;

function scanJsFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  const rel = relPath(file);

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;

    // 1. DOM mutation methods on lines that also reference a compendium-ish
    // selector token somewhere in a small surrounding window (mutation call
    // and selector lookup are often a few lines apart via a variable).
    if (DOM_MUTATION_METHODS.test(line)) {
      // Widened to the enclosing function's likely span (coarse: 60 lines
      // back) rather than a tight 6-line window, because the mutated
      // variable is frequently assigned from a querySelectorAll(...) call
      // many lines above the actual .classList.remove()/etc. call site.
      const windowStart = Math.max(0, idx - 60);
      const windowText = lines.slice(windowStart, idx + 1).join('\n');
      if (COMPENDIUM_SELECTOR_HINT.test(windowText)) {
        addFinding('HIGH', rel, lineNo, `DOM mutation near a compendium-scoped selector: ${line.trim().slice(0, 140)}`);
      }
    }

    // 2. document/window-level capture click listeners anywhere (severity
    // depends on whether the same file also stops propagation — a capture
    // listener that never stops propagation can't mask native delegation).
    if (/document\.addEventListener\s*\(\s*['"]click['"]/.test(line) || /window\.addEventListener\s*\(\s*['"]click['"]/.test(line)) {
      const windowText = lines.slice(idx, Math.min(lines.length, idx + 4)).join('\n');
      const isCapture = /capture\s*:\s*true/.test(windowText) || /,\s*true\s*\)/.test(windowText);
      if (isCapture) {
        // Check whether this file, anywhere, can stop propagation gated on
        // reaching compendium DOM — a coarse but useful proxy.
        const fileCanStop = STOP_PROPAGATION.test(text) && COMPENDIUM_SELECTOR_HINT.test(text);
        addFinding(
          fileCanStop ? 'HIGH' : 'MEDIUM',
          rel,
          lineNo,
          `Document/window-level capture-phase click listener${fileCanStop ? ' in a file that also calls stop*Propagation and references compendium selectors — can plausibly consume a compendium click before native bubble-phase delegation runs' : ''}.`
        );
      }
    }

    // 3. MutationObserver construction
    if (/new\s+MutationObserver\s*\(/.test(line)) {
      const windowText = lines.slice(idx, Math.min(lines.length, idx + 20)).join('\n');
      const scopedToCompendium = COMPENDIUM_SELECTOR_HINT.test(windowText) || /['"]#compendium['"]/.test(windowText);
      const scopedToSidebar = /#sidebar\b/.test(windowText) && !scopedToCompendium;
      if (scopedToCompendium) {
        addFinding('MEDIUM', rel, lineNo, 'MutationObserver appears scoped near #compendium — verify read-only.');
      } else if (scopedToSidebar) {
        addFinding('LOW', rel, lineNo, 'MutationObserver scoped near #sidebar (structurally contains #compendium) — verify it does not observe into the compendium subtree with subtree:true and a mutating callback.');
      }
    }

    // 4. Legacy AppV2 defaultOptions compatibility bridges with a fresh-object mergeObject target
    if (/mergeObject\s*\(\s*\{\}\s*,\s*this\.DEFAULT_OPTIONS/.test(line)) {
      addFinding('MEDIUM', rel, lineNo, 'mergeObject({}, this.DEFAULT_OPTIONS) — Foundry mergeObject does not deep-clone values inserted for keys absent on the target, so nested option objects (position/window/actions) can end up reference-shared with the static class-level DEFAULT_OPTIONS. Verify nothing downstream mutates the returned object in place.');
    }
  });
}

// ---------------------------------------------------------------------------
// CSS scan
// ---------------------------------------------------------------------------
function loadManifestStyles() {
  const manifestPath = path.join(ROOT, 'system.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return (manifest.styles ?? []).map(p => path.join(ROOT, p));
}

const CSS_TARGET_SELECTOR = /#sidebar\b|#compendium\b|\.compendium-sidebar|\.directory-list|\.directory-item\b/;
const CSS_BROAD_SELECTOR = /(^|,|\s)(body|html|#sidebar)(\s|,|::|\{|$)/;

function scanCssFile(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  const rel = relPath(file);

  // Very small, non-parser rule scanner: find selector lines (end with `{`)
  // and inspect the immediate declaration block for risky properties when
  // the selector references sidebar/compendium/directory tokens.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('{')) continue;
    const selector = line.slice(0, line.indexOf('{')).trim();
    if (!selector || selector.startsWith('@')) continue;
    if (!CSS_TARGET_SELECTOR.test(selector)) continue;

    // Collect the declaration block (until matching closing brace at same nesting).
    let depth = 1;
    let j = i + 1;
    const decls = [];
    while (j < lines.length && depth > 0) {
      const l = lines[j];
      depth += (l.match(/\{/g) || []).length;
      depth -= (l.match(/\}/g) || []).length;
      if (depth > 0) decls.push(l);
      j++;
    }
    const block = decls.join('\n');

    const isFixedOrAbsolute = /position\s*:\s*(fixed|absolute)/.test(block);
    const zIndexMatch = block.match(/z-index\s*:\s*(-?\d+)/);
    const highZIndex = zIndexMatch && Number(zIndexMatch[1]) > 100;
    const pointerEventsAll = /pointer-events\s*:\s*(all|auto)\s*!important/.test(block);
    const isBroadSelector = CSS_BROAD_SELECTOR.test(selector);

    if (isFixedOrAbsolute && (isBroadSelector || highZIndex)) {
      addFinding('HIGH', rel, i + 1, `Selector "${selector.slice(0, 100)}" uses position:fixed/absolute with a broad selector and/or z-index>100 — verify it cannot visually or hit-test overlay the compendium panel.`);
    } else if (/pointer-events\s*:\s*none/.test(block) && CSS_TARGET_SELECTOR.test(selector) && !/::before|::after/.test(selector)) {
      addFinding('MEDIUM', rel, i + 1, `Selector "${selector.slice(0, 100)}" sets pointer-events:none on a sidebar/compendium/directory-scoped element (not a pseudo-element) — verify it does not shadow the pack rows themselves.`);
    } else if (highZIndex) {
      addFinding('LOW', rel, i + 1, `Selector "${selector.slice(0, 100)}" sets z-index>100 near sidebar/compendium selectors.`);
    } else {
      addFinding('INFORMATIONAL', rel, i + 1, `Selector "${selector.slice(0, 100)}" touches a sidebar/compendium/directory-scoped selector.`);
    }
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
const jsFiles = walk(path.join(ROOT, 'scripts'), f => f.endsWith('.js'));
for (const file of jsFiles) scanJsFile(file);

const cssFiles = loadManifestStyles();
for (const file of cssFiles) scanCssFile(file);

// Drop findings whose exact key is allowlisted, but keep a record they were suppressed.
const suppressed = [];
const active = findings.filter(f => {
  const allowed = ALLOWLIST.has(f.key) || ALLOWLIST.has(f.file);
  if (allowed) suppressed.push(f);
  return !allowed;
});

const bySeverity = { HIGH: [], MEDIUM: [], LOW: [], INFORMATIONAL: [] };
for (const f of active) bySeverity[f.severity].push(f);

console.log('========================================================================');
console.log('  SIDEBAR / COMPENDIUM INTERFERENCE AUDIT (static)');
console.log('========================================================================');
console.log(`Scanned ${jsFiles.length} JS file(s) under scripts/ and ${cssFiles.length} manifest-declared CSS file(s).`);
console.log(`Findings: ${active.length} active, ${suppressed.length} allowlisted.\n`);

for (const severity of ['HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL']) {
  const list = bySeverity[severity];
  if (!list.length) continue;
  console.log(`--- ${severity} (${list.length}) ---`);
  for (const f of list) {
    console.log(`  ${f.file}:${f.line}  ${f.message}`);
  }
  console.log('');
}

if (suppressed.length) {
  console.log(`--- ALLOWLISTED (${suppressed.length}) ---`);
  for (const f of suppressed) {
    console.log(`  ${f.file}:${f.line}  [${f.severity}] ${ALLOWLIST.get(f.key) ?? ALLOWLIST.get(f.file)}`);
  }
  console.log('');
}

if (STRICT && bySeverity.HIGH.length > 0) {
  console.error(`STRICT MODE: ${bySeverity.HIGH.length} unallowlisted HIGH finding(s). Failing.`);
  process.exit(1);
}

console.log('Audit complete (report-only unless --strict).');
