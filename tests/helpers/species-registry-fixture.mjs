// Installs REAL species records (packs/species.db) into the SpeciesRegistry authority so the synchronous species-evidence adapter resolves
// them exactly as it does in a running world. No second source: entries are built the way the registry builds them from the pack.
import { readFileSync } from 'node:fs';

export async function installSpeciesRegistryFixture(names = ['Human', 'Codru-Ji', 'Killik', 'Wookiee']) {
  const { SpeciesRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js');
  const recs = readFileSync(new URL('../../packs/species.db', import.meta.url), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const entries = [];
  for (const d of recs) {
    if (!names.includes(d.name)) continue;
    const s = d.system;
    entries.push({
      id: d._id, name: d.name, type: 'species', category: 'species', tags: s.tags, pack: 'species', canonicalName: s.canonicalName,
      variants: SpeciesRegistry._normalizeVariants(JSON.parse(JSON.stringify(s.variants ?? [])), d.name),
      speed: s.speed, size: s.size, abilityScores: {}, skillBonuses: [], abilities: [], canonicalTraits: s.canonicalTraits, languages: [], naturalWeapons: [],
    });
  }
  SpeciesRegistry._entries = entries;
  SpeciesRegistry._byId = new Map(entries.map((e) => [e.id, e]));
  SpeciesRegistry._byName = new Map(entries.map((e) => [e.name.toLowerCase(), e]));
  SpeciesRegistry._initialized = true;
  return { SpeciesRegistry, entries };
}
