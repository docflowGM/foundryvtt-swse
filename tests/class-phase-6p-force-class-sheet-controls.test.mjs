import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerFoundryPathLoader} from './helpers/foundry-shim/register.mjs';
import {installFoundryShimGlobals} from './helpers/foundry-shim/globals.mjs';

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.CONST=globalThis.CONST??{DOCUMENT_OWNERSHIP_LEVELS:{OWNER:3}};
globalThis.ui={notifications:{error(){},warn(){},info(){}}};
const calls=[];
globalThis.game={
 user:{id:'gm',isGM:true},
 swse:{classFeatures:{
   jediMasterSerenity:{open:async actor=>{calls.push(['serenity',actor.id]);return {success:true};}},
   sithLordTemptation:{
     open:async actor=>{calls.push(['temptation',actor.id]);return {success:true};},
     reviewConsequences:async actor=>{calls.push(['resolve',actor.id]);return {success:true};}
   },
   forceDiscipleProphet:{review:async actor=>{calls.push(['prophet',actor.id]);return {success:true};}}
 }}
};
const {HooksRegistry}=await import('/systems/foundryvtt-swse/scripts/infrastructure/hooks/hooks-registry.js');
const {
 registerForceClassFeatureSheetHooks,FORCE_CLASS_SHEET_ACTIONS
}=await import('/systems/foundryvtt-swse/scripts/infrastructure/hooks/force-class-feature-sheet-hooks.js');

let handler=null;
const orig=HooksRegistry.register;
HooksRegistry.register=(name,cb,opts)=>{
 assert.equal(name,'getHeaderControlsApplicationV2');
 assert.equal(opts.id,'swse-force-class-feature-actions');
 handler=cb;
};
registerForceClassFeatureSheetHooks();
registerForceClassFeatureSheetHooks();
HooksRegistry.register=orig;

const cls=(name,id)=>({type:'class',name,system:{classId:id,level:1}});
const actor=(classes=[],dsp=0,pending=false,vision=false)=>({
 documentName:'Actor',type:'character',id:'actor-1',name:'Character',
 items:classes,system:{darkSide:{value:dsp},attributes:{wis:{base:12}}},
 flags:{swse:{forceDiscipleProphetAwards:vision?{'1':{visionRequested:true,pendingGmVision:true}}:{},classFeatures:{sithLord:{
   temptationEvents:pending?[{state:'pending-target-choice',receiptId:'spent'}]:[]
 }}}},
 testUserPermission(){return true;}
});
const controls=a=>{const output=[];handler({actor:a},output);return output;};
const byName=(rows,name)=>rows.find(x=>x.action===name);

test('single registration and no duplicated class controls across header calls',()=>{
 assert.equal(typeof handler,'function');
 const a=actor();
 const buttons=controls(a);
 assert.equal(buttons.length,4);
 handler({actor:a},buttons);
 assert.equal(buttons.length,3);
 assert.equal(new Set(buttons.map(c=>c.action)).size,4);
 handler({document:{documentName:'JournalEntry',id:'bad'}},buttons);
 assert.equal(buttons.length,3);
});

test('Jedi Master Serenity button requires owned class and actor owner',async()=>{
 const jedi=actor([cls('Jedi Master','07a64453f95e04f2')]);
 const row=byName(controls(jedi),FORCE_CLASS_SHEET_ACTIONS.serenity);
 assert.equal(row.visible(),true);
 await row.handler();
 assert.deepEqual(calls.pop(),['serenity',jedi.id]);
 assert.equal(byName(controls(actor()),FORCE_CLASS_SHEET_ACTIONS.serenity).visible(),false);
});

test('Sith Lord Temptation is GM-only and suspended below Wisdom',async()=>{
 const sith=actor([cls('Sith Lord','2f7cfdc115c640a5')],12);
 const row=byName(controls(sith),FORCE_CLASS_SHEET_ACTIONS.temptation);
 assert.equal(row.visible(),true);
 await row.handler();
 assert.deepEqual(calls.pop(),['temptation',sith.id]);
 sith.system.darkSide.value=11;
 assert.equal(row.visible(),false);
 sith.system.darkSide.value=12;
 globalThis.game.user.isGM=false;
 assert.equal(row.visible(),false);
 globalThis.game.user.isGM=true;
});

test('target-owned pending consequence review appears without Sith ownership',async()=>{
 const target=actor([],0,true);
 const row=byName(controls(target),FORCE_CLASS_SHEET_ACTIONS.resolve);
 assert.equal(row.visible(),true);
 await row.handler();
 assert.deepEqual(calls.pop(),['resolve',target.id]);
 assert.equal(byName(controls(actor()),FORCE_CLASS_SHEET_ACTIONS.resolve).visible(),false);
});

test('pending Prophet vision appears only to GM on a true Force Disciple with a pending award',async()=>{
 const disciple=actor([cls('Force Disciple','ef6fe8fdbbd884b4')],0,false,true);
 const button=byName(controls(disciple),FORCE_CLASS_SHEET_ACTIONS.prophetVision);
 assert.equal(button.visible(),true);
 await button.handler();
 assert.deepEqual(calls.pop(),['prophet',disciple.id]);
 globalThis.game.user.isGM=false;
 assert.equal(button.visible(),false);
 globalThis.game.user.isGM=true;
 assert.equal(byName(controls(actor()),FORCE_CLASS_SHEET_ACTIONS.prophetVision).visible(),false);
 const spoof=actor([{type:'feat',name:'Force Disciple'}],0,false,true);
 assert.equal(byName(controls(spoof),FORCE_CLASS_SHEET_ACTIONS.prophetVision).visible(),false);
 disciple.flags.swse.forceDiscipleProphetAwards['1'].pendingGmVision=false;
 assert.equal(button.visible(),false);
});

test('UIHooks owns registration; no parallel roll or resource mutation',()=>{
 const path='scripts/infrastructure/hooks/ui-hooks.js';
 const src=readFileSync(new URL('../'+path,import.meta.url),'utf8');
 assert.match(src,/registerForceClassFeatureSheetHooks\(\)/);
 const ctrl=readFileSync(new URL('../scripts/infrastructure/hooks/force-class-feature-sheet-hooks.js',import.meta.url),'utf8');
 assert.doesNotMatch(ctrl,/actor\.update\(|ActorEngine\.(?:updateActor|applyMutationPlan)|RollCore\.execute/);
});
