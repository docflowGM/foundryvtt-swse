/**
 * NPC Mode Adapter
 *
 * Central authority for NPC mode + subtype resolution.
 * Bridges dual flag namespace (foundryvtt-swse vs swse) during migration.
 * Normalizes legacy system.useProgression reads and imported/statblock actors.
 *
 * Phase 2: resolves non-mutating NPC profile/authority context for the sheet.
 */

import { evaluateNonheroicTransition } from '../../engine/progression/utils/nonheroic-class-model.js';

const NPC_KINDS = new Set([
  'heroic',
  'nonheroic',
  'beast',
  'mount',
  'follower',
  'minion',
  'privateer',
  'companion',
  'imported',
  'standard'
]);

const NPC_MODES = new Set(['play', 'legal-review', 'progression', 'owner-sync', 'hybrid', 'statblock']);
const SOURCE_AUTHORITIES = new Set(['statblock', 'progression', 'hybrid', 'owner']);
const LEGAL_PROFILES = new Set(['heroic', 'nonheroic', 'beast', 'mount', 'follower', 'minion', 'imported-statblock', 'standard']);

function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function asText(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.filter(Boolean).join(' ');
  if (typeof value === 'object') return Object.values(value).filter(v => typeof v !== 'object').join(' ');
  return String(value);
}

function getRawImport(actor) {
  return actor?.flags?.swse?.import?.raw
    ?? actor?.flags?.['foundryvtt-swse']?.import?.raw
    ?? actor?.system?.import?.raw
    ?? null;
}

function getPackKey(actor) {
  return String(
    actor?.pack
    ?? actor?.flags?.swse?.import?.pack
    ?? actor?.flags?.['foundryvtt-swse']?.import?.pack
    ?? actor?.flags?.swse?.sourcePack
    ?? ''
  ).toLowerCase();
}

function hasBeastData(actor) {
  return Boolean(actor?.flags?.swse?.beastData || actor?.flags?.['foundryvtt-swse']?.beastData || actor?.system?.beastData);
}

function hasOwnerLink(actor) {
  return Boolean(
    actor?.system?.npcProfile?.owner?.actorId
    || actor?.flags?.swse?.follower?.ownerId
    || actor?.flags?.swse?.minion?.ownerId
    || actor?.flags?.['foundryvtt-swse']?.follower?.ownerId
    || actor?.flags?.['foundryvtt-swse']?.minion?.ownerId
  );
}

function rawContains(actor, patterns = []) {
  const raw = getRawImport(actor);
  const haystack = normalizeKey([
    actor?.name,
    actor?.system?.className,
    actor?.system?.class,
    actor?.system?.race,
    actor?.system?.species,
    actor?.system?.creatureType,
    actor?.system?.npcType,
    asText(raw)
  ].join(' '));
  return patterns.some(pattern => haystack.includes(pattern));
}

function hasClassItems(actor) {
  return Boolean(actor?.items?.some?.(item => item?.type === 'class'));
}

function isNonheroicClassItem(item) {
  if (item?.system?.isNonheroic === true) return true;
  const key = normalizeKey(item?.system?.classId ?? item?.system?.class_name ?? item?.name);
  return key === 'nonheroic';
}

/**
 * Progression identity established by EMBEDDED CLASS RECORDS (the canonical
 * class history), not by descriptive text. All class items nonheroic ->
 * 'nonheroic'; any heroic class item -> 'heroic' (mixed-track NPCs are heroic
 * by identity and expose both levels through getLevelSplit()); no class items
 * -> null.
 */
function classItemKind(actor) {
  const classItems = actor?.items?.filter?.(item => item?.type === 'class') ?? [];
  return classKindFromEntries(classItems);
}

/**
 * Identity from a list of class records/entries (anything with `system.isNonheroic`
 * or a Nonheroic name/classId): all nonheroic -> 'nonheroic', any heroic ->
 * 'heroic', none -> null. Shared by the live-actor resolver and by the finalizer
 * when it reconciles the stored profile with the class history a plan will leave.
 */
export function classKindFromEntries(entries = []) {
  const list = Array.from(entries || []).filter(Boolean);
  if (!list.length) return null;
  return list.every(isNonheroicClassItem) ? 'nonheroic' : 'heroic';
}

/** Text/pack-derived kind (descriptive metadata; never outranks class records). */
function heuristicKind(actor) {
  const pack = getPackKey(actor);
  if (pack.includes('nonheroic') || rawContains(actor, ['nonheroic'])) return 'nonheroic';
  if (pack.includes('heroic')) return 'heroic';

  const classText = normalizeKey(`${actor?.system?.className ?? ''} ${actor?.system?.class ?? ''}`);
  if (classText.includes('nonheroic')) return 'nonheroic';
  if (classText) return 'heroic';
  return null;
}

function inferKind(actor) {
  const explicit = normalizeKey(actor?.system?.npcProfile?.kind ?? actor?.system?.npcProfile?.type);
  if (NPC_KINDS.has(explicit)) return explicit;

  const minionKind = normalizeKey(actor?.flags?.swse?.minion?.kind ?? actor?.flags?.['foundryvtt-swse']?.minion?.kind);
  if (minionKind === 'privateer') return 'privateer';
  if (actor?.flags?.swse?.minion?.ownerId || actor?.flags?.['foundryvtt-swse']?.minion?.ownerId || actor?.system?.isMinion) return 'minion';
  if (actor?.flags?.swse?.follower?.ownerId || actor?.flags?.['foundryvtt-swse']?.follower?.ownerId || actor?.system?.isFollower) return 'follower';

  const profileRole = normalizeKey(actor?.system?.npcProfile?.role ?? actor?.system?.npcProfile?.subtype);
  if (profileRole.includes('mount')) return 'mount';

  const pack = getPackKey(actor);
  const creatureType = normalizeKey(actor?.system?.creatureType ?? actor?.system?.type ?? actor?.system?.npcType);
  if (creatureType.includes('mount')) return 'mount';
  if (creatureType.includes('beast') || hasBeastData(actor) || pack.includes('beast')) return 'beast';

  // Canonical class history outranks descriptive text.
  const fromClasses = classItemKind(actor);
  if (fromClasses) return fromClasses;

  return heuristicKind(actor) ?? (getRawImport(actor) ? 'imported' : 'standard');
}

/**
 * Report (never silently resolve) disagreements between the NPC's declared
 * identity and its embedded class records:
 *  - explicit npcProfile.kind/legalProfile heroic|nonheroic vs class-derived kind
 *  - descriptive pack/text kind vs class-derived kind
 * @param {Actor} actor
 * @returns {Array<{code:string, declared:string, derived:string, message:string}>}
 */
export function getNpcIdentityConflicts(actor) {
  if (actor?.type !== 'npc') return [];
  const derived = classItemKind(actor);
  if (!derived) return [];
  const conflicts = [];

  const declaredExplicit = [
    normalizeKey(actor?.system?.npcProfile?.kind ?? actor?.system?.npcProfile?.type),
    normalizeKey(actor?.system?.npcProfile?.legalProfile)
  ].filter(value => value === 'heroic' || value === 'nonheroic');
  for (const declared of new Set(declaredExplicit)) {
    if (declared !== derived) {
      conflicts.push({
        code: 'profile-vs-class-items',
        declared,
        derived,
        message: `NPC profile says "${declared}" but its embedded class records are ${derived}.`
      });
    }
  }

  const textual = heuristicKind(actor);
  if (!declaredExplicit.length && textual && textual !== derived) {
    conflicts.push({
      code: 'metadata-vs-class-items',
      declared: textual,
      derived,
      message: `NPC metadata (pack/class text) suggests "${textual}" but its embedded class records are ${derived}.`
    });
  }
  return conflicts;
}

function inferMode(actor, kind = inferKind(actor)) {
  const profileMode = normalizeKey(actor?.system?.npcProfile?.mode ?? actor?.system?.npcProfile?.importMode);
  if (NPC_MODES.has(profileMode)) return profileMode === 'statblock' ? 'play' : profileMode;

  const profileAuthorityMode = normalizeKey(actor?.system?.npcMode);
  if (NPC_MODES.has(profileAuthorityMode)) return profileAuthorityMode === 'statblock' ? 'play' : profileAuthorityMode;

  const canonicalMode = normalizeKey(actor?.getFlag?.('foundryvtt-swse', 'npcLevelUp.mode'));
  if (canonicalMode === 'progression') return 'progression';
  if (canonicalMode === 'owner-sync') return 'owner-sync';
  if (canonicalMode === 'statblock') return 'play';

  const legacyMode = normalizeKey(actor?.getFlag?.('swse', 'npcLevelUp.mode'));
  if (legacyMode === 'progression') return 'progression';
  if (legacyMode === 'owner-sync') return 'owner-sync';
  if (legacyMode === 'statblock') return 'play';

  if (actor?.system?.useProgression === true) return 'progression';
  if (actor?.system?.useProgression === false) return 'play';
  if (['minion', 'privateer'].includes(kind) && hasOwnerLink(actor)) return 'owner-sync';
  if (hasClassItems(actor) && !getRawImport(actor)) return 'progression';
  return 'play';
}

function inferSourceAuthority(actor, kind, mode) {
  const explicit = normalizeKey(actor?.system?.npcProfile?.sourceAuthority ?? actor?.system?.npcProfile?.authority);
  if (SOURCE_AUTHORITIES.has(explicit)) return explicit;
  if (mode === 'owner-sync') return 'owner';
  if (mode === 'progression') return 'progression';
  if (mode === 'hybrid') return 'hybrid';
  if (getRawImport(actor) || hasBeastData(actor) || getPackKey(actor)) return 'statblock';
  if (['heroic', 'nonheroic'].includes(kind) && hasClassItems(actor)) return 'progression';
  return 'statblock';
}

function inferLegalProfile(kind, actor) {
  const explicit = normalizeKey(actor?.system?.npcProfile?.legalProfile);
  if (LEGAL_PROFILES.has(explicit)) return explicit;
  if (kind === 'privateer') return 'minion';
  if (kind === 'imported') return 'imported-statblock';
  if (LEGAL_PROFILES.has(kind)) return kind;
  return 'standard';
}

function inferLegalState(actor, mode, sourceAuthority) {
  const explicit = normalizeKey(actor?.system?.npcProfile?.legalState ?? actor?.system?.npcProfile?.validationState);
  if (explicit) return explicit;
  if (mode === 'legal-review') return 'needs-review';
  if (sourceAuthority === 'progression') return 'unchecked';
  return 'playable-unchecked';
}

function labelFromKey(value) {
  const key = normalizeKey(value);
  if (!key) return 'Unknown';
  const labels = {
    heroic: 'Heroic NPC',
    nonheroic: 'Nonheroic NPC',
    beast: 'Beast',
    mount: 'Mount',
    follower: 'Follower',
    minion: 'Minion',
    privateer: 'Privateer',
    companion: 'Companion',
    imported: 'Imported NPC',
    standard: 'NPC',
    play: 'Table Ready',
    'legal-review': 'Legal Review',
    progression: 'Progression Mode',
    'owner-sync': 'Owner Sync',
    hybrid: 'Hybrid Mode',
    statblock: 'Statblock',
    owner: 'Owner Sync',
    'imported-statblock': 'Imported Statblock',
    unchecked: 'Unchecked',
    'needs-review': 'Needs Review',
    'playable-unchecked': 'Playable',
    'gm-approved-with-overrides': 'GM Approved',
    'progression-legal': 'Progression Legal'
  };
  return labels[key] ?? key.split('-').map(part => part ? part[0].toUpperCase() + part.slice(1) : '').join(' ');
}

/**
 * Build a non-mutating NPC classification/profile authority summary.
 * @param {Actor} actor
 * @returns {Object}
 */
export function getNpcProfileState(actor) {
  const kind = inferKind(actor);
  const mode = inferMode(actor, kind);
  const sourceAuthority = inferSourceAuthority(actor, kind, mode);
  const legalProfile = inferLegalProfile(kind, actor);
  const legalState = inferLegalState(actor, mode, sourceAuthority);
  const rawImport = getRawImport(actor);
  const packKey = getPackKey(actor);
  const imported = Boolean(rawImport || packKey);
  const profileMissing = !actor?.system?.npcProfile;
  const classItemCount = actor?.items?.filter?.(item => item?.type === 'class')?.length ?? 0;
  const identityConflicts = getNpcIdentityConflicts(actor);

  return {
    kind,
    // Contradictory identity data is reported, never silently resolved. An
    // identity is "ambiguous" when neither an explicit profile, a dependent
    // relationship nor class records establish what this NPC is.
    identityConflicts,
    identityAmbiguous: ['standard', 'imported'].includes(kind) && classItemCount === 0,
    mode,
    sourceAuthority,
    legalProfile,
    legalState,
    imported,
    profileMissing,
    hasRawImport: Boolean(rawImport),
    hasBeastData: hasBeastData(actor),
    packKey,
    hasOwnerLink: hasOwnerLink(actor),
    hasClassItems: classItemCount > 0,
    classItemCount,
    labels: {
      kind: labelFromKey(kind),
      mode: labelFromKey(mode),
      sourceAuthority: labelFromKey(sourceAuthority),
      legalProfile: labelFromKey(legalProfile),
      legalState: labelFromKey(legalState)
    }
  };
}

/**
 * Get canonical NPC mode for legacy callers.
 * @param {Actor} actor
 * @returns {string} 'statblock' | 'progression' | 'owner-sync' | 'hybrid' | 'legal-review'
 */
export function getNpcMode(actor) {
  const mode = getNpcProfileState(actor).mode;
  return mode === 'play' ? 'statblock' : mode;
}

/**
 * Get NPC subtype/kind.
 * @param {Actor} actor
 * @returns {string}
 */
export function getNpcKind(actor) {
  return getNpcProfileState(actor).kind;
}

/**
 * Check if NPC is in statblock/play mode.
 * @param {Actor} actor
 * @returns {boolean}
 */
export function isNpcStatblockMode(actor) {
  const state = getNpcProfileState(actor);
  return state.mode === 'play' || state.sourceAuthority === 'statblock';
}

/**
 * Check if NPC is in progression mode.
 * @param {Actor} actor
 * @returns {boolean}
 */
export function isNpcProgressionMode(actor) {
  return getNpcProfileState(actor).mode === 'progression';
}

/**
 * Build canonical mode update payload.
 * Sets the canonical flag namespace only.
 * @param {string} mode
 * @returns {Object}
 */
export function setNpcModeUpdate(mode) {
  const normalized = normalizeKey(mode);
  if (!['statblock', 'progression', 'owner-sync', 'hybrid', 'legal-review', 'play'].includes(normalized)) {
    throw new Error(`Invalid NPC mode: "${mode}".`);
  }
  const flagMode = normalized === 'play' ? 'statblock' : normalized;
  return {
    'flags.foundryvtt-swse.npcLevelUp.mode': flagMode
  };
}

/**
 * Build an explicit metadata payload for importers/repair tools.
 * This is intentionally not applied by sheet open/render.
 * @param {Actor} actor
 * @returns {Object}
 */
export function buildNpcProfileUpdate(actor) {
  const state = getNpcProfileState(actor);
  return {
    'system.npcProfile.kind': state.kind,
    'system.npcProfile.mode': state.mode,
    'system.npcProfile.sourceAuthority': state.sourceAuthority,
    'system.npcProfile.legalProfile': state.legalProfile,
    'system.npcProfile.legalState': state.legalState
  };
}

const NPC_CALCULATION_MODES = new Set(['progression', 'statblock', 'follower']);

/**
 * Phase 2 authority normalization — single explicit mechanical-authority mode
 * for an NPC actor, consolidating the existing kind/mode/sourceAuthority
 * fields (all resolved above) into the one enum
 * docs/audits/v2-actor-authority-performance-phase-1.md §12 recommended:
 * 'progression' | 'statblock' | 'follower'.
 *
 * This does NOT add new inference — it is a thin, explicit read of the same
 * getNpcProfileState() this file already computes, so every existing
 * consumer of kind/mode/sourceAuthority keeps working unchanged. It exists
 * so computeNpcDerived() and any future statblock-override logic have ONE
 * name to branch on instead of re-deriving "is this NPC calculated or
 * authoritative-from-import" from kind+mode+sourceAuthority each time.
 *
 * 'beast' is intentionally NOT a calculationMode value: beast-specific
 * mechanics (BeastSubtypeAdapter) only run during chargen/progression
 * sessions, never during ordinary derived-data computation — a beast NPC's
 * calculationMode is whichever of progression/statblock/follower actually
 * governs its defenses/HP/DT today (see the kind vs. calculationMode
 * distinction in the Phase 2 authority-normalization audit doc). Follower
 * takes priority over sourceAuthority because followers use their own
 * defense formula (buildFollowerDefenseValues in npc-sheet-helpers.js)
 * regardless of how they were imported.
 *
 * Explicit-field-wins, same priority order as resolveDroidCalculationMode()
 * in scripts/actors/droid/droid-mode-adapter.js: a valid stored
 * system.npcProfile.calculationMode is trusted outright (an import/GM
 * decision should not be silently overridden by inference every render);
 * only an absent/invalid stored value falls through to inference from
 * kind/mode/sourceAuthority.
 *
 * @param {Actor} actor
 * @returns {'progression'|'statblock'|'follower'}
 */
export function resolveNpcCalculationMode(actor) {
  const explicit = normalizeKey(actor?.system?.npcProfile?.calculationMode);
  if (NPC_CALCULATION_MODES.has(explicit)) return explicit;

  const state = getNpcProfileState(actor);
  if (state.kind === 'follower') return 'follower';
  if (state.mode === 'progression') return 'progression';
  if (state.sourceAuthority === 'progression') return 'progression';
  return 'statblock';
}

/**
 * @param {Actor} actor
 * @returns {boolean}
 */
export function isNpcCalculationMode(actor, mode) {
  if (!NPC_CALCULATION_MODES.has(mode)) return false;
  return resolveNpcCalculationMode(actor) === mode;
}

/**
 * Check if NPC should use flat statblock attack bonuses.
 * @param {Actor} actor
 * @param {Item} weapon
 * @returns {boolean}
 */
export function usesFlatStatblockAttacks(actor, weapon) {
  if (!actor || actor.type !== 'npc') return false;
  if (!isNpcStatblockMode(actor)) return false;
  return weapon?.flags?.swse?.npc?.useFlat === true && Number.isFinite(weapon?.flags?.swse?.npc?.flatAttackBonus);
}


// ---------------------------------------------------------------------------
// Central progression guard + profile/class identity reconciliation
// ---------------------------------------------------------------------------

const DEPENDENT_KINDS = new Set(['beast', 'mount', 'follower', 'minion', 'privateer', 'companion']);

function heroicNonheroicLevels(actor) {
  let heroic = 0;
  let nonheroic = 0;
  for (const item of actor?.items?.filter?.(i => i?.type === 'class') ?? []) {
    const level = Number(item?.system?.level) || 0;
    if (isNonheroicClassItem(item)) nonheroic += level; else heroic += level;
  }
  return { heroic, nonheroic };
}

/** An NPC that already carries mechanical history (as opposed to a blank draft). */
export function npcHasExistingMechanics(actor) {
  if (actor?.type !== 'npc' || !actor?.id) return false;
  return (Number(actor?.system?.level) || 0) > 0
    || hasClassItems(actor)
    || Boolean(getRawImport(actor))
    || Boolean(getPackKey(actor));
}

/**
 * Fail-closed progression guard for EXISTING NPCs, independent of caller, UI
 * entry point or requested subtype. A requested/declared heroic or nonheroic
 * identity never overrides statblock authority; only an authorized, snapshot
 * backed conversion does.
 *
 * @param {Actor} actor
 * @param {{subtype?: string|null, conversion?: {target?: string, originSnapshot?: *}|null, originSnapshotExists?: boolean}} [ctx]
 * @returns {{blocked: boolean, reason: string|null, message: string, conflicts?: Array}}
 */
export function evaluateNpcProgressionGuard(actor, ctx = {}) {
  const ok = { blocked: false, reason: null, message: '' };
  if (actor?.type !== 'npc' || !npcHasExistingMechanics(actor)) return ok;

  const state = getNpcProfileState(actor);
  if (DEPENDENT_KINDS.has(state.kind) || state.mode === 'owner-sync') return ok;

  if (state.identityConflicts?.length) {
    return {
      blocked: true,
      reason: 'identity-conflict',
      conflicts: state.identityConflicts,
      message: `${state.identityConflicts.map(c => c.message).join(' ')} Resolve this in NPC Legal Review & Repair before advancing.`
    };
  }

  const requested = ctx.subtype === 'heroic' || ctx.subtype === 'nonheroic' ? ctx.subtype : null;
  if (requested === 'nonheroic') {
    const { heroic, nonheroic } = heroicNonheroicLevels(actor);
    const transition = evaluateNonheroicTransition({ heroicLevel: heroic, nonheroicLevel: nonheroic, target: 'nonheroic' });
    if (!transition.allowed) return { blocked: true, reason: 'transition-not-allowed', message: transition.reason };
  }

  const statblockControlled = resolveNpcCalculationMode(actor) === 'statblock'
    || state.sourceAuthority === 'statblock'
    || state.mode === 'play';
  if (statblockControlled) {
    const conv = ctx.conversion;
    const authorized = Boolean(conv && ['heroic', 'nonheroic'].includes(conv.target) && ctx.originSnapshotExists === true
      && (!requested || requested === conv.target));
    if (!authorized) {
      return {
        blocked: true,
        reason: 'statblock-conversion-required',
        message: 'This NPC uses its published statblock as authority. Convert it to calculated progression from the NPC level-up dialog (which saves a restorable snapshot) before advancing it.'
      };
    }
  }
  return ok;
}

/**
 * Profile fields that must change in the SAME transaction as a progression plan
 * so the stored NPC identity matches the class history the plan leaves behind
 * (Nonheroic 3 + first Soldier level => 'heroic' identity with separate level
 * accounting), plus the explicit statblock-conversion authority switch.
 * Pure: returns `set` paths only.
 */
export function buildNpcProfileReconciliationPatch(actor, { addedClassItems = [], conversion = null, now = new Date().toISOString(), userId = null } = {}) {
  if (actor?.type !== 'npc') return {};
  const profile = actor?.system?.npcProfile ?? null;
  const patch = {};

  const existing = actor?.items?.filter?.(item => item?.type === 'class') ?? [];
  const derived = classKindFromEntries([...existing, ...addedClassItems]);
  const storedKind = normalizeKey(profile?.kind ?? profile?.type);
  const storedLegal = normalizeKey(profile?.legalProfile);
  const dependent = DEPENDENT_KINDS.has(storedKind) || DEPENDENT_KINDS.has(storedLegal);

  if (derived && !dependent) {
    const declared = (storedKind === 'heroic' || storedKind === 'nonheroic') ? storedKind
      : ((storedLegal === 'heroic' || storedLegal === 'nonheroic') ? storedLegal : null);
    if (declared !== null && (declared !== derived || storedKind !== derived || storedLegal !== derived)) {
      patch['system.npcProfile.kind'] = derived;
      patch['system.npcProfile.legalProfile'] = derived;
    }
  }

  if (conversion) {
    const before = getNpcProfileState(actor);
    const kind = derived ?? conversion.target;
    patch['system.npcProfile.kind'] = kind;
    patch['system.npcProfile.legalProfile'] = kind;
    patch['system.npcProfile.mode'] = 'progression';
    patch['system.npcProfile.sourceAuthority'] = 'progression';
    patch['system.npcProfile.calculationMode'] = 'progression';
    patch['system.npcProfile.legalReview.statblockConversion'] = {
      convertedAt: now,
      convertedBy: userId,
      target: conversion.target,
      originSnapshot: conversion.originSnapshot ?? null,
      fromAuthority: before.sourceAuthority,
      fromMode: before.mode,
      fromKind: before.kind
    };
  }
  return patch;
}
