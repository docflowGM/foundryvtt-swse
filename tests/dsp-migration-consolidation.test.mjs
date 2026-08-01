import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Phase 2 DSP migration — static architectural guards for the write-side
// consolidation: retiring live darkSideScore dual-writes, importer
// cleanup, migration wiring/registration, and the "migration only ever
// deletes, never assigns, system.darkSideScore" invariant. Real behavioral
// coverage for the migration's decision table lives in
// tests/dsp-migration-behavior.test.mjs — not duplicated here as regexes.

const migration = await readFile(new URL('../scripts/migration/dark-side-points-migration.js', import.meta.url), 'utf8');
const settings = await readFile(new URL('../scripts/core/settings.js', import.meta.url), 'utf8');
const indexJs = await readFile(new URL('../index.js', import.meta.url), 'utf8');
const dspEngine = await readFile(new URL('../scripts/engine/darkside/dsp-engine.js', import.meta.url), 'utf8');
const forceEngine = await readFile(new URL('../scripts/engine/force/force-engine.js', import.meta.url), 'utf8');
const sithTalentActions = await readFile(new URL('../scripts/engine/talent/sith-talent-actions.js', import.meta.url), 'utf8');
const forceAdeptTalentActions = await readFile(new URL('../scripts/engine/talent/force-adept-talent-actions.js', import.meta.url), 'utf8');
const forceAlchemyMechanicsService = await readFile(new URL('../scripts/apps/force-alchemy/force-alchemy-mechanics-service.js', import.meta.url), 'utf8');
const poisonEngine = await readFile(new URL('../scripts/engine/poison/poison-engine.js', import.meta.url), 'utf8');
const npcImporter = await readFile(new URL('../scripts/engine/import/npc-template-importer-engine.js', import.meta.url), 'utf8');
const droidImporter = await readFile(new URL('../scripts/engine/import/stock-droid-importer-engine.js', import.meta.url), 'utf8');
const exportModel = await readFile(new URL('../scripts/export/swse-export-model.js', import.meta.url), 'utf8');
const npcSheetHelpers = await readFile(new URL('../scripts/sheets/v2/npc/npc-sheet-helpers.js', import.meta.url), 'utf8');
const darkSidePowers = await readFile(new URL('../scripts/talents/DarkSidePowers.js', import.meta.url), 'utf8');

// A production file "assigns a value to system.darkSideScore" if it
// contains a quoted key literal 'system.darkSideScore' (or the object-path
// variant) followed by a colon and something other than the deletion
// sentinel. The migration file is exempt by construction (checked
// separately below with a positive assertion that it only ever deletes).
const VALUE_ASSIGNMENT_PATTERN = /['"]system\.darkSideScore(\.value)?['"]\s*:\s*(?!null\b)/;

// 1. No live writer outside the migration assigns a value to
//    system.darkSideScore or system.darkSideScore.value anymore.
for (const [name, src] of [
  ['force-engine.js', forceEngine],
  ['sith-talent-actions.js', sithTalentActions],
  ['force-adept-talent-actions.js', forceAdeptTalentActions],
  ['force-alchemy-mechanics-service.js', forceAlchemyMechanicsService],
  ['poison-engine.js', poisonEngine],
  ['npc-template-importer-engine.js', npcImporter],
  ['stock-droid-importer-engine.js', droidImporter],
  ['npc-sheet-helpers.js', npcSheetHelpers],
  ['DarkSidePowers.js', darkSidePowers]
]) {
  assert.doesNotMatch(src, VALUE_ASSIGNMENT_PATTERN, `${name} must not assign a value to system.darkSideScore`);
}

// 2. The migration itself only ever deletes system.darkSideScore (the
//    '-=' key convention), never assigns it a value.
assert.doesNotMatch(migration, VALUE_ASSIGNMENT_PATTERN, 'migration must not assign a value to system.darkSideScore either');
assert.match(migration, /update\['system\.-=darkSideScore'\] = null/, 'migration must use the deletion-key convention to clean up the malformed legacy object');

// 3. Both importers' actor-creation payloads no longer include a
//    darkSideScore key at all (only darkSide.value remains).
assert.doesNotMatch(npcImporter, /darkSideScore: numberOrNull/);
assert.match(npcImporter, /darkSide: \{ value: numberOrNull\(statblock\['Dark Side Points'\]\) \?\? 0, max: 0 \}/);
assert.doesNotMatch(droidImporter, /darkSideScore: totals\.darkSideScore \|\| 0,/);
assert.match(droidImporter, /darkSide: \{ value: totals\.darkSideScore \|\| 0, max: 0 \}/);

// 4. DSPEngine retains its Phase 1 _source-based compatibility read, and
//    hasOwnPath is now exported for the migration to reuse.
assert.match(dspEngine, /export function hasOwnPath\(/);
assert.match(dspEngine, /actor\._source\?\.system \?\? actor\.system \?\? \{\}/);

// 5. Export model still reads canonical-first with legacy fallback
//    (external export schema property name is allowed to stay
//    "darkSideScore" — only its value source matters).
assert.match(exportModel, /darkSideScore: Number\(sys\.darkSide\?\.value \?\? sys\.darkSideScore \?\? 0\)/);

// 6. Migration is versioned, registered, and wired into the live,
//    GM-gated ready hook — not left orphaned like the other
//    scripts/migration(s)/ files.
assert.match(migration, /const MIGRATION_VERSION = '2026-08-01-dark-side-points-v1';/);
assert.match(settings, /game\.settings\.register\('foundryvtt-swse', 'darkSidePointsPhase2Migration'/);
assert.match(indexJs, /import \{ migrateDarkSidePoints \} from "\.\/scripts\/migration\/dark-side-points-migration\.js";/);
assert.match(indexJs, /if \(game\.user\.isGM\) \{[\s\S]{0,400}migrateDarkSidePoints\(\{ silent: true \}\)/);

// 7. World-level version only advances when there were zero failures —
//    the retry-safety guarantee.
assert.match(migration, /if \(summary\.failures\.length === 0\)/);
assert.match(migration, /await HouseRuleService\.set\(SETTING_KEY, MIGRATION_VERSION\);/);

// 8. Idempotency is type/shape-sensitive (Number.isInteger check), not
//    just numeric-equality — guards against the numeric-string regression.
assert.match(migration, /Number\.isInteger\(persisted\)/);

console.log('DSP migration consolidation static guards passed.');
