#!/usr/bin/env node

/**
 * check-follower-mutation-authority.mjs — follower lifecycle mutation
 * governance guard (MUTATION-GOVERNANCE ADDENDUM, Phase 6 follow-up).
 *
 * A follow-up mutation audit found that follower creation/update/removal/
 * linkage — while mostly routing individual writes through ActorEngine —
 * were not transactionally atomic, and several call sites still bypassed
 * ActorEngine entirely with direct `setFlag()`/`actor.update()`/`.delete()`
 * calls. This guard is the narrow static enforcement for that finding. Six
 * checks, scoped to follower mutation service files only (this is
 * deliberately NOT a repository-wide ban — direct Actor mutation is
 * legitimate in many other parts of the system with their own governance):
 *
 *   1. No `.setFlag(` / `.unsetFlag(` call in a follower mutation service —
 *      every flag write must route through ActorEngine.updateActor()
 *      (`'flags.scope.key': value`) or ActorEngine.updateActorFlags().
 *   2. No direct `<actorLikeVar>.update(` call bypassing ActorEngine.
 *   3. No direct `<actorLikeVar>.delete(` call bypassing the approved
 *      world-document lifecycle wrapper (deleteActor() in
 *      core/document-api-v13.js).
 *   4. No direct `<actorLikeVar>.createEmbeddedDocuments(` /
 *      `.updateEmbeddedDocuments(` / `.deleteEmbeddedDocuments(` call
 *      bypassing ActorEngine's governed equivalents.
 *   5. Owner projection coordination: any object literal that assigns
 *      `'system.ownedActors'` in a follower mutation service must assign
 *      `'flags.foundryvtt-swse.followers'` in the SAME literal — the two
 *      owner-side projections of the follower relationship must commit in
 *      one governed call, not two separately-persisted writes.
 *   6. Follower finalization (createFollowerFromMutation) must route
 *      through the transaction coordinator (runFollowerMutationTransaction)
 *      rather than calling multiple independent commit helpers with no
 *      shared rollback.
 *
 * Allowed everywhere: session/draft object mutation (plain property sets on
 * progressionSession.draftSelections and friends — these are not Actor
 * method calls, so the patterns below do not match them at all), pure
 * planning helpers, the approved world-document creation/deletion wrapper
 * (core/document-api-v13.js and the governance/actor-engine implementation
 * itself, which legitimately call the real Foundry APIs these checks look
 * for), and test fixtures.
 *
 * Report-only by default; --strict exits non-zero on any violation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const STRICT = process.argv.includes('--strict');

// Files this guard actually scans — the follower lifecycle mutation
// surface named in the addendum, not a repository-wide sweep.
const FOLLOWER_MUTATION_SERVICE_FILES = [
  'scripts/apps/follower-creator.js',
  'scripts/apps/follower-manager.js',
  'scripts/apps/progression-framework/follower-shell.js',
  'scripts/apps/progression-framework/adapters/follower-mutation-transaction.js',
  'scripts/apps/progression-framework/adapters/follower-deriver.js',
  'scripts/apps/progression-framework/adapters/follower-advancer.js',
  'scripts/apps/progression-framework/adapters/follower-session-seeder.js'
].map(p => path.join(ROOT, p));

// Files that legitimately implement or call the real Foundry document APIs
// these checks look for — the approved authorities themselves, not
// violations of them.
const APPROVED_AUTHORITY_FILES = new Set([
  path.join(ROOT, 'scripts/core/document-api-v13.js'),
  path.join(ROOT, 'scripts/governance/actor-engine/actor-engine.js')
].map(p => path.resolve(p)));

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function stripCommentsAndStrings(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

function main() {
  const violations = [];
  const scanned = [];

  for (const file of FOLLOWER_MUTATION_SERVICE_FILES) {
    if (!fs.existsSync(file)) continue;
    if (APPROVED_AUTHORITY_FILES.has(path.resolve(file))) continue;
    scanned.push(file);

    const rawSource = read(file);
    const source = stripCommentsAndStrings(rawSource);
    const relPath = path.relative(ROOT, file);

    // Check 1: no direct setFlag()/unsetFlag().
    const flagMatches = source.match(/\.\s*(setFlag|unsetFlag)\s*\(/g) || [];
    if (flagMatches.length > 0) {
      violations.push({
        check: '1: no direct setFlag()/unsetFlag()',
        file: relPath,
        detail: `found ${flagMatches.length} direct call(s) — route through ActorEngine.updateActor()/updateActorFlags()/unsetActorFlag() instead`
      });
    }

    // Check 2: no direct actor-like `.update(` call. Foundry Documents,
    // ActorEngine's own internals, and unrelated plain objects/Maps all use
    // `.update(`, so this narrows to the specific identifiers this file's
    // code actually uses for Actor references, to avoid false positives on
    // things like Map/Set or dialog option objects.
    const directUpdatePattern = /\b(owner|follower|created|ownerActor|followerActor|existingFollower)\s*\.\s*update\s*\(/g;
    const updateMatches = source.match(directUpdatePattern) || [];
    if (updateMatches.length > 0) {
      violations.push({
        check: '2: no direct actor.update()',
        file: relPath,
        detail: `found ${updateMatches.length} direct call(s) on an actor-like variable (${[...new Set(updateMatches)].join(', ')}) — route through ActorEngine.updateActor()`
      });
    }

    // Check 3: no direct actor-like `.delete(` call bypassing the approved
    // world-document lifecycle wrapper (deleteActor()).
    const directDeletePattern = /\b(owner|follower|created|ownerActor|followerActor|existingFollower)\s*\.\s*delete\s*\(/g;
    const deleteMatches = source.match(directDeletePattern) || [];
    if (deleteMatches.length > 0) {
      violations.push({
        check: '3: no direct actor.delete()',
        file: relPath,
        detail: `found ${deleteMatches.length} direct call(s) on an actor-like variable (${[...new Set(deleteMatches)].join(', ')}) — route through deleteActor() in core/document-api-v13.js`
      });
    }

    // Check 4: no direct embedded-document mutation bypassing ActorEngine.
    const directEmbeddedPattern = /\b(owner|follower|created|ownerActor|followerActor|existingFollower)\s*\.\s*(createEmbeddedDocuments|updateEmbeddedDocuments|deleteEmbeddedDocuments)\s*\(/g;
    const embeddedMatches = source.match(directEmbeddedPattern) || [];
    if (embeddedMatches.length > 0) {
      violations.push({
        check: '4: no direct embedded-document mutation',
        file: relPath,
        detail: `found ${embeddedMatches.length} direct call(s) (${[...new Set(embeddedMatches)].join(', ')}) — route through ActorEngine.createEmbeddedDocuments()/updateEmbeddedDocuments()/deleteEmbeddedDocuments()`
      });
    }

    // Check 5: owner projection coordination — every object literal
    // assigning 'system.ownedActors' must also assign
    // 'flags.foundryvtt-swse.followers' in the same literal.
    const ownedActorsAssignments = [...source.matchAll(/\{([^{}]*'system\.ownedActors'[^{}]*)\}/gs)];
    for (const match of ownedActorsAssignments) {
      const literalBody = match[1];
      if (!/'flags\.foundryvtt-swse\.followers'/.test(literalBody)) {
        violations.push({
          check: '5: owner projections must commit together',
          file: relPath,
          detail: "found an object literal assigning 'system.ownedActors' without also assigning 'flags.foundryvtt-swse.followers' in the same call — the two owner-side projections of the follower relationship must commit in one governed ActorEngine.updateActor() call"
        });
      }
    }

    // Check 6: follower finalization must route through the transaction
    // coordinator.
    if (relPath.endsWith('follower-creator.js')) {
      const hasCreateFromMutation = /createFollowerFromMutation\s*\(/.test(source);
      const usesCoordinator = /runFollowerMutationTransaction\s*\(/.test(source);
      if (hasCreateFromMutation && !usesCoordinator) {
        violations.push({
          check: '6: finalization must use the transaction coordinator',
          file: relPath,
          detail: 'createFollowerFromMutation exists but does not call runFollowerMutationTransaction() — multi-step follower creation must be coordinated, not a sequence of independent commit helpers with no shared rollback'
        });
      }
    }
  }

  console.log('='.repeat(72));
  console.log('  FOLLOWER MUTATION AUTHORITY GUARD');
  console.log('='.repeat(72));
  console.log(`\nScanned ${scanned.length} follower mutation service file(s) against 6 checks.\n`);

  if (violations.length === 0) {
    console.log('No violations found — follower lifecycle mutations remain governed and coordinated.');
    console.log('='.repeat(72));
    process.exit(0);
  }

  console.log(`Found ${violations.length} violation(s):\n`);
  for (const violation of violations) {
    console.log(`  [${violation.check}]`);
    console.log(`    ${violation.file}`);
    console.log(`    ${violation.detail}`);
  }
  console.log('='.repeat(72));

  process.exit(STRICT ? 1 : 0);
}

main();
