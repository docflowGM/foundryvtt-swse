/**
 * Update Species Compendium with Racial Traits
 *
 * This script updates the species compendium with racial traits from species-traits.json
 *
 * USAGE:
 * Run this as a macro in Foundry VTT (as a GM) or via the console.
 *
 * Steps:
 * 1. Copy this entire file content
 * 2. Create a new Script macro in Foundry
 * 3. Paste the content
 * 4. Execute the macro
 */

(async function updateSpeciesTraits() {
  console.log('=== Starting Species Traits Update ===');

  // Load the species traits data
  let speciesTraitsData;
  try {
    const response = await fetch('systems/foundryvtt-swse/data/species-traits.json');
    if (!response.ok) {
      throw new Error(`Failed to load species-traits.json: ${response.statusText}`);
    }
    speciesTraitsData = await response.json();
  } catch (error) {
    ui.notifications.error('Failed to load species-traits.json!');
    console.error(error);
    return;
  }

  // Get the species compendium
  const speciesPack = game.packs.get('foundryvtt-swse.species');

  if (!speciesPack) {
    ui.notifications.error('Species compendium not found!');
    console.error('Could not find compendium: foundryvtt-swse.species');
    return;
  }

  // Ensure the pack is unlocked
  if (speciesPack.locked) {
    ui.notifications.warn('The species compendium is locked. Unlocking it temporarily...');
    await speciesPack.configure({ locked: false });
  }

  ui.notifications.info(`Starting update of ${speciesTraitsData.length} species...`);

  let updated = 0;
  let notFound = 0;
  let errors = 0;
  const notFoundSpecies = [];

  // Load the compendium index and build a map of names to IDs
  const index = await speciesPack.getIndex();
  const nameToIdMap = new Map();

  for (const indexEntry of index) {
    const name = indexEntry.name?.toLowerCase();
    if (name) {
      nameToIdMap.set(name, indexEntry._id);
    }
  }

  for (const speciesData of speciesTraitsData) {
    try {
      // Find the species ID by name lookup
      const speciesId = nameToIdMap.get(speciesData.name.toLowerCase());

      if (!speciesId) {
        console.warn(`Species not found in compendium: ${speciesData.name}`);
        notFound++;
        notFoundSpecies.push(speciesData.name);
        continue;
      }

      // Get the full species document by ID
      const speciesDoc = await speciesPack.getDocument(speciesId);

      if (!speciesDoc) {
        console.error(`Could not load species document: ${speciesData.name}`);
        errors++;
        continue;
      }

      // Update the species document
      // Store racial traits array in system.racialTraits field
      const updateData = {
        'system.racialTraits': speciesData.racialTraits
      };

      await speciesDoc.update(updateData);

      updated++;

      // Log progress every 20 updates
      if (updated % 20 === 0) {
        console.log(`Progress: ${updated} updated, ${notFound} not found, ${errors} errors`);
      }

    } catch (error) {
      console.error(`Error updating ${speciesData.name}:`, error);
      errors++;
    }
  }

  // Summary
  ui.notifications.info(`Update complete! ${updated} updated, ${notFound} not found, ${errors} errors.`);
  console.log(`=== Species Traits Update Summary ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Not Found: ${notFound}`);
  console.log(`Errors: ${errors}`);

  if (notFoundSpecies.length > 0) {
    console.log(`\nSpecies not found in compendium:`);
    notFoundSpecies.forEach(name => console.log(`  - ${name}`));
  }

  console.log('=== Update Complete ===');

})();
