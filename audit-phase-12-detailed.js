#!/usr/bin/env node

/**
 * SWSE Phase 12 Detailed Feat Audit
 * Extract and analyze actual rules for proper categorization
 */

import fs from "fs";
import readline from "readline";

const featsDbPath = "./packs/feats.db";

async function readFeatsDb() {
  const feats = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(featsDbPath)
  });

  for await (const line of rl) {
    try {
      const feat = JSON.parse(line);
      if (feat.name && feat.system?.abilityMeta?.modifiers?.some(m =>
        m.description?.includes("[REQUIRES MANUAL MAPPING]")
      )) {
        feats.push({
          name: feat.name,
          benefit: feat.system?.benefit || "",
          description: feat.system?.description?.value || "",
          tags: feat.system?.tags || [],
          prerequisite: feat.system?.prerequisite || "",
          normalText: feat.system?.normalText || "",
          special: feat.system?.special || ""
        });
      }
    } catch (e) {}
  }

  return feats;
}

function analyzeRule(feat) {
  const allText = [feat.benefit, feat.description, feat.normalText, feat.special].join(" ").toLowerCase();

  // More precise pattern matching
  const rules = {
    numeric_bonus: /\+\d+|bonus|gain.*(?:bonus|step|die)/,
    attack_modifier: /attack|damage|defense|ac|fort|ref|will/,
    action_economy: /swift action|move action|standard action|free action|bonus action/,
    roll_replacement: /reroll|roll.*again|instead.*roll|substitute|take.*result/,
    conditional: /when you|whenever|if you|provided that|must|requires/,
    restricted_use: /once per|number of times|limited|restricted/,
    passive_constant: /gain.*bonus|always|permanently|constant|passive/,
    active_triggered: /choose|you may|you decide|at your discretion|reaction|trigger/,
    targeting: /target|range|touch|melee|ranged|ally|enemy|friend|foe/,
    resource_cost: /spend|cost|point|charge|use/
  };

  const detected = [];
  for (const [type, pattern] of Object.entries(rules)) {
    if (pattern.test(allText)) {
      detected.push(type);
    }
  }

  return detected;
}

async function run() {
  console.log("Extracting detailed rules...");
  const feats = await readFeatsDb();

  // Sample from each category
  const samples = {
    simple_passive: [],
    conditional_passive: [],
    action_economy: [],
    resource_spending: [],
    complex_conditional: []
  };

  for (const feat of feats) {
    const rules = analyzeRule(feat);
    const text = feat.benefit.toLowerCase();

    if (text.includes("+") && rules.length < 3) {
      samples.simple_passive.push(feat.name);
    } else if (rules.includes("conditional") && !rules.includes("active_triggered")) {
      samples.conditional_passive.push(feat.name);
    } else if (rules.includes("action_economy")) {
      samples.action_economy.push(feat.name);
    } else if (rules.includes("resource_cost")) {
      samples.resource_spending.push(feat.name);
    } else if (rules.includes("active_triggered") || rules.includes("targeting")) {
      samples.complex_conditional.push(feat.name);
    }
  }

  console.log("\n=== SAMPLE CATEGORIZATION ===\n");

  for (const [cat, list] of Object.entries(samples)) {
    console.log(`${cat} (${list.length}):`);
    list.slice(0, 8).forEach(name => console.log(`  - ${name}`));
    if (list.length > 8) console.log(`  ... +${list.length - 8} more\n`);
  }

  // Print first 10 "OTHER" feats with their full rules
  console.log("\n=== SAMPLE FEAT RULES ===\n");
  const sampleFeats = feats.slice(0, 15);
  for (const feat of sampleFeats) {
    const rules = analyzeRule(feat);
    console.log(`${feat.name}`);
    console.log(`  Benefit: ${feat.benefit.substring(0, 100)}`);
    console.log(`  Rules: ${rules.join(", ")}\n`);
  }
}

run().catch(console.error);
