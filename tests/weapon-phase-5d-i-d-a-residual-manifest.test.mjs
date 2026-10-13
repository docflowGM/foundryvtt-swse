import assert from 'node:assert/strict';
import fs from 'node:fs';

// Phase 5D-I-D(-A): the residual input manifest classifies EVERY remaining unconsumed operation key / special-mechanic DEFER / deferred relation,
// claims no consumption it cannot probe, and guards each BLOCKED row with a tripwire that fails the day the missing subsystem appears.
const { buildManifest, evaluateTripwire, renderMatrix, OUT_JSON, OUT_MD } = await import('../tools/census-weapon-phase-5d-i-d-inputs.mjs');
const { I_D_ROWS } = await import('../tools/lib/weapon-phase-5d-i-d-ledger.mjs');
let n = 0; const ok = (m) => console.log(`  [${++n}] ${m} OK`);

const m = buildManifest();
assert.deepEqual(m.problems, [], m.problems.join('\n'));
assert.equal(m.counters.I_D_UNCLASSIFIED, 0);
ok('manifest builds with no problems and zero unclassified');

const closure = JSON.parse(fs.readFileSync(new URL('../data/audits/weapon-phase-5d-h-closure-census.json', import.meta.url), 'utf8'));
assert.equal(m.counters.I_D_INPUT_OPERATION_KEYS, closure.counters.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER + 33, '75 at the I-D baseline = unconsumed now + the 8 implemented in I-D-A1 + the 6 in I-D-F + the 7 in I-D-B1 + the 10 in I-D-B2 + the 2 in I-D-B3');
assert.equal(closure.counters.CANONICAL_NAME_TEXT_HEURISTIC_USAGE, 0);
ok('every live unconsumed operation key has a row; canonical heuristic usage stays 0');

assert.equal(fs.readFileSync(new URL(`../${OUT_JSON}`, import.meta.url), 'utf8'), `${JSON.stringify(m, null, 2)}\n`);
ok('committed manifest equals the regenerated one (deterministic)');

// no consumption claimed: the I-D-A rows are BLOCKED / DUPLICATE / NON_EXECUTABLE, never IMPLEMENTED, and the manifest does not feed the closure census
// I-D-A1: exactly the eight skill-bonus rows are IMPLEMENTED, each with a consumer probe found in the resolver's executable code and a key the closure census now sees consumed
assert.deepEqual(m.rows.filter((r) => r.disposition === 'IMPLEMENTED').map((r) => r.key).sort(), ['concealmentContext', 'concealmentEquipmentBonus', 'concealmentSkill', 'concealmentStealthBonus', 'concealmentStealthPenalty', 'snipingSkill', 'snipingStealthEquipmentBonus', 'survivalBasicForestJungleBonusWhenProficientAndCarried'].concat(['canSingleLoadShell', 'requiresEnergyCell', 'requiresEnergyCells', 'requiresPowerPack', 'requiresPowerPacks', 'secondCrewReloadAction']).concat(['canMountOnRifle', 'canUseStandalone', 'mountMechanicsDC', 'mountTimeMinutes', 'mountableOnMinimumWeaponSize', 'requiresGrenadeLauncher', 'rifleMountable']).concat(['designedForTwoHandedUse', 'forearmMounted', 'mayCountAsSmallWhenBeneficial', 'mayTreatAsSizeWhenBeneficial', 'multipleHeldOneHandCountsAsOneWeapon', 'sizeRule', 'tripodEffectiveSize', 'tripodTreatsAsOneSizeSmallerForWielding', 'wornAs', 'wornOnWrist']).concat(['surveillanceTaggerCompatible', 'upgradeRestrictions']).sort());
assert.equal(m.counters.I_D_IMPLEMENTED, 33);
assert.ok(!fs.readFileSync(new URL('../tools/lib/weapon-phase-5d-h-ledgers.mjs', import.meta.url), 'utf8').includes('5d-i-d'));
ok('only the eight I-D-A1 rows, the six I-D-F rows and the seven I-D-B1 rows and the ten I-D-B2 rows and the two I-D-B3 rows are IMPLEMENTED (consumer-probed); the I-D ledger does not itself feed the 5D-H closure counters');

// BLOCKED is reserved for a missing mechanical CONSUMER; an unobservable fact is CONTEXTUAL or GM_ADJUDICATED (docs/architecture/swse-automation-authority.md)
const blockedRows = m.rows.filter((x) => x.disposition === 'BLOCKED');
assert.deepEqual(blockedRows.map((r) => r.key), ['radiationExposure']);
for (const r of blockedRows) { assert.ok(r.missingConsumer && r.owner && r.tripwires?.length, r.key); assert.equal(r.supportGap, 'MISSING_CONSUMER'); }
for (const r of m.rows.filter((x) => x.subpass.startsWith('I-D-A') && x.disposition.startsWith('DEFERRED_TO_'))) {
  assert.ok(['AUTO', 'CONTEXTUAL', 'GM_ADJUDICATED'].includes(r.automation), `${r.key} states its automation level`);
  assert.ok(['INTEGRATION_PENDING', 'CONTEXT_SURFACE_PENDING', 'PRESENTATION_PENDING'].includes(r.supportGap), `${r.key} names the smallest outstanding gap`);
}
for (const [id, t] of Object.entries(m.tripwires)) assert.equal(t.holds, true, id);
for (const r of m.rows.filter((x) => x.tripwires)) for (const id of r.tripwires) assert.equal(evaluateTripwire(id).ok, true, `${r.key}: ${id}`);
ok('BLOCKED is only a missing mechanical consumer; every I-D-A deferral states its automation level and smallest gap; tripwires hold');

// the policy classifications that matter: cloud concealment is CONTEXTUAL (GM supplies who is concealed), the sound / sight rules are GM_ADJUDICATED
const by = (k) => m.rows.find((r) => r.key === k);
for (const k of ['providesConcealment', 'createsSmokeHazard', 'gasConcealmentDuration']) { assert.equal(by(k).automation, 'CONTEXTUAL'); assert.equal(by(k).supportGap, 'CONTEXT_SURFACE_PENDING'); }
for (const k of ['silentInUse', 'audibility', 'shotVisibility', 'firingDoesNotRevealShooterPosition', 'lineOfSightOriginHeightSquares']) assert.equal(by(k).automation, 'GM_ADJUDICATED');
assert.equal(by('concealmentDesign').disposition, 'DATA_COMPLETENESS');
ok('smoke / gas are contextual, silence / visibility / LOS origin are GM-adjudicated, the source-silent hold-out label is DATA_COMPLETENESS');

// the tripwire mechanism really fails when a subsystem appears (synthetic: the pattern matches code that exists today)
assert.equal(evaluateTripwire('synthetic-present', { kind: 'none', pattern: 'class InventoryEngine' }).ok, false);
assert.equal(evaluateTripwire('synthetic-wired', { kind: 'unreferenced', module: 'scripts/engine/inventory/item-activation-state.js', needle: 'item-activation-state' }).ok, false);
assert.equal(evaluateTripwire('synthetic-count', { kind: 'count', pattern: 'class InventoryEngine', count: 1 }).ok, true);
assert.equal(evaluateTripwire('unknown-id').ok, false);
ok('tripwires fail when the "absent" subsystem is present / the "unwired" module is referenced');

// the one proven duplicate and the one proven non-executable
const dup = m.rows.find((r) => r.key === 'protectedAtmosphereImmune');
assert.equal(dup.disposition, 'DUPLICATE');
const non = m.rows.find((r) => r.key === 'targeting');
assert.equal(non.disposition, 'NON_EXECUTABLE');
ok('protectedAtmosphereImmune is a proven duplicate of the executed CT immunity; Sonic Stunner targeting states no executable restriction');

// owners: every later subpass row has an explicit owner
for (const r of I_D_ROWS.filter((x) => x.disposition.startsWith('DEFERRED_TO_'))) assert.ok(r.owner && r.disposition.endsWith(r.owner.replace(/-/g, '_')), r.key);
ok('every deferral names its owning subpass');


// ---- three-bucket coverage matrix: every row classified, enums valid, duplicate claims mechanically verified, nothing implemented is claimed ----
{
  const cm = m.coverageMatrix;
  assert.equal(m.rows.filter((r) => !r.matrix).length, 0);
  assert.equal(Object.values(cm.buckets).reduce((a, b) => a + b, 0), m.counters.I_D_INPUT_TOTAL);
  assert.equal(Object.values(cm.support).reduce((a, b) => a + b, 0), m.counters.I_D_INPUT_TOTAL);
  assert.equal(cm.support.IMPLEMENTED ?? 0, 33, 'support IMPLEMENTED only where the manifest disposition is IMPLEMENTED (checked per row by the census)');
  assert.ok(cm.duplicateOrNonExecutable.verified >= 11, 'duplicate claims are proven against the registry + consumer probe, not asserted');
  for (const r of m.rows) {
    const x = r.matrix;
    if (x.support === 'SOURCE_CLARIFICATION_NEEDED') assert.ok(x.sourceAmbiguity, `${r.key} names its ambiguity`);
    if (x.support === 'DUPLICATE_OR_NON_EXECUTABLE') assert.ok(x.proof, `${r.key} carries a proof status`);
    assert.ok(x.foundryKnows && x.mustBeSupplied && x.smallestImplementation && x.acceptance, `${r.key} is fully described`);
  }
  assert.equal(fs.readFileSync(new URL(`../${OUT_MD}`, import.meta.url), 'utf8'), renderMatrix(m), 'the generated matrix document is current');
}
ok('three-bucket matrix: all 82 rows classified, duplicate claims verified, implemented only where proven, document current');

// the corrected talent facts: the Zeison Sha talents EXIST in the canonical corpus (the relation merely names them by display string)
{
  const talents = JSON.parse(fs.readFileSync(new URL('../data/canonical/talents.json', import.meta.url), 'utf8')).records;
  for (const name of ['Discblade Arc', 'Distant Discblade Throw', 'Recall Discblade']) assert.ok(talents.some((t) => t.name === name && /Zeison Sha Warrior/.test(t.canonicalIdentity)), `${name} exists in the canonical talent corpus`);
}
ok('Discblade Arc / Distant Discblade Throw / Recall Discblade have canonical talent identities (the ledger no longer claims otherwise)');

console.log(`Weapon 5D-I-D residual manifest: ${n} checks passed.`);
