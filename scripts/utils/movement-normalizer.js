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
  if (t.startsWith('walk') || t.startsWith('wheel') || t.startsWith('land')) {return 'walk';}
  if (t.startsWith('swim')) {return 'swim';}
  if (t.startsWith('climb')) {return 'climb';}
  if (t.startsWith('burrow')) {return 'burrow';}
  if (t.startsWith('immobile')) {return 'immobile';}
  return t;
}

function extractMaxVelocity(raw) {
  const s = String(raw || '');
  const m = s.match(/Maximum\s+Velocity\s*[:=]?\s*([^);]+)/i);
  return m ? m[1].trim() : null;
}

function extractFightingSpace(raw) {
  const text = String(raw || '');
  const match = text.match(/Fighting\s+Space\s*:?\s*([\s\S]*)$/i);
  if (!match) {
    return { character: null, starship: null, raw: null, speedText: text };
  }

  const rawFightingSpace = String(match[1] || '')
    .split(/\b(?:Ranged|Melee|Base\s+Attack|Attack\s+Options|Abilities|Crew|Passengers)\b/i)[0]
    .trim()
    .replace(/[;,]+$/g, '');

  const spaces = { character: null, starship: null, raw: rawFightingSpace, speedText: text.slice(0, match.index).trim().replace(/[;,]+$/g, '') };
  const rx = /([0-9]+(?:\s*x\s*[0-9]+)?|[0-9]+)\s*Squares?\s*\((Character|Starship)\s+Scale\)/gi;
  let part;
  while ((part = rx.exec(rawFightingSpace))) {
    const scale = String(part[2] || '').toLowerCase();
    const dims = String(part[1] || '').replace(/\s+/g, '').toLowerCase();
    spaces[scale] = `${dims} ${dims === '1' ? 'square' : 'squares'}`;
  }
  return spaces;
}

function modeLabel(mode) {
  if (!mode) {return 'Speed';}
  if (mode === 'fly') {return 'Fly';}
  if (mode === 'walk') {return 'Walk';}
  if (mode === 'swim') {return 'Swim';}
  if (mode === 'climb') {return 'Climb';}
  if (mode === 'burrow') {return 'Burrow';}
  if (mode === 'immobile') {return 'Immobile';}
  return `${mode.charAt(0).toUpperCase()}${mode.slice(1)}`;
}

function formatSpeedLabel(mode, squares) {
  const n = toIntOrNull(squares);
  if (mode === 'immobile') {return 'Immobile';}
  if (n === null) {return '';}
  const suffix = n === 1 ? 'square' : 'squares';
  return mode ? `${modeLabel(mode)} ${n} ${suffix}` : `${n} ${suffix}`;
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
  const fightingSpace = extractFightingSpace(raw);

  // Strip obvious scraper tails (weapons blocks, etc.)
  const sanitized = (fightingSpace.speedText || raw)
    .replace(/\bRanged\b[\s\S]*$/i, '')
    .replace(/\bMelee\b[\s\S]*$/i, '')
    .replace(/\bAttack\b[\s\S]*$/i, '')
    .replace(/\(?\s*Maximum\s+Velocity\s*[:=]?\s*[0-9,.]+\s*km\/?h\s*\)?/ig, '')
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
  const immobile = /\bimmobile\b/i.test(sanitized || raw);

  for (const p of parts) {
    const m = p.match(/^(?:Speed:\s*)?(?:(Fly|Walk|Walking|Wheeled|Swim|Swimming|Climb|Climbing|Burrow|Burrowing)\s+)?(-?\d+)\s*(?:Squares?)?\*?(?:\s*\((Character|Starship)\s+Scale\)\*?|\s*\((Walking|Wheeled|Swimming|Climbing|Fly|Flying)\))?/i);
    if (!m) {continue;}

    const mode = normalizeMode(m[1] || m[4] || '');
    const squares = toIntOrNull(m[2]);
    const scaleRaw = String(m[3] || '').toLowerCase();
    /** @type {'character'|'starship'|null} */
    const scale = scaleRaw === 'starship' ? 'starship' : 'character';

    modes.push({ mode, squares, scale });

    if (!scale) {
      // If unscaled, assume character unless already set.
      if (!character) {character = { mode, squares };}
      continue;
    }

    if (scale === 'character' && !character) {character = { mode, squares };}
    if (scale === 'starship' && !starship) {starship = { mode, squares };}
  }

  if (!character && immobile) {character = { mode: 'immobile', squares: 0 };}

  return {
    raw,
    maxVelocity,
    fightingSpace,
    modes: modes.map((m) => ({ ...m, label: formatSpeedLabel(m.mode, m.squares) })),
    character: character ? { ...character, label: formatSpeedLabel(character.mode, character.squares) } : null,
    starship: starship ? { ...starship, label: formatSpeedLabel(starship.mode, starship.squares) } : null,
    status: immobile ? 'immobile' : character && starship ? 'dual-scale' : character ? 'character-scale-only' : starship ? 'starship-scale-only' : 'needs-source-review'
  };
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
