/**
 * Feat selection and loading for SWSE Level Up system
 * Handles bonus feats from classes and multiclass bonuses
 */

import { SWSELogger } from '../../utils/logger.js';
import { warnGM } from '../../utils/warn-gm.js';
import { getClassLevel } from './levelup-shared.js';
import { filterQualifiedFeats } from './levelup-validation.js';
import { getClassProperty } from '../chargen/chargen-property-accessor.js';
import { SuggestionEngine } from '../../engine/SuggestionEngine.js';

// Cache for feat metadata
let _featMetadataCache = null;

/**
 * Load feat metadata from JSON file
 * @returns {Promise<Object>} Feat metadata object
 */
async function loadFeatMetadata() {
  if (_featMetadataCache) {
    return _featMetadataCache;
  }

  try {
    const response = await fetch('systems/foundryvtt-swse/data/feat-metadata.json');
    if (!response.ok) {
      throw new Error(`Failed to load feat metadata: ${response.status} ${response.statusText}`);
    }
    _featMetadataCache = await response.json();
    SWSELogger.log('SWSE LevelUp | Loaded feat metadata from JSON');
    return _featMetadataCache;
  } catch (err) {
    SWSELogger.error('SWSE LevelUp | Failed to load feat metadata:', err);
    _featMetadataCache = { categories: {}, feats: {} };
    return _featMetadataCache;
  }
}

/**
 * Organize feats into categories with metadata
 * @param {Array} feats - Array of feat objects
 * @param {Object} metadata - Feat metadata
 * @param {Array} selectedFeats - Currently selected feats
 * @param {Actor} actor - The actor (optional, for checking owned feats)
 * @returns {Array} Array of category objects with feats
 */
function organizeFeatsIntoCategories(feats, metadata, selectedFeats = [], actor = null) {
  const categories = {};

  // Initialize categories
  Object.entries(metadata.categories).forEach(([categoryId, categoryData]) => {
    categories[categoryId] = {
      id: categoryId,
      name: categoryData.name,
      description: categoryData.description,
      icon: categoryData.icon,
      order: categoryData.order,
      feats: [],
      count: 0
    };
  });

  // Check if actor owns this feat
  const ownedFeats = actor ? actor.items.filter(i => i.type === 'feat').map(f => f.name) : [];

  // List of feats that can be taken multiple times
  const repeatableFeats = [
    'Extra Second Wind',
    'Extra Rage',
    'Skill Training',
    'Linguist',
    'Exotic Weapon Proficiency',
    'Weapon Proficiency (Advanced Melee Weapons)',
    'Weapon Proficiency (Heavy Weapons)',
    'Weapon Proficiency (Pistols)',
    'Weapon Proficiency (Rifles)',
    'Weapon Proficiency (Simple Weapons)',
    'Weapon Focus',
    'Double Attack',
    'Triple Attack',
    'Triple Crit',
    'Force Training',
    'Force Regimen Mastery'
  ];

  // Assign feats to categories with enhanced metadata
  feats.forEach(feat => {
    const featMeta = metadata.feats[feat.name];
    const isOwned = ownedFeats.includes(feat.name);
    const isRepeatable = repeatableFeats.some(rf => feat.name.includes(rf) || rf.includes(feat.name));

    if (!featMeta) {
      // Feat not in metadata - add to misc category
      const enhancedFeat = {
        ...feat,
        tags: [],
        tagsString: '',
        chain: null,
        isSelected: selectedFeats.some(sf => sf._id === feat._id || sf.name === feat.name),
        isUnavailable: !feat.isQualified,
        isOwned: isOwned,
        isRepeatable: isRepeatable,
        // Suggestion engine metadata
        suggestion: feat.suggestion || null,
        isSuggested: feat.isSuggested || false
      };
      categories['misc'].feats.push(enhancedFeat);
      categories['misc'].count++;
      return;
    }

    const enhancedFeat = {
      ...feat,
      tags: featMeta.tags || [],
      tagsString: (featMeta.tags || []).join(','),
      chain: featMeta.chain || null,
      chainOrder: featMeta.chainOrder || 0,
      prerequisiteFeat: featMeta.prerequisiteFeat || null,
      isSelected: selectedFeats.some(sf => sf._id === feat._id || sf.name === feat.name),
      isUnavailable: !feat.isQualified,
      isOwned: isOwned,
      isRepeatable: isRepeatable,
      // Suggestion engine metadata
      suggestion: feat.suggestion || null,
      isSuggested: feat.isSuggested || false
    };

    const categoryId = featMeta.category || 'misc';
    if (categories[categoryId]) {
      categories[categoryId].feats.push(enhancedFeat);
      categories[categoryId].count++;
    } else {
      SWSELogger.warn(`SWSE LevelUp | Unknown category "${categoryId}" for feat "${feat.name}"`);
      categories['misc'].feats.push(enhancedFeat);
      categories['misc'].count++;
    }
  });

  // Sort categories by order, then sort feats within each category
  const sortedCategories = Object.values(categories)
    .sort((a, b) => a.order - b.order)
    .filter(cat => cat.count > 0); // Only include categories with feats

  // Sort feats within each category and organize chains hierarchically
  sortedCategories.forEach(category => {
    // Sort by: suggestion tier (higher first), then chain grouping, then alphabetically
    category.feats.sort((a, b) => {
      // First, sort by suggestion tier (higher is better)
      const tierA = a.suggestion?.tier ?? -1;
      const tierB = b.suggestion?.tier ?? -1;
      if (tierB !== tierA) {
        return tierB - tierA;
      }

      // Then, sort by chain (feats in same chain together)
      if (a.chain && b.chain) {
        if (a.chain === b.chain) {
          return (a.chainOrder || 0) - (b.chainOrder || 0);
        }
        return a.chain.localeCompare(b.chain);
      }
      if (a.chain) return -1;
      if (b.chain) return 1;
      // Then alphabetically
      return a.name.localeCompare(b.name);
    });

    // Add hierarchical indent level based on prerequisite chain
    category.feats.forEach(feat => {
      if (!feat.chain) {
        feat.indentLevel = 0;
        return;
      }

      // Calculate indent level by counting prerequisite depth
      let indentLevel = 0;
      let currentPrereq = feat.prerequisiteFeat;

      // Walk up the prerequisite chain to determine depth
      while (currentPrereq) {
        indentLevel++;
        const prereqFeat = category.feats.find(f => f.name === currentPrereq);
        currentPrereq = prereqFeat?.prerequisiteFeat;

        // Safety check to prevent infinite loops
        if (indentLevel > 10) break;
      }

      feat.indentLevel = indentLevel;
    });
  });

  return sortedCategories;
}

/**
 * Load feats from compendium and organize by categories
 * @param {Actor} actor - The actor
 * @param {Object} selectedClass - The selected class
 * @param {Object} pendingData - Pending selections
 * @returns {Promise<Object>} Object with categories array and flat feats array
 */
export async function loadFeats(actor, selectedClass, pendingData) {
  try {
    const featPack = game.packs.get('foundryvtt-swse.feats');
    if (!featPack) {
      SWSELogger.error("SWSE LevelUp | Feats compendium pack not found!");
      ui.notifications.error("Failed to load feats compendium. Feats will not be available.");
      return { categories: [], feats: [] };
    }

    const allFeats = await featPack.getDocuments();
    let featObjects = allFeats.map(f => f.toObject());

    // Filter by class bonus feats if a class is selected and this is a class bonus feat level
    if (selectedClass && selectedClass.name) {
      const className = selectedClass.name;
      const classLevel = getClassLevel(actor, className) + 1;

      // Check if this level grants a bonus feat specific to this class
      const levelProgression = getClassProperty(selectedClass, 'levelProgression', []);
      if (levelProgression && Array.isArray(levelProgression)) {
        const levelData = levelProgression.find(lp => lp.level === classLevel);
        if (levelData && levelData.features) {
          // Find the feat_choice feature (Option C: check for type === "feat_choice")
          const featFeature = levelData.features.find(f => f.type === 'feat_choice');
          if (featFeature) {
            SWSELogger.log(`SWSE LevelUp | Bonus feat level detected for ${className}`);

            // Filter feats based on RAW rule (Option C)
            featObjects = featObjects.filter(f => {
              const allowed = f.system?.bonus_feat_for || [];
              return allowed.includes(className) || allowed.includes("all");
            });

            SWSELogger.log(
              `SWSE LevelUp | ${featObjects.length} eligible bonus feats for ${className}`
            );

            // GM Warning if none found
            if (featObjects.length === 0) {
              warnGM(
                `${className} grants a Bonus Feat at this level, but no feats exist tagged with "bonus_feat_for": ["${className}"].`
              );
            }
          }
        }
      }
    }

    // Filter feats based on prerequisites
    const filteredFeats = filterQualifiedFeats(featObjects, actor, pendingData);

    // Load feat metadata and organize into categories
    const metadata = await loadFeatMetadata();
    const selectedFeats = pendingData?.selectedFeats || [];

    // Apply suggestion engine to add tier-based recommendations
    const featsWithSuggestions = await SuggestionEngine.suggestFeats(
      filteredFeats,
      actor,
      pendingData,
      { featMetadata: metadata.feats || {} }
    );

    const categories = organizeFeatsIntoCategories(featsWithSuggestions, metadata, selectedFeats, actor);

    // Log suggestion statistics
    const suggestionCounts = SuggestionEngine.countByTier(featsWithSuggestions);
    SWSELogger.log(`SWSE LevelUp | Loaded ${filteredFeats.length} feats in ${categories.length} categories, ${filteredFeats.filter(f => f.isQualified).length} qualified`);
    SWSELogger.log(`SWSE LevelUp | Suggestions: Chain=${suggestionCounts[4]}, Skill=${suggestionCounts[3]}, Ability=${suggestionCounts[2]}, Class=${suggestionCounts[1]}`);

    return {
      categories,
      feats: featsWithSuggestions  // Flat array with suggestion metadata
    };
  } catch (err) {
    SWSELogger.error("SWSE LevelUp | Failed to load feats:", err);
    ui.notifications.error("Failed to load feats. Check the console for details.");
    return { categories: [], feats: [] };
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
  const levelProgression = getClassProperty(selectedClass, 'levelProgression', []);
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
  const featPack = game.packs.get('foundryvtt-swse.feats');
  const feat = await featPack.getDocument(featId);
  return feat || null;
}
