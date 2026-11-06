import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root='data/audits/vehicles/';
const json=(p)=>JSON.parse(readFileSync(root+p,'utf8'));
const seven=[
 ['h','galaxy-of-intrigue','Galaxy of Intrigue',2],
 ['i','jedi-academy-training-manual','Jedi Academy Training Manual',0],
 ['j','legacy-era-campaign-guide','Legacy Era Campaign Guide',10],
 ['k','rebellion-era-campaign-guide','Rebellion Era Campaign Guide',18],
 ['l','threats-of-the-galaxy','Threats of the Galaxy',4],
 ['m','unknown-regions','Unknown Regions',13],
 ['n','scavengers-guide-to-droids',"Scavenger's Guide to Droids",1],
];
const stages=[
 'a-core-rulebook','b-starships-of-the-galaxy','c-clone-wars','d-kotor','e-force-unleashed','f-scum-and-villainy','g-galaxy-at-war',
 ...seven.map(x=>x[0]+'-'+x[1])
].map(slug=>json('swse-universal-phase2'+slug+'-staged.json'));
const queue=json('swse-universal-phase3-source-pdf-qa-queue.json');
const staged=stages.flatMap(x=>x.records);
const byId=new Map(staged.map(r=>[r.identity.sourceEntryKey,r]));
test('429 unchanged source-specific publication claims across all fourteen staged books',()=>{
 assert.equal(stages.length,14);assert.equal(staged.length,429);assert.equal(byId.size,429);
 assert.deepEqual(stages.map(x=>x.records.length),[17,105,67,39,34,13,11,8,1,49,53,5,26,1]);
 for(const x of stages){assert.equal(x.productionPacksChanged,false);assert.equal(x.generatedActorsChanged,false);}
});
test('48/48 final-seven newly discovered PDF-field verifications match Phase1 frozen identities',()=>{
 const entries=seven.flatMap(([letter,slug,book,count])=>{
  const l=json('swse-universal-phase1'+letter+'-'+slug+'.json');
  assert.equal(l.sourceBook,book);assert.equal(l.newVehicleEntries.length,count);
  return l.newVehicleEntries.map(e=>({...e,sourceBook:book,sourcePdfSha256:l.sourcePdfSha256}));
 });
 assert.equal(entries.length,48);assert.equal(new Set(entries.map(x=>x.sourceEntryKey)).size,48);
 assert.deepEqual(queue.pdfFieldQA,{total:48,verified:48,pending:0});
 assert.equal(queue.records.length,48);
 assert.deepEqual(queue.records.map(x=>x.sourceEntryKey).sort(),entries.map(x=>x.sourceEntryKey).sort());
 for(const e of entries){
  const proof=queue.records.find(x=>x.sourceEntryKey===e.sourceEntryKey);
  const r=byId.get(e.sourceEntryKey);
  assert.ok(r);assert.ok(proof);
  assert.equal(proof.sourceBook,e.sourceBook);
  assert.equal(proof.sourcePdfSha256,e.sourcePdfSha256);
  assert.equal(proof.printedPage,e.printedStatblockStartPage);
  assert.equal(proof.pdfPhysicalPage,e.pdfPhysicalPage);
  assert.equal(proof.status,'pdf-field-verified');
  assert.equal(proof.strictMechanicalCertification,'not-certified');
  assert.equal(r.publication.book,e.sourceBook);
  assert.equal(r.publication.page,e.printedStatblockStartPage);
  assert.equal(r.rules.reviewStatus,'partial-source-probe');
  assert.equal(r.fieldStates['/rules/strictMechanicalCertification'],'not-yet-reviewed');
  assert.equal(Object.hasOwn(r.armament,'weaponMounts'),false);
  assert.ok(r.armament.firingGroups.every(group=>Array.isArray(group.mountKeys)&&group.mountKeys.length===0));
 }
});
test('no historical ship claims are copied into targeted 48-record PDF field QA queue',()=>{
 const allLegacy=seven.flatMap(([letter,slug])=>{
  const l=json('swse-universal-phase1'+letter+'-'+slug+'.json');
  return [...l.existingSpacecraft,...(l.approvedSupplementalSpacecraft||[])].map(r=>r.sourceEntryKey);
 });
 assert.equal(allLegacy.length,95); // 94 historical ships and one approved Deep-X supplement
 const queueSet=new Set(queue.records.map(r=>r.sourceEntryKey));
 assert.ok(allLegacy.every(key=>!queueSet.has(key)));
});
