import test from 'node:test';
import assert from 'node:assert/strict';
import {
 commandCoverLimit,evaluateCommandCover,sceneCommandCoverBonus,
} from '../scripts/engine/combat/class-command-cover.js';
const actor=(id='def',officer=0,crime=0)=>({id,items:[
 ...(officer?[{type:'class',name:'Officer',system:{level:officer}},{type:'feat',system:{sourceType:'class-feature',featureKey:'officer.commandCover'}}]:[]),
 ...(crime?[{type:'class',name:'Crime Lord',system:{level:crime}},{type:'feat',system:{sourceType:'class-feature',featureKey:'crimeLord.commandCover'}}]:[]),
]});
const token=(id,actorId,x,y,disp=1)=>({
 id,actor:{id:actorId},document:{id,x,y,width:1,height:1,disposition:disp,elevation:0},
});
const defender=token('D','def',0,0);
const allies=[token('A','ally1',100,0),token('B','ally2',0,100),token('C','ally3',100,100)];
const result=(owner=actor(),neighbors=allies,gridType=1)=>evaluateCommandCover({
 defender:owner,defenderToken:defender,tokens:[defender,...neighbors],gridSize:100,gridType,
});
test('Command Cover cap is floor(class level/2), at most +5, and two class features never add',()=>{
 assert.equal(commandCoverLimit(actor('def',0,0)),0);
 assert.equal(commandCoverLimit(actor('def',2)),1);
 assert.equal(commandCoverLimit(actor('def',7)),3);
 assert.equal(commandCoverLimit(actor('def',10)),5);
 assert.equal(commandCoverLimit(actor('def',10,4)),5);
 assert.equal(result(actor('def',2)).bonus,1);
 assert.equal(result(actor('def',6)).bonus,3);
 assert.equal(result(actor('def',10)).bonus,3);
});
test('only adjacent allies in the same elevation, without neutral/enemy/overlap, shield the officer',()=>{
 let others=[
  token('ok','ally',100,0),
  token('diagonal','ally2',100,100),
  token('far','far',300,0),
  token('enemy','enemy',0,100,-1),
  token('neutral','neutral',-100,0,0),
  token('overlap','overlap',0,0),
  {...token('elevated','elevated',-100,0),document:{...token('tmp','elevated',-100,0).document,elevation:5}},
 ];
 const r=result(actor('def',10),others);
 assert.equal(r.adjacentAllies,2);
 assert.equal(r.bonus,2);
});
test('ambiguous or unsupported scene cannot mint a defense bonus',()=>{
 assert.equal(result(actor('def',10),allies,0).bonus,0);
 const a=actor('def',10);
 assert.equal(sceneCommandCoverBonus(a,{canvasRef:{scene:{grid:{size:100,type:1}},tokens:{placeables:[defender,...allies,token('D2','def',300,300)]}}}),0);
 assert.equal(sceneCommandCoverBonus(a,{canvasRef:{scene:{grid:{size:100,type:1}},tokens:{placeables:[defender,...allies]}}}),3);
 assert.equal(sceneCommandCoverBonus(a,{tokenId:'D',canvasRef:{scene:{grid:{size:100,type:1}},tokens:{placeables:[defender,...allies,token('D2','def',300,300)]}}}),3);
});
test('no published class feature Item means no bonus, despite a class name or matching feat name',()=>{
 const without=actor('def',10);without.items=without.items.filter(i=>i.type==='class');
 assert.equal(result(without).bonus,0);
 without.items.push({type:'feat',name:'Command Cover',system:{sourceType:'other'}});
 assert.equal(result(without).bonus,0);
});
