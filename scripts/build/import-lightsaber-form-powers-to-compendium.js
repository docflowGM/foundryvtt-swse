/**
 * Import Lightsaber Form Powers to Compendium
 *
 * This script converts the lightsaber-form-powers.json file into proper Foundry Item documents
 * of type "forcepower" and imports them into the 'lightsaberformpowers' compendium.
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

(async function importLightsaberFormPowers() {
  // Extract bonus talent from formBonus text like 'Lightsaber Form (Juyo): ...'
  function extractBonusTalent(formBonusText) {
    if (!formBonusText) return '';
    const match = formBonusText.match(/Lightsaber Form \(([^)]+)\)/);
    return match ? match[1] : '';
  }

  // Load the JSON data
  const response = await fetch('systems/foundryvtt-swse/data/lightsaber-form-powers.json');
  const data = await response.json();
  const powers = data.powers;

  // Get the lightsaberformpowers compendium
  const pack = game.packs.get('foundryvtt-swse.lightsaberformpowers');

  if (!pack) {
    ui.notifications.error('Lightsaber Form Powers compendium not found!');
    return;
  }

  // Ensure the pack is unlocked
  if (pack.locked) {
    ui.notifications.warn('The Lightsaber Form Powers compendium is locked. Unlocking it temporarily...');
    await pack.configure({ locked: false });
  }

  ui.notifications.info(`Starting import of ${powers.length} lightsaber form powers...`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const powerData of powers) {
    try {
      // Check if power already exists in compendium
      const existing = pack.index.find(i => i.name === powerData.name);
      if (existing) {
        console.log(`Skipping "${powerData.name}" - already exists`);
        skipped++;
        continue;
      }

      // Build description from available fields
      let fullDescription = '';
      if (powerData.description) {
        fullDescription += powerData.description;
      }
      if (powerData.effect) {
        if (fullDescription) fullDescription += '\n\n';
        fullDescription += powerData.effect;
      }

      // Convert dcChart from { dc, effect } to { dc, effect, description }
      const dcChart = (powerData.dcChart || []).map(item => ({
        dc: item.dc,
        effect: item.effect,
        description: item.description || ''
      }));

      // Determine useTheForce DC - look for lowest DC in chart or use default
      let useTheForce = 15;
      if (dcChart.length > 0) {
        const dcs = dcChart.map(item => item.dc).sort((a, b) => a - b);
        useTheForce = dcs[0];
      }

      // Map discipline field - it comes as "Form X: <name>" format
      let discipline = 'telekinetic'; // default
      if (powerData.discipline) {
        const disc = powerData.discipline.toLowerCase();
        if (disc.includes('telekinetic')) discipline = 'telekinetic';
        else if (disc.includes('telepathic')) discipline = 'telepathic';
        else if (disc.includes('vital')) discipline = 'vital';
        else if (disc.includes('dark')) discipline = 'dark-side';
        else if (disc.includes('light')) discipline = 'light-side';
      }

      // Extract bonus talent from formBonus text
      const formBonusText = powerData.formBonus || '';
      const bonusTalent = extractBonusTalent(formBonusText);

      // Convert item data
      const itemData = {
        name: powerData.name,
        type: 'force-power',
        img: 'icons/magic/light/orb-lightbulb-gray.webp',
        system: {
          powerLevel: 1,
          discipline: discipline,
          useTheForce: useTheForce,
          time: powerData.time || 'Standard Action',
          range: powerData.range || '',
          target: powerData.target || '',
          duration: powerData.duration || 'Instantaneous',
          effect: fullDescription,
          special: powerData.special || '',
          dcChart: dcChart,
          maintainable: false,
          forcePointEffect: powerData.forcePointEffect || '',
          forcePointCost: powerData.forcePointCost || 0,
          sourcebook: powerData.source || 'Jedi Academy Training Manual',
          page: null,
          tags: powerData.tags || ['lightsaber-form'],
          descriptor: [],
          inSuite: false,
          spent: false,
          uses: {
            current: 0,
            max: 0
          },
          // Lightsaber form power extensions (bonus rider relationship, NOT prerequisites)
          form: powerData.form || '',
          bonusTalent: bonusTalent,
          trigger: powerData.trigger || '',
          formBonus: formBonusText,
          canRebuke: powerData.canRebuke || false
        }
      };

      // Create the item document in the compendium
      const item = await Item.create(itemData, { pack: pack.collection });

      imported++;

      // Log progress every 10 imports
      if (imported % 10 === 0) {
        console.log(`Progress: ${imported} imported, ${skipped} skipped, ${errors} errors`);
      }

    } catch (error) {
      console.error(`Error importing "${powerData.name}":`, error);
      errors++;
    }
  }

  ui.notifications.info(`Import complete! ${imported} imported, ${skipped} skipped, ${errors} errors.`);
  console.log(`=== Lightsaber Form Powers Import Summary ===`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);

})();
