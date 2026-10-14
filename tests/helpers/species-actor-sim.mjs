// Minimal Foundry-like actor + plan applier for species grant tests.
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './foundry-shim/globals.mjs';

registerFoundryPathLoader();
installFoundryShimGlobals();

const { SpeciesRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js');
const { buildPendingSpeciesContext } = await import('/systems/foundryvtt-swse/scripts/engine/progression/helpers/build-pending-species-context.js');
const { applyCanonicalSpeciesToActor } = await import('/systems/foundryvtt-swse/scripts/engine/progression/helpers/apply-canonical-species-to-actor.js');

const records = readFileSync(new URL('../../packs/species.db', import.meta.url), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const entries = records.map(r => SpeciesRegistry._normalizeEntry({ ...r, id: r._id, uuid: `Compendium.foundryvtt-swse.species.${r._id}`, pack: 'foundryvtt-swse.species' }));
SpeciesRegistry._entries = entries;
SpeciesRegistry._byId = new Map(entries.map(e => [e.id, e]));
SpeciesRegistry._byName = new Map(entries.map(e => [e.name.toLowerCase(), e]));

export { SpeciesRegistry };

export function makeActor() {
  const skills = Object.fromEntries(['acrobatics', 'climb', 'deception', 'perception', 'stealth', 'survival', 'useTheForce'].map(k => [k, { trained: false, classSkill: false }]));
  const attrs = Object.fromEntries(['str', 'dex', 'con', 'int', 'wis', 'cha'].map(k => [k, { base: 10, racial: 0 }]));
  return { id: 'actor1', type: 'character', system: { attributes: attrs, skills, size: 'medium', speed: 6 }, flags: { swse: {} }, items: [], _next: 1 };
}

const isPlainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Foundry update semantics: object values deep-MERGE into existing objects, arrays/scalars replace, `-=key: null` deletes. */
function mergeInto(target, key, value) {
  if (key.startsWith('-=')) { delete target[key.slice(2)]; return; }
  if (isPlainObject(value) && isPlainObject(target[key])) {
    for (const [k, v] of Object.entries(value)) mergeInto(target[key], k, v);
  } else if (isPlainObject(value)) {
    target[key] = {};
    for (const [k, v] of Object.entries(value)) mergeInto(target[key], k, v);
  } else target[key] = structuredClone(value);
}

export function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[k] ??= {};
  mergeInto(o, keys.at(-1), value);
}

/** Apply a species mutation plan the way the three production consumers do (deletes, then fields, then creates). */
export function applyPlan(actor, mutations) {
  for (const id of mutations.itemsToDelete || []) actor.items = actor.items.filter(i => i.id !== id);
  for (const [k, v] of Object.entries(mutations)) if (k.startsWith('system.') || k.startsWith('flags.')) setPath(actor, k, v);
  for (const item of mutations.itemsToCreate || []) actor.items.push({ ...structuredClone(item), id: `item${actor._next++}` });
}

export async function selectSpecies(actor, name, variantId = null) {
  const entry = SpeciesRegistry.getByName(name);
  if (!entry) throw new Error(`no species ${name}`);
  const identity = variantId ? { ...entry, selectedVariantId: variantId, variantId } : entry.id; // mirrors species-step.js
  const ctx = await buildPendingSpeciesContext(actor, identity, { source: 'test' });
  if (!ctx) throw new Error(`no context for ${name}/${variantId}`);
  const res = await applyCanonicalSpeciesToActor(actor, ctx);
  if (!res.success) throw new Error(res.error);
  applyPlan(actor, res.mutations);
  return { ctx, res };
}

/** Everything the species grant owns, in a comparable shape. */
export function speciesFootprint(actor) {
  const f = actor.flags.swse;
  const pick = {};
  for (const [k, v] of Object.entries(f)) if (/^(species|activeSpecies|primitive|suppressed|droidBuilder|hasRage|rageUnlocked)/.test(k) && k !== 'speciesGrantManifest' && v !== false && v !== null) pick[k] = v; // absent == false/null
  return {
    flags: pick,
    racial: Object.fromEntries(Object.entries(actor.system.attributes).map(([k, v]) => [k, v.racial])),
    trained: Object.entries(actor.system.skills).filter(([, v]) => v.trained).map(([k]) => k),
    classSkills: Object.entries(actor.system.skills).filter(([, v]) => v.classSkill).map(([k]) => k),
    items: actor.items.filter(i => i.flags?.swse?.speciesGranted).map(i => `${i.type}:${i.name}`).sort(),
    speciesMovement: actor.system.speciesMovement,
    species: actor.system.species,
    variant: actor.system.speciesVariant ?? null,
  };
}

/**
 * Final defense totals through the production pipeline: ability registration (the passive adapter path) +
 * DerivedCalculator.computeAll (ModifierEngine adjustments + DefenseCalculator species flags).
 * The species contribution per defense is split into its two possible paths so tests can prove
 * exactly-once application: `flagBonus` (ledger flags) and `modifierBonus` (passive adapter).
 */
export async function computeDefenses(actor) {
  const { AbilityExecutionCoordinator } = await import('/systems/foundryvtt-swse/scripts/engine/abilities/ability-execution-coordinator.js');
  const { DerivedCalculator } = await import('/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js');
  actor.type ??= 'character'; actor.effects ??= []; actor._stats ??= { modifiedTime: 1 };
  actor.id = actor.id === 'actor1' ? `defense-sim-${Math.random().toString(36).slice(2)}` : actor.id;
  actor.system.level = 1; actor.system.hp = { max: 10, value: 10 };
  actor.system.progression = { classLevels: [] };
  const species = actor.system.species;
  actor.system.race = species;
  AbilityExecutionCoordinator.registerActorAbilities(actor);
  DerivedCalculator.clearCaches();
  const updates = await DerivedCalculator.computeAll(actor);
  const d = updates['system.derived.defenses'] || {};
  const out = {};
  for (const key of ['fortitude', 'reflex', 'will']) {
    out[key] = { total: d[key]?.total, flagBonus: d[key]?.speciesBonus ?? 0, modifierBonus: d[key]?.adjustment ?? 0, abilityMod: d[key]?.abilityMod ?? 0 };
  }
  return out;
}
