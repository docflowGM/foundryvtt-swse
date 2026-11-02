import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
 evaluateMasterPrivateerPiracy,MASTER_PRIVATEER_PIRACY_REASON,
} from '../scripts/engine/progression/utils/master-privateer-piracy-rules.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const actor=(level=1)=>({
 id:'hero',items:[{type:'class',name:'Master Privateer',system:{level}}],
});

test('Piracy blocks additional Master Privateer levels after full dark-side saturation',()=>{
 const result=evaluateMasterPrivateerPiracy({
   actor:actor(3),className:'Master Privateer',darkSideScore:14,darkSideMax:14,
 });
 assert.equal(result.blocked,true);
 assert.equal(result.reason,MASTER_PRIVATEER_PIRACY_REASON);
 assert.equal(result.priorLevel,3);
 assert.equal(evaluateMasterPrivateerPiracy({
   actor:actor(2),className:'Master Privateer',darkSideScore:16,darkSideMax:14,
 }).blocked,true);
});

test('Piracy does not revoke previously earned levels or bar other class advancement',()=>{
 assert.equal(evaluateMasterPrivateerPiracy({
   actor:actor(3),className:'Soldier',darkSideScore:15,darkSideMax:14,
 }).blocked,false);
 assert.equal(evaluateMasterPrivateerPiracy({
   actor:actor(3),className:'Master Privateer',darkSideScore:13,darkSideMax:14,
 }).blocked,false);
 assert.equal(evaluateMasterPrivateerPiracy({
   actor:{id:'new',items:[]},className:'Master Privateer',
   darkSideScore:14,darkSideMax:14,
 }).blocked,false); // first level is not "further levels"
});

test('missing/corrupt current dark-side authority fails closed for a continuing Privateer',()=>{
 for(const [score,max] of [[undefined,10],[5,0],[Infinity,10],[10,NaN]]) {
   const result=evaluateMasterPrivateerPiracy({
     actor:actor(1),className:'Master Privateer',darkSideScore:score,darkSideMax:max,
   });
   assert.equal(result.blocked,true);
   assert.equal(result.indeterminate,true);
 }
});

test('both class eligibility and finalization reuse the same Piracy rule',()=>{
 const eligibility=fs.readFileSync(path.join(ROOT,'scripts/engine/progression/prerequisites/class-prerequisites-cache.js'),'utf8');
 const finalization=fs.readFileSync(path.join(ROOT,'scripts/engine/progression/validation/finalization-prerequisite-validator.js'),'utf8');
 assert.match(eligibility,/evaluateMasterPrivateerPiracy\(/);
 assert.match(eligibility,/if \(piracy\.blocked\) return/);
 assert.match(finalization,/evaluateMasterPrivateerPiracy\(/);
 assert.match(finalization,/if \(piracy\.blocked\)/);
 assert.match(finalization,/Progression finalization blocked/);
});
