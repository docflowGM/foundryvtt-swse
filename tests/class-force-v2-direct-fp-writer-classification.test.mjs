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
// (The legacy Dark/Light Side talent planners were retired; see class-force-v2-legacy-talent-retirement.test.mjs.)
const CLASSIFIED = {
  'scripts/governance/actor-engine/point-ledgers.js': 'V2_INTERNAL', // 3N-AE.4: Force/Destiny ledger operations extracted from ActorEngine (persist only via engine.updateActor)
  'scripts/actors/base/swse-actor-base.js': 'REGAIN_OR_RESET',
  'scripts/ui/shell/gm/controllers/GMWorkspaceSurfaceController.js': 'REGAIN_OR_RESET',
  'scripts/domain/followers/follower-species-materialization.js': 'REGAIN_OR_RESET',
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
  'scripts/apps/force-alchemy/force-alchemy-mechanics-service.js': 'COMMENT_OR_READ_ONLY' // FP part is V2-routed; asserted below
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
console.log(`class-force-v2-direct-fp-writer-classification: ${n} checks passed`);
