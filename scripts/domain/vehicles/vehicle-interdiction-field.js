/**
 * Hyperspace interdiction fields of gravity well projectors (Starships of the Galaxy, Gravity Well Projectors).
 *
 * Printed: the operator chooses a 4x4-square (starship scale) area within the projector's range and attacks Reflex Defense 10; on a hit
 * the projector creates a hyperspace interdiction field in those squares; a starship that STARTS ITS TURN in a covered square may not
 * activate its hyperdrive that turn. NOT printed: how long the field lasts. PROJECT CONVENTION V-P6C-14 (owner, 2026-11-04): the field is
 * active until a GM deactivates or removes it -- no round count is invented.
 *
 * Pure: geometry in grid cells, records, validation. Persistence is the service's (scene flag); the turn effect is an ActiveEffect.
 */
export const FIELD_SQUARES = 4;
export const FIELD_SCHEMA = 'swse.vehicle.interdictionField.v1';
export const INTERDICTION_FLAG = 'interdictionFields';
export const FIELD_REASONS = Object.freeze({
  NOT_A_GRAVITY_WELL: 'INTERDICTION_WEAPON_NOT_A_GRAVITY_WELL', NOT_STARSHIP_SCALE: 'INTERDICTION_REQUIRES_STARSHIP_SCALE', AREA_INVALID: 'INTERDICTION_AREA_INVALID',
  NO_SCENE: 'INTERDICTION_SCENE_UNRESOLVED', GM_ONLY: 'INTERDICTION_GM_OPERATION', NOT_FOUND: 'INTERDICTION_FIELD_NOT_FOUND', DUPLICATE: 'INTERDICTION_FIELD_ALREADY_EXISTS'
});

const isInt = n => Number.isInteger(n);

/** The grid cells a token occupies: {minCol,maxCol,minRow,maxRow} from its document position, size and the scene's grid. */
export function tokenCells(token, gridSize) {
  const d = token?.document ?? token;
  const x = Number(d?.x), y = Number(d?.y), w = Number(d?.width ?? 1), h = Number(d?.height ?? 1), g = Number(gridSize);
  if (![x, y, w, h, g].every(Number.isFinite) || g <= 0 || w <= 0 || h <= 0) return null;
  const minCol = Math.floor(x / g), minRow = Math.floor(y / g);
  return { minCol, minRow, maxCol: minCol + Math.max(1, Math.round(w)) - 1, maxRow: minRow + Math.max(1, Math.round(h)) - 1 };
}

/** A starship is "in a covered square" when any square it occupies lies in the field's 4x4 area. */
export function fieldCoversToken(field, token, gridSize) {
  const c = tokenCells(token, gridSize);
  if (!field || !c) return false;
  const maxCol = field.area.col + FIELD_SQUARES - 1, maxRow = field.area.row + FIELD_SQUARES - 1;
  return c.minCol <= maxCol && c.maxCol >= field.area.col && c.minRow <= maxRow && c.maxRow >= field.area.row;
}

/** The pixel box of the area (for a synthetic range-measuring target and for display). */
export function areaBox(area, gridSize) {
  const g = Number(gridSize);
  return { x: area.col * g, y: area.row * g, width: FIELD_SQUARES, height: FIELD_SQUARES, center: { x: (area.col + FIELD_SQUARES / 2) * g, y: (area.row + FIELD_SQUARES / 2) * g } };
}

export function validateArea(area) {
  return area && isInt(area.col) && isInt(area.row) ? { ok: true } : { ok: false, reason: FIELD_REASONS.AREA_INVALID };
}

/** A new, active field. `attackTotal` is recorded as evidence only. */
export function buildField({ id, sceneId, vehicleId, weaponId, area, by = null, attackTotal = null, now = Date.now() }) {
  return { schema: FIELD_SCHEMA, id, sceneId, vehicleId, weaponId, area: { col: area.col, row: area.row }, squares: FIELD_SQUARES, active: true,
    convention: 'V-P6C-14: active until a GM deactivates or removes it (no printed duration)', createdBy: by, attackTotal, createdAt: now };
}

export const isValidField = f => !!f && f.schema === FIELD_SCHEMA && typeof f.id === 'string' && typeof f.sceneId === 'string' && f.squares === FIELD_SQUARES && validateArea(f.area).ok && typeof f.active === 'boolean';
