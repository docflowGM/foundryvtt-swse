import fs from 'fs'; import Ajv2020 from 'ajv/dist/2020.js';
const b='../wt/data/galactic-profiles/v3/';
const J=f=>JSON.parse(fs.readFileSync(b+f));
const d=J('droids/SWSE_Eight_Droid_Galactic_Profiles_v3.json'), sd=J('droids/SWSE_Eight_Droid_Galactic_Profiles_v3.schema.json');
const v=new Ajv2020({strict:false,allErrors:true}).compile(sd); v(d);
const m={};for(const e of v.errors){const k=e.instancePath.replace(/\/profiles\/\d+/,'/profiles/N')+' :: '+e.message+(e.params?.allowedValue!==undefined?' ('+JSON.stringify(e.params.allowedValue)+')':'');m[k]=(m[k]||0)+1}
console.log(Object.entries(m));
const prop=(s,path)=>path.split('.').reduce((a,k)=>a.properties?.[k]||a.items?.properties?.[k],s);
console.log('schema budgetAccounting:',JSON.stringify(sd.properties.profiles.items.properties.build.properties.startingPackage.properties.budgetAccounting));
console.log('schema prov:',JSON.stringify(sd.properties.profiles.items.properties.provenance));
console.log('schema cert:',JSON.stringify(sd.properties.profiles.items.properties.certification).slice(0,700));
console.log('actual budgetAccounting set:',[...new Set(d.profiles.map(p=>p.build.startingPackage.budgetAccounting))]);
console.log('actual cert status set:',[...new Set(d.profiles.map(p=>p.certification.status))]);
