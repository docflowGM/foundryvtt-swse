#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const load = (name) => JSON.parse(fs.readFileSync('data/audits/vehicles/'+name,'utf8'));
const blob = (name) => {const raw=fs.readFileSync(name);return crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+raw.length+'\0'),raw])).digest('hex');};
const v=load('swse-phase2b-sotg-cp19-tranche02-primary-source-review.json');
const ledger=load('swse-phase2b-sotg-cp16-per-entry-certification-ledger.json');
const queue=load('swse-phase2b-sotg-cp17-strict-certification-work-queue.json');
const previous=load('swse-phase2b-sotg-cp19-tranche01-primary-source-review.json');
const policy=load('swse-phase2c-cp18-approved-two-layer-policy.json');
assert.equal(v.schema,'swse.vehicle.sotg.cp19.tranche02.primary-pdf-review.v1');
assert.equal(v.authority.policyId,policy.id);assert.equal(policy.id,'SOTG-CP18-D01');
assert.equal(v.authority.cp16LedgerBlobSha,blob(v.authority.cp16LedgerPath));
assert.equal(v.authority.cp17QueueBlobSha,blob(v.authority.cp17QueuePath));
assert.equal(v.authority.cp19Tranche01BlobSha,blob(v.authority.cp19Tranche01Path));
assert.equal(v.pdf.sha256,ledger.sourcePdfSha256);
assert.equal(v.pdf.sha256,'e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0');
assert.equal(previous.entries.length,15);assert.equal(queue.workItems.length,100);assert.equal(ledger.entries.length,104);
assert.deepEqual(v.positionRange,[16,30]);assert.equal(v.trancheSize,15);assert.equal(v.entries.length,15);
const pages=new Set(),keys=new Set();
for(let i=0;i<15;i++){
 const x=v.entries[i],q=queue.workItems[i+15],s=ledger.entries[q.cp16LedgerIndex];
 assert.equal(x.cp17QueuePosition,i+16);
 assert.equal(x.cp17QueuePosition,q.queuePosition);assert.equal(x.cp16LedgerIndex,q.cp16LedgerIndex);
 assert.equal(x.sourceEntryKey,s.sourceEntryKey);assert.equal(x.sourceEntryKey,q.sourceEntryKey);
 assert.equal(x.printedName,s.printedName);assert.equal(x.statblockStartPage,s.printedStatblockStartPage);
 assert.equal(x.priorTrack,'P2_PHYSICAL_SOURCE_SILENCE');
 assert.deepEqual(x.originalSourceConflictFieldGroups,[]);
 assert.ok(x.visualPdfPages.includes(s.printedStatblockStartPage));
 assert.equal(x.currentSourceGroupObservations.length,s.mountAndFiringGroups.length);
 assert.equal(x.certification.sourceReviewComplete,true);
 assert.equal(x.certification.newSourceFidelityCertified,false);
 assert.equal(x.certification.newPhysicalMountCertified,false);
 assert.equal(x.certification.automatedStockAttackAuthorityGranted,false);
 assert.equal(x.reviewMethod,'ORIGINAL_PDF_RENDERED_PRIMARY_SOURCE_CLOSE_READ');
 assert.ok(x.reviewDisposition && x.reviewFinding && x.sourceMechanicsReview.length>=2);
 assert.ok(!keys.has(x.sourceEntryKey));keys.add(x.sourceEntryKey);
 for(const page of x.visualPdfPages)pages.add(page);
 for(const e of x.sourceMechanicsReview){assert.ok(x.visualPdfPages.includes(e.printedPage));assert.ok(e.kind&&e.observation);}
 for(let k=0;k<s.mountAndFiringGroups.length;k++){
   const a=x.currentSourceGroupObservations[k],b=s.mountAndFiringGroups[k];
   assert.equal(a.sourceRowIndex,k);assert.equal(a.weaponLabel,b.weaponLabel);assert.equal(a.station,b.station);
   assert.equal(a.sourcePageRecorded,Object.hasOwn(b,'sourcePage'));
   for(const field of ['hardwareCount','firingArc','batteryCount']){
     assert.equal(a[field].recorded,Object.hasOwn(b,field));
     assert.deepEqual(a[field].rawValue,Object.hasOwn(b,field)?b[field]:null);
     assert.equal(a[field].observedState,!Object.hasOwn(b,field)?'KEY_NOT_STORED':b[field]==='SOURCE_SILENT_CONFIRMED'?'SOURCE_SILENT_CONFIRMED':'VALUE_RECORDED');
   }
 }
}
assert.deepEqual([...pages].sort((a,b)=>a-b),v.pdf.renderedAndInspectedPages);
assert.equal(pages.size,16);
assert.deepEqual(v.counts,{reviewedInThisTranche:15,reviewedAcrossTranches:30,originalQueue:100,remainingUnreviewedInTrancheSeries:70,sourceSilentTrack:15,sourceGroupRows:39,sourceEvidenceCorrectionsProposed:1,newSourceFidelityCertificates:0,newPhysicalMountCertificates:0,newOperationalStockAttackAuthorities:0});
assert.equal(v.entries.filter(x=>x.sourceCorrectionCandidate!==null).length,1);
const candidate=v.entries[1].sourceCorrectionCandidate;
assert.equal(candidate.sourceRowIndex,1);assert.equal(candidate.field,'hardwareCount');
assert.equal(candidate.currentLedgerValue,'SOURCE_SILENT_CONFIRMED');
assert.equal(candidate.sourceSupportedPhysicalCount,2);
assert.equal(candidate.sourcePrintedPage,57);
assert.equal(candidate.disposition,'AUDIT_CORRECTION_CANDIDATE_NOT_APPLIED_TO_CP16');
assert.equal(ledger.entries[1].mountAndFiringGroups[1].hardwareCount,'SOURCE_SILENT_CONFIRMED');
assert.equal(v.entries[10].sourceMechanicsReview[0].observation.includes('2 ion cannons'),true);
assert.equal(v.entries[10].currentSourceGroupObservations[1].hardwareCount.rawValue,2);
assert.equal(v.entries[14].currentSourceGroupObservations[2].hardwareCount.rawValue,2);
assert.equal(v.sourceDataMutated,false);assert.equal(v.productionHydrationAuthorized,false);
assert.equal(v.vehicleCombatIntegrationTouched,false);assert.equal(v.universalSchemaFrozen,false);
const previousKeys=new Set(previous.entries.map(e=>e.sourceEntryKey));
assert.ok(v.entries.every(e=>!previousKeys.has(e.sourceEntryKey)));
console.log('PASS CP19 T02: 15 distinct primary-PDF reviewed records, positions 16-30, 16 unique source pages');
console.log('PASS CP19 T02: 39 immutable attack groups, readback of raw count/arc/battery source states');
console.log('PASS CP19 T02: Acclamator II two proton-torpedo tubes recorded as unapplied source correction candidate');
console.log('PASS CP19 T02: preserve original CP16 and CP17 provenance and 15-ship T1 no overlap');
console.log('PASS CP19 T02: 0 new source fidelity / physical mount / operational stock authorizations');
