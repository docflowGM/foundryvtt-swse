// Phase 1a -- ModificationSlotAuthority: deterministic tests for the approved contract
// (docs/audits/modification-slot-authority-phase-1a-contract.md, revision 5). resolveSlotState only; no previewChange.
// Priority order follows the review: unresolved/conflicted behavior first, ordinary certified totals after.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSlotState, CONTRACT_VERSION } from '../scripts/engine/customization/modification-slot-authority.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const moduleFile = path.join(repoRoot, 'scripts/engine/customization/modification-slot-authority.js');

let checks = 0;
const battery = []; // every non-certified result, scanned at the end for secondary capacity leaks
function check(name, fn) {
  try {
    fn();
    checks += 1;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    throw err;
  }
}

/* ---------------------------------- fixtures ---------------------------------- */

const EV = 'test-evidence-ref';
const trusted = (extra = {}) => ({ evidenceRef: EV, ...extra });
const canon = (weaponClass) => () => ({ state: 'canonical', identityKey: `registry:${weaponClass}`, weaponClass, source: { ref: 'registry:test' } });
const legacyLookup = () => ({ state: 'legacy' });
const unresolvedLookup = () => ({ state: 'unresolved', reason: 'registry_not_loaded' });
const defs = (table) => (key) =>
  key in table ? { definitionId: `def:${key}`, upgradeKey: key, certifiedCost: table[key], source: { ref: 'test-catalog', certification: 'test' } } : null;

const weapon = (system = {}, flags = {}) => ({ id: 'w1', type: 'weapon', name: 'Test Weapon', system: { upgradeSlots: 1, installedUpgrades: [], ...system }, flags });
const armor = (system = {}, flags = {}) => ({
  id: 'a1',
  type: 'armor',
  name: 'Test Armor',
  system: { armorType: 'medium', isPoweredArmor: false, upgradeSlots: 1, installedUpgrades: [], ...system },
  flags
});
const equipment = (system = {}, flags = {}) => ({ id: 'e1', type: 'equipment', name: 'Test Gear', system: { upgradeSlots: 1, installedUpgrades: [], ...system }, flags });
const custom = (partial) => ({ 'foundryvtt-swse': { customization: partial } });
const withSwse = (swse, rest = {}) => ({ swse, ...rest });

const ordinaryCtx = (extra = {}) => ({ canonicalWeaponLookup: canon('ordinary'), ...extra });
const armorCtx = (stock, extra = {}) => ({ trustedClassification: trusted({ powered: false, ...(stock ? { armorStockClass: stock } : {}) }), ...extra });

function resolve(item, context) {
  const state = resolveSlotState(item, context);
  if (state.totals.status !== 'certified') battery.push(state);
  return state;
}

function codes(list) {
  return list.map((entry) => entry.code);
}

function assertNoDefinitiveTotals(state) {
  assert.notEqual(state.totals.status, 'certified');
  for (const field of ['total', 'used', 'free', 'overflow']) assert.equal(state.totals[field], null, `${field} must be null`);
}

function assertCertified(state, total, used = 0) {
  assert.equal(state.totals.status, 'certified', JSON.stringify({ conflicts: state.conflicts, unresolved: state.unresolved, reasons: state.base.reasons }));
  assert.equal(state.status, 'resolved');
  assert.equal(state.totals.total, total);
  assert.equal(state.totals.used, used);
  assert.equal(state.totals.free, total - used);
  assert.equal(state.totals.overflow, total - used < 0);
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

/* -------- 0. unresolved / conflicted results never leak capacity through any field -------- */

function numericPaths(value, prefix = '', out = []) {
  if (typeof value === 'number') out.push([prefix, value]);
  else if (Array.isArray(value)) value.forEach((entry, index) => numericPaths(entry, `${prefix}${prefix ? '.' : ''}${index}`, out));
  else if (value && typeof value === 'object') for (const key of Object.keys(value)) numericPaths(value[key], `${prefix}${prefix ? '.' : ''}${key}`, out);
  return out;
}

const ALLOWED_NUMERIC = [
  /^contractVersion$/,
  /^base\.value$/, // checked separately: non-null only when base.status is certified (a published baseline, never a total)
  /^totals\.(unverifiedAdjustmentCount|uncertifiedOccupiedCount)$/,
  /^adjustments\.\d+\.slots$/, // checked separately: non-null only when verified
  /^occupied\.\d+\.(cost|recordedCost)$/, // checked separately: cost non-null only when certified
  /^occupied\.\d+\.certified\.cost$/,
  /^legacy\.evidence\.\d+\.value(\..*)?$/,
  /^pools\.lightsaber\.chassisCapacityEvidence\.value$/,
  /^base\.classification\.weapon\.canonical\.source(\..*)?$/,
  /^(conflicts|unresolved|diagnostics)\.\d+\..*$/
];

function assertNoSecondaryCapacity(state, label) {
  assertNoDefinitiveTotals(state);
  assert.equal(state.base.status === 'certified' ? 'certified' : 'unresolved', state.base.status);
  if (state.base.status !== 'certified') assert.equal(state.base.value, null, `${label}: base.value`);
  else assert.equal(state.status === 'resolved', false, `${label}: a non-certified total can only be partial or conflicted`);
  state.adjustments.forEach((adjustment, index) => {
    if (adjustment.status !== 'verified') assert.equal(adjustment.slots, null, `${label}: adjustments.${index}.slots`);
  });
  state.occupied.forEach((occupant, index) => {
    if (occupant.costStatus !== 'certified') assert.equal(occupant.cost, null, `${label}: occupied.${index}.cost`);
  });
  for (const [where, value] of numericPaths(state)) {
    assert.ok(ALLOWED_NUMERIC.some((pattern) => pattern.test(where)), `${label}: unexpected numeric output at ${where} = ${value}`);
  }
  const serialized = JSON.stringify(state);
  assert.ok(!serialized.includes('NaN') && !serialized.includes('undefined'), `${label}: not clean JSON`);
}

/* ============================ CONFLICTED AND UNRESOLVED CASES ============================ */

// --- 4a. canonical vs trusted weapon classification (D15) ---
check('4a(a) canonical ordinary vs trusted lightsaber: conflict, both preserved, totals null', () => {
  const state = resolve(weapon(), { canonicalWeaponLookup: canon('ordinary'), trustedClassification: trusted({ weaponClass: 'lightsaber' }) });
  assert.ok(codes(state.conflicts).includes('WEAPON_CLASS_CONTRADICTION'));
  assert.equal(state.totals.status, 'conflicted');
  assert.equal(state.status, 'conflicted');
  assertNoDefinitiveTotals(state);
  assert.equal(state.base.status, 'unresolved');
  assert.equal(state.base.value, null);
  const weaponClass = state.base.classification.weapon;
  assert.equal(weaponClass.class, 'ordinary');
  assert.equal(weaponClass.canonical.weaponClass, 'ordinary');
  assert.deepEqual(weaponClass.secondary, { weaponClass: 'lightsaber', evidenceRef: EV });
  const detail = state.conflicts.find((entry) => entry.code === 'WEAPON_CLASS_CONTRADICTION').detail;
  assert.equal(detail.canonical.weaponClass, 'ordinary');
  assert.equal(detail.secondary.weaponClass, 'lightsaber');
  assert.equal(state.pools.lightsaber.applicable, false, 'the trusted lightsaber must not activate lightsaber pools');
});
check('4a(b) canonical lightsaber vs trusted ordinary: same conflict, never treated as ordinary', () => {
  const state = resolve(weapon(), { canonicalWeaponLookup: canon('lightsaber'), trustedClassification: trusted({ weaponClass: 'ordinary' }) });
  assert.ok(codes(state.conflicts).includes('WEAPON_CLASS_CONTRADICTION'));
  assert.equal(state.totals.status, 'conflicted');
  assertNoDefinitiveTotals(state);
  assert.equal(state.base.value, null);
  assert.equal(state.base.classification.weapon.class, 'lightsaber');
  assert.deepEqual(state.base.classification.weapon.secondary, { weaponClass: 'ordinary', evidenceRef: EV });
});
check('4a(c) matching classifications raise no conflict', () => {
  const ordinary = resolve(weapon(), { canonicalWeaponLookup: canon('ordinary'), trustedClassification: trusted({ weaponClass: 'ordinary' }) });
  assert.deepEqual(codes(ordinary.conflicts), []);
  assertCertified(ordinary, 1);
  const saber = resolve(weapon(), { canonicalWeaponLookup: canon('lightsaber'), trustedClassification: trusted({ weaponClass: 'lightsaber' }) });
  assert.deepEqual(codes(saber.conflicts), []);
  assert.notEqual(saber.totals.status, 'certified');
});
check('4a(d) no secondary classification raises no conflict', () => {
  assert.deepEqual(codes(resolve(weapon(), ordinaryCtx()).conflicts), []);
  assert.deepEqual(codes(resolve(weapon(), { canonicalWeaponLookup: canon('lightsaber') }).conflicts), []);
});
check('4a(e) conflicted cases leave inputs untouched', () => {
  const item = deepFreeze(weapon());
  const context = deepFreeze({ canonicalWeaponLookup: canon('ordinary'), trustedClassification: trusted({ weaponClass: 'lightsaber' }) });
  const before = JSON.stringify(item);
  resolveSlotState(item, context);
  assert.equal(JSON.stringify(item), before);
});

// --- 4. canonical failure is never overridden by trusted input ---
check('4 canonical failures stay unresolved even with trusted ordinary', () => {
  const trustedOrdinary = trusted({ weaponClass: 'ordinary' });
  const unresolved = resolve(weapon(), { canonicalWeaponLookup: unresolvedLookup, trustedClassification: trustedOrdinary });
  assert.ok(codes(unresolved.unresolved).includes('CANONICAL_IDENTITY_UNRESOLVED'));
  assert.equal(unresolved.base.classification.weapon.class, 'unverified');
  assertNoDefinitiveTotals(unresolved);
  assert.ok(codes(unresolved.diagnostics).includes('TRUSTED_WEAPON_CLASS_IGNORED'));

  const unknown = resolve(weapon(), { canonicalWeaponLookup: canon('unknown'), trustedClassification: trustedOrdinary });
  assert.ok(codes(unknown.unresolved).includes('WEAPON_CLASS_UNKNOWN_CANONICAL'));
  assert.equal(unknown.base.classification.weapon.class, 'unverified');
  assert.ok(codes(unknown.diagnostics).includes('TRUSTED_WEAPON_CLASS_IGNORED'));
  assertNoDefinitiveTotals(unknown);

  const absent = resolve(weapon(), { trustedClassification: trustedOrdinary });
  assert.ok(codes(absent.unresolved).includes('CANONICAL_LOOKUP_ABSENT'));
  assertNoDefinitiveTotals(absent);

  const throwing = resolve(weapon(), { canonicalWeaponLookup: () => { throw new Error('boom'); }, trustedClassification: trustedOrdinary });
  assert.ok(codes(throwing.unresolved).includes('CANONICAL_IDENTITY_UNRESOLVED'));
  assertNoDefinitiveTotals(throwing);
});
check('4 forged subtype and item.type alone never certify a weapon', () => {
  const forged = resolve(weapon({ subtype: 'ordinary', category: 'weapon' }), { canonicalWeaponLookup: unresolvedLookup });
  assertNoDefinitiveTotals(forged);
  const bare = resolve(weapon(), {});
  assert.ok(codes(bare.unresolved).includes('CANONICAL_LOOKUP_ABSENT'));
  assertNoDefinitiveTotals(bare);
  const legacyBare = resolve(weapon(), { canonicalWeaponLookup: legacyLookup });
  assert.ok(codes(legacyBare.unresolved).includes('WEAPON_CLASS_UNVERIFIED'));
  assertNoDefinitiveTotals(legacyBare);
});

// --- 5. lightsaber ---
check('5 lightsaber via lookup or trusted legacy: general base unresolved, pools separate, never certified', () => {
  const viaLookup = resolve(weapon({ upgradeSlots: 3 }), { canonicalWeaponLookup: canon('lightsaber') });
  const viaTrusted = resolve(weapon({ upgradeSlots: 2 }), { canonicalWeaponLookup: legacyLookup, trustedClassification: trusted({ weaponClass: 'lightsaber' }) });
  for (const state of [viaLookup, viaTrusted]) {
    assert.equal(state.base.status, 'unresolved');
    assert.equal(state.base.value, null);
    assert.ok(state.base.reasons.includes('LIGHTSABER_GENERAL_CAPACITY_UNCERTIFIED'));
    assert.equal(state.pools.lightsaber.applicable, true);
    assert.equal(state.pools.lightsaber.crystal.status, 'unresolved');
    assert.equal(state.pools.lightsaber.constructionAccessory.status, 'unresolved');
    assert.deepEqual(state.pools.lightsaber.crystal.reasons, ['LIGHTSABER_POOL_UNCERTIFIED']);
    assert.equal(state.pools.general.status, 'unresolved');
    assert.equal(state.pools.lightsaber.chassisCapacityEvidence.status, 'evidence-only');
    assertNoDefinitiveTotals(state);
  }
  assert.equal(viaLookup.pools.lightsaber.chassisCapacityEvidence.value, 3);
  assert.equal(viaTrusted.pools.lightsaber.chassisCapacityEvidence.value, 2);
});

// --- 7, 8, 6a. armor powered / default provenance ---
check('7 powered status absent or non-boolean is unknown and unresolved', () => {
  for (const value of [undefined, 'false', 0, null]) {
    const item = armor({ armorType: 'medium', isPoweredArmor: value });
    const state = resolve(item, {});
    assert.equal(state.base.classification.armor.powered.status, 'unknown');
    assert.ok(codes(state.unresolved).includes('POWERED_STATUS_UNKNOWN'));
    assertNoDefinitiveTotals(state);
  }
});
check('8 powered provenance: raw false is unproven; masked powered armor never certifies', () => {
  const rawFalse = resolve(armor({ armorType: 'medium', isPoweredArmor: false }), {});
  assert.equal(rawFalse.base.classification.armor.powered.status, 'declared-unproven');
  assert.ok(codes(rawFalse.unresolved).includes('POWERED_STATUS_UNPROVEN'));
  assert.equal(rawFalse.base.status, 'unresolved');
  assertNoDefinitiveTotals(rawFalse);

  // A powered armor whose published classification is missing, masked by the schema-defaulted false.
  const masked = resolve(armor({ name: 'Powered Battle Armor', armorType: 'heavy', isPoweredArmor: false }), {});
  assert.equal(masked.base.status, 'unresolved');
  assertNoDefinitiveTotals(masked);

  const trustedTrue = resolve(armor({ isPoweredArmor: false }), { trustedClassification: trusted({ powered: true, armorStockClass: 'medium' }) });
  assert.ok(codes(trustedTrue.unresolved).includes('POWERED_ARMOR_PRECEDENCE_UNRESOLVED'));
  assert.ok(codes(trustedTrue.diagnostics).includes('POWERED_RAW_DISAGREES_WITH_TRUSTED'));
  assert.equal(trustedTrue.base.classification.armor.powered.status, 'trusted');
  assert.equal(trustedTrue.base.classification.armor.powered.value, true);
  assertNoDefinitiveTotals(trustedTrue);

  const trustedFalseRawTrue = resolve(armor({ armorType: 'medium', isPoweredArmor: true }), armorCtx());
  assert.ok(codes(trustedFalseRawTrue.diagnostics).includes('POWERED_RAW_DISAGREES_WITH_TRUSTED'));
  assert.equal(trustedFalseRawTrue.base.classification.armor.powered.value, false);
  assertCertified(trustedFalseRawTrue, 2);

  for (const armorType of ['light', 'medium', 'heavy']) {
    const rawTrue = resolve(armor({ armorType, isPoweredArmor: true }), {});
    assert.ok(codes(rawTrue.unresolved).includes('POWERED_ARMOR_PRECEDENCE_UNRESOLVED'), armorType);
    assertNoDefinitiveTotals(rawTrue);
  }
});
check('6a default-created armor is unresolved until a trusted stock class is also supplied', () => {
  const defaults = armor({ armorType: 'light', isPoweredArmor: false, upgradeSlots: 1 });
  const onlyPowered = resolve(defaults, { trustedClassification: trusted({ powered: false }) });
  assert.equal(onlyPowered.base.status, 'unresolved');
  assert.equal(onlyPowered.base.classification.armor.stockClass.status, 'declared-unproven');
  assert.ok(codes(onlyPowered.unresolved).includes('ARMOR_STOCK_CLASS_UNPROVEN'));
  assertNoDefinitiveTotals(onlyPowered);
  const both = resolve(defaults, { trustedClassification: trusted({ powered: false, armorStockClass: 'light' }) });
  assertCertified(both, 1);
  // The default `light` on an armor whose true class is medium is never certified as light armor.
  const trueMedium = resolve(defaults, { trustedClassification: trusted({ powered: false, armorStockClass: 'medium' }) });
  assert.equal(trueMedium.base.value, 2);
  const unproven = resolve(defaults, {});
  assertNoDefinitiveTotals(unproven);
  assert.notEqual(unproven.base.status, 'certified');
});
check('6 armor light needs trusted stock class; medium and heavy keep the declared-unmodified reading', () => {
  const light = resolve(armor({ armorType: 'light' }), armorCtx());
  assert.equal(light.base.classification.armor.stockClass.status, 'declared-unproven');
  assert.ok(codes(light.unresolved).includes('ARMOR_STOCK_CLASS_UNPROVEN'));
  assertNoDefinitiveTotals(light);
  assertCertified(resolve(armor({ armorType: 'light' }), armorCtx('light')), 1);
  const medium = resolve(armor({ armorType: 'medium' }), armorCtx());
  assert.equal(medium.base.classification.armor.stockClass.status, 'declared-unmodified');
  assertCertified(medium, 2);
  assertCertified(resolve(armor({ armorType: 'heavy' }), armorCtx()), 3);
  assert.equal(medium.base.classification.armor.currentClass.value, 'medium');
});

// --- 9, 9a. modified armor and consistency ---
check('9 modified armor: stock class unrecoverable without trusted input; never stock-heavy plus a size grant', () => {
  const enlarged = armor({ armorType: 'heavy' }, custom({ structural: { sizeIncreaseApplied: true, strippedAreas: [] } }));
  const state = resolve(enlarged, armorCtx());
  assert.equal(state.base.classification.armor.stockClass.status, 'unrecoverable');
  assert.ok(codes(state.unresolved).includes('ARMOR_STOCK_CLASS_UNRECOVERABLE'));
  assert.equal(state.base.value, null);
  assertNoDefinitiveTotals(state);
  // The legacy mirrors alone also make the stock class unrecoverable.
  const mirror = resolve(armor({ armorType: 'heavy', sizeIncreaseApplied: true }), armorCtx());
  assert.equal(mirror.base.classification.armor.stockClass.status, 'unrecoverable');
  const swseMirror = resolve(armor({ armorType: 'heavy' }, withSwse({ customizationStructural: { sizeIncreaseApplied: true } })), armorCtx());
  assert.equal(swseMirror.base.classification.armor.stockClass.status, 'unrecoverable');

  const viaTrusted = resolve(enlarged, armorCtx('medium'));
  assertCertified(viaTrusted, 3);
  assert.equal(viaTrusted.base.value, 2);
  assert.equal(viaTrusted.base.classification.armor.currentClass.value, 'heavy');
  assert.equal(viaTrusted.base.classification.armor.stockClass.value, 'medium');

  const trustedHeavy = resolve(enlarged, armorCtx('heavy'));
  assert.ok(codes(trustedHeavy.conflicts).includes('SIZE_INCREASE_NOT_PERMITTED'));
  assertNoDefinitiveTotals(trustedHeavy);
});
check('9a class consistency (D13, D14)', () => {
  const sized = (armorType) => armor({ armorType }, custom({ structural: { sizeIncreaseApplied: true } }));
  const run = (stock, current) => resolve(sized(current), armorCtx(stock));
  for (const [stock, current] of [['light', 'light'], ['light', 'medium'], ['medium', 'medium'], ['medium', 'heavy']]) {
    const state = run(stock, current);
    assert.equal(state.base.classification.armor.consistency.performed, true, `${stock}/${current}`);
    assert.equal(state.base.classification.armor.consistency.reason, 'CONSISTENT', `${stock}/${current}`);
    assert.deepEqual(codes(state.conflicts), [], `${stock}/${current}`);
  }
  const lightHeavy = run('light', 'heavy');
  assert.ok(codes(lightHeavy.conflicts).includes('ARMOR_CLASS_INCONSISTENT'));
  assert.equal(lightHeavy.totals.status, 'conflicted');
  assertNoDefinitiveTotals(lightHeavy);
  const mediumLight = run('medium', 'light');
  assert.deepEqual(codes(mediumLight.conflicts), [], 'a raw light never creates a blocking contradiction');
  assert.ok(codes(mediumLight.unresolved).includes('ARMOR_CLASS_CONSISTENCY_UNRESOLVED'));
  assertNoDefinitiveTotals(mediumLight);
  const heavy = run('heavy', 'heavy');
  assert.ok(codes(heavy.conflicts).includes('SIZE_INCREASE_NOT_PERMITTED'));
  for (const unreadable of ['shield', 'bogus', undefined]) {
    const item = armor({ armorType: unreadable }, custom({ structural: { sizeIncreaseApplied: true } }));
    const state = resolve(item, armorCtx('medium'));
    assert.equal(state.base.classification.armor.consistency.performed, false);
    assert.ok(codes(state.unresolved).includes('ARMOR_CLASS_CONSISTENCY_UNRESOLVED'), String(unreadable));
    assertNoDefinitiveTotals(state);
  }
  const noSize = resolve(armor({ armorType: 'medium' }), armorCtx('heavy'));
  assert.equal(noSize.base.classification.armor.consistency.performed, false);
  assert.equal(noSize.base.classification.armor.consistency.reason, 'NO_RECORDED_SIZE_INCREASE');
  assert.deepEqual(codes(noSize.conflicts), []);
  assert.ok(codes(noSize.diagnostics).includes('ARMOR_CLASS_DIFFERS_FROM_TRUSTED_STOCK'));
  assert.equal(noSize.base.value, 3, 'the trusted stock class governs');
  const noTrusted = resolve(armor({ armorType: 'medium' }), {});
  assert.equal(noTrusted.base.classification.armor.consistency.reason, 'NO_TRUSTED_STOCK_CLASS');
});
check('10 shield, unknown or absent armor class is unclassified', () => {
  for (const armorType of ['shield', 'bogus', undefined, 42]) {
    const state = resolve(armor({ armorType }), armorCtx());
    assert.ok(codes(state.unresolved).includes('ARMOR_CLASS_UNCERTIFIED'), String(armorType));
    assert.equal(state.base.classification.armor.stockClass.status, 'unclassified');
    assertNoDefinitiveTotals(state);
  }
});

// --- 13. legacy comparison ---
check('13d unknown origin never raises a conflict or a stock-exception block; diagnostic only', () => {
  for (const stored of [0, 1, 2, 5, 'x', null]) {
    const item = armor({ armorType: 'medium', upgradeSlots: stored });
    const state = resolve(item, armorCtx());
    assert.equal(state.legacy.valueOrigin, 'unknown');
    assert.equal(state.legacy.comparison.performed, false);
    assert.equal(state.legacy.comparison.reason, 'LEGACY_VALUE_ORIGIN_UNKNOWN');
    assert.deepEqual(codes(state.conflicts), []);
    assert.ok(!codes(state.unresolved).includes('STOCK_EXCEPTION_UNCERTIFIED'));
    assertCertified(state, 2);
  }
  const state = resolve(armor({ armorType: 'medium', upgradeSlots: 5 }), armorCtx());
  const diagnostic = state.diagnostics.find((entry) => entry.code === 'LEGACY_VALUE_PROVENANCE_UNKNOWN');
  assert.deepEqual(diagnostic.detail, { stored: 5, stockBaseline: 2, computedTotal: 2, differsFromStock: true, differsFromTotal: true });
});
check('13e default-injected upgradeSlots 1 on medium/heavy armor, weapon and equipment is no conflict', () => {
  const medium = resolve(armor({ armorType: 'medium', upgradeSlots: 1 }), armorCtx());
  assertCertified(medium, 2);
  assert.deepEqual(codes(medium.conflicts), []);
  assert.ok(codes(medium.diagnostics).includes('LEGACY_VALUE_PROVENANCE_UNKNOWN'));
  const heavy = resolve(armor({ armorType: 'heavy', upgradeSlots: 1 }), armorCtx());
  assertCertified(heavy, 3);
  assert.deepEqual(codes(heavy.conflicts), []);
  assertCertified(resolve(weapon({ upgradeSlots: 1 }), ordinaryCtx()), 1);
  assertCertified(resolve(equipment({ upgradeSlots: 1 }), {}), 1);
});
check('13a authored-stock compares to the stock baseline only', () => {
  const withOrigin = (origin) => ({ canonicalWeaponLookup: canon('ordinary'), trustedClassification: trusted({ legacySlotValueOrigin: origin }) });
  const equal = resolve(weapon({ upgradeSlots: 1 }), withOrigin('authored-stock'));
  assert.equal(equal.legacy.comparison.performed, true);
  assert.equal(equal.legacy.comparison.basis, 'stock-baseline');
  assert.equal(equal.legacy.comparison.explainedBy, 'stock-baseline');
  assertCertified(equal, 1);
  const exception = resolve(weapon({ upgradeSlots: 2 }), withOrigin('authored-stock'));
  assert.ok(codes(exception.unresolved).includes('STOCK_EXCEPTION_UNCERTIFIED'));
  assert.deepEqual(codes(exception.conflicts), [], 'a differing authored stock value is not a mismatch');
  assert.ok(!codes(exception.conflicts).includes('LEGACY_VALUE_MISMATCH'));
  assertNoDefinitiveTotals(exception);
  assert.equal(exception.base.value, 1, 'no capacity is assigned from the stored value');
});
check('13b stock 1 plus a recorded structural +1 is compared to the baseline, not to 2', () => {
  const sized = weapon({ upgradeSlots: 1 }, custom({ structural: { sizeIncreaseApplied: true } }));
  const state = resolve(sized, { canonicalWeaponLookup: canon('ordinary'), trustedClassification: trusted({ legacySlotValueOrigin: 'authored-stock' }) });
  assert.equal(state.legacy.comparison.explainedBy, 'stock-baseline');
  assert.deepEqual(codes(state.conflicts), []);
  assertCertified(state, 2);
});
check('13c calculated-total compares to baseline plus verified adjustments', () => {
  const ctx = { canonicalWeaponLookup: canon('ordinary'), trustedClassification: trusted({ legacySlotValueOrigin: 'calculated-total' }) };
  const sizeFlags = custom({ structural: { sizeIncreaseApplied: true } });
  const explained = resolve(weapon({ upgradeSlots: 2 }, sizeFlags), ctx);
  assert.equal(explained.legacy.comparison.explainedBy, 'baseline-plus-adjustments');
  assertCertified(explained, 2);
  const mismatch = resolve(weapon({ upgradeSlots: 1 }, sizeFlags), ctx);
  assert.ok(codes(mismatch.conflicts).includes('LEGACY_VALUE_MISMATCH'));
  assert.equal(mismatch.totals.status, 'conflicted');
  assertNoDefinitiveTotals(mismatch);
});
check('13f comparison is skipped, never a mismatch, when preconditions fail', () => {
  const origin = (value) => trusted({ legacySlotValueOrigin: value });
  const unresolvedBase = resolve(armor({ armorType: 'medium', upgradeSlots: 9 }), { trustedClassification: origin('calculated-total') });
  assert.equal(unresolvedBase.legacy.comparison.performed, false);
  assert.equal(unresolvedBase.legacy.comparison.reason, 'BASELINE_NOT_CERTIFIED');
  assert.ok(!codes(unresolvedBase.conflicts).includes('LEGACY_VALUE_MISMATCH'));
  const saber = resolve(weapon({ upgradeSlots: 9 }), { canonicalWeaponLookup: canon('lightsaber'), trustedClassification: origin('authored-stock') });
  assert.equal(saber.legacy.comparison.reason, 'BASELINE_NOT_CERTIFIED');
  assert.deepEqual(codes(saber.conflicts), []);
  const strips = custom({ structural: { strippedAreas: ['damage', 'range'] } });
  const unverified = resolve(weapon({ upgradeSlots: 9 }, strips), { canonicalWeaponLookup: canon('ordinary'), trustedClassification: origin('calculated-total') });
  assert.equal(unverified.legacy.comparison.reason, 'ADJUSTMENT_HISTORY_INCOMPLETE');
  assert.ok(!codes(unverified.conflicts).includes('LEGACY_VALUE_MISMATCH'));
  const absent = resolve(weapon({ upgradeSlots: undefined }), { canonicalWeaponLookup: canon('ordinary'), trustedClassification: origin('authored-stock') });
  assert.equal(absent.legacy.comparison.reason, 'LEGACY_VALUE_ABSENT');
});

// --- 15, 16. strips and the Tech Specialist device slot ---
check('15 strips (D16): a recorded strip is unresolved without host evidence; invalid and duplicate are conflicts', () => {
  const ctx = ordinaryCtx();
  const stripOf = (area, item = weapon) => resolve(item({}, custom({ structural: { strippedAreas: [area] } })), ctx);

  // One recorded strip: unresolved, no capacity, whatever the area.
  for (const area of ['damage', 'range', 'design', 'stun_setting', 'autofire']) {
    const one = stripOf(area);
    assert.equal(one.adjustments.length, 1);
    assert.equal(one.adjustments[0].status, 'unresolved');
    assert.equal(one.adjustments[0].slots, null);
    assert.deepEqual(one.adjustments[0].reasons, ['STRIP_HOST_EVIDENCE_UNESTABLISHED']);
    assert.ok(codes(one.unresolved).includes('STRIP_HOST_EVIDENCE_UNESTABLISHED'));
    assert.ok(!codes(one.unresolved).includes('MULTIPLE_STRIPS_UNRESOLVED'));
    assert.equal(one.totals.unverifiedAdjustmentCount, 1);
    assertNoDefinitiveTotals(one);
  }
  // The melee-weapon/autofire counterexample and an armor strip are treated alike: eligibility is never inferred.
  const melee = resolve(weapon({ weaponSubtype: 'melee' }, custom({ structural: { strippedAreas: ['autofire'] } })), ctx);
  assert.equal(melee.adjustments[0].slots, null);
  assertNoDefinitiveTotals(melee);
  const armorStrip = resolve(armor({ armorType: 'medium' }, custom({ structural: { strippedAreas: ['joint_protection'] } })), armorCtx('medium'));
  assert.equal(armorStrip.adjustments[0].status, 'unresolved');
  assertNoDefinitiveTotals(armorStrip);

  // Multiple distinct strips: both reasons, area list preserved.
  const two = resolve(weapon({}, custom({ structural: { strippedAreas: ['damage', 'range'] } })), ctx);
  assert.equal(two.adjustments.length, 2);
  for (const adjustment of two.adjustments) {
    assert.equal(adjustment.status, 'unresolved');
    assert.equal(adjustment.slots, null);
    assert.deepEqual(adjustment.reasons, ['STRIP_HOST_EVIDENCE_UNESTABLISHED', 'MULTIPLE_STRIPS_UNRESOLVED']);
  }
  assert.deepEqual(two.unresolved.find((entry) => entry.code === 'MULTIPLE_STRIPS_UNRESOLVED').detail.areas, ['damage', 'range']);
  assert.deepEqual(two.unresolved.find((entry) => entry.code === 'STRIP_HOST_EVIDENCE_UNESTABLISHED').detail.areas, ['damage', 'range']);
  assert.equal(two.totals.unverifiedAdjustmentCount, 2);
  assertNoDefinitiveTotals(two);

  // Invalid, duplicate and unreadable strips remain conflicts.
  const invalid = resolve(weapon({}, custom({ structural: { strippedAreas: ['defensive_material'] } })), ctx);
  assert.ok(codes(invalid.conflicts).includes('INVALID_STRIP_AREA'));
  assertNoDefinitiveTotals(invalid);
  const equipmentStrip = resolve(equipment({}, custom({ structural: { strippedAreas: ['damage'] } })), {});
  assert.ok(codes(equipmentStrip.conflicts).includes('INVALID_STRIP_AREA'));
  assertNoDefinitiveTotals(equipmentStrip);
  const duplicate = resolve(weapon({}, custom({ structural: { strippedAreas: ['damage', 'damage'] } })), ctx);
  assert.ok(codes(duplicate.conflicts).includes('DUPLICATE_ADJUSTMENT'));
  assert.equal(duplicate.adjustments.length, 1);
  assert.equal(duplicate.adjustments[0].slots, null);
  assertNoDefinitiveTotals(duplicate);
  const garbage = resolve(weapon({}, custom({ structural: { strippedAreas: 'damage' } })), ctx);
  assert.ok(codes(garbage.conflicts).includes('INVALID_STRIP_AREA'));
  assertNoDefinitiveTotals(garbage);

  // Canonical strip mirrored in legacy fields: still one unresolved adjustment, nothing double counted or certified.
  const mirrored = resolve(
    weapon({ strippedFeatures: { damage: true } }, { ...custom({ structural: { strippedAreas: ['damage'] } }), swse: { customizationStructural: { strippedAreas: ['damage'] } } }),
    ctx
  );
  assert.equal(mirrored.adjustments.length, 1);
  assert.equal(mirrored.adjustments[0].slots, null);
  assert.ok(!codes(mirrored.unresolved).includes('LEGACY_STRUCTURAL_UNRECONCILED'));
  assertNoDefinitiveTotals(mirrored);

  // Size increase plus a strip: the size adjustment stays separately verified and visible, but no total is certified.
  const both = resolve(weapon({}, custom({ structural: { sizeIncreaseApplied: true, strippedAreas: ['range'] } })), ctx);
  assert.deepEqual(both.adjustments.map((entry) => [entry.id, entry.status, entry.slots]), [
    ['structural:size-increase', 'verified', 1],
    ['structural:strip:range', 'unresolved', null]
  ]);
  assertNoDefinitiveTotals(both);

  // No recorded strips (absent, empty, null): otherwise valid items certify.
  assertCertified(resolve(weapon({}, custom({ structural: { strippedAreas: [] } })), ctx), 1);
  assertCertified(resolve(weapon({}, custom({ structural: { strippedAreas: null } })), ctx), 1);
  assertCertified(resolve(equipment(), {}), 1);
  assertCertified(resolve(weapon({}, custom({ structural: { sizeIncreaseApplied: true } })), ctx), 2);
});
check('16 Tech Specialist device slot is unverified: no capacity, no certification', () => {
  const traits = [{ id: 'rec1', traitId: 'tech_device_upgrade_slot', name: 'Additional Upgrade Slot' }];
  const without = resolve(equipment(), {});
  assertCertified(without, 1);
  const withTrait = resolve(equipment({}, withSwse({ techSpecialist: { traits } })), {});
  assert.equal(withTrait.adjustments.length, 1);
  assert.equal(withTrait.adjustments[0].status, 'unverified');
  assert.equal(withTrait.adjustments[0].slots, null);
  assert.equal(withTrait.adjustments[0].kind, 'tech-specialist-device-slot');
  assert.ok(codes(withTrait.unresolved).includes('TECH_SPECIALIST_DEVICE_SLOT_UNVERIFIED'));
  assert.equal(withTrait.totals.unverifiedAdjustmentCount, 1);
  assertNoDefinitiveTotals(withTrait);
  assert.notEqual(withTrait.totals.free, 0, 'never reported as a certified +0');
  assert.equal(withTrait.totals.free, null);
  // Other Tech Specialist traits are not slot grants.
  const other = resolve(equipment({}, withSwse({ techSpecialist: { traits: [{ id: 'x', traitId: 'tech_device_durability' }] } })), {});
  assert.equal(other.adjustments.length, 0);
  assertCertified(other, 1);
});

// --- 17, 18. cost trust ---
check('17 recorded cost is a claim: certified definitions decide, disagreement is a conflict', () => {
  const entry = (extra) => ({ instanceId: 'i1', upgradeKey: 'improved_energy_cell', ...extra });
  const itemWith = (installed) => equipment({}, custom({ installedUpgrades: installed }));

  const conflict = resolve(itemWith([entry({ slotCost: 1 })]), { certifiedDefinitionLookup: defs({ improved_energy_cell: 2 }) });
  assert.equal(conflict.occupied[0].costStatus, 'conflict');
  assert.equal(conflict.occupied[0].cost, null);
  assert.equal(conflict.occupied[0].recordedCost, 1);
  assert.equal(conflict.occupied[0].certified.cost, 2);
  assert.ok(codes(conflict.conflicts).includes('COST_DISAGREES_WITH_CERTIFIED'));
  assert.equal(conflict.totals.status, 'conflicted');
  assertNoDefinitiveTotals(conflict);

  const recordedOnly = resolve(itemWith([entry({ slotCost: 1 })]), {});
  assert.equal(recordedOnly.occupied[0].costStatus, 'recorded-uncertified');
  assert.equal(recordedOnly.occupied[0].cost, null);
  assert.ok(codes(recordedOnly.unresolved).includes('COST_UNCERTIFIED'));
  assertNoDefinitiveTotals(recordedOnly);

  const recordedZeroOnly = resolve(itemWith([entry({ slotCost: 0 })]), {});
  assert.equal(recordedZeroOnly.occupied[0].costStatus, 'recorded-uncertified');
  assert.equal(recordedZeroOnly.occupied[0].cost, null);
  assertNoDefinitiveTotals(recordedZeroOnly);

  const definitionOnly = resolve(itemWith([entry({})]), { certifiedDefinitionLookup: defs({ improved_energy_cell: 2 }) });
  assert.equal(definitionOnly.occupied[0].costStatus, 'certified');
  assert.equal(definitionOnly.occupied[0].cost, 2);
  assertCertified(definitionOnly, 1, 2);

  const certifiedZero = resolve(itemWith([entry({ slotCost: 0 })]), { certifiedDefinitionLookup: defs({ improved_energy_cell: 0 }) });
  assert.equal(certifiedZero.occupied[0].cost, 0);
  assert.equal(certifiedZero.occupied[0].costStatus, 'certified');
  assertCertified(certifiedZero, 1, 0);

  const agrees = resolve(itemWith([entry({ slotCost: 1 })]), { certifiedDefinitionLookup: defs({ improved_energy_cell: 1 }) });
  assertCertified(agrees, 1, 1);
});
check('17 a certified definition must carry identity and provenance', () => {
  const malformed = (key) => ({ definitionId: '', upgradeKey: key, certifiedCost: 1, source: { ref: 'x' } });
  const state = resolve(equipment({}, custom({ installedUpgrades: [{ instanceId: 'i1', upgradeKey: 'k', slotCost: 1 }] })), { certifiedDefinitionLookup: malformed });
  assert.equal(state.occupied[0].certified, null);
  assert.equal(state.occupied[0].costStatus, 'recorded-uncertified');
  assert.ok(codes(state.diagnostics).includes('TRUSTED_INPUT_INVALID'));
  const wrongKey = resolve(equipment({}, custom({ installedUpgrades: [{ instanceId: 'i1', upgradeKey: 'k', slotCost: 1 }] })), {
    certifiedDefinitionLookup: () => ({ definitionId: 'd', upgradeKey: 'other', certifiedCost: 1, source: { ref: 'r', certification: 'c' } })
  });
  assert.equal(wrongKey.occupied[0].certified, null);
  assertNoDefinitiveTotals(wrongKey);
});
check('17a a source reference alone is not certification: missing or invalid certification is rejected', () => {
  const installed = custom({ installedUpgrades: [{ instanceId: 'i1', upgradeKey: 'k', slotCost: 1 }] });
  const withSource = (source) => () => ({ definitionId: 'd', upgradeKey: 'k', certifiedCost: 1, source });
  for (const source of [{ ref: 'r' }, { ref: 'r', certification: '' }, { ref: 'r', certification: '   ' }, { ref: 'r', certification: 7 }, { ref: 'r', certification: true }, { ref: 'r', certification: null }, { ref: 'r', certification: {} }]) {
    const state = resolve(equipment({}, installed), { certifiedDefinitionLookup: withSource(source) });
    assert.equal(state.occupied[0].certified, null, JSON.stringify(source));
    assert.equal(state.occupied[0].costStatus, 'recorded-uncertified');
    assert.ok(codes(state.diagnostics).includes('TRUSTED_INPUT_INVALID'));
    assertNoDefinitiveTotals(state);
  }
  const verified = resolve(equipment({}, installed), { certifiedDefinitionLookup: withSource({ ref: 'r', certification: 'table-verified' }) });
  assert.equal(verified.occupied[0].costStatus, 'certified');
  assertCertified(verified, 1, 1);
});
check('17b legacy structural evidence: legacy-only strips block, never count', () => {
  const ctx = ordinaryCtx();
  const viaFeatures = resolve(weapon({ strippedFeatures: { damage: true } }), ctx);
  assertNoDefinitiveTotals(viaFeatures);
  const block = viaFeatures.unresolved.find((entry) => entry.code === 'LEGACY_STRUCTURAL_UNRECONCILED');
  assert.ok(block);
  assert.deepEqual(block.detail.unrepresentedLegacyAreas, ['damage']);
  assert.equal(viaFeatures.adjustments.length, 0);
  assert.ok(viaFeatures.legacy.evidence.some((entry) => entry.field === 'system.strippedFeatures' && entry.usedInTotals === false));

  const viaFlag = resolve(weapon({}, withSwse({ customizationStructural: { strippedAreas: ['range'] } })), ctx);
  assertNoDefinitiveTotals(viaFlag);
  assert.deepEqual(viaFlag.unresolved.find((entry) => entry.code === 'LEGACY_STRUCTURAL_UNRECONCILED').detail.unrepresentedLegacyAreas, ['range']);
  assert.equal(viaFlag.adjustments.length, 0);
  assert.ok(viaFlag.legacy.evidence.some((entry) => entry.field === 'flags.swse.customizationStructural' && entry.usedInTotals === false));

  for (const bad of ['range', { range: true }, 3]) {
    assertNoDefinitiveTotals(resolve(weapon({}, withSwse({ customizationStructural: { strippedAreas: bad } })), ctx));
  }
  assertNoDefinitiveTotals(resolve(weapon({}, withSwse({ customizationStructural: { strippedAreas: [{ a: 1 }] } })), ctx));
  assertNoDefinitiveTotals(resolve(weapon({ strippedFeatures: { somethingElse: true } }), ctx));
  assertNoDefinitiveTotals(resolve(equipment({ strippedFeatures: { damage: true } }), {}));
});
check('17c legacy structural evidence: consistent mirrors are not counted twice', () => {
  const ctx = ordinaryCtx();
  const mirrored = weapon(
    { strippedFeatures: { damage: true, range: false } },
    { ...custom({ structural: { strippedAreas: ['damage'] } }), swse: { customizationStructural: { strippedAreas: ['damage'] } } }
  );
  const state = resolve(mirrored, ctx);
  // D16: the one canonical strip is unresolved (no host evidence); the mirrors add no second adjustment.
  assert.equal(state.adjustments.length, 1);
  assert.equal(state.adjustments[0].slots, null);
  assert.ok(!codes(state.unresolved).includes('LEGACY_STRUCTURAL_UNRECONCILED'));
  assertNoDefinitiveTotals(state);
  const stun = resolve(weapon({ strippedFeatures: { stun: true } }, custom({ structural: { strippedAreas: ['stun_setting'] } })), ctx);
  assert.equal(stun.adjustments.length, 1);
  assert.ok(!codes(stun.unresolved).includes('LEGACY_STRUCTURAL_UNRECONCILED'));
  assertNoDefinitiveTotals(stun);
  const sized = resolve(weapon({}, { ...custom({ structural: { sizeIncreaseApplied: true } }), swse: { customizationStructural: { sizeIncreaseApplied: true } } }), ctx);
  assertCertified(sized, 2);
});
check('17d legacy structural evidence: conflicting legacy and canonical histories block', () => {
  const ctx = ordinaryCtx();
  const differing = resolve(weapon({ strippedFeatures: { range: true } }, custom({ structural: { strippedAreas: ['damage'] } })), ctx);
  assertNoDefinitiveTotals(differing);
  assert.deepEqual(differing.unresolved.find((entry) => entry.code === 'LEGACY_STRUCTURAL_UNRECONCILED').detail.unrepresentedLegacyAreas, ['range']);
  assert.equal(differing.adjustments.length, 1);
  const extra = resolve(weapon({}, { ...custom({ structural: { strippedAreas: ['damage'] } }), swse: { customizationStructural: { strippedAreas: ['damage', 'range'] } } }), ctx);
  assertNoDefinitiveTotals(extra);
  assert.deepEqual(extra.unresolved.find((entry) => entry.code === 'LEGACY_STRUCTURAL_UNRECONCILED').detail.unrepresentedLegacyAreas, ['range']);
});
check('17e a legacy-only size increase is not counted and blocks certification', () => {
  const ctx = ordinaryCtx();
  for (const item of [weapon({ sizeIncreaseApplied: true }), weapon({}, withSwse({ customizationStructural: { sizeIncreaseApplied: true } }))]) {
    const state = resolve(item, ctx);
    assertNoDefinitiveTotals(state);
    assert.equal(state.adjustments.length, 1);
    assert.equal(state.adjustments[0].status, 'unresolved');
    assert.equal(state.adjustments[0].slots, null);
    assert.ok(codes(state.unresolved).includes('LEGACY_STRUCTURAL_UNRECONCILED'));
  }
});
check('18 missing, negative, NaN, string and fractional costs are unresolved, never 0 or 1', () => {
  for (const slotCost of [undefined, null, -1, NaN, Infinity, '2', 1.5, {}, []]) {
    const state = resolve(equipment({}, custom({ installedUpgrades: [{ instanceId: 'i1', upgradeKey: 'k', slotCost }] })), {});
    assert.equal(state.occupied[0].recordedCost, null, String(slotCost));
    assert.equal(state.occupied[0].cost, null, String(slotCost));
    assert.equal(state.occupied[0].costStatus, 'unresolved', String(slotCost));
    assert.ok(codes(state.unresolved).includes('SLOT_COST_UNRESOLVED'), String(slotCost));
    assertNoDefinitiveTotals(state);
  }
});

// --- 19, 20. identity ---
check('19 identity: ids merge only on equal instance id; key equality never merges', () => {
  const canonical = (list) => custom({ installedUpgrades: list });
  const lookup = { certifiedDefinitionLookup: defs({ k: 1 }) };

  const twoIds = resolve(equipment({}, canonical([{ instanceId: 'a', upgradeKey: 'k' }, { instanceId: 'b', upgradeKey: 'k' }])), lookup);
  assert.equal(twoIds.occupied.length, 2);
  assert.deepEqual(codes(twoIds.conflicts), []);
  assert.equal(twoIds.totals.uncertifiedOccupiedCount, 0);
  assertCertified(twoIds, 1, 2);

  const mirrored = resolve(equipment({ installedUpgrades: [{ id: 'a', name: 'K', slotsUsed: 1 }] }, canonical([{ instanceId: 'a', upgradeKey: 'k', slotCost: 1 }])), lookup);
  assert.equal(mirrored.occupied.length, 1);
  assert.equal(mirrored.occupied[0].representations.length, 2);
  assert.equal(mirrored.occupied[0].identity, 'instance-id');
  assertCertified(mirrored, 1, 1);

  const keyAcross = resolve(equipment({}, { ...canonical([{ instanceId: 'a', upgradeKey: 'k' }]), swse: { gearMods: ['k'] } }), lookup);
  assert.ok(codes(keyAcross.conflicts).includes('AMBIGUOUS_IDENTITY'));
  assert.equal(keyAcross.totals.status, 'conflicted');
  assert.equal(keyAcross.occupied.length, 2, 'candidates are listed unmerged');
  for (const candidate of keyAcross.occupied) {
    assert.equal(candidate.cost, null);
    assert.ok(candidate.reasons.includes('AMBIGUOUS_IDENTITY'));
  }
  assertNoDefinitiveTotals(keyAcross);

  const twiceInOne = resolve(equipment({}, withSwse({ gearMods: ['k', 'k'] })), lookup);
  assert.ok(codes(twiceInOne.conflicts).includes('AMBIGUOUS_IDENTITY'));
  assertNoDefinitiveTotals(twiceInOne);

  const single = resolve(equipment({}, withSwse({ gearMods: ['k'] })), lookup);
  assert.equal(single.occupied.length, 1);
  assert.equal(single.occupied[0].identity, 'key-only');
  assert.deepEqual(codes(single.conflicts), []);
  assertCertified(single, 1, 1);

  const duplicateId = resolve(equipment({}, canonical([{ instanceId: 'a', upgradeKey: 'k' }, { instanceId: 'a', upgradeKey: 'other' }])), lookup);
  assert.ok(codes(duplicateId.conflicts).includes('DUPLICATE_INSTANCE_ID'));
  assertNoDefinitiveTotals(duplicateId);

  const legacyOnly = resolve(
    weapon({}, withSwse({ blasterUpgrades: ['k'] })),
    { canonicalWeaponLookup: canon('ordinary'), ...lookup }
  );
  assert.equal(legacyOnly.occupied.length, 1);
  assert.equal(legacyOnly.occupied[0].representations[0].source, 'flags.swse.blasterUpgrades');
  assertCertified(legacyOnly, 1, 1);
});
check('20 canonical array plus legacy-only upgrades: unproven identity, not certified', () => {
  const lookup = { certifiedDefinitionLookup: defs({ k: 1, j: 1 }) };
  const sysOnly = resolve(
    equipment({ installedUpgrades: [{ upgradeKey: 'j', slotsUsed: 1 }] }, custom({ installedUpgrades: [{ instanceId: 'a', upgradeKey: 'k', slotCost: 1 }] })),
    lookup
  );
  assert.equal(sysOnly.occupied.length, 2);
  assert.ok(sysOnly.occupied.some((entry) => entry.identity === 'key-only'));
  const blaster = resolve(
    weapon({}, { ...custom({ installedUpgrades: [{ instanceId: 'a', upgradeKey: 'k', slotCost: 1 }] }), swse: { blasterUpgrades: ['k'] } }),
    { canonicalWeaponLookup: canon('ordinary'), ...lookup }
  );
  assert.ok(codes(blaster.conflicts).includes('AMBIGUOUS_IDENTITY'));
  assertNoDefinitiveTotals(blaster);
  for (const candidate of blaster.occupied) assert.equal(candidate.cost, null);
});
check('19 unreadable installed-upgrade entries are unresolved occupants, never ignored', () => {
  const state = resolve(equipment({}, custom({ installedUpgrades: [null, 'x', 7] })), {});
  assert.equal(state.occupied.length, 3);
  for (const occupant of state.occupied) assert.equal(occupant.cost, null);
  assertNoDefinitiveTotals(state);
  const notArray = resolve(equipment({}, custom({ installedUpgrades: { a: 1 } })), {});
  assert.ok(codes(notArray.unresolved).includes('SLOT_COST_UNRESOLVED'));
  assertNoDefinitiveTotals(notArray);
});

// --- 22. unsupported and hostile input ---
check('22 unsupported types and hostile input never throw and never return capacity', () => {
  const hostile = [
    null,
    undefined,
    42,
    'weapon',
    [],
    {},
    { type: 'weaponUpgrade', id: 'u1', system: { upgradeSlots: 1 } },
    { type: 'bodysuit' },
    { type: 'blaster' },
    { type: 'gear' },
    { type: 'weapon', system: null, flags: null },
    { type: 'armor', system: 'x', flags: 5 },
    new Proxy({}, { get() { throw new Error('hostile'); } })
  ];
  for (const item of hostile) {
    let state;
    assert.doesNotThrow(() => { state = resolveSlotState(item, {}); });
    assert.ok(['unsupported', 'unresolved', 'partial', 'conflicted'].includes(state.status), String(state.status));
    assertNoDefinitiveTotals(state);
    assert.equal(JSON.parse(JSON.stringify(state)).contractVersion, CONTRACT_VERSION);
  }
  assert.equal(resolveSlotState({ type: 'weaponUpgrade' }, {}).status, 'unsupported');
  assert.equal(resolveSlotState({ type: 'weaponUpgrade' }, {}).domain, null);
  assert.ok(codes(resolveSlotState(null, {}).diagnostics).includes('UNSUPPORTED_DOMAIN'));
  assert.doesNotThrow(() => resolveSlotState(equipment(), { canonicalWeaponLookup: 5, certifiedDefinitionLookup: 'x', trustedClassification: 7, baselineTable: [] }));
});
check('trusted classification without verified provenance is not trusted', () => {
  const noRef = resolve(armor({ armorType: 'medium' }), { trustedClassification: { powered: false } });
  assert.equal(noRef.base.status, 'unresolved');
  assert.ok(codes(noRef.diagnostics).includes('TRUSTED_INPUT_INVALID'));
  assertNoDefinitiveTotals(noRef);
});

// --- 11, 12. identity of domain; legacy evidence ---
check('11 a renamed item or forged category never changes domain, class or status', () => {
  const plain = resolve(armor({ armorType: 'medium' }), armorCtx());
  for (const name of ['Power Armor', 'Heavy Plate', 'Lightsaber']) {
    const state = resolve({ ...armor({ armorType: 'medium', category: 'lightsaber', subtype: 'lightsaber' }), name }, armorCtx());
    assert.equal(state.domain, 'armor');
    assert.equal(state.base.value, 2);
    assert.deepEqual(state.totals, plain.totals);
  }
  const typeSpoof = resolve({ type: 'equipment', system: { category: 'weapon', armorType: 'heavy' } }, {});
  assert.equal(typeSpoof.domain, 'equipment');
  assertCertified(typeSpoof, 1);
});
check('12 system.upgradeSlots and stockSlotOverride are evidence only', () => {
  for (const stored of [1, 3, 0, 'garbage', undefined]) {
    const item = equipment({ upgradeSlots: stored }, custom({ overrides: { stockSlotOverride: 9 } }));
    const state = resolve(item, {});
    assertCertified(state, 1);
    assert.equal(state.base.value, 1);
    const fields = state.legacy.evidence.map((entry) => entry.field);
    assert.ok(fields.includes('flags.foundryvtt-swse.customization.overrides.stockSlotOverride'));
    assert.equal(fields.includes('system.upgradeSlots'), stored !== undefined);
    for (const entry of state.legacy.evidence) assert.equal(entry.usedInTotals, false);
  }
  const strippedLegacy = resolve(equipment({ strippedFeatures: { damage: true } }), {});
  assert.ok(strippedLegacy.legacy.evidence.some((entry) => entry.field === 'system.strippedFeatures' && entry.usedInTotals === false));
});

/* ============================== ORDINARY CERTIFIED TOTALS ============================== */

check('1 equipment base 1 certified', () => {
  const state = resolve(equipment(), {});
  assertCertified(state, 1);
  assert.equal(state.totals.free, 1);
  assert.equal(state.base.basis, 'raw-default');
  assert.equal(state.base.source.ref, 'scum-and-villainy:p37');
  assert.equal(state.domain, 'equipment');
});
check('2 canonical ordinary weapon base 1', () => {
  const state = resolve(weapon(), ordinaryCtx());
  assertCertified(state, 1);
  assert.equal(state.base.classification.weapon.evidence, 'canonical-lookup');
  assert.equal(state.pools.general.status, 'certified');
  assert.equal(state.pools.lightsaber.applicable, false);
});
check('3 lookup-confirmed legacy weapon may be classified by trusted input', () => {
  const state = resolve(weapon(), { canonicalWeaponLookup: legacyLookup, trustedClassification: trusted({ weaponClass: 'ordinary' }) });
  assertCertified(state, 1);
  assert.equal(state.base.classification.weapon.evidence, 'trusted-input');
  const none = resolve(weapon(), { canonicalWeaponLookup: legacyLookup });
  assert.ok(codes(none.unresolved).includes('WEAPON_CLASS_UNVERIFIED'));
  assertNoDefinitiveTotals(none);
});
check('14 a size increase recorded in several representations counts once', () => {
  const item = weapon({ sizeIncreaseApplied: true }, { ...custom({ structural: { sizeIncreaseApplied: true } }), swse: { customizationStructural: { sizeIncreaseApplied: true } } });
  const state = resolve(item, ordinaryCtx());
  assert.equal(state.adjustments.length, 1);
  assert.equal(state.adjustments[0].slots, 1);
  assertCertified(state, 2);
  const armorSized = resolve(armor({ armorType: 'medium' }, custom({ structural: { sizeIncreaseApplied: true } })), armorCtx('medium'));
  assertCertified(armorSized, 3);
});
check('21 overflow is reported, never clamped', () => {
  const state = resolve(equipment({}, custom({ installedUpgrades: [{ instanceId: 'a', upgradeKey: 'k' }] })), { certifiedDefinitionLookup: defs({ k: 2 }) });
  assertCertified(state, 1, 2);
  assert.equal(state.totals.free, -1);
  assert.equal(state.totals.overflow, true);
});

/* ================================ DETERMINISM, PURITY ================================ */

check('23 determinism: repeated calls deep-equal; shuffled input order gives identical output', () => {
  const lookup = { certifiedDefinitionLookup: defs({ a: 1, b: 0, c: 2 }) };
  const installed = [
    { instanceId: 'i3', upgradeKey: 'c', slotCost: 2 },
    { instanceId: 'i1', upgradeKey: 'a', slotCost: 1 },
    { instanceId: 'i2', upgradeKey: 'b', slotCost: 0 }
  ];
  const strips = ['range', 'damage'];
  const make = (list, areas) => weapon({}, { ...custom({ installedUpgrades: list, structural: { strippedAreas: areas } }), swse: { gearMods: ['x', 'y'] } });
  const ctx = { canonicalWeaponLookup: canon('ordinary'), ...lookup };
  const first = resolveSlotState(make(installed, strips), ctx);
  const second = resolveSlotState(make(installed, strips), ctx);
  const shuffled = resolveSlotState(make([installed[1], installed[2], installed[0]], [...strips].reverse()), ctx);
  assert.deepEqual(second, first);
  assert.deepEqual(shuffled, first);
  assert.equal(JSON.stringify(shuffled), JSON.stringify(first));
});
check('3 output is JSON-serializable with no references into the input', () => {
  const item = weapon({ upgradeSlots: { nested: [1, 2] } }, custom({ installedUpgrades: [{ instanceId: 'a', upgradeKey: 'k', slotCost: 1 }] }));
  const state = resolveSlotState(item, ordinaryCtx());
  assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
  const evidence = state.legacy.evidence.find((entry) => entry.field === 'system.upgradeSlots');
  assert.notEqual(evidence.value, item.system.upgradeSlots);
  item.system.upgradeSlots.nested.push(3);
  assert.deepEqual(evidence.value, { nested: [1, 2] });
});
check('24 a deep-frozen input does not throw and is unchanged', () => {
  const item = deepFreeze(armor({ armorType: 'heavy' }, custom({ installedUpgrades: [{ instanceId: 'a', upgradeKey: 'k', slotCost: 1 }], structural: { strippedAreas: ['joint_protection'] } })));
  const context = deepFreeze({ trustedClassification: trusted({ powered: false }), certifiedDefinitionLookup: defs({ k: 1 }) });
  const before = JSON.stringify(item);
  assert.doesNotThrow(() => resolveSlotState(item, context));
  assert.equal(JSON.stringify(item), before);
});

/* ================================== STATIC GUARDS ================================== */

check('25 static guard: the module has no mutation, clock, randomness or network calls', () => {
  const source = fs.readFileSync(moduleFile, 'utf8');
  for (const forbidden of ['ActorEngine', '.update(', 'setFlag', 'unsetFlag', 'game.', 'fetch(', 'Date.now', 'Math.random']) {
    assert.ok(!source.includes(forbidden), `module must not contain ${forbidden}`);
  }
  assert.ok(!/^\s*import\s/m.test(source), 'the module imports nothing');
  assert.ok(!/require\(/.test(source));
});
check('26 no-regression guard: no existing file imports the new module', () => {
  const importers = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(m?js)$/.test(entry.name) && full !== moduleFile && fs.readFileSync(full, 'utf8').includes('modification-slot-authority')) importers.push(path.relative(repoRoot, full));
    }
  };
  walk(path.join(repoRoot, 'scripts'));
  assert.deepEqual(importers, []);
});

/* ======================= NO SECONDARY CAPACITY FROM ANY NON-CERTIFIED RESULT ======================= */

check('0 no unresolved or conflicted result exposes usable capacity in any field', () => {
  assert.ok(battery.length >= 40, `battery too small: ${battery.length}`);
  battery.forEach((state, index) => assertNoSecondaryCapacity(state, `battery[${index}]`));
});

console.log(`modification-slot-authority: ${checks} checks OK (${battery.length} non-certified results scanned for secondary capacity)`);
