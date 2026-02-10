/**
 * SWSE Force Suggestion Utilities
 *
 * Shared helper functions for Force power, technique, and secret suggestion systems.
 * Provides normalization, category inference, and data transformation utilities.
 */

/**
 * Normalize a string for matching
 * Removes non-alphanumeric characters and converts to lowercase
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
export function normalize(str = '') {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Extract Force categories from descriptor tags
 * Maps semantic descriptors to canonical Force categories
 * @param {Array<string>} descriptors - List of descriptor strings
 * @returns {Array<string>} Canonical Force category names
 */
export function extractCategoriesFromDescriptors(descriptors = []) {
  const cats = new Set();
  const d = descriptors.map(x => x.toLowerCase());

  // Vitality: healing, restoration, endurance
  if (d.some(x => ['vital', 'healing', 'restore', 'endurance'].some(k => x.includes(k)))) {
    cats.add('vitality');
  }

  // Awareness: sense, vision, foresight, detection
  if (d.some(x => ['sense', 'vision', 'aware', 'foresight', 'detect'].some(k => x.includes(k)))) {
    cats.add('awareness');
  }

  // Control: telekinetic, move, manipulation, position
  if (d.some(x => ['telekinetic', 'move', 'manipul', 'position', 'control'].some(k => x.includes(k)))) {
    cats.add('control');
  }

  // Aggression: dark, fear, lightning, domination, attack
  if (d.some(x => ['dark', 'fear', 'lightning', 'domina', 'attack', 'aggress'].some(k => x.includes(k)))) {
    cats.add('aggression');
  }

  // Precision: strike, focus, accuracy, enhancement, martial
  if (d.some(x => ['strike', 'focus', 'accuracy', 'enhanc', 'martial', 'precise'].some(k => x.includes(k)))) {
    cats.add('precision');
  }

  // Defense: protect, deflect, shield, barrier, resistance
  if (d.some(x => ['protect', 'deflect', 'shield', 'barrier', 'resist', 'defense'].some(k => x.includes(k)))) {
    cats.add('defense');
  }

  // Support: team, buff, morale, cooperation, ally
  if (d.some(x => ['team', 'buff', 'morale', 'cooper', 'ally', 'support', 'inspir'].some(k => x.includes(k)))) {
    cats.add('support');
  }

  // Mobility: speed, movement, teleport, position, flee
  if (d.some(x => ['speed', 'movement', 'teleport', 'mobility', 'flee'].some(k => x.includes(k)))) {
    cats.add('mobility');
  }

  // Risk: dangerous, perilous, sacrifice, cost, drawback
  if (d.some(x => ['dangerous', 'perilous', 'sacrifice', 'cost', 'drawback', 'risk'].some(k => x.includes(k)))) {
    cats.add('risk');
  }

  return [...cats];
}

/**
 * Calculate string similarity score (0-1)
 * Uses simple character overlap for fuzzy matching
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score
 */
export function calculateStringSimilarity(str1 = '', str2 = '') {
  const n1 = normalize(str1);
  const n2 = normalize(str2);

  if (!n1 || !n2) {return 0;}

  // Exact match
  if (n1 === n2) {return 1.0;}

  // Substring match
  if (n1.includes(n2) || n2.includes(n1)) {
    return Math.max(n1.length, n2.length) / (n1.length + n2.length);
  }

  // Character overlap
  const chars1 = new Set(n1);
  const chars2 = new Set(n2);
  const intersection = new Set([...chars1].filter(c => chars2.has(c)));
  const union = new Set([...chars1, ...chars2]);

  return intersection.size / union.size;
}

/**
 * Find best matching power for a technique
 * Uses name similarity, category match, and descriptor overlap
 * @param {Object} technique - Force technique item
 * @param {Array<Object>} powers - Available Force powers
 * @returns {Object|null} Best matching power or null
 */
export function findBestPowerMatch(technique, powers = []) {
  let bestMatch = null;
  let bestScore = 0;

  for (const power of powers) {
    let score = 0;

    // 1. Name similarity (strongest signal)
    const nameSimilarity = calculateStringSimilarity(technique.name, power.name);
    score += nameSimilarity * 0.6;

    // 2. Discipline/category match (medium signal)
    const techDiscipline = technique.system?.discipline || '';
    const powerDiscipline = power.system?.discipline || '';
    if (techDiscipline && techDiscipline === powerDiscipline) {
      score += 0.25;
    }

    // 3. Descriptor overlap (weak but useful signal)
    const techDesc = technique.system?.descriptor ?? [];
    const powerDesc = power.system?.descriptor ?? [];
    const overlap = techDesc.filter(d => powerDesc.includes(d)).length;
    if (overlap > 0) {
      score += Math.min(0.15, overlap * 0.05);
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = { power, score: Number(bestScore.toFixed(2)) };
    }
  }

  // Only return if score exceeds confidence threshold
  return bestScore >= 0.5 ? bestMatch : null;
}

/**
 * Find all matching powers for a technique within confidence threshold
 * @param {Object} technique - Force technique item
 * @param {Array<Object>} powers - Available Force powers
 * @param {number} threshold - Minimum confidence score (0-1)
 * @returns {Array<Object>} Matching powers with scores
 */
export function findMatchingPowers(technique, powers = [], threshold = 0.5) {
  const matches = [];

  for (const power of powers) {
    let score = 0;

    // Name similarity
    const nameSimilarity = calculateStringSimilarity(technique.name, power.name);
    score += nameSimilarity * 0.6;

    // Discipline match
    if (technique.system?.discipline === power.system?.discipline) {
      score += 0.25;
    }

    // Descriptor overlap
    const techDesc = technique.system?.descriptor ?? [];
    const powerDesc = power.system?.descriptor ?? [];
    const overlap = techDesc.filter(d => powerDesc.includes(d)).length;
    if (overlap > 0) {
      score += Math.min(0.15, overlap * 0.05);
    }

    score = Number(score.toFixed(2));

    if (score >= threshold) {
      matches.push({ power, score });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  return matches;
}

export default {
  normalize,
  extractCategoriesFromDescriptors,
  calculateStringSimilarity,
  findBestPowerMatch,
  findMatchingPowers
};
