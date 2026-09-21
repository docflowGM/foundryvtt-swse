import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze, Batch 2A correction — the Energy Shield golden
// case, completed. The prior Gar'ee coverage (armor-shield-acp-authority /
// energy-shield-defense-and-activation-authority) proved his real armor/
// shield item data produces the right MODIFIER OBJECTS (ModifierEngine's
// skill.<key> entries) and the right resolveArmorUsageEffects() output, but
// never drove his full actor through the real derived-skill pipeline
// (DerivedCalculator.computeAll() -> system.derived.skills[key].total, the
// documented canonical SSOT -- see derived-calculator.js's own "SSOT:
// system.derived.skills[skillKey].total is the CANONICAL skill modifier"
// comment) or the real roll-dialog consumption path
// (buildRollConfigModel()/getSkillTotal(), roll-config.js). This suite
// closes that gap: expected === derived === getSkillTotal() ===
// buildRollConfigModel().baseTotal, for every ACP-affected skill, in both
// shield states, live-executed (not reimplemented).
//
// Investigating this also surfaced (and ruled out as a live defect) a
// second ACP read site: DerivedCalculator's own per-skill loop has a
// dedicated "armor check penalty" breakdown line
// (`actor.system.derived?.armor?.checkPenalty || actor.system.armor?.checkPenalty`)
// that is separate from the `modifierMap['skill.<key>']` channel
// ModifierEngine's ACP modifiers actually flow through. Repository-wide
// search confirms neither of those two flat fields is ever written
// anywhere -- that breakdown line is always 0, dead code (mislabeled in the
// UI breakdown, but numerically inert), not a second live authority. The
// real ACP contribution reaches the total exclusively via the same
// modifierMap['skill.<key>'] channel every other feat/equipment/effect
// modifier uses, which is exactly what this suite proves end to end.

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

// Structural-only stubs so the transitive import graph (roll-config.js ->
// .../swse-application-v2.js, etc.) can load under plain Node -- same
// pattern as tests/grapple-bonus-ssot-parity.test.mjs. Neither stub fakes
// any rules/game logic.
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

// Real exported item data: Gar'ee's Energy Shield (SR 10) and M1-10 Stalker
// Armor, and his real "Armor Proficiency (light)"/"Armor Proficiency
// (medium)" feats -- same records used in the earlier armor-shield-acp-
// authority/energy-shield-defense-and-activation-authority suites.
function gareeShield(active) {
  return {
    id: '1xMjvsWJzcQ9Cl5L', name: 'Energy Shield (SR 10)', type: 'armor',
    system: {
      armorType: 'shield', reflexBonus: 0, fortitudeBonus: 0, maxDex: 4, shieldRating: 10,
      armorProficiencyRequired: 'light', charges: { current: 4, max: 5 }, activated: active,
      defenseBonus: 0, maxDexBonus: 4, armorCheckPenalty: -2, fortBonus: 0, speedPenalty: 0,
      equipped: true, currentSR: active ? 10 : 0
    }
  };
}
function gareeArmor() {
  return {
    id: '8ebDcuzqZNUfWCzD', name: 'M1-10 Stalker Armor', type: 'armor',
    system: {
      armorType: 'medium', reflexBonus: 8, fortitudeBonus: 3, maxDex: 4, shieldRating: 0,
      armorProficiencyRequired: '', charges: { current: 5, max: 5 }, activated: true,
      defenseBonus: 8, maxDexBonus: 4, armorCheckPenalty: false, fortBonus: 3, speedPenalty: 2,
      equipped: true, currentSR: 0, installedUpgrades: []
    }
  };
}
function feat(name) { return { id: `feat-${name}`, name, type: 'feat', system: {} }; }

// A minimally-faithful full Gar'ee fixture: his real armor/shield/feat
// records above, plus his real ability scores (DEX 20, STR 14, CON 14 --
// cross-derived from his own published skill totals below, since the raw
// export's attribute block wasn't itself needed for the ACP proof but IS
// needed here to drive the real derived-skill formula end to end) and his
// real skill training/focus/misc configuration (system.skills), heroic
// level 8 (Soldier 6/Scoundrel 2).
function gareeActor(shieldActive) {
  const items = [gareeShield(shieldActive), gareeArmor(), feat('Armor Proficiency (light)'), feat('Armor Proficiency (medium)')];
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
      // Real system.skills config values (trained/focused/miscMod) from
      // Gar'ee's actual actor export.
      skills: {
        acrobatics: { trained: false, miscMod: 0, focused: false, selectedAbility: '', classSkill: true },
        climb: { trained: false, miscMod: 0, focused: false, selectedAbility: '', classSkill: true },
        endurance: { trained: true, miscMod: 0, focused: false, selectedAbility: '', classSkill: true },
        initiative: { trained: true, miscMod: 0, focused: true, selectedAbility: '', classSkill: true },
        jump: { trained: false, miscMod: 0, focused: false, selectedAbility: '', classSkill: true },
        stealth: { trained: true, miscMod: 5, focused: true, selectedAbility: '', classSkill: true },
        swim: { trained: false, miscMod: 0, focused: false, selectedAbility: '', classSkill: true },
        perception: { trained: true, miscMod: 0, focused: false, selectedAbility: '', classSkill: true },
        knowledgeTactics: { trained: true, miscMod: 0, focused: false, selectedAbility: '', classSkill: true },
        useComputer: { trained: true, miscMod: 0, focused: false, selectedAbility: '', classSkill: true }
      },
      hp: { max: 108, value: 108 },
      conditionTrack: { current: 0 },
      speed: 6
    }
  };
}

const EXPECTED_ACTIVE = { acrobatics: 7, climb: 4, endurance: 9, initiative: 17, jump: 4, stealth: 22, swim: 4 };
const EXPECTED_INACTIVE = { acrobatics: 9, climb: 6, endurance: 11, initiative: 19, jump: 6, stealth: 24, swim: 6 };
const UNAFFECTED_SKILLS = ['perception', 'knowledgeTactics', 'useComputer'];

async function computeGareeDerived(shieldActive) {
  const actor = gareeActor(shieldActive);
  const updates = await DerivedCalculator.computeAll(actor);
  // Mimic what a live Foundry actor's prepareDerivedData() would have
  // already attached by the time a player opens a roll dialog -- the exact
  // shape buildRollConfigModel()/getSkillTotal() read.
  actor.system.derived = {
    skills: updates['system.derived.skills'],
    initiative: updates['system.derived.initiative'],
    attributes: updates['system.derived.attributes']
  };
  return { actor, updates };
}

// ─── 1. Active-shield required golden values, via the real ────────────────
//        DerivedCalculator.computeAll() pipeline.

{
  const { updates } = await computeGareeDerived(true);
  const skills = updates['system.derived.skills'];
  for (const [key, expected] of Object.entries(EXPECTED_ACTIVE)) {
    assert.equal(skills[key].total, expected, `[active] ${key} must equal the certified golden value ${expected}`);
  }
}

console.log('  [1/5] active-shield golden values match exactly, computed live through DerivedCalculator.computeAll() OK');

// ─── 2. Inactive-shield required golden values ─────────────────────────────

{
  const { updates } = await computeGareeDerived(false);
  const skills = updates['system.derived.skills'];
  for (const [key, expected] of Object.entries(EXPECTED_INACTIVE)) {
    assert.equal(skills[key].total, expected, `[inactive] ${key} must equal the certified golden value ${expected}`);
  }
}

console.log('  [2/5] inactive-shield golden values match exactly OK');

// ─── 3. Every unaffected skill is bit-for-bit identical between states ────

{
  const { updates: activeUpdates } = await computeGareeDerived(true);
  const { updates: inactiveUpdates } = await computeGareeDerived(false);
  for (const key of UNAFFECTED_SKILLS) {
    assert.equal(
      activeUpdates['system.derived.skills'][key].total,
      inactiveUpdates['system.derived.skills'][key].total,
      `${key} must be unaffected by the shield's activation state`
    );
  }
  // And the deltas for every affected skill must be exactly -2, no more, no less.
  for (const key of Object.keys(EXPECTED_ACTIVE)) {
    const delta = activeUpdates['system.derived.skills'][key].total - inactiveUpdates['system.derived.skills'][key].total;
    assert.equal(delta, -2, `${key} must shift by exactly -2 when the shield activates`);
  }
}

console.log('  [3/5] every unaffected skill is identical between shield states; every affected skill shifts by exactly -2 OK');

// ─── 4. system.derived.skills.initiative.total === system.derived.initiative.total ─
//        in both states (the required parity check).

{
  for (const shieldActive of [true, false]) {
    const { updates } = await computeGareeDerived(shieldActive);
    const skillsInitiative = updates['system.derived.skills'].initiative.total;
    const derivedInitiative = updates['system.derived.initiative']?.total ?? updates['system.derived.initiative'];
    assert.equal(skillsInitiative, derivedInitiative, `[shieldActive=${shieldActive}] system.derived.skills.initiative.total must equal system.derived.initiative.total`);
  }
}

console.log('  [4/5] system.derived.skills.initiative.total === system.derived.initiative.total holds in both shield states OK');

// ─── 5. Real roll-dialog consumption path: buildRollConfigModel() / ───────
//        getSkillTotal() -- the actual functions a "Roll Stealth" click
//        resolves through (see skill-roll-dialog-base-authority.test.mjs) --
//        must read exactly the same derived total, for every ACP-affected
//        skill, in both shield states. Proves expected === derived ===
//        getSkillTotal() === the roll dialog's own baseTotal, closing the
//        full certification chain this domain requires.

{
  for (const shieldActive of [true, false]) {
    const { actor, updates } = await computeGareeDerived(shieldActive);
    const expected = shieldActive ? EXPECTED_ACTIVE : EXPECTED_INACTIVE;
    for (const key of Object.keys(expected)) {
      const derivedTotal = updates['system.derived.skills'][key].total;
      const viaGetSkillTotal = getSkillTotal(actor, key);
      const model = await buildRollConfigModel({ actor, rollType: 'skill', skillKey: key });
      assert.equal(viaGetSkillTotal, derivedTotal, `[shieldActive=${shieldActive}] getSkillTotal('${key}') must equal system.derived.skills.${key}.total`);
      assert.equal(model.baseTotal, derivedTotal, `[shieldActive=${shieldActive}] buildRollConfigModel({skillKey:'${key}'}).baseTotal must equal system.derived.skills.${key}.total -- the same value a real roll dialog would show`);
    }
  }
}

console.log('  [5/5] the real roll-dialog consumption path (buildRollConfigModel/getSkillTotal) reads exactly the certified derived total for every affected skill, in both shield states OK');

console.log('garee-full-skill-derivation-parity.test.mjs: all assertions passed');
