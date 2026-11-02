import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateLevelUpRequiredSelections, auditLevelUpActorAfterFinalization } from '../scripts/engine/progression/utils/levelup-finalization-audit.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
const manifest=(level,share,talent)=>({className:'Officer',classLevel:level,characterLevel:level+6,
 choices:{talentChoices:talent,shareTalentChoices:share,classFeatChoices:0}});
const draft= selections => ({draftSelections:{feats:[],talents:[],shareTalentSelections:[],...selections}});

test('Officer even-level Share Talent cannot be satisfied by a newly acquired class talent',()=>{
 const m=manifest(2,1,0);
 for(const d of [draft(),draft({talents:[{id:'foo',name:'Not Shared'}]}),
                   draft({shareTalentSelections:[{talentId:'foo',officerLevel:4}]})]){
   const errs=validateLevelUpRequiredSelections(m,d);
   assert.ok(errs.some(x=>/Share Talent requires exactly one previously-owned/.test(x)),errs.join(';'));
 }
});

test('one separately typed selection at the correct Officer level passes the structural gate',()=>{
 const m=manifest(4,1,0);
 const d=draft({shareTalentSelections:[{officerLevel:4,talentId:'canonical-owned-id'}]});
 assert.deepEqual(validateLevelUpRequiredSelections(m,d),[]);
 d.draftSelections.shareTalentSelections.push({officerLevel:4,talentId:'second'});
 assert.ok(validateLevelUpRequiredSelections(m,d).some(x=>/Share Talent requires exactly one/.test(x)));
});

test('odd Officer levels still require an ordinary class talent with no Share Talent',()=>{
 const m=manifest(3,0,1);
 assert.ok(validateLevelUpRequiredSelections(m,draft()).some(x=>/Choose 1 talent/.test(x)));
 assert.deepEqual(validateLevelUpRequiredSelections(m,draft({talents:[{id:'x'}]})),[]);
});

test('finalizer must revalidate canonical owned identity and store only the share choice flag',()=>{
 const code=source('scripts/apps/progression-framework/shell/progression-finalizer.js');
 assert.match(code,/resolveOfficerShareTalentChoice\(\{/);
 assert.match(code,/set\['flags\.swse\.classFeatures\.officer\.sharedTalents'\]/);
 assert.match(code,/persistedOfficerShareTalents\(actor\)/);
 const step=source('scripts/apps/progression-framework/steps/share-talent-step.js');
 assert.match(step,/_commitNormalized\(shell, 'shareTalentSelections'/);
 assert.doesNotMatch(step,/_commitNormalized\(shell, 'talents'/);
});

test('post-apply audit verifies the Officer Share Talent permanent class-feature flag, not an extra talent',()=>{
 const m={className:'Officer',classId:'Officer',classLevel:2,characterLevel:8,
  choices:{shareTalentChoices:1},classSkills:[],automaticClassFeatures:[]};
 const state=draft({shareTalentSelections:[{officerLevel:2,talentId:'talent1',treeId:'influence'}]});
 const a={items:[],system:{level:8,progression:{classLevels:[{classId:'Officer',level:2}]},
    forcePoints:{max:1,value:1}},flags:{swse:{classFeatures:{officer:{sharedTalents:[]}}}}};
 assert.ok(auditLevelUpActorAfterFinalization(a,m,state).errors.some(x=>/permanent selection/.test(x)));
 a.flags.swse.classFeatures.officer.sharedTalents=[{officerLevel:2,talentId:'talent1',treeId:'influence'}];
 assert.deepEqual(auditLevelUpActorAfterFinalization(a,m,state).errors,[]);
});
