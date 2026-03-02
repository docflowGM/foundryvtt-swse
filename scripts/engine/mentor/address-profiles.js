/**
 * ADDRESS PROFILES - Mentor Address Registry
 *
 * Defines nickname pools for each mentor, with global uniqueness enforcement.
 * Ensures no nickname token overlap except {actor_name}.
 *
 * Each profile specifies:
 * - pool: Array of available addresses (nicknames or {actor_name})
 * - allowNicknameInSevere: Whether to use nicknames at very_high severity
 */

export const ADDRESS_PROFILES = {
  miraj: {
    pool: [
      "{actor_name}",
      "Young one",
      "Learner",
      "My friend",
      "Apprentice"
    ],
    allowNicknameInSevere: false
  },

  lead: {
    pool: [
      "{actor_name}",
      "Pal",
      "Kid",
      "Rookie",
      "Hotshot"
    ],
    allowNicknameInSevere: false
  },

  miedo: {
    pool: [
      "{actor_name}",
      "Old friend",
      "Traveler",
      "Seeker"
    ],
    allowNicknameInSevere: true
  },

  malbada: {
    pool: [
      "{actor_name}",
      "Disciple",
      "Devotee",
      "Chosen",
      "Child"
    ],
    allowNicknameInSevere: false
  },

  tio: {
    pool: [
      "{actor_name}",
      "My good friend",
      "Young blood",
      "Trusted one",
      "Listen closely"
    ],
    allowNicknameInSevere: true
  }
};

/**
 * Validate global uniqueness of address tokens
 * Throws on collision; silent success on valid profiles
 * @throws {Error} If any token appears in multiple mentor pools
 */
function validateUniqueness(profiles) {
  const seen = new Map();

  for (const [mentorId, config] of Object.entries(profiles)) {
    for (const token of config.pool) {
      // {actor_name} is allowed universally
      if (token === "{actor_name}") continue;

      if (seen.has(token)) {
        throw new Error(
          `Address token collision: "${token}" used by both ${seen.get(token)} and ${mentorId}`
        );
      }

      seen.set(token, mentorId);
    }
  }
}

// Run validation on module load
validateUniqueness(ADDRESS_PROFILES);
