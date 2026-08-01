import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 2 fix (combat display parity): resolveAttackBonus(actor, weapon,
// actionId, context) previously received a literal `null` for actionId at
// both call sites in scripts/combat/rolls/attacks.js, even though an
// actionId was already available a few lines away on rollOptions/
// workflowContext (used for message metadata). Action-linked talent
// bonuses (TalentActionLinker) are keyed off actionId, so any talent linked
// to an action a caller *did* supply an actionId for was silently skipped.
//
// This suite proves two things:
//   1. attacks.js source no longer passes the literal `null` — it derives
//      resolvedActionId from the same authority order the brief specified
//      (rollOptions.actionId ?? workflowContext.actionId ?? null) at both
//      call sites, and a plain no-options attack still resolves actionId to
//      null (unchanged behavior).
//   2. resolveAttackBonus() itself — the shared authority both call sites
//      delegate to — applies a linked talent's bonus exactly once when a
//      real actionId is supplied, and applies none when it is not.

const attacksSource = await readFile(new URL('../scripts/combat/rolls/attacks.js', import.meta.url), 'utf8');

// No remaining call site passes the literal `null` as the actionId argument.
{
  const regressedCalls = attacksSource.match(/resolveAttackBonus\(actor, weapon, null,/g) ?? [];
  assert.equal(regressedCalls.length, 0, 'no resolveAttackBonus() call site should hardcode actionId to null');
}

// Both call sites derive resolvedActionId from rollOptions.actionId first,
// falling back to workflowContext.actionId, matching the brief's authority
// order — and both then pass that variable (not a literal) into the resolver.
{
  const resolvedActionIdDeclarations = attacksSource.match(/const resolvedActionId = rollOptions\.actionId \?\? workflowContext\?\.actionId \?\? null;/g) ?? [];
  assert.equal(resolvedActionIdDeclarations.length, 2, 'expected the actionId authority chain to be declared at both call sites');

  const resolverCallsUsingIt = attacksSource.match(/resolveAttackBonus\(actor, weapon, resolvedActionId,/g) ?? [];
  assert.equal(resolverCallsUsingIt.length, 2, 'expected both resolveAttackBonus() call sites to consume resolvedActionId');
}

// --- Resolver-level behavior (the shared authority both call sites use) ---

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1' }, combat: null } });

const { resolveAttackBonus } = await import('../scripts/engine/combat/combat-roll-math.js');

function testActor(overrides = {}) {
  const { system: systemOverrides, ...rest } = overrides;
  return {
    id: 'pc-1', type: 'character', name: 'Test Character',
    items: [{ type: 'talent', name: 'Linked Talent' }],
    flags: {},
    system: { bab: 3, abilities: { str: { mod: 2 }, dex: { mod: 1 } }, ...systemOverrides },
    getFlag() { return undefined; },
    ...rest
  };
}

function testWeapon(overrides = {}) {
  const { system: systemOverrides, ...rest } = overrides;
  return {
    id: 'w1', name: 'Vibrosword', type: 'weapon',
    system: { attackAttribute: 'str', damage: '2d6', proficient: true, ...systemOverrides },
    ...rest
  };
}

// Case 1: no actionId supplied (the plain "Roll Attack" click path) —
// behavior is byte-for-byte unchanged from before this fix.
{
  window.SWSE = { TalentActionLinker: { MAPPING: { talentToAction: { 'Linked Talent': 'melee-attack' } } , calculateBonusForAction() { throw new Error('must not be called without an actionId'); } } };
  const result = resolveAttackBonus(testActor(), testWeapon(), null, {});
  assert.equal(result.components['Talent'], undefined, 'no actionId means no talent lookup and no Talent component');
}

// Case 2: a real actionId is supplied and a talent is linked to it — the
// resolver's total includes the linked bonus exactly once.
{
  window.SWSE = {
    TalentActionLinker: {
      MAPPING: { talentToAction: { 'Linked Talent': 'melee-attack' } },
      calculateBonusForAction(actor, actionId) {
        assert.equal(actionId, 'melee-attack', 'resolver must forward the exact actionId it was given');
        return { value: 3, talents: ['Linked Talent'] };
      }
    }
  };
  const baseline = resolveAttackBonus(testActor(), testWeapon(), null, {});
  const withAction = resolveAttackBonus(testActor(), testWeapon(), 'melee-attack', {});
  assert.equal(withAction.total, baseline.total + 3, 'linked talent bonus must be added exactly once on top of the baseline');
  assert.equal(withAction.components['Talent'], 3);
}

// Case 3: an actionId with no linked talent resolves like no actionId at all
// (no phantom bonus, no double count through some other path).
{
  window.SWSE = { TalentActionLinker: { MAPPING: { talentToAction: {} }, calculateBonusForAction() { return { value: 0, talents: [] }; } } };
  const result = resolveAttackBonus(testActor(), testWeapon(), 'ranged-attack', {});
  assert.equal(result.components['Talent'], undefined);
}

console.log('attack-action-id-threading.test.mjs OK');
