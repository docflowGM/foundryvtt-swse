#!/usr/bin/env node
// Compile canonical Actor .db JSONL into Foundry V13 LevelDB; verify round-trip.
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,readdirSync,rmSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseShips,toActor,SOURCE} from './build-canonical-ships.mjs';
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const fail=s=>{throw Error('SHIP_LEVELDB_'+s)};
const get=k=>{const i=process.argv.indexOf(k);return i<0?null:process.argv[i+1]};
export async function buildNative({cliRoot,out,repoRoot=root}){
 if(!cliRoot||!out)fail('CLI_ROOT_AND_OUT_REQUIRED');
 const dest=resolve(out),src=resolve(repoRoot);
 if(dest===src||dest.startsWith(src+'/')||existsSync(dest))fail('OUTPUT_MUST_BE_ABSENT_OUTSIDE_REPO');
 const base=join(resolve(cliRoot),'@foundryvtt','foundryvtt-cli');
 if(JSON.parse(readFileSync(join(base,'package.json'),'utf8')).version!=='3.0.5')fail('PIN_CLI_3_0_5');
 const {compilePack,extractPack}=await import(pathToFileURL(join(base,'index.mjs')).href);
 const entries=parseShips(readFileSync(join(src,SOURCE),'utf8')).map(toActor);
 const expected=new Map(entries.map(a=>[a._id,a]));
 const tmp=mkdtempSync(join(tmpdir(),'swse-ship-native-'));let success=false;
 try{
  const stage=join(tmp,'source'),extracted=join(tmp,'extracted');mkdirSync(stage);mkdirSync(extracted);
  for(const actor of entries)writeFileSync(join(stage,actor._id+'.json'),JSON.stringify({...actor,_key:'!actors!'+actor._id})+'\n');
  await compilePack(stage,dest,{log:false});
  await extractPack(dest,extracted,{log:false});
  const files=readdirSync(extracted).filter(f=>f.endsWith('.json'));if(files.length!==316)fail('READBACK_COUNT_'+files.length);
  const seen=new Set();
  for(const file of files){
   const actor=JSON.parse(readFileSync(join(extracted,file),'utf8')),original=expected.get(actor._id);
   if(!original||seen.has(actor._id))fail('READBACK_ID');seen.add(actor._id);
   for(const field of ['_id','name','type','img','system','flags'])
    if(JSON.stringify(actor[field])!==JSON.stringify(original[field]))fail('READBACK_DRIFT_'+actor._id+'_'+field);
   if(actor.system.weapons.length||actor.flags.swse.canonicalPublication.foundryStockAttackTrusted!==false)fail('UNTRUSTED_MOUNT');
  }
  success=true;return {count:files.length,verified:true,stockWeaponsInstalled:0};
 }finally{rmSync(tmp,{recursive:true,force:true});if(!success)rmSync(dest,{recursive:true,force:true})}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await buildNative({cliRoot:get('--cli-root'),out:get('--out')})))}catch(e){console.error(e.stack);process.exitCode=1}
}
