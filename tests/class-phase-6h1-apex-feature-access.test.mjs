import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

registerFoundryPathLoader();
installFoundryShimGlobals();

const {
  apexClassLevel, apexClassFeatureAccess, apexFearlessSource,
  isExplicitFearEffect, resolveApexFearImmunity,
} = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/apex-class-feature-access.js');

const classItem = (className, level, extra = {}) => ({
  type: 'class', name: className,
  system: { classId: className.toLowerCase().replace(/\s+/g,'_'), level, ...extra },
});
const actor = (classes, darkSideScore = 0, wisdom = 12) => ({
  items: classes,
  name: 'Test Actor',
  system: {
    darkSide: {value: darkSideScore},
    attributes: {wis: {base:wisdom}},
  },
});

test('apex ownership reads actual class items, not thematic text or feat names', () => {
  const a=actor([{type:'feat',name:'Jedi Master',system:{level:5}}, classItem('Jedi Knight',5)]);
  assert.equal(apexClassLevel(a,'jedi_master'),0);
  assert.equal(apexClassFeatureAccess(a,'jedi_master').allowed,false);
  const actual=actor([classItem('Jedi Master',2)]);
  assert.equal(apexClassLevel(actual,'jedi_master'),2);
  const realJedi=actor([{type:'class',name:'Jedi Master',system:{classId:'07a64453f95e04f2',level:3}}]);
  const realSith=actor([{type:'class',name:'Sith Lord',system:{classId:'2f7cfdc115c640a5',level:2}}],12);
  const realApprentice=actor([{type:'class',name:'Sith Apprentice',system:{classId:'1ba03b2d00245906',level:2}}],12);
  assert.equal(apexClassLevel(realJedi,'jedi_master'),3);
  assert.equal(apexClassFeatureAccess(realJedi,'jedi_master').allowed,true);
  assert.equal(apexClassLevel(realSith,'sith_lord'),2);
  assert.equal(apexClassFeatureAccess(realSith,'sith_lord').allowed,true);
  assert.equal(apexClassFeatureAccess(realApprentice,'sith_apprentice').allowed,true);

  assert.equal(apexClassFeatureAccess(actual,'jedi_master').allowed,true);
  const spoof=actor([{type:'class',name:'Jedi Master',system:{classId:'noble',level:5}}]);
  assert.equal(apexClassLevel(spoof,'jedi_master'),0);
  assert.equal(apexClassLevel(actor([classItem('Sith Lord',1,{disabled:true})],15), 'sith_lord'),0);
});

test('Sith Lord and Sith Apprentice feature suspension uses printed Wisdom comparison regardless of entry setting', () => {
  for(const clazz of ['Sith Lord','Sith Apprentice']) {
    const a=actor([classItem(clazz,2)],11,12);
    const denied=apexClassFeatureAccess(a,clazz);
    assert.equal(denied.owned,true);
    assert.equal(denied.allowed,false);
    assert.equal(denied.reason,'dark-side-below-wisdom');
    a.system.darkSide.value=12;
    assert.equal(apexClassFeatureAccess(a,clazz).allowed,true);
    a.system.darkSide.value=13;
    assert.equal(apexClassFeatureAccess(a,clazz).allowed,true);
    a.system.darkSide.value=0;
    assert.equal(apexClassFeatureAccess(a,clazz).allowed,false);
    assert.equal(a.items[0].system.level,2,'suspension must never erase levels');
  }
  const missing=actor([classItem('Sith Lord',1)],15);
  missing.system.attributes={};
  assert.equal(apexClassFeatureAccess(missing,'sith_lord').reason,'wisdom-unverified');
});

test('Fearless source applies to both apex classes but not Sith Apprentice or a suspended Sith Lord', () => {
  const jedi=actor([classItem('Jedi Master',1)],0);
  const sith=actor([classItem('Sith Lord',1)],12);
  const apprentice=actor([classItem('Sith Apprentice',10)],12);
  assert.deepEqual(apexFearlessSource(jedi).classId,'jedi_master');
  assert.deepEqual(apexFearlessSource(sith).classId,'sith_lord');
  assert.equal(apexFearlessSource(apprentice).immune,false);
  sith.system.darkSide.value=11;
  assert.equal(apexFearlessSource(sith).immune,false);
  assert.equal(apexFearlessSource(jedi).immune,true);
});

test('fear classification is explicit and does not swallow unrelated Persuasion/Power names',()=>{
  assert.equal(isExplicitFearEffect({fearEffect:true}),true);
  assert.equal(isExplicitFearEffect({effectTags:['mind-affecting','fear']}),true);
  assert.equal(isExplicitFearEffect({sourceItem:{name:'Fear',system:{}}}),true);
  assert.equal(isExplicitFearEffect({sourceItem:{name:'Fearsome Blade',system:{}}}),false);
  assert.equal(isExplicitFearEffect({effectType:'fearless'}),false);
  assert.equal(isExplicitFearEffect({sourceItem:{name:'Force Lightning',system:{tags:['dark-side']}}}),false);
  assert.equal(resolveApexFearImmunity(actor([classItem('Jedi Master',1)]),{sourceItem:{name:'Force Lightning'}}).immune,false);
  assert.equal(resolveApexFearImmunity(actor([classItem('Jedi Master',1)]),{sourceItem:{name:'Fear'}}).immune,true);
});

test('real ForcePowerEffectsEngine target seam checks Fearless before any effect mutation',()=>{
  const source=readFileSync(new URL('../scripts/engine/force/force-power-effects-engine.js', import.meta.url),'utf8');
  const start=source.indexOf('static async applyPowerEffect('), end=source.indexOf('static _buildEffectDataForPower(');
  const method=source.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.match(method,/const explicitTarget = options\.target \?\? options\.targetActor \?\? null/);
  assert.match(method,/resolveApexFearImmunity\(target, \{ sourceItem: powerItem \}\)/);
  assert.ok(method.indexOf('resolveApexFearImmunity(') < method.indexOf('ActorEngine.createActiveEffects('));
});
