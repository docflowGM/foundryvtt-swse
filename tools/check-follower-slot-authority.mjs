#!/usr/bin/env node

/**
 * check-follower-slot-authority.mjs — GM manual follower slot governance
 * guard (GM-MANUAL-FOLLOWER-SLOT feature).
 *
 * A GM-manual follower slot (`sourceType: 'gm-grant'`) is a REAL follower
 * slot stored in the SAME `flags.foundryvtt-swse.followerSlots` array as
 * talent-derived slots — not a second registry, and not a fake talent
 * grant. FollowerSlotService (scripts/engine/crew/follower-slot-service.js)
 * is the sole authority for building, granting, and revoking these slots,
 * and independently re-checks `game.user.isGM` regardless of what UI calls
 * it. This guard is the narrow static enforcement for that model, scoped
 * to the handful of files this feature actually touches — deliberately NOT
 * a repository-wide flag-write ban.
 *
 *   1. No direct `.setFlag(`/`.unsetFlag(` call touching `followerSlots` in
 *      any scanned file — every write must route through
 *      ActorEngine.updateActor() (`'flags.foundryvtt-swse.followerSlots'`).
 *   2. AlliesSurfaceController.js must not construct a follower-slot object
 *      literal itself (no `sourceType:` / `dependentKind:` assignment in
 *      that file) — it must delegate to AlliesSurfaceService, which in turn
 *      delegates to FollowerSlotService.
 *   3. Any object literal that assigns `sourceType: 'gm-grant'` (or the
 *      quoted-key equivalent) must also assign `talentItemId: null` in the
 *      same literal — a manual slot must never carry a fake talent
 *      provenance.
 *   4. follower-hooks.js's slot-reconciliation filter must explicitly
 *      preserve `sourceType === 'gm-grant'` slots — reconciliation must not
 *      rely only on the incidental "no talentItemId" fallback.
 *   5. FollowerSlotService.grantManualFollowerSlot and
 *      .revokeManualFollowerSlot must each independently re-check
 *      `game.user?.isGM === true` (or equivalent) — hiding a button in the
 *      Allies UI is not a permission boundary; a forged direct call from a
 *      non-GM client must still be rejected inside the service.
 *   6. FollowerSlotService's revocation validator must reject both an
 *      occupied slot (`createdActorId` set) and a non-manual
 *      (`sourceType !== 'gm-grant'`) slot — this removal path must never
 *      be usable on a talent-granted or filled slot.
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

// Files this guard actually scans — the GM-manual follower slot surface,
// not a repository-wide sweep.
const FOLLOWER_SLOT_FILES = [
  'scripts/engine/crew/follower-slot-service.js',
  'scripts/ui/shell/AlliesSurfaceService.js',
  'scripts/ui/shell/AlliesSurfaceController.js',
  'scripts/infrastructure/hooks/follower-hooks.js'
].map(p => path.join(ROOT, p));

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

  for (const file of FOLLOWER_SLOT_FILES) {
    if (!fs.existsSync(file)) continue;
    scanned.push(file);

    const rawSource = read(file);
    const source = stripCommentsAndStrings(rawSource);
    const relPath = path.relative(ROOT, file);

    // Check 1: no direct setFlag()/unsetFlag() touching followerSlots. We
    // scan line-by-line and only flag a call whose line (or the next line,
    // to tolerate a wrapped argument list) mentions 'followerSlots'.
    const lines = rawSource.split('\n');
    lines.forEach((line, idx) => {
      if (!/\.\s*(setFlag|unsetFlag)\s*\(/.test(line)) return;
      const window = `${line}\n${lines[idx + 1] || ''}`;
      if (/followerSlots/.test(window)) {
        violations.push({
          check: '1: no direct setFlag()/unsetFlag() on followerSlots',
          file: relPath,
          detail: `line ${idx + 1}: direct flag write to followerSlots — route through ActorEngine.updateActor({'flags.foundryvtt-swse.followerSlots': ...})`
        });
      }
    });

    // Check 2: AlliesSurfaceController.js must not construct a slot object
    // literal itself.
    if (relPath.endsWith('AlliesSurfaceController.js')) {
      if (/\bsourceType\s*:/.test(source) || /\bdependentKind\s*:/.test(source)) {
        violations.push({
          check: '2: controller must not construct slot objects',
          file: relPath,
          detail: 'found a sourceType:/dependentKind: object-literal field — the controller must delegate slot creation to AlliesSurfaceService.addManualFollowerSlot(), which delegates to FollowerSlotService, not build a slot itself'
        });
      }
    }

    // Check 3: any literal assigning sourceType: 'gm-grant' must also
    // assign talentItemId: null in the same literal.
    const gmGrantLiterals = [...source.matchAll(/\{([^{}]*sourceType\s*:\s*['"]gm-grant['"][^{}]*)\}/gs)];
    for (const match of gmGrantLiterals) {
      const literalBody = match[1];
      if (!/talentItemId\s*:\s*null\b/.test(literalBody)) {
        violations.push({
          check: "3: manual slots must not carry fake talentItemId",
          file: relPath,
          detail: "found an object literal with sourceType: 'gm-grant' that does not also assign talentItemId: null — a manual slot must never be given fake talent provenance"
        });
      }
    }

    // Check 4: follower-hooks.js reconciliation must explicitly preserve
    // gm-grant slots.
    if (relPath.endsWith('follower-hooks.js')) {
      if (!/sourceType\s*===\s*['"]gm-grant['"]/.test(source)) {
        violations.push({
          check: '4: reconciliation must explicitly preserve gm-grant slots',
          file: relPath,
          detail: "expected the slot-reconciliation filter to explicitly check `slot.sourceType === 'gm-grant'` and preserve those slots — reconciliation must not rely only on the incidental no-talentItemId fallback"
        });
      }
    }

    // Check 5: FollowerSlotService must independently re-check GM status
    // in both grant and revoke.
    if (relPath.endsWith('follower-slot-service.js')) {
      const grantMatch = source.match(/static\s+async\s+grantManualFollowerSlot[\s\S]*?(?=static\s+async|\n\})/);
      const grantChecksGM = /validateManualFollowerSlotGrant\s*\(\s*\{[^)]*isGM\s*:\s*game\.user\?\.\s*isGM\s*===\s*true/.test(source)
        || (grantMatch && /isGM\s*:\s*game\.user\?\.\s*isGM\s*===\s*true/.test(grantMatch[0]));
      if (!grantChecksGM) {
        violations.push({
          check: '5: grantManualFollowerSlot must independently re-check GM status',
          file: relPath,
          detail: 'expected grantManualFollowerSlot to pass `isGM: game.user?.isGM === true` into its validator — hiding a button is not a permission boundary; a forged non-GM call must still be rejected here'
        });
      }

      const revokeChecksGM = /revokeManualFollowerSlot[\s\S]*?isGM\s*:\s*game\.user\?\.\s*isGM\s*===\s*true/.test(source);
      if (!revokeChecksGM) {
        violations.push({
          check: '5: revokeManualFollowerSlot must independently re-check GM status',
          file: relPath,
          detail: 'expected revokeManualFollowerSlot to pass `isGM: game.user?.isGM === true` into its validator'
        });
      }
    }

    // Check 6: revocation validator must reject occupied and non-manual
    // slots.
    if (relPath.endsWith('follower-slot-service.js')) {
      const validatorMatch = source.match(/function\s+validateManualFollowerSlotRevocation[\s\S]*?\n\}/);
      const validatorBody = validatorMatch ? validatorMatch[0] : '';
      const rejectsNonManual = /sourceType\s*!==\s*MANUAL_SLOT_SOURCE_TYPE/.test(validatorBody)
        || /sourceType\s*!==\s*['"]gm-grant['"]/.test(validatorBody);
      const rejectsOccupied = /slot\.createdActorId/.test(validatorBody)
        || /isFollowerSlotOccupied\(\s*slot\s*\)/.test(validatorBody);
      if (!validatorMatch || !rejectsNonManual) {
        violations.push({
          check: '6: revocation must reject talent-derived slots',
          file: relPath,
          detail: 'expected validateManualFollowerSlotRevocation to reject a slot whose sourceType is not the manual-grant type — this removal path must never be usable on a talent-granted slot'
        });
      }
      if (!validatorMatch || !rejectsOccupied) {
        violations.push({
          check: '6: revocation must reject occupied slots',
          file: relPath,
          detail: 'expected validateManualFollowerSlotRevocation to reject a slot with a non-empty createdActorId — an occupied slot must go through the existing detach/fire/delete workflow, not this removal path'
        });
      }
    }
  }

  console.log('='.repeat(72));
  console.log('  GM MANUAL FOLLOWER SLOT AUTHORITY GUARD');
  console.log('='.repeat(72));
  console.log(`\nScanned ${scanned.length} file(s) against 6 checks.\n`);

  if (violations.length === 0) {
    console.log('No violations found — GM-manual follower slots remain governed, single-registry, and GM-only.');
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
