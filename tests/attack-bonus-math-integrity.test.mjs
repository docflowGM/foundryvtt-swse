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
  // Math Integrity Freeze, Attack Bonus round 8 correction #1 (Blocker 4):
  // fieldValues supports a non-checkbox field's .value (e.g. the Range Band
  // select, which is now the single authority Point Blank derives from --
  // the separate 'pointBlank' checkbox this fixture used to simulate no
  // longer exists in the real form at all).
  function fakeForm(checkedNames = [], fieldValues = {}) {
    const checked = new Set(checkedNames);
    return { querySelector(selector) {
      const name = selector.match(/name="([^"]+)"/)?.[1];
      if (name in fieldValues) return { value: fieldValues[name] };
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
  assert.deepEqual(computeAttackSituationalContext(fakeForm([], { rangeBand: 'pointBlank' }), false), { aim: false, charge: false, isPointBlank: true, situationalContributions: [] }, 'Range Band = Point Blank sets the range context but contributes zero direct attack bonus (feat-gated, not automatic); round 8 correction #1 removed the separate pointBlank checkbox entirely -- Range Band is the one authority');
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
    system: { abilityMeta: { rules: [{ type: 'ATTACK_OPTION', option: 'powerfulCharge' }] } }
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
// `target === 'attack'`) ever produces an unconditional attack Modifier;
// `type === 'CONDITIONAL_ATTACK'` is automated as of round 6 against the
// roll's resolved target actor (see Section 8b/8c); every other type emits
// nothing, with no unknown-type-defaults-to-attack fallback. This section
// proves the full pipeline against REAL pack record shapes: production data
// -> the fail-closed interpreter -> resolveAttackBonus()'s unified pool ->
// the final roll composition.

{
  const STANDARD_BASELINE_CRYSTAL_ID = 'lightsaber-crystal-standard-kyber';

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

  // An attuned lightsaber fixture with explicit crystal provenance, matching
  // the real construction-engine contract (flags.swse.builtBy/attunedBy +
  // flags.swse.lightsaberConfig.crystalId). `crystalId: undefined` omits
  // lightsaberConfig entirely (the pre-lightsaberConfig legacy/compatibility
  // shape); any other value (including STANDARD_BASELINE_CRYSTAL_ID) sets it.
  function attunedLightsaber({ builderId = 'test-actor', attunerId = builderId, crystalId, modifiers = [], id, name } = {}) {
    const swseFlags = { builtBy: builderId, attunedBy: attunerId };
    if (crystalId !== undefined) swseFlags.lightsaberConfig = { crystalId };
    return lightsaberWeapon({ id, name, modifiers, flags: { swse: swseFlags } });
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

  // 1-3. Standard Kyber baseline (round 7 blocker 1): the generator's
  // virtual, no-mechanical-payload crystal (id STANDARD_BASELINE_CRYSTAL_ID)
  // is the case that earns the ordinary self-built/attuned +1.
  const standardKyberSaber = attunedLightsaber({ crystalId: STANDARD_BASELINE_CRYSTAL_ID, id: 'w-std-kyber', name: 'Std Kyber Saber' });
  const standardKyberResult = resolveAttackBonus(actor, standardKyberSaber, null, { attackType: 'melee' });
  assert.equal(standardKyberResult.total, baselineSaber.total + 1, '1. Standard Kyber: builtBy actor + attunedBy actor => +1');
  const attunedRow = standardKyberResult.typedModifierLedger.find(e => e.label === 'Std Kyber Saber (Attuned)');
  assert.equal(attunedRow?.value, 1, 'the attunement bonus has its own named ledger row');

  const unattunedKyberSaber = attunedLightsaber({ attunerId: null, crystalId: STANDARD_BASELINE_CRYSTAL_ID, id: 'w-std-kyber-2', name: 'Unattuned Kyber Saber' });
  const unattunedKyberResult = resolveAttackBonus(actor, unattunedKyberSaber, null, { attackType: 'melee' });
  assert.equal(unattunedKyberResult.total, baselineSaber.total, '2. Standard Kyber: builtBy actor + attunedBy null => +0');

  const otherActor = { ...makeActor({ bab: 7, str: 2 }), id: 'other-actor' };
  const rolledByBuilderSaber = attunedLightsaber({ crystalId: STANDARD_BASELINE_CRYSTAL_ID, id: 'w-std-kyber-3', name: 'Wrong Wielder Saber' });
  const rolledByOtherResult = resolveAttackBonus(otherActor, rolledByBuilderSaber, null, { attackType: 'melee' });
  assert.equal(rolledByOtherResult.total, baselineSaber.total, '3. Standard Kyber: builtBy actor A + attunedBy actor A, rolled by actor B => +0 (another creature wielding it gets no crystal attack benefit)');

  // 4-6. Ilum / Mephite / Standard Synthetic: attuned creator => exactly
  // +1 -- NOT +2. FAIL-BEFORE FIX: every prior round added the generic
  // Attuned +1 AND the crystal's own ATTACK_BONUS +1 unconditionally,
  // double-counting the identical benefit (JATM: the standard crystal's
  // benefit IS the +1, an alternate crystal's benefit REPLACES it).
  for (const [crystalName, records] of [['Ilum', REAL_CRYSTAL.ilum], ['Mephite', REAL_CRYSTAL.mephite], ['Standard Synthetic', REAL_CRYSTAL.standardSynthetic]]) {
    const saber = attunedLightsaber({ crystalId: `crystal-${crystalName.toLowerCase().replace(/\s+/g, '-')}`, modifiers: records, id: `w-${crystalName}`, name: `${crystalName} Saber` });
    const result = resolveAttackBonus(actor, saber, null, { attackType: 'melee' });
    assert.equal(result.total, baselineSaber.total + 1, `4-6. FAIL-BEFORE FIX: ${crystalName}, attuned creator, is exactly +1 -- NOT +2 (generic attunement +1 and the crystal's own ATTACK_BONUS record are the SAME benefit, not two)`);
    const again = resolveAttackBonus(actor, saber, null, { attackType: 'melee' });
    assert.equal(again.total, result.total, `${crystalName}: repeated invocation must not accumulate the crystal contribution`);
  }

  // 7. Kathracite: attuned creator => its attack benefit exactly once. Its
  // DAMAGE_REDUCTION record must contribute ZERO to attack; only its
  // ATTACK_BONUS record affects attack, and only that +1 (not +2) applies.
  const kathraciteSaber = attunedLightsaber({ crystalId: 'crystal-kathracite', modifiers: REAL_CRYSTAL.kathracite, id: 'w-kathracite', name: 'Kathracite Saber' });
  const kathraciteResult = resolveAttackBonus(actor, kathraciteSaber, null, { attackType: 'melee' });
  assert.equal(kathraciteResult.total, baselineSaber.total + 1, '7. Kathracite: DAMAGE_REDUCTION contributes 0 to attack; only its ATTACK_BONUS record (+1, exactly once, not +2) applies');

  // 8. Ilum: same weapon before attunement => +0 (a non-attuned wielder,
  // including someone other than the builder, gets no crystal attack
  // benefit); mutate attunedBy to the rolling actor => the very next
  // resolution reaches +1.
  const mutatingIlumSaber = attunedLightsaber({ attunerId: null, crystalId: 'crystal-ilum', modifiers: REAL_CRYSTAL.ilum, id: 'w-ilum-mutate', name: 'Mutating Ilum Saber' });
  const beforeAttunement = resolveAttackBonus(actor, mutatingIlumSaber, null, { attackType: 'melee' });
  assert.equal(beforeAttunement.total, baselineSaber.total, '8. Ilum, not yet attuned: +0');
  mutatingIlumSaber.flags.swse.attunedBy = actor.id;
  const afterAttunement = resolveAttackBonus(actor, mutatingIlumSaber, null, { attackType: 'melee' });
  assert.equal(afterAttunement.total, baselineSaber.total + 1, '8. Ilum, attunedBy mutated to the rolling actor: the very next resolution reaches +1, no stale caching');

  // 9. Alternate nonattack crystal (Sigil, DAMAGE_BONUS only): attuned
  // creator => no generic +1. The crystal's own chosen benefit (damage, in
  // Sigil's case) replaces the standard +1 rather than adding to it, and
  // Sigil's own record isn't ATTACK_BONUS/CONDITIONAL_ATTACK, so attack
  // total is exactly the unmodified baseline.
  const sigilSaber = attunedLightsaber({ crystalId: 'crystal-sigil', modifiers: REAL_CRYSTAL.sigil, id: 'w-sigil', name: 'Sigil Saber' });
  const sigilResult = resolveAttackBonus(actor, sigilSaber, null, { attackType: 'melee' });
  assert.equal(sigilResult.total, baselineSaber.total, '9. Sigil (alternate nonattack crystal), attuned creator: no generic +1 -- the crystal\'s own replacement benefit does not regrant the standard bonus');

  // Every other non-(ATTACK_BONUS-with-target-attack) real crystal record
  // shape must ALSO contribute exactly zero to attack for an ATTUNED
  // creator specifically (not merely because attunement is absent) --
  // proving the per-record-type fail-closed filtering independently of the
  // attunement gate.
  const negativeCrystals = [
    ['Kasha (DEFENSE_BONUS)', REAL_CRYSTAL.kasha],
    ['Jenraux (DEFENSE_BONUS)', REAL_CRYSTAL.jenraux],
    ['Krayt Dragon Pearl (DAMAGE_BONUS)', REAL_CRYSTAL.krayt],
    ['Mantle of the Force (SKILL_BONUS)', REAL_CRYSTAL.mantle],
    ['Ankarres Sapphire (HEALING_BONUS)', REAL_CRYSTAL.ankarres],
    ['Compressed Crystal (ENEMY_PENALTY)', REAL_CRYSTAL.compressed],
    ['Dragite Crystal (CRITICAL_BONUS, string value)', REAL_CRYSTAL.dragite],
    ['Bondar Crystal (DAMAGE_TYPE_CHANGE, string value)', REAL_CRYSTAL.bondar]
  ];
  let negIndex = 0;
  for (const [label, records] of negativeCrystals) {
    negIndex += 1;
    const saber = attunedLightsaber({ crystalId: `crystal-neg-${negIndex}`, modifiers: records, id: `w-neg-${negIndex}`, name: `${label} Saber` });
    const result = resolveAttackBonus(actor, saber, null, { attackType: 'melee' });
    assert.equal(result.total, baselineSaber.total, `${label}, attuned creator, must contribute ZERO to attack -- never defaults to attack.bonus merely because a target/domain field is absent or unrecognized, and never regains the generic +1 for lacking an ATTACK_BONUS record of its own`);
  }

  // 10. Non-attuned wielder of a crystal-bearing saber => +0 regardless of
  // the crystal (Ilum's own +1 record does not apply to a non-attuned
  // wielder). Covers "another creature wielding the weapon" generally,
  // beyond the builder-vs-other-actor case already proven in item 3.
  const nonAttunedIlumSaber = lightsaberWeapon({ id: 'w-ilum-unattuned', name: 'Unattuned Ilum Saber', modifiers: REAL_CRYSTAL.ilum, flags: {} });
  const nonAttunedResult = resolveAttackBonus(actor, nonAttunedIlumSaber, null, { attackType: 'melee' });
  assert.equal(nonAttunedResult.total, baselineSaber.total, '10. A crystal-bearing saber with no builtBy/attunedBy at all (never attuned by anyone): +0, the crystal\'s ATTACK_BONUS record never applies to an unattuned wielder');

  // Heart of the Guardian / Hurikane: CONDITIONAL_ATTACK records require
  // BOTH attunement AND the target condition (see Section 8b/8c below for
  // the full target-qualification matrix). This proves attunement alone is
  // not sufficient -- no resolvable target still yields +0 even for an
  // attuned creator, and an unrelated context flag never accidentally
  // satisfies the condition.
  const heartSaber = attunedLightsaber({ crystalId: 'crystal-heart', modifiers: REAL_CRYSTAL.heart, id: 'w-heart-attuned', name: 'Heart Saber' });
  const heartNoContext = resolveAttackBonus(actor, heartSaber, null, { attackType: 'melee' });
  assert.equal(heartNoContext.total, baselineSaber.total, 'Heart of the Guardian: attuned but no resolvable target -> +0 (fails closed, never guesses)');
  const heartWithUnrelatedContext = resolveAttackBonus(actor, heartSaber, null, { attackType: 'melee', targetIsArmored: true });
  assert.equal(heartWithUnrelatedContext.total, baselineSaber.total, 'Heart of the Guardian: an unrelated context flag must not accidentally satisfy its condition -- still +0');
  const hurikaneSaber = attunedLightsaber({ crystalId: 'crystal-hurikane', modifiers: REAL_CRYSTAL.hurikane, id: 'w-hurikane-attuned', name: 'Hurikane Saber' });
  const hurikaneNoContext = resolveAttackBonus(actor, hurikaneSaber, null, { attackType: 'melee' });
  assert.equal(hurikaneNoContext.total, baselineSaber.total, 'Hurikane: attuned but no resolvable target -> +0 (fails closed, never guesses)');

  // Weapon enhancement still applies exactly once (the structural
  // miscBonus path), never double-counted via the new typed pool -- the
  // typed pool deliberately never emits a mirror of it.
  const enhancedWeapon = meleeWeapon({ proficient: true, combat: { attack: { bonus: 2 } } });
  const plainMelee = resolveAttackBonus(actor, meleeWeapon({ proficient: true }), null, { attackType: 'melee' });
  const enhancedResult = resolveAttackBonus(actor, enhancedWeapon, null, { attackType: 'melee' });
  assert.equal(enhancedResult.total, plainMelee.total + 2, 'weapon enhancement bonus applies exactly once');

  // Nonproficiency still -5 exactly once (the structural proficiencyPenalty
  // path), never double-counted via the typed pool.
  const nonproficientResult = resolveAttackBonus(actor, meleeWeapon({ proficient: false }), null, { attackType: 'melee' });
  assert.equal(nonproficientResult.total, plainMelee.total - 5, 'nonproficiency penalty applies exactly once');

  // Two equipped weapons: Weapon A's attunement/crystal modifiers must NOT
  // leak into Weapon B's roll. The interpreter reads weapon.system.modifiers
  // directly off the CURRENT weapon param -- no actor-wide scan -- so this
  // is structurally guaranteed, proven here end to end. Saber A (attuned,
  // Ilum crystal) is exactly +1 (the round-7 fix), not +2.
  const saberA = attunedLightsaber({ crystalId: 'crystal-ilum', modifiers: REAL_CRYSTAL.ilum, id: 'w-saber-a', name: 'Saber A' });
  const saberB = lightsaberWeapon({ id: 'w-saber-b', name: 'Saber B' });
  const actorTwoWeapons = makeActor({ bab: 7, str: 2 });
  const resultA = resolveAttackBonus(actorTwoWeapons, saberA, null, { attackType: 'melee' });
  const resultB = resolveAttackBonus(actorTwoWeapons, saberB, null, { attackType: 'melee' });
  assert.equal(resultA.total, baselineSaber.total + 1, 'Saber A (attuned, Ilum crystal) receives exactly its own +1, not +2');
  assert.equal(resultB.total, baselineSaber.total, 'Saber B (unattuned, no crystal of its own) must NOT receive Saber A\'s attunement or crystal contributions -- no cross-weapon leakage');

  // INTERPRETER-CONTRACT tests (explicitly NOT a claim about any
  // currently-shipped crystal -- no real ATTACK_BONUS record in the pack
  // sets bonusType today; these exercise the interpreter's own supported
  // bonusType field and the attack.bonus/global.attack alias-normalization
  // pass in isolation, using a hypothetical but schema-legal record). All
  // fixtures are attuned, since the interpreter now gates every crystal
  // record on attunement.
  const { createModifier: makeMod, ModifierType: MType, ModifierSource: MSource } = await import(
    '/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierTypes.js'
  );
  // Same-type collision WITHIN one weapon's own modifiers array.
  const twoTypedSaber = attunedLightsaber({
    crystalId: 'crystal-interpreter-contract-1', id: 'w-saber-typed-collision', name: 'Interpreter Contract Saber',
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
  const aliasSaber = attunedLightsaber({
    crystalId: 'crystal-interpreter-contract-2', id: 'w-saber-alias', name: 'Alias Contract Saber',
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
  const strongAliasSaber = attunedLightsaber({
    crystalId: 'crystal-interpreter-contract-3', id: 'w-saber-strong', name: 'Strong Saber',
    modifiers: [{ type: 'ATTACK_BONUS', value: 6, target: 'attack', bonusType: 'competence' }]
  });
  const crystalVsChargeResult = resolveAttackBonus(actor, strongAliasSaber, null, { attackType: 'melee', situationalContributions: [chargeContribution] });
  assert.equal(crystalVsChargeResult.total, baselineSaber.total + 6, 'interpreter contract: weapon contribution (+6 competence) vs Charge (+2 competence): only the higher applies');

  // Truthful suppression reason: a suppressed CIRCUMSTANCE/same-source
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

  // SUM(applied ledger) === final atk modifier, via the full
  // computeFinalAttackComposition() pipeline, for the key cases above.
  const { computeFinalAttackComposition: composeForWeaponTests } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
  const compositionCases = await Promise.all([
    composeForWeaponTests(actor, standardKyberSaber, { attackType: 'melee' }),
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
  assert.equal(compositionCases[0].atkBonus, standardKyberResult.total);
  assert.equal(compositionCases[6].atkBonus, aliasResult.total);
}
ok('WeaponsEngine attack.bonus modifiers, generator-native schema (round 7): the standard/self-built lightsaber crystal +1 is now attunement-gated end to end and no longer double-counted against a real crystal\'s own ATTACK_BONUS record (Ilum/Mephite/Standard-Synthetic/Kathracite each exactly +1, never +2); the generator\'s virtual Standard Kyber baseline is distinguished from a real named crystal by crystal IDENTITY, not by an empty modifiers array, so an alternate nonattack crystal (Sigil) never regains the generic +1 its own chosen benefit replaced; a non-attuned wielder (the builder\'s attunedBy null, a different actor entirely, or no builtBy/attunedBy at all) receives no crystal attack benefit from any crystal; every non-(ATTACK_BONUS-with-target-attack) real crystal record shape still contributes exactly zero to attack for an ATTUNED creator specifically; Heart of the Guardian/Hurikane CONDITIONAL_ATTACK records fail closed to +0 with no resolvable target even when attuned (see Section 8b/8c for their target-qualification matrix); weapon enhancement and nonproficiency remain exactly-once structural terms; a second equipped weapon never receives the first weapon\'s attunement/crystal contributions; the interpreter\'s bonusType support and the attack.bonus/global.attack alias normalization are proven via explicitly-labeled interpreter-contract tests, separate from the shipped-crystal RAW tests; a stackUnlessSameSource circumstance suppression is never mislabeled highestOnly; and ledger-sum parity holds throughout, including through the dialog/roll shared composition seam');

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

// ─── SECTION 7 — Greater Weapon Focus golden tests (round 6 blocker 1) ────
//
// FINDING (round 6): the ledger previously claimed Greater Weapon Focus's
// generic record (item.system.abilityMeta.modifiers, the SAME data shape as
// the dead internal PASSIVE/STATE `stateBonus` loop in resolveAttackBonus(),
// gated by allowLegacyStateAttackBonus with zero live opt-ins) never reached
// an attack roll. That claim was based on an incomplete investigation:
// CombatOptionResolver.collectAttackModifiers() ->
// collectWeaponRuleModifiers() -> collectModifierRollBonuses() is a
// SEPARATE, ALREADY-LIVE consumption path for the identical data shape,
// confirmed directly against the actual source
// (weaponMatchesSelectedChoice() reads item.system.selectedChoice via
// getSelectedChoiceValues() -- the real persistence contract, not
// flags.swse.choices.* as the catalog's choiceMeta.storagePath metadata
// implies). No allowLegacyStateAttackBonus opt-in, no code change, is
// required -- only this executable proof, per the explicit instruction not
// to "fix" this by reviving the legacy path. Record shapes below are copied
// verbatim from packs/talents.db (Greater Weapon Focus generic/Lightsabers/
// Fira records) and packs/feats.db (Weapon Focus).

{
  function genericGWFTalent(selectedChoice) {
    return {
      id: 'talent-gwf-generic', name: 'Greater Weapon Focus', type: 'talent',
      system: {
        executionModel: 'PASSIVE', subType: 'STATE', selectedChoice,
        abilityMeta: {
          modifiers: [{ target: 'attack', value: 1, type: 'untyped', predicates: ['attack.weapon-matches-selected-choice'], enabled: true, priority: 500, description: 'Greater Weapon Focus' }]
        }
      }
    };
  }
  function weaponFocusFeat(selectedChoice) {
    return {
      id: 'feat-weapon-focus', name: 'Weapon Focus', type: 'feat',
      system: {
        executionModel: 'PASSIVE', subType: 'STATE', selectedChoice,
        abilityMeta: {
          modifiers: [{ target: 'attack.bonus', value: 1, type: 'untyped', predicates: ['attack.weapon-matches-selected-choice'], enabled: true, priority: 500, description: 'Weapon Focus' }]
        }
      }
    };
  }
  function gwfLightsabersTalent() {
    return {
      id: 'talent-gwf-lightsabers', name: 'Greater Weapon Focus (Lightsabers)', type: 'talent',
      system: {
        executionModel: 'PASSIVE', subType: 'STATE',
        abilityMeta: {
          rules: [{ type: 'WEAPON_ATTACK_BONUS', weaponGroups: ['lightsabers'], requiresAttackType: 'melee', value: 1, label: 'Greater Weapon Focus (Lightsabers)' }]
        }
      }
    };
  }
  function gwfFiraTalent() {
    return {
      id: 'talent-gwf-fira', name: 'Greater Weapon Focus (Fira)', type: 'talent',
      system: {
        executionModel: 'PASSIVE', subType: 'STATE',
        abilityMeta: {
          rules: [{ type: 'ATTACK_OPTION', id: 'greater-weapon-focus-fira', label: 'Greater Weapon Focus (Fira)', control: 'passive', requiresAttackType: 'melee', requiresWeaponText: ['fira'], attackModifier: 1, summary: 'Gain +1 on melee attack rolls with a Fira. This stacks with Weapon Focus (Fira).' }]
        }
      }
    };
  }

  const noTalentActor = makeActor({ bab: 5, str: 1 });
  const matchingWeapon = meleeWeapon({ group: 'vibro-axes' });
  const baseline = resolveAttackBonus(noTalentActor, matchingWeapon, null, { attackType: 'melee' }).total;

  // 1. Generic GWF, matching selectedChoice + matching weapon => +1.
  const actorMatching = makeActor({ bab: 5, str: 1, items: [genericGWFTalent('vibro-axes')] });
  const matchingResult = resolveAttackBonus(actorMatching, matchingWeapon, null, { attackType: 'melee' });
  assert.equal(matchingResult.total, baseline + 1, 'FAIL-BEFORE FIX: Greater Weapon Focus generic record, matching selectedChoice + matching weapon, reaches the attack roll via the existing CombatOptionResolver path -- +1');

  // 2. Same talent, mismatching weapon => +0.
  const mismatchWeapon = meleeWeapon({ id: 'w-mismatch', name: 'Unrelated Weapon', group: 'unarmed-strikes' });
  const mismatchBaseline = resolveAttackBonus(noTalentActor, mismatchWeapon, null, { attackType: 'melee' }).total;
  const mismatchResult = resolveAttackBonus(actorMatching, mismatchWeapon, null, { attackType: 'melee' });
  assert.equal(mismatchResult.total, mismatchBaseline, 'Greater Weapon Focus must not apply to a weapon outside the selected choice -- +0');

  // 3. Same talent, missing selectedChoice => +0.
  const actorNoChoice = makeActor({ bab: 5, str: 1, items: [genericGWFTalent(undefined)] });
  const noChoiceResult = resolveAttackBonus(actorNoChoice, matchingWeapon, null, { attackType: 'melee' });
  assert.equal(noChoiceResult.total, baseline, 'Greater Weapon Focus with no persisted selectedChoice must not apply -- +0');

  // 4. Weapon Focus (matching) + Greater Weapon Focus (matching): both
  // apply -- +2 total. Both are distinct untyped flat contributions summed
  // in CombatOptionResolver's own attackBonus channel (not routed through
  // the typed stacking pool), so two DIFFERENT feat/talent items -- both
  // matching -- correctly stack, matching the real Weapon Focus feat
  // record's own text ("This stacks with Weapon Focus" for the
  // Lightsabers/Fira variants).
  const actorBoth = makeActor({ bab: 5, str: 1, items: [genericGWFTalent('vibro-axes'), weaponFocusFeat('vibro-axes')] });
  const bothResult = resolveAttackBonus(actorBoth, matchingWeapon, null, { attackType: 'melee' });
  // FAIL-BEFORE FIX (discovered while writing this exact test, not part of
  // the reviewer's original blocker list): the real Weapon Focus feat
  // record's own data-driven abilityMeta.modifiers entry (proven above) was
  // ALSO independently granted by ScopedCombatFeatResolver's separate,
  // hardcoded 'weapon-focus' name-matching branch -- two authorities for the
  // identical bonus, both unconditionally summed into resolveAttackBonus()'s
  // total, silently double-counting Weapon Focus (+2 instead of +1) for any
  // real character. Fixed narrowly in scoped-combat-feat-resolver.js: that
  // branch now skips a feat item that already carries a data-driven attack
  // modifier CombatOptionResolver would apply itself, preserving the legacy
  // fallback only for feat items that predate that shape. This assertion
  // (+2, not +3) is the fail-before/fix proof for that discovery.
  assert.equal(bothResult.total, baseline + 2, 'Weapon Focus + Greater Weapon Focus, both matching: +2 total (GWF explicitly stacks with Weapon Focus; Weapon Focus itself is not double-counted between ScopedCombatFeatResolver and CombatOptionResolver)');

  // 5. Mutation test: selectedChoice changes away from the weapon -> the
  // very next resolveAttackBonus() call immediately loses exactly +1.
  actorMatching.items = makeItemsCollection([genericGWFTalent('blaster-pistols')]);
  const afterMutation = resolveAttackBonus(actorMatching, matchingWeapon, null, { attackType: 'melee' });
  assert.equal(afterMutation.total, baseline, 'mutation test: changing selectedChoice away from the weapon loses the +1 on the very next resolution, no stale caching');

  // 6/7. Greater Weapon Focus (Lightsabers): real WEAPON_ATTACK_BONUS rule,
  // melee lightsaber => +1; non-lightsaber => +0.
  const lightsaberActor = makeActor({ bab: 5, str: 1, items: [gwfLightsabersTalent()] });
  const testSaber = { id: 'w-test-saber', name: 'Practice Saber', type: 'weapon', system: { weaponCategory: 'melee', proficiency: 'lightsaber', damage: '2d8', subtype: 'lightsaber' } };
  const saberBaseline = resolveAttackBonus(makeActor({ bab: 5, str: 1 }), testSaber, null, { attackType: 'melee' }).total;
  const saberResult = resolveAttackBonus(lightsaberActor, testSaber, null, { attackType: 'melee' });
  assert.equal(saberResult.total, saberBaseline + 1, 'Greater Weapon Focus (Lightsabers): melee lightsaber => +1');
  const nonSaberResult = resolveAttackBonus(lightsaberActor, matchingWeapon, null, { attackType: 'melee' });
  assert.equal(nonSaberResult.total, baseline, 'Greater Weapon Focus (Lightsabers): non-lightsaber weapon => +0');

  // 8. Greater Weapon Focus (Fira): real ATTACK_OPTION rule, qualifying
  // melee Fira => +1; unrelated weapon => +0.
  const firaActor = makeActor({ bab: 5, str: 1, items: [gwfFiraTalent()] });
  const firaWeapon = { id: 'w-fira', name: 'Fira', type: 'weapon', system: { weaponCategory: 'melee', proficiency: 'simple', damage: '2d4' } };
  const firaBaseline = resolveAttackBonus(makeActor({ bab: 5, str: 1 }), firaWeapon, null, { attackType: 'melee' }).total;
  const firaResult = resolveAttackBonus(firaActor, firaWeapon, null, { attackType: 'melee' });
  assert.equal(firaResult.total, firaBaseline + 1, 'Greater Weapon Focus (Fira): qualifying melee Fira => +1');
  const firaUnrelatedResult = resolveAttackBonus(firaActor, matchingWeapon, null, { attackType: 'melee' });
  assert.equal(firaUnrelatedResult.total, baseline, 'Greater Weapon Focus (Fira): unrelated weapon => +0');
}
ok('Greater Weapon Focus golden tests: the existing CombatOptionResolver path (not a revived legacy stateBonus loop) already carries the generic record\'s +1, gated correctly on matching/mismatching/missing selectedChoice, stacks correctly with Weapon Focus, reacts immediately to a selectedChoice mutation, and the Lightsabers/Fira specialized records apply via their own already-live rule types');

// ─── SECTION 8 — Force-bonus stacking (round 6 blocker 2) ─────────────────
//
// RAW basis (SWSE Core Rulebook p.241, "Stacking Bonuses"): different
// descriptors combine; two bonuses of the SAME named/descriptor type use
// only the higher; unnamed (untyped) bonuses always stack; circumstance and
// dodge are the ordinary exceptions that stack with themselves too. A named
// Force bonus is therefore a typed, nonstacking bonus like any other named
// type -- restored here (ModifierType.FORCE + an EXPLICIT
// STACKING_RULES.force = 'highestOnly' entry, not the getStackingRule()
// '|| stack' fallback).

{
  const { ModifierType: MType, ModifierSource: MSource, STACKING_RULES, createModifier: makeMod } = await import(
    '/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierTypes.js'
  );
  const { ModifierUtils } = await import(
    '/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierUtils.js'
  );

  assert.equal(MType.FORCE, 'force', 'ModifierType.FORCE must be restored');
  assert.equal(STACKING_RULES.force, 'highestOnly', 'STACKING_RULES must carry an EXPLICIT force entry, not rely on the || stack fallback');

  const force2 = makeMod({ source: MSource.ITEM, sourceId: 'crystal-a', sourceName: 'Force A', target: 'global.attack', type: MType.FORCE, value: 2 });
  const force5 = makeMod({ source: MSource.ITEM, sourceId: 'crystal-b', sourceName: 'Force B', target: 'global.attack', type: MType.FORCE, value: 5 });
  const forceOnlyResolved = ModifierUtils.resolveStacking([force2, force5]);
  assert.equal(ModifierUtils.sumModifiers(forceOnlyResolved), 5, '+2 Force + +5 Force => +5 (highestOnly, same descriptor)');

  const competence3 = makeMod({ source: MSource.FEAT, sourceId: 'feat-x', sourceName: 'Competence X', target: 'global.attack', type: MType.COMPETENCE, value: 3 });
  const forceVsCompetence = ModifierUtils.resolveStacking([force2, competence3]);
  assert.equal(ModifierUtils.sumModifiers(forceVsCompetence), 5, 'Force + competence: different descriptors, both apply (+2 + +3 = +5)');

  const untyped1 = makeMod({ source: MSource.CONDITION, sourceId: 'cond-x', sourceName: 'Untyped X', target: 'global.attack', type: MType.UNTYPED, value: 1 });
  const forceVsUntyped = ModifierUtils.resolveStacking([force2, untyped1]);
  assert.equal(ModifierUtils.sumModifiers(forceVsUntyped), 3, 'Force + untyped: both apply (+2 + +1 = +3)');
}
ok('ModifierType.FORCE restored with an explicit STACKING_RULES.force = highestOnly entry (SWSE Core Rulebook p.241): two Force contributions collide to only the higher; Force vs competence and Force vs untyped both fully apply as different descriptor types');

// ─── SECTION 8b — Hurikane / Heart of the Guardian target-gated ───────────
// CONDITIONAL_ATTACK crystals (round 6 blockers 3-4; round 7 correction:
// both now ALSO require the attacker be attuned to the crystal-bearing
// saber, Hurikane requires an actual Armor Bonus to Reflex Defense rather
// than merely "wears an armor-typed item," and Heart requires the target to
// be both wielding AND have the lightsaber's blade active, not just
// equipped.)

{
  function attunedConditionalSaber(records, { attuned = true, id, name } = {}) {
    return {
      id: id ?? 'w-cond-saber', name: name ?? 'Conditional Saber', type: 'weapon',
      system: { weaponCategory: 'melee', proficiency: 'lightsaber', damage: '2d8', subtype: 'lightsaber', modifiers: records },
      flags: { swse: { builtBy: 'test-actor', attunedBy: attuned ? 'test-actor' : null } }
    };
  }
  function targetActorWith(items) { return { id: 'target-actor', items: makeItemsCollection(items) }; }
  // "vs-armored" fixtures: SWSE's real Hurikane condition is a target with
  // an ARMOR BONUS TO REFLEX DEFENSE, not merely "wears an armor-typed
  // item" -- resolveArmorData()'s reflexBonus (system.defenseBonus, the
  // canonical storage field) must be positive.
  function positiveReflexArmorItem() { return { id: 'armor-1', name: 'Battle Armor', type: 'armor', system: { equipped: true, armorType: 'medium', defenseBonus: 3 } }; }
  function unequippedPositiveReflexArmorItem() { return { id: 'armor-2', name: 'Spare Armor', type: 'armor', system: { equipped: false, armorType: 'medium', defenseBonus: 3 } }; }
  // The real Cortosis Gauntlet (packs/armor.db, id armor-cortosis-gauntlet):
  // armorType medium, defenseBonus 0 -- equipped armor with NO Reflex bonus,
  // the mandatory negative regression.
  function cortosisGauntletItem() { return { id: 'armor-cortosis-gauntlet', name: 'Cortosis Gauntlet', type: 'armor', system: { equipped: true, armorType: 'medium', defenseBonus: 0 } }; }
  function equippedEnergyShieldItem() { return { id: 'shield-1', name: 'Deflector Shield Generator', type: 'armor', system: { equipped: true, armorType: 'shield', defenseBonus: 5 } }; }
  // "vs-lightsaber-wielders" fixtures: wielded (equipped) AND activated
  // (blade ignited) are independent predicates.
  function targetLightsaberItem(overrides = {}) {
    return {
      id: overrides.id ?? 'target-saber', name: overrides.name ?? 'Target Saber', type: 'weapon',
      system: { subtype: 'lightsaber', equipped: overrides.equipped !== false, activated: overrides.activated !== false }
    };
  }

  const attacker = makeActor({ bab: 7, str: 2 });
  const hurikaneRecord = [{ type: 'CONDITIONAL_ATTACK', value: 2, bonusType: 'force', condition: 'vs-armored' }];
  const heartRecord = [{ type: 'CONDITIONAL_ATTACK', value: 2, bonusType: 'force', condition: 'vs-lightsaber-wielders' }];
  const hurikaneSaber = attunedConditionalSaber(hurikaneRecord, { id: 'w-hurikane', name: 'Hurikane Saber' });
  const heartSaber = attunedConditionalSaber(heartRecord, { id: 'w-heart', name: 'Heart Saber' });
  // Baseline is deliberately UNATTUNED -- hurikaneSaber/heartSaber never
  // receive the separate generic standard-crystal +1 either (their own
  // modifiers array is non-empty, so they defer entirely to their own
  // CONDITIONAL_ATTACK record; see Section 5b), so this stays a clean
  // reference point isolating only the conditional +2 under test.
  const plainBaseline = resolveAttackBonus(attacker, attunedConditionalSaber([], { attuned: false, id: 'w-plain2', name: 'Plain Saber 2' }), null, { attackType: 'melee' }).total;

  // ── Hurikane (vs-armored: an Armor Bonus to Reflex Defense) ────────────
  assert.equal(resolveAttackBonus(attacker, hurikaneSaber, null, { attackType: 'melee' }).total, plainBaseline, '1. Hurikane: no target => +0');
  assert.equal(resolveAttackBonus(attacker, hurikaneSaber, null, { attackType: 'melee', targetActor: targetActorWith([]) }).total, plainBaseline, '2. Hurikane: target owns no armor => +0');
  assert.equal(resolveAttackBonus(attacker, hurikaneSaber, null, { attackType: 'melee', targetActor: targetActorWith([unequippedPositiveReflexArmorItem()]) }).total, plainBaseline, '3. Hurikane: unequipped positive-Reflex armor (not worn) => +0');
  assert.equal(resolveAttackBonus(attacker, hurikaneSaber, null, { attackType: 'melee', targetActor: targetActorWith([positiveReflexArmorItem()]) }).total, plainBaseline + 2, '4. Hurikane: equipped body armor with a positive Armor Bonus to Reflex Defense => +2');
  assert.equal(resolveAttackBonus(attacker, hurikaneSaber, null, { attackType: 'melee', targetActor: targetActorWith([cortosisGauntletItem()]) }).total, plainBaseline, '5/6. Hurikane: equipped Cortosis Gauntlet, Reflex Armor Bonus 0 -- wearing armor alone is not enough => +0');
  assert.equal(resolveAttackBonus(attacker, hurikaneSaber, null, { attackType: 'melee', targetActor: targetActorWith([equippedEnergyShieldItem()]) }).total, plainBaseline, '7. Hurikane: Energy Shield alone => +0 (not body armor; its own Reflex bonus is also zeroed by resolveArmorData())');
  const altFlagArmor = { id: 'armor-alt', name: 'Alt Flag Armor', type: 'armor', system: { readied: true, armorType: 'light', defenseBonus: 2 } };
  assert.equal(resolveAttackBonus(attacker, hurikaneSaber, null, { attackType: 'melee', targetActor: targetActorWith([altFlagArmor]) }).total, plainBaseline + 2, '8. Hurikane: alternate certified equipped-armor flag (system.readied) + a positive Reflex bonus => +2');
  const mutatingArmor = positiveReflexArmorItem();
  const mutatingArmorTarget = targetActorWith([mutatingArmor]);
  assert.equal(resolveAttackBonus(attacker, hurikaneSaber, null, { attackType: 'melee', targetActor: mutatingArmorTarget }).total, plainBaseline + 2, '9. Hurikane: initially equipped, positive Reflex bonus => +2');
  mutatingArmor.system.equipped = false;
  assert.equal(resolveAttackBonus(attacker, hurikaneSaber, null, { attackType: 'melee', targetActor: mutatingArmorTarget }).total, plainBaseline, '9. Hurikane: mutation -- unequipping the armor loses the +2 on the very next resolution');
  const nonAttunedHurikaneSaber = attunedConditionalSaber(hurikaneRecord, { attuned: false, id: 'w-hurikane-unattuned', name: 'Unattuned Hurikane Saber' });
  assert.equal(resolveAttackBonus(attacker, nonAttunedHurikaneSaber, null, { attackType: 'melee', targetActor: targetActorWith([positiveReflexArmorItem()]) }).total, plainBaseline, '10. Hurikane: attacker not attuned to the saber => +0 regardless of an otherwise-qualifying target');

  // ── Heart of the Guardian (vs-lightsaber-wielders: WIELDING an ACTIVE
  // lightsaber) ────────────────────────────────────────────────────────────
  assert.equal(resolveAttackBonus(attacker, heartSaber, null, { attackType: 'melee', targetActor: targetActorWith([targetLightsaberItem({ equipped: false, activated: false })]) }).total, plainBaseline, '1. Heart: owned, unequipped, inactive => +0');
  assert.equal(resolveAttackBonus(attacker, heartSaber, null, { attackType: 'melee', targetActor: targetActorWith([targetLightsaberItem({ equipped: true, activated: false })]) }).total, plainBaseline, '2. Heart: equipped but inactive (blade not ignited) => +0');
  assert.equal(resolveAttackBonus(attacker, heartSaber, null, { attackType: 'melee', targetActor: targetActorWith([targetLightsaberItem({ equipped: false, activated: true })]) }).total, plainBaseline, '3. Heart: active but not wielded => +0');
  const wieldingActiveTarget = targetActorWith([targetLightsaberItem({ equipped: true, activated: true })]);
  assert.equal(resolveAttackBonus(attacker, heartSaber, null, { attackType: 'melee', targetActor: wieldingActiveTarget }).total, plainBaseline + 2, '4. Heart: wielded + active => +2');
  const nonSaberActiveTarget = targetActorWith([{ id: 'target-blaster', name: 'Blaster', type: 'weapon', system: { equipped: true, activated: true } }]);
  assert.equal(resolveAttackBonus(attacker, heartSaber, null, { attackType: 'melee', targetActor: nonSaberActiveTarget }).total, plainBaseline, '5. Heart: wielded + active non-lightsaber => +0');
  const mutatingActivation = targetLightsaberItem({ id: 'mutating-activation-saber', equipped: true, activated: true });
  const mutatingActivationTarget = targetActorWith([mutatingActivation]);
  assert.equal(resolveAttackBonus(attacker, heartSaber, null, { attackType: 'melee', targetActor: mutatingActivationTarget }).total, plainBaseline + 2, '6. Heart: initially wielded + active => +2');
  mutatingActivation.system.activated = false;
  assert.equal(resolveAttackBonus(attacker, heartSaber, null, { attackType: 'melee', targetActor: mutatingActivationTarget }).total, plainBaseline, '6. Heart: mutation -- deactivating the blade loses the +2 on the very next resolution');
  const mutatingWield = targetLightsaberItem({ id: 'mutating-wield-saber', equipped: true, activated: true });
  const mutatingWieldTarget = targetActorWith([mutatingWield]);
  assert.equal(resolveAttackBonus(attacker, heartSaber, null, { attackType: 'melee', targetActor: mutatingWieldTarget }).total, plainBaseline + 2, '7. Heart: initially wielded + active => +2');
  mutatingWield.system.equipped = false;
  assert.equal(resolveAttackBonus(attacker, heartSaber, null, { attackType: 'melee', targetActor: mutatingWieldTarget }).total, plainBaseline, '7. Heart: mutation -- unequipping while still active loses the +2 on the very next resolution');
  const altEquipActiveSaber = { id: 'target-saber-alt', name: 'Alt Saber', type: 'weapon', system: { subtype: 'lightsaber', readied: true, activated: true } };
  assert.equal(resolveAttackBonus(attacker, heartSaber, null, { attackType: 'melee', targetActor: targetActorWith([altEquipActiveSaber]) }).total, plainBaseline + 2, '8. Heart: alternate certified wield field (system.readied) + activated => +2');
  const wieldingTargetA = targetActorWith([targetLightsaberItem({ id: 'saber-a', equipped: true, activated: true })]);
  const unarmedTargetB = targetActorWith([]);
  assert.equal(resolveAttackBonus(attacker, heartSaber, null, { attackType: 'melee', targetActor: wieldingTargetA }).total, plainBaseline + 2, '9. Heart: target A (wielding + active) => +2');
  assert.equal(resolveAttackBonus(attacker, heartSaber, null, { attackType: 'melee', targetActor: unarmedTargetB }).total, plainBaseline, '9. Heart: target B (no lightsaber), rolled immediately after target A => +0, no leakage between targets');
  const nonAttunedHeartSaber = attunedConditionalSaber(heartRecord, { attuned: false, id: 'w-heart-unattuned', name: 'Unattuned Heart Saber' });
  assert.equal(resolveAttackBonus(attacker, nonAttunedHeartSaber, null, { attackType: 'melee', targetActor: wieldingActiveTarget }).total, plainBaseline, '10. Heart: attacker not attuned to the saber => +0 regardless of an otherwise-qualifying target');
}
ok('Hurikane (vs-armored) and Heart of the Guardian (vs-lightsaber-wielders) CONDITIONAL_ATTACK crystals require the attacker be attuned to the crystal-bearing saber (round 7 correction) in addition to the target condition: Hurikane now checks an actual positive Armor Bonus to Reflex Defense via resolveArmorData() (proven against the real Cortosis Gauntlet, whose Reflex bonus is 0, as the mandatory negative regression) rather than merely "wears an armor-typed item," Energy Shields excluded either way; Heart now requires the target to be BOTH wielding (equipped) AND have the lightsaber\'s blade active (system.activated, independent of token-light visuals), proven with all four combinations of the two predicates plus independent mutation tests for each; alternate certified equip/activation flags are recognized; state never leaks between two different targets; and an attacker who is not attuned to the crystal-bearing saber receives neither bonus regardless of the target');

// ─── SECTION 8c — Force stacking + conditional-crystal matrix (A-H) ───────

{
  const { createModifier: makeMod, ModifierType: MType, ModifierSource: MSource } = await import(
    '/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierTypes.js'
  );
  const { computeFinalAttackComposition } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');

  function lightsaberWithModifiers(records, overrides = {}) {
    return {
      id: overrides.id ?? 'w-matrix-saber', name: overrides.name ?? 'Matrix Saber', type: 'weapon',
      system: { weaponCategory: 'melee', proficiency: 'lightsaber', damage: '2d8', subtype: 'lightsaber', modifiers: records },
      flags: overrides.flags ?? { swse: { builtBy: 'test-actor', attunedBy: 'test-actor' } }
    };
  }
  function targetActorWith(items) { return { id: 'target-actor', items: makeItemsCollection(items) }; }
  function equippedBodyArmorItem() { return { id: 'armor-1', name: 'Battle Armor', type: 'armor', system: { equipped: true, armorType: 'medium', defenseBonus: 3 } }; }
  function equippedLightsaberItem() { return { id: 'target-saber', name: 'Target Saber', type: 'weapon', system: { subtype: 'lightsaber', equipped: true, activated: true } }; }

  const attacker = makeActor({ bab: 7, str: 2 });
  // Baseline is deliberately UNATTUNED (no generic self-built +1 of its own)
  // -- Heart/Hurikane's own conditional +2 Force is what this matrix is
  // isolating, not the separate standard-crystal attunement bonus (see
  // Section 5b/8b for that).
  const baseline = resolveAttackBonus(attacker, lightsaberWithModifiers([], { flags: {} }), null, { attackType: 'melee' }).total;
  const heartRecord = [{ type: 'CONDITIONAL_ATTACK', value: 2, bonusType: 'force', condition: 'vs-lightsaber-wielders' }];
  const hurikaneRecord = [{ type: 'CONDITIONAL_ATTACK', value: 2, bonusType: 'force', condition: 'vs-armored' }];
  const heartSaber = lightsaberWithModifiers(heartRecord, { id: 'matrix-heart' });
  const hurikaneSaber = lightsaberWithModifiers(hurikaneRecord, { id: 'matrix-hurikane' });
  const wieldingTarget = targetActorWith([equippedLightsaberItem()]);
  const armoredTarget = targetActorWith([equippedBodyArmorItem()]);

  // A. Heart +2 Force alone, qualified.
  assert.equal(resolveAttackBonus(attacker, heartSaber, null, { attackType: 'melee', targetActor: wieldingTarget }).total, baseline + 2, 'A. Heart +2 Force alone, qualified => +2');

  // B. Hurikane +2 Force alone, qualified.
  assert.equal(resolveAttackBonus(attacker, hurikaneSaber, null, { attackType: 'melee', targetActor: armoredTarget }).total, baseline + 2, 'B. Hurikane +2 Force alone, qualified => +2');

  // C. Condition not satisfied -> zero contribution.
  assert.equal(resolveAttackBonus(attacker, heartSaber, null, { attackType: 'melee', targetActor: armoredTarget }).total, baseline, 'C. Heart vs a non-lightsaber-wielding (armored-only) target => +0');
  assert.equal(resolveAttackBonus(attacker, hurikaneSaber, null, { attackType: 'melee', targetActor: wieldingTarget }).total, baseline, 'C. Hurikane vs a non-armored (lightsaber-wielding-only) target => +0');

  // D. Qualifying conditional crystal + an unrelated +4 Force attack
  // contribution => only +4 Force applies (highestOnly).
  const unrelatedForce4 = makeMod({ source: MSource.EFFECT, sourceId: 'force-buff', sourceName: 'Battle Meditation', target: 'global.attack', type: MType.FORCE, value: 4 });
  const dResult = resolveAttackBonus(attacker, heartSaber, null, { attackType: 'melee', targetActor: wieldingTarget, situationalContributions: [unrelatedForce4] });
  assert.equal(dResult.total, baseline + 4, 'D. qualifying Heart (+2 Force) + an unrelated +4 Force contribution: only the higher (+4) applies (highestOnly, same descriptor)');

  // E. qualifying +2 Force crystal + +2 competence: both apply (+4, different types).
  const competence2 = makeMod({ source: MSource.FEAT, sourceId: 'feat-y', sourceName: 'Competence Y', target: 'global.attack', type: MType.COMPETENCE, value: 2 });
  const eResult = resolveAttackBonus(attacker, heartSaber, null, { attackType: 'melee', targetActor: wieldingTarget, situationalContributions: [competence2] });
  assert.equal(eResult.total, baseline + 4, 'E. qualifying +2 Force crystal + +2 competence: both apply (+2 + +2 = +4)');

  // F. qualifying +2 Force crystal + +1 untyped: both apply (+3).
  const untyped1 = makeMod({ source: MSource.CONDITION, sourceId: 'cond-y', sourceName: 'Untyped Y', target: 'global.attack', type: MType.UNTYPED, value: 1 });
  const fResult = resolveAttackBonus(attacker, heartSaber, null, { attackType: 'melee', targetActor: wieldingTarget, situationalContributions: [untyped1] });
  assert.equal(fResult.total, baseline + 3, 'F. qualifying +2 Force crystal + +1 untyped: both apply (+2 + +1 = +3)');

  // G. suppressed Force contribution remains visible in the ledger with
  // applied:false and a truthful highestOnly reason.
  const suppressedRow = dResult.typedModifierLedger.find(e => e.applied === false);
  assert.ok(suppressedRow, 'G. a suppressed Force contribution must remain visible in the ledger');
  assert.ok(String(suppressedRow.reason || '').includes('highestOnly'), 'G. the suppressed Force contribution\'s reason must truthfully cite highestOnly stacking');

  // H. dialog preview and final composition both see the same
  // target-conditioned result when target context is available; fails
  // closed (never guesses a target) when none is resolvable.
  const withTargetComposition = await computeFinalAttackComposition(attacker, heartSaber, { attackType: 'melee', targetActor: wieldingTarget });
  assert.equal(withTargetComposition.atkBonus, baseline + 2, 'H. computeFinalAttackComposition() (the shared dialog-preview/roll seam) sees the same target-conditioned Heart contribution as resolveAttackBonus() alone');
  const withoutTargetComposition = await computeFinalAttackComposition(attacker, heartSaber, { attackType: 'melee' });
  assert.equal(withoutTargetComposition.atkBonus, baseline, 'H. with no authoritative target resolvable, the shared composition seam fails closed to +0 rather than guessing a target');
}
ok('Force stacking + conditional-crystal cross-type matrix (A-H): Heart/Hurikane apply their +2 Force only when target-qualified and zero otherwise; a qualifying conditional crystal collides correctly (highestOnly) with an unrelated Force contribution while remaining visible in the ledger with a truthful suppression reason; competence and untyped contributions of the same value both still fully apply alongside a qualifying Force crystal; and the dialog-preview/roll shared composition seam sees the identical target-conditioned result, failing closed with no target rather than guessing');

// ─── SECTION 9 — Narration attack-path parity (round 6 blocker 5) ────────
//
// FAIL-BEFORE defect: rollAttackAndDamageWithNarration() used to call
// resolveAttackBonus(actor, weapon, null, rollOptions).total directly,
// bypassing computeFinalAttackComposition() -- the shared seam rollAttack()
// (the dialog/roll/chat path) and the attack dialog's own live preview both
// already go through. That silently dropped every invocation-only addition
// computeFinalAttackComposition() layers on top of the resolver's own total
// (Fighting Defensively, grapple-state penalty, custom modifier, sequence
// penalty, a typed contextual modifier) for this exported entry point. No
// current caller reaches this function (a dormant divergence, not a
// reproduced player bug), but the freeze does not leave a known alternate
// attack-roll formula in place. Only the attack side changed; Damage
// composition is untouched.

{
  const { rollAttackAndDamageWithNarration, computeFinalAttackComposition } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
  const { resolveAttackBonus: rab } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js');
  const { RollEngine } = await import('/systems/foundryvtt-swse/scripts/engine/roll-engine.js');
  const { createModifier: makeMod } = await import('/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierTypes.js');
  const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');

  const originalSafeRoll = RollEngine.safeRoll;
  const originalPostRoll = SWSEChat.postRoll;
  let capturedAttackFormula = null;
  RollEngine.safeRoll = async (formula, rollData, opts) => {
    if (opts?.domain === 'combat.attack') capturedAttackFormula = formula;
    return { total: 15, formula, dice: [{ results: [{ result: 10 }] }] };
  };
  // rollAttackAndDamageWithNarration() (unlike rollAttack()) does not gate
  // its chat posts behind rollOptions.suppressChat -- unrelated to this
  // round's attack-bonus fix, so SWSEChat.postRoll (which needs a real
  // Foundry renderTemplate/ChatMessage runtime this harness doesn't
  // provide) is stubbed here rather than exercised live.
  SWSEChat.postRoll = async () => ({ id: 'stub-message' });

  function makeLiveAttacker(name, effects = []) {
    return {
      id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'), name, type: 'character', items: [], effects,
      system: {
        level: 8, size: 'medium', skills: {}, progression: { classLevels: [] },
        attributes: { str: { base: 14, racial: 0, enhancement: 0, temp: 0 }, dex: { base: 12, racial: 0, enhancement: 0, temp: 0 } },
        derived: { bab: 7 },
        hp: { max: 50, value: 50 }
      },
      flags: { swse: {} },
      getRollData: () => ({})
    };
  }

  function extractAtkBonusFromFormula(formula) {
    const match = String(formula ?? '').match(/^1d20 \+ (-?\d+)$/);
    return match ? Number(match[1]) : null;
  }

  try {
    const weapon = { id: 'w-narration', name: 'Blaster Rifle', type: 'weapon', system: { weaponCategory: 'ranged', proficiency: 'rifles', proficient: true, damage: '3d8' } };

    const cases = [
      ['plain', {}],
      ['Fighting Defensively', { fightingDefensively: true }],
      ['custom modifier', { customModifier: 3 }],
      ['sequence penalty', { sequencePenalty: -5 }],
      ['one typed contextual modifier', {
        situationalContributions: [makeMod({ source: 'condition', sourceId: 'narration-test-mod', sourceName: 'Narration Test Modifier', target: 'global.attack', type: 'competence', value: 2 })]
      }]
    ];

    for (const [label, extraOptions] of cases) {
      const attacker = makeLiveAttacker(`Narration-${label}`);
      const rollOptions = { suppressChat: true, targetContext: { mode: 'none' }, ...extraOptions };

      capturedAttackFormula = null;
      await rollAttackAndDamageWithNarration(attacker, weapon, rollOptions);
      const narrationAtkBonus = extractAtkBonusFromFormula(capturedAttackFormula);
      assert.ok(narrationAtkBonus !== null, `${label}: narration path must roll a valid "1d20 + N" formula`);

      const expected = await computeFinalAttackComposition(attacker, weapon, rollOptions);
      assert.equal(expected.ok, true);
      assert.equal(narrationAtkBonus, expected.atkBonus, `${label}: rollAttackAndDamageWithNarration()'s actual rolled attack bonus must equal computeFinalAttackComposition()'s atkBonus -- the same total normal rollAttack() would use`);

      // Fail-before contrast only for cases that are genuinely
      // invocation-only additions layered by computeFinalAttackComposition()
      // on top of resolveAttackBonus()'s own total (Fighting Defensively,
      // custom modifier, sequence penalty). A typed contextual modifier
      // (situationalContributions) is resolved INSIDE resolveAttackBonus()
      // itself, not layered afterward, so it was never actually part of
      // this bug -- both totals correctly agree for that case already, and
      // asserting inequality there would be a false expectation, not a
      // proof.
      if (['Fighting Defensively', 'custom modifier', 'sequence penalty'].includes(label)) {
        const oldBuggyTotal = rab(attacker, weapon, null, rollOptions).total;
        assert.notEqual(oldBuggyTotal, narrationAtkBonus, `${label}: the old resolveAttackBonus()-only total must actually differ from the fixed narration total -- proves this case exercises a real invocation-only addition, not a vacuous comparison`);
      }
    }

    // Grapple-state attack penalty case, separately (needs an actor with a
    // grapple-state effect, not an extraOptions field).
    const grabbedEffect = { flags: { swse: { grappleState: { state: 'grabbed', sourceId: 'attacker-x' } } } };
    const grabbedAttacker = makeLiveAttacker('Narration-Grappled', [grabbedEffect]);
    const grabbedRollOptions = { suppressChat: true, targetContext: { mode: 'none' } };
    capturedAttackFormula = null;
    await rollAttackAndDamageWithNarration(grabbedAttacker, weapon, grabbedRollOptions);
    const grabbedNarrationAtkBonus = extractAtkBonusFromFormula(capturedAttackFormula);
    const grabbedExpected = await computeFinalAttackComposition(grabbedAttacker, weapon, grabbedRollOptions);
    assert.equal(grabbedNarrationAtkBonus, grabbedExpected.atkBonus, 'grapple-state attack penalty: rollAttackAndDamageWithNarration() must include the -2 Grabbed/Grappled penalty, matching computeFinalAttackComposition()');
    const grabbedOldBuggyTotal = rab(grabbedAttacker, weapon, null, grabbedRollOptions).total;
    assert.notEqual(grabbedOldBuggyTotal, grabbedNarrationAtkBonus, 'grapple-state case: the old resolveAttackBonus()-only total must differ, proving the penalty is a real invocation-only addition');
  } finally {
    RollEngine.safeRoll = originalSafeRoll;
    SWSEChat.postRoll = originalPostRoll;
  }
}
ok('narration attack-path parity (round 6 blocker 5): rollAttackAndDamageWithNarration() now delegates to computeFinalAttackComposition() for its attack bonus -- proven live for Fighting Defensively, grapple-state attack penalty, a custom modifier, a sequence penalty, and a typed contextual modifier, each matching the exact total normal rollAttack() would use, with an explicit fail-before contrast showing the old resolveAttackBonus()-only total actually differed');

console.log('attack-bonus-math-integrity.test.mjs: all assertions passed');
