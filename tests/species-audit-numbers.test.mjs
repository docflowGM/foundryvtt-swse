import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeActor, selectSpecies, speciesFootprint } from './helpers/species-actor-sim.mjs';

// The Core Rulebook species (reconciled on their base records) and the separately handled multi-publication snapshots meet
// the same numeric standard as the bulk-hydrated profiles: ability modifiers, size, speed and automatic languages equal the
// audited profile, replacement revokes, A -> B -> A restores exactly and reapplying is idempotent.
// (Fixture generated from the audit by tools/hydrate-species-profiles.mjs; trait-level checks for these profiles are in
// species-core-reconciliation / species-multi-publication / species-source-pinned.)
const fixture = JSON.parse(readFileSync(new URL('./fixtures/species-audit-numbers.json', import.meta.url), 'utf8'));
const quiet = async fn => { const l = console.log, w = console.warn; console.log = () => {}; console.warn = () => {}; try { return await fn(); } finally { console.log = l; console.warn = w; } };

const discrepancies = [];
let checked = 0;
for (const [pid, exp] of Object.entries(fixture)) {
  const actor = makeActor();
  const { ctx } = await quiet(() => selectSpecies(actor, exp.species, exp.variantId, { strict: true }));
  const racial = Object.fromEntries(Object.entries(actor.system.attributes).map(([k, v]) => [k, v.racial || 0]));
  const problems = [];
  for (const k of Object.keys(exp.abilityMods)) if (racial[k] !== exp.abilityMods[k]) problems.push(`ability ${k}: ${racial[k]} != ${exp.abilityMods[k]}`);
  if (String(actor.system.size).toLowerCase() !== exp.size.toLowerCase()) problems.push(`size ${actor.system.size} != ${exp.size}`);
  if (exp.speed !== null && actor.system.speed !== exp.speed) problems.push(`speed ${actor.system.speed} != ${exp.speed}`);
  const langs = [...ctx.ledger.languages.automatic].sort().join(',');
  if (langs !== [...exp.languages].sort().join(',')) problems.push(`languages [${langs}] != [${[...exp.languages].sort()}]`);
  const natural = actor.items.filter(i => i.flags?.swse?.isNaturalWeapon).length;
  if (natural !== 0 && exp.naturalAttacks === 0) problems.push(`unprinted natural weapons (${natural})`);
  if (problems.length) discrepancies.push([pid, exp.species, problems]);

  // Revocation, A -> B -> A, idempotence.
  const first = structuredClone(speciesFootprint(actor));
  await quiet(() => selectSpecies(actor, exp.species, exp.variantId, { strict: true }));
  assert.deepEqual(speciesFootprint(actor), first, `${pid}: reapply is idempotent`);
  await quiet(() => selectSpecies(actor, 'Human'));   // Human is a Core base record
  if (exp.species !== 'Human') assert.equal(actor.system.speciesVariant ?? null, null, `${pid}: variant cleared by replacement`);
  await quiet(() => selectSpecies(actor, exp.species, exp.variantId, { strict: true }));
  assert.deepEqual(speciesFootprint(actor), first, `${pid}: A -> B -> A restores exactly`);
  checked++;
}
assert.equal(checked, Object.keys(fixture).length);
assert.deepEqual(discrepancies, [], `differences from the audit (report, never silently correct):\n${JSON.stringify(discrepancies, null, 1)}`);
console.log(`PASS: species audit numbers (${checked} profiles)`);
