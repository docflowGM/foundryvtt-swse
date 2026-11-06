import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {CP9B_PACKS,parsePackSource,auditRoundTrip,stagePackSource} from '../tools/audits/vehicles/build_phase2c_cp9b_native_packs.mjs';

test('171 source ship identities preserved across certified two-pack staging',()=>{
  let n=0;
  for(const spec of CP9B_PACKS){
    const raw=readFileSync(new URL('../'+spec.source,import.meta.url),'utf8');
    const parsed=parsePackSource(raw,spec);
    assert.equal(parsed.rows.length,spec.expectedCount);
    n+=parsed.rows.length;
    for(const id of spec.pilotIds)assert.ok(parsed.index.get(id),'missing source-certified '+id);
    assert.equal(auditRoundTrip(parsed,parsed.rows,spec).ok,true);
  }
  assert.equal(n,171);
});
test('staged JSON adds native Actor key without touching canonical JSONL input',()=>{
  const temp=mkdtempSync(join(tmpdir(),'cp9b-test-'));
  try{
    const spec=CP9B_PACKS[1];
    const raw=readFileSync(new URL('../'+spec.source,import.meta.url),'utf8');
    const built=stagePackSource({root:new URL('../',import.meta.url).pathname,stageDir:temp,spec});
    const files=readdirSync(built.files).filter(f=>f.endsWith('.json'));
    assert.equal(files.length,63);
    const doc=JSON.parse(readFileSync(join(built.files,files[0]),'utf8'));
    assert.equal(doc._key,'!actors!'+doc._id);
    assert.equal(raw.includes('"_key":'),false);
  }finally{rmSync(temp,{recursive:true,force:true});}
});
test('roundtrip detects missing document, duplicate ID and tampered source-derived stats',()=>{
  const spec=CP9B_PACKS[0];
  const parsed=parsePackSource(readFileSync(new URL('../'+spec.source,import.meta.url),'utf8'),spec);
  assert.ok(auditRoundTrip(parsed,parsed.rows.slice(1),spec).failures.some(x=>x.startsWith('MISSING_ID:')));
  assert.ok(auditRoundTrip(parsed,[...parsed.rows.slice(1),parsed.rows[1]],spec).failures.includes('DUPLICATE_EXTRACTED_ID'));
  const altered=structuredClone(parsed.rows);
  altered.find(x=>x._id==='4d5b3422047f5eb8').system.weapons[0].printedAttackTotal='+99';
  assert.ok(auditRoundTrip(parsed,altered,spec).failures.some(x=>x.includes('PILOT_FIELD_DRIFT:4d5b3422047f5eb8:system.weapons')));
});
test('null semantics distinguish source-unavailable from explicit published absence',()=>{
  const spec=CP9B_PACKS[0];
  const parsed=parsePackSource(readFileSync(new URL('../'+spec.source,import.meta.url),'utf8'),spec);
  const action=parsed.index.get('97c5c070d93b7a0a');
  assert.equal(action.system.vehicleHasNavicomputer,null);
  assert.equal(action.system.carried_craft,'None');
  assert.deepEqual(action.system.weapons,[]);
});
