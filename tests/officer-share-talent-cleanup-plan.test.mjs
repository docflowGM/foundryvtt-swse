import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildOfficerShareTalentGrant} from '../scripts/engine/combat/officer-share-talent-grant-plan.js';
import {planOfficerShareTalentExpiry} from '../scripts/engine/combat/officer-share-talent-cleanup-plan.js';

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
 assert.deepEqual(planOfficerShareTalentExpiry({actor,encounterId:'enc-A'}),{
   items:[],effects:[],
 });
});

test('runtime cleanup submits effects before Items to one transactional ActorEngine plan',()=>{
 const service=fs.readFileSync(path.join(ROOT,'scripts/engine/combat/officer-share-talent-service.js'),'utf8');
 assert.match(service,/planOfficerShareTalentExpiry\(\{actor,encounterId:combatId\}\)/);
 assert.match(service,/delete:\{effects:expiry\.effects,items:expiry\.items\}/);
 assert.match(service,/source:'OfficerShareTalentService\.expireEncounter',transactional:true/);
});
