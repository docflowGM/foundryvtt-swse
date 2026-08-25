import assert from 'node:assert/strict';
import { buildActionRegistry, unresolvedActions } from '../scripts/dev/sheet-action-registry.mjs';

// Phase 5A/5L — sheet action-integrity contract.
//
// Foundry's ApplicationV2 + global surface cannot be constructed under this
// repo's Node test harness (same limitation documented in
// tests/phase4-sheet-architecture-contract.test.mjs), so this is a source-text
// contract test: it derives, by scanning templates and controller files
// (scripts/dev/sheet-action-registry.mjs — not a hand-maintained action
// list), every `data-action="..."` rendered by the Character/NPC/Droid/
// Vehicle sheets, and asserts each one resolves to a reachable handler, a
// documented global delegated listener, a documented "verified live via a
// different selector" case, a documented "not actually rendered for this
// actor type" template-gate, or a documented INTENTIONALLY_DISABLED control.
//
// This MUST fail when a new data-action is added to a live template without
// a matching handler anywhere the scanner looks (see sheet-action-registry.mjs
// for what "anywhere" covers) and without adding it to one of that file's
// small, explicit, comment-justified allowlists.

const branches = await buildActionRegistry();

for (const branchName of ['vehicle', 'npc', 'commonElse']) {
  const branch = branches[branchName];
  assert.ok(branch, `expected a "${branchName}" render branch in the action registry`);
  assert.ok(branch.templateFiles.length > 10, `"${branchName}" branch should have resolved a non-trivial number of reachable templates (got ${branch.templateFiles.length})`);
  assert.ok(branch.actions.length > 10, `"${branchName}" branch should have found a non-trivial number of data-action attributes (got ${branch.actions.length})`);
}

const unresolved = unresolvedActions(branches);
assert.equal(
  unresolved.length,
  0,
  `Found ${unresolved.length} rendered data-action(s) with no reachable handler, global delegation, or documented allowlist entry:\n` +
  unresolved.map(u => `  [${u.branch}] ${u.action}  (in: ${u.templates.join(', ')})`).join('\n') +
  '\n\nEach one must become LIVE_HANDLED (wire it to a real handler), INTENTIONALLY_DISABLED (add to ' +
  'INTENTIONALLY_DISABLED_ACTIONS in scripts/dev/sheet-action-registry.mjs *and* actually disable it in the ' +
  'owning controller), or removed from the template if proven dead — see docs/audits/v2-phase-5-sheet-ux-action-integrity.md.'
);

// Every actor type must resolve to at least the shared base plus its own
// dedicated controller — guards against a future refactor accidentally
// merging branches back together without anyone noticing via this test.
const allActions = new Set();
for (const branch of Object.values(branches)) {
  for (const entry of branch.actions) allActions.add(entry.action);
}
assert.ok(allActions.has('set-condition-step'), 'sanity check: a known always-live action should be present in the registry');
assert.ok(allActions.has('open-force-alchemy-workbench'), 'sanity check: a known always-live action should be present in the registry');
