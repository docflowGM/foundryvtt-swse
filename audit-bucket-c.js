#!/usr/bin/env node

/**
 * SWSE Phase 12 — Bucket C (Second Wind / Condition Track) Audit
 *
 * OBJECTIVE: Map Bucket C feats to EXISTING systems only
 * NO code, NO system invention, NO assumptions
 */

import fs from "fs";
import readline from "readline";
import path from "path";

const featsDbPath = "./packs/feats.db";

/**
 * STEP 1: Identify Bucket C feats (Second Wind / condition track keywords)
 */
async function extractBucketCFeats() {
  const feats = [];
  const keywords = ["second wind", "condition track", "recover", "persistent", "damage threshold", "condition recovery"];

  const rl = readline.createInterface({
    input: fs.createReadStream(featsDbPath)
  });

  for await (const line of rl) {
    try {
      const feat = JSON.parse(line);
      if (!feat.name || !feat.system?.abilityMeta?.modifiers?.some(m =>
        m.description?.includes("[REQUIRES MANUAL MAPPING]")
      )) continue;

      const allText = [
        feat.system?.benefit || "",
        feat.system?.description?.value || "",
        feat.system?.normalText || ""
      ].join(" ").toLowerCase();

      // Check for Bucket C keywords
      if (keywords.some(kw => allText.includes(kw))) {
        feats.push({
          name: feat.name,
          benefit: feat.system?.benefit || "",
          description: feat.system?.description?.value || "",
          normalText: feat.system?.normalText || "",
          special: feat.system?.special || "",
          prerequisite: feat.system?.prerequisite || "",
          tags: feat.system?.tags || []
        });
      }
    } catch (e) {}
  }

  return feats;
}

/**
 * STEP 2: Find existing systems in repo
 */
async function findExistingSystems() {
  const systems = {
    "condition_track": null,
    "second_wind": null,
    "recovery": null,
    "actor_engine": null
  };

  // Find condition track component
  try {
    const ctFile = "./scripts/components/condition-track.js";
    if (fs.existsSync(ctFile)) {
      const content = fs.readFileSync(ctFile, "utf-8");
      systems.condition_track = {
        file: ctFile,
        functions: [
          "ConditionTrackComponent.render()",
          "ConditionTrackComponent._defineSteps()",
          "ConditionTrackComponent methods for improve/worsen"
        ],
        handles: "UI rendering, step tracking, persistent flag"
      };
    }
  } catch (e) {}

  // Find ActorEngine
  try {
    const aeDir = "./scripts/governance/actor-engine/";
    if (fs.existsSync(aeDir)) {
      const files = fs.readdirSync(aeDir).filter(f => f.endsWith(".js"));
      systems.actor_engine = {
        file: aeDir,
        functions: files,
        handles: "Actor mutations, state management"
      };
    }
  } catch (e) {}

  // Search for Second Wind references
  try {
    const scriptsDir = "./scripts";
    const searchFiles = (dir) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) {
          searchFiles(full);
        } else if (file.endsWith(".js")) {
          const content = fs.readFileSync(full, "utf-8");
          if (content.includes("secondWind") || content.includes("second_wind") || content.includes("Second Wind")) {
            if (!systems.second_wind) systems.second_wind = [];
            systems.second_wind.push({
              file: full.replace("./", ""),
              mentions: content.split("\n").filter(l =>
                l.includes("secondWind") || l.includes("second_wind") || l.includes("Second Wind")
              ).slice(0, 3)
            });
          }
        }
      }
    };
    searchFiles(scriptsDir);
  } catch (e) {}

  return systems;
}

/**
 * STEP 3: Map feats to systems
 */
function mapFeatsToSystems(feats, systems) {
  const mapping = [];

  for (const feat of feats) {
    const benefit = feat.benefit.toLowerCase();

    let effectType = "";
    let hookType = "";
    let systemTarget = "";
    let notes = [];

    // Pattern matching for effect types
    if (benefit.includes("second wind")) {
      if (benefit.includes("bonus") || benefit.includes("gain")) {
        effectType = "bonus_on_second_wind_trigger";
        systemTarget = "ActorEngine.catchSecondWind() hook";
        hookType = "event_listener";
      }
      if (benefit.includes("move action") || benefit.includes("swift action")) {
        effectType = "extra_action_on_second_wind";
        systemTarget = "ActorEngine action granting";
        hookType = "state_mutation";
      }
      if (benefit.includes("recover") || benefit.includes("healing")) {
        effectType = "enhanced_recovery";
        systemTarget = "ConditionTrackComponent + ActorEngine";
        hookType = "combined_systems";
      }
    }

    if (benefit.includes("condition") || benefit.includes("condition track")) {
      if (benefit.includes("persistent")) {
        effectType = "persistent_condition_handling";
        systemTarget = "ConditionTrackComponent.persistent flag";
        hookType = "metadata_flag";
        notes.push("Check how persistent conditions are currently enforced");
      }
      if (benefit.includes("first time") || benefit.includes("step")) {
        effectType = "condition_step_prevention";
        systemTarget = "ConditionTrackComponent step logic";
        hookType = "small_bridge_needed";
        notes.push("May need condition check predicate in damage calculation");
      }
    }

    mapping.push({
      feat: feat.name,
      benefit: feat.benefit,
      effectType: effectType || "NEEDS_ANALYSIS",
      systemTarget: systemTarget || "UNCLEAR",
      hookType: hookType || "UNCLEAR",
      notes: notes.length > 0 ? notes : ["Check exact rule interaction"]
    });
  }

  return mapping;
}

/**
 * STEP 4: Identify patterns
 */
function identifyPatterns(feats) {
  const patterns = {
    "extra_second_wind_uses": [],
    "second_wind_trigger_benefits": [],
    "condition_track_interaction": [],
    "recovery_enhancement": [],
    "mixed_mechanics": []
  };

  for (const feat of feats) {
    const benefit = feat.benefit.toLowerCase();

    if (benefit.includes("second wind") && benefit.includes("use")) {
      patterns.extra_second_wind_uses.push(feat.name);
    } else if (benefit.includes("when you catch") || benefit.includes("when you take") || benefit.includes("when you use")) {
      patterns.second_wind_trigger_benefits.push(feat.name);
    } else if (benefit.includes("condition track") || benefit.includes("condition") || benefit.includes("step down")) {
      patterns.condition_track_interaction.push(feat.name);
    } else if (benefit.includes("recover") || benefit.includes("healing") || benefit.includes("restore")) {
      patterns.recovery_enhancement.push(feat.name);
    } else {
      patterns.mixed_mechanics.push(feat.name);
    }
  }

  return patterns;
}

/**
 * STEP 5: Implementation readiness
 */
function assessImplementationReadiness(mapping, patterns) {
  const readiness = {};

  for (const [pattern, feats] of Object.entries(patterns)) {
    if (feats.length === 0) continue;

    const sample = mapping.find(m => feats.includes(m.feat));
    if (!sample) continue;

    const isMetadataOnly = !sample.notes.some(n => n.includes("bridge"));
    const needsHelper = sample.hookType === "small_bridge_needed" || sample.hookType === "combined_systems";
    const hasBlockers = sample.hookType === "UNCLEAR" || sample.systemTarget === "UNCLEAR";

    readiness[pattern] = {
      count: feats.length,
      metadataOnly: isMetadataOnly,
      needsHelper: needsHelper,
      hasBlockers: hasBlockers,
      readiness: hasBlockers ? "NEEDS_RESEARCH" : (needsHelper ? "LOW_RISK_WITH_BRIDGE" : "READY_METADATA_ONLY"),
      feats: feats
    };
  }

  return readiness;
}

/**
 * Main execution
 */
async function run() {
  console.log("=".repeat(80));
  console.log("BUCKET C AUDIT: Second Wind / Condition Track Feats");
  console.log("=".repeat(80));

  // STEP 1
  console.log("\n[STEP 1] Extracting Bucket C feats...");
  const feats = await extractBucketCFeats();
  console.log(`✓ Found ${feats.length} feats\n`);
  console.log("Feat List:");
  feats.forEach(f => console.log(`  - ${f.name}`));

  // STEP 2
  console.log("\n[STEP 2] Identifying existing systems...");
  const systems = await findExistingSystems();
  console.log("\nExisting Systems:");
  for (const [sys, info] of Object.entries(systems)) {
    if (info) {
      console.log(`\n${sys}:`);
      if (Array.isArray(info)) {
        info.forEach(i => console.log(`  - ${i.file}`));
      } else {
        console.log(`  File: ${info.file}`);
        console.log(`  Handles: ${info.handles}`);
      }
    }
  }

  // STEP 3
  console.log("\n[STEP 3] Mapping feats to systems...");
  const mapping = mapFeatsToSystems(feats, systems);

  console.log("\nFeat → System Mapping:");
  mapping.forEach(m => {
    console.log(`\nFeat: ${m.feat}`);
    console.log(`  Benefit: ${m.benefit.substring(0, 80)}`);
    console.log(`  Effect Type: ${m.effectType}`);
    console.log(`  System Target: ${m.systemTarget}`);
    console.log(`  Hook Type: ${m.hookType}`);
    if (m.notes.length > 0) {
      console.log(`  Notes: ${m.notes.join("; ")}`);
    }
  });

  // STEP 4
  console.log("\n[STEP 4] Pattern grouping...");
  const patterns = identifyPatterns(feats);

  console.log("\nPattern Groups:");
  for (const [pattern, featList] of Object.entries(patterns)) {
    if (featList.length > 0) {
      console.log(`\n${pattern} (${featList.length}):`);
      featList.forEach(f => console.log(`  - ${f}`));
    }
  }

  // STEP 5
  console.log("\n[STEP 5] Implementation readiness assessment...");
  const readiness = assessImplementationReadiness(mapping, patterns);

  console.log("\nImplementation Readiness:");
  for (const [pattern, info] of Object.entries(readiness)) {
    console.log(`\n${pattern}:`);
    console.log(`  Count: ${info.count}`);
    console.log(`  Metadata Only: ${info.metadataOnly ? "Yes" : "No"}`);
    console.log(`  Needs Helper: ${info.needsHelper ? "Yes" : "No"}`);
    console.log(`  Readiness: ${info.readiness}`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("AUDIT COMPLETE");
  console.log("=".repeat(80));

  // Write structured output
  const report = {
    bucket: "C",
    timestamp: new Date().toISOString(),
    totalFeats: feats.length,
    feats: feats.map(f => ({ name: f.name, benefit: f.benefit })),
    patterns,
    mapping,
    readiness,
    systems: Object.fromEntries(
      Object.entries(systems).filter(([_, v]) => v !== null)
    )
  };

  fs.writeFileSync("./bucket-c-audit.json", JSON.stringify(report, null, 2));
  console.log("\n✓ Detailed report saved to: bucket-c-audit.json");
}

run().catch(console.error);
