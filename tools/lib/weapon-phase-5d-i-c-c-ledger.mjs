// Phase 5D-I-C-C -- input ledger for weapon REACTION / DEFENSE / DISARM / RECOVERY mechanics (DATA, not logic).
// Used ONLY by tools/census-weapon-phase-5d-i-c-c-inputs.mjs and (for its proven duplicates / non-executables) the 5D-H closure ledger; no runtime module imports it.
//
// Row kinds:  operation-key | ability-compatibility | special-mechanic | relation
// disposition IMPLEMENTED | DUPLICATE | NON_EXECUTABLE | DATA_DEFECT | DATA_COMPLETENESS | BLOCKED | DEFERRED_TO_I_D
// An IMPLEMENTED row names a probe in EXECUTABLE code of its consumer; a special-mechanic row must be classified AUTO / PROMPT by the 5D-E census. A DUPLICATE
// proves its structured carrier on every identity carrying the key. A NON_EXECUTABLE row proves the carried value states no mechanical effect.
const S = 'scripts/items/weapon-runtime/';
const E = 'scripts/engine/combat/';
export const I_C_C_DISPOSITIONS = Object.freeze(['IMPLEMENTED', 'DUPLICATE', 'NON_EXECUTABLE', 'DATA_DEFECT', 'DATA_COMPLETENESS', 'BLOCKED', 'DEFERRED_TO_I_D']);

const profiles = (r) => r?.canonicalStats?.attackProfiles ?? [];
const carriers = (reg, key) => reg.identities.filter((r) => r.operation && key in r.operation);
const every = (reg, key, fn) => { const l = carriers(reg, key); return l.length > 0 && l.every(fn); };
const asArr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
export const VERIFY = {
  rapidStrike: (reg) => every(reg, 'rapidStrikeAttackPenaltyWaived', (r) => asArr(r.abilityInteractions).some((a) => a.relation === 'REMOVE_RAPID_STRIKE_ATTACK_PENALTY')),
  returnNotBase: (reg) => every(reg, 'returnToHand', (r) => /not-base-quality/.test(String(r.operation.returnToHand))),
  nullDefense: (reg) => every(reg, 'standaloneDefenseBonus', (r) => r.operation.standaloneDefenseBonus === null),
  // the profile-level mirror of a reaction number agrees with the operation field that is the numeric authority
  mirror: (identityKey, reaction, opKey, sign = 1) => (reg) => {
    const r = reg.identities.find((x) => x.identityKey === identityKey);
    const m = profiles(r).flatMap((p) => asArr(p.conditionalModifiers)).find((c) => new RegExp(`^useTheForceCheck\\.${reaction}`, 'i').test(String(c.target ?? '')) && (opKey === 'cumulative' ? /cumulative/i.test(c.target) : !/cumulative/i.test(c.target)));
    return !!m && Number(m.value) * sign === Number(opKey === 'cumulative' ? r.operation.BlockCumulativePenalty : (r.operation[opKey] ?? r.operation.blockDeflectUseTheForcePenalty));
  },
  dualPhase: (reg) => { const r = reg.identities.find((x) => x.identityKey === 'lightsaber-chassis-dual-phase'); return Number(r.operation.adjacentReflexPenalty) === -2 && asArr(r.canonicalStats.modeProfiles).some((m) => m.attackProfileId === 'extended' && m.adjacentReflexPenalty === -2); },
};

const row = (kind, key, family, mechanic, disposition, extra) => Object.freeze({ kind, key, family, mechanic, disposition, ...extra });
const opImpl = (key, mechanic, file, probe, reason, extra = {}) => row('operation-key', key, '3b.operation.defense-and-reaction-interactions', mechanic, 'IMPLEMENTED', { consumer: { file, probe }, reason, ...extra });
const opDup = (key, mechanic, carrier, file, probe, verify, reason) => row('operation-key', key, '3b.operation.defense-and-reaction-interactions', mechanic, 'DUPLICATE', { carrier, consumer: { file, probe }, verify, reason });
const opNon = (key, mechanic, cls, verify, reason) => row('operation-key', key, '3b.operation.defense-and-reaction-interactions', mechanic, 'NON_EXECUTABLE', { nonExecutableClass: cls, verify, reason });
const mImpl = (identityKey, id, family, mechanic, file, probe, reason, verify = null) => row('special-mechanic', `${identityKey}::${id}`, 'special-mechanic', mechanic, 'IMPLEMENTED', { identityKey, mechanicId: id, expect: { family }, consumer: { file, probe }, reason, ...(verify ? { verify } : {}) });

const RR = `${S}reaction-rules.js`;
const RW = `${E}reactions/reaction-weapon-context.js`;
const TA = 'scripts/engine/talent/lightsaber-talent-actions.js';
const SE = `${E}canonical-special-effects.js`;

export const I_C_C_ROWS = Object.freeze([
  // ---- operation keys of the defense-and-reaction family ------------------------------------------------------------------------------------------
  opImpl('BlockPenalty', 'active-reaction-modifier', RR, 'BlockPenalty', 'Lightsaber Pike (JATM): -2 on Use the Force checks made with Block (flat, every check). Resolved by the reaction modifier consumer for the selected reaction weapon only; the combined key below is the same penalty, never added.'),
  opImpl('DeflectPenalty', 'active-reaction-modifier', RR, 'DeflectPenalty', 'Pike -2 / Crossguard -2 on Use the Force checks made with Deflect (flat). Consumed through the same modifier resolver (previously only named in a deferral note).'),
  opImpl('blockDeflectUseTheForcePenalty', 'active-reaction-modifier', RR, 'blockDeflectUseTheForcePenalty', 'Pike: the COMBINED statement of the same -2 (Block or Deflect). The per-reaction key wins when present; the two are never added (documented anti-double-count rule).'),
  opImpl('BlockCumulativePenalty', 'active-reaction-modifier', RR, 'BlockCumulativePenalty', 'Crossguard (JATM): each successive Block check takes a cumulative -2 instead of the normal -5. Changes only the INCREMENT its own weapon contributes to the existing Block / Deflect counter; the counter\'s owner is unchanged and earlier uses are never re-priced.'),
  opImpl('blockDeflectUseTheForceEquipmentBonus', 'active-reaction-modifier', RR, 'blockDeflectUseTheForceEquipmentBonus', 'Guard Shoto: +2 EQUIPMENT bonus on Use the Force checks made with Block or Deflect, for a proficient wielder; only the excess over the equipment bonus already applying counts (equipment bonuses do not stack).'),
  opImpl('adjacentReflexPenalty', 'passive-defense', RW, 'adjacentReflexPenalty', 'Dual-Phase (JATM): while the extended blade setting is in effect the wielder takes -2 Reflex Defense against attacks from ADJACENT targets. PASSIVE and attack-contextual: applied in the attack\'s target-side defense stage, never written to the actor.'),
  opImpl('cannotBeDisarmed', 'disarm-protection', RR, 'cannotBeDisarmed', 'Combat Gloves, Shockboxing Gloves, Stunning Gauntlet, Vibroknucklers: categorically immune to Disarm -- the disarm attack is refused before any roll or cost.'),
  opImpl('cannotBeDropped', 'disarm-protection', RR, 'cannotBeDropped', 'Same carriers: the combat-forced drop (Disarm) is refused. Voluntary dropping / unequipping is an inventory concern and is deliberately untouched.'),
  opImpl('disarmDefense', 'disarm-defense', RR, 'disarmDefense', 'DLT-20A Long Blaster: the defense a disarm attack is made against is Reflex Defense (CWCG).'),
  opImpl('disarmDefenseEquipmentBonus', 'disarm-defense', RR, 'disarmDefenseEquipmentBonus', 'DLT-20A: +1 EQUIPMENT bonus to Reflex Defense when the wielder is the target of a disarm attack (adds only the excess over an equipment bonus already applying).'),
  opImpl('forceImbuedLightsaberBlockEligible', 'reaction-eligibility', RR, 'forceImbuedLightsaberBlockEligible', 'Felucian Skullblade: "when imbued with Force energy it can block lightsaber strikes". Block eligibility only while imbued; the runtime has no Force-imbued weapon state, so the fact is a stored PROMPT per reaction and an unanswered fact is never read as false-by-default or true.', { dataNote: 'DATA_COMPLETENESS: no representation of a Force-imbued weapon state exists' }),
  opImpl('evasion', 'area-evasion', `${E}damage-packet-rules.js`, 'evasion', 'EMP Grenade: "half damage on a hit, none on a miss" is the existing area Evasion rule already executed by the damage-packet rules (Phase 5D-I-C-A target-class damage); classified here because the key sits in this family by name only.'),
  row('operation-key', 'forceImbuedWeaponState', '3b.operation.defense-and-reaction-interactions', 'reaction-eligibility', 'DATA_COMPLETENESS', { owner: 'final-certification', virtual: true, reason: 'The runtime (and the canonical schema) has no representation of a Force-imbued weapon state. Skullblade Block eligibility therefore asks the fact once per reaction (stored PROMPT); no default is assumed (a Force-sensitive wielder is never read as imbued). A persistent imbued state needs a source-backed model.' }),
  opImpl('mayUseBlockAsLightsaber', 'reaction-eligibility', RR, 'mayUseBlockAsLightsaber', 'San-Ni Staff (JATM): can be used with Block as though it were a lightsaber. Block eligibility only: it is not a lightsaber for any other mechanic and does not gain Deflect / Redirect Shot.'),
  opDup('rapidStrikeAttackPenaltyWaived', 'attack-side-waiver', 'abilityInteractions[].relation = REMOVE_RAPID_STRIKE_ATTACK_PENALTY', `${S}special-mechanics.js`, 'remove-rapid-strike-penalty', VERIFY.rapidStrike,
    'Shyarn / Zhaboka (KotOR CG): no attack penalty when using Rapid Strike. ATTACK-SIDE, trapped in this family by name only: the structured carrier is the weapon\'s REMOVE_RAPID_STRIKE_ATTACK_PENALTY ability interaction, already consumed by the attack-stage multi-attack consumer (no Rapid Strike math in the reaction engine).'),
  opNon('returnToHand', 'return-not-base-quality', 'DESCRIPTIVE', VERIFY.returnNotBase,
    'Discblade: the value states "external-Zeison-Sha-Force-technique-not-base-quality" -- a certified NEGATIVE statement that return is not a property of the weapon (a trained Zeison Sha uses the Force; Recall Discblade is talent-corpus work). It must not become unconditional Discblade return, so it is not executable; the Darkstick return is a different, weapon-native rule.'),
  opNon('standaloneDefenseBonus', 'null-defense-bonus', 'DESCRIPTIVE', VERIFY.nullDefense,
    'Short Sword: value null -- "useful for deflecting melee attacks but grants no standalone numerical defense bonus". No mechanical value exists to execute; none is invented.'),
  row('ability-compatibility', 'lightsaberTalentCompatibility', '3b.operation.ability-compatibility', 'reaction-eligibility', 'IMPLEMENTED', { consumer: { file: RR, probe: 'lightsaberTalentCompatibility' }, reason: 'Sith Sword (Threats of the Galaxy): a proficient wielder can treat it as a lightsaber for Block, Deflect and Redirect Shot. Reaction ELIGIBILITY only (requires canonical proficiency): the weapon stays a Sith Sword, gains no lightsaber group / proficiency / Item, and inherits no modifier.' }),
  row('ability-compatibility', 'lightsaberTalentCompatibility.dependentTalents', '3b.operation.ability-compatibility', 'reaction-eligibility', 'DEFERRED_TO_I_D', { owner: 'I-D', virtual: true, reason: '"...and talents that use those abilities as prerequisites": the corpus carries no structured list of those dependent talents (talent canonical corpus). Recorded as an unstructured part of the declaration; no talent is guessed.' }),
  row('operation-key', 'returnOnAttackExceedsReflexBy', '3b.operation.attack-modifiers-and-penalties', 'weapon-native-return', 'IMPLEMENTED', { consumer: { file: `${S}special-mechanics.js`, probe: 'returnOnAttackExceedsReflexBy' }, reason: 'Darkstick (Galaxy at War): a THROWN attack that exceeds Reflex Defense by 5 or more returns to the wielder\'s hand. Weapon-native: no feat, no reaction. Executed as a recovery record at Apply; the owned weapon is neither removed nor consumed (no item-location model).', virtual: false }),
  row('operation-key', 'returnToHand.recallDiscblade', '3b.operation.defense-and-reaction-interactions', 'external-recall-technique', 'DEFERRED_TO_I_D', { owner: 'I-D', virtual: true, reason: 'Recall Discblade / Distant Discblade Throw / Discblade Arc are Zeison Sha talent mechanics with no canonical talent identities (the four remaining talent-corpus relations stay deferred). Returning Bug is a separate FEAT for razor / thud bugs and is not inferred from any weapon flag.' }),

  // ---- special mechanics (5D-E census) ---------------------------------------------------------------------------------------------------------------
  mImpl('lightsaber-chassis-crossguard', 'conditional-0', 'reaction-modifier', 'cumulative-block-increment', RR, 'cumulativeIncrement', 'Crossguard profile mirror of BlockCumulativePenalty (successive Block checks -2 instead of -5): classified and verified equal to the operation field; the operation field is the one executed.', VERIFY.mirror('lightsaber-chassis-crossguard', 'Block', 'cumulative', 1)),
  mImpl('lightsaber-chassis-crossguard', 'conditional-1', 'reaction-modifier', 'deflect-penalty', RR, 'DeflectPenalty', 'Crossguard profile mirror of DeflectPenalty (all Deflect checks -2): verified equal to the operation field.', VERIFY.mirror('lightsaber-chassis-crossguard', 'Deflect', 'DeflectPenalty', 1)),
  mImpl('lightsaber-chassis-pike', 'conditional-0', 'reaction-modifier', 'block-penalty', RR, 'BlockPenalty', 'Pike profile mirror of BlockPenalty (all Block checks -2, flat): verified equal.', VERIFY.mirror('lightsaber-chassis-pike', 'Block', 'BlockPenalty', 1)),
  mImpl('lightsaber-chassis-pike', 'conditional-1', 'reaction-modifier', 'deflect-penalty', RR, 'DeflectPenalty', 'Pike profile mirror of DeflectPenalty (all Deflect checks -2, flat): verified equal.', VERIFY.mirror('lightsaber-chassis-pike', 'Deflect', 'DeflectPenalty', 1)),
  mImpl('lightsaber-chassis-dual-phase', 'conditional-0', 'passive-defense', 'adjacent-reflex-penalty', RW, 'passiveDefenseAdjustment', 'Dual-Phase extended-profile mirror of the adjacent-attacker Reflex penalty: verified equal to the operation field and the certified mode profile.', VERIFY.dualPhase),
  mImpl('unmapped::Darkstick', 'return-on-attack-exceeds-reflex', 'return-recovery', 'weapon-native-return', SE, 'weapon-recovery', 'Darkstick thrown form: return when the attack exceeds Reflex Defense by 5 or more (exactly +5 qualifies; the melee form never returns).'),

  // ---- relations ---------------------------------------------------------------------------------------------------------------------------------------
  row('relation', 'POSITIVE_WEAPON_MODIFIER', 'ability-relation', 'reaction-selector', 'IMPLEMENTED', { consumer: { file: RR, probe: 'POSITIVE_WEAPON_MODIFIER' }, reason: '3 instances (Crossguard Block, Guard Shoto Block and Deflect): the SELECTOR naming which reaction an operation number belongs to. The numeric rule is executed once from the operation field; the relation never executes a second copy.' }),
  row('relation', 'NEGATIVE_WEAPON_MODIFIER', 'ability-relation', 'reaction-selector', 'IMPLEMENTED', { consumer: { file: RR, probe: 'NEGATIVE_WEAPON_MODIFIER' }, reason: '3 instances (Crossguard Deflect, Pike Block and Deflect): same selector role as the positive relation.' }),
]);

export const I_C_C_BASELINE = Object.freeze({ UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER: 88, RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER: 115, UNIQUE_OPERATION_MECHANIC_FAMILIES_WITHOUT_CONSUMER: 12, EXECUTABLE_FORM_MECHANICS_DEFERRED: 10, SPECIAL_DEFER_I_C_C: 7, SPECIAL_DEFER_I_D: 3, EXECUTABLE_RELATION_FAMILIES_DEFERRED: 6, DEFENSE_REACTION_UNCONSUMED_KEYS: 12, FULLY_CONSUMED_EXECUTION_FIELD_FAMILIES: 36, PARTIAL_EXECUTION_FIELD_FAMILIES: 13, UNCONSUMED_EXECUTION_FIELD_FAMILIES: 8 });
