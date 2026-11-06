#!/usr/bin/env node
/**
 * CP23-B isolated Foundry CLI LevelDB round-trip.
 *
 * Uses official pinned @foundryvtt/foundryvtt-cli 3.0.5.
 * ALL outputs live in a newly created OS temp directory and are discarded.
 * Does not modify the system manifest, release builder, source packs, world
 * actors, trusted weapon registry or installed game data.
 */
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,readdirSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {buildCP23BProposals} from './build_sotg_cp23b_proposals.mjs';
const fail=(s)=>{throw Error(s);};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const root=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const arg=n=>{const i=process.argv.indexOf(n);return i<0?null:process.argv[i+1];};
const cliRoot=arg('--cli-root');
if(!cliRoot)fail('PINNED_FOUNDRY_CLI_ROOT_REQUIRED');
const cli=join(resolve(cliRoot),'@foundryvtt','foundryvtt-cli');
const entry=join(cli,'index.mjs');
if(!existsSync(entry))fail('PINNED_FOUNDRY_CLI_NOT_INSTALLED');
const version=JSON.parse(readFileSync(join(cli,'package.json'),'utf8')).version;
if(version!=='3.0.5')fail('FROZEN_FOUNDRY_CLI_VERSION_REQUIRED');
const {compilePack,extractPack}=await import(pathToFileURL(entry).href);
if(typeof compilePack!=='function'||typeof extractPack!=='function')
  fail('OFFICIAL_FOUNDRY_CLI_API_UNAVAILABLE');
const catalog=buildCP23BProposals({repoRoot:root});
if(catalog.releaseDeploymentPermitted!==false||
  catalog.canonicalPackBindingsAuthenticated!==0||
  catalog.physicalMountCertificationsIssued!==0||
  catalog.trustedStockAttacksAdded!==0||
  catalog.proposals.length!==15)
    fail('PROPOSAL_AUTHORITY_CHANGED');
const system=JSON.parse(readFileSync(join(root,'system.json'),'utf8'));
if(system.packs?.some(p=>p.name===catalog.proposedPackId))
  fail('ISOLATED_AUDIT_PACK_WAS_REGISTERED_FOR_RELEASE');
const temp=mkdtempSync(join(tmpdir(),'sotg-cp23b-roundtrip-'));
try{
  const stage=join(temp,'source');
  const compiled=join(temp,'isolated-native-leveldb');
  const extracted=join(temp,'extracted');
  mkdirSync(stage,{recursive:true});
  mkdirSync(extracted,{recursive:true});
  const indexed=new Map();
  for(const proposal of catalog.proposals){
    if(proposal.draftState!=='NOT_DEPLOYABLE_SOURCE_PROPOSAL_ONLY'||
      proposal.installedWeaponsCertified!==0||
      proposal.stockAttackTrusted!==false||
      proposal.draftActor.system.weapons.length!==0)
      fail('DEPLOYMENT_OR_WEAPON_AUTHORITY_NOT_ALLOWED');
    const actor=proposal.draftActor;
    if(!/^[A-Za-z0-9]{16}$/.test(actor._id)||indexed.has(actor._id))
      fail('DUPLICATE_OR_INVALID_DRAFT_DOCUMENT_ID');
    indexed.set(actor._id,actor);
    writeFileSync(join(stage,actor._id+'.json'),
      JSON.stringify({...actor,_key:'!actors!'+actor._id})+'\n','utf8');
  }
  await compilePack(stage,compiled,{log:false});
  await extractPack(compiled,extracted,{log:false});
  const all=readdirSync(extracted).filter(p=>p.endsWith('.json'));
  if(all.length!==15)fail('NATIVE_ROUNDTRIP_COUNT_MISMATCH:'+all.length);
  const fields=['_id','name','type','img','system.model','system.sourcebook',
    'system.page','system.initiative','system.reflexDefense',
    'system.flatFooted','system.fortitudeDefense','system.shields',
    'system.shieldRating','system.hp','system.damageReduction',
    'system.damageThreshold','system.attributes','system.weapons',
    'system.vehicleArmamentSourceStatus'];
  const get=(doc,p)=>p.split('.').reduce((z,k)=>z?.[k],doc);
  for(const name of all){
    const doc=JSON.parse(readFileSync(join(extracted,name),'utf8'));
    const prior=indexed.get(doc._id);
    if(!prior)fail('EXTRACTED_UNKNOWN_DOCUMENT_ID');
    for(const field of fields){
      if(!eq(get(prior,field),get(doc,field)))
        fail('NATIVE_PROPOSAL_FIELD_DRIFT:'+doc._id+':'+field);
    }
    if(doc.system.weapons?.length!==0||
      Object.hasOwn(doc.system,'stockSourceEntryKey'))
      fail('UNSAFE_INSTALLED_WEAPON_OR_SPOOFED_SOURCE_KEY');
  }
  console.log('PASS CP23-B: 15 isolated draft Actor LevelDB roundtrips through pinned official Foundry CLI 3.0.5');
  console.log('PASS CP23-B: no registered/released pack; no live Foundry runtime verification or trusted stock attacks');
}finally{
  rmSync(temp,{recursive:true,force:true});
}
