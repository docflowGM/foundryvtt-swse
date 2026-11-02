import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildOfficerShareTalentGrant,uniqueOfficerShareTalentActors} from '../scripts/engine/combat/officer-share-talent-grant-plan.js';
import {planOfficerShareTalentExpiry,executeOfficerShareTalentExpiry} from '../scripts/engine/combat/officer-share-talent-cleanup-plan.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const officer={id:'officer',name:'Officer'};
const talent={type:'talent',name:'Tactics',system:{talentSourceId:'talent-1'},
 flags:{core:{sourceId:'Compendium.foundryvtt-swse.talents.Item.talent-1'}}};
const selection={officerLevel:2,talentId:'talent-1'};
function grant(id,encounterId) {
 return {...buildOfficerShareTalentGrant({officer,recipient:{id:'ally'},talent,
   selection,encounterId,day:15}),id};
}
const effect=(id,itemId,scope='foundryvtt-swse')=>({
 id,flags:{[scope]:{talentEffect:{talentItemId:itemId,talentName:'Tactics'}}},
});

test('expiry removes matching temporary talent and only its linked ActiveEffects',()=>{
 const a=grant('shared-A','enc-A'),b=grant('shared-B','enc-B');
 const permanent={id:'permanent',type:'talent',name:'Tactics',system:{talentSourceId:'talent-1'}};
 const actor={id:'ally',items:[a,b,permanent],effects:[
   effect('effect-A','shared-A'),effect('effect-B','shared-B'),
   effect('effect-permanent','permanent'),effect('unrelated','other'),
 ]};
 assert.deepEqual(planOfficerShareTalentExpiry({actor,encounterId:'enc-A'}),{
   items:['shared-A'],effects:['effect-A'],
 });
 assert.deepEqual(planOfficerShareTalentExpiry({actor,encounterId:'enc-B'}),{
   items:['shared-B'],effects:['effect-B'],
 });
 assert.deepEqual(planOfficerShareTalentExpiry({actor,encounterId:'enc-C'}),{
   items:[],effects:[],
 });
});

test('expiry refuses incomplete or ambiguous Item and effect identities',()=>{
 const item=grant('shared-A','enc-A');
 assert.throws(()=>planOfficerShareTalentExpiry({
   actor:{id:'ally',items:[{...item,id:null}],effects:[]},encounterId:'enc-A',
 }),/ambiguous Item identities/);
 assert.throws(()=>planOfficerShareTalentExpiry({
   actor:{id:'ally',items:[item,item],effects:[]},encounterId:'enc-A',
 }),/ambiguous Item identities/);
 assert.throws(()=>planOfficerShareTalentExpiry({
   actor:{id:'ally',items:[item],effects:[effect('fx','shared-A'),effect('fx','shared-A')]},
   encounterId:'enc-A',
 }),/ambiguous effect identities/);
 assert.throws(()=>planOfficerShareTalentExpiry({actor:{id:'ally',items:[item]},
   encounterId:''}),/encounter identity/);
});

test('spoofed or incomplete temporary provenance is not an expiry authority',()=>{
 const item=grant('shared-A','enc-A');
 const fake={...item,system:{...item.system,prerequisiteWaivedBy:null}};
 const actor={id:'ally',items:[fake],effects:[effect('fx','shared-A')]};
 assert.throws(()=>planOfficerShareTalentExpiry({actor,encounterId:'enc-A'}),
   /INDETERMINATE: malformed temporary grant requires GM review/);
});

test('cleanup preserves distinct synthetic token actors sharing a base world Actor ID',()=>{
 const world={id:'same',uuid:'Actor.same'};
 const token1={id:'same',uuid:'Scene.first.Token.t1.Actor.same'};
 const token2={id:'same',uuid:'Scene.second.Token.t2.Actor.same'};
 const observed=uniqueOfficerShareTalentActors([world,token1,token2,world,token1]);
 assert.deepEqual(observed,[world,token1,token2]);
 const service=fs.readFileSync(path.join(ROOT,'scripts/engine/combat/officer-share-talent-service.js'),'utf8');
 assert.match(service,/const uniqueActors=uniqueOfficerShareTalentActors/);
});

test('runtime cleanup submits effects before Items to one transactional ActorEngine plan',()=>{
 const service=fs.readFileSync(path.join(ROOT,'scripts/engine/combat/officer-share-talent-service.js'),'utf8');
 assert.match(service,/executeOfficerShareTalentExpiry\(/);
 const helper=fs.readFileSync(path.join(ROOT,'scripts/engine/combat/officer-share-talent-cleanup-plan.js'),'utf8');
 assert.match(helper,/delete:\{effects:plan\.effects,items:plan\.items\}/);
 assert.match(helper,/source:'OfficerShareTalentService\.expireEncounter',transactional:true/);
});

test('cleanup continues to healthy actors after a malformed or failing recipient',async()=>{
 const bad={id:'bad',uuid:'Actor.bad',
   items:[{...grant('bad-shared','enc-A'),system:{temporary:false}}],
   effects:[]};
 const first={id:'first',items:[grant('item1','enc-A')],effects:[effect('effect1','item1')]};
 const second={id:'second',items:[grant('item2','enc-A')],effects:[effect('effect2','item2')]};
 const untouched={id:'untouched',items:[grant('item3','enc-B')],effects:[]};
 const applied=[];
 const result=await executeOfficerShareTalentExpiry({
   actors:[bad,first,second,untouched],encounterId:'enc-A',
   applyMutationPlan:async (actor,plan,opts)=>{
     assert.equal(opts.transactional,true);
     applied.push({id:actor.id,plan});
     if(actor.id==='first')throw new Error('simulated ActorEngine rollback');
   },
 });
 assert.equal(result.success,false);
 assert.deepEqual(applied.map(x=>x.id),['first','second']);
 assert.equal(result.expired.length,1);
 assert.equal(result.expired[0].actorId,'second');
 assert.equal(result.expired[0].effectsRemoved,1);
 assert.deepEqual(result.failures.map(x=>x.actorId),['bad','first']);
 assert.match(result.failures[0].reason,/INDETERMINATE/);
});
