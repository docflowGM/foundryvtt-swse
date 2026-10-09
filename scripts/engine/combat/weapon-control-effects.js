// Phase 5D-I-C-B -- execution of canonical WEAPON CONTROL (grab / grapple / restrain / net / snare / tractor / hurl).
// This is NOT a grapple engine and keeps no state of its own. The grabbed / grappled / pinned state, its legality, escape and release stay with
// GrappleStateEngine + SWSEGrappling; a weapon control is a CONTROL RECORD (control-rules.controlRecord) carried on the very ActiveEffect that is that
// state, so the record ends exactly when the state ends. This module only
//   * turns a `weapon-control` special record (evaluated at attack time, applied at Apply Damage / Apply Effects) into that state through
//     GrappleStateEngine.advancePair, after the declared size / range gates;
//   * runs the control-bound recurring effects at turn boundaries through the existing combat turn hook (idempotent per control + effect + turn slot);
//   * exposes the control actions (swift shock, tractor move / hurl, release) and the uniform escape-options query;
//   * ends controls cleanly when their source weapon, controller or target disappears.
// Damage is dealt through ActorEngine.applyDamage and condition-track moves through CombatTargetEffectAdapter -- the same engines as every other effect.
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { GrappleStateEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/grapple-state-engine.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { CombatTargetEffectAdapter } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-target-effect-adapter.js";
import { abilityKeysOfActor } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/ability-selector.js";
import { controlRecord, controlDeclarationOf, sizeGate, rangeGate, dueRecurring, recurringEventId, maneuverLegality, CONTROL_END_REASONS } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/control-rules.js";
import { statusEffectData, hasWeaponEffect } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/outcome-effects.js";
import { fallingObjectDamage } from "/systems/foundryvtt-swse/scripts/engine/combat/falling-object-rules.js";

const sizeOf = (actor) => String(actor?.system?.size ?? actor?.system?.derived?.size ?? '').trim().toLowerCase() || null;
const idOf = (a) => a?.id ?? a?._id ?? null;
const PROCESSED_CAP = 12;

async function rollTotal(formula) {
  const r = await RollEngine.safeRoll(String(formula));
  return Math.max(0, Number(r?.total) || 0);
}

function currentSlot(combat) {
  const c = combat ?? globalThis.game?.combat ?? null;
  return { round: Number(c?.round ?? 0), turn: Number(c?.turn ?? -1) };
}

// ------------------------------------------------------------------------------------------------------------------------------------------------
// queries
// ------------------------------------------------------------------------------------------------------------------------------------------------

/** the live weapon control records the controller currently holds (read from the held targets' state effects; no second store) */
export function controlsHeldBy(controller, actors) {
  const out = [];
  for (const a of actors ?? []) {
    for (const { effect, control, state } of GrappleStateEngine.getControlRecords(a, { controllerId: idOf(controller), targetId: idOf(a) })) out.push({ target: a, effect, control, state });
  }
  return out;
}

/** every actor a world / scene / combat query can reach (injected in tests) */
export function reachableActors() {
  const g = globalThis.game;
  const seen = new Map();
  const add = (a) => { if (a && idOf(a) && !seen.has(idOf(a))) seen.set(idOf(a), a); };
  for (const c of Array.from(g?.combat?.combatants ?? [])) add(c?.actor);
  for (const t of Array.from(g?.scenes?.viewed?.tokens ?? [])) add(t?.actor);
  for (const a of Array.from(g?.actors ?? [])) add(a);
  return [...seen.values()];
}

/**
 * Weapon lock: a weapon whose control declares `lockWeapon` cannot attack anything but the target it holds (Shock Whip "while the whip is grabbing a
 * target, it cannot attack other targets"). @returns {{locked:boolean, targetId?:string, controlId?:string}} for an intended attack on `intendedTargetId`
 */
export function weaponLockFor(controller, weapon, intendedTargetId, actors = reachableActors()) {
  for (const { target, control } of controlsHeldBy(controller, actors)) {
    if (!control.lockWeapon) continue;
    if (control.source?.weaponId && weapon?.id && control.source.weaponId !== weapon.id) continue;
    if (String(target.id) !== String(intendedTargetId ?? '')) return { locked: true, targetId: target.id, controlId: control.id };
  }
  return { locked: false };
}

/**
 * Uniform escape contract: what escape actions are legal for `escaper` right now. The opposed grapple escape is always legal (Core); a weapon control
 * adds its declared DC routes (Net / Snare: Acrobatics DC 15, Strength DC 20; Lightwhip: Acrobatics DC 15).
 */
export function escapeOptionsFor(escaper) {
  const held = GrappleStateEngine.getControlRecords(escaper, { targetId: idOf(escaper) });
  const options = [{ mode: 'grapple', label: 'Opposed grapple check' }];
  const seen = new Set();
  for (const { control } of held) {
    for (const r of control.escape ?? []) {
      const key = `${r.method}:${r.dc}`;
      if (seen.has(key)) continue;
      seen.add(key);
      options.push({ mode: r.method, dc: r.dc, label: `${r.method === 'acrobatics' ? 'Acrobatics' : 'Strength'} DC ${r.dc}`, controlId: control.id });
    }
  }
  return options;
}

/** is a grapple maneuver legal under the control the attacker holds over the defender? (null = no weapon control: the ordinary rules decide) */
export function controlManeuverLegality(attacker, defender, maneuver) {
  const rec = GrappleStateEngine.getControlRecords(defender, { controllerId: idOf(attacker) })[0]?.control;
  if (!rec) return { legal: null };
  return maneuverLegality({ maneuvers: rec.maneuvers }, maneuver);
}

/**
 * Pin / Trip entitlement of a weapon form (Amphistaff whip form): the maneuver is legal with the weapon WITHOUT owning the feat. No feat Item is
 * created -- the entitlement is the weapon declaration plus canonical proficiency. Returns the entitled maneuver list for the form, or [].
 */
export function entitlementOf(declaration, { profileId = null, proficient = false } = {}) {
  const e = declaration?.entitlement;
  if (!e) return [];
  if (e.profileIds?.length && profileId && !e.profileIds.includes(profileId)) return [];
  if (e.requiresProficientWielder && proficient !== true) return [];
  return [...e.maneuvers];
}

// ------------------------------------------------------------------------------------------------------------------------------------------------
// establishing control
// ------------------------------------------------------------------------------------------------------------------------------------------------

async function createStatus(target, attacker, built) {
  const { EffectIntentEngine } = await import('/systems/foundryvtt-swse/scripts/dialogs/entity-dialog/effect-intent-engine.js');
  const data = EffectIntentEngine.stampLifecycle(built.data, { actor: target, turnOwnerActorId: built.plan.turnOwnerActorId ?? null, phase: built.plan.phase ?? null });
  const created = await ActorEngine.createActiveEffects(target, [data], { source: 'weapon-control-effect' });
  return Array.isArray(created) ? created.length > 0 : !!created;
}

async function dealDamage(target, { amount, type, label, attacker, weapon, options = {} }) {
  const dmg = await ActorEngine.applyDamage(target, { amount, type, source: label, sourceActor: attacker, options: { weapon, damageType: type, weaponControl: true, ...options } });
  return { amount, applied: dmg?.applied ?? null, resolution: dmg?.resolution ?? null };
}

/**
 * Apply ONE `weapon-control` record (called by the rider stage with the same receipts / prompts as every other record).
 * @param {object} rec    the special record ({role, payload:{declaration,maneuver,attackTotal}, source})
 * @param {object} ctx    {target, attacker, weapon, message, weaponLabel, special, ask(id, question)->Promise<true|false|null>, bonusFor(attacker, weapon)}
 * @returns {Promise<{applied:boolean, reason?:string, result?:object}>}
 */
export async function applyWeaponControlRecord(rec, ctx) {
  const decl = rec?.payload?.declaration ?? null;
  const { target, attacker } = ctx;
  if (!decl || !target || !attacker) return { applied: false, reason: 'control-declaration-unavailable' };
  switch (rec.role) {
    case 'initiate': return initiateControl(rec, decl, ctx);
    case 'restraint': return applyRestraint(rec, decl, ctx);
    case 'tractor': return acquireTractor(rec, decl, ctx);
    case 'entitled-maneuver': return performEntitledManeuver(rec, decl, ctx);
    default: return { applied: false, reason: 'unsupported-control-role' };
  }
}

/** the control card: what the holder and the held creature can do now (control actions + the uniform escape options). Best effort: never blocks the control. */
export async function postControlCard({ controller, target, record, weapon = null }) {
  try {
    const { SWSEGrappling } = await import('/systems/foundryvtt-swse/scripts/combat/systems/grappling-system.js');
    const btn = (action, actor, other, label, attrs = {}) => SWSEGrappling._button(action, actor, other, label, { 'action-cost': 'free', ...attrs });
    const holder = [];
    if (record.shock) holder.push(btn('control-shock', controller, target, 'Shock (swift)', { 'weapon-id': weapon?.id ?? record.source?.weaponId, 'action-cost': 'swift' }));
    if (record.tractor) {
      holder.push(btn('control-move', controller, target, `Move up to ${record.tractor.moveSquares} squares`, { squares: record.tractor.moveSquares }));
      holder.push(btn('control-hurl', controller, target, `Hurl up to ${record.tractor.hurlSquares} squares`, { 'weapon-id': weapon?.id ?? record.source?.weaponId, squares: record.tractor.hurlSquares, 'action-cost': 'standard' }));
    }
    holder.push(btn('release', controller, target, 'Release'));
    const held = escapeOptionsFor(target).map((o) => btn('escape', target, controller, `Escape: ${o.label}`, { 'escape-mode': o.mode, 'action-cost': 'standard' }));
    const { createChatMessage } = await import('/systems/foundryvtt-swse/scripts/core/document-api-v13.js');
    await createChatMessage({ speaker: globalThis.ChatMessage?.getSpeaker?.({ actor: controller }) ?? {}, content: `<section class="swse-chat-card swse-weapon-control-card"><h3>${controller?.name ?? 'Wielder'} holds ${target?.name ?? 'the target'}</h3><div class="swse-chat-card__actions">${holder.join('\n')}${held.join('\n')}</div></section>` });
  } catch (_err) { /* the control itself is already in place */ }
}

const controlId = (rec, ctx) => `${ctx.message?.id ?? 'msg'}:${rec.id}:${ctx.target.id}`;

async function establish(decl, rec, ctx, state = 'grabbed', extra = {}) {
  const { target, attacker, weapon, special } = ctx;
  const record = controlRecord(decl, { id: controlId(rec, ctx), controllerId: idOf(attacker), targetId: idOf(target), state, weapon, profileId: rec.source?.profileId ?? null, workflowId: special?.workflowId ?? null, extra });
  const existing = GrappleStateEngine.getControlRecords(target, { controllerId: idOf(attacker) }).find((c) => c.control.id === record.id);
  if (existing) return { record: existing.control, reused: true };
  await GrappleStateEngine.advancePair(attacker, target, state, { control: record, actionId: 'weapon-control', workflowId: special?.workflowId ?? null });
  await postControlCard({ controller: attacker, target, record, weapon });
  return { record, reused: false };
}

async function initiateControl(rec, decl, ctx) {
  const { target, attacker, weapon, weaponLabel } = ctx;
  if (!decl.grab) return { applied: false, reason: 'no-grab-declared' };

  // optional follow-up grab (Shock Whip) / trip substitution: the wielder's choice, asked ONCE and stored
  if (decl.grab.optional) {
    const wantsTrip = decl.tripSubstitution && abilityKeysOfActor(attacker).includes(decl.tripSubstitution.requiresFeatKey)
      ? await ctx.ask?.(`trip:${rec.id}`, `${weaponLabel}: knock ${target.name ?? 'the target'} prone with the Trip feat instead of making the grab attack?`)
      : false;
    if (wantsTrip === true) return tripInstead(rec, decl, ctx);
    const wantsGrab = await ctx.ask?.(`grab:${rec.id}`, `${weaponLabel}: make the free grab attack against ${target.name ?? 'the target'}?`);
    if (wantsGrab !== true) return { applied: false, reason: wantsGrab === false ? 'grab-declined' : 'unresolved' };
  }

  // declared gates (generic): target size and ranged-grab range band; every gate refuses BEFORE any state is created
  if (decl.grab.maxSizeDelta != null) {
    const g = sizeGate({ controllerSize: sizeOf(attacker), targetSize: sizeOf(target), maxDelta: decl.grab.maxSizeDelta });
    if (!g.ok) return { applied: false, reason: g.reason };
  }
  if (decl.grab.maxBand) {
    const band = ctx.rangeBand ?? ctx.special?.rangeBand ?? null;
    const g = rangeGate(decl, band);
    if (!g.ok) return { applied: false, reason: g.reason };
  }

  // the second attack roll (Shock Whip): normal attack bonus, no grab penalty -- a miss ends the follow-up
  if (decl.grab.secondAttack) {
    const bonus = await ctx.bonusFor?.(attacker, weapon);
    const reflex = Number(target?.system?.derived?.defenses?.reflex?.total);
    if (!Number.isFinite(bonus) || !Number.isFinite(reflex)) return { applied: false, reason: 'second-attack-unobserved' };
    const total = await rollTotal(`1d20 + ${bonus}`);
    if (total < reflex) return { applied: false, reason: 'second-attack-missed', result: { total, reflex } };
  }

  const { record, reused } = await establish(decl, rec, ctx, 'grabbed');
  // the stun a successful grab deals (Snare 1d4 / 1d6, Electronet 3d8) is the weapon's OWN ordinary damage (native stun / payload damage): it is rolled and applied by
  // the normal Damage -> Apply Damage path of the same card, so the control never rolls it a second time
  return { applied: true, result: { controlId: record.id, state: 'grabbed', reused } };
}

async function tripInstead(rec, decl, ctx) {
  const { target, attacker, message, weaponLabel } = ctx;
  const recordKey = `${message?.id ?? 'msg'}:${rec.id}:trip:${target.id}`;
  if (hasWeaponEffect(target, recordKey)) return { applied: false, reason: 'effect-already-present' };
  const built = statusEffectData({ status: 'prone' }, { label: `${ctx.weaponLabel} (trip)`, source: rec.source, recordKey, messageId: message?.id ?? null, attackerId: idOf(attacker), targetId: idOf(target), attackerUuid: attacker?.uuid ?? null });
  if (!built.ok) return { applied: false, reason: built.reason };
  const ok = await createStatus(target, attacker, built);
  return ok ? { applied: true, result: { trip: true, status: 'prone', via: 'trip-substitution', featKey: decl.tripSubstitution.requiresFeatKey } } : { applied: false, reason: 'not-applied' };
}

async function applyRestraint(rec, decl, ctx) {
  const { target, attacker, message, weaponLabel, special } = ctx;
  const r = decl.restraint;
  const attackTotal = Number(rec.payload?.attackTotal ?? special?.attackTotal);
  if (!r || !Number.isFinite(attackTotal)) return { applied: false, reason: 'attack-roll-unobserved' };
  const recordKey = `${message?.id ?? 'msg'}:${rec.id}:restrain:${target.id}`;
  if (hasWeaponEffect(target, recordKey)) return { applied: false, reason: 'effect-already-present' };
  const bonus = await ctx.grappleBonusFor?.(target);
  if (!Number.isFinite(bonus)) return { applied: false, reason: 'grapple-bonus-unobserved' };
  const check = await rollTotal(`1d20 + ${bonus}`);
  const broke = r.comparison === 'equals-or-exceeds' ? check >= attackTotal : check > attackTotal;
  if (broke) return { applied: false, reason: 'check-succeeded', result: { check, against: attackTotal } };
  const rounds = Number(r.onFailure?.durationRounds);
  const built = statusEffectData({ status: r.onFailure.status, duration: { rounds } }, { label: `${weaponLabel} (restrained)`, source: rec.source, recordKey, messageId: message?.id ?? null, attackerId: idOf(attacker), targetId: idOf(target), attackerUuid: attacker?.uuid ?? null });
  if (!built.ok) return { applied: false, reason: built.reason };
  const ok = await createStatus(target, attacker, built);
  // equipment restraint only: the attacker is NOT grappling (attackerIsGrappling false) and no grab / grapple state is created
  return ok ? { applied: true, result: { check, against: attackTotal, status: r.onFailure.status, rounds, attackerIsGrappling: false } } : { applied: false, reason: 'not-applied' };
}

async function acquireTractor(rec, decl, ctx) {
  const { target, attacker } = ctx;
  const t = decl.tractor;
  if (!t) return { applied: false, reason: 'no-tractor-declared' };
  const g = sizeGate({ targetSize: sizeOf(target), maxSize: t.maxSize });
  if (!g.ok) return { applied: false, reason: g.reason };
  const a = await ctx.grappleBonusFor?.(attacker), d = await ctx.grappleBonusFor?.(target);
  if (!Number.isFinite(a) || !Number.isFinite(d)) return { applied: false, reason: 'grapple-bonus-unobserved' };
  const att = await rollTotal(`1d20 + ${a}`), def = await rollTotal(`1d20 + ${d}`);
  if (att < def) return { applied: false, reason: 'opposed-check-lost', result: { att, def } };
  const { record, reused } = await establish(decl, rec, ctx, 'grabbed', { tractor: { maxSize: t.maxSize, moveSquares: t.move.squares, hurlSquares: t.hurl.squares, moved: null } });
  return { applied: true, result: { controlId: record.id, state: 'grabbed', tractor: true, reused } };
}

async function performEntitledManeuver(rec, decl, ctx) {
  const { attacker, target, weapon } = ctx;
  const maneuver = rec.payload?.maneuver;
  const proficient = await ctx.proficientWith?.(attacker, weapon, rec.source?.profileId ?? null);
  const allowed = entitlementOf(decl, { profileId: rec.source?.profileId ?? null, proficient: proficient === true });
  if (!allowed.includes(maneuver)) return { applied: false, reason: 'not-entitled' };
  const { SWSEGrappling } = await import('/systems/foundryvtt-swse/scripts/combat/systems/grappling-system.js');
  const opts = { actionId: `weapon-${maneuver}`, skipLegalityConfirm: true, weaponEntitlement: { maneuvers: allowed, identityKey: decl.identityKey, profileId: rec.source?.profileId ?? null } };
  const res = maneuver === 'pin' ? await SWSEGrappling.attemptPin(attacker, target, opts) : await SWSEGrappling.tripGrappledOpponent(attacker, target, opts);
  return res ? { applied: true, result: { maneuver, entitled: true, outcome: res?.attackerWins ?? res?.pinned ?? null } } : { applied: false, reason: 'maneuver-not-performed' };
}

// ------------------------------------------------------------------------------------------------------------------------------------------------
// control actions
// ------------------------------------------------------------------------------------------------------------------------------------------------

async function patchControl(target, effect, patch) {
  const flag = effect?.flags?.swse?.grappleState;
  if (!flag?.control) return null;
  const control = { ...flag.control, ...patch };
  await ActorEngine.updateEmbeddedDocuments(target, 'ActiveEffect', [{ _id: effect.id, 'flags.swse.grappleState.control': control }], { render: false });
  return control;
}

/** End a control: its state effects are removed through the existing pair clear. `reason` is one of CONTROL_END_REASONS. */
export async function endControl(controller, target, reason, { quiet = true } = {}) {
  if (!CONTROL_END_REASONS.includes(reason)) throw new Error(`unknown control end reason ${reason}`);
  const records = GrappleStateEngine.getControlRecords(target, { controllerId: idOf(controller) });
  const cleared = await GrappleStateEngine.clearPair(controller, target, { quiet });
  return { ended: records.map((r) => r.control.id), reason, cleared: cleared.length };
}

/** Shock Whip: once per turn, swift action, automatic damage to the held target (no attack roll). The weapon remains locked to that target. */
export async function shockHeldTarget({ controller, target, weapon, combat = null, spendAction = null }) {
  const held = GrappleStateEngine.getControlRecords(target, { controllerId: idOf(controller), targetId: idOf(target) })
    .find((c) => c.control.source?.weaponId === weapon?.id && c.control.shock);
  if (!held) return { ok: false, reason: 'no-held-target-for-this-weapon' };
  const { control, effect } = held;
  const slot = currentSlot(combat);
  const key = `${slot.round}`;
  if (control.shock.lastRound === key) return { ok: false, reason: 'already-used-this-turn' };
  if (spendAction) { const paid = await spendAction(controller, 'swift'); if (paid?.allowed === false || paid?.permitted === false) return { ok: false, reason: 'swift-action-unavailable' }; }
  await patchControl(target, effect, { shock: { ...control.shock, lastRound: key } });
  const amount = await rollTotal(control.shock.formula);
  const out = await dealDamage(target, { amount, type: control.shock.damageType ?? 'energy', label: `${weapon?.name ?? 'Weapon'} (shock)`, attacker: controller, weapon, options: { weaponControlShock: control.id } });
  return { ok: true, damage: out };
}

/** Tractor Beam: move the held object up to the declared squares. Structured movement INTENT only (the token move itself is GM / player adjudicated). */
export async function moveTractoredObject({ controller, target, squares, direction = 'any' }) {
  const held = GrappleStateEngine.getControlRecords(target, { controllerId: idOf(controller) }).find((c) => c.control.tractor);
  if (!held) return { ok: false, reason: 'object-not-held' };
  const max = Number(held.control.tractor.moveSquares);
  if (!Number.isFinite(Number(squares)) || squares < 0 || squares > max) return { ok: false, reason: 'beyond-declared-movement' };
  const intent = { squares: Number(squares), direction, controlId: held.control.id };
  await patchControl(target, held.effect, { tractor: { ...held.control.tractor, moved: intent } });
  return { ok: true, intent };
}

/**
 * Tractor Beam hurl: a NEW ranged attack with the weapon vs Reflex, damage from the Core falling-object-by-size authority (never the beam's own damage).
 * Refuses (control retained) when the falling-object authority cannot supply the damage.
 */
export async function hurlTractoredObject({ controller, target, weapon, squares, attackBonus, fallingTable }) {
  const held = GrappleStateEngine.getControlRecords(target, { controllerId: idOf(controller) }).find((c) => c.control.tractor);
  if (!held) return { ok: false, reason: 'object-not-held' };
  if (!(squares >= 0 && squares <= Number(held.control.tractor.hurlSquares))) return { ok: false, reason: 'beyond-declared-hurl-range' };
  const fall = fallingObjectDamage(sizeOf(target), fallingTable ? { table: fallingTable } : undefined);
  if (!fall.ok) return { ok: false, reason: fall.reason };
  const reflex = Number(target?.system?.derived?.defenses?.reflex?.total);
  if (!Number.isFinite(Number(attackBonus)) || !Number.isFinite(reflex)) return { ok: false, reason: 'attack-unobserved' };
  const total = await rollTotal(`1d20 + ${attackBonus}`);
  const hit = total >= reflex;
  let damage = null;
  if (hit) {
    const amount = await rollTotal(fall.formula);
    damage = await dealDamage(target, { amount, type: 'bludgeoning', label: `${weapon?.name ?? 'Tractor Beam'} (hurled)`, attacker: controller, weapon, options: { hurledObject: { controlId: held.control.id, authority: fall.authority, size: fall.size, formula: fall.formula } } });
  }
  await endControl(controller, target, 'hurled');
  return { ok: true, hit, total, reflex, damage, provenance: { controlId: held.control.id, authority: fall.authority, size: fall.size, formula: fall.formula } };
}

// ------------------------------------------------------------------------------------------------------------------------------------------------
// turn boundary processing
// ------------------------------------------------------------------------------------------------------------------------------------------------

function weaponStillWielded(controller, control) {
  const id = control.source?.weaponId;
  if (!id) return true;
  const item = controller?.items?.get?.(id) ?? Array.from(controller?.items ?? []).find((i) => i.id === id);
  if (!item) return false;
  return item.system?.equipped !== false;
}

/**
 * Process the control-bound effects due at a turn boundary. Idempotent: each (control, recurring effect, round, actor, point) fires at most once -- the
 * slot is recorded on the control BEFORE the damage is dealt (a failure after that point never double-damages).
 * @param {{actors:Actor[], point:'start'|'end', actorId:string, combat?:object}} event  whose turn boundary it is
 * @returns {Promise<{fired:Array, ended:Array, skipped:Array}>}
 */
export async function processControlTurnEvent({ actors = reachableActors(), point, actorId, combat = null } = {}) {
  const fired = [], ended = [], skipped = [];
  const slot = currentSlot(combat);
  const byId = new Map(actors.map((a) => [String(idOf(a)), a]));
  for (const target of actors) {
    for (const { effect, control } of GrappleStateEngine.getControlRecords(target, { targetId: idOf(target) })) {
      const controller = byId.get(String(control.controllerId)) ?? null;
      // cleanup contract: a control whose controller or source weapon is gone ends -- it never keeps damaging
      if (!controller) { await GrappleStateEngine.clearState(target, { quiet: true }); ended.push({ id: control.id, reason: 'controller-removed' }); continue; }
      if (!weaponStillWielded(controller, control)) { await endControl(controller, target, 'weapon-removed'); ended.push({ id: control.id, reason: 'weapon-removed' }); continue; }

      // tractor maintenance: an opposed grapple check at the start of the controller's turn (loss releases the object)
      if (control.tractor && point === 'start' && String(actorId) === String(control.controllerId)) {
        const mkey = `${control.id}:maintain:${slot.round}:${actorId}`;
        if (!(control.processed ?? []).includes(mkey)) {
          const processed = [...(control.processed ?? []), mkey].slice(-PROCESSED_CAP);
          await patchControl(target, effect, { processed });
          control.processed = processed;
          const { SWSEGrappling } = await import('/systems/foundryvtt-swse/scripts/combat/systems/grappling-system.js');
          const a = await SWSEGrappling._rollGrappleBonus(controller, { mode: 'attackGrapple' }), d = await SWSEGrappling._rollGrappleBonus(target, { mode: 'resistGrapple' });
          const att = await rollTotal(`1d20 + ${a}`), def = await rollTotal(`1d20 + ${d}`);
          if (att < def) { await endControl(controller, target, 'maintenance-failed'); ended.push({ id: control.id, reason: 'maintenance-failed' }); continue; }
        }
      }

      for (const r of dueRecurring(control, { actorId, point })) {
        const eventId = recurringEventId(control, r.id, { round: slot.round, turn: String(actorId), point });
        if ((control.processed ?? []).includes(eventId)) { skipped.push({ id: r.id, reason: 'already-processed' }); continue; }
        const processed = [...(control.processed ?? []), eventId].slice(-PROCESSED_CAP);
        const patched = await patchControl(target, effect, { processed });
        if (patched) control.processed = processed;
        const weapon = controller.items?.get?.(control.source?.weaponId) ?? null;
        let formula = r.damage?.source === 'formula' ? r.damage.formula : r.damage?.baseFormula;
        if (!formula) { skipped.push({ id: r.id, reason: 'damage-formula-unavailable' }); continue; }
        const amount = await rollTotal(formula);
        const type = r.damage?.type ?? r.damage?.types?.[0] ?? 'untyped';
        // base weapon dice only (no Strength, half heroic level, or other modifiers): the formula is rolled raw, never composed
        const dmg = await dealDamage(target, { amount, type, label: `${weapon?.name ?? 'Weapon'} (${r.id})`, attacker: controller, weapon, options: { weaponControlRecurring: r.id, controlId: control.id, noDamageModifiers: true } });
        let ct = null;
        if (Number(r.conditionTrackSteps)) {
          ct = await CombatTargetEffectAdapter.applyFromAttackResult({ isHit: true, isCritical: false }, { attacker: controller, targetActor: target, sourceName: `${weapon?.name ?? 'Weapon'} (${r.id})`,
            effects: [{ type: 'move-target-condition-track', steps: Math.abs(r.conditionTrackSteps), direction: r.conditionTrackSteps < 0 ? 'down' : 'up', label: `${weapon?.name ?? 'Weapon'} (${r.id})` }] });
        }
        fired.push({ id: r.id, controlId: control.id, targetId: idOf(target), eventId, amount, type, ct });
      }
    }
  }
  return { fired, ended, skipped };
}

/**
 * Adapter for Foundry's combat turn hook. The repo's other turn consumers treat `combat.combatant` at `combatTurn` as the combatant whose turn is
 * STARTING; the combatant whose turn is ending is `combat.previous.combatantId` when Foundry supplies it. Idempotency keys make a double fire harmless.
 */
export async function handleControlTurnChange(combat, updateData = {}, _options = {}) {
  const incoming = (updateData?.turn != null ? combat?.turns?.[updateData.turn] : null) ?? combat?.combatant ?? null;
  const outgoingId = combat?.previous?.combatantId ?? null;
  const outgoing = outgoingId ? Array.from(combat?.combatants ?? []).find((c) => c.id === outgoingId) : null;
  const actors = reachableActors();
  const out = { end: null, start: null };
  if (outgoing?.actor) out.end = await processControlTurnEvent({ actors, point: 'end', actorId: idOf(outgoing.actor), combat });
  if (incoming?.actor) out.start = await processControlTurnEvent({ actors, point: 'start', actorId: idOf(incoming.actor), combat });
  return out;
}

export { controlDeclarationOf };
