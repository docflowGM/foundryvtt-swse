#!/usr/bin/env node
/**
 * State-aware Phase 3C CI gate. Production writes never happen here; this only READS the checked-out repository and
 * runs the battery that is valid for the state the packs are in.
 *
 *   PRE_STATE  (packs == Phase 3B certified pre-state)
 *     1. Phase 3B global closeout (re-derives all 14 manifests from the certified pre-state packs)
 *     2. apply-talent-phase-3c.mjs --check        committed dry-run report is current (packs, registry, fingerprints)
 *     3. audit-talent-phase-3c-independent.mjs    independent reference model, 18 invariants incl. second-run zero diff
 *     4. audit-talent-tree-membership.mjs         membership audit on the current packs
 *   POST_STATE (packs == Phase 3C certified post-state)
 *     1. apply-talent-phase-3c.mjs --verify --exact   proves the state from the committed manifests; never runs the builder
 *     2. build-talent-tree-registry.mjs --check       runtime registry == fresh generation from the packs
 *     3. audit-talent-tree-membership.mjs
 *   UNKNOWN_STATE: fail (the packs are neither certified state).
 */
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { detectPackState } from './apply-talent-phase-3c.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { state } = detectPackState(ROOT);
console.log(`[talent-phase-3c-ci] pack state: ${state}`);

const battery = {
  PRE_STATE: [
    ['Phase 3B global closeout', 'tools/check-talent-phase-3b-global-closeout.mjs'],
    ['Phase 3C dry-run report freshness', 'tools/apply-talent-phase-3c.mjs', '--check'],
    ['Phase 3C independent audit', 'tools/audit-talent-phase-3c-independent.mjs'],
    ['talent/tree membership audit', 'tools/audit-talent-tree-membership.mjs']
  ],
  POST_STATE: [
    ['Phase 3C post-state verification (exact)', 'tools/apply-talent-phase-3c.mjs', '--verify', '--exact'],
    ['runtime registry freshness', 'tools/build-talent-tree-registry.mjs', '--check'],
    ['talent/tree membership audit', 'tools/audit-talent-tree-membership.mjs']
  ],
  UNKNOWN_STATE: []
};

if (state === 'UNKNOWN_STATE') {
  console.error('[talent-phase-3c-ci] FAIL: packs/talents.db + packs/talent_trees.db are neither the Phase 3B certified pre-state nor the Phase 3C certified post-state.');
  process.exit(1);
}
let failed = 0;
for (const [label, script, ...args] of battery[state]) {
  console.log(`\n[talent-phase-3c-ci] ==> ${label}`);
  const r = spawnSync(process.execPath, [path.join(ROOT, script), ...args], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) { failed++; console.error(`[talent-phase-3c-ci] FAIL: ${label} (exit ${r.status})`); }
}
if (failed) process.exit(1);
console.log(`\n[talent-phase-3c-ci] PASS: ${battery[state].length} checks (${state})`);
