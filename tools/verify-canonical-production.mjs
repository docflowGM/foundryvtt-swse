#!/usr/bin/env node
// Phase 5C parity gate: feats 353/353, weapons 203/203, generated outputs byte-exact, stamps, aliases, semantics,
// authority classification, no runtime import of audit authority, no dangling retired ids.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/canonical-weapons-shared.mjs';
import { verifyFeats, verifyWeapons } from './lib/canonical-production-verify.mjs';
import { verifyClassification, scanRuntimeAuditImports } from './lib/canonical-authority-classification.mjs';
import { scanDangling } from './migrate-phase-5c-feat-references.mjs';

const io = { read: (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'), exists: (rel) => fs.existsSync(path.join(ROOT, rel)) };
const f = verifyFeats(io), w = verifyWeapons(io);
const errs = [...f.errors, ...w.errors, ...verifyClassification(io), ...scanRuntimeAuditImports(), ...scanDangling().map((h) => `dangling retired feat id: ${h}`)];
if (errs.length) { console.error(`canonical production parity FAILED (${errs.length}):\n${errs.slice(0, 40).join('\n')}`); process.exit(1); }
console.log(`canonical production parity OK feats ${JSON.stringify(f.counts)} weapons ${JSON.stringify(w.counts)}`);
