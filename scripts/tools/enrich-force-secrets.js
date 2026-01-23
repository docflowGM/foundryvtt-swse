#!/usr/bin/env node
/**
 * Force Secret Enrichment Script
 *
 * Automatically enriches Force Secret data with suggestion metadata:
 * - Infers required Force Power categories
 * - Defines minimum power/technique requirements
 * - Generates institution-specific biases
 * - Calculates archetype affinities
 *
 * Usage: node enrich-force-secrets.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { extractCategoriesFromDescriptors } from "./force-suggestion-utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const secretsDbPath = path.join(__dirname, "../../packs/forcesecrets.db");
const outputPath = path.join(__dirname, "../../data/forcesecrets.enriched.json");

/**
 * Load items from Foundry JSON-lines database
 */
function loadDb(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (e) {
        console.warn(`Failed to parse line: ${line.substring(0, 50)}...`);
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Infer exclusivity level from secret philosophy
 */
function inferExclusivity(secret) {
  const name = (secret.name || "").toLowerCase();
  const benefit = (secret.system?.benefit || "").toLowerCase();
  const desc = secret.system?.descriptor || [];

  // High exclusivity: Dark side, rare, powerful
  if (
    desc.some((d) =>
      ["dark", "sith", "exclusive", "rare", "forbidden"].some((k) =>
        d.toLowerCase().includes(k)
      )
    )
  ) {
    return "high";
  }

  // Medium-high exclusivity: Path-specific
  if (
    desc.some((d) =>
      ["path", "mastery", "advanced", "elite"].some((k) =>
        d.toLowerCase().includes(k)
      )
    )
  ) {
    return "high";
  }

  // Medium exclusivity: General Force secrets
  return "medium";
}

/**
 * Get institution bias for a secret
 */
function getInstitutionBias(secret) {
  const desc = (secret.system?.descriptor || []).map((d) => d.toLowerCase());
  const name = (secret.name || "").toLowerCase();
  const benefit = (secret.system?.benefit || "").toLowerCase();

  const bias = {};

  // Dark side bias
  if (desc.some((d) => ["dark", "sith"].some((k) => d.includes(k)))) {
    bias.sith = 1.5;
    bias.jedi = 0.2;
    bias.neutral = 0.5;
  }
  // Light side bias
  else if (
    desc.some((d) => ["light", "jedi", "noble"].some((k) => d.includes(k)))
  ) {
    bias.jedi = 1.4;
    bias.sith = 0.3;
    bias.neutral = 0.8;
  }
  // Neutral/balanced
  else {
    bias.jedi = 1.2;
    bias.sith = 1.2;
    bias.neutral = 1.3;
  }

  return bias;
}

/**
 * Get archetype bias for a secret
 */
function getArchetypeBiasForSecret(secret) {
  const name = (secret.name || "").toLowerCase();
  const desc = (secret.system?.descriptor || []).map((d) => d.toLowerCase());
  const bias = {};

  // Specific archetype mappings based on name/description
  if (name.includes("healer") || desc.some((d) => d.includes("vital"))) {
    bias.jedi_healer = 1.7;
    bias.jedi_mentor = 1.4;
  }
  if (
    name.includes("lightning") ||
    name.includes("aggression") ||
    desc.some((d) => d.includes("aggressive"))
  ) {
    bias.sith_marauder = 1.6;
    bias.sith_juggernaut = 1.5;
  }
  if (
    name.includes("master") ||
    name.includes("control") ||
    desc.some((d) => d.includes("mastery"))
  ) {
    bias.jedi_mentor = 1.6;
    bias.sith_mastermind = 1.5;
  }
  if (name.includes("assassin") || desc.some((d) => d.includes("stealth"))) {
    bias.sith_assassin = 1.5;
    bias.jedi_shadow = 1.3;
  }

  // Normalize values
  for (const archetype in bias) {
    bias[archetype] = Number(bias[archetype].toFixed(2));
  }

  return bias;
}

/**
 * Enrich a single Force Secret
 */
function enrichSecret(secret) {
  const categories = extractCategoriesFromDescriptors(
    secret.system?.descriptor || []
  );

  // Conservative defaults: require 2+ powers in same category, at least 1 technique
  const minimumPowers = categories.length >= 2 ? 2 : 2;
  const minimumTechniques = 1;

  const institutionBias = getInstitutionBias(secret);
  const archetypeBias = getArchetypeBiasForSecret(secret);
  const exclusivity = inferExclusivity(secret);

  secret.suggestion = {
    requiredCategories: categories,
    minimumPowers,
    minimumTechniques,
    archetypeBias,
    institutionBias,
    exclusivity,
  };

  return secret;
}

/**
 * Main enrichment process
 */
async function main() {
  console.log("🔄 Loading Force Secret database...");

  const secrets = loadDb(secretsDbPath);

  console.log(`✅ Loaded ${secrets.length} Force Secrets`);

  console.log("\n🔄 Enriching Force Secrets with suggestion metadata...");

  let enriched = 0;
  const enrichedSecrets = secrets.map((secret) => {
    enrichSecret(secret);
    enriched++;

    if (enriched % 5 === 0) {
      process.stdout.write(
        `\r  Processed: ${enriched}/${secrets.length} secrets`
      );
    }

    return secret;
  });

  console.log(`\r✅ Enriched: ${enriched}/${secrets.length} secrets`);

  // Write enriched data
  console.log(`\n🔄 Writing enriched data to ${outputPath}...`);
  fs.writeFileSync(outputPath, JSON.stringify(enrichedSecrets, null, 2));

  // Print summary statistics
  console.log("\n📊 Enrichment Summary:");

  const highExclusivity = enrichedSecrets.filter(
    (s) => s.suggestion?.exclusivity === "high"
  ).length;
  const withArchetypeBias = enrichedSecrets.filter(
    (s) => Object.keys(s.suggestion?.archetypeBias || {}).length > 0
  ).length;
  const withCategories = enrichedSecrets.filter(
    (s) => s.suggestion?.requiredCategories?.length > 0
  ).length;

  console.log(`  - ${highExclusivity} secrets with high exclusivity`);
  console.log(
    `  - ${withArchetypeBias} secrets with archetype bias mappings`
  );
  console.log(`  - ${withCategories} secrets with Force category requirements`);

  console.log("\n✨ Enrichment complete!");
}

main().catch((err) => {
  console.error("❌ Enrichment failed:", err);
  process.exit(1);
});
