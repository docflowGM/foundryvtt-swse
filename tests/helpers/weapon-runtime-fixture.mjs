import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WeaponAuthorityRegistry, WeaponRuntimeResolver } from '../../scripts/items/weapon-runtime/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const REGISTRY_PATH = path.join(ROOT, 'data/weapons/canonical-weapon-registry.json');
export const registryData = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
export const registry = new WeaponAuthorityRegistry(registryData);
export const resolver = new WeaponRuntimeResolver(registry);
export const stamped = (identityKey, extra = {}) => ({ name: 'Renamed Thing', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey } } }, system: {}, ...extra });
export const feat = (name) => ({ type: 'feat', name });
export const talent = (name) => ({ type: 'talent', name });
export const actor = ({ feats = [], talents = [], species = '', groups = [] } = {}) => ({
  system: { species, weaponProficiencies: groups }, items: [...feats.map(feat), ...talents.map(talent)],
});
export const resolve = (key, ctx = {}) => resolver.resolveIdentity(key, null, ctx);
