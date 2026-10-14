import assert from 'node:assert/strict';
import { makeActor, selectSpecies, computeDefenses, SpeciesRegistry } from './helpers/species-actor-sim.mjs';

// Independently specified expectations, read by hand from the printed species traits of the sourcebooks
// (reference/sourcebooks/*.txt). They are NOT generated from the audit bundle or the hydration compiler, so a compiler
// that misread the audit is still caught. Page numbers are the printed species-trait pages; no rules text is copied.
const quiet = async fn => { const l = console.log, w = console.warn; console.log = () => {}; console.warn = () => {}; try { return await fn(); } finally { console.log = l; console.warn = w; } };
const racial = a => Object.fromEntries(Object.entries(a.system.attributes).map(([k, v]) => [k, v.racial || 0]).filter(([, v]) => v));

async function apply(name, variantId = null, abilityChoice = null) {
  const actor = makeActor();
  const { ctx } = await quiet(() => selectSpecies(actor, name, variantId, { strict: true, abilityChoice }));
  const d = await quiet(() => computeDefenses(actor));
  return {
    actor, ctx, racial: racial(actor), size: String(actor.system.size).toLowerCase(), speed: actor.system.speed,
    languages: [...ctx.ledger.languages.automatic].sort(),
    defense: Object.fromEntries(['fortitude', 'reflex', 'will'].map(k => [k, d[k].flagBonus + d[k].modifierBonus])),
    rerolls: (actor.flags.swse.speciesRerolls ?? []).map(r => `${r.target}:${r.outcome}`).sort(),
    grants: ctx.traits.flatMap(t => t.grants ?? []),
    naturals: actor.items.filter(i => i.flags?.swse?.isNaturalWeapon).map(i => `${i.system.damage.formula} ${i.system.damage.type}`).sort(),
    abilities: ctx.ledger.activeSpeciesAbilities.map(a => a.id),
  };
}
const feats = r => r.grants.filter(g => g.grantType === 'feat' && g.target).map(g => `${g.target}|${(g.requirements ?? []).map(q => q.skill)}`);

// The Unknown Regions p.14 — Nikto
{
  const r = await apply('Nikto');
  assert.deepEqual(r.racial, { str: 2, int: -2, cha: -2 });
  assert.deepEqual([r.size, r.speed, r.languages], ['medium', 6, ['Nikto']]);
  assert.deepEqual(r.defense, { fortitude: 2, reflex: 2, will: 0 }, 'Great Fortitude +2 Fort and natural armor +2 Reflex, once each');
  assert.deepEqual(r.rerolls, ['survival:mustAccept']);
  assert.deepEqual(r.naturals, []);
}
// The Unknown Regions p.16 — Verpine
{
  const r = await apply('Verpine');
  assert.deepEqual(r.racial, {});
  assert.deepEqual(r.languages, ['Basic', 'Verpine']);
  assert.deepEqual(r.defense, { fortitude: 0, reflex: 1, will: 0 });
  assert.deepEqual(r.rerolls, ['perception:mustAccept']);
  assert.deepEqual(feats(r), ['Skill Focus (Mechanics)|mechanics']);
}
// The Unknown Regions p.14 — Shistavanen (claws; Survival class skill; Skill Focus when Perception trained)
{
  const r = await apply('Shistavanen');
  assert.deepEqual(r.racial, { dex: 2, int: -2, cha: -2 });
  assert.deepEqual(r.naturals, ['1d6 slashing']);
  assert.deepEqual(feats(r), ['Skill Focus (Perception)|perception']);
  assert.deepEqual(r.grants.filter(g => g.grantType === 'classSkill').map(g => g.target), ['survival']);
  assert.deepEqual(r.languages, ['Shistavanen']);
}
// The Legacy Era Campaign Guide — Weequay: Pheromones is silent communication, NOT an attack; no Will bonus is printed
{
  const r = await apply('Weequay');
  assert.deepEqual(r.racial, { con: 2, int: -2, cha: -2 });
  assert.deepEqual(r.defense, { fortitude: 0, reflex: 1, will: 0 });
  assert.deepEqual(feats(r), ['Skill Focus (Endurance)|endurance']);
  assert.deepEqual(r.languages, ['Sriluurian']);
  assert.deepEqual(r.abilities, [], 'a same-named, different-rule trait activates no ability');
}
// Galaxy at War p.17 — Yuzzem: Large, two 1d8 natural attacks, Climb reroll (must accept)
{
  const r = await apply('Yuzzem');
  assert.deepEqual(r.racial, { str: 4, wis: -2, cha: -2 });
  assert.deepEqual([r.size, r.speed, r.languages], ['large', 6, ['Yuzz']]);
  assert.deepEqual(r.naturals, ['1d8 piercing', '1d8 slashing']);
  assert.deepEqual(r.rerolls, ['climb:mustAccept']);
}
// Scum and Villainy (Barabel): +2 natural armor Reflex; claws slashing, bite piercing, tail bludgeoning, each 1d6
{
  const r = await apply('Barabel', 'barabel-sv-2f-10');
  assert.deepEqual(r.racial, { str: 2, dex: -2, wis: -2 });
  assert.deepEqual(r.defense, { fortitude: 0, reflex: 2, will: 0 });
  assert.deepEqual(r.naturals, ['1d6 bludgeoning', '1d6 piercing', '1d6 slashing']);
  const gaw = await apply('Barabel', 'barabel-gaw-2i-01');
  assert.deepEqual(gaw.naturals, r.naturals, 'same printed attacks, separate publication record');
  assert.notEqual(gaw.actor.system.speciesVariant.sourceProfileId, r.actor.system.speciesVariant.sourceProfileId);
}
// Legacy Era Campaign Guide p.214 — Devaronian: mutually exclusive male / female sets; Skill Focus (Deception) when trained
{
  const dev = SpeciesRegistry.getByName('Devaronian');
  const male = await apply('Devaronian', null, { id: 'male' });
  assert.deepEqual(male.racial, { dex: 2, wis: -2, cha: -2 });
  const female = await apply('Devaronian', null, { id: 'female' });
  assert.deepEqual(female.racial, { dex: -2, int: 2, wis: 2 });
  assert.deepEqual(feats(female), ['Skill Focus (Deception)|deception']);
  assert.deepEqual(female.languages, ['Basic', 'Devaronese']);
  assert.equal(dev.variants.some(v => v.id === 'devaronian-female'), true, 'legacy id preserved');
}
// The Force Unleashed Campaign Guide p.14 — Felucian: Primitive = weapon proficiency only for the simple weapons group
{
  const r = await apply('Felucian');
  assert.deepEqual(r.racial, { con: 2, int: -2 });
  assert.deepEqual(r.languages, ['Felucianese']);
  assert.deepEqual(r.grants.filter(g => g.grantType === 'feat').map(g => g.target), ['Force Sensitivity']);
  assert.deepEqual([...(r.actor.flags.swse.suppressedClassProficiencies ?? [])].sort(),
    ['Weapon Proficiency (Advanced Melee Weapons)', 'Weapon Proficiency (Heavy Weapons)', 'Weapon Proficiency (Lightsabers)', 'Weapon Proficiency (Pistols)', 'Weapon Proficiency (Rifles)'], 'every group except simple weapons');
  assert.ok(!r.abilities.includes('force-blast'), 'Force Blast engine entry differs from the printed rule: not activated');
}
// The Unknown Regions p.131 — Killiks of Medium size (the printed Medium profile; other sizes are GM-defined, not automated)
{
  const r = await apply('Killik');
  assert.deepEqual(r.racial, { con: 2, int: -2 });
  assert.deepEqual([r.size, r.speed, r.languages], ['medium', 6, ['Killik', 'Sy Bisti']]);
  assert.deepEqual(r.defense, { fortitude: 0, reflex: 1, will: 0 });
  assert.deepEqual(r.naturals, ['1d6 slashing']);
}
// The Clone Wars Campaign Guide p.91 — Republic Clone: fixed array Str 15 Dex 13 Con 10 Int 12 Wis 10 Cha 8, plus one score +2
{
  const r = await apply('Republic Clone');
  assert.deepEqual(r.racial, {}, 'no ordinary racial modifiers');
  const override = r.ctx.metadata.attributeGenerationOverride;
  assert.deepEqual(override.fixedScores, { str: 15, dex: 13, con: 10, int: 12, wis: 10, cha: 8 });
  assert.equal(override.bonusChoices.length, 6);
  const v = r.actor.system.speciesVariant;
  assert.equal(v.sourceProfileId, 'CW-2H-10');
  const snap = (await import('/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js')).SpeciesRegistry.getByName('Republic Clone').variants.find(x => x.completeSnapshot);
  assert.equal(snap.abilityChoice.bonusValue, 2, 'the printed +2 is recorded');
  assert.equal(snap.abilityChoice.allocationPoints, 2, 'the repository\'s existing allocation behaviour is carried over unchanged (register RD-017)');
  assert.deepEqual(r.grants.filter(g => g.grantType === 'trainedSkill').map(g => g.frequency), ['choice']);
  assert.deepEqual(r.grants.filter(g => g.grantType === 'feat').map(g => g.frequency), ['choice']);
}
// Threats of the Galaxy p.117 — Mantellian Savrip as heroes: Large, claws do not provoke and count as simple weapons, Poison, Rage
{
  const r = await apply('Mantellian Savrip');
  assert.deepEqual(r.racial, { str: 4, dex: -2, con: 4, int: -4, wis: -4, cha: -4 });
  assert.deepEqual([r.size, r.speed, r.languages], ['large', 8, ['Savrip']]);
  assert.deepEqual(r.defense, { fortitude: 0, reflex: 2, will: 0 });
  const claw = r.actor.items.find(i => i.flags?.swse?.isNaturalWeapon);
  assert.deepEqual([claw.system.damage.formula, claw.system.damage.type], ['1d6', 'slashing']);
  assert.equal(claw.system.attackAbility, 'str', 'plus Strength modifier');
  assert.equal(claw.system.attackOptions.noProvokeOpportunity, true, 'does not provoke attacks of opportunity');
  assert.equal(claw.system.provokesOpportunityAttack, false);
  assert.equal(claw.system.proficiency, 'simple', 'natural weapons are simple weapons');
  assert.equal(claw.flags.swse.alwaysArmed, true);
  // Poison engine entry pinned to the printed rule: d20 + character level vs Fortitude, -1 step, immobilized (not unconscious) at the end.
  const poison = r.ctx.ledger.activeSpeciesAbilities.find(a => a.id === 'natural-weapon-poison');
  assert.ok(poison, 'Poison activates');
  assert.deepEqual([poison.attack.formula, poison.attack.targetDefense, poison.effect.conditionSteps, poison.effect.endTrackOverride, poison.trigger],
    ['1d20 + characterLevel', 'fortitude', 1, 'immobilized', 'after-natural-weapon-damage']);
  assert.ok(r.abilities.includes('rage'));
  assert.deepEqual([...(r.actor.flags.swse.suppressedClassProficiencies ?? [])].sort(), ['Weapon Proficiency (Heavy Weapons)', 'Weapon Proficiency (Pistols)', 'Weapon Proficiency (Rifles)']);
  // A species with an ordinary natural weapon gets none of the riders.
  const plain = (await apply('Yuzzem')).actor.items.find(i => i.flags?.swse?.isNaturalWeapon);
  assert.notEqual(plain.system.attackOptions?.noProvokeOpportunity, true);
  assert.notEqual(plain.system.proficiency, 'simple');
}
// Activated-ability exclusions: engine entries that differ from the printed rule never activate from a published profile
for (const [species, banned] of [['Caamasi', 'pacifism'], ['Yarkora', 'confusion'], ['Clawdite', 'shapeshift'], ['Draethos', 'natural-telepath']]) {
  const r = await apply(species);
  assert.ok(!r.abilities.includes(banned), `${species}: ${banned} must not be activated by name`);
  assert.ok(r.actor.flags.swse.speciesTraitIds.length > 0, `${species}: the trait text is still granted`);
}
// ...while pinned ones do activate (printed rule matches the engine entry)
assert.ok((await apply('Falleen')).abilities.includes('pheromones'));
assert.ok((await apply('Lurmen')).abilities.includes('roller'));
console.log('PASS: species source-pinned expectations');
