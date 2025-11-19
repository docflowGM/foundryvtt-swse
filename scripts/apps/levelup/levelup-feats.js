/**
 * Feat selection and loading for SWSE Level Up system
 * Handles bonus feats from classes and multiclass bonuses
 */

import { SWSELogger } from '../../utils/logger.js';
import { getClassLevel } from './levelup-shared.js';
import { filterQualifiedFeats } from './levelup-validation.js';

/**
 * Load feats from compendium and filter by prerequisites
 * @param {Actor} actor - The actor
 * @param {Object} selectedClass - The selected class
 * @param {Object} pendingData - Pending selections
 * @returns {Promise<Array>} Array of feat objects with isQualified flag
 */
export async function loadFeats(actor, selectedClass, pendingData) {
  try {
    const featPack = game.packs.get('swse.feats');
    if (!featPack) {
      return [];
    }

    const allFeats = await featPack.getDocuments();
    let featObjects = allFeats.map(f => f.toObject());

    // Filter by class bonus feats if a class is selected and this is a class bonus feat level
    if (selectedClass && selectedClass.name) {
      const className = selectedClass.name;
      const classLevel = getClassLevel(actor, className) + 1;

      // Check if this level grants a bonus feat specific to this class
      const levelProgression = selectedClass.system.level_progression;
      if (levelProgression && Array.isArray(levelProgression)) {
        const levelData = levelProgression.find(lp => lp.level === classLevel);
        if (levelData && levelData.features) {
          // Find the feat_choice feature to see if it specifies a feat list
          const featFeature = levelData.features.find(f => f.type === 'feat_choice');
          if (featFeature && featFeature.list) {
            // This class has a specific feat list (e.g., "jedi_feats", "noble_feats")
            SWSELogger.log(`SWSE LevelUp | Filtering feats by list: ${featFeature.list} for ${className}`);

            // Filter to only feats that have this class in their bonus_feat_for array
            featObjects = featObjects.filter(f => {
              const bonusFeatFor = f.system?.bonus_feat_for || [];
              return bonusFeatFor.includes(className) || bonusFeatFor.includes('all');
            });

            SWSELogger.log(`SWSE LevelUp | Filtered to ${featObjects.length} bonus feats for ${className}`);
          }
        }
      }
    }

    // Filter feats based on prerequisites
    const filteredFeats = filterQualifiedFeats(featObjects, actor, pendingData);

    SWSELogger.log(`SWSE LevelUp | Loaded ${filteredFeats.length} feats, ${filteredFeats.filter(f => f.isQualified).length} qualified`);

    return filteredFeats;
  } catch (err) {
    SWSELogger.error("SWSE LevelUp | Failed to load feats:", err);
    return [];
  }
}

/**
 * Check if the new level grants a bonus feat from the selected class
 * @param {Object} selectedClass - The selected class
 * @param {Actor} actor - The actor
 * @returns {boolean}
 */
export function getsBonusFeat(selectedClass, actor) {
  if (!selectedClass) return false;

  const classLevel = getClassLevel(actor, selectedClass.name) + 1;

  // Check level_progression for this class level
  const levelProgression = selectedClass.system.level_progression;
  if (!levelProgression || !Array.isArray(levelProgression)) return false;

  const levelData = levelProgression.find(lp => lp.level === classLevel);
  if (!levelData || !levelData.features) return false;

  // Check if this level grants a feat_choice feature
  return levelData.features.some(f => f.type === 'feat_choice');
}

/**
 * Select a bonus feat
 * @param {string} featId - The feat ID
 * @param {Array} featData - Array of available feats
 * @param {Array} selectedFeats - Currently selected feats
 * @returns {Object|null} The selected feat or null
 */
export function selectBonusFeat(featId, featData, selectedFeats) {
  const feat = featData.find(f => f._id === featId);
  if (feat && !selectedFeats.find(f => f._id === featId)) {
    return feat;
  }
  return null;
}

/**
 * Select a multiclass bonus feat
 * @param {string} featId - The feat ID
 * @returns {Promise<Object|null>} The selected feat or null
 */
export async function selectMulticlassFeat(featId) {
  const featPack = game.packs.get('swse.feats');
  const feat = await featPack.getDocument(featId);
  return feat || null;
}
