import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeActor, selectSpecies, speciesFootprint, computeDefenses, SpeciesRegistry } from './helpers/species-actor-sim.mjs';

// Every once-published species hydrated from the audited source profiles (tools/hydrate-species-profiles.mjs) applies
// its sole canonical profile and ONLY what that profile establishes. tests/fixtures/species-profile-expectations.json
// holds derived numbers/ids/skill names (no rules text), generated from the audit by the same tool.
const { getAbilityChoiceOptions } = await import('/systems/foundryvtt-swse/scripts/species/species-ability-choice.js');
const { getSoleSnapshotVersion, isSupersededLegacyVariant } = await import('/systems/foundryvtt-swse/scripts/species/species-publication-selection.js');
const fixture = JSON.parse(readFileSync(new URL('./fixtures/species-profile-expectations.json', import.meta.url), 'utf8'));
const log = console.log, warn = console.warn;
const quiet = async fn => { console.log = () => {}; console.warn = () => {}; try { return await fn(); } finally { console.log = log; console.warn = warn; } };

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
let checked = 0;

for (const [variantId, exp] of Object.entries(fixture)) {
  const entry = SpeciesRegistry.getByName(exp.species);
  assert.ok(entry, `${exp.species}: registry entry`);
  const variant = entry.variants.find(v => v.id === variantId);
  assert.ok(variant?.completeSnapshot && variant.sourceProfileId === exp.sourceProfileId, `${exp.species}: snapshot ${variantId} present with provenance`);
  // Once-published species apply their sole profile implicitly; a multi-publication species (Barabel) needs the explicit version (RD-001).
  const pick = entry.variants.length > 1 ? variantId : null;
  // A within-profile ability choice (Devaronian, Arkanian Offshoot) must be made; take the first published option.
  const option = getAbilityChoiceOptions(variant)[0] ?? null;
  const choice = option ? { id: option.id } : null;
  if (!pick) {
    assert.equal(getSoleSnapshotVersion(entry)?.id, variantId, `${exp.species}: the audited profile is the sole canonical profile`);
    // Legacy variants beside it keep resolving for existing actors, but are documented and hidden from new selections.
    for (const legacy of entry.variants.filter(v => v.id !== variantId)) {
      assert.equal(legacy.supersededBy, variantId, `${exp.species}/${legacy.id}: provenance recorded`);
      assert.ok(isSupersededLegacyVariant(legacy, entry), `${legacy.id}: hidden from new selections`);
    }
  }

  // A NEW selection needs no version choice (published once) and still applies the snapshot; no variant id is passed.
  const actor = makeActor();
  const { ctx } = await quiet(() => selectSpecies(actor, exp.species, pick, { strict: true, abilityChoice: choice }));
  assert.equal(ctx.identity.variant?.id, variantId, `${exp.species}: sole profile applied implicitly`);
  assert.equal(actor.system.speciesVariant.id, variantId);
  assert.equal(actor.system.speciesVariant.sourceProfileId, exp.sourceProfileId);

  // Core numbers and languages equal the audited profile.
  for (const k of ABILITIES) assert.equal(actor.system.attributes[k].racial || 0, exp.abilityMods[k] + (option?.mods?.[k] ?? 0), `${exp.species} ${k}`);
  assert.equal(String(actor.system.size).toLowerCase(), exp.size.toLowerCase(), `${exp.species} size`);
  assert.equal(actor.system.speed, exp.speed, `${exp.species} speed`);
  assert.deepEqual([...ctx.ledger.languages.automatic].sort(), [...exp.languages].sort(), `${exp.species} languages`);

  // Nothing from the legacy base record: granted trait ids are a subset of the profile's traits.
  const f = actor.flags.swse;
  const granted = f.speciesTraitIds ?? [];
  assert.deepEqual(granted.filter(id => !exp.traitIds.includes(id)), [], `${exp.species}: no unprinted trait granted`);

  // Defenses: exactly the compiled printed bonuses, applied once (flag path + adapter path summed).
  const defenses = await quiet(() => computeDefenses(actor));
  for (const key of ['fortitude', 'reflex', 'will']) {
    assert.equal(defenses[key].flagBonus + defenses[key].modifierBonus, exp.defense[key]?.value ?? 0, `${exp.species} ${key} species bonus`);
  }
  assert.deepEqual(Object.keys(f.speciesPassiveBonuses ?? {}).filter(k => !exp.defense[k]), [], `${exp.species}: no passive bonus beyond the printed defenses`);

  // Rerolls, feat grants, class skills, trained-skill choices.
  assert.deepEqual((f.speciesRerolls ?? []).map(r => `${r.target}:${r.outcome}`).sort(), exp.rerolls.map(r => `${r.skillId}:${r.outcome}`).sort(), `${exp.species} rerolls`);
  const grants = ctx.traits.flatMap(t => t.grants ?? []);
  const featGrants = grants.filter(g => g.grantType === 'feat');
  const reqText = q => (q.type === 'skillTrained' ? `trained:${q.skill}` : q.type === 'attributeMin' ? `${q.attribute}>=${q.min}` : q.type === 'baseAttackMin' ? `bab>=${q.min}` : `feat:${q.feat}`);
  assert.deepEqual(featGrants.filter(g => g.target).map(g => `${g.target}|${(g.requirements ?? []).map(reqText).sort()}`).sort(),
    exp.featGrants.filter(g => g.feat).map(g => `${g.feat}|${[...g.requires].sort()}`).sort(), `${exp.species} named feat grants`);
  assert.equal(featGrants.filter(g => !g.target).length, exp.featGrants.filter(g => g.choice).length, `${exp.species} feat choices`);
  assert.deepEqual(grants.filter(g => g.grantType === 'classSkill').map(g => g.targetDisplay).sort(), [...exp.classSkills].sort(), `${exp.species} class skills`);
  assert.equal(grants.filter(g => g.grantType === 'trainedSkill').length, exp.trainedSkillChoices, `${exp.species} trained skill choices`);
  // Natural weapons: exactly the printed attacks, through the existing species natural-weapon item path.
  const naturals = actor.items.filter(i => i.type === 'weapon' && i.flags?.swse?.isNaturalWeapon);
  assert.deepEqual(naturals.map(i => `${i.name}|${i.system.damage.formula}|${i.system.damage.type}`).sort(),
    exp.naturalWeapons.map(w => `${w.name}|${w.damage}|${w.type}`).sort(), `${exp.species} natural weapons`);
  assert.ok(naturals.every(i => i.system.source === 'species-natural-weapon' && i.flags.swse.speciesGranted === true && i.flags.swse.alwaysArmed === true), `${exp.species}: natural weapons use the species natural-weapon item contract`);
  // Starting-proficiency suppression (Primitive) only as printed.
  assert.deepEqual([...(f.suppressedClassProficiencies ?? [])].sort(), [...exp.suppressedProficiencies].sort(), `${exp.species} suppressed starting proficiencies`);
  // Activated abilities only where the audit identifies the printed ability.
  assert.deepEqual(ctx.ledger.activeSpeciesAbilities.map(a => a.id).filter(id => !exp.namedActivations.some(n => n === id || (id === 'shapeshift' && n === 'shapeshift') || (id === 'energy-surge' && n === 'quick-energy') || (id === 'natural-weapon-poison' && n === 'poison'))), [],
    `${exp.species}: no activated ability the profile does not print`);

  // Revocation + A -> B -> A + idempotence through a Core (base-record) species and back.
  const first = structuredClone(speciesFootprint(actor));
  await quiet(() => selectSpecies(actor, exp.species, pick, { strict: true, abilityChoice: choice }));
  assert.deepEqual(speciesFootprint(actor), first, `${exp.species}: reapplying is idempotent`);
  await quiet(() => selectSpecies(actor, 'Human'));
  assert.equal(actor.system.speciesVariant ?? null, null, `${exp.species}: variant record cleared on replacement`);
  assert.deepEqual(actor.flags.swse.speciesTraitIds?.filter(id => exp.traitIds.includes(id) && !['bonus-feat', 'bonus-trained-skill'].includes(id)) ?? [], [], `${exp.species}: traits revoked`);
  await quiet(() => selectSpecies(actor, exp.species, pick, { strict: true, abilityChoice: choice }));
  assert.deepEqual(speciesFootprint(actor), first, `${exp.species}: A -> B -> A restores exactly`);
  checked++;
}
assert.ok(checked >= 70, `fixture covers the hydrated profiles (${checked})`);
// ---- Legacy variants: never deleted; every one is documented; documented ones are not offered for new selection ----
{
  const provenance = JSON.parse(readFileSync(new URL('../tools/data/species-legacy-variant-provenance.json', import.meta.url), 'utf8'));
  const legacyInPack = SpeciesRegistry._entries.flatMap(e => e.variants.filter(v => v.completeSnapshot !== true).map(v => ({ entry: e, v })));
  assert.equal(legacyInPack.length, provenance.length, 'every legacy variant id is still present (none deleted or renamed) and documented');
  for (const { entry, v } of legacyInPack) {
    const p = provenance.find(x => x.variantId === v.id && x.species === entry.name);
    assert.ok(p, `${v.id}: provenance recorded`);
    assert.equal(isSupersededLegacyVariant(v, entry), p.hideFromNewSelection, `${v.id}: hidden from new selection iff documented as such`);
  }
}
console.log(`PASS: species profile invariants (${checked} profiles)`);
