#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const dir='data/audits/vehicles/';
const read=n=>JSON.parse(fs.readFileSync(dir+n,'utf8'));
const shaBlob=path=>{const buf=fs.readFileSync(path);return crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+buf.length+'\0'),buf])).digest('hex')};
const C=read('swse-phase2b-sotg-cp19-full-100-ship-source-review-closeout.json');
const Q=read('swse-phase2b-sotg-cp17-strict-certification-work-queue.json');
const L=read('swse-phase2b-sotg-cp16-per-entry-certification-ledger.json');
const D=read('swse-phase2c-vehicle-v06-pressure-cases-cp16.json');
const P=read('swse-phase2c-cp18-approved-two-layer-policy.json');
const T=Array.from({length:7},(_,i)=>read('swse-phase2b-sotg-cp19-tranche0'+(i+1)+'-primary-source-review.json'));
assert.equal(C.schema,'swse.vehicle.sotg.cp19.source-review-closeout.v1');
assert.equal(C.approvedPolicyId,P.id);assert.equal(P.decision,'APPROVED');
assert.equal(C.sourcePdf.sha256,'e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0');
assert.equal(L.sourcePdfSha256,C.sourcePdf.sha256);
for(const x of C.originalAuthorityBlobs)assert.equal(shaBlob(x.path),x.blobSha,'immutable predecessor blob mismatch '+x.path);
assert.equal(L.entries.length,104);assert.equal(Q.workItems.length,100);
assert.equal(D.cases.length,155);
const printedAll=L.entries.reduce((total,e)=>total+e.mountAndFiringGroups.length,0);
const certified=L.entries.filter(e=>e.fullFieldCertified&&e.fullWeaponMountReconciled);
assert.equal(certified.length,4);assert.equal(printedAll,258);
assert.equal(certified.reduce((total,e)=>total+e.mountAndFiringGroups.length,0),1);
const workKeys=new Set(Q.workItems.map(e=>e.sourceEntryKey));
assert.equal(workKeys.size,100);
const seen=new Set(),positions=new Set();
let attackRows=0;
for(let trancheIdx=0;trancheIdx<7;trancheIdx++){
 const t=T[trancheIdx],range=C.tranches[trancheIdx];
 assert.equal(range.tranche,trancheIdx+1);
 assert.equal(range.ships,trancheIdx===6?10:15);
 assert.equal(t.entries.length,range.ships);
 assert.equal(range.startPosition,trancheIdx*15+1);
 assert.equal(range.endPosition,Math.min(100,trancheIdx*15+15));
 let trancheRows=0;
 for(let j=0;j<t.entries.length;j++){
  const x=t.entries[j],p=x.queuePosition??x.cp17QueuePosition??x.trancheIndex;
  assert.equal(p,range.startPosition+j,'tranche queue order mismatch');
  const q=Q.workItems[p-1];
  assert.equal(q.queuePosition,p);
  assert.equal(x.sourceEntryKey,q.sourceEntryKey);
  assert.equal(x.cp16LedgerIndex,q.cp16LedgerIndex);
  const e=L.entries[q.cp16LedgerIndex];
  assert.equal(e.sourceEntryKey,x.sourceEntryKey);
  assert.equal(x.printedName,e.printedName);
  const groupCount=e.mountAndFiringGroups.length;
  assert.ok(!seen.has(x.sourceEntryKey),'duplicate ship '+x.sourceEntryKey);
  seen.add(x.sourceEntryKey);positions.add(p);
  attackRows+=groupCount;trancheRows+=groupCount;
  if(trancheIdx<5)continue;
  assert.equal(x.reviewStatus,'ORIGINAL_MATCHING_SHA256_PDF_VISUAL_CLOSE_READ');
  assert.equal(x.cp17PriorityTrack,q.priorityTrack);
  assert.equal(x.printedStatblockStartPage,e.printedStatblockStartPage);
  assert.deepEqual(x.originalFieldExceptions,q.fieldGroupExceptions);
  assert.deepEqual(x.sourceConflictFieldGroups,q.sourceConflictFieldGroups);
  assert.equal(x.sourceFidelityCertificateGranted,false);
  assert.equal(x.newStrictPhysicalMountCertificateGranted,false);
  assert.equal(x.operationalStockAttackAuthorityGranted,false);
  assert.ok(x.reviewedPrintedPages.includes(e.printedStatblockStartPage));
  assert.ok(x.sourceObservations.length>=2);
  assert.equal(x.sourceAttackGroups.length,groupCount);
  for(const claim of x.sourceObservations){
    assert.ok(x.reviewedPrintedPages.includes(claim.printedPage));
    assert.ok(claim.kind&&claim.observation);
  }
  for(let k=0;k<groupCount;k++){
    assert.equal(x.sourceAttackGroups[k].cp16RowIndex,k);
    assert.deepEqual(x.sourceAttackGroups[k].originalRow,e.mountAndFiringGroups[k]);
  }
 }
 assert.equal(trancheRows,range.attackGroupRows,'tranche row census mismatch');
 if(trancheIdx>=5){
  assert.equal(t.counts.reviewedShipRecords,range.ships);
  assert.equal(t.counts.reviewedAttackGroupRows,trancheRows);
  assert.equal(t.counts.newSourceFidelityCertificates,0);
  assert.equal(t.counts.newPhysicalMountCertificates,0);
  assert.equal(t.counts.newOperationalAttackAuthorities,0);
  assert.equal(t.noProductionDataAltered,true);
  assert.equal(t.authority.cp16LedgerBlobSha,C.originalAuthorityBlobs[0].blobSha);
  assert.equal(t.authority.cp17QueueBlobSha,C.originalAuthorityBlobs[1].blobSha);
 }
}
assert.equal(seen.size,100);assert.equal(positions.size,100);
assert.ok([...seen].every(key=>workKeys.has(key)));
assert.equal(attackRows,257);
const final25=[...T[5].entries,...T[6].entries];
assert.equal(final25.length,25);
assert.deepEqual(final25.map(e=>e.queuePosition),Array.from({length:25},(_,i)=>76+i));
assert.equal(T[5].counts.reviewedAttackGroupRows,38);
assert.equal(T[6].counts.reviewedAttackGroupRows,18);
const tie=final25.find(e=>e.queuePosition===79);
assert.equal(tie.sourceEntryKey,'sotg-sienar-fleet-systems-tie-in-fighter');
assert.equal(tie.correctionCandidates.length,1);
assert.equal(tie.correctionCandidates[0].proposedEvidenceClass,'EXPLICIT_ABSENCE_ASSERTED_IN_PROSE');
assert.equal(tie.correctionCandidates[0].status,'PROVENANCE_CLASSIFICATION_CANDIDATE_NOT_APPLIED');
assert.equal(L.entries[tie.cp16LedgerIndex].fieldGroups.hyperdrive,'SOURCE_SILENT_CONFIRMED');
const last=final25.find(e=>e.queuePosition===100);
assert.equal(last.printedName,'Rendili Star Drive Light Corvette');
assert.equal(last.sourceAttackGroups.length,1);
assert.equal(last.sourceAttackGroups[0].originalRow.hardwareCount,6);
assert.equal(last.sourceAttackGroups[0].originalRow.batteryCount,1);
assert.equal(Q.workItems[99].priorityTrack,'P3_FIELD_SOURCE_SILENCE_OR_OTHER_GAP');
const lucrehulks=final25.filter(e=>e.queuePosition>=83&&e.queuePosition<=85);
assert.deepEqual(lucrehulks.map(e=>e.sourceAttackGroups.length),[3,3,1]);
assert.equal(T[5].entries.find(e=>e.queuePosition===86).sourceAttackGroups.length,5);
assert.deepEqual(C.counts,{
 publishedShipIdentities:104,preexistingStrictFieldAndMountCertificates:4,cp17UncertifiedQueue:100,
 cp19QueueShipReviewsComplete:100,cp19QueueShipReviewsRemaining:0,cp19QueueAttackGroupRowsReviewed:257,
 allPublicationAttackGroupRows:258,oldCertificateAttackGroupRows:1,discoveryOnlySchemaCases:155,
 newSourceFidelityCertificates:0,newPhysicalMountCertificates:0,newStockRuntimeAttackAuthorizations:0,
 existingStrictMechanicalBacklogUnresolved:100});
assert.equal(C.knownOpenIssues.proposedNumericOrHardwareLedgerCorrections.length,4);
assert.equal(C.knownOpenIssues.proposedNarrativeSourceEvidenceClassifications.length,1);
assert.equal(C.knownOpenIssues.publishedContradictionsPreserved,12);
assert.equal(C.knownOpenIssues.historicalMissingRowSourcePageKeys,8);
assert.equal(C.invariants.noAutomaticCorrectionsApplied,true);
assert.equal(C.invariants.sourceReviewCompletionDoesNotGrantCertification,true);
assert.equal(C.invariants.v06SchemaFrozen,false);
assert.equal(C.invariants.productionCompendiumHydrationAuthorized,false);
assert.equal(C.status,'SOURCE_REVIEW_COMPLETE_STRICT_MECHANICAL_CERTIFICATION_OUTSTANDING');
console.log('PASS CP19 CLOSEOUT: 100/100 distinct work queue ship identities with 257 source attack groups reviewed in seven tranches');
console.log('PASS CP19 CLOSEOUT: 104 total printed identities, 258 groups, four existing strict certificates, 155 separate schema-discovery cases');
console.log('PASS CP19 CLOSEOUT: old CP16/CP17 and previous 5 tranche Git blobs exactly unchanged');
console.log('PASS CP19 CLOSEOUT: TIE/In prose hyperdrive absence preserved as unapplied classification candidate; Rendili six turrets/one battery');
console.log('PASS CP19 CLOSEOUT: no new certifications, no runtime trust, no production or v0.6 schema changes');
console.log('LIMIT: this proves audit structure and manually reviewed records, not optical truth of every source page or mechanical certification');
