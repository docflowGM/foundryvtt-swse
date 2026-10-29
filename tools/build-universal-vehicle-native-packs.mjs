#!/usr/bin/env node
/**
 * Phase 4B native Foundry V13 Actor compendiums.
 * Pinned CLI (@foundryvtt/foundryvtt-cli 3.0.5) and classic-level are installed
 * with "npm ci --prefix tools/release". Build products are disposable directories
 * and MUST be verified before registration. No world Actors are created.
 *
 * node tools/build-universal-vehicle-native-packs.mjs --out build/vehicle-phase4b/native
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {buildUniversalVehiclePackSources} from './build-universal-vehicle-pack-sources.mjs';
import {prepareDocuments,expectedReadBack,EMBEDDED} from './release/pack-sources.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const canonical=v=>JSON.stringify(v,(k,x)=>x&&typeof x==='object'&&!Array.isArray(x)
  ?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a<b?-1:a>b?1:0)):x);
const same=(a,b)=>canonical(a)===canonical(b);

async function loadNativeCompiler(){
  const require=createRequire(path.join(root,'tools/release/package.json'));
  let cli,level;
  try{
    cli=await import(require.resolve('@foundryvtt/foundryvtt-cli'));
    level=await import(require.resolve('classic-level'));
  }catch(e){throw new Error('Missing pinned native pack dependencies. Run npm ci --prefix tools/release. '+e.message);}
  if(typeof cli.compilePack!=='function'||typeof level.ClassicLevel!=='function')
    throw new Error('Native compiler or LevelDB API unavailable');
  return {compilePack:cli.compilePack,ClassicLevel:level.ClassicLevel};
}
async function readBack(db,collection,id){
  const sub=async(segment,key)=>{
    const value=await db.get('!'+segment+'!'+key);
    if(value===undefined)return undefined;
    const leaf=segment.split('.').at(-1);
    for(const child of EMBEDDED[leaf]??[]){
      if(!Array.isArray(value[child]))continue;
      value[child]=await Promise.all(value[child].map(childId=>sub(segment+'.'+child,key+'.'+childId)));
    }
    return value;
  };
  return sub(collection,id);
}

export async function buildUniversalVehicleNativePacks({out}={}){
  if(!out)throw new Error('--out <path> is required');
  const {output,manifest}=buildUniversalVehiclePackSources(root);
  const {compilePack,ClassicLevel}=await loadNativeCompiler();
  const destination=path.resolve(out);
  const work=fs.mkdtempSync(path.join(os.tmpdir(),'swse-vehicle-phase4b-'));
  const report=[];
  try{
    for(const [name,docs] of output){
      const staged=path.join(work,name);
      fs.mkdirSync(staged,{recursive:true});
      const prepared=prepareDocuments(docs,'actors');
      if(prepared.problems.length)throw new Error(name+': '+prepared.problems.join('; '));
      if(prepared.docs.length!==manifest.packs[name].documents)throw new Error(name+': proposal count drift');
      for(const actor of prepared.docs)fs.writeFileSync(path.join(staged,actor._id+'.json'),JSON.stringify(actor));
      const target=path.join(destination,'packs',name);
      fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.rmSync(target,{recursive:true,force:true});
      await compilePack(staged,target);
      const db=new ClassicLevel(target,{keyEncoding:'utf8',valueEncoding:'json',createIfMissing:false});
      await db.open();
      try{
        const actual=new Set(await db.keys().all());
        if(actual.size!==prepared.keys.size||[...prepared.keys].some(k=>!actual.has(k)))
          throw new Error(name+': native LevelDB key-set mismatch');
        for(const actor of prepared.docs){
          const back=await readBack(db,'actors',actor._id);
          if(!same(back,expectedReadBack(actor,'actors')))
            throw new Error(name+': native readback mismatch for '+actor._id);
        }
      }finally{await db.close();}
      for(const file of ['LOG','LOG.old'])fs.rmSync(path.join(target,file),{force:true});
      if(!fs.existsSync(path.join(target,'CURRENT')))throw new Error(name+': missing native CURRENT file');
      report.push({pack:name,actors:docs.length,verifiedKeys:prepared.keys.size,path:'packs/'+name});
    }
  }finally{fs.rmSync(work,{recursive:true,force:true});}
  if(report.length!==11||report.reduce((sum,x)=>sum+x.actors,0)!==429)
    throw new Error('Phase 4B native total mismatch');
  const receipt={schema:'swse.vehicle.universal.phase4b.native-readback.v1',
    inputManifest:manifest,
    nativePacks:report,
    verifiedSourceActors:429,
    registeredInSystemManifest:false,
    liveFoundrySmokeTested:false,
    worldActorsCreated:0
  };
  fs.writeFileSync(path.join(destination,'vehicle-phase4b-native-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  return receipt;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--out'){console.error('Usage: node tools/build-universal-vehicle-native-packs.mjs --out <path>');process.exitCode=2;}
  else buildUniversalVehicleNativePacks({out:args[1]}).then(x=>console.log(JSON.stringify({packs:x.nativePacks.length,actors:x.verifiedSourceActors,receipt:path.resolve(args[1],'vehicle-phase4b-native-receipt.json')},null,2))).catch(e=>{console.error(e.stack??e);process.exitCode=1;});
}
