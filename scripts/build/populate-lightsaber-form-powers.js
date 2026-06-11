#!/usr/bin/env node
/**
 * Populate Lightsaber Form Powers Compendium
 *
 * Foundry v13 uses newline-delimited JSON `.db` packs in this system. This
 * script reads data/lightsaber-form-powers.json and rewrites
 * packs/lightsaberformpowers.db as JSONL force-power documents.
 *
 * Lightsaber form powers are modeled as bonus riders on base force power
 * mechanics. The bonusTalent field indicates which talent enhances the power,
 * NOT a prerequisite.
 */

const fs = require('fs');
const path = require('path');

function generateId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 16; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  return id;
}

function extractBonusTalent(formBonusText) {
  if (!formBonusText) return '';
  const match = String(formBonusText).match(/Lightsaber Form \(([^)]+)\)/);
  return match ? match[1] : '';
}

function extractTrigger(formBonusText) {
  if (!formBonusText) return '';
  const match = String(formBonusText).match(/If you have the [^T]+ Talent and ([^,]+),/);
  if (!match) return '';
  let trigger = match[1].trim();
  if (trigger.startsWith('you ')) trigger = trigger.slice(4);
  return trigger ? trigger.charAt(0).toUpperCase() + trigger.slice(1) : '';
}

function readExistingIds(dbPath) {
  const ids = new Map();
  if (!fs.existsSync(dbPath)) return ids;

  const header = fs.readFileSync(dbPath).subarray(0, 16).toString('utf8');
  if (header.startsWith('SQLite format')) return ids;

  for (const line of fs.readFileSync(dbPath, 'utf8').split(/\n/)) {
    if (!line.trim()) continue;
    try {
      const doc = JSON.parse(line);
      if (doc?.name && doc?._id) ids.set(doc.name, doc._id);
    } catch (_err) {
      // Ignore malformed existing lines; this script will rewrite the pack.
    }
  }

  return ids;
}

function buildDocument(powerData, existingIds, sort) {
  let fullDescription = '';
  if (powerData.description) fullDescription += powerData.description;
  if (powerData.effect) {
    if (fullDescription) fullDescription += '\n\n';
    fullDescription += powerData.effect;
  }

  const formBonusText = powerData.formBonus || '';
  const bonusTalent = extractBonusTalent(formBonusText);
  const trigger = powerData.trigger || extractTrigger(formBonusText);
  const dcs = (powerData.dcChart || []).map(item => Number(item.dc)).filter(Number.isFinite).sort((a, b) => a - b);
  const tags = Array.isArray(powerData.tags) ? [...powerData.tags] : ['lightsaber-form'];
  if (!tags.includes('lightsaber-form')) tags.push('lightsaber-form');
  const now = new Date().toISOString();

  return {
    _id: existingIds.get(powerData.name) || generateId(),
    name: powerData.name,
    type: 'force-power',
    img: 'icons/magic/light/orb-lightbulb-gray.webp',
    system: {
      powerLevel: 1,
      discipline: powerData.discipline || 'telekinetic',
      useTheForce: dcs[0] || 15,
      time: powerData.time || 'Standard Action',
      range: powerData.range || 'Personal',
      target: powerData.target || 'One target',
      duration: powerData.duration || 'Instantaneous',
      effect: fullDescription,
      special: powerData.special || '',
      descriptor: [],
      dcChart: (powerData.dcChart || []).map(item => ({
        dc: item.dc,
        effect: item.effect,
        description: item.description || ''
      })),
      maintainable: false,
      forcePointEffect: powerData.forcePointEffect || '',
      forcePointCost: powerData.forcePointCost || 0,
      sourcebook: powerData.source || 'Jedi Academy Training Manual',
      page: powerData.page ?? null,
      tags,
      inSuite: false,
      spent: false,
      uses: { current: 0, max: 0 },
      executionModel: 'FORCE_POWER',
      costNumeric: null,
      form: powerData.form || '',
      bonusTalent,
      trigger,
      formBonus: formBonusText,
      canRebuke: Boolean(powerData.canRebuke)
    },
    effects: [],
    flags: {},
    sort,
    _stats: {
      created: now,
      modified: now,
      lastModifiedBy: null
    }
  };
}

function populateLightsaberFormPowers() {
  const jsonPath = path.join(__dirname, '../../data/lightsaber-form-powers.json');
  const dbPath = path.join(__dirname, '../../packs/lightsaberformpowers.db');
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const powers = Array.isArray(jsonData.powers) ? jsonData.powers : [];
  const existingIds = readExistingIds(dbPath);
  const docs = powers.map((power, index) => buildDocument(power, existingIds, index));

  const text = docs.map(doc => JSON.stringify(doc)).join('\n') + '\n';
  fs.writeFileSync(dbPath, text, 'utf8');

  console.log(`Wrote ${docs.length} lightsaber form powers to ${dbPath}`);
  console.log('Pack format: Foundry JSONL .db');
}

populateLightsaberFormPowers();
