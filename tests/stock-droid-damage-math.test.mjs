import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// P0-4 — Stock-droid printed-damage contract (correction pass,
// "fix(droids): correct stock combat and customization validation").
//
// flags.swse.stockDroidAttack.publishedDamage was stored by the stock
// importer but never consumed by any damage-rolling authority —
// resolveDamageBonus() applied the normal half-level/ability/weapon
// enhancement composition on top of the weapon's base dice for every
// actor, droid or not, silently double-counting damage already baked
// into the published formula. This suite proves
// resolveStockDroidDamageContract() (and resolveDamageBonus()'s use of
// it) replaces half-level/ability/enhancement with the published formula
// while situational modifiers (rage, effect intents, combat options,
// scoped feats) still apply on top of it — mirroring the P0-3 attack fix.
//
// Coverage tiers:
//   Tests 1-6: (a) direct production-path — combat-roll-math.js loads and
//   resolveDamageBonus()/resolveStockDroidDamageContract() execute for
//   real through the Foundry-shim harness, with the same test-file-local
//   `window` workaround as tests/stock-droid-attack-math.test.mjs (this
//   module's import graph is shared with resolveAttackBonus's).
//   Test 7: (c) structural/source-inspection only — damage.js and
//   attacks.js pull in RollEngine, SWSEChat, and AmmoSystem, which this
//   harness does not shim, so the actual roll-formula assembly in those
//   files is verified by reading their source text for the
//   flags.stockDamageFormula read, not by executing rollDamage()/
//   rollAttackAndDamageWithNarration() end-to-end.

globalThis.window = globalThis.window || {};

registerFoundryPathLoader();
installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1' }, combat: null } });

const { resolveDamageBonus, resolveStockDroidDamageContract, resolveDamageComposition, buildDamageFormula } = await import('../scripts/engine/combat/combat-roll-math.js');

function explicitStockDroid(overrides = {}) {
  return {
    id: 'droid-1', type: 'droid', name: 'Test Droid',
    items: [],
    flags: {},
    system: { droidCalculationMode: 'stock-statblock', ...overrides.system },
    getFlag() { return undefined; },
    ...overrides
  };
}

function explicitPlayableDroid(overrides = {}) {
  return {
    id: 'droid-2', type: 'droid', name: 'Playable Droid',
    items: [],
    flags: {},
    system: { droidCalculationMode: 'playable-derived', abilities: { str: { mod: 2 } }, level: 1, ...overrides.system },
    getFlag() { return undefined; },
    ...overrides
  };
}

function stockWeapon(overrides = {}) {
  return {
    id: 'w1', name: 'Integrated Blaster',
    system: { damage: '1d3', flatDamageBonus: 4 },
    flags: { swse: { stockDroidAttack: { publishedAttackTotal: 9, publishedDamage: '2d6+3', mode: 'stock-statblock', sourceStatblock: true, ...overrides } } }
  };
}

// 1. resolveStockDroidDamageContract() returns null for a non-stock actor.
{
  assert.equal(resolveStockDroidDamageContract(explicitPlayableDroid(), stockWeapon(), {}), null);
}

// 2. resolveStockDroidDamageContract() returns null for a weapon with no
// stock damage contract at all, even on a stock-mode droid.
{
  const plainWeapon = { id: 'w2', name: 'Fists', system: {} };
  assert.equal(resolveStockDroidDamageContract(explicitStockDroid(), plainWeapon, {}), null);
}

// 3. Printed formula alone: no situational context resolves to formula +
// zero bonus, with a single "Published Statblock Formula" component and
// no half-level/ability/enhancement components.
{
  const result = resolveDamageBonus(explicitStockDroid(), stockWeapon(), {});
  assert.equal(result.total, 0);
  // R4-4: the published formula is now re-rendered through
  // buildStockDroidDamageFormula() (canonical spacing) even with zero
  // die-based modifiers, rather than passed through as a raw literal —
  // this proves the same builder always runs, not just when a die-based
  // combat option is active.
  assert.equal(result.components['Published Statblock Formula'], '2d6 + 3');
  assert.equal(result.components['½ Level'], undefined);
  assert.equal(result.components['Ability'], undefined);
  assert.equal(result.components['Enhancement'], undefined);
  assert.equal(result.flags.stockDroidFlat, true);
  assert.equal(result.flags.stockDamageFormula, '2d6 + 3');
}

// 4. No half-level/ability/enhancement double count: even though the
// weapon carries its own flatDamageBonus (would normally be an
// "Enhancement" component) and the actor has a level/ability score that
// would normally contribute half-level/ability damage, none of that is
// added on top of the published formula.
{
  const droid = explicitStockDroid({ system: { droidCalculationMode: 'stock-statblock', level: 10, abilities: { str: { mod: 5 } } } });
  const result = resolveDamageBonus(droid, stockWeapon(), {});
  assert.equal(result.total, 0, 'half-level/ability/enhancement must not be added on top of the published damage formula');
}

// 5. A converted (playable-derived) droid falls through to normal damage
// composition even though the weapon still carries a stock damage
// contract flag (not yet neutralized).
{
  const result = resolveDamageBonus(explicitPlayableDroid(), stockWeapon(), {});
  assert.equal(result.flags.stockDroidFlat, undefined);
  assert.equal(result.flags.stockDamageFormula, undefined);
  assert.ok('Ability' in result.components);
}

// 6. A weapon with no stock damage contract falls through to normal
// composition even for a stock-mode droid actor.
{
  const droid = explicitStockDroid();
  const plainWeapon = { id: 'w2', name: 'Fists', system: { flatDamageBonus: 2 } };
  const result = resolveDamageBonus(droid, plainWeapon, {});
  assert.equal(result.flags.stockDroidFlat, undefined);
  assert.equal(result.components['Enhancement'], 2);
}

// 7. The base-formula call sites must use the published formula (via
// flags.stockDamageFormula) as the dice base instead of weapon.system.damage
// — production-path proof that the contract is actually wired into the
// roll formula, not just returned and ignored.
//
// Damage SSOT migration (docs/audits/v2-damage-modifier-authority-audit.md
// §18): the contract's enforcement point moved from being read
// independently inside damage.js/attacks.js's own formula-building code to
// being read exactly once, canonically, inside
// combat-roll-math.js#resolveDamageComposition() (`bonus.flags?.
// stockDamageFormula ?? weapon.system.damage ?? ...`) — both damage.js#
// rollDamage() and attacks.js's rollAttackAndDamageWithNarration() now call
// that single function rather than each reading the flag independently, so
// there is exactly one place left to verify this, not two.
{
  const rollMathSource = await (await import('node:fs/promises')).readFile(
    new URL('../scripts/engine/combat/combat-roll-math.js', import.meta.url), 'utf8'
  );
  assert.match(rollMathSource, /bonus\.flags\?\.stockDamageFormula/, 'resolveDamageComposition() must read resolveDamageBonus()\'s stockDamageFormula flag as its dice base');
  const damageSource = await (await import('node:fs/promises')).readFile(
    new URL('../scripts/combat/rolls/damage.js', import.meta.url), 'utf8'
  );
  assert.match(damageSource, /resolveDamageComposition\(/, 'damage.js#rollDamage() must call the canonical resolveDamageComposition(), which owns the stockDamageFormula contract');
  const attacksSource = await (await import('node:fs/promises')).readFile(
    new URL('../scripts/combat/rolls/attacks.js', import.meta.url), 'utf8'
  );
  assert.match(attacksSource, /resolveDamageComposition\(/, 'attacks.js#rollAttackAndDamageWithNarration() must call the canonical resolveDamageComposition(), which owns the stockDamageFormula contract');
}

// ---------------------------------------------------------------------
// R4-4 — die-based situational modifiers (Rapid Shot/Rapid Strike/
// Mighty Swing's die-step, Deadeye/Burst Fire's extra weapon dice, and
// critical-only die-step increases) must still adjust the published
// formula's dice portion. Exercised here via the underlying weapon-rule
// types (WEAPON_DAMAGE_DIE_SIZE_STEP / WEAPON_DAMAGE_DIE_STEP /
// CRITICAL_DAMAGE_DIE_STEP) every one of those five named combat options
// ultimately funnels through in CombatOptionResolver — this proves the
// wiring for the two mechanisms (die-size stepping, extra dice) and the
// critical-only gating, rather than fixturing all five toggle-based
// combat options individually (which would additionally require
// per-option requiresAim/requiresAutofire/weapon-type context — the same
// arithmetic path, just reached a different way).
// ---------------------------------------------------------------------

function actorWithRule(rule, overrides = {}) {
  return explicitStockDroid({
    items: [{ id: 'feat-1', type: 'feat', name: 'Test Combat Feat', system: { abilityMeta: { rules: [rule] } } }],
    ...overrides
  });
}

// Damage SSOT correction (docs/audits/v2-damage-modifier-authority-audit.md
// §18, "Blocker 3 — stock-droid dice modifiers are applied twice"): dice
// mutation for die-based combat options used to happen TWICE — once here,
// baked into resolveStockDroidDamageContract()'s own
// components['Published Statblock Formula']/flags.stockDamageFormula, and
// again inside resolveDamageComposition()/buildDamageFormula() (which
// treats that already-mutated string as its own unmutated base and steps/
// extra-dices it a second time). Fixed by drawing the boundary the
// project's own additive/dice split already intends:
// resolveDamageBonus()/resolveStockDroidDamageContract() now ALWAYS
// return the RAW published formula (only re-rendered for canonical
// spacing, never stepped or extra-diced) — tests 8-11 below now assert
// that directly. The actual die-based mutation is proven once, through
// resolveDamageComposition()/buildDamageFormula(), in tests 8b-11b.

// 8. A die-SIZE step rule (the mechanism Rapid Shot/Rapid Strike/Mighty
// Swing use) must NOT mutate resolveDamageBonus()'s own published-formula
// component — that dice mutation now happens exactly once, downstream.
{
  const droid = actorWithRule({ type: 'WEAPON_DAMAGE_DIE_SIZE_STEP', value: 1 });
  const result = resolveDamageBonus(droid, stockWeapon(), {});
  assert.equal(result.components['Published Statblock Formula'], '2d6 + 3', 'resolveDamageBonus() must return the RAW published formula, unstepped, even with an active die-size-step rule');
  assert.equal(result.flags.stockDamageFormula, '2d6 + 3');
}

// 8b. The die-size step DOES reach the final formula — exactly once —
// through resolveDamageComposition()/buildDamageFormula().
{
  const droid = actorWithRule({ type: 'WEAPON_DAMAGE_DIE_SIZE_STEP', value: 1 });
  const composition = resolveDamageComposition(droid, stockWeapon(), {});
  assert.equal(composition.dice.base, '2d6 + 3', 'composition.dice.base is the raw published formula');
  assert.equal(buildDamageFormula(composition), '2d8 + 3', 'the final formula steps 2d6 -> 2d8 exactly once');
}

// 9. An extra-weapon-dice rule (the mechanism Deadeye/Burst Fire use)
// must NOT mutate resolveDamageBonus()'s own published-formula component.
{
  const droid = actorWithRule({ type: 'WEAPON_DAMAGE_DIE_STEP', value: 1 });
  const result = resolveDamageBonus(droid, stockWeapon(), {});
  assert.equal(result.components['Published Statblock Formula'], '2d6 + 3', 'resolveDamageBonus() must return the RAW published formula, with no extra die added, even with an active extra-weapon-dice rule');
}

// 9b. The extra die DOES reach the final formula — exactly once.
{
  const droid = actorWithRule({ type: 'WEAPON_DAMAGE_DIE_STEP', value: 1 });
  const composition = resolveDamageComposition(droid, stockWeapon(), {});
  const formula = buildDamageFormula(composition);
  const extraDiceMatches = formula.match(/\+\s*1d6\b/g) || [];
  assert.equal(extraDiceMatches.length, 1, 'exactly one extra die term, never two');
}

// 10. A critical-only die-step rule does NOT affect resolveDamageBonus()'s
// published-formula component regardless of critical state (it never
// mutates dice at all anymore).
{
  const droid = actorWithRule({ type: 'CRITICAL_DAMAGE_DIE_STEP', value: 1 });
  const result = resolveDamageBonus(droid, stockWeapon(), { critical: false });
  assert.equal(result.components['Published Statblock Formula'], '2d6 + 3', 'resolveDamageBonus() never mutates dice, critical or not');
}

// 11. The SAME critical-only die-step rule DOES reach composition — exactly
// once — only on a confirmed critical hit. Checked at the dice.base/
// dieStepIncreases level (not the final formula string), since a
// confirmed critical also triggers buildDamageFormula()'s own multiplier
// wrap — a separate, already-covered concern (tests/damage-modifier-ssot.
// test.mjs golden 20/21) this test must not conflate with die-stepping.
{
  const droid = actorWithRule({ type: 'CRITICAL_DAMAGE_DIE_STEP', value: 1 });
  const nonCritical = resolveDamageComposition(droid, stockWeapon(), { critical: false });
  assert.equal(nonCritical.dice.base, '2d6 + 3', 'dice.base is always the raw published formula');
  assert.equal(nonCritical.dice.dieStepIncreases, 0, 'a critical-only die-step must not apply to a non-critical roll');
  const critical = resolveDamageComposition(droid, stockWeapon(), { critical: true });
  assert.equal(critical.dice.base, '2d6 + 3', 'dice.base stays raw even on a critical roll');
  assert.equal(critical.dice.dieStepIncreases, 1, 'a critical-only die-step applies exactly once on a confirmed critical hit');
  assert.equal(buildDamageFormula({ ...critical, critical: { ...critical.critical, isCritical: false } }), '2d8 + 3',
    'the die step itself (isolated from the separate critical-multiplier wrap) steps 2d6 -> 2d8 exactly once');
}

// 12. Die-size step and extra weapon dice compose together correctly:
// extra dice are added at the ALREADY-stepped size. resolveDamageBonus()
// itself still returns the raw formula (dice mutation moved downstream);
// resolveDamageComposition()/buildDamageFormula() is where both apply,
// together, exactly once each.
{
  const droid = actorWithRule({ type: 'WEAPON_DAMAGE_DIE_SIZE_STEP', value: 1 }, {
    items: [
      { id: 'feat-1', type: 'feat', name: 'Size Step', system: { abilityMeta: { rules: [{ type: 'WEAPON_DAMAGE_DIE_SIZE_STEP', value: 1 }] } } },
      { id: 'feat-2', type: 'feat', name: 'Extra Dice', system: { abilityMeta: { rules: [{ type: 'WEAPON_DAMAGE_DIE_STEP', value: 1 }] } } }
    ]
  });
  const result = resolveDamageBonus(droid, stockWeapon(), {});
  assert.equal(result.components['Published Statblock Formula'], '2d6 + 3', 'resolveDamageBonus() returns the raw formula even with both a die-size-step AND an extra-dice rule active');

  const composition = resolveDamageComposition(droid, stockWeapon(), {});
  assert.equal(composition.dice.base, '2d6 + 3');
  assert.equal(composition.dice.dieStepIncreases, 1);
  assert.equal(composition.dice.extraWeaponDice, 1);
  // The extra-weapon-die term appends after the full (already-stepped)
  // base string — for a stock formula that base already includes its own
  // flat modifier as one string, so the extra die lands after it rather
  // than between the dice and the flat term (mathematically identical to
  // an ordinary weapon's dice-then-flat ordering, just not term-order-
  // identical with it — see the equivalent note in
  // tests/damage-modifier-ssot.test.mjs's own Blocker 3 test).
  assert.equal(buildDamageFormula(composition), '2d8 + 3 + 1d8', 'die-size step and extra weapon dice compose together correctly, exactly once each, through the canonical formula builder');
}

console.log('Stock-droid damage math tests passed.');
