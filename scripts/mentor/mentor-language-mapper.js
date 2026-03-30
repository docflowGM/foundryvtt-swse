/**
 * Mentor Language Mapper
 *
 * Translates semantic bias tags to natural language descriptors.
 * Maps mechanical and role biases to mentor-friendly phrases.
 *
 * Input: Bias tags from archetype data
 * Output: Semantic descriptors for mentor voice filter
 * Note: Returns descriptors, not full sentences — mentor voice handles phrasing
 */

// Role bias tags -> semantic descriptors
const ROLE_BIAS_MAP = {
  striker: 'striker, focused on direct damage',
  skirmisher: 'mobile skirmisher, striking and repositioning',
  defender: 'protector and shield, mitigating harm',
  controller: 'battlefield controller, manipulating space and action',
  support: 'support specialist, empowering allies',
  flex: 'flexible generalist, adapting to needs',
  offense: 'offensive specialist, damage-focused',
  leader: 'leader, coordinating team action',
};

// Mechanical bias tags -> semantic descriptors
const MECHANICAL_BIAS_MAP = {
  accuracy: 'precision and accuracy',
  critRange: 'critical strike expansion',
  critDamage: 'critical strike amplification',
  reactionDefense: 'reactive defense',
  evasion: 'evasion and avoidance',
  damageReduction: 'damage mitigation',
  forceDC: 'Force power difficulty',
  areaControl: 'area control and forced movement',
  conditionTrack: 'condition and status effects',
  forceSecret: 'Force power potential',
  burstDamage: 'burst damage capability',
  skillUtility: 'skill utility and versatility',
  forceRecovery: 'Force recovery and sustainability',
};

// Attribute bias tags -> semantic descriptors
const ATTRIBUTE_BIAS_MAP = {
  str: 'physical strength',
  dex: 'agility and precision',
  con: 'endurance and resilience',
  int: 'intellect and knowledge',
  wis: 'awareness and perception',
  cha: 'presence and force affinity',
};

/**
 * Map bias tags to semantic descriptors.
 *
 * @param {Object} biases - Object with {tag: value, ...}
 * @param {string} biasType - 'role' | 'mechanical' | 'attribute'
 * @returns {Array} Array of {tag, descriptor, value}
 */
export function mapBiasesToDescriptors(biases = {}, biasType = 'role') {
  if (!biases || Object.keys(biases).length === 0) {
    return [];
  }

  const map = _getMapForType(biasType);
  const descriptors = [];

  for (const [tag, value] of Object.entries(biases)) {
    const descriptor = map[tag] || tag; // Fallback to tag if no mapping
    descriptors.push({
      tag,
      descriptor,
      value, // Keep numeric bias values for weighting
    });
  }

  return descriptors;
}

/**
 * Get a single bias descriptor.
 *
 * @param {string} tag - The bias tag
 * @param {string} biasType - 'role' | 'mechanical' | 'attribute'
 * @returns {string} Semantic descriptor or original tag
 */
export function getBiasDescriptor(tag, biasType = 'role') {
  const map = _getMapForType(biasType);
  return map[tag] || tag;
}

/**
 * Get all tags of a specific type with their descriptors.
 *
 * @param {string} biasType - 'role' | 'mechanical' | 'attribute'
 * @returns {Object} {tag: descriptor, ...}
 */
export function getAllDescriptors(biasType = 'role') {
  return { ..._getMapForType(biasType) };
}

/**
 * Build a semantic phrase from bias values.
 * Used to describe an archetype's style in mentor dialogue.
 *
 * Example:
 *   buildBiasPhrase({striker: 3, accuracy: 2}) → 'striker focused on precision'
 *
 * @param {Object} roleBias - Role bias object {tag: value}
 * @param {Object} mechanicalBias - Mechanical bias object {tag: value}
 * @returns {string} Semantic phrase
 */
export function buildBiasPhrase(roleBias = {}, mechanicalBias = {}) {
  const phrases = [];

  // Build role phrase (usually just primary role)
  const roleTags = Object.entries(roleBias)
    .sort((a, b) => b[1] - a[1]) // Sort by value descending
    .slice(0, 2); // Take top 2 roles

  if (roleTags.length > 0) {
    const [primaryRole, primaryValue] = roleTags[0];
    const descriptor = getBiasDescriptor(primaryRole, 'role');

    if (roleTags.length > 1 && roleTags[1][1] > 0) {
      const [secondaryRole] = roleTags[1];
      const secondDesc = getBiasDescriptor(secondaryRole, 'role');
      phrases.push(`${descriptor} with ${secondDesc} tendencies`);
    } else {
      phrases.push(descriptor);
    }
  }

  // Build mechanical phrase (top 2 mechanical traits)
  const mechTags = Object.entries(mechanicalBias)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  if (mechTags.length > 0) {
    const mechDescriptors = mechTags.map(([tag]) =>
      getBiasDescriptor(tag, 'mechanical').toLowerCase()
    );
    if (mechDescriptors.length === 2) {
      phrases.push(`emphasizing ${mechDescriptors.join(' and ')}`);
    } else if (mechDescriptors.length === 1) {
      phrases.push(`emphasizing ${mechDescriptors[0]}`);
    }
  }

  return phrases.join(', ');
}

/**
 * Get map for a bias type.
 * @private
 */
function _getMapForType(biasType) {
  switch (biasType) {
    case 'role':
      return ROLE_BIAS_MAP;
    case 'mechanical':
      return MECHANICAL_BIAS_MAP;
    case 'attribute':
      return ATTRIBUTE_BIAS_MAP;
    default:
      return {};
  }
}

export default {
  mapBiasesToDescriptors,
  getBiasDescriptor,
  getAllDescriptors,
  buildBiasPhrase,
};
