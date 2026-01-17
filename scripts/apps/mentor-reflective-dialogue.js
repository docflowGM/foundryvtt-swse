/**
 * Mentor Reflective Dialogue System
 *
 * Implements the 7 reflective dialogue topics from the mentor framework:
 * 1. Who am I becoming? - Role reflection & identity
 * 2. What paths are open to me? - Class archetypes & soft commitment
 * 3. What am I doing well? - Synergy reinforcement & trust
 * 4. What am I doing wrong? - Course correction & challenges
 * 5. How should I fight? - Combat role framing
 * 6. What should I be careful of? - Trap & risk awareness
 * 7. What lies ahead? - Future planning & prestige target
 * 8. How would you play this class? - Mentor worldview & philosophy
 *
 * Uses mentor personality profiles to vary voice and approach per mentor.
 * Leverages mentor memory, DSP saturation, and role inference for personalization.
 */

import {
  calculateDspSaturation,
  getDspBand,
  getToneModifier,
  getWarningSeverity
} from '../engine/dsp-saturation.js';

import {
  getMentorMemory,
  setMentorMemory,
  inferRole,
  setCommittedPath,
  setTargetClass,
  updateInferredRole
} from '../engine/mentor-memory.js';

import {
  getArchetypePaths,
  getArchetype,
  analyzeSynergies,
  suggestAttributesForArchetype
} from '../engine/mentor-archetype-paths.js';

import { MENTOR_PERSONALITIES } from './mentor-suggestion-dialogues.js';
import { MENTORS } from './mentor-dialogues.js';

/**
 * Generate a reflective dialogue response for a mentor-actor pair
 *
 * @param {Actor} actor - The character
 * @param {string} mentorId - The mentor class key (e.g., "Jedi", "Scout")
 * @param {string} topicKey - The dialogue topic (e.g., "who_am_i_becoming")
 * @returns {Promise<object>} Dialogue object with observation, suggestion, respectClause
 */
export async function generateReflectiveDialogue(actor, mentorId, topicKey) {
  if (!actor || !mentorId) {
    return { observation: "", suggestion: "", respectClause: "" };
  }

  const mentor = MENTORS[mentorId];
  const personality = MENTOR_PERSONALITIES[mentorId];
  const memory = getMentorMemory(actor, mentorId.toLowerCase());

  // Update memory with current state
  updateInferredRole(memory, actor);

  const dspInfo = {
    saturation: calculateDspSaturation(actor),
    band: getDspBand(calculateDspSaturation(actor)),
    toneModifier: getToneModifier(getDspBand(calculateDspSaturation(actor)))
  };

  const dialogue = {
    topic: topicKey,
    mentorName: mentor?.name || "Your Mentor",
    personality: personality,
    dspContext: dspInfo,
    showPathCommitment: topicKey === 'paths_open',
    showTargetClass: topicKey === 'what_lies_ahead'
  };

  // Route to appropriate topic handler
  switch (topicKey) {
    case "who_am_i_becoming":
      dialogue.content = generateWhoAmIBecoming(actor, mentor, personality, memory, dspInfo);
      break;
    case "paths_open":
      dialogue.content = generatePathsOpen(actor, mentor, personality, memory, dspInfo);
      break;
    case "doing_well":
      dialogue.content = generateDoingWell(actor, mentor, personality, memory, dspInfo);
      break;
    case "doing_wrong":
      dialogue.content = generateDoingWrong(actor, mentor, personality, memory, dspInfo);
      break;
    case "how_should_i_fight":
      dialogue.content = generateHowShouldIFight(actor, mentor, personality, memory, dspInfo);
      break;
    case "be_careful":
      dialogue.content = generateBeCareful(actor, mentor, personality, memory, dspInfo);
      break;
    case "what_lies_ahead":
      dialogue.content = generateWhatLiesAhead(actor, mentor, personality, memory, dspInfo);
      break;
    case "how_would_you_play":
      dialogue.content = generateHowWouldYouPlay(actor, mentor, personality, memory, dspInfo);
      break;
    default:
      dialogue.content = { observation: "I see you seek guidance.", suggestion: "What troubles you?", respectClause: "Speak freely." };
  }

  // Save updated memory
  await setMentorMemory(actor, mentorId.toLowerCase(), memory);

  return dialogue;
}

// ============================================================================
// TOPIC: WHO AM I BECOMING?
// ============================================================================

function generateWhoAmIBecoming(actor, mentor, personality, memory, dspInfo) {
  const role = inferRole(actor);
  const phase = getPhase(actor.system.level);

  let observation = "";
  let suggestion = "";
  let respectClause = "";

  // Observation: Current state with DSP context
  const roleDesc = role.primary === 'guardian' ? 'guardian—steadfast, protective' :
                   role.primary === 'striker' ? 'striker—swift, aggressive' :
                   'controller—wise, commanding';

  if (dspInfo.saturation < 0.2) {
    observation = getMentorVoice(personality, "observation",
      `You are becoming a ${roleDesc}, walking in the light of purpose.`);
  } else if (dspInfo.saturation < 0.4) {
    observation = getMentorVoice(personality, "observation",
      `You are becoming a ${roleDesc}, though shadows gather around your path.`);
  } else if (dspInfo.saturation < 0.6) {
    observation = getMentorVoice(personality, "observation",
      `You are becoming a ${roleDesc}, but the darkness whispers at your heels.`);
  } else {
    observation = getMentorVoice(personality, "observation",
      `You are becoming a ${roleDesc}, yet the darkness threatens to eclipse that identity.`);
  }

  // Suggestion: Role-specific insight
  const roleInsights = {
    guardian: "Your instinct is to protect. Lean into that strength. Cultivate durability, tactics, and presence.",
    striker: "Your instinct is to strike decisively. Channel that force into precision and momentum.",
    controller: "Your instinct is to command the flow of power. Develop awareness, technique, and will."
  };

  suggestion = getMentorVoice(personality, "suggestion", roleInsights[role.primary] || roleInsights.guardian);

  // Respect clause: Acknowledge uncertainty
  if (memory.roleConfidence < 0.6) {
    respectClause = getMentorVoice(personality, "respectClause",
      "Your path still shifts beneath your feet. This will become clearer as you progress.");
  } else {
    respectClause = getMentorVoice(personality, "respectClause",
      "But you walk your own path. Trust what resonates with your spirit.");
  }

  return { observation, suggestion, respectClause };
}

// ============================================================================
// TOPIC: WHAT PATHS ARE OPEN TO ME?
// ============================================================================

function generatePathsOpen(actor, mentor, personality, memory, dspInfo) {
  const baseClass = Array.from(actor.items)
    .filter(i => i.type === 'class')
    .sort((a, b) => (a.system?.level || 0) - (b.system?.level || 0))[0];

  const className = baseClass?.name || "Unknown";
  const archetypes = getArchetypePaths(className);

  let observation = getMentorVoice(personality, "observation",
    `Among the ${className}, there are several distinct paths. Each demands something different of you.`);

  // Build path descriptions
  const pathDescriptions = Object.entries(archetypes).map(([key, archetype]) => {
    return `• **${archetype.displayName}**: ${archetype.description}\n  _${archetype.warning}_`;
  }).join('\n\n');

  let suggestion = pathDescriptions;
  if (personality?.verbosity === "minimal") {
    // Minimal mentors just give the briefest description
    const firstPath = Object.values(archetypes)[0];
    suggestion = `${firstPath.displayName}: ${firstPath.description}`;
  }

  let respectClause = getMentorVoice(personality, "respectClause",
    "You may walk one of these paths deliberately, or drift between them—but drifting has its own cost.");

  return { observation, suggestion, respectClause };
}

// ============================================================================
// TOPIC: WHAT AM I DOING WELL?
// ============================================================================

function generateDoingWell(actor, mentor, personality, memory, dspInfo) {
  // If player has committed to a path, analyze synergies with that archetype
  let synergies = { strong: [], weak: [] };

  if (memory.committedPath) {
    const baseClass = Array.from(actor.items)
      .filter(i => i.type === 'class')
      .sort((a, b) => (b.system?.level || 0) - (a.system?.level || 0))[0];

    if (baseClass) {
      const archetype = getArchetype(baseClass.name, memory.committedPath);
      if (archetype) {
        synergies = analyzeSynergies(actor, archetype);
      }
    }
  }

  let observation = getMentorVoice(personality, "observation",
    `I see strength in your choices. Your ${memory.inferredRole || 'approach'} shows promise.`);

  let suggestion = "";
  if (synergies.strong.length > 0) {
    const topSynergy = synergies.strong[0];
    suggestion = getMentorVoice(personality, "suggestion",
      `${topSynergy}. Your path shows coherence.`);
  } else {
    const talents = actor.items.filter(i => i.type === 'talent').map(t => t.name);
    const feats = actor.items.filter(i => i.type === 'feat').map(f => f.name);

    if (talents.length > 0) {
      suggestion = getMentorVoice(personality, "suggestion",
        `The talents you have acquired show intentionality. They reinforce one another.`);
    } else if (feats.length > 0) {
      suggestion = getMentorVoice(personality, "suggestion",
        `Your feat selections demonstrate growing self-awareness. This serves you well.`);
    } else {
      suggestion = getMentorVoice(personality, "suggestion",
        "Your choices so far show coherence. You are building something worthwhile.");
    }
  }

  let respectClause = getMentorVoice(personality, "respectClause",
    "Continue trusting your instincts. You are on the right path.");

  // Update memory: increase trust on positive feedback
  memory.trust = Math.min(1.0, memory.trust + 0.1);

  return { observation, suggestion, respectClause };
}

// ============================================================================
// TOPIC: WHAT AM I DOING WRONG?
// ============================================================================

function generateDoingWrong(actor, mentor, personality, memory, dspInfo) {
  const gaps = detectBuildGaps(actor, memory);

  // If player has committed to a path, highlight weaknesses in that path
  let weaknesses = [];
  if (memory.committedPath) {
    const baseClass = Array.from(actor.items)
      .filter(i => i.type === 'class')
      .sort((a, b) => (b.system?.level || 0) - (a.system?.level || 0))[0];

    if (baseClass) {
      const archetype = getArchetype(baseClass.name, memory.committedPath);
      if (archetype) {
        const synergies = analyzeSynergies(actor, archetype);
        weaknesses = synergies.weak;
      }
    }
  }

  let observation = getMentorVoice(personality, "observation",
    weaknesses.length > 0
      ? "Your path shows promise, but it has gaps."
      : (gaps.summary || "Your path shows some inconsistencies."));

  let suggestion = "";
  if (weaknesses.length > 0) {
    const mainWeakness = weaknesses[0];
    suggestion = getMentorVoice(personality, "suggestion",
      `${mainWeakness}. This will limit your effectiveness unless addressed.`);
  } else if (gaps.details.length > 0) {
    suggestion = getMentorVoice(personality, "suggestion", gaps.details[0]);
  } else {
    suggestion = getMentorVoice(personality, "suggestion",
      "I see no critical errors, but vigilance is always warranted.");
  }

  // Respect clause: Offer course correction without blame
  let respectClause = "";
  if (dspInfo.saturation > 0.4) {
    respectClause = getMentorVoice(personality, "respectClause",
      "These gaps invite the darkness. Address them with intention.");
  } else {
    respectClause = getMentorVoice(personality, "respectClause",
      "These gaps can still be bridged. The choice is yours.");
  }

  return { observation, suggestion, respectClause };
}

// ============================================================================
// TOPIC: HOW SHOULD I FIGHT?
// ============================================================================

function generateHowShouldIFight(actor, mentor, personality, memory, dspInfo) {
  const role = memory.inferredRole || inferRole(actor).primary;

  let observation = getMentorVoice(personality, "observation",
    `In combat, your nature calls you toward the role of the ${role}.`);

  const combatAdvice = {
    guardian: {
      advice: "Place yourself between your allies and danger. Use positioning, protection, and endurance to control the flow of battle. Your greatest strength is in what you prevent, not what you inflict.",
      focus: "Defenses, position, sacrifice"
    },
    striker: {
      advice: "Strike with precision and momentum. Eliminate threats before they threaten. Your goal is swift resolution through decisive action. Economy of motion, maximum impact.",
      focus: "Mobility, offense, timing"
    },
    controller: {
      advice: "Command the battlefield from within. Influence enemies, guide allies, shape the outcome. Your power lies in knowledge, prediction, and will. You need not strike the killing blow to decide the battle.",
      focus: "Awareness, technique, will"
    }
  };

  const advice = combatAdvice[role] || combatAdvice.guardian;
  let suggestion = getMentorVoice(personality, "suggestion", advice.advice);

  let respectClause = getMentorVoice(personality, "respectClause",
    `Focus on your strengths—${advice.focus}. Adapt as the battle demands.`);

  return { observation, suggestion, respectClause };
}

// ============================================================================
// TOPIC: WHAT SHOULD I BE CAREFUL OF?
// ============================================================================

function generateBeCareful(actor, mentor, personality, memory, dspInfo) {
  const risks = identifyRisks(actor, memory, dspInfo);

  let observation = getMentorVoice(personality, "observation", risks.summary);

  let suggestion = "";
  if (risks.primary) {
    suggestion = getMentorVoice(personality, "suggestion", risks.primary);
  }

  let respectClause = "";
  if (dspInfo.saturation >= 0.6) {
    respectClause = getMentorVoice(personality, "respectClause",
      "The darkness feeds on the very imbalances you carry. Be vigilant.");
  } else {
    respectClause = getMentorVoice(personality, "respectClause",
      "Awareness itself is the best defense. Stay mindful.");
  }

  return { observation, suggestion, respectClause };
}

// ============================================================================
// TOPIC: WHAT LIES AHEAD?
// ============================================================================

function generateWhatLiesAhead(actor, mentor, personality, memory, dspInfo) {
  const currentClasses = Array.from(actor.items)
    .filter(i => i.type === 'class')
    .map(c => c.name);

  let observation = getMentorVoice(personality, "observation",
    `The path ahead opens new possibilities for those ready to claim them.`);

  let suggestion = "";
  if (!memory.targetClass) {
    suggestion = getMentorVoice(personality, "suggestion",
      "Have you considered which prestige class might call to you? The choice shapes everything that follows.");
  } else {
    suggestion = getMentorVoice(personality, "suggestion",
      `You have set your sight on ${memory.targetClass}. Continue meeting its prerequisites with intention.`);
  }

  let respectClause = getMentorVoice(personality, "respectClause",
    "The future belongs to those who shape it with purpose. What do you choose to become?");

  return { observation, suggestion, respectClause };
}

// ============================================================================
// TOPIC: HOW WOULD YOU PLAY THIS CLASS?
// ============================================================================

function generateHowWouldYouPlay(actor, mentor, personality, memory, dspInfo) {
  const currentClass = Array.from(actor.items)
    .filter(i => i.type === 'class')
    .sort((a, b) => (b.system?.level || 0) - (a.system?.level || 0))[0];

  let observation = getMentorVoice(personality, "observation",
    `You ask how I would play a ${currentClass?.name || 'warrior'}. Let me show you.`);

  // Mentor philosophy bleed-through
  const philosophies = {
    "Miraj": "I would walk with balance—seeking knowledge and restraint. Every action would serve the greater good, not personal glory.",
    "Lead": "I would move like shadow. Quiet, efficient, lethal when necessary. Information wins wars; violence merely executes victories already won.",
    "Ol' Salty": "I'd have a grand time! Adventure, profit, legend—take 'em all! Work smart, play dastardly, and never let 'em catch you!",
    "J0-N1": "I would operate with systematic precision. Protocol guides all; chaos is inefficiency. Adapt as the situation optimizes.",
    "Breach": "Objectives. Completion. Everything else is noise. Move forward. Do the job. Survive to take the next contract."
  };

  let suggestion = getMentorVoice(personality, "suggestion",
    philosophies[mentor?.name] || "I would play to my strengths and trust my instincts.");

  let respectClause = getMentorVoice(personality, "respectClause",
    "But that is my path. Yours will be your own, shaped by your choices and your heart.");

  return { observation, suggestion, respectClause };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the phase of progression (Early, Mid, Late)
 */
function getPhase(level) {
  if (level <= 5) return "early";
  if (level <= 12) return "mid";
  return "late";
}

/**
 * Apply mentor personality to dialogue generation
 */
function getMentorVoice(personality, layer, baseText) {
  if (!personality) return baseText;

  const traits = personality.traits || [];

  // Minimal mentors: shorter text
  if (personality.verbosity === "minimal") {
    if (baseText.length > 100) {
      return baseText.substring(0, 80) + "...";
    }
  }

  // Verbose mentors: add flourish
  if (personality.verbosity === "verbose" && layer === "observation") {
    if (traits.includes("philosophical")) {
      return `${baseText} I have walked this road before, and I see patterns you have yet to perceive.`;
    }
    if (traits.includes("spiritual")) {
      return `${baseText} The Force speaks to me of your nature.`;
    }
  }

  return baseText;
}

// NOTE: getArchetypePaths is now imported from mentor-archetype-paths.js

/**
 * Detect build gaps
 */
function detectBuildGaps(actor, memory) {
  const gaps = [];

  if (!memory.inferredRole) {
    gaps.push("Your build lacks coherent identity. Consider what role you wish to play.");
  }

  const talents = actor.items.filter(i => i.type === 'talent').length;
  const feats = actor.items.filter(i => i.type === 'feat').length;

  if (talents === 0 && actor.system.level >= 6) {
    gaps.push("You have few talents for your level. Consider developing a talent tree.");
  }

  if (feats === 0 && actor.system.level >= 3) {
    gaps.push("Limited feat selection limits your options. Diversify your abilities.");
  }

  return {
    summary: gaps.length > 0 ? gaps[0] : "Your path shows some inconsistencies.",
    details: gaps
  };
}

/**
 * Identify risks based on current state
 */
function identifyRisks(actor, memory, dspInfo) {
  const risks = [];

  if (dspInfo.saturation >= 0.4) {
    risks.push("The darkness presses upon you. Each choice risks drawing you further into shadow.");
  }

  // Over-specialization
  const role = memory.inferredRole;
  if (role === 'striker' && (actor.system.attributes?.con?.base || 10) <= 11) {
    risks.push("You walk a striker's path with fragile constitution. One strong blow could end you.");
  }

  if (role === 'guardian' && (actor.system.attributes?.wis?.base || 10) <= 10) {
    risks.push("You stand as guardian, yet lack wisdom to read threats. This is dangerous.");
  }

  return {
    summary: risks.length > 0 ? risks[0] : "Be mindful of imbalance.",
    primary: risks[0] || "Stay vigilant against complacency."
  };
}

/**
 * Get the top skill by modifier
 */
function getTopSkill(actor) {
  const skills = actor.system.skills || {};
  let topSkill = "a learned skill";
  let topMod = 0;

  for (const [key, skill] of Object.entries(skills)) {
    if (skill.mod > topMod) {
      topMod = skill.mod;
      topSkill = key;
    }
  }

  return topSkill;
}

/**
 * Export for testing/console access
 */
export const MentorReflectiveDialogue = {
  generateReflectiveDialogue,
  generateWhoAmIBecoming,
  generatePathsOpen,
  generateDoingWell,
  generateDoingWrong,
  generateHowShouldIFight,
  generateBeCareful,
  generateWhatLiesAhead,
  generateHowWouldYouPlay
};
