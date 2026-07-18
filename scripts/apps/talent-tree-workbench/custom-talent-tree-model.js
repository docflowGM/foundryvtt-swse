import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';

/**
 * Custom Talent Tree Model
 *
 * Phase 1 data/model seam for actor-scoped custom talent trees. This is an
 * adapter layer only; progression integration comes later through TalentTreeDB
 * and membership authority overlays.
 */

export const CUSTOM_TALENT_TREE_MIRROR_PATHS = Object.freeze([
  'system.customTalentTrees',
  'system.progression.customTalentTrees',
  'flags.foundryvtt-swse.customTalentTrees',
  'flags.swse.customTalentTrees'
]);

export function slugifyCustomTalentTree(value = '') {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return Array.from(value);
  return [value];
}

function unique(values = []) {
  return Array.from(new Set(values.map(value => String(value ?? '').trim()).filter(Boolean)));
}

function firstText(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

export function getActorCustomTalentTrees(actor) {
  const sources = [
    actor?.system?.customTalentTrees,
    actor?.system?.progression?.customTalentTrees,
    actor?.flags?.['foundryvtt-swse']?.customTalentTrees,
    actor?.flags?.swse?.customTalentTrees
  ];
  const out = [];
  const seen = new Set();

  for (const source of sources) {
    for (const entry of asArray(source)) {
      if (!entry || typeof entry !== 'object') continue;
      const id = slugifyCustomTalentTree(entry.id || entry.key || entry.value || entry.name);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(normalizeCustomTalentTree({ ...entry, id }));
    }
  }

  return out.sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));
}

export function getCustomTalentTree(actor, treeId) {
  const id = slugifyCustomTalentTree(treeId);
  return getActorCustomTalentTrees(actor).find(tree => tree.id === id || tree.value === `custom-tree:${id}`) || null;
}

export function normalizeCustomTalentTree(tree = {}) {
  const id = slugifyCustomTalentTree(tree.id || tree.key || tree.value || tree.name || 'custom-talent-tree');
  const name = firstText(tree.name, tree.label, id.replace(/-/g, ' '));
  const grantedByTraditions = unique([
    ...asArray(tree.grantedByTraditions),
    ...asArray(tree.grantedByTradition),
    ...asArray(tree.traditionId)
  ]);
  const nodes = asArray(tree.nodes)
    .filter(node => node && typeof node === 'object')
    .map(node => ({
      nodeId: slugifyCustomTalentTree(node.nodeId || node.talentId || node.id || node.name),
      talentId: node.talentId || node.id || node.nodeId || null,
      name: firstText(node.name, node.label, node.talentId, node.id),
      sourceType: node.sourceType || 'custom',
      uuid: node.uuid || null,
      importMode: node.importMode || 'custom',
      prerequisites: asArray(node.prerequisites).map(String),
      x: node.x ?? null,
      y: node.y ?? null,
      customTalent: node.customTalent || null
    }))
    .filter(node => node.nodeId && node.name);

  const edges = asArray(tree.edges)
    .filter(edge => edge && typeof edge === 'object' && edge.from && edge.to)
    .map(edge => ({ from: String(edge.from), to: String(edge.to), type: edge.type || 'prerequisite' }));

  return {
    id,
    value: `custom-tree:${id}`,
    key: id,
    name,
    label: name,
    description: String(tree.description || tree.summary || '').trim(),
    source: 'custom',
    treeType: tree.treeType || 'force-tradition',
    grantedByTraditions,
    grantedByClasses: unique(asArray(tree.grantedByClasses)),
    grantedBySpecies: unique(asArray(tree.grantedBySpecies)),
    manualGrant: tree.manualGrant === true,
    gmApproved: tree.gmApproved !== false,
    active: tree.active !== false,
    nodes,
    edges,
    talentIds: unique([...asArray(tree.talentIds), ...nodes.map(node => node.talentId || node.nodeId)]),
    talentNames: unique([...asArray(tree.talentNames), ...nodes.map(node => node.name)]),
    talentCount: nodes.length || Number(tree.talentCount || 0),
    createdAt: Number(tree.createdAt || Date.now()),
    updatedAt: Number(tree.updatedAt || Date.now())
  };
}

export function createBlankCustomTalentTree({ name = '', description = '', treeType = 'force-tradition', attachToTradition = '' } = {}) {
  const id = slugifyCustomTalentTree(name || 'new-custom-talent-tree');
  return normalizeCustomTalentTree({
    id,
    name: name || 'New Custom Talent Tree',
    description,
    treeType,
    grantedByTraditions: attachToTradition ? [attachToTradition] : [],
    nodes: [],
    edges: [],
    gmApproved: true,
    active: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
}

export async function saveCustomTalentTree(actor, tree, { source = 'custom-talent-tree-workbench' } = {}) {
  if (!actor?.isOwner) {
    ui?.notifications?.warn?.('You do not have permission to edit this actor.');
    return null;
  }

  const normalized = normalizeCustomTalentTree({ ...tree, updatedAt: Date.now() });
  const existing = getActorCustomTalentTrees(actor).filter(entry => entry.id !== normalized.id);
  const customTalentTrees = [...existing, normalized].sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));
  const update = Object.fromEntries(CUSTOM_TALENT_TREE_MIRROR_PATHS.map(path => [path, customTalentTrees]));

  await ActorEngine.updateActor(actor, update, {
    meta: { guardKey: `custom-talent-tree-${normalized.id}` },
    source
  });

  return normalized;
}
