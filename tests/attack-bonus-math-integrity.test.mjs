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
//    and weapon-type conditions matched -- and a first correction pass
//    only narrowed that to "whenever Charisma is mathematically better,"
//    which was still wrong: it still rewrote the resolved ability from
//    merely owning the talent, with no player activation step, even though
//    the talent's own text ("you can use ... instead of") is permissive,
//    and the already-certified Batch 2B policy is explicit that the player
//    owns the chosen attack attribute unless a specific implemented rule
//    explicitly overrides it at roll time. No selected-combat-option or
//    roll-context activation mechanism exists for this talent anywhere in
//    the repo -- the only real one is the pre-existing explicit
//    weapon.system.attackAttribute field this function already honors.
//    Section 3 proves talent ownership alone no longer changes anything;
//    only an explicit attackAttribute does.
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

{
  // Realistic flat-statblock NPC where the printed number already bakes in
  // a persistent Weapon Focus bonus, matching real imported data
  // (packs/nonheroic.db's "Goon"/"Dark Jedi"/"Rodian Black Sun Vigo" all
  // carry an unselected "Weapon Focus" feat item alongside a useFlat
  // weapon). Here the feat carries an explicit selectedChoice so
  // ScopedCombatFeatResolver.getBonus() WOULD genuinely match and fire +1
  // if not suppressed -- proving this by construction, not by accident of
  // missing selection data the way the real imported records currently do.
  const weaponFocusFeat = { id: 'wf1', name: 'Weapon Focus', type: 'feat', system: { selectedChoice: 'rifles' } };
  const npcActor = makeActor({ type: 'npc', items: [weaponFocusFeat] });
  const flatRifle = {
    id: 'npc-rifle', name: 'Blaster Rifle', type: 'weapon',
    system: { weaponCategory: 'ranged', proficiency: 'rifles', damage: '3d8' },
    flags: { swse: { npc: { useFlat: true, flatAttackBonus: 13 } } }
  };
  const result = resolveAttackBonus(npcActor, flatRifle, null, {});
  assert.equal(result.total, 13, 'a Weapon-Focus-owning flat-statblock NPC must not have +1 layered on top of its already-baked-in published total (13, not 14)');
  assert.equal(result.components['Scoped Feat'], undefined, 'the scoped-feat component must not appear at all for an NPC flat total');

  // Same feat/weapon pairing on a non-NPC (or non-flat) actor must still
  // genuinely receive the bonus -- proving the suppression is scoped to
  // the NPC-flat branch, not a global regression of ScopedCombatFeatResolver.
  const pcActor = makeActor({ bab: 5, dex: 3, items: [weaponFocusFeat] });
  const ordinaryRifle = { id: 'pc-rifle', name: 'Blaster Rifle', type: 'weapon', system: { weaponCategory: 'ranged', proficiency: 'rifles', proficient: true, damage: '3d8' } };
  const pcResult = resolveAttackBonus(pcActor, ordinaryRifle, null, {});
  assert.equal(pcResult.components['Scoped Feat'], 1, 'the same Weapon Focus selection must still grant its real +1 for an ordinary (non-flat) attack roll');
}
ok('NPC flat statblock: a concrete Weapon-Focus-owning NPC proves the scoped-feat bonus is not double-counted, while an ordinary actor with the same feat still receives it');

// ─── SECTION 3 — Noble Fencing Style: talent ownership alone never ────────
//        rewrites the resolved attack ability (player-owned-attribute
//        contract). No selected-combat-option, per-weapon selection, or
//        roll-context flag exists anywhere in the repo that could serve as
//        an "explicit activation" for this talent (grepped combat-option-
//        resolver.js's static option table and roll-config.js — no "noble"
//        entry). The only real activation mechanism is the pre-existing
//        explicit weapon.system.attackAttribute field, which this function
//        already reads first and honors unconditionally for all six
//        abilities. A prior version of this fix auto-substituted CHA
//        whenever CHA was mathematically better than STR (a "never worse
//        off" gate) -- that was still wrong, because it still rewrote the
//        resolved ability from merely owning the talent, with no player
//        activation step at all, which is exactly what the already-
//        certified Batch 2B policy forbids.

function nobleFencingActor({ str, cha }) {
  return makeActor({ bab: 5, str, cha, items: [{ id: 't1', name: 'Noble Fencing Style', type: 'talent', system: {} }] });
}

function lightMeleeWeapon(overrides = {}) {
  return { id: 'w-light', name: 'Vibrodagger', type: 'weapon', system: { weaponCategory: 'melee', subcategory: 'light', category: 'light', proficiency: 'simple', proficient: true, weight: 1, ...overrides } };
}

{
  // 1. eligible weapon, STR +1, CHA +6, explicit STR => STR
  const actor = nobleFencingActor({ str: 1, cha: 6 });
  const weapon = lightMeleeWeapon({ attackAttribute: 'str' });
  assert.equal(getWeaponAttackAbility(actor, weapon), 'str', 'explicit attackAttribute:"str" must be honored even when CHA is far better and the talent is owned');
  const result = resolveAttackBonus(actor, weapon, null, {});
  assert.equal(result.components['Ability (STR)'], 1);
  assert.equal(result.components['Ability (CHA)'], undefined);
}
ok('Noble Fencing Style: explicit attackAttribute:"str" is honored even with CHA far better and the talent owned');

{
  // 2. same actor/weapon, explicit CHA => CHA
  const actor = nobleFencingActor({ str: 1, cha: 6 });
  const weapon = lightMeleeWeapon({ attackAttribute: 'cha' });
  assert.equal(getWeaponAttackAbility(actor, weapon), 'cha', 'explicit attackAttribute:"cha" is how the player actually activates Noble Fencing Style\'s benefit');
  const result = resolveAttackBonus(actor, weapon, null, {});
  assert.equal(result.components['Ability (CHA)'], 6);
}
ok('Noble Fencing Style: explicit attackAttribute:"cha" is honored (the real activation mechanism)');

{
  // 3. STR +6, CHA +1, explicit STR => STR (no automatic anything, better or worse)
  const actor = nobleFencingActor({ str: 6, cha: 1 });
  const weapon = lightMeleeWeapon({ attackAttribute: 'str' });
  assert.equal(getWeaponAttackAbility(actor, weapon), 'str', 'explicit STR must resolve to STR regardless of which ability happens to be mathematically better');
  const result = resolveAttackBonus(actor, weapon, null, {});
  assert.equal(result.components['Ability (STR)'], 6);
}
ok('Noble Fencing Style: explicit STR resolves to STR regardless of which ability is mathematically better');

{
  // 4. an unrelated field edit on the weapon does not disturb the explicit attackAttribute.
  const actor = nobleFencingActor({ str: 4, cha: 1 });
  const weapon = lightMeleeWeapon({ attackAttribute: 'str', weight: 2, cost: 500 });
  assert.equal(getWeaponAttackAbility(actor, weapon), 'str', 'an unrelated weapon-field mutation must not disturb the explicit attackAttribute');
}
ok('Noble Fencing Style: an unrelated weapon-field mutation does not alter the explicit attackAttribute');

{
  // 5. talent ownership alone -- no explicit attackAttribute at all --
  //    must never rewrite the branch default. Default for a melee weapon
  //    with no explicit attackAttribute is STR; owning the talent alone
  //    must not change that to CHA.
  const withTalent = nobleFencingActor({ str: 1, cha: 6 });
  const withoutTalent = makeActor({ bab: 5, str: 1, cha: 6 });
  const weapon = lightMeleeWeapon();
  delete weapon.system.attackAttribute;
  assert.equal(getWeaponAttackAbility(withTalent, weapon), 'str', 'talent ownership alone, with no explicit attackAttribute, must not rewrite the melee default away from STR');
  assert.equal(getWeaponAttackAbility(withTalent, weapon), getWeaponAttackAbility(withoutTalent, weapon), 'owning Noble Fencing Style must resolve identically to not owning it when no explicit attackAttribute is set');
}
ok('Noble Fencing Style: talent ownership alone never rewrites the resolved ability (fail-before defect fixed)');

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

// ─── SECTION 5 — Genuine consumer-level dialog/roll contextual parity ─────
//
// The dialog preview (roll-config.js's wireRollConfigDialog#update()), the
// submit handler, and the real roll (attacks.js#rollAttack()) all now
// build their rollOptions the same way (computeAttackSituationalContext())
// and feed them into the exact same shared seam
// (computeFinalAttackComposition()) -- not three independently-maintained
// approximations of "what the attack bonus is." This section exercises
// that REAL shared seam directly (not a second resolveAttackBonus() call
// standing in for it) with dialog-shaped context, and separately proves
// computeAttackSituationalContext() -- the exact function the dialog's
// live preview and its submit handler both call -- produces the values
// that context assumes, closing the loop from real form state through to
// the real roll composition.

{
  const source = fs.readFileSync(fileURLToPath(new URL('../scripts/rolls/roll-config.js', import.meta.url)), 'utf8');
  assert.ok(/export function computeAttackSituationalContext/.test(source), 'the dialog must expose one shared situational-context builder, not an inline duplicate in the preview updater and the submit handler');
  assert.ok(/computeFinalAttackComposition/.test(source), 'the dialog live preview must call the same shared composition seam attacks.js#rollAttack() uses');
  assert.ok(!/situationalBonus \+= 2;\s*\n\s*if \(result\.situational\.charging\) situationalBonus \+= 2;/.test(source), 'the old ungated Aim/Point-Blank flat-bonus arithmetic must not exist');
}
ok('roll-config.js source: one shared situational-context builder and the shared composition seam, not independent per-path arithmetic');

{
  // A tiny fake <form> -- only implements the one method
  // computeAttackSituationalContext() actually calls (querySelector for a
  // checkbox's .checked) -- proving the REAL exported function the dialog
  // uses, not a reimplementation of its logic, against every combination.
  const { computeAttackSituationalContext } = await import('/systems/foundryvtt-swse/scripts/rolls/roll-config.js');
  function fakeForm(checkedNames = []) {
    const checked = new Set(checkedNames);
    return { querySelector(selector) {
      const name = selector.match(/name="([^"]+)"/)?.[1];
      return { checked: checked.has(name) };
    } };
  }
  assert.deepEqual(computeAttackSituationalContext(fakeForm([]), true), { aim: false, charge: false, isPointBlank: false, situationalBonus: 0 }, 'nothing checked: no aim/charge/point-blank context, zero situational bonus');
  assert.deepEqual(computeAttackSituationalContext(fakeForm(['aiming']), false), { aim: true, charge: false, isPointBlank: false, situationalBonus: 0 }, 'Aim alone sets the context flag but contributes zero direct attack bonus');
  assert.deepEqual(computeAttackSituationalContext(fakeForm(['pointBlank']), false), { aim: false, charge: false, isPointBlank: true, situationalBonus: 0 }, 'Point Blank alone sets the range context but contributes zero direct attack bonus (feat-gated, not automatic)');
  assert.deepEqual(computeAttackSituationalContext(fakeForm(['charging']), true), { aim: false, charge: true, isPointBlank: false, situationalBonus: 2 }, 'Charging on a melee attack: universal +2, plus context.charge=true for Powerful Charge/Charging Fire');
  assert.deepEqual(computeAttackSituationalContext(fakeForm(['charging']), false), { aim: false, charge: true, isPointBlank: false, situationalBonus: 0 }, 'Charging on a RANGED attack: context.charge=true (for Charging Fire) but zero flat bonus -- charge only grants +2 to a melee attack')
  assert.deepEqual(computeAttackSituationalContext(fakeForm(['flanking']), true), { aim: false, charge: false, isPointBlank: false, situationalBonus: 2 }, 'Flanking: +2, melee or ranged (existing project authority, combat-utils.js#getFlankingBonus, is not melee-restricted)');
}
ok('computeAttackSituationalContext(): every toggle combination matches the verified per-toggle rule (Aim/Point-Blank no longer ungated flat bonuses, Charging melee-only, Flanking unchanged)');

{
  const { computeFinalAttackComposition } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
  const actor = makeActor({ bab: 7, dex: 5 });
  const rangedGun = rangedWeapon({ proficient: true });

  // A. neutral/point-blank ranged attack: no range band, no toggles.
  const neutral = await computeFinalAttackComposition(actor, rangedGun, { attackType: 'ranged' });
  assert.equal(neutral.ok, true);
  assert.equal(neutral.atkBonus, 12, 'BAB(7) + DEX(5), no other modifiers');

  // B/C/D. Range bands must move the composition, and the dialog preview
  // reads rangeBand from the SAME form field the real roll's rollOptions
  // carries (both flow into computeFinalAttackComposition -> resolveAttackBonus).
  for (const [band, penalty] of [['short', -2], ['medium', -5], ['long', -10]]) {
    const result = await computeFinalAttackComposition(actor, rangedGun, { attackType: 'ranged', rangeBand: band });
    assert.equal(result.atkBonus, neutral.atkBonus + penalty, `range band "${band}" must move the shared composition by exactly ${penalty}`);
  }

  // E. A real combatOption/attackOption with a nonzero attack modifier:
  // Point Blank Shot feat + isPointBlank context (the toggle's fixed
  // meaning per Section 5's first block) must yield the real feat's +1,
  // and must NOT apply without the feat.
  const pointBlankShotFeat = { id: 'pbs1', name: 'Point Blank Shot', type: 'feat', system: {} };
  const actorWithFeat = makeActor({ bab: 7, dex: 5, items: [pointBlankShotFeat] });
  const withFeatAndContext = await computeFinalAttackComposition(actorWithFeat, rangedGun, { attackType: 'ranged', isPointBlank: true });
  assert.equal(withFeatAndContext.atkBonus, neutral.atkBonus + 1, 'Point Blank Shot + point-blank context: exactly +1');
  const withContextNoFeat = await computeFinalAttackComposition(actor, rangedGun, { attackType: 'ranged', isPointBlank: true });
  assert.equal(withContextNoFeat.atkBonus, neutral.atkBonus, 'point-blank context alone, without the feat: +0 (no more free +1 from the checkbox)');
  const withFeatNoContext = await computeFinalAttackComposition(actorWithFeat, rangedGun, { attackType: 'ranged' });
  assert.equal(withFeatNoContext.atkBonus, neutral.atkBonus, 'Point Blank Shot without point-blank context: +0 (not just for owning the feat)');

  // F. Fighting Defensively: exactly once, via the same seam.
  const fightingDefensively = await computeFinalAttackComposition(actor, rangedGun, { attackType: 'ranged', fightingDefensively: true });
  assert.equal(fightingDefensively.atkBonus, neutral.atkBonus - 5, 'Fighting Defensively applies its -5 exactly once through the shared seam');
  const fdEntry = fightingDefensively.attackComponentLedger.find(e => e.id === 'fighting-defensively');
  assert.equal(fdEntry?.value, -5);

  // G. Double/Triple Attack sequence penalty: exactly once, via the same seam.
  const sequenced = await computeFinalAttackComposition(actor, rangedGun, { attackType: 'ranged', sequencePenalty: -5 });
  assert.equal(sequenced.atkBonus, neutral.atkBonus - 5, 'a Double/Triple Attack sequence penalty applies exactly once through the shared seam');

  // Roll/chat ledger sum proof for every case above, not just the plain one.
  for (const result of [neutral, withFeatAndContext, fightingDefensively, sequenced]) {
    const ledgerSum = result.attackComponentLedger.filter(e => e.applied !== false).reduce((sum, e) => sum + (Number(e.value) || 0), 0);
    assert.equal(ledgerSum, result.atkBonus, 'SUM(applied ledger contributions) must equal atkBonus for every contextual case, not just the plain baseline');
  }
}
ok('genuine consumer-level parity: computeFinalAttackComposition() (the exact shared seam the dialog preview and rollAttack() both call) moves correctly for range bands, a real feat-gated combat option, Fighting Defensively, and sequence penalty, with ledger-sum parity throughout');

{
  // FAIL-BEFORE proof (source-level, DOM interaction is out of reach for
  // this harness): a Double/Triple Attack used to open the roll-modifiers
  // dialog with zero knowledge of that attack's own sequence penalty --
  // step.finalPenalty was only computed and merged into rollAttack()'s
  // options AFTER the dialog closed (combat-feature-handlers.js, the
  // rollAttack() call below the dialog), so the dialog's own live preview
  // could show one number while the actual roll used another. Section 5's
  // "G" case already proves computeFinalAttackComposition() itself
  // composes sequencePenalty correctly once it has one; this proves the
  // wiring that gets step.finalPenalty INTO the dialog's preview context
  // in the first place now exists end to end.
  const handlersSource = fs.readFileSync(fileURLToPath(new URL('../scripts/engine/combat/features/combat-feature-handlers.js', import.meta.url)), 'utf8');
  const rollConfigSource = fs.readFileSync(fileURLToPath(new URL('../scripts/rolls/roll-config.js', import.meta.url)), 'utf8');

  const dialogCallSite = handlersSource.slice(handlersSource.indexOf('const options = await showRollModifiersDialog('), handlersSource.indexOf('const result = await rollAttack('));
  assert.match(dialogCallSite, /sequencePenalty:\s*Number\(step\.finalPenalty \?\? 0\)/, 'the multiattack dialog call must pass this attack\'s own fixed sequence penalty in, before the dialog opens');

  assert.match(rollConfigSource, /sequencePenalty = 0\s*\n\s*\} = options;/, 'showRollModifiersDialog() must accept a sequencePenalty option from its caller');
  assert.match(rollConfigSource, /render: html => wireRollConfigDialog\(html, \{ actor, weapon, rollType, model, sequencePenalty \}\)/, 'the accepted sequencePenalty must be threaded into the live preview wiring');
  const updateFnBody = rollConfigSource.slice(rollConfigSource.indexOf('const update = async () => {'), rollConfigSource.indexOf('shell.querySelectorAll'));
  assert.match(updateFnBody, /sequencePenalty\s*\n\s*\};/, 'the live preview\'s own rollOptions (fed into the shared composeFinalAttackComposition seam) must include the sequencePenalty the dialog was opened with');

  // combat-feature-handlers.js must NOT also echo sequencePenalty back
  // through the dialog's own result object -- doing so would double it
  // (step.finalPenalty + step.finalPenalty) at the rollAttack() call site,
  // since that call site independently adds step.finalPenalty again.
  const submitResultBody = rollConfigSource.slice(rollConfigSource.indexOf('const result = {', rollConfigSource.indexOf('callback: html => {')), rollConfigSource.indexOf('Object.assign(result, computeAttackSituationalContext'));
  assert.doesNotMatch(submitResultBody, /sequencePenalty/, 'the dialog\'s returned result object must not itself carry sequencePenalty back out (the caller already owns and re-applies step.finalPenalty)');
}
ok('multiattack dialog/roll sequence-penalty parity: step.finalPenalty now reaches the dialog\'s live preview before the roll, without being double-applied through the dialog\'s own result');

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
