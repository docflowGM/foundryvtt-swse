import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze, Batch 2A correction (second pass) — a legacy-
// equipped armor/shield must be correct on the actor's FIRST
// DerivedCalculator.computeAll() pass, not just after some later
// recomputation.
//
// FAIL-BEFORE (confirmed by direct code reading, not reproduced by reverting
// the fix): DerivedCalculator.computeAll() runs
// ModifierEngine.getAllModifiers()/aggregateAll() (which drive ACP/skill
// modifiers via armor-usage-resolver.js) BEFORE DefenseCalculator.calculate().
// The previous correction's normalizeArmorEquipState() mutation ran ONLY
// inside the patched DefenseCalculator.calculate() -- so for an armor/shield
// item equipped via a legacy/alternate field shape (system.isEquipped,
// system.readied, system.equippable.equipped, flags.swse.equipped instead
// of the canonical system.equipped), the sequence on the actor's first
// derived pass was:
//
//   ModifierEngine runs -> legacy armor looks UNEQUIPPED (narrow
//   `item.system?.equipped` check) -> ACP/skill contributions omitted
//   -> DefenseCalculator finally runs -> the hotfix mutates
//   system.equipped = true -> defenses come out correct
//
// system.derived.skills and derived Initiative would be wrong for that one
// pass even though Defense was already right -- a later recomputation could
// "mysteriously" fix it purely because the in-memory mutation had already
// happened by then. Exactly the order-dependent behavior this freeze exists
// to eliminate.
//
// Fixed by making isArmorItemEquipped() (armor-data-resolver.js) the single
// canonical equipped-state check every consumer calls directly --
// ModifierEngine, armor-usage-resolver.js, and DefenseCalculator's own
// equippedArmor lookup all see the SAME answer regardless of call order, so
// there is no "whoever runs first" dependency left at all.
//
// This suite proves a single DerivedCalculator.computeAll() pass on a
// legacy-equipped Gar'ee-shaped actor produces the correct ACP skills,
// correct derived Initiative, correct defenses, and correct roll-dialog
// total -- including the adversarial case system.equipped: false,
// system.isEquipped: true, which the modifier-source signature's own `??`
// bug (also fixed) would otherwise have silently ignored on top of the
// equip-detection bug.

registerFoundryPathLoader();
installFoundryShimGlobals({
  game: {
    settings: {
      get: (ns, key) => (key === 'athleticsConsolidation' ? false : (key === 'grappleEnabled' ? true : (key === 'grappleDCBonus' ? 0 : undefined))),
      set: () => {},
      settings: { has: () => true }
    }
  }
});

// Structural-only stubs so the transitive import graph can load under plain
// Node -- same pattern as garee-full-skill-derivation-parity.test.mjs.
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? {
  ApplicationV2: class {},
  HandlebarsApplicationMixin: (Base) => class extends Base {}
};
globalThis.window = globalThis.window ?? globalThis;

const { DerivedCalculator } = await import(
  '/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js'
);
const { buildRollConfigModel, getSkillTotal } = await import(
  '/systems/foundryvtt-swse/scripts/rolls/roll-config.js'
);

// Gar'ee's real Energy Shield (SR 10) and M1-10 Stalker Armor records, but
// equipped via LEGACY/ALTERNATE flag shapes instead of the canonical
// system.equipped -- the adversarial case: system.equipped explicitly
// false (not merely absent) with system.isEquipped true for the shield, and
// system.equippable.equipped true (system.equipped absent) for the armor.
function gareeShieldLegacyEquip() {
  return {
    id: '1xMjvsWJzcQ9Cl5L', name: 'Energy Shield (SR 10)', type: 'armor',
    system: {
      armorType: 'shield', reflexBonus: 0, fortitudeBonus: 0, maxDex: 4, shieldRating: 10,
      armorProficiencyRequired: 'light', charges: { current: 4, max: 5 }, activated: true,
      defenseBonus: 0, maxDexBonus: 4, armorCheckPenalty: -2, fortBonus: 0, speedPenalty: 0,
      // Adversarial: explicitly false, with the real signal on isEquipped.
      equipped: false,
      isEquipped: true,
      currentSR: 10
    }
  };
}
function gareeArmorLegacyEquip() {
  return {
    id: '8ebDcuzqZNUfWCzD', name: 'M1-10 Stalker Armor', type: 'armor',
    system: {
      armorType: 'medium', reflexBonus: 8, fortitudeBonus: 3, maxDex: 4, shieldRating: 0,
      armorProficiencyRequired: '', charges: { current: 5, max: 5 }, activated: true,
      defenseBonus: 8, maxDexBonus: 4, armorCheckPenalty: false, fortBonus: 3, speedPenalty: 2,
      // Adversarial: no system.equipped at all, equipped only via the
      // nested equippable.equipped shape.
      equippable: { equipped: true },
      currentSR: 0, installedUpgrades: []
    }
  };
}
function feat(name) { return { id: `feat-${name}`, name, type: 'feat', system: {} }; }

function gareeActorLegacyEquip() {
  const items = [gareeShieldLegacyEquip(), gareeArmorLegacyEquip(), feat('Armor Proficiency (light)'), feat('Armor Proficiency (medium)')];
  return {
    type: 'character', name: "Gar'ee", flags: {}, items,
    system: {
      level: 8,
      progression: { classLevels: [{ class: 'Soldier', classId: 'soldier', level: 6 }, { class: 'Scoundrel', classId: 'scoundrel', level: 2 }] },
      attributes: {
        str: { base: 14, racial: 0, enhancement: 0, temp: 0 },
        dex: { base: 20, racial: 0, enhancement: 0, temp: 0 },
        con: { base: 14, racial: 0, enhancement: 0, temp: 0 },
        int: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        wis: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        cha: { base: 10, racial: 0, enhancement: 0, temp: 0 }
      },
      skills: {
        acrobatics: { trained: false, miscMod: 0, focused: false, selectedAbility: '', classSkill: true },
        climb: { trained: false, miscMod: 0, focused: false, selectedAbility: '', classSkill: true },
        endurance: { trained: true, miscMod: 0, focused: false, selectedAbility: '', classSkill: true },
        initiative: { trained: true, miscMod: 0, focused: true, selectedAbility: '', classSkill: true },
        jump: { trained: false, miscMod: 0, focused: false, selectedAbility: '', classSkill: true },
        stealth: { trained: true, miscMod: 5, focused: true, selectedAbility: '', classSkill: true },
        swim: { trained: false, miscMod: 0, focused: false, selectedAbility: '', classSkill: true },
        perception: { trained: true, miscMod: 0, focused: false, selectedAbility: '', classSkill: true }
      },
      hp: { max: 108, value: 108 },
      conditionTrack: { current: 0 },
      speed: 6
    }
  };
}

// Same certified active-shield golden values as garee-full-skill-derivation-parity.test.mjs.
const EXPECTED_ACTIVE = { acrobatics: 7, climb: 4, endurance: 9, initiative: 17, jump: 4, stealth: 22, swim: 4 };

// ─── 1. A single computeAll() pass on the legacy-equipped actor must get ──
//        ACP-affected skills right immediately -- not just after a second
//        recomputation.

const actor = gareeActorLegacyEquip();
const updates = await DerivedCalculator.computeAll(actor);
const skills = updates['system.derived.skills'];

for (const [key, expected] of Object.entries(EXPECTED_ACTIVE)) {
  assert.equal(skills[key].total, expected, `[single pass] ${key} must equal the certified golden value ${expected} even though the shield/armor use legacy equip-flag shapes`);
}
assert.equal(skills.perception.total, skills.perception.abilityMod + 4 + 5, '[single pass] an unaffected skill (Perception) must be unaffected by the legacy-equipped shield/armor');

console.log('  [1/4] a single DerivedCalculator.computeAll() pass gets every ACP-affected skill right immediately for a legacy-equipped shield+armor actor OK');

// ─── 2. Derived Initiative parity holds on that same single pass ──────────

const skillsInitiative = updates['system.derived.skills'].initiative.total;
const derivedInitiative = updates['system.derived.initiative']?.total ?? updates['system.derived.initiative'];
assert.equal(skillsInitiative, EXPECTED_ACTIVE.initiative, '[single pass] derived Initiative must be correct immediately');
assert.equal(skillsInitiative, derivedInitiative, '[single pass] system.derived.skills.initiative.total === system.derived.initiative.total');

console.log('  [2/4] derived Initiative is correct and matches system.derived.initiative.total on the same single pass OK');

// ─── 3. Defenses are also correct on that same single pass (this part ─────
//        never broke -- DefenseCalculator's own equippedArmor lookup always
//        ran within DefenseCalculator.calculate() itself -- but re-proven
//        here as part of the required "everything correct in one pass"
//        invariant).

const defenses = updates['system.derived.defenses'];
assert.ok(defenses?.reflex?.total > 10, '[single pass] Reflex must reflect the legacy-equipped body armor\'s bonuses, not the unarmored default');
assert.equal(defenses.reflex.armorBonus, 8, '[single pass] the legacy-equipped M1-10 Stalker Armor\'s +8 Reflex bonus must apply');

console.log('  [3/4] defenses are correct on the same single pass (Reflex reflects the legacy-equipped body armor) OK');

// ─── 4. The real roll-dialog consumption path agrees, same single pass ────

actor.system.derived = {
  skills: updates['system.derived.skills'],
  initiative: updates['system.derived.initiative'],
  attributes: updates['system.derived.attributes']
};
for (const key of Object.keys(EXPECTED_ACTIVE)) {
  const viaGetSkillTotal = getSkillTotal(actor, key);
  const model = await buildRollConfigModel({ actor, rollType: 'skill', skillKey: key });
  assert.equal(viaGetSkillTotal, EXPECTED_ACTIVE[key], `[single pass] getSkillTotal('${key}') must be correct immediately`);
  assert.equal(model.baseTotal, EXPECTED_ACTIVE[key], `[single pass] the roll dialog's baseTotal for '${key}' must be correct immediately`);
}

console.log('  [4/4] the real roll-dialog consumption path (buildRollConfigModel/getSkillTotal) agrees on the same single pass, for a legacy-equipped shield+armor actor OK');

console.log('legacy-equip-state-single-pass-authority.test.mjs: all assertions passed');
