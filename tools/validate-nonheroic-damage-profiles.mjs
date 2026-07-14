#!/usr/bin/env node
/**
 * Validate nonheroic statblock weapon/action damage profile seed files.
 *
 * Audit-only. This script verifies the NH profile data shape before later
 * importer or pack-migration phases consume it.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PROFILE_DIR = 'data/nonheroic';
const FILE_RE = /^nonheroic-weapon-damage-profiles\..+\.json$/;

const VALID_CONFIDENCE = new Set([
  'sourcebookVerified',
  'sourceTextVerified',
  'manualRequired',
  'needsReview'
]);

const VALID_DELIVERY = new Set(['weapon', 'unarmed', 'natural', 'hazard']);
const VALID_ATTACK_SHAPE = new Set(['single-target', 'autofire', 'burst-fire', 'burst', 'splash', 'cone', 'line', 'area']);
const VALID_SCALE = new Set(['character', 'vehicle', 'starship', 'mixed']);
const VALID_DAMAGE_TYPE = new Set(['energy', 'kinetic', 'ion', 'stun', 'fire', 'slashing', 'piercing', 'bludgeoning', 'acid', 'sonic']);

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function discoverFiles() {
  const dir = path.join(ROOT, PROFILE_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(name => FILE_RE.test(name))
    .map(name => `${PROFILE_DIR}/${name}`)
    .sort();
}

function requireField(errors, profile, file, field) {
  if (profile[field] === undefined || profile[field] === null || profile[field] === '') {
    errors.push(`${file}:${profile.slug ?? '<missing-slug>'} missing required field ${field}`);
  }
}

function validateProfile(profile, file, seenSlugs, errors, warnings) {
  for (const field of ['slug', 'actorName', 'attackName', 'delivery', 'attackShape', 'scale', 'damageFormula', 'primaryType', 'damageTypes', 'confidence']) {
    requireField(errors, profile, file, field);
  }

  if (profile.slug && slugify(profile.slug) !== profile.slug) {
    errors.push(`${file}:${profile.slug} slug must already be normalized`);
  }
  if (profile.slug) {
    if (seenSlugs.has(profile.slug)) errors.push(`${file}:${profile.slug} duplicate slug`);
    seenSlugs.add(profile.slug);
  }

  if (profile.confidence && !VALID_CONFIDENCE.has(profile.confidence)) {
    errors.push(`${file}:${profile.slug} invalid confidence ${profile.confidence}`);
  }
  if (profile.delivery && !VALID_DELIVERY.has(profile.delivery)) {
    errors.push(`${file}:${profile.slug} invalid delivery ${profile.delivery}`);
  }
  if (profile.attackShape && !VALID_ATTACK_SHAPE.has(profile.attackShape)) {
    errors.push(`${file}:${profile.slug} invalid attackShape ${profile.attackShape}`);
  }
  if (profile.scale && !VALID_SCALE.has(profile.scale)) {
    errors.push(`${file}:${profile.slug} invalid scale ${profile.scale}`);
  }
  if (profile.primaryType && !VALID_DAMAGE_TYPE.has(profile.primaryType)) {
    errors.push(`${file}:${profile.slug} invalid primaryType ${profile.primaryType}`);
  }
  for (const type of asArray(profile.damageTypes)) {
    if (!VALID_DAMAGE_TYPE.has(type)) errors.push(`${file}:${profile.slug} invalid damage type ${type}`);
  }
  if (profile.damageFormula && !/(\d+d\d+|\d+)/i.test(profile.damageFormula)) {
    errors.push(`${file}:${profile.slug} damageFormula does not look rollable: ${profile.damageFormula}`);
  }
  if (profile.confidence === 'sourcebookVerified' && profile.reviewRequired === true) {
    warnings.push(`${file}:${profile.slug} is sourcebookVerified but still has reviewRequired=true`);
  }
  if (profile.confidence === 'sourceTextVerified' && profile.reviewRequired !== true) {
    warnings.push(`${file}:${profile.slug} sourceTextVerified should usually keep reviewRequired=true until page/book is confirmed`);
  }
  if (profile.attack?.isArea === true && !profile.area) {
    errors.push(`${file}:${profile.slug} area attack missing area metadata`);
  }
  if (profile.attackShape !== 'single-target' && profile.attack?.isArea !== true && !['burst-fire'].includes(profile.attackShape)) {
    warnings.push(`${file}:${profile.slug} non-single attackShape should usually set attack.isArea=true`);
  }
  if (profile.match && !asArray(profile.match.actorSlugs).length && !asArray(profile.match.rawIncludes).length) {
    warnings.push(`${file}:${profile.slug} match block has no actorSlugs or rawIncludes`);
  }
}

const files = discoverFiles();
const errors = [];
const warnings = [];
const seenSlugs = new Set();
let totalProfiles = 0;
const byConfidence = {};
const bySourceBook = {};

for (const file of files) {
  const data = readJson(file);
  const profiles = asArray(data.profiles);
  if (!profiles.length) errors.push(`${file} contains no profiles`);
  for (const profile of profiles) {
    totalProfiles += 1;
    byConfidence[profile.confidence ?? '<missing>'] = (byConfidence[profile.confidence ?? '<missing>'] ?? 0) + 1;
    bySourceBook[profile.sourceBook ?? '<missing>'] = (bySourceBook[profile.sourceBook ?? '<missing>'] ?? 0) + 1;
    validateProfile(profile, file, seenSlugs, errors, warnings);
  }
}

const result = {
  files,
  totalProfiles,
  byConfidence,
  bySourceBook,
  warnings,
  errors
};

console.log(JSON.stringify(result, null, 2));

if (errors.length) process.exitCode = 1;
