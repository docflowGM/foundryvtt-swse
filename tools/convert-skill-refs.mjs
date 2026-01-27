#!/usr/bin/env node
/**
 * File: tools/convert-skill-refs.mjs
 *
 * Converts skill references (names or system keys) to compendium skill IDs.
 *
 * Scope (safe):
 * - JSON files under data/
 * - JSONL (.db) packs under packs/
 *
 * Only converts in likely fields:
 * - trainedSkills
 * - class_skills / classSkills
 * - skillChoice
 *
 * Usage:
 *   node tools/convert-skill-refs.mjs
 */

import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(process.cwd());
const SKILLS_DB = path.join(REPO_ROOT, "packs", "skills.db");

const HEX16 = /^[0-9a-f]{16}$/i;

const KEY_TO_NAME = {
  acrobatics: "Acrobatics",
  climb: "Climb",
  deception: "Deception",
  endurance: "Endurance",
  gatherInformation: "Gather Information",
  initiative: "Initiative",
  jump: "Jump",
  knowledgeBureaucracy: "Knowledge (Bureaucracy)",
  knowledgeGalacticLore: "Knowledge (Galactic Lore)",
  knowledgeLifeSciences: "Knowledge (Life Sciences)",
  knowledgePhysicalSciences: "Knowledge (Physical Sciences)",
  knowledgeSocialSciences: "Knowledge (Social Sciences)",
  knowledgeTactics: "Knowledge (Tactics)",
  knowledgeTechnology: "Knowledge (Technology)",
  mechanics: "Mechanics",
  perception: "Perception",
  persuasion: "Persuasion",
  pilot: "Pilot",
  ride: "Ride",
  stealth: "Stealth",
  survival: "Survival",
  swim: "Swim",
  treatInjury: "Treat Injury",
  useComputer: "Use Computer",
  useTheForce: "Use the Force"
};

function readJsonl(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
  return lines.map(l => JSON.parse(l));
}

function writeJsonl(filePath, docs) {
  const out = docs.map(d => JSON.stringify(d)).join("\n") + "\n";
  fs.writeFileSync(filePath, out, "utf8");
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    console.warn(`convert-skill-refs: skipping invalid JSON file: ${filePath}`);
    return null;
  }
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function buildSkillMaps() {
  const docs = readJsonl(SKILLS_DB);
  const nameToId = new Map();
  const idToName = new Map();
  for (const d of docs) {
    if (!d?._id || !d?.name) continue;
    idToName.set(d._id, d.name);
    nameToId.set(String(d.name).toLowerCase(), d._id);
  }
  return { nameToId, idToName };
}

function toSkillId(ref, nameToId) {
  if (!ref) return ref;
  if (typeof ref !== "string") return ref;
  const s = ref.trim();
  if (!s) return ref;
  if (HEX16.test(s)) return s;
  if (KEY_TO_NAME[s]) {
    const id = nameToId.get(KEY_TO_NAME[s].toLowerCase());
    return id ?? ref;
  }
  const id = nameToId.get(s.toLowerCase());
  return id ?? ref;
}

function convertContainer(obj, nameToId, changed) {
  if (!obj || typeof obj !== "object") return;

  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v) && (k === "trainedSkills" || k === "classSkills" || k === "class_skills" || k === "skills")) {
      let touched = false;
      const converted = v.map(x => {
        const y = toSkillId(x, nameToId);
        if (y !== x) touched = true;
        return y;
      });
      if (touched) {
        obj[k] = converted;
        changed.count += 1;
      }
      continue;
    }

    if (typeof v === "string" && (k === "skillChoice" || k === "skill" || k === "trainedSkill")) {
      const y = toSkillId(v, nameToId);
      if (y !== v) {
        obj[k] = y;
        changed.count += 1;
      }
      continue;
    }

    if (v && typeof v === "object") convertContainer(v, nameToId, changed);
  }
}

function walkFiles(rootDir, ext) {
  const out = [];
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        stack.push(full);
      } else if (entry.isFile() && full.endsWith(ext)) {
        out.push(full);
      }
    }
  }
  return out;
}

function main() {
  if (!fs.existsSync(SKILLS_DB)) {
    console.error(`Missing skills.db at ${SKILLS_DB}`);
    process.exit(1);
  }

  const { nameToId } = buildSkillMaps();
  const changed = { count: 0 };

  const jsonFiles = walkFiles(path.join(REPO_ROOT, "data"), ".json");
  for (const file of jsonFiles) {
    const obj = readJson(file);
    if (!obj) continue;
    const before = JSON.stringify(obj);
    convertContainer(obj, nameToId, changed);
    const after = JSON.stringify(obj);
    if (before !== after) writeJson(file, obj);
  }

  const dbFiles = walkFiles(path.join(REPO_ROOT, "packs"), ".db");
  for (const file of dbFiles) {
    const docs = readJsonl(file);
    let touchedAny = false;
    for (const doc of docs) {
      const before = JSON.stringify(doc);
      convertContainer(doc, nameToId, changed);
      const after = JSON.stringify(doc);
      if (before !== after) touchedAny = true;
    }
    if (touchedAny) writeJsonl(file, docs);
  }

  console.log(`convert-skill-refs: converted ${changed.count} fields`);
}

main();
