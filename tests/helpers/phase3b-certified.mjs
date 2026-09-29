import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Phase 3B certified target text for a canonical identity, read from the committed manifests (never from the packs).
// The curated hydration tests pin the hand-hydrated production wording. Phase 3C replaces that wording with the certified
// printed text, so those tests must accept exactly two states for a hydrated record and reject everything else:
//   'legacy'    - the record still carries the pre-Phase-3C production text (the wording-level clause assertions apply)
//   'certified' - the record carries the Phase 3B certified text (it must then equal the certified target field-for-field)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const manifests = fs.readdirSync(path.join(ROOT, 'data/audits'))
  .filter(f => /^talent-phase-3b-.*-manifest\.json$/.test(f))
  .map(f => JSON.parse(fs.readFileSync(path.join(ROOT, 'data/audits', f), 'utf8')));
const byIdentity = new Map(manifests.flatMap(m => (m.records ?? []).map(r => [r.canonicalIdentity, r])));
const norm = v => String(v ?? '').replace(/\s+/g, ' ').trim();

export function certifiedRecord(identity) {
  const rec = byIdentity.get(identity);
  if (!rec) throw new Error('no Phase 3B record for ' + identity);
  return rec;
}

export function certifiedTarget(identity, field) { return certifiedRecord(identity).targetFields[field]; }

/** 'certified' | 'legacy' — anything else is a failure the caller should report. */
export function hydrationState(doc, identity) {
  const rec = certifiedRecord(identity);
  const desc = typeof doc.system.description === 'object' ? doc.system.description?.value : doc.system.description;
  const certifiedDescription = rec.targetFields['system.description.value'] ?? rec.targetFields['system.description'];
  if (norm(doc.system.benefit) === norm(rec.targetFields['system.benefit']) && norm(desc) === norm(certifiedDescription)) return 'certified';
  return 'legacy';
}

/** Every certified canonical field of a record must equal the document (whitespace-normalised). */
export function assertCertified(assert, doc, identity) {
  const rec = certifiedRecord(identity);
  for (const [field, value] of Object.entries(rec.targetFields)) {
    const actual = field === 'name' ? doc.name : field.split('.').reduce((o, k) => (o == null ? o : o[k]), doc);
    assert.equal(norm(actual), norm(value), `${identity}: ${field} differs from the Phase 3B certified target`);
  }
}
