/**
 * Space mines (Starships of the Galaxy, Space Mines). Printed: a mine is deployed as a swift action at any point along a starship's movement
 * path; whenever any ship enters the square where it was deployed the mine detonates and makes an area attack against the Reflex Defense of
 * ALL ships in that square (full damage on a hit, half on a miss); mines may be built not to be detonated by ships with specific IFF codes, or
 * to be command-detonated (a gunner, standard action, often after readying). A typical mine: +5 attack, 7d10x2; heavy: +5, 6d10x5 and, like all
 * capital ship weapons, -20 on attack rolls against targets smaller than Colossal. Mine launchers hold six mines.
 *
 * NOT automated (register V-P6C-15): the reaction to notice a mine ("Stealth bonus +5 ... sets the DC to notice") -- the text does not say how
 * the DC is formed from the bonus. The advanced mine (+10, 9d10x2) has no launcher row in the catalog. Pure: records and geometry.
 */
export const MINE_SCHEMA = 'swse.vehicle.spaceMine.v1';
export const MINE_FLAG = 'deployedMines';
export const MINE_TYPES = Object.freeze({
  standard: Object.freeze({ attack: 5, dice: 7, die: 10, multiplier: 2, capitalWeapon: false, ammunition: 'space-mine-standard' }),
  heavy: Object.freeze({ attack: 5, dice: 6, die: 10, multiplier: 5, capitalWeapon: true, ammunition: 'space-mine-heavy' })
});
export const MINE_REASONS = Object.freeze({
  UNKNOWN_TYPE: 'MINE_TYPE_UNKNOWN', NO_POSITION: 'MINE_DEPLOYMENT_POSITION_UNRESOLVED', NO_SCENE: 'MINE_SCENE_UNRESOLVED', NOT_A_MINE_LAUNCHER: 'MINE_WEAPON_NOT_A_MINE_LAUNCHER',
  NOT_FOUND: 'MINE_NOT_FOUND', NOT_COMMAND: 'MINE_IS_NOT_COMMAND_DETONATED', GM_ONLY: 'MINE_GM_OPERATION', ACTION_UNAVAILABLE: 'MINE_SWIFT_ACTION_UNAVAILABLE', DUPLICATE_SQUARE: 'MINE_SQUARE_ALREADY_MINED'
});

export const mineDamageFormula = type => { const t = MINE_TYPES[type]; return t ? `${t.dice}d${t.die}` : null; };

/** The square a token stands on (a mine is deployed in the deploying ship's current square: its top-left occupied square). */
export function squareOfToken(token, gridSize) {
  const d = token?.document ?? token;
  const x = Number(d?.x), y = Number(d?.y), g = Number(gridSize);
  if (![x, y, g].every(Number.isFinite) || g <= 0) return null;
  return { col: Math.floor(x / g), row: Math.floor(y / g) };
}
/** Does a ship's footprint include the mine's square? */
export function tokenOccupies(token, gridSize, sq) {
  const d = token?.document ?? token;
  const x = Number(d?.x), y = Number(d?.y), w = Math.max(1, Math.round(Number(d?.width ?? 1))), h = Math.max(1, Math.round(Number(d?.height ?? 1))), g = Number(gridSize);
  if (![x, y, g].every(Number.isFinite) || g <= 0 || !sq) return false;
  const c = Math.floor(x / g), r = Math.floor(y / g);
  return sq.col >= c && sq.col < c + w && sq.row >= r && sq.row < r + h;
}

export function buildMine({ id, sceneId, vehicleId, weaponId, type, square, detonation = 'proximity', iffExempt = [], by = null, now = Date.now() }) {
  return { schema: MINE_SCHEMA, id, sceneId, vehicleId, weaponId, type, square: { col: square.col, row: square.row }, detonation: detonation === 'command' ? 'command' : 'proximity',
    iffExempt: [...new Set(iffExempt.filter(x => typeof x === 'string'))], deployedBy: by, deployedAt: now, detonated: false };
}
export const isValidMine = m => !!m && m.schema === MINE_SCHEMA && typeof m.id === 'string' && typeof m.sceneId === 'string' && !!MINE_TYPES[m.type] && Number.isInteger(m.square?.col) && Number.isInteger(m.square?.row) && m.detonated === false;
