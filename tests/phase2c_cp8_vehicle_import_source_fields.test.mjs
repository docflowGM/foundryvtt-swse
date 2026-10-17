import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Execute the existing production pure functions without importing Foundry-only
// absolute module dependencies. No second cargo, crew, or domain evaluator.
const source = readFileSync(new URL('../scripts/engine/import/vehicle-import-normalizer.js', import.meta.url), 'utf8');
function extract(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, 'production function region missing: ' + start);
  return source.slice(a, b);
}
const script = [
  extract('function safeNumber(', 'function parseKmh('),
  extract('function safeString(', 'function normalizeDefenseValue('),
  extract('function normalizeCrew(', 'function parseShieldRating('),
  extract('function normalizeCargo(', '/**\n * Preserve legitimate installed-row identities'),
  extract('function normalizeIdentity(', '/**\n * Main vehicle import normalizer'),
  'globalThis.__functions = { normalizeCrew, normalizeCargo, normalizeIdentity };'
].join('\n');
const scope = {};
runInNewContext(script, scope);
const { normalizeCrew, normalizeCargo, normalizeIdentity } = scope.__functions;

test('printed CR70 crew range survives with a separately recorded typical crew', () => {
  const crew = normalizeCrew({
    crew: '18-150* (Normal Crew Quality)',
    vehicleCrewCount: 30
  });
  assert.equal(crew.total, 30);
  assert.equal(crew.minimum, 18);
  assert.equal(crew.maximum, 150);
  assert.equal(crew.typical, 30);
  assert.deepEqual(Array.from(crew.range), [18, 150]);
  assert.equal(crew.quality, 'normal');
});
test('invalid typical crew is never silently accepted outside source crew range', () => {
  const crew = normalizeCrew({crew:'18-150* (normal)',vehicleCrewCount:160});
  assert.equal(crew.total, 18);
  assert.deepEqual(Array.from(crew.range), [18,150]);
});
test('published fixed crews remain fixed', () => {
  for (const count of [2,8]) {
    const crew=normalizeCrew({crew:count+' (normal)'});
    assert.equal(crew.total,count);
    assert.equal('range' in crew,false);
  }
});
test('modern range data remains represented after repeated normalization', () => {
  const crew=normalizeCrew({crew:{occupied:0,total:30,quality:'normal',range:[18,150],minimum:18,maximum:150,typical:30}});
  assert.equal(crew.total,30);
  assert.deepEqual(Array.from(crew.range),[18,150]);
});
test('printed Action VI cargo 90,000 tons is not normalized to 1 ton', () => {
  const cargo=normalizeCargo({cargo:'90,000 tons'});
  assert.equal(cargo.max,90000);
  assert.equal(cargo.unit,'ton');
});
test('other published pilot ship capacities survive legacy cargo strings', () => {
  assert.equal(normalizeCargo({cargo:'5,000 Tons'}).max,5000);
  assert.equal(normalizeCargo({cargo:'135 tons'}).max,135);
  assert.equal(normalizeCargo({cargo:'1,000 tons'}).max,1000);
});
test('cargo unit is not silently converted or misread',()=>{
  const c=normalizeCargo({cargo:'250 kg'});
  assert.equal(c.max,250);assert.equal(c.unit,'kg');
});
test('starship domain uses existing vehicleFamily, not category label guessing',()=>{
  for(const category of ['Transport','Space Transports','Capital Ships']){
    const identity=normalizeIdentity({type:'Vehicle',category,vehicleFamily:'starship',size:'colossal'});
    assert.equal(identity.domain,'starship');
  }
});
test('known planetary family remains planetary and explicit domain is respected',()=>{
  assert.equal(normalizeIdentity({vehicleFamily:'planetary',category:'Speeders'}).domain,'planetary');
  assert.equal(normalizeIdentity({domain:'starship',category:'Ground Vehicles'}).domain,'starship');
});
