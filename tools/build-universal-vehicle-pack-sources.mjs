/**
 * Phase 4B: deterministic, source-faithful Foundry Actor document proposals.
 *
 * Input: ONLY data/canonical/vehicles/vehicles.json (429 NDJSON source claims).
 * Output: 11 disjoint category-specific NeDB JSONL source streams for the
 * existing Foundry V13 LevelDB compilation pipeline, plus a manifest.
 *
 * The .db streams are compiler inputs, NOT registered V13 native packs.
 * Never register or import these until the separate LevelDB + V2 checks pass.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const PACKS = Object.freeze({
  'vehicles-starfighters': ['starfighter'],
  'vehicles-space-transports': ['space-transport', 'escape-craft', 'drop-pod'],
  'vehicles-capital-ships': ['capital-ship'],
  'vehicles-stations': ['space-station'],
  'vehicles-walkers': ['walker'],
  'vehicles-airspeeders': ['airspeeder', 'air-speeder-bike', 'medical-airspeeder', 'ornithopter', 'aerial-artillery'],
  'vehicles-speeders': ['speeder', 'speeder-bike', 'ground-speeder', 'ground-speeder-bike', 'heavy-ground-speeder', 'landspeeder', 'command-speeder', 'swoop', 'water-speeder'],
  'vehicles-tracked': ['tracked-vehicle'],
  'vehicles-wheeled': ['wheeled-vehicle', 'wheeled-tank', 'wheeled-groundcar', 'wheeled-utility-vehicle', 'wheeled-assault-vehicle', 'wheel-bike'],
  'vehicles-ground-armor': ['repulsorlift-tank'],
  'vehicles-hybrids': ['hybrid-vehicle-droid', 'vehicle-droid']
});

const OWNERS = new Map();
for(const [pack,categories] of Object.entries(PACKS)) {
  for(const category of categories) {
    if(OWNERS.has(category)) throw new Error('Duplicate vehicle category ownership '+category);
    OWNERS.set(category,pack);
  }
}
const assert=(ok,message)=>{if(!ok)throw new Error('Phase 4B: '+message);};
const hash=(x)=>createHash('sha256').update(x,'utf8').digest('hex');
const defined=(x)=>x!==undefined && x!==null;
const finite=(x)=>typeof x==='number' && Number.isFinite(x);
const copy=(x)=>structuredClone(x);
const compare=(a,b)=>a<b?-1:a>b?1:0;
const put=(dest,key,value)=>{if(defined(value))dest[key]=copy(value);};
const sourced=(v)=>typeof v==='string'&&v.trim()?v.trim():null;

// Never use displayed/runtime fallback values as published authority.
export function projectVehicleActor(record,pack) {
  const sourceKey=record?.identity?.sourceEntryKey,cat=record?.classification?.primaryCategory;
  assert(typeof sourceKey==='string'&&sourceKey.length>0,'source key missing');
  assert(OWNERS.get(cat)===pack,'category ownership mismatch for '+sourceKey);
  assert(typeof record.identity.name==='string'&&record.identity.name.length>0,'source name missing '+sourceKey);
  assert(finite(record.abilities?.initiativePrinted),'printed numeric Initiative missing '+sourceKey);
  assert(finite(record.durability?.hitPoints),'printed HP missing '+sourceKey);
  assert(finite(record.defenses?.reflex)&&finite(record.defenses?.fortitude),'printed defenses missing '+sourceKey);
  assert(!Object.hasOwn(record.armament??{},'weaponMounts'),'uncertified installed mounts '+sourceKey);
  assert((record.armament?.firingGroups??[]).every(g=>Array.isArray(g.mountKeys)&&g.mountKeys.length===0),'bound source weapons '+sourceKey);

  const id=hash('SWSE:universal-vehicle:'+sourceKey).slice(0,16);
  const system={
    model:record.identity.name,
    category:cat,
    vehicleBucket:pack.slice('vehicles-'.length),
    vehiclePackName:pack,
    vehicleSourcePrimaryCategory:cat,
    vehicleFamily:(record.classification?.mobilityDomains??[]).includes('space')?'starship':'planetary',
    vehicleSourceEntryKey:sourceKey,
    vehicleSourceBook:record.publication.book,
    vehicleSourcePage:record.publication.page,
    // Core data is printed, NOT derived from crew quality / assumed pilots.
    initiative:record.abilities.initiativePrinted,
    hp:{value:record.durability.hitPoints,max:record.durability.hitPoints},
    reflexDefense:record.defenses.reflex,
    fortitudeDefense:record.defenses.fortitude,
    weapons:[], // Physical mounts are not certified; attack rows are display-only.
    sourceAttackGroups:copy(record.armament?.firingGroups??[]),
    vehicleMovementModes:copy(record.movement?.speedModes??[]),
    vehicleSourceFieldStates:copy(record.fieldStates??{})
  };
  put(system,'flatFooted',record.defenses.reflexFlatFooted);
  put(system,'damageReduction',record.defenses.damageReduction);
  put(system,'damageThreshold',record.durability.damageThreshold);
  put(system,'armorBonus',record.defenses.armorBonus);
  put(system,'challengeLevel',record.challenge?.cl);
  put(system,'size',record.classification?.printedSize);
  put(system,'vehicleMovementRaw',sourced(record.movement?.raw));
  put(system,'vehicleCrewCount',record.crew?.crewCount);
  put(system,'vehicleCrewQuality',sourced(record.crew?.crewQuality));
  put(system,'vehicleCrewLabel',sourced(record.crew?.raw));
  put(system,'vehiclePassengers',record.capacity?.passengerCount);
  if(record.capacity?.cargo!==undefined && record.capacity.cargo!==null) {
    system.vehiclePublishedCargo=copy(record.capacity.cargo);
  }
  if(record.capacity?.consumables!==undefined && record.capacity.consumables!==null) {
    system.vehiclePublishedConsumables=copy(record.capacity.consumables);
  }
  // A known published shield rating of zero is NOT an unknown shield rating.
  // Preserve uncertainty by not creating a shields object when source is silent.
  if(finite(record.defenses?.shieldRating)) {
    const state=record.fieldStates?.['defenses.shieldRating']??record.fieldStates?.['/defenses/shieldRating'];
    assert(!/ambiguous|conflict/i.test(String(state??'')),'conflicting shield value '+sourceKey);
    system.shieldRating=record.defenses.shieldRating;
    system.shields={value:record.defenses.shieldRating,max:record.defenses.shieldRating};
  }

  return {
    _id:id,
    name:record.identity.name,
    type:'vehicle',
    img:'icons/svg/mystery-man.svg',
    system,
    items:[],
    effects:[],
    flags:{swse:{
      canonicalPublication:{
        sourceEntryKey:sourceKey,
        sourceBook:record.publication.book,
        printedPage:record.publication.page,
        sourceCertification:'SOURCE_ONLY',
        foundryStockAttackTrusted:false,
        physicalMountCertification:false
      },
      universalVehicleSource:{
        schema:'swse.vehicle.universal.actor-source.v1',
        recordDigest:hash(JSON.stringify(record)),
        source:copy(record)
      }
    }}
  };
}

export function buildUniversalVehiclePackSources(root=process.cwd()) {
  const input=path.join(root,'data/canonical/vehicles/vehicles.json');
  const data=fs.readFileSync(input,'utf8');
  const rows=data.trimEnd().split('\n').map((line,i)=>{
    try{return JSON.parse(line);}catch(e){throw new Error('Canonical source line '+(i+1)+': '+e.message);}
  });
  const canonical=JSON.parse(fs.readFileSync(path.join(root,'data/canonical/vehicles/vehicles.manifest.json'),'utf8'));
  assert(rows.length===429&&canonical.publicationClaims===429,'canonical record count');
  assert(canonical.sourceFileGitBlobSha1===createHash('sha1').update('blob '+Buffer.byteLength(data)+'\0').update(data).digest('hex'),'canonical source file checksum mismatch');
  assert(canonical.certification==='SOURCE_ONLY'&&canonical.productionCutoverAuthorized===false,'canonical source-only gate changed');
  const output=new Map(Object.keys(PACKS).map(k=>[k,[]]));
  const seen=new Set(), ids=new Set(), usedCategories=new Set();
  for(const record of rows){
    const category=record.classification?.primaryCategory;
    const pack=OWNERS.get(category);
    assert(pack,'unmapped category '+category);
    usedCategories.add(category);
    const doc=projectVehicleActor(record,pack);
    assert(!seen.has(record.identity.sourceEntryKey),'duplicate source key '+record.identity.sourceEntryKey);
    assert(!ids.has(doc._id),'colliding Foundry id '+doc._id);
    seen.add(record.identity.sourceEntryKey);ids.add(doc._id);
    output.get(pack).push(doc);
  }
  assert(seen.size===429&&ids.size===429&&usedCategories.size===Object.keys(canonical.categoryCounts).length,'record and category coverage');
  for(const pack of Object.keys(PACKS))output.get(pack).sort((a,b)=>compare(a.flags.swse.canonicalPublication.sourceEntryKey,b.flags.swse.canonicalPublication.sourceEntryKey));
  const manifest={
    schema:'swse.vehicle.universal.phase4b.actor-source-manifest.v1',
    source:'data/canonical/vehicles/vehicles.json',
    sourceGitBlobSha1:canonical.sourceFileGitBlobSha1,
    generatedFrom:'tools/build-universal-vehicle-pack-sources.mjs',
    certification:'SOURCE_ONLY',
    installedMountsPromoted:0,
    executableStockAttacks:0,
    total:seen.size,
    packs:Object.fromEntries([...output].map(([key,docs])=>[key,{
      documents:docs.length,
      categoryNames:PACKS[key],
      sha256:hash(docs.map(d=>JSON.stringify(d)).join('\n')+'\n')
    }]))
  };
  assert(Object.values(manifest.packs).reduce((n,x)=>n+x.documents,0)===429,'pack total');
  return {output,manifest};
}

export function writeUniversalVehiclePackSources({root=process.cwd(),outDir='build/vehicle-phase4b/sources'}={}) {
  const {output,manifest}=buildUniversalVehiclePackSources(root);
  const dir=path.resolve(root,outDir);
  fs.mkdirSync(dir,{recursive:true});
  for(const [pack,docs] of output){
    fs.writeFileSync(path.join(dir,pack+'.db'),docs.map(doc=>JSON.stringify(doc)).join('\n')+'\n');
  }
  fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  return manifest;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const cmd=process.argv.slice(2);
  try{
    assert(cmd.length===1&&['--check','--write'].includes(cmd[0]),'usage --check|--write');
    const result=cmd[0]==='--check'?buildUniversalVehiclePackSources().manifest:writeUniversalVehiclePackSources();
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
  }catch(e){process.stderr.write(String(e.stack??e)+'\n');process.exitCode=1;}
}
