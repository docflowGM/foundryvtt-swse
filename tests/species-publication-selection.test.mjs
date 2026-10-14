import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeActor, selectSpecies, speciesFootprint, SpeciesRegistry } from './helpers/species-actor-sim.mjs';

// Project owner ruling RD-001: a species with several verified published profiles needs an explicit version choice.
// Browser stubs so the real V2 species step and drag-and-drop handler can be imported under Node.
globalThis.window ??= globalThis;
globalThis.addEventListener ??= () => {}; globalThis.removeEventListener ??= () => {};
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
globalThis.sessionStorage ??= globalThis.localStorage;
globalThis.document ??= { addEventListener() {}, createElement() { return { style: {}, classList: { add() {}, remove() {} }, addEventListener() {} }; }, body: {} };
globalThis.navigator ??= { userAgent: 'node' };
const f = (globalThis.foundry ??= {});
f.applications ??= {}; f.applications.api ??= { ApplicationV2: class {}, HandlebarsApplicationMixin: B => B, DialogV2: class {} };

const {
  getPublicationVersions, requiresPublicationSelection, checkPublicationSelection, buildPublicationComparison, buildVersionChoices,
} = await import('/systems/foundryvtt-swse/scripts/species/species-publication-selection.js');
const { buildPendingSpeciesContext } = await import('/systems/foundryvtt-swse/scripts/engine/progression/helpers/build-pending-species-context.js');
const { SpeciesStep } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/species-step.js');

const entry = name => SpeciesRegistry.getByName(name);
const MULTI = { Bith: 2, 'Chadra-Fan': 2, Chagrian: 2, Chiss: 3, Krevaaki: 2, Neimoidian: 2, 'Yuuzhan Vong': 2 };

// ---- Policy: required exactly when >= 2 verified publications; legacy variants are never verified versions ----
for (const [name, count] of Object.entries(MULTI)) {
  assert.equal(getPublicationVersions(entry(name)).length, count, `${name} versions`);
  assert.equal(requiresPublicationSelection(entry(name)), true, name);
}
for (const name of ['Human', 'Wookiee', 'Devaronian', 'Gand', 'Barabel']) {
  assert.equal(requiresPublicationSelection(entry(name)), false, `${name} needs no extra selection`);
  assert.equal(checkPublicationSelection(entry(name), null).ok, true);
}
assert.ok(entry('Devaronian').variants.length > 0, 'precondition: Devaronian keeps its legacy (non-publication) variant');
assert.equal(getPublicationVersions(entry('Barabel')).length, 0, 'Barabel publications are held (natural weapons)');

// ---- Validation: explicit and valid, never a default, never a legacy variant, never another species' id ----
{
  const chadra = entry('Chadra-Fan');
  assert.deepEqual([checkPublicationSelection(chadra, null).code, checkPublicationSelection(chadra, 'default').code, checkPublicationSelection(chadra, '').code],
    ['NO_VERSION_SELECTED', 'NO_VERSION_SELECTED', 'NO_VERSION_SELECTED']);
  assert.equal(checkPublicationSelection(chadra, 'chadra-fan-alternate').code, 'INVALID_VERSION', 'legacy variant is not an authoritative version');
  assert.equal(checkPublicationSelection(chadra, 'bith-goi-2g-01').code, 'INVALID_VERSION', "another species' version");
  assert.equal(checkPublicationSelection(chadra, 'nonsense').code, 'INVALID_VERSION');
  assert.equal(checkPublicationSelection(chadra, 'chadra-fan-ur-2b-02').ok, true);
}

// ---- Comparison data: publication names, differences, and per-version unique traits ----
{
  const c = buildPublicationComparison(entry('Chadra-Fan'));
  assert.equal(c.required, true);
  assert.deepEqual(c.versions.map(v => v.id), ['chadra-fan-ur-2b-02', 'chadra-fan-leg-2c-12']);
  assert.ok(c.versions.every(v => v.label && v.sourceProfileId && v.abilities && v.size && v.movement && v.languages.length));
  assert.ok(c.differingFields.includes('Ability modifiers') && c.differingFields.includes('Traits'));
  assert.ok(!c.differingFields.includes('Size') && !c.differingFields.includes('Languages'));
  const ur = c.versions[0];
  assert.equal(ur.traitRows.find(t => t.name === 'Heightened Awareness').unique, true, 'trait present in only one version is flagged');
  assert.equal(ur.traitRows.find(t => t.name === 'Darkvision').unique, false);
  assert.equal(ur.differs.abilities, true);
  const bith = buildPublicationComparison(entry('Bith'));
  assert.ok(bith.differingFields.includes('Languages'), 'Bith books list different languages');
  assert.deepEqual(buildPublicationComparison(entry('Human')), { required: false, versions: [], differingFields: [] });
  assert.equal(buildVersionChoices(entry('Chiss')).length, 3);
}

// ---- Central enforcement: every assignment path builds its context here, so none can silently default ----
{
  const actor = makeActor();
  for (const name of Object.keys(MULTI)) {
    assert.equal(await buildPendingSpeciesContext(actor, entry(name).id, { source: 'progression' }), null, `${name}: no version -> no context`);
    assert.equal(await buildPendingSpeciesContext(actor, { ...entry(name), selectedVariantId: 'default', variantId: 'default' }, { source: 'drag-drop' }), null, `${name}: "default" rejected`);
  }
  assert.equal(await buildPendingSpeciesContext(actor, { ...entry('Chadra-Fan'), selectedVariantId: 'chadra-fan-alternate' }, { source: 'progression' }), null, 'legacy variant rejected for a new selection');
  assert.equal(await buildPendingSpeciesContext(actor, { ...entry('Chadra-Fan'), selectedVariantId: 'zzz' }, { source: 'template' }), null, 'unknown id rejected');
  const ok = await buildPendingSpeciesContext(actor, { ...entry('Chiss'), selectedVariantId: 'chiss-leg-2c-02' }, { source: 'progression' });
  assert.equal(ok.identity.variant.id, 'chiss-leg-2c-02');
  assert.equal(ok.identity.variant.sourceProfileId, 'LEG-2C-02');
  assert.ok(await buildPendingSpeciesContext(actor, entry('Human').id, { source: 'progression' }), 'single-profile species: no extra selection');
  assert.ok(await buildPendingSpeciesContext(actor, entry('Chiss').id, { source: 'progression', existingActorCompatibility: true }), 'existing actors keep working (no forced migration)');
  assert.ok(await buildPendingSpeciesContext(actor, { ...entry('Chadra-Fan'), selectedVariantId: 'chadra-fan-alternate' }, { source: 'progression', existingActorCompatibility: true }), 'legacy variant id still resolves for existing actors');
}

// ---- Persistence + grant isolation: the stable id is on the actor and each version brings only its own rules ----
{
  const actor = makeActor();
  await selectSpecies(actor, 'Chadra-Fan', 'chadra-fan-ur-2b-02', { strict: true });
  assert.equal(actor.system.speciesVariant.id, 'chadra-fan-ur-2b-02');
  assert.equal(actor.system.speciesVariant.sourceProfileId, 'UR-2B-02');
  assert.equal(actor.flags.swse.speciesVariant.id, 'chadra-fan-ur-2b-02');
  const ur = speciesFootprint(actor);
  assert.equal(ur.racial.dex, 2); assert.ok(!ur.racial.cha);

  await selectSpecies(actor, 'Chadra-Fan', 'chadra-fan-leg-2c-12', { strict: true });
  assert.equal(actor.system.speciesVariant.id, 'chadra-fan-leg-2c-12');
  const leg = speciesFootprint(actor);
  assert.equal(leg.racial.cha, 2); assert.ok(!leg.racial.dex);
  assert.ok(!Object.keys(actor.flags.swse.speciesTraits).includes('Heightened Awareness'), "UR-only trait revoked, not inherited");
  assert.deepEqual(actor.flags.swse.speciesRerolls ?? [], [], 'UR reroll right revoked');

  await selectSpecies(actor, 'Chadra-Fan', 'chadra-fan-ur-2b-02', { strict: true });
  assert.deepEqual(speciesFootprint(actor), ur, 'switching back restores exactly the first version');
  await selectSpecies(actor, 'Chadra-Fan', 'chadra-fan-ur-2b-02', { strict: true });
  assert.deepEqual(speciesFootprint(actor), ur, 'reapplying is idempotent');

  await assert.rejects(selectSpecies(actor, 'Chadra-Fan', null, { strict: true }), /no context/);
  await assert.rejects(selectSpecies(actor, 'Chadra-Fan', 'chadra-fan-alternate', { strict: true }), /no context/);
  assert.deepEqual(speciesFootprint(actor), ur, 'a rejected selection leaves the actor unchanged');
}

// ---- The V2 species step ----
const makeStep = () => { const s = Object.create(SpeciesStep.prototype); s._selectedVariantBySpeciesId = new Map(); s._selectedAbilityChoiceBySpeciesId = new Map(); return s; };
{
  const step = makeStep();
  const chiss = entry('Chiss');

  // The selector lists only verified versions: no "Default", no legacy variants.
  let options = step._formatSpeciesVariants(chiss);
  assert.deepEqual(options.map(o => o.id), ['chiss-ur-2b-10', 'chiss-leg-2c-02', 'chiss-tfu-2e-12']);
  assert.ok(options.every(o => !o.isSelected && o.label && o.abilities));
  const chadra = step._formatSpeciesVariants(entry('Chadra-Fan'));
  assert.ok(!chadra.some(o => o.id === 'chadra-fan-alternate'), 'legacy alternate is not offered as an authoritative version');

  // Until a version is chosen the legacy base record is not presented as the species' rules.
  const unselected = step._getEffectiveSpeciesProfileForDetails(chiss);
  assert.equal(unselected.publicationUnselected, true);
  assert.deepEqual(unselected.canonicalTraits, []);
  assert.deepEqual(unselected.languages, []);

  // Selecting: invalid ids are rejected; "default" is not an option; a valid id is recorded.
  const shell = { requestRender() {}, focusedItem: { id: chiss.id } };
  const pick = (variantId) => step.handleAction('select-species-variant', { preventDefault() {} }, { dataset: { speciesId: chiss.id, variantId } }, shell);
  await pick('default'); assert.equal(step._selectedVariantBySpeciesId.get(chiss.id), undefined);
  await pick('chiss-bogus'); assert.equal(step._selectedVariantBySpeciesId.get(chiss.id), undefined);
  await pick('chadra-fan-ur-2b-02'); assert.equal(step._selectedVariantBySpeciesId.get(chiss.id), undefined);
  await pick('chiss-leg-2c-02'); assert.equal(step._selectedVariantBySpeciesId.get(chiss.id), 'chiss-leg-2c-02');
  options = step._formatSpeciesVariants(chiss);
  assert.deepEqual(options.filter(o => o.isSelected).map(o => o.id), ['chiss-leg-2c-02']);
  await pick('default'); assert.equal(step._selectedVariantBySpeciesId.get(chiss.id), 'chiss-leg-2c-02', 'cannot fall back to a default once required');

  // Selecting loads that version's complete profile (details show its own languages / traits).
  const effective = step._getEffectiveSpeciesProfileForDetails(chiss);
  assert.deepEqual(effective.languages, ['Cheunh']);
  assert.equal(effective.selectedVariant.sourceProfileId, 'LEG-2C-02');
  assert.ok(!effective.publicationUnselected);

  // Species without publications keep their original selector (Default + legacy variants).
  const dev = step._formatSpeciesVariants(entry('Devaronian'));
  assert.ok(dev.length > 0 && !dev[0].traitRows);
  assert.equal(requiresPublicationSelection(entry('Devaronian')), false);
}
{
  // Confirming without a version is blocked; with a valid one it proceeds to context building and commit.
  const warnings = [];
  globalThis.ui = { notifications: { warn: m => warnings.push(m), info() {}, error() {} } };
  const step = makeStep();
  let committed = 0;
  step._commitNormalized = async () => { committed++; };
  step._resolveSpeciesEntry = id => SpeciesRegistry.getById(id);
  const shell = { actor: makeActor(), requestRender() {}, focusedItem: null, progressionSession: {}, committedSelections: new Map() };
  const chiss = entry('Chiss');
  await step.onItemCommitted(chiss.id, shell);
  assert.equal(committed, 0, 'no commit without a version');
  assert.ok(warnings.some(w => /version/i.test(w)), 'player is told to choose a version');
  step._selectedVariantBySpeciesId.set(chiss.id, 'chiss-bogus');
  await step.onItemCommitted(chiss.id, shell);
  assert.equal(committed, 0, 'no commit with an invalid version');
}

// ---- Reopening character creation restores the same chosen version ----
{
  const step = makeStep();
  step._resolveSpeciesEntry = id => SpeciesRegistry.getById(id);
  const chiss = entry('Chiss');
  assert.equal(step._restoreDraftVariant(chiss.id, { selectedVariant: { id: 'chiss-tfu-2e-12' } }), 'chiss-tfu-2e-12');
  assert.equal(step._selectedVariantBySpeciesId.get(chiss.id), 'chiss-tfu-2e-12');
  assert.equal(step._restoreDraftVariant(chiss.id, { selectedVariant: { id: 'someone-elses-id' } }), null, 'unknown ids are ignored');
}

// ---- Drag-and-drop and templates respect the same requirement ----
{
  const { buildSpeciesReplacementPlan } = await import('/systems/foundryvtt-swse/scripts/species/species-plan-transaction.js');
  const { applyCanonicalSpeciesToActor } = await import('/systems/foundryvtt-swse/scripts/engine/progression/helpers/apply-canonical-species-to-actor.js');
  const actor = makeActor();
  const opts = { buildContext: buildPendingSpeciesContext, applyCanonical: applyCanonicalSpeciesToActor };
  await assert.rejects(buildSpeciesReplacementPlan(actor, 'Chiss', opts), /could not be resolved/, 'a drop with no version is rejected before any change');
  const planned = await buildSpeciesReplacementPlan(actor, 'Chiss', { ...opts, identity: { ...entry('Chiss'), selectedVariantId: 'chiss-ur-2b-10', variantId: 'chiss-ur-2b-10' } });
  assert.equal(planned.pendingContext.identity.variant.id, 'chiss-ur-2b-10');

  const src = readFileSync(new URL('../scripts/drag-drop/drop-handler.js', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('static async handleSpeciesDrop'));
  assert.ok(body.indexOf('requiresPublicationSelection(registryEntry)') > -1 && body.indexOf('_promptSpeciesVersion') > -1);
  assert.ok(body.indexOf('_promptSpeciesVersion') < body.indexOf('buildSpeciesReplacementPlan('), 'the version is chosen before any plan is built');

  const { TemplateAdapter } = await import('/systems/foundryvtt-swse/scripts/engine/progression/template/template-adapter.js');
  assert.equal(TemplateAdapter._templateSpeciesNeedsVersion({ id: entry('Chiss').id, name: 'Chiss' }), true, 'template without a version leaves the species for the player');
  assert.equal(TemplateAdapter._templateSpeciesNeedsVersion({ id: entry('Chiss').id, name: 'Chiss', variantId: 'chiss-ur-2b-10' }), false);
  assert.equal(TemplateAdapter._templateSpeciesNeedsVersion({ id: entry('Human').id, name: 'Human' }), false);
}

// ---- Existing variant ids are preserved ----
for (const id of ['chadra-fan-alternate', 'bith-alternate', 'krevaaki-alternate', 'neimoidian-alternate', 'yuuzhan-vong-alternate', 'devaronian-female']) {
  assert.ok(Object.values(Object.fromEntries(SpeciesRegistry.getAll().map(e => [e.id, e]))).some(e => (e.variants || []).some(v => v.id === id)), `${id} preserved`);
}

// ---- Ruling #9: the version is chosen first; choices WITHIN that version (selectable ability modifiers) come after ----
{
  const zero = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  const mk = (id, abilityChoice) => ({ id, label: id, source: 'Synthetic', completeSnapshot: true, sourceProfileId: `SYN-${id}`, size: 'Medium', speed: 6,
    movement: { walk: 6 }, abilities: '', abilityMods: { ...zero }, abilityChoice, skillBonuses: [], special: [], languages: ['Basic'], naturalWeapons: [], description: '', traits: [] });
  const choice = { type: 'choice', label: 'Specialization', fixed: { ...zero }, chooseOne: [{ ...zero, str: 2 }, { ...zero, dex: 2 }] };
  const target = entry('Duros');                       // in-memory only: give a normally single-profile species two synthetic versions
  target.variants.push(mk('syn-plain', null), mk('syn-with-choice', choice));
  try {
    const step = makeStep();
    const data = () => ({ requires: step._requiresAbilityChoice(step._variantAppliedEntry(target)), options: step._formatSpeciesAbilityChoices(step._variantAppliedEntry(target)) });
    assert.deepEqual(data(), { requires: false, options: [] }, 'no version yet: no choice is shown');
    const shell = { requestRender() {}, focusedItem: { id: target.id } };
    const pick = id => step.handleAction('select-species-variant', { preventDefault() {} }, { dataset: { speciesId: target.id, variantId: id } }, shell);
    await pick('syn-plain');
    assert.equal(data().requires, false, 'a version without a choice asks for none');
    await pick('syn-with-choice');
    assert.equal(data().requires, true, 'the selected version defines a within-profile choice');
    assert.equal(data().options.length, 2);
    step._selectedAbilityChoiceBySpeciesId.set(target.id, { id: 'str-0', mods: { str: 2 } });
    await pick('syn-plain');
    assert.equal(step._selectedAbilityChoiceBySpeciesId.has(target.id), false, "switching version clears the previous version's choice");
    assert.equal(step._selectedVariantBySpeciesId.get(target.id), 'syn-plain');
    // Confirming is blocked until the selected version's choice is made.
    const warnings = [];
    globalThis.ui = { notifications: { warn: m => warnings.push(m), info() {}, error() {} } };
    let committed = 0;
    step._commitNormalized = async () => { committed++; };
    step._resolveSpeciesEntry = id => SpeciesRegistry.getById(id);
    await pick('syn-with-choice');
    await step.onItemCommitted(target.id, { actor: makeActor(), requestRender() {}, focusedItem: null, progressionSession: {}, committedSelections: new Map() });
    assert.equal(committed, 0);
    assert.ok(warnings.some(w => /option/i.test(w)), 'told to choose the species option');
  } finally {
    target.variants = target.variants.filter(v => !String(v.id).startsWith('syn-'));
  }
}

console.log('PASS: species publication selection');
