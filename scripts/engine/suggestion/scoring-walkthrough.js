/**
 * SCORING WALKTHROUGH
 *
 * Shows step-by-step how the engine scores a single candidate
 * against a single character. Includes all calculations.
 */

class ScoringWalkthrough {
  /**
   * Step-by-step scoring breakdown for a candidate
   */
  static scoreWithExplanation(candidateName, candidateData, character) {
    const char = character;
    const cand = candidateData;

    console.log('\n' + '═'.repeat(90));
    console.log(`⚙️  SCORING WALKTHROUGH: "${candidateName}"`);
    console.log(`    Character: ${char.name}`);
    console.log('═'.repeat(90));

    // ────────────────────────────────────────────────────────────────
    // STEP 1: IMMEDIATE SCORE (Mechanical Synergy)
    // ────────────────────────────────────────────────────────────────
    console.log('\n📍 STEP 1: _computeImmediate() - Mechanical Synergy');
    console.log('─'.repeat(90));

    let immediateScore = 0.5; // baseline
    console.log(`  Base score: 0.50 (baseline for all candidates)`);

    // Ability synergy
    if (cand.synergy) {
      const primaryMod = char.abilities[char.primaryAbility].modifier;
      console.log(`  \n  Ability Check:`);
      console.log(`    Primary Ability: ${char.primaryAbility.toUpperCase()} (score: ${char.abilities[char.primaryAbility].score}, mod: ${primaryMod})`);
      console.log(`    Candidate Synergy: ${cand.synergy}`);

      let abilityBoost = 0;
      const synergy = cand.synergy.toLowerCase();

      if (synergy === 'melee' && char.primaryAbility === 'str') {
        abilityBoost = 0.25;
        console.log(`    ✓ MATCH: STR + melee synergy → +0.25 boost`);
      } else if (synergy === 'influence' && char.primaryAbility === 'cha') {
        abilityBoost = 0.25;
        console.log(`    ✓ MATCH: CHA + influence synergy → +0.25 boost`);
      } else if (synergy === 'ranged' && char.primaryAbility === 'dex') {
        abilityBoost = 0.25;
        console.log(`    ✓ MATCH: DEX + ranged synergy → +0.25 boost`);
      } else {
        console.log(`    ✗ NO MATCH: ${char.primaryAbility.toUpperCase()} doesn't align with ${synergy}`);
      }

      immediateScore = Math.min(1.0, 0.5 + abilityBoost);
      console.log(`    Immediate Score: ${immediateScore.toFixed(2)}`);
    }

    console.log(`\n  Final Immediate: ${immediateScore.toFixed(2)}`);

    // ────────────────────────────────────────────────────────────────
    // STEP 2: SHORT-TERM SCORE (Prestige Proximity)
    // ────────────────────────────────────────────────────────────────
    console.log('\n📍 STEP 2: _computeShortTerm() - Prestige Proximity');
    console.log('─'.repeat(90));

    let shortTermScore = 0.3; // baseline
    console.log(`  Base score: 0.30 (baseline)`);

    if (char.prestigeAffinities && char.prestigeAffinities.length > 0) {
      const topPrestige = char.prestigeAffinities[0];
      console.log(`  \n  Prestige Proximity Check:`);
      console.log(`    Top Prestige: "${topPrestige.prestige}" (confidence: ${(topPrestige.confidence * 100).toFixed(0)}%)`);

      const prestigeBoost = topPrestige.confidence * 0.25;
      console.log(`    Boost calculation: ${(topPrestige.confidence).toFixed(3)} × 0.25 = ${prestigeBoost.toFixed(3)}`);

      shortTermScore = Math.min(1.0, 0.3 + prestigeBoost);
      console.log(`    Short-term Score: ${shortTermScore.toFixed(2)}`);
    }

    console.log(`\n  Final Short-Term: ${shortTermScore.toFixed(2)}`);

    // ────────────────────────────────────────────────────────────────
    // STEP 3: IDENTITY PROJECTION SCORE (Long-term/Strategic)
    // ────────────────────────────────────────────────────────────────
    console.log('\n📍 STEP 3: _computeIdentityProjectionScore() - Long-term Strategy');
    console.log('─'.repeat(90));

    const CAP_PRESTIGE = 0.18;
    const CAP_AFFINITY = 0.06;
    const CAP_CHAIN = 0.06;
    const CAP_FLEXIBILITY = 0.05;
    const CAP_TOTAL = 0.25;

    let identityScore = 0;
    const signals = {};

    // SIGNAL 1: Prestige Trajectory
    console.log(`\n  SIGNAL 1: Prestige Trajectory (cap: ${CAP_PRESTIGE})`);
    if (char.prestigeAffinities && char.prestigeAffinities.length > 0) {
      const topPrestige = char.prestigeAffinities[0];
      const prestigeSignal = Math.min(CAP_PRESTIGE, topPrestige.confidence * 0.25);
      signals.prestige = prestigeSignal;
      identityScore += prestigeSignal;
      console.log(`    Top prestige: "${topPrestige.prestige}" (${(topPrestige.confidence * 100).toFixed(0)}%)`);
      console.log(`    Calculation: min(${CAP_PRESTIGE}, ${(topPrestige.confidence * 0.25).toFixed(3)}) = ${prestigeSignal.toFixed(3)}`);
    }

    // SIGNAL 2: Archetype Affinity
    console.log(`\n  SIGNAL 2: Archetype Affinity (cap: ${CAP_AFFINITY})`);
    if (char.affinityIndex && char.affinityIndex[cand.id]) {
      const affinityEntry = char.affinityIndex[cand.id];
      console.log(`    Found in affinity index!`);
      console.log(`    Confidence: ${(affinityEntry.confidence * 100).toFixed(0)}%`);
      console.log(`    Frequency: ${affinityEntry.frequency}/${char.maxFrequency}`);

      if (affinityEntry.confidence > 0.40) {
        console.log(`    ✓ Confidence > 0.40 threshold → boost applied`);

        const freq = affinityEntry.frequency;
        const maxFreq = char.maxFrequency;
        const logRatio = Math.log(freq) / Math.log(maxFreq);
        const freqModifier = 1 + (logRatio * 0.35);

        console.log(`    \n    Frequency Modifier Calculation:`);
        console.log(`      log(${freq}) / log(${maxFreq}) = ${logRatio.toFixed(3)}`);
        console.log(`      1 + (${logRatio.toFixed(3)} × 0.35) = ${freqModifier.toFixed(3)}`);

        // Affinity alignment
        let alignment = 1.0;
        if (affinityEntry.roleAffinity) {
          const roleBias = char.mechanicalBias.roles || {};
          let total = 0;
          let weight = 0;

          console.log(`    \n    Role Alignment Calculation:`);
          console.log(`      Character roles: ${Object.entries(roleBias).map(([r, v]) => `${r}:${(v*100).toFixed(0)}%`).join(', ')}`);
          console.log(`      Item roles: ${Object.entries(affinityEntry.roleAffinity).map(([r, v]) => `${r}:${(v*100).toFixed(0)}%`).join(', ')}`);

          for (const [role, aff] of Object.entries(affinityEntry.roleAffinity)) {
            const b = roleBias[role] || 0;
            total += aff * b;
            weight += Math.abs(aff);
            console.log(`        ${role}: ${aff.toFixed(2)} × ${b.toFixed(2)} = ${(aff * b).toFixed(3)}`);
          }

          if (weight > 0) {
            alignment = Math.max(0.5, Math.min(1.25, total / weight));
            console.log(`      Total: ${total.toFixed(3)} / Weight: ${weight.toFixed(3)} = Alignment: ${alignment.toFixed(3)}`);
          }
        }

        const baseAffinity = affinityEntry.confidence;
        const raw = baseAffinity * freqModifier * alignment;
        const affinitySignal = Math.min(CAP_AFFINITY, raw);

        console.log(`    \n    Final Calculation:`);
        console.log(`      base(${baseAffinity.toFixed(3)}) × freqMod(${freqModifier.toFixed(3)}) × align(${alignment.toFixed(3)}) = ${raw.toFixed(4)}`);
        console.log(`      min(${CAP_AFFINITY}, ${raw.toFixed(4)}) = ${affinitySignal.toFixed(4)}`);

        signals.affinity = affinitySignal;
        identityScore += affinitySignal;
      } else {
        console.log(`    ✗ Confidence ${(affinityEntry.confidence * 100).toFixed(0)}% < 0.40 threshold → no boost`);
      }
    } else {
      console.log(`    ✗ Not in affinity index → no boost`);
    }

    // SIGNAL 3: Chain Continuation
    console.log(`\n  SIGNAL 3: Chain Continuation (cap: ${CAP_CHAIN})`);
    if (cand.chainTheme && cand.parentId) {
      console.log(`    Chain info: theme="${cand.chainTheme}", parentId="${cand.parentId}", tier=${cand.chainTier}`);

      if (char.ownedItems[cand.parentId]) {
        console.log(`    ✓ Parent item OWNED by character`);

        const chainTheme = cand.chainTheme;
        const themeAffinity = char.mechanicalBias[chainTheme] || 0;

        console.log(`    Theme affinity ("${chainTheme}"): ${(themeAffinity * 100).toFixed(0)}%`);

        if (themeAffinity > 0.3) {
          console.log(`    ✓ Affinity ${(themeAffinity * 100).toFixed(0)}% > 0.3 threshold → boost applied`);

          const tier = cand.chainTier;
          const tierWeight = Math.max(0.25, 1 / tier);
          const baseBonus = 0.10;
          const raw = baseBonus * themeAffinity * tierWeight;
          const continuationSignal = Math.min(CAP_CHAIN, raw);

          console.log(`    \n    Tier Weight Calculation:`);
          console.log(`      max(0.25, 1/${tier}) = ${tierWeight.toFixed(3)}`);
          console.log(`      ${baseBonus} × ${themeAffinity.toFixed(2)} × ${tierWeight.toFixed(3)} = ${raw.toFixed(4)}`);
          console.log(`      min(${CAP_CHAIN}, ${raw.toFixed(4)}) = ${continuationSignal.toFixed(4)}`);

          signals.chain = continuationSignal;
          identityScore += continuationSignal;
        } else {
          console.log(`    ✗ Affinity ${(themeAffinity * 100).toFixed(0)}% < 0.3 threshold → no boost`);
        }
      } else {
        console.log(`    ✗ Parent "${cand.parentId}" not owned → no boost`);
      }
    } else {
      console.log(`    ✗ Not a chain item → no boost`);
    }

    // SIGNAL 4: Identity Flexibility
    console.log(`\n  SIGNAL 4: Identity Flexibility (cap: ${CAP_FLEXIBILITY})`);
    signals.flexibility = CAP_FLEXIBILITY;
    identityScore += CAP_FLEXIBILITY;
    console.log(`    Always applied: +${CAP_FLEXIBILITY}`);

    // Cap identity total
    identityScore = Math.min(CAP_TOTAL, identityScore);

    console.log(`\n  Identity Signal Breakdown:`);
    Object.entries(signals).forEach(([name, value]) => {
      const bar = '▓'.repeat(Math.round(value * 40)) + '░'.repeat(40 - Math.round(value * 40));
      console.log(`    ${name.padEnd(15)}: ${value.toFixed(4)} [${bar}]`);
    });

    console.log(`  \n  Sum: ${Object.values(signals).reduce((a, b) => a + b, 0).toFixed(4)}`);
    console.log(`  Capped at ${CAP_TOTAL}: ${identityScore.toFixed(4)}`);
    console.log(`\n  Final Identity Score: ${identityScore.toFixed(4)}`);

    // ────────────────────────────────────────────────────────────────
    // STEP 4: FINAL SCORE (3-Horizon Formula)
    // ────────────────────────────────────────────────────────────────
    console.log('\n📍 STEP 4: scoreCandidate() - 3-Horizon Weighted Average');
    console.log('─'.repeat(90));

    const weights = {
      immediate: 0.60,
      shortTerm: 0.25,
      identity: 0.15
    };

    const finalScore = Math.min(1.0,
      (immediateScore * weights.immediate) +
      (shortTermScore * weights.shortTerm) +
      (identityScore * weights.identity)
    );

    console.log(`\n  Horizon Weights:`);
    console.log(`    Immediate (tactical):  ${weights.immediate} × ${immediateScore.toFixed(2)} = ${(immediateScore * weights.immediate).toFixed(4)}`);
    console.log(`    Short-Term (prestige): ${weights.shortTerm} × ${shortTermScore.toFixed(2)} = ${(shortTermScore * weights.shortTerm).toFixed(4)}`);
    console.log(`    Identity (strategic):  ${weights.identity} × ${identityScore.toFixed(4)} = ${(identityScore * weights.identity).toFixed(4)}`);

    console.log(`\n  Calculation:`);
    console.log(`    (${immediateScore.toFixed(2)} × 0.60) + (${shortTermScore.toFixed(2)} × 0.25) + (${identityScore.toFixed(4)} × 0.15)`);
    console.log(`    = ${(immediateScore * weights.immediate).toFixed(4)} + ${(shortTermScore * weights.shortTerm).toFixed(4)} + ${(identityScore * weights.identity).toFixed(4)}`);
    console.log(`    = ${finalScore.toFixed(4)}`);

    console.log(`\n  ╔════════════════════════════════════════════════════════════╗`);
    console.log(`  ║                  FINAL SCORE: ${finalScore.toFixed(4)}                       ║`);
    console.log(`  ╚════════════════════════════════════════════════════════════╝`);

    return {
      immediate: immediateScore,
      shortTerm: shortTermScore,
      identity: identityScore,
      final: finalScore,
      signals
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// CHARACTER & CANDIDATE DATA
// ─────────────────────────────────────────────────────────────────

// Simplified character for walkthrough
const jediCharacter = {
  name: 'Human Jedi 3',
  level: 3,
  classes: ['Jedi'],
  primaryAbility: 'str',
  abilities: {
    str: { score: 15, modifier: 2 },
    dex: { score: 13, modifier: 1 },
    con: { score: 14, modifier: 2 },
    int: { score: 10, modifier: 0 },
    wis: { score: 8, modifier: -1 },
    cha: { score: 13, modifier: 1 }
  },
  maxFrequency: 8,
  prestigeAffinities: [
    { prestige: 'Jedi Master', confidence: 0.95 },
    { prestige: 'Sith Lord', confidence: 0.70 }
  ],
  mechanicalBias: {
    lightsaber: 0.85,
    force: 0.75,
    defense: 0.80,
    melee: 0.90,
    roles: {
      warrior: 0.90,
      protector: 0.85
    }
  },
  affinityIndex: {
    'weapon-focus-lightsaber': {
      frequency: 7,
      confidence: 0.875,
      roleAffinity: { warrior: 1.0, protector: 0.8 }
    },
    'combat-expertise': {
      frequency: 6,
      confidence: 0.75,
      roleAffinity: { warrior: 0.9, protector: 1.0 }
    },
    'block-force': {
      frequency: 8,
      confidence: 1.0,
      roleAffinity: { protector: 1.0, warrior: 0.5 }
    }
  },
  ownedItems: {
    'weapon-proficiency-lightsaber': true
  }
};

const nobleMulitclass = {
  name: 'Twi\'lek Noble/Officer',
  level: 7,
  classes: ['Noble', 'Scoundrel', 'Officer'],
  primaryAbility: 'cha',
  abilities: {
    str: { score: 6, modifier: -2 },
    dex: { score: 13, modifier: 1 },
    con: { score: 14, modifier: 2 },
    int: { score: 14, modifier: 2 },
    wis: { score: 10, modifier: 0 },
    cha: { score: 22, modifier: 6 }
  },
  maxFrequency: 6,
  prestigeAffinities: [
    { prestige: 'Officer', confidence: 0.95 },
    { prestige: 'Scoundrel Leader', confidence: 0.90 }
  ],
  mechanicalBias: {
    leadership: 0.90,
    influence: 0.85,
    negotiation: 0.80,
    charisma: 0.95,
    roles: {
      leader: 0.95,
      diplomat: 0.90
    }
  },
  affinityIndex: {
    'skill-focus-persuasion': {
      frequency: 6,
      confidence: 1.0,
      roleAffinity: { leader: 1.0, diplomat: 1.0 }
    },
    'command-presence': {
      frequency: 6,
      confidence: 1.0,
      roleAffinity: { leader: 1.0, diplomat: 0.9 }
    }
  },
  ownedItems: {}
};

// Candidate items to evaluate
const CANDIDATES = {
  'weapon-focus-lightsaber': {
    id: 'weapon-focus-lightsaber',
    name: 'Weapon Focus (Lightsaber)',
    type: 'feat',
    synergy: 'melee',
    chainTheme: 'lightsaber',
    chainTier: 2,
    parentId: 'weapon-proficiency-lightsaber'
  },
  'combat-expertise': {
    id: 'combat-expertise',
    name: 'Combat Expertise',
    type: 'feat',
    synergy: 'melee',
    chainTheme: null,
    parentId: null
  },
  'block-force': {
    id: 'block-force',
    name: 'Block (Force)',
    type: 'talent',
    synergy: 'defense',
    chainTheme: null,
    parentId: null
  },
  'skill-focus-persuasion': {
    id: 'skill-focus-persuasion',
    name: 'Skill Focus (Persuasion)',
    type: 'feat',
    synergy: 'influence',
    chainTheme: null,
    parentId: null
  },
  'command-presence': {
    id: 'command-presence',
    name: 'Command Presence',
    type: 'feat',
    synergy: 'leadership',
    chainTheme: null,
    parentId: null
  }
};

// ─────────────────────────────────────────────────────────────────
// RUN WALKTHROUGHS
// ─────────────────────────────────────────────────────────────────

console.log(`
╔${'═'.repeat(88)}╗
║${'SUGGESTION ENGINE SCORING WALKTHROUGHS'.padEnd(88)}║
║${'Shows step-by-step calculations for each candidate evaluation'.padEnd(88)}║
╚${'═'.repeat(88)}╝
`);

// Jedi examples
console.log('\n\n' + '█'.repeat(90));
console.log('███ SCENARIO 1: Human Jedi 3 Evaluating Lightsaber Feats');
console.log('█'.repeat(90));

ScoringWalkthrough.scoreWithExplanation(
  'Weapon Focus (Lightsaber)',
  CANDIDATES['weapon-focus-lightsaber'],
  jediCharacter
);

ScoringWalkthrough.scoreWithExplanation(
  'Block (Force)',
  CANDIDATES['block-force'],
  jediCharacter
);

// Noble examples
console.log('\n\n' + '█'.repeat(90));
console.log('███ SCENARIO 2: Twi\'lek Noble/Officer Evaluating Leadership Feats');
console.log('█'.repeat(90));

ScoringWalkthrough.scoreWithExplanation(
  'Skill Focus (Persuasion)',
  CANDIDATES['skill-focus-persuasion'],
  nobleMulitclass
);

ScoringWalkthrough.scoreWithExplanation(
  'Command Presence',
  CANDIDATES['command-presence'],
  nobleMulitclass
);

console.log('\n\n' + '═'.repeat(90));
console.log('✅ SCORING WALKTHROUGHS COMPLETE');
console.log('═'.repeat(90) + '\n');
