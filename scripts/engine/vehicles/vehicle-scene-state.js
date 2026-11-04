/**
 * The ONE writer of vehicle-combat state that lives on a Scene (gravity-well interdiction fields, deployed space mines). The system has no
 * scene-state authority (ActorEngine governs Actors and their Items), so persistent scene objects are kept as id-keyed maps under
 * flags.swse.<flag> and every write goes through writeSceneMap, which is GM-only (a player cannot update a Scene in Foundry).
 */
export const readSceneMap = (scene, flag, isValid) => Object.values(scene?.flags?.swse?.[flag] ?? scene?.getFlag?.('swse', flag) ?? {}).filter(isValid);
export const asMap = records => Object.fromEntries(records.map(r => [r.id, r]));
export async function writeSceneMap(scene, flag, records) { await scene.update({ [`flags.swse.==${flag}`]: asMap(records) }); }
export const sceneGridSize = scene => Number(scene?.grid?.size ?? globalThis.canvas?.grid?.size);
