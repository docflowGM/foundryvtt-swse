/**
 * Combat Loadout Preview -- a READ-ONLY projection of the existing attack / damage authorities for the weapons a character holds.
 *
 *   NORMAL attack bonus   computeFinalAttackComposition()   (attacks.js; the function the live attack dialog and the real roll share)
 *   owned grip / profile  previewAttackContext()             (attacks.js; resolveWielding over the owned fire-state the coordinator wrote)
 *   damage formula        composeWeaponDamage()              (damage.js; the function rollDamage() itself calls)
 *   min / max             boundsOfDiceExpression()           (a projection of that formula; nothing is rolled)
 *   posture / grip / occupancy   readCombatReadiness() -> describeWeaponReadiness()   (engine/equipment)
 *
 * It owns no rule, writes nothing (no actor, item or flag), caches nothing and never asks a question. "Normal attack" means the single, ordinary
 * attack with the weapon's currently selected profile: no target, cover, range, Power Attack, multiattack or other optional / situational choice.
 * Where the evidence needed for an exact answer is missing the preview says so (`status: 'variable' | 'unresolved'`) and shows no invented number.
 */
import { computeFinalAttackComposition, previewAttackContext } from '/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js';
import { composeWeaponDamage, npcStatblockFlatDamageFormula } from '/systems/foundryvtt-swse/scripts/combat/rolls/damage.js';
import { boundsOfDiceExpression } from '/systems/foundryvtt-swse/scripts/engine/combat/dice-expression-bounds.js';
import { readCombatReadiness, describeWeaponReadiness } from '/systems/foundryvtt-swse/scripts/engine/equipment/combat-readiness.js';
import { summarizeCombatWorkflowContext } from '/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-context-serializer.js';

export const PREVIEW_STATUS = Object.freeze({ ESTABLISHED: 'established', VARIABLE: 'variable', UNRESOLVED: 'unresolved' });
const asArray = (v) => (Array.isArray(v) ? v : []);
const nonZeroParts = (components) => Object.entries(components ?? {}).filter(([, v]) => Number(v) !== 0 && Number.isFinite(Number(v))).map(([label, value]) => ({ label, value: Number(value) }));

/**
 * @param {Actor} actor
 * @param {Item} weapon
 * @param {{readiness?:object}} [opts] readiness: an already-read readCombatReadiness(actor) (the workspace builder holds one)
 */
export async function buildWeaponLoadoutPreview(actor, weapon, { readiness = null } = {}) {
  const rd = readiness ?? (() => { try { return readCombatReadiness(actor); } catch { return null; } })();
  const r = rd ? describeWeaponReadiness(rd, weapon.id, null) : null;
  const base = {
    weaponId: weapon.id, name: weapon.name, profileId: null,
    effectivePosture: r?.effectivePosture ?? null, ready: r?.ready === true,
    grip: null, gripLabel: '', occupiedAppendageIds: asArray(r?.occupancy?.appendageIds),
    attackBonus: null, damageFormula: null, minimumDamage: null, maximumDamage: null, rawMinimumDamage: null,
    attackBreakdown: [], damageBreakdown: [], calculationStatus: PREVIEW_STATUS.UNRESOLVED, explanation: '', notes: []
  };
  const unresolved = (explanation) => ({ ...base, calculationStatus: PREVIEW_STATUS.UNRESOLVED, explanation });

  let ctx;
  try { ctx = previewAttackContext(actor, weapon); } catch (err) { return unresolved(`Weapon could not be read: ${err?.message ?? err}`); }
  if (!ctx.ok) return unresolved(`The selected attack form cannot be resolved (${ctx.error?.message ?? ctx.reason}).`);
  if (ctx.source !== 'canonical') return unresolved('This weapon has no certified canonical identity, so no attack can be previewed.');
  base.profileId = ctx.weaponForm?.profileId ?? null;
  const hands = ctx.wield?.hands ?? null;
  base.grip = hands ? (hands === 1 ? 'one-handed' : hands === 2 ? 'two-handed' : `${hands}-handed`) : null;
  base.gripLabel = hands ? (hands === 1 ? 'One-handed' : hands === 2 ? 'Two-handed' : `${hands}-handed`) : '';
  if (ctx.wield && ctx.wield.legal === false) return { ...unresolved(`Current grip is not legal for this weapon (${ctx.wield.reason ?? 'wielding'}).`), grip: base.grip, gripLabel: base.gripLabel, profileId: base.profileId };

  // ---- NORMAL attack: the production composition, no target / range / optional choices ----
  let attack;
  try { attack = await computeFinalAttackComposition(actor, weapon, {}); } catch (err) { return unresolved(`Attack could not be composed: ${err?.message ?? err}`); }
  if (!attack?.ok) return unresolved(`Attack could not be composed (${attack?.reason ?? 'unresolved'}).`);
  const out = { ...base, attackBonus: attack.atkBonus, attackBreakdown: nonZeroParts(attack.attackBonusResolution?.components) };

  // ---- damage: the formula rollDamage() itself would roll ----
  const flat = npcStatblockFlatDamageFormula(actor, weapon);
  let formula = null, damageBreakdown = [], noDamage = null, conditionalApplied = false;
  if (flat) { formula = flat; }
  else {
    const rollContext = { ...ctx.damageContext, target: null };
    const workflow = summarizeCombatWorkflowContext(rollContext, { actor, weapon });
    let composed;
    try { composed = composeWeaponDamage(actor, weapon, rollContext, workflow); } catch (err) { return { ...out, calculationStatus: PREVIEW_STATUS.UNRESOLVED, explanation: `Damage could not be composed: ${err?.message ?? err}` }; }
    if (composed.refusal) noDamage = composed.refusal.error?.message ?? composed.refusal.message ?? 'no ordinary damage';
    else {
      formula = composed.formula;
      const bc = composed.composition?.bonus?.components ?? {};
      damageBreakdown = [{ label: 'Weapon dice', value: String(composed.composition?.dice?.base ?? '') }, ...nonZeroParts(bc)].filter((p) => p.value !== '');
      conditionalApplied = Number(composed.composition?.dice?.conditionalFlat || 0) !== 0 || asArray(composed.composition?.dice?.conditionalDiceTerms).length > 0;
    }
  }
  if (noDamage) return { ...out, damageFormula: null, calculationStatus: PREVIEW_STATUS.ESTABLISHED, explanation: `No ordinary damage roll: ${noDamage}`, notes: ['no-ordinary-damage'] };

  const bounds = boundsOfDiceExpression(formula);
  const notes = [];
  let status = PREVIEW_STATUS.ESTABLISHED;
  let explanation = '';
  if (ctx.pendingFacts.length) { status = PREVIEW_STATUS.VARIABLE; explanation = `Context required: ${ctx.pendingFacts.join(', ')} (asked when the attack is made).`; }
  if (!bounds) { status = PREVIEW_STATUS.VARIABLE; explanation = explanation || 'Damage depends on a choice or effect the preview cannot resolve; the formula is shown without a numeric range.'; }
  if (ctx.conditionalDamageDeclared > 0 && !conditionalApplied) { status = PREVIEW_STATUS.VARIABLE; notes.push('conditional-damage'); explanation = explanation || 'This weapon adds damage only under conditions that are established during an attack; the range shown excludes it.'; }
  // minimum-1 on a confirmed weapon hit (three-gate W1, packet seam): the DISPLAYED minimum is the effective per-hit minimum, the raw formula minimum is kept
  const rawMin = bounds ? bounds.min : null;
  return {
    ...out, damageFormula: formula, damageBreakdown,
    rawMinimumDamage: rawMin,
    minimumDamage: bounds ? Math.max(1, bounds.min) : null,
    maximumDamage: bounds ? bounds.max : null,
    calculationStatus: status, explanation, notes
  };
}

/** Previews for every weapon the actor holds (an occupied appendage assignment), keyed by weapon id. Never throws. */
export async function buildLoadoutPreviews(actor, { readiness = null } = {}) {
  const out = new Map();
  let rd = readiness;
  if (!rd) { try { rd = readCombatReadiness(actor); } catch { return out; } }
  const held = new Set(asArray(rd?.state?.occupancy?.assignments).map((a) => a.itemId));
  for (const id of held) {
    const weapon = actor.items?.get?.(id);
    if (!weapon || !['weapon', 'lightsaber'].includes(String(weapon.type))) continue;
    try { out.set(id, await buildWeaponLoadoutPreview(actor, weapon, { readiness: rd })); } catch { /* a single unreadable weapon never breaks the sheet */ }
  }
  return out;
}

export default { buildWeaponLoadoutPreview, buildLoadoutPreviews, PREVIEW_STATUS };
