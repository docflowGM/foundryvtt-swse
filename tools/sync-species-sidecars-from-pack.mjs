#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

function slug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'species';
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function fullAbilityMods(raw = {}) {
  const out = Object.fromEntries(abilities.map((ability) => [ability, 0]));
  if (raw && typeof raw === 'object') {
    for (const ability of abilities) {
      const value = Number(raw[ability] ?? 0);
      out[ability] = Number.isFinite(value) ? value : 0;
    }
  }
  return out;
}

function movementFromSystem(system = {}) {
  const raw = system.movement && typeof system.movement === 'object' ? system.movement : {};
  const readNumber = (...values) => {
    for (const value of values) {
      if (value === null || value === undefined || value === '') continue;
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    return null;
  };
  return {
    walk: readNumber(raw.walk, system.walkSpeed, system.speed),
    swim: readNumber(raw.swim, system.swimSpeed),
    fly: readNumber(raw.fly, system.flySpeed),
    climb: readNumber(raw.climb, system.climbSpeed),
    hover: readNumber(raw.hover, system.hoverSpeed),
    glide: readNumber(raw.glide, system.glideSpeed),
    burrow: readNumber(raw.burrow, system.burrowSpeed),
    bySize: raw.bySize && typeof raw.bySize === 'object' ? raw.bySize : {}
  };
}

function canonicalTraitsFromSystem(system = {}) {
  const canonicalTraits = Array.isArray(system.canonicalTraits) ? system.canonicalTraits : [];
  const traits = canonicalTraits
    .filter((trait) => trait && typeof trait === 'object')
    .map((trait) => {
      const name = String(trait.name ?? trait.id ?? 'Trait').trim();
      return {
        id: String(trait.id ?? slug(name)).trim(),
        name,
        description: String(trait.description ?? '').trim()
      };
    });

  if (traits.length) return traits;

  const special = Array.isArray(system.special) ? system.special : [];
  return special
    .map((name) => String(name ?? '').trim())
    .filter(Boolean)
    .map((name) => ({ id: slug(name), name, description: '' }));
}

function packSpeciesRecords() {
  const dbPath = path.join(root, 'packs/species.db');
  return fs.readFileSync(dbPath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function buildSidecarEntry(record, existing = {}, migrated = false) {
  const system = record.system || {};
  const name = record.name;
  const canonicalStats = system.canonicalStats && typeof system.canonicalStats === 'object'
    ? system.canonicalStats
    : {};
  const entry = existing && typeof existing === 'object' ? structuredClone(existing) : {};

  entry.name = name;
  entry.renameTo ??= null;
  entry.inherits ??= null;
  entry.structuralTraits = Array.isArray(entry.structuralTraits) && entry.structuralTraits.length
    ? entry.structuralTraits
    : canonicalTraitsFromSystem(system);
  entry.activatedAbilities = Array.isArray(entry.activatedAbilities) ? entry.activatedAbilities : [];
  entry.conditionalTraits = Array.isArray(entry.conditionalTraits) ? entry.conditionalTraits : [];
  entry.bonusFeats = Array.isArray(entry.bonusFeats) ? entry.bonusFeats : [];
  entry.equipmentGrants = Array.isArray(entry.equipmentGrants) ? entry.equipmentGrants : [];

  const tags = new Set([
    ...(Array.isArray(entry.tags) ? entry.tags : []),
    ...(Array.isArray(system.tags) ? system.tags : []),
    system.size
  ].map((tag) => String(tag ?? '').trim().toLowerCase()).filter(Boolean));
  entry.tags = [...tags];
  entry.notes = Array.isArray(entry.notes) ? entry.notes : [];
  entry.description = String(system.description?.value ?? system.description ?? entry.description ?? '').trim();
  entry.canonicalName = system.canonicalName || name;
  entry.canonicalStats = {
    size: system.size ?? null,
    speed: Number(system.speed ?? system.movement?.walk ?? 6),
    movement: movementFromSystem(system),
    abilities: system.abilities ?? '',
    abilityMods: fullAbilityMods(system.abilityMods),
    abilityText: canonicalStats.abilityText ?? null,
    abilityChoice: system.abilityChoice ?? canonicalStats.abilityChoice ?? null,
    languages: Array.isArray(system.languages) ? system.languages : [],
    sourceLine: canonicalStats.sourceLine ?? null
  };
  entry.canonicalTraits = canonicalTraitsFromSystem(system);
  entry.variants = Array.isArray(system.variants) ? structuredClone(system.variants) : [];
  entry.packSource = system.source || null;
  entry.packId = record._id || record.id || slug(name);
  if (migrated) entry.id = slug(name);
  else entry.id ??= slug(name);
  return entry;
}

function syncSidecar(relativePath) {
  const fullPath = path.join(root, relativePath);
  const oldData = readJson(fullPath, []);
  const oldByName = new Map(
    Array.isArray(oldData)
      ? oldData.filter((entry) => entry?.name).map((entry) => [entry.name, entry])
      : []
  );
  const records = packSpeciesRecords();
  const packNames = new Set(records.map((record) => record.name));
  const migrated = relativePath.endsWith('-migrated.json');
  const next = records.map((record) => buildSidecarEntry(record, oldByName.get(record.name), migrated));
  const removed = [...oldByName.keys()].filter((name) => !packNames.has(name)).sort();
  fs.writeFileSync(fullPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  console.log(`${relativePath}: wrote ${next.length} entries; removed ${removed.length} sidecar-only names`);
  if (removed.length) console.log(`Removed: ${removed.join(', ')}`);
}

syncSidecar('data/species-traits.json');
syncSidecar('data/species-traits-migrated.json');
