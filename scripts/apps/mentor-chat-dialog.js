/**
 * Mentor Chat Dialog
 *
 * Provides a direct interface for chatting with all mentors unlocked via class.
 * This is a direct interface with the suggestion engine, allowing mentors to
 * provide context-aware guidance in their unique voice.
 *
 * Usage:
 *   MentorChatDialog.show(actor);
 */

import { MENTORS, getMentorForClass } from './mentor-dialogues.js';
import { MentorSuggestionVoice } from './mentor-suggestion-voice.js';
import { BuildIntent } from '../engine/BuildIntent.js';
import { SWSELogger } from '../utils/logger.js';
import { MentorVoiceFilterV2 } from './mentor-voice-filter-v2.js';
import { MentorDialogueV2Integration } from './mentor-dialogue-v2-integration.js';
import { MentorStoryResolver } from '../engine/mentor-story-resolver.js';
import { MentorGoalDialog } from './mentor-goal-dialog.js';

const CHAT_TOPICS = [
  {
    key: "who_am_i_becoming",
    title: "Who am I becoming?",
    icon: "fa-mask",
    description: "Reflect on your evolving role and identity",
    contextType: "introduction",
    gatesAt: 1
  },
  {
    key: "paths_open",
    title: "What paths are open to me?",
    icon: "fa-signs-post",
    description: "Explore archetype directions within your class",
    contextType: "class_selection",
    gatesAt: 1
  },
  {
    key: "doing_well",
    title: "What am I doing well?",
    icon: "fa-thumbs-up",
    description: "Receive affirmation and analysis of your synergies",
    contextType: "introduction",
    gatesAt: 3
  },
  {
    key: "doing_wrong",
    title: "What am I doing wrong?",
    icon: "fa-triangle-exclamation",
    description: "Identify gaps and inconsistencies in your build",
    contextType: "introduction",
    gatesAt: 3
  },
  {
    key: "how_should_i_fight",
    title: "How should I fight?",
    icon: "fa-shield",
    description: "Learn your optimal combat role and battlefield positioning",
    contextType: "introduction",
    gatesAt: 5
  },
  {
    key: "be_careful",
    title: "What should I be careful of?",
    icon: "fa-warning",
    description: "Understand risks, traps, and over-specialization",
    contextType: "introduction",
    gatesAt: 5
  },
  {
    key: "what_lies_ahead",
    title: "What lies ahead?",
    icon: "fa-sparkles",
    description: "Explore prestige class options and future planning",
    contextType: "class_selection",
    gatesAt: 6
  },
  {
    key: "how_would_you_play",
    title: "How would you play this class?",
    icon: "fa-person",
    description: "Experience your mentor's personal philosophy and priorities",
    contextType: "introduction",
    gatesAt: 1
  },
  {
    key: "mentor_story",
    title: "What is your story?",
    icon: "fa-book",
    description: "Learn about your mentor's past and what shaped them",
    contextType: "narrative",
    gatesAt: 1
  },
  {
    key: "discuss_path",
    title: "Discuss a Path",
    icon: "fa-map",
    description: "Set a personal goal toward an archetype or prestige class",
    contextType: "planning",
    gatesAt: 1
  }
];

export class MentorChatDialog extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "mentor-chat-dialog",
      classes: ["swse", "mentor-chat-dialog"],
      template: "systems/foundryvtt-swse/templates/apps/mentor-chat-dialog.hbs",
      width: 750,
      height: 650,
      resizable: true,
      draggable: true,
      scrollY: [".mentor-list", ".chat-content"]
    });
  }

  constructor(actor, options = {}) {
    super({}, options);
    this.actor = actor;
    this.selectedMentor = null;
    this.currentTopic = null;
    this.currentResponse = null;
    this.buildIntent = null;
  }

  get title() {
    return `Talk to Your Mentors — ${this.actor.name}`;
  }

  async getData() {
    const data = await super.getData();

    // Get all mentors unlocked via classes
    const unlockedMentors = this._getUnlockedMentors();

    // Get available topics for selected mentor
    const availableTopics = this._getAvailableTopics();

    data.actor = this.actor;
    data.unlockedMentors = unlockedMentors;
    data.selectedMentor = this.selectedMentor;
    data.topics = availableTopics;
    data.currentTopic = this.currentTopic;
    data.currentResponse = this.currentResponse;
    data.hasMentors = unlockedMentors.length > 0;

    return data;
  }

  /**
   * Get all mentors unlocked via the character's classes
   * @returns {Array} Array of unique mentor objects with metadata
   */
  _getUnlockedMentors() {
    const classItems = this.actor.items.filter(i => i.type === 'class');
    const mentorMap = new Map();

    // Get mentors for each class
    for (const classItem of classItems) {
      const mentor = getMentorForClass(classItem.name);
      if (mentor) {
        const mentorKey = Object.keys(MENTORS).find(k => MENTORS[k] === mentor);
        if (mentorKey && !mentorMap.has(mentorKey)) {
          mentorMap.set(mentorKey, {
            key: mentorKey,
            mentor: mentor,
            unlockedBy: classItem.name
          });
        }
      }
    }

    return Array.from(mentorMap.values());
  }

  /**
   * Get available chat topics for the selected mentor
   * @returns {Array} Array of available topics
   */
  _getAvailableTopics() {
    if (!this.selectedMentor) return [];

    const level = this.actor.system.level || 1;

    // Filter topics based on level gates
    return CHAT_TOPICS.filter(topic => {
      const gateLevel = topic.gatesAt || 1;
      return level >= gateLevel;
    });
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Mentor selection
    html.find('.mentor-card').click(this._onSelectMentor.bind(this));

    // Topic selection
    html.find('.topic-button').click(this._onSelectTopic.bind(this));

    // Navigation
    html.find('.back-to-mentors').click(this._onBackToMentors.bind(this));
    html.find('.back-to-topics').click(this._onBackToTopics.bind(this));
  }

  async _onSelectMentor(event) {
    event.preventDefault();
    const mentorKey = event.currentTarget.dataset.mentor;

    this.selectedMentor = {
      key: mentorKey,
      mentor: MENTORS[mentorKey]
    };

    // Generate introduction message
    const voiceData = MentorSuggestionVoice.SUGGESTION_VOICES[this.selectedMentor.mentor.name];
    if (voiceData && voiceData.introduction) {
      const introductions = voiceData.introduction;
      const randomIntro = introductions[Math.floor(Math.random() * introductions.length)];

      this.currentResponse = {
        introduction: randomIntro,
        advice: null
      };
    }

    await this.render();
  }

  _onBackToMentors(event) {
    event.preventDefault();
    this.selectedMentor = null;
    this.currentTopic = null;
    this.currentResponse = null;
    this.render();
  }

  async _onSelectTopic(event) {
    event.preventDefault();
    const topicKey = event.currentTarget.dataset.topic;

    this.currentTopic = CHAT_TOPICS.find(t => t.key === topicKey);

    // Generate response based on topic
    try {
      this.currentResponse = await this._generateTopicResponse(this.currentTopic);
    } catch (err) {
      SWSELogger.error('Error generating mentor response:', err);
      this.currentResponse = {
        introduction: "I apologize, but I'm having trouble forming my thoughts right now.",
        advice: "Please try again in a moment.",
        suggestions: []
      };
    }

    await this.render();
  }

  _onBackToTopics(event) {
    event.preventDefault();
    this.currentTopic = null;
    this.currentResponse = null;

    // Regenerate introduction
    const voiceData = MentorSuggestionVoice.SUGGESTION_VOICES[this.selectedMentor.mentor.name];
    if (voiceData && voiceData.introduction) {
      const introductions = voiceData.introduction;
      const randomIntro = introductions[Math.floor(Math.random() * introductions.length)];

      this.currentResponse = {
        introduction: randomIntro,
        advice: null
      };
    }

    this.render();
  }

  /**
   * Generate a mentor's response to a selected topic
   * Integrates with the suggestion engine for context-aware advice
   * Uses new mentor voice filter to wrap analysis with authentic mentor voices
   */
  async _generateTopicResponse(topic) {
    const mentorName = this.selectedMentor.mentor.name;

    // Analyze build intent if not already done
    if (!this.buildIntent) {
      this.buildIntent = BuildIntent.analyze(this.actor, {});
    }

    // Generate context-specific analysis (raw data)
    let analysisData = MentorDialogueV2Integration.buildAnalysisData(
      this.actor,
      this.buildIntent,
      topic.key
    );
    let canonicalAnalysis = "";

    switch (topic.key) {
      case "who_am_i_becoming":
        canonicalAnalysis = await this._generateIdentityReflection();
        break;

      case "paths_open":
        canonicalAnalysis = await this._generateArchetypePaths();
        break;

      case "doing_well":
        canonicalAnalysis = await this._generateSynergyAnalysis();
        break;

      case "doing_wrong":
        canonicalAnalysis = await this._generateGapAnalysis();
        break;

      case "how_should_i_fight":
        canonicalAnalysis = this._generateCombatRoleFraming();
        break;

      case "be_careful":
        canonicalAnalysis = this._generateRiskAwareness();
        break;

      case "what_lies_ahead":
        canonicalAnalysis = await this._generatePrestigePlanning();
        break;

      case "how_would_you_play":
        canonicalAnalysis = this._generateMentorDoctrine();
        break;

      case "mentor_story":
        // Story responses are resolved directly by MentorStoryResolver
        canonicalAnalysis = MentorStoryResolver.resolveStoryResponse(
          this.actor,
          this.selectedMentor.mentor,
          mentorName
        );
        break;

      case "discuss_path":
        // Open mentor goal dialog
        const goalDialog = new MentorGoalDialog(this.actor, this.selectedMentor.key);
        goalDialog.render(true);
        // Return early to avoid rendering the topic response
        return {
          introduction: "Let's discuss your path...",
          advice: null,
          suggestions: []
        };
    }

    // Wrap analysis with mentor voice
    const voiceResponse = MentorVoiceFilterV2.applyVoice(
      mentorName,
      topic.key,
      analysisData
    );

    const response = {
      introduction: MentorVoiceFilterV2.getOpening(mentorName, topic.key, analysisData),
      advice: voiceResponse,
      suggestions: []
    };

    return response;
  }

  /**
   * 1. "Who am I becoming?" — Identity Reflection
   * Summarizes how the suggestion engine sees the character
   */
  async _generateIdentityReflection() {
    const level = this.actor.system.level;
    const themes = this.buildIntent.primaryThemes || [];
    const combatStyle = this.buildIntent.combatStyle || "mixed";
    const inferredRole = this.buildIntent.inferredRole || "adventurer";

    let reflection = `At level ${level}, the galaxy sees you as a **${inferredRole}**.\n\n`;

    if (themes.length > 0) {
      reflection += `Your choices reveal strong themes: **${themes.slice(0, 2).join("** and **")}**. `;
      reflection += `This shapes how you approach challenges and conflicts.\n\n`;
    }

    reflection += `Your combat approach is **${combatStyle}**. `;

    if (combatStyle === "melee") {
      reflection += "You face danger directly, relying on strength and proximity.";
    } else if (combatStyle === "ranged") {
      reflection += "You engage from distance, valuing positioning and precision.";
    } else if (combatStyle === "caster") {
      reflection += "You channel the Force, bending reality to your will.";
    } else {
      reflection += "You adapt your tactics to each situation, refusing to be defined by a single method.";
    }

    // Check DSP saturation if available
    const dsp = this.actor.system.darkSidePoints?.value || 0;
    const dspMax = this.actor.system.darkSidePoints?.max || 10;
    const dspSaturation = dspMax > 0 ? dsp / dspMax : 0;

    if (dspSaturation > 0.5) {
      reflection += `\n\n⚠️ The darkness grows within you. Your path is shifting in ways that may be difficult to reverse.`;
    }

    return reflection;
  }

  /**
   * 2. "What paths are open to me?" — Archetype Exploration
   * Presents class-specific build archetypes without mechanics
   */
  async _generateArchetypePaths() {
    const classItems = this.actor.items.filter(i => i.type === 'class');
    const mentorClass = this.selectedMentor.key;

    let paths = `Every path demands sacrifice. What you choose to master determines what you must forsake.\n\n`;

    // Generic archetype framing based on mentor
    if (mentorClass === "Jedi") {
      paths += `**Guardian** — Protector and warrior. Values defense, endurance, and lightsaber mastery. Sacrifices versatility for resilience.\n\n`;
      paths += `**Consular** — Diplomat and Force scholar. Values wisdom, persuasion, and Force depth. Sacrifices combat prowess for influence.\n\n`;
      paths += `**Sentinel** — Balanced warrior-diplomat. Values adaptability and skill diversity. Sacrifices specialization for versatility.`;
    } else if (mentorClass === "Scout") {
      paths += `**Tracker** — Hunter and survivalist. Values perception, stealth, and wilderness expertise. Sacrifices social skills for survival.\n\n`;
      paths += `**Infiltrator** — Urban operative. Values deception, agility, and information gathering. Sacrifices raw combat power for subtlety.\n\n`;
      paths += `**Pathfinder** — Guide and leader. Values navigation, tactics, and team coordination. Sacrifices personal offense for group effectiveness.`;
    } else if (mentorClass === "Scoundrel") {
      paths += `**Charmer** — Negotiator and con artist. Values persuasion, deception, and social manipulation. Sacrifices combat reliability for influence.\n\n`;
      paths += `**Gunslinger** — Quick-draw specialist. Values initiative, ranged damage, and mobility. Sacrifices defense for offense.\n\n`;
      paths += `**Smuggler** — Trader and opportunist. Values connections, resources, and escape options. Sacrifices specialization for flexibility.`;
    } else if (mentorClass === "Noble") {
      paths += `**Diplomat** — Peacemaker and negotiator. Values charisma, knowledge, and coalition-building. Sacrifices combat ability for influence.\n\n`;
      paths += `**Commander** — Tactical leader. Values inspiration, coordination, and battlefield control. Sacrifices personal power for force multiplication.\n\n`;
      paths += `**Aristocrat** — Wealthy patron. Values resources, connections, and indirect power. Sacrifices direct action for leverage.`;
    } else if (mentorClass === "Soldier") {
      paths += `**Heavy Weapons** — Firepower specialist. Values damage output, armor, and suppression. Sacrifices mobility for devastating attacks.\n\n`;
      paths += `**Commando** — Elite operative. Values versatility, tactics, and special operations. Sacrifices raw power for adaptability.\n\n`;
      paths += `**Defender** — Frontline protector. Values durability, positioning, and threat control. Sacrifices damage for resilience.`;
    } else {
      paths += `Multiple archetypes exist within your class. Each emphasizes different attributes, skills, and tactical approaches. None is superior—only different in what they value and what they give up.`;
    }

    return paths;
  }

  /**
   * 3. "What am I doing well?" — Synergy Analysis
   * Highlights effective choices and reinforces good decisions
   */
  async _generateSynergyAnalysis() {
    const combatStyle = this.buildIntent.combatStyle;
    const abilities = this.actor.system.abilities;
    const skills = this.actor.items.filter(i => i.type === 'skill' && i.system.trained);

    let analysis = "Let me identify what's working:\n\n";

    // Analyze ability-to-combat-style alignment
    if (combatStyle === "melee") {
      const str = abilities.str?.mod || 0;
      const con = abilities.con?.mod || 0;
      if (str >= 2) {
        analysis += `✓ Your **Strength** (${str > 0 ? '+' : ''}${str}) supports your melee approach effectively.\n`;
      }
      if (con >= 2) {
        analysis += `✓ Your **Constitution** (${con > 0 ? '+' : ''}${con}) provides the durability a frontline fighter needs.\n`;
      }
    } else if (combatStyle === "ranged") {
      const dex = abilities.dex?.mod || 0;
      const wis = abilities.wis?.mod || 0;
      if (dex >= 2) {
        analysis += `✓ Your **Dexterity** (${dex > 0 ? '+' : ''}${dex}) enhances both accuracy and defense.\n`;
      }
      if (wis >= 2) {
        analysis += `✓ Your **Wisdom** (${wis > 0 ? '+' : ''}${wis}) sharpens your awareness and perception.\n`;
      }
    } else if (combatStyle === "caster") {
      const cha = abilities.cha?.mod || 0;
      const wis = abilities.wis?.mod || 0;
      if (cha >= 2) {
        analysis += `✓ Your **Charisma** (${cha > 0 ? '+' : ''}${cha}) amplifies your Force presence.\n`;
      }
      if (wis >= 2) {
        analysis += `✓ Your **Wisdom** (${wis > 0 ? '+' : ''}${wis}) deepens your connection to the Force.\n`;
      }
    }

    // Skill synergies
    if (skills.length > 0) {
      analysis += `\n✓ You've invested in **${skills.length} trained skills**, showing commitment to versatility beyond combat.\n`;
    }

    // Prestige affinity
    if (this.buildIntent.prestigeAffinities && this.buildIntent.prestigeAffinities.length > 0) {
      const topPrestige = this.buildIntent.prestigeAffinities[0];
      if (topPrestige.confidence >= 0.6) {
        analysis += `\n✓ Your choices are building a clear path toward **${topPrestige.className}** (${Math.round(topPrestige.confidence * 100)}% alignment).\n`;
      }
    }

    analysis += `\nThese synergies compound. Continue building on what works.`;

    return analysis;
  }

  /**
   * 4. "What am I doing wrong?" — Gap Analysis
   * Identifies inefficiencies and risks without being prescriptive
   */
  async _generateGapAnalysis() {
    const combatStyle = this.buildIntent.combatStyle;
    const abilities = this.actor.system.abilities;
    const level = this.actor.system.level;

    let gaps = "Every build has weaknesses. Let me point out yours:\n\n";

    // Check for defensive gaps
    const con = abilities.con?.mod || 0;
    const dex = abilities.dex?.mod || 0;
    const ref = this.actor.system.defenses?.reflex?.total || 10;
    const fort = this.actor.system.defenses?.fort?.total || 10;

    if (con < 1 && level >= 5) {
      gaps += `⚠️ Your **Constitution** is neglected. This makes you fragile in sustained combat.\n`;
    }

    if (combatStyle === "melee" && dex < 0) {
      gaps += `⚠️ Low **Dexterity** leaves you vulnerable to ranged attacks and difficult to position effectively.\n`;
    }

    if (combatStyle === "ranged" && fort < 15 && level >= 5) {
      gaps += `⚠️ Weak **Fortitude** defense means poisons, diseases, and environmental hazards will disable you easily.\n`;
    }

    // Check for over-specialization
    const highestAbility = Math.max(
      abilities.str?.mod || 0,
      abilities.dex?.mod || 0,
      abilities.con?.mod || 0,
      abilities.int?.mod || 0,
      abilities.wis?.mod || 0,
      abilities.cha?.mod || 0
    );

    const lowestAbility = Math.min(
      abilities.str?.mod || 0,
      abilities.dex?.mod || 0,
      abilities.con?.mod || 0,
      abilities.int?.mod || 0,
      abilities.wis?.mod || 0,
      abilities.cha?.mod || 0
    );

    if (highestAbility - lowestAbility > 5) {
      gaps += `\n⚠️ You're heavily specialized. This makes you excellent in one area but vulnerable to challenges that demand different strengths.\n`;
    }

    // DSP drift warning
    const dsp = this.actor.system.darkSidePoints?.value || 0;
    const dspMax = this.actor.system.darkSidePoints?.max || 10;
    const dspSaturation = dspMax > 0 ? dsp / dspMax : 0;

    if (dspSaturation > 0.3 && dspSaturation < 0.7) {
      gaps += `\n⚠️ You're drifting toward the dark side without committing. This instability will cost you when clarity matters most.\n`;
    }

    if (gaps === "Every build has weaknesses. Let me point out yours:\n\n") {
      return "Your build shows no obvious gaps at this level. Continue as you are, but remain vigilant.";
    }

    return gaps;
  }

  /**
   * 5. "How should I fight?" — Combat Role Framing
   * Explains battlefield role without tactics
   */
  _generateCombatRoleFraming() {
    const combatStyle = this.buildIntent.combatStyle;
    const level = this.actor.system.level;

    let framing = "Your role in combat defines your priorities:\n\n";

    if (combatStyle === "melee") {
      framing += `**Your Role: Frontline Enforcer**\n\n`;
      framing += `• **Positioning:** Engage the most dangerous threats directly. Draw fire away from allies.\n`;
      framing += `• **Pacing:** Aggressive. Close distance quickly, control space, deny retreats.\n`;
      framing += `• **Priorities:** Eliminate high-damage enemies first. Protect vulnerable allies second.\n\n`;
      framing += `You are the anvil. Stand firm.`;
    } else if (combatStyle === "ranged") {
      framing += `**Your Role: Precision Striker**\n\n`;
      framing += `• **Positioning:** Stay mobile. Use cover. Maintain firing lanes.\n`;
      framing += `• **Pacing:** Controlled. Pick targets deliberately. Reposition between volleys.\n`;
      framing += `• **Priorities:** Eliminate enemy ranged threats first. Exploit weakened foes second.\n\n`;
      framing += `You are the scalpel. Strike cleanly.`;
    } else if (combatStyle === "caster") {
      framing += `**Your Role: Force Conduit**\n\n`;
      framing += `• **Positioning:** Stay protected but central. Maintain awareness of all combatants.\n`;
      framing += `• **Pacing:** Adaptive. Control the battlefield tempo. Save resources for critical moments.\n`;
      framing += `• **Priorities:** Disable enemy Force users first. Support allies second. Damage last.\n\n`;
      framing += `You are the fulcrum. Tip the balance.`;
    } else {
      framing += `**Your Role: Adaptive Tactician**\n\n`;
      framing += `• **Positioning:** Read the situation. Fill gaps as they appear.\n`;
      framing += `• **Pacing:** Reactive. Shift roles as the fight evolves.\n`;
      framing += `• **Priorities:** Exploit enemy mistakes. Cover ally weaknesses.\n\n`;
      framing += `You are the wildcard. Adapt or die.`;
    }

    return framing;
  }

  /**
   * 6. "What should I be careful of?" — Risk Awareness
   * Warns about traps and consequences
   */
  _generateRiskAwareness() {
    const combatStyle = this.buildIntent.combatStyle;
    const level = this.actor.system.level;
    const dsp = this.actor.system.darkSidePoints?.value || 0;
    const dspMax = this.actor.system.darkSidePoints?.max || 10;
    const dspSaturation = dspMax > 0 ? dsp / dspMax : 0;

    let risks = "These are the dangers you face:\n\n";

    // Combat style-specific risks
    if (combatStyle === "melee") {
      risks += `**Overcommitment:** Charging into melee leaves you vulnerable to focus fire and area attacks. Know when to retreat.\n\n`;
      risks += `**Mobility Denial:** Slow speed or lack of initiative means enemies can kite you. You'll chase while they strike.\n`;
    } else if (combatStyle === "ranged") {
      risks += `**Cover Dependence:** If enemies close distance or destroy your cover, you become fragile quickly.\n\n`;
      risks += `**Tunnel Vision:** Focusing on damage output while ignoring positioning gets you flanked or surrounded.\n`;
    } else if (combatStyle === "caster") {
      risks += `**Resource Depletion:** The Force is finite. Spending power too early leaves you helpless when it matters most.\n\n`;
      risks += `**Fragility:** Low defenses mean a single focused assault can disable you before you act.\n`;
    } else {
      risks += `**Jack-of-All-Trades Trap:** Versatility without focus means you're competent at everything but exceptional at nothing.\n\n`;
      risks += `**Identity Drift:** Without a clear role, you risk making choices that contradict each other instead of synergizing.\n`;
    }

    // DSP-specific risks
    if (dspSaturation > 0.5) {
      risks += `\n🔥 **Dark Side Corruption:** The darkness offers power, but it demands more than it gives. The further you go, the harder it becomes to turn back. Eventually, it will consume you.`;
    } else if (dspSaturation > 0.2) {
      risks += `\n⚠️ **Temptation:** You're flirting with the dark side. Every step down that path makes the next step easier and the return harder.`;
    }

    return risks;
  }

  /**
   * 7. "What lies ahead?" — Prestige Planning
   * Discusses future possibilities and tradeoffs
   */
  async _generatePrestigePlanning() {
    const prestigeAffinities = this.buildIntent.prestigeAffinities || [];
    const level = this.actor.system.level;

    if (level < 6) {
      return "Prestige classes unlock at higher levels. For now, focus on mastering your current class and establishing your identity.";
    }

    let planning = "The paths that lie ahead:\n\n";

    if (prestigeAffinities.length === 0) {
      planning += "Your build doesn't yet point toward a specific prestige class. Continue developing your core strengths, and a path will emerge.";
      return planning;
    }

    prestigeAffinities.slice(0, 3).forEach((aff, idx) => {
      const confidence = Math.round(aff.confidence * 100);
      planning += `**${aff.className}** (${confidence}% alignment)\n`;
      planning += `This path builds on your current direction. It will deepen what you've started, not redirect it.\n\n`;
    });

    planning += `⚠️ **Tradeoff:** Prestige classes offer specialization, but they narrow your options. Choose the path that serves your purpose, not the one that sounds powerful.`;

    return planning;
  }

  /**
   * 8. "How would you play this class?" — Mentor Doctrine
   * Shows mentor's personal philosophy
   */
  _generateMentorDoctrine() {
    const mentorName = this.selectedMentor.mentor.name;
    const mentorClass = this.selectedMentor.key;

    let doctrine = `You want to know how *I* would play this? Here's my truth:\n\n`;

    // Mentor-specific doctrines
    if (mentorName === "Miraj") {
      doctrine += `I value **balance**, **wisdom**, and **service**.\n\n`;
      doctrine += `I would prioritize the Force above all else—not for power, but for understanding. Every decision would ask: does this bring balance, or does it serve ego?\n\n`;
      doctrine += `I would invest in **Wisdom** and **Charisma**, train **Persuasion** and **Use the Force**, and never stop seeking knowledge.\n\n`;
      doctrine += `I would avoid the dark side not out of fear, but because I know where it leads.`;
    } else if (mentorName === "Lead") {
      doctrine += `I value **efficiency**, **survival**, and **mission success**.\n\n`;
      doctrine += `I would build for adaptability—**Dexterity** and **Wisdom** first, skills that keep me alive and aware.\n\n`;
      doctrine += `I would master **Stealth**, **Perception**, and **Survival**. I'd never take a fight I could avoid, and I'd never leave a teammate behind.\n\n`;
      doctrine += `Flashy moves get you killed. Smart moves get you home.`;
    } else if (mentorName === "Ol' Salty") {
      doctrine += `I value **freedom**, **profit**, and **survival**.\n\n`;
      doctrine += `I'd max **Charisma** and **Dexterity**, charm me way out of most fights, and shoot me way out of the rest.\n\n`;
      doctrine += `I'd train **Deception**, **Persuasion**, and **Pilot**. Why fight when ye can talk yer way to riches?\n\n`;
      doctrine += `Rules be for fools. I play to win, and I don't mind bendin' a few laws along the way.`;
    } else if (mentorName === "J0-N1") {
      doctrine += `I value **protocol**, **diplomacy**, and **precision**.\n\n`;
      doctrine += `I would prioritize **Intelligence** and **Charisma**, mastering etiquette, languages, and persuasion.\n\n`;
      doctrine += `Combat is crude and inefficient. I would invest in **Knowledge**, **Persuasion**, and **Deception** to avoid it entirely.\n\n`;
      doctrine += `Elegance is not weakness. It is the art of winning without violence.`;
    } else if (mentorName === "Breach") {
      doctrine += `I value **strength**, **durability**, and **overwhelming force**.\n\n`;
      doctrine += `I would max **Strength** and **Constitution**, wear the heaviest armor available, and hit harder than anyone expects.\n\n`;
      doctrine += `I'd train **Endurance**, **Athletics**, and **Intimidation**. Subtlety is for scouts. I *am* the plan.\n\n`;
      doctrine += `You don't survive by being smart. You survive by being too tough to kill.`;
    } else {
      doctrine += `I would play to my strengths, shore up my weaknesses, and never forget that every choice has a cost.\n\n`;
      doctrine += `Power means nothing without purpose. Decide what matters to you, then build toward it without compromise.`;
    }

    return doctrine;
  }

  async _updateObject(event, formData) {
    // Not used - handled via listeners
  }

  /**
   * Show the mentor chat dialog for an actor
   * @static
   * @param {Actor} actor - The character
   */
  static show(actor) {
    if (!actor) {
      ui.notifications.error("No character selected.");
      return;
    }

    const dialog = new MentorChatDialog(actor);
    dialog.render(true);
  }
}
