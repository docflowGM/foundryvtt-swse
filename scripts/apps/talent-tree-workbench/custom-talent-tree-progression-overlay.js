import { TalentStep } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/talent-step.js';
import { TalentTreeDB } from '/systems/foundryvtt-swse/scripts/data/talent-tree-db.js';
import { TalentRegistry } from '/systems/foundryvtt-swse/scripts/registries/talent-registry.js';
import { getActorCustomTalentTrees, slugifyCustomTalentTree } from '/systems/foundryvtt-swse/scripts/apps/talent-tree-workbench/custom-talent-tree-model.js';

/**
 * Custom Talent Tree Progression Overlay
 *
 * Phase 5 adapter. It makes actor-scoped, GM-approved custom talent trees behave
 * like ordinary TalentStep tree entries without replacing TalentTreeDB,
 * TalentRegistry, or the progression graph renderer.
 */

const PATCH_FLAG = Symbol.for('swse.customTalentTreeProgressionOverlay.v1');

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return Array.from(value);
  return [value];
}

function unique(values = []) {
  return Array.from(new Set(values.map(value => String(value ?? '').trim()).filter(Boolean)));
}

function normalizeAccessKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/^custom-tree:/, '')
    .replace(/^custom:/, '')
    .replace(/&/g, ' and ')
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeLabel(value) {
  return normalizeAccessKey(value).replace(/-/g, ' ').trim();
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

function actorForceTraditionMembershipKeys(actor) {
  const values = [];
  addForceTraditionValue(actor?.system?.forceTradition, values);
  addForceTraditionValue(actor?.system?.forceTraditions, values);
  addForceTraditionValue(actor?.system?.progression?.forceTradition, values);
  addForceTraditionValue(actor?.system?.progression?.forceTraditions, values);
  addForceTraditionValue(actor?.system?.progression?.adoptedForceTraditions, values);
  addForceTraditionValue(actor?.flags?.['foundryvtt-swse']?.forceTradition, values);
  addForceTraditionValue(actor?.flags?.['foundryvtt-swse']?.forceTraditions, values);
  addForceTraditionValue(actor?.flags?.['foundryvtt-swse']?.adoptedForceTraditions, values);
  addForceTraditionValue(actor?.flags?.swse?.forceTradition, values);
  addForceTraditionValue(actor?.flags?.swse?.forceTraditions, values);
  addForceTraditionValue(actor?.flags?.swse?.adoptedForceTraditions, values);

  const customTraditions = [
    actor?.system?.customForceTraditions,
    actor?.system?.progression?.customForceTraditions,
    actor?.flags?.['foundryvtt-swse']?.customForceTraditions,
    actor?.flags?.swse?.customForceTraditions,
  ];
  for (const source of customTraditions) {
    for (const entry of asArray(source)) {
      if (!entry || typeof entry !== 'object') continue;
      if (entry.gmApproved === false || entry.active === false || entry.approvalStatus === 'declined') continue;
      addForceTraditionValue([entry.value, entry.id, entry.name, entry.label], values);
    }
  }

  return new Set(values.flatMap(value => [normalizeAccessKey(value), normalizeLabel(value)]).filter(Boolean));
}

function isApprovedCustomTree(tree = {}) {
  return tree
    && tree.source === 'custom'
    && tree.active !== false
    && tree.gmApproved !== false
    && tree.approvalStatus !== 'pending'
    && tree.approvalStatus !== 'declined';
}

function actorCanAccessCustomTree(actor, tree = {}) {
  if (!actor || !isApprovedCustomTree(tree)) return false;
  const grants = unique([
    ...asArray(tree.grantedByTraditions),
    ...asArray(tree.traditionId),
  ]);

  // Actor-scoped generic/custom workbench trees with no grant container are
  // treated as manual actor-local grants after GM approval.
  if (tree.manualGrant === true || grants.length === 0 || tree.treeType === 'generic') return true;

  const memberships = actorForceTraditionMembershipKeys(actor);
  return grants.some(grant => memberships.has(normalizeAccessKey(grant)) || memberships.has(normalizeLabel(grant)));
}

function treeTypeToRole(treeType) {
  if (treeType === 'force-tradition') return 'force';
  if (treeType === 'class' || treeType === 'prestige-class') return 'class';
  if (treeType === 'species') return 'species';
  return 'custom';
}

function toProgressionTree(tree = {}, actor = null) {
  const id = slugifyCustomTalentTree(tree.id || tree.value || tree.name);
  const value = tree.value || `custom-tree:${id}`;
  const nodes = asArray(tree.nodes).filter(node => node && typeof node === 'object');
  const talentIds = unique(nodes.map(node => node.talentId || node.sourceTalentId || node.nodeId));
  const talentNames = unique(nodes.map(node => node.name));
  return {
    ...tree,
    id,
    sourceId: value,
    value,
    key: id,
    name: tree.name || id.replace(/-/g, ' '),
    displayName: tree.name || id.replace(/-/g, ' '),
    source: 'custom',
    custom: true,
    actorId: actor?.id || tree.actorId || null,
    role: tree.role || treeTypeToRole(tree.treeType),
    category: tree.category || 'custom',
    tags: unique(['custom', tree.treeType, tree.source, ...(asArray(tree.tags))]),
    talentIds,
    talentNames,
    talentCount: nodes.length,
    customNodes: nodes,
    system: {
      ...(tree.system || {}),
      treeId: id,
      talentTreeId: id,
      talent_tree: tree.name || id,
      talentIds,
      talentNames,
      customNodes: nodes,
    }
  };
}

export function getActorAccessibleCustomTalentTrees(actor) {
  if (!actor) return [];
  return getActorCustomTalentTrees(actor)
    .map(tree => toProgressionTree(tree, actor))
    .filter(tree => actorCanAccessCustomTree(actor, tree));
}

export function registerActorCustomTalentTreesForProgression(actor) {
  const trees = getActorAccessibleCustomTalentTrees(actor);
  for (const tree of trees) {
    const keys = unique([tree.id, tree.sourceId, tree.value, tree.key, tree.name, tree.displayName]);
    TalentTreeDB.trees?.set?.(tree.id, tree);
    TalentTreeDB._byId?.set?.(tree.id, tree);
    if (tree.sourceId) TalentTreeDB.sourceIndex?.set?.(tree.sourceId, tree);
    if (tree.key) TalentTreeDB._byKey?.set?.(tree.key, tree);
    for (const key of keys) TalentTreeDB._legacyIdMap?.set?.(key, tree);
    for (const talentRef of [...asArray(tree.talentIds), ...asArray(tree.talentNames)]) {
      const raw = String(talentRef || '').trim();
      if (!raw) continue;
      TalentTreeDB.talentToTree?.set?.(raw, tree.id);
      TalentTreeDB.talentToTree?.set?.(raw.toLowerCase(), tree.id);
      TalentTreeDB.talentToTree?.set?.(slugifyCustomTalentTree(raw), tree.id);
    }
  }
  return trees;
}

function talentEntryFromActorItem(item, tree = {}) {
  if (!item) return null;
  const system = item.system || {};
  const treeId = tree.id || tree.key || tree.name || 'custom';
  const treeName = tree.name || tree.displayName || treeId;
  return {
    id: item.id,
    _id: item.id,
    uuid: item.uuid || null,
    name: item.name || 'Custom Talent',
    type: item.type || 'talent',
    category: 'custom',
    tags: unique(['custom', 'custom-talent-tree', ...(asArray(system.tags))]),
    prerequisites: { raw: system.prerequisites || system.prerequisite || '' },
    description: system.benefit || system.description || '',
    treeId,
    treeName,
    treeKeys: unique([treeId, treeName, tree.value].map(normalizeAccessKey)),
    talentTree: treeId,
    source: system.source || 'Custom Talent Tree',
    pack: 'actor',
    system,
    img: item.img || 'icons/svg/aura.svg',
    actorId: item.actor?.id || item.parent?.id || tree.actorId || null,
    custom: true,
    document: item
  };
}

function pseudoTalentEntryFromNode(node, tree = {}) {
  if (!node) return null;
  const id = String(node.talentId || node.sourceTalentId || node.nodeId || node.name || '').trim();
  if (!id) return null;
  const system = {
    description: node.description || '',
    benefit: node.description || '',
    prerequisites: node.prerequisiteText || node.prerequisites?.join?.(', ') || '',
    tree: tree.name || tree.id || 'Custom',
    talentTree: tree.name || tree.id || 'Custom',
    talentTreeId: tree.id || null,
    customTreeId: tree.value || null,
    isCustom: node.sourceType === 'custom'
  };
  return {
    id,
    _id: id,
    uuid: node.uuid || null,
    name: node.name || id,
    type: 'talent',
    category: node.sourceType === 'custom' ? 'custom' : null,
    tags: unique([node.sourceType, 'custom-tree-node']),
    prerequisites: { raw: node.prerequisiteText || '' },
    description: node.description || '',
    treeId: tree.id || null,
    treeName: tree.name || null,
    treeKeys: unique([tree.id, tree.name, tree.value].map(normalizeAccessKey)),
    talentTree: tree.id || tree.name || null,
    source: node.sourceName || node.sourceTreeName || tree.name || 'Custom Talent Tree',
    pack: node.sourceType === 'official' ? 'reference' : 'actor',
    system,
    img: 'icons/svg/aura.svg',
    custom: node.sourceType === 'custom',
    node
  };
}

function resolveOfficialTalentNode(node = {}) {
  const candidates = [node.sourceTalentId, node.talentId, node.uuid, node.name].filter(Boolean);
  for (const candidate of candidates) {
    const talent = TalentRegistry.getById?.(candidate) || TalentRegistry.getByName?.(candidate);
    if (talent) return talent;
  }
  return null;
}

export function getCustomTalentTreeMembership(tree = {}, actor = null) {
  if (!tree?.custom && tree?.source !== 'custom') return [];
  const activeActor = actor || game?.actors?.get?.(tree.actorId) || null;
  const nodes = asArray(tree.customNodes || tree.nodes || tree.system?.customNodes);
  const out = [];
  const seen = new Set();

  for (const node of nodes) {
    let talent = null;
    if (node.sourceType === 'official') talent = resolveOfficialTalentNode(node);
    if (!talent && node.customTalent?.itemId && activeActor?.items?.get) {
      talent = talentEntryFromActorItem(activeActor.items.get(node.customTalent.itemId), tree);
    }
    if (!talent && node.talentId && activeActor?.items?.get) {
      talent = talentEntryFromActorItem(activeActor.items.get(node.talentId), tree);
    }
    if (!talent) talent = pseudoTalentEntryFromNode(node, tree);
    const key = String(talent?.id || talent?._id || talent?.name || '').trim();
    if (!key || seen.has(key)) continue;
    out.push(talent);
    seen.add(key);
  }

  return out;
}

function addUniqueTrees(base = [], extras = []) {
  const out = [...base];
  const seen = new Set(out.map(tree => String(tree?.id || tree?.sourceId || tree?.value || tree?.name || '').trim()).filter(Boolean));
  for (const tree of extras) {
    const key = String(tree?.id || tree?.sourceId || tree?.value || tree?.name || '').trim();
    if (!key || seen.has(key)) continue;
    out.push(tree);
    seen.add(key);
  }
  return out;
}

export function registerCustomTalentTreeProgressionOverlay() {
  if (globalThis[PATCH_FLAG]) return false;
  globalThis[PATCH_FLAG] = true;

  const originalOnStepEnter = TalentStep.prototype.onStepEnter;
  TalentStep.prototype.onStepEnter = async function customTreeOverlayOnStepEnter(shell) {
    try { registerActorCustomTalentTreesForProgression(shell?.actor); }
    catch (err) { console.warn('[SWSE] Custom talent tree overlay registration failed', err); }
    return originalOnStepEnter.call(this, shell);
  };

  const originalGetAvailableTrees = TalentStep.prototype._getAvailableTrees;
  TalentStep.prototype._getAvailableTrees = async function customTreeOverlayGetAvailableTrees(shell, sourceTrees = null) {
    const actor = shell?.actor || null;
    const customTrees = registerActorCustomTalentTreesForProgression(actor);
    const expandedSourceTrees = sourceTrees ? addUniqueTrees(sourceTrees, customTrees) : sourceTrees;
    const base = await originalGetAvailableTrees.call(this, shell, expandedSourceTrees);
    return addUniqueTrees(base, customTrees);
  };

  const originalGetTree = TalentStep.prototype._getTree;
  TalentStep.prototype._getTree = function customTreeOverlayGetTree(treeId) {
    return originalGetTree.call(this, treeId)
      || TalentTreeDB.get?.(treeId)
      || TalentTreeDB.trees?.get?.(normalizeAccessKey(treeId))
      || null;
  };

  const originalGetTalentsForTree = TalentStep.prototype._getTalentsForTree;
  TalentStep.prototype._getTalentsForTree = async function customTreeOverlayGetTalentsForTree(tree, actor) {
    if (tree?.custom || tree?.source === 'custom') {
      if (!TalentRegistry.isInitialized?.()) await TalentRegistry.initialize?.();
      return getCustomTalentTreeMembership(tree, actor);
    }
    return originalGetTalentsForTree.call(this, tree, actor);
  };

  globalThis.SWSE ??= {};
  globalThis.SWSE.customTalentTreeOverlay = {
    registerActorCustomTalentTreesForProgression,
    getActorAccessibleCustomTalentTrees,
    getCustomTalentTreeMembership
  };

  return true;
}

export default registerCustomTalentTreeProgressionOverlay;
