import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveSaboteurSkillUse, planQuickSabotage, executeQuickSabotage } from '../scripts/engine/progression/utils/saboteur-quick-sabotage.js';
import { canMasterSaboteurReroll } from '../scripts/engine/combat/class-master-saboteur-reroll.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const actor = level => ({ items: [{type:'class',name:'Saboteur',system:{level}}], system:{skills:{mechanics:{trained:true,total:9}}} });
const all = JSON.parse(read('data/extraskilluses.json'));
const devices = all.filter(row => /^Disable Device [—–-] (Simple|Tricky|Complex)$/i.test(row.application));
const explosive = all.find(row => row.application === 'Handle Explosives / Set Detonator');

test('source applications have exclusive identification across actual JSON and normalized compendium shapes', () => {
  assert.equal(devices.length,3); assert.ok(explosive);
  for(const row of devices) {
    const match=resolveSaboteurSkillUse(row);
    assert.equal(match.application,'disable-device');
    assert.deepEqual(resolveSaboteurSkillUse({label:row.application,skillKey:'mechanics'}),match);
    assert.equal(resolveSaboteurSkillUse({label:row.application,skillKey:'deception'}),null);
  }
  assert.deepEqual(resolveSaboteurSkillUse(explosive),{application:'handle-explosives',complexity:null});
  for(const label of ['Disable Device','Disable Device — Experimental','Modify Droid — Simple','Handle Explosives / Disarm Device'])
    assert.equal(resolveSaboteurSkillUse({label,skillKey:'mechanics'}),null);
});

test('the catalog and live dispatcher consume one Quick Sabotage level planner', () => {
  for(const level of [3,4,6,8,10]) for(const row of devices) {
    const {complexity}=resolveSaboteurSkillUse(row);
    const rule=planQuickSabotage(actor(level),complexity);
    const minimum={simple:4,tricky:6,complex:8}[complexity];
    assert.equal(rule.swiftActions,level>=minimum ? (complexity==='complex'?2:1) : 0);
  }
  const registry=read('scripts/utils/extra-skill-use-registry.js');
  const filter=read('scripts/utils/skill-use-filter.js');
  assert.match(registry,/resolveSaboteurSkillUse\(item\)/);
  assert.match(registry,/planQuickSabotage\(actor, match\.complexity\)/);
  assert.match(filter,/resolveSaboteurSkillUse\(skillUse\)/);
  assert.match(filter,/planQuickSabotage\(actor, saboteurApplication\.complexity\)/);
  assert.match(filter,/executeQuickSabotage\(/);
  assert.match(filter,/ActionEconomyConsumption\.spend\(owner, type, metadata\)/);
});

test('actual sheet entry point reaches canonical V2 skill dispatch without a second check', () => {
  const sheet=read('scripts/sheets/v2/character-like-sheet.js');
  const start=sheet.indexOf('async _runCanonicalExtraSkillUse(');
  assert.ok(start>=0);
  const body=sheet.slice(start,sheet.indexOf('  _resolveSheetCombatActionData(',start));
  assert.match(body,/ExtraSkillUseRegistry\.getForSkill\(skillKey, \{ actor: this\.actor \}\)/);
  assert.match(body,/SkillUseFilter\.rollSkillUseApplication\(this\.actor, selectedUse, payload\)/);
  const filter=read('scripts/utils/skill-use-filter.js');
  const p=filter.slice(filter.indexOf('static async rollSkillUseApplication('),filter.indexOf('static async _dispatchRestoreShieldRating('));
  assert.match(p,/const roll = await rollSkillCheck\(actor, skillKey,/);
  assert.ok(p.indexOf('executeQuickSabotage(')>p.indexOf('const perform = async'));
});

test('Master Saboteur is applied through one RollCore check, not a secondary Mechanics roller', () => {
  assert.equal(canMasterSaboteurReroll(actor(10),'disable-device'),true);
  assert.equal(canMasterSaboteurReroll(actor(10),'handle-explosives'),true);
  assert.equal(canMasterSaboteurReroll(actor(9),'disable-device'),false);
  assert.equal(canMasterSaboteurReroll(actor(10),'repair'),false);
  const skill=read('scripts/rolls/skills.js');
  assert.match(skill,/canMasterSaboteurReroll\(actor, saboteurUse\.application\)/);
  assert.match(skill,/baseDice: masterSaboteurDice \? '2d20kh1' : '1d20'/);
  assert.match(skill,/const rollResult = await RollCore\.execute\(/);
  assert.match(read('scripts/engine/roll/roll-core.js'),/d20Dice\.results\.find\(result => result\.active !== false\)/);
});

test('failed second swift spend refunds before any roll',async()=>{
  const log=[];
  const a=actor(10);
  await assert.rejects(executeQuickSabotage({
    actor:a,plan:planQuickSabotage(a,'complex'),
    spend:async(_actor,_type,meta)=>{
      log.push('spend'+meta.swiftIndex);
      if(meta.swiftIndex===2)return {committed:false};
      return {committed:true,rollback:async()=>{log.push('refund');return true;}};
    },
    perform:async()=>{log.push('roll');}
  }),/not committed/);
  assert.deepEqual(log,['spend1','spend2','refund']);
});

test('Shaper Lore and Master Saboteur composition initializes the check mode before use', () => {
  const code=read('scripts/rolls/skills.js');
  const start=code.indexOf('export async function rollSkill(');
  assert.ok(start>=0);
  const text=code.slice(start);
  const mode=text.indexOf('const skillCheckMode =');
  const master=text.indexOf('const masterSaboteurDice =');
  const roll=text.indexOf('const rollResult = await RollCore.execute(');
  assert.ok(mode>=0 && master>mode && roll>master,
    'Master Saboteur must not read skillCheckMode in its temporal dead zone');
  assert.match(text,/shaperLoreBonus\(actor,effectiveSkillKey,/);
  assert.match(text,/Shaper Lore \+\$\{shaperLore\}/);
  assert.match(text,/Master Saboteur: rolled twice, kept the higher d20/);
});
