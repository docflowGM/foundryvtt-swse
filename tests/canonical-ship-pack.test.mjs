import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseShips,build,toActor,SOURCE,OUTPUT} from '../tools/vehicles/build-canonical-ships.mjs';
import {buildVehicleDerived} from '../scripts/actors/v2/vehicle-derived-builder.js';
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const text=readFileSync(join(root,SOURCE),'utf8'),db=readFileSync(join(root,OUTPUT),'utf8');
const rows=parseShips(text),actors=rows.map(toActor);
test('one ship per line: 316 canonical source and .db records',()=>{
 assert.equal(rows.length,316);assert.equal(actors.length,316);
 assert.equal(text.trimEnd().split('\n').length,316);
 assert.equal(db.trimEnd().split('\n').length,316);
 assert.equal(build(text),db);
 assert.equal(new Set(rows.map(x=>x.sourceBook+':'+x.sourceEntryKey)).size,316);
 assert.equal(rows.filter(x=>x.sourceBook==='Core Rulebook').length,10);
 assert.equal(rows.filter(x=>x.sourceBook==='Starships of the Galaxy').length,104);
 assert.equal(rows.filter(x=>x.ownerDecisionId).length,15);
});
test('canonical source never fabricates shields or attacks',()=>{
 for(const actor of actors){
  assert.deepEqual(actor.system.weapons,[]);
  assert.equal(actor.system.vehicleHasWeapons,false);
  assert.equal(actor.flags.swse.canonicalPublication.foundryStockAttackTrusted,false);
  assert.ok(!Object.hasOwn(actor.system,'stockSourceEntryKey'));
 }
 const yt=actors.find(x=>x.name==='Corellian YT-1300 Transport'&&x.system.sourcebook==='Core Rulebook');
 assert.equal(yt.system.hp.max,120);
 assert.ok(!Object.hasOwn(yt.system,'shields'));
});
test('source mechanics survive vehicle V2 derived builder',()=>{
 let checked=0;
 for(const actor of actors){
  const s=JSON.parse(JSON.stringify(actor.system));
  if(!s.hp||s.reflexDefense===undefined||s.damageThreshold===undefined)continue;
  buildVehicleDerived({},s);
  assert.equal(s.derived.hp.max,s.hp.max);
  assert.equal(s.derived.defenses.ref.total,s.reflexDefense);
  assert.equal(s.derived.damage.threshold,s.damageThreshold);
  checked++;
 }
 assert.ok(checked>250);
});
test('invalid/shortened catalog is rejected',()=>{
 assert.throws(()=>parseShips(text.split('\n').slice(1).join('\n')),/ROSTER_MISMATCH|INVALID_SHIP/);
});
