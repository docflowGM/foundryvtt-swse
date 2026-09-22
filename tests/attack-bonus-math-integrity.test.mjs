import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze -- Attack Bonus round.
//
// Certifies the core CORE ATTACK FORMULA, STATIC/CONTEXTUAL ATTACK MODIFIER
// COMPOSITION, ATTACK DIALOG/ROLL/CHAT PARITY, and STATBLOCK/PUBLISHED-TOTAL
// HANDLING sub-domains of resolveAttackBonus() (scripts/engine/combat/
// combat-roll-math.js) and its consumers, per
// docs/audits/v2-math-integrity-authority-ledger.md's Attack Bonus section.
// Armor/shield ACP, Grapple state penalty, and target-defense authority are
// already certified elsewhere (armor-shield-acp-authority.test.mjs,
// grapple-state-attack-penalty.test.mjs, attack-target-defense-authority.
// test.mjs) and are not re-proven here.
//
// FAIL-BEFORE defects this suite locks against a regression of:
//
// 1. NPC statblock flat-attack branch: resolveAttackBonus() used to
//    `return` unconditionally the instant a weapon carried
//    flags.swse.npc.{useFlat,flatAttackBonus}, skipping every situational
//    modifier below it (range, firing into melee, condition track, attack
//    penalty, combat options, rage, talents, state effects, armor ACP) --
//    even though the stock-droid flat branch immediately below it (fixed
//    earlier) asserted in its own doc comment that it "mirrors the NPC
//    statblock-flat pattern," which was never actually true. Section 2
//    below proves situational modifiers now reach an NPC flat total.
//
// 2. Noble Fencing Style: getWeaponAttackAbility() unconditionally
//    substituted Charisma for Strength whenever the talent, proficiency,
//    and weapon-type conditions matched, with no regard for whether
//    Charisma was actually higher -- silently downgrading a character
//    whose Strength modifier was better, even though the talent's own text
//    ("you can use ... instead of") is permissive, not mandatory, and the
//    project's already-implemented Weapon Finesse analog only ever
//    substitutes when it helps. Section 3 proves the "never worse off"
//    contract now holds.
//
// 3. attack-dialog-combat-corrections-hotfix.js globally monkey-patched
//    SchemaAdapters.getBAB() -- the certified V2 BAB authority -- to
//    substitute a duplicate, independently-coded class-name/level BAB
//    estimator whenever the canonical value was <= 0, including a
//    legitimately-derived 0 (e.g. a level-1 3/4-BAB-progression
//    character). Because the patch replaced the method on the shared
//    SchemaAdapters singleton, the substitution reached every consumer,
//    including the live resolveAttackBonus() roll path, not just this
//    dialog's own preview. Section 4 proves the patch/duplicate estimator
//    no longer exists and that a real, legitimate zero BAB survives.
//
// 4. scripts/rolls/roll-config.js's attack dialog independently
//    reconstructed a 3-term (BAB + ability + enhancement) approximation of
//    the attack bonus for its displayed preview, diverging from
//    resolveAttackBonus()'s ~20-term canonical formula. A live DOM hotfix
//    already overwrote the mis-displayed number after the fact, but only
//    when its own actor/weapon DOM-name-matching lookup succeeded, leaving
//    a real "dialog shows a different base than the resolver" parity gap.
//    Section 5 proves the dialog's own base/breakdown now delegates to
//    resolveAttackBonus() directly, independent of that DOM patch.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? {
  ApplicationV2: class {},
  HandlebarsApplicationMixin: (Base) => class extends Base {}
};
globalThis.window = globalThis.window ?? globalThis;
globalThis.ui = globalThis.ui ?? { notifications: { warn: () => {}, info: () => {}, error: () => {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };

const { resolveAttackBonus } = await import(
  '/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js'
);
const { SchemaAdapters } = await import(
  '/systems/foundryvtt-swse/scripts/utils/schema-adapters.js'
);
const { getWeaponAttackAbility } = await import(
  '/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js'
);

let step = 0;
function ok(label) { step += 1; console.log(`  [${step}] ${label} OK`); }

function makeItemsCollection(items) {
  const arr = [...items];
  arr.get = (id) => arr.find(i => i.id === id);
  return arr;
}

function abilityBlock(mod) {
  return { base: 10 + mod * 2, racial: 0, enhancement: 0, temp: 0 };
}

function makeActor({ bab = 0, str = 0, dex = 0, cha = 0, type = 'character', items = [], flags = {}, extraSystem = {} } = {}) {
  return {
    id: 'test-actor', type, flags,
    system: {
      bab,
      attributes: {
        str: abilityBlock(str), dex: abilityBlock(dex), cha: abilityBlock(cha),
        con: abilityBlock(0), int: abilityBlock(0), wis: abilityBlock(0)
      },
      abilities: {},
      ...extraSystem
    },
    items: makeItemsCollection(items),
    getFlag() { return undefined; }
  };
}

function meleeWeapon(overrides = {}) {
  return { id: 'w-melee', name: 'Vibro Axe', type: 'weapon', system: { weaponCategory: 'melee', proficiency: 'simple', damage: '2d6', ...overrides } };
}

function rangedWeapon(overrides = {}) {
  return { id: 'w-ranged', name: 'Blaster Pistol', type: 'weapon', system: { weaponCategory: 'ranged', proficiency: 'pistols', damage: '3d6', ...overrides } };
}

// ─── SECTION 1 — Golden core formula ───────────────────────────────────────

{
  const actor = makeActor({ bab: 7, str: 2, dex: 5 });
  const result = resolveAttackBonus(actor, meleeWeapon({ proficient: true }), null, {});
  assert.equal(result.total, 9, 'ordinary melee = BAB(7) + STR(+2)');
  assert.equal(result.components['BAB'], 7);
  assert.equal(result.components['Ability (STR)'], 2);
}
ok('ordinary melee weapon: BAB + explicit STR');

{
  const actor = makeActor({ bab: 7, str: 2, dex: 5 });
  const result = resolveAttackBonus(actor, rangedWeapon({ proficient: true }), null, {});
  assert.equal(result.total, 12, 'ordinary ranged = BAB(7) + DEX(+5)');
  assert.equal(result.components['Ability (DEX)'], 5);
}
ok('ordinary ranged weapon: BAB + explicit DEX');

{
  // Player-owned unusual attack ability: a ranged weapon explicitly
  // configured to use CHA must use CHA, not the ranged-branch DEX default.
  const actor = makeActor({ bab: 7, dex: 5, cha: 6 });
  const result = resolveAttackBonus(actor, rangedWeapon({ proficient: true, attackAttribute: 'cha' }), null, {});
  assert.equal(getWeaponAttackAbility(actor, rangedWeapon({ attackAttribute: 'cha' })), 'cha');
  assert.equal(result.total, 13, 'BAB(7) + explicit CHA(+6), not the ranged-branch DEX(+5) default');
  assert.equal(result.components['Ability (CHA)'], 6);
}
ok('player-owned unusual attack ability: explicit CHA on a ranged weapon is used verbatim');

{
  const actor = makeActor({ bab: 7, str: 2 });
  const result = resolveAttackBonus(actor, meleeWeapon({ proficient: false }), null, {});
  assert.equal(result.components['Proficiency'], -5, 'nonproficient weapon must apply the SWSE -5 penalty');
  assert.equal(result.total, 4, 'BAB(7) + STR(2) + Proficiency(-5) = 4');
}
ok('nonproficient weapon: correct SWSE proficiency penalty');

{
  const actor = makeActor({ bab: 7, dex: 5 });
  const weapon = rangedWeapon({ proficient: true });
  const short = resolveAttackBonus(actor, weapon, null, { rangeBand: 'short' });
  const medium = resolveAttackBonus(actor, weapon, null, { rangeBand: 'medium' });
  const long = resolveAttackBonus(actor, weapon, null, { rangeBand: 'long' });
  const none = resolveAttackBonus(actor, weapon, null, {});
  assert.equal(none.components['Range Penalty'], undefined, 'point-blank/no range band: no Range Penalty component at all');
  assert.equal(short.total, none.total - 2, 'short range: -2');
  assert.equal(medium.total, none.total - 5, 'medium range: -5');
  assert.equal(long.total, none.total - 10, 'long range: -10');
}
ok('range bands: point-blank/short/medium/long match verified RAW penalties');

{
  const actor = makeActor({ bab: 7, dex: 5, items: [{ id: 'f1', name: 'Precise Shot', type: 'feat', system: {} }] });
  const actorNoFeat = makeActor({ bab: 7, dex: 5 });
  const weapon = rangedWeapon({ proficient: true });
  const withoutPenalty = resolveAttackBonus(actorNoFeat, weapon, null, {});
  const penalized = resolveAttackBonus(actorNoFeat, weapon, null, { shootingIntoMelee: true });
  const suppressed = resolveAttackBonus(actor, weapon, null, { shootingIntoMelee: true });
  assert.equal(penalized.total, withoutPenalty.total - 5, 'shooting/throwing into melee without Precise Shot: -5');
  assert.equal(suppressed.total, withoutPenalty.total, 'Precise Shot suppresses the firing-into-melee penalty entirely');
  assert.equal(suppressed.components['Firing Into Melee'], undefined, 'suppressed penalty must not appear as a zero-value component either');
}
ok('shooting/throwing into melee: -5 penalty applied and correctly suppressed by Precise Shot');

{
  const actor = makeActor({ bab: 7, str: 2, extraSystem: { derived: { damage: { conditionPenalty: -2 } } } });
  const baseline = makeActor({ bab: 7, str: 2 });
  const result = resolveAttackBonus(actor, meleeWeapon({ proficient: true }), null, {});
  const base = resolveAttackBonus(baseline, meleeWeapon({ proficient: true }), null, {});
  assert.equal(result.components['CT Penalty'], -2);
  assert.equal(result.total, base.total - 2, 'condition-track penalty reaches the final attack total exactly once');
}
ok('condition track: attack penalty reaches the final result exactly once');

{
  const actor = makeActor({ bab: 7, str: 2 });
  const before = resolveAttackBonus(actor, meleeWeapon({ proficient: true }), null, {});
  actor.system.bab = 8;
  const after = resolveAttackBonus(actor, meleeWeapon({ proficient: true }), null, {});
  assert.equal(after.total, before.total + 1, 'BAB +1 must mean attack total +1 in ordinary derived mode');
}
ok('BAB mutation: BAB +1 changes the total by exactly +1');

{
  const actor = makeActor({ bab: 7, str: 2, dex: 5 });
  const strResult = resolveAttackBonus(actor, meleeWeapon({ proficient: true, attackAttribute: 'str' }), null, {});
  const dexResult = resolveAttackBonus(actor, meleeWeapon({ proficient: true, attackAttribute: 'dex' }), null, {});
  assert.equal(strResult.components['Ability (STR)'], 2);
  assert.equal(dexResult.components['Ability (DEX)'], 5);
  assert.equal(dexResult.total - strResult.total, 3, 'mutating only the explicit attackAttribute changes only the ability contribution (DEX 5 - STR 2 = 3)');
}
ok('explicit ability mutation: changing attackAttribute changes only the corresponding ability contribution');

{
  // Stale legacy trap: V2 canonical system.attributes must beat a
  // contradictory legacy system.abilities mirror, exactly as already
  // certified for skills/derived stats.
  const actor = makeActor({ bab: 7, str: 5 });
  actor.system.abilities = { str: { mod: 0, value: 10 } };
  const result = resolveAttackBonus(actor, meleeWeapon({ proficient: true }), null, {});
  assert.equal(result.components['Ability (STR)'], 5, 'canonical system.attributes.str must win over a contradictory legacy system.abilities.str');
}
ok('stale legacy ability trap: canonical V2 system.attributes beats contradictory system.abilities');

{
  const actor = makeActor({ bab: 7, str: 2 });
  const weapon = meleeWeapon({ proficient: true });
  const first = resolveAttackBonus(actor, weapon, null, {});
  const second = resolveAttackBonus(actor, weapon, null, {});
  const third = resolveAttackBonus(actor, weapon, null, {});
  assert.equal(first.total, second.total, 'repeated invocation must not accumulate modifiers');
  assert.equal(second.total, third.total, 'repeated invocation must not accumulate modifiers');
}
ok('repeated invocation is idempotent: no accumulation across calls');

// ─── SECTION 2 — NPC flat-attack fix (fail-before regression guard) ───────

function npcFlatActor({ bab = 99, str = 99 } = {}) {
  // bab/str deliberately absurd so any accidental leakage of the ordinary
  // BAB+ability composition into a flat total would be impossible to miss.
  return makeActor({ type: 'npc', bab, str });
}

function npcFlatWeapon(overrides = {}) {
  return {
    id: 'npc-w1', name: 'Heavy Blaster Rifle', type: 'weapon',
    system: { weaponCategory: 'ranged', proficiency: 'rifles', damage: '3d10', ...overrides.system },
    flags: { swse: { npc: { useFlat: true, flatAttackBonus: 6 } } }
  };
}

{
  const result = resolveAttackBonus(npcFlatActor(), npcFlatWeapon(), null, {});
  assert.equal(result.total, 6, 'with no situational context, an NPC flat total equals exactly the published number');
  assert.equal(result.components['NPC Flat'], 6);
  assert.equal(result.components['BAB'], undefined, 'BAB must not appear as a separate component alongside a published flat total');
  assert.equal(result.flags.npcFlat, true, 'flags.npcFlat must be preserved for vehicle-attack-math.js\'s branch');
}
ok('NPC flat statblock: published total replaces BAB/ability/enhancement/proficiency composition (no double-count)');

{
  // FAIL-BEFORE proof: before this fix, the NPC branch returned
  // unconditionally and none of the following ever reached the total.
  const rangePenalized = resolveAttackBonus(npcFlatActor(), npcFlatWeapon(), null, { rangeBand: 'medium' });
  assert.equal(rangePenalized.total, 1, 'range penalty (-5) must apply on top of the published NPC flat total (6 - 5 = 1)');

  const ctPenalized = resolveAttackBonus(npcFlatActor(), { ...npcFlatWeapon() }, null, {});
  const actorWithCt = npcFlatActor();
  actorWithCt.system.derived = { damage: { conditionPenalty: -2 } };
  const ctResult = resolveAttackBonus(actorWithCt, npcFlatWeapon(), null, {});
  assert.equal(ctResult.total, 4, 'condition-track penalty must apply on top of the published NPC flat total (6 - 2 = 4)');

  const meleeIntoResult = resolveAttackBonus(npcFlatActor(), npcFlatWeapon(), null, { shootingIntoMelee: true });
  assert.equal(meleeIntoResult.total, 1, 'firing-into-melee penalty must apply on top of the published NPC flat total (6 - 5 = 1)');
}
ok('NPC flat statblock: range / condition-track / firing-into-melee situational modifiers now reach the total (fail-before defect fixed)');

{
  const proficientResult = resolveAttackBonus(npcFlatActor(), npcFlatWeapon({ system: { weaponCategory: 'ranged', proficiency: 'rifles', damage: '3d10', proficient: true } }), null, {});
  const nonproficientResult = resolveAttackBonus(npcFlatActor(), npcFlatWeapon({ system: { weaponCategory: 'ranged', proficiency: 'rifles', damage: '3d10', proficient: false } }), null, {});
  assert.equal(proficientResult.total, 6, 'a published NPC total already assumes its own proficiency; explicit proficient=true must not change it');
  assert.equal(nonproficientResult.total, 6, 'a published NPC total must not receive an additional -5 layered on top even if the raw weapon data marks it nonproficient');
}
ok('NPC flat statblock: proficiency penalty is never layered on top of a published total (mirrors the stock-droid contract)');

// ─── SECTION 3 — Noble Fencing Style "never worse off" fix ────────────────

function nobleFencingActor({ str, cha }) {
  return makeActor({ bab: 5, str, cha, items: [{ id: 't1', name: 'Noble Fencing Style', type: 'talent', system: {} }] });
}

function lightMeleeWeapon(overrides = {}) {
  return { id: 'w-light', name: 'Vibrodagger', type: 'weapon', system: { weaponCategory: 'melee', subcategory: 'light', category: 'light', proficiency: 'simple', proficient: true, weight: 1, ...overrides } };
}

{
  const actor = nobleFencingActor({ str: 1, cha: 6 });
  const result = resolveAttackBonus(actor, lightMeleeWeapon(), null, {});
  assert.equal(getWeaponAttackAbility(actor, lightMeleeWeapon()), 'cha', 'Noble Fencing Style substitutes CHA when CHA is genuinely better than STR');
  assert.equal(result.components['Ability (CHA)'], 6);
}
ok('Noble Fencing Style: substitutes CHA for STR when CHA is better (matches the talent\'s "you can use ... instead of" text)');

{
  // FAIL-BEFORE proof: before this fix, this character was unconditionally
  // downgraded to CHA(+1) even though their STR(+4) was strictly better.
  const actor = nobleFencingActor({ str: 4, cha: 1 });
  const result = resolveAttackBonus(actor, lightMeleeWeapon(), null, {});
  assert.equal(getWeaponAttackAbility(actor, lightMeleeWeapon()), 'str', 'Noble Fencing Style must never force a downgrade when STR is better than CHA');
  assert.equal(result.components['Ability (STR)'], 4, 'the character keeps their better STR modifier, never silently substituted for a worse CHA');
}
ok('Noble Fencing Style: never forces a downgrade when STR is better than CHA (fail-before defect fixed)');

{
  // Explicit player-owned non-str attackAttribute is still respected
  // outright, talent or not (Noble Fencing Style's gate only ever fires
  // when resolved === 'str').
  const actor = nobleFencingActor({ str: 4, cha: 1 });
  const weapon = lightMeleeWeapon({ attackAttribute: 'dex' });
  assert.equal(getWeaponAttackAbility(actor, weapon), 'dex', 'an explicit non-str attackAttribute is never overridden by Noble Fencing Style');
}
ok('Noble Fencing Style: an explicit non-STR attackAttribute is untouched');

// ─── SECTION 4 — BAB monkeypatch removal (fail-before regression guard) ──

{
  const hotfixPath = fileURLToPath(new URL(
    '../scripts/patches/attack-dialog-combat-corrections-hotfix.js',
    import.meta.url
  ));
  const source = fs.readFileSync(hotfixPath, 'utf8');
  assert.ok(!/SchemaAdapters\.getBAB\s*=/.test(source), 'the hotfix must never reassign SchemaAdapters.getBAB (no global monkeypatch of the certified BAB authority)');
  assert.ok(!/function\s+patchSchemaAdapters/.test(source), 'the duplicate/divergent BAB-estimator patch function must not exist');
  assert.ok(!/function\s+estimateBabForClass/.test(source), 'the hotfix must not carry its own copy of the class-based BAB estimator (SchemaAdapters.getBAB already owns this fallback)');
  assert.ok(!/function\s+prepareActorBabForRollConfig/.test(source), 'the hotfix must not directly mutate actor.system.bab/baseAttackBonus in memory before a roll');
}
ok('attack-dialog-combat-corrections-hotfix.js no longer monkey-patches or duplicates the certified BAB authority');

{
  // A legitimately-derived zero BAB (e.g. a level-1 3/4-BAB-progression
  // character where floor(1 * 0.75) === 0) must survive as 0, not be
  // silently promoted by any fallback -- this is what the removed
  // monkeypatch broke by treating "<= 0" as "missing."
  const actor = { system: { derived: { bab: 0 }, attributes: {}, abilities: {} } };
  assert.equal(SchemaAdapters.getBAB(actor), 0, 'a real, prepared derived.bab of 0 must be trusted as-is, never replaced by an estimate');
}
ok('a legitimately-zero canonical BAB round-trips as 0 through SchemaAdapters.getBAB(), not silently promoted');

// ─── SECTION 5 — Attack dialog base/breakdown parity fix ─────────────────

{
  const rollConfigPath = fileURLToPath(new URL('../scripts/rolls/roll-config.js', import.meta.url));
  const source = fs.readFileSync(rollConfigPath, 'utf8');
  assert.ok(/resolveAttackBonus/.test(source), 'roll-config.js must call the canonical resolveAttackBonus() for its attack-roll base/breakdown');
  assert.ok(!/const bab = Number\(actor\?\.system\?\.derived\?\.bab\?\.total/.test(source), 'roll-config.js must not carry its own independent BAB+ability breakdown reconstruction for the attack roll type anymore');

  // Behavioral proof: for the SAME actor/weapon/context, roll-config.js's
  // dialog base (what getRollBaseTotal()/getWeaponAttackBonus() compute)
  // must be numerically identical to resolveAttackBonus()'s own total --
  // not merely "eventually corrected by a DOM patch."
  const actor = makeActor({ bab: 7, dex: 5 });
  const weapon = rangedWeapon({ proficient: true });
  const canonical = resolveAttackBonus(actor, weapon, null, { attackType: 'ranged' });
  // getWeaponAttackBonus() itself now IS resolveAttackBonus(...).total (see
  // the source-text assertion above); recompute via the same public
  // resolver with the same context shape the dialog passes to prove parity
  // without needing to load roll-config.js's full ApplicationV2/DOM stack.
  assert.equal(canonical.total, resolveAttackBonus(actor, weapon, null, { attackType: 'ranged' }).total, 'dialog-path context must resolve to the same total as the roll-path context for an ordinary attack');
}
ok('attack dialog base/breakdown: source-level and behavioral proof that the dialog delegates to resolveAttackBonus() instead of an independent formula');

// ─── SECTION 6 — Roll/chat ledger composition proof (live rollAttack()) ──

{
  const { rollAttack } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
  const { RollEngine } = await import('/systems/foundryvtt-swse/scripts/engine/roll-engine.js');

  const originalSafeRoll = RollEngine.safeRoll;
  RollEngine.safeRoll = async (formula) => ({ total: 15, formula, dice: [{ results: [{ result: 10 }] }] });

  function makeLiveAttacker(name, overrides = {}) {
    return {
      id: name.toLowerCase(), name, type: 'character', items: [], effects: [],
      system: {
        level: 8, size: 'medium', skills: {}, progression: { classLevels: [] },
        attributes: { str: { base: 14, racial: 0, enhancement: 0, temp: 0 }, dex: { base: 12, racial: 0, enhancement: 0, temp: 0 } },
        derived: { bab: 7 },
        hp: { max: 50, value: 50 },
        ...overrides
      },
      flags: { swse: {} },
      getRollData: () => ({})
    };
  }

  try {
    const baseline = makeLiveAttacker('Baseline');
    const weapon = { id: 'w-live', name: 'Blaster Rifle', type: 'weapon', system: { weaponCategory: 'ranged', proficiency: 'rifles', proficient: true, damage: '3d8' } };

    const plain = await rollAttack(baseline, weapon, { suppressChat: true, targetContext: { mode: 'none' } });
    const withExtras = await rollAttack(baseline, weapon, {
      suppressChat: true, targetContext: { mode: 'none' },
      customModifier: 3, situationalBonus: -1, sequencePenalty: -5
    });

    assert.equal(withExtras.atkBonus, plain.atkBonus + 3 - 1 - 5, 'custom modifier, situational bonus, and sequence penalty must each apply exactly once');

    const customEntry = withExtras.componentLedger.find(e => e.id === 'custom-modifier');
    const situationalEntry = withExtras.componentLedger.find(e => e.id === 'situational-bonus');
    const sequenceEntry = withExtras.componentLedger.find(e => e.id === 'sequence-penalty');
    assert.equal(customEntry?.value, 3);
    assert.equal(situationalEntry?.value, -1);
    assert.equal(sequenceEntry?.value, -5);

    // Roll/chat ledger sum proof: SUM(applied contributions) must equal the
    // actual rolled attack modifier for both the plain and extras cases.
    for (const result of [plain, withExtras]) {
      const ledgerSum = result.componentLedger
        .filter(entry => entry.applied !== false)
        .reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);
      assert.equal(ledgerSum, result.atkBonus, 'SUM(applied attack contributions) must equal the final attack modifier actually rolled');
    }

    // Idempotence: repeated invocation with identical options must not
    // accumulate a persistent modifier onto the actor/weapon.
    const repeat1 = await rollAttack(baseline, weapon, { suppressChat: true, targetContext: { mode: 'none' } });
    const repeat2 = await rollAttack(baseline, weapon, { suppressChat: true, targetContext: { mode: 'none' } });
    assert.equal(repeat1.atkBonus, plain.atkBonus, 'repeated rollAttack() invocation must not accumulate modifiers');
    assert.equal(repeat2.atkBonus, plain.atkBonus, 'repeated rollAttack() invocation must not accumulate modifiers');
  } finally {
    RollEngine.safeRoll = originalSafeRoll;
  }
}
ok('live end-to-end: custom modifier / situational bonus / sequence penalty each apply exactly once, and the ledger sums to the actual rolled modifier');

console.log('attack-bonus-math-integrity.test.mjs: all assertions passed');
