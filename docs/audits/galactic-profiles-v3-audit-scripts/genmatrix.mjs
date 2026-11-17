import fs from 'fs';const b='wt/data/galactic-profiles/v3/';
const J=f=>JSON.parse(fs.readFileSync(b+f));
const O=J('SWSE_Galactic_Profiles_v3.json').profiles, D=J('droids/SWSE_Eight_Droid_Galactic_Profiles_v3.json').profiles;
const V={},S={},R={},OK={};
const add=(m,ids,t)=>{for(const i of ids)(m[i]??=[]).push(t)};
const jedi=['jedi_guardian','jedi_consular','jedi_defender','jedi_sentinel'];
add(V,jedi,'lightsaber ref `weapons-simple#weapon-lightsaber` not in pack by id or name');
add(S,jedi,'starter-lightsaber duplicate vs finalizer auto-grant (GP-021)');
add(V,['jedi_guardian','jedi_consular','jedi_defender'],'class-slot talent tree asserted by profile ≠ talent doc tree');
add(V,['jedi_sentinel'],'asserted tree id ≠ doc tree id though both named "Jedi Sentinel" (duplicate tree docs)');
add(V,['jedi_guardian','jedi_consular','jedi_defender'],'Force Training absent while Force powers listed (cert flag FORCE_TRAINING_ENTITLEMENT_MISSING)');
add(V,['scout_sniper'],'asserted tree "Reconnaissance" ≠ doc tree "Spy"');
add(V,['scout_engineer'],'asserted tree "Versatility" ≠ doc tree "Espionage"');
add(S,['scout_pistoleer'],'Mechanized Rider (Mobile Scout) tree not in Scout `talent_trees`; needs V2 talent-access check');
add(V,['scout_pistoleer'],'starting item is a vehicle doc in non-existent pack `vehicles`');
add(V,['soldier_gunner','soldier_brawler','soldier_tank'],'Devastating Attack (weapon group) has no per-group doc; one parameterized Core doc; alias entry quarantined');
add(V,['soldier_rifleman'],'Commanding Presence maps to 2 distinct docs (Force Unleashed / Galaxy at War)');
add(V,['noble_aristocrat'],'Wealth talent: finalizer adds lineageLevel×5000 on top of authored net wallet');
add(V,['laborer-worker'],'skill "Athletics" has no V2 skill key');
add(V,['beast-wolf','beast-bear'],'species & class docs absent from packs; beastData has no session slot; BeastSubtypeAdapter seeds only from actor flags');
add(V,['beast-wolf'],'"Pack Tactics (advantage…)" is not SWSE terminology');
add(S,['beast-bear'],'special qualities/natural attacks need source review (README flag)');
add(V,['soldier-guard','scout-pathfinder','laborer-worker','nonheroic_worker','nonheroic_trooper','nonheroic_criminal','nonheroic_merchant','nonheroic_police'],'classRef id absent from classes pack (V2 uses NONHEROIC_CLASS_MODEL) – field is dead weight');
add(V,['soldier-guard','scout-pathfinder','laborer-worker','beast-wolf','beast-bear'],'background refs unresolved by id/name (Military Academy / Frontier Settler / Common Worker / Feral Creature)');
for(const p of D){add(V,[p.profileId],'fails own schema (4 errs); appendage rows lack `type:"hand"` → installation projection UNKNOWN_COMPONENT');}
add(V,['droid_scout_dex_recon_probe','droid_noble_int_medical_coordinator','droid_noble_cha_protocol_envoy','droid_scoundrel_cha_service_operative'],'"Energy Cell" authored with id:null (unique exact doc `tool-energy-cell` exists)');
add(S,['droid_scoundrel_dex_systems_infiltrator'],'Precise Shot depends on class-granted Point-Blank Shot → V2 must count pending auto-grants');
add(S,['droid_noble_int_medical_coordinator','droid_noble_cha_protocol_envoy'],'Linguist conditional on final INT → V2 must evaluate, not the list');
for(const p of D){add(OK,[p.profileId],'std array; degree/size mods; inhibitors; `quoteDroidBuild`=OK/1000 exact; projection OK once `type` supplied')}
for(const p of [...O,...D]){add(R,[p.profileId],'Foundry v13: actor, inventory, ledger, wallet')}
const track=p=>p.identity.participantKind+'/'+p.identity.rulesTrack;
const rows=[...O,...D].map(p=>{const id=p.profileId;const cls=p.catalog.className||p.catalog.classKey;
 const cell=m=>(m[id]||[]).join('; ')||'—';
 return `| \`${id}\` | ${track(p)} | ${cls} | ${cell(OK)} | ${cell(V)} | ${cell(S)} | ${cell(R)} |`});
fs.mkdirSync('audit-output',{recursive:true});fs.writeFileSync('audit-output/matrix.md','| Profile | Track | Class | Verified correct | Verified defect | Suspected | Needs runtime |\n|---|---|---|---|---|---|---|\n'+rows.join('\n')+'\n');
console.log(rows.length);
