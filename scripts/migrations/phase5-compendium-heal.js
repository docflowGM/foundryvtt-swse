/**
 * Phase 5: Data Migration & Compendium Healing
 *
 * Migrates compendium packs from legacy schema to canonical SSOT schema:
 * - system.abilities → system.attributes.*.base
 * - system.defenses.fort/ref → system.defenses.fortitude/reflex
 * - Remove legacy fields: system.bab, system.damageThreshold, system.forcePoints.die/diceType
 * - Fix extra skill uses missing system.skill field
 *
 * Usage:
 *   // DRY RUN (preview, no writes)
 *   const dryStats = await migrateCompendiumPacks(true);
 *
 *   // EXECUTE (after verifying dryRun output)
 *   const stats = await migrateCompendiumPacks(false);
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export async function migrateCompendiumPacks(dryRun = true) {
  const packNames = ['talents', 'heroic', 'nonheroic', 'extraskilluses'];
  const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  // CANONICAL skill keys from SWSE system (actual 22-25 skills)
  const skillKeys = [
    'acrobatics', 'climb', 'deception', 'endurance', 'gatherInformation', 'initiative', 'jump',
    'knowledgeBureaucracy', 'knowledgeGalacticLore', 'knowledgeLifeSciences', 'knowledgePhysicalSciences',
    'knowledgeSocialSciences', 'knowledgeTactics', 'knowledgeTechnology',
    'mechanics', 'perception', 'persuasion', 'pilot', 'ride', 'stealth', 'survival', 'swim', 'treatInjury', 'useComputer', 'useTheForce'
  ];

  const stats = {
    packStats: {},
    unmappedExtraSkillUses: []
  };

  SWSELogger.log(`[Phase 5] Starting compendium migration (dryRun=${dryRun})`);

  for (const packName of packNames) {
    SWSELogger.log(`[Phase 5] Processing pack: ${packName}`);

    const pack = game.packs.get(`swse.${packName}`);
    if (!pack) {
      SWSELogger.warn(`[Phase 5] Pack not found: swse.${packName}`);
      continue;
    }

    const docs = await pack.getDocuments();
    let migratedCount = 0;
    let errorCount = 0;
    let unchangedCount = 0;

    stats.packStats[packName] = { migrated: 0, errors: 0, unchanged: 0, total: docs.length };

    for (const doc of docs) {
      try {
        const updates = {};
        let hasChanges = false;

        // =========================================
        // 5A: Ability Migration (abilities → attributes.*.base)
        // =========================================
        if (doc.system.abilities) {
          for (const key of abilityKeys) {
            const abilityData = doc.system.abilities[key];
            if (abilityData !== undefined) {
              // Handle object shape {base, total} or numeric shape
              const baseValue = typeof abilityData === 'object'
                ? (abilityData.base ?? abilityData.total ?? 10)
                : (typeof abilityData === 'number' ? abilityData : 10);

              // USE DOT-PATH ONLY — do NOT overwrite whole system.attributes object
              updates[`system.attributes.${key}.base`] = baseValue;
              hasChanges = true;
            }
          }

          // Remove old abilities field using proper Foundry deletion syntax
          updates['system.-=abilities'] = null;
        }

        // =========================================
        // 5B: Defense Key Normalization (fort/ref → fortitude/reflex)
        // =========================================
        const defenses = doc.system.defenses || {};

        // Migrate fort → fortitude
        if (defenses.fort && !defenses.fortitude) {
          // Copy the entire fort object to fortitude
          updates['system.defenses.fortitude'] = defenses.fort;
          // Remove old key using proper Foundry deletion syntax
          updates['system.defenses.-=fort'] = null;
          hasChanges = true;
        }

        // Migrate ref → reflex
        if (defenses.ref && !defenses.reflex) {
          updates['system.defenses.reflex'] = defenses.ref;
          updates['system.defenses.-=ref'] = null;
          hasChanges = true;
        }

        // Audit & fix fortitudeitude typo
        if (defenses.fortitudeitude) {
          SWSELogger.warn(`[Phase 5] Found fortitudeitude typo in ${packName}/${doc.name}`);
          updates['system.defenses.fortitude'] = defenses.fortitudeitude;
          updates['system.defenses.-=fortitudeitude'] = null;
          hasChanges = true;
        }

        // =========================================
        // 5C: Legacy Stat Cleanup (using proper deletion syntax)
        // =========================================
        if (doc.system.bab !== undefined && doc.system.bab !== null) {
          updates['system.-=bab'] = null;
          hasChanges = true;
        }

        if (doc.system.damageThreshold !== undefined && doc.system.damageThreshold !== null) {
          updates['system.-=damageThreshold'] = null;
          hasChanges = true;
        }

        if (doc.system.forcePoints?.die !== undefined) {
          updates['system.forcePoints.-=die'] = null;
          hasChanges = true;
        }

        if (doc.system.forcePoints?.diceType !== undefined) {
          updates['system.forcePoints.-=diceType'] = null;
          hasChanges = true;
        }

        // =========================================
        // 5D: Extra Skill Uses Validation & Mapping Fix
        // =========================================
        if (packName === 'extraskilluses' && doc.documentName === 'Item') {
          const currentSkill = doc.system.skill;

          if (!currentSkill || !skillKeys.includes(currentSkill)) {
            // Try to infer from known fields or name
            let inferredSkill = null;

            // Option 1: Check if there's a system.application field
            if (doc.system.application && skillKeys.includes(doc.system.application)) {
              inferredSkill = doc.system.application;
            }
            // Option 2: Try simple name parsing (e.g., "Acrobatics +1" → "acrobatics")
            else if (doc.name) {
              const nameLower = doc.name.toLowerCase();
              for (const skill of skillKeys) {
                if (nameLower.includes(skill.toLowerCase())) {
                  inferredSkill = skill;
                  break;
                }
              }
            }

            if (inferredSkill) {
              updates['system.skill'] = inferredSkill;
              hasChanges = true;
              SWSELogger.debug(`[Phase 5] Extra skill use "${doc.name}" inferred skill: ${inferredSkill}`);
            } else {
              // Still unmapped after inference — log for manual review
              stats.unmappedExtraSkillUses.push({
                itemName: doc.name,
                currentSkill: currentSkill,
                docId: doc.id
              });
              SWSELogger.warn(`[Phase 5] Extra skill use "${doc.name}" (${doc.id}) could not infer system.skill — needs manual mapping`);
            }
          }
        }

        // =========================================
        // Apply Updates (respecting dryRun flag)
        // =========================================
        if (hasChanges && Object.keys(updates).length > 0) {
          if (dryRun) {
            SWSELogger.log(`[Phase 5 DRY-RUN] Would update ${packName}/${doc.name}: ${JSON.stringify(updates)}`);
          } else {
            await doc.update(updates);
            SWSELogger.debug(`[Phase 5] Updated ${packName}/${doc.name}`);
          }
          migratedCount++;
          stats.packStats[packName].migrated++;
        } else {
          unchangedCount++;
          stats.packStats[packName].unchanged++;
        }

      } catch (err) {
        errorCount++;
        stats.packStats[packName].errors++;
        SWSELogger.error(`[Phase 5] Error processing ${packName}/${doc.name}:`, err.message);
      }
    }

    SWSELogger.log(`[Phase 5] Pack "${packName}": ${migratedCount} updated, ${unchangedCount} unchanged, ${errorCount} errors out of ${docs.length}`);
  }

  // =========================================
  // Final Report
  // =========================================
  SWSELogger.log('[Phase 5] Migration Summary:', JSON.stringify(stats.packStats, null, 2));

  if (stats.unmappedExtraSkillUses.length > 0) {
    SWSELogger.warn(`[Phase 5] ${stats.unmappedExtraSkillUses.length} extra skill use items still need manual skill mapping:`, stats.unmappedExtraSkillUses);
  } else {
    SWSELogger.log('[Phase 5] ✓ All extra skill uses have valid system.skill');
  }

  SWSELogger.log(`[Phase 5] Compendium migration complete (dryRun=${dryRun})`);
  return stats;
}
