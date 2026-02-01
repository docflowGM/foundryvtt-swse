/**
 * Mentor Dialogue Validator (SSOT)
 *
 * Usage:
 *   node scripts/mentor/validate-mentor-dialogue.js
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const dialogueRoot = path.join(repoRoot, "data", "dialogue");
const mentorsDir = path.join(dialogueRoot, "mentors");
const registryPath = path.join(dialogueRoot, "mentor_registry.json");
const reasonsPath = path.join(dialogueRoot, "reasons.json");

const INTENSITIES = ["very_low","low","medium","high","very_high"];
const JUDGMENT_ATOMS = [
  "recognition","reflection","contextualization","clarification",
  "affirmation","confirmation","encouragement","resolve_validation",
  "concern","warning","risk_acknowledgment","exposure","overreach",
  "reorientation","invitation","release","reassessment",
  "doubt_recognition","inner_conflict","resolve_testing","uncertainty_acknowledgment",
  "restraint","patience","focus_reminder","discipline",
  "insight","perspective","revelation","humility",
  "gravity","consequential_awareness","threshold",
  "emergence","transformation_acknowledgment","maturation",
  "acceptance","deferral","silence"
];

function fail(msg) {
  console.error(`\n[mentor-dialogue-validator] FAIL: ${msg}`);
  process.exitCode = 1;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function validateMentorFile(mentorId, mentorJson) {
  if (mentorJson.mentorId !== mentorId) fail(`${mentorId}.json mentorId mismatch: "${mentorJson.mentorId}"`);
  if (!mentorJson.judgments || typeof mentorJson.judgments !== "object") {
    fail(`${mentorId}.json missing judgments object`);
    return;
  }

  for (const atom of JUDGMENT_ATOMS) {
    const atomBlock = mentorJson.judgments[atom];
    if (!atomBlock || typeof atomBlock !== "object") {
      fail(`${mentorId}.json missing atom "${atom}"`);
      continue;
    }

    for (const intensity of INTENSITIES) {
      const variants = atomBlock[intensity];
      if (!Array.isArray(variants)) {
        fail(`${mentorId}.json "${atom}.${intensity}" must be an array`);
        continue;
      }

      if (atom === "silence") {
        if (variants.length === 0 || variants.some((v) => v !== "")) {
          fail(`${mentorId}.json "${atom}.${intensity}" must be [""] (empty strings only)`);
        }
      } else {
        if (variants.length === 0) fail(`${mentorId}.json "${atom}.${intensity}" must not be empty`);
        if (variants.some((v) => !isNonEmptyString(v))) fail(`${mentorId}.json "${atom}.${intensity}" contains empty/non-string variant`);
      }
    }
  }
}

function main() {
  if (!fs.existsSync(registryPath)) fail("Missing data/dialogue/mentor_registry.json");
  if (!fs.existsSync(reasonsPath)) fail("Missing data/dialogue/reasons.json");
  if (!fs.existsSync(mentorsDir)) fail("Missing data/dialogue/mentors directory");

  const registry = readJson(registryPath);
  const mentors = registry?.mentors ?? {};
  const mentorIds = Object.keys(mentors);
  if (mentorIds.length === 0) fail("mentor_registry.json has no mentors");

  for (const mentorId of mentorIds) {
    const p = path.join(mentorsDir, `${mentorId}.json`);
    if (!fs.existsSync(p)) fail(`Missing mentor dialogue file: data/dialogue/mentors/${mentorId}.json`);
    else validateMentorFile(mentorId, readJson(p));
  }

  const reasons = readJson(reasonsPath);
  const reasonKeys = Object.keys(reasons);
  if (reasonKeys.length !== 100) fail(`reasons.json expected 100 keys, found ${reasonKeys.length}`);
  if (reasonKeys.some((k) => !isNonEmptyString(k) || !isNonEmptyString(reasons[k]))) fail("reasons.json contains empty key or empty value");

  const rendererPath = path.join(repoRoot, "scripts", "mentor", "mentor-judgment-renderer.js");
  const rendererText = fs.readFileSync(rendererPath, "utf-8");
  if (rendererText.includes("PHRASE_TABLES")) fail("mentor-judgment-renderer.js still contains PHRASE_TABLES");

  if (process.exitCode) process.exit(process.exitCode);
  console.log("[mentor-dialogue-validator] OK");
}
main();
