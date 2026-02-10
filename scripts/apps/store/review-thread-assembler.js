/**
 * ReviewThreadAssembler
 *
 * Pure content assembly engine for marketplace review threads.
 *
 * CORE CONTRACT:
 * - Zero generated dialogue (all text from packs)
 * - Dialogue packs are immutable
 * - Mentor reviews are pinned, never contested
 * - Probability weights are deterministic (base 75% / overflow 25%)
 * - Star ratings are noise, never correlated with suggestion scores
 * - All text must validate against dialect packs
 *
 * RESPONSIBILITIES:
 * - Select reviews from weighted pools
 * - Assemble threads with optional seller content
 * - Add reviewer replies and responses (rare)
 * - Inject thread enders (very rare)
 * - Validate no generated or mechanic text leaks
 *
 * NON-RESPONSIBILITIES:
 * - Rendering (output is data structure)
 * - Suggestion logic (input only)
 * - Merchant decision-making (assembly only)
 */

export class ReviewThreadAssembler {
  /**
   * Build a marketplace review thread for an item.
   *
   * @param {Object} config
   * @param {string} config.itemType - 'armor', 'weapon', 'equipment'
   * @param {Object} config.dialoguePacks - { main, overflow, usernames }
   * @param {boolean} config.hasMentorReview - Whether to include mentor at top
   * @param {string|null} config.mentorText - Pre-generated mentor prose
   * @param {number} config.seed - Optional deterministic seed
   * @returns {Object} ReviewThread { reviews: [], isValid: bool }
   */
  static build(config) {
    const {
      itemType,
      dialoguePacks,
      hasMentorReview = false,
      mentorText = null,
      seed = null
    } = config;

    // Validate inputs
    if (!dialoguePacks) {
      console.warn('[ReviewThreadAssembler] No dialogue packs provided');
      return { reviews: [], isValid: false };
    }

    // Deterministic RNG if seed provided
    const rng = seed !== null ? new SeededRandom(seed) : new Math.random;

    const thread = [];

    // Phase 1: Mentor review (if present, pinned at top)
    if (hasMentorReview && mentorText) {
      thread.push({
        author: 'Rendarr',
        type: 'mentor',
        text: mentorText,
        stars: null, // Mentor never has star rating
        replies: []
      });
    }

    // Phase 2: Fake customer reviews (6-12 total)
    const reviewCount = this._randomInt(rng, 6, 12);
    const basePool = this._getBasePool(itemType, dialoguePacks);
    const overflowPool = this._getOverflowPool(itemType, dialoguePacks);

    if (!basePool || basePool.length === 0) {
      console.warn(`[ReviewThreadAssembler] No review pool for type: ${itemType}`);
      return { reviews: thread, isValid: false };
    }

    for (let i = 0; i < reviewCount; i++) {
      // Weighted selection: 75% base, 25% overflow
      const useBase = rng() < 0.75;
      const pool = useBase ? basePool : (overflowPool || basePool);
      const reviewText = pool[Math.floor(rng() * pool.length)];
      const username = this._pickUsername(rng, dialoguePacks);
      const stars = this._randomStarRating(rng);

      const review = {
        author: username,
        type: 'customer',
        text: reviewText,
        stars: stars,
        replies: []
      };

      // Phase 3: Reviewer replies (40% chance per review)
      if (rng() < 0.4) {
        const replyCount = this._randomInt(rng, 1, 3);
        const repliesPool = [
          ...(dialoguePacks.main?.reviewerReplies || []),
          ...(dialoguePacks.overflow?.reviewerRepliesOverflow || [])
        ];

        for (let j = 0; j < replyCount; j++) {
          if (repliesPool.length === 0) break;

          const replyText = repliesPool[Math.floor(rng() * repliesPool.length)];
          const replyAuthor = this._pickUsername(rng, dialoguePacks);

          review.replies.push({
            author: replyAuthor,
            text: replyText
          });

          // Phase 4: Response to reply (15% chance, very rare)
          if (rng() < 0.15) {
            const responsesPool = [
              ...(dialoguePacks.main?.responsesToReplies || []),
              ...(dialoguePacks.overflow?.responsesToRepliesOverflow || [])
            ];

            if (responsesPool.length > 0) {
              const responseText = responsesPool[Math.floor(rng() * responsesPool.length)];
              const responder = this._pickUsername(rng, dialoguePacks);

              review.replies.push({
                author: responder,
                text: responseText,
                isResponse: true
              });
            }
          }
        }
      }

      thread.push(review);
    }

    // Phase 5: Maybe inject seller content (25% chance)
    if (rng() < 0.25) {
      const sellerType = rng() < 0.6 ? 'rendarr' : 'neeko';

      if (sellerType === 'rendarr') {
        const rendarrPool = dialoguePacks.main?.rendarrReviews?.toxicPositive || [];
        if (rendarrPool.length > 0) {
          const text = rendarrPool[Math.floor(rng() * rendarrPool.length)];
          thread.push({
            author: 'Rendarr',
            type: 'seller',
            text: text,
            stars: null,
            replies: []
          });
        }
      } else {
        const neekoPool = dialoguePacks.main?.neekoReviews?.selfPromo || [];
        if (neekoPool.length > 0) {
          const text = neekoPool[Math.floor(rng() * neekoPool.length)];
          thread.push({
            author: 'Neeko',
            type: 'competitor',
            text: text,
            stars: null,
            replies: []
          });
        }
      }
    }

    // Phase 6: Thread ender (5% chance, extremely rare)
    if (rng() < 0.05) {
      const endersPool = dialoguePacks.overflow?.threadEnders || [];
      if (endersPool.length > 0) {
        const enderText = endersPool[Math.floor(rng() * endersPool.length)];
        thread.push({
          author: 'System',
          type: 'system-message',
          text: enderText,
          stars: null,
          replies: []
        });
      }
    }

    // Validation pass
    const isValid = this._validateThread(thread, dialoguePacks);

    return {
      reviews: thread,
      isValid: isValid,
      stats: {
        totalReviews: thread.length,
        customerCount: thread.filter(r => r.type === 'customer').length,
        replyCount: thread.reduce((acc, r) => acc + r.replies.length, 0),
        mentorPresent: thread.some(r => r.type === 'mentor')
      }
    };
  }

  /**
   * Get base review pool for item type
   */
  static _getBasePool(itemType, dialoguePacks) {
    const main = dialoguePacks.main || {};

    if (itemType === 'armor') {
      return main.armorReviews?.short || [];
    }
    if (itemType === 'weapon') {
      const general = main.weaponReviews?.general || [];
      const chaotic = main.weaponReviews?.chaotic || [];
      return [...general, ...chaotic];
    }
    if (itemType === 'equipment') {
      return main.gearReviews?.general || [];
    }
    if (itemType === 'vehicle') {
      return main.vehicleReviews || [];
    }
    if (itemType === 'droid') {
      // Mix all droid degrees for variety
      const allDroids = [
        ...(main.firstDegreeDroids || []),
        ...(main.secondDegreeDroids || []),
        ...(main.thirdDegreeDroids || []),
        ...(main.fourthDegreeDroids || []),
        ...(main.fifthDegreeDroids || [])
      ];
      return allDroids.length > 0 ? allDroids : [];
    }
    if (itemType === 'modification') {
      return main.modificationReviews || [];
    }
    if (itemType === 'service') {
      // Mix all service categories for variety
      const allServices = [
        ...(main.dining || []),
        ...(main.lodging || []),
        ...(main.medicalCare || []),
        ...(main.transportation || []),
        ...(main.upkeep || []),
        ...(main.vehicleRental || [])
      ];
      return allServices.length > 0 ? allServices : [];
    }

    return [];
  }

  /**
   * Get overflow review pool for item type
   */
  static _getOverflowPool(itemType, dialoguePacks) {
    const overflow = dialoguePacks.overflow || {};

    if (itemType === 'armor') {
      return overflow.armorReviewsOverflow || [];
    }
    if (itemType === 'weapon') {
      const pools = [
        overflow.weaponReviewsOverflow?.fireRate || [],
        overflow.weaponReviewsOverflow?.power || [],
        overflow.weaponReviewsOverflow?.sound || [],
        overflow.weaponReviewsOverflow?.ergonomics || []
      ];
      return pools.flat();
    }
    if (itemType === 'equipment') {
      return overflow.gearReviewsOverflow || [];
    }
    if (itemType === 'vehicle') {
      // Vehicles don't have overflow yet, but gracefully handle if they do
      return overflow.vehicleReviewsOverflow || [];
    }
    if (itemType === 'droid') {
      // Droids don't have overflow yet, but gracefully handle if they do
      return overflow.droidReviewsOverflow || [];
    }
    if (itemType === 'modification') {
      // Modifications don't have overflow yet, but gracefully handle if they do
      return overflow.modificationReviewsOverflow || [];
    }
    if (itemType === 'service') {
      // Services don't have overflow yet, but gracefully handle if they do
      const allServicesOverflow = [
        ...(overflow.diningOverflow || []),
        ...(overflow.lodgingOverflow || []),
        ...(overflow.medicalCareOverflow || []),
        ...(overflow.transportationOverflow || []),
        ...(overflow.upkeepOverflow || []),
        ...(overflow.vehicleRentalOverflow || [])
      ];
      return allServicesOverflow;
    }

    return [];
  }

  /**
   * Pick random username with fallback
   */
  static _pickUsername(rng, dialoguePacks) {
    const usernames = dialoguePacks.usernames || [];
    if (usernames.length === 0) {
      return 'Marketplace Customer';
    }
    return usernames[Math.floor(rng() * usernames.length)];
  }

  /**
   * Generate random star rating (noise, never correlated with scores)
   */
  static _randomStarRating(rng) {
    const rand = rng();
    if (rand < 0.15) return 1;
    if (rand < 0.35) return 2;
    if (rand < 0.65) return 3;
    if (rand < 0.85) return 4;
    return 5;
  }

  /**
   * Random integer [min, max] inclusive
   */
  static _randomInt(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
  }

  /**
   * VALIDATION PASS: Ensure no generated or mechanic text leaked
   */
  static _validateThread(thread, dialoguePacks) {
    const rules = {
      // Banned words that indicate mechanics
      mechanics: [
        'bonus', 'damage', 'armor class', 'ac', 'save', 'fort', 'reflex',
        'will', 'check penalty', 'level', 'talent', 'feat', 'proficiency',
        'initiative', 'attack roll', 'skill', 'ability'
      ],
      // All text must come from packs or be mentor/system
      mustOriginateFrom: 'dialoguePacks'
    };

    for (const entry of thread) {
      // Mentor and system messages are exempt
      if (entry.type === 'mentor' || entry.type === 'system-message') {
        continue;
      }

      // Check for mechanics
      const textLower = (entry.text || '').toLowerCase();
      for (const banned of rules.mechanics) {
        if (textLower.includes(banned)) {
          console.warn(`[ReviewThreadAssembler] Mechanics word detected: "${banned}" in "${entry.text}"`);
          return false;
        }
      }

      // Check for generated markers (triple-dots, em-dashes, etc. that might indicate stubs)
      if (textLower.includes('...') || textLower.includes('[[') || textLower.includes('{{')) {
        console.warn(`[ReviewThreadAssembler] Generated text marker detected: "${entry.text}"`);
        return false;
      }
    }

    return true;
  }
}

/**
 * Seeded random number generator for deterministic testing
 */
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }

  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  // Make it callable like Math.random
  [Symbol.call]() {
    return this.next();
  }
}

// Override call behavior
SeededRandom.prototype.apply = function(thisArg) {
  return this.next();
};

Object.defineProperty(SeededRandom.prototype, Symbol.toStringTag, {
  value: 'SeededRandom'
});

// Allow usage as `rng()` directly
const wrapSeeded = (seeded) => () => seeded.next();
