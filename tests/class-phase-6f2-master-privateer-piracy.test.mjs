import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {evaluateMasterPrivateerPiracy,MASTER_PRIVATEER_PIRACY_REASON}
  from '../scripts/engine/progression/utils/master-privateer-piracy-rules.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const actor=(level=1)=>({id:'hero',items:[
  {type:'class',name:'Master Privateer',system:{level}},
]});

test('fall to the dark side is always GM-adjudicated; never an automatic blocker',()=>{
 for(const [score,max] of [[14,14],[0,14],[1,14],[20,14],[undefined,14]]) {
   const result=evaluateMasterPrivateerPiracy({
     actor:actor(3),className:'Master Privateer',darkSideScore:score,darkSideMax:max,
   });
   assert.equal(result.blocked,false);
   assert.equal(result.advisory,true);
   assert.equal(result.requiresGMAdjudication,true);
   assert.equal(result.reason,MASTER_PRIVATEER_PIRACY_REASON);
 }
 assert.equal(evaluateMasterPrivateerPiracy({
   actor:actor(3),className:'Master Privateer',darkSideScore:14,darkSideMax:14,
 }).thresholdReached,true);
 assert.equal(evaluateMasterPrivateerPiracy({
   actor:actor(3),className:'Master Privateer',darkSideScore:1,darkSideMax:14,
 }).thresholdReached,false);
});

test('Piracy note applies only to further Master Privateer levels; other classes remain unaffected',()=>{
 assert.equal(evaluateMasterPrivateerPiracy({
   actor:actor(3),className:'Soldier',darkSideScore:15,darkSideMax:14,
 }).advisory,false);
 assert.equal(evaluateMasterPrivateerPiracy({
   actor:{id:'new',items:[]},className:'Master Privateer',
   darkSideScore:15,darkSideMax:14,
 }).advisory,false);
});

test('Piracy is shown as advisory in class UI and finalizer, never in hard error list',()=>{
 const cache=fs.readFileSync(path.join(ROOT,'scripts/engine/progression/prerequisites/class-prerequisites-cache.js'),'utf8');
 const finalizer=fs.readFileSync(path.join(ROOT,'scripts/engine/progression/validation/finalization-prerequisite-validator.js'),'utf8');
 const ui=fs.readFileSync(path.join(ROOT,'templates/apps/progression-framework/details-panel/class-details.hbs'),'utf8');
 assert.match(cache,/advisories:\[\.\.\.\(result\.advisories \|\| \[\]\),piracy\.reason\]/);
 assert.doesNotMatch(cache,/if \(piracy\.blocked\)/);
 assert.match(finalizer,/warnings\.push\(piracy\.reason\)/);
 assert.doesNotMatch(finalizer,/if \(piracy\.blocked\)/);
 assert.match(ui,/GM Adjudication/);
 assert.match(ui,/classAdvisories/);
});
