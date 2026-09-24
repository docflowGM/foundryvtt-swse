import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// V2 derived/cache-coherency regression — REQUIRED GOLDEN PATH TEST C.
//
// Golden case (from the problem statement): Scout 1 / Soldier 7, DEX 18
// (+4), CON 17 (+3), WIS 14 (+2).
//
//   Fortitude = 10 + heroic 8 + class 2 + CON 3 = 23
//   Reflex    = 10 + heroic 8 + class 2 + DEX 4 = 24
//   Will      = 10 + heroic 8 + class 0 + WIS 2 = 20
//
// This exercises the REAL production authorities end to end:
//   DerivedCalculator.computeAll() (via the real
//   SWSEV2BaseActor.prototype._computeDerivedAsync())
//     -> DefenseCalculator.calculate()
//     -> system.derived.defenses.* (authoritative snapshot applied in place)
//     -> PanelContextBuilder.buildDefensePanel()
//     -> effective defense display model
//
// Nothing here re-implements the defense formula — DefenseCalculator itself
// is never touched by this regression fix, and this test proves that fact by
// running its real, unmodified code end to end and asserting on its output.

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry.utils.duplicate = (v) => JSON.parse(JSON.stringify(v ?? {}));
globalThis.CONFIG = globalThis.CONFIG ?? { SWSE: {} };

const { SWSEV2BaseActor } = await import(
  '/systems/foundryvtt-swse/scripts/actors/v2/base-actor.js'
);
const { DerivedCalculator } = await import(
  '/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js'
);
const { DefenseCalculator } = await import(
  '/systems/foundryvtt-swse/scripts/actors/derived/defense-calculator.js'
);
const { PanelContextBuilder } = await import(
  '/systems/foundryvtt-swse/scripts/sheets/v2/context/PanelContextBuilder.js'
);
const { ClassesDB } = await import(
  '/systems/foundryvtt-swse/scripts/data/classes-db.js'
);

// ─── Real class defense data — Scout's good save is Reflex, Soldier's is ──
// Fortitude; neither is Will, matching the golden case's "class 0" for Will.
ClassesDB.isBuilt = true;
ClassesDB.classes.set('scout', {
  id: 'scout',
  name: 'Scout',
  system: { hitDie: 6, defenses: { fortitude: 0, reflex: 2, will: 0 } }
});
ClassesDB.classes.set('soldier', {
  id: 'soldier',
  name: 'Soldier',
  system: { hitDie: 10, defenses: { fortitude: 2, reflex: 0, will: 0 } }
});

function makeGoldenActor() {
  const actor = Object.create(SWSEV2BaseActor.prototype);
  actor.id = 'golden-scout1-soldier7';
  actor.name = "Golden Path Test Actor";
  actor.type = 'character';
  actor.isOwner = true;
  actor._stats = { modifiedTime: 777 };
  actor.flags = { swse: {} };
  actor.getFlag = (scope, key) => actor.flags?.[scope]?.[key];
  actor.items = [
    { id: 'scout-class-item', _id: 'scout-class-item', type: 'class', name: 'Scout', system: { level: 1, isNonheroic: false, className: 'Scout' } },
    { id: 'soldier-class-item', _id: 'soldier-class-item', type: 'class', name: 'Soldier', system: { level: 7, isNonheroic: false, className: 'Soldier' } }
  ];
  actor.effects = [];
  actor.apps = {};
  actor.system = {
    isDroid: false,
    level: 8,
    hp: { max: 1, value: 1 },
    skills: {},
    defenses: {},
    attributes: {
      str: { base: 10, racial: 0, enhancement: 0, temp: 0 },
      dex: { base: 18, racial: 0, enhancement: 0, temp: 0 },
      con: { base: 17, racial: 0, enhancement: 0, temp: 0 },
      int: { base: 10, racial: 0, enhancement: 0, temp: 0 },
      wis: { base: 14, racial: 0, enhancement: 0, temp: 0 },
      cha: { base: 10, racial: 0, enhancement: 0, temp: 0 }
    },
    progression: {
      classLevels: [
        { class: 'Scout', level: 1 },
        { class: 'Soldier', level: 7 }
      ]
    },
    derived: {}
  };
  return actor;
}

DerivedCalculator.clearCaches();
DefenseCalculator.clearCaches();

const actor = makeGoldenActor();

// ── Sanity: ability modifiers really are +4 / +3 / +2 before anything else ──
assert.equal(Math.floor((18 - 10) / 2), 4, 'sanity: DEX 18 -> +4');
assert.equal(Math.floor((17 - 10) / 2), 3, 'sanity: CON 17 -> +3');
assert.equal(Math.floor((14 - 10) / 2), 2, 'sanity: WIS 14 -> +2');

// ── Step 1: prepare/derive -> async derived application (real production path) ──
await actor._computeDerivedAsync(actor.system);

const derivedDefenses = actor.system.derived.defenses;
assert.ok(derivedDefenses, 'DerivedCalculator.computeAll() must have populated system.derived.defenses');
assert.equal(actor.system.derived.heroicLevel, 8, 'Scout 1 + Soldier 7 must sum to heroic level 8');

assert.equal(derivedDefenses.fortitude.total, 23, 'authoritative Fortitude total must be 23');
assert.equal(derivedDefenses.reflex.total, 24, 'authoritative Reflex total must be 24');
assert.equal(derivedDefenses.will.total, 20, 'authoritative Will total must be 20');

assert.equal(derivedDefenses.fortitude.heroicLevel, 8, 'Fortitude heroic level contribution must be 8');
assert.equal(derivedDefenses.fortitude.classBonus, 2, 'Fortitude class bonus must be 2 (Soldier)');
assert.equal(derivedDefenses.fortitude.abilityMod, 3, 'Fortitude ability modifier must be 3 (CON)');

assert.equal(derivedDefenses.reflex.heroicLevel, 8, 'Reflex heroic level contribution must be 8');
assert.equal(derivedDefenses.reflex.classBonus, 2, 'Reflex class bonus must be 2 (Scout)');
assert.equal(derivedDefenses.reflex.abilityMod, 4, 'Reflex ability modifier must be 4 (DEX)');

assert.equal(derivedDefenses.will.heroicLevel, 8, 'Will heroic level contribution must be 8');
assert.equal(derivedDefenses.will.classBonus, 0, 'Will class bonus must be 0 (neither class has a good Will save)');
assert.equal(derivedDefenses.will.abilityMod, 2, 'Will ability modifier must be 2 (WIS)');

console.log('  [1/2] DerivedCalculator -> DefenseCalculator authoritative snapshot matches the golden case OK');

// ── Step 2: panel rebuild -> effective defense display model ──
// A fresh PanelContextBuilder per "render", exactly as
// character-like-sheet.js constructs one on every render.
const builder = new PanelContextBuilder(actor, { isEditable: true });
const defensePanel = builder.buildDefensePanel();

const fort = defensePanel.defenses.find(d => d.systemKey === 'fortitude');
const ref = defensePanel.defenses.find(d => d.systemKey === 'reflex');
const will = defensePanel.defenses.find(d => d.systemKey === 'will');

assert.equal(fort.total, 23, 'defensePanel Fortitude total must be 23');
assert.equal(fort.levelContribution, 8, 'defensePanel Fortitude heroic/level contribution must be 8');
assert.equal(fort.classDef, 2, 'defensePanel Fortitude class bonus must be 2');
assert.equal(fort.abilityMod, 3, 'defensePanel Fortitude ability modifier must be 3');

assert.equal(ref.total, 24, 'defensePanel Reflex total must be 24');
assert.equal(ref.levelContribution, 8, 'defensePanel Reflex heroic/level contribution must be 8');
assert.equal(ref.classDef, 2, 'defensePanel Reflex class bonus must be 2');
assert.equal(ref.abilityMod, 4, 'defensePanel Reflex ability modifier must be 4');

assert.equal(will.total, 20, 'defensePanel Will total must be 20');
assert.equal(will.levelContribution, 8, 'defensePanel Will heroic/level contribution must be 8');
assert.equal(will.classDef, 0, 'defensePanel Will class bonus must be 0');
assert.equal(will.abilityMod, 2, 'defensePanel Will ability modifier must be 2');

console.log('  [2/2] PanelContextBuilder.buildDefensePanel() display model matches the golden case OK');
console.log('v2-golden-defense-lifecycle.test.mjs: all assertions passed');
