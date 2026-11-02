import test from 'node:test';
import assert from 'node:assert/strict';
import { officerShareTalentDistanceSquares, resolveOfficerShareTalentScene } from '../scripts/engine/combat/officer-share-talent-scene.js';

const actor = id => ({id});
const token = (id, owner, x, y, disposition=1) => ({
  id, actor: owner, center: {x,y},
  document: {id,disposition},
});
const officer = actor('officer');
const ally = actor('ally');
const second = actor('second');
const source = token('source',officer,0,0);
const target = token('target',ally,500,0);
const other = token('other',second,300,0);
// Foundry v13 measurePath().distance is measured in SCENE DISTANCE UNITS,
// not canvas pixels. Here 100px represents one 5-unit square.
const grid = {measurePath: points => ({distance:Math.hypot(
  points[1].x-points[0].x,points[1].y-points[0].y,
) / 100 * 5})};
const scene = {id:'scene-1',grid:{distance:5}};
const canvasRef = {scene,grid,tokens:{placeables:[source,target,other]}};
const combat = {id:'combat-1',started:true,scene:'scene-1',combatants:[
  {tokenId:'source'},{tokenId:'target'},{tokenId:'other'},
]};
const options = {
  officer,combat,canvasRef,recipientTokenIds:['target'],
  confirmedSenses:true,confirmedAllies:true,
};

test('Share Talent derives current combat recipients and measured range, not caller-written actor proofs',()=>{
  const resolved=resolveOfficerShareTalentScene(options);
  assert.deepEqual(resolved.recipientActors,[ally]);
  assert.deepEqual(resolved.recipientProofs,[{
    actorId:'ally',isAlly:true,distanceSquares:5,
    canSeeOfficer:true,canHearOfficer:true,
  }]);
  assert.equal(officerShareTalentDistanceSquares(scene,grid,source,target),5);
});

test('Share Talent fails closed if target moved out of range after dialog inspection',()=>{
  const moved=token('target',ally,1001,0);
  const current={...canvasRef,tokens:{placeables:[source,moved,other]}};
  assert.throws(()=>resolveOfficerShareTalentScene({...options,canvasRef:current}),/no longer within 10 squares/);
});

test('Share Talent requires explicit GM senses and allegiance assertions',()=>{
  assert.throws(()=>resolveOfficerShareTalentScene({...options,confirmedSenses:false}),/GM must confirm/);
  assert.throws(()=>resolveOfficerShareTalentScene({...options,confirmedAllies:false}),/GM must confirm/);
  const enemy=token('target',ally,500,0,-1);
  assert.throws(()=>resolveOfficerShareTalentScene({...options,canvasRef:{...canvasRef,tokens:{placeables:[source,enemy]}}}),/unique allied actor/);
});

test('Share Talent refuses different scene, non-encounter targets and duplicate identities',()=>{
  assert.throws(()=>resolveOfficerShareTalentScene({...options,combat:{...combat,scene:'other'}}),/current active encounter scene/);
  assert.throws(()=>resolveOfficerShareTalentScene({...options,combat:{...combat,started:false}}),/current active encounter scene/);
  assert.throws(()=>resolveOfficerShareTalentScene({...options,combat:{...combat,combatants:[{tokenId:'source'}]}}),/absent from the active encounter/);
  assert.throws(()=>resolveOfficerShareTalentScene({...options,recipientTokenIds:['target','target']}),/unique recipient token identities/);
  const duplicateActorToken=token('other',ally,200,0);
  assert.throws(()=>resolveOfficerShareTalentScene({
    ...options,recipientTokenIds:['target','other'],
    canvasRef:{...canvasRef,tokens:{placeables:[source,target,duplicateActorToken]}},
  }),/unique allied actor/);
});

test('Service enforces turn economy and derives recipients at action time; dialog passes token IDs only',async()=>{
  const fs=await import('node:fs');
  const path=await import('node:path');
  const url=await import('node:url');
  const root=path.resolve(path.dirname(url.fileURLToPath(import.meta.url)),'..');
  const service=fs.readFileSync(path.join(root,'scripts/engine/combat/officer-share-talent-service.js'),'utf8');
  const dialog=fs.readFileSync(path.join(root,'scripts/apps/officer-share-talent-dialog.js'),'utf8');
  assert.match(service,/resolveOfficerShareTalentScene\(/);
  assert.match(service,/combat\.combatant\?\.id!==combatant\.id/);
  assert.match(service,/combatant\.canAct!==true/);
  assert.match(dialog,/recipientTokenIds:chosen\.tokenIds/);
  assert.match(dialog,/confirmedAllies/);
  assert.doesNotMatch(dialog,/recipientProofs:tokenSelections/);
});
