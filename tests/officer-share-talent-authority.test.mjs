import test from 'node:test';
import assert from 'node:assert/strict';
import {
  eligibleOfficerShareTalents, resolveOfficerShareTalentChoice,
} from '../scripts/engine/progression/utils/officer-share-talent-authority.js';

const owned = (id,name='') => ({
  type:'talent',name:name||id,flags:{core:{sourceId:`Compendium.foundryvtt-swse.talents.Item.${id}`}},
});
const talents = new Map([['influence1',{id:'influence1',name:'Influence Gift'}],
 ['military1',{id:'military1',name:'Tactical Shift'}],
 ['scoundrel1',{id:'scoundrel1',name:'Illegal Talent'}]]);
const talentDB={isBuilt:true,get:id=>talents.get(id)};
const trees=[{id:'influence',name:'Influence'},
 {id:'military-tactics',name:'Military Tactics'},{id:'scoundrel',name:'Misfortune'}];
const treeDB={isBuilt:true,all:()=>trees,getTreeIdsForTalentId:id=>
 ({influence1:['influence'],military1:['military-tactics'],scoundrel1:['scoundrel']})[id]||[]};
const actor=(items,sharedTalents=[])=>({items,flags:{swse:{classFeatures:{officer:{sharedTalents}}}}});

test('only canonically-owned, source-resolved talents in published eligible trees are offered',()=>{
  const options=eligibleOfficerShareTalents(actor([
    owned('influence1'),owned('military1'),owned('scoundrel1'),
    {type:'talent',name:'Influence Gift',_id:'fake-with-no-source'},
    {type:'feat',flags:{core:{sourceId:'Compendium.foundryvtt-swse.talents.Item.influence1'}}},
  ]),talentDB,treeDB);
  assert.deepEqual(new Set(options.map(o=>o.talentId)),new Set(['influence1','military1']));
  assert.deepEqual(eligibleOfficerShareTalents(actor([owned('influence1')]),{isBuilt:false},treeDB),[]);
});

test('valid choice is normalized from the canonical registries, not player-supplied labels',()=>{
 const a=actor([owned('influence1')]);
 const r=resolveOfficerShareTalentChoice({actor:a,officerLevel:2,
  choice:{talentId:'influence1',talentName:'Spoofed',treeName:'Inspiration'},talentDB,treeDB});
 assert.equal(r.valid,true);
 assert.deepEqual(r.selection,{officerLevel:2,talentId:'influence1',talentName:'Influence Gift',treeId:'influence',treeName:'Influence'});
});

test('reject unowned, ineligible, duplicate, out-of-cadence and already-finalized picks',()=>{
 const a=actor([owned('influence1'),owned('military1'),owned('scoundrel1')],
 [{officerLevel:2,talentId:'influence1'}]);
 for(const [talentId,level] of [['influence1',4],['scoundrel1',4],['not-owned',4],['military1',3],['military1',2],['military1',12]]){
   const r=resolveOfficerShareTalentChoice({actor:a,officerLevel:level,choice:{talentId},talentDB,treeDB});
   assert.equal(r.valid,false,`${talentId}@${level}`);
 }
 assert.equal(resolveOfficerShareTalentChoice({actor:a,officerLevel:4,choice:{talentId:'military1'},talentDB,treeDB}).valid,true);
});
