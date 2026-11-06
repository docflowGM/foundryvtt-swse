#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const x=JSON.parse(readFileSync(new URL('../../../data/audits/droids/component-keep-003-cross-app-fixtures.json',import.meta.url),'utf8'));
assert.equal(x.fixtures.length,9);
assert.equal(new Set(x.fixtures.map(f=>f.id)).size,9);
assert.equal(x.fixtures.filter(f=>f.sourceExpected.status==='BLOCKED_SOURCE_CONFLICT').length,2);
assert.equal(x.fixtures.find(f=>f.id==='PAR-LOCO-001').sourceExpected.weightKg,10);
assert.equal(x.fixtures.find(f=>f.id==='PAR-LOCO-002').sourceExpected.upgradeCredits,100);
assert.equal(x.fixtures.find(f=>f.id==='PAR-LOCO-003').sourceExpected.mountWeightKg,10);
for (const f of x.fixtures) {
 assert.equal(f.readiness,'SPECIFICATION_ONLY_NOT_EXECUTED');
 assert(Object.values(f.applicationStatus).every(s=>s==='NOT_TESTED'));
}
assert.equal(x.summary.executedTests,0);
console.log('PASS: nine unexecuted parity specifications; two printed-price conflicts remain blocked');
