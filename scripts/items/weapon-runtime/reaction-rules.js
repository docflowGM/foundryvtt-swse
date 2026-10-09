// Phase 5D-I-C-C -- declarative weapon REACTION / DEFENSE contract (Block / Deflect / Redirect Shot eligibility and modifiers, passive contextual defense,
// Disarm protections). "Weapons declare what they are. Abilities declare what they apply to."
// Everything here is PURE and reads STRUCTURED fields of the canonical record only (operation keys, abilityInteractions relations, selectors.group,
// modeProfiles) -- never a weapon name, a description or chat text. Two distinctions this module exists to protect:
//   * ELIGIBILITY ("can this weapon be used for Block / Deflect / Redirect Shot?") is separate from MODIFIER ("what changes on the Use the Force check?").
//     A modifier never grants a reaction; an eligibility declaration never implies a number.
//   * PASSIVE defense (a Reflex penalty that exists before any attack outcome) is separate from ACTIVE reaction modifiers (the Use the Force check).
// Relations (POSITIVE_WEAPON_MODIFIER / NEGATIVE_WEAPON_MODIFIER) are the SELECTOR / provenance that names which reaction a numeric operation field
// belongs to; the numeric rule lives in the operation field ONCE (never executed from both).

const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const slug = (s) => String(s ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const REACTIONS = Object.freeze(['block', 'deflect', 'redirect-shot']);
const reactionOf = (name) => { const s = slug(name); return REACTIONS.find((r) => r === s) ?? null; };

/** the normal cumulative Block / Deflect penalty per previous use in the round (Core) */
export const NORMAL_CUMULATIVE_INCREMENT = 5;

/**
 * Build the reaction declaration of a canonical weapon record.
 * @param {{identityKey?:string, operation?:object, abilityInteractions?:object[], selectors?:object, canonicalStats?:object}} record  registry identity
 */
export function reactionDeclarationOf(record = {}) {
  const op = record.operation ?? {};
  const relations = {};
  for (const a of asArray(record.abilityInteractions)) {
    const reaction = reactionOf(a?.ability);
    if (reaction && (a.relation === 'POSITIVE_WEAPON_MODIFIER' || a.relation === 'NEGATIVE_WEAPON_MODIFIER')) relations[reaction] = a.relation;
  }
  const num = (v) => (Number.isFinite(Number(v)) && v !== null ? Number(v) : null);

  // --- eligibility -------------------------------------------------------------------------------------------------------------------------------
  const compat = op.lightsaberTalentCompatibility ?? null;
  const treatAs = asArray(compat?.treatAsLightsaberFor).map(reactionOf).filter(Boolean);
  const eligibility = {
    lightsaberGroup: record.selectors?.group === 'weapon-group:lightsaber',
    treatAsLightsaberFor: [...new Set(treatAs)],
    // "talents that use those abilities as prerequisites" has no structured list of talents (talent corpus): recorded, never guessed
    dependentTalentsUnstructured: asArray(compat?.treatAsLightsaberFor).some((x) => !reactionOf(x)),
    requiresProficiency: compat?.requiresProficiency === true,
    mayUseBlockAsLightsaber: op.mayUseBlockAsLightsaber === true,
    forceImbuedBlock: op.forceImbuedLightsaberBlockEligible === true,
  };

  // --- active reaction modifiers (the Use the Force check) ----------------------------------------------------------------------------------------
  // `blockDeflectUseTheForcePenalty` is the COMBINED statement of the same penalty the per-reaction keys repeat (Pike: one -2 penalty on checks made with
  // Block or Deflect); the per-reaction key wins when present and the two are NEVER added.
  const combined = num(op.blockDeflectUseTheForcePenalty);
  const equip = num(op.blockDeflectUseTheForceEquipmentBonus);
  const modifiers = {
    block: { flat: num(op.BlockPenalty) ?? combined, cumulativeIncrement: num(op.BlockCumulativePenalty) !== null ? Math.abs(num(op.BlockCumulativePenalty)) : null, equipmentBonus: equip },
    deflect: { flat: num(op.DeflectPenalty) ?? combined, cumulativeIncrement: null, equipmentBonus: equip },
  };
  // a modifier applies to a reaction only when the weapon's relation names that reaction (relation = selector, operation field = numeric authority)
  const gated = {};
  for (const r of ['block', 'deflect']) {
    const m = modifiers[r];
    const has = [m.flat, m.cumulativeIncrement, m.equipmentBonus].some((x) => x !== null);
    gated[r] = has && relations[r] ? m : { flat: null, cumulativeIncrement: null, equipmentBonus: null };
  }

  // --- passive contextual defense (Dual-Phase): per persistent setting, from the certified mode profiles --------------------------------------------
  const passive = [];
  for (const m of asArray(record.canonicalStats?.modeProfiles)) {
    if (num(m?.adjacentReflexPenalty) !== null && m.attackProfileId) passive.push({ settingProfile: m.attackProfileId, adjacentReflexPenalty: num(m.adjacentReflexPenalty) });
  }

  // --- disarm protections --------------------------------------------------------------------------------------------------------------------------
  const disarm = {
    cannotBeDisarmed: op.cannotBeDisarmed === true,
    cannotBeDropped: op.cannotBeDropped === true,
    defense: typeof op.disarmDefense === 'string' ? slug(op.disarmDefense).replace(/-defense$/, '') : null,
    equipmentBonus: num(op.disarmDefenseEquipmentBonus),
  };

  const any = eligibility.lightsaberGroup || eligibility.treatAsLightsaberFor.length || eligibility.mayUseBlockAsLightsaber || eligibility.forceImbuedBlock
    || Object.values(gated).some((m) => Object.values(m).some((x) => x !== null)) || passive.length || disarm.cannotBeDisarmed || disarm.cannotBeDropped || disarm.equipmentBonus !== null;
  return any ? Object.freeze({ identityKey: record.identityKey ?? null, relations: Object.freeze(relations), eligibility: Object.freeze(eligibility), modifiers: Object.freeze(gated), passive: Object.freeze(passive), disarm: Object.freeze(disarm) }) : null;
}

/**
 * ELIGIBILITY only: can this weapon be the reaction weapon for `reaction`?
 * @returns {{eligible:true|false|null, via:string|null, needs?:string}} null = a fact is not observed (proficiency / imbued): the caller asks or surfaces it
 */
export function reactionEligibility(declaration, reaction, { proficient = null, imbued = null } = {}) {
  const r = reactionOf(reaction);
  if (!declaration || !r) return { eligible: false, via: null };
  const e = declaration.eligibility;
  if (e.lightsaberGroup) return { eligible: true, via: 'lightsaber-group' };
  if (e.treatAsLightsaberFor.includes(r)) {
    if (e.requiresProficiency && proficient !== true) return proficient === false ? { eligible: false, via: 'treat-as-lightsaber', needs: 'proficiency' } : { eligible: null, via: 'treat-as-lightsaber', needs: 'proficiency' };
    return { eligible: true, via: 'treat-as-lightsaber' };
  }
  if (r === 'block' && e.mayUseBlockAsLightsaber) return { eligible: true, via: 'may-use-block-as-lightsaber' };
  if (r === 'block' && e.forceImbuedBlock) return imbued === true ? { eligible: true, via: 'force-imbued' } : imbued === false ? { eligible: false, via: 'force-imbued', needs: 'imbued' } : { eligible: null, via: 'force-imbued', needs: 'imbued' };
  return { eligible: false, via: null };
}

/**
 * MODIFIER only: what the selected weapon changes on the Use the Force check of ONE reaction. Grants nothing.
 * @param {{proficient?:boolean|null, existingEquipmentBonus?:number}} ctx  equipment bonuses of one kind do not stack: the weapon adds only what exceeds the best equipment bonus already applying
 * @returns {{flat:number, equipmentBonus:number, increment:number, notes:string[]}}
 */
export function reactionModifiers(declaration, reaction, { proficient = null, existingEquipmentBonus = 0 } = {}) {
  const r = reactionOf(reaction);
  const out = { flat: 0, equipmentBonus: 0, increment: NORMAL_CUMULATIVE_INCREMENT, notes: [] };
  const m = declaration?.modifiers?.[r];
  if (!m) return out;
  if (m.flat !== null) { out.flat = m.flat; out.notes.push(`weapon ${m.flat >= 0 ? '+' : ''}${m.flat} on ${r} Use the Force checks`); }
  if (r === 'block' && m.cumulativeIncrement !== null) { out.increment = m.cumulativeIncrement; out.notes.push(`cumulative penalty per successive check is ${m.cumulativeIncrement} instead of ${NORMAL_CUMULATIVE_INCREMENT}`); }
  if (m.equipmentBonus !== null && proficient === true) {
    out.equipmentBonus = Math.max(0, m.equipmentBonus - Math.max(0, Number(existingEquipmentBonus) || 0));
    out.notes.push(`+${m.equipmentBonus} equipment bonus (proficient wielder)${out.equipmentBonus !== m.equipmentBonus ? `; ${out.equipmentBonus} counts after the equipment bonus already applying` : ''}`);
  }
  return out;
}

/** two candidate reaction weapons are "materially different" when any modifier or eligibility route differs for the reaction */
export function reactionSignature(declaration, reaction, ctx = {}) {
  const m = reactionModifiers(declaration, reaction, ctx);
  return JSON.stringify([m.flat, m.equipmentBonus, m.increment]);
}

/**
 * The reaction counter. The counter lives with the actor (existing `blockDeflectUseState`); each use records the INCREMENT its own weapon contributed, so a
 * weapon change between reactions never re-prices an earlier one. A legacy record without increments is `uses` x the normal increment.
 */
export const accruedPenalty = (state) => {
  const inc = asArray(state?.increments).map(Number).filter(Number.isFinite);
  return inc.length ? inc.reduce((a, b) => a + b, 0) : (Math.max(0, Number(state?.uses ?? 0) || 0) * NORMAL_CUMULATIVE_INCREMENT);
};
export const withRecordedUse = (state, increment) => {
  const prior = asArray(state?.increments).length ? asArray(state.increments).map(Number) : Array.from({ length: Math.max(0, Number(state?.uses ?? 0) || 0) }, () => NORMAL_CUMULATIVE_INCREMENT);
  const increments = [...prior, Number(increment) || NORMAL_CUMULATIVE_INCREMENT];
  return { increments, uses: increments.length };
};
export const withCreditedBackUse = (state) => {
  const prior = asArray(state?.increments).length ? asArray(state.increments).map(Number) : Array.from({ length: Math.max(0, Number(state?.uses ?? 0) || 0) }, () => NORMAL_CUMULATIVE_INCREMENT);
  const increments = prior.slice(0, -1);
  return { increments, uses: increments.length };
};

/** PASSIVE: the Reflex Defense penalty a defender's weapon imposes against an ADJACENT attacker while its persistent setting is in effect (null adjacency = unobserved) */
export function adjacentReflexPenalty(declaration, { settingProfile = null, attackerAdjacent = null } = {}) {
  if (!declaration?.passive?.length) return { penalty: 0, applies: false };
  const p = declaration.passive.find((x) => x.settingProfile === settingProfile);
  if (!p) return { penalty: 0, applies: false };
  if (attackerAdjacent === null || attackerAdjacent === undefined) return { penalty: 0, applies: null, pending: p.adjacentReflexPenalty };
  return attackerAdjacent === true ? { penalty: p.adjacentReflexPenalty, applies: true } : { penalty: 0, applies: false };
}

/** DISARM legality of the held item: categorical immunity (cannot be disarmed / dropped) and the defense bonus against a disarm attack */
export function disarmProtection(declaration) {
  const d = declaration?.disarm;
  if (!d) return { immune: false, defenseBonus: 0, defense: 'reflex' };
  return { immune: d.cannotBeDisarmed === true || d.cannotBeDropped === true, immuneReason: d.cannotBeDisarmed ? 'cannot-be-disarmed' : d.cannotBeDropped ? 'cannot-be-dropped' : null, defenseBonus: d.equipmentBonus ?? 0, defense: d.defense ?? 'reflex', bonusType: 'equipment' };
}
