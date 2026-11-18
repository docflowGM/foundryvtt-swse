import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldAutoPromptTemptationChoice} from
 '../scripts/engine/progression/utils/temptation-choice-routing.js';

const gm={id:'gm',isGM:true,active:true};
const owner={id:'player-owner',isGM:false,active:true};
const offlineOwner={id:'offline-owner',isGM:false,active:false};
const bystander={id:'bystander',isGM:false,active:true};
const actor=(ids=['player-owner'])=>({
 id:'target',testUserPermission(user,level){
  assert.equal(level,'OWNER');
  return ids.includes(user?.id);
 }
});

test('affected active owner can choose on their own spending client',()=>{
 assert.equal(shouldAutoPromptTemptationChoice(actor(),{
  user:owner,users:[gm,owner,bystander]
 }),true);
 assert.equal(shouldAutoPromptTemptationChoice(actor(),{
  user:bystander,users:[gm,owner,bystander]
 }),false);
 assert.equal(shouldAutoPromptTemptationChoice(null,{user:owner}),false);
 assert.equal(shouldAutoPromptTemptationChoice(actor(),{user:null}),false);
});

test('GM spending on behalf of an active player does not auto-adjudicate for them',()=>{
 assert.equal(shouldAutoPromptTemptationChoice(actor(),{
  user:gm,users:[gm,owner,bystander]
 }),false);
 assert.equal(shouldAutoPromptTemptationChoice(actor(),{
  user:gm,users:{contents:[gm,owner,bystander]}
 }),false);
 assert.equal(shouldAutoPromptTemptationChoice(actor(),{
  user:gm,users:new Set([gm,owner])
 }),false);
});

test('GM can handle NPCs and offline players when no connected player-owner can choose',()=>{
 assert.equal(shouldAutoPromptTemptationChoice(actor([]),{
  user:gm,users:[gm,owner,bystander]
 }),true);
 assert.equal(shouldAutoPromptTemptationChoice(actor(['offline-owner']),{
  user:gm,users:[gm,offlineOwner,bystander]
 }),true);
 assert.equal(shouldAutoPromptTemptationChoice(actor(['player-owner']),{
  user:gm,users:[gm,{...owner,active:false}]
 }),true);
});

test('unknown owner permissions fail closed rather than granting GM automatic choice',()=>{
 const fails={id:'target',testUserPermission(){throw new Error('permission unresolved');}};
 assert.equal(shouldAutoPromptTemptationChoice(fails,{
  user:gm,users:[gm,owner]
 }),false);
 assert.equal(shouldAutoPromptTemptationChoice(fails,{
  user:owner,users:[gm,owner]
 }),false);
});

test('the committed receipt is persisted before any optional local choice dialog',()=>{
 const service=readFileSync(
  new URL('../scripts/engine/combat/sith-lord-temptation-service.js',import.meta.url),'utf8');
 const start=service.indexOf("globalThis.Hooks.on('swse.resourceSpent',async event=>{");
 const end=service.indexOf("globalThis.Hooks.on('combatTurn'",start);
 const block=service.slice(start,end);
 const pending=block.indexOf('await SithLordTemptationService.consumeSpendReceipt(event)');
 const routing=block.indexOf('shouldAutoPromptTemptationChoice(event.actor,');
 const prompt=block.indexOf('await SithLordTemptationService.resolvePending(event.actor)');
 assert.ok(start>=0&&end>start&&pending>=0&&pending<routing&&routing<prompt);
 assert.match(block,/if\(report\?\.handled\)/);
 assert.match(block,/if\(localOwnerShouldChoose\)/);
 assert.doesNotMatch(block,/game\.socket|Hooks\.callAll\('swse\.resourceSpent'/);
 const sheet=readFileSync(
  new URL('../scripts/infrastructure/hooks/force-class-feature-sheet-hooks.js',import.meta.url),'utf8');
 assert.match(sheet,/pendingChoiceCount\(actor\)>0/);
 assert.match(sheet,/runAction\(actor,'sithLordTemptation','reviewConsequences'\)/);
});
