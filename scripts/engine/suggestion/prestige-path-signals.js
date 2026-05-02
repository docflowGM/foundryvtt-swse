import { PRESTIGE_PREREQUISITES } from "/systems/foundryvtt-swse/scripts/data/prestige-prerequisites.js";

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function buildCatalog() {
  const skillToPrestige = new Map();
  const featToPrestige = new Map();
  const treeToPrestige = new Map();

  for (const [prestigeName, prereq] of Object.entries(PRESTIGE_PREREQUISITES || {})) {
    const prestigeSlug = slugify(prestigeName);

    for (const skill of prereq.skills || []) {
      const key = normalizeText(skill);
      if (!skillToPrestige.has(key)) skillToPrestige.set(key, new Set());
      skillToPrestige.get(key).add(prestigeSlug);
    }

    for (const feat of prereq.feats || []) {
      const key = normalizeText(feat);
      if (!featToPrestige.has(key)) featToPrestige.set(key, new Set());
      featToPrestige.get(key).add(prestigeSlug);
    }

    for (const tree of prereq.talents?.trees || []) {
      const key = normalizeText(tree);
      if (!treeToPrestige.has(key)) treeToPrestige.set(key, new Set());
      treeToPrestige.get(key).add(prestigeSlug);
    }
  }

  return { skillToPrestige, featToPrestige, treeToPrestige };
}

const CATALOG = buildCatalog();

function toTags(prestigeSet) {
  return Array.from(prestigeSet || []).map((slug) => `Prereq_${slug}`);
}

export function getPrestigeSignalCatalog() {
  return CATALOG;
}

export function getSkillPrestigeTags(skillName) {
  return toTags(CATALOG.skillToPrestige.get(normalizeText(skillName)));
}

export function getFeatPrestigeTags(featName) {
  return toTags(CATALOG.featToPrestige.get(normalizeText(featName)));
}

export function getTalentTreePrestigeTags(treeName) {
  return toTags(CATALOG.treeToPrestige.get(normalizeText(treeName)));
}

export function getPrestigeTargets(buildIntent = {}) {
  const targets = new Set();

  if (typeof buildIntent.primaryPrestige === 'string' && buildIntent.primaryPrestige) {
    targets.add(slugify(buildIntent.primaryPrestige));
  }

  for (const affinity of buildIntent.prestigeAffinities || []) {
    if (affinity?.className) targets.add(slugify(affinity.className));
  }

  const mentorBiases = buildIntent.mentorBiases || {};
  const weights = {
    ...(mentorBiases.prestigeClassWeights || {}),
    ...(mentorBiases.prestigePrereqWeights || {})
  };
  for (const [key, value] of Object.entries(weights)) {
    if (Number(value) > 0) targets.add(slugify(key));
  }

  if (mentorBiases.prestigeClassTarget) {
    targets.add(slugify(mentorBiases.prestigeClassTarget));
  }

  return Array.from(targets);
}

export function countPrestigeTagMatches(tags = [], buildIntent = {}) {
  const targets = new Set(getPrestigeTargets(buildIntent));
  if (!targets.size) return 0;
  let count = 0;
  for (const tag of tags) {
    const m = /^Prereq_(.+)$/.exec(String(tag || ''));
    if (m && targets.has(m[1])) count += 1;
  }
  return count;
}

export function getMissingPrestigeSkills(actor, buildIntent = {}) {
  const targets = getPrestigeTargets(buildIntent);
  const trained = new Set(
    Object.entries(actor?.system?.skills || {})
      .filter(([, data]) => data === true || data?.trained === true)
      .map(([key, data]) => normalizeText(data?.label || data?.name || key))
  );

  const missing = [];
  for (const prestigeSlug of targets) {
    const prestigeEntry = Object.entries(PRESTIGE_PREREQUISITES || {}).find(([name]) => slugify(name) === prestigeSlug);
    if (!prestigeEntry) continue;
    const [prestigeName, prereq] = prestigeEntry;
    for (const skill of prereq.skills || []) {
      if (!trained.has(normalizeText(skill))) {
        missing.push({ prestige: prestigeName, skill, prestigeSlug });
      }
    }
  }
  return missing;
}
