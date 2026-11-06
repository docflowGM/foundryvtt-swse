/**
 * Gravity well projector runtime: the interdiction fields on a scene and their effect on a ship at the start of its turn.
 *
 *  - Attack: the ordinary vehicle attack pipeline (rollAttack) against a synthetic Reflex 10 area target; the range band is the shared range
 *    authority's. This service only runs AFTER a hit (createFromHit), exactly as the tractor adapter does.
 *  - Persistence: the Scene carries the fields (flags.swse.interdictionFields). There is no scene-state authority in the system (ActorEngine
 *    governs Actors and their Items), so this file is the single writer of that one flag, GM-only. Fields stay active until a GM deactivates
 *    or removes them (V-P6C-14, a project convention -- the source prints no duration).
 *  - Effect: at the start of an affected ship's turn (the existing combat turn hook calls applyAtTurnStart) the ship receives ONE ActiveEffect,
 *    through ActorEngine.createActiveEffects with the shared effect lifecycle, that lasts until the end of that turn. isHyperdriveInterdicted()
 *    is the query any hyperdrive activation must consult (the system has no activation action yet).
 */
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { EffectIntentEngine } from "/systems/foundryvtt-swse/scripts/dialogs/entity-dialog/effect-intent-engine.js";
import { readSceneMap, putSceneRecord, deleteSceneRecord, withSceneLock, tokenOnScene, sceneGridSize } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-scene-state.js";
import { INTERDICTION_FLAG, FIELD_REASONS, INTERDICTED_FLAG, isHyperdriveInterdicted, buildField, validateArea, areaBox, fieldCoversToken, isValidField } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-interdiction-field.js";

export { INTERDICTED_FLAG, isHyperdriveInterdicted };
const refuse = (reason, extra = {}) => ({ ok: false, reason, ...extra });
const gridSizeOf = sceneGridSize;
const isGM = user => user?.isGM === true;

export const readFields = scene => readSceneMap(scene, INTERDICTION_FLAG, isValidField);

/** A target the vehicle attack pipeline can measure and roll against: the chosen 4x4 area, Reflex Defense 10 (printed). */
export function interdictionAreaTarget(area, scene) {
  const box = areaBox(area, gridSizeOf(scene));
  return { id: 'interdiction-area', type: 'vehicle', name: 'Interdiction area', items: [], system: { size: 'colossal', defenses: { reflex: { total: 10 } } },
    getActiveTokens: () => [{ center: box.center, document: { x: box.x, y: box.y, width: box.width, height: box.height } }] };
}

/** After a HIT: record the field. @returns {Promise<{ok:true, field}|{ok:false, reason}>} */
export async function createFromHit({ vehicle, weapon, authority, area, scene = globalThis.canvas?.scene ?? null, scale = null, attackTotal = null, user = globalThis.game?.user ?? null } = {}) {
  if (authority?.gravityWell !== true) return refuse(FIELD_REASONS.NOT_A_GRAVITY_WELL);
  if (scale !== 'starship') return refuse(FIELD_REASONS.NOT_STARSHIP_SCALE);
  if (!scene?.id) return refuse(FIELD_REASONS.NO_SCENE);
  if (!validateArea(area).ok) return refuse(FIELD_REASONS.AREA_INVALID);
  if (!isGM(user)) return refuse(FIELD_REASONS.GM_ONLY);
  return withSceneLock(scene, INTERDICTION_FLAG, async () => {
    if (readFields(scene).some(f => f.active && f.vehicleId === vehicle?.id && f.area.col === area.col && f.area.row === area.row)) return refuse(FIELD_REASONS.DUPLICATE);
    const field = buildField({ id: globalThis.foundry?.utils?.randomID?.() ?? `gw-${Date.now()}`, sceneId: scene.id, vehicleId: vehicle?.id ?? null, weaponId: weapon?.id ?? null, area, by: user?.id ?? null, attackTotal });
    await putSceneRecord(scene, INTERDICTION_FLAG, field);
    return { ok: true, field };
  });
}

export async function setActive({ scene, fieldId, active, user = globalThis.game?.user ?? null } = {}) {
  if (!isGM(user)) return refuse(FIELD_REASONS.GM_ONLY);
  return withSceneLock(scene, INTERDICTION_FLAG, async () => {
    const f = readFields(scene).find(x => x.id === fieldId);
    if (!f) return refuse(FIELD_REASONS.NOT_FOUND);
    await putSceneRecord(scene, INTERDICTION_FLAG, { ...f, active: active === true });
    return { ok: true };
  });
}

export async function removeField({ scene, fieldId, user = globalThis.game?.user ?? null } = {}) {
  if (!isGM(user)) return refuse(FIELD_REASONS.GM_ONLY);
  return withSceneLock(scene, INTERDICTION_FLAG, async () => {
    if (!readFields(scene).some(x => x.id === fieldId)) return refuse(FIELD_REASONS.NOT_FOUND);
    await deleteSceneRecord(scene, INTERDICTION_FLAG, fieldId);
    return { ok: true };
  });
}



/**
 * The start of `actor`'s turn: if a starship stands in an ACTIVE field of this scene it is interdicted for that turn. Idempotent per
 * field + round + turn. @returns {Promise<{applied:string[], skipped:string[]}>}
 */
export async function applyAtTurnStart({ actor, scene = globalThis.canvas?.scene ?? null, combat = globalThis.game?.combat ?? null } = {}) {
  const out = { applied: [], skipped: [] };
  if (!actor || actor.type !== 'vehicle' || !scene?.id) return out;
  const token = tokenOnScene(actor, scene);
  if (!token) return out;
  const round = Number(combat?.round ?? 0), turn = Number(combat?.turn ?? -1);
  for (const f of readFields(scene)) {
    if (!f.active || !fieldCoversToken(f, token, gridSizeOf(scene))) continue;
    const already = Array.from(actor.effects ?? []).some(e => { const m = e?.flags?.swse?.[INTERDICTED_FLAG]; return m && m.fieldId === f.id && m.round === round && m.turn === turn; });
    if (already) { out.skipped.push(f.id); continue; }
    const data = EffectIntentEngine.stampLifecycle({
      name: 'Hyperspace interdiction', origin: f.vehicleId ? `Actor.${f.vehicleId}` : null,
      flags: { swse: { effectIntent: { duration: 'until-end-next-turn' }, [INTERDICTED_FLAG]: { fieldId: f.id, round, turn, note: 'Started its turn in a hyperspace interdiction field: may not activate its hyperdrive this turn.' } } }
    }, { actor, combat, turnOwnerActorId: actor.id, phase: 'end' });
    await ActorEngine.createActiveEffects(actor, [data], { source: 'vehicle-interdiction' });
    out.applied.push(f.id);
  }
  return out;
}
