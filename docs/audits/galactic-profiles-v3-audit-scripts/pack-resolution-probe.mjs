import fs from 'fs';const W='wt/';
const sys=JSON.parse(fs.readFileSync(W+'system.json'));
const packNames=new Set(sys.packs.map(p=>p.name));
const packs={};for(const n of packNames){const f=W+'packs/'+n+'.db';if(!fs.existsSync(f))continue;const docs=[];for(const l of fs.readFileSync(f,'utf8').split('\n')){if(!l.trim())continue;try{docs.push(JSON.parse(l))}catch{}}packs[n]=docs;}
const byId={},byName={};
for(const [n,ds] of Object.entries(packs)){byId[n]=new Map(ds.map(d=>[d._id,d]));const m=new Map();for(const d of ds){const k=d.name.toLowerCase().trim();m.set(k,[...(m.get(k)||[]),d])}byName[n]=m;}
const J=f=>JSON.parse(fs.readFileSync(W+'data/galactic-profiles/v3/'+f));
const all=[...J('SWSE_Galactic_Profiles_v3.json').profiles,...J('droids/SWSE_Eight_Droid_Galactic_Profiles_v3.json').profiles];
const refs=[];
const collect=(p,x,path)=>{if(Array.isArray(x))return x.forEach((e,i)=>collect(p,e,path+'['+i+']'));if(x&&typeof x==='object'){if(x.id&&x.pack&&x.type&&typeof x.pack==='string'){refs.push({p:p.profileId,path,ref:x});return;}for(const k of Object.keys(x))collect(p,x[k],path+'.'+k);}};
for(const p of all)collect(p,{identity:p.identity,build:p.build},'');
const stat={};const bad=[];
for(const r of refs){const pk=r.ref.pack.replace(/^foundryvtt-swse\./,'');const t=r.ref.type;
 let res;
 if(!packs[pk])res='PACK_MISSING';
 else if(byId[pk].has(r.ref.id))res='ID_OK';
 else {const n=byName[pk].get((r.ref.name||'').toLowerCase().trim());res=!n?'NO_ID_NO_NAME':(n.length===1?'NAME_ONLY_UNIQUE':'NAME_AMBIGUOUS_'+n.length)}
 const k=t+':'+res;stat[k]=(stat[k]||0)+1; if(!['ID_OK'].includes(res))bad.push({p:r.p,t,pack:pk,id:r.ref.id,name:r.ref.name,res});}
console.log('total refs',refs.length);console.log(Object.entries(stat).sort().map(e=>e.join(' = ')).join('\n'));
fs.mkdirSync('audit-output',{recursive:true});fs.writeFileSync('audit-output/badrefs.json',JSON.stringify(bad,null,1));
const nonOk=bad.reduce((a,b)=>{(a[b.t+':'+b.res]??=new Set()).add(b.name+'@'+b.pack+'#'+b.id);return a},{});
for(const [k,v] of Object.entries(nonOk))console.log('\n##',k,v.size,'distinct\n  ',[...v].slice(0,14).join('\n   '));
