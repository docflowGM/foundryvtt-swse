/**
 * The ONE writer of vehicle-combat state that lives on a Scene (gravity-well interdiction fields, deployed space mines). The system has no
 * scene-state authority (ActorEngine governs Actors and their Items), so persistent scene objects are kept as id-keyed maps under
 * flags.swse.<flag> and every write goes through this file, which is GM-only (a player cannot update a Scene in Foundry).
 *
 * Writes are KEY-LEVEL (flags.swse.<flag>.<id> / flags.swse.<flag>.-=<id>), never a whole-map replacement: two writes touching different
 * records cannot erase each other, and removing a record removes only that record. withSceneLock serializes the read-check-write sequences
 * of one client (a claim such as "remove this mine before it detonates" re-reads the Scene inside the lock).
 */
export const readSceneMap = (scene, flag, isValid) => Object.values(scene?.flags?.swse?.[flag] ?? scene?.getFlag?.('swse', flag) ?? {}).filter(isValid);

const tails = new Map();
/** Run `fn` after every earlier call with the same scene + key has settled (a failure in one never blocks the next). */
export function withSceneLock(scene, key, fn) {
  const k = `${scene?.id ?? 'no-scene'}:${key}`;
  const run = (tails.get(k) ?? Promise.resolve()).then(fn);
  const tail = run.then(() => {}, () => {});
  tails.set(k, tail);
  tail.then(() => { if (tails.get(k) === tail) tails.delete(k); });
  return run;
}

export const putSceneRecord = (scene, flag, record) => scene.update({ [`flags.swse.${flag}.${record.id}`]: record });
export const deleteSceneRecord = (scene, flag, id) => scene.update({ [`flags.swse.${flag}.-=${id}`]: null });
export const sceneGridSize = scene => Number(scene?.grid?.size ?? globalThis.canvas?.grid?.size);

/** The token an actor has on THIS scene (never a token on another scene: a position is only meaningful on its own scene). */
export const tokenOnScene = (actor, scene) => Array.from(actor?.getActiveTokens?.() ?? []).find(t => (t?.document?.parent?.id ?? t?.scene?.id) === scene?.id) ?? null;

/** Only the active GM client processes a scene event (every GM client receives the same Foundry hook; one must act). Unknown activeGM = this GM. */
export function isResponsibleGM(user = globalThis.game?.user ?? null) {
  if (user?.isGM !== true) return false;
  const active = globalThis.game?.users?.activeGM;
  return !active || active.id === user.id;
}
