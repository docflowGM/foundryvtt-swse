import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Regression coverage for the alpha-observed bug: every skill roll dialog on
// an actor showed a modifier equal to the negative of the skill's real total
// (e.g. Stealth +24 displayed as -24), which a manually-entered equal and
// opposite custom modifier "fixed". Root cause, confirmed against the real
// production code before this fix (see the git history for this file's
// companion changes to scripts/rolls/skills.js,
// scripts/combat/rolls/enhanced-rolls.js and scripts/rolls/roll-config.js):
//
//   scripts/rolls/skills.js#rollSkillWithConfig() called showRollModifiersDialog
//   with `baseBonus: actor.system.skills?.[skillKey]?.total || 0`. The V2
//   actor schema never stores a computed `.total` on system.skills[key] (only
//   the raw inputs: trained/focused/miscMod/selectedAbility) so this
//   expression was `undefined || 0` for every skill, every actor. Because
//   `baseBonus` was then present (not undefined), buildRollConfigModel's old
//   `options.baseBonus ?? getRollBaseTotal(...)` trusted the explicit 0
//   instead of falling back to the canonical resolver, and the skill
//   breakdown's `misc = baseTotal - abilityMod - halfLevel - trained - focus`
//   line manufactured a negative "Other Bonuses" entry that exactly canceled
//   the real total back to 0 — the "-22 to restore +22" fingerprint reported
//   from the live alpha session. rollSkillWithConfig() didn't even set
//   `rollType`, so it silently defaulted to 'attack' as well.
//
//   scripts/combat/rolls/enhanced-rolls.js#SWSERoll.rollSkill() called
//   showRollModifiersDialog with `rollType: 'skill'` but no `skillKey`, so
//   getRollBaseTotal()'s `getSkillTotal(model.actor, model.skillKey ||
//   'useTheForce')` silently resolved every skill dialog through Use the
//   Force instead of the requested skill.
//
// The fix makes the canonical skill-total resolver (getSkillTotal, already
// used by every correct caller) the sole authority for rollType 'skill' /
// 'force' / 'force-power' dialogs: a caller-supplied baseBonus that
// disagrees with it is treated as stale and ignored (with a diagnostic
// warning) rather than trusted, unless the caller explicitly opts in via
// `allowBaseBonusOverride: true`. No caller in this codebase currently needs
// that escape hatch.
//
// Gar'ee fixture note: the uploaded actor export
// (fvtt-Actor-garee-*.json) is Foundry's *source* data only — it has no
// `system.derived` key at all, because derived data (ability modifiers,
// computed skill totals) is populated at runtime by prepareDerivedData()
// and is never part of an actor export. Both shapes are exercised below:
// `gareeRawExportActor` is byte-for-byte what the export contains for the
// fields this bug touches (system.skills.stealth === {trained, miscMod,
// focused, selectedAbility, classSkill} with NO .total; system.attributes.dex
// === {base:20,...} with no .mod; system.abilities is a separate, apparently
// inert legacy stub actor.system.abilities.*.mod === 0 for every ability
// regardless of the real score) — used for the "legacy caller reads 0"
// half of the proof. `gareeLiveActor` additionally carries the
// system.derived.attributes/skills a live Foundry client actually populates
// before any player can open a roll dialog (confirmed against
// scripts/actors/derived/derived-calculator.js, which documents
// `derived.attributes[abilityKey].mod` as the ability-modifier authority) —
// used to reproduce the exact +24 Stealth total the reporting player's
// screenshot showed.

registerFoundryPathLoader();
installFoundryShimGlobals({
  foundry: {
    applications: {
      api: {
        // scripts/apps/base/swse-application-v2.js (imported transitively via
        // scripts/apps/dialogs/swse-dialog-v2.js) extends
        // HandlebarsApplicationMixin(ApplicationV2) at class-definition time.
        // buildRollConfigModel()/getSkillTotal() never instantiate that
        // class, so a harmless stand-in is enough to let the import succeed.
        ApplicationV2: class {},
        HandlebarsApplicationMixin: (Base) => class extends (Base ?? Object) {}
      }
    }
  }
});

const { buildRollConfigModel, getSkillTotal } = await import(
  '/systems/foundryvtt-swse/scripts/rolls/roll-config.js'
);

function sumBreakdown(breakdown) {
  return breakdown.reduce((sum, row) => sum + (Number(row.value) || 0), 0);
}

// Exactly what the uploaded Gar'ee export contains for these fields.
const gareeRawExportActor = {
  name: "Gar'ee",
  items: [],
  system: {
    level: 8,
    attributes: {
      str: { base: 14, racial: 0, enhancement: 0, temp: 0 },
      dex: { base: 20, racial: 0, enhancement: 0, temp: 0 },
      con: { base: 14, racial: 0, enhancement: 0, temp: 0 },
      int: { base: 12, racial: 0, enhancement: 0, temp: 0 },
      wis: { base: 10, racial: 0, enhancement: 0, temp: 0 },
      cha: { base: 8, racial: 0, enhancement: 0, temp: 0 }
    },
    abilities: {
      str: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
      dex: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
      con: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
      int: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
      wis: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
      cha: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 }
    },
    skills: {
      stealth: { trained: true, miscMod: 5, focused: true, selectedAbility: '', classSkill: true },
      perception: { trained: true, miscMod: 0, focused: false, selectedAbility: '', classSkill: true },
      mechanics: { trained: true, miscMod: 0, focused: false, selectedAbility: '', classSkill: true },
      persuasion: { trained: false, miscMod: 0, focused: false, selectedAbility: '', classSkill: true },
      pilot: { trained: false, miscMod: 0, focused: false, selectedAbility: '', classSkill: true },
      useTheForce: { trained: false, miscMod: 0, focused: false, selectedAbility: '' }
    }
    // No system.derived key — the export never carries one.
  }
};

// The same actor as it exists at runtime, once Foundry's prepareDerivedData()
// (scripts/actors/derived/derived-calculator.js) has run. Ability mods
// computed from the real system.attributes scores (str14->+2, dex20->+5,
// con14->+2, int12->+1, wis10->+0, cha8->-1); half level = floor(8/2) = 4;
// Stealth = dex(+5) + half(4) + trained(5) + focus(5) + miscMod(5) = 24,
// matching the reporting player's screenshot.
const gareeLiveActor = {
  ...gareeRawExportActor,
  system: {
    ...gareeRawExportActor.system,
    derived: {
      attributes: {
        str: { mod: 2 }, dex: { mod: 5 }, con: { mod: 2 },
        int: { mod: 1 }, wis: { mod: 0 }, cha: { mod: -1 }
      }
    }
  }
};

// ---------------------------------------------------------------------------
// Test 1 — a stale explicit zero baseBonus cannot erase the canonical total.
// ---------------------------------------------------------------------------
{
  const clean = await buildRollConfigModel({ actor: gareeLiveActor, rollType: 'skill', skillKey: 'stealth' });
  const stale = await buildRollConfigModel({ actor: gareeLiveActor, rollType: 'skill', skillKey: 'stealth', baseBonus: 0 });

  assert.equal(clean.baseTotal, 24, 'canonical Stealth total must be 24');
  assert.equal(stale.baseTotal, 24, 'a stale baseBonus:0 must not override the canonical total');
  assert.deepEqual(stale.breakdown, clean.breakdown, 'a stale baseBonus must not change the breakdown at all');
  assert.ok(
    !stale.breakdown.some(row => row.value < 0),
    'no fabricated negative "Other Bonuses" row from reconciling a stale baseBonus'
  );
  assert.equal(sumBreakdown(stale.breakdown), stale.baseTotal, 'breakdown must sum to baseTotal');
}

// ---------------------------------------------------------------------------
// Test 2 — omitted baseBonus resolves the canonical total (sanity check that
// the dialog's default path was never itself broken).
// ---------------------------------------------------------------------------
{
  const model = await buildRollConfigModel({ actor: gareeLiveActor, rollType: 'skill', skillKey: 'stealth' });
  assert.equal(model.baseTotal, getSkillTotal(gareeLiveActor, 'stealth'));
  assert.equal(model.baseTotal, 24);
}

// ---------------------------------------------------------------------------
// Test 3 — every standard skill resolves independently; a missing/incorrect
// skillKey must not collapse every skill onto the same fallback total.
// ---------------------------------------------------------------------------
{
  const skillTotals = { stealth: 24, perception: 11, mechanics: 16, persuasion: 8, pilot: 13 };
  const syntheticActor = {
    name: 'Synthetic Multi-Skill Actor',
    items: [],
    system: {
      level: 8,
      attributes: { str: {}, dex: {}, con: {}, int: {}, wis: {}, cha: {} },
      derived: { attributes: { str: { mod: 0 }, dex: { mod: 0 }, con: { mod: 0 }, int: { mod: 0 }, wis: { mod: 0 }, cha: { mod: 0 } } },
      skills: Object.fromEntries(
        Object.entries(skillTotals).map(([key, total]) => [
          key,
          { trained: true, focused: false, miscMod: 0, selectedAbility: '', total }
        ])
      )
    }
  };

  const resolved = {};
  for (const key of Object.keys(skillTotals)) {
    const model = await buildRollConfigModel({ actor: syntheticActor, rollType: 'skill', skillKey: key });
    resolved[key] = model.baseTotal;
  }
  assert.deepEqual(resolved, skillTotals, 'each skill dialog must resolve its own total, independent of the others');
}

// ---------------------------------------------------------------------------
// Test 4 — SWSERoll.rollSkill() forwards skillKey to the dialog (source
// contract check: enhanced-rolls.js pulls in ActionEngine/ForcePointsService/
// etc., far too heavy to import live under plain Node — see the repo's own
// tests/rolling-ci-support-check.test.mjs for the same source-text pattern
// used against similarly heavy production files).
// ---------------------------------------------------------------------------
{
  const source = await readFile(
    new URL('../scripts/combat/rolls/enhanced-rolls.js', import.meta.url),
    'utf8'
  );
  const methodStart = source.indexOf('static async rollSkill(actor, skillKey, options = {}) {');
  assert.ok(methodStart >= 0, 'SWSERoll.rollSkill() method not found');
  const methodEnd = source.indexOf('static async rollAbility(', methodStart);
  assert.ok(methodEnd > methodStart, 'could not isolate the rollSkill() method body');
  const methodBody = source.slice(methodStart, methodEnd);

  const dialogCallStart = methodBody.indexOf('showRollModifiersDialog({');
  assert.ok(dialogCallStart >= 0, 'rollSkill() must call showRollModifiersDialog');
  const dialogCallEnd = methodBody.indexOf('});', dialogCallStart);
  const dialogCall = methodBody.slice(dialogCallStart, dialogCallEnd);

  assert.match(dialogCall, /rollType:\s*'skill'/, 'rollSkill() dialog call must set rollType: "skill"');
  assert.match(dialogCall, /\bactor\b/, 'rollSkill() dialog call must pass actor');
  assert.match(dialogCall, /\bskillKey\b/, 'rollSkill() dialog call must forward skillKey (this was the bug)');
}

// ---------------------------------------------------------------------------
// Test 5 — rollSkillWithConfig() no longer reads the stale
// actor.system.skills[skillKey].total and now identifies itself as a skill
// roll (source contract check; rollSkillWithConfig() transitively imports
// SkillEnforcementEngine/RollCore/SWSEChat/etc., too heavy to import live).
// Also exercised live via buildRollConfigModel() with the exact options
// rollSkillWithConfig() now passes, proving the resolved base is the
// canonical 24, not a stale 0, when system.skills.stealth.total is absent
// (as it is on every actor under the current V2 schema).
// ---------------------------------------------------------------------------
{
  const source = await readFile(new URL('../scripts/rolls/skills.js', import.meta.url), 'utf8');
  const fnStart = source.indexOf('export async function rollSkillWithConfig(');
  assert.ok(fnStart >= 0, 'rollSkillWithConfig() not found');
  const fnEnd = source.indexOf('\nexport default rollSkill;', fnStart);
  const fnBody = source.slice(fnStart, fnEnd >= 0 ? fnEnd : undefined);

  assert.doesNotMatch(
    fnBody,
    /actor\.system\.skills\?\.\[skillKey\]\?\.total/,
    'rollSkillWithConfig() must not read the stale raw skill .total'
  );
  assert.doesNotMatch(fnBody, /baseBonus:/, 'rollSkillWithConfig() must not supply an explicit baseBonus at all');
  assert.match(fnBody, /rollType:\s*'skill'/, 'rollSkillWithConfig() must identify itself as a skill roll');
  assert.match(fnBody, /\bskillKey,/, 'rollSkillWithConfig() must forward skillKey');

  assert.equal(gareeRawExportActor.system.skills.stealth.total, undefined, 'precondition: raw export has no stored .total');
  const model = await buildRollConfigModel({ actor: gareeLiveActor, rollType: 'skill', skillKey: 'stealth' });
  assert.equal(model.baseTotal, 24, 'rollSkillWithConfig()-shaped options must resolve the canonical total, not 0');
}

// ---------------------------------------------------------------------------
// Test 6 — legitimate negative modifiers still work; the fix only rejects a
// STALE caller-supplied baseBonus, never a real mechanical penalty that is
// actually part of the canonical total.
// ---------------------------------------------------------------------------
{
  const penalizedActor = {
    name: 'Penalized Actor',
    items: [],
    system: {
      level: 2,
      attributes: { str: {}, dex: {}, con: {}, int: {}, wis: {}, cha: {} },
      derived: { attributes: { str: { mod: 0 }, dex: { mod: 3 }, con: { mod: 0 }, int: { mod: 0 }, wis: { mod: 0 }, cha: { mod: 0 } } },
      skills: {
        acrobatics: { trained: true, focused: false, miscMod: 0, selectedAbility: 'dex' }
      },
      // derived.attributes.dex.mod(3) + halfLevel(1) + trained(5) + focus(0) = 9,
      // not 12 — set miscMod via the skillsByKey armor/condition channel so the
      // canonical total lands on the brief's own worked example: +12 before
      // penalty, -5 real penalty, +7 final.
    }
  };
  penalizedActor.system.skills.acrobatics.miscMod = 3; // 3+1+5+0+3 = 12 before penalty
  penalizedActor.system.derived.skillsByKey = { acrobatics: { armorPenalty: -5 } };

  const canonicalBeforePenaltyCheck = getSkillTotal(penalizedActor, 'acrobatics');
  assert.equal(canonicalBeforePenaltyCheck, 7, 'canonical total must include the real -5 penalty: 12 - 5 = 7');

  const model = await buildRollConfigModel({ actor: penalizedActor, rollType: 'skill', skillKey: 'acrobatics' });
  assert.equal(model.baseTotal, 7, 'the hardening must not suppress a real mechanical penalty');

  // Passing the correct (penalized) total explicitly must be accepted without
  // a stale-baseBonus warning path being needed — it agrees with canonical.
  const modelWithAgreeingBonus = await buildRollConfigModel({
    actor: penalizedActor, rollType: 'skill', skillKey: 'acrobatics', baseBonus: 7
  });
  assert.equal(modelWithAgreeingBonus.baseTotal, 7);
}

// ---------------------------------------------------------------------------
// Gar'ee test A — canonical dialog total matches the actual alpha screenshot.
// ---------------------------------------------------------------------------
{
  const model = await buildRollConfigModel({ actor: gareeLiveActor, rollType: 'skill', skillKey: 'stealth' });
  assert.equal(model.baseTotal, 24);
}

// ---------------------------------------------------------------------------
// Gar'ee test B — a stale zero cannot erase Gar'ee's canonical Stealth total.
// ---------------------------------------------------------------------------
{
  const model = await buildRollConfigModel({ actor: gareeLiveActor, rollType: 'skill', skillKey: 'stealth', baseBonus: 0 });
  assert.equal(model.baseTotal, 24);
}

// ---------------------------------------------------------------------------
// Gar'ee test C — multiple real Gar'ee skills resolve independently; none
// collapse onto a shared fallback (e.g. the useTheForce fallback a missing
// skillKey used to produce).
// ---------------------------------------------------------------------------
{
  // Note: persuasion and useTheForce legitimately share the same total for
  // Gar'ee (both cha-based, both untrained/unfocused/no misc) — a genuine
  // coincidence in his actual data, not evidence of a fallback collapse. The
  // real regression guard is per-skill: each model's own `skillKey` field
  // and resolved total must trace back to the key that was actually
  // requested, not merely "the numbers differ" (which a coincidence can
  // defeat, as it does here).
  const gareeSkillKeys = ['stealth', 'mechanics', 'persuasion', 'pilot', 'perception'];
  const totals = {};
  for (const key of gareeSkillKeys) {
    const model = await buildRollConfigModel({ actor: gareeLiveActor, rollType: 'skill', skillKey: key });
    totals[key] = model.baseTotal;
    assert.equal(model.skillKey, key, `model.skillKey must echo the requested key, not silently fall back`);
    assert.equal(model.baseTotal, getSkillTotal(gareeLiveActor, key), `${key}: model must match getSkillTotal(actor, '${key}')`);
  }
  assert.ok(new Set(Object.values(totals)).size >= 3, `expected meaningfully distinct totals, got ${JSON.stringify(totals)}`);

  // Directly reproduce the SWSERoll.rollSkill() mechanism: a 'skill' dialog
  // built with no skillKey at all (exactly what the pre-fix call omitted)
  // falls back to useTheForce, proving that omitting skillKey really does
  // collapse the dialog onto the wrong skill — the defect Test 4's
  // source-text check confirms is now fixed at that call site.
  const omittedSkillKeyModel = await buildRollConfigModel({ actor: gareeLiveActor, rollType: 'skill' });
  assert.equal(omittedSkillKeyModel.baseTotal, getSkillTotal(gareeLiveActor, 'useTheForce'), 'omitting skillKey must fall back to useTheForce (documenting the exact pre-fix defect mechanism)');
  assert.notEqual(omittedSkillKeyModel.baseTotal, totals.mechanics, 'the useTheForce fallback must not coincidentally equal the requested skill\'s real total in this fixture');
}

// ---------------------------------------------------------------------------
// Gar'ee test D — no fabricated inverse breakdown entry.
// ---------------------------------------------------------------------------
{
  const clean = await buildRollConfigModel({ actor: gareeLiveActor, rollType: 'skill', skillKey: 'stealth' });
  const stale = await buildRollConfigModel({ actor: gareeLiveActor, rollType: 'skill', skillKey: 'stealth', baseBonus: 0 });
  assert.ok(
    !stale.breakdown.some(row => row.value === -24),
    'must not fabricate an "Other Bonuses: -24" row to reconcile a stale baseBonus:0'
  );
  assert.deepEqual(stale.breakdown, clean.breakdown);
}

// ---------------------------------------------------------------------------
// Fail-before / pass-after proof using Gar'ee's *exact* raw export shape
// (no synthetic derived data at all).
//
// The legacy rollSkillWithConfig() expression deterministically evaluates to
// 0 for Gar'ee's real exported Stealth skill, because system.skills.stealth
// has no .total field on the V2 schema:
// ---------------------------------------------------------------------------
{
  const legacyExpressionResult = gareeRawExportActor.system.skills.stealth?.total || 0;
  assert.equal(legacyExpressionResult, 0, 'precondition: the OLD rollSkillWithConfig() expression evaluates to 0 for Gar\'ee');

  // The canonical resolver, run against the same raw-export-only actor (no
  // system.derived at all), falls through to component reconstruction.
  // Ability-modifier resolution in that no-derived-data case pulls from the
  // legacy, apparently-inert system.abilities stub (mod: 0 for every
  // ability on every actor in this export) rather than the real
  // system.attributes scores — a separate, narrower issue than the one this
  // fix addresses (see the final report's "Gar'ee findings" section). It is
  // NOT the alpha bug's mechanism (a live client always has
  // derived.attributes populated before a dialog can open), so this
  // assertion documents the raw-export-only number honestly rather than
  // asserting the live-runtime +24 here.
  const rawExportCanonical = getSkillTotal(gareeRawExportActor, 'stealth');
  assert.equal(
    rawExportCanonical, 19,
    'canonical resolver on the pure raw export (no derived data): dex mod resolves to 0 via the legacy ' +
    'system.abilities stub, not +5, giving 0(dex) + 4(half) + 5(trained) + 5(focus) + 5(misc) = 19 — ' +
    'still far closer to correct than the legacy caller\'s flat 0, but not byte-identical to the live +24 ' +
    'until derived.attributes is populated by prepareDerivedData(), as it always is before a real dialog opens'
  );
  assert.notEqual(rawExportCanonical, legacyExpressionResult, 'the canonical resolver must never agree with the stale legacy 0');

  // With derived.attributes present (the live-runtime shape), the canonical
  // resolver reproduces the screenshot's +24 exactly.
  const liveCanonical = getSkillTotal(gareeLiveActor, 'stealth');
  assert.equal(liveCanonical, 24, 'canonical resolver with live-runtime derived data must reproduce the reported +24');
}

console.log('Skill roll dialog base-authority guards passed (rollSkillWithConfig, SWSERoll.rollSkill, roll-config buildRollConfigModel/getSkillTotal, Gar\'ee fixture).');
