// 6R (#1131) typed ActiveEffect admission is SATISFIED_BY_6O: the 6O ingress (force-class-effect-ingress.js) is the single admission
// policy. This ports 6R's behavioral cases onto it and pins the extra explicit descriptor spellings 6R recognized
// (isMindAffecting / isFear / fear booleans, comma-separated token strings). Offline; not FOUNDRY_TESTED.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
registerFoundryPathLoader(); installFoundryShimGlobals();
const { filterForceClassImmuneActiveEffects, typedEffectContext } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/force-class-effect-ingress.js');
const ids = { 'Force Disciple': 'ef6fe8fdbbd884b4', 'Jedi Master': '07a64453f95e04f2', 'Sith Lord': '2f7cfdc115c640a5' };
const actor = (cls, ds = 0) => ({ items: cls ? [{ type: 'class', name: cls, system: { classId: ids[cls], level: 1 } }] : [], system: { darkSide: { value: ds }, attributes: { wis: { base: 12 } } } });
const effect = (name, flags = {}, system = {}) => ({ name, flags, system });

test('only explicit descriptors classify; names and prose never do', () => {
  assert.equal(typedEffectContext(effect('Frightening rumors')).fearEffect, false);
  assert.equal(typedEffectContext(effect('x', { swse: { mindAffecting: true } })).mindAffecting, true);
  assert.equal(typedEffectContext(effect('x', { swse: { isMindAffecting: true } })).mindAffecting, true);
  for (const k of ['fearEffect', 'isFear', 'fear']) assert.equal(typedEffectContext(effect('x', { swse: { [k]: true } })).fearEffect, true, k);
  assert.ok(typedEffectContext(effect('x', { swse: { tags: 'fear,other' } })).effectTags.includes('fear'), 'comma-separated token');
  assert.equal(typedEffectContext(effect('Not a descriptor', { swse: { note: 'Mind-Affecting fear' } })).mindAffecting, false);
});

test('Force Disciple rejects typed Mind-Affecting effects; unrelated and prose-only effects pass', () => {
  const d = actor('Force Disciple');
  const mind = effect('Dampen Presence', { swse: { mindAffecting: true, memorySuppressed: true } });
  const neutral = effect('Might', { swse: { tags: ['enhancement'] } });
  const named = effect('Mind-Affecting Wording');
  const g = filterForceClassImmuneActiveEffects(d, [mind, neutral, named]);
  assert.deepEqual(g.accepted, [neutral, named]); assert.equal(g.suppressed.length, 1);
  assert.equal(filterForceClassImmuneActiveEffects(actor(null), [mind]).accepted.length, 1);
  assert.equal(filterForceClassImmuneActiveEffects({ items: [{ type: 'feat', name: 'Force Disciple', system: { level: 5 } }] }, [mind]).accepted.length, 1, 'a spoofed feat is not the class');
});

test('Fearless: Jedi Master and Sith Lord at DSP >= Wisdom; suspended Sith Lord is not immune (boundary)', () => {
  const fear = effect('Frightening Cleave', { swse: { fear: true } });
  const mind = effect('Affect Mind', { swse: { descriptors: ['mind-affecting'] } });
  for (const a of [actor('Jedi Master'), actor('Sith Lord', 12)]) {
    const g = filterForceClassImmuneActiveEffects(a, [fear, mind]);
    assert.deepEqual(g.accepted, [mind]); assert.equal(g.suppressed.length, 1);
  }
  assert.deepEqual(filterForceClassImmuneActiveEffects(actor('Sith Lord', 11), [fear]).accepted, [fear], 'suspended below the Wisdom threshold');
  assert.deepEqual(filterForceClassImmuneActiveEffects(actor('Sith Lord', 12), [fear]).accepted, [], 'resumed at the threshold');
});

test('both canonical ActorEngine creation seams filter before the embedded write; the wrapper routes through ActorEngine', () => {
  const src = readFileSync(new URL('../scripts/governance/actor-engine/actor-engine.js', import.meta.url), 'utf8');
  for (const [open, write] of [['async createEmbeddedDocuments(actor, embeddedName, data, options = {})', 'actor.createEmbeddedDocuments(embeddedName,'], ['async createActiveEffects(actor, effectData, options = {})', "actor.createEmbeddedDocuments('ActiveEffect',"]]) {
    const a = src.indexOf(open); assert.ok(a >= 0, open);
    const body = src.slice(a, a + 6000);
    assert.ok(body.indexOf('filterForceClassImmuneActiveEffects') >= 0 && body.indexOf('filterForceClassImmuneActiveEffects') < body.indexOf(write), `${open}: filter precedes the write`);
  }
  const wrap = readFileSync(new URL('../scripts/core/document-api-v13.js', import.meta.url), 'utf8');
  assert.match(wrap.slice(wrap.indexOf('export async function createEffectOnActor(')), /ActorEngine\.createEmbeddedDocuments\(actor, 'ActiveEffect', dataArray, options\)/);
});
