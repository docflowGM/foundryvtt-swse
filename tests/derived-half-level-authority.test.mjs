import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// 3N-DC P0 (owner directive): ONE level authority with three distinct rules (Core Rulebook, Combat chapter, p.145 area; keep the source-distinction note):
//   skills            -> one-half CHARACTER level (heroic + nonheroic)
//   personal damage   -> one-half HEROIC level
//   defenses          -> HEROIC level
// Fixtures: Soldier 1, Soldier 6, Nonheroic 4, Nonheroic 4 / Soldier 2, Nonheroic 10 / Soldier 5. Statblock NPCs keep published totals.
// Failing before the fix: getHalfCharacterLevel / getHalfHeroicLevel did not exist and skills used a heroic-based half level.
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.game = { ...(globalThis.game ?? {}), settings: { get: () => false }, user: { isGM: true }, actors: { get: () => null } };
const L = await import('/systems/foundryvtt-swse/scripts/actors/derived/level-split.js');
const cls = (name, level, nonheroic = false) => ({ type: 'class', name, system: { level, isNonheroic: nonheroic } });
const pc = (...classes) => ({ type: 'character', system: { level: classes.reduce((s, c) => s + c.system.level, 0) || 1 }, items: classes });

const FIX = {
  'Soldier 1': pc(cls('Soldier', 1)),
  'Soldier 6': pc(cls('Soldier', 6)),
  'Nonheroic 4': pc(cls('Nonheroic', 4, true)),
  'NH4/Soldier2': pc(cls('Nonheroic', 4, true), cls('Soldier', 2)),
  'NH10/Soldier5': pc(cls('Nonheroic', 10, true), cls('Soldier', 5)),
};

test_('half CHARACTER level (skills): total character level / 2, rounded down', () => {
  assert.equal(L.getHalfCharacterLevel(FIX['Soldier 1']), 0);
  assert.equal(L.getHalfCharacterLevel(FIX['Soldier 6']), 3);
  assert.equal(L.getHalfCharacterLevel(FIX['Nonheroic 4']), 2);
  assert.equal(L.getHalfCharacterLevel(FIX['NH4/Soldier2']), 3, 'nonheroic levels count for skills');
  assert.equal(L.getHalfCharacterLevel(FIX['NH10/Soldier5']), 7);
});
test_('half HEROIC level (personal weapon damage): heroic levels only; nonheroic levels never count', () => {
  assert.equal(L.getHalfHeroicLevel(FIX['Soldier 1']), 0);
  assert.equal(L.getHalfHeroicLevel(FIX['Soldier 6']), 3);
  assert.equal(L.getHalfHeroicLevel(FIX['Nonheroic 4']), 0, 'a purely nonheroic actor has no heroic level');
  assert.equal(L.getHalfHeroicLevel(FIX['NH4/Soldier2']), 1);
  assert.equal(L.getHalfHeroicLevel(FIX['NH10/Soldier5']), 2);
});
test_('statblock NPCs keep the published total (system.level) for both', () => {
  const npc = { type: 'npc', system: { level: 9, npcMode: 'statblock' }, items: [] };
  assert.equal(L.getHalfCharacterLevel(npc), 4);
  assert.equal(L.getHalfHeroicLevel(npc), 4);
});
test_('actors with no class items fall back to system.level (sparse legacy data), never silently to zero', () => {
  const sparse = { type: 'character', system: { level: 8 }, items: [] };
  assert.equal(L.getHalfCharacterLevel(sparse), 4);
  assert.equal(L.getHalfHeroicLevel(sparse), 4);
});

// The calculator must use the CHARACTER half level for skill totals (the defect: it used the heroic-based helper).
const { DerivedCalculator } = await import('/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js');
test_async('DerivedCalculator skill totals use half CHARACTER level (NH4/Soldier2 -> +3, not +1)', async () => {
  const actor = {
    id: 'a-nh4s2', type: 'character', _stats: { modifiedTime: 1 }, effects: [], flags: {},
    items: [cls('Nonheroic', 4, true), cls('Soldier', 2)],
    system: { level: 6, size: 'medium', hp: { max: 20, value: 20 }, progression: {},
      attributes: { str: { base: 10 }, dex: { base: 10 }, con: { base: 10 }, int: { base: 10 }, wis: { base: 10 }, cha: { base: 10 } },
      skills: { acrobatics: { trained: true, focused: false, miscMod: 0, selectedAbility: 'dex' } } }
  };
  const out = await DerivedCalculator.computeAll(actor);
  const sk = out['system.derived.skills'] ?? out.system?.derived?.skills;
  assert.ok(sk?.acrobatics, 'acrobatics derived');
  assert.equal(sk.acrobatics.total, 3 + 5 + 0, 'half character level 3 + trained 5 + dex mod 0');
});

function test_(name, fn) { try { fn(); console.log(`  ok  ${name}`); } catch (e) { console.error(`FAIL ${name}`); throw e; } }
async function test_async(name, fn) { try { await fn(); console.log(`  ok  ${name}`); } catch (e) { console.error(`FAIL ${name}`); throw e; } }
