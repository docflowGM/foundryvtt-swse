import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerFoundryPathLoader} from './helpers/foundry-shim/register.mjs';
import {installFoundryShimGlobals} from './helpers/foundry-shim/globals.mjs';
registerFoundryPathLoader();
installFoundryShimGlobals();
const {resolveForceDiscipleIndomitable}=await import(
 '/systems/foundryvtt-swse/scripts/engine/progression/utils/force-disciple-features.js'
);
const source=readFileSync(new URL('../scripts/engine/species/species-activated-ability-engine.js',import.meta.url),'utf8');
const body=(start,end)=>{
 const a=source.indexOf(start),b=source.indexOf(end,a);
 assert.ok(a>=0&&b>a,start+' must precede '+end);
 return source.slice(a,b);
};

test('Yarkora Confusion checks Indomitable before creating a status effect',()=>{
 const code=body('static async useConfusion(','static async usePacifism(');
 assert.ok(code.indexOf('resolveForceDiscipleIndomitable(targetActor, { mindAffecting: true })')
   <code.indexOf('await createStatusEffect(targetActor,'));
 assert.match(code,/if \(success && !immune\)/);
 assert.match(code,/immune \(Indomitable\)/);
 assert.doesNotMatch(code,/applyConditionSteps\(targetActor/);
});

test('Caamasi Pacifism checks Indomitable before its direct Condition Track shift',()=>{
 const code=body('static async usePacifism(','static async usePheromones(');
 const gate=code.indexOf('resolveForceDiscipleIndomitable(targetActor, { mindAffecting: true })');
 assert.ok(gate>=0);
 assert.ok(code.indexOf('await applyConditionSteps(targetActor')>gate);
 assert.ok(code.indexOf('await createStatusEffect(targetActor')>gate);
 assert.match(code,/const success = checkSucceeds && !immune/);
 assert.match(code,/immune: !!immune/);
});

test('typed effects never fall back to bypassable legacy system.activeEffects storage',()=>{
 const code=body('async function createStatusEffect(','function getForceBlastDamageDice(');
 assert.match(code,/ActorEngine\.createActiveEffects\(actor, \[effectData\]/);
 assert.doesNotMatch(code,/ActorEngine\.updateActor\(actor/);
 assert.doesNotMatch(code,/['\"]system\.activeEffects['\"]\s*:/,'legacy array write must remain retired');
 assert.match(code,/throw new Error\('Species ability requires a Foundry Actor/);
});

test('only genuinely owned Force Disciple class receives mind-affecting immunity',()=>{
 const target={items:[{type:'class',name:'Force Disciple',
  system:{classId:'ef6fe8fdbbd884b4',level:1}}]};
 assert.equal(resolveForceDiscipleIndomitable(target,{mindAffecting:true}).immune,true);
 assert.equal(resolveForceDiscipleIndomitable(target,{mindAffecting:false}).immune,false);
 const spoof={items:[{type:'feat',name:'Force Disciple'}]};
 assert.equal(resolveForceDiscipleIndomitable(spoof,{mindAffecting:true}).immune,false);
});

test('unrelated inhaled poison Pheromones remains outside Indomitable guard',()=>{
 const code=body('static async usePheromones(','static async useStartle(');
 assert.doesNotMatch(code,/resolveForceDiscipleIndomitable/);
 assert.match(code,/inhaledPoison: true/);
});
