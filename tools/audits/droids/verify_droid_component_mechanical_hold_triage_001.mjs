#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = relative => JSON.parse(readFileSync(new URL('../../../'+relative, import.meta.url),'utf8'));
const root='data/audits/droids/';
const t=read(root+'droid-component-mechanical-hold-triage-001.json');
const ledger=read(root+'component-mechanical-certification-ledger.json');
const errata=read(root+'droid-component-official-errata-authority-001.json');
const canon=read(root+'component-122-identity-source-coverage.json');
assert.equal(t.rows.length,23);
assert.equal(new Set(t.rows.map(x=>x.canonicalId)).size,23);
assert.equal(canon.rows.length,122);
const old=new Map(ledger.sourceAuditHolds.map(h=>[h.canonicalId,h]));
const refs=new Map(canon.rows.map(h=>[h.canonicalId,h.canonicalName]));
assert.equal(old.size,23);
for(const row of t.rows){
 assert.equal(refs.get(row.canonicalId),row.name);
 assert.equal(old.get(row.canonicalId)?.name,row.name);
 assert.equal(old.get(row.canonicalId)?.batch,row.sourceBatch);
 assert.equal(row.decision,'HOLD_UNCHANGED');
 assert.equal(row.sourcePassPromotion,false);
 assert.equal(row.foundryRuntimeCertified,false);
 assert(row.resolutionEvidenceRequired?.length>=20);
 assert(row.sourceSafeSubset?.length>=20);
 assert(row.originalSourceHoldReason?.length>=15);
}
assert.equal(t.counts.heldBefore,23);
assert.equal(t.counts.heldAfter,23);
assert.equal(t.counts.sourcePassPromotions,0);
assert.equal(ledger.counts.sourceMechanicsOnHold,23);
assert.equal(ledger.counts.totalSourceMechanicalCertified,99);
assert.equal(errata.corrections.synchronizedFireCircuits.errataReplacementTotalBonus,5);
assert.equal(errata.corrections.accessoryWeight.accessoryWeightFactorBySize.tiny,0.4);
assert.equal(errata.corrections.startingSystemsCarryingCapacity.encumbranceAddedForStartingSystemsKg,0);
console.log('PASS HOLD001: 23 preserved canonical holds, explicit source/GM resolution gates, official errata precedence, zero promotions');
