import test from 'node:test';
import assert from 'node:assert/strict';
import {planOfficerShareTalentAction} from '../scripts/engine/combat/officer-share-talent-action-rules.js';
const selected=[{officerLevel:2,talentId:'canonical1',treeId:'influence'}];
const recipient=(id='ally',distance=10)=>({
 actorId:id,isAlly:true,distanceSquares:distance,canSeeOfficer:true,canHearOfficer:true,
});
const base={selections:selected,usesToday:[],talentId:'canonical1',officerLevel:4,encounterId:'encounter-1',recipients:[recipient()]};

test('Officer combat Share Talent preflight requires standard action, encounter, range and half-class-level ally cap',()=>{
 const r=planOfficerShareTalentAction({...base,recipients:[recipient('a'),recipient('b')]});
 assert.equal(r.ok,true);
 assert.equal(r.plan.actionType,'standard');
 assert.equal(r.plan.duration,'end-of-encounter');
 assert.equal(r.plan.waiveRecipientTalentPrerequisites,true);
 assert.deepEqual(r.plan.recipientActorIds,['a','b']);
 assert.equal(planOfficerShareTalentAction({...base,recipients:[recipient('a'),recipient('b'),recipient('c')]}).ok,false);
 assert.equal(planOfficerShareTalentAction({...base,recipients:[recipient('a',11)]}).ok,false);
});
test('Officer Share Talent action rejects already-spent daily use, unselected talent and invalid target senses',()=>{
 assert.equal(planOfficerShareTalentAction({...base,usesToday:[{talentId:'canonical1'}]}).ok,false);
 assert.equal(planOfficerShareTalentAction({...base,talentId:'other'}).ok,false);
 assert.equal(planOfficerShareTalentAction({...base,encounterId:null}).ok,false);
 assert.equal(planOfficerShareTalentAction({...base,recipients:[{...recipient(),canHearOfficer:false}]}).ok,false);
 assert.equal(planOfficerShareTalentAction({...base,recipients:[{...recipient(),canSeeOfficer:false}]}).ok,false);
 assert.equal(planOfficerShareTalentAction({...base,recipients:[recipient('a'),recipient('a')]}).ok,false);
 assert.equal(planOfficerShareTalentAction({...base,recipients:[{...recipient(),isAlly:false}]}).ok,false);
});
