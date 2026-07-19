import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACK = path.join(ROOT, 'packs', 'forcepowers.db');
const REVIEW = path.join(ROOT, 'data', 'force', 'force-power-source-reconciliation.json');

const slugify = value => String(value ?? '').trim().toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const packDocs = fs.readFileSync(PACK, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const packBySlug = new Map(packDocs.map(doc => [slugify(doc.name), doc]));
const reconciliation = JSON.parse(fs.readFileSync(REVIEW, 'utf8'));

assert.equal(reconciliation.schemaVersion, 1);
assert.equal(reconciliation.authority, 'printed-sourcebooks');
assert.ok(reconciliation.records && typeof reconciliation.records === 'object');

const validSeverities = new Set(['critical', 'major', 'moderate', 'minor', 'none']);
const validBehaviors = new Set(['damage', 'healing', 'modifier', 'mitigation', 'control', 'movement', 'condition', 'information', 'reaction', 'hybrid', 'utility', 'manual']);
const validMethods = new Set(['none', 'fixed-dc', 'defense', 'opposed', 'margin', 'attack-substitution', 'reaction-opposed', 'multi-mode']);

for (const [slug, record] of Object.entries(reconciliation.records)) {
  assert.ok(packBySlug.has(slug), `${record.name}: no exact pack record for slug ${slug}`);
  assert.equal(record.sourceVerified, true, `${record.name}: Phase 2 reviewed records must be source verified`);
  assert.ok(validSeverities.has(record.driftSeverity), `${record.name}: invalid drift severity`);
  assert.ok(validBehaviors.has(record.primaryBehavior), `${record.name}: invalid primary behavior`);
  assert.ok(validMethods.has(record.resolutionMethod), `${record.name}: invalid resolution method`);
  assert.ok(Number.isInteger(record.implementationPhase) && record.implementationPhase >= 3, `${record.name}: invalid implementation phase`);
  assert.ok(Array.isArray(record.requiredCorrections) && record.requiredCorrections.length > 0, `${record.name}: corrections required`);
  assert.ok(record.sourcebook, `${record.name}: sourcebook required`);
  assert.ok(Number.isFinite(Number(record.page)), `${record.name}: page required`);
}

const lightning = reconciliation.records['force-lightning'];
assert.equal(lightning.resolutionMethod, 'fixed-dc');
assert.match(lightning.currentPackFinding, /tiered damage progression is correct/i);
assert.match(lightning.requiredCorrections.join(' '), /damageType to force/i);

const critical = Object.values(reconciliation.records).filter(record => record.driftSeverity === 'critical').map(record => record.name).sort();
assert.deepEqual(critical, ['Farseeing', 'Force Disarm', 'Move Object', 'Rebuke', 'Surge', 'Vital Transfer'].sort());

console.log(`Force power source reconciliation tests passed for ${Object.keys(reconciliation.records).length} reviewed powers.`);
