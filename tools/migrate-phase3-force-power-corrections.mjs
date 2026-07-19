#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACK = path.join(ROOT, 'packs', 'forcepowers.db');
const WRITE = process.argv.includes('--write');

const { PHASE3_FORCE_POWER_CORRECTIONS } = await import(pathToFileURL(path.join(ROOT, 'scripts/engine/force/phase3-force-power-corrections.js')).href);

const descriptions = {
  surge: 'You call upon the Force to enhance your movement. Your Use the Force check grants a Force bonus to Jump checks and increases your speed for 1 turn: DC 10 grants +10 Jump and +2 squares speed; DC 15 grants +20 Jump and +4 squares speed; DC 20 grants +30 Jump and +6 squares speed. Spending a Force Point increases the Jump bonus by another +10 and speed by another +2 squares.',
  rebuke: 'Reaction: When a Force power is directed at you, make a Use the Force check and compare it to the originating power check. If your result equals or exceeds that check, negate the power. If your result exceeds it by 5 or more, redirect the power back to its originator. Resolve chaining and Force Point interactions according to the source rules.',
  'force disarm': 'Make a Use the Force check in place of the normal attack roll for a disarm attempt. Resolve the remaining disarm rules normally. A Force Point can enable the source-defined option to damage or destroy the target weapon.',
  farseeing: 'Choose a creature you know or have met. Compare your Use the Force check against the target\'s Will Defense. On success, you gain the source-defined limited information about whether the creature is alive, its general surroundings, activity, and emotional state. You cannot use Farseeing on the same creature again for 24 hours. A Force Point provides a clearer image.'
};

const lines = fs.readFileSync(PACK, 'utf8').split(/\r?\n/).filter(Boolean);
const changed = [];
const migrated = lines.map(line => {
  const doc = JSON.parse(line);
  const key = String(doc.name ?? '').trim().toLowerCase();
  const correction = PHASE3_FORCE_POWER_CORRECTIONS[key];
  if (!correction) return doc;
  doc.system ??= {};
  doc.system.resolution = correction.resolution;
  doc.system.effect = descriptions[key];
  doc.system.summary = descriptions[key];
  doc.system.sourcebook = correction.resolution.source.book;
  doc.system.page = correction.resolution.source.page;
  doc.system.automationStatus = correction.resolution.automation.status;
  doc.system.sourceVerified = true;
  if (key === 'surge') {
    doc.system.dcChart = correction.resolution.outcomes.tiers.map(tier => ({ dc: tier.minimum, effect: tier.label, description: tier.label }));
    doc.system.tags = Array.from(new Set([...(Array.isArray(doc.system.tags) ? doc.system.tags : []), 'modifier', 'movement'])).filter(tag => tag !== 'damage');
  }
  if (key === 'rebuke') {
    doc.system.actionType = 'reaction';
    doc.system.tags = Array.from(new Set([...(Array.isArray(doc.system.tags) ? doc.system.tags : []), 'reaction', 'control'])).filter(tag => tag !== 'damage' && tag !== 'daze');
    doc.system.dcChart = [];
  }
  if (key === 'force disarm') {
    doc.system.tags = Array.from(new Set([...(Array.isArray(doc.system.tags) ? doc.system.tags : []), 'control', 'disarm']));
    doc.system.dcChart = [];
  }
  if (key === 'farseeing') {
    doc.system.tags = Array.from(new Set([...(Array.isArray(doc.system.tags) ? doc.system.tags : []), 'information', 'sense']));
    doc.system.dcChart = [];
  }
  changed.push(doc.name);
  return doc;
});

const expected = ['Farseeing', 'Force Disarm', 'Rebuke', 'Surge'];
for (const name of expected) {
  if (!changed.includes(name)) throw new Error(`Phase 3 migration could not find exact pack record: ${name}`);
}
if (changed.length !== expected.length) throw new Error(`Expected ${expected.length} changes, found ${changed.length}: ${changed.join(', ')}`);

if (WRITE) {
  fs.writeFileSync(PACK, `${migrated.map(doc => JSON.stringify(doc)).join('\n')}\n`);
}
console.log(JSON.stringify({ write: WRITE, changed: changed.sort() }, null, 2));
