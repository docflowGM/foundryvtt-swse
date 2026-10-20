#!/usr/bin/env node
// The canonical source is intentionally NDJSON with a .json extension:
// exactly one complete publication-specific ship object per line.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(fileURLToPath(new URL('../../',import.meta.url)));
export const SOURCE='data/canonical/vehicles/ships.json';
export const OUTPUT='packs/vehicles-canonical-ships.db';
const fail=(s)=>{throw Error('SHIP_CATALOG_'+s)};
const num=x=>typeof x==='number'&&Number.isFinite(x)?x:undefined;
const match=(s,re)=>{const m=typeof s==='string'?re.exec(s):null;return m?Number(m[1].replaceAll(',','')):undefined;};
const choose=(...args)=>args.find(v=>v!==undefined&&v!==null);
export function parseShips(text){
 const rows=text.trim().split(/\r?\n/).map((line,i)=>{let r;try{r=JSON.parse(line)}catch{fail('JSON_LINE_'+(i+1))}
  if(r.ordinal!==i+1||r._id!=='swse'+String(i+1).padStart(12,'0')||r.reviewStatus!=='PDF_VERIFIED'||!r.printedFacts||!Array.isArray(r.sourceAttackGroups))fail('INVALID_SHIP_'+(i+1));return r});
 if(rows.length!==316||new Set(rows.map(r=>r.sourceBook+':'+r.sourceEntryKey)).size!==316)fail('ROSTER_MISMATCH');return rows;
}
export function toActor(r){
 const f=r.approvedEffectiveFacts??r.printedFacts,d=f.defenses??{},h=f.durability??{},a=f.abilities??{};
 const type=f.type??f.printedTypeLine??'Starship',category=/starfighter/i.test(type)?'Starfighter':/capital ship|cruiser|frigate|destroyer/i.test(type)?'Capital Ship':'Space Transport';
 const sys={model:r.name,sourcebook:r.sourceBook,page:r.printedPage,category,type:category,size:type.split(' ').slice(0,2).join(' '),
  vehicleBucket:category==='Starfighter'?'starfighters':category==='Capital Ship'?'capital-ships':'space-transports',vehicleFamily:'starship',
  weapons:[],vehicleHasWeapons:false,vehicleWeaponDataStatus:'PUBLISHED_GROUPS_NOT_INSTALLED',
  vehicleCanonicalSourceState:'SOURCE_REVIEWED_PHYSICAL_MOUNTS_UNVERIFIED'};
 const set=(k,v)=>{if(v!==undefined&&v!==null)sys[k]=v};
 set('challengeLevel',choose(num(f.cl),num(f.challengeLevel)));
 set('initiative',choose(num(f.initiative),match(f.initiativeAndSenses,/Init\s*([+-]?\d+)/i)));
 set('reflexDefense',choose(num(d.reflex),match(f.defensesAsPrinted,/\bRef\s*(\d+)/i)));
 set('flatFooted',choose(num(d.flatFootedReflex),match(f.defensesAsPrinted,/flat[ -]footed\s*(\d+)/i)));
 set('fortitudeDefense',choose(num(d.fortitude),match(f.defensesAsPrinted,/\bFort\s*(\d+)/i)));
 set('damageThreshold',choose(num(h.threshold),match(f.hitPointsAndShieldsAsPrinted,/Threshold\s*([\d,]+)/i)));
 set('damageReduction',choose(num(h.damageReduction),match(f.hitPointsAndShieldsAsPrinted,/\bDR\s*([\d,]+)/i)));
 const hp=choose(num(h.hitPoints),match(f.hitPointsAndShieldsAsPrinted,/\bhp\s*([\d,]+)/i));if(hp!==undefined){sys.hp={value:hp,max:hp,temp:0};sys.hull={value:hp,max:hp,temp:0}}
 const sr=choose(num(d.shieldRating),match(f.hitPointsAndShieldsAsPrinted,/\bSR\s*([\d,]+)/i));
 if(sr!==undefined){sys.shields={value:sr,max:sr};sys.shieldRating=sr;sys.currentSR=sr;sys.vehicleHasShields=sr>0}
 const attrs={};for(const [short,long] of [['str','strength'],['dex','dexterity'],['int','intelligence']]){const n=num(choose(a[long],a[short]));if(n!==undefined)attrs[short]={base:n,racial:0,temp:0}}
 if(Object.keys(attrs).length)sys.attributes=attrs;
 const mv=f.movement??{};set('characterScaleSpeed',num(mv.characterScaleFlySquares));set('starshipScaleSpeed',num(mv.starshipScaleFlySquares));
 const raw=f.speedAsPrinted??mv.printed;if(raw)sys.vehicleMovementRaw=raw;
 if(sys.characterScaleSpeed!==undefined)sys.speed='Fly '+sys.characterScaleSpeed+' squares';
 if(sys.starshipScaleSpeed!==undefined)sys.starshipSpeed='Fly '+sys.starshipScaleSpeed+' squares';
 set('crew',f.crewAsPrinted??(typeof f.crew==='string'?f.crew:f.crewAndPassengers));
 set('passengers',f.passengersAsPrinted??(typeof f.passengers==='string'||typeof f.passengers==='number'?String(f.passengers):undefined));
 set('cargo',f.cargoAsPrinted??(typeof f.cargo==='string'?f.cargo:undefined));
 set('consumables',f.consumablesAsPrinted??f.consumables);
 set('vehicleHyperdriveLabel',f.hyperdriveAsPrinted??f.hyperdrive);
 const missing=['initiative','reflexDefense','flatFooted','fortitudeDefense','hp','damageThreshold'].filter(k=>sys[k]===undefined);sys.vehicleCanonicalMissingFields=missing;
 return {_id:r._id,name:r.name,type:'vehicle',img:'icons/svg/mystery-man.svg',system:sys,
  flags:{swse:{canonicalPublication:{sourceEntryKey:r.sourceEntryKey,sourceBook:r.sourceBook,printedPage:r.printedPage,sourcePdfSha256:r.sourcePdfSha256,
  originalPrintedFacts:r.printedFacts,approvedEffectiveFacts:r.approvedEffectiveFacts??null,attackRows:r.approvedAttackGroups??r.sourceAttackGroups,
  sourceConflicts:r.sourceConflicts,missingFields:missing,physicalMountCertified:false,foundryStockAttackTrusted:false}}},
  effects:[],folder:null,sort:0,ownership:{default:0}};
}
export function build(text){return parseShips(text).map(r=>JSON.stringify(toActor(r))).join('\n')+'\n'}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const src=readFileSync(join(ROOT,SOURCE),'utf8'),output=join(ROOT,OUTPUT),expected=build(src);
 if(process.argv.includes('--write'))writeFileSync(output,expected);
 else if(process.argv.includes('--check')){if(readFileSync(output,'utf8')!==expected)fail('DB_DRIFT')}
 else fail('USE_WRITE_OR_CHECK');
 console.log('PASS 316 one-line ship sources -> 316 one-line .db Actor records');
}
