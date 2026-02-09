/**
 * Import Nonheroic Units to NPC Compendium
 *
 * This script converts the nonheroic_units.json file into proper Foundry Actor documents
 * and imports them into the 'npc' compendium.
 *
 * USAGE:
 * Run this as a macro in Foundry VTT (as a GM) or via the console.
 * NOTE: When used as a macro in Foundry, ensure createActor is available globally or replace with Actor.createDocuments()
 *
 * Steps:
 * 1. Copy this entire file content
 * 2. Create a new Script macro in Foundry
 * 3. Paste the content
 * 4. Execute the macro
 */

// For module usage, import createActor
let createActor;
try {
  const module = await import('../core/document-api-v13.js');
  createActor = module.createActor;
} catch (e) {
  // Fallback for macro context where imports don't work
  // In Foundry console, Actor.createDocuments is used instead
  createActor = null;
}

(async function importNonheroicUnits() {
  // Load the JSON data
  const response = await fetch('systems/foundryvtt-swse/data/nonheroic/nonheroic_units.json');
  const nonheroicUnits = await response.json();

  // Get the NPC compendium
  const npcPack = game.packs.get('foundryvtt-swse.npc');

  if (!npcPack) {
    ui.notifications.error('NPC compendium not found!');
    return;
  }

  // Ensure the pack is unlocked
  if (npcPack.locked) {
    ui.notifications.warn('The NPC compendium is locked. Unlocking it temporarily...');
    await npcPack.configure({ locked: false });
  }

  ui.notifications.info(`Starting import of ${nonheroicUnits.length} nonheroic units...`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const template of nonheroicUnits) {
    try {
      // Check if NPC already exists in compendium
      const existing = npcPack.index.find(i => i.name === template.name);
      if (existing) {
        swseLogger.log(`Skipping ${template.name} - already exists`);
        skipped++;
        continue;
      }

      // Convert template to Foundry Actor data structure
      const actorData = {
        name: template.name,
        type: 'npc',
        system: {
          // Abilities
          abilities: template.abilities || {
            str: { base: 10, racial: 0, misc: 0, total: 10, mod: 0 },
            dex: { base: 10, racial: 0, misc: 0, total: 10, mod: 0 },
            con: { base: 10, racial: 0, misc: 0, total: 10, mod: 0 },
            int: { base: 10, racial: 0, misc: 0, total: 10, mod: 0 },
            wis: { base: 10, racial: 0, misc: 0, total: 10, mod: 0 },
            cha: { base: 10, racial: 0, misc: 0, total: 10, mod: 0 }
          },

          // Defenses
          defenses: template.defenses || {
            reflex: { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10 },
            fortitude: { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10 },
            will: { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10 }
          },

          // HP
          hp: template.hp || { value: 10, max: 10, temp: 0 },

          // Core stats
          level: template.level || 1,
          challengeLevel: template.challengeLevel,
          size: template.size || 'medium',
          speed: template.speed || 6,
          bab: template.bab || 0,
          initiative: template.initiative || 0,
          damageThreshold: template.damageThreshold || 10,
          perception: template.perception,
          senses: template.senses || '',

          // Condition track
          conditionTrack: template.conditionTrack || { current: 0, persistent: false, penalty: 0 },

          // Force sensitivity
          forceSensitive: template.forceSensitive || false,
          forcePoints: template.forcePoints || { value: 0, max: 0, die: '1d6' },
          destinyPoints: { value: 0, max: 0 },
          darkSideScore: 0,

          // Biography (include notes from template)
          biography: buildBiography(template),

          // Other fields
          credits: 0,
          experience: 0
        },

        // Prototypetoken
        prototypeToken: {
          name: template.name,
          displayName: 40, // HOVER
          actorLink: false,
          disposition: -1 // HOSTILE
        }
      };

      // Create the actor document in the compendium
      const actor = createActor
        ? await createActor(actorData, { pack: npcPack.collection })
        : await Actor.create(actorData, { pack: npcPack.collection });

      // Now add items (feats, talents) to the actor
      const itemsToAdd = [];

      // Add feats as items
      if (template.feats && template.feats.length > 0) {
        for (const featName of template.feats) {
          // Try to find feat in compendium
          const featPack = game.packs.get('foundryvtt-swse.feats');
          const featIndex = featPack ? await featPack.getIndex() : null;
          const featEntry = featIndex ? featIndex.find(i => i.name.toLowerCase() === featName.toLowerCase()) : null;

          if (featEntry) {
            const feat = await featPack.getDocument(featEntry._id);
            itemsToAdd.push(feat.toObject());
          } else {
            // Create placeholder
            itemsToAdd.push({
              name: featName,
              type: 'feat',
              system: { description: 'From nonheroic units template' }
            });
          }
        }
      }

      // Add talents as items
      if (template.talents && template.talents.length > 0) {
        for (const talentName of template.talents) {
          // Try to find talent in compendium
          const talentPack = game.packs.get('foundryvtt-swse.talents');
          const talentIndex = talentPack ? await talentPack.getIndex() : null;
          const talentEntry = talentIndex ? talentIndex.find(i => i.name.toLowerCase() === talentName.toLowerCase()) : null;

          if (talentEntry) {
            const talent = await talentPack.getDocument(talentEntry._id);
            itemsToAdd.push(talent.toObject());
          } else {
            // Create placeholder
            itemsToAdd.push({
              name: talentName,
              type: 'talent',
              system: { description: 'From nonheroic units template' }
            });
          }
        }
      }

      // Add all items at once
      if (itemsToAdd.length > 0) {
        await actor.createEmbeddedDocuments('Item', itemsToAdd);
      }

      imported++;

      // Log progress every 50 imports
      if (imported % 50 === 0) {
        swseLogger.log(`Progress: ${imported} imported, ${skipped} skipped, ${errors} errors`);
      }

    } catch (error) {
      swseLogger.error(`Error importing ${template.name}:`, error);
      errors++;
    }
  }

  ui.notifications.info(`Import complete! ${imported} imported, ${skipped} skipped, ${errors} errors.`);
  swseLogger.log(`=== Import Summary ===`);
  swseLogger.log(`Imported: ${imported}`);
  swseLogger.log(`Skipped: ${skipped}`);
  swseLogger.log(`Errors: ${errors}`);

  // Helper function to build biography
  function buildBiography(template) {
    let bio = '<div class="npc-template-notes">';

    if (template.challengeLevel) {
      bio += `<p><strong>Challenge Level:</strong> ${template.challengeLevel}</p>`;
    }

    if (template.speciesType) {
      bio += `<p><strong>Type:</strong> ${template.speciesType}</p>`;
    }

    if (template.skillsText) {
      bio += `<h3>Skills</h3><p>${template.skillsText}</p>`;
    }

    if (template.equipment) {
      bio += `<h3>Equipment</h3><p>${template.equipment}</p>`;
    }

    if (template.abilitiesText) {
      bio += `<h3>Special Abilities</h3><p>${template.abilitiesText}</p>`;
    }

    if (template.speciesTraits) {
      bio += `<h3>Species Traits</h3><p>${template.speciesTraits}</p>`;
    }

    if (template.forcePowers) {
      bio += `<h3>Force Powers</h3><p>${template.forcePowers}</p>`;
    }

    bio += '</div>';
    return bio;
  }

})();
