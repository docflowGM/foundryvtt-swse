import { ProgressionReconciliationReportBuilder } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/progression-reconciliation-report-builder.js';
import { TalentRegistry } from '/systems/foundryvtt-swse/scripts/registries/talent-registry.js';

const PATCH_ID = 'reconciliation-and-superior-skills-hotfix-v1';

const SUPERIOR_SKILLS_TALENTS = Object.freeze([
  ['b89d573dba9ddb20', 'Assured Skill'],
  ['5242623648114830', 'Critical Skill Success'],
  ['36fbab1a05c08fdd', 'Exceptional Skill'],
  ['f85bb79fe20de1ef', 'Reliable Boon'],
  ['1cbf8a40f7972aa4', 'Skill Boon'],
  ['07cd591fb8dccb39', 'Skill Confidence'],
  ['323cc243fef47675', 'Skillful Recovery'],
]);

function normalizeTreeKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeNameKey(value) {
  return String(value ?? '').toLowerCase().trim();
}

function syntheticSuperiorSkillsTalent(id, name) {
  return {
    id,
    _id: id,
    uuid: null,
    name,
    type: 'talent',
    category: 'superior skills',
    tags: ['skills', 'skill-mastery', 'superior-skills', 'synthetic-registry'],
    prerequisites: { raw: null },
    description: '',
    treeId: 'superior_skills',
    treeName: 'Superior Skills',
    treeKeys: ['superior-skills', 'superior_skills', '04a6f32128cc4b98'],
    talentTree: 'Superior Skills',
    source: 'Unknown Regions',
    pack: 'synthetic:talent-tree-membership',
    system: {
      talent_tree: 'Superior Skills',
      talentTree: 'Superior Skills',
      treeId: 'superior_skills',
      tags: ['skills', 'skill-mastery', 'superior-skills'],
      syntheticRegistryEntry: true,
    },
  };
}

function indexTalent(entry) {
  const registry = TalentRegistry;
  if (!registry?._entries || !registry?._byId || !registry?._byName) return;
  if (registry._byId.has(entry.id) || registry._byName.has(normalizeNameKey(entry.name))) return;

  registry._entries.push(entry);
  registry._byId.set(entry.id, entry);
  registry._byName.set(normalizeNameKey(entry.name), entry);

  if (!registry._byCategory.has(entry.category)) registry._byCategory.set(entry.category, []);
  registry._byCategory.get(entry.category).push(entry);

  for (const tag of entry.tags || []) {
    if (!registry._byTag.has(tag)) registry._byTag.set(tag, []);
    registry._byTag.get(tag).push(entry);
  }

  for (const key of entry.treeKeys || []) {
    const normalized = normalizeTreeKey(key);
    if (!normalized) continue;
    if (!registry._byTree.has(normalized)) registry._byTree.set(normalized, []);
    registry._byTree.get(normalized).push(entry);
  }
}

function ensureSuperiorSkillsTalents() {
  for (const [id, name] of SUPERIOR_SKILLS_TALENTS) {
    const existing = TalentRegistry.getById?.(id) || TalentRegistry.getByName?.(name);
    if (existing) {
      if (Array.isArray(existing.treeKeys) && !existing.treeKeys.includes('superior-skills')) {
        existing.treeKeys.push('superior-skills');
      }
      continue;
    }
    indexTalent(syntheticSuperiorSkillsTalent(id, name));
  }
}

function registerReconcilerRemediationPatch() {
  const proto = ProgressionReconciliationReportBuilder?.prototype;
  if (!proto || proto.__swseRemediationActionsPatch === PATCH_ID) return;

  if (typeof proto._attachRemediationActions !== 'function') {
    proto._attachRemediationActions = function attachRemediationActions(slots = {}) {
      for (const value of Object.values(slots || {})) {
        if (Array.isArray(value)) {
          for (const slot of value) this._attachSlotRemediation?.(slot);
        }
      }
    };
  }

  proto.__swseRemediationActionsPatch = PATCH_ID;
}

function registerSuperiorSkillsRegistryPatch() {
  if (!TalentRegistry || TalentRegistry.__swseSuperiorSkillsPatch === PATCH_ID) return;

  const originalInitialize = TalentRegistry.initialize?.bind(TalentRegistry);
  if (typeof originalInitialize === 'function') {
    TalentRegistry.initialize = async function patchedTalentRegistryInitialize(...args) {
      await originalInitialize(...args);
      ensureSuperiorSkillsTalents();
    };
  }

  if (TalentRegistry.isInitialized?.()) ensureSuperiorSkillsTalents();
  TalentRegistry.__swseSuperiorSkillsPatch = PATCH_ID;
}

export function registerReconciliationAndSuperiorSkillsHotfix() {
  registerReconcilerRemediationPatch();
  registerSuperiorSkillsRegistryPatch();
}

registerReconciliationAndSuperiorSkillsHotfix();

export default registerReconciliationAndSuperiorSkillsHotfix;
