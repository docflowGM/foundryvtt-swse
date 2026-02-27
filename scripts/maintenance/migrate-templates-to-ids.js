/**
 * Migrate Templates to ID-Based Format
 *
 * This script converts character templates from name-based references to
 * compendium ID-based references for safety and reliability.
 *
 * USAGE IN FOUNDRY CONSOLE:
 * ```
 * import { migrateTemplatesToIds } from 'migrate-templates-to-ids.js';
 * const result = await migrateTemplatesToIds();
 * console.log(JSON.stringify(result, null, 2));
 * // Copy the output and paste it into data/character-templates.json
 * ```
 *
 * PROCESS:
 * 1. Loads old templates from data/character-templates.json
 * 2. Validates all name references can be resolved to IDs
 * 3. Reports any missing or invalid references
 * 4. Converts valid templates to ID-based format
 * 5. Returns new template data ready to save
 *
 * SAFETY:
 * - Does NOT modify the original file
 * - Validates before converting
 * - Reports all issues clearly
 * - Only converts templates with valid references
 * - Includes metadata (version, migration date) in output
 */

import { TemplateIdMapper } from "/systems/foundryvtt-swse/scripts/utils/template-id-mapper.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * Main migration function
 * @returns {Promise<Object>} New template data ready to save
 */
export async function migrateTemplatesToIds() {
  console.group('🔄 Template Migration to Compendium IDs');
  console.log('Loading templates...');

  try {
    // ========================================================================
    // STEP 1: Load old templates
    // ========================================================================
    const response = await fetch('data/character-templates.json');
    if (!response.ok) {
      throw new Error(`Failed to load templates: ${response.statusText}`);
    }

    const data = await response.json();
    const oldTemplates = data.templates;

    console.log(`✅ Loaded ${oldTemplates.length} templates`);
    console.group('Template IDs:');
    oldTemplates.forEach(t => console.log(`  - ${t.id}: ${t.name}`));
    console.groupEnd();

    // ========================================================================
    // STEP 2: Validate all templates
    // ========================================================================
    console.group('📋 Validation Phase');
    console.log(`Validating ${oldTemplates.length} templates...`);

    const validationReport = await TemplateIdMapper.validateAllTemplates(oldTemplates);

    console.log(`\n✅ Validation Results:`);
    console.log(`   Valid:   ${validationReport.validCount}/${validationReport.totalTemplates}`);
    console.log(`   Invalid: ${validationReport.invalidCount}/${validationReport.totalTemplates}`);

    // Report issues
    if (validationReport.invalidCount > 0) {
      console.warn('\n⚠️  Issues Found:');
      for (const [templateId, issues] of Object.entries(validationReport.issues)) {
        console.warn(`\n  ${templateId}:`);
        issues.forEach(issue => console.warn(`    ${issue}`));
      }

      if (validationReport.validCount === 0) {
        console.error('\n❌ MIGRATION FAILED: No valid templates. Fix errors and try again.');
        console.groupEnd();
        throw new Error('Validation failed: no valid templates');
      }

      console.warn(
        `\n⚠️  WARNING: Only ${validationReport.validCount} templates will be migrated. ` +
        `Fix ${validationReport.invalidCount} templates and re-run migration.`
      );
    } else {
      console.log('\n✅ All templates validated successfully!');
    }

    console.groupEnd();

    // ========================================================================
    // STEP 3: Convert valid templates to ID-based format
    // ========================================================================
    console.group('🔀 Conversion Phase');
    console.log(`Converting ${validationReport.validCount} valid templates...`);

    const newTemplates = [];
    let convertedCount = 0;

    for (const oldTemplate of oldTemplates) {
      // Skip invalid templates
      if (validationReport.issues[oldTemplate.id]) {
        console.warn(`⏭️  Skipping invalid template: ${oldTemplate.id}`);
        continue;
      }

      try {
        const converted = await TemplateIdMapper.convertTemplate(oldTemplate);
        newTemplates.push(converted);
        console.log(`✅ ${oldTemplate.id}`);
        convertedCount++;
      } catch (err) {
        console.error(`❌ ${oldTemplate.id}: ${err.message}`);
      }
    }

    console.log(`\n✅ Converted ${convertedCount} templates`);
    console.groupEnd();

    // ========================================================================
    // STEP 4: Generate output
    // ========================================================================
    console.group('📤 Output Generation');

    const output = {
      version: 2,
      migrated: new Date().toISOString(),
      source: 'character-templates.json (v1)',
      totalOriginal: oldTemplates.length,
      totalConverted: newTemplates.length,
      skippedInvalid: validationReport.invalidCount,
      notes: 'All template data converted to use compendium IDs for reliability',
      templates: newTemplates
    };

    console.log('✅ Output generated');
    console.log(`   Version: ${output.version}`);
    console.log(`   Templates: ${output.totalConverted}/${output.totalOriginal}`);
    console.log(`   Format: ID-based (compendium IDs)`);

    // ========================================================================
    // STEP 5: Show results
    // ========================================================================
    console.groupEnd();
    console.group('📊 Migration Summary');

    console.table({
      'Total Original': oldTemplates.length,
      'Converted': convertedCount,
      'Skipped (Invalid)': validationReport.invalidCount,
      'Status': validationReport.invalidCount === 0 ? '✅ Complete' : '⚠️ Partial'
    });

    console.log('\n📋 Next Steps:');
    console.log('1. Copy the JSON output below');
    console.log('2. Open data/character-templates.json in an editor');
    console.log('3. Replace entire content with the output');
    console.log('4. Save the file');
    console.log('5. Reload Foundry to verify templates load');

    console.groupEnd();

    // ========================================================================
    // RETURN OUTPUT FOR USER
    // ========================================================================
    return output;

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err);
    console.groupEnd();
    throw err;
  }
}

/**
 * Helper: Get a summary of what changed in each template
 * Useful for verifying the conversion worked
 */
export function compareMigration(oldTemplate, newTemplate) {
  const changes = {};

  // Check each field that was converted
  if (oldTemplate.species !== undefined && newTemplate.speciesId !== undefined) {
    changes.species = {
      old: oldTemplate.species,
      new: newTemplate.speciesId
    };
  }

  if (oldTemplate.className && newTemplate.classId) {
    changes.class = {
      old: oldTemplate.className || oldTemplate.class,
      new: newTemplate.classId
    };
  }

  if (oldTemplate.feat && newTemplate.featIds?.length) {
    changes.feat = {
      old: oldTemplate.feat,
      new: newTemplate.featIds[0]
    };
  }

  if (oldTemplate.talent && newTemplate.talentIds?.length) {
    changes.talent = {
      old: oldTemplate.talent,
      new: newTemplate.talentIds[0]
    };
  }

  return changes;
}

/**
 * Helper: Verify migrated templates are loadable
 * Run this after saving the new templates.json
 */
export async function verifyMigrationLoad() {
  console.group('🔍 Verifying Migration');

  try {
    const response = await fetch('data/character-templates.json');
    const data = await response.json();

    console.log(`✅ File loads successfully`);
    console.log(`   Version: ${data.version}`);
    console.log(`   Templates: ${data.templates.length}`);
    console.log(`   Migrated: ${data.migrated}`);

    // Check that all templates have ID fields
    let idBasedCount = 0;
    for (const template of data.templates) {
      if (template.speciesId && template.classId && template.featIds && template.talentIds) {
        idBasedCount++;
      }
    }

    console.log(`   ID-based: ${idBasedCount}/${data.templates.length}`);

    if (idBasedCount === data.templates.length) {
      console.log('✅ All templates successfully migrated to ID-based format');
    } else {
      console.warn(`⚠️  ${data.templates.length - idBasedCount} templates may not be fully migrated`);
    }

    console.groupEnd();
    return true;

  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    console.groupEnd();
    return false;
  }
}
