/**
 * Talent Tree Authority - Phase 2
 *
 * Derived talent tree authority model.
 * Single authoritative function for tree access control.
 * No persistence - all authority derived from actor state.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { TalentTreeDB } from "/systems/foundryvtt-swse/scripts/data/talent-tree-db.js";
import { resolveClassModel, getClassTalentTreeLookupKeys } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/class-resolution.js";

const FORCE_GENERIC_TREE_KEYS = [
  'alter',
  'control',
  'dark-side',
  'sense',
  'light-side',
  'guardian-spirit',
];

const FORCE_TRADITION_TREE_RULES = [
  ['jensaarai-defender', ['the jensaarai', 'jensaarai']],
  ['dathomiri-witch', ['the witches of dathomir', 'witches of dathomir', 'dathomiri witch']],
  ['jal-shey', ['the jal shey', 'jal shey']],
  ['keetael', ['the keetael', 'keetael']],
  ['krath', ['the krath', 'krath']],
  ['luka-sene', ['the luka sene', 'luka sene']],
  ['order-of-shasa', ['the order of shasa', 'order of shasa']],
  ['agent-of-ossus', ['the agents of ossus', 'agents of ossus', 'agent of ossus']],
  ['felucian-shaman', ['the felucian shamans', 'felucian shamans', 'felucian shaman']],
  ['bando-gora-captain', ['the bando gora', 'bando gora']],
  ['believer-disciple', ['the believers', 'believers', 'believer']],
  ['korunnai-adept', ['the korunnai', 'korunnai']],
  ['disciple-of-twilight', ['the disciples of twilight', 'disciples of twilight', 'disciple of twilight']],
  ['ember-of-vahl', ['the ember of vahl', 'ember of vahl']],
  ['aing-tii-monk', ['the aing tii monks', 'aing tii monks', 'aing tii', 'aingtii monk']],
  ['baran-do-sage', ['the baran do sages', 'baran do sages', 'baran do']],
  ['iron-knight', ['the iron knights', 'iron knights', 'iron knight']],
  ['matukai-adept', ['the matukai', 'matukai']],
  ['seyugi-dervish', ['the seyugi dervishes', 'seyugi dervishes', 'seyugi dervish']],
  ['shaper-of-kro-var', ['the shapers of kro var', 'shapers of kro var', 'shaper of kro var']],
  ['tyia-adept', ['the tyia', 'tyia']],
  ['warden-of-the-sky', ['the wardens of the sky', 'wardens of the sky', 'warden of the sky']],
  ['white-current-adept', ['the fallanassi', 'fallanassi', 'white current']],
  ['zeison-sha-warrior', ['the zeison sha', 'zeison sha']],
  ['kilian-ranger', ['the kilian rangers', 'kilian rangers', 'kilian ranger']],
  ['blazing-chain', ['the blazing chain', 'blazing chain']],
];

const ANY_FORCE_TREE_CLASSES = new Set(['force disciple', 'jedi master', 'sith lord']);

function normalizeAccessKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/^custom:/, '')
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeLabel(value) {
  return normalizeAccessKey(value).replace(/-/g, ' ').trim();
}

function unique(values) {
  return [...new Set((values || []).map(value => String(value || '').trim()).filter(Boolean))];
}

function uniqueObjects(values) {
  const seen = new Set();
  const out = [];
  for (const value of values || []) {
    if (!value) continue;
    const key = String(value._id || value.id || value.name || value.className || JSON.stringify(value)).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function collectValues(value, out = []) {
  if (!value) return out;
  if (Array.isArray(value)) {
    for (const item of value) collectValues(item, out);
    return out;
  }
  if (value instanceof Map) {
    for (const item of value.values()) collectValues(item, out);
    return out;
  }
  if (typeof value === 'object') {
    out.push(value.name, value.label, value.id, value.key, value.slug, value.value);
    collectValues(value.item, out);
    collectValues(value.feat, out);
    collectValues(value.document, out);
    return out;
  }
  out.push(value);
  return out;
}

function contextHasForceSensitivity(context = {}) {
  if (!context) return false;
  if (context.forceSensitive === true || context.hasForceSensitivity === true) return true;
  if (context.system?.progression?.forceSensitive === true || context.system?.forceSensitive === true) return true;

  const values = [];
  collectValues(context.selectedFeats, values);
  collectValues(context.feats, values);
  collectValues(context.pendingFeats, values);
  collectValues(context.committedFeats, values);
  collectValues(context.draftSelections?.feats, values);
  collectValues(context.selections?.feats, values);
  collectValues(context.pendingData?.feats, values);
  collectValues(context.pendingData?.selectedFeats, values);

  return values.some(value => /force\s+sensitivity/i.test(String(value || '')));
}

function getTreeKeys(tree) {
  return [tree?.id, tree?.sourceId, tree?.key, tree?.name, tree?.displayName]
    .map(normalizeAccessKey)
    .filter(Boolean);
}

function resolveTalentTreeKeys(canonicalKeys = []) {
  const wanted = new Set(canonicalKeys.map(normalizeAccessKey).filter(Boolean));
  const keys = [];

  for (const tree of TalentTreeDB.all?.() || []) {
    const treeKeys = getTreeKeys(tree);
    if (!treeKeys.some(key => wanted.has(key))) continue;
    keys.push(tree.id, tree.sourceId, tree.name, tree.key);
  }

  return unique(keys);
}

export function actorHasForceSensitivity(actor, context = {}) {
  if (contextHasForceSensitivity(context)) return true;
  if (!actor) return false;

  const domains = actor.system?.progression?.unlockedDomains || [];
  if (Array.isArray(domains) && domains.includes('force')) return true;
  if (actor.system?.progression?.forceSensitive === true) return true;
  if (actor.system?.forceSensitive === true) return true;

  const items = actor.items?.contents || actor.items || [];
  const itemList = Array.isArray(items) ? items : Array.from(items || []);
  return itemList.some(item => item?.type === 'feat' && /force\s+sensitivity/i.test(item?.name || ''));
}

function addForceTraditionValue(value, values = []) {
  if (!value) return values;
  if (Array.isArray(value) || value instanceof Set) {
    for (const entry of value) addForceTraditionValue(entry, values);
    return values;
  }
  if (value && typeof value === 'object') {
    values.push(value.value, value.name, value.label, value.id, value.key, value.tradition);
    return values;
  }
  values.push(value);
  return values;
}

export function getActorCustomForceTraditions(actor) {
  const out = [];
  const seen = new Set();
  const sources = [
    actor?.system?.customForceTraditions,
    actor?.system?.progression?.customForceTraditions,
    actor?.flags?.['foundryvtt-swse']?.customForceTraditions,
    actor?.flags?.swse?.customForceTraditions,
  ];

  for (const source of sources) {
    for (const entry of Array.isArray(source) ? source : source ? [source] : []) {
      if (!entry || typeof entry !== 'object') continue;
      const id = normalizeAccessKey(entry.id || entry.key || entry.value || entry.name);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push({ ...entry, id, value: entry.value || `custom:${id}` });
    }
  }

  return out;
}

export function getActorForceTraditions(actor) {
  const values = [];
  addForceTraditionValue(actor?.system?.forceTradition, values);
  addForceTraditionValue(actor?.system?.forceTraditions, values);
  addForceTraditionValue(actor?.system?.progression?.forceTradition, values);
  addForceTraditionValue(actor?.system?.progression?.forceTraditions, values);
  addForceTraditionValue(actor?.system?.progression?.adoptedForceTraditions, values);
  addForceTraditionValue(actor?.system?.traditions, values);
  addForceTraditionValue(actor?.flags?.['foundryvtt-swse']?.forceTradition, values);
  addForceTraditionValue(actor?.flags?.['foundryvtt-swse']?.forceTraditions, values);
  addForceTraditionValue(actor?.flags?.['foundryvtt-swse']?.adoptedForceTraditions, values);
  addForceTraditionValue(actor?.flags?.swse?.forceTradition, values);
  addForceTraditionValue(actor?.flags?.swse?.forceTraditions, values);
  addForceTraditionValue(actor?.flags?.swse?.adoptedForceTraditions, values);
  for (const custom of getActorCustomForceTraditions(actor)) {
    addForceTraditionValue([custom.value, custom.name, custom.label], values);
  }

  return unique(values.map(normalizeLabel).filter(Boolean));
}

function getForceTraditionTreeKeys(actor) {
  const traditions = new Set(getActorForceTraditions(actor));
  if (!traditions.size) return [];

  const treeKeys = [];
  for (const [treeKey, aliases] of FORCE_TRADITION_TREE_RULES) {
    const allowed = aliases.map(normalizeLabel).some(alias => traditions.has(alias));
    if (allowed) treeKeys.push(treeKey);
  }

  return resolveTalentTreeKeys(treeKeys);
}

function getCustomForceTraditionTreeKeys(actor) {
  const memberships = new Set(getActorForceTraditions(actor).map(normalizeAccessKey));
  const treeKeys = [];
  for (const tradition of getActorCustomForceTraditions(actor)) {
    if (tradition.gmApproved === false || tradition.active === false) continue;
    const customKeys = [tradition.value, tradition.id, tradition.name, tradition.label].map(normalizeAccessKey).filter(Boolean);
    const isMembership = customKeys.some(key => memberships.has(key));
    if (!isMembership && tradition.adopted !== true && tradition.primary !== true) continue;
    const granted = Array.isArray(tradition.grantedTalentTrees) ? tradition.grantedTalentTrees : [];
    treeKeys.push(...granted);
  }
  return resolveTalentTreeKeys(treeKeys);
}

export function getForceTalentTreeAccessKeys(actor, { includeGeneric = true, includeTraditions = true } = {}) {
  const keys = [];
  if (includeGeneric) keys.push(...resolveTalentTreeKeys(FORCE_GENERIC_TREE_KEYS));
  if (includeTraditions) {
    keys.push(...getForceTraditionTreeKeys(actor));
    keys.push(...getCustomForceTraditionTreeKeys(actor));
  }
  return unique(keys);
}

function classGrantsAnyForceTreeAccess(classDoc) {
  const model = resolveClassModel(classDoc) || classDoc || {};
  const className = normalizeLabel(model.name || model.className || model.system?.class_name || classDoc?.name || '');
  return ANY_FORCE_TREE_CLASSES.has(className);
}

/**
 * Get allowed talent trees for a given slot
 * CANONICAL: Single source of truth for tree access
 *
 * @param {Object} actor - Actor document
 * @param {Object} slot - TalentSlot object {slotType, classId, ...}
 * @returns {Array<string>} Array of allowed tree IDs
 */
export function getAllowedTalentTrees(actor, slot) {
  if (!actor || !slot) {
    return [];
  }

  const allowedTrees = [];

  const normalizeAccessKeys = (classDoc) => {
    const model = resolveClassModel(classDoc) || classDoc || {};
    const lookup = getClassTalentTreeLookupKeys(model) || {};
    return [
      ...(lookup.treeIds || []),
      ...(lookup.treeNames || []),
      ...(model.talentTreeIds || []),
      ...(model.talentTreeSourceIds || []),
      ...(model.talentTreeNames || []),
      ...(model.system?.talent_trees || []),
      ...(model.system?.talentTrees || []),
      ...(model.system?.talentTreeIds || []),
    ].filter(Boolean);
  };

  const selectedClassDocs = uniqueObjects([
    slot.classModel,
    slot.class,
    slot.selectedClass,
    slot.classDoc,
    slot.pendingData?.classModel,
    slot.pendingData?.selectedClass,
    slot.pendingData?.class,
  ]);

  const ownedClassDocs = uniqueObjects([
    ...selectedClassDocs,
    ...(Array.isArray(actor.system?.classes) ? actor.system.classes : []),
    ...(actor.items?.filter?.(item => item?.type === 'class') || []),
  ]);

  // Rule 1: Class slots restrict to the selected/owning class's access list.
  if (slot.slotType === "class") {
    const selectedClass = slot.classModel || slot.class || slot.selectedClass || null;
    const classDoc = selectedClass || ownedClassDocs.find(c =>
      c?._id === slot.classId || c?.id === slot.classId || c?.system?.id === slot.classId
    );
    const keys = normalizeAccessKeys(classDoc);

    if (classGrantsAnyForceTreeAccess(classDoc) && actorHasForceSensitivity(actor, slot)) {
      keys.push(...getForceTalentTreeAccessKeys(actor, { includeGeneric: true, includeTraditions: true }));
    }

    SWSELogger.log(
      `[TreeAuthority] Class slot: ${keys.length} tree access keys for ${classDoc?.name || slot.classId || 'selected class'}`
    );
    return unique(keys);
  }

  // Rule 2: Heroic slots can access multiple tree categories derived from classes/domains.
  if (slot.slotType === "heroic") {
    for (const classDoc of ownedClassDocs) {
      const keys = normalizeAccessKeys(classDoc);
      if (keys.length) {
        allowedTrees.push(...keys);
        SWSELogger.log(
          `[TreeAuthority] Heroic slot: Added ${keys.length} tree access keys from class ${classDoc.name}`
        );
      }
    }

    if (actorHasForceSensitivity(actor, slot)) {
      const forceTreeKeys = getForceTalentTreeAccessKeys(actor, { includeGeneric: true, includeTraditions: true });
      if (forceTreeKeys.length) {
        allowedTrees.push(...forceTreeKeys);
        SWSELogger.log(
          `[TreeAuthority] Heroic slot: Added ${forceTreeKeys.length} Force trees from Force Sensitivity/tradition access`
        );
      }
    }

    const deduplicated = unique(allowedTrees);
    SWSELogger.log(
      `[TreeAuthority] Heroic slot: Total ${deduplicated.length} allowed trees`
    );
    return deduplicated;
  }

  SWSELogger.warn(
    `[TreeAuthority] Unknown slot type: ${slot.slotType}. Denying access.`
  );
  return [];
}

/**
 * Check if a talent tree is accessible for a given slot
 * @param {Object} actor - Actor document
 * @param {Object} slot - TalentSlot object
 * @param {string} treeId - Tree ID to check
 * @returns {boolean} True if tree is allowed
 */
export function isTreeAccessible(actor, slot, treeId) {
  const allowed = getAllowedTalentTrees(actor, slot).map(normalizeAccessKey);
  return allowed.includes(normalizeAccessKey(treeId));
}

export default {
  getAllowedTalentTrees,
  getForceTalentTreeAccessKeys,
  actorHasForceSensitivity,
  getActorForceTraditions,
  getActorCustomForceTraditions,
  isTreeAccessible
};
