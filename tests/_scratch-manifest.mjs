import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
globalThis.window = globalThis.window || {};
registerFoundryPathLoader(); installFoundryShimGlobals();
const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const cls = await import('/systems/foundryvtt-swse/scripts/engine/combat/weapon-target-gate-classifiers.js');
const { descriptorMatchesAny } = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/weapon-descriptor.js');
const { registry, registryData } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const docs = new Map(fs.readFileSync('packs/weapons.db','utf8').split('\n').filter(Boolean).map((l)=>JSON.parse(l)).map((d)=>[d._id,d]));
const rules = [];
for (const pack of ['packs/feats.db','packs/talents.db']) for (const l of fs.readFileSync(pack,'utf8').split('\n').filter(Boolean)) { const d=JSON.parse(l); const m=d.system?.abilityMeta??{}; for (const r of [...(m.rules??[]),...(m.modifiers??[])]) { for (const k of ['weaponGroups','groups','requiresWeaponGroups','excludesWeaponGroups']) if (r[k]) rules.push({name:d.name,kind:'group',field:k,vals:r[k]}); for (const k of ['requiresWeaponText','weaponText']) if (r[k]) rules.push({name:d.name,kind:'text',field:k,vals:r[k]}); } }
for (const r of rules) {
  const lose=[], gain=[]; let oldN=0,newN=0;
  for (const rec of registryData.identities) {
    const doc = docs.get(rec.repo?.id ?? rec.identityKey); if (!doc) continue;
    const item = { ...doc, type:'weapon', flags:{ swse:{ canonicalWeapon:{ identityKey: rec.identityKey } } } };
    const shape = rt.shapeOfWeapon(item, {});
    if (shape.source!=='canonical') continue;
    const old = r.kind==='group' ? cls.weaponMatchesGroup(doc, r.vals, {}) : cls.textMatchesAny(cls.weaponText(doc), r.vals);
    const nu = descriptorMatchesAny(shape.descriptor, r.vals, { wielderSize: 'medium', forAbility: r.name.toLowerCase().replace(/ /g,'-'), identitySlugs: (await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/weapon-descriptor.js')).identitySlugSet(registry), groupVocab: (await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/weapon-descriptor.js')).groupVocabSet(registry) });
    if (old) oldN++; if (nu) newN++;
    if (old && !nu) lose.push(rec.identityKey); if (!old && nu) gain.push(rec.identityKey);
  }
  console.log(`${r.name} | ${r.field} ${JSON.stringify(r.vals)} | old ${oldN} new ${newN} | lose ${lose.length}: ${lose.slice(0,8).join(',')} | gain ${gain.length}: ${gain.slice(0,6).join(',')}`);
}
