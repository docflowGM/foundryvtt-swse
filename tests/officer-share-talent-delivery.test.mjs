import test from 'node:test';
import assert from 'node:assert/strict';
import {buildOfficerShareTalentGrant,ownOfficerTalentItem,isOfficerSharedTalentPrerequisiteWaived} from '../scripts/engine/combat/officer-share-talent-grant-plan.js';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const officer={id:'O',items:[{
 _id:'original',id:'original',type:'talent',name:'Influence Gift',
 system:{talentSourceId:'T123',benefit:'Canonical ability'},
 flags:{core:{sourceId:'Compendium.foundryvtt-swse.talents.Item.T123'}},
 toObject(){return {_id:this._id,type:this.type,name:this.name,
  system:{...this.system},flags:JSON.parse(JSON.stringify(this.flags)),effects:[]};},
}]};
const selection={officerLevel:2,talentId:'T123',treeId:'influence'};
const recipient={id:'A',items:[]};
test('temporary Share Talent clones actual canonical talent and retains provenance, without modifying source',()=>{
 const item=ownOfficerTalentItem(officer,'T123');
 const result=buildOfficerShareTalentGrant({
  officer,recipient,talent:item,selection,encounterId:'enc',day:15,
 });
 assert.equal(result.type,'talent');
 assert.equal(result.name,'Influence Gift');
 assert.equal(result.system.benefit,'Canonical ability');
 assert.equal(result.system.sourceType,'officer-share-talent');
 assert.equal(result.system.prerequisiteWaivedBy,'officer.shareTalent');
 assert.equal(result.flags.core.sourceId,'Compendium.foundryvtt-swse.talents.Item.T123');
 assert.deepEqual(result.flags.swse.officerSharedTalent,{
  sourceOfficerId:'O',talentId:'T123',officerLevel:2,
  encounterId:'enc',day:15,expires:'end-of-encounter',temporary:true,
 });
 assert.equal(result._id,undefined);
 assert.equal(item._id,'original');
});
test('only complete temporary Officer Share Talent provenance waives recipient prerequisites',()=>{
 const item=buildOfficerShareTalentGrant({
   officer,recipient,talent:officer.items[0],selection,encounterId:'enc',day:15,
 });
 assert.equal(isOfficerSharedTalentPrerequisiteWaived(item),true);
 for(const edited of [
   {...item,system:{...item.system,sourceType:'ordinary-talent'}},
   {...item,system:{...item.system,prerequisiteWaivedBy:null}},
   {...item,system:{...item.system,talentSourceId:'different'}},
   {...item,system:{...item.system,temporary:false}},
   {...item,flags:{swse:{officerSharedTalent:{...item.flags.swse.officerSharedTalent,encounterId:''}}}},
   {...item,flags:{swse:{officerSharedTalent:{...item.flags.swse.officerSharedTalent,officerLevel:0}}}},
   {...item,type:'feat'},
 ]) assert.equal(isOfficerSharedTalentPrerequisiteWaived(edited),false);
 const checker=fs.readFileSync(path.join(ROOT,'scripts/governance/integrity/prerequisite-integrity-checker.js'),'utf8');
 assert.match(checker,/isOfficerSharedTalentPrerequisiteWaived\(item\)/);
});

test('never duplicate the same canonically owned talent for an ally',()=>{
 const withTalent={id:'B',items:[{type:'talent',system:{talentSourceId:'T123'}}]};
 assert.equal(buildOfficerShareTalentGrant({officer,recipient:withTalent,
  talent:officer.items[0],selection,encounterId:'enc',day:15}),null);
 assert.throws(()=>ownOfficerTalentItem({...officer,items:[]},'T123'),/not uniquely owned/);
});
test('a temporary borrowed talent cannot become the Officer source for another Share Talent',()=>{
 const borrowed=buildOfficerShareTalentGrant({
   officer,recipient,talent:officer.items[0],selection,encounterId:'enc',day:15,
 });
 const officerWithBorrowed={id:'officer2',items:[{
   ...borrowed,id:'borrowed',toObject:()=>borrowed,
 }]};
 assert.throws(()=>ownOfficerTalentItem(officerWithBorrowed,'T123'),/not uniquely owned/);
});
test('encounter cleanup is registered and temporary talent items use ActorEngine, not direct Item mutations',()=>{
 const index=fs.readFileSync(path.join(ROOT,'index.js'),'utf8');
 const service=fs.readFileSync(path.join(ROOT,'scripts/engine/combat/officer-share-talent-service.js'),'utf8');
 const dialog=fs.readFileSync(path.join(ROOT,'scripts/apps/officer-share-talent-dialog.js'),'utf8');
 assert.match(index,/registerOfficerShareTalentCleanup\(\)/);
 assert.match(index,/officerShareTalent:\s*\{ open: openOfficerShareTalentAction/);
 assert.match(service,/Hooks\.on\('deleteCombat'/);
 assert.match(service,/Hooks\.on\('updateCombat'/);
 assert.match(service,/Hooks\.once\?\.\('ready'/);
 assert.match(service,/ActorEngine\.restoreSnapshotVerified\(/);
 assert.match(service,/touched\.push\(entry\.actor\);\s*await ActorEngine\.applyMutationPlan\(entry\.actor/);
 assert.match(service,/touched\.push\(officer\);\s*await ActorEngine\.applyMutationPlan\(officer/);
 assert.match(service,/\[\.\.\.touched\]\.reverse\(\)/);
 assert.match(service,/transactional:true/);
 assert.match(service,/ActionEconomyConsumption\.spend\(officer,'standard'/);
 assert.match(service,/spent\?\.committed!==true/);
 assert.doesNotMatch(service,/combatant\.useAction\(/);

 assert.match(service,/delete:\{effects:expiry\.effects,items:expiry\.items\}/);
 assert.match(dialog,/confirmedSenses/);
 assert.match(dialog,/distanceSquares/);
});
