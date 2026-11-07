import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerFoundryPathLoader} from './helpers/foundry-shim/register.mjs';
import {installFoundryShimGlobals} from './helpers/foundry-shim/globals.mjs';
registerFoundryPathLoader();
installFoundryShimGlobals();

const {prophetChoiceEligibility,promptProphetVisionDecision} = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/prophet-vision-decision.js'
);
const {planForceDiscipleProphetAward} = await import(
  '/systems/foundryvtt-swse/scripts/engine/progression/utils/force-disciple-features.js'
);
const actor = (hasDestiny=true)=>({system:{destiny:{hasDestiny},destinyPoints:{value:3,max:4}},items:[
  {type:'class',name:'Force Disciple',system:{classId:'ef6fe8fdbbd884b4',level:1}}
]});
const manifest = (classLevel=2,className='Force Disciple')=>({
  kind:'swse-level-up-entitlement-manifest',className,classLevel,characterLevel:14,
  context:{selectedClassNextLevel:classLevel,enteringLevel:14,mode:'levelup',eventType:'advanceOneLevel'}
});

test('Prophet prompt only applies on verified Force Disciple levelup with Destiny',()=>{
  assert.equal(prophetChoiceEligibility({actor:actor(),manifest:manifest(),mode:'levelup'}).applicable,true);
  assert.equal(prophetChoiceEligibility({actor:actor(false),manifest:manifest(),mode:'levelup'}).applicable,false);
  assert.equal(prophetChoiceEligibility({actor:actor(),manifest:manifest(2,'Jedi Master'),mode:'levelup'}).applicable,false);
  assert.equal(prophetChoiceEligibility({actor:actor(),manifest:manifest(),mode:'chargen'}).applicable,false);
  const broken=actor();broken.system.destinyPoints.value='unknown';
  assert.equal(prophetChoiceEligibility({actor:broken,manifest:manifest(),mode:'levelup'}).valid,false);
});

test('keep both vs sacrifice extra: returns explicit selection and drives one atomic planner',async()=>{
  for(const visionRequested of [false,true]){
    let called=0;
    const a=actor();
    const choice=await promptProphetVisionDecision({
      actor:a,manifest:manifest(),mode:'levelup',
      dialog:{wait:async spec=>{called++;assert.match(spec.content,/two Destiny Points/);
        return {visionRequested,classLevel:2};}}
    });
    assert.equal(called,1);
    assert.equal(choice.visionRequested,visionRequested);
    const plan=planForceDiscipleProphetAward({actor:a,manifest:manifest(),visionRequested:choice.visionRequested});
    assert.equal(plan.allowed,true,plan.reason);
    assert.equal(plan.grant,visionRequested?1:2);
    assert.equal(plan.updates['flags.swse.forceDiscipleProphetAwards']['2'].pendingGmVision,visionRequested);
    assert.equal(a.system.destinyPoints.value,3,'never mutate before finalizer');
  }
});

test('cancelled/closed dialog fails before mutation; same-level existing decision is stable',async()=>{
  const a=actor();
  await assert.rejects(promptProphetVisionDecision({
    actor:a,manifest:manifest(),mode:'levelup',dialog:{wait:async()=>null}
  }),/cancelled/);
  let calls=0;
  const retained=await promptProphetVisionDecision({
    actor:a,manifest:manifest(),mode:'levelup',
    existing:{classLevel:2,visionRequested:false},
    dialog:{wait:async()=>{calls++;return null;}}
  });
  assert.deepEqual(retained,{classLevel:2,visionRequested:false});
  assert.equal(calls,0);
});

test('normal finalize prompts before compiling; dryRun does not mutate session or prompt',()=>{
  const src=readFileSync(new URL('../scripts/apps/progression-framework/shell/progression-finalizer.js',import.meta.url),'utf8');
  const start=src.indexOf('static async finalize(');
  const end=src.indexOf('static async _',start);
  const body=src.slice(start,end>start?end:undefined);
  assert.ok(body.includes('await promptProphetVisionDecision('));
  assert.ok(body.indexOf('await promptProphetVisionDecision(')<body.indexOf('this._compileMutationPlan(sessionState, actor, options)'));
  const dry=src.slice(src.indexOf('static async dryRun('),start);
  assert.doesNotMatch(dry,/promptProphetVisionDecision/);
});
