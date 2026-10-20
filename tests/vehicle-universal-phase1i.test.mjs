import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root='data/audits/vehicles/';
const current=JSON.parse(readFileSync(root+'swse-universal-phase1i-jedi-academy-training-manual.json','utf8'));
const previous=JSON.parse(readFileSync(root+'swse-universal-phase1h-galaxy-of-intrigue.json','utf8'));
const historic=JSON.parse(readFileSync(root+'swse-phase2b-jedi-academy-training-manual-book-source-closure-ledger.json','utf8'));
const shipRows=readFileSync('data/canonical/vehicles/ships.json','utf8').trim().split('\n').map(JSON.parse).filter(r=>r.sourceBook==='Jedi Academy Training Manual');
const sourceSha='c4dce616776949aa0501b8932012b82d6fd1cd1c27e9646f0a772ab596b4cea9';
const byKey=arr=>arr.map(r=>r.sourceEntryKey).sort();

test('1-I carries one previously audited vehicle and adds no speculative vehicles',()=>{
 assert.equal(historic.entries.length,1);
 assert.equal(shipRows.length,1);
 assert.equal(current.existingSpacecraft.length,1);
 assert.equal(current.newVehicleEntries.length,0);
 assert.equal(current.counts.inheritedSpacecraftPublicationClaims,1);
 assert.equal(current.counts.newOtherVehiclePublicationClaims,0);
 assert.equal(current.counts.allBookVehiclePublicationClaims,1);
 assert.equal(current.counts.cumulativeKnownUniversalPublicationClaims,previous.counts.cumulativeKnownUniversalPublicationClaims);
 assert.equal(current.mechanicsTransferredThisPhase,0);
 assert.equal(current.productionPackFilesChanged,false);
});
test('Chu-unthor historical name, identity, type, source hash and page remain exact',()=>{
 const [v]=current.existingSpacecraft, [old]=historic.entries, [ship]=shipRows;
 assert.deepEqual(byKey(current.existingSpacecraft),byKey(historic.entries));
 assert.deepEqual(byKey(current.existingSpacecraft),byKey(shipRows));
 assert.equal(current.sourcePdfSha256,sourceSha);
 assert.equal(historic.sourcePdfSha256,sourceSha);
 assert.equal(v.sourceEntryKey,'jatm-chu-unthor');
 assert.equal(v.printedName,"Chu'unthor");
 assert.equal(v.printedName,old.printedName);
 assert.equal(v.printedName,ship.name);
 assert.equal(v.printedTypeLine,'Colossal (station) capital ship');
 assert.equal(v.printedTypeLine,old.printedFacts.printedTypeLine);
 assert.equal(v.printedStatblockStartPage,151);
 assert.equal(v.printedStatblockStartPage,old.printedStatblockStartPage);
 assert.equal(v.pdfPhysicalPage,152);
 assert.equal(v.pdfPhysicalPage,old.phase1PdfPhysicalPage);
 assert.equal(v.provenance.sourcePdfSha256,sourceSha);
 assert.equal(v.existingCanonicalShip,true);
 assert.equal(v.reviewStatus,'INHERITED_SOURCE_CLOSE_READ_PDF_VERIFIED');
});
test('station wording does not create an extra ship or false separate facility',()=>{
 const [ship]=current.existingSpacecraft;
 assert.equal(ship.classification.primaryCategory,'capital-ship');
 assert.deepEqual(ship.classification.mobilityDomains,['space']);
 assert.ok(ship.classification.secondaryCategories.includes('station-configured-ship'));
 assert.ok(current.identityDecisions.some(x=>x.subject==="Chu'unthor"&&x.status==='REUSE_EXISTING_PUBLICATION_SHIP'));
 assert.equal(current.existingSpacecraft.filter(x=>x.sourceEntryKey==='jatm-chu-unthor').length,1);
});
test('whole book independently swept and nonstatblock vehicle mentions excluded',()=>{
 assert.ok(current.process.discoveryMethod.includes('161 scanned physical pages'));
 assert.ok(current.process.visualReviewScope.includes('all 161 physical pages'));
 assert.deepEqual(current.process.primaryPdfPagesConfirmed,[151]);
 const excluded=new Set(current.identityDecisions.map(x=>x.status));
 for(const status of ['EXCLUDE_UNSPECIFIED_CARRIED_CRAFT','EXCLUDE_NARRATIVE_ONLY','EXCLUDE_PLAYER_RULES_NOT_VEHICLES','EXCLUDE_EQUIPMENT_NOT_VEHICLES','EXCLUDE_NONVEHICLE_ACTOR_STATBLOCKS','EXCLUDE_INSTALLATION_DESCRIPTIONS']){
   assert.ok(excluded.has(status),'Missing explicit exclusion '+status);
 }
 assert.equal(current.process.mechanicalTranscriptionNotAuthorizedThisPhase,true);
});
