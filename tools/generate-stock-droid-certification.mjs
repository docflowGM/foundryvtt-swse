// Generates data/store/stock-droid-certification.json: the Store's retail-eligibility record for stock droids.
// THREE DIFFERENT THINGS, never to be confused:
//   1. SOURCE IDENTITY  - the record is in the canonical droids pack and names a published 1st-5th Degree. (checked here)
//   2. IMPORT ACCEPTANCE - StockDroidNormalizer -> StockDroidImporterEngine accept it without throwing. (checked here; the
//      normalizer is lenient, so this proves the Store can deliver it, NOT that its statblock is correct)
//   3. MECHANICAL CERTIFICATION - a rules audit of the statblock against the sourcebook. NOT PERFORMED by this tool or by
//      the Store; every record carries mechanicalCertification: 'NOT_PERFORMED'.
// `certified` below means (1) AND (2) only. recordHash pins the pack record's content; it is enforced at the source-validation
// boundary (tests/store-v2-s1-catalog.test.mjs and `--check` in CI), and the runtime catalog re-checks the identity pins
// (record id, name, degree) against the live pack index before listing a droid.
// It does not judge statblock quality and does not decide price (commerce is separate).
// Usage: node tools/generate-stock-droid-certification.mjs [--check]
import fs from 'node:fs';
import crypto from 'node:crypto';
import { registerFoundryPathLoader } from '../tests/helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from '../tests/helpers/foundry-shim/globals.mjs';

registerFoundryPathLoader();
installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm' }, actors: { get: () => null }, users: [] } });
const { StockDroidNormalizer } = await import('../scripts/domain/droids/stock-droid-normalizer.js');
const { StockDroidImporterEngine } = await import('../scripts/engine/import/stock-droid-importer-engine.js');

const PACK = 'foundryvtt-swse.droids';
const OUT = new URL('../data/store/stock-droid-certification.json', import.meta.url);
const hash = rec => crypto.createHash('sha256').update(JSON.stringify(rec)).digest('hex').slice(0, 16);

export function certifyRecord(rec) {
  const reasons = [];
  if (rec.type !== 'droid') reasons.push('NOT_A_DROID');
  if (!/^[1-5](st|nd|rd|th)-degree$/i.test(String(rec.system?.degree ?? '').trim())) reasons.push('DEGREE_NOT_PUBLISHED');
  if (!reasons.length) {
    try {
      const normalized = StockDroidNormalizer.normalizeStockDroidRecord(JSON.parse(JSON.stringify(rec)));
      StockDroidImporterEngine.buildActorDataFromNormalized(normalized, { name: rec.name });
    } catch (err) { reasons.push(`STOCK_PIPELINE_REFUSED: ${err?.message ?? err}`); }
  }
  return { name: rec.name, certified: reasons.length === 0, degree: rec.system?.degree ?? null, reasons, recordHash: hash(rec), sourceIdentity: !reasons.includes('NOT_A_DROID') && !reasons.includes('DEGREE_NOT_PUBLISHED'), importAcceptance: !reasons.some(r => r.startsWith('STOCK_PIPELINE_REFUSED')), mechanicalCertification: 'NOT_PERFORMED' };
}

const rows = fs.readFileSync(new URL('../packs/droids.db', import.meta.url), 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
const records = {};
for (const rec of rows) records[rec._id] = certifyRecord(rec);
const out = {
  schema: 'swse-store-stock-droid-certification-v1',
  pack: PACK,
  method: 'sourceIdentity (canonical pack + published degree) AND importAcceptance (StockDroidNormalizer/StockDroidImporterEngine dry run). NOT a mechanical certification. recordHash pins the record content.',
  mechanicalCertification: 'NOT_PERFORMED',
  counts: { total: rows.length, certified: Object.values(records).filter(r => r.certified).length },
  records
};
const text = JSON.stringify(out, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === text) { console.log('stock-droid certification up to date', out.counts); process.exit(0); }
  console.error('stock-droid certification is stale: run node tools/generate-stock-droid-certification.mjs'); process.exit(1);
}
fs.writeFileSync(OUT, text);
console.log('wrote', out.counts);
