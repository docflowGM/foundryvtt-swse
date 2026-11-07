import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planProphetVisionReview,PROPHET_AWARDS_PATH}
 from '../scripts/engine/progression/utils/force-disciple-prophet-gm-review.js';
const actor=()=>({flags:{swse:{forceDiscipleProphetAwards:{
  '1':{classLevel:1,granted:1,visionRequested:true,pendingGmVision:true},
  '2':{classLevel:2,granted:2,visionRequested:false,pendingGmVision:false}
}}},system:{destinyPoints:{value:4,max:4}}});
test('GM vision closes only an actually requested pending vision',()=>{
 const a=actor();
 const plan=planProphetVisionReview(a,1,'A shifting nebula shows the player a lost refuge.');
 assert.equal(plan.allowed,true);
 const ledger=plan.updates[PROPHET_AWARDS_PATH];
 assert.equal(ledger['1'].visionNarrated,true);
 assert.equal(ledger['1'].pendingGmVision,false);
 assert.equal(ledger['1'].destinyReview,'GM_ADJUDICATED_SEPARATELY');
 assert.equal(ledger['2'].granted,2);
 assert.equal(a.flags.swse.forceDiscipleProphetAwards['1'].pendingGmVision,true);
 assert.ok(!Object.keys(plan.updates).some(x=>x.startsWith('system.')));
});
test('no false vision award, no duplicate adjudication or blank narrative',()=>{
 const a=actor();
 assert.equal(planProphetVisionReview(a,2,'Not requested').allowed,false);
 assert.equal(planProphetVisionReview(a,1,' ').allowed,false);
 assert.equal(planProphetVisionReview(a,0,'A vision').allowed,false);
 assert.equal(planProphetVisionReview(a,1,'x'.repeat(4001)).allowed,false);
 a.flags.swse.forceDiscipleProphetAwards['1'].pendingGmVision=false;
 assert.equal(planProphetVisionReview(a,1,'Second attempt').reason,'vision-already-reviewed');
});
test('dialog requires GM and mutation authority, never grants a new Destiny',()=>{
 const src=readFileSync(new URL('../scripts/apps/force-disciple-prophet-review-dialog.js',import.meta.url),'utf8');
 const boot=readFileSync(new URL('../index.js',import.meta.url),'utf8');
 assert.match(src,/globalThis\.game\?\.user\?\.isGM!==true/);
 assert.match(src,/planProphetVisionReview\(/);
 assert.match(src,/ActorEngine\.applyMutationPlan\(actor/);
 assert.match(src,/does <strong>not<\/strong> change the Destiny/);
 assert.match(boot,/forceDiscipleProphet: \{ review: openProphetGmVisionReview \}/);
 assert.doesNotMatch(src,/actor\.update\(/);
});
