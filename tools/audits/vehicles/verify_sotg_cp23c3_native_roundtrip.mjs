#!/usr/bin/env node
/**
 * CP23-C3: pinned official Foundry CLI 3.0.5 native LevelDB round-trip
 * of FIFTEEN staged, UNREGISTERED source Actor documents.
 * Compiles and extracts into fresh OS temp dirs only. No deploy mode.
 */
import {readFileSync,readdirSync,mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {buildCP23C3SourceStage,STAGE,STAGE_PACK_NAME}
  from './build_sotg_cp23c3_native_stage.mjs';

const invariant=(a,s)=>{if(!a)throw Error(s);};
const root=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const pos=process.argv.indexOf('--cli-root');
invariant(pos>=0&&process.argv[pos+1],'PINNED_FOUNDRY_CLI_ROOT_REQUIRED');
const cli=join(resolve(process.argv[pos+1]),'@foundryvtt','foundryvtt-cli');
const version=JSON.parse(readFileSync(join(cli,'package.json'),'utf8')).version;
invariant(version==='3.0.5','PINNED_FOUNDRY_CLI_VERSION_CHANGED');
const {compilePack,extractPack}=await import(pathToFileURL(join(cli,'index.mjs')).href);
invariant(typeof compilePack==='function'&&typeof extractPack==='function',
  'OFFICIAL_NATIVE_CLI_API_UNAVAILABLE');
const {manifest,documents}=buildCP23C3SourceStage();
const sys=JSON.parse(readFileSync(join(root,'system.json'),'utf8'));
invariant(!sys.packs?.some(p=>p.name===STAGE_PACK_NAME),
  'STAGED_SOURCE_PACK_REGISTERED_WITH_RELEASE');
invariant(manifest.released===false&&manifest.registeredInSystemJson===false&&
  manifest.physicalMountCertificates===0&&manifest.stockAttackPermissions===0&&
  manifest.durableGMReceiptsIssued===0,'AUDIT_AUTHORITY_ESCALATION');
invariant(documents.size===15,'EXPECTED_FIFTEEN_DRAFTS');
for(const [file,source] of documents)
  invariant(readFileSync(join(root,file),'utf8')===source,
    'SOURCE_STAGE_BYTES_CHANGED_BEFORE_PACK_COMPILE:'+file);
const temp=mkdtempSync(join(tmpdir(),'swse-cp23c3-native-'));
try{
  const compiled=join(temp,'unregistered-compiled-leveldb');
  const extracted=join(temp,'extracted');
  mkdirSync(extracted,{recursive:true});
  await compilePack(join(root,STAGE),compiled,{log:false});
  await extractPack(compiled,extracted,{log:false});
  const files=readdirSync(extracted).filter(x=>x.endsWith('.json'));
  invariant(files.length===15,'ROUNDTRIP_PACK_COUNT_CHANGED');
  const originals=new Map([...documents.values()].map(x=>{const o=JSON.parse(x);return[o._id,o];}));
  const ids=new Set();
  for(const file of files){
    const actor=JSON.parse(readFileSync(join(extracted,file),'utf8'));
    const original=originals.get(actor._id);
    invariant(original,'UNKNOWN_NATIVE_ACTOR_ID');
    invariant(!ids.has(actor._id),'DUPLICATE_NATIVE_ACTOR_ID');
    ids.add(actor._id);
    for(const key of ['_id','name','type','img','system']){
      invariant(JSON.stringify(actor[key])===JSON.stringify(original[key]),
        'NATIVE_ROUNDTRIP_ACTOR_DRIFT:'+actor._id+':'+key);
    }
    invariant(actor.type==='vehicle'&&actor.system.weapons?.length===0&&
      !Object.hasOwn(actor.system,'stockSourceEntryKey'),
      'NATIVE_PACK_GRANTED_UNVERIFIED_WEAPON_AUTHORITY');
  }
  invariant(ids.size===15,'ROUNDTRIP_INCOMPLETE');
  for(const [file,source] of documents)
    invariant(readFileSync(join(root,file),'utf8')===source,
      'SOURCE_STAGE_MUTATED_BY_NATIVE_CLI:'+file);
  console.log('PASS CP23-C3: 15 pinned, unarmed staging Actors round-trip via official native Foundry CLI 3.0.5');
  console.log('PASS CP23-C3: no registration, release, world Actor, GM receipt or stock attack authorization');
}finally{
  rmSync(temp,{recursive:true,force:true});
}
