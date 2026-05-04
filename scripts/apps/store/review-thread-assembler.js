/**
 * ReviewThreadAssembler
 *
 * Marketplace review assembler with diegetic flavor only.
 *
 * Constraints:
 * - all prose must come from provided packs
 * - reviews are noisy flavor, not mechanics
 * - seller/competitor voices are explicit (Rendarr / Neeko)
 */

export class ReviewThreadAssembler {
  static build(config) {
    const {
      itemType,
      dialoguePacks,
      hasMentorReview = false,
      mentorText = null,
      seed = null
    } = config;

    if (!dialoguePacks) {
      console.warn('[ReviewThreadAssembler] No dialogue packs provided');
      return { reviews: [], isValid: false };
    }

    const seeded = seed !== null ? new SeededRandom(seed) : null;
    const rng = seeded ? () => seeded.next() : Math.random;
    const thread = [];

    if (hasMentorReview && mentorText) {
      thread.push({
        author: 'Rendarr',
        type: 'mentor',
        text: mentorText,
        stars: null,
        helpfulCount: null,
        replies: []
      });
    }

    const basePool = this._getBasePool(itemType, dialoguePacks);
    const overflowPool = this._getOverflowPool(itemType, dialoguePacks);
    if (!basePool.length && !overflowPool.length) {
      return { reviews: thread, isValid: false };
    }

    // 3–6 visible reviews. Reply density then lifts total thread size closer to 6–12.
    const desiredReviews = this._randomInt(rng, 3, 6);
    const maxThreadEntries = this._randomInt(rng, 6, 12);
    let currentEntryCount = thread.length;

    for (let i = 0; i < desiredReviews; i++) {
      const pool = (overflowPool.length && rng() < 0.25) ? overflowPool : basePool;
      const reviewText = pool[Math.floor(rng() * pool.length)] || basePool[0] || '';
      const username = this._pickUsername(rng, dialoguePacks);
      const review = {
        author: username,
        type: 'customer',
        text: reviewText,
        stars: this._randomStarRating(rng),
        helpfulCount: this._randomInt(rng, 0, 1000),
        replies: []
      };

      currentEntryCount += 1;

      // 0–3 replies, but cap total thread density near 6–12 combined entries.
      const replyBudget = Math.max(0, maxThreadEntries - currentEntryCount);
      const replyCount = Math.min(replyBudget, this._randomInt(rng, 0, 3));
      const repliesPool = [
        ...(dialoguePacks.main?.reviewerReplies || []),
        ...(dialoguePacks.overflow?.reviewerRepliesOverflow || [])
      ];
      const responsePool = [
        ...(dialoguePacks.main?.responsesToReplies || []),
        ...(dialoguePacks.overflow?.responsesToRepliesOverflow || [])
      ];

      for (let j = 0; j < replyCount; j++) {
        let author = this._pickUsername(rng, dialoguePacks);
        let text = repliesPool[Math.floor(rng() * Math.max(1, repliesPool.length))] || reviewText;
        let role = 'customer-reply';

        // Explicit seller / competitor lane.
        const roll = rng();
        if (roll < 0.14) {
          author = 'Neeko';
          role = 'competitor';
          text = this._pickFrom(dialoguePacks.main?.neekoReviews?.selfPromo || [], rng, text);
        } else if (roll < 0.28) {
          author = 'Rendarr';
          role = 'seller';
          text = this._pickFrom(dialoguePacks.main?.rendarrReviews?.toxicPositive || [], rng, text);
        }

        review.replies.push({ author, text, role });
        currentEntryCount += 1;

        // If Neeko appears, Rendarr may specifically reply back.
        if (author === 'Neeko' && currentEntryCount < maxThreadEntries && rng() < 0.55) {
          review.replies.push({
            author: 'Rendarr',
            text: this._pickFrom(dialoguePacks.main?.rendarrReviews?.toxicPositive || responsePool, rng, text),
            role: 'seller',
            isResponse: true,
            directedAt: 'Neeko'
          });
          currentEntryCount += 1;
        } else if (currentEntryCount < maxThreadEntries && rng() < 0.15) {
          review.replies.push({
            author: this._pickUsername(rng, dialoguePacks),
            text: this._pickFrom(responsePool, rng, text),
            role: 'customer-reply',
            isResponse: true
          });
          currentEntryCount += 1;
        }
      }

      thread.push(review);
    }

    // Optional top-level seller/competitor post if room remains.
    if (currentEntryCount < maxThreadEntries && rng() < 0.35) {
      const isRendarr = rng() < 0.6;
      const author = isRendarr ? 'Rendarr' : 'Neeko';
      const text = isRendarr
        ? this._pickFrom(dialoguePacks.main?.rendarrReviews?.toxicPositive || [], rng, 'Premium stock. Minimal whining.')
        : this._pickFrom(dialoguePacks.main?.neekoReviews?.selfPromo || [], rng, 'You could always shop somewhere with standards.');
      thread.push({
        author,
        type: isRendarr ? 'seller' : 'competitor',
        text,
        stars: null,
        helpfulCount: this._randomInt(rng, 0, 1000),
        replies: []
      });
    }

    const isValid = this._validateThread(thread);
    return {
      reviews: thread,
      isValid,
      stats: {
        totalReviews: thread.length,
        customerCount: thread.filter(r => r.type === 'customer').length,
        replyCount: thread.reduce((acc, r) => acc + (r.replies?.length || 0), 0),
        mentorPresent: thread.some(r => r.type === 'mentor')
      }
    };
  }

  static _pickFrom(pool, rng, fallback = '') {
    if (!Array.isArray(pool) || pool.length === 0) return fallback;
    return pool[Math.floor(rng() * pool.length)] || fallback;
  }

  static _getBasePool(itemType, dialoguePacks) {
    const main = dialoguePacks.main || {};
    if (itemType === 'armor') return main.armorReviews?.short || [];
    if (itemType === 'weapon') return [ ...(main.weaponReviews?.general || []), ...(main.weaponReviews?.chaotic || []) ];
    if (itemType === 'equipment') return main.gearReviews?.general || [];
    if (itemType === 'vehicle') return main.vehicleReviews || [];
    if (itemType === 'droid') {
      return [
        ...(main.firstDegreeDroids || []),
        ...(main.secondDegreeDroids || []),
        ...(main.thirdDegreeDroids || []),
        ...(main.fourthDegreeDroids || []),
        ...(main.fifthDegreeDroids || [])
      ];
    }
    if (itemType === 'modification') return main.modificationReviews || [];
    if (itemType === 'service') {
      return [
        ...(main.dining || []),
        ...(main.lodging || []),
        ...(main.medicalCare || []),
        ...(main.transportation || []),
        ...(main.upkeep || []),
        ...(main.vehicleRental || [])
      ];
    }
    return [];
  }

  static _getOverflowPool(itemType, dialoguePacks) {
    const overflow = dialoguePacks.overflow || {};
    if (itemType === 'armor') return overflow.armorReviewsOverflow || [];
    if (itemType === 'weapon') {
      return [
        ...(overflow.weaponReviewsOverflow?.fireRate || []),
        ...(overflow.weaponReviewsOverflow?.power || []),
        ...(overflow.weaponReviewsOverflow?.sound || []),
        ...(overflow.weaponReviewsOverflow?.ergonomics || [])
      ];
    }
    if (itemType === 'equipment') return overflow.gearReviewsOverflow || [];
    if (itemType === 'vehicle') return overflow.vehicleReviewsOverflow || [];
    if (itemType === 'droid') return overflow.droidReviewsOverflow || [];
    if (itemType === 'modification') return overflow.modificationReviewsOverflow || [];
    if (itemType === 'service') {
      return [
        ...(overflow.diningOverflow || []),
        ...(overflow.lodgingOverflow || []),
        ...(overflow.medicalCareOverflow || []),
        ...(overflow.transportationOverflow || []),
        ...(overflow.upkeepOverflow || []),
        ...(overflow.vehicleRentalOverflow || [])
      ];
    }
    return [];
  }

  static _pickUsername(rng, dialoguePacks) {
    const usernames = dialoguePacks.usernames || [];
    if (!usernames.length) return 'Marketplace Customer';
    return usernames[Math.floor(rng() * usernames.length)];
  }

  static _randomStarRating(rng) {
    const whole = this._randomInt(rng, 0, 5);
    const fractions = [0, 0, 0, 0.5];
    const fraction = fractions[Math.floor(rng() * fractions.length)];
    return Math.max(0, Math.min(5, whole + fraction));
  }

  static _randomInt(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
  }

  static _validateThread(thread) {
    const mechanics = [
      'bonus', 'armor class', 'save', 'fort', 'reflex', 'will',
      'check penalty', 'level', 'talent', 'feat', 'proficiency',
      'initiative', 'attack roll', 'skill', 'ability'
    ];

    for (const entry of thread) {
      if (entry.type === 'mentor' || entry.type === 'system-message') continue;
      const chunks = [entry.text, ...(entry.replies || []).map(r => r.text)].filter(Boolean);
      for (const text of chunks) {
        const lower = String(text).toLowerCase();
        if (lower.includes('...') || lower.includes('[[') || lower.includes('{{')) return false;
        if (mechanics.some(word => lower.includes(word))) return false;
      }
    }
    return true;
  }
}

class SeededRandom {
  constructor(seed) { this.seed = seed; }
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}
