// scripts/sheets/v2/npc-sheet.js
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";
import { RenderAssertions } from "/systems/foundryvtt-swse/scripts/core/render-assertions.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { SWSERoll } from "/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { ActionEconomyBindings } from "/systems/foundryvtt-swse/scripts/ui/combat/action-economy-bindings.js";
import { applyResourceBarAnimations } from "/systems/foundryvtt-swse/scripts/sheets/v2/shared/resource-bar-animations.js";
import { computeCenteredPosition, getApplicationTargetSize } from "/systems/foundryvtt-swse/scripts/utils/sheet-position.js";
import { PortraitUploadController } from "/systems/foundryvtt-swse/scripts/sheets/v2/shared/PortraitUploadController.js";
import { NpcProfileBuilder } from "/systems/foundryvtt-swse/scripts/actors/npc/npc-profile-builder.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { launchProgression, launchFollowerProgression } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js";
import { SWSEStore } from "/systems/foundryvtt-swse/scripts/apps/store/store-main.js";
import { buildForceTab } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/concept-context.js";
import { activateForceUI } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/force-ui.js";
import { ShellHostMixin } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellHost.js";
import { ThemeResolutionService } from "/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js";
import { coerceSingleFieldValue } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/form.js";
import { NpcReviewRepairEngine } from "/systems/foundryvtt-swse/scripts/engine/npc-legal-review/NpcReviewRepairEngine.js";


const NPC_ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const NPC_ABILITY_LABELS = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma'
};


function plainClone(value, fallback = {}) {
  if (value === null || value === undefined) return fallback;
  try {
    if (foundry?.utils?.duplicate) return foundry.utils.duplicate(value);
  } catch (_err) {}
  try {
    return structuredClone(value);
  } catch (_err) {}
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_err) {}
  return fallback;
}

function buildSerializableBaseContext(baseContext = {}) {
  return {
    cssClass: String(baseContext.cssClass ?? ''),
    editable: Boolean(baseContext.editable),
    owner: Boolean(baseContext.owner),
    limited: Boolean(baseContext.limited),
    rootId: baseContext.rootId ? String(baseContext.rootId) : undefined,
    partId: baseContext.partId ? String(baseContext.partId) : undefined
  };
}

function buildSerializableActorContext(actor) {
  return {
    id: actor.id,
    name: actor.name,
    type: actor.type,
    img: actor.img,
    _id: actor._id,
    system: plainClone(actor.system, {})
  };
}

function buildSerializableItemContext(item) {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    img: item.img,
    system: plainClone(item.system, {}),
    flags: plainClone(item.flags, {})
  };
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function abilityMod(score) {
  return Math.floor((safeNumber(score, 10) - 10) / 2);
}

function modClass(mod) {
  const n = safeNumber(mod, 0);
  if (n > 0) return 'mod--positive';
  if (n < 0) return 'mod--negative';
  return 'mod--zero';
}

function readNpcAbilitySource(system, key) {
  const attr = system?.attributes?.[key] ?? {};
  const legacy = system?.abilities?.[key] ?? {};
  const base = safeNumber(attr.base ?? attr.value ?? legacy.base ?? legacy.score ?? legacy.value, 10);
  const racial = safeNumber(attr.racial ?? legacy.racial ?? legacy.species ?? 0, 0);
  const temp = safeNumber(attr.temp ?? attr.temporary ?? legacy.temp ?? legacy.temporary ?? 0, 0);
  const total = safeNumber(attr.total ?? legacy.total, base + racial + temp);
  const mod = safeNumber(attr.mod ?? attr.modifier ?? legacy.mod ?? legacy.modifier, abilityMod(total));
  return { base, racial, temp, total, mod };
}

export function buildNpcConceptAbilities(actor) {
  const system = actor?.system ?? {};
  const isDroidNpc = system.isDroid === true || system.creatureType === 'droid' || system.npcProfile?.kind === 'droid';
  const keys = isDroidNpc ? NPC_ABILITY_KEYS.filter(key => key !== 'con') : NPC_ABILITY_KEYS;
  const entries = keys.map((key) => {
    const source = readNpcAbilitySource(system, key);
    return {
      key,
      label: NPC_ABILITY_LABELS[key] ?? key.toUpperCase(),
      abbr: key.toUpperCase(),
      base: source.base,
      racial: source.racial,
      temp: source.temp,
      total: source.total,
      mod: source.mod,
      modClass: modClass(source.mod),
      isPrimary: false,
      isSecondary: false,
      isLowest: false
    };
  });

  if (entries.length) {
    const sortedTotals = entries.map(entry => entry.total).sort((a, b) => b - a);
    const highest = sortedTotals[0];
    const second = sortedTotals[1] ?? highest;
    const lowest = sortedTotals[sortedTotals.length - 1];
    for (const entry of entries) {
      entry.isPrimary = entry.total === highest;
      entry.isSecondary = entry.total === second && entry.total !== highest;
      entry.isLowest = entry.total === lowest;
    }
  }

  return {
    abilities: entries,
    canEdit: actor?.isOwner === true,
    hasConstitution: !isDroidNpc
  };
}


function labelFromKey(key) {
  return String(key ?? '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function displayValue(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  if (Array.isArray(value)) {
    const joined = value.map(v => displayValue(v, '')).filter(Boolean).join(', ');
    return joined || fallback;
  }
  if (typeof value === 'object') {
    const joined = Object.entries(value)
      .filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== false)
      .map(([k, v]) => v === true ? labelFromKey(k) : `${labelFromKey(k)}: ${displayValue(v, '')}`)
      .filter(Boolean)
      .join(', ');
    return joined || fallback;
  }
  return String(value);
}

function formatSignedNpc(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return displayValue(value, fallback);
  return n >= 0 ? `+${n}` : String(n);
}

function numberToneClass(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'is-neutral';
  if (n > 0) return 'is-positive';
  if (n < 0) return 'is-negative';
  return 'is-neutral';
}

function abilityModifierClass(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return 'zero';
  return n > 0 ? 'pos' : 'neg';
}

function itemTypeLabel(type) {
  const map = {
    feat: 'Feat', talent: 'Talent', weapon: 'Weapon', armor: 'Armor', equipment: 'Equipment',
    consumable: 'Consumable', tool: 'Tool', gear: 'Gear', class: 'Class', species: 'Species',
    'force-power': 'Force Power', class_feature: 'Class Feature', racialAbility: 'Species Ability'
  };
  return map[type] ?? labelFromKey(type || 'Item');
}

function itemDescription(item) {
  const sys = item?.system ?? {};
  return displayValue(
    sys?.description?.value ?? sys?.description ?? sys?.summary ?? sys?.text ?? sys?.effect ?? sys?.properties,
    ''
  );
}

function itemQuantity(item) {
  const q = item?.system?.quantity ?? item?.system?.qty ?? null;
  const n = Number(q);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function buildNpcConceptItemRow(item, typeOverride = null) {
  return {
    id: item?.id ?? null,
    name: item?.name || 'Unnamed',
    type: item?.type || typeOverride || 'item',
    typeLabel: itemTypeLabel(typeOverride || item?.type),
    img: item?.img || null,
    quantity: itemQuantity(item),
    summary: itemDescription(item),
    canOpen: Boolean(item?.id)
  };
}

export function buildNpcConceptSheetContext(actor, context = {}) {
  const system = actor?.system ?? {};
  const derived = context?.derived ?? system?.derived ?? {};
  const play = context?.playStatblock ?? {};
  const allItems = Array.from(actor?.items ?? []);

  const levelValue = displayValue(
    system?.attributes?.level ?? system?.level ?? derived?.identity?.level ?? derived?.level,
    ''
  );
  const challenge = displayValue(
    system?.challengeLevel ?? system?.cl ?? derived?.identity?.challengeLevel ?? derived?.challengeLevel,
    ''
  );
  const species = displayValue(
    derived?.identity?.species ?? system?.species ?? system?.race ?? system?.details?.species,
    ''
  );
  const classDisplay = displayValue(
    derived?.identity?.classDisplay ?? system?.className ?? system?.class ?? system?.details?.class,
    ''
  );

  const hpCurrent = safeNumber(
    context?.hpCurrent ?? system?.hp?.value ?? system?.health?.value ?? play?.hp?.value,
    0
  );
  const hpMax = safeNumber(
    context?.hpMax ?? system?.hp?.max ?? system?.health?.max ?? system?.derived?.hp?.max ?? play?.hp?.max,
    0
  );
  const hpPercent = hpMax > 0 ? Math.max(0, Math.min(100, Math.round((hpCurrent / hpMax) * 100))) : 0;
  const hpToneClass = hpPercent <= 25 ? 'low' : hpPercent <= 60 ? 'mid' : 'healthy';

  const defenseFallback = Object.fromEntries((play?.defenses ?? []).map(row => [String(row.key || row.label || '').toLowerCase(), row.value]));
  const defenseValues = {
    ref: displayValue(
      derived?.defenses?.ref ?? derived?.defenses?.reflex ?? system?.defenses?.ref ?? system?.defenses?.reflex?.total ?? defenseFallback.reflex,
      '—'
    ),
    fort: displayValue(
      derived?.defenses?.fort ?? derived?.defenses?.fortitude ?? system?.defenses?.fort ?? system?.defenses?.fortitude?.total ?? defenseFallback.fortitude,
      '—'
    ),
    will: displayValue(
      derived?.defenses?.will ?? system?.defenses?.will?.total ?? system?.defenses?.will ?? defenseFallback.will,
      '—'
    ),
    dt: displayValue(
      derived?.damage?.threshold ?? derived?.threshold?.total ?? system?.damageThreshold?.total ?? system?.damageThreshold ?? play?.damageThreshold,
      '—'
    )
  };

  const defenseChips = [
    { key: 'ref', label: 'REF', value: defenseValues.ref },
    { key: 'fort', label: 'FORT', value: defenseValues.fort },
    { key: 'will', label: 'WILL', value: defenseValues.will },
    { key: 'dt', label: 'DT', value: defenseValues.dt }
  ];

  const abilityRows = Array.isArray(context?.abilitiesPanel?.abilities) && context.abilitiesPanel.abilities.length
    ? context.abilitiesPanel.abilities.map(entry => ({
        key: entry.key,
        abbr: entry.abbr || String(entry.key || '').toUpperCase(),
        label: entry.label || labelFromKey(entry.key),
        score: displayValue(entry.total ?? entry.score ?? entry.base, '—'),
        mod: formatSignedNpc(entry.mod, '—'),
        modifierClass: abilityModifierClass(entry.mod),
        isPrimary: entry.isPrimary === true,
        isLowest: entry.isLowest === true
      }))
    : (play?.abilities ?? []).map(entry => ({
        key: entry.key,
        abbr: entry.label || String(entry.key || '').toUpperCase(),
        label: entry.label || labelFromKey(entry.key),
        score: displayValue(entry.score, '—'),
        mod: displayValue(entry.mod, '—'),
        modifierClass: abilityModifierClass(String(entry.mod || '').replace('+', '')),
        isPrimary: false,
        isLowest: false
      }));

  const skillRows = (play?.skills ?? []).map(skill => ({
    key: skill.key,
    label: skill.label || labelFromKey(skill.key),
    total: skill.total ?? '+0',
    trained: skill.trained === true
  }));

  const weaponFallbackRows = allItems.filter(item => item.type === 'weapon').map(item => ({
    id: item.id,
    name: item.name || 'Weapon',
    source: 'Item',
    mode: displayValue(item.system?.weaponType ?? item.system?.category ?? item.system?.group ?? item.system?.type, 'Weapon'),
    attack: displayValue(item.system?.attackBonus ?? item.system?.attack?.bonus ?? item.system?.bonus ?? item.system?.toHit, '—'),
    damage: displayValue(item.system?.damage ?? item.system?.damageFormula ?? item.system?.damage?.formula ?? item.system?.damage?.value, '—'),
    notes: itemDescription(item),
    canOpen: true
  }));

  const attackRows = (play?.attacks?.length ? play.attacks : weaponFallbackRows).map(row => ({
    id: row.id ?? null,
    name: row.name || 'Attack',
    source: row.source || 'Statblock',
    mode: row.mode || '—',
    attack: row.attack || '—',
    damage: row.damage || '—',
    notes: row.notes && row.notes !== '—' ? row.notes : '',
    canOpen: Boolean(row.id)
  }));

  const grouped = play?.featureGroups ?? {};
  const featureFromGroup = (rows = [], typeLabel = 'Feature') => rows.map(row => ({
    id: row.id ?? null,
    name: row.name || 'Unnamed',
    typeLabel,
    summary: row.summary && row.summary !== '—' ? row.summary : '',
    canOpen: Boolean(row.id)
  }));
  const featRows = grouped.feats?.length
    ? featureFromGroup(grouped.feats, 'Feat')
    : allItems.filter(item => item.type === 'feat').map(item => buildNpcConceptItemRow(item, 'feat'));
  const talentRows = grouped.talents?.length
    ? featureFromGroup(grouped.talents, 'Talent')
    : allItems.filter(item => item.type === 'talent').map(item => buildNpcConceptItemRow(item, 'talent'));
  const specialRows = (play?.specials ?? []).map(special => ({
    label: special.label || 'Special',
    value: special.value || '—',
    source: special.source || 'Source'
  }));

  const hiddenGearTypes = new Set(['class', 'feat', 'talent', 'species', 'racialAbility', 'species-power', 'force-power', 'class_feature']);
  const gearRows = allItems
    .filter(item => !hiddenGearTypes.has(item.type))
    .map(item => buildNpcConceptItemRow(item));
  const credits = safeNumber(system?.credits ?? system?.resources?.credits ?? system?.wealth?.credits, 0);

  const forcePowerRows = grouped.forcePowers?.length
    ? featureFromGroup(grouped.forcePowers, 'Force Power')
    : allItems.filter(item => item.type === 'force-power').map(item => buildNpcConceptItemRow(item, 'force-power'));

  const legalSummary = context?.npcLegalReview?.summary ?? {};
  const legalChecks = (context?.npcLegalReview?.groups ?? [])
    .flatMap(group => (group.checks ?? []).map(check => ({
      label: check.label || group.label || 'Legal Check',
      severity: check.severity || check.tone || 'info',
      status: check.status || '',
      message: check.message || check.detail || ''
    })));

  const isDependent = ['follower', 'minion', 'privateer'].includes(context?.npcKind);
  const isCreature = context?.isBeastNpc === true || context?.isMountNpc === true;
  const showForceTab = system?.forceSensitive === true || forcePowerRows.length > 0;
  const showGearTab = gearRows.length > 0 || credits !== 0 || game.user?.isGM === true;
  const showGmTab = game.user?.isGM === true;

  const conditionCurrent = displayValue(
    derived?.damage?.conditionStep ?? system?.conditionTrack?.current ?? system?.condition?.step,
    '—'
  );
  const initiative = formatSignedNpc(
    derived?.initiative?.total ?? system?.initiative?.total ?? system?.skills?.init?.total ?? system?.skills?.initiative?.total,
    '—'
  );

  const summaryLine = [];
  if (levelValue) summaryLine.push(`L${levelValue}`);
  if (species) summaryLine.push(species);
  if (classDisplay) summaryLine.push(classDisplay);
  if (challenge) summaryLine.push(String(challenge).startsWith('CL') ? challenge : `CL ${challenge}`);

  return {
    kind: context?.npcKind || 'npc',
    kindLabel: context?.npcKindLabel || 'NPC',
    modeLabel: context?.npcModeLabel || 'Play Mode',
    sourceAuthorityLabel: context?.npcSourceAuthorityLabel || 'Statblock',
    legalStateLabel: context?.npcLegalStateLabel || 'Unchecked',
    levelLabel: levelValue || '—',
    speciesLabel: species || '—',
    classDisplay: classDisplay || '—',
    challengeLabel: challenge || '—',
    summaryLine,
    hpCurrent,
    hpMax,
    hpPercent,
    hpToneClass,
    conditionCurrent,
    initiative,
    defenseChips,
    babDisplay: play?.bab || displayValue(system?.baseAttackBonus ?? system?.bab?.total ?? system?.bab, '—'),
    quickStats: [
      { label: 'HP', value: hpMax > 0 ? `${hpCurrent}/${hpMax}` : displayValue(play?.hp?.value, '—') },
      { label: 'BAB', value: play?.bab || displayValue(system?.baseAttackBonus ?? system?.bab?.total ?? system?.bab, '—') },
      { label: 'Threshold', value: defenseValues.dt },
      { label: 'Speed', value: play?.speed || displayValue(system?.speed?.total ?? system?.speed, '—') }
    ],
    combatStats: [
      { label: 'BAB', value: play?.bab || displayValue(system?.baseAttackBonus ?? system?.bab?.total ?? system?.bab, '—') },
      { label: 'Speed', value: play?.speed || displayValue(system?.speed?.total ?? system?.speed, '—') },
      { label: 'Senses', value: play?.senses || displayValue(system?.senses, '—') },
      { label: 'DT', value: defenseValues.dt }
    ],
    conditionSteps: [
      { label: 'Normal', value: '0', active: String(conditionCurrent) === '0' || conditionCurrent === '—' },
      { label: '-1', value: '-1', active: String(conditionCurrent) === '-1' },
      { label: '-2', value: '-2', active: String(conditionCurrent) === '-2' },
      { label: '-5', value: '-5', active: String(conditionCurrent) === '-5' },
      { label: '-10', value: '-10', active: String(conditionCurrent) === '-10' },
      { label: 'Helpless', value: 'helpless', active: String(conditionCurrent).toLowerCase() === 'helpless' }
    ],
    abilities: abilityRows,
    hasAbilities: abilityRows.length > 0,
    skills: skillRows,
    hasSkills: skillRows.length > 0,
    trainedSkillCount: skillRows.filter(skill => skill.trained).length,
    attacks: attackRows,
    hasAttacks: attackRows.length > 0,
    feats: featRows,
    hasFeats: featRows.length > 0,
    talents: talentRows,
    hasTalents: talentRows.length > 0,
    specials: specialRows,
    hasSpecials: specialRows.length > 0,
    gear: gearRows,
    hasGear: gearRows.length > 0,
    credits,
    creditsDisplay: `${Math.floor(credits)} cr`,
    forcePowers: forcePowerRows,
    hasForcePowers: forcePowerRows.length > 0,
    showGearTab,
    showRelationshipsTab: context?.showRelationshipsTab === true,
    showBeastTab: context?.showBeastPanel === true || context?.showMountPanel === true,
    beastTabLabel: context?.showMountPanel === true ? 'Mount' : 'Beast',
    showForceTab,
    showGmTab,
    isDependent,
    isCreature,
    isMount: context?.showMountPanel === true,
    legalSummary: {
      ok: safeNumber(legalSummary.ok, 0),
      info: safeNumber(legalSummary.info, 0),
      warn: safeNumber(legalSummary.warn, 0),
      error: safeNumber(legalSummary.error, 0),
      review: safeNumber(legalSummary.review, 0),
      total: safeNumber(legalSummary.total, 0)
    },
    legalChecks,
    hasLegalChecks: legalChecks.length > 0,
    modeCards: [
      { label: 'Play Mode', value: context?.isStatblockMode ? 'Active' : 'Inactive', active: context?.isStatblockMode === true },
      { label: 'Progression', value: context?.isProgressionMode ? 'Active' : 'Inactive', active: context?.isProgressionMode === true },
      { label: 'Owner Sync', value: context?.isOwnerSyncMode ? 'Active' : 'Inactive', active: context?.isOwnerSyncMode === true }
    ]
  };
}

const NPC_SHEET_WRITABLE_EXACT_PATHS = new Set([
  'name',
  'img',
  'system.class',
  'system.className',
  'system.race',
  'system.size',
  'system.speed',
  'system.challengeLevel',
  'system.level',
  'system.credits',
  'system.notes',
  'system.bio',
  'system.biography',
  'system.details.notes',
  'system.details.tactics'
]);

const NPC_SHEET_WRITABLE_PATTERNS = [
  /^system\.attributes\.(str|dex|con|int|wis|cha)\.(base|racial|temp)$/
];

const NPC_QUIET_FIELD_PATHS = new Set([
  'name',
  'img',
  'system.class',
  'system.className',
  'system.race',
  'system.size',
  'system.speed',
  'system.challengeLevel',
  'system.credits',
  'system.notes',
  'system.bio',
  'system.biography',
  'system.details.notes',
  'system.details.tactics'
]);

const NPC_SHEET_BLOCKED_PREFIXES = [
  'items.',
  'effects.',
  'system.derived.',
  'system.houseRuleContexts.',
  'system.actionEconomy.',
  'system.defenses.',
  'system.skills.',
  'system.attacks.',
  'system.generatedAttacks.',
  'system.npcProfile.legalReview.',
  'system.npcProfile.importAudit.',
  'system.npcProfile.normalization.',
  'flags.swse.import.raw',
  'flags.swse.beastData'
];

const NPC_SHEET_BLOCKED_EXACT_PATHS = new Set([
  'system.hp.max',
  'system.health.max',
  'system.bab',
  'system.damageThreshold'
]);

function isNpcSheetWritablePath(path) {
  if (!path || typeof path !== 'string') return false;
  if (NPC_SHEET_BLOCKED_EXACT_PATHS.has(path)) return false;
  if (NPC_SHEET_BLOCKED_PREFIXES.some(prefix => path === prefix || path.startsWith(prefix))) return false;
  if (NPC_SHEET_WRITABLE_EXACT_PATHS.has(path)) return true;
  return NPC_SHEET_WRITABLE_PATTERNS.some(pattern => pattern.test(path));
}

function filterNpcSheetUpdate(formDataObj) {
  const allowed = {};
  for (const [path, value] of Object.entries(formDataObj || {})) {
    if (isNpcSheetWritablePath(path)) allowed[path] = value;
  }
  return allowed;
}

function isQuietNpcSheetPath(path) {
  if (!path || typeof path !== 'string') return false;
  if (NPC_QUIET_FIELD_PATHS.has(path)) return true;
  return path.startsWith('system.notes.')
    || path.startsWith('system.bio.')
    || path.startsWith('system.biography.')
    || path.startsWith('system.details.notes.')
    || path.startsWith('system.details.tactics.');
}

function isQuietNpcSheetUpdate(flatUpdateData) {
  const entries = Object.entries(flatUpdateData || {});
  return entries.length > 0 && entries.every(([path]) => isQuietNpcSheetPath(path));
}

/**
 * SWSEV2NpcSheet
 * v2 sheets are dumb views:
 * - Read actor.system.derived only
 * - Emit intent via Actor APIs (which route through ActorEngine)
 * - _updateObject routes through ActorEngine
 */
const { HandlebarsApplicationMixin } = foundry.applications.api;
export class SWSEV2NpcSheet extends
  ShellHostMixin(HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2)) {
  static PARTS = {
    ...super.PARTS,
    body: {
      template: 'systems/foundryvtt-swse/templates/actors/npc/v2/npc-sheet.hbs'
    }
  };


  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: ['application', 'swse', 'sheet', 'actor', 'npc', 'swse-sheet', 'swse-npc-sheet', 'swse-sheet-ui', 'v2'],
    position: {
      width: 900,
      height: 760
    },
    window: {
      resizable: true,
      draggable: true,
      frame: false
    },
    form: {
      closeOnSubmit: false,
      submitOnChange: false
    },
    tabs: []
  };

  /**
   * Convenience getter for accessing the actor document
   * Used throughout the sheet as this.actor instead of this.document
   */
  get actor() {
    return this.document;
  }

  constructor(document, options = {}) {
    super(document, options);
    this._shellSurface = 'home';
    this._shellSurfaceOptions = {};
  }

  async _prepareContext(options) {
    // Fail-fast: this sheet is for NPCs only
    if (this.document.type !== 'npc') {
      throw new Error(
        `SWSEV2NpcSheet requires actor type "npc", got "${this.document.type}"`
      );
    }

    RenderAssertions.assertActorValid(this.document, "SWSEV2NpcSheet");

    // AppV2 inheritance: Call super to get base context
    const baseContext = await super._prepareContext(options);

    // AppV2 Compatibility: Only pass serializable data. Do not spread the
    // ActorSheetV2 base context wholesale: it can contain Document classes,
    // CONFIG constructors, Window references, or other non-cloneable objects.
    // Templates only need a small primitive base plus explicit sheet VM data.
    const actor = this.document;
    const system = plainClone(actor.system, {});
    const context = {
      ...buildSerializableBaseContext(baseContext),
      // Actor header data (serializable primitives only)
      actor: buildSerializableActorContext(actor),
      system,
      derived: plainClone(system?.derived ?? actor.system?.derived ?? {}, {}),
      // Items: map to plain objects to avoid Collection/DataModel serialization issues
      items: Array.from(actor.items ?? []).map(item => buildSerializableItemContext(item)),
      editable: this.isEditable,
      // User data (serializable primitives only)
      user: {
        id: game.user?.id ?? null,
        name: game.user?.name ?? '',
        role: game.user?.role ?? 0,
        isGM: game.user?.isGM === true
      },
      // Abilities panel data (Phase 3)
      feats: [],
      talents: [],
      racialAbilities: [],
      abilityPanel: {},
      talentAbilities: [],
      sheetTheme: ThemeResolutionService.resolveThemeKey(null, { actor }),
      sheetMotionStyle: ThemeResolutionService.resolveMotionStyle(null, { actor }),
      sheetSurfaceStyleInline: ''
    };

    try {
      const abilityPanel = plainClone(AbilityEngine.getCardPanelModelForActor(actor), {});
      context.abilityPanel = abilityPanel;
      context.talentAbilities = Array.isArray(abilityPanel.all) ? abilityPanel.all : [];
      context.feats = context.talentAbilities.filter(a => a.type === "feat");
      context.talents = context.talentAbilities.filter(a => a.type === "talent");
      context.racialAbilities = context.talentAbilities.filter(a => a.type === "racialAbility");
    } catch (err) {
      console.error('Error preparing abilities panel for NPC sheet:', err);
    }

    const npcConceptAbilities = buildNpcConceptAbilities(actor);
    context.abilitiesPanel = npcConceptAbilities;
    context.abilities = npcConceptAbilities.abilities;
    context.conceptLayout = {
      ...(context.conceptLayout ?? {}),
      abilities: npcConceptAbilities.abilities,
      abilitiesTab: {
        entries: npcConceptAbilities.abilities
      }
    };

    // NPC Profile Context (Phase 1: Contract Foundation)
    try {
      const npcProfile = NpcProfileBuilder.buildContext(actor);
      Object.assign(context, npcProfile);
    } catch (err) {
      console.error('Error building NPC profile context:', err);
    }

    // Force Suite Context — only built for force-sensitive NPCs
    if (actor.system?.forceSensitive) {
      try {
        const forcePowers = Array.from(actor.items ?? []).filter(i => i.type === 'force-power').map(item => buildSerializableItemContext(item));
        const derived = plainClone(actor.system?.derived ?? {}, {});
        const forcePowersPanel = {
          hand: forcePowers.filter(p => !p.system?.discarded),
          discard: forcePowers.filter(p => !!p.system?.discarded),
          secrets: derived.forceSecrets?.list ?? [],
          techniques: derived.forceTechniques?.list ?? []
        };
        const forceCtx = buildForceTab({
          actor: { name: actor.name, flags: plainClone(actor.flags, {}) },
          forcePowersPanel,
          forcePointsValue: actor.system?.forcePoints?.value ?? 0,
          forcePointsMax: actor.system?.forcePoints?.max ?? 0,
          destinyPointsValue: actor.system?.destinyPoints?.value ?? 0,
          destinyPointsMax: actor.system?.destinyPoints?.max ?? 0,
          darkSidePanel: {
            value: actor.system?.darkSideScore?.value ?? 0,
            max: actor.system?.darkSideScore?.max ?? 0
          }
        });
        context.conceptLayout = {
          ...(context.conceptLayout ?? {}),
          force: forceCtx
        };
      } catch (err) {
        console.error('Error building NPC force suite context:', err);
        context.conceptLayout = {
          ...(context.conceptLayout ?? {}),
          force: {}
        };
      }
    }

    // HP/Vitals Context for header (Phase 2 upgrade)
    try {
      const hpMax = actor.system?.derived?.hp?.max ?? actor.system?.hp?.max ?? actor.system?.derived?.health?.max ?? actor.system?.health?.max ?? 0;
      const hpCurrent = actor.system?.hp?.value ?? actor.system?.health?.value ?? 0;
      const hpPercent = hpMax > 0 ? Math.round((hpCurrent / hpMax) * 100) : 0;
      context.hpCurrent = hpCurrent;
      context.hpMax = hpMax;
      context.hpPercent = hpPercent;
    } catch (err) {
      console.warn('Error preparing HP context for NPC header:', err);
      context.hpCurrent = 0;
      context.hpMax = 0;
      context.hpPercent = 0;
    }

    context.npcConcept = buildNpcConceptSheetContext(actor, context);

    // Action Economy Context (for combat tab)
    if (game.combat && game.combat.combatants.some(c => c.actor?.id === actor.id)) {
      // Only show action economy if actor is in active combat
      const combatId = game.combat.id;
      try {
        const { ActionEconomyPersistence } = await import("/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js");
        const { ActionEngine } = await import("/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine-v2.js");

        const turnState = ActionEconomyPersistence.getTurnState(actor, combatId);
        const state = ActionEngine.getVisualState(turnState);
        const breakdown = ActionEngine.getTooltipBreakdown(turnState);
        const enforcementMode = HouseRuleService.getString('actionEconomyMode', 'loose');

        context.actionEconomy = {
          state,
          breakdown,
          enforcementMode
        };
      } catch (err) {
        console.error("[SWSE] Error loading action economy context:", err);
      }
    }

    RenderAssertions.assertContextSerializable(context, "SWSEV2NpcSheet");

    this._talentAbilitiesCache = context.talentAbilities;
    // CRITICAL: Return context directly, do NOT use mergeObject with Documents
    // mergeObject tries to deeply clone all properties including Document references,
    // which have read-only 'id' properties. Context is already complete and serializable.
    return context;
  }

  async _onRender(context, options) {
    // ═══ FIX: Center on initial render (first time ever or after close/reopen) ═══
    // Use dynamic dimensions instead of hardcoding 820x920
    const isFirstRenderEver = !this.rendered;
    if (isFirstRenderEver) {
      this._hasBeenRendered = true;
      this._shouldCenterOnRender = true;
    }

    const shouldCenter = this._shouldCenterOnRender;
    if (shouldCenter) {
      const { width: targetWidth, height: targetHeight } = getApplicationTargetSize(this);
      const pos = computeCenteredPosition(targetWidth, targetHeight);
      this.setPosition({ left: pos.left, top: pos.top });
      this._shouldCenterOnRender = false;
    }

    // Phase 3: Enforce super._onRender call (AppV2 contract)
    await super._onRender(context, options);

    // Abort previous render's listeners to prevent duplicate event handlers
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    // AppV2 invariant: all DOM access must use this.element
    const root = this.element;
    if (!(root instanceof HTMLElement)) {
      throw new Error("NpcSheet: element not HTMLElement");
    }

    // Wire action economy bindings for combat tab
    ActionEconomyBindings.setupAttackButtons(root, this.document);

    this._wireNpcShellChromeEvents(root, signal);
    this._wireNamedFieldPersistence(root, signal);

    if (this._shellSurface === 'sheet') {
      RenderAssertions.assertDOMElements(
        root,
        [".sheet-tabs", ".sheet-body"],
        "SWSEV2NpcSheet"
      );
    }

    if (this._shellSurface === 'sheet') {
      // Condition step active state is template/context-owned; avoid render-time DOM mutation.
      applyResourceBarAnimations(this, root);
      this._activateNpcTab(root, this._requestedNpcTab());
    }

    // Portrait upload + auto-apply (click via data-edit="img", drag/drop here)
    PortraitUploadController.bind(root, { actor: this.actor, signal });

    // Force Suite UI — only active for force-sensitive NPCs
    if (this.actor.system?.forceSensitive) {
      activateForceUI(this, root, { signal });
    }

    /* ---------------- TAB HANDLING ---------------- */
    if (this._shellSurface === 'sheet') {
      for (const tabBtn of root.querySelectorAll('.sheet-tabs .item')) {
        tabBtn.addEventListener('click', (ev) => {
          ev.preventDefault();
          const tabName = ev.currentTarget?.dataset?.tab;
          if (!tabName) return;
          this._activateNpcTab(root, tabName);
        }, { signal });
      }
    }

    // Condition step clicking
    for (const el of root.querySelectorAll('.swse-v2-condition-step')) {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const step = Number(ev.currentTarget?.dataset?.step);
        if (!Number.isFinite(step)) {return;}
        if (typeof this.actor.setConditionTrackStep === 'function') {
          await this.actor.setConditionTrackStep(step);
        } else {
          await ActorEngine.updateActor(this.actor, { 'system.conditionTrack.current': step });
        }
      }, { signal });
    }

    // Condition track improvements
    const improveBtn = root.querySelector('.swse-v2-condition-improve');
    if (improveBtn) {
      improveBtn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        if (typeof this.actor.improveConditionTrack === 'function') {
          await this.actor.improveConditionTrack();
        }
      }, { signal });
    }

    // Condition track worsening
    const worsenBtn = root.querySelector('.swse-v2-condition-worsen');
    if (worsenBtn) {
      worsenBtn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        if (typeof this.actor.worsenConditionTrack === 'function') {
          await this.actor.worsenConditionTrack();
        }
      }, { signal });
    }

    // Talent Abilities panel (multi-option actions, filtering)
    this._bindTalentAbilitiesPanel(root, { signal });

    // Abilities tab handlers (Phase 3)
    this._bindAbilityCardHandlers(root, { signal });
    this._bindConceptAbilityPanelControls(root, { signal });

    // Condition track persistence toggle
    const persistentCheckbox = root.querySelector('.swse-v2-condition-persistent');
    if (persistentCheckbox) {
      persistentCheckbox.addEventListener('change', async (ev) => {
        const flag = ev.currentTarget?.checked === true;
        if (typeof this.actor.setConditionTrackPersistent === 'function') {
          await this.actor.setConditionTrackPersistent(flag);
        }
      }, { signal });
    }

    /* ---- PROGRESSION FRAMEWORK BUTTONS (Chargen/Store/Mentor) ---- */

    root.querySelector('[data-action="cmd-chargen"]')?.addEventListener("click", async (ev) => {
      ev.preventDefault();
      await launchProgression(this.actor);
    }, { signal });

    root.querySelector('[data-action="cmd-store"]')?.addEventListener("click", async (ev) => {
      ev.preventDefault();
      new SWSEStore(this.actor).render(true);
    }, { signal });

    root.querySelector('[data-action="open-mentor"]')?.addEventListener("click", async (ev) => {
      ev.preventDefault();
      ui.notifications.info("Mentor interactions are not yet available on NPC sheets.");
    }, { signal });

    /* ---- PHASE 5: NPC PROGRESSION PANEL ACTIONS ---- */

    root.querySelector('[data-action="open-npc-levelup"]')?.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const { SWSENpcLevelUpEntry } = await import("/systems/foundryvtt-swse/scripts/apps/levelup/npc-levelup-entry.js");
      new SWSENpcLevelUpEntry(this.actor).render(true);
    }, { signal });

    root.querySelector('[data-action="revert-npc-progression"]')?.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const { NpcProgressionEngine } = await import("/systems/foundryvtt-swse/scripts/engine/progression/npc-progression-engine.js");

      const snapshotInfo = NpcProgressionEngine.getSnapshotInfo?.(this.actor);
      if (!snapshotInfo) {
        ui.notifications.warn('No snapshot available to revert to.');
        return;
      }

      const { SWSEDialogV2 } = await import("/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js");
      const ok = await SWSEDialogV2.confirm({
        title: 'Revert NPC to Statblock Snapshot',
        content: `<p>This restores the NPC to: <strong>${snapshotInfo.label}</strong> (${snapshotInfo.date})</p><p>Items, effects, and all attributes will be restored exactly.</p>`
      });
      if (!ok) {return;}

      try {
        await NpcProgressionEngine.revertToSnapshot(this.actor);
        ui.notifications.info('NPC reverted to snapshot.');
        this.render(false);
      } catch (err) {
        console.error('Snapshot revert failed:', err);
        ui.notifications.error('Failed to revert NPC to snapshot.');
      }
    }, { signal });

    // Open follower advancement flow (from follower NPC sheet → owner's FollowerShell)
    root.querySelector('[data-action="open-follower-advancement"]')?.addEventListener('click', async (ev) => {
      ev.preventDefault();
      const ownerActorId = this.actor.system?.npcProfile?.owner?.actorId
        || this.actor.flags?.swse?.follower?.ownerId
        || null;
      if (!ownerActorId) {
        ui.notifications?.warn('No owner is linked to this follower.');
        return;
      }
      const ownerActor = game.actors?.get(String(ownerActorId).replace(/^Actor\./, ''));
      if (!ownerActor) {
        ui.notifications?.warn('Owner actor could not be found in this world.');
        return;
      }
      await launchFollowerProgression(ownerActor, { existingFollowerId: this.actor.id });
    }, { signal });



    // Phase 9: Review & Repair actions. These are explicit user/GM actions;
    // they do not run when an NPC sheet opens.
    root.querySelector('[data-action="npc-repair-safe-normalize"]')?.addEventListener('click', async (ev) => {
      ev.preventDefault();
      try {
        const result = await NpcReviewRepairEngine.applySafeFixes(this.actor);
        if (result?.applied) {
          ui.notifications?.info?.(`NPC Review & Repair applied ${result.updateCount} safe normalization update(s).`);
        } else {
          ui.notifications?.info?.('No safe NPC normalization updates were needed.');
        }
        await this.render(false);
      } catch (err) {
        console.error('NPC Review & Repair normalization failed:', err);
        ui.notifications?.error?.(`NPC Review & Repair failed: ${err.message}`);
      }
    }, { signal });

    root.querySelector('[data-action="npc-repair-gm-approve"]')?.addEventListener('click', async (ev) => {
      ev.preventDefault();
      try {
        const confirm = globalThis.Dialog?.confirm;
        let approved = true;
        if (typeof confirm === 'function') {
          approved = await confirm({
            title: 'GM Approve NPC Overrides',
            content: '<p>This marks the NPC as table-approved with overrides. It does not make the NPC progression-legal and does not recalculate HP, defenses, BAB, attacks, feats, or talents.</p>',
            yes: () => true,
            no: () => false,
            defaultYes: false
          });
        }
        if (!approved) return;
        await NpcReviewRepairEngine.markGmApproved(this.actor);
        ui.notifications?.info?.('NPC marked GM-approved with overrides.');
        await this.render(false);
      } catch (err) {
        console.error('NPC GM approval failed:', err);
        ui.notifications?.error?.(`NPC GM approval failed: ${err.message}`);
      }
    }, { signal });

    // Open related actor sheet (linked relationship cards)
    const _openRelatedActor = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const actorId = ev.currentTarget?.dataset?.actorId;
      if (!actorId) return;
      const relatedActor = game.actors?.get(String(actorId).replace(/^Actor\./, ''));
      if (!relatedActor?.sheet) {
        ui.notifications?.warn('Related actor could not be found.');
        return;
      }
      relatedActor.sheet.render(true);
    };
    for (const el of root.querySelectorAll('[data-action="open-related-actor"]')) {
      el.addEventListener('click', _openRelatedActor, { signal });
      if (el.tagName !== 'BUTTON') {
        el.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') _openRelatedActor(ev);
        }, { signal });
      }
    }

    // Item sheet opening
    for (const el of root.querySelectorAll('.swse-v2-open-item')) {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const itemId = ev.currentTarget?.dataset?.itemId;
        if (!itemId) {return;}
        const item = this.actor?.items?.get(itemId);
        item?.sheet?.render(true);
      }, { signal });
    }

    // Action execution
    for (const el of root.querySelectorAll('.swse-v2-use-action')) {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const actionId = ev.currentTarget?.dataset?.actionId;
        if (!actionId) {return;}
        if (typeof this.actor.useAction === 'function') {
          await this.actor.useAction(actionId);
        }
      }, { signal });
    }

    RenderAssertions.assertRenderComplete(
      this,
      "SWSEV2NpcSheet"
    );
  }

  _wireNpcShellChromeEvents(root, signal) {
    if (!(root instanceof HTMLElement)) return;

    root.querySelector('[data-action="tablet-close"]')?.addEventListener('click', (ev) => {
      ev.preventDefault();
      this.close();
    }, { signal });

    root.querySelectorAll('[data-action="tablet-home"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        await this.setSurface('home');
        await this.requestSurfaceRender({ reason: 'npc-tablet-home', surfaceId: 'home' });
      }, { signal });
    });

    root.querySelector('[data-action="tablet-expand"]')?.addEventListener('click', (ev) => {
      ev.preventDefault();
      root.classList.toggle('swse-tablet-expanded');
    }, { signal });
  }

  _requestedNpcTab() {
    const requested = this._shellSurfaceOptions?.tab || this.shellSurfaceOptions?.tab;
    return typeof requested === 'string' && requested.trim() ? requested.trim() : 'overview';
  }

  _activateNpcTab(root, tabName = 'overview') {
    if (!(root instanceof HTMLElement)) return;
    const requested = String(tabName || 'overview');
    const tabs = [...root.querySelectorAll('.sheet-body .tab')];
    const hasRequestedTab = tabs.some(tab => tab.dataset?.tab === requested);
    const target = hasRequestedTab ? requested : 'overview';

    this._shellSurfaceOptions = {
      ...(this._shellSurfaceOptions ?? {}),
      tab: target
    };

    root.querySelectorAll('.sheet-tabs .item').forEach(button => {
      button.classList.toggle('active', button.dataset?.tab === target);
    });

    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset?.tab === target);
    });
  }

  _wireNamedFieldPersistence(root, signal) {
    if (!(root instanceof HTMLElement)) return;

    root.addEventListener('change', async (ev) => {
      const field = ev.target instanceof HTMLElement
        ? ev.target.closest('input[name], textarea[name], select[name]')
        : null;
      if (!(field instanceof HTMLElement)) return;
      if (!field.name || field.hasAttribute('data-action') || field.disabled || field.hasAttribute('readonly')) return;
      if (!isNpcSheetWritablePath(field.name)) return;

      const rawValue = field.matches('input[type="checkbox"]') ? field.checked : field.value;
      const update = {
        [field.name]: coerceSingleFieldValue(field.name, rawValue, field)
      };

      try {
        const quiet = isQuietNpcSheetPath(field.name);
        await ActorEngine.updateActor(this.actor, update, {
          source: quiet ? 'npc-sheet-direct-field-quiet' : 'npc-sheet-direct-field',
          render: quiet ? false : undefined,
          suppressAppRefresh: quiet,
          meta: { guardKey: `npc-field:${field.name}` }
        });
      } catch (err) {
        console.error('NPC field update failed:', err);
        ui.notifications.error(`Failed to update field: ${err.message}`);
      }
    }, { signal });
  }

  async _onClose(options) {
    // Cleanup all event listeners on close
    this._renderAbort?.abort();
    return super._onClose(options);
  }

  _bindTalentAbilitiesPanel(root, { signal } = {}) {
    for (const container of root.querySelectorAll('.swse-talent-abilities-container')) {
      if (container.dataset.abilityBound === 'true') continue;
      container.dataset.abilityBound = 'true';

      const applyFilter = (filter) => {
        for (const btn of container.querySelectorAll('.ability-filter-btn')) {
          btn.classList.toggle('active', btn.dataset.filter === filter);
        }

        for (const card of container.querySelectorAll('.ability-card')) {
          const type = card.dataset.actionType;
          const show = filter === 'all' || type === filter;
          card.style.display = show ? '' : 'none';
        }
      };

      container.addEventListener('click', async (ev) => {
        const filterBtn = ev.target.closest('.ability-filter-btn');
        if (filterBtn?.dataset?.filter) {
          ev.preventDefault();
          applyFilter(filterBtn.dataset.filter);
          return;
        }

        const actionEl = ev.target.closest('[data-action]');
        if (!actionEl) return;

        const action = actionEl.dataset.action;

        if (action === 'expandAbility' || action === 'showMultiOptions') {
          ev.preventDefault();
          const card = actionEl.closest('.ability-card');
          if (!card) return;

          const isExpanded = card.classList.toggle('expanded');

          if (action === 'showMultiOptions') {
            const list = card.querySelector('.multi-option-sub-abilities');
            if (list) {
              list.style.display = isExpanded ? '' : 'none';
            }
          }

          return;
        }

        if (action === 'useSubAbility') {
          ev.preventDefault();

          const subId = actionEl.dataset.subAbilityId;
          if (!subId) return;

          const cache = this._talentAbilitiesCache;
          const subAbility =
            cache?.all?.flatMap(a => a.subAbilities || []).find(a => a.id === subId);

          if (!subAbility) return;

          if (subAbility.usesData?.isLimited && subAbility.usesData?.canUse === false) {
            ui.notifications?.warn?.('No uses remaining.');
            return;
          }

          const speaker = ChatMessage.getSpeaker({ actor: this.actor });

          if (subAbility.rollData?.canRoll && subAbility.rollData?.formula) {
            const rollData = this.actor?.getRollData?.() ?? {};
            const roll = await RollEngine.safeRoll(subAbility.rollData.formula, rollData);

            if (!roll) return; // Roll failed

            const flavorParts = [
              `<strong>${subAbility.name}</strong>`,
              subAbility.typeLabel ? `(${subAbility.typeLabel})` : '',
              subAbility.rollData.vsLabel ? `${subAbility.rollData.vsLabel}` : '',
              subAbility.rollData.dcLabel ? `${subAbility.rollData.dcLabel}` : ''
            ].filter(Boolean);

            await SWSEChat.postRoll({
              roll,
              actor: this.actor,
              flavor: flavorParts.join(' ')
            });
            return;
          }

          const content = `
            <div class="swse-ability-chat-card">
              <h3>${foundry.utils.escapeHTML(subAbility.name || '')}</h3>
              ${subAbility.typeLabel ? `<p><strong>Action:</strong> ${foundry.utils.escapeHTML(subAbility.typeLabel)}</p>` : ''}
              ${subAbility.description ? `<p>${foundry.utils.escapeHTML(subAbility.description)}</p>` : ''}
            </div>
          `;

          await SWSEChat.postHTML({
            content,
            actor: this.actor
          });
        }
      }, { signal });

      applyFilter('all');
    }
  }

  /* -------- SHARED CONCEPT ABILITY PANEL CONTROLS (Phase 6) -------- */

  _bindConceptAbilityPanelControls(root, { signal } = {}) {
    if (!(root instanceof HTMLElement)) return;

    root.addEventListener('click', async (ev) => {
      const toggle = ev.target?.closest?.('[data-action="toggle-abilities"]');
      if (toggle) {
        ev.preventDefault();
        const panel = toggle.closest('.abilities-panel');
        if (!panel) return;
        const isExpanded = panel.classList.toggle('abilities-expanded');
        for (const row of panel.querySelectorAll('.ability-row')) {
          const collapsed = row.querySelector('.ability-collapsed');
          const expanded = row.querySelector('.ability-expanded');
          if (collapsed instanceof HTMLElement) collapsed.style.display = isExpanded ? 'none' : 'flex';
          if (expanded instanceof HTMLElement) expanded.style.display = isExpanded ? (expanded.dataset?.expandedDisplay || 'grid') : 'none';
        }
        toggle.setAttribute('aria-expanded', String(isExpanded));
        toggle.textContent = isExpanded ? 'Collapse' : (toggle.dataset?.collapsedLabel || 'Edit Stats');
        return;
      }

      const rollButton = ev.target?.closest?.('[data-action="roll-ability"]');
      if (!rollButton) return;
      ev.preventDefault();
      const abilityKey = rollButton.dataset?.ability;
      if (!abilityKey) return;

      try {
        await SWSERoll.rollAbility(this.actor, abilityKey, {
          sourceElement: rollButton,
          companionSource: rollButton,
          sheet: this,
          showRollCompanion: true
        });
      } catch (err) {
        console.error('NPC ability roll failed:', err);
        ui?.notifications?.error?.(`Ability roll failed: ${err.message}`);
      }
    }, { signal });

    root.addEventListener('input', (ev) => {
      const input = ev.target?.closest?.('.ability-expanded input');
      if (!input) return;
      const row = input.closest('.ability-row');
      if (!row) return;
      this._previewConceptAbilityRow(row);
    }, { signal });
  }

  _previewConceptAbilityRow(row) {
    const read = (field, fallback = 0) => {
      const input = row.querySelector(`input[data-field="${field}"]`);
      const value = Number(input?.value);
      return Number.isFinite(value) ? value : fallback;
    };
    const base = read('base', 10);
    const racial = read('racial', 0);
    const temp = read('temp', 0);
    const total = base + racial + temp;
    const mod = Math.floor((total - 10) / 2);
    const sign = mod > 0 ? `+${mod}` : String(mod);

    row.querySelectorAll('.math-result, .swse-concept-ability-card__score').forEach((el) => {
      el.textContent = String(total);
    });
    row.querySelectorAll('.math-mod, .swse-concept-ability-card__mod').forEach((el) => {
      el.textContent = sign;
      el.classList.toggle('mod--positive', mod > 0);
      el.classList.toggle('mod--negative', mod < 0);
      el.classList.toggle('mod--zero', mod === 0);
    });
  }

  /* -------- ABILITIES TAB HANDLERS (Phase 3) -------- */

  _bindAbilityCardHandlers(root, { signal } = {}) {
    // Ability card chat button
    root.querySelectorAll('.ability-chat-btn').forEach((btn) => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const abilityId = ev.currentTarget?.dataset?.abilityId;
        if (!abilityId) return;

        try {
          const { ActionChatEngine } = await import("/systems/foundryvtt-swse/scripts/chat/action-chat-engine.js");
          await ActionChatEngine.emote(this.actor, `uses ability: ${abilityId}`);
        } catch (err) {
          console.error('Error posting ability chat:', err);
        }
      }, { signal });
    });

    // Ability card roll button
    root.querySelectorAll('.ability-roll-btn').forEach((btn) => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const abilityId = ev.currentTarget?.dataset?.abilityId;
        if (!abilityId) return;

        try {
          const ability = this.actor.items?.get(abilityId);
          if (ability) {
            const { rollAttack } = await import("/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js");
            if (typeof rollAttack === 'function') {
              await rollAttack(this.actor, ability);
            }
          }
        } catch (err) {
          console.error('Error rolling ability:', err);
        }
      }, { signal });
    });

    // Ability card use button
    root.querySelectorAll('.ability-use-btn').forEach((btn) => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const abilityId = ev.currentTarget?.dataset?.abilityId;
        if (!abilityId) return;

        try {
          const ability = this.actor.items?.get(abilityId);
          if (ability) {
            // Mark as used
            const { AbilityUsage } = await import("/systems/foundryvtt-swse/scripts/engine/abilities/ability-usage.js");
            await AbilityUsage.markUsed(this.actor, abilityId);
            this.render();
          }
        } catch (err) {
          console.error('Error using ability:', err);
        }
      }, { signal });
    });
  }

  async _onSubmitForm(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const formDataObj = Object.fromEntries(formData.entries());
    const allowedFlat = filterNpcSheetUpdate(formDataObj);
    const expanded = foundry.utils.expandObject(allowedFlat);

    if (!expanded || Object.keys(allowedFlat).length === 0) {return;}

    try {
      // Route safe source-field edits through governance. Derived math,
      // statblock authority, import raw data, embedded items, and Legal Review
      // repair data stay with their owning engines/surfaces.
      const quiet = isQuietNpcSheetUpdate(allowedFlat);
      await ActorEngine.updateActor(this.actor, expanded, {
        source: quiet ? 'npc-sheet-form-submit-quiet' : 'npc-sheet-form-submit',
        render: quiet ? false : undefined,
        suppressAppRefresh: quiet
      });
    } catch (err) {
      console.error('Sheet submission failed:', err);
      ui.notifications.error(`Failed to update actor: ${err.message}`);
    }
  }
}
