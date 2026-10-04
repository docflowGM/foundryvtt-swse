/**
 * Offline exact-reference authorities for the archetype SSOT (Phase 12A).
 *
 * Builds `{ has(ref) }` indexes straight from the repository's canonical
 * authority files so tooling and tests can validate data/archetypes.json under
 * plain Node. It reads existing authorities; it does not copy them:
 *   classes/skills/species -> packs/*.db        (same data the registries load)
 *   talent trees           -> data/audits/talent-canonical-tree-registry.json
 *   talents                -> data/canonical/talents.json (canonicalIdentity)
 *   feats                  -> data/audits/feat-phase-1a-canonical-identity-manifest.json
 *   Force powers           -> data/force-powers.json + data/lightsaber-form-powers.json
 *                             (form powers use the ForceRegistry power-name slug)
 *   backgrounds            -> data/backgrounds.json
 *   ontology               -> data/audits/talent-feat-phase3-final-ontology.json
 * Matching is exact; there is no fuzzy resolution.
 */
import fs from 'node:fs';
import path from 'node:path';

const readJson = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readDb = (root, rel) =>
  fs.readFileSync(path.join(root, rel), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

const slugUnderscore = (s) =>
  String(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

// Same normalizer as ForceRegistry.normalizeForcePowerAssetSlug (form-power identity).
const forceSlug = (s) =>
  String(s || '').trim().toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const camelKey = (name) => {
  const words = String(name).replace(/[’']/g, '').split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w.toLowerCase());
  return words[0] + words.slice(1).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
};

// Knowledge fields as keyed by SkillFeatResolver SKILL_LABELS.
const KNOWLEDGE_FIELDS = ['Bureaucracy', 'Galactic Lore', 'Life Sciences', 'Physical Sciences', 'Social Sciences', 'Tactics', 'Technology'];

const set = (values) => new Set(values);

export function loadArchetypeAuthorities(root) {
  const classes = readDb(root, 'packs/classes.db');
  const skills = readDb(root, 'packs/skills.db');
  const skillKeys = skills.map((s) => camelKey(s.name));
  if (skillKeys.includes('knowledge')) KNOWLEDGE_FIELDS.forEach((f) => skillKeys.push(camelKey(`Knowledge ${f}`)));

  const forcePowerIds = readJson(root, 'data/force-powers.json').map((p) => p.id);
  const formPowerIds = readJson(root, 'data/lightsaber-form-powers.json').powers.map((p) => forceSlug(p.name));

  const backgrounds = readJson(root, 'data/backgrounds.json');
  const featManifest = readJson(root, 'data/audits/feat-phase-1a-canonical-identity-manifest.json');

  return {
    ontologyTags: set(readJson(root, 'data/audits/talent-feat-phase3-final-ontology.json').tags.map((t) => t.tag)),
    foundationClasses: set(classes.filter((c) => c.system?.base_class).map((c) => slugUnderscore(c.name))),
    prestigeClasses: set(classes.filter((c) => !c.system?.base_class).map((c) => slugUnderscore(c.name))),
    skills: set(skillKeys),
    talentTrees: set(readJson(root, 'data/audits/talent-canonical-tree-registry.json').entries.map((e) => e.canonicalTreeKey)),
    talents: set(readJson(root, 'data/canonical/talents.json').records.map((r) => r.canonicalIdentity)),
    feats: set(featManifest.records.map((r) => slugUnderscore(r.displayName))),
    species: set(readDb(root, 'packs/species.db').map((s) => s._id)),
    backgrounds: set(Object.values(backgrounds).flat().map((b) => b.id)),
    forcePowers: set([...forcePowerIds, ...formPowerIds])
  };
}
