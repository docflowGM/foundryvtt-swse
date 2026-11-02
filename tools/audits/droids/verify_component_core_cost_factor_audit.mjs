import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const p=JSON.parse(readFileSync(new URL('../../../data/audits/droids/component-core-cost-factor-audit.json',import.meta.url),'utf8'));
assert.equal(p.rows.length,9);
assert.deepEqual(p.rows.map(x=>x.sourceCostFactor),[20,10,5,2,1,2,5,10,20]);
assert.equal(p.rows.filter(x=>x.mismatch).length,7);
assert.equal(p.rows.filter(x=>x.progressionFactor!==null&&x.progressionFactor!==x.sourceCostFactor).length,0);
assert.equal(p.counts.productionMutations,0);
console.log('PASS: 9 printed factors, 7 shared mismatches, no production changes');
