import fs from 'fs';
const rd=f=>fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
const TR=rd('packs/talent_trees.db'),C=rd('packs/classes.db');const tn=Object.fromEntries(TR.map(t=>[t._id,t.name]));
const J=f=>JSON.parse(fs.readFileSync('data/galactic-profiles/v3/'+f));const O=J('SWSE_Galactic_Profiles_v3.json').profiles;
const cls=n=>C.find(c=>c.name===n);
console.log('Soldier trees:',(cls('Soldier').system.talent_trees||[]).map(i=>tn[i]).join(' | '));
console.log('Noble starting_credits field:',JSON.stringify(cls('Noble').system.starting_credits),'| Scout:',JSON.stringify(cls('Scout').system.starting_credits),'| Jedi:',JSON.stringify(cls('Jedi').system.starting_credits));
const sp=O.find(p=>p.profileId==='scout_pistoleer');console.log('scout_pistoleer skills:',sp.build.skills.trained.map(s=>s.canonicalKeyCandidate).join(','),'| items:',sp.build.startingPackage.items.map(i=>i.displayName).join('; '));
const lw=O.find(p=>p.profileId==='laborer-worker');console.log('laborer-worker skills:',lw.build.skills.trained.map(s=>s.canonicalKeyCandidate||s.sourceEntry).join(','));
const na=O.find(p=>p.profileId==='noble_aristocrat');console.log('noble_aristocrat wallet',JSON.stringify(na.build.startingPackage.wallet),'issues',na.certification.issues.filter(i=>/WEALTH/.test(i)),'items',na.build.startingPackage.items.map(i=>i.displayName+'x'+i.quantity).join('; '));
const sr=O.find(p=>p.profileId==='soldier_rifleman');console.log('rifleman feats:',sr.build.feats.sourceSelections.map(f=>f.displayName).join(', '),'| talent ref',JSON.stringify(sr.build.talents.classSlot.selection.sourceRef),'| tree',JSON.stringify(sr.build.talents.classSlot.sourceTree?.sourceRef?.name));
for(const id of ['jedi_guardian','jedi_consular','jedi_defender','jedi_sentinel']){const p=O.find(x=>x.profileId===id);console.log(id,'wis',p.build.attributes.scores.wis,'powers',p.build.forcePowers.sourceSelections.length,'feats:',p.build.feats.sourceSelections.map(f=>f.displayName).join(', '),'| skills has UtF:',p.build.skills.trained.some(s=>s.canonicalKeyCandidate==='useTheForce'))}
