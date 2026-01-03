/**
 * BuildCoherenceAnalyzer
 *
 * Measures internal consistency of a character build.
 * Detects MAD (multiple attribute dependency), SAD (single attribute dominance),
 * weapon spread, and talent clustering issues.
 *
 * Phase 1C: Full implementation with 4 consistency signals.
 * Does NOT optimize or simulate — only measures fit to existing pattern.
 */

import { SWSELogger } from '../utils/logger.js';

// Weights for the 4 consistency signals
const COHERENCE_WEIGHTS = {
  attributeCoherence: 0.30,
  talentClustering: 0.25,
  combatStyle: 0.25,
  classProgression: 0.20
};

export class BuildCoherenceAnalyzer {

  /**
   * Analyze how coherent a suggestion is within the actor's existing build
   * @param {Object} item - { id, name, type, system }
   * @param {Actor} actor
   * @returns {Object} { score: 0-1, breakdown: { ... } }
   */
  static analyzeSuggestionCoherence(item, actor) {
    try {
      // Skip powers in Phase 1
      if (item.type === 'power') {
        return { score: 0.5, breakdown: {} };
      }

      // Skip if not feat/talent
      if (item.type !== 'feat' && item.type !== 'talent') {
        return { score: 0.5, breakdown: {} };
      }

      // Calculate all 4 signals
      const attributeScore = this._evaluateAttributeCoherence(item, actor);
      const talentScore = this._evaluateTalentClustering(item, actor);
      const combatScore = this._evaluateCombatStyle(item, actor);
      const classScore = this._evaluateClassProgression(item, actor);

      // Weighted combination
      const score =
        (attributeScore * COHERENCE_WEIGHTS.attributeCoherence) +
        (talentScore * COHERENCE_WEIGHTS.talentClustering) +
        (combatScore * COHERENCE_WEIGHTS.combatStyle) +
        (classScore * COHERENCE_WEIGHTS.classProgression);

      // No neutral threshold clamp — return raw score
      const finalScore = Math.min(1, Math.max(0, score));

      return {
        score: finalScore,
        breakdown: {
          attributeCoherence: attributeScore,
          talentClustering: talentScore,
          combatStyle: combatScore,
          classProgression: classScore
        }
      };
    } catch (err) {
      SWSELogger.error('[BuildCoherenceAnalyzer] Error analyzing suggestion coherence:', err);
      return { score: 0.5, breakdown: {} };
    }
  }

  /**
   * Evaluate attribute coherence
   * Measures if suggestion matches actor's ability distribution
   * @private
   * @param {Object} item
   * @param {Actor} actor
   * @returns {number} 0-1 attribute coherence score
   */
  static _evaluateAttributeCoherence(item, actor) {
    try {
      // Get actor's ability distribution
      const abilities = actor.system?.abilities || {};
      const abilityScores = [];

      for (const [key, abilityData] of Object.entries(abilities)) {
        const score = abilityData?.total || abilityData?.value || 10;
        abilityScores.push({
          ability: key.toLowerCase(),
          score: score
        });
      }

      if (abilityScores.length === 0) {
        return 0.5;
      }

      // Sort and identify top 2 abilities
      abilityScores.sort((a, b) => b.score - a.score);
      const top2Abilities = abilityScores.slice(0, 2).map(a => a.ability);
      const top2Scores = abilityScores.slice(0, 2).map(a => a.score);

      // Determine actor's attribute concentration
      const avgTop2 = (top2Scores[0] + (top2Scores[1] || 10)) / 2;
      const hasHighConcentration = top2Scores[0] >= 14;
      const hasMediumConcentration = top2Scores[0] >= 12 && top2Scores[0] < 14;

      // Get item's attribute requirements (if any)
      const itemRequiredAttrs = item.system?.requirements?.attributes || [];

      // No attribute requirements = neutral
      if (!itemRequiredAttrs || itemRequiredAttrs.length === 0) {
        return 0.5;
      }

      // Check how many item requirements match top 2 abilities
      let topMatches = 0;
      for (const attr of itemRequiredAttrs) {
        if (top2Abilities.includes(attr.toLowerCase())) {
          topMatches++;
        }
      }

      // Score based on concentration + match
      if (hasHighConcentration && topMatches > 0) {
        return 0.9; // High concentration + suggestion matches
      } else if (hasMediumConcentration && topMatches > 0) {
        return 0.7; // Medium concentration + partial match
      } else if (topMatches === itemRequiredAttrs.length) {
        return 0.8; // All requirements match (regardless of concentration)
      } else if (topMatches > 0) {
        return 0.65; // Some match
      } else {
        // Spread distribution or no match = neutral (not penalized)
        return 0.5;
      }
    } catch (err) {
      SWSELogger.warn('[BuildCoherenceAnalyzer] Error evaluating attribute coherence:', err);
      return 0.5;
    }
  }

  /**
   * Evaluate talent tree clustering
   * Measures if suggestion reinforces or fragments talent tree focus
   * @private
   * @param {Object} item
   * @param {Actor} actor
   * @returns {number} 0-1 talent clustering score
   */
  static _evaluateTalentClustering(item, actor) {
    try {
      // Get actor's talent trees
      const ownedTalents = actor.items
        .filter(i => i.type === 'talent')
        .map(t => t.system?.tree?.toLowerCase() || t.name.toLowerCase());

      const uniqueTalentTrees = new Set(ownedTalents);

      // No talents = neutral
      if (uniqueTalentTrees.size === 0) {
        return 0.5;
      }

      // Check if item is a talent and belongs to an existing tree
      if (item.type === 'talent') {
        const itemTalentTree = item.system?.tree?.toLowerCase();

        if (itemTalentTree && uniqueTalentTrees.has(itemTalentTree)) {
          // Reinforces existing tree = high score
          return 0.85;
        } else if (itemTalentTree && uniqueTalentTrees.size < 3) {
          // Opens new tree (first or second new tree) = acceptable
          return 0.6;
        } else if (itemTalentTree && uniqueTalentTrees.size >= 3) {
          // Opening 4th+ talent tree = fragmenting
          return 0.4;
        }
      }

      // For feats, check if they align with existing talent themes
      // Feats that work with existing talent trees
      const itemNameLower = item.name.toLowerCase();
      const talentTreesArray = Array.from(uniqueTalentTrees);

      // Check for obvious alignments
      const alignments = {
        'lightsaber combat': ['force', 'lightsaber', 'jedi'],
        'armor specialist': ['armor', 'defense'],
        'weapon specialist': ['weapon', 'melee', 'focused'],
        'gunslinger': ['ranged', 'shot', 'pistol'],
        'sniper': ['ranged', 'shot', 'precise'],
        'brawler': ['martial', 'melee', 'unarmed'],
        'camouflage': ['stealth', 'hide'],
        'spy': ['stealth', 'deception'],
        'commando': ['combat', 'attack']
      };

      for (const talentTree of talentTreesArray) {
        const keywords = alignments[talentTree] || [];
        for (const keyword of keywords) {
          if (itemNameLower.includes(keyword)) {
            // Feat aligns with existing talent tree
            return 0.8;
          }
        }
      }

      // Feat with no obvious alignment to existing talents = neutral
      return 0.5;
    } catch (err) {
      SWSELogger.warn('[BuildCoherenceAnalyzer] Error evaluating talent clustering:', err);
      return 0.5;
    }
  }

  /**
   * Evaluate combat style consistency
   * Measures if suggestion reinforces or conflicts with weapon/combat focus
   * @private
   * @param {Object} item
   * @param {Actor} actor
   * @returns {number} 0-1 combat style score
   */
  static _evaluateCombatStyle(item, actor) {
    try {
      // Count existing combat styles
      const ownedFeats = actor.items
        .filter(i => i.type === 'feat')
        .map(f => f.name.toLowerCase());

      // Categorize existing feats
      const rangedFeats = ownedFeats.filter(f =>
        ['shot', 'pistol', 'rifle', 'ranged', 'sniper', 'gunslinger'].some(k => f.includes(k))
      );
      const meleeFeats = ownedFeats.filter(f =>
        ['melee', 'martial', 'strike', 'flurry', 'lightsaber'].some(k => f.includes(k))
      );
      const forceFeats = ownedFeats.filter(f =>
        ['force', 'jedi', 'lightsaber'].some(k => f.includes(k))
      );

      // Determine primary combat style
      const primaryStyle =
        rangedFeats.length >= meleeFeats.length && rangedFeats.length >= forceFeats.length ? 'ranged' :
        meleeFeats.length >= forceFeats.length ? 'melee' :
        'force';

      const styleCount = [rangedFeats.length, meleeFeats.length, forceFeats.length].filter(c => c > 0).length;

      // Evaluate item against current style
      const itemNameLower = item.name.toLowerCase();

      // Check if item reinforces primary style
      const isRanged = ['shot', 'pistol', 'rifle', 'ranged', 'sniper'].some(k => itemNameLower.includes(k));
      const isMelee = ['melee', 'martial', 'strike', 'flurry'].some(k => itemNameLower.includes(k));
      const isForce = ['force', 'jedi', 'lightsaber'].some(k => itemNameLower.includes(k));

      // Reinforces primary style
      if ((primaryStyle === 'ranged' && isRanged) ||
          (primaryStyle === 'melee' && isMelee) ||
          (primaryStyle === 'force' && isForce)) {
        return 0.8; // Reinforces existing style
      }

      // Complements (adds utility without adding a new primary style)
      if (styleCount < 2 && ((isRanged && !rangedFeats.length) || (isMelee && !meleeFeats.length))) {
        return 0.7; // Complements, opens one new style
      }

      // Is defensive or utility (doesn't add combat style)
      const isDefensive = itemNameLower.match(/defense|armor|threshold|toughness/);
      if (isDefensive) {
        return 0.7; // Utility doesn't fragment
      }

      // Introduces third distinct combat style
      if (styleCount >= 3 &&
          ((isRanged && !rangedFeats.length) ||
           (isMelee && !meleeFeats.length) ||
           (isForce && !forceFeats.length))) {
        return 0.4; // Adding a third distinct style fragments
      }

      // No clear combat category or neutral
      return 0.5;
    } catch (err) {
      SWSELogger.warn('[BuildCoherenceAnalyzer] Error evaluating combat style:', err);
      return 0.5;
    }
  }

  /**
   * Evaluate class progression coherence
   * Measures if suggestion fits actor's class path
   * @private
   * @param {Object} item
   * @param {Actor} actor
   * @returns {number} 0-1 class progression score
   */
  static _evaluateClassProgression(item, actor) {
    try {
      // Get actor's classes
      const ownedClasses = actor.items
        .filter(i => i.type === 'class')
        .map(c => c.name);

      if (ownedClasses.length === 0) {
        return 0.5;
      }

      // Map items to class themes heuristically
      const itemNameLower = item.name.toLowerCase();

      // Simple theme keywords for each class
      const classThemes = {
        'Jedi': ['force', 'lightsaber', 'jedi'],
        'Soldier': ['armor', 'weapon', 'combat', 'endurance'],
        'Scout': ['stealth', 'perception', 'survival'],
        'Noble': ['persuasion', 'deception', 'social'],
        'Scoundrel': ['stealth', 'deception', 'ranged'],
        'Force Adept': ['force', 'alter', 'control'],
        'Ace Pilot': ['pilot', 'vehicle', 'dex'],
        'Assassin': ['stealth', 'ranged', 'sniper'],
        'Bounty Hunter': ['survival', 'perception', 'tracking'],
        'Crime Lord': ['deception', 'persuasion'],
        'Elite Trooper': ['armor', 'combat', 'weapon'],
        'Force Disciple': ['force', 'dark side'],
        'Gladiator': ['melee', 'weapon', 'damage'],
        'Gunslinger': ['ranged', 'pistol', 'quick'],
        'Imperial Knight': ['force', 'lightsaber', 'armor'],
        'Infiltrator': ['stealth', 'perception'],
        'Jedi Knight': ['force', 'lightsaber'],
        'Jedi Master': ['force', 'lightsaber'],
        'Martial Arts Master': ['martial', 'melee', 'unarmed'],
        'Medic': ['treat', 'knowledge', 'support'],
        'Melee Duelist': ['melee', 'duelist', 'defense'],
        'Military Engineer': ['mechanics', 'computer'],
        'Officer': ['leadership', 'knowledge'],
        'Pathfinder': ['perception', 'survival'],
        'Saboteur': ['deception', 'mechanics'],
        'Sith Apprentice': ['force', 'dark', 'lightsaber'],
        'Sith Lord': ['force', 'dark', 'lightsaber'],
        'Vanguard': ['stealth', 'commando']
      };

      let bestClassMatch = 0;

      for (const className of ownedClasses) {
        const themes = classThemes[className] || [];

        // Count how many class themes match the item
        const matches = themes.filter(theme => itemNameLower.includes(theme)).length;

        if (matches > 0) {
          // Found a match with this class
          const matchScore = Math.min(1, matches / Math.max(2, themes.length));
          bestClassMatch = Math.max(bestClassMatch, matchScore);
        }
      }

      // Score based on best match
      if (bestClassMatch >= 0.7) {
        return 0.8; // Aligns with base class theme
      } else if (bestClassMatch > 0) {
        return 0.6; // Partial alignment
      } else {
        return 0.5; // Neutral/agnostic
      }
    } catch (err) {
      SWSELogger.warn('[BuildCoherenceAnalyzer] Error evaluating class progression:', err);
      return 0.5;
    }
  }

  /**
   * Score the overall coherence of a character build (no item context)
   * @param {Actor} actor
   * @returns {number} 0-1 coherence score
   */
  static scoreCoherence(actor) {
    try {
      // Analyze overall build without a specific item
      const abilities = actor.system?.abilities || {};
      const abilityScores = [];

      for (const [key, abilityData] of Object.entries(abilities)) {
        const score = abilityData?.total || abilityData?.value || 10;
        abilityScores.push({
          ability: key.toLowerCase(),
          score: score
        });
      }

      abilityScores.sort((a, b) => b.score - a.score);
      const spread = abilityScores.reduce((sum, a) => sum + a.score, 0) / abilityScores.length;
      const topAbility = abilityScores[0]?.score || 10;
      const concentration = topAbility / spread;

      // High concentration = coherent
      if (concentration > 1.3) {
        return 0.8;
      } else if (concentration > 1.1) {
        return 0.65;
      } else {
        return 0.5;
      }
    } catch (err) {
      SWSELogger.warn('[BuildCoherenceAnalyzer] Error scoring coherence:', err);
      return 0.5;
    }
  }

  /**
   * Check for multiple attribute dependency (MAD)
   * @param {Actor} actor
   * @returns {Object} { isMAD: boolean, attributes: [abbrev], count: number }
   */
  static checkMAD(actor) {
    try {
      const feats = actor.items.filter(i => i.type === 'feat').map(f => f.name.toLowerCase());
      const talents = actor.items.filter(i => i.type === 'talent').map(t => t.name.toLowerCase());

      // Count attributes referenced in feats/talents (simple heuristic)
      const attrKeywords = {
        str: ['strength', 'martial', 'melee', 'flurry'],
        dex: ['dexterity', 'ranged', 'shot', 'precise', 'dodge'],
        con: ['constitution', 'tough', 'endurance'],
        int: ['intelligence', 'computer', 'mechanics', 'knowledge'],
        wis: ['wisdom', 'perception', 'survival', 'force'],
        cha: ['charisma', 'persuasion', 'deception', 'leadership']
      };

      const usedAttrs = new Set();
      const allItems = [...feats, ...talents];

      for (const [attr, keywords] of Object.entries(attrKeywords)) {
        for (const keyword of keywords) {
          if (allItems.some(item => item.includes(keyword))) {
            usedAttrs.add(attr);
            break;
          }
        }
      }

      return {
        isMAD: usedAttrs.size >= 3,
        attributes: Array.from(usedAttrs),
        count: usedAttrs.size
      };
    } catch (err) {
      SWSELogger.warn('[BuildCoherenceAnalyzer] Error checking MAD:', err);
      return { isMAD: false, attributes: [], count: 0 };
    }
  }

  /**
   * Check for single attribute dominance (SAD)
   * @param {Actor} actor
   * @returns {Object} { dominantAttribute: string|null, concentration: 0-1 }
   */
  static checkSAD(actor) {
    try {
      const abilities = actor.system?.abilities || {};
      const abilityScores = [];

      for (const [key, abilityData] of Object.entries(abilities)) {
        const score = abilityData?.total || abilityData?.value || 10;
        abilityScores.push({
          ability: key,
          score: score
        });
      }

      if (abilityScores.length === 0) {
        return { dominantAttribute: null, concentration: 0.5 };
      }

      abilityScores.sort((a, b) => b.score - a.score);
      const topScore = abilityScores[0].score;
      const avgOthers = abilityScores.slice(1).reduce((sum, a) => sum + a.score, 0) / (abilityScores.length - 1);
      const concentration = topScore / (avgOthers || 10);

      return {
        dominantAttribute: abilityScores[0].ability,
        concentration: Math.min(1, concentration / 1.5) // Normalize
      };
    } catch (err) {
      SWSELogger.warn('[BuildCoherenceAnalyzer] Error checking SAD:', err);
      return { dominantAttribute: null, concentration: 0.5 };
    }
  }

  /**
   * Analyze weapon/tool focus
   * @param {Actor} actor
   * @returns {Object} { primaryFocus: string|null, spreadScore: 0-1 }
   */
  static analyzeWeaponFocus(actor) {
    try {
      const feats = actor.items.filter(i => i.type === 'feat').map(f => f.name.toLowerCase());

      const rangedCount = feats.filter(f => ['shot', 'pistol', 'rifle', 'ranged'].some(k => f.includes(k))).length;
      const meleeCount = feats.filter(f => ['melee', 'martial', 'strike', 'flurry'].some(k => f.includes(k))).length;
      const forceCount = feats.filter(f => ['force', 'jedi', 'lightsaber'].some(k => f.includes(k))).length;

      const styles = [
        { name: 'ranged', count: rangedCount },
        { name: 'melee', count: meleeCount },
        { name: 'force', count: forceCount }
      ];

      const primaryFocus = styles.reduce((max, s) => s.count > max.count ? s : max).name;
      const totalCount = rangedCount + meleeCount + forceCount;
      const spread = totalCount > 0 ? 1 - (Math.max(rangedCount, meleeCount, forceCount) / totalCount) : 0.5;

      return {
        primaryFocus: totalCount > 0 ? primaryFocus : null,
        spreadScore: spread
      };
    } catch (err) {
      SWSELogger.warn('[BuildCoherenceAnalyzer] Error analyzing weapon focus:', err);
      return { primaryFocus: null, spreadScore: 0.5 };
    }
  }

  /**
   * Analyze talent tree clustering
   * @param {Actor} actor
   * @returns {Object} { clusteredTrees: [names], fragmentationScore: 0-1 }
   */
  static analyzeTalentClustering(actor) {
    try {
      const talents = actor.items.filter(i => i.type === 'talent');
      const talentTreeMap = {};

      for (const talent of talents) {
        const tree = talent.system?.tree || talent.name;
        talentTreeMap[tree] = (talentTreeMap[tree] || 0) + 1;
      }

      const trees = Object.entries(talentTreeMap).sort((a, b) => b[1] - a[1]);
      const clusteredTrees = trees.slice(0, 2).map(t => t[0]); // Top 2 trees

      // Fragmentation: how spread out are talents?
      const totalTalents = talents.length;
      const fragmentation = totalTalents > 0
        ? 1 - (trees[0]?.[1] || 0) / totalTalents
        : 0.5;

      return {
        clusteredTrees,
        fragmentationScore: Math.min(1, fragmentation)
      };
    } catch (err) {
      SWSELogger.warn('[BuildCoherenceAnalyzer] Error analyzing talent clustering:', err);
      return { clusteredTrees: [], fragmentationScore: 0.5 };
    }
  }
}

export default BuildCoherenceAnalyzer;
