/**
 * Frozen class-pack guard for independent talent audit verifiers.
 *
 * The talent phase's old whole-file hash assumed classes.db never changed.
 * That assumption is no longer valid after certified class skills / BAB repair.
 * This guard instead freezes every field except the three explicitly approved
 * class-mechanics fields; it also forbids record insertion/deletion/re-identity.
 *
 * The FNV64 checksum is an accidental-drift detector, not a security primitive.
 */
import fs from 'node:fs';
import path from 'node:path';

export const CLASS_MECHANICS_BASELINE = 'data/audits/class-mechanics-protected-baseline.json';

export function protectedClassRecord(doc) {
  const system = { ...(doc?.system || {}) };
  delete system.trainedSkills;
  delete system.class_skills;
  delete system.babProgression;
  return { ...doc, system };
}

export function classProtectedFingerprint(doc) {
  const serialized = JSON.stringify(protectedClassRecord(doc));
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < serialized.length; i++) {
    hash ^= BigInt(serialized.charCodeAt(i));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `${serialized.length}:${hash.toString(16).padStart(16, '0')}`;
}

export function verifyClassPackProtectedState(root) {
  const report = { ok: false, failures: [] };
  try {
    const baseline = JSON.parse(fs.readFileSync(path.join(root, CLASS_MECHANICS_BASELINE), 'utf8'));
    const actual = fs.readFileSync(path.join(root, 'packs/classes.db'), 'utf8')
      .split(/\r?\n/).filter(Boolean).map(JSON.parse);
    if (baseline.records?.length !== 37 || actual.length !== 37) {
      report.failures.push('expected exactly 37 certified classes');
      return report;
    }
    const reference = new Map(baseline.records.map(row => [row._id, row]));
    if (reference.size !== 37) {
      report.failures.push('baseline has duplicate class IDs');
      return report;
    }
    const ids = new Set();
    for (const doc of actual) {
      if (!doc?._id || ids.has(doc._id)) {
        report.failures.push(`duplicate or invalid class ID: ${doc?._id}`);
        continue;
      }
      ids.add(doc._id);
      const expected = reference.get(doc._id);
      if (!expected || expected.name !== doc.name) {
        report.failures.push(`class identity changed: ${doc.name} (${doc._id})`);
      } else if (classProtectedFingerprint(doc) !== expected.fingerprint) {
        // Only the two fully source-verified progression replacements are
        // permitted. Everything else, including later changes to those classes,
        // remains protected by the exact canonical fingerprint.
        const approved = baseline.approvedProgressionExceptions?.[doc._id];
        if (!approved || approved.name !== doc.name
          || approved.approvedFingerprint !== classProtectedFingerprint(doc)) {
          report.failures.push(`protected class fields changed: ${doc.name}`);
        }
      }
    }
    for (const entry of baseline.records) if (!ids.has(entry._id)) {
      report.failures.push(`missing class: ${entry.name}`);
    }
  } catch (err) {
    report.failures.push(String(err?.message || err));
  }
  report.ok = report.failures.length === 0;
  return report;
}
