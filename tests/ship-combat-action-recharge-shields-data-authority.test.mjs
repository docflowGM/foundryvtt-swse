import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// V2 combat runtime convergence, Phase 2 (Shields + Damage Reduction),
// third correction round. Independent review independently confirmed a
// rules-data conflict: packs/ship-combat-actions.db's normal "Recharge
// Shields (Engineer)" / "Recharge Shields (Shields Operator)" records
// described their outcome as restoring shields to full/maximum SR, which
// contradicts the actual RAW rule this phase's canonical
// mechanics.recharge-shields skill-use record and
// ActorEngine.rechargeShields(..., {amount:5}) both implement: +5 SR per
// use, capped at normal maximum (Combat Skills Summary; Scavenger's Guide
// to Droids, e.g. the H-1ME example restoring exactly 5 points on a DC 20
// Mechanics check). This guards the corrected text in both the pack and
// its data/ship-combat-actions.json source, and confirms Boost Shields
// (a genuinely different mechanic: 1/4 max SR, once per encounter) was
// deliberately left untouched.

const packDocs = readFileSync(new URL('../packs/ship-combat-actions.db', import.meta.url), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const jsonEntries = JSON.parse(readFileSync(new URL('../data/ship-combat-actions.json', import.meta.url), 'utf8'));

const engineerPack = packDocs.find((d) => d._id === 'fbe5720f921849f9');
const shieldsOperatorPack = packDocs.find((d) => d._id === 'eed7c4c943034662');
const boostShieldsPack = packDocs.find((d) => d._id === 'c4bf257f30d34e03');

assert.ok(engineerPack, 'the Engineer Recharge Shields record must still exist at its stable id');
assert.ok(shieldsOperatorPack, 'the Shields Operator Recharge Shields record must still exist at its stable id');
assert.ok(boostShieldsPack, 'Boost Shields must still exist, unrelated to this fix');

for (const doc of [engineerPack, shieldsOperatorPack]) {
  const haystack = `${doc.system.notes} ${doc.system.relatedSkills.map((s) => s.outcome).join(' ')}`;
  assert.doesNotMatch(haystack, /restore (shields to )?(full|maximum) SR/i, `${doc.name}: must not claim a full/maximum SR restoration`);
  assert.match(haystack, /restore 5 SR/i, `${doc.name}: must state the correct +5 SR RAW amount`);
  assert.match(haystack, /normal maximum/i, `${doc.name}: must state the recharge is capped at normal maximum, matching ActorEngine.rechargeShields()`);
}

// Boost Shields is a distinct mechanic (1/4 max SR) and must be untouched.
assert.match(boostShieldsPack.system.notes, /1\/4 max SR/, 'Boost Shields must remain its own, different mechanic -- not touched by this fix');

const engineerJson = jsonEntries.find((e) => e.name === 'Recharge Shields (Engineer)');
const shieldsOperatorJson = jsonEntries.find((e) => e.name === 'Recharge Shields (Shields Operator)');
assert.ok(engineerJson && shieldsOperatorJson, 'both JSON source entries must still exist by name');

for (const entry of [engineerJson, shieldsOperatorJson]) {
  const haystack = `${entry.notes} ${entry.relatedSkills.map((s) => s.outcome).join(' ')}`;
  assert.doesNotMatch(haystack, /restore (shields to )?(full|maximum) SR/i, `${entry.name} (JSON source): must not claim full/maximum restoration`);
  assert.match(haystack, /restore 5 SR/i, `${entry.name} (JSON source): must match the pack's corrected +5 SR text`);
}

console.log('ship-combat-action-recharge-shields-data-authority: all assertions passed');
