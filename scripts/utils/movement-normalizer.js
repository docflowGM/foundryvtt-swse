/**
 * scripts/utils/movement-normalizer.js
 *
 * Best-effort parsing of SWSE vehicle speed strings.
 *
 * Examples:
 * - "Fly 12 Squares (Character Scale), Fly 2 Squares (Starship Scale); (Maximum Velocity 800 km/h)"
 * - "Walk 6 squares"
 * - "Fly 2 squares (Starship Scale) Ranged: ..." (dirty scraper tail)
 *
 * Policy:
 * - Never mutate source documents here.
 * - Return structured data; callers choose how to store it.
 */

function toIntOrNull(value) {
  if (value === null || value === undefined) {return null;}
  const match = String(value).match(/-?\d+/);
  if (!match) {return null;}
  const n = Number.parseInt(match[0], 10);
  return Number.isFinite(n) ? n : null;
}

function normalizeMode(token) {
  const t = String(token || '').trim().toLowerCase();
  if (!t) {return null;}
  if (t.startsWith('fly')) {return 'fly';}
  if (t.startsWith('walk') || t.startsWith('land')) {return 'walk';}
  if (t.startsWith('swim')) {return 'swim';}
  if (t.startsWith('climb')) {return 'climb';}
  if (t.startsWith('burrow')) {return 'burrow';}
  return t;
}

function extractMaxVelocity(raw) {
  const s = String(raw || '');
  const m = s.match(/Maximum\s+Velocity\s*[:=]?\s*([^)];]+)/i);
  return m ? m[1].trim() : null;
}

/**
 * Parse an SWSE speed string into structured movement data.
 * @param {string} rawSpeed
 * @returns {{
 *  raw: string,
 *  maxVelocity: string|null,
 *  modes: Array<{mode: string|null, squares: number|null, scale: 'character'|'starship'|null}>,
 *  character: {mode: string|null, squares: number|null}|null,
 *  starship: {mode: string|null, squares: number|null}|null
 * }}
 */
export function parseVehicleSpeedText(rawSpeed) {
  const raw = String(rawSpeed ?? '').trim();
  const maxVelocity = extractMaxVelocity(raw);

  // Strip obvious scraper tails (weapons blocks, etc.)
  const sanitized = raw
    .replace(/\bRanged\b[\s\S]*$/i, '')
    .replace(/\bMelee\b[\s\S]*$/i, '')
    .replace(/\bAttack\b[\s\S]*$/i, '')
    .trim();

  const parts = sanitized
    .replace(/;\s*/g, ', ')
    .split(/\s*,\s*/)
    .map(p => p.trim())
    .filter(Boolean);

  /** @type {Array<{mode: string|null, squares: number|null, scale: 'character'|'starship'|null}>} */
  const modes = [];

  let character = null;
  let starship = null;

  for (const p of parts) {
    const m = p.match(/^(?:Speed:\s*)?(\w+)\s+(-?\d+)\s*(?:Squares?)?(?:\s*\((Character|Starship)\s+Scale\))?/i);
    if (!m) {continue;}

    const mode = normalizeMode(m[1]);
    const squares = toIntOrNull(m[2]);
    const scaleRaw = String(m[3] || '').toLowerCase();
    /** @type {'character'|'starship'|null} */
    const scale = scaleRaw === 'character' ? 'character' : scaleRaw === 'starship' ? 'starship' : null;

    modes.push({ mode, squares, scale });

    if (!scale) {
      // If unscaled, assume character unless already set.
      if (!character) {character = { mode, squares };}
      continue;
    }

    if (scale === 'character' && !character) {character = { mode, squares };}
    if (scale === 'starship' && !starship) {starship = { mode, squares };}
  }

  // If we got one scaled entry only, fill the other when reasonable.
  if (!character && starship && modes.length === 1) {
    character = { mode: starship.mode, squares: null };
  }
  if (!starship && character && modes.length === 1) {
    starship = { mode: character.mode, squares: null };
  }

  return { raw, maxVelocity, modes, character, starship };
}

/**
 * Format a squares value for the vehicle data model (expects strings).
 * @param {number|null} squares
 * @param {string} fallback
 */
export function formatSquares(squares, fallback = '') {
  const n = toIntOrNull(squares);
  if (n === null) {return fallback;}
  return `${n} squares`;
}
