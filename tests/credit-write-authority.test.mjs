import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Transaction & Progression SSOT, Phase 7 (enforcement ratchet): every module that WRITES `system.credits` is named here with its classification. A new
// writer fails this test; a retired writer must be removed from the list (the list may only shrink). Reads and form-field type maps are not writes.
//   AUTHORITY      : the commerce/actor authorities (engine/store/**, governance/actor-engine/**) - not scanned.
//   PLAN_COMPILER  : compiles credit writes into a progression plan that ActorEngine applies atomically (single owner: ProgressionEconomyPlanBuilder).
//   LEGACY_DEBT    : a direct writer scheduled for retirement/rerouting through TransactionEngine (see transaction-progression-ssot-audit.md).
const ALLOWED = {
  'scripts/apps/progression-framework/shell/mutation/progression-economy-plan-builder.js': 'PLAN_COMPILER',
  'scripts/apps/follower-creator.js': 'LEGACY_DEBT: follower creation sets starting/zero credits (follower lifecycle; route through the provisional ledger)',
  'scripts/sheets/v2/actor-sheet-base.js': 'RESET: the blank-actor wipe writes credits 0 with the rest of the actor reset (not a grant, spend or transfer)',
  'scripts/engine/abilities/progression/progression-event-processor.js': 'LEGACY_DEBT: Wealth-talent credit grant; runtime-unreachable (test-only import: progression-credit-grant-idempotency), duplicates the plan compiler; retire with its test after owner confirmation',
  'scripts/engine/progression/engine/equipment-engine.js': 'LEGACY_DEBT: runtime-unreachable (only imported by the legacy confirm-step; both are pinned by tests, nothing registers them and system.json still ships confirm-step.css): retire as a unit with their tests once the owner confirms the legacy chargen confirm step is superseded',
};
// Write shapes: dotted-key object entries / assignments, compound assignment, setProperty/updateSource targets, nested `system: { credits: ... }` literals,
// computed or concatenated keys. Still a static text ratchet (a determined indirect write can evade it), not proof of authority.
const WRITE_RXS = [
  /['"]system\.credits['"]\s*(?::|\]\s*=)/,
  /system\.credits\s*(?:[-+*\/]|\?\?|\|\|)?=[^=]/,
  /(?:setProperty|updateSource|mergeObject)\s*\([^)]*['"]system\.credits['"]/,
  /\bsystem\s*:\s*\{[^}]*\bcredits\s*:/,
  /['"]system['"]\s*\]\s*\[\s*['"]credits['"]|\[\s*['"]credits['"]\s*\]\s*(?:[-+*\/]|\?\?|\|\|)?=[^=]/,
  /\.system\.credits\s*(?:\+\+|--)/,
];
const FORM_FIELD_MAP = /['"]system\.credits['"]\s*:\s*['"](?:number|Credits)['"]/; // field type / label maps are not writes
const WRITE = { test: (line) => WRITE_RXS.some((rx) => rx.test(line)) && !FORM_FIELD_MAP.test(line) };
const SKIP_DIRS = ['scripts/engine/store/', 'scripts/governance/actor-engine/'];

const out = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js')) out.push(p.replace(/\\/g, '/'));
  }
};
walk('scripts');
const writers = out.filter((p) => !SKIP_DIRS.some((d) => p.startsWith(d)))
  .filter((p) => fs.readFileSync(p, 'utf8').split('\n').some((l) => !/^\s*(\/\/|\*|\/\*)/.test(l) && WRITE.test(l)))
  .sort();

const unexpected = writers.filter((p) => !ALLOWED[p]);
assert.deepEqual(unexpected, [], `new direct system.credits writer(s): route credits through TransactionEngine/ProgressionEconomyPlanBuilder, or classify here with an owner-visible reason`);
const stale = Object.keys(ALLOWED).filter((p) => !writers.includes(p));
assert.deepEqual(stale, [], 'a listed writer no longer writes system.credits: remove it from the allowlist (the list may only shrink)');
// the finalizer no longer carries its own copy of the progression credit rules
const fin = fs.readFileSync('scripts/apps/progression-framework/shell/progression-finalizer.js', 'utf8');
assert.doesNotMatch(fin, /set\['system\.credits'\]/, 'ProgressionEconomyPlanBuilder is the only compiler of progression credit writes');
process.stdout.write(`credit-write-authority: ok (${writers.length} classified writers)\n`);
