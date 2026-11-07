import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
registerFoundryPathLoader();
installFoundryShimGlobals();

const {targetSuppressesForceEffect} = await import('/systems/foundryvtt-swse/scripts/engine/combat/damage-type-rules.js');
const {
  resolveApexFearImmunity, apexClassFeatureAccess
} = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/apex-class-feature-access.js');
const {resolveForceDiscipleIndomitable} = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/force-disciple-features.js');
const classes = readFileSync(new URL('../packs/classes.db', import.meta.url), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const cls = name => classes.find(x=>x.name===name);
const owned = (name,level=1) => ({type:'class',name,system:{classId:cls(name)._id,level}});
const actor = (items,score=12) => ({id:'target-1',name:'Target',items,system:{
  darkSide:{value:score},attributes:{wis:{base:12}}
}});
const source = (name,tags=[]) => ({id:'source',name,type:'force-power',system:{tags}});

test('only actual, active Jedi Master/Sith Lord Fearless grants fear suppression',()=>{
  for(const name of ['Jedi Master','Sith Lord']) {
    const target=actor([owned(name)]);
    const result=targetSuppressesForceEffect({target,sourceItem:source('Fear',['fear'])});
    assert.equal(result.suppressed,true,name);
    assert.match(result.source,/Fearless/);
    assert.equal(resolveApexFearImmunity(target,{sourceItem:source('Fear')}).immune,true);
    assert.equal(targetSuppressesForceEffect({target,sourceItem:source('Force Lightning',['dark-side'])}).suppressed,false);
  }
  const other=actor([owned('Sith Apprentice')]);
  assert.equal(targetSuppressesForceEffect({target:other,sourceItem:source('Fear',['fear'])}).suppressed,false);
  const suppressed=actor([owned('Sith Lord')],11);
  assert.equal(apexClassFeatureAccess(suppressed,'sith_lord').allowed,false);
  assert.equal(targetSuppressesForceEffect({target:suppressed,sourceItem:source('Fear',['fear'])}).suppressed,false);
});

test('Mind-Affecting and fear descriptors remain separate and explicit',()=>{
  const jedi=actor([owned('Jedi Master')]);
  const disciple=actor([owned('Force Disciple')]);
  const mind=source('Affect Mind',['mind_affecting']);
  assert.equal(targetSuppressesForceEffect({target:jedi,sourceItem:mind}).suppressed,false);
  assert.equal(resolveForceDiscipleIndomitable(disciple,{sourceItem:mind}).immune,true);
  assert.equal(targetSuppressesForceEffect({target:disciple,sourceItem:mind}).suppressed,true);
  const falsePositive=source('Fearsome Reputation',['charisma']);
  assert.equal(targetSuppressesForceEffect({target:jedi,sourceItem:falsePositive}).suppressed,false);
  assert.equal(targetSuppressesForceEffect({target:disciple,sourceItem:falsePositive}).suppressed,false);
});

test('typed non-Force fear can be suppressed without inventing a Force power',()=>{
  const master=actor([owned('Jedi Master')]);
  const result=targetSuppressesForceEffect({target:master,context:{effectTags:['fear']}});
  assert.equal(result.suppressed,true);
});

test('class spoofing via feat or conflicting class name does not grant immunity',()=>{
  const fake=actor([{type:'feat',name:'Jedi Master',system:{level:5}},
    {type:'class',name:'Jedi Master',system:{classId:'noble',level:5}}]);
  assert.equal(targetSuppressesForceEffect({target:fake,sourceItem:source('Fear',['fear'])}).suppressed,false);
});

test('current Force effect application invokes common gate before ActorEngine mutation',()=>{
  const src=readFileSync(new URL('../scripts/engine/force/force-power-effects-engine.js',import.meta.url),'utf8');
  const start=src.indexOf('static async applyPowerEffect(');
  const end=src.indexOf('static _buildEffectDataForPower(');
  const body=src.slice(start,end);
  assert.ok(body.includes('targetSuppressesForceEffect({'));
  assert.ok(body.indexOf('targetSuppressesForceEffect({')<body.indexOf('ActorEngine.createActiveEffects('));
});
