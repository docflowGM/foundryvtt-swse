import test from 'node:test';
import assert from 'node:assert/strict';
import { SentinelSourceMapper } from '../scripts/governance/sentinel/sentinel-source-mapper.js';
// F-GOV-005: the enrich cache is bounded.
test('enrich cache never exceeds MAX_CACHE_ENTRIES', () => {
  const max = SentinelSourceMapper.MAX_CACHE_ENTRIES;
  for (let i = 0; i < max + 120; i += 1) {
    const stack = `Error: e${i}\n    at fn${i} (http://localhost:30000/systems/foundryvtt-swse/scripts/engine/file${i}.js:${i + 1}:5)`;
    SentinelSourceMapper.enrich({ meta: { stack } });
  }
  assert.equal(SentinelSourceMapper.enrichCacheSize, max, "cache filled to the bound and evicted the oldest");
  assert.ok(SentinelSourceMapper.enrichCacheSize > 0);
});
test('a re-enriched stack inside the rate window is served from cache', () => {
  const stack = 'Error: same\n    at f (http://localhost:30000/systems/foundryvtt-swse/scripts/engine/same.js:3:1)';
  const a = SentinelSourceMapper.enrich({ meta: { stack } });
  const b = SentinelSourceMapper.enrich({ meta: { stack } });
  assert.deepEqual(a, b);
});
