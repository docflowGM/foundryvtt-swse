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
 *   POST_STATE also runs the Phase 3D pre-state battery (dry-run report freshness, disposition checker, census).
 *   POST_3D_STATE (packs == Phase 3D certified post-state): 3D --verify --exact, registry freshness, membership audit,
 *     homebrew-pack integrity audit.
 *     plus the Phase 3E completeness gates (Gunslinger census, authority addendum, discovery census, publication reconciliation).
 *   POST_3E4_STATE (packs == Phase 3E-4 certified post-state, the seven-record canonical repair): 3E-4 --verify --exact, registry,
 *     membership, homebrew and the Phase 3E completeness gates.
 *   POST_3E5_STATE (packs == Phase 3E-5 certified post-state, the canonical text-defect repair): 3E-5 --verify --exact, the 3E-4 seven-record
 *     check, registry, membership, homebrew and the Phase 3E completeness gates. This is the Phase 3E final state.
 *   UNKNOWN_STATE: fail (the packs are not a certified state).
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
    ['talent/tree membership audit', 'tools/audit-talent-tree-membership.mjs'],
    ['Phase 3D disposition manifest', 'tools/check-talent-phase-3d-dispositions.mjs'],
    ['Phase 3D census freshness', 'tools/build-talent-phase-3d-census.mjs', '--check'],
    ['Phase 3D dry-run report freshness', 'tools/apply-talent-phase-3d.mjs', '--check']
  ],
  POST_3D_STATE: [
    ['Phase 3D post-state verification (exact)', 'tools/apply-talent-phase-3d.mjs', '--verify', '--exact'],
    ['runtime registry freshness', 'tools/build-talent-tree-registry.mjs', '--check'],
    ['talent/tree membership audit', 'tools/audit-talent-tree-membership.mjs'],
    ['homebrew talent-pack integrity audit', 'tools/audit-talent-homebrew-pack.mjs'],
    ['Phase 3E-4 dry-run report and manifest freshness', 'tools/apply-talent-phase-3e4.mjs', '--check'],
    ['Phase 3E core Gunslinger census', 'tools/census-talent-core-gunslinger.mjs', '--check'],
    ['Phase 3E authority addendum', 'tools/check-talent-phase-3e-additions.mjs'],
    ['Phase 3E discovery census', 'tools/census-talent-source-discovery.mjs', '--check'],
    ['Phase 3E publication-to-production reconciliation', 'tools/reconcile-talent-publication-corpus.mjs', '--check']
  ],
  POST_3E4_STATE: [
    ['Phase 3E-4 post-state verification (exact)', 'tools/apply-talent-phase-3e4.mjs', '--verify', '--exact'],
    ['runtime registry freshness', 'tools/build-talent-tree-registry.mjs', '--check'],
    ['talent/tree membership audit', 'tools/audit-talent-tree-membership.mjs'],
    ['homebrew talent-pack integrity audit', 'tools/audit-talent-homebrew-pack.mjs'],
    ['Phase 3E-5 text-defect manifest', 'tools/build-talent-phase-3e5-defect-manifest.mjs', '--check'],
    ['Phase 3E-5 text-repair dry-run freshness', 'tools/apply-talent-phase-3e5.mjs', '--check'],
    ['Phase 3E core Gunslinger census', 'tools/census-talent-core-gunslinger.mjs', '--check'],
    ['Phase 3E authority addendum', 'tools/check-talent-phase-3e-additions.mjs'],
    ['Phase 3E discovery census', 'tools/census-talent-source-discovery.mjs', '--check'],
    ['Phase 3E publication-to-production reconciliation', 'tools/reconcile-talent-publication-corpus.mjs', '--check']
  ],
  POST_3E5_STATE: [
    ['Phase 3E-5 post-state verification (exact)', 'tools/apply-talent-phase-3e5.mjs', '--verify', '--exact'],
    ['Phase 3E-4 seven-record repair still intact', 'tools/apply-talent-phase-3e4.mjs', '--verify'],
    ['runtime registry freshness', 'tools/build-talent-tree-registry.mjs', '--check'],
    ['talent/tree membership audit', 'tools/audit-talent-tree-membership.mjs'],
    ['homebrew talent-pack integrity audit', 'tools/audit-talent-homebrew-pack.mjs'],
    ['Phase 3E-5 text-defect manifest', 'tools/build-talent-phase-3e5-defect-manifest.mjs', '--check'],
    ['Phase 3E core Gunslinger census', 'tools/census-talent-core-gunslinger.mjs', '--check'],
    ['Phase 3E authority addendum', 'tools/check-talent-phase-3e-additions.mjs'],
    ['Phase 3E discovery census', 'tools/census-talent-source-discovery.mjs', '--check'],
    ['Phase 3E publication-to-production reconciliation', 'tools/reconcile-talent-publication-corpus.mjs', '--check']
  ],
  UNKNOWN_STATE: []
};

if (state === 'UNKNOWN_STATE') {
  console.error('[talent-phase-3c-ci] FAIL: packs/talents.db + packs/talent_trees.db are not a certified state (Phase 3B pre-state, Phase 3C post-state, Phase 3D post-state, Phase 3E-4 post-state or Phase 3E-5 post-state).');
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
