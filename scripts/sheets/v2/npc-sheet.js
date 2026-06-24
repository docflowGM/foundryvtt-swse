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
import { ShellUiStatePreserver } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellUiStatePreserver.js";
import { ThemeResolutionService } from "/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js";
import { coerceSingleFieldValue } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/form.js";
import { NpcReviewRepairEngine } from "/systems/foundryvtt-swse/scripts/engine/npc-legal-review/NpcReviewRepairEngine.js";
import { getHeroicLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";
import { CombatActionsMapper } from "/systems/foundryvtt-swse/scripts/combat/utils/combat-actions-mapper.js";
import { AbilityCombatActionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/ability-combat-action-resolver.js";
import { CombinedFeatActionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combined-feat-action-resolver.js";


const NPC_ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const NPC_ABILITY_LABELS = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma'
};

const NPC_SKILL_DEFS = [
  ['acrobatics', 'Acrobatics', 'dex'],
  ['climb', 'Climb', 'str'],
  ['deception', 'Deception', 'cha'],
  ['endurance', 'Endurance', 'con'],
  ['gatherInformation', 'Gather Information', 'cha'],
  ['initiative', 'Initiative', 'dex'],
  ['jump', 'Jump', 'str'],
  ['knowledgeBureaucracy', 'Knowledge (Bureaucracy)', 'int'],
  ['knowledgeGalacticLore', 'Knowledge (Galactic Lore)', 'int'],
  ['knowledgeLifeSciences', 'Knowledge (Life Sciences)', 'int'],
  ['knowledgePhysicalSciences', 'Knowledge (Physical Sciences)', 'int'],
  ['knowledgeSocialSciences', 'Knowledge (Social Sciences)', 'int'],
  ['knowledgeTactics', 'Knowledge (Tactics)', 'int'],
  ['knowledgeTechnology', 'Knowledge (Technology)', 'int'],
  ['mechanics', 'Mechanics', 'int'],
  ['perception', 'Perception', 'wis'],
  ['persuasion', 'Persuasion', 'cha'],
  ['pilot', 'Pilot', 'dex'],
  ['ride', 'Ride', 'dex'],
  ['stealth', 'Stealth', 'dex'],
  ['survival', 'Survival', 'wis'],
  ['swim', 'Swim', 'str'],
  ['treatInjury', 'Treat Injury', 'wis'],
  ['useComputer', 'Use Computer', 'int'],
  ['useTheForce', 'Use the Force', 'cha']
];

const NPC_SKILL_DEF_BY_KEY = Object.fromEntries(NPC_SKILL_DEFS.map(([key, label, ability]) => [key, { key, label, ability }]));


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

function isPlaceholderNpcName(value) {
  const name = String(value ?? '').trim().toLowerCase();
  return !name || ['name', 'npc', 'actor', 'new actor', 'new npc', 'unnamed npc'].includes(name);
}

function getNpcBeastData(actor) {
  return actor?.flags?.swse?.beastData
    ?? actor?.flags?.['foundryvtt-swse']?.beastData
    ?? actor?.system?.beastData
    ?? null;
}

function resolveNpcDisplayName(actor) {
  const current = String(actor?.name ?? '').trim();
  const beastName = String(getNpcBeastData(actor)?.name ?? '').trim();
  if (actor?.type === 'npc' && isPlaceholderNpcName(current) && beastName) return beastName;
  return current || beastName || 'NPC';
}

function buildSerializableActorContext(actor) {
  return {
    id: actor.id,
    name: resolveNpcDisplayName(actor),
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


function readFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeAbilityCandidate(raw = {}, source = 'unknown') {
  const base = readFiniteNumber(raw?.base ?? raw?.score ?? raw?.value) ?? 10;
  const racial = readFiniteNumber(raw?.racial ?? raw?.species) ?? 0;
  const enhancement = readFiniteNumber(raw?.enhancement ?? raw?.enhance) ?? 0;
  const temp = readFiniteNumber(raw?.temp ?? raw?.temporary) ?? 0;
  const explicitTotal = readFiniteNumber(raw?.total);
  const total = explicitTotal ?? (base + racial + enhancement + temp);
  const mod = readFiniteNumber(raw?.mod ?? raw?.modifier) ?? abilityMod(total);
  const populated = raw && typeof raw === 'object' && Object.keys(raw).length > 0;
  const nonDefault = populated && (base !== 10 || racial !== 0 || enhancement !== 0 || temp !== 0 || total !== 10 || mod !== 0);
  return { source, base, racial, enhancement, temp, total, mod, populated, nonDefault };
}

function chooseAbilityCandidate(candidates = []) {
  const populated = candidates.filter(candidate => candidate?.populated);
  if (!populated.length) return normalizeAbilityCandidate({}, 'default');
  const nonDefault = populated.filter(candidate => candidate.nonDefault);
  if (nonDefault.length) return nonDefault[0];
  return populated[0];
}

function isFollowerNpcActor(actor, context = {}) {
  const system = actor?.system ?? {};
  const profile = system.npcProfile ?? {};
  return actor?.type === 'npc' && (
    system.isFollower === true ||
    system.progression?.isFollower === true ||
    profile.kind === 'follower' ||
    profile.legalProfile === 'follower' ||
    context?.npcKind === 'follower' ||
    actor?.flags?.swse?.follower?.isFollower === true ||
    actor?.getFlag?.('foundryvtt-swse', 'isFollower') === true
  );
}

function getFollowerSheetLevel(actor, context = {}) {
  const ownerId = actor?.system?.npcProfile?.owner?.actorId || actor?.flags?.swse?.follower?.ownerId || null;
  const owner = ownerId ? game?.actors?.get?.(String(ownerId).replace(/^Actor\./, '')) : null;
  const ownerHeroicLevel = owner ? getHeroicLevel(owner) : 0;
  const contextLevel = Number(context?.ownerHeroicLevel ?? context?.followerSummary?.ownerHeroicLevel ?? 0) || 0;
  const actorLevel = Number(actor?.system?.level ?? actor?.system?.attributes?.level ?? 0) || 0;
  return Math.max(0, ownerHeroicLevel || contextLevel || actorLevel);
}

function abilitySourceByKey(abilities = []) {
  return Object.fromEntries((abilities || []).map(entry => [entry.key, entry]));
}

function defenseObjectValue(source, keys = []) {
  for (const key of keys) {
    const value = key.split('.').reduce((acc, part) => acc?.[part], source);
    const n = readFiniteNumber(value);
    if (n !== null) return n;
  }
  return null;
}

function buildFollowerDefenseValues(actor, context, abilityRows) {
  if (!isFollowerNpcActor(actor, context)) return null;
  const level = getFollowerSheetLevel(actor, context);
  if (!level) return null;

  const abilities = abilitySourceByKey(abilityRows);
  const strMod = safeNumber(abilities.str?.rawMod ?? abilities.str?.modValue ?? abilities.str?.mod, 0);
  const conMod = safeNumber(abilities.con?.rawMod ?? abilities.con?.modValue ?? abilities.con?.mod, 0);
  const dexMod = safeNumber(abilities.dex?.rawMod ?? abilities.dex?.modValue ?? abilities.dex?.mod, 0);
  const wisMod = safeNumber(abilities.wis?.rawMod ?? abilities.wis?.modValue ?? abilities.wis?.mod, 0);
  const defenses = actor?.system?.defenses ?? {};
  const templateBonus = actor?.system?.progression?.followerTemplateDefenseBonus ?? {};

  const bonusFor = (canonical, aliases = []) => {
    const paths = [
      `${canonical}.bonus`,
      `${canonical}.templateBonus`,
      `${canonical}.misc.user.extra`,
      ...aliases.flatMap(alias => [`${alias}.bonus`, `${alias}.templateBonus`, `${alias}.misc.user.extra`])
    ];
    const stored = defenseObjectValue(defenses, paths);
    if (stored !== null) return stored;
    return Number(templateBonus?.[canonical] ?? aliases.map(alias => templateBonus?.[alias]).find(value => value !== undefined) ?? 0) || 0;
  };

  const values = {
    fort: 10 + level + Math.max(strMod, conMod) + bonusFor('fortitude', ['fort']),
    ref: 10 + level + dexMod + bonusFor('reflex', ['ref']),
    will: 10 + level + wisMod + bonusFor('will', [])
  };
  values.dt = defenseObjectValue(actor?.system ?? {}, ['damageThreshold.total', 'damageThreshold', 'derived.damage.threshold', 'derived.threshold.total']) ?? values.fort;
  return values;
}

function formatDefenseDisplay(value, fallback = '—') {
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : displayValue(value, fallback);
}

function normalizeActionEconomyType(value) {
  const raw = String(value ?? '').toLowerCase().trim();
  if (!raw) return 'standard';
  if (raw.includes('full')) return 'full-round';
  if (raw.includes('swift')) return 'swift';
  if (raw.includes('move')) return 'move';
  if (raw.includes('free')) return 'free';
  if (raw.includes('reaction')) return 'reaction';
  if (raw.includes('standard')) return 'standard';
  return raw;
}

function economyLabel(value) {
  return String(value || 'standard')
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function slugAction(value) {
  return String(value || 'combat-action')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'combat-action';
}

function readNpcAbilitySource(system, key) {
  const attr = system?.attributes?.[key] ?? {};
  const derived = system?.derived?.attributes?.[key] ?? {};
  const legacy = system?.abilities?.[key] ?? {};

  // Current NPC/follower creation should write system.attributes, but older and
  // beta-created followers can have default attributes at 10 while the real
  // template/species ability score lives in the legacy system.abilities mirror.
  // Pick the first populated non-default block, preferring canonical data when
  // it has meaningful values and falling back to derived/legacy when canonical
  // is only the schema default.
  return chooseAbilityCandidate([
    normalizeAbilityCandidate(attr, 'attributes'),
    normalizeAbilityCandidate(derived, 'derived'),
    normalizeAbilityCandidate(legacy, 'abilities')
  ]);
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
      enhancement: source.enhancement,
      temp: source.temp,
      total: source.total,
      mod: source.mod,
      modValue: source.mod,
      source: source.source,
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
  const type = item?.type || typeOverride || 'item';
  const isWeapon = type === 'weapon' || item?.system?.weaponType || item?.system?.damage || item?.system?.attackBonus !== undefined;
  return {
    id: item?.id ?? null,
    name: item?.name || 'Unnamed',
    type,
    typeLabel: itemTypeLabel(typeOverride || item?.type),
    img: item?.img || null,
    quantity: itemQuantity(item),
    summary: itemDescription(item),
    canOpen: Boolean(item?.id),
    canRollAttack: Boolean(item?.id && isWeapon)
  };
}

function parseNpcAttackBonus(value) {
  const match = String(value ?? '').match(/[+-]?\d+/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function normalizeNpcDiceFormula(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '—') return '';
  const formula = raw
    .replace(/[–—−]/g, '-')
    .replace(/×/g, '*')
    .replace(/\s+/g, '');
  if (!/^[0-9dD+\-*/().]+$/.test(formula)) return '';
  if (!/\d+d\d+/i.test(formula)) return '';
  return formula;
}

function normalizeNpcSkillKey(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const direct = raw.replace(/[^A-Za-z0-9]/g, '');
  const lower = direct.toLowerCase();
  const known = {
    usecomputer: 'useComputer',
    usetheforce: 'useTheForce',
    gatherinformation: 'gatherInformation',
    treatinjury: 'treatInjury',
    knowledgebureaucracy: 'knowledgeBureaucracy',
    knowledgegalacticlore: 'knowledgeGalacticLore',
    knowledgelifesciences: 'knowledgeLifeSciences',
    knowledgephysicalsciences: 'knowledgePhysicalSciences',
    knowledgesocialsciences: 'knowledgeSocialSciences',
    knowledgetactics: 'knowledgeTactics',
    knowledgetechnology: 'knowledgeTechnology'
  };
  return known[lower] || raw;
}


function npcStatblockEditKey(value, index = 0) {
  const slug = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `row-${index}`;
}

function readNpcPath(source, path) {
  return String(path || '').split('.').reduce((acc, part) => acc?.[part], source);
}

function firstPresent(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function formatNpcTotal(value, fallback = '+0') {
  const n = Number(value);
  if (!Number.isFinite(n)) return displayValue(value, fallback);
  return n >= 0 ? `+${n}` : String(n);
}

function parseNpcStatblockSkillLines(rawSkills = []) {
  const result = {};
  const rows = Array.isArray(rawSkills)
    ? rawSkills
    : (typeof rawSkills === 'string' ? rawSkills.split(/[,;\n]+/) : []);
  for (const row of rows) {
    const text = String(row ?? '').replace(/ /g, ' ').trim();
    if (!text) continue;
    const match = text.match(/^(.+?)\s+([+-]?\d+)/);
    if (!match) continue;
    const key = normalizeNpcSkillKey(match[1]);
    const total = Number(match[2]);
    if (key && Number.isFinite(total)) result[key] = total;
  }
  return result;
}

function buildNpcSkillRows(actor, context = {}, play = {}, rawBeastData = null, npcStatblock = {}) {
  const system = actor?.system ?? {};
  const systemSkills = system?.skills ?? {};
  const overrides = npcStatblock?.skills ?? {};
  const statblockSkillTotals = parseNpcStatblockSkillLines(rawBeastData?.skills ?? []);
  const playByKey = {};

  for (const skill of play?.skills ?? []) {
    const key = normalizeNpcSkillKey(skill.key || skill.id || skill.label);
    if (!key) continue;
    playByKey[key] = skill;
  }

  const seen = new Set();
  const keys = [];
  const addKey = (key) => {
    const normalized = normalizeNpcSkillKey(key);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    keys.push(normalized);
  };

  NPC_SKILL_DEFS.forEach(([key]) => addKey(key));
  Object.keys(systemSkills).forEach(addKey);
  Object.keys(overrides).forEach(addKey);
  Object.keys(playByKey).forEach(addKey);
  Object.keys(statblockSkillTotals).forEach(addKey);

  return keys.map((key) => {
    const def = NPC_SKILL_DEF_BY_KEY[key] ?? { key, label: labelFromKey(key), ability: systemSkills?.[key]?.selectedAbility || '' };
    const sysSkill = systemSkills?.[key] ?? {};
    const override = overrides?.[key] ?? {};
    const playSkill = playByKey[key] ?? {};
    const rawTotal = firstPresent(
      override.total,
      override.value,
      playSkill.total,
      statblockSkillTotals[key],
      sysSkill.total,
      system?.derived?.skills?.[key]?.total,
      sysSkill.miscMod
    );
    const totalNumber = readFiniteNumber(rawTotal) ?? readFiniteNumber(String(rawTotal ?? '').replace('+', '')) ?? 0;
    const trained = override.trained === true || override.trained === 'true'
      || playSkill.trained === true
      || sysSkill.trained === true;
    return {
      key,
      id: key,
      label: override.label || playSkill.label || def.label,
      ability: override.ability || sysSkill.selectedAbility || sysSkill.ability || def.ability || '',
      total: formatNpcTotal(totalNumber),
      rawTotal: totalNumber,
      trained,
      canRoll: true,
      editPath: `system.npcStatblock.skills.${key}.total`,
      trainedEditPath: `system.npcStatblock.skills.${key}.trained`,
      source: override.total !== undefined ? 'override' : (playSkill.total !== undefined ? 'statblock' : (sysSkill.total !== undefined ? 'system' : 'derived'))
    };
  });
}

function normalizeNpcStatblockAttackRows(sourceRows = [], overrideMap = {}) {
  const rows = [];
  const seen = new Set();

  sourceRows.forEach((row, index) => {
    const editKey = npcStatblockEditKey(row.editKey || row.key || row.name || row.id, index);
    seen.add(editKey);
    const override = overrideMap?.[editKey] ?? {};
    const name = firstPresent(override.name, row.name, 'Attack');
    const attack = firstPresent(override.attack, row.attack, '—');
    const damage = firstPresent(override.damage, row.damage, '—');
    rows.push({
      ...row,
      editKey,
      name,
      source: firstPresent(override.source, row.source, 'Statblock'),
      mode: firstPresent(override.mode, row.mode, '—'),
      attack,
      damage,
      notes: firstPresent(override.notes, row.notes, ''),
      attackBonus: parseNpcAttackBonus(attack),
      damageFormula: normalizeNpcDiceFormula(damage)
    });
  });

  Object.entries(overrideMap || {}).forEach(([editKey, override], index) => {
    if (seen.has(editKey)) return;
    const name = firstPresent(override.name, labelFromKey(editKey), 'Attack');
    const attack = firstPresent(override.attack, '—');
    const damage = firstPresent(override.damage, '—');
    rows.push({
      id: null,
      itemId: null,
      editKey,
      name,
      source: firstPresent(override.source, 'GM Override'),
      mode: firstPresent(override.mode, 'Statblock'),
      attack,
      damage,
      notes: firstPresent(override.notes, ''),
      attackBonus: parseNpcAttackBonus(attack),
      damageFormula: normalizeNpcDiceFormula(damage)
    });
  });

  return rows;
}


function normalizeNpcCombatAction(action, fallbackKey = '') {
  const key = action.key || action.id || fallbackKey || slugAction(action.name);
  const actionType = normalizeActionEconomyType(action.actionType || action.type || action.action?.type || action.costType || 'standard');
  const relatedSkills = Array.isArray(action.relatedSkills) ? action.relatedSkills : [];
  const manualResolution = action.manualResolution === true || action.resolutionMode === 'manual' || action.resolutionMode === 'reference';
  return {
    key,
    id: key,
    name: action.name || action.label || 'Combat Action',
    sourceName: action.sourceName || action.source || action.system?.source || 'Combat Action',
    actionType,
    type: actionType,
    cost: action.cost ?? action.actionCost ?? action.action?.cost ?? 1,
    description: displayValue(action.description || action.notes || action.system?.description || action.system?.notes, ''),
    resources: Array.isArray(action.resources) ? action.resources : [],
    itemId: action.itemId || action.sourceItemId || '',
    executable: action.executable !== false,
    useLabel: action.useLabel || (manualResolution ? 'Use / Note' : (relatedSkills.length ? 'Roll / Use' : 'Use')),
    manualResolution,
    resolutionMode: action.resolutionMode || (manualResolution ? 'manual' : 'auto'),
    spendAction: action.spendAction !== false,
    relatedSkills
  };
}

async function buildNpcCombatActions(actor) {
  const grouped = {};
  const lookup = {};
  const economyOrder = ['full-round', 'standard', 'move', 'swift', 'free', 'reaction'];
  const registerAction = (action, fallbackKey = '') => {
    const row = normalizeNpcCombatAction(action, fallbackKey);
    if (!grouped[row.actionType]) grouped[row.actionType] = [];
    grouped[row.actionType].push(row);
    lookup[row.key] = row;
  };

  try {
    let loadedAny = false;
    try {
      await CombatActionsMapper.init?.();
      const mappedActions = CombatActionsMapper.getAllCombatActions?.() || [];
      mappedActions.forEach((action, index) => registerAction({
        ...action,
        key: action.key || `combat:${index}`,
        sourceName: 'Combat Actions Compendium',
        executable: action.executable !== false
      }));
      loadedAny = mappedActions.length > 0;
    } catch (mapperErr) {
      console.warn('[SWSE] NPC CombatActionsMapper unavailable, using JSON fallback:', mapperErr);
    }

    if (!loadedAny) {
      const response = await fetch('/systems/foundryvtt-swse/data/combat-actions.json');
      if (response.ok) {
        const actionsData = await response.json();
        actionsData.forEach((action, index) => registerAction({
          key: `combat:${index}`,
          name: action.name,
          actionType: action.action?.type,
          cost: action.action?.cost,
          notes: action.notes,
          description: action.notes,
          relatedSkills: action.relatedSkills || [],
          sourceName: 'Core Combat Action',
          executable: true
        }));
      }
    }

    for (const item of actor?.items || []) {
      if (item?.type !== 'combat-action') continue;
      const isActorAbility = item.flags?.swse?.isSpeciesAbility === true
        || item.flags?.swse?.isActorAbility === true
        || item.system?.executionModel === 'actor-special-ability'
        || item.system?.executionModel === 'species-activated-ability';
      if (!isActorAbility) continue;
      registerAction({
        key: `item:${item.id}:use`,
        itemId: item.id,
        name: item.name,
        actionType: item.system?.actionType ?? item.system?.speciesAbility?.actionType ?? 'standard',
        cost: 1,
        notes: item.system?.description ?? item.system?.speciesAbility?.description ?? '',
        description: item.system?.description ?? item.system?.speciesAbility?.description ?? '',
        relatedSkills: item.system?.relatedSkills ?? [],
        sourceName: item.flags?.swse?.sourceSpecies ?? item.flags?.swse?.sourceName ?? item.system?.specialAbility?.sourceName ?? 'Special Ability',
        executable: true,
        useLabel: 'Use'
      });
    }

    for (const action of AbilityCombatActionResolver.getActions(actor)) registerAction(action);
    for (const action of CombinedFeatActionResolver.getActions(actor)) registerAction(action);
  } catch (err) {
    console.warn('[SWSE] Failed to build NPC combat actions:', err);
  }

  const groups = [];
  for (const economy of economyOrder) {
    const items = grouped[economy] || [];
    if (!items.length) continue;
    items.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    groups.push({
      key: economy,
      id: economy,
      economy,
      label: economyLabel(economy),
      count: items.length,
      items
    });
  }
  return { groups, lookup };
}

export function buildNpcConceptSheetContext(actor, context = {}) {
  const system = actor?.system ?? {};
  const derived = context?.derived ?? system?.derived ?? {};
  const play = context?.playStatblock ?? {};
  const allItems = Array.from(actor?.items ?? []);
  const rawBeastData = getNpcBeastData(actor);
  const npcStatblock = system?.npcStatblock ?? {};
  const displayName = resolveNpcDisplayName(actor);
  const preferStatblockAuthority = context?.isStatblockMode === true
    || context?.npcSourceAuthority === 'statblock'
    || Boolean(rawBeastData);

  const levelValue = displayValue(
    system?.attributes?.level ?? system?.level ?? derived?.identity?.level ?? derived?.level,
    ''
  );
  const challenge = displayValue(
    system?.challengeLevel ?? system?.cl ?? derived?.identity?.challengeLevel ?? derived?.challengeLevel ?? rawBeastData?.cl,
    ''
  );
  const species = displayValue(
    derived?.identity?.species ?? system?.species ?? system?.race ?? system?.details?.species ?? (rawBeastData ? 'Beast' : ''),
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

  const defenseFallback = Object.fromEntries((play?.defenses ?? []).flatMap(row => {
    const keys = [row.key, row.label]
      .map(value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
      .filter(Boolean);
    return keys.map(key => [key, row.value]);
  }));
  const statblockDefense = (key, fallback = '—') => displayValue(defenseFallback[String(key).toLowerCase().replace(/[^a-z0-9]/g, '')], fallback);
  const systemDefense = (primary, aliases = []) => {
    const defs = system?.defenses ?? {};
    for (const key of [primary, ...aliases]) {
      const data = defs?.[key];
      const value = data?.total ?? data?.value ?? data;
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return null;
  };
  const derivedDefense = (primary, aliases = []) => {
    const defs = derived?.defenses ?? {};
    for (const key of [primary, ...aliases]) {
      const data = defs?.[key];
      const value = data?.total ?? data?.value ?? data;
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return null;
  };
  const overrideDefense = (keys = []) => {
    const defenses = npcStatblock?.defenses ?? {};
    for (const key of keys) {
      const value = defenses?.[key];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return null;
  };
  const pickDefense = (statblockKey, systemKey, aliases = []) => {
    const fromOverride = overrideDefense([statblockKey, systemKey, ...aliases]);
    if (fromOverride !== null) return displayValue(fromOverride, '—');
    const fromStatblock = statblockDefense(statblockKey, '');
    if (preferStatblockAuthority && fromStatblock !== '') return fromStatblock;
    return displayValue(
      derivedDefense(systemKey, aliases)
        ?? systemDefense(systemKey, aliases)
        ?? (fromStatblock !== '' ? fromStatblock : null),
      '—'
    );
  };

  const abilityRows = Array.isArray(context?.abilitiesPanel?.abilities) && context.abilitiesPanel.abilities.length
    ? context.abilitiesPanel.abilities.map(entry => ({
        key: entry.key,
        abbr: entry.abbr || String(entry.key || '').toUpperCase(),
        label: entry.label || labelFromKey(entry.key),
        base: safeNumber(entry.base, 10),
        racial: safeNumber(entry.racial, 0),
        enhancement: safeNumber(entry.enhancement, 0),
        temp: safeNumber(entry.temp, 0),
        score: displayValue(entry.total ?? entry.score ?? entry.base, '—'),
        rawScore: safeNumber(entry.total ?? entry.score ?? entry.base, 10),
        mod: formatSignedNpc(entry.mod, '—'),
        rawMod: safeNumber(entry.mod, 0),
        modValue: safeNumber(entry.mod, 0),
        modifierClass: abilityModifierClass(entry.mod),
        isPrimary: entry.isPrimary === true,
        isLowest: entry.isLowest === true,
        source: entry.source || ''
      }))
    : (play?.abilities ?? []).map(entry => ({
        key: entry.key,
        abbr: entry.label || String(entry.key || '').toUpperCase(),
        label: entry.label || labelFromKey(entry.key),
        base: safeNumber(entry.score, 10),
        racial: 0,
        enhancement: 0,
        temp: 0,
        score: displayValue(entry.score, '—'),
        rawScore: safeNumber(entry.score, 10),
        mod: displayValue(entry.mod, '—'),
        rawMod: safeNumber(String(entry.mod || '').replace('+', ''), 0),
        modValue: safeNumber(String(entry.mod || '').replace('+', ''), 0),
        modifierClass: abilityModifierClass(String(entry.mod || '').replace('+', '')),
        isPrimary: false,
        isLowest: false,
        source: 'play-statblock'
      }));

  const followerDefenseValues = buildFollowerDefenseValues(actor, context, abilityRows);
  const defenseValues = followerDefenseValues ? {
    ref: formatDefenseDisplay(followerDefenseValues.ref),
    fort: formatDefenseDisplay(followerDefenseValues.fort),
    will: formatDefenseDisplay(followerDefenseValues.will),
    dt: formatDefenseDisplay(followerDefenseValues.dt)
  } : {
    ref: pickDefense('reflex', 'reflex', ['ref']),
    fort: pickDefense('fortitude', 'fortitude', ['fort']),
    will: pickDefense('will', 'will'),
    dt: displayValue(
      firstPresent(
        npcStatblock?.defenses?.dt,
        npcStatblock?.core?.dt,
        preferStatblockAuthority
          ? (rawBeastData?.damageThreshold ?? play?.damageThreshold ?? derived?.damage?.threshold ?? derived?.threshold?.total ?? system?.damageThreshold?.total ?? system?.damageThreshold)
          : (derived?.damage?.threshold ?? derived?.threshold?.total ?? system?.damageThreshold?.total ?? system?.damageThreshold ?? play?.damageThreshold ?? rawBeastData?.damageThreshold)
      ),
      '—'
    )
  };

  const defenseChips = [
    { key: 'ref', label: 'REF', value: defenseValues.ref },
    { key: 'fort', label: 'FORT', value: defenseValues.fort },
    { key: 'will', label: 'WILL', value: defenseValues.will },
    { key: 'dt', label: 'DT', value: defenseValues.dt }
  ];

  const skillRows = buildNpcSkillRows(actor, context, play, rawBeastData, npcStatblock);

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

  const attackRows = normalizeNpcStatblockAttackRows(
    play?.attacks?.length ? play.attacks : weaponFallbackRows,
    npcStatblock?.attacks ?? {}
  ).map(row => {
    const itemId = row.itemId ?? row.id ?? null;
    return {
      id: itemId,
      itemId,
      editKey: row.editKey,
      name: row.name || 'Attack',
      source: row.source || 'Statblock',
      mode: row.mode || '—',
      attack: row.attack || '—',
      damage: row.damage || '—',
      notes: row.notes && row.notes !== '—' ? row.notes : '',
      attackBonus: row.attackBonus,
      damageFormula: row.damageFormula,
      canOpen: Boolean(itemId),
      canRollAttack: Boolean(itemId || row.attackBonus !== null),
      canRollDamage: Boolean(row.damageFormula),
      editPaths: {
        name: `system.npcStatblock.attacks.${row.editKey}.name`,
        mode: `system.npcStatblock.attacks.${row.editKey}.mode`,
        attack: `system.npcStatblock.attacks.${row.editKey}.attack`,
        damage: `system.npcStatblock.attacks.${row.editKey}.damage`,
        notes: `system.npcStatblock.attacks.${row.editKey}.notes`
      }
    };
  });

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

  const babValue = firstPresent(npcStatblock?.core?.bab, play?.bab, system?.baseAttackBonus, system?.bab?.total, system?.bab, rawBeastData?.baseAttackBonus);
  const initiativeValue = firstPresent(npcStatblock?.core?.initiative, rawBeastData?.initiative, play?.initiative, derived?.initiative?.total, system?.initiative?.total, system?.skills?.init?.total, system?.skills?.initiative?.total);
  const speedValue = firstPresent(npcStatblock?.core?.speed, play?.speed, system?.speed?.total, system?.speed, rawBeastData?.speed);

  const summaryLine = [];
  if (levelValue) summaryLine.push(`L${levelValue}`);
  if (species) summaryLine.push(species);
  if (classDisplay) summaryLine.push(classDisplay);
  if (challenge) summaryLine.push(String(challenge).startsWith('CL') ? challenge : `CL ${challenge}`);

  return {
    displayName,
    kind: context?.npcKind || 'npc',
    kindLabel: context?.npcKindLabel || 'NPC',
    modeLabel: '',
    showModeBadge: false,
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
    initiative: formatSignedNpc(initiativeValue, '—'),
    defenseChips,
    babDisplay: displayValue(babValue, '—'),
    editCore: {
      name: displayName,
      img: actor?.img || '',
      species,
      classDisplay,
      level: levelValue,
      challenge,
      size: displayValue(system?.size ?? rawBeastData?.size, ''),
      speed: displayValue(speedValue, ''),
      hpCurrent,
      hpMax,
      bab: displayValue(babValue, ''),
      dt: defenseValues.dt,
      initiative: displayValue(initiativeValue, '')
    },
    editDefenses: {
      reflex: defenseValues.ref,
      fortitude: defenseValues.fort,
      will: defenseValues.will,
      flatFooted: pickDefense('flatfooted', 'flatFooted', ['flatfooted', 'flatFootedDefense'])
    },
    quickStats: [
      { label: 'HP', value: hpMax > 0 ? `${hpCurrent}/${hpMax}` : displayValue(play?.hp?.value, '—') },
      { label: 'BAB', value: displayValue(babValue, '—') },
      { label: 'Threshold', value: defenseValues.dt },
      { label: 'Speed', value: displayValue(speedValue, '—') }
    ],
    combatStats: [
      { label: 'BAB', value: displayValue(babValue, '—') },
      { label: 'Speed', value: displayValue(speedValue, '—') },
      { label: 'Senses', value: play?.senses || displayValue(system?.senses, '—') },
      { label: 'DT', value: defenseValues.dt }
    ],
    combatActionGroups: context?.npcCombatActions?.groups ?? [],
    hasCombatActionGroups: Array.isArray(context?.npcCombatActions?.groups) && context.npcCombatActions.groups.length > 0,
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
      { label: 'Interactivity', value: 'Playable + Editable', active: true },
      { label: 'Source Authority', value: context?.npcSourceAuthorityLabel || 'Statblock', active: true },
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
  'system.hp.value',
  'system.health.value',
  'system.conditionTrack.value',
  'system.darkSideScore.value',
  'system.forcePoints.value',
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
  'system.hp.value',
  'system.health.value',
  'system.conditionTrack.value',
  'system.darkSideScore.value',
  'system.forcePoints.value',
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

const NPC_STATBLOCK_AUTHORITY_EXACT_PATHS = new Set([
  'name',
  'img',
  'system.class',
  'system.className',
  'system.race',
  'system.species',
  'system.size',
  'system.speed',
  'system.challengeLevel',
  'system.cl',
  'system.level',
  'system.credits',
  'system.hp.value',
  'system.hp.max',
  'system.hp.temp',
  'system.health.value',
  'system.health.max',
  'system.baseAttackBonus',
  'system.bab',
  'system.damageThreshold',
  'system.conditionTrack.current',
  'system.conditionTrack.value'
]);

const NPC_STATBLOCK_AUTHORITY_PATTERNS = [
  /^system\.npcStatblock\./,
  /^system\.defenses\.(reflex|ref|fortitude|fort|will|flatFooted|flatfooted)\.(total|value)$/,
  /^system\.skills\.[^.]+\.(total|value|miscMod|trained|focused|selectedAbility)$/,
  /^system\.attributes\.(str|dex|con|int|wis|cha)\.(base|racial|enhancement|temp|total)$/
];

export function isNpcStatblockAuthorityPath(path) {
  if (!path || typeof path !== 'string') return false;
  if (path.startsWith('items.') || path.startsWith('effects.') || path.startsWith('system.derived.')) return false;
  if (NPC_STATBLOCK_AUTHORITY_EXACT_PATHS.has(path)) return true;
  return NPC_STATBLOCK_AUTHORITY_PATTERNS.some(pattern => pattern.test(path));
}

export function isNpcSheetWritablePath(path) {
  if (!path || typeof path !== 'string') return false;
  if (NPC_SHEET_BLOCKED_EXACT_PATHS.has(path)) return false;
  if (NPC_SHEET_BLOCKED_PREFIXES.some(prefix => path === prefix || path.startsWith(prefix))) return false;
  if (NPC_SHEET_WRITABLE_EXACT_PATHS.has(path)) return true;
  return NPC_SHEET_WRITABLE_PATTERNS.some(pattern => pattern.test(path));
}

function filterNpcSheetUpdate(formDataObj) {
  const allowed = {};
  for (const [path, value] of Object.entries(formDataObj || {})) {
    if (isNpcSheetWritablePath(path) || isNpcStatblockAuthorityPath(path)) allowed[path] = value;
  }
  return allowed;
}

function splitNpcSheetUpdate(flatUpdateData = {}) {
  const statblock = {};
  const governed = {};
  for (const [path, value] of Object.entries(flatUpdateData || {})) {
    if (isNpcStatblockAuthorityPath(path)) statblock[path] = value;
    else governed[path] = value;
  }
  return { statblock, governed };
}

export function isQuietNpcSheetPath(path) {
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

function canUseNpcSheetEditControls(sheet, actor) {
  return game?.user?.isGM === true
    || actor?.isOwner === true
    || actor?.testUserPermission?.(game?.user, 'OWNER') === true
    || sheet?.isEditable !== false;
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
    ShellUiStatePreserver.install(this);
  }

  render(...args) {
    this._shellUiStatePreserver?.capture?.(this.element, { surfaceId: this._shellSurface });
    return super.render(...args);
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
      editable: canUseNpcSheetEditControls(this, actor),
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

    try {
      const npcCombatActions = await buildNpcCombatActions(actor);
      context.npcCombatActions = { groups: npcCombatActions.groups };
      this._npcCombatActionLookup = npcCombatActions.lookup;
    } catch (err) {
      console.warn('[SWSE] NPC combat actions unavailable:', err);
      context.npcCombatActions = { groups: [] };
      this._npcCombatActionLookup = {};
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

    // Restore scroll, focus, and form-control values preserved before this render.
    this._shellUiStatePreserver?.restore?.(this.element, { surfaceId: this._shellSurface });

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
        const rawStep = ev.currentTarget?.dataset?.step;
        const step = rawStep === 'helpless' ? 5 : Number(rawStep);
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

    // Item sheet opening / weapon attack rolling
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

    for (const el of root.querySelectorAll('[data-action="roll-npc-weapon"]')) {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const itemId = ev.currentTarget?.dataset?.itemId;
        const weapon = itemId ? this.actor?.items?.get(itemId) : null;
        if (!weapon) return;
        try {
          await SWSERoll.rollAttack(this.actor, weapon, {
            sourceElement: ev.currentTarget,
            companionSource: ev.currentTarget,
            sheet: this,
            showRollCompanion: true,
            showDialog: true
          });
        } catch (err) {
          console.error('NPC weapon attack roll failed:', err);
          ui?.notifications?.error?.(`NPC attack roll failed: ${err.message}`);
        }
      }, { signal });
    }

    for (const el of root.querySelectorAll('[data-action="roll-npc-statblock-attack"]')) {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const itemId = ev.currentTarget?.dataset?.itemId;
        const item = itemId ? this.actor?.items?.get(itemId) : null;
        try {
          if (item) {
            await SWSERoll.rollAttack(this.actor, item, {
              sourceElement: ev.currentTarget,
              companionSource: ev.currentTarget,
              sheet: this,
              showRollCompanion: true,
              showDialog: true
            });
            return;
          }
          const bonus = this._parseNpcSheetSignedNumber(ev.currentTarget?.dataset?.attackBonus);
          if (bonus === null) {
            ui?.notifications?.warn?.('This NPC attack does not have a parsable attack bonus.');
            return;
          }
          const formula = bonus >= 0 ? `1d20 + ${bonus}` : `1d20 - ${Math.abs(bonus)}`;
          await this._rollNpcSheetFlatFormula(formula, {
            title: `${ev.currentTarget?.dataset?.attackName || 'Statblock Attack'} Attack`,
            kind: 'npc-statblock-attack',
            sourceElement: ev.currentTarget
          });
        } catch (err) {
          console.error('NPC statblock attack roll failed:', err);
          ui?.notifications?.error?.(`NPC attack roll failed: ${err.message}`);
        }
      }, { signal });
    }

    for (const el of root.querySelectorAll('[data-action="roll-npc-statblock-damage"]')) {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const formula = this._normalizeNpcSheetDiceFormula(ev.currentTarget?.dataset?.damageFormula);
        if (!formula) {
          ui?.notifications?.warn?.('This NPC attack does not have a parsable damage formula.');
          return;
        }
        try {
          await this._rollNpcSheetFlatFormula(formula, {
            title: `${ev.currentTarget?.dataset?.attackName || 'Statblock Attack'} Damage`,
            kind: 'npc-statblock-damage',
            sourceElement: ev.currentTarget
          });
        } catch (err) {
          console.error('NPC statblock damage roll failed:', err);
          ui?.notifications?.error?.(`NPC damage roll failed: ${err.message}`);
        }
      }, { signal });
    }

    for (const el of root.querySelectorAll('[data-action="roll-skill"]')) {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const skillKey = ev.currentTarget?.dataset?.skill;
        if (!skillKey) return;
        try {
          const total = this._parseNpcSheetSignedNumber(ev.currentTarget?.dataset?.statblockTotal);
          if (total !== null) {
            const { showRollModifiersDialog } = await import('/systems/foundryvtt-swse/scripts/rolls/roll-config.js');
            const dialogResult = await showRollModifiersDialog({
              title: `${ev.currentTarget?.dataset?.skillLabel || labelFromKey(skillKey)} Check`,
              rollType: 'skill',
              actor: this.actor,
              skillKey,
              sourceElement: ev.currentTarget,
              sheet: this
            });
            if (dialogResult === null) return;
            const extra = Number(dialogResult?.customModifier || 0) || 0;
            const finalBonus = total + extra;
            const formula = finalBonus >= 0 ? `1d20 + ${finalBonus}` : `1d20 - ${Math.abs(finalBonus)}`;
            await this._rollNpcSheetFlatFormula(formula, {
              title: `${ev.currentTarget?.dataset?.skillLabel || labelFromKey(skillKey)} Check`,
              kind: 'npc-statblock-skill',
              sourceElement: ev.currentTarget
            });
            return;
          }
          await SWSERoll.rollSkill(this.actor, skillKey, { showDialog: true });
        } catch (err) {
          console.error('NPC skill roll failed:', err);
          ui?.notifications?.error?.(`NPC skill roll failed: ${err.message}`);
        }
      }, { signal });
    }

    // Action execution
    for (const el of root.querySelectorAll('.swse-v2-use-action, [data-action="swse-v2-use-action"]')) {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const actionId = ev.currentTarget?.dataset?.actionId;
        if (!actionId) {return;}
        const actionData = this._resolveNpcCombatActionData(actionId, ev.currentTarget);
        await this._runNpcCombatAction(actionId, actionData, { sourceElement: ev.currentTarget });
      }, { signal });
    }

    RenderAssertions.assertRenderComplete(
      this,
      "SWSEV2NpcSheet"
    );
  }

  _wireNpcShellChromeEvents(root, signal) {
    if (!(root instanceof HTMLElement)) return;
    this._shieldTabletWindowControls(root, signal);
    this._wireTabletWindowControlHitboxFallback(root, signal);

    root.querySelectorAll('[data-action="tablet-close"]').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.close();
      }, { signal });
    });

    root.querySelectorAll('[data-action="tablet-minimize"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        await this._minimizeTabletWindow?.();
      }, { signal });
    });

    root.querySelectorAll('[data-shell-chrome="top"], [data-action="tablet-drag"], .swse-sheet-v2-shell--concept').forEach(el => {
      el.addEventListener('dblclick', async (ev) => {
        if (ev.target?.closest?.('button, input, select, textarea, a, [contenteditable="true"], [data-route-id], [data-shell-action], [data-shell-window-control], [data-no-drag="true"], .swse-tablet-no-drag, .swse-tablet-hardware-rail, .swse-tablet-top-right-rail')) return;
        const target = ev.target instanceof Element ? ev.target : null;
        if (target?.closest?.('.swse-v2-screen--concept')) return;
        ev.preventDefault();
        ev.stopPropagation();
        await this._minimizeTabletWindow?.();
      }, { signal });
    });

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

    root.querySelector('[data-action="add-npc-weapon"]')?.addEventListener('click', async (ev) => {
      ev.preventDefault();
      try {
        const created = await this.actor.createEmbeddedDocuments('Item', [{
          name: 'New Attack',
          type: 'weapon',
          system: {}
        }]);
        if (created?.[0]) created[0].sheet?.render(true);
      } catch (err) {
        console.error('Failed to create NPC weapon:', err);
        ui?.notifications?.error?.(`Could not add attack: ${err.message}`);
      }
    }, { signal });
  }






  _wireTabletWindowControlHitboxFallback(root, signal) {
    if (!(root instanceof HTMLElement)) return;

    const controlSelector = '[data-action="tablet-close"], [data-action="tablet-expand"], [data-action="tablet-minimize"], [data-action="tablet-home"]';
    const findControlAtPoint = (ev) => {
      const x = Number(ev.clientX);
      const y = Number(ev.clientY);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

      let best = null;
      let bestScore = Number.POSITIVE_INFINITY;
      const controls = Array.from(root.querySelectorAll(controlSelector))
        .filter((el) => el instanceof HTMLElement && el.offsetParent !== null);

      for (const control of controls) {
        const rect = control.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const padX = Math.max(16, Math.min(24, rect.width * 0.75));
        const padY = Math.max(14, Math.min(22, rect.height * 0.75));
        if (x < rect.left - padX || x > rect.right + padX || y < rect.top - padY || y > rect.bottom + padY) continue;
        const score = Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2));
        if (score < bestScore) {
          best = control;
          bestScore = score;
        }
      }
      return best;
    };

    root.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      const target = ev.target instanceof Element ? ev.target : null;
      if (target?.closest?.('button.swse-tablet-control')) return;
      const control = findControlAtPoint(ev);
      if (!control) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      control.click();
    }, { signal, capture: true });
  }

  _shieldTabletWindowControls(root, signal) {
    const controls = root?.querySelectorAll?.('[data-shell-window-control], [data-no-drag="true"], .swse-tablet-no-drag, .swse-tablet-hardware-rail, .swse-tablet-top-right-rail') || [];
    controls.forEach((control) => {
      const stopWindowDrag = (ev) => {
        ev.stopPropagation();
      };
      control.addEventListener('pointerdown', stopWindowDrag, { signal, capture: true });
      control.addEventListener('mousedown', stopWindowDrag, { signal, capture: true });
      control.addEventListener('dblclick', stopWindowDrag, { signal, capture: true });
      control.addEventListener('dragstart', stopWindowDrag, { signal, capture: true });
    });
  }

  async _minimizeTabletWindow() {
    try {
      if (typeof this.minimize === 'function') {
        await this.minimize();
        return;
      }
      const appRoot = this.element?.closest?.('.application') || this.element;
      const nativeMinimize = appRoot?.querySelector?.('[data-action="minimize"], .window-header .header-button.minimize');
      if (nativeMinimize) nativeMinimize.click();
    } catch (err) {
      console.warn('[SWSENPCSheet] Failed to minimize datapad shell.', err);
    }
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
      const statblockAuthority = field.dataset?.npcStatblockAuthority === 'true' || isNpcStatblockAuthorityPath(field.name);
      if (!statblockAuthority && !isNpcSheetWritablePath(field.name)) return;

      const rawValue = field.matches('input[type="checkbox"]') ? field.checked : field.value;
      const update = {
        [field.name]: coerceSingleFieldValue(field.name, rawValue, field)
      };

      try {
        if (statblockAuthority) {
          await this._updateNpcStatblockAuthority(update, { fieldName: field.name });
          return;
        }
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


  async _updateNpcStatblockAuthority(update = {}, { fieldName = '' } = {}) {
    const flat = { ...(update ?? {}) };
    if (!Object.keys(flat).length) return;

    const mirror = {};
    for (const [path, value] of Object.entries(flat)) {
      if (path === 'name') mirror['system.npcStatblock.core.name'] = value;
      if (path === 'img') mirror['system.npcStatblock.core.img'] = value;
      if (path === 'system.hp.value') mirror['system.npcStatblock.core.hpCurrent'] = value;
      if (path === 'system.hp.max') mirror['system.npcStatblock.core.hpMax'] = value;
      if (path === 'system.baseAttackBonus' || path === 'system.bab') mirror['system.npcStatblock.core.bab'] = value;
      if (path === 'system.damageThreshold') mirror['system.npcStatblock.core.dt'] = value;
      if (path === 'system.speed') mirror['system.npcStatblock.core.speed'] = value;
      if (path === 'system.challengeLevel' || path === 'system.cl') mirror['system.npcStatblock.core.cl'] = value;
      if (path === 'system.level') mirror['system.npcStatblock.core.level'] = value;
    }

    await this.actor.update({ ...flat, ...mirror }, {
      render: false,
      diff: true,
      swse: {
        source: 'npc-statblock-authority-edit',
        fieldName
      }
    });
    this.render(false);
  }

  _parseNpcSheetSignedNumber(value) {
    const match = String(value ?? '').match(/[+-]?\d+/);
    if (!match) return null;
    const n = Number(match[0]);
    return Number.isFinite(n) ? n : null;
  }

  _normalizeNpcSheetDiceFormula(value) {
    const formula = String(value ?? '')
      .trim()
      .replace(/[–—−]/g, '-')
      .replace(/×/g, '*')
      .replace(/\s+/g, '');
    if (!formula || !/\d+d\d+/i.test(formula)) return '';
    if (!/^[0-9dD+\-*/().]+$/.test(formula)) return '';
    return formula;
  }

  async _rollNpcSheetFlatFormula(formula, { title = 'NPC Roll', kind = 'npc-roll', sourceElement = null } = {}) {
    const rollData = this.actor?.getRollData?.() ?? {};
    const roll = await new Roll(formula, rollData).evaluate({ async: true });
    await SWSEChat.postRoll({
      roll,
      actor: this.actor,
      flavor: title,
      context: {
        kind,
        title,
        sourceElement,
        companionSource: sourceElement
      },
      flags: {
        swse: {
          source: kind,
          actorId: this.actor?.id ?? null
        }
      }
    });
    return roll;
  }

  _resolveNpcCombatActionData(actionId, element = null) {
    const key = String(actionId || '');
    const fromSheet = this._npcCombatActionLookup?.[key] ?? null;
    const row = element?.closest?.('[data-action-key], .swse-npc-combat-action-row');
    const fromDataset = row ? {
      key,
      name: row.querySelector?.('.swse-npc-combat-action-row__title')?.textContent?.trim?.() || key,
      actionType: row.dataset.actionType || element?.dataset?.actionType || 'standard',
      type: row.dataset.actionType || element?.dataset?.actionType || 'standard',
      description: row.querySelector?.('.swse-npc-combat-action-row__description')?.textContent?.trim?.() || ''
    } : null;
    return { ...(fromDataset || {}), ...(fromSheet || {}) };
  }

  _normalizeNpcActionEconomyType(value) {
    return normalizeActionEconomyType(value);
  }

  async _applyNpcActionEconomy(actionType, metadata = {}) {
    if (!game?.combat) return true;
    const combatant = game.combat.combatants?.find?.(c => c.actor?.id === this.actor?.id);
    if (!combatant) return true;

    try {
      const { ActionEconomyPersistence } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js');
      const { ActionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine-v2.js');
      const combatId = game.combat.id;
      const turnState = ActionEconomyPersistence.getTurnState?.(this.actor, combatId) ?? {};
      const costForType = (type) => {
        const normalized = normalizeActionEconomyType(type);
        if (normalized === 'full-round') return { fullRound: true };
        if (normalized === 'move') return { move: 1 };
        if (normalized === 'swift') return { swift: 1 };
        if (normalized === 'free' || normalized === 'reaction' || normalized === 'passive') return {};
        return { standard: 1 };
      };

      let nextState = null;
      if (typeof ActionEngine.consumeAction === 'function') {
        const result = await ActionEngine.consumeAction(turnState, { actionType, metadata, cost: costForType(actionType) });
        if (result === false || result?.allowed === false || result?.permitted === false) return false;
        nextState = result?.turnState ?? result?.updatedTurnState ?? result;
      } else if (typeof ActionEngine.consume === 'function') {
        const result = ActionEngine.consume(turnState, costForType(actionType));
        if (result === false || result?.allowed === false || result?.permitted === false) return false;
        nextState = result?.turnState ?? result;
      }

      if (nextState && typeof ActionEconomyPersistence.setTurnState === 'function') {
        await ActionEconomyPersistence.setTurnState(this.actor, combatId, nextState);
      } else if (nextState && typeof ActionEconomyPersistence.saveTurnState === 'function') {
        await ActionEconomyPersistence.saveTurnState(this.actor, combatId, nextState);
      }
    } catch (err) {
      console.warn('[SWSE] NPC action economy update failed; continuing without spend.', err);
    }
    return true;
  }

  async _runNpcCombatAction(actionId, actionData = {}, options = {}) {
    const actionType = normalizeActionEconomyType(actionData?.actionType ?? actionData?.type ?? 'standard');
    const permitted = await this._applyNpcActionEconomy(actionType, {
      source: 'npc-combat-action',
      actionId,
      actionName: actionData?.name || actionId
    });
    if (!permitted) {
      ui?.notifications?.warn?.('That action is not available this turn.');
      return null;
    }

    if (typeof this.actor.useAction === 'function') {
      return await this.actor.useAction(actionId, { actionData, ...options });
    }

    const safeName = foundry.utils.escapeHTML(actionData?.name || actionId || 'Combat Action');
    const safeType = foundry.utils.escapeHTML(economyLabel(actionType));
    const safeDescription = foundry.utils.escapeHTML(actionData?.description || 'Resolve this action using its listed SWSE rules.');
    await SWSEChat.postHTML({
      actor: this.actor,
      content: `<div class="swse-ability-chat-card"><h3>${safeName}</h3><p><strong>Action:</strong> ${safeType}</p><p>${safeDescription}</p></div>`
    });
    return null;
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
          showRollCompanion: true,
          showDialog: true
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
    const { statblock, governed } = splitNpcSheetUpdate(allowedFlat);

    if (Object.keys(allowedFlat).length === 0) {return;}

    try {
      if (Object.keys(statblock).length) {
        await this._updateNpcStatblockAuthority(statblock, { fieldName: 'form-submit' });
      }
      if (Object.keys(governed).length) {
        const expanded = foundry.utils.expandObject(governed);
        const quiet = isQuietNpcSheetUpdate(governed);
        await ActorEngine.updateActor(this.actor, expanded, {
          source: quiet ? 'npc-sheet-form-submit-quiet' : 'npc-sheet-form-submit',
          render: quiet ? false : undefined,
          suppressAppRefresh: quiet
        });
      }
    } catch (err) {
      console.error('Sheet submission failed:', err);
      ui.notifications.error(`Failed to update actor: ${err.message}`);
    }
  }
}
