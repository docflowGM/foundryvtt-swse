import fs from 'fs'; import Ajv2020 from 'ajv/dist/2020.js';
const b='../wt/data/galactic-profiles/v3/';
const J=f=>JSON.parse(fs.readFileSync(b+f));
const o=J('SWSE_Galactic_Profiles_v3.json'), d=J('droids/SWSE_Eight_Droid_Galactic_Profiles_v3.json');
const so=J('SWSE_Galactic_Profiles_v3.schema.json'), sd=J('droids/SWSE_Eight_Droid_Galactic_Profiles_v3.schema.json');
const mk=s=>{const a=new Ajv2020({strict:false,allErrors:true});return a.compile(s)};
const vo=mk(so), vd=mk(sd);
const rep=(n,v,doc)=>{const ok=v(doc);console.log(n,ok,ok?'':JSON.stringify(v.errors.slice(0,4).map(e=>e.instancePath+' '+e.message)))};
rep('org doc vs org schema',vo,o); rep('droid doc vs droid schema',vd,d);
rep('droid doc vs ORG schema',vo,d); rep('org doc vs DROID schema',vd,o);
const dd=(v,doc)=>{const errs=new Set();v(doc);for(const e of v.errors||[])errs.add(e.instancePath.replace(/\/profiles\/\d+/,'/profiles/N')+' '+e.message);return [...errs].slice(0,8)};
console.log('droid vs ORG:',dd(vo,d)); console.log('org vs DROID:',dd(vd,o));
// Does schema constrain build? 
const pb=(s)=>s.properties.profiles.items.properties.build;
console.log('org build required',pb(so).required,'| droid build required',pb(sd).required);
console.log('org build props',Object.keys(pb(so).properties||{}),'\ndroid build props',Object.keys(pb(sd).properties||{}));
console.log('org attrs schema',JSON.stringify(pb(so).properties.attributes).slice(0,600));
console.log('droid attrs schema',JSON.stringify(pb(sd).properties.attributes).slice(0,900));
console.log('droid schema build.droid',JSON.stringify(pb(sd).properties.droid).slice(0,2500));
