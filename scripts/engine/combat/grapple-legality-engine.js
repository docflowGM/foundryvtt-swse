/**
 * GrappleLegalityEngine
 *
 * Shared legality helper for grapple workflows. This does not move tokens and
 * it does not replace GrappleStateEngine; it answers whether a requested
 * grapple action is structurally legal before dice/action economy are spent.
 */

const SIZE_ORDER = Object.freeze({
  fine: -4,
  diminutive: -3,
  tiny: -2,
  small: -1,
  medium: 0,
  large: 1,
  huge: 2,
  gargantuan: 3,
  colossal: 4
});

const SIZE_LABELS = Object.freeze({
  fine: 'Fine',
  diminutive: 'Diminutive',
  tiny: 'Tiny',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  huge: 'Huge',
  gargantuan: 'Gargantuan',
  colossal: 'Colossal'
});

function normalizeSize(value) {
  const raw = String(value ?? '').trim().toLowerCase().replace(/[_\s]+/g, '-');
  if (!raw) return 'medium';
  if (raw === 'med') return 'medium';
  if (raw === 'garg') return 'gargantuan';
  if (raw === 'col') return 'colossal';
  if (raw in SIZE_ORDER) return raw;
  const compact = raw.replace(/[^a-z]/g, '');
  if (compact in SIZE_ORDER) return compact;
  return 'medium';
}

function firstFinite(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function getPath(obj, path) {
  return String(path).split('.').reduce((acc, key) => acc?.[key], obj);
}

function readActorNumber(actor, paths = []) {
  for (const path of paths) {
    const value = getPath(actor, path);
    if (value && typeof value === 'object') {
      const nested = firstFinite(value.value, value.total, value.squares, value.current, value.max);
      if (nested !== null) return nested;
    }
    const n = firstFinite(value);
    if (n !== null) return n;
  }
  return null;
}

function readActorText(actor, paths = []) {
  for (const path of paths) {
    const value = getPath(actor, path);
    if (value !== null && value !== undefined && value !== '') return String(value);
  }
  return '';
}


function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(normalizeList);
  if (value instanceof Set) return Array.from(value).flatMap(normalizeList);
  if (typeof value === 'object') {
    return normalizeList(value.key ?? value.id ?? value.slug ?? value.name ?? value.label ?? value.value ?? '');
  }
  return [String(value).trim().toLowerCase()].filter(Boolean);
}

function actorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch (_err) {
    return [];
  }
}

function itemDisabled(item) {
  return item?.system?.disabled === true || item?.disabled === true;
}

function itemSearchText(item) {
  const system = item?.system ?? {};
  const flags = item?.flags?.swse ?? {};
  const bits = [
    item?.name,
    item?.type,
    system.slug,
    system.key,
    system.weaponType,
    system.weaponGroup,
    system.weaponCategory,
    system.category,
    system.subtype,
    system.trait,
    flags.grappleAppendage,
    flags.grappleNaturalWeapon
  ];
  return normalizeList(bits).join(' ');
}

function abilityMetaGrappleAppendages(item) {
  const rules = item?.system?.abilityMeta?.grappleRules;
  if (!Array.isArray(rules)) return null;
  let count = 0;
  for (const rule of rules) {
    const type = String(rule?.type ?? rule?.kind ?? '').trim().toUpperCase();
    if (!['FREE_LIMB', 'GRAPPLE_APPENDAGE', 'GRAPPLE_LIMB'].includes(type)) continue;
    const value = Number(rule?.count ?? rule?.value ?? rule?.bonus ?? 1);
    count += Number.isFinite(value) ? Math.max(0, value) : 1;
  }
  return count > 0 ? count : null;
}

function inferFreeGrappleAppendages(actor) {
  const explicitFlag = Number(actor?.flags?.swse?.freeGrappleLimbs ?? actor?.flags?.swse?.grappleAppendages);
  if (Number.isFinite(explicitFlag) && explicitFlag > 0) {
    return { count: explicitFlag, source: 'actor flags' };
  }

  const items = actorItems(actor).filter(item => !itemDisabled(item));
  let encoded = 0;
  let naturalWeapon = false;
  for (const item of items) {
    const direct = Number(
      item?.system?.grapple?.freeLimbs
      ?? item?.system?.grappleAppendages
      ?? item?.system?.freeGrappleLimbs
      ?? item?.flags?.swse?.freeGrappleLimbs
      ?? item?.flags?.swse?.grappleAppendages
    );
    if (Number.isFinite(direct) && direct > 0) encoded += direct;

    const meta = abilityMetaGrappleAppendages(item);
    if (meta !== null) encoded += meta;

    const text = itemSearchText(item);
    const isWeapon = item?.type === 'weapon' || text.includes('weapon');
    if (isWeapon && (
      text.includes('natural')
      || text.includes('unarmed')
      || text.includes('claw')
      || text.includes('talon')
      || text.includes('tentacle')
      || text.includes('pincer')
      || text.includes('bite')
      || text.includes('slam')
      || item?.system?.naturalWeapon === true
      || item?.flags?.swse?.grappleNaturalWeapon === true
    )) {
      naturalWeapon = true;
    }
  }

  if (encoded > 0) return { count: encoded, source: 'item metadata' };
  if (naturalWeapon) return { count: 1, source: 'natural weapon/appendage' };

  const typeText = String(actor?.type ?? actor?.system?.creatureType ?? actor?.system?.details?.type ?? '').toLowerCase();
  if (['beast', 'creature', 'npc'].some(term => typeText.includes(term))) {
    return { count: 1, source: 'creature fallback' };
  }

  return null;
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

async function confirmDialog({ title, content, yes = 'Continue', no = 'Cancel', defaultYes = false } = {}) {
  if (typeof globalThis.Dialog?.confirm === 'function') {
    return await globalThis.Dialog.confirm({ title, content, yes, no, defaultYes });
  }
  return true;
}

function actorId(actor) {
  return actor?.id ?? actor?._id ?? null;
}

function actorTokens(actor) {
  if (!actor) return [];
  const id = actorId(actor);
  const uuid = actor?.uuid ?? null;
  try {
    return Array.from(canvas?.tokens?.placeables ?? []).filter(token => {
      const tokenActor = token?.actor;
      return tokenActor === actor
        || tokenActor?.id === id
        || tokenActor?._id === id
        || tokenActor?.uuid === uuid;
    });
  } catch (_err) {
    return [];
  }
}

function tokenCenter(token) {
  const center = token?.center;
  if (center && Number.isFinite(center.x) && Number.isFinite(center.y)) return center;
  const x = Number(token?.x ?? token?.document?.x ?? 0) + (Number(token?.w ?? token?.width ?? 1) * Number(canvas?.grid?.size ?? 100) / 2);
  const y = Number(token?.y ?? token?.document?.y ?? 0) + (Number(token?.h ?? token?.height ?? 1) * Number(canvas?.grid?.size ?? 100) / 2);
  return { x, y };
}

function distanceSquaresBetweenTokens(a, b) {
  if (!a || !b) return null;
  try {
    const grid = canvas?.grid;
    if (typeof grid?.measureDistance === 'function') {
      const measured = grid.measureDistance(a, b);
      const gridDistance = Number(canvas?.scene?.grid?.distance ?? 1) || 1;
      const squares = Number(measured) / gridDistance;
      if (Number.isFinite(squares)) return squares;
    }
  } catch (_err) {
    // Fall back to center distance below.
  }
  const ca = tokenCenter(a);
  const cb = tokenCenter(b);
  const gridSize = Number(canvas?.grid?.size ?? canvas?.scene?.grid?.size ?? 100) || 100;
  const dx = Math.abs(Number(ca.x ?? 0) - Number(cb.x ?? 0)) / gridSize;
  const dy = Math.abs(Number(ca.y ?? 0) - Number(cb.y ?? 0)) / gridSize;
  const dist = Math.max(dx, dy);
  return Number.isFinite(dist) ? dist : null;
}

function bestDistanceSquares(actorA, actorB) {
  const tokensA = actorTokens(actorA);
  const tokensB = actorTokens(actorB);
  let best = null;
  for (const a of tokensA) {
    for (const b of tokensB) {
      const distance = distanceSquaresBetweenTokens(a, b);
      if (distance === null) continue;
      if (best === null || distance < best) best = distance;
    }
  }
  return best;
}

function normalizeResult(result = {}) {
  const warnings = Array.isArray(result.warnings) ? result.warnings.filter(Boolean) : [];
  return {
    allowed: result.allowed !== false,
    hard: result.allowed === false,
    soft: result.soft === true || warnings.length > 0,
    reason: result.reason ?? (warnings.length ? warnings.join(' ') : ''),
    warnings,
    details: result.details ?? {}
  };
}

function mergeResults(...results) {
  const warnings = [];
  const details = {};
  for (const result of results.map(normalizeResult)) {
    Object.assign(details, result.details ?? {});
    warnings.push(...(result.warnings ?? []));
    if (result.allowed === false) {
      return normalizeResult({ allowed: false, reason: result.reason, warnings, details });
    }
  }
  return normalizeResult({ allowed: true, warnings, details, soft: warnings.length > 0 });
}

export class GrappleLegalityEngine {
  static normalizeSize(value) {
    return normalizeSize(value);
  }

  static getSizeInfo(actor) {
    const size = normalizeSize(readActorText(actor, [
      'system.size',
      'system.traits.size',
      'system.details.size',
      'system.droidSize',
      'system.droidSystems.size'
    ]));
    return {
      size,
      label: SIZE_LABELS[size] ?? 'Medium',
      rank: SIZE_ORDER[size] ?? 0
    };
  }

  static getReachSquares(actor) {
    const explicit = readActorNumber(actor, [
      'system.reach',
      'system.attributes.reach',
      'system.traits.reach',
      'system.combat.reach',
      'system.details.reach'
    ]);
    if (explicit !== null && explicit >= 0) return explicit;

    const size = this.getSizeInfo(actor).size;
    if (['fine', 'diminutive', 'tiny'].includes(size)) return 0;
    if (size === 'large') return 2;
    if (size === 'huge') return 3;
    if (size === 'gargantuan') return 4;
    if (size === 'colossal') return 6;
    return 1;
  }

  static sizeDelta(attacker, target) {
    return this.getSizeInfo(target).rank - this.getSizeInfo(attacker).rank;
  }

  static validateTargetPair(attacker, target) {
    if (!attacker || !target) return normalizeResult({ allowed: false, reason: 'A grapple action requires an actor and one target.' });
    const attackerId = actorId(attacker);
    const targetId = actorId(target);
    if (attackerId && targetId && attackerId === targetId) {
      return normalizeResult({ allowed: false, reason: 'A creature cannot grapple itself.' });
    }
    return normalizeResult({ allowed: true });
  }

  static validateSize(attacker, target, options = {}) {
    const maxDelta = Number(options.maxTargetSizeDelta ?? options.ruleData?.maxTargetSizeDelta ?? 1);
    const attackerSize = this.getSizeInfo(attacker);
    const targetSize = this.getSizeInfo(target);
    const delta = targetSize.rank - attackerSize.rank;
    if (Number.isFinite(maxDelta) && delta > maxDelta) {
      return normalizeResult({
        allowed: false,
        reason: `${target?.name ?? 'Target'} is ${targetSize.label}, which is too large for ${attacker?.name ?? 'the actor'} to grapple without a special rule.`,
        details: { attackerSize, targetSize, sizeDelta: delta, maxTargetSizeDelta: maxDelta }
      });
    }
    return normalizeResult({ allowed: true, details: { attackerSize, targetSize, sizeDelta: delta, maxTargetSizeDelta: maxDelta } });
  }

  static validateReach(attacker, target, options = {}) {
    if (options.requiresReach === false || options.ignoreReach === true) return normalizeResult({ allowed: true });
    const reach = Number(options.reachSquares ?? options.ruleData?.reachSquares ?? this.getReachSquares(attacker));
    const distance = bestDistanceSquares(attacker, target);
    if (distance === null) {
      return normalizeResult({
        allowed: true,
        soft: true,
        warnings: ['Reach could not be confirmed because one or both actors do not have scene tokens. GM/player should confirm adjacency/reach.'],
        details: { reachSquares: reach, distanceSquares: null }
      });
    }
    // Token center distance is approximate and includes token dimensions, so allow a
    // small margin and one-square adjacency for normal Medium reach.
    const allowedDistance = Math.max(1, reach || 0) + 0.25;
    if (distance > allowedDistance) {
      return normalizeResult({
        allowed: false,
        reason: `${target?.name ?? 'Target'} appears out of grapple reach (${distance.toFixed(1)} squares; reach ${reach || 0}).`,
        details: { reachSquares: reach, distanceSquares: distance }
      });
    }
    return normalizeResult({ allowed: true, details: { reachSquares: reach, distanceSquares: distance } });
  }

  static validateFreeLimb(attacker, options = {}) {
    const requiresFreeLimb = options.requiresFreeLimb === true || options.ruleData?.requiresFreeLimb === true;
    if (!requiresFreeLimb) return normalizeResult({ allowed: true });
    const explicitFree = readActorNumber(attacker, [
      'system.combat.freeGrappleLimbs',
      'system.traits.freeGrappleLimbs',
      'system.attributes.freeHands',
      'system.resources.freeHands.value'
    ]);
    if (explicitFree !== null) {
      if (explicitFree > 0) return normalizeResult({ allowed: true, details: { freeGrappleLimbs: explicitFree, freeLimbSource: 'actor data' } });
      return normalizeResult({ allowed: false, reason: `${attacker?.name ?? 'Actor'} has no free limb/appendage available for this grapple action.`, details: { freeGrappleLimbs: explicitFree, freeLimbSource: 'actor data' } });
    }

    const inferred = inferFreeGrappleAppendages(attacker);
    if (inferred?.count > 0) {
      return normalizeResult({
        allowed: true,
        soft: inferred.source === 'creature fallback',
        warnings: inferred.source === 'creature fallback' ? ['Free limb/appendage was inferred from creature type; GM/player should confirm unusual body plans.'] : [],
        details: { freeGrappleLimbs: inferred.count, freeLimbSource: inferred.source }
      });
    }

    return normalizeResult({
      allowed: true,
      soft: true,
      warnings: ['Free limb/appendage availability is not encoded on this actor. GM/player should confirm.'],
      details: { freeGrappleLimbs: null, freeLimbSource: null }
    });
  }

  static validateInitiate(attacker, target, options = {}) {
    return mergeResults(
      this.validateTargetPair(attacker, target),
      this.validateSize(attacker, target, options),
      this.validateReach(attacker, target, options),
      this.validateFreeLimb(attacker, options)
    );
  }

  static validateExistingGrapple(attacker, target, options = {}) {
    return mergeResults(
      this.validateTargetPair(attacker, target),
      this.validateSize(attacker, target, { ...options, requiresReach: false })
    );
  }

  static validateAdvancedManeuver(attacker, target, maneuver = '', options = {}) {
    return mergeResults(
      this.validateExistingGrapple(attacker, target, options),
      this.validateFreeLimb(attacker, options)
    );
  }

  static warn(result, { allowSoft = true } = {}) {
    const normalized = normalizeResult(result);
    if (normalized.allowed === false) {
      ui?.notifications?.warn?.(normalized.reason || 'This grapple action is not legal in the current context.');
      return false;
    }
    if (allowSoft && normalized.warnings?.length) {
      ui?.notifications?.warn?.(normalized.warnings.join(' '));
    }
    return true;
  }

  static async confirm(result, { title = 'Confirm Grapple Adjudication', actionName = 'Grapple Action', allowSoft = true } = {}) {
    const normalized = normalizeResult(result);
    if (normalized.allowed === false) {
      ui?.notifications?.warn?.(normalized.reason || 'This grapple action is not legal in the current context.');
      return false;
    }
    if (!allowSoft || !normalized.soft || !normalized.warnings?.length) return true;

    const warnings = normalized.warnings.map(w => `<li>${escapeHTML(w)}</li>`).join('');
    const details = normalized.details ?? {};
    const detailRows = Object.entries(details)
      .filter(([, value]) => value !== null && value !== undefined && typeof value !== 'object')
      .map(([key, value]) => `<li><strong>${escapeHTML(key)}:</strong> ${escapeHTML(value)}</li>`)
      .join('');
    const content = `<form class="swse-grapple-confirm"><p><strong>${escapeHTML(actionName)}</strong> needs GM/player confirmation before proceeding.</p><ul>${warnings}</ul>${detailRows ? `<hr><ul>${detailRows}</ul>` : ''}</form>`;
    try {
      return await confirmDialog({ title, content, yes: 'Proceed', no: 'Cancel', defaultYes: false });
    } catch (_err) {
      this.warn(normalized, { allowSoft: true });
      return true;
    }
  }
}

export default GrappleLegalityEngine;
