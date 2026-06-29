// scripts/sheets/v2/npc/npc-sheet-helpers.js
// Active NPC helper utilities extracted from the retired SWSEV2NpcSheet shell.
// Consumed by SWSEV2CharacterSheet (character-sheet.js) for NPC concept rendering.
import { AbilityCombatActionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/ability-combat-action-resolver.js";
import { CombatActionsMapper } from "/systems/foundryvtt-swse/scripts/combat/utils/combat-actions-mapper.js";
import { CombinedFeatActionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combined-feat-action-resolver.js";
import { getHeroicLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";

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

