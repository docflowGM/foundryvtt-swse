import { readFileSync } from 'node:fs';
import { makeActor, selectSpecies, computeDefenses } from './species-actor-sim.mjs';

// Observes what a species ACTUALLY changes on an actor through the production selection path, so automation claims are
// measured, not inferred from populated fields.
const quiet = async fn => { const l = console.log, w = console.warn; console.log = () => {}; console.warn = () => {}; try { return await fn(); } finally { console.log = l; console.warn = w; } };

export async function observeSpecies(name) {
  const actor = makeActor();
  const { ctx } = await quiet(() => selectSpecies(actor, name, null, { strict: true }));
  const d = await quiet(() => computeDefenses(actor));
  const f = actor.flags.swse;
  return {
    actor, ctx,
    defense: Object.fromEntries(['fortitude', 'reflex', 'will'].map(k => [k, d[k].flagBonus + d[k].modifierBonus])),
    rerolls: f.speciesRerolls ?? [],
    deferredFeats: f.deferredSpeciesBonusFeats ?? [],
    activated: (f.activeSpeciesAbilities ?? []).map(a => a.id),
    immunities: (f.speciesImmunities ?? []).map(i => i.key),
    primitive: f.primitiveSpecies === true,
    featsRequired: ctx.entitlements.featsRequired,
    fixedFeatGrants: ctx.traits.filter(t => t.classification === 'grant' && t.source === 'bonusFeat').flatMap(t => t.grants ?? []).filter(g => g.grantType === 'feat' && g.frequency !== 'conditional').map(g => g.target),
    items: actor.items.map(i => i.name),
  };
}

const SKILLS_STEP = readFileSync(new URL('../../scripts/apps/progression-framework/steps/skills-step.js', import.meta.url), 'utf8');

/** true when the engine currently applies the mechanic described by a fixture `mechanic` spec. */
export function isApplied(obs, m) {
  switch (m.kind) {
    case 'text': return false;
    case 'reroll': return obs.rerolls.some(r => r.target === m.skill && (m.outcome ? r.outcome === m.outcome : true));
    case 'rerollAny': return obs.rerolls.some(r => r.target === m.skill);
    case 'defense': return m.defense === 'all' ? Object.values(obs.defense).every(v => v === m.value) : obs.defense[m.defense] === m.value;
    case 'conditionalFeat': return obs.deferredFeats.some(g => g.name === m.feat);
    case 'activated': return obs.activated.includes(m.id);
    case 'immunity': return obs.immunities.includes(m.key);
    case 'primitive': return obs.primitive;
    case 'featsRequired': return obs.featsRequired === m.value;
    case 'fixedFeat': return obs.fixedFeatGrants.includes(m.feat) || obs.items.includes(m.feat);
    case 'humanSkill': return /humanBonus/.test(SKILLS_STEP);
    default: throw new Error(`unknown mechanic kind ${m.kind}`);
  }
}

/** Any footprint of the same mechanic regardless of outcome — used to prove a display-only trait has no partial effect. */
export function hasAnyEffect(obs, m) {
  if (m.kind === 'reroll') return isApplied(obs, { kind: 'rerollAny', skill: m.skill });
  if (m.kind === 'defense') return m.defense === 'all' ? Object.values(obs.defense).some(v => v) : !!obs.defense[m.defense];
  return isApplied(obs, m);
}
