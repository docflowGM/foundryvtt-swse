#!/usr/bin/env node

/**
 * check-follower-mutation-authority.mjs — follower lifecycle mutation
 * governance guard (MUTATION-GOVERNANCE ADDENDUM, Phase 6 follow-up).
 *
 * A follow-up mutation audit found that follower creation/update/removal/
 * linkage — while mostly routing individual writes through ActorEngine —
 * were not transactionally atomic, and several call sites still bypassed
 * ActorEngine entirely with direct `setFlag()`/`actor.update()`/`.delete()`
 * calls. This guard is the narrow static enforcement for that finding.
 *
 * A CORRECTION pass on this same addendum found four more gaps a first
 * version of this guard did not catch: a follower-slot write reintroduced
 * as an unguarded post-creation side channel, an owner-relationship commit
 * that omitted the follower-slot projection, a shell call site that
 * ignored `updateFollowerFromMutation`'s boolean result, and required
 * species materialization silently swallowed instead of aborting the
 * transaction. Ten checks total, scoped to follower mutation service files
 * only (this is deliberately NOT a repository-wide ban — direct Actor
 * mutation is legitimate in many other parts of the system with their own
 * governance):
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
 *   7. CORRECTION — `_updateFollowerSlot()` must not exist in
 *      follower-shell.js. It was a post-creation side channel that
 *      swallowed its own failures, so follower creation could report
 *      success while the slot never recorded its Actor id; the slot now
 *      commits inside `_linkFollowerToOwner`'s single owner-relationship
 *      write and must not be reintroduced as a separate step.
 *   8. CORRECTION — every object literal assigning `'system.ownedActors'`
 *      must also assign `'flags.foundryvtt-swse.followerSlots'` in the
 *      same literal (in addition to check 5's `followers` requirement) —
 *      all three owner-side relationship projections commit together.
 *   9. CORRECTION — every `FollowerCreator.updateFollowerFromMutation(...)`
 *      call in follower-shell.js must capture its boolean result (an
 *      assignment on the same line) rather than ignore it — a failed,
 *      internally-rolled-back update must not be reported as a successful
 *      finalization.
 *   10. CORRECTION — follower-creator.js must contain the required-species
 *       guard that throws when a resolvable species document is missing,
 *       and must not contain a catch block that logs a species-application
 *       warning without rethrowing — species materialization for an
 *       ordinary species-based follower must abort the creation
 *       transaction on failure, not be silently skipped.
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

    // Check 7 (CORRECTION): _updateFollowerSlot() must not be reintroduced
    // in follower-shell.js as a post-creation side channel.
    if (relPath.endsWith('follower-shell.js') && /_updateFollowerSlot\s*\(/.test(source)) {
      violations.push({
        check: '7: no post-creation follower-slot side channel',
        file: relPath,
        detail: "_updateFollowerSlot() must not be reintroduced — the follower slot's createdActorId commits inside FollowerCreator._linkFollowerToOwner's single owner-relationship-commit step (alongside followers/ownedActors), not as a separate post-creation write whose failure can be silently swallowed"
      });
    }

    // Check 8 (CORRECTION): owner projection coordination must also cover
    // followerSlots, not just followers.
    for (const match of ownedActorsAssignments) {
      const literalBody = match[1];
      if (!/'flags\.foundryvtt-swse\.followerSlots'/.test(literalBody)) {
        violations.push({
          check: '8: owner projections must include followerSlots',
          file: relPath,
          detail: "found an object literal assigning 'system.ownedActors' without also assigning 'flags.foundryvtt-swse.followerSlots' in the same call — all three owner-side relationship projections (followers, followerSlots, ownedActors) must commit together"
        });
      }
    }

    // Check 9 (CORRECTION): every updateFollowerFromMutation() call in
    // follower-shell.js must capture its boolean result.
    if (relPath.endsWith('follower-shell.js')) {
      const lines = rawSource.split('\n');
      lines.forEach((line, idx) => {
        if (!/FollowerCreator\.updateFollowerFromMutation\s*\(/.test(line)) return;
        const capturesResult = /(?:const|let|var)\s+\w+\s*=\s*(?:await\s+)?FollowerCreator\.updateFollowerFromMutation\s*\(/.test(line);
        if (!capturesResult) {
          violations.push({
            check: '9: updateFollowerFromMutation() result must be checked',
            file: relPath,
            detail: `line ${idx + 1}: call does not capture the returned boolean — a failed (and internally rolled-back) update must not be reported as a successful finalization`
          });
        }
      });
    }

    // Check 10 (CORRECTION): required species materialization must throw
    // on failure, not be silently swallowed.
    if (relPath.endsWith('follower-creator.js')) {
      const hasRequiredSpeciesGuard = /Required species document not found/.test(source);
      if (!hasRequiredSpeciesGuard) {
        violations.push({
          check: '10: required species materialization must throw',
          file: relPath,
          detail: 'expected a guard that throws when a required, resolvable species document is missing — species materialization for an ordinary species-based follower must not be silently skipped'
        });
      }
      const hasSwallowedSpeciesCatch = /catch\s*\([^)]*\)\s*\{\s*swseLogger\.warn\(['"`]\[FollowerCreator\] Could not apply species/.test(source);
      if (hasSwallowedSpeciesCatch) {
        violations.push({
          check: '10: required species materialization must throw',
          file: relPath,
          detail: 'found a catch block that logs a species-application warning without rethrowing — a required species Item creation failure must abort the creation transaction, not be swallowed'
        });
      }
    }
  }

  console.log('='.repeat(72));
  console.log('  FOLLOWER MUTATION AUTHORITY GUARD');
  console.log('='.repeat(72));
  console.log(`\nScanned ${scanned.length} follower mutation service file(s) against 10 checks.\n`);

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
