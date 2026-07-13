/**
 * Vehicle weapon damage-spec parser (Phase 1 — audit/profile generation only).
 *
 * `vehicleWeapon.system.damage` is a loose authored string ("5d10x2",
 * "5d10 (Ion)", "9d10x10 (Ion, Special)", "+1d10", "Special", "By Weapon",
 * null). This parser turns that string plus the weapon name into structured
 * metadata so the damage-profile auditor and registry can classify every
 * entry as safeToWire / inferredButNeedsReview / manualRequired.
 *
 * IMPORTANT: nothing in the runtime combat path consumes this yet. Wiring
 * vehicle-weapon packets is a later slice (Phase 0 audit, roadmap Phase 4).
 *
 * Dependency-free on purpose: imported by both the Foundry-side registry and
 * the node audit tool (tools/audit-damage-profiles.mjs).
 */

const ENERGY_NAME_RE = /\b(laser|blaster|turbo\s*laser|turbolaser|beam)\b/i;
const KINETIC_NAME_RE = /\b(rail|mass[-\s]?driver|harpoon)\b/i;
// Special-case families whose type/area behavior varies by printed source.
const MANUAL_NAME_RE = /\b(missile|torpedo|mine|defoliator|discord|tractor|pressor|gravity|shieldbuster|bomb|bomblet|ordnance|grenade|flak|chaff|jammer|point[-\s]?defense|docking|shell)\b/i;
const LAUNCHER_NAME_RE = /\b(launcher|rack|generator|projector|pod)\b/i;

const DICE_RE = /^([0-9]+d[0-9]+(?:\s*[+-]\s*[0-9]+)?)/i;
const MULT_RE = /x\s*([0-9]+)/i;
const PAREN_RE = /\(([^)]*)\)/;

function cleanString(value) {
  return String(value ?? '').trim();
}

/**
 * Parse a vehicle weapon damage spec string.
 *
 * @param {string|null|undefined} spec — raw system.damage value
 * @param {string} [weaponName] — used only for conservative name inference
 * @returns {{
 *   raw: string|null,
 *   formula: string|null,        // dice expression without multiplier
 *   multiplier: number|null,     // x2/x5/x10 vehicle-scale multiplier
 *   type: string|null,           // explicit canonical type (only from the spec itself)
 *   inferredType: string|null,   // conservative name-based guess (never explicit)
 *   typeSource: "explicit"|"name"|null,
 *   special: boolean,            // "Special" or "(…, Special)"
 *   modifierOnly: boolean,       // "+1d10" style enhancement entries
 *   byWeapon: boolean,           // "By Weapon"
 *   noDamage: boolean,           // null/empty damage
 *   launcherLike: boolean,       // launcher/rack/etc. name with no direct damage
 *   manualFamily: boolean,       // missile/torpedo/mine/… special-case family
 *   classification: "safeToWire"|"inferredButNeedsReview"|"manualRequired"|"noDirectDamage"|"modifier",
 *   tags: string[],
 *   notes: string[]
 * }}
 */
export function parseVehicleWeaponDamageSpec(spec, weaponName = '') {
  const raw = spec == null ? null : cleanString(spec);
  const name = cleanString(weaponName);
  const notes = [];
  const tags = ['vehicle-weapon'];

  const result = {
    raw: raw || null,
    formula: null,
    multiplier: null,
    type: null,
    inferredType: null,
    typeSource: null,
    special: false,
    modifierOnly: false,
    byWeapon: false,
    noDamage: false,
    launcherLike: LAUNCHER_NAME_RE.test(name),
    manualFamily: MANUAL_NAME_RE.test(name),
    classification: 'manualRequired',
    tags,
    notes
  };

  // --- No damage string at all --------------------------------------------
  if (!raw) {
    result.noDamage = true;
    result.classification = 'noDirectDamage';
    notes.push(result.launcherLike
      ? 'No direct damage; launcher/emitter — damage comes from its ammunition entry.'
      : 'No damage value in pack data.');
    return result;
  }

  // --- Sentinel strings -----------------------------------------------------
  if (/^by\s+weapon$/i.test(raw)) {
    result.byWeapon = true;
    result.classification = 'noDirectDamage';
    notes.push('Damage is delegated to the mounted weapon ("By Weapon").');
    return result;
  }
  if (/^special$/i.test(raw)) {
    result.special = true;
    result.classification = 'manualRequired';
    notes.push('Damage listed as "Special" — printed source required.');
    return result;
  }

  // --- Modifier-only entries (+1d10 fire-linking / enhancements) ------------
  if (/^\+/.test(raw)) {
    const dice = raw.replace(/^\+\s*/, '').match(DICE_RE);
    result.modifierOnly = true;
    result.formula = dice ? dice[1].replace(/\s+/g, '') : null;
    result.classification = 'modifier';
    tags.push('damage-modifier');
    notes.push('Modifier entry — adds dice to another weapon, never a standalone packet.');
    return result;
  }

  // --- Dice formula + multiplier + parenthetical flags -----------------------
  const dice = raw.match(DICE_RE);
  if (dice) result.formula = dice[1].replace(/\s+/g, '');

  const mult = raw.match(MULT_RE);
  if (mult) result.multiplier = Number(mult[1]);

  const paren = raw.match(PAREN_RE);
  if (paren) {
    const flags = paren[1].split(',').map(s => cleanString(s).toLowerCase()).filter(Boolean);
    if (flags.includes('ion')) {
      result.type = 'ion';
      result.typeSource = 'explicit';
      tags.push('ion');
    }
    if (flags.includes('special')) {
      result.special = true;
      notes.push('Spec carries a "(Special)" qualifier — printed source required for the special behavior.');
    }
    const unknown = flags.filter(f => f !== 'ion' && f !== 'special');
    if (unknown.length) notes.push(`Unrecognized damage qualifiers: ${unknown.join(', ')}.`);
  }

  if (!result.formula) {
    notes.push(`Unparseable damage spec "${raw}".`);
    result.classification = 'manualRequired';
    return result;
  }

  // --- Conservative name-based type inference (never overrides explicit) ----
  if (!result.type) {
    if (ENERGY_NAME_RE.test(name)) {
      result.inferredType = 'energy';
      result.typeSource = 'name';
    } else if (KINETIC_NAME_RE.test(name)) {
      result.inferredType = 'kinetic';
      result.typeSource = 'name';
    }
  }

  // --- Classification --------------------------------------------------------
  if (result.manualFamily || result.special) {
    // Missiles/torpedoes/mines/etc. stay manual even when the dice parse,
    // because area behavior and type vary per printed source.
    result.classification = 'manualRequired';
  } else if (result.type) {
    result.classification = 'safeToWire';
  } else if (result.inferredType) {
    result.classification = 'inferredButNeedsReview';
  } else {
    result.classification = 'manualRequired';
    notes.push('Parseable formula but no explicit or name-inferable damage type.');
  }

  return result;
}

export default parseVehicleWeaponDamageSpec;
