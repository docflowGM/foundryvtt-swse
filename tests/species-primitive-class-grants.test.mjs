import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { makeActor, selectSpecies } from './helpers/species-actor-sim.mjs';

// Primitive's starting-class weapon-proficiency restriction, exercised through the REAL class grant authority
// (buildClassGrantLedger + ClassAutoGrants), not just the species flags.
const { buildClassGrantLedger } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/class-grant-ledger-builder.js');
const { ClassesRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/registries/classes-registry.js');
ClassesRegistry.getById = id => ({ id, name: id });
ClassesRegistry.getByName = name => ({ id: name, name });
ClassesRegistry.getBySourceId = () => null;

const quiet = async fn => { const l = console.log, w = console.warn, d = console.debug; console.log = () => {}; console.warn = () => {}; console.debug = () => {}; try { return await fn(); } finally { console.log = l; console.warn = w; console.debug = d; } };
async function ledgerFor(species, cls) {
  const actor = makeActor();
  const { ctx } = await quiet(() => selectSpecies(actor, species, null, { strict: true }));
  const ledger = await quiet(() => buildClassGrantLedger(actor, { id: cls, name: cls }, { pendingSpeciesContext: ctx }));
  return { granted: [...ledger.grantedFeats.map(f => f.name), ...ledger.grantedProficiencies.map(f => f.name)].sort(), suppressed: ledger.suppressedGrants.map(s => s.name).sort() };
}

// Control: a non-primitive species receives every starting proficiency.
{
  const jedi = await ledgerFor('Human', 'Jedi');
  assert.ok(jedi.granted.includes('Weapon Proficiency (Lightsabers)') && jedi.granted.includes('Weapon Proficiency (Simple Weapons)'), JSON.stringify(jedi));
  assert.deepEqual(jedi.suppressed, []);
}
// Felucian (The Force Unleashed Campaign Guide): only the simple weapons group survives.
{
  const jedi = await ledgerFor('Felucian', 'Jedi');
  assert.ok(!jedi.granted.includes('Weapon Proficiency (Lightsabers)'), 'Jedi lightsaber proficiency suppressed');
  assert.ok(jedi.granted.includes('Weapon Proficiency (Simple Weapons)'), 'simple weapons kept');
  assert.ok(jedi.suppressed.includes('Weapon Proficiency (Lightsabers)'));
  const soldier = await ledgerFor('Felucian', 'Soldier');
  assert.ok(!soldier.granted.some(n => /Pistols|Rifles/.test(n)), 'Soldier pistol and rifle proficiency suppressed');
  assert.ok(soldier.granted.includes('Weapon Proficiency (Simple Weapons)'));
  assert.ok(soldier.granted.includes('Armor Proficiency (Light)'), 'non-weapon starting grants untouched');
  const scoundrel = await ledgerFor('Felucian', 'Scoundrel');
  assert.ok(!scoundrel.granted.includes('Weapon Proficiency (Pistols)') && scoundrel.granted.includes('Weapon Proficiency (Simple Weapons)'));
}
// Standard Primitive (Gamorrean-style 3-group suppression via a hydrated species): pistols/rifles/heavy only.
{
  const soldier = await ledgerFor('Nelvaanian', 'Soldier');
  assert.ok(!soldier.granted.some(n => /Pistols|Rifles/.test(n)));
  assert.ok(soldier.granted.includes('Weapon Proficiency (Simple Weapons)'));
  const jedi = await ledgerFor('Nelvaanian', 'Jedi');
  assert.ok(jedi.granted.includes('Weapon Proficiency (Lightsabers)'), 'the standard Primitive list does not remove lightsabers');
}
// The restriction exists only in the starting-class grant ledger: no feat selection, talent or later-level path consults it.
{
  const consumers = [];
  const walk = dir => { for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js') && /suppressedClassProficiencies/.test(readFileSync(p, 'utf8'))) consumers.push(p); } };
  walk(new URL('../scripts', import.meta.url).pathname);
  const names = consumers.map(p => p.split('/scripts/')[1]).sort();
  assert.deepEqual(names.filter(n => !/^species\/|apply-canonical|build-pending-species-context|species-step|species-registry|class-grant-ledger-builder/.test(n)), [], `unexpected consumers: ${names.join(', ')}`);
}
console.log('PASS: species primitive class grants');
