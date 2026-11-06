/**
 * Space mines (Starships of the Galaxy, Space Mines). Printed: a mine is deployed as a swift action at any point along a starship's movement
 * path; whenever any ship enters the square where it was deployed the mine detonates and makes an area attack against the Reflex Defense of
 * ALL ships in that square (full damage on a hit, half on a miss); mines may be built not to be detonated by ships with specific IFF codes, or
 * to be command-detonated (a gunner, standard action, often after readying). A typical mine: +5 attack, 7d10x2; heavy: +5, 6d10x5 and, like all
 * capital ship weapons, -20 on attack rolls against targets smaller than Colossal. Mine launchers hold six mines.
 *
 * DETECTION (owner ruling V-P6C-15, a project interpretation): the printed Stealth bonus (+5, size included) forms the DC as a Stealth check
 * 1d20 + 5, rolled ONCE when the mine is deployed and kept with the mine. Before a ship enters the square its pilot may make a Perception check
 * (reaction) and a system operator a Use Computer check (reaction, using the ship's sensors); a success lets the pilot choose another square, a
 * failure leaves the normal trigger. The advanced mine (+10, 9d10x2) has no launcher row in the catalog. Pure: records and geometry.
 */
export const MINE_STEALTH_BONUS = 5;
export const MINE_SCHEMA = 'swse.vehicle.spaceMine.v1';
export const MINE_FLAG = 'deployedMines';
export const MINE_TYPES = Object.freeze({
  standard: Object.freeze({ attack: 5, dice: 7, die: 10, multiplier: 2, capitalWeapon: false, ammunition: 'space-mine-standard' }),
  heavy: Object.freeze({ attack: 5, dice: 6, die: 10, multiplier: 5, capitalWeapon: true, ammunition: 'space-mine-heavy' })
});
export const MINE_REASONS = Object.freeze({
  UNKNOWN_TYPE: 'MINE_TYPE_UNKNOWN', NO_POSITION: 'MINE_DEPLOYMENT_POSITION_UNRESOLVED', NO_SCENE: 'MINE_SCENE_UNRESOLVED', NOT_A_MINE_LAUNCHER: 'MINE_WEAPON_NOT_A_MINE_LAUNCHER',
  NOT_FOUND: 'MINE_NOT_FOUND', NOT_COMMAND: 'MINE_IS_NOT_COMMAND_DETONATED', GM_ONLY: 'MINE_GM_OPERATION', ACTION_UNAVAILABLE: 'MINE_SWIFT_ACTION_UNAVAILABLE',
  NOT_OWN_LAUNCHER: 'MINE_LAUNCHER_NOT_ON_DEPLOYING_SHIP', MODE_INVALID: 'MINE_DETONATION_MODE_INVALID', NOT_STARSHIP_SCALE: 'MINE_REQUIRES_STARSHIP_SCALE',
  COMMAND_GUNNER_UNRESOLVED: 'MINE_COMMAND_GUNNER_UNRESOLVED', NO_ENTRY: 'MINE_NO_PENDING_ENTRY', NOT_ABOUT_TO_ENTER: 'MINE_SHIP_NOT_ENTERING', ALREADY_ATTEMPTED: 'MINE_NOTICE_ALREADY_ATTEMPTED', CREW_REQUIRED: 'MINE_NOTICE_CREW_ACTOR_REQUIRED', NO_DETECTION_DC: 'MINE_HAS_NO_DETECTION_DC', NOTICE_ROLL_FAILED: 'MINE_NOTICE_ROLL_UNAVAILABLE', REACTION_UNAVAILABLE: 'MINE_NOTICE_REACTION_UNAVAILABLE', COMMAND_ACTION_UNAVAILABLE: 'MINE_COMMAND_STANDARD_ACTION_UNAVAILABLE'
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

export function buildMine({ id, sceneId, vehicleId, weaponId, type, square, detonation = 'proximity', iffExempt = [], by = null, now = Date.now(), detection = null }) {
  return { schema: MINE_SCHEMA, ...(detection ? { detectionDc: detection.dc, detectionD20: detection.d20 } : {}), pending: {}, id, sceneId, vehicleId, weaponId, type, square: { col: square.col, row: square.row }, detonation: detonation === 'command' ? 'command' : 'proximity',
    iffExempt: [...new Set(iffExempt.filter(x => typeof x === 'string'))], deployedBy: by, deployedAt: now, detonated: false };
}
export const isValidMine = m => !!m && m.schema === MINE_SCHEMA && typeof m.id === 'string' && typeof m.sceneId === 'string' && !!MINE_TYPES[m.type] && Number.isInteger(m.square?.col) && Number.isInteger(m.square?.row) && m.detonated === false;

// ---- movement: which squares did a move enter (P6B-D-073) -------------------------------------------------------------------------------------
const finite = n => Number.isFinite(Number(n));
/**
 * The ordered positions of a token move, from Foundry V13's own movement data for the update (options._movement[tokenId].passed.waypoints) -- the
 * recorded history of the move, never a guess. null when the update carries none.
 */
export function movementWaypointsOf(tokenDoc, options) {
  const mv = options?._movement?.[tokenDoc?.id];
  const wp = mv?.passed?.waypoints ?? mv?.waypoints;
  if (!Array.isArray(wp) || wp.length < 2 || !wp.every(w => finite(w?.x) && finite(w?.y))) return null;
  return wp.map(w => ({ x: Number(w.x), y: Number(w.y) }));
}
/**
 * Every grid position (top-left cell) the token passed through between consecutive waypoints. A segment is walked only when the data establishes
 * its shape on the grid: a straight or exact-diagonal run of whole cells. Any other segment makes the whole path untrusted (null) -- the path is
 * never assumed to be a straight line.
 */
export function pathCells(waypoints, gridSize) {
  const g = Number(gridSize);
  if (!Array.isArray(waypoints) || waypoints.length < 2 || !finite(g) || g <= 0) return null;
  const cells = waypoints.map(w => ({ col: Math.floor(w.x / g), row: Math.floor(w.y / g) }));
  const out = [cells[0]];
  for (let i = 1; i < cells.length; i++) {
    const a = cells[i - 1], b = cells[i], dc = b.col - a.col, dr = b.row - a.row;
    if (!(dc === 0 || dr === 0 || Math.abs(dc) === Math.abs(dr))) return null;
    const n = Math.max(Math.abs(dc), Math.abs(dr));
    for (let k = 1; k <= n; k++) out.push({ col: a.col + Math.sign(dc) * k, row: a.row + Math.sign(dr) * k });
  }
  return out;
}
/** Does a w x h footprint whose top-left cell is `cell` cover the square? */
export const footprintCovers = (cell, w, h, sq) => sq.col >= cell.col && sq.col < cell.col + w && sq.row >= cell.row && sq.row < cell.row + h;
/**
 * Did this move enter the mine's square? @returns {{entered:boolean, atDestination:boolean, passedThrough:boolean, pathTrusted:boolean}}
 * Without a trustworthy path only the destination footprint is tested and pathTrusted is false (the GM can adjudicate a crossing).
 */
export function moveEntersSquare(tokenDoc, options, gridSize, sq) {
  const d = tokenDoc?.document ?? tokenDoc;
  const w = Math.max(1, Math.round(Number(d?.width ?? 1))), h = Math.max(1, Math.round(Number(d?.height ?? 1)));
  const atDestination = tokenOccupies(d, gridSize, sq);
  const cells = pathCells(movementWaypointsOf(d, options), gridSize);
  const viaPath = !!cells && cells.some(c => footprintCovers(c, w, h, sq));
  return { entered: atDestination || viaPath, atDestination, passedThrough: viaPath && !atDestination, pathTrusted: !!cells };
}
