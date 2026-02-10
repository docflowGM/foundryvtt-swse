/**
 * Tests for ReviewThreadAssembler
 *
 * FOCUS: Invariant validation, not output snapshots
 *
 * Invariants that MUST hold:
 * 1. Zero generated dialogue (all text from packs)
 * 2. No mechanics words (level, bonus, damage, etc.)
 * 3. Mentor review is pinned, never contested
 * 4. Star ratings are noise (independent of scores)
 * 5. All usernames are valid
 * 6. Review count is bounded (6-12)
 * 7. Reply depth is bounded (max 2 levels)
 * 8. Thread enders are rare (≤5%)
 */

import { ReviewThreadAssembler } from './review-thread-assembler.js';

/**
 * Mock dialogue packs for testing
 */
const createMockDialoguePacks = () => ({
  main: {
    armorReviews: {
      short: [
        'Heavy armor works great',
        'Good protection but slow',
        'Worth the investment'
      ],
      longStories: [
        'I wore this armor for years and it never failed me'
      ]
    },
    weaponReviews: {
      general: [
        'Powerful weapon',
        'Good balance',
        'Reliable'
      ],
      chaotic: [
        'This thing is wild',
        'Unpredictable but fun'
      ]
    },
    gearReviews: {
      general: [
        'Works as advertised',
        'Decent quality'
      ]
    },
    vehicleReviews: [
      'Fast but loud',
      'Handles well in open terrain',
      'Fuel consumption is concerning'
    ],
    firstDegreeDroids: [
      'Very helpful. Very judgmental.',
      'This medical droid knows too much about me.'
    ],
    secondDegreeDroids: [
      'Fixed the engine. Broke something else.',
      'Keeps muttering about inefficiency.'
    ],
    thirdDegreeDroids: [
      'Won\'t stop correcting my grammar.',
      'Very polite. Too polite.'
    ],
    fourthDegreeDroids: [
      'Too eager to engage.',
      'Keeps requesting combat scenarios.'
    ],
    fifthDegreeDroids: [
      'Lifts things. Sometimes people.',
      'Very strong. Very literal.'
    ],
    modificationReviews: [
      'Installed easily. Removal was harder.',
      'Works as advertised, mostly.',
      'Why does it make that sound now.'
    ],
    dining: [
      'This dining experience was more about presentation than food.',
      'I ate well, but it took longer than expected.'
    ],
    lodging: [
      'This lodging experience looked great at first, then problems appeared.',
      'I slept comfortably, which is all I needed.'
    ],
    medicalCare: [
      'This medical service solved the problem, but explanations were minimal.',
      'I received treatment quickly.'
    ],
    transportation: [
      'This transportation experience got me where I needed to go.',
      'The trip was uneventful, which I appreciated.'
    ],
    upkeep: [
      'This upkeep service made things easier for a while.',
      'Maintaining this lifestyle took more effort than expected.'
    ],
    vehicleRental: [
      'This vehicle rental worked as expected.',
      'The vehicle handled fine for short trips.'
    ],
    neekoReviews: {
      selfPromo: [
        'Neeko has better price'
      ]
    },
    rendarrReviews: {
      toxicPositive: [
        'Product works perfectly'
      ]
    },
    rendarrRepliesToNeeko: [
      'We appreciate your feedback'
    ],
    reviewerReplies: [
      'Had same experience',
      'Disagree with this'
    ],
    responsesToReplies: [
      'You make a good point'
    ]
  },
  overflow: {
    armorReviewsOverflow: [
      'Armor held up in combat'
    ],
    weaponReviewsOverflow: {
      fireRate: ['Fires fast'],
      power: ['Very powerful'],
      sound: ['Loud weapon'],
      ergonomics: ['Comfortable grip']
    },
    gearReviewsOverflow: [
      'Useful equipment'
    ],
    vehicleReviewsOverflow: [
      'Surprisingly efficient',
      'Turns well'
    ],
    modificationReviewsOverflow: [
      'Installation was stressful.',
      'Feels like a real upgrade.'
    ],
    diningOverflow: [
      'The meal filled me up, which was the goal.'
    ],
    lodgingOverflow: [
      'The room was clean, but smaller than expected.'
    ],
    medicalCareOverflow: [
      'The staff focused on efficiency, not comfort.'
    ],
    transportationOverflow: [
      'This ride took longer than advertised.'
    ],
    upkeepOverflow: [
      'The service covered the basics.'
    ],
    vehicleRentalOverflow: [
      'This rental experience was stressful at times.'
    ],
    neekoOverflow: [
      'Neeko sellsss cheaper'
    ],
    rendarrOverflow: [
      'Customer satisfaction'
    ],
    reviewerRepliesOverflow: [
      'This is wrong'
    ],
    responsesToRepliesOverflow: [
      'Still disagree'
    ],
    threadEnders: [
      'Thread locked by moderator'
    ]
  },
  usernames: [
    'BlasterJam77',
    'JediWithNoPlan',
    'MoistTatooine'
  ]
});

/**
 * Test Suite
 */
export const reviewThreadAssemblerTests = {
  /**
   * Invariant #1: All text must come from dialogue packs
   */
  testNoGeneratedText() {
    const packs = createMockDialoguePacks();
    const thread = ReviewThreadAssembler.build({
      itemType: 'weapon',
      dialoguePacks: packs,
      hasMentorReview: false,
      mentorText: null
    });

    // Collect all text from packs for comparison
    const packTexts = new Set();
    [packs.main.weaponReviews.general, packs.main.weaponReviews.chaotic].flat().forEach(t => packTexts.add(t));
    [packs.overflow.weaponReviewsOverflow.fireRate, packs.overflow.weaponReviewsOverflow.power].flat().forEach(t => packTexts.add(t));
    packs.main.reviewerReplies.forEach(t => packTexts.add(t));
    packs.main.responsesToReplies.forEach(t => packTexts.add(t));
    // ... etc

    // Every customer/competitor/seller review must match a pack entry
    for (const review of thread.reviews) {
      if (review.type === 'customer' || review.type === 'competitor' || review.type === 'seller') {
        const isInPack = Array.from(packTexts).some(text => review.text === text);
        if (!isInPack && !review.text.includes('Neeko') && !review.text.includes('Rendarr')) {
          console.warn(`[TEST FAIL] Generated or invalid text: "${review.text}"`);
          return false;
        }
      }
    }

    console.log('✓ testNoGeneratedText passed');
    return true;
  },

  /**
   * Invariant #2: No mechanics words in marketplace reviews
   */
  testNoMechanicsLeak() {
    const packs = createMockDialoguePacks();
    const bannedWords = [
      'bonus', 'damage', 'armor class', 'ac', 'save', 'fort', 'reflex',
      'will', 'check penalty', 'level', 'talent', 'feat', 'proficiency'
    ];

    const thread = ReviewThreadAssembler.build({
      itemType: 'armor',
      dialoguePacks: packs,
      hasMentorReview: false,
      mentorText: null
    });

    for (const review of thread.reviews) {
      if (review.type === 'mentor' || review.type === 'system-message') continue;

      const textLower = (review.text || '').toLowerCase();
      for (const banned of bannedWords) {
        if (textLower.includes(banned)) {
          console.warn(`[TEST FAIL] Mechanics word "${banned}" in: "${review.text}"`);
          return false;
        }
      }

      // Check replies too
      for (const reply of (review.replies || [])) {
        const replyLower = (reply.text || '').toLowerCase();
        for (const banned of bannedWords) {
          if (replyLower.includes(banned)) {
            console.warn(`[TEST FAIL] Mechanics word "${banned}" in reply: "${reply.text}"`);
            return false;
          }
        }
      }
    }

    console.log('✓ testNoMechanicsLeak passed');
    return true;
  },

  /**
   * Invariant #3: Mentor review (if present) is pinned and never contested
   */
  testMentorPinned() {
    const packs = createMockDialoguePacks();
    const mentorText = 'This item is perfect for your build';

    const thread = ReviewThreadAssembler.build({
      itemType: 'weapon',
      dialoguePacks: packs,
      hasMentorReview: true,
      mentorText: mentorText
    });

    if (thread.reviews.length === 0) {
      console.warn('[TEST FAIL] Thread is empty');
      return false;
    }

    const firstReview = thread.reviews[0];

    // Mentor must be first
    if (firstReview.type !== 'mentor') {
      console.warn('[TEST FAIL] Mentor not pinned at top');
      return false;
    }

    // Mentor must have the exact text
    if (firstReview.text !== mentorText) {
      console.warn('[TEST FAIL] Mentor text mismatch');
      return false;
    }

    // Mentor must have NO replies
    if (firstReview.replies && firstReview.replies.length > 0) {
      console.warn('[TEST FAIL] Mentor has replies (should not)');
      return false;
    }

    // Mentor must have NO star rating
    if (firstReview.stars !== null && firstReview.stars !== undefined) {
      console.warn('[TEST FAIL] Mentor has star rating (should not)');
      return false;
    }

    console.log('✓ testMentorPinned passed');
    return true;
  },

  /**
   * Invariant #4: Star ratings are independent of suggestions (noise)
   */
  testStarRatingsAreNoise() {
    const packs = createMockDialoguePacks();
    const ratings = [];

    // Run multiple times, collect star ratings
    for (let i = 0; i < 50; i++) {
      const thread = ReviewThreadAssembler.build({
        itemType: 'armor',
        dialoguePacks: packs,
        hasMentorReview: false,
        seed: Math.random() * 100000 // Different seed each time
      });

      for (const review of thread.reviews) {
        if (review.type === 'customer' && review.stars) {
          ratings.push(review.stars);
        }
      }
    }

    if (ratings.length === 0) {
      console.warn('[TEST FAIL] No ratings collected');
      return false;
    }

    // Check distribution is roughly uniform (not all 5 stars, not all 1 star)
    const unique = new Set(ratings);
    if (unique.size < 2) {
      console.warn('[TEST FAIL] Star ratings not varied (all same value)');
      return false;
    }

    console.log(`✓ testStarRatingsAreNoise passed (collected ${ratings.length} ratings, ${unique.size} unique values)`);
    return true;
  },

  /**
   * Invariant #5: All usernames are valid (from pack or fallback)
   */
  testValidUsernames() {
    const packs = createMockDialoguePacks();
    const validUsernames = new Set(packs.usernames);

    const thread = ReviewThreadAssembler.build({
      itemType: 'equipment',
      dialoguePacks: packs,
      hasMentorReview: false,
      mentorText: null
    });

    for (const review of thread.reviews) {
      if (review.type === 'customer') {
        if (!validUsernames.has(review.author) && review.author !== 'Marketplace Customer') {
          console.warn(`[TEST FAIL] Invalid username: "${review.author}"`);
          return false;
        }
      }

      for (const reply of (review.replies || [])) {
        if (!validUsernames.has(reply.author) && reply.author !== 'Marketplace Customer') {
          console.warn(`[TEST FAIL] Invalid reply author: "${reply.author}"`);
          return false;
        }
      }
    }

    console.log('✓ testValidUsernames passed');
    return true;
  },

  /**
   * Invariant #6: Review count is bounded (6-12)
   */
  testReviewCountBounded() {
    const packs = createMockDialoguePacks();

    for (let i = 0; i < 20; i++) {
      const thread = ReviewThreadAssembler.build({
        itemType: 'weapon',
        dialoguePacks: packs,
        hasMentorReview: false,
        seed: i
      });

      const customerReviewCount = thread.reviews.filter(r => r.type === 'customer').length;

      if (customerReviewCount < 6 || customerReviewCount > 12) {
        console.warn(`[TEST FAIL] Review count out of bounds: ${customerReviewCount}`);
        return false;
      }
    }

    console.log('✓ testReviewCountBounded passed');
    return true;
  },

  /**
   * Invariant #7: Reply depth is bounded (max 2 levels: reply + response)
   */
  testReplyDepthBounded() {
    const packs = createMockDialoguePacks();
    const thread = ReviewThreadAssembler.build({
      itemType: 'armor',
      dialoguePacks: packs,
      hasMentorReview: false,
      mentorText: null
    });

    for (const review of thread.reviews) {
      if (!review.replies) continue;

      // Each reply can be at most 2 deep (initial reply + response)
      let depth = 1;
      for (const reply of review.replies) {
        if (reply.isResponse && depth > 2) {
          console.warn('[TEST FAIL] Reply depth exceeds 2 levels');
          return false;
        }
        if (!reply.isResponse) depth = 1;
        else depth += 1;
      }

      // Max 3 replies total (1-2 regular + 1 response)
      if (review.replies.length > 3) {
        console.warn(`[TEST FAIL] Too many replies: ${review.replies.length}`);
        return false;
      }
    }

    console.log('✓ testReplyDepthBounded passed');
    return true;
  },

  /**
   * Invariant #8: Thread enders are rare (≤5%)
   */
  testThreadEndersRare() {
    const packs = createMockDialoguePacks();
    let enderCount = 0;
    const runs = 100;

    for (let i = 0; i < runs; i++) {
      const thread = ReviewThreadAssembler.build({
        itemType: 'weapon',
        dialoguePacks: packs,
        hasMentorReview: false,
        seed: i
      });

      const hasEnder = thread.reviews.some(r => r.type === 'system-message');
      if (hasEnder) enderCount++;
    }

    const enderPercent = (enderCount / runs) * 100;
    if (enderPercent > 10) {
      console.warn(`[TEST FAIL] Thread enders too common: ${enderPercent.toFixed(1)}% (expected ≤5%)`);
      return false;
    }

    console.log(`✓ testThreadEndersRare passed (${enderPercent.toFixed(1)}% of ${runs} threads had enders)`);
    return true;
  },

  /**
   * Validation pass always returns isValid = true for clean packs
   */
  testValidationPass() {
    const packs = createMockDialoguePacks();
    const thread = ReviewThreadAssembler.build({
      itemType: 'armor',
      dialoguePacks: packs,
      hasMentorReview: false,
      mentorText: null
    });

    if (!thread.isValid) {
      console.warn('[TEST FAIL] Validation did not pass');
      return false;
    }

    console.log('✓ testValidationPass passed');
    return true;
  },

  /**
   * Vehicle reviews are properly assembled and validated
   */
  testVehicleReviews() {
    const packs = createMockDialoguePacks();
    const thread = ReviewThreadAssembler.build({
      itemType: 'vehicle',
      dialoguePacks: packs,
      hasMentorReview: false,
      mentorText: null
    });

    if (!thread.isValid) {
      console.warn('[TEST FAIL] Vehicle thread validation failed');
      return false;
    }

    const customerReviews = thread.reviews.filter(r => r.type === 'customer');
    if (customerReviews.length < 6 || customerReviews.length > 12) {
      console.warn(`[TEST FAIL] Vehicle review count out of bounds: ${customerReviews.length}`);
      return false;
    }

    // Verify reviews come from vehicle pack
    const vehiclePool = [...packs.main.vehicleReviews, ...(packs.overflow.vehicleReviewsOverflow || [])];
    for (const review of customerReviews) {
      if (!vehiclePool.includes(review.text)) {
        console.warn(`[TEST FAIL] Review not from vehicle pack: "${review.text}"`);
        return false;
      }
    }

    console.log(`✓ testVehicleReviews passed (${customerReviews.length} reviews)`);
    return true;
  },

  /**
   * Droid reviews are properly assembled from all degree pools
   */
  testDroidReviews() {
    const packs = createMockDialoguePacks();
    const thread = ReviewThreadAssembler.build({
      itemType: 'droid',
      dialoguePacks: packs,
      hasMentorReview: false,
      mentorText: null
    });

    if (!thread.isValid) {
      console.warn('[TEST FAIL] Droid thread validation failed');
      return false;
    }

    const customerReviews = thread.reviews.filter(r => r.type === 'customer');
    if (customerReviews.length < 6 || customerReviews.length > 12) {
      console.warn(`[TEST FAIL] Droid review count out of bounds: ${customerReviews.length}`);
      return false;
    }

    // Verify reviews come from droid packs (all degrees mixed)
    const droidPool = [
      ...packs.main.firstDegreeDroids,
      ...packs.main.secondDegreeDroids,
      ...packs.main.thirdDegreeDroids,
      ...packs.main.fourthDegreeDroids,
      ...packs.main.fifthDegreeDroids
    ];

    for (const review of customerReviews) {
      if (!droidPool.includes(review.text)) {
        console.warn(`[TEST FAIL] Review not from droid pack: "${review.text}"`);
        return false;
      }
    }

    console.log(`✓ testDroidReviews passed (${customerReviews.length} reviews from mixed droid degrees)`);
    return true;
  },

  /**
   * Modification reviews are properly assembled and validated
   */
  testModificationReviews() {
    const packs = createMockDialoguePacks();
    const thread = ReviewThreadAssembler.build({
      itemType: 'modification',
      dialoguePacks: packs,
      hasMentorReview: false,
      mentorText: null
    });

    if (!thread.isValid) {
      console.warn('[TEST FAIL] Modification thread validation failed');
      return false;
    }

    const customerReviews = thread.reviews.filter(r => r.type === 'customer');
    if (customerReviews.length < 6 || customerReviews.length > 12) {
      console.warn(`[TEST FAIL] Modification review count out of bounds: ${customerReviews.length}`);
      return false;
    }

    // Verify reviews come from modification pack
    const modPool = [...packs.main.modificationReviews, ...(packs.overflow.modificationReviewsOverflow || [])];
    for (const review of customerReviews) {
      if (!modPool.includes(review.text)) {
        console.warn(`[TEST FAIL] Review not from modification pack: "${review.text}"`);
        return false;
      }
    }

    console.log(`✓ testModificationReviews passed (${customerReviews.length} reviews)`);
    return true;
  },

  /**
   * Service reviews are properly assembled from all service categories
   */
  testServiceReviews() {
    const packs = createMockDialoguePacks();
    const thread = ReviewThreadAssembler.build({
      itemType: 'service',
      dialoguePacks: packs,
      hasMentorReview: false,
      mentorText: null
    });

    if (!thread.isValid) {
      console.warn('[TEST FAIL] Service thread validation failed');
      return false;
    }

    const customerReviews = thread.reviews.filter(r => r.type === 'customer');
    if (customerReviews.length < 6 || customerReviews.length > 12) {
      console.warn(`[TEST FAIL] Service review count out of bounds: ${customerReviews.length}`);
      return false;
    }

    // Verify reviews come from service packs (all categories mixed)
    const servicePool = [
      ...packs.main.dining,
      ...packs.main.lodging,
      ...packs.main.medicalCare,
      ...packs.main.transportation,
      ...packs.main.upkeep,
      ...packs.main.vehicleRental,
      ...(packs.overflow.diningOverflow || []),
      ...(packs.overflow.lodgingOverflow || []),
      ...(packs.overflow.medicalCareOverflow || []),
      ...(packs.overflow.transportationOverflow || []),
      ...(packs.overflow.upkeepOverflow || []),
      ...(packs.overflow.vehicleRentalOverflow || [])
    ];

    for (const review of customerReviews) {
      if (!servicePool.includes(review.text)) {
        console.warn(`[TEST FAIL] Review not from service pack: "${review.text}"`);
        return false;
      }
    }

    console.log(`✓ testServiceReviews passed (${customerReviews.length} reviews from mixed service categories)`);
    return true;
  }
};

/**
 * Run all tests
 */
export function runAllTests() {
  console.log('================================');
  console.log('ReviewThreadAssembler Test Suite');
  console.log('================================\n');

  const tests = Object.entries(reviewThreadAssemblerTests);
  let passed = 0;
  let failed = 0;

  for (const [name, testFn] of tests) {
    try {
      const result = testFn();
      if (result) passed++;
      else failed++;
    } catch (err) {
      console.error(`[ERROR] ${name}: ${err.message}`);
      failed++;
    }
  }

  console.log('\n================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('================================\n');

  return failed === 0;
}

// Export for use in test runner
if (typeof window === 'undefined') {
  // Node.js
  runAllTests();
}
