/**
 * Phase 2C CP9B: build isolated v13 LevelDB ship packs from canonical JSONL.
 * Never writes into the source checkout or auto-deploys to a live installation.
 *
 * Requires the pinned official Foundry CLI (3.0.5) installed separately:
 *   node tools/audits/vehicles/build_phase2c_cp9b_native_packs.mjs \
 *     --cli-root /tmp/cli/node_modules --out /tmp/swse-vehicle-compiled
 *
 * The CLI compiles one serialized JSON file per Actor and extracts the
 * LevelDB result. This script checks exact document roster and the certified
 * four-source-ship projection after round trip, rather than assuming that a
 * successful LevelDB create call proves usable compendium content.
 */
import {readFileSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync,
  rmSync, existsSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

export const CP9B_PACKS=Object.freeze([
  {name:'vehicles-space-transports',source:'packs/vehicles-space-transports.db',
   expectedCount:108,pilotIds:['97c5c070d93b7a0a','4d5b3422047f5eb8','28f748f51896aa1b']},
  {name:'vehicles-capital-ships',source:'packs/vehicles-capital-ships.db',
   expectedCount:63,pilotIds:['18cd29422b66693d']}
]);
const fail=(code,details='')=>{throw new Error(code+(details?' '+details:''));};
const stable = value => {
  if(Array.isArray(value))return value.map(stable);
  if(value && typeof value==='object')
    return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
  return value;
};
const exact=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const sha=content=>createHash('sha256').update(content).digest('hex');
const gitBlob=raw=>createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex');
const fields=[
  '_id','name','type','system.sourcebook','system.page','system.stockSourceEntryKey',
  'system.stockSourceClaimVersion','system.attributes.str','system.attributes.dex',
  'system.attributes.int','system.hp','system.hull','system.hitPoints',
  'system.damageReduction','system.damageThreshold','system.reflexDefense',
  'system.fortitudeDefense','system.weapons','system.vehicleHasWeapons',
  'system.crew','system.crewQuality','system.vehicleCrewCount',
  'system.cargo','system.vehicleCargoKg','system.cost',
  'system.vehicleHasNavicomputer','system.carried_craft',
  'system.vehicleCarriedCraftRaw','system.vehicleHasCarriedCraft'
];
const readField=(doc,path)=>path.split('.').reduce((v,k)=>v?.[k],doc);
export function parsePackSource(text,{name,expectedCount,pilotIds}) {
  const lines=text.split(/\r?\n/).filter(x=>x.trim());
  const rows=lines.map((s,i)=>{
    let row;
    try{row=JSON.parse(s);}catch(e){fail('INVALID_JSONL',name+':line '+(i+1)+':'+e.message);}
    if(typeof row?._id!=='string'||!/^[a-zA-Z0-9_-]{8,64}$/.test(row._id)||
       row.type!=='vehicle'||!row.system)fail('INVALID_ACTOR_ROW',name+':line '+(i+1));
    return row;
  });
  if(rows.length!==expectedCount)fail('WRONG_PACK_DOCUMENT_COUNT',name+':'+rows.length);
  const index=new Map(rows.map(row=>[row._id,row]));
  if(index.size!==rows.length)fail('DUPLICATE_ACTOR_ID',name);
  for(const id of pilotIds)if(!index.has(id))fail('MISSING_PILOT_ID',name+':'+id);
  return {rows,index};
}
export function auditRoundTrip(source,roundTrip,spec) {
  const failures=[];
  const expectedIds=new Set(source.rows.map(x=>x._id));
  const actualIds=new Set(roundTrip.map(x=>x._id));
  if(actualIds.size!==roundTrip.length)failures.push('DUPLICATE_EXTRACTED_ID');
  if(roundTrip.length!==source.rows.length)failures.push('COUNT_MISMATCH');
  for(const id of expectedIds)if(!actualIds.has(id))failures.push('MISSING_ID:'+id);
  for(const id of actualIds)if(!expectedIds.has(id))failures.push('EXTRA_ID:'+id);
  const byId=new Map(roundTrip.map(x=>[x._id,x]));
  const pilotResults=[];
  for(const id of spec.pilotIds) {
    const prior=source.index.get(id),next=byId.get(id);
    if(!next){pilotResults.push({id,parity:false});continue;}
    const mismatched=fields.filter(path=>!exact(readField(prior,path),readField(next,path)));
    if(mismatched.length)failures.push(...mismatched.map(path=>'PILOT_FIELD_DRIFT:'+id+':'+path));
    pilotResults.push({id,parity:mismatched.length===0,fieldsCompared:fields.length,mismatched});
  }
  return {ok:failures.length===0,failures,sourceCount:source.rows.length,
    compiledCount:roundTrip.length,pilots:pilotResults};
}
export function stagePackSource({root='.',stageDir,spec}) {
  if(!stageDir)fail('STAGING_REQUIRED');
  const bytes=readFileSync(resolve(root,spec.source));
  const parsed=parsePackSource(bytes.toString('utf8'),spec);
  const files=join(stageDir,spec.name);
  mkdirSync(files,{recursive:true});
  for(const row of parsed.rows) {
    // The Foundry CLI deliberately ignores source files without a database
    // _key. For a top-level Actor document the canonical LevelDB key is
    // !actors!<id>. Inject it ONLY in the temporary build input. The
    // version-controlled NeDB JSONL remains unchanged.
    if(Object.prototype.hasOwnProperty.call(row,'_key'))
      fail('SOURCE_MUST_NOT_INCLUDE_COMPILED_DB_KEY',spec.name+':'+row._id);
    writeFileSync(join(files,row._id+'.json'),
      JSON.stringify({...row,_key:'!actors!'+row._id})+'\n','utf8');
  }
  return {parsed,files,sourceGitBlob:gitBlob(bytes),sourceSha256:sha(bytes)};
}
export function parseArgs(argv) {
  const get=flag=>{const i=argv.indexOf(flag);return i<0?null:argv[i+1];};
  return {root:get('--repo-root')??'.',out:get('--out'),
    cliRoot:get('--cli-root')};
}
export async function buildNativePacks({root='.',out,cliRoot}) {
  if(!cliRoot || !out)fail('CLI_ROOT_AND_OUTPUT_REQUIRED');
  const resolvedOut=resolve(out),resolvedRoot=resolve(root);
  if(resolvedOut===resolvedRoot||resolvedOut.startsWith(resolvedRoot+'/'))
    fail('OUTPUT_MUST_BE_OUTSIDE_SOURCE_CHECKOUT');
  if(existsSync(resolvedOut))fail('OUTPUT_EXISTS_NO_DESTRUCTIVE_OVERWRITE');
  const manifest=JSON.parse(readFileSync(join(resolvedRoot,'system.json'),'utf8'));
  const temp=mkdtempSync(join(tmpdir(),'swse-cp9b-stage-'));
  const cliEntry=join(resolve(cliRoot),'@foundryvtt','foundryvtt-cli','index.mjs');
  if(!existsSync(cliEntry))fail('PINNED_OFFICIAL_CLI_NOT_INSTALLED');
  try {
    const {compilePack,extractPack}=await import(pathToFileURL(cliEntry).href);
    if(typeof compilePack!=='function'||typeof extractPack!=='function')
      fail('OFFICIAL_CLI_PACK_API_MISSING');
    const packOutput=join(resolvedOut,'packs');
    mkdirSync(packOutput,{recursive:true});
    const results=[];
    for(const spec of CP9B_PACKS) {
      const declaration=manifest.packs?.find(p=>p.name===spec.name);
      if(declaration?.type!=='Actor'||declaration.path!=='packs/'+spec.name)
        fail('MANIFEST_PACK_IDENTITY_CHANGED',spec.name);
      const staged=stagePackSource({root:resolvedRoot,stageDir:temp,spec});
      const compiled=join(packOutput,spec.name);
      await compilePack(staged.files,compiled,{log:false});
      const extracted=join(temp,'roundtrip',spec.name);
      mkdirSync(extracted,{recursive:true});
      await extractPack(compiled,extracted,{log:false});
      const extractedFiles=readdirSync(extracted);
      const compiledFiles=readdirSync(compiled);
      const unpacked=extractedFiles.filter(f=>f.endsWith('.json')).map(f=>
        JSON.parse(readFileSync(join(extracted,f),'utf8')));
      const audit=auditRoundTrip(staged.parsed,unpacked,spec);
      console.log(JSON.stringify({cp9bBuildDiagnostic:spec.name,
        stageCount:staged.parsed.rows.length,compiledFiles:compiledFiles.slice(0,16),
        extractedCount:unpacked.length,extractedFiles:extractedFiles.slice(0,16),
        extractedIds:unpacked.slice(0,4).map(x=>x._id),
        auditFailures:audit.failures.slice(0,8)},null,2));
      if(!audit.ok)fail('ROUNDTRIP_PARITY_FAILURE',JSON.stringify({pack:spec.name,issues:audit.failures.slice(0,20)}));
      results.push({pack:spec.name,manifestPath:declaration.path,
        source:spec.source,sourceGitBlob:staged.sourceGitBlob,
        sourceSha256:staged.sourceSha256,...audit});
    }
    const report={
      schema:'swse.vehicle.phase2c.cp9b.native-compiled-pack-parity.v1',
      compiledWith:'@foundryvtt/foundryvtt-cli',cliPinnedVersion:'3.0.5',
      scope:'two pilot vehicle pack directories; not entire system release',
      sourceActorCount:results.reduce((n,x)=>n+x.sourceCount,0),
      pilotSourceClaims:results.reduce((n,x)=>n+x.pilots.length,0),
      nativePackRoundtripPassed:true,foundryRuntimePackReadbackPassed:false,
      worldActorProvenanceCertified:false,trustedStockAttackBindings:0,
      releaseDeploymentAuthorized:false,results
    };
    writeFileSync(join(resolvedOut,'cp9b-parity-report.json'),JSON.stringify(report,null,2)+'\n');
    return report;
  } catch(err) {
    rmSync(resolvedOut,{recursive:true,force:true});
    throw err;
  } finally {rmSync(temp,{recursive:true,force:true});}
}
const main=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(main){
  const args=parseArgs(process.argv.slice(2));
  try {
    const report=await buildNativePacks(args);
    console.log(JSON.stringify(report,null,2));
  } catch(err){console.error(err?.stack??err);process.exitCode=1;}
}
