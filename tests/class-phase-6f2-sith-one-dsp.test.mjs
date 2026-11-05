import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

test('both Sith prestige registries use numeric 1 DSP, retaining other requirements',()=>{
 const registry=read('scripts/data/prestige-prerequisites.js');
 for(const name of ['Sith Apprentice','Sith Lord']){
   const start=registry.indexOf("'"+name+"': {");
   assert.ok(start>=0,name+' missing');
   const next=registry.indexOf("\n    },",start);
   const block=registry.slice(start,next+7);
   assert.match(block,/darkSideScore: 1/);
   assert.match(block,/type: 'dark_side', min: 1/);
   assert.match(block,/type: 'table_state'/); // membership remains GM advisory
   assert.match(block,/type: 'skill'/);
   assert.match(block,/type: 'feat'/);
   assert.doesNotMatch(block,/darkSideScore: 'wisdom'/);
   if(name==='Sith Lord')assert.match(block,/force_technique_count/);
 }
});

test('display reference accurately identifies project house rule and does not claim RAW',()=>{
 const data=JSON.parse(read('data/prestige-class-prerequisites.json'));
 for(const name of ['Sith Apprentice','Sith Lord']){
   assert.ok(data[name]);
   assert.match(data[name].description,/Dark Side Score at least 1 \(project house rule/);
   assert.ok(data[name].other.some(x=>x.includes('GM adjudicates Sith membership')));
   assert.ok(!data[name].other.some(x=>x.includes('Equal to Wisdom')));
 }
});

test('prestige checker enforces 1 DSP while leaving Sith membership to the GM',()=>{
 const code=read('scripts/data/prerequisite-checker.js');
 const begin=code.indexOf('function checkDarkSideScore(');
 const snippet=code.slice(begin,begin+1600);
 assert.ok(begin>=0);
 assert.match(snippet,/className === 'Sith Apprentice' \|\| className === 'Sith Lord'/);
 assert.match(snippet,/const required = sithClass \? 1/);
 assert.match(snippet,/DSPEngine\.meetsThreshold\(actor, required\)/);
 assert.doesNotMatch(snippet,/getSithApprenticeMinimumDSP\(/);
 assert.doesNotMatch(snippet,/getSithLordMinimumDSP\(/);
});

test('legacy Sith percentage settings are not presented as active world rules',()=>{
 const settings=read('scripts/core/settings.js');
 for(const name of ['sithApprenticeMinimumDSP','sithLordMinimumDSP']) {
   const begin=settings.indexOf('"'+name+'"');
   assert.ok(begin>=0);
   const block=settings.slice(begin,settings.indexOf('});',begin));
   assert.match(block,/config: false/);
   assert.match(block,/default: "minimum"/);
 }
});
