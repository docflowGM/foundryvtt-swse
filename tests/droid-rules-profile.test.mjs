import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
registerFoundryPathLoader();
const { resolveDroidRulesProfile, followsDroidRules, componentMayContributeDroidModifiers } =
  await import('../scripts/domain/droids/droid-rules-profile.js');

const pcDroid = { type: 'droid', system: {}, flags: {} };
const follower = (extra = {}) => ({ type: 'npc', system: { isDroid: true, isFollower: true, ...extra }, flags: {} });
const ledgerComp = { installed: true, primarySource: { kind: 'installedLedger' } };
const mirrorComp = { installed: true, primarySource: { kind: 'droidSystemsRecord' } };
const itemComp = { installed: true, primarySource: { kind: 'embeddedItem' } };

// Identity is independent from the Foundry type.
assert.equal(followsDroidRules(pcDroid), true);
assert.equal(followsDroidRules(follower()), true);
assert.equal(followsDroidRules({ type: 'character', system: {}, flags: {} }), false);
assert.equal(followsDroidRules({ type: 'npc', system: {}, flags: {} }), false);
assert.equal(followsDroidRules(null), false);

// Dimensions are reported independently.
{
  const p = resolveDroidRulesProfile(follower());
  assert.equal(p.foundryType, 'npc');
  assert.equal(p.droidRules.isDroid, true);
  assert.equal(p.follower.isFollower, true);
  assert.equal(p.calculationMode, 'playable-derived');
  const pc = resolveDroidRulesProfile(pcDroid);
  assert.equal(pc.follower.isFollower, false);
  assert.equal(pc.confidence, 'EXPLICIT');
}

// Names / species text are never evidence.
assert.equal(followsDroidRules({ type: 'npc', name: 'R2 Droid', system: { species: 'Droid' }, flags: {} }), false);

// Contradictory evidence fails closed and lists the conflict.
{
  const p = resolveDroidRulesProfile({ type: 'droid', system: { isDroid: false }, flags: {} });
  assert.equal(p.droidRules.isDroid, false);
  assert.equal(p.confidence, 'CONTRADICTORY');
  assert.equal(p.droidRules.conflicting.length, 1);
}

// Modifier eligibility: a follower gains ONLY confirmed-ledger hardware.
assert.equal(componentMayContributeDroidModifiers(follower(), ledgerComp), true, 'NPC follower + confirmed ledger -> modifiers');
assert.equal(componentMayContributeDroidModifiers(follower(), mirrorComp), false, 'NPC follower + droidSystems-only -> NO modifiers');
assert.equal(componentMayContributeDroidModifiers(follower(), itemComp), false, 'NPC follower + Item-only -> NO modifiers');
assert.equal(componentMayContributeDroidModifiers({ type: 'npc', system: {}, flags: {} }, ledgerComp), false, 'non-droid never');
assert.equal(componentMayContributeDroidModifiers({ type: 'droid', system: { isDroid: false }, flags: {} }, ledgerComp), false, 'contradictory fails closed');
assert.equal(componentMayContributeDroidModifiers(pcDroid, mirrorComp), false, 'PC droid: mirror-only is not installed hardware');
assert.equal(componentMayContributeDroidModifiers(pcDroid, itemComp), false, 'PC droid: Item-only is not installed hardware');
assert.equal(componentMayContributeDroidModifiers(pcDroid, ledgerComp), true, 'PC droid: confirmed ledger hardware');

console.log('Droid rules profile tests passed.');

// Structural: the ModifierEngine droid-component gate and the follower
// garage hotfix must route through the profile, not re-derive identity.
{
  const fs = await import('node:fs');
  const me = fs.readFileSync('scripts/engine/effects/modifiers/ModifierEngine.js', 'utf8');
  assert.match(me, /_followsDroidRules\(actor\)/);
  assert.doesNotMatch(me.slice(me.indexOf('Source 7: Droid'), me.indexOf('Source 7b')), /actor\.type === 'droid'/, 'Source 7 must not gate on actor.type');
  assert.match(me, /componentMayContributeDroidModifiers\(actor, component, rulesProfile\)/);
  const hot = fs.readFileSync('scripts/patches/follower-droid-garage-hotfix.js', 'utf8');
  assert.match(hot, /resolveDroidRulesProfile\(actor\)/);
  assert.doesNotMatch(hot, /actor\.system\?\.isDroid === true/, 'hotfix must not carry its own droid-signal list');
}
console.log('Droid rules profile structural checks passed.');
