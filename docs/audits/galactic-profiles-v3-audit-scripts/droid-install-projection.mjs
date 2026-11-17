import fs from 'fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs'; registerFoundryPathLoader();
let globals={}; try{ const g=await import('./helpers/foundry-shim/globals.mjs'); g.installFoundryShimGlobals?.(); }catch(e){console.log('no globals shim',e.message)}
const S = await import('../scripts/domain/droids/droid-initial-installation-service.js');
const d=JSON.parse(fs.readFileSync(new URL('../data/galactic-profiles/v3/droids/SWSE_Eight_Droid_Galactic_Profiles_v3.json',import.meta.url))).profiles;
for(const p of d){const dd=p.build.droid;
 try{const ds=JSON.parse(JSON.stringify(dd.droidSystems)); if(process.argv[2]==='patch'){ds.appendages=ds.appendages.map(a=>({...a,type:'hand'}));} const r=S.buildInitialDroidInstallation({actor:null,seed:'audit-seed',droidSystems:ds,size:dd.droidSize});
  const n=r.installedSystems?Object.keys(r.installedSystems).length:0;
  console.log(p.profileId.padEnd(42),'seeded',r.seeded,'ledgerEntries',n,'unresolved',r.unresolved.length,JSON.stringify(r.unresolved.map(u=>u.id+':'+u.reason)).slice(0,300),'skipped',r.skipped.length);
 }catch(e){console.log(p.profileId,'THREW',e.message.slice(0,200))}}
