import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  shaperClassLevel,isShaperLoreSkill,shaperLoreBonus,canApplyShaperLore,
} from '../scripts/engine/skills/class-shaper-lore.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path=>fs.readFileSync(path,'utf8');
const actor=level=>({
  id:'shaper',items:[{type:'class',name:'Shaper',system:{level}}],
});

test('Shaper Lore follows its printed even-level +1 to +5 schedule',()=>{
 for(let level=0;level<=10;level++){
   const value=Math.floor(level/2);
   for(const skillKey of ['knowledge-life-sciences','knowledgeLifeSciences','Knowledge (Life Sciences)','treat-injury','treatInjury']){
     assert.equal(shaperLoreBonus(actor(level),skillKey,{biotechDevice:true}),value,'level '+level+': '+skillKey);
     assert.equal(canApplyShaperLore(actor(level),skillKey),value>0);
   }
 }
 assert.equal(shaperLoreBonus(actor(15),'treat-injury',{biotechDevice:true}),5);
});

test('the subject must explicitly be a biotech device; ordinary checks receive no bonus',()=>{
 for(const skillKey of ['knowledge-life-sciences','treat-injury']){
   assert.equal(shaperLoreBonus(actor(10),skillKey),0);
   assert.equal(shaperLoreBonus(actor(10),skillKey,{biotechDevice:false}),0);
   assert.equal(shaperLoreBonus(actor(10),skillKey,{biotechDevice:'true'}),0);
   assert.equal(shaperLoreBonus(actor(10),skillKey,{biotechDevice:true}),5);
 }
 for(const skillKey of ['mechanics','use-computer','knowledge-tactics','perception','treat-injuries']){
   assert.equal(isShaperLoreSkill(skillKey),false);
   assert.equal(shaperLoreBonus(actor(10),skillKey,{biotechDevice:true}),0);
 }
});

test('Shaper Lore requires genuinely owned Shaper class levels, not an Item name',()=>{
 assert.equal(shaperClassLevel(null),0);
 assert.equal(shaperLoreBonus(null,'treat-injury',{biotechDevice:true}),0);
 const spoofed={items:[{type:'feat',name:'Shaper',system:{level:10}},
   {type:'class',name:'Jedi',system:{level:15}}]};
 assert.equal(shaperClassLevel(spoofed),0);
 assert.equal(shaperLoreBonus(spoofed,'treat-injury',{biotechDevice:true}),0);
 const owned={items:{contents:[{type:'class',system:{class_name:'Shaper',level:6}}]}};
 assert.equal(shaperLoreBonus(owned,'treat-injury',{biotechDevice:true}),3);
});

test('canonical skill roll adds Shaper Lore once, with audit evidence',()=>{
 const code=source(path.join(root,'scripts/rolls/skills.js'));
 assert.match(code,/const shaperLore = shaperLoreBonus\(actor,effectiveSkillKey,/);
 assert.match(code,/biotechDevice:options\?\.biotechDevice === true/);
 assert.match(code,/baseBonus: canonicalTotal[\s\S]{0,220}\+ shaperLore,/);
 assert.match(code,/situationalMods: rollResult\.modifierTotal/);
 assert.match(code,/classSkillBonuses: shaperLore \? \[\{name:'Shaper Lore',value:shaperLore\}\] : \[\]/);
 assert.match(code,/Shaper Lore \+\$\{shaperLore\}/);
 assert.match(code,/shaperLoreBonus: shaperLore/);
});

test('roll card presents a single named class bonus without merging it into feats or gear',()=>{
 const renderer=source(path.join(root,'scripts/engine/rolls/swse-roll-engine.js'));
 assert.match(renderer,/category === 'skill' && Array\.isArray\(context\?\.classSkillBonuses\)/);
 assert.match(renderer,/context\.classSkillBonuses/);
 assert.match(renderer,/label: this\._stripHtml\(bonus\?\.name \|\| 'Class Feature'\)/);
 const code=source(path.join(root,'scripts/rolls/skills.js'));
 assert.match(code,/classSkillBonuses: shaperLore \? \[\{name:'Shaper Lore',value:shaperLore\}\] : \[\]/);
 assert.doesNotMatch(code,/situationalMods:[^\n]*\+ shaperLore/);
});

test('skill dialog exposes a context check and preview only for eligible Shapers',()=>{
 const code=source(path.join(root,'scripts/rolls/roll-config.js'));
 assert.match(code,/model\.rollType === 'skill'[\s\S]{0,100}canApplyShaperLore/);
 assert.match(code,/name="biotechDevice"/);
 assert.match(code,/biotechDevice: shaperLoreEligible && data\.get\('biotechDevice'\) === 'on'/);
 assert.match(code,/shaperLoreBonus\(actor,model\.skillKey,/);
 assert.match(code,/const total = base \+ custom \+ classBonus/);
 assert.match(code,/const shaperLoreEligible/);
 assert.match(code,/form\.addEventListener\('change', update\)/);
});
