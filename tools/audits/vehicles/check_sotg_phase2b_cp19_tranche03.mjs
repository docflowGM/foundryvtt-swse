#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const d='data/audits/vehicles/';
const read = name=>JSON.parse(fs.readFileSync(d+name,'utf8'));
const gitBlob = filename=>{const buf=fs.readFileSync(filename);return crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+buf.length+'\0'),buf])).digest('hex');};
const v=read('swse-phase2b-sotg-cp19-tranche03-primary-source-review.json');
const l=read('swse-phase2b-sotg-cp16-per-entry-certification-ledger.json');
const q=read('swse-phase2b-sotg-cp17-strict-certification-work-queue.json');
const t1=read('swse-phase2b-sotg-cp19-tranche01-primary-source-review.json');
const t2=read('swse-phase2b-sotg-cp19-tranche02-primary-source-review.json');
const policy=read('swse-phase2c-cp18-approved-two-layer-policy.json');
assert.equal(v.schema,'swse.vehicle.sotg.cp19.tranche03.primary-pdf-review.v1');
assert.equal(v.authority.policyId,policy.id);assert.equal(policy.id,'SOTG-CP18-D01');assert.equal(policy.decision,'APPROVED');
assert.equal(v.pdf.sha256,l.sourcePdfSha256);
assert.equal(v.pdf.sha256,'e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0');
for(const [file,sha] of [
[v.authority.originalCp16LedgerPath,v.authority.cp16LedgerGitBlobSha],
[v.authority.cp17QueuePath,v.authority.cp17QueueGitBlobSha],
[v.authority.tranche01Path,v.authority.tranche01BlobSha],
[v.authority.tranche02Path,v.authority.tranche02BlobSha]]){
 assert.equal(gitBlob(file),sha,'Git blob source drift: '+file);
}
assert.equal(l.entries.length,104);assert.equal(q.workItems.length,100);
assert.equal(t1.entries.length,15);assert.equal(t2.entries.length,15);
assert.deepEqual(v.positionRange,[31,45]);assert.equal(v.trancheSize,15);assert.equal(v.entries.length,15);
const seen=new Set([...t1.entries,...t2.entries].map(x=>x.sourceEntryKey));
assert.equal(seen.size,30);
const observedPages=new Set();let groups=0;let corrections=[];
for(let i=0;i<15;i++){
 const x=v.entries[i],qrow=q.workItems[i+30],src=l.entries[qrow.cp16LedgerIndex];
 assert.equal(x.queuePosition,i+31);assert.equal(qrow.queuePosition,i+31);
 assert.equal(x.cp16LedgerIndex,qrow.cp16LedgerIndex);
 assert.equal(x.sourceEntryKey,qrow.sourceEntryKey);
 assert.equal(x.sourceEntryKey,src.sourceEntryKey);
 assert.equal(x.printedName,src.printedName);
 assert.equal(x.printedStatblockStartPage,src.printedStatblockStartPage);
 assert.equal(x.cp17PriorityTrack,qrow.priorityTrack);
 assert.equal(x.cp17PriorityTrack,'P2_PHYSICAL_SOURCE_SILENCE');
 assert.deepEqual(x.previouslyRecordedFieldExceptions,qrow.fieldGroupExceptions);
 assert.deepEqual(x.sourceConflictFieldGroups,qrow.sourceConflictFieldGroups);
 assert.equal(x.primarySourceReview,'ORIGINAL_RENDERED_PDF_PAGE_CLOSE_READ');
 assert.ok(x.reviewFinding && x.reviewType);
 assert.ok(x.renderedPdfPages.includes(x.printedStatblockStartPage));
 assert.ok(!seen.has(x.sourceEntryKey));seen.add(x.sourceEntryKey);
 assert.equal(x.attackGroupSnapshots.length,src.mountAndFiringGroups.length);
 groups+=x.attackGroupSnapshots.length;
 for(const page of x.renderedPdfPages)observedPages.add(page);
 for(const claim of x.sourceObservations){
   assert.ok(x.renderedPdfPages.includes(claim.printedPage));
   assert.ok(claim.kind && claim.observation);
 }
 for(let j=0;j<src.mountAndFiringGroups.length;j++){
   const row=x.attackGroupSnapshots[j],original=src.mountAndFiringGroups[j];
   assert.equal(row.sourceRowIndex,j);
   assert.deepEqual(row.sourceLedgerRow,original);
   assert.equal(row.printedSourcePagePresent,Object.hasOwn(original,'sourcePage'));
 }
 assert.deepEqual(x.certification,{reviewed:true,sourceFidelityCertificateGranted:false,
 newStrictPhysicalMountCertificateGranted:false,automatedStockAttackAuthorityGranted:false,
 reason:'INDIVIDUAL_SCHEMA_AND_MECHANICS_CERTIFICATION_REMAINS_OPEN'});
 corrections.push(...x.correctionCandidates.map(c=>({...c,ship:x.printedName})));
}
assert.equal(seen.size,45);
assert.equal(groups,40);
assert.deepEqual([...observedPages].sort((a,b)=>a-b),v.pdf.renderedAndVisuallyInspectedPages);
assert.deepEqual(v.pdf.renderedAndVisuallyInspectedPages,[77,78,79,80,81,82,83,84,85,86,87,90,91,92,93]);
assert.equal(v.counts.shipsReviewedAcrossTranches,45);
assert.equal(v.counts.remainingOriginalWorkQueue,55);
assert.equal(v.counts.attackGroupsObserved,40);
assert.equal(v.counts.sourceCorrectionCandidates,2);
assert.equal(v.counts.newSourceFidelityCertificates,0);
assert.equal(v.counts.newStrictPhysicalMountCertificates,0);
assert.equal(v.counts.newAutomatedStockAttackAuthorizations,0);
assert.equal(corrections.length,2);
assert.deepEqual(corrections.map(c=>[c.sourceField,c.recordedValue,c.sourceSupportedValue,c.sourcePrintedPage]),
  [['damage','10d10x2','8d10x2',85],['hardwareCount','SOURCE_SILENT_CONFIRMED',4,93]]);
assert.equal(v.entries[8].printedName,'Slave I');
assert.equal(l.entries[v.entries[8].cp16LedgerIndex].mountAndFiringGroups[1].damage,'10d10x2');
assert.equal(v.entries[14].printedName,'Hapan Battle Dragon');
assert.equal(l.entries[v.entries[14].cp16LedgerIndex].mountAndFiringGroups[5].hardwareCount,'SOURCE_SILENT_CONFIRMED');
assert.equal(v.entries[3].attackGroupSnapshots[0].sourceLedgerRow.hardwareCount,1);
assert.equal(v.entries[3].attackGroupSnapshots[1].sourceLedgerRow.hardwareCount,3);
assert.equal(v.entries[7].attackGroupSnapshots[0].sourceLedgerRow.hardwareCount,2);
assert.equal(v.entries[12].attackGroupSnapshots[0].sourceLedgerRow.hardwareCount,2);
assert.equal(v.entries[12].attackGroupSnapshots[1].sourceLedgerRow.hardwareCount,3);
assert.equal(v.entries[13].attackGroupSnapshots[0].sourceLedgerRow.hardwareCount,8);
assert.deepEqual(v.boundaries,{cp16LedgerMutated:false,cp17QueueMutated:false,productionHydrationAuthorized:false,universalVehicleSchemaFrozen:false,vehicleCombatIntegrationTouched:false,pureModifiedRefactorTouched:false,certificationsNewlyGranted:0,sourcebookClaimChangesAutoApplied:0});
console.log('PASS CP19 T03: sourcebook 15 reviewed ship identities, 15 distinct source pages, 40 attack group rows');
console.log('PASS CP19 T03: CP16/CP17 and first two tranche Git blobs immutable; cumulative 45/100 disjoint');
console.log('PASS CP19 T03: Slave I concussion mine printed damage and Hapan 4 pulse tubes correction candidates unapplied');
console.log('PASS CP19 T03: old physical hardware counts preserved, zero extra source-fidelity or runtime certifications');
console.log('LIMIT: structural validation uses manually visually reviewed PDF observations; no automated PDF optical validation');
