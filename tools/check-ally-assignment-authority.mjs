#!/usr/bin/env node

/**
 * check-ally-assignment-authority.mjs — GM existing-NPC assignment
 * governance guard (GM-EXISTING-NPC-ASSIGNMENT feature).
 *
 * Assign as Ally is reversible relationship metadata; Convert to Follower
 * is an explicit mechanical migration. AllyAssignmentService
 * (scripts/engine/crew/ally-assignment-service.js) is the sole authority
 * for both, and independently re-checks `game.user.isGM` regardless of
 * what UI calls it. This guard is the narrow static enforcement for that
 * model, scoped to the three files this feature touches — deliberately
 * NOT a repository-wide ban.
 *
 *   1. AlliesSurfaceController.js must not construct an assignment link
 *      itself (no `assignedAllyKind:`/`ASSIGNMENT_KIND` reference) and must
 *      not call ActorEngine directly — it must delegate through
 *      AlliesSurfaceService only.
 *   2. AlliesSurfaceService.js must not construct an assignment link object
 *      itself (no `assignedAllyOwnerId:` assignment literal) — its
 *      assign/convert/unassign methods must delegate to AllyAssignmentService.
 *   3. buildAssignmentTargetFlagPatch (the Assign-as-Ally builder) must
 *      never reference follower progression fields — Assign as Ally must
 *      remain non-mechanical.
 *   4. convertToFollower must call validateFollowerConversionSlot before
 *      committing — Convert to Follower must never proceed without a
 *      validated, open follower slot.
 *   5. No direct `.setFlag(`/`.update(` on an actor-like variable in
 *      ally-assignment-service.js bypassing ActorEngine.
 *   6. convertToFollower must consult the droid stock-conversion gate
 *      (isDroidStatblockMode / evaluateDroidConversionGate) — it must never
 *      bypass the canonical droid calculation-mode authority.
 *   7. isEligibleAssignmentTargetType's allowed set must not include
 *      vehicle/starship/hazard.
 *   8. assignAsAlly, convertToFollower, and unassignAlly must each
 *      independently re-check `game.user?.isGM === true` — hiding a button
 *      is not a permission boundary.
 *   9. mapActorCard's follower/minion level-sync fields
 *      (canLevelUpFollower/canSyncMinion) must remain scoped to exactly
 *      'follower'/'minion'/'privateer' kinds — an assigned-ally kind must
 *      never enter mechanical level sync.
 *   10. buildOwnerAssignmentUpdate must de-duplicate by Actor id (no
 *       duplicate owner relationship records for the same target).
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

const SERVICE_FILE = path.join(ROOT, 'scripts/engine/crew/ally-assignment-service.js');
const SURFACE_SERVICE_FILE = path.join(ROOT, 'scripts/ui/shell/AlliesSurfaceService.js');
const CONTROLLER_FILE = path.join(ROOT, 'scripts/ui/shell/AlliesSurfaceController.js');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function stripCommentsAndStrings(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

function extractFunctionBody(source, functionNamePattern) {
  const match = source.match(functionNamePattern);
  return match ? match[0] : null;
}

function main() {
  const violations = [];
  const scanned = [];

  if (fs.existsSync(CONTROLLER_FILE)) {
    scanned.push(CONTROLLER_FILE);
    const rawSource = read(CONTROLLER_FILE);
    const source = stripCommentsAndStrings(rawSource);
    const relPath = path.relative(ROOT, CONTROLLER_FILE);

    // Check 1: controller must not construct a link object or call
    // ActorEngine directly.
    if (/\bassignedAllyKind\s*:/.test(source) || /\bASSIGNMENT_KIND\b/.test(source)) {
      violations.push({
        check: '1: controller must not construct assignment links',
        file: relPath,
        detail: 'found an assignedAllyKind:/ASSIGNMENT_KIND reference — the controller must delegate to AlliesSurfaceService, which delegates to AllyAssignmentService, not build a relationship record itself'
      });
    }
    if (/\bActorEngine\b/.test(source)) {
      violations.push({
        check: '1: controller must not call ActorEngine directly',
        file: relPath,
        detail: 'found a direct ActorEngine reference in the controller — all assignment mutation must route through AllyAssignmentService'
      });
    }
  }

  if (fs.existsSync(SURFACE_SERVICE_FILE)) {
    scanned.push(SURFACE_SERVICE_FILE);
    const rawSource = read(SURFACE_SERVICE_FILE);
    const source = stripCommentsAndStrings(rawSource);
    const relPath = path.relative(ROOT, SURFACE_SERVICE_FILE);

    // Check 2: the NEW existing-NPC-assignment delegate methods must not
    // construct an assignment link object themselves. Scoped to just those
    // methods (not the whole file) — createBareBeastCompanion's inline
    // actorData flags for a NEWLY CREATED beast Actor are a separate,
    // pre-existing, unrelated mechanism this check must not flag.
    const delegateMethodNames = ['assignExistingNpcAsAlly', 'unassignExistingNpcAlly', 'convertExistingNpcToFollower', 'assignDroppedActor'];
    for (const methodName of delegateMethodNames) {
      const methodMatch = source.match(new RegExp(`static\\s+async\\s+${methodName}[\\s\\S]*?\\n  \\}`));
      if (methodMatch && /assignedAllyOwnerId\s*:/.test(methodMatch[0])) {
        violations.push({
          check: '2: surface service must not construct assignment links',
          file: relPath,
          detail: `${methodName} contains an assignedAllyOwnerId: object-literal field — assignment relationship construction must live only in ally-assignment-service.js`
        });
      }
    }

    // Check 9: mapActorCard's level-sync fields must remain scoped to the
    // mechanical kinds only.
    const mapActorCardMatch = source.match(/function\s+mapActorCard[\s\S]*?\n\}/);
    const mapActorCardBody = mapActorCardMatch ? mapActorCardMatch[0] : '';
    const levelUpLine = mapActorCardBody.match(/canLevelUpFollower\s*:\s*[^,]+/);
    const syncMinionLine = mapActorCardBody.match(/canSyncMinion\s*:\s*[^,]+/);
    if (!mapActorCardMatch || !levelUpLine || !/kind\s*===\s*'follower'/.test(levelUpLine[0])) {
      violations.push({
        check: '9: assigned allies must not enter follower level sync',
        file: relPath,
        detail: "expected mapActorCard's canLevelUpFollower to remain scoped to kind === 'follower' only"
      });
    }
    if (!mapActorCardMatch || !syncMinionLine || !/'minion'/.test(syncMinionLine[0]) || !/'privateer'/.test(syncMinionLine[0])) {
      violations.push({
        check: '9: assigned allies must not enter minion level sync',
        file: relPath,
        detail: "expected mapActorCard's canSyncMinion to remain scoped to 'minion'/'privateer' kinds only"
      });
    }
  }

  if (fs.existsSync(SERVICE_FILE)) {
    scanned.push(SERVICE_FILE);
    const rawSource = read(SERVICE_FILE);
    const source = stripCommentsAndStrings(rawSource);
    const relPath = path.relative(ROOT, SERVICE_FILE);

    // Check 3: the Assign-as-Ally target flag builder must never reference
    // follower progression fields.
    const targetFlagPatchMatch = source.match(/function\s+buildAssignmentTargetFlagPatch[\s\S]*?\n\}/);
    if (!targetFlagPatchMatch) {
      violations.push({
        check: '3: buildAssignmentTargetFlagPatch must exist',
        file: relPath,
        detail: 'expected buildAssignmentTargetFlagPatch to be defined as the Assign-as-Ally target metadata builder'
      });
    } else if (/isFollower|followerTemplate|progression\.isFollower/.test(targetFlagPatchMatch[0])) {
      violations.push({
        check: '3: Assign as Ally must not write follower progression fields',
        file: relPath,
        detail: 'buildAssignmentTargetFlagPatch references a follower progression field — Assign as Ally must remain non-mechanical'
      });
    }

    // Check 4: convertToFollower must validate the slot before committing.
    const convertMatch = source.match(/static\s+async\s+convertToFollower[\s\S]*?\n  \}/);
    const convertBody = convertMatch ? convertMatch[0] : '';
    if (!convertMatch || !/validateFollowerConversionSlot\s*\(/.test(convertBody)) {
      violations.push({
        check: '4: convertToFollower must validate the slot',
        file: relPath,
        detail: 'expected convertToFollower to call validateFollowerConversionSlot before committing — it must never proceed without a validated, open follower slot'
      });
    }

    // Check 5: no direct setFlag()/actor.update() bypassing ActorEngine.
    const directFlagMatches = source.match(/\b(ownerActor|targetActor)\s*\.\s*(setFlag|unsetFlag|update)\s*\(/g) || [];
    if (directFlagMatches.length > 0) {
      violations.push({
        check: '5: no direct actor mutation bypassing ActorEngine',
        file: relPath,
        detail: `found ${directFlagMatches.length} direct call(s) (${[...new Set(directFlagMatches)].join(', ')}) — route through ActorEngine.updateActor()`
      });
    }

    // Check 6: convertToFollower must consult the droid stock-conversion gate.
    if (!convertMatch || !/evaluateDroidConversionGate\s*\(/.test(convertBody)) {
      violations.push({
        check: '6: convertToFollower must consult the droid conversion gate',
        file: relPath,
        detail: 'expected convertToFollower to call evaluateDroidConversionGate — a stock-statblock droid must never bypass canonical droid calculation-mode authority'
      });
    }

    // Check 7: eligible target types must exclude vehicles/starships/hazards.
    const targetTypesMatch = source.match(/ELIGIBLE_TARGET_ACTOR_TYPES\s*=\s*new Set\(\[[^\]]*\]\)/);
    if (!targetTypesMatch || /'vehicle'|'starship'|'hazard'/.test(targetTypesMatch[0])) {
      violations.push({
        check: '7: vehicles/starships/hazards must not be assignable',
        file: relPath,
        detail: 'ELIGIBLE_TARGET_ACTOR_TYPES must not include vehicle/starship/hazard'
      });
    }

    // Check 8: each of the three public methods must independently
    // re-check game.user.isGM — either a direct check (either polarity:
    // `=== true` or `!== true`) or delegation to
    // evaluateNpcAssignmentEligibility, whose OWN body is separately
    // verified below to actually perform that check (so the indirect path
    // cannot be a hollow no-op delegation).
    const eligibilityWrapperMatch = source.match(/function\s+evaluateNpcAssignmentEligibility[\s\S]*?\n\}/);
    const eligibilityWrapperChecksGM = eligibilityWrapperMatch && /isGM\s*:\s*game\.user\?\.\s*isGM\s*===\s*true/.test(eligibilityWrapperMatch[0]);
    if (!eligibilityWrapperMatch || !eligibilityWrapperChecksGM) {
      violations.push({
        check: '8: evaluateNpcAssignmentEligibility must check GM status',
        file: relPath,
        detail: 'expected evaluateNpcAssignmentEligibility to pass isGM: game.user?.isGM === true into its pure evaluator — this is the GM check assignAsAlly delegates to'
      });
    }

    for (const methodName of ['assignAsAlly', 'unassignAlly', 'convertToFollower']) {
      const methodMatch = source.match(new RegExp(`static\\s+async\\s+${methodName}[\\s\\S]*?\\n  \\}`));
      const methodBody = methodMatch ? methodMatch[0] : '';
      const directCheck = /game\.user\?\.\s*isGM\s*(===|!==)\s*true/.test(methodBody);
      const indirectCheck = /evaluateNpcAssignmentEligibility\s*\(/.test(methodBody) && eligibilityWrapperChecksGM;
      if (!methodMatch || (!directCheck && !indirectCheck)) {
        violations.push({
          check: `8: ${methodName} must independently re-check GM status`,
          file: relPath,
          detail: `expected ${methodName} to check game.user?.isGM (directly or via evaluateNpcAssignmentEligibility) — hiding a button is not a permission boundary`
        });
      }
    }

    // Check 10: buildOwnerAssignmentUpdate must de-duplicate by Actor id.
    const ownerUpdateMatch = source.match(/function\s+buildOwnerAssignmentUpdate[\s\S]*?\n\}/);
    if (!ownerUpdateMatch || !/appendUnique\s*\(/.test(ownerUpdateMatch[0])) {
      violations.push({
        check: '10: owner relationship records must be de-duplicated',
        file: relPath,
        detail: 'expected buildOwnerAssignmentUpdate to de-duplicate by Actor id (appendUnique) — a second assignment of the same Actor must not create a duplicate owner-side record'
      });
    }
  }

  console.log('='.repeat(72));
  console.log('  GM EXISTING NPC ASSIGNMENT AUTHORITY GUARD');
  console.log('='.repeat(72));
  console.log(`\nScanned ${scanned.length} file(s) against 10 checks.\n`);

  if (violations.length === 0) {
    console.log('No violations found — existing-NPC assignment remains governed, GM-only, and correctly separates relationship-only assignment from mechanical conversion.');
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
