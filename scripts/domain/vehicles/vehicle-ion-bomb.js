/**
 * Ion bombs (Starships of the Galaxy, Weapon Systems: Ion Bombs; Table 3-5). Printed: "Because of their primitive fin-stabilized guidance system, the
 * bombs are usable only in an atmosphere, and attacks with them take a -5 penalty. Ion bombs may target a square directly beneath the ship that
 * deploys them. On impact, they create a strong ion field that deals 5d10 points of ion damage within a 10-square radius. Ion bomb racks can hold up
 * to four ion bombs."
 *
 * OWNER RULING V-P6C-16 (a project interpretation, not a rewrite of the printed rule): the ONLY target implemented is the square directly beneath the
 * deploying ship; no Table 10-2 band is invented and no distant or arbitrary target is accepted. The effect resolves on impact (no persistent field). The
 * radius is counted in the Scene's grid squares (the encounter's own scale; no conversion is invented). The deploying ship is not a target of its own
 * bomb. Pure: constants, geometry, reasons.
 */
export const ION_BOMB_ATTACK_PENALTY = -5;
export const ION_BOMB_DAMAGE = '5d10';
export const ION_BOMB_RADIUS_SQUARES = 10;
export const ION_BOMB_RACK_CAPACITY = 4;
export const BOMB_REASONS = Object.freeze({
  NOT_AN_ION_BOMB_RACK: 'ION_BOMB_WEAPON_NOT_AN_ION_BOMB_RACK', NOT_OWN_RACK: 'ION_BOMB_RACK_NOT_ON_DEPLOYING_SHIP', GM_ONLY: 'ION_BOMB_GM_OPERATION',
  ATMOSPHERE_REQUIRED: 'ION_BOMB_REQUIRES_ATMOSPHERE', NO_SCENE: 'ION_BOMB_SCENE_UNRESOLVED', NO_POSITION: 'ION_BOMB_SHIP_POSITION_UNRESOLVED',
  IMPACT_NOT_BENEATH_SHIP: 'ION_BOMB_IMPACT_NOT_DIRECTLY_BENEATH_THE_SHIP', ACTION_UNAVAILABLE: 'ION_BOMB_ACTION_UNAVAILABLE', ATTACK_BONUS_UNRESOLVED: 'ION_BOMB_ATTACK_BONUS_UNRESOLVED',
  ROLL_UNAVAILABLE: 'ION_BOMB_ROLL_UNAVAILABLE'
});

/** Squares between two cells counting diagonals as one (SWSE square counting): Chebyshev distance. */
export const squareDistance = (a, b) => Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));

/** The nearest distance from `sq` to any cell of a w x h footprint whose top-left cell is `cell` (0 when the footprint covers it). */
export function footprintDistance(cell, w, h, sq) {
  const dc = sq.col < cell.col ? cell.col - sq.col : sq.col > cell.col + w - 1 ? sq.col - (cell.col + w - 1) : 0;
  const dr = sq.row < cell.row ? cell.row - sq.row : sq.row > cell.row + h - 1 ? sq.row - (cell.row + h - 1) : 0;
  return Math.max(dc, dr);
}

/** Is a token's footprint within the bomb's radius of the impact square? */
export function tokenInBlast(token, gridSize, impact, radius = ION_BOMB_RADIUS_SQUARES) {
  const d = token?.document ?? token;
  const x = Number(d?.x), y = Number(d?.y), g = Number(gridSize);
  if (![x, y, g].every(Number.isFinite) || g <= 0 || !impact) return false;
  const w = Math.max(1, Math.round(Number(d?.width ?? 1))), h = Math.max(1, Math.round(Number(d?.height ?? 1)));
  return footprintDistance({ col: Math.floor(x / g), row: Math.floor(y / g) }, w, h, impact) <= radius;
}
