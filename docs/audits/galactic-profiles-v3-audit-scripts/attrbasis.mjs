import fs from 'fs';const W='wt/';
const rd=f=>fs.readFileSync(W+f,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
const sp=rd('packs/species.db');
const COST={8:0,9:1,10:2,11:3,12:4,13:5,14:6,15:8,16:10,17:13,18:16};
const O=JSON.parse(fs.readFileSync(W+'data/galactic-profiles/v3/SWSE_Galactic_Profiles_v3.json')).profiles;
const keys=['str','dex','con','int','wis','cha'];
const cost=(a)=>{let t=0;for(const k of keys){const v=a[k];if(!(v in COST))return null;t+=COST[v]}return t};
const rows=[];
for(const p of O){const s=p.build.attributes.scores;const nm=p.identity.speciesRef.sourceRef.name;const d=sp.find(x=>x.name===nm);const m=d?.system?.abilityMods;
 const pre=cost(s);let post=null,postScores=null;
 if(m){postScores={};for(const k of keys)postScores[k]=s[k]-(m[k]||0);post=cost(postScores)}
 const ok=c=>c!==null&&c<=25;
 let cls;
 if(!m)cls='NO_SPECIES_MODS_IN_PACK';
 else if(ok(pre)&&!ok(post))cls='PRE-consistent';
 else if(!ok(pre)&&ok(post))cls='POST-consistent';
 else if(ok(pre)&&ok(post))cls='AMBIGUOUS(both legal ≤25)';
 else cls='NEITHER(not 25-pt buy)';
 rows.push({id:p.profileId,sp:nm,mods:m?keys.filter(k=>m[k]).map(k=>k+(m[k]>0?'+':'')+m[k]).join(','):'?',scores:keys.map(k=>s[k]).join('/'),pre,post,cls});}
for(const r of rows)console.log(r.id.padEnd(26),r.sp.padEnd(16),('mods '+r.mods).padEnd(18),r.scores.padEnd(16),'preCost',String(r.pre).padEnd(5),'postCost',String(r.post).padEnd(5),r.cls);
const c={};for(const r of rows)c[r.cls]=(c[r.cls]||0)+1;console.log(c);
fs.mkdirSync('audit-output',{recursive:true});fs.writeFileSync('audit-output/attrbasis.json',JSON.stringify(rows,null,1));
