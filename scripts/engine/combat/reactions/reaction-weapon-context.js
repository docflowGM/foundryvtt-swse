// Phase 5D-I-C-C -- the ONE reaction-weapon context.
// The existing reaction workflow (LightsaberTalentActions Block / Deflect / Redirect Shot, the attack pipeline's defense value, the Disarm maneuver) never
// looked at the weapon the reacting actor is actually holding. This module resolves it -- from the actor's OWNED, EQUIPPED canonical weapons at reaction time
// (no new state store; the persistent setting is the existing `flags.swse.fireState.settingProfile`) -- and answers, through the pure declaration of
// reaction-rules.js: which weapon is the reaction weapon (eligibility), what its modifiers are (active), which passive defense penalty it imposes, and whether
// the held item can be disarmed. It rolls nothing and posts nothing; the callers keep the existing roll / chat / counter authorities.
import { getSharedWeaponAuthorityRegistry, resolveCanonicalIdentity, resolveAttackWeaponRuntime, resolveCanonicalAttackProficiency } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js";
import { reactionDeclarationOf, reactionEligibility, reactionModifiers, reactionSignature, adjacentReflexPenalty, disarmProtection } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/reaction-rules.js";
import { isItemEquipped } from "/systems/foundryvtt-swse/scripts/items/weapon-branch-resolver.js";
import { isItemActivated } from "/systems/foundryvtt-swse/scripts/engine/inventory/item-activation-state.js";
import { askSpecialQuestion } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/special-mechanics.js";
import { FireStateStore } from "/systems/foundryvtt-swse/scripts/engine/combat/fire-state-store.js";

const idOf = (a) => a?.id ?? a?._id ?? null;

/** the actor's equipped weapons that carry a canonical identity AND a reaction / defense declaration; `legacyCount` counts equipped weapons with no canonical identity */
export function equippedReactionWeapons(actor) {
  const registry = getSharedWeaponAuthorityRegistry();
  const out = [];
  let legacyCount = 0, canonicalCount = 0, stowedReactionCount = 0;
  for (const item of Array.from(actor?.items ?? [])) {
    if (item?.type !== 'weapon') continue;
    let id = null;
    try { id = registry ? resolveCanonicalIdentity(item, registry) : null; } catch (_err) { id = null; }
    if (!isItemEquipped(item, actor)) {
      // an owned but stowed canonical reaction weapon: the actor is not a legacy actor, it simply has nothing drawn
      if (id?.kind === 'canonical') {
        const e = reactionDeclarationOf(registry.getByIdentityKey(id.identityKey))?.eligibility;
        if (e && (e.lightsaberGroup || e.treatAsLightsaberFor.length || e.mayUseBlockAsLightsaber || e.forceImbuedBlock)) stowedReactionCount += 1;
      }
      continue;
    }
    if (!id || id.kind !== 'canonical') { legacyCount += 1; continue; }
    canonicalCount += 1;
    const record = registry.getByIdentityKey(id.identityKey);
    const declaration = reactionDeclarationOf(record);
    out.push({ item, identityKey: id.identityKey, record, declaration });
  }
  return { weapons: out, legacyCount, canonicalCount, stowedReactionCount };
}

function proficientWith(actor, item) {
  try {
    const runtime = resolveAttackWeaponRuntime(item, {});
    return resolveCanonicalAttackProficiency(runtime, actor).proficient === true;
  } catch (_err) { return null; }
}

const settingOf = (item) => { try { return FireStateStore.readFireState(item)?.settingProfile ?? null; } catch (_err) { return null; } };

/** best equipment bonus already applying to the actor's Use the Force checks (read from the derived modifier breakdown; 0 when it is not observable) */
export function existingEquipmentBonus(actor, target = 'skill.useTheForce') {
  try {
    const applied = actor?.system?.derived?.modifiers?.breakdown?.[target]?.applied ?? [];
    return applied.filter((m) => String(m?.type ?? m?.bonusType ?? '').toLowerCase() === 'equipment').reduce((best, m) => Math.max(best, Number(m?.value) || 0), 0);
  } catch (_err) { return 0; }
}

/**
 * Resolve the reaction weapon for ONE reaction.
 *   status 'legacy'    no canonical weapon equipped (or a legacy weapon is equipped alongside): the existing reaction path is unchanged
 *   status 'none'      canonical weapons are equipped but none is eligible for this reaction (and no legacy weapon could be): the caller refuses
 *   status 'selected'  exactly one reaction weapon (auto-selected, or chosen when several MATERIALLY different ones were legal)
 *   status 'choice'    several materially different legal weapons and nobody chose: nothing is picked silently
 * @param {{ask?:Function, choose?:(candidates:object[])=>Promise<object|null>}} io  `ask(id, question)` stores a yes/no fact for this reaction event
 */
export async function resolveReactionWeapon(actor, reaction, { ask = null, choose = null, answers = {} } = {}) {
  const { weapons, legacyCount, canonicalCount, stowedReactionCount } = equippedReactionWeapons(actor);
  if (!canonicalCount && !legacyCount && stowedReactionCount) return { status: 'none', reason: 'reaction-weapon-not-drawn', pending: [] };
  if (!canonicalCount) return { status: 'legacy', reason: 'no-canonical-weapon-equipped' };
  const candidates = [], pending = [];
  for (const w of weapons) {
    if (!w.declaration) continue;
    // an actual lightsaber must be drawn (equipped, above) AND ignited; a structured alternate reaction weapon (Sith Sword ...) keeps its own declaration as authority
    if (w.declaration.eligibility.lightsaberGroup && !isItemActivated(w.item)) continue;
    const proficient = w.declaration.eligibility.requiresProficiency || Object.values(w.declaration.modifiers).some((m) => m.equipmentBonus !== null) ? proficientWith(actor, w.item) : null;
    let imbued = null;
    if (w.declaration.eligibility.forceImbuedBlock && reaction === 'block') {
      const key = `imbued:${w.item.id}`;
      imbued = typeof answers[key] === 'boolean' ? answers[key] : null;
      if (imbued === null) {
        const fn = ask ?? (async (id, question) => askSpecialQuestion({ id, family: 'reaction-eligibility', question }));
        const ans = await fn(key, `Is ${w.item.name ?? 'the weapon'} currently imbued with Force energy? (it can Block only while imbued)`);
        if (ans === true || ans === false) { imbued = ans; answers[key] = ans; }
      }
    }
    const el = reactionEligibility(w.declaration, reaction, { proficient, imbued });
    if (el.eligible === true) candidates.push({ ...w, via: el.via, proficient });
    else if (el.eligible === null) pending.push({ item: w.item, needs: el.needs });
  }
  if (!candidates.length) {
    if (legacyCount) return { status: 'legacy', reason: 'a-legacy-weapon-is-equipped', pending };
    return { status: 'none', reason: pending.length ? 'eligibility-unresolved' : 'no-eligible-weapon', pending };
  }
  const bonus = existingEquipmentBonus(actor);
  const sig = (c) => reactionSignature(c.declaration, reaction, { proficient: c.proficient, existingEquipmentBonus: bonus });
  const distinct = new Set(candidates.map(sig));
  let picked = candidates[0];
  if (distinct.size > 1) {
    if (!choose) return { status: 'choice', candidates };
    picked = await choose(candidates);
    if (!picked) return { status: 'choice', candidates, cancelled: true };
  }
  return { status: 'selected', weapon: picked.item, identityKey: picked.identityKey, declaration: picked.declaration, via: picked.via, proficient: picked.proficient, settingProfile: settingOf(picked.item), existingEquipmentBonus: bonus };
}

/** the ACTIVE modifiers of the selected reaction weapon for this reaction (exactly one weapon: never the best of several) */
export function selectedReactionModifiers(selected, reaction) {
  if (selected?.status !== 'selected') return { flat: 0, equipmentBonus: 0, increment: 5, notes: [] };
  return reactionModifiers(selected.declaration, reaction, { proficient: selected.proficient, existingEquipmentBonus: selected.existingEquipmentBonus });
}

/**
 * PASSIVE contextual defense of a target: the Reflex penalty its held weapon imposes against an ADJACENT attacker (Dual-Phase, extended setting).
 * Attack-contextual: nothing is written to the target and its stored Reflex Defense is never changed. Several sources do not stack (the worst one applies).
 * @returns {{adjustment:number, applies:boolean|null, pending:number, sources:string[]}} applies null = adjacency was not observed
 */
export function passiveDefenseAdjustment(target, { defenseType = 'reflex', attackerAdjacent = null } = {}) {
  if (defenseType !== 'reflex') return { adjustment: 0, applies: false, pending: 0, sources: [] };
  const { weapons } = equippedReactionWeapons(target);
  let worst = 0, pending = 0, sawUnknown = false; const sources = [];
  for (const w of weapons) {
    const r = adjacentReflexPenalty(w.declaration, { settingProfile: settingOf(w.item), attackerAdjacent });
    if (r.applies === true) { worst = Math.min(worst, r.penalty); sources.push(w.identityKey); }
    else if (r.applies === null) { sawUnknown = true; pending = Math.min(pending, r.pending); }
  }
  return worst !== 0 ? { adjustment: worst, applies: true, pending: 0, sources } : sawUnknown ? { adjustment: 0, applies: null, pending, sources } : { adjustment: 0, applies: false, pending: 0, sources };
}

/**
 * DISARM: the target's held canonical weapons decide (1) categorical immunity (cannot be disarmed / dropped) and (2) a defense equipment bonus against the
 * disarm attack. The item actually being disarmed is `itemId` when the attack names it; otherwise a held weapon that would protect it is asked ONCE.
 * @returns {Promise<{refused:boolean, reason?:string, defenseBonus:number, unresolved:string[]}>}
 */
export async function resolveDisarmProtection(target, { itemId = null, ask = null } = {}) {
  const priorEquipment = Math.max(existingEquipmentBonus(target, 'defense.reflex'), existingEquipmentBonus(target, 'defenses.reflex'));
  const { weapons } = equippedReactionWeapons(target);
  const protectedItems = weapons.map((w) => ({ w, p: disarmProtection(w.declaration) })).filter((x) => x.p.immune || x.p.defenseBonus);
  if (!protectedItems.length) return { refused: false, defenseBonus: 0, unresolved: [] };
  const held = weapons.length;
  const unresolved = [];
  const aimedAt = async (x) => {
    if (itemId) return idOf(x.w.item) === itemId;
    if (held === 1) return true;
    const fn = ask ?? (async (id, question) => askSpecialQuestion({ id, family: 'disarm-target', question }));
    const ans = await fn(`disarm-target:${x.w.item.id}`, `Is the disarm attempt aimed at ${x.w.item.name ?? 'this weapon'}?`);
    if (ans === true || ans === false) return ans;
    unresolved.push(x.w.item.id);
    return false;
  };
  let defenseBonus = 0;
  for (const x of protectedItems) {
    if (!(await aimedAt(x))) continue;
    if (x.p.immune) return { refused: true, reason: x.p.immuneReason, itemId: idOf(x.w.item), defenseBonus: 0, unresolved };
    // equipment bonuses of one kind do not stack with each other: the best one against this disarm applies
    defenseBonus = Math.max(defenseBonus, x.p.defenseBonus);
  }
  // an equipment bonus to Reflex Defense that already applies is not added to: only the excess counts
  return { refused: false, defenseBonus: Math.max(0, defenseBonus - priorEquipment), unresolved };
}

/** is this owned weapon a canonical lightsaber-group weapon? true / false for a canonical weapon (structured group), null for a legacy weapon (the caller keeps its legacy test) */
export function canonicalLightsaberGroupOf(item) {
  const registry = getSharedWeaponAuthorityRegistry();
  if (!registry) return null;
  try {
    const id = resolveCanonicalIdentity(item, registry);
    if (id.kind !== 'canonical') return null;
    return registry.getByIdentityKey(id.identityKey)?.selectors?.group === 'weapon-group:lightsaber';
  } catch (_err) { return null; }
}
