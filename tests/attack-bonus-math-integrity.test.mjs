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

function makeActor({ bab = 0, str = 0, dex = 0, cha = 0, type = 'character', items = [], flags = {}, extraSystem = {}, effects = [] } = {}) {
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
    effects,
    getFlag() { return undefined; }
  };
}

// A real, minimal Active Effect document shaped for
// EffectIntentEngine/ModifierEngine to recognize as a broad "self" typed
// attack-bonus modifier (category:'attack' -> target 'global.attack'),
// exercised through the REAL getEffectIntentModifiersForContext() ->
// createModifier() pipeline -- not a hand-built Modifier object standing in
// for one -- so the cross-channel stacking tests below prove the actual
// Effect Intent channel, per the independent review's explicit requirement.
function competenceAttackEffect(value = 4, { id = 'effect-competence-attack', name = 'Inspiring Presence' } = {}) {
  return {
    id, name, disabled: false, origin: null,
    flags: { swse: { effectIntent: {
      application: 'always', activeState: 'enabled', scope: 'self', operation: 'increase',
      category: 'attack', target: '', amount: value, bonusType: 'competence', duration: '',
      transfer: true, filterType: 'all', filterValue: '', conditions: [], note: ''
    } } }
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
  const { createModifier, ModifierType, ModifierSource } = await import(
    '/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierTypes.js'
  );
  function chargeModifier() {
    return createModifier({ source: ModifierSource.CONDITION, sourceId: 'charge', sourceName: 'Charge', target: 'global.attack', type: ModifierType.COMPETENCE, value: 2 });
  }
  function flankingModifier() {
    return createModifier({ source: ModifierSource.CONDITION, sourceId: 'flanking', sourceName: 'Flanking', target: 'global.attack', type: ModifierType.FLANKING, value: 2 });
  }

  assert.deepEqual(computeAttackSituationalContext(fakeForm([]), true), { aim: false, charge: false, isPointBlank: false, situationalContributions: [] }, 'nothing checked: no aim/charge/point-blank context, no typed situational contributions');
  assert.deepEqual(computeAttackSituationalContext(fakeForm(['aiming']), false), { aim: true, charge: false, isPointBlank: false, situationalContributions: [] }, 'Aim alone sets the context flag but contributes zero direct attack bonus');
  assert.deepEqual(computeAttackSituationalContext(fakeForm(['pointBlank']), false), { aim: false, charge: false, isPointBlank: true, situationalContributions: [] }, 'Point Blank alone sets the range context but contributes zero direct attack bonus (feat-gated, not automatic)');
  assert.deepEqual(computeAttackSituationalContext(fakeForm(['charging']), true), { aim: false, charge: true, isPointBlank: false, situationalContributions: [chargeModifier()] }, 'Charging on a melee attack: a typed +2 Charge contribution, plus context.charge=true for Powerful Charge/Charging Fire');
  assert.deepEqual(computeAttackSituationalContext(fakeForm(['charging']), false), { aim: false, charge: true, isPointBlank: false, situationalContributions: [] }, 'Charging on a RANGED attack: context.charge=true (for Charging Fire) but no Charge contribution -- charge only grants +2 to a melee attack');
  // BLOCKER A FIX (was: "Flanking: +2, melee or ranged" -- a false
  // assertion this suite itself previously locked in. SWSE RAW: Flanking is
  // melee-only. computeAttackSituationalContext() now gates the Flanking
  // contribution's creation on `flanking && melee`, exactly mirroring the
  // pre-existing Charge gate, rather than relying on combat-utils.js#
  // getFlankingBonus() (which has no weapon/attack-context input at all and
  // therefore cannot establish this rule on its own).
  assert.deepEqual(computeAttackSituationalContext(fakeForm(['flanking']), true), { aim: false, charge: false, isPointBlank: false, situationalContributions: [flankingModifier()] }, 'Flanking on a MELEE attack: a typed +2 FLANKING contribution');
  assert.deepEqual(computeAttackSituationalContext(fakeForm(['flanking']), false), { aim: false, charge: false, isPointBlank: false, situationalContributions: [] }, 'BLOCKER A FIX: Flanking on a RANGED attack must contribute zero -- SWSE flanking is melee-only');
  assert.deepEqual(computeAttackSituationalContext(fakeForm(['charging', 'flanking']), true), { aim: false, charge: true, isPointBlank: false, situationalContributions: [chargeModifier(), flankingModifier()] }, 'Charge + Flanking together on a legal melee attack: two distinct typed contributions, not one combined number');
}
ok('computeAttackSituationalContext(): every toggle combination matches the verified per-toggle rule (Aim/Point-Blank no longer ungated flat bonuses, Charging melee-only, Flanking melee-only and typed)');

{
  // BLOCKER B FIX (round 3): Charge and Flanking must not flatten into an
  // anonymous situationalBonus number before reaching the final composition
  // -- each keeps its own source identity, type, and stacking behavior all
  // the way into the ledger. Independent review found the round-2 fix
  // incomplete on two points, both addressed here:
  //   (a) Charge is typed COMPETENCE, not UNTYPED -- published SWSE
  //       evidence (The Unknown Regions' Mounted Charge/Diving Attack
  //       rules) names the charge attack bonus itself "competence."
  //       Powerful Charge's "ADDITIONAL +2" is a separate, unnamed-type
  //       (untyped) CombatOptionResolver contribution, not proof Charge
  //       itself is untyped.
  //   (b) Every typed/collision-eligible attack contribution -- Basic
  //       Effect Intent modifiers, situational contributions (Charge,
  //       Flanking), and a typed combat-option contribution (Relentless
  //       Attack, Prime Shot) -- must resolve stacking TOGETHER in ONE pass
  //       inside combat-roll-math.js#resolveAttackBonus(), not as
  //       separately pre-summed numbers added afterward. This block proves
  //       that unification directly against resolveAttackBonus() (the
  //       actual unification point) using a REAL Effect Intent Active
  //       Effect (not a hand-built Modifier standing in for one), and
  //       separately proves computeFinalAttackComposition() (what the
  //       dialog preview and the real roll both call) agrees with it.
  const { computeFinalAttackComposition } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
  const { computeAttackSituationalContext } = await import('/systems/foundryvtt-swse/scripts/rolls/roll-config.js');
  const { createModifier, ModifierType, ModifierSource } = await import(
    '/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierTypes.js'
  );

  const actor = makeActor({ bab: 7, str: 2 });
  const weapon = meleeWeapon({ proficient: true });
  const baseline = resolveAttackBonus(actor, weapon, null, { attackType: 'melee' });
  assert.equal(baseline.total, 9, 'BAB(7) + STR(2), no situational contributions');
  const previewBaseline = await computeFinalAttackComposition(actor, weapon, { attackType: 'melee' });
  assert.equal(previewBaseline.ok, true);
  assert.equal(previewBaseline.atkBonus, baseline.total);

  function charge() {
    return createModifier({ source: ModifierSource.CONDITION, sourceId: 'charge', sourceName: 'Charge', target: 'global.attack', type: ModifierType.COMPETENCE, value: 2 });
  }
  function flanking() {
    return createModifier({ source: ModifierSource.CONDITION, sourceId: 'flanking', sourceName: 'Flanking', target: 'global.attack', type: ModifierType.FLANKING, value: 2 });
  }

  // 1. Charge alone: +2 COMPETENCE, its own named ledger row.
  const chargeOnly = resolveAttackBonus(actor, weapon, null, { attackType: 'melee', situationalContributions: [charge()] });
  assert.equal(chargeOnly.total, baseline.total + 2, 'Charge alone: +2 competence');
  const chargeRow = chargeOnly.typedModifierLedger.find(e => e.label === 'Charge');
  assert.equal(chargeRow?.value, 2);
  assert.equal(chargeRow?.applied, true);

  // Flanking appears as its own ledger contribution too (round-2 proof,
  // re-verified against the unified pool).
  const flankingOnly = resolveAttackBonus(actor, weapon, null, { attackType: 'melee', situationalContributions: [flanking()] });
  assert.equal(flankingOnly.total, baseline.total + 2, 'Flanking alone: +2');
  const flankingRow = flankingOnly.typedModifierLedger.find(e => e.label === 'Flanking');
  assert.equal(flankingRow?.value, 2);

  // 2. A REAL Active Effect granting +4 competence to global.attack, alone
  // (no Charge): proves the Effect Intent channel itself, through the
  // actual getEffectIntentModifiersForContext() -> createModifier()
  // pipeline, not a hand-built Modifier standing in for it.
  const actorWithEffect = makeActor({ bab: 7, str: 2, effects: [competenceAttackEffect(4)] });
  const effectOnly = resolveAttackBonus(actorWithEffect, weapon, null, { attackType: 'melee' });
  assert.equal(effectOnly.total, baseline.total + 4, 'a real +4 competence Active Effect alone: +4');
  const effectRow = effectOnly.typedModifierLedger.find(e => e.label === 'Inspiring Presence');
  assert.equal(effectRow?.value, 4);

  // 3. THE KEY CROSS-CHANNEL COLLISION PROOF: the same +4 competence Active
  // Effect PLUS Charge (+2 competence) must resolve to +4 total, NOT +6 --
  // both are competence-typed and COMPETENCE is highestOnly, so only the
  // higher of the two applies, regardless of which channel each came from
  // (a persistent Active Effect vs. a per-roll situational contribution).
  const effectPlusCharge = resolveAttackBonus(actorWithEffect, weapon, null, { attackType: 'melee', situationalContributions: [charge()] });
  assert.equal(effectPlusCharge.total, baseline.total + 4, 'Active Effect (+4 competence) + Charge (+2 competence) must resolve to +4, not +6 -- same-type collision across channels, not two separate stacking islands');
  const collisionRows = effectPlusCharge.typedModifierLedger.filter(e => e.label === 'Inspiring Presence' || e.label === 'Charge');
  const appliedCollisionRows = collisionRows.filter(e => e.applied !== false);
  assert.equal(appliedCollisionRows.length, 1, 'exactly one of the two competence-typed contributions applies after stacking resolution');
  assert.equal(appliedCollisionRows[0].label, 'Inspiring Presence', 'the higher-value competence contribution (the Active Effect) is the one that survives stacking');
  // 10. Ledger: the suppressed same-type contribution remains VISIBLE, with
  // applied:false and a stacking reason -- not silently dropped.
  const suppressedCharge = collisionRows.find(e => e.label === 'Charge');
  assert.equal(suppressedCharge?.applied, false, 'the suppressed Charge contribution must still appear in the ledger, marked not-applied');
  assert.ok(String(suppressedCharge?.reason || '').length > 0, 'the suppressed row must carry a stacking reason');

  // 4. Charge + Powerful Charge: base Charge (+2 competence) and Powerful
  // Charge's own "ADDITIONAL +2" (CombatOptionResolver's untyped
  // attackModifier, unchanged) are DIFFERENT types, so both apply: +4
  // total from those two rules, matching Powerful Charge's own RAW text.
  const powerfulChargeFeatItem = {
    id: 'feat-powerful-charge', name: 'Powerful Charge', type: 'feat',
    system: { abilityMeta: { rules: [{ option: 'powerfulCharge' }] } }
  };
  const powerfulChargeActor = makeActor({ bab: 7, str: 2, items: [powerfulChargeFeatItem] });
  const chargeAndPowerful = resolveAttackBonus(powerfulChargeActor, weapon, null, {
    attackType: 'melee', charge: true, combatOptions: { powerfulCharge: true }, situationalContributions: [charge()]
  });
  assert.equal(chargeAndPowerful.total, baseline.total + 4, 'Charge (+2 competence) + Powerful Charge (+2 untyped, different type) = +4');
  assert.equal(chargeAndPowerful.components['Powerful Charge'], 2, 'Powerful Charge keeps its own named components/ledger row, not collapsed into an anonymous "Combat Option" number');
  const chargeRowWithPowerful = chargeAndPowerful.typedModifierLedger.find(e => e.label === 'Charge');
  assert.equal(chargeRowWithPowerful?.applied, true, 'Charge (competence) is not suppressed by Powerful Charge (a different, untyped contribution)');

  // 5. Active Effect (+4 competence) + Charge + Powerful Charge: the
  // competence collision above still caps at +4 (Effect wins over Charge),
  // and Powerful Charge's separate untyped +2 still adds on top: +6 total.
  const powerfulChargeActorWithEffect = makeActor({ bab: 7, str: 2, items: [powerfulChargeFeatItem], effects: [competenceAttackEffect(4)] });
  const fullStack = resolveAttackBonus(powerfulChargeActorWithEffect, weapon, null, {
    attackType: 'melee', charge: true, combatOptions: { powerfulCharge: true }, situationalContributions: [charge()]
  });
  assert.equal(fullStack.total, baseline.total + 4 + 2, 'Effect (+4 competence, wins the collision) + Powerful Charge (+2 untyped, separate) = +6; Charge itself is suppressed by the higher-value Effect');

  // 6. Flanking + Charge: different types (FLANKING vs COMPETENCE), so both
  // apply in full.
  const chargeAndFlanking = resolveAttackBonus(actor, weapon, null, { attackType: 'melee', situationalContributions: [charge(), flanking()] });
  assert.equal(chargeAndFlanking.total, baseline.total + 4, 'Charge (+2 competence) and Flanking (+2 FLANKING) are different types and both apply: +4');

  // 7. Two FLANKING representations (a hypothetical second flanking-
  // granting source): only the highest applies -- "you are either flanked
  // or not" -- via the shared ModifierUtils stacking authority.
  const strongerFlanking = createModifier({ source: ModifierSource.FEAT, sourceId: 'flank-boost', sourceName: 'Superior Flanking', target: 'global.attack', type: ModifierType.FLANKING, value: 4 });
  const flankingCollision = resolveAttackBonus(actor, weapon, null, { attackType: 'melee', situationalContributions: [flanking(), strongerFlanking] });
  assert.equal(flankingCollision.total, baseline.total + 4, 'two FLANKING-typed contributions must not stack -- only the higher (+4) applies');
  const appliedFlanking = flankingCollision.typedModifierLedger.filter(e => (e.label === 'Flanking' || e.label === 'Superior Flanking') && e.applied !== false);
  assert.equal(appliedFlanking.length, 1);
  assert.equal(appliedFlanking[0].label, 'Superior Flanking');

  // 8. Two competence modifiers from two different channels (the Active
  // Effect vs. a second, higher-value Active Effect): only the highest
  // applies -- re-verifies item 3's cross-channel result using two
  // same-channel (both Effect Intent) sources, isolating that the
  // highestOnly rule is keyed on TYPE, not on which channel a contribution
  // came from.
  const actorWithTwoEffects = makeActor({ bab: 7, str: 2, effects: [
    competenceAttackEffect(4, { id: 'effect-a', name: 'Inspiring Presence' }),
    competenceAttackEffect(6, { id: 'effect-b', name: 'Battle Meditation' })
  ] });
  const twoEffects = resolveAttackBonus(actorWithTwoEffects, weapon, null, { attackType: 'melee' });
  assert.equal(twoEffects.total, baseline.total + 6, 'two independent competence Active Effects (+4, +6): only the higher (+6) applies');
  const appliedEffects = twoEffects.typedModifierLedger.filter(e => (e.label === 'Inspiring Presence' || e.label === 'Battle Meditation') && e.applied !== false);
  assert.equal(appliedEffects.length, 1);
  assert.equal(appliedEffects[0].label, 'Battle Meditation');

  // 9. One untyped modifier (Powerful Charge) + one competence modifier
  // (Charge): both apply -- already proven numerically by item 4 above;
  // re-stated explicitly against the ledger's applied set.
  const appliedInChargeAndPowerful = chargeAndPowerful.typedModifierLedger.filter(e => e.applied !== false).map(e => e.label);
  assert.ok(appliedInChargeAndPowerful.includes('Charge'), 'Charge (competence) applies');
  assert.ok(Object.keys(chargeAndPowerful.components).includes('Powerful Charge'), 'Powerful Charge (untyped, a separate channel) also applies');

  // 11. SUM(applied ledger rows) === final atkBonus, using the FULL
  // component ledger computeFinalAttackComposition() builds (baseline +
  // typed pool + invocation-only additions), not just the typed subset --
  // proven across every scenario above, including the suppressed-row case.
  const compositionCases = await Promise.all([
    computeFinalAttackComposition(actor, weapon, { attackType: 'melee', situationalContributions: [charge()] }),
    computeFinalAttackComposition(actorWithEffect, weapon, { attackType: 'melee' }),
    computeFinalAttackComposition(actorWithEffect, weapon, { attackType: 'melee', situationalContributions: [charge()] }),
    computeFinalAttackComposition(powerfulChargeActor, weapon, { attackType: 'melee', charge: true, combatOptions: { powerfulCharge: true }, situationalContributions: [charge()] }),
    computeFinalAttackComposition(powerfulChargeActorWithEffect, weapon, { attackType: 'melee', charge: true, combatOptions: { powerfulCharge: true }, situationalContributions: [charge()] }),
    computeFinalAttackComposition(actor, weapon, { attackType: 'melee', situationalContributions: [flanking(), strongerFlanking] }),
    computeFinalAttackComposition(actorWithTwoEffects, weapon, { attackType: 'melee' })
  ]);
  for (const result of compositionCases) {
    assert.equal(result.ok, true);
    const ledgerSum = result.attackComponentLedger.filter(e => e.applied !== false).reduce((sum, e) => sum + (Number(e.value) || 0), 0);
    assert.equal(ledgerSum, result.atkBonus, 'SUM(applied ledger contributions) must equal atkBonus, including when a same-type collision suppressed a contribution');
  }
  assert.equal(compositionCases[2].atkBonus, baseline.total + 4, 'computeFinalAttackComposition() (the dialog preview / rollAttack() seam) agrees with resolveAttackBonus() alone on the key collision case');
  assert.equal(compositionCases[4].atkBonus, baseline.total + 6, 'computeFinalAttackComposition() agrees with resolveAttackBonus() on the full Effect+Charge+PowerfulCharge stack');

  // 12. Dialog preview and actual roll use the SAME resolved modifier set:
  // computeAttackSituationalContext() (what both the live preview and the
  // submit handler call) feeds computeFinalAttackComposition() (what both
  // the live preview and rollAttack() call), which in turn calls
  // resolveAttackBonus() for its typed pool -- proven end to end for
  // melee/ranged Flanking, closing the loop from real form state through
  // to the real roll composition exactly as before, now over the
  // corrected COMPETENCE-typed Charge.
  function fakeFlankingForm() {
    return { querySelector(selector) {
      const name = selector.match(/name="([^"]+)"/)?.[1];
      return { checked: name === 'flanking' };
    } };
  }
  const meleeContext = computeAttackSituationalContext(fakeFlankingForm(), true);
  const meleeFlankingResult = await computeFinalAttackComposition(actor, weapon, { attackType: 'melee', situationalContributions: meleeContext.situationalContributions });
  assert.equal(meleeFlankingResult.atkBonus, baseline.total + 2, 'melee Flanking end-to-end (form -> context -> composition -> resolveAttackBonus): +2');

  const rangedActor = makeActor({ bab: 7, dex: 5 });
  const rangedGun = rangedWeapon({ proficient: true });
  const rangedBaseline = await computeFinalAttackComposition(rangedActor, rangedGun, { attackType: 'ranged' });
  const rangedContext = computeAttackSituationalContext(fakeFlankingForm(), false);
  const rangedFlankingResult = await computeFinalAttackComposition(rangedActor, rangedGun, { attackType: 'ranged', situationalContributions: rangedContext.situationalContributions });
  assert.equal(rangedFlankingResult.atkBonus, rangedBaseline.atkBonus, 'BLOCKER A FIX (still holds): ranged Flanking end-to-end: +0, not +2 -- SWSE flanking is melee-only');
  for (const result of [meleeFlankingResult, rangedFlankingResult]) {
    const ledgerSum = result.attackComponentLedger.filter(e => e.applied !== false).reduce((sum, e) => sum + (Number(e.value) || 0), 0);
    assert.equal(ledgerSum, result.atkBonus);
  }
}
ok('unified typed attack-modifier stacking: Charge is COMPETENCE per published SWSE evidence; a real Active Effect competence bonus and Charge correctly collide (only the higher applies, +4 not +6) across what used to be two separate stacking islands; Powerful Charge (untyped) stacks on top regardless; Flanking (a different type) always stacks with Charge; two same-type collisions (Flanking-vs-Flanking, Effect-vs-Effect) both resolve via the shared ModifierUtils authority; suppressed contributions remain visible in the ledger with a reason; ledger-sum parity holds throughout; and the dialog preview / real roll seam (computeFinalAttackComposition) agrees with resolveAttackBonus() in every case');

// ─── SECTION 5b — WeaponsEngine attack.bonus modifiers (attunement/crystal) ─
//
// BLOCKER FIX (round 5, correcting round 4's schema): round 4 modeled a
// lightsaber crystal as a separate owned `weaponUpgrade` Item referenced via
// `weapon.system.installedUpgrades` (an id array) carrying a `{domain,
// bonusType, value}` modifier shape. Neither matches how a lightsaber is
// actually built. Confirmed directly against
// `lightsaber-construction-engine.js#createBuiltLightsaber()`/`applyEdits()`:
// the selected crystal's/accessories' own `system.modifiers` records are
// copied VERBATIM onto the finished weapon's OWN `system.modifiers` array --
// no separate owned item, no `installedUpgrades`, is ever populated by that
// (the only live) construction path. The real compiled
// `packs/lightsaber-crystals.db` uses a heterogeneous `{type, value, target,
// bonusType?, condition?, skill?}` rules-record schema (verified directly
// against the pack, not the older/stale `data/lightsaber-components.json`/
// `data/lightsaber-items-import.ndjson` reference files) -- confirmed to
// include ATTACK_BONUS, CONDITIONAL_ATTACK, DAMAGE_BONUS, CONDITIONAL_DAMAGE,
// DEFENSE_BONUS, ENEMY_PENALTY, SKILL_BONUS, SKILL_MODIFIER, HEALING_BONUS,
// DAMAGE_TYPE_CHANGE, DAMAGE_REDUCTION, CRITICAL_BONUS,
// FORCE_POINT_DIE_UPGRADE, REROLL_ABILITY, LIGHT_EMISSION, SENSE_OVERRIDE,
// ALIGNMENT_REFLECTION, and CRITICAL_FAILURE record types. Ordinary attack
// crystals (Ilum, Mephite, Standard Synthetic) carry NO `bonusType` at all
// (untyped, not "force" as round 4 assumed from the stale reference data).
// `combat-stat-rules.js#getWeaponAttunementAndUpgradeModifiers()` was
// rewritten to read `weapon.system.modifiers` directly through a fail-closed
// interpreter: only `type === 'ATTACK_BONUS'` (with its own
// `target === 'attack'`) ever produces an attack Modifier; every other
// type -- including `CONDITIONAL_ATTACK`, a genuine attack bonus this
// project cannot yet verify the condition for -- emits nothing, with no
// unknown-type-defaults-to-attack fallback. This section proves the full
// pipeline against REAL pack record shapes: production data
// -> the fail-closed interpreter -> resolveAttackBonus()'s unified pool ->
// the final roll composition.

{
  function lightsaberWeapon(overrides = {}) {
    return {
      id: overrides.id ?? 'w-saber', name: overrides.name ?? 'Training Saber', type: 'weapon',
      system: {
        weaponCategory: 'melee', proficiency: 'lightsaber', damage: '2d8',
        subtype: 'lightsaber', modifiers: overrides.modifiers ?? []
      },
      flags: overrides.flags ?? {}
    };
  }

  // Real record shapes copied verbatim from packs/lightsaber-crystals.db
  // (parsed and verified directly against the compiled pack, not inferred
  // from any older reference/import file).
  const REAL_CRYSTAL = {
    ilum: [{ type: 'ATTACK_BONUS', value: 1, target: 'attack' }],
    mephite: [{ type: 'ATTACK_BONUS', value: 1, target: 'attack' }],
    standardSynthetic: [{ type: 'ATTACK_BONUS', value: 1, target: 'attack' }],
    kathracite: [{ type: 'DAMAGE_REDUCTION', value: '-1d' }, { type: 'ATTACK_BONUS', value: 1, target: 'attack' }],
    kasha: [{ type: 'DEFENSE_BONUS', target: 'will', value: 2, bonusType: 'force' }],
    jenraux: [{ type: 'DEFENSE_BONUS', target: 'block', value: 2, bonusType: 'force' }],
    sigil: [{ type: 'DAMAGE_BONUS', value: 2, bonusType: 'force', target: 'damage' }],
    krayt: [{ type: 'DAMAGE_BONUS', value: 3, bonusType: 'force', target: 'damage' }],
    mantle: [{ type: 'SKILL_BONUS', skill: 'use-the-force', value: 2, bonusType: 'force' }],
    ankarres: [{ type: 'HEALING_BONUS', value: 2 }],
    compressed: [{ type: 'ENEMY_PENALTY', target: 'block', value: -2 }],
    heart: [{ type: 'CONDITIONAL_ATTACK', value: 2, bonusType: 'force', condition: 'vs-lightsaber-wielders' }],
    hurikane: [{ type: 'CONDITIONAL_ATTACK', value: 2, bonusType: 'force', condition: 'vs-armored' }],
    dragite: [{ type: 'CRITICAL_BONUS', value: '+1d-sonic' }],
    bondar: [{ type: 'DAMAGE_TYPE_CHANGE', value: 'stun' }]
  };

  const actor = makeActor({ bab: 7, str: 2 });
  const plainSaber = lightsaberWeapon();
  const baselineSaber = resolveAttackBonus(actor, plainSaber, null, { attackType: 'melee' });
  assert.equal(baselineSaber.total, 9, 'BAB(7) + STR(2), plain unattuned lightsaber with no crystal');

  // 1/2. FAIL-BEFORE proof: an attuned lightsaber's +1 must reach
  // resolveAttackBonus(); the same weapon un-attuned must not receive it.
  const attunedActor = makeActor({ bab: 7, str: 2 }); // id 'test-actor', matches builtBy/attunedBy below
  const attunedSaber = lightsaberWeapon({ flags: { swse: { builtBy: 'test-actor', attunedBy: 'test-actor' } } });
  const attunedResult = resolveAttackBonus(attunedActor, attunedSaber, null, { attackType: 'melee' });
  assert.equal(attunedResult.total, baselineSaber.total + 1, 'FAIL-BEFORE FIX: an attuned lightsaber\'s +1 now reaches the attack total');
  const attunedRow = attunedResult.typedModifierLedger.find(e => e.label === 'Training Saber (Attuned)');
  assert.equal(attunedRow?.value, 1, 'the attunement bonus has its own named ledger row');
  const unattunedResult = resolveAttackBonus(attunedActor, plainSaber, null, { attackType: 'melee' });
  assert.equal(unattunedResult.total, baselineSaber.total, 'the same weapon, unattuned, must not receive the +1 (fail path proven, not just the pass path)');

  // 3. Ilum / Mephite / Standard Synthetic (generated-weapon shape: a real
  // ATTACK_BONUS record on weapon.system.modifiers): +1 exactly once, and
  // idempotent across repeated invocation.
  for (const [crystalName, records] of [['Ilum', REAL_CRYSTAL.ilum], ['Mephite', REAL_CRYSTAL.mephite], ['Standard Synthetic', REAL_CRYSTAL.standardSynthetic]]) {
    const saber = lightsaberWeapon({ id: `w-${crystalName}`, name: `${crystalName} Saber`, modifiers: records });
    const result = resolveAttackBonus(actor, saber, null, { attackType: 'melee' });
    assert.equal(result.total, baselineSaber.total + 1, `FAIL-BEFORE FIX: ${crystalName} crystal's real ATTACK_BONUS record now reaches the attack total exactly once`);
    const again = resolveAttackBonus(actor, saber, null, { attackType: 'melee' });
    assert.equal(again.total, result.total, `${crystalName}: repeated invocation must not accumulate the crystal contribution`);
  }

  // Kathracite: its DAMAGE_REDUCTION record must contribute ZERO to attack;
  // only its ATTACK_BONUS record affects attack. Proves per-record
  // filtering, not "any record on this weapon counts."
  const kathraciteSaber = lightsaberWeapon({ modifiers: REAL_CRYSTAL.kathracite });
  const kathraciteResult = resolveAttackBonus(actor, kathraciteSaber, null, { attackType: 'melee' });
  assert.equal(kathraciteResult.total, baselineSaber.total + 1, 'Kathracite: DAMAGE_REDUCTION contributes 0 to attack; only its ATTACK_BONUS record (+1) applies');

  // 4. MANDATORY negative proofs: every non-(ATTACK_BONUS-with-target-attack)
  // real crystal record shape must contribute EXACTLY ZERO to the attack
  // total -- regression tests against the exact class of bug present at the
  // previously-reviewed head (an absent/unrecognized field defaulting to
  // 'attack.bonus').
  const negativeCrystals = [
    ['Kasha (DEFENSE_BONUS)', REAL_CRYSTAL.kasha],
    ['Jenraux (DEFENSE_BONUS)', REAL_CRYSTAL.jenraux],
    ['Sigil (DAMAGE_BONUS)', REAL_CRYSTAL.sigil],
    ['Krayt Dragon Pearl (DAMAGE_BONUS)', REAL_CRYSTAL.krayt],
    ['Mantle of the Force (SKILL_BONUS)', REAL_CRYSTAL.mantle],
    ['Ankarres Sapphire (HEALING_BONUS)', REAL_CRYSTAL.ankarres],
    ['Compressed Crystal (ENEMY_PENALTY)', REAL_CRYSTAL.compressed],
    ['Dragite Crystal (CRITICAL_BONUS, string value)', REAL_CRYSTAL.dragite],
    ['Bondar Crystal (DAMAGE_TYPE_CHANGE, string value)', REAL_CRYSTAL.bondar]
  ];
  for (const [label, records] of negativeCrystals) {
    const saber = lightsaberWeapon({ id: `w-neg-${label}`, name: `${label} Saber`, modifiers: records });
    const result = resolveAttackBonus(actor, saber, null, { attackType: 'melee' });
    assert.equal(result.total, baselineSaber.total, `${label} must contribute ZERO to attack -- never defaults to attack.bonus merely because a target/domain field is absent or unrecognized`);
  }

  // 5. Heart of the Guardian / Hurikane: CONDITIONAL_ATTACK records are REAL
  // attack bonuses, but this project's attack pipeline provides no verified
  // target-state context (is the target a lightsaber wielder? armored?) at
  // this layer -- NOT YET AUTOMATED, fails closed to +0 rather than
  // guessing, even when some unrelated context is present.
  const heartSaber = lightsaberWeapon({ modifiers: REAL_CRYSTAL.heart });
  const heartNoContext = resolveAttackBonus(actor, heartSaber, null, { attackType: 'melee' });
  assert.equal(heartNoContext.total, baselineSaber.total, 'Heart of the Guardian: no verified qualifying context -> +0 (not yet automated, fails closed)');
  const heartWithUnrelatedContext = resolveAttackBonus(actor, heartSaber, null, { attackType: 'melee', targetIsArmored: true });
  assert.equal(heartWithUnrelatedContext.total, baselineSaber.total, 'Heart of the Guardian: an unrelated context flag must not accidentally satisfy its condition -- still +0');
  const hurikaneSaber = lightsaberWeapon({ modifiers: REAL_CRYSTAL.hurikane });
  const hurikaneNoContext = resolveAttackBonus(actor, hurikaneSaber, null, { attackType: 'melee' });
  assert.equal(hurikaneNoContext.total, baselineSaber.total, 'Hurikane: no verified qualifying context -> +0 (not yet automated, fails closed)');

  // 6. Weapon enhancement still applies exactly once (the structural
  // miscBonus path), never double-counted via the new typed pool -- the
  // typed pool deliberately never emits a mirror of it.
  const enhancedWeapon = meleeWeapon({ proficient: true, combat: { attack: { bonus: 2 } } });
  const plainMelee = resolveAttackBonus(actor, meleeWeapon({ proficient: true }), null, { attackType: 'melee' });
  const enhancedResult = resolveAttackBonus(actor, enhancedWeapon, null, { attackType: 'melee' });
  assert.equal(enhancedResult.total, plainMelee.total + 2, 'weapon enhancement bonus applies exactly once');

  // 7. Nonproficiency still -5 exactly once (the structural
  // proficiencyPenalty path), never double-counted via the typed pool.
  const nonproficientResult = resolveAttackBonus(actor, meleeWeapon({ proficient: false }), null, { attackType: 'melee' });
  assert.equal(nonproficientResult.total, plainMelee.total - 5, 'nonproficiency penalty applies exactly once');

  // 8. Two equipped weapons: Weapon A's attunement/crystal modifiers must
  // NOT leak into Weapon B's roll. The interpreter reads weapon.system.
  // modifiers directly off the CURRENT weapon param -- no actor-wide scan --
  // so this is structurally guaranteed, proven here end to end.
  const saberA = lightsaberWeapon({ id: 'w-saber-a', name: 'Saber A', flags: { swse: { builtBy: 'test-actor', attunedBy: 'test-actor' } }, modifiers: REAL_CRYSTAL.ilum });
  const saberB = lightsaberWeapon({ id: 'w-saber-b', name: 'Saber B' });
  const actorTwoWeapons = makeActor({ bab: 7, str: 2 });
  const resultA = resolveAttackBonus(actorTwoWeapons, saberA, null, { attackType: 'melee' });
  const resultB = resolveAttackBonus(actorTwoWeapons, saberB, null, { attackType: 'melee' });
  assert.equal(resultA.total, baselineSaber.total + 1 /* attuned */ + 1 /* crystal */, 'Saber A (attuned, with its own crystal) receives both of its own contributions');
  assert.equal(resultB.total, baselineSaber.total, 'Saber B (unattuned, no crystal of its own) must NOT receive Saber A\'s attunement or crystal contributions -- no cross-weapon leakage');

  // 9/10. INTERPRETER-CONTRACT tests (explicitly NOT a claim about any
  // currently-shipped crystal -- no real ATTACK_BONUS record in the pack
  // sets bonusType today; these exercise the interpreter's own supported
  // bonusType field and the attack.bonus/global.attack alias-normalization
  // pass in isolation, using a hypothetical but schema-legal record).
  const { createModifier: makeMod, ModifierType: MType, ModifierSource: MSource } = await import(
    '/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierTypes.js'
  );
  // Same-type collision WITHIN one weapon's own modifiers array.
  const twoTypedSaber = lightsaberWeapon({
    id: 'w-saber-typed-collision', name: 'Interpreter Contract Saber',
    modifiers: [
      { type: 'ATTACK_BONUS', value: 1, target: 'attack', bonusType: 'competence' },
      { type: 'ATTACK_BONUS', value: 3, target: 'attack', bonusType: 'competence' }
    ]
  });
  const twoTypedResult = resolveAttackBonus(actor, twoTypedSaber, null, { attackType: 'melee' });
  assert.equal(twoTypedResult.total, baselineSaber.total + 3, 'interpreter contract: two competence-typed ATTACK_BONUS records on one weapon collide correctly (only the higher, +3, applies), not a bare sum');

  // Cross-target-alias collision: a competence-typed weapon contribution
  // (target 'attack.bonus') and a competence Active Effect (target
  // 'global.attack') must collide in the SAME stacking universe.
  const aliasSaber = lightsaberWeapon({
    id: 'w-saber-alias', name: 'Alias Contract Saber',
    modifiers: [{ type: 'ATTACK_BONUS', value: 5, target: 'attack', bonusType: 'competence' }]
  });
  const actorAliasPlusEffect = makeActor({ bab: 7, str: 2, effects: [competenceAttackEffect(4, { id: 'effect-x', name: 'Battle Focus' })] });
  const aliasResult = resolveAttackBonus(actorAliasPlusEffect, aliasSaber, null, { attackType: 'melee' });
  assert.equal(aliasResult.total, baselineSaber.total + 5, 'interpreter contract: a competence-typed weapon contribution (attack.bonus) and a competence Active Effect (global.attack) collide in ONE stacking universe -- only the higher (+5) applies, not +9 -- proving the target-alias normalization');
  const suppressedAliasRow = aliasResult.typedModifierLedger.find(e => e.label === 'Battle Focus');
  assert.equal(suppressedAliasRow?.applied, false, 'the lower-value Effect Intent contribution must remain visible in the ledger, marked not-applied');
  assert.ok(String(suppressedAliasRow?.reason || '').includes('highestOnly'), 'a suppressed competence contribution\'s reason must correctly cite highestOnly stacking');

  // Weapon contribution vs Charge, same type, legally can collide.
  const chargeContribution = makeMod({ source: MSource.CONDITION, sourceId: 'charge', sourceName: 'Charge', target: 'global.attack', type: MType.COMPETENCE, value: 2 });
  const strongAliasSaber = lightsaberWeapon({
    id: 'w-saber-strong', name: 'Strong Saber',
    modifiers: [{ type: 'ATTACK_BONUS', value: 6, target: 'attack', bonusType: 'competence' }]
  });
  const crystalVsChargeResult = resolveAttackBonus(actor, strongAliasSaber, null, { attackType: 'melee', situationalContributions: [chargeContribution] });
  assert.equal(crystalVsChargeResult.total, baselineSaber.total + 6, 'interpreter contract: weapon contribution (+6 competence) vs Charge (+2 competence): only the higher applies');

  // 11. Truthful suppression reason: a suppressed CIRCUMSTANCE/same-source
  // contribution (stackUnlessSameSource) must never be mislabeled
  // "highestOnly".
  const circumstanceA = makeMod({ source: MSource.FEAT, sourceId: 'prime-shot', sourceName: 'Prime Shot A', target: 'global.attack', type: MType.CIRCUMSTANCE, value: 1 });
  const circumstanceB = makeMod({ source: MSource.FEAT, sourceId: 'prime-shot', sourceName: 'Prime Shot B', target: 'global.attack', type: MType.CIRCUMSTANCE, value: 3 });
  const sameSourceWeapon = meleeWeapon({ proficient: true });
  const sameSourceResult = resolveAttackBonus(actor, sameSourceWeapon, null, { attackType: 'melee', situationalContributions: [circumstanceA, circumstanceB] });
  assert.equal(sameSourceResult.total, plainMelee.total + 3, 'two circumstance contributions from the SAME source: only the higher (+3) applies (stackUnlessSameSource)');
  const suppressedCircumstance = sameSourceResult.typedModifierLedger.find(e => e.label === 'Prime Shot A');
  assert.equal(suppressedCircumstance?.applied, false);
  assert.ok(String(suppressedCircumstance?.reason || '').includes('stackUnlessSameSource'), 'a suppressed circumstance/same-source contribution must cite stackUnlessSameSource');
  assert.ok(!String(suppressedCircumstance?.reason || '').includes('highestOnly'), 'must NOT be mislabeled highestOnly -- the reason must reflect the ACTUAL rule that suppressed it');

  // 12. SUM(applied ledger) === final atk modifier, via the full
  // computeFinalAttackComposition() pipeline, for the key cases above.
  const { computeFinalAttackComposition: composeForWeaponTests } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
  const compositionCases = await Promise.all([
    composeForWeaponTests(attunedActor, attunedSaber, { attackType: 'melee' }),
    composeForWeaponTests(actor, kathraciteSaber, { attackType: 'melee' }),
    composeForWeaponTests(actor, heartSaber, { attackType: 'melee' }),
    composeForWeaponTests(actorTwoWeapons, saberA, { attackType: 'melee' }),
    composeForWeaponTests(actorTwoWeapons, saberB, { attackType: 'melee' }),
    composeForWeaponTests(actor, twoTypedSaber, { attackType: 'melee' }),
    composeForWeaponTests(actorAliasPlusEffect, aliasSaber, { attackType: 'melee' }),
    composeForWeaponTests(actor, strongAliasSaber, { attackType: 'melee', situationalContributions: [chargeContribution] }),
    composeForWeaponTests(actor, sameSourceWeapon, { attackType: 'melee', situationalContributions: [circumstanceA, circumstanceB] })
  ]);
  for (const result of compositionCases) {
    assert.equal(result.ok, true);
    const ledgerSum = result.attackComponentLedger.filter(e => e.applied !== false).reduce((sum, e) => sum + (Number(e.value) || 0), 0);
    assert.equal(ledgerSum, result.atkBonus, 'SUM(applied ledger contributions) must equal the final attack modifier, including weapon-sourced typed contributions and same-source suppression');
  }
  // Dialog preview / real roll parity: computeFinalAttackComposition()
  // (what both call) must agree exactly with resolveAttackBonus() alone
  // for the attunement and alias-collision cases.
  assert.equal(compositionCases[0].atkBonus, attunedResult.total);
  assert.equal(compositionCases[6].atkBonus, aliasResult.total);
}
ok('WeaponsEngine attack.bonus modifiers, generator-native schema (round 5): fail-before/fix proven for attunement and real Ilum/Mephite/Standard-Synthetic ATTACK_BONUS crystal records; Kathracite\'s DAMAGE_REDUCTION contributes zero while its ATTACK_BONUS record applies; every non-attack real crystal record shape (Kasha/Jenraux/Sigil/Krayt/Mantle/Ankarres/Compressed/Dragite/Bondar) contributes exactly zero to attack, including string-valued records that must not throw; Heart of the Guardian/Hurikane CONDITIONAL_ATTACK records fail closed to +0 (not yet automated); weapon enhancement and nonproficiency remain exactly-once structural terms; a second equipped weapon never receives the first weapon\'s attunement/crystal contributions; the interpreter\'s bonusType support and the attack.bonus/global.attack alias normalization are proven via explicitly-labeled interpreter-contract tests, separate from the shipped-crystal RAW tests; a stackUnlessSameSource circumstance suppression is never mislabeled highestOnly; and ledger-sum parity holds throughout, including through the dialog/roll shared composition seam');

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
