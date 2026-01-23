#!/usr/bin/env node
/**
 * Force Technique Enrichment Script
 *
 * Automatically enriches Force Technique data with suggestion metadata:
 * - Maps techniques to associated Force Powers
 * - Infers categories from descriptors
 * - Generates archetype bias weights
 * - Calculates power synergy weights
 *
 * Usage: node enrich-force-techniques.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  normalize,
  extractCategoriesFromDescriptors,
  findMatchingPowers,
} from "./force-suggestion-utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "../../packs/forcetechniques.db");
const powersDbPath = path.join(__dirname, "../../packs/forcepowers.db");
const outputPath = path.join(__dirname, "../../data/forcetechniques.enriched.json");

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
 * Get archetype bias for technique categories
 */
function getArchetypeBiasForCategories(categories = []) {
  const archetypeBias = {};

  // Define archetype affinities by category
  const categoryAffinities = {
    vitality: {
      jedi_healer: 1.6,
      jedi_mentor: 1.3,
      sith_alchemist: 1.2,
    },
    defense: {
      jedi_guardian: 1.5,
      emperors_shield: 1.6,
      sith_juggernaut: 1.2,
    },
    control: {
      jedi_consular: 1.4,
      jedi_mentor: 1.3,
      sith_mastermind: 1.5,
    },
    awareness: {
      jedi_seer: 1.6,
      jedi_mentor: 1.4,
      jedi_archivist: 1.3,
    },
    precision: {
      jedi_weapon_master: 1.5,
      jedi_battlemaster: 1.3,
      sith_assassin: 1.4,
    },
    aggression: {
      sith_marauder: 1.6,
      sith_juggernaut: 1.5,
      jedi_battlemaster: 1.1,
    },
    support: {
      jedi_healer: 1.5,
      jedi_mentor: 1.4,
      jedi_consular: 1.2,
    },
    mobility: {
      jedi_sentinel: 1.3,
      sith_assassin: 1.4,
      jedi_ace_pilot: 1.2,
    },
  };

  // Aggregate biases across all categories
  for (const category of categories) {
    const affinities = categoryAffinities[category] || {};
    for (const [archetype, bias] of Object.entries(affinities)) {
      archetypeBias[archetype] = (archetypeBias[archetype] || 1.0) * bias;
    }
  }

  // Normalize to reasonable values
  for (const archetype in archetypeBias) {
    archetypeBias[archetype] = Number(archetypeBias[archetype].toFixed(2));
  }

  return archetypeBias;
}

/**
 * Enrich a single Force Technique
 */
function enrichTechnique(technique, powers) {
  const categories = extractCategoriesFromDescriptors(
    technique.system?.descriptor || []
  );

  const associatedPowers = [];
  const confidence = {};

  // First, check explicit prerequisite/relatedPower field
  const explicitPower = technique.system?.relatedPower ||
    technique.system?.prerequisite || "";

  if (explicitPower) {
    const matchedPower = powers.find(
      (p) => normalize(p.name) === normalize(explicitPower)
    );
    if (matchedPower) {
      associatedPowers.push(matchedPower.name);
      confidence[matchedPower.name] = 0.95; // High confidence for explicit links
    }
  }

  // If no explicit link, find matching powers by inference
  if (associatedPowers.length === 0) {
    const matches = findMatchingPowers(technique, powers, 0.5);
    for (const match of matches) {
      associatedPowers.push(match.power.name);
      confidence[match.power.name] = match.score;
    }
  }

  const archetypeBias = getArchetypeBiasForCategories(categories);

  technique.suggestion = {
    associatedPowers,
    confidence,
    categories,
    powerSynergyWeight: 2.0, // Techniques get significant boost if power is known
    archetypeBias,
  };

  return technique;
}

/**
 * Main enrichment process
 */
async function main() {
  console.log("🔄 Loading Force Technique and Power databases...");

  const techniques = loadDb(dbPath);
  const powers = loadDb(powersDbPath);

  console.log(`✅ Loaded ${techniques.length} Force Techniques`);
  console.log(`✅ Loaded ${powers.length} Force Powers`);

  console.log("\n🔄 Enriching Force Techniques with suggestion metadata...");

  let enriched = 0;
  const enrichedTechniques = techniques.map((technique) => {
    enrichTechnique(technique, powers);
    enriched++;

    if (enriched % 10 === 0) {
      process.stdout.write(
        `\r  Processed: ${enriched}/${techniques.length} techniques`
      );
    }

    return technique;
  });

  console.log(`\r✅ Enriched: ${enriched}/${techniques.length} techniques`);

  // Write enriched data
  console.log(`\n🔄 Writing enriched data to ${outputPath}...`);
  fs.writeFileSync(outputPath, JSON.stringify(enrichedTechniques, null, 2));

  // Print summary statistics
  console.log("\n📊 Enrichment Summary:");

  const withPowers = enrichedTechniques.filter(
    (t) => t.suggestion?.associatedPowers?.length > 0
  ).length;
  const withCategories = enrichedTechniques.filter(
    (t) => t.suggestion?.categories?.length > 0
  ).length;
  const withArchetypeBias = enrichedTechniques.filter(
    (t) => Object.keys(t.suggestion?.archetypeBias || {}).length > 0
  ).length;

  console.log(`  - ${withPowers} techniques mapped to Powers`);
  console.log(`  - ${withCategories} techniques with inferred categories`);
  console.log(`  - ${withArchetypeBias} techniques with archetype bias`);

  console.log("\n✨ Enrichment complete!");
}

main().catch((err) => {
  console.error("❌ Enrichment failed:", err);
  process.exit(1);
});
