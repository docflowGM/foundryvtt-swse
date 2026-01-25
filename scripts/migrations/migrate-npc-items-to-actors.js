#!/usr/bin/env node
/**
 * Migration script: Convert NPC pack Items to Actors
 * Converts type: "equipment" documents to type: "droid" Actor documents
 *
 * Usage: node migrate-npc-items-to-actors.js
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NPC_PACK_PATH = path.join(__dirname, '../../packs/npc.db');
const BACKUP_PATH = path.join(__dirname, '../../packs/npc.db.backup');

/**
 * Convert an equipment Item to a droid Actor
 */
function convertItemToActor(doc) {
  const converted = {
    _id: doc._id,
    name: doc.name,
    type: "droid",  // Changed from "equipment"
    img: doc.img || "icons/svg/mystery-man.svg",
    system: {
      // Base template fields
      hp: {
        value: doc.system?.hull?.value || 10,
        max: doc.system?.hull?.max || 10,
        temp: 0
      },
      defenses: {
        fortitude: {
          base: 10,
          misc: 0,
          total: 10,
          ability: 0,
          class: 0,
          armorMastery: 0,
          modifier: 0
        },
        reflex: {
          base: 10,
          misc: 0,
          total: 10,
          ability: 0,
          class: 0,
          armor: 0,
          armorMastery: 0,
          modifier: 0
        },
        will: {
          base: 10,
          misc: 0,
          total: 10,
          ability: 0,
          class: 0,
          armorMastery: 0,
          modifier: 0
        },
        flatFooted: {
          total: 10
        }
      },
      abilities: {
        str: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        dex: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        con: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        int: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        wis: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        cha: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 }
      },
      bab: 0,
      level: 1,
      race: "Droid",
      size: "medium",
      event: "",
      profession: "",
      planetOfOrigin: "",
      conditionTrack: "normal",
      speed: 6,
      forcePoints: { value: 0, max: 0, die: "1d6", diceType: "d6" },
      destinyPoints: { value: 0, max: 0 },
      darkSideScore: 0,
      starshipManeuverSuite: { max: 0, maneuvers: [] },
      forceSensitive: false,
      freeForcePowers: { current: 0, max: 0 },
      forceSecrets: [],
      forceTechniques: [],
      secondWind: { uses: 0, max: 0, misc: 0, healing: 0 },
      initiative: 0,
      damageThreshold: 10,
      damageThresholdMisc: 0,
      shields: { value: 0, max: 0, rating: 0, regenRate: 0 },
      damageReduction: 0,
      skills: {},
      weapons: [],
      feats: [],
      talents: [],
      customSkills: [],
      classes: [],
      credits: 0,
      experience: 0,

      // Preserve droid-specific data from original
      ...(doc.system?.baseStats && { baseStats: doc.system.baseStats }),
      ...(doc.system?.degree && { degree: doc.system.degree }),
      ...(doc.system?.perception && { perception: doc.system.perception }),
      ...(doc.system?.senses && { senses: doc.system.senses }),
      ...(doc.system?.attacks && { attacks: doc.system.attacks }),
      ...(doc.system?.type && { droidType: doc.system.type }),
      category: doc.system?.category || "Droid"
    },
    effects: doc.effects || [],
    folder: doc.folder || null,
    sort: doc.sort || 0,
    ownership: doc.ownership || { default: 0 },
    flags: doc.flags || {}
  };

  return converted;
}

/**
 * Main migration function
 */
async function migrate() {
  console.log("Starting NPC pack migration...");
  console.log(`Source: ${NPC_PACK_PATH}`);

  // Check if file exists
  if (!fs.existsSync(NPC_PACK_PATH)) {
    console.error(`Error: NPC pack not found at ${NPC_PACK_PATH}`);
    process.exit(1);
  }

  // Create backup
  console.log(`Creating backup at ${BACKUP_PATH}...`);
  fs.copyFileSync(NPC_PACK_PATH, BACKUP_PATH);
  console.log("✓ Backup created");

  // Read and convert
  console.log("Reading and converting documents...");
  const convertedDocs = [];
  let processedCount = 0;
  let errorCount = 0;

  const rl = readline.createInterface({
    input: fs.createReadStream(NPC_PACK_PATH),
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const doc = JSON.parse(line);

      // Verify it's an equipment item
      if (doc.type !== "equipment") {
        console.warn(`⚠ Skipping non-equipment document: ${doc.name} (type: ${doc.type})`);
        continue;
      }

      // Convert to actor
      const converted = convertItemToActor(doc);
      convertedDocs.push(converted);
      processedCount++;

      if (processedCount % 50 === 0) {
        console.log(`  ...processed ${processedCount} documents`);
      }
    } catch (err) {
      console.error(`✗ Error processing document:`, err.message);
      errorCount++;
    }
  }

  console.log(`✓ Processed ${processedCount} documents (${errorCount} errors)`);

  // Write converted pack
  console.log("Writing converted pack...");
  const writeStream = fs.createWriteStream(NPC_PACK_PATH);

  for (const doc of convertedDocs) {
    writeStream.write(JSON.stringify(doc) + '\n');
  }

  await new Promise((resolve, reject) => {
    writeStream.end();
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  console.log(`✓ Converted pack written with ${convertedDocs.length} Actor documents`);
  console.log("\n🎉 Migration complete!");
  console.log(`Converted: ${processedCount} documents from Items to Actors`);
  console.log(`Backup saved at: ${BACKUP_PATH}`);
}

// Run migration
migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
