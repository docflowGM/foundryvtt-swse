/**
 * NPC Legal Review Engine
 *
 * Phase 8 foundation: read-only legality/checklist reporting for NPC Play Mode.
 * This engine does not repair or mutate actors. It distinguishes table usability
 * from progression legality and dispatches checks through NPC legal profiles.
 */

import { getNpcProfileState } from '/systems/foundryvtt-swse/scripts/actors/npc/npc-mode-adapter.js';

const CHECK_SEVERITY = Object.freeze({
  OK: 'ok',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
});

function getPropertySafe(object, path, fallback = undefined) {
  if (!object || !path) return fallback;
  const foundryGet = globalThis.foundry?.utils?.getProperty;
  if (typeof foundryGet === 'function') {
    const value = foundryGet(object, path);
    return value === undefined ? fallback : value;
  }
  return String(path).split('.').reduce((value, key) => value?.[key], object) ?? fallback;
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return Object.values(value);
  return [value];
}

function asText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join('\n');
  if (typeof value === 'object') return Object.entries(value)
    .map(([key, entry]) => `${key}: ${asText(entry)}`)
    .filter(Boolean)
    .join('\n');
  return String(value);
}

function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function numberish(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function titleCase(value) {
  return String(value ?? '')
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getProgressionSkeleton(actor) {
  const skeleton = getPropertySafe(actor, 'system.npcProfile.progressionSkeleton', null);
  if (!skeleton || typeof skeleton !== 'object') return null;
  return skeleton;
}

function summarizeProgressionSkeleton(skeleton) {
  if (!skeleton || typeof skeleton !== 'object') return null;
  const entries = asArray(skeleton.entries)
    .map((entry, index) => ({
      order: Number(entry?.order ?? index + 1),
      classId: String(entry?.classId ?? entry?.id ?? normalizeKey(entry?.name ?? 'class')),
      name: String(entry?.name ?? entry?.label ?? titleCase(entry?.classId ?? 'Class')),
      levels: Number(entry?.levels ?? entry?.level ?? 0),
      source: entry?.source ?? null,
      confidence: entry?.confidence ?? null
    }))
    .filter(entry => entry.name && Number.isFinite(entry.levels) && entry.levels > 0)
    .sort((a, b) => a.order - b.order);
  const totalLevels = Number(skeleton.totalLevels ?? entries.reduce((sum, entry) => sum + entry.levels, 0));
  return {
    version: skeleton.version ?? 1,
    source: skeleton.source ?? null,
    status: skeleton.status ?? 'unknown',
    statusLabel: titleCase(skeleton.status ?? 'unknown'),
    bucket: skeleton.bucket ?? null,
    bucketLabel: titleCase(skeleton.bucket ?? ''),
    nonheroicFirstRule: skeleton.nonheroicFirstRule ?? null,
    nonheroicFirstValid: skeleton.nonheroicFirstValid === true,
    totalLevels,
    classItemsCreated: skeleton.classItemsCreated === true,
    statblockValuesPreserved: skeleton.statblockValuesPreserved !== false,
    entries
  };
}


const NONHEROIC_BAB_PROGRESSION = Object.freeze([
  0, 1, 2, 3, 3, 4, 5, 6, 6, 7,
  8, 9, 9, 10, 11, 12, 12, 13, 14, 15
]);

function formatProgressionPath(entries = []) {
  return asArray(entries)
    .map(entry => `${entry.name ?? titleCase(entry.classId ?? 'Class')} ${entry.levels ?? entry.level ?? 0}`)
    .join(' → ');
}

function classItems(actor) {
  return itemType(actor, 'class').map((item, index) => {
    const system = item?.system ?? {};
    const classId = normalizeKey(system.classId ?? system.class_id ?? system.id ?? system.class_name ?? item?.name ?? 'class');
    const level = Number(system.level ?? system.levels ?? system.classLevel ?? 0);
    const order = Number(system.progressionSkeletonOrder ?? system.order ?? index + 1);
    return {
      id: item?.id ?? item?._id ?? null,
      name: String(system.class_name ?? item?.name ?? titleCase(classId)),
      classId,
      level: Number.isFinite(level) ? level : 0,
      order: Number.isFinite(order) ? order : index + 1,
      item,
      system,
      isNonheroic: system.isNonheroic === true || classId === 'nonheroic'
    };
  }).filter(entry => entry.classId && entry.level > 0);
}

function summarizeClassItemPath(entries = []) {
  return entries
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(entry => `${entry.name} ${entry.level}`)
    .join(' → ');
}

function aggregateClassLevels(entries = []) {
  const map = new Map();
  for (const entry of entries) {
    const classId = normalizeKey(entry.classId ?? entry.name ?? 'class');
    if (!classId) continue;
    const levels = Number(entry.levels ?? entry.level ?? 0);
    if (!Number.isFinite(levels) || levels <= 0) continue;
    const current = map.get(classId) ?? { classId, name: entry.name ?? titleCase(classId), levels: 0 };
    current.levels += levels;
    map.set(classId, current);
  }
  return map;
}

function validateNonheroicFirst(entries = []) {
  const ordered = asArray(entries).slice().sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
  let heroicStarted = false;
  for (const entry of ordered) {
    const id = normalizeKey(entry.classId ?? entry.name ?? 'class');
    const isNonheroic = id === 'nonheroic';
    if (!isNonheroic) heroicStarted = true;
    if (isNonheroic && heroicStarted) return false;
  }
  return true;
}

function compareSkeletonToClassItems(skeleton, classItemEntries) {
  const skeletonEntries = asArray(skeleton?.entries);
  const expected = aggregateClassLevels(skeletonEntries);
  const actual = aggregateClassLevels(classItemEntries.map(entry => ({
    classId: entry.classId,
    name: entry.name,
    levels: entry.level
  })));
  const missing = [];
  const mismatched = [];
  const extra = [];

  for (const [classId, expectedEntry] of expected.entries()) {
    const actualEntry = actual.get(classId);
    if (!actualEntry) {
      missing.push(expectedEntry);
      continue;
    }
    if (actualEntry.levels !== expectedEntry.levels) {
      mismatched.push({ classId, name: expectedEntry.name, expected: expectedEntry.levels, actual: actualEntry.levels });
    }
  }

  for (const [classId, actualEntry] of actual.entries()) {
    if (!expected.has(classId)) extra.push(actualEntry);
  }

  const expectedTotal = Number(skeleton?.totalLevels ?? Array.from(expected.values()).reduce((sum, entry) => sum + entry.levels, 0));
  const actualTotal = Array.from(actual.values()).reduce((sum, entry) => sum + entry.levels, 0);
  return {
    expectedTotal,
    actualTotal,
    missing,
    mismatched,
    extra,
    matches: missing.length === 0 && mismatched.length === 0 && extra.length === 0 && expectedTotal === actualTotal
  };
}

function resolveLevelProgression(system = {}) {
  if (Array.isArray(system.level_progression)) return system.level_progression;
  if (Array.isArray(system.levelProgression)) return system.levelProgression;
  if (system.levelProgression && typeof system.levelProgression === 'object') {
    return Object.entries(system.levelProgression)
      .map(([level, value]) => ({ level: Number(level), ...(value || {}) }))
      .sort((a, b) => (a.level || 0) - (b.level || 0));
  }
  return [];
}

function estimateBabFromRate(system = {}, level = 0) {
  const rate = normalizeKey(system.babProgression ?? system.baseAttackBonus ?? '');
  if (!Number.isFinite(level) || level <= 0) return null;
  if (rate === 'fast' || rate === 'high') return level;
  if (rate === 'slow' || rate === 'medium' || rate === 'low') return Math.floor(level * 0.75);
  return null;
}

function expectedBabForClassItem(classItemEntry) {
  const level = Number(classItemEntry?.level ?? 0);
  if (!Number.isFinite(level) || level <= 0) return { value: null, source: 'missing-level' };
  if (classItemEntry?.isNonheroic) {
    if (level <= NONHEROIC_BAB_PROGRESSION.length) {
      return { value: NONHEROIC_BAB_PROGRESSION[level - 1], source: 'nonheroic-table' };
    }
    return { value: null, source: 'nonheroic-level-out-of-range' };
  }

  const progression = resolveLevelProgression(classItemEntry?.system ?? {});
  const levelEntry = progression.find(entry => Number(entry?.level) === level) ?? progression[level - 1];
  const exactBab = Number(levelEntry?.bab);
  if (Number.isFinite(exactBab)) return { value: exactBab, source: 'class-level-progression' };

  const estimated = estimateBabFromRate(classItemEntry?.system ?? {}, level);
  if (estimated !== null) return { value: estimated, source: 'bab-progression-estimate' };
  return { value: null, source: 'missing-bab-progression' };
}

function expectedBabFromClassItems(classItemEntries = []) {
  let total = 0;
  const missing = [];
  const parts = [];
  for (const entry of classItemEntries) {
    const result = expectedBabForClassItem(entry);
    if (result.value === null) {
      missing.push({ classId: entry.classId, name: entry.name, reason: result.source });
      continue;
    }
    total += result.value;
    parts.push({ classId: entry.classId, name: entry.name, level: entry.level, bab: result.value, source: result.source });
  }
  return { total, missing, parts, complete: missing.length === 0 };
}

function itemType(actor, type) {
  return Array.from(actor?.items ?? []).filter(item => String(item?.type ?? '').toLowerCase() === type);
}

function rawImport(actor) {
  return actor?.flags?.swse?.import?.raw
    ?? actor?.flags?.['foundryvtt-swse']?.import?.raw
    ?? actor?.system?.import?.raw
    ?? null;
}

function beastData(actor) {
  return actor?.flags?.swse?.beastData
    ?? actor?.flags?.['foundryvtt-swse']?.beastData
    ?? actor?.system?.beastData
    ?? null;
}

function actorPack(actor) {
  return String(actor?.pack ?? actor?.flags?.swse?.import?.pack ?? actor?.flags?.swse?.sourcePack ?? '').toLowerCase();
}

function hasAny(object, paths = []) {
  return paths.some(path => {
    const value = getPropertySafe(object, path, undefined);
    return value !== undefined && value !== null && value !== '';
  });
}

function readDefense(actor, keys = []) {
  for (const key of keys) {
    const value = getPropertySafe(actor, `system.defenses.${key}.total`)
      ?? getPropertySafe(actor, `system.derived.defenses.${key}.total`)
      ?? getPropertySafe(actor, `system.derived.defenses.${key}.value`);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function readRawValue(actor, labels = []) {
  const raw = rawImport(actor);
  if (!raw || typeof raw !== 'object') return '';
  const normalizedLabels = labels.map(normalizeKey);
  for (const [key, value] of Object.entries(raw)) {
    if (normalizedLabels.includes(normalizeKey(key))) return asText(value);
  }
  return '';
}

function rawContains(actor, patterns = []) {
  const haystack = normalizeKey([
    actor?.name,
    actor?.system?.className,
    actor?.system?.class,
    actor?.system?.race,
    actor?.system?.species,
    actor?.system?.creatureType,
    asText(rawImport(actor)),
    asText(beastData(actor))
  ].join(' '));
  return patterns.some(pattern => haystack.includes(normalizeKey(pattern)));
}

function makeCheck(id, label, severity, message, options = {}) {
  return {
    id,
    label,
    severity,
    tone: severity,
    status: severity === CHECK_SEVERITY.OK ? 'OK' : severity === CHECK_SEVERITY.ERROR ? 'Fix Needed' : severity === CHECK_SEVERITY.WARN ? 'Review' : 'Info',
    message,
    detail: options.detail ?? null,
    action: options.action ?? null,
    canAutoFix: options.canAutoFix === true,
    requiresGm: options.requiresGm === true
  };
}

function ok(id, label, message, options = {}) { return makeCheck(id, label, CHECK_SEVERITY.OK, message, options); }
function info(id, label, message, options = {}) { return makeCheck(id, label, CHECK_SEVERITY.INFO, message, options); }
function warn(id, label, message, options = {}) { return makeCheck(id, label, CHECK_SEVERITY.WARN, message, options); }
function error(id, label, message, options = {}) { return makeCheck(id, label, CHECK_SEVERITY.ERROR, message, options); }

class BaseNpcLegalProfile {
  constructor(actor, profileState) {
    this.actor = actor;
    this.profileState = profileState;
    this.raw = rawImport(actor);
    this.beastData = beastData(actor);
    this.items = Array.from(actor?.items ?? []);
    this.system = actor?.system ?? {};
  }

  get id() { return 'standard'; }
  get label() { return 'Standard NPC'; }

  buildChecks() {
    return [
      ...this.buildProfileChecks(),
      ...this.buildCoreStatChecks(),
      ...this.buildCombatChecks(),
      ...this.buildFeatureChecks(),
      ...this.buildAuthorityChecks()
    ];
  }

  buildProfileChecks() {
    const checks = [];
    const hasProfile = Boolean(this.actor?.system?.npcProfile);
    checks.push(hasProfile
      ? ok('profile-present', 'NPC profile metadata', 'Canonical npcProfile metadata is present.')
      : warn('profile-missing', 'NPC profile metadata', 'No canonical npcProfile metadata exists yet; the sheet is using inferred Play/Legal context.', {
          canAutoFix: true,
          action: 'Normalize profile metadata in Review & Repair.'
        }));

    checks.push(ok('profile-authority', 'Source authority', `${this.profileState.labels.sourceAuthority} authority is active for this NPC.`));
    checks.push(ok('legal-profile', 'Legal profile', `This NPC will be reviewed using the ${this.profileState.labels.legalProfile} checklist.`));

    if (this.profileState.imported || this.profileState.hasRawImport || actorPack(this.actor)) {
      checks.push(ok('source-preserved', 'Source data', 'Imported/source context is present for Play Mode reference.'));
    } else {
      checks.push(info('source-not-present', 'Source data', 'No raw import/source context was found. That is fine for manually created NPCs.'));
    }

    return checks;
  }

  buildCoreStatChecks() {
    const checks = [];
    const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const missingAbilities = abilityKeys.filter(key => !hasAny(this.actor, [
      `system.attributes.${key}.base`,
      `system.attributes.${key}.value`,
      `system.abilities.${key}.score`,
      `system.abilities.${key}.value`
    ]));
    checks.push(missingAbilities.length === 0
      ? ok('abilities-present', 'Ability scores', 'Six ability scores are present or readable from known NPC shapes.')
      : warn('abilities-incomplete', 'Ability scores', `Missing readable ability scores: ${missingAbilities.map(k => k.toUpperCase()).join(', ')}.`, { canAutoFix: true }));

    const hpValue = getPropertySafe(this.actor, 'system.hp.value') ?? getPropertySafe(this.actor, 'system.health.value');
    const hpMax = getPropertySafe(this.actor, 'system.hp.max') ?? getPropertySafe(this.actor, 'system.health.max') ?? getPropertySafe(this.actor, 'system.derived.hp.max');
    checks.push(numberish(hpValue) !== null && numberish(hpMax) !== null
      ? ok('hp-present', 'Hit points', `HP is present (${hpValue}/${hpMax}).`)
      : error('hp-missing', 'Hit points', 'HP value/max is not readable from known NPC shapes.', { action: 'Set Play Mode HP before using in encounters.' }));

    const reflex = readDefense(this.actor, ['reflex', 'ref']);
    const fort = readDefense(this.actor, ['fortitude', 'fort']);
    const will = readDefense(this.actor, ['will']);
    const missingDefenses = [reflex ? null : 'Reflex', fort ? null : 'Fortitude', will ? null : 'Will'].filter(Boolean);
    checks.push(missingDefenses.length === 0
      ? ok('defenses-present', 'Defenses', `Defenses are present: Ref ${reflex}, Fort ${fort}, Will ${will}.`)
      : error('defenses-missing', 'Defenses', `Missing readable defenses: ${missingDefenses.join(', ')}.`, { action: 'Set Play Mode defense totals before use.' }));

    const bab = getPropertySafe(this.actor, 'system.bab') ?? getPropertySafe(this.actor, 'system.baseAttackBonus') ?? getPropertySafe(this.actor, 'system.derived.bab.total');
    checks.push(numberish(bab) !== null
      ? ok('bab-present', 'Base attack bonus', `BAB is present (${bab}).`)
      : warn('bab-missing', 'Base attack bonus', 'No readable BAB was found. Raw statblock attacks may still be usable in Play Mode.'));

    return checks;
  }

  buildCombatChecks() {
    const weapons = itemType(this.actor, 'weapon');
    const rawMelee = readRawValue(this.actor, ['Melee Weapons', 'Melee', 'Attack', 'Attacks']);
    const rawRanged = readRawValue(this.actor, ['Ranged Weapons', 'Ranged']);
    const beastMelee = asText(this.beastData?.melee ?? this.beastData?.attacks ?? '');
    const hasRawAttacks = Boolean(rawMelee || rawRanged || beastMelee);

    const checks = [];
    if (weapons.length > 0) {
      checks.push(ok('weapons-present', 'Attack items', `${weapons.length} weapon item(s) are present.`));
    } else if (hasRawAttacks) {
      checks.push(warn('raw-attacks-only', 'Attack items', 'No weapon items are present, but raw/statblock attack lines are available for Play Mode.', {
        canAutoFix: true,
        action: 'Review & Repair can propose attack profiles later.'
      }));
    } else {
      checks.push(error('attacks-missing', 'Attacks', 'No weapon items or raw attack lines were found.'));
    }

    const damageText = [
      ...weapons.map(item => asText(item?.system?.damage ?? item?.system?.damageFormula ?? item?.system?.damageDie ?? '')),
      rawMelee,
      rawRanged,
      beastMelee
    ].join(' ');
    checks.push(damageText.match(/\d+d\d+/i)
      ? ok('damage-readable', 'Damage', 'At least one damage formula or source damage line is readable.')
      : warn('damage-unparsed', 'Damage', 'Damage is not clearly parseable as a roll formula. Keep raw attack text visible in Play Mode.'));

    return checks;
  }

  buildFeatureChecks() {
    const checks = [];
    const feats = itemType(this.actor, 'feat');
    const talents = itemType(this.actor, 'talent');
    const forcePowers = itemType(this.actor, 'force-power');
    const speciesItems = itemType(this.actor, 'species');
    const rawImmune = readRawValue(this.actor, ['Immune', 'Immunities']);
    const rawResist = readRawValue(this.actor, ['Resist', 'Resistances', 'Damage Reduction']);

    checks.push(feats.length > 0
      ? ok('feats-present', 'Feats', `${feats.length} feat item(s) are present.`)
      : info('feats-none', 'Feats', 'No feat items are present. This may be valid for beasts or very simple statblocks.'));

    checks.push(talents.length > 0
      ? ok('talents-present', 'Talents', `${talents.length} talent item(s) are present.`)
      : info('talents-none', 'Talents', 'No talent items are present. Legal expectations depend on NPC profile.'));

    if (forcePowers.length > 0) {
      const forceTraining = this.items.some(item => normalizeKey(item?.name).includes('force-training'));
      checks.push(forceTraining
        ? ok('force-source-present', 'Force powers', `${forcePowers.length} Force power item(s) are present and Force Training appears to be represented.`)
        : warn('force-source-unknown', 'Force powers', `${forcePowers.length} Force power item(s) are present, but Force Training/source grants were not clearly found.`, {
            requiresGm: true,
            action: 'Legal Review should confirm the Force power source.'
          }));
    } else {
      checks.push(info('force-none', 'Force powers', 'No Force power items are present.'));
    }

    checks.push(speciesItems.length > 0 || this.system?.race || this.system?.species
      ? ok('species-readable', 'Species/race', 'Species or race information is readable.')
      : warn('species-missing', 'Species/race', 'No species/race information was found.'));

    if (rawImmune || rawResist || this.system?.traits?.immunities || this.system?.traits?.resistances) {
      checks.push(warn('traits-raw', 'Immunities/resistances', 'Special defenses are present, but may still be raw text rather than structured effects.', {
        canAutoFix: true,
        action: 'Review & Repair can structure obvious immunities/resistances later.'
      }));
    } else {
      checks.push(info('traits-none', 'Immunities/resistances', 'No immunities or resistances were found.'));
    }

    return checks;
  }

  buildAuthorityChecks() {
    const checks = [];
    if (this.profileState.sourceAuthority === 'statblock') {
      checks.push(info('statblock-authority', 'Progression derivation', 'This NPC uses statblock authority. HP, defenses, BAB, and attacks should not be overwritten by progression math without GM approval.'));
    } else if (this.profileState.sourceAuthority === 'progression') {
      checks.push(info('progression-authority', 'Progression derivation', 'This NPC is progression-authoritative. Legal Review should compare against class/species/progression records.'));
    } else if (this.profileState.sourceAuthority === 'owner') {
      checks.push(info('owner-authority', 'Owner sync', 'This NPC uses owner-sync authority. Legal Review should confirm the owner link and sync policy.'));
    }
    return checks;
  }
}

class HeroicNpcLegalProfile extends BaseNpcLegalProfile {
  get id() { return 'heroic'; }
  get label() { return 'Heroic NPC'; }

  buildChecks() {
    const checks = super.buildChecks();
    const classItems = itemType(this.actor, 'class');
    const classText = `${this.system?.className ?? ''} ${this.system?.class ?? ''} ${readRawValue(this.actor, ['Class Levels'])}`.trim();
    checks.push(classItems.length > 0
      ? ok('heroic-class-items', 'Heroic class history', `${classItems.length} class item(s) are present.`)
      : warn('heroic-class-items-missing', 'Heroic class history', classText ? `Class text exists (${classText}), but no class item/history is present.` : 'No class item/history was found.', {
          requiresGm: true,
          canAutoFix: Boolean(classText),
          action: 'Legal Repair can propose class history from clear class text.'
        }));
    return checks;
  }
}

class NonheroicNpcLegalProfile extends BaseNpcLegalProfile {
  get id() { return 'nonheroic'; }
  get label() { return 'Nonheroic NPC'; }

  buildChecks() {
    const checks = super.buildChecks();
    const classText = `${this.system?.className ?? ''} ${this.system?.class ?? ''} ${readRawValue(this.actor, ['Nonheroic Level', 'Class Levels'])}`.trim();
    const skeleton = summarizeProgressionSkeleton(getProgressionSkeleton(this.actor));
    const hasNonheroic = rawContains(this.actor, ['nonheroic'])
      || normalizeKey(classText).includes('nonheroic')
      || skeleton?.entries?.some(entry => entry.classId === 'nonheroic' || normalizeKey(entry.name) === 'nonheroic')
      || this.profileState.legalProfile === 'nonheroic';

    checks.push(hasNonheroic
      ? ok('nonheroic-profile', 'Nonheroic rules context', 'This actor is being reviewed against nonheroic NPC expectations, not heroic player progression.')
      : warn('nonheroic-profile-weak', 'Nonheroic rules context', 'The legal profile is nonheroic, but class text/skeleton does not clearly include Nonheroic.'));

    if (skeleton?.entries?.length) {
      const path = skeleton.entries.map(entry => `${entry.name} ${entry.levels}`).join(' → ');
      checks.push(ok('nonheroic-progression-skeleton', 'Progression skeleton', `Legal-ready skeleton detected: ${path}.`, {
        detail: `Status: ${skeleton.statusLabel}; total levels: ${skeleton.totalLevels}.`
      }));
      checks.push(skeleton.nonheroicFirstValid
        ? ok('nonheroic-first-valid', 'Nonheroic-first rule', 'Skeleton obeys the rule that nonheroic levels precede heroic/prestige levels.')
        : warn('nonheroic-first-review', 'Nonheroic-first rule', 'Skeleton does not clearly prove the nonheroic-first advancement rule. GM review is required.', { requiresGm: true }));
      if (skeleton.statblockValuesPreserved) {
        checks.push(info('skeleton-preserves-statblock', 'Statblock preservation', 'Skeleton metadata preserves Play Mode/statblock authority; it does not recalculate HP, defenses, BAB, attacks, or skills.'));
      }
    } else {
      checks.push(warn('nonheroic-skeleton-missing', 'Progression skeleton', 'No legal-ready nonheroic progression skeleton is present yet.', {
        requiresGm: true,
        canAutoFix: Boolean(classText),
        action: 'Review & Repair can propose a skeleton from clear class/level text.'
      }));
    }

    const classItemEntries = classItems(this.actor);
    checks.push(classItemEntries.length > 0
      ? ok('nonheroic-class-items', 'Nonheroic class record', `${classItemEntries.length} class item(s) are present.`, {
          detail: summarizeClassItemPath(classItemEntries)
        })
      : warn('nonheroic-class-items-missing', 'Nonheroic class record', skeleton?.entries?.length
          ? 'Progression skeleton exists, but class items/history have not been created yet.'
          : (classText ? `Class/level text exists (${classText}), but no nonheroic class item/history is present.` : 'No nonheroic class item/history was found.'), {
          requiresGm: true,
          canAutoFix: Boolean(skeleton?.entries?.length || classText),
          action: skeleton?.entries?.length
            ? 'Review & Repair can propose class item creation from the skeleton.'
            : 'Legal Repair can propose a Nonheroic progression skeleton later.'
        }));

    if (skeleton?.entries?.length) {
      const skeletonOrderValid = validateNonheroicFirst(skeleton.entries);
      checks.push(skeletonOrderValid
        ? ok('nonheroic-first-order-validated', 'Class order validation', 'The ordered skeleton has all nonheroic levels before heroic/prestige levels.')
        : error('nonheroic-first-order-invalid', 'Class order validation', 'The ordered skeleton has nonheroic levels after heroic/prestige levels.', {
            requiresGm: true,
            action: 'Repair the progression skeleton before treating this NPC as legal-ready.'
          }));

      const actorLevel = numberish(this.system?.level ?? this.system?.details?.level?.value);
      if (actorLevel !== null) {
        checks.push(actorLevel === skeleton.totalLevels
          ? ok('nonheroic-total-levels-match', 'Total level validation', `Actor level ${actorLevel} matches skeleton total level ${skeleton.totalLevels}.`)
          : warn('nonheroic-total-levels-mismatch', 'Total level validation', `Actor level ${actorLevel} does not match skeleton total level ${skeleton.totalLevels}.`, {
              requiresGm: true,
              action: 'Confirm whether the statblock level or skeleton level should be authoritative.'
            }));
      }

      if (classItemEntries.length > 0) {
        const comparison = compareSkeletonToClassItems(skeleton, classItemEntries);
        if (comparison.matches) {
          checks.push(ok('nonheroic-class-items-match-skeleton', 'Class items vs skeleton', 'Embedded class items match the progression skeleton class IDs and level totals.'));
        } else {
          const details = [
            comparison.missing.length ? `Missing: ${comparison.missing.map(entry => `${entry.name} ${entry.levels}`).join(', ')}` : '',
            comparison.mismatched.length ? `Mismatched: ${comparison.mismatched.map(entry => `${entry.name} expected ${entry.expected}, found ${entry.actual}`).join(', ')}` : '',
            comparison.extra.length ? `Extra: ${comparison.extra.map(entry => `${entry.name} ${entry.levels}`).join(', ')}` : '',
            `Skeleton total ${comparison.expectedTotal}; class item total ${comparison.actualTotal}`
          ].filter(Boolean).join(' | ');
          checks.push(warn('nonheroic-class-items-skeleton-mismatch', 'Class items vs skeleton', 'Embedded class items do not exactly match the progression skeleton.', {
            detail: details,
            requiresGm: true,
            action: 'Review class item creation before treating this NPC as legal-ready.'
          }));
        }
      }
    }

    if (classItemEntries.length > 0) {
      const expectedBab = expectedBabFromClassItems(classItemEntries);
      const statblockBab = numberish(getPropertySafe(this.actor, 'system.bab') ?? getPropertySafe(this.actor, 'system.baseAttackBonus') ?? getPropertySafe(this.actor, 'system.derived.bab.total'));
      if (expectedBab.complete && statblockBab !== null) {
        const detail = expectedBab.parts.map(part => `${part.name} ${part.level}: +${part.bab}`).join(', ');
        checks.push(statblockBab === expectedBab.total
          ? ok('nonheroic-bab-matches-class-items', 'BAB legality context', `Statblock BAB ${statblockBab} matches class-item expected BAB ${expectedBab.total}.`, { detail })
          : warn('nonheroic-bab-statblock-override', 'BAB legality context', `Statblock BAB ${statblockBab} differs from class-item expected BAB ${expectedBab.total}; preserving statblock authority.`, {
              detail,
              requiresGm: true,
              action: 'GM can keep the source statblock override or later switch this actor to progression authority.'
            }));
      } else if (expectedBab.missing.length > 0) {
        checks.push(warn('nonheroic-bab-unverified', 'BAB legality context', 'Class items exist, but BAB could not be fully checked from their progression data.', {
          detail: expectedBab.missing.map(entry => `${entry.name}: ${entry.reason}`).join(', '),
          requiresGm: true
        }));
      }
    }

    if (skeleton?.classItemsCreated && classItemEntries.length > 0 && skeleton.statblockValuesPreserved) {
      checks.push(ok('nonheroic-legal-with-overrides-boundary', 'Legal boundary', 'Class skeleton/items are present while Play Mode statblock values remain authoritative. This is legal-with-statblock-overrides, not full progression authority.'));
    }

    return checks;
  }
}

class BeastNpcLegalProfile extends BaseNpcLegalProfile {
  get id() { return 'beast'; }
  get label() { return 'Beast'; }

  buildChecks() {
    const checks = super.buildChecks();
    checks.push(this.beastData
      ? ok('beast-data-present', 'Beast source data', 'Beast data is present for Play Mode rendering.')
      : warn('beast-data-missing', 'Beast source data', 'No beastData block was found. Beast traits may need to come from raw statblock text.'));

    const naturalAttackText = asText(this.beastData?.melee ?? this.beastData?.attacks ?? readRawValue(this.actor, ['Melee', 'Melee Weapons']));
    checks.push(naturalAttackText
      ? ok('beast-natural-attacks', 'Natural attacks', 'Natural attack/source attack text is present.')
      : warn('beast-natural-attacks-missing', 'Natural attacks', 'No natural attack text or itemized attack was found.', { canAutoFix: true }));

    return checks;
  }
}

class FollowerNpcLegalProfile extends BaseNpcLegalProfile {
  get id() { return 'follower'; }
  get label() { return 'Follower'; }

  buildChecks() {
    const checks = super.buildChecks();
    const ownerId = this.system?.npcProfile?.owner?.actorId
      ?? this.actor?.flags?.swse?.follower?.ownerId
      ?? this.actor?.flags?.['foundryvtt-swse']?.follower?.ownerId;
    checks.push(ownerId
      ? ok('owner-link-present', 'Owner link', 'An owner actor link is present.')
      : warn('owner-link-missing', 'Owner link', 'No owner actor link was found for this follower.', { requiresGm: true }));
    return checks;
  }
}

class MinionNpcLegalProfile extends FollowerNpcLegalProfile {
  get id() { return 'minion'; }
  get label() { return 'Minion'; }

  buildChecks() {
    const checks = super.buildChecks();
    const ownerMode = this.profileState.mode === 'owner-sync' || this.profileState.sourceAuthority === 'owner';
    checks.push(ownerMode
      ? ok('owner-sync-mode', 'Owner sync mode', 'Owner-sync authority is active for this minion/privateer.')
      : warn('owner-sync-mode-missing', 'Owner sync mode', 'This minion/privateer is not clearly marked as owner-sync authority.', { requiresGm: true }));
    return checks;
  }
}

class MountNpcLegalProfile extends BeastNpcLegalProfile {
  get id() { return 'mount'; }
  get label() { return 'Mount'; }

  buildChecks() {
    const checks = super.buildChecks();
    const riderId = this.system?.npcProfile?.mount?.riderActorId ?? this.system?.npcProfile?.rider?.actorId;
    checks.push(riderId
      ? ok('rider-link-present', 'Rider/handler link', 'A rider/handler link is present.')
      : info('rider-link-missing', 'Rider/handler link', 'No rider/handler link is set. This may be fine for unassigned mounts.'));
    return checks;
  }
}

class ImportedStatblockLegalProfile extends BaseNpcLegalProfile {
  get id() { return 'imported-statblock'; }
  get label() { return 'Imported Statblock'; }

  buildChecks() {
    const checks = super.buildChecks();
    checks.push(this.raw
      ? ok('raw-statblock-present', 'Raw statblock', 'Raw imported statblock data is preserved.')
      : warn('raw-statblock-missing', 'Raw statblock', 'This imported/statblock actor does not have raw source data preserved.'));
    return checks;
  }
}

const PROFILE_CLASSES = Object.freeze({
  heroic: HeroicNpcLegalProfile,
  nonheroic: NonheroicNpcLegalProfile,
  beast: BeastNpcLegalProfile,
  mount: MountNpcLegalProfile,
  follower: FollowerNpcLegalProfile,
  minion: MinionNpcLegalProfile,
  'imported-statblock': ImportedStatblockLegalProfile,
  standard: BaseNpcLegalProfile
});

function summarizeChecks(checks) {
  const summary = { ok: 0, info: 0, warn: 0, error: 0, review: 0, total: checks.length };
  for (const check of checks) {
    if (summary[check.severity] !== undefined) summary[check.severity] += 1;
    if (check.severity === CHECK_SEVERITY.WARN || check.severity === CHECK_SEVERITY.ERROR) summary.review += 1;
  }
  return summary;
}

function groupChecks(checks) {
  const groups = [
    { id: 'errors', label: 'Needs Fix', checks: checks.filter(check => check.severity === CHECK_SEVERITY.ERROR) },
    { id: 'warnings', label: 'Needs GM Review', checks: checks.filter(check => check.severity === CHECK_SEVERITY.WARN) },
    { id: 'ok', label: 'Ready / Detected', checks: checks.filter(check => check.severity === CHECK_SEVERITY.OK) },
    { id: 'info', label: 'Notes', checks: checks.filter(check => check.severity === CHECK_SEVERITY.INFO) }
  ];
  return groups.filter(group => group.checks.length > 0);
}

function chooseState(summary, profileState) {
  if (summary.error > 0) return 'needs-review';
  if (summary.warn > 0) return 'gm-review-needed';
  if (profileState.sourceAuthority === 'progression') return 'progression-review-ready';
  return 'playable';
}

export class NpcLegalReviewEngine {
  /**
   * Build a read-only Legal Review report for an NPC actor.
   * @param {Actor} actor
   * @returns {Object}
   */
  static buildReport(actor) {
    const profileState = getNpcProfileState(actor);
    const ProfileClass = PROFILE_CLASSES[profileState.legalProfile] ?? PROFILE_CLASSES.standard;
    const profile = new ProfileClass(actor, profileState);
    const checks = profile.buildChecks();
    const summary = summarizeChecks(checks);
    const state = chooseState(summary, profileState);
    const progressionSkeleton = summarizeProgressionSkeleton(getProgressionSkeleton(actor));

    return {
      actorId: actor?.id ?? null,
      actorName: actor?.name ?? 'NPC',
      profileId: profile.id,
      profileLabel: profile.label,
      mode: profileState.mode,
      modeLabel: profileState.labels.mode,
      sourceAuthority: profileState.sourceAuthority,
      sourceAuthorityLabel: profileState.labels.sourceAuthority,
      legalProfile: profileState.legalProfile,
      legalProfileLabel: profileState.labels.legalProfile,
      legalState: state,
      legalStateLabel: state.split('-').map(part => part ? part[0].toUpperCase() + part.slice(1) : '').join(' '),
      tablePlayable: summary.error === 0 || profileState.sourceAuthority === 'statblock',
      progressionLegal: summary.error === 0 && summary.warn === 0 && profileState.sourceAuthority === 'progression',
      canReviewAndRepair: summary.warn > 0 || summary.error > 0 || profileState.profileMissing,
      summary,
      checks,
      groups: groupChecks(checks),
      progressionSkeleton,
      note: 'Legal Review is read-only. It identifies Play Mode risks, consumes legal-ready skeleton metadata, and surfaces future repair targets without changing actor data.'
    };
  }
}

export default NpcLegalReviewEngine;
