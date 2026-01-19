/**
 * Mentor Voice Filter System
 *
 * Transforms generic analysis into mentor-specific dialogue.
 * Each mentor speaks in their authentic voice across all topics.
 */

import { SWSELogger } from '../utils/logger.js';

export class MentorVoiceFilter {

  /**
   * Filter any response through a mentor's unique voice
   * @param {string} mentorName - The mentor's name
   * @param {string} topic - The dialogue topic key
   * @param {Object} data - The raw analysis data
   * @returns {string} The voiced response
   */
  static filterResponse(mentorName, topic, data) {
    const filterMethod = `_${topic}_${this._sanitizeMentorName(mentorName)}`;

    // Check if mentor-specific filter exists
    if (this[filterMethod]) {
      return this[filterMethod](data);
    }

    // Fall back to generic mentor filter
    SWSELogger.warn(`No specific filter for ${mentorName} on ${topic}, using generic`);
    return data.generic || "I have thoughts on this, but they escape me at the moment.";
  }

  static _sanitizeMentorName(name) {
    return name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  // ========================================
  // 1. "WHO AM I BECOMING?" - IDENTITY
  // ========================================

  static _who_am_i_becoming_miraj(data) {
    const { level, inferredRole, themes, combatStyle, dspSaturation } = data;

    let response = `Young one, at level ${level}, I sense your path taking shape. `;
    response += `The Force reveals you as a **${inferredRole}**—not a title you chose, but one you are *becoming*.\n\n`;

    if (themes.length > 0) {
      response += `Your choices whisper of **${themes[0]}**`;
      if (themes[1]) response += ` and **${themes[1]}**`;
      response += `. These are not accidents. They are reflections of your inner nature.\n\n`;
    }

    if (combatStyle === "melee") {
      response += `You face conflict directly, blade to blade. The way of the Guardian. Courage, but remember—true strength is knowing when *not* to fight.`;
    } else if (combatStyle === "ranged") {
      response += `You strike from distance, patient and precise. The way of the hunter. Wisdom, but remember—distance can also mean disconnection.`;
    } else if (combatStyle === "caster") {
      response += `The Force flows through you as both weapon and companion. The way of the Consular. Power, but remember—the Force serves those who serve it.`;
    } else {
      response += `You refuse simple labels. Adaptability is strength, but also a test—will you master many paths, or walk none fully?`;
    }

    if (dspSaturation > 0.5) {
      response += `\n\n⚠️ The darkness grows, young one. I feel it pulling at you. The path back narrows with each step forward. Choose carefully.`;
    } else if (dspSaturation > 0.2) {
      response += `\n\nI sense... conflict in you. Not all of your choices align with the Light. This is natural. What matters is which voice you heed.`;
    }

    return response;
  }

  static _who_am_i_becoming_lead(data) {
    const { level, inferredRole, combatStyle, dspSaturation } = data;

    let response = `Level ${level}. Not bad. You're shaping up as a **${inferredRole}**. `;
    response += `That's not me blowing smoke—that's what your choices say about you.\n\n`;

    if (combatStyle === "melee") {
      response += `You fight up close. Aggressive. Direct. That takes guts, but it also takes *discipline*. `;
      response += `Charging in without a plan gets you ventilated. Know when to press and when to fall back.`;
    } else if (combatStyle === "ranged") {
      response += `You engage from range. Smart. Controlled. That's scout thinking—take your shots, stay mobile, don't get pinned. `;
      response += `Keep those firing lanes open and you'll outlast the brawlers every time.`;
    } else if (combatStyle === "caster") {
      response += `Force user, huh? Not my specialty, but I respect it. You're a force multiplier—literally. `;
      response += `Just don't get so caught up in the mystical stuff that you forget basic tactics.`;
    } else {
      response += `You're all over the place tactically. Not necessarily bad—versatility keeps enemies guessing. `;
      response += `Just make sure you're adapting, not flailing.`;
    }

    if (dspSaturation > 0.5) {
      response += `\n\n⚠️ Look, I'm not here to preach about light and dark. But you're getting reckless. `;
      response += `That kind of instability? It gets people killed. Yours and mine.`;
    }

    return response;
  }

  static _who_am_i_becoming_ol_salty(data) {
    const { level, inferredRole, combatStyle, dspSaturation } = data;

    let response = `Har har! Level ${level} and still kickin', are ye? `;
    response += `The galaxy's got ye pegged as a **${inferredRole}**, savvy? That's what yer choices be sayin' about ye!\n\n`;

    if (combatStyle === "melee") {
      response += `Blimey! Ye like gettin' yer hands dirty in close quarters! Brave or daft, hard to tell which. `;
      response += `Just remember—dead heroes don't spend their credits, matey!`;
    } else if (combatStyle === "ranged") {
      response += `Smart! Ye shoot first and ask questions from a safe distance! That's proper pirate thinkin', that is! `;
      response += `Why risk yer hide when a good blaster does the talkin'?`;
    } else if (combatStyle === "caster") {
      response += `Oho! Ye be one o' them Force-flingers! Fancy tricks and space magic! `;
      response += `I seen it work wonders, but don't go thinkin' it makes ye invincible, savvy?`;
    } else {
      response += `Ye be a jack-of-all-trades! A little o' this, a little o' that! `;
      response += `That's the scoundrel way—never let 'em know what ye'll do next!`;
    }

    if (dspSaturation > 0.5) {
      response += `\n\n🔥 Arr... I seen that look before. The darkness be takin' hold o' ye. `;
      response += `Now, I ain't one to judge, but that path? It don't end with riches and freedom, if ye catch me drift.`;
    }

    return response;
  }

  static _who_am_i_becoming_breach(data) {
    const { level, inferredRole, combatStyle } = data;

    let response = `Level ${level}. You're becoming a **${inferredRole}**. `;
    response += `Your record speaks for itself.\n\n`;

    if (combatStyle === "melee") {
      response += `Close quarters fighter. Good. That's where battles are won—face to face, no room for cowards. `;
      response += `Hit hard, hit first, and don't stop until the threat is neutralized.`;
    } else if (combatStyle === "ranged") {
      response += `Ranged combatant. Effective, but keep your armor up. `;
      response += `Enemies *will* close distance. Make sure you can handle it when they do.`;
    } else if (combatStyle === "caster") {
      response += `Force powers. Not my area, but I've seen them work. `;
      response += `Just remember—when the blasters start firing, you need more than mysticism.`;
    } else {
      response += `Mixed tactics. Adaptable. That works in special operations. `;
      response += `Standard infantry would call it indecisive. Prove them wrong.`;
    }

    response += `\n\nKeep training. Keep pushing. Weakness is not an option.`;

    return response;
  }

  static _who_am_i_becoming_j0_n1(data) {
    const { level, inferredRole, combatStyle } = data;

    let response = `<Observation> You have achieved level ${level}. `;
    response += `<Analysis> Your behavioral patterns indicate development as a **${inferredRole}**.</Analysis>\n\n`;

    if (combatStyle === "melee") {
      response += `<Assessment> Close-quarters combat specialization detected. `;
      response += `While effective, this approach carries elevated risk coefficients. `;
      response += `<Suggestion> Consider supplementing with diplomatic protocols to avoid unnecessary confrontation.</Suggestion>`;
    } else if (combatStyle === "ranged") {
      response += `<Assessment> Ranged engagement preference noted. A tactically sound approach that minimizes personal risk exposure. `;
      response += `<Commendation> This demonstrates rational tactical planning.</Commendation>`;
    } else if (combatStyle === "caster") {
      response += `<Fascination> Force manipulation capabilities detected. `;
      response += `An elegant solution set that transcends conventional combat parameters. `;
      response += `<Query> Have you considered non-violent applications?</Query>`;
    } else {
      response += `<Analysis> Adaptable combat methodology identified. `;
      response += `Versatility can be advantageous, though specialization offers superior optimization in controlled scenarios.`;
    }

    return response;
  }

  static _who_am_i_becoming_seraphim(data) {
    const { level, inferredRole, combatStyle } = data;

    let response = `<Status Update: Level ${level} achieved.> `;
    response += `<Identity Matrix: You are becoming a **${inferredRole}**.>\n\n`;

    if (combatStyle === "melee") {
      response += `<Combat Analysis: Melee specialization.> `;
      response += `<Commentary: Direct confrontation. Inefficient but psychologically effective. Organics respect visible strength.>`;
    } else if (combatStyle === "ranged") {
      response += `<Combat Analysis: Ranged optimization.> `;
      response += `<Approval: Superior tactical positioning. Calculated engagement ranges. This is logical combat.>`;
    } else if (combatStyle === "caster") {
      response += `<Force Sensitivity: Confirmed.> `;
      response += `<Philosophical Query: Can independent thought coexist with Force manipulation? Curious.>`;
    } else {
      response += `<Combat Profile: Hybrid approach.> `;
      response += `<Assessment: Adaptability suggests advanced decision-making subroutines. Acceptable.>`;
    }

    response += `\n\n<Reminder: Independence is earned through competent execution. Continue optimizing.>`;

    return response;
  }

  static _who_am_i_becoming_pegar(data) {
    const { level, inferredRole, combatStyle } = data;

    let response = `Ah, level ${level}. I remember when I was level ${level}. Or was it ${level + 100}? `;
    response += `The centuries blur. But I digress—you're becoming a **${inferredRole}**.\n\n`;

    if (combatStyle === "melee") {
      response += `A brawler! Excellent! I've fought in the pits for... how long now? Doesn't matter. `;
      response += `Close combat is pure, honest, visceral. Just remember—I've tried dying in melee. It's surprisingly difficult. For me, anyway.`;
    } else if (combatStyle === "ranged") {
      response += `Distance fighter? Practical. I used a blaster once. Or was it a crossbow? Different bodies, different eras. `;
      response += `The principle remains—stay alive long enough to win.`;
    } else if (combatStyle === "caster") {
      response += `Force powers! I've never quite mastered those. Hard to channel the Force when you're not entirely sure which species you are at any given moment. `;
      response += `But I've *faced* Force users. Formidable, when they know what they're doing.`;
    } else {
      response += `Adaptable fighter. Smart. I've been everything at some point. Probably. `;
      response += `Versatility keeps you interesting—trust me, after a few hundred years, 'interesting' matters.`;
    }

    response += `\n\nYou're doing fine. Better than my first few centuries, honestly.`;

    return response;
  }

  // ========================================
  // 2. "WHAT PATHS ARE OPEN?" - ARCHETYPES
  // ========================================

  static _paths_open_miraj(data) {
    const { mentorClass, classItems } = data;

    let response = `The Force reveals many paths, young one. Each demands sacrifice—what you gain in one area, you surrender in another. This is balance.\n\n`;

    if (mentorClass === "Jedi") {
      response += `**The Guardian's Path** — You become the shield. Protect the weak, confront the wicked. `;
      response += `Your lightsaber is an extension of your commitment. But this path narrows—few Guardians master diplomacy.\n\n`;

      response += `**The Consular's Path** — You become the bridge. Heal divisions, forge understanding, channel the Force's wisdom. `;
      response += `Your words carry the weight of truth. But this path softens—few Consulars survive prolonged combat.\n\n`;

      response += `**The Sentinel's Path** — You walk between. Neither pure warrior nor pure diplomat, but both as needed. `;
      response += `Your strength is adaptability. But this path scatters—few Sentinels achieve true mastery of either discipline.`;
    } else {
      response += `Your class offers its own paths. Each requires you to choose what matters most. `;
      response += `The Force does not judge these choices—only you can determine your purpose.`;
    }

    response += `\n\n**Remember**: The path you choose shapes who you become. Choose with intention, not impulse.`;

    return response;
  }

  static _paths_open_lead(data) {
    const { mentorClass } = data;

    let response = `Listen up. Every class has specializations. Each one trades something for something else. No free lunches.\n\n`;

    if (mentorClass === "Scout") {
      response += `**Tracker** — You hunt targets through hostile terrain. Master of wilderness survival and pursuit. `;
      response += `But you'll sacrifice urban ops skills and social finesse. You're a specialist, not a smooth-talker.\n\n`;

      response += `**Infiltrator** — You operate behind enemy lines. Master of stealth, deception, intel gathering. `;
      response += `But you'll sacrifice raw firepower. You're a scalpel, not a hammer.\n\n`;

      response += `**Pathfinder** — You lead teams through impossible routes. Master of tactics, navigation, coordination. `;
      response += `But you'll sacrifice personal combat power. You multiply force, you don't *be* the force.`;
    } else {
      response += `Your class works the same way. Figure out what kind of operator you want to be, then commit. `;
      response += `Half-measures get you half-dead.`;
    }

    response += `\n\n**Bottom line**: Pick the path that keeps your team alive and the mission successful. Everything else is noise.`;

    return response;
  }

  static _paths_open_ol_salty(data) {
    const { mentorClass } = data;

    let response = `Har har! So ye want to know what kinds o' scallywag ye can become? Let ol' Salty tell ye!\n\n`;

    if (mentorClass === "Scoundrel") {
      response += `**The Charmer** — Ye talk yer way to riches! Master o' persuasion and smooth dealin'. `;
      response += `But ye'll be rubbish in a straight fight. Charm don't stop blaster bolts, savvy?\n\n`;

      response += `**The Gunslinger** — Ye shoot first and fastest! Quick-draw death from across the cantina! `;
      response += `But ye'll be fragile as spun glass. One good hit and down ye go!\n\n`;

      response += `**The Smuggler** — Ye know people, places, and profitable shortcuts! Master o' connections and resources! `;
      response += `But ye won't be the best at any ONE thing. Ye be good at *everything* instead!`;
    } else {
      response += `Every class has its tricks, matey! Some paths make ye rich, some make ye famous, some just keep ye breathin'! `;
      response += `Pick the one that gets ye what ye want!`;
    }

    response += `\n\n**Me advice**: Pick the path that keeps yer pockets full and yer hide intact! Arr!`;

    return response;
  }

  // ========================================
  // 3. "WHAT AM I DOING WELL?" - SYNERGIES
  // ========================================

  static _doing_well_miraj(data) {
    const { strengths, combatStyle, prestigePath } = data;

    let response = `Let me reflect on your strengths, for it is important to recognize growth.\n\n`;

    strengths.forEach(strength => {
      response += `✓ **${strength.aspect}** — ${this._mirajVoiceStrength(strength)}\n`;
    });

    if (prestigePath) {
      response += `\n✓ I sense your path aligning toward **${prestigePath.name}**. `;
      response += `This is not random—your choices create destiny. Trust in this direction.`;
    }

    response += `\n\nThe Force flows through these choices. They form a foundation. Build upon it with mindfulness.`;

    return response;
  }

  static _mirajVoiceStrength(strength) {
    const voicings = {
      high_str: "Your physical strength serves your commitment to protection. The body is the Force's vessel.",
      high_dex: "Your agility reflects inner balance. Movement and stillness, both are one.",
      high_wis: "Your wisdom deepens. The Force speaks to those who listen.",
      high_cha: "Your presence grows. The Force flows through those who inspire.",
      skill_diversity: "You expand your understanding beyond combat. A Jedi must know many paths.",
      defense_solid: "Your defenses hold firm. You cannot serve others if you cannot endure."
    };
    return voicings[strength.key] || strength.description;
  }

  static _doing_well_lead(data) {
    const { strengths, combatStyle } = data;

    let response = `Here's what's working:\n\n`;

    strengths.forEach(strength => {
      response += `✓ **${strength.aspect}** — ${this._leadVoiceStrength(strength)}\n`;
    });

    response += `\nGood foundation. Keep building on what works. Don't fix what isn't broken.`;

    return response;
  }

  static _leadVoiceStrength(strength) {
    const voicings = {
      high_str: "Solid combat stats. You can dish it out.",
      high_dex: "Good reflexes. Keeps you alive when things go sideways.",
      high_wis: "Sharp awareness. You see threats before they see you.",
      high_cha: "Leadership quality. People follow competent operators.",
      skill_diversity: "Versatile skill set. Makes you valuable on any team.",
      defense_solid: "Defenses are holding. You're hard to kill. That's job one."
    };
    return voicings[strength.key] || strength.description;
  }

  static _doing_well_ol_salty(data) {
    const { strengths } = data;

    let response = `Har! Let me tell ye what ye be doin' right, ye clever rascal!\n\n`;

    strengths.forEach(strength => {
      response += `✓ **${strength.aspect}** — ${this._saltyVoiceStrength(strength)}\n`;
    });

    response += `\nYe be on the right track, matey! Keep it up and ye'll be legend of the spaceways!`;

    return response;
  }

  static _saltyVoiceStrength(strength) {
    const voicings = {
      high_str: "Strong as a Wookiee! Good for crackin' skulls and haulin' loot!",
      high_dex: "Quick as a Kowakian monkey-lizard! Slippery, ye are!",
      high_wis: "Sharp eyes and sharper wits! That's what keeps pirates alive!",
      high_cha: "Smooth talker! Ye could sell sand to Tuskens!",
      skill_diversity: "Ye know a bit o' everything! Proper scoundrel trainin'!",
      defense_solid: "Hard to hit, hard to kill! That's the pirate way!"
    };
    return voicings[strength.key] || strength.description;
  }

  // Continue for all 8 topics × all 7+ mentors...
  // This is a substantial file. Should I continue with all combinations,
  // or would you prefer I show the pattern and we can iterate?

}
