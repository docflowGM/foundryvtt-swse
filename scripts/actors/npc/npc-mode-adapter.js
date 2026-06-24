/**
 * NPC Mode Adapter
 *
 * Central authority for NPC mode + subtype resolution.
 * Bridges dual flag namespace (foundryvtt-swse vs swse) during migration.
 * Normalizes legacy system.useProgression reads and imported/statblock actors.
 *
 * Phase 2: resolves non-mutating NPC profile/authority context for the sheet.
 */

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
  if (pack.includes('nonheroic') || rawContains(actor, ['nonheroic'])) return 'nonheroic';
  if (pack.includes('heroic')) return 'heroic';

  const classText = normalizeKey(`${actor?.system?.className ?? ''} ${actor?.system?.class ?? ''}`);
  if (classText.includes('nonheroic')) return 'nonheroic';
  if (classText) return 'heroic';

  return getRawImport(actor) ? 'imported' : 'standard';
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

  return {
    kind,
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
