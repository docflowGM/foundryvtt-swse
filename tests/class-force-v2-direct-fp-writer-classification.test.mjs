// Classification guard for direct Force Point writers (Decision A). No single grep proves completeness, so this pins the set found by
// a deliberately broad scan and requires every file to carry an explicit classification. A NEW file that writes the Force Point
// balance fails this test until someone classifies it (spend -> V2 spendForcePoints; otherwise a documented exemption).
// Offline; not FOUNDRY_TESTED.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const walk = (d, out = []) => { for (const e of readdirSync(d)) { const p = join(d, e); const s = statSync(p); if (s.isDirectory()) walk(p, out); else if (p.endsWith('.js')) out.push(p); } return out; };
const PATTERNS = [
  /forcePoints(\.value)?["']?\s*:\s*[^,}\n]*(-|\bnew|current|remaining|\bMath)/,
  /setForcePointsUpdate/, /forcePoints\.value\s*(-=|\+=|=[^=])/,
  /["']system\.forcePoints\.value["']\s*:/, /["']system\.forcePoints\.value["']\]\s*=/
];
const found = walk(join(root, 'scripts')).filter((f) => PATTERNS.some((re) => re.test(readFileSync(f, 'utf8')))).map((f) => relative(root, f)).sort();

// Classes: V2_INTERNAL | REGAIN_OR_RESET | MANUAL_ADJUSTMENT | CHARGEN_GRANT | TARGET_LOSS_EFFECT | EXEMPT_BY_SOURCE | HELPER | COMMENT_OR_READ_ONLY
//          | LEGACY_UNREACHABLE_PENDING_OWNER (static finding only; deletion/rerouting needs the owner's decision, see matrix §14)
const CLASSIFIED = {
  'scripts/governance/actor-engine/actor-engine.js': 'V2_INTERNAL',
  'scripts/actors/base/swse-actor-base.js': 'REGAIN_OR_RESET',
  'scripts/ui/shell/gm/controllers/GMWorkspaceSurfaceController.js': 'REGAIN_OR_RESET',
  'scripts/patches/follower-species-materialization-hotfix.js': 'REGAIN_OR_RESET',
  'scripts/sheets/v2/actor-sheet-base.js': 'REGAIN_OR_RESET',
  'scripts/sheets/v2/character-like-sheet.js': 'MANUAL_ADJUSTMENT',
  'scripts/sheets/v2/character-sheet/form.js': 'MANUAL_ADJUSTMENT',
  'scripts/apps/progression-framework/shell/mutation/progression-economy-plan-builder.js': 'CHARGEN_GRANT',
  'scripts/apps/progression-framework/shell/progression-finalizer.js': 'CHARGEN_GRANT',
  'scripts/engine/talent/sith-talent-actions.js': 'TARGET_LOSS_EFFECT', // Drain Force: the TARGET loses a point as the talent's printed effect
  'scripts/engine/talent/consular-talent-actions.js': 'EXEMPT_BY_SOURCE', // WatchCircle Initiate: "does not count as spending a Force Point"
  'scripts/utils/schema-adapters.js': 'HELPER',
  'scripts/utils/actor-utils.js': 'COMMENT_OR_READ_ONLY',
  'scripts/data/force-points.js': 'COMMENT_OR_READ_ONLY',
  'scripts/actors/derived/derived-calculator.js': 'COMMENT_OR_READ_ONLY',
  'scripts/engine/combat/reactions/reaction-rule-adapter.js': 'COMMENT_OR_READ_ONLY',
  'scripts/apps/force-alchemy/force-alchemy-mechanics-service.js': 'COMMENT_OR_READ_ONLY', // FP part is V2-routed; asserted below
  'scripts/engine/talent/talent-effect-engine.js': 'LEGACY_UNREACHABLE_PENDING_OWNER',
  'scripts/engine/talent/dark-side-devotee-mechanics.js': 'LEGACY_UNREACHABLE_PENDING_OWNER',
  'scripts/talents/DarkSidePowers.js': 'LEGACY_UNREACHABLE_PENDING_OWNER'
};
let n = 0; const ok = (l) => { n += 1; console.log(`  [${n}] ${l} OK`); };

{
  const unclassified = found.filter((f) => !CLASSIFIED[f]);
  assert.deepEqual(unclassified, [], `unclassified Force Point writers (classify, or route spends through ActorEngine.spendForcePoints): ${unclassified.join(', ')}`);
  const stale = Object.keys(CLASSIFIED).filter((f) => !found.includes(f));
  assert.deepEqual(stale, [], `classified files no longer match the scan (remove from the table): ${stale.join(', ')}`);
  ok('every file that writes a Force Point balance is explicitly classified, and the table has no stale entries');
}
{
  // The cut-over sites must stay clean: none of them may reappear in the scan.
  for (const f of ['scripts/engine/combat/combat-executor.js', 'scripts/engine/combat/weapons-engine.js', 'scripts/engine/abilities/active/active-adapter.js', 'scripts/engine/combat/threshold-engine.js']) assert.ok(!found.includes(f), `${f} must not write the Force Point balance directly`);
  const alchemy = readFileSync(join(root, 'scripts/apps/force-alchemy/force-alchemy-mechanics-service.js'), 'utf8');
  assert.doesNotMatch(alchemy, /updates\['system\.forcePoints\.value'\]/);
  ok('Decision A cut-over sites (executor, attunement, ActiveAdapter, threshold, Force Alchemy FP part) stay free of direct balance writes');
}
{
  // Static import-graph reachability from the one loaded entry point (system.json esmodules = index.js). Static evidence only:
  // world Macro documents / external callers cannot be seen from the repo (EXTERNAL_MACRO_UNVERIFIED).
  const sysMod = JSON.parse(readFileSync(join(root, 'system.json'), 'utf8')).esmodules;
  assert.deepEqual(sysMod, ['index.js'], 'only index.js is loaded; if this changes, redo the reachability manifest');
  const IMPORT = /(?:import\s[^'"]*?from\s*|import\s*|import\()\s*['"]([^'"]+)['"]|export\s[^'"]*?from\s*['"]([^'"]+)['"]/gs;
  const resolve = (spec, from) => { let p = null; if (spec.startsWith('/systems/foundryvtt-swse/')) p = join(root, spec.slice('/systems/foundryvtt-swse/'.length)); else if (spec.startsWith('.')) p = join(from, '..', spec); if (!p) return null; try { statSync(p); return p; } catch { return null; } };
  const seen = new Set([join(root, 'index.js')]); const queue = [...seen];
  while (queue.length) { const f = queue.shift(); let src; try { src = readFileSync(f, 'utf8'); } catch { continue; }
    for (const m of src.matchAll(IMPORT)) { const p = resolve(m[1] ?? m[2], f); if (p && p.endsWith('.js') && !seen.has(p)) { seen.add(p); queue.push(p); } } }
  const rel = (f) => relative(root, f);
  const inGraph = (f) => [...seen].some((p) => rel(p) === f);
  for (const f of ['scripts/engine/talent/light-side-talent-mechanics.js', 'scripts/talents/DarkSidePowers.js', 'scripts/engine/talent/dark-side-devotee-mechanics.js',
                   'scripts/talents/light-side-init.js', 'scripts/talents/dark-side-powers-init.js', 'scripts/talents/dark-side-devotee-init.js', 'scripts/talents/dark-side-init.js'])
    assert.ok(!inGraph(f), `${f} is now reachable from index.js: its Force Point costs must be routed through V2 before shipping`);
  assert.ok(inGraph('scripts/engine/talent/talent-effect-engine.js'), 'the planner module itself is loaded (via damage.js) but only its three unimported callers invoke the FP-debiting planners');
  ok('static import-graph from index.js: the three legacy plan callers and their macro initializers are NOT reachable');
}
console.log(`class-force-v2-direct-fp-writer-classification: ${n} checks passed`);
