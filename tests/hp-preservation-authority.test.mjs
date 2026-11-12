import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Regression coverage for the HP authority (owner decision: preserve historical HP; the stateless
// reconstruction formula is retired). Real, unmodified production code: actor-engine.js is imported by relative
// specifier to bypass the harness fake, and hp-accounting.js is the pure model it uses.
//
// Gar'ee's persisted system.hp.max = 108 is CERTIFIED CORRECT (accumulated real per-level choices). No recompute,
// repeated or hook-triggered, may change it unless a VERIFIED contribution (CON, HP feat, hp.bonus) changed.

registerFoundryPathLoader();
installFoundryShimGlobals();

function gareeShapedActor() {
  return {
    id: 'garee-hp-preservation-test',
    type: 'character',
    name: "Gar'ee",
    system: {
      level: 8,
      skills: {},
      attributes: {
        con: { base: 14, racial: 0, enhancement: 0, temp: 0 }
      },
      hp: { value: 108, max: 108 },
      progression: {
        classLevels: [
          { class: 'Soldier', classId: 'soldier', level: 6 },
          { class: 'Scoundrel', classId: 'scoundrel', level: 2 }
        ]
      }
    },
    items: []
  };
}

// ---------------------------------------------------------------------------
// Test 1 — ordinary derived-data preparation never touches system.hp.max.
// ---------------------------------------------------------------------------
{
  const { computeCharacterDerived } = await import(
    '/systems/foundryvtt-swse/scripts/actors/v2/character-actor.js'
  );
  const actor = gareeShapedActor();
  computeCharacterDerived(actor, actor.system);
  assert.equal(actor.system.hp.max, 108, 'computeCharacterDerived() must not alter system.hp.max');
  // Run it again -- idempotence.
  computeCharacterDerived(actor, actor.system);
  assert.equal(actor.system.hp.max, 108, 'a second prepare pass must not alter system.hp.max either');
  // It should mirror, not recompute, into system.derived.hp.
  assert.equal(actor.system.derived.hp.max, 108, 'system.derived.hp.max must mirror the persisted 108, not recompute it');
}


const { ActorEngine } = await import(new URL('../scripts/governance/actor-engine/actor-engine.js', import.meta.url).href);
const { planHpRecompute, auditHp } = await import(new URL('../scripts/engine/HP/hp-accounting.js', import.meta.url).href);

globalThis.window ??= { location: { hostname: 'test' } };
function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = (o[k] ??= {});
  o[keys.at(-1)] = value;
}
function live(actor) {
  if (!(actor instanceof Actor)) Object.setPrototypeOf(actor, Actor.prototype);
  actor.update = async (data) => { for (const [k, v] of Object.entries(data)) setPath(actor, k.startsWith('system.') || k.startsWith('flags.') ? k : k, v); return actor; };
  actor.updateSource = actor.update;
  return actor;
}
const withLedger = (actor, ledger) => { actor.system.progression.hpLedger = ledger; return actor; };
const toughness = { type: 'feat', name: 'Toughness', system: { abilityMeta: { resourceRules: { hitPoints: [{ type: 'MAX_BONUS_PER_LEVEL', value: 1 }] } } } };
const classItem = (name) => ({ type: 'class', name, system: {} });

async function run(actor) {
  const before = JSON.stringify(actor.system.hp);
  let result, err = null;
  try { result = await ActorEngine.recomputeHP(live(actor), {}); } catch (e) { err = e; }
  return { result, err, changed: JSON.stringify(actor.system.hp) !== before };
}

// 1. Gar'ee (no ledger, history of class levels): 108 preserved, baseline recorded, never ReferenceError, repeat-safe.
{
  const g = gareeShapedActor();
  g.items = [classItem('Soldier')];
  let r = await run(g);
  assert.equal(r.err, null, String(r.err));
  assert.equal(g.system.hp.max, 108);
  assert.equal(g.system.progression.hpLedger.conMod, 2);
  r = await run(g); r = await run(g);
  assert.equal(g.system.hp.max, 108, 'repeated recompute is a no-op');
}
// 2. Hook-triggered recompute (fromHook) on the same actor: still 108.
{
  const g = gareeShapedActor(); g.items = [classItem('Soldier')];
  await ActorEngine.recomputeHP(live(g), { fromHook: true });
  assert.equal(g.system.hp.max, 108);
}
// 3. CON increase applies once, retroactively over recorded levels (+1 mod x 8 levels), no reroll; decrease reverses it; repeat is stable.
{
  const g = withLedger(gareeShapedActor(), { conMod: 2, featBonus: 0, bonus: 0, level: 8 }); g.items = [classItem('Soldier')];
  g.system.attributes.con.base = 16; // mod +3
  await ActorEngine.recomputeHP(live(g), {});
  assert.equal(g.system.hp.max, 116);
  await ActorEngine.recomputeHP(g, {}); assert.equal(g.system.hp.max, 116, 'applied once');
  g.system.attributes.con.base = 12; // mod +1
  await ActorEngine.recomputeHP(g, {});
  assert.equal(g.system.hp.max, 100);
}
// 4. Toughness gained / lost: the feat contribution delta only.
{
  const g = withLedger(gareeShapedActor(), { conMod: 2, featBonus: 0, bonus: 0, level: 8 }); g.items = [classItem('Soldier'), toughness];
  await ActorEngine.recomputeHP(live(g), {});
  assert.equal(g.system.hp.max, 116, 'Toughness = +1 x level 8');
  assert.equal(g.system.progression.hpLedger.featBonus, 8);
  g.items = [classItem('Soldier')];
  await ActorEngine.recomputeHP(g, {});
  assert.equal(g.system.hp.max, 108, 'removal reverses exactly its contribution');
}
// 5. Multiclass with rolled gains: nothing is rebuilt from class tables, any class mix keeps 108.
{
  const g = withLedger(gareeShapedActor(), { conMod: 2, featBonus: 0, bonus: 0, level: 8 });
  g.items = [classItem('Soldier'), classItem('Scoundrel')];
  await ActorEngine.recomputeHP(live(g), {});
  assert.equal(g.system.hp.max, 108);
}
// 6. hp.bonus change applies the delta.
{
  const g = withLedger(gareeShapedActor(), { conMod: 2, featBonus: 0, bonus: 0, level: 8 }); g.items = [classItem('Soldier')];
  g.system.hp.bonus = 5;
  await ActorEngine.recomputeHP(live(g), {});
  assert.equal(g.system.hp.max, 113);
}
// 7. Droids: no CON contribution ever.
{
  const d = withLedger(gareeShapedActor(), { conMod: 0, featBonus: 0, bonus: 0, level: 8 }); d.type = 'droid'; d.items = [classItem('Soldier')];
  d.system.attributes.con.base = 20;
  await ActorEngine.recomputeHP(live(d), {});
  assert.equal(d.system.hp.max, 108);
}
// 8. Imported NPC / classless / manual class level / incomplete history: stored maximum preserved, nothing written.
{
  const npc = gareeShapedActor(); npc.type = 'npc'; npc.items = []; npc.system.progression = {}; npc.system.hp = { value: 55, max: 55 };
  const r = await run(npc);
  assert.equal(r.err, null); assert.equal(npc.system.hp.max, 55); assert.equal(r.changed, false);
  assert.equal(planHpRecompute(npc).action, 'preserve');
  const manual = gareeShapedActor(); manual.items = [classItem('Soldier')]; manual.system.level = 12; // manual level bump, no ledger
  await run(manual);
  assert.equal(manual.system.hp.max, 108, 'manual class level preserves HP');
}
// 9. Unevaluable contribution: report, do not mutate.
{
  const g = withLedger(gareeShapedActor(), { conMod: 2, featBonus: 0, bonus: 0, level: 8 }); g.items = [classItem('Soldier')];
  g.system.attributes.con.base = 'garbage';
  const r = await run(g);
  assert.equal(r.changed, false); assert.equal(planHpRecompute(g).action, 'uncertain'); assert.equal(g.system.hp.max, 108);
}
// 10. Reconciliation audit uses the same accounting; incomplete evidence is 'incomplete', never an error.
{
  const g = gareeShapedActor(); g.items = [classItem('Soldier')];
  assert.equal(auditHp(g).status, 'incomplete');
  withLedger(g, { conMod: 2, featBonus: 0, bonus: 0, level: 8 });
  assert.equal(auditHp(g).status, 'consistent');
  g.system.attributes.con.base = 16;
  assert.equal(auditHp(g).status, 'pending-delta');
}

console.log('hp-preservation-authority.test.mjs: all assertions passed');
