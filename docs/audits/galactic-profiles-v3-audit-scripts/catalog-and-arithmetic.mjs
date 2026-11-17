import fs from 'fs';const b='wt/data/galactic-profiles/v3/';
const J=f=>JSON.parse(fs.readFileSync(b+f));
const O=J('SWSE_Galactic_Profiles_v3.json').profiles, D=J('droids/SWSE_Eight_Droid_Galactic_Profiles_v3.json').profiles;
const CO=J('SWSE_Galactic_Profiles_Catalog_v3.json'), CD=J('droids/SWSE_Eight_Droid_Galactic_Profiles_Catalog_v3.json');
console.log('org cat totalProfiles',CO.totalProfiles,CO.profiles.length,'| droid cat',CD.profiles.length,'| cat top-level source keys',Object.keys(CO.source),Object.keys(CD.source));
const ids=[...O,...D].map(p=>p.profileId);console.log('unique ids',new Set(ids).size,'/',ids.length);
const catIds=[...CO.profiles,...CD.profiles].map(p=>p.profileId);console.log('cat unique',new Set(catIds).size, 'missing in cat',ids.filter(i=>!catIds.includes(i)));
// catalog vs record
let diffs=[];
for(const [pf,cat] of [[O,CO],[D,CD]]) for(const p of pf){const c=cat.profiles.find(x=>x.profileId===p.profileId);
 for(const k of ['name','archetype','description','imagePath','classKey','mentorKey','roleTags','quote','dialogueKey','className']){ if(k in c && JSON.stringify(c[k])!==JSON.stringify(p.catalog[k]))diffs.push([p.profileId,k,c[k],p.catalog[k]])}
 if(c.participantKind!==p.identity.participantKind)diffs.push([p.profileId,'participantKind',c.participantKind,p.identity.participantKind]);
 if(c.certificationStatus!==p.certification.status)diffs.push([p.profileId,'cert',c.certificationStatus,p.certification.status]);
 if(c.revision!==p.revision)diffs.push([p.profileId,'rev']);}
console.log('catalog-vs-record diffs',diffs.length,JSON.stringify(diffs).slice(0,800));
// droid-only catalog duplication
for(const p of D){const c=CD.profiles.find(x=>x.profileId===p.profileId);const s=p.build.attributes.scores;
 const fa=JSON.stringify(c.finalAttributes)===JSON.stringify(s);
 const credOK=c.classStartingCreditsRemaining===p.build.startingPackage.wallet.credits;
 const names=p.build.startingPackage.items.map(i=>i.displayName);
 const gearset=[c.weapon,...c.gear];
 console.log(p.profileId,'finalAttrs match',fa,'wallet match',credOK,'| items:',names.join('; '),'| cat weapon/gear:',gearset.join('; '));}
// arithmetic
const arr=[10,12,13,14,15];
for(const p of D){const a=p.build.attributes;const pre=Object.entries(a.preDegreeAndSizeScores).filter(([k,v])=>v!==null).map(e=>e[1]).sort((x,y)=>x-y);
 const std=JSON.stringify(pre)===JSON.stringify(arr);
 const bad=[];for(const k of ['str','dex','int','wis','cha']){const exp=a.preDegreeAndSizeScores[k]+(a.degreeModifiers[k]||0)+(a.sizeModifiers[k]||0);if(exp!==a.scores[k])bad.push(k+':'+exp+'!='+a.scores[k])}
 console.log(p.profileId,p.build.droid.droidDegree,p.build.droid.droidSize,'std array',std,'deg',JSON.stringify(a.degreeModifiers),'size',JSON.stringify(a.sizeModifiers),'arith mismatches',bad.join(','))}
// languages, feats, talents summary per droid
for(const p of D)console.log(p.profileId,'feat',p.build.feats.sourceSelections.map(f=>f.displayName).join('/'),'| auto',p.build.feats.expectedAutomaticClassFeatNames.join(','),'| talent',p.build.talents.classSlot.selection.sourceRef.name,'| skills',p.build.skills.trained.length,p.build.skills.expectedCount,p.build.skills.trained.map(s=>s.canonicalKeyCandidate).join(','));
