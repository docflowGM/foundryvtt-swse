/**
 * Offline fixtures for Galactic Profile tests: canonical V2 pack data wrapped in the resolver dependency
 * interface, plus a documented test double for V2's Force entitlement (mirrors the V2 Force Training feat
 * document: prerequisites Force Sensitivity + trained Use the Force; grants 1 + WIS modifier, minimum 1,
 * per instance). The production wiring uses FeatGrantEntitlementResolver instead.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './foundry-shim/register.mjs';

registerFoundryPathLoader();
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const lines = f => fs.readFileSync(path.join(ROOT, 'packs', `${f}.db`), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const packs = fs.readdirSync(path.join(ROOT, 'packs')).filter(f => f.endsWith('.db')).map(f => f.slice(0, -3));

export const loadProfilesDoc = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'data/galactic-profiles/v3/galactic-profiles.json'), 'utf8'));
export const loadSchema = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'data/galactic-profiles/v3/galactic-profiles.schema.json'), 'utf8'));
export const loadCatalog = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'data/galactic-profiles/v3/galactic-profiles.catalog.json'), 'utf8'));

export async function createOfflineResolvers(overrides = {}) {
  const { createGalacticProfileResolvers } = await import('../../scripts/engine/progression/profile/galactic-profile-resolvers.js');
  const { resolveAdapterStrict } = await import('../../scripts/apps/progression-framework/adapters/strict-subtype-resolution.js');
  const classes = lines('classes');
  const species = lines('species');
  const backgrounds = lines('backgrounds');
  const skillKeys = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/skills.json'), 'utf8')).map(s => s.key));
  const itemPacks = packs.filter(p => /^(equipment|weapons|armor)/.test(p));
  const snapshot = {
    feats: lines('feats'),
    talents: lines('talents'),
    items: itemPacks.flatMap(lines),
    forcepowers: lines('forcepowers')
  };
  // The real registry's import graph needs Foundry's ApplicationV2; the strict lookup it delegates to is pure.
  const adapters = ['actor', 'droid', 'nonheroic', 'beast', 'follower'].map(subtypeId => ({ subtypeId, handles: s => s === subtypeId }));
  const registry = { adapters, resolveAdapterStrict: subtype => resolveAdapterStrict(adapters, subtype) };
  const deps = {
    adapterRegistry: registry,
    snapshot,
    classLookup: id => {
      const d = classes.find(c => c._id === id);
      return d ? { id: d._id, sourceId: d._id, name: d.name, system: d.system } : null;
    },
    speciesLookup: async ref => {
      const byName = species.filter(s => s.name === ref?.name);
      const d = species.find(s => s._id === ref?.sourceId) ?? (byName.length === 1 ? byName[0] : null);
      if (!d) return { status: 'missing' };
      return { status: 'resolved', identity: { id: d._id, name: d.name, doc: { abilityMods: d.system?.abilityMods ?? null, languages: [] } }, pendingContext: null };
    },
    backgroundLookup: async ref => {
      const byName = backgrounds.filter(b => b.name === ref?.name);
      const d = backgrounds.find(b => b._id === ref?.sourceId) ?? (byName.length === 1 ? byName[0] : null);
      return d ? { status: 'resolved', id: d._id, name: d.name, pendingContext: null } : { status: 'missing' };
    },
    skillExists: key => skillKeys.has(key),
    forceEntitlement: ({ featNames = [], skills = [], attributes = {} }) => {
      const k = featNames.filter(n => n === 'forcetraining').length;
      const fs_ = featNames.includes('forcesensitivity');
      if (!k || !fs_ || !skills.includes('useTheForce')) return { slots: 0 };
      const wis = Math.floor(((attributes.wis ?? 10) - 10) / 2);
      return { slots: k * Math.max(1, 1 + wis) };
    },
    ...overrides
  };
  return { resolvers: createGalacticProfileResolvers(deps), deps, registry, snapshot, classes, species };
}
