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
import { SuggestionEngine } from '../engine/SuggestionEngine.js';
import { SWSELogger } from '../utils/logger.js';

const CHAT_TOPICS = [
  {
    key: "current_build",
    title: "How am I doing?",
    icon: "fa-user-check",
    description: "Get an assessment of your current build",
    contextType: "introduction"
  },
  {
    key: "feat_suggestions",
    title: "What feats should I take?",
    icon: "fa-star",
    description: "Get feat recommendations based on your build",
    contextType: "feat_selection"
  },
  {
    key: "talent_suggestions",
    title: "Which talents are best for me?",
    icon: "fa-wand-magic-sparkles",
    description: "Get talent recommendations based on your class",
    contextType: "talent_selection"
  },
  {
    key: "class_planning",
    title: "What class should I take next?",
    icon: "fa-crown",
    description: "Get prestige class and multiclass advice",
    contextType: "class_selection"
  },
  {
    key: "ability_allocation",
    title: "How should I allocate abilities?",
    icon: "fa-brain",
    description: "Get guidance on ability score increases",
    contextType: "ability_increase"
  },
  {
    key: "skill_training",
    title: "What skills should I train?",
    icon: "fa-book",
    description: "Get recommendations for skill training",
    contextType: "skill_training"
  },
  {
    key: "force_options",
    title: "What Force powers should I learn?",
    icon: "fa-hand-sparkles",
    description: "Get Force power recommendations (if Force-sensitive)",
    contextType: "force_option",
    requiresForce: true
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

    // Check if character is Force-sensitive
    const isForceSensitive = this.actor.system.forceSensitive || false;

    // Filter topics based on requirements
    return CHAT_TOPICS.filter(topic => {
      if (topic.requiresForce && !isForceSensitive) {
        return false;
      }
      return true;
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
   */
  async _generateTopicResponse(topic) {
    const mentorName = this.selectedMentor.mentor.name;
    const voiceData = MentorSuggestionVoice.SUGGESTION_VOICES[mentorName];

    // Get a random voice variation for this context
    const voiceVariations = voiceData?.[topic.contextType] || [];
    const randomVoice = voiceVariations[Math.floor(Math.random() * voiceVariations.length)] ||
                        "Let me share my thoughts on this.";

    // Analyze build intent if not already done
    if (!this.buildIntent) {
      this.buildIntent = BuildIntent.analyze(this.actor, {});
    }

    const response = {
      introduction: randomVoice,
      advice: "",
      suggestions: []
    };

    // Generate context-specific advice
    switch (topic.key) {
      case "current_build":
        response.advice = await this._generateBuildAssessment();
        break;

      case "feat_suggestions":
        response.advice = await this._generateFeatSuggestions();
        break;

      case "talent_suggestions":
        response.advice = await this._generateTalentSuggestions();
        break;

      case "class_planning":
        response.advice = await this._generateClassGuidance();
        break;

      case "ability_allocation":
        response.advice = this._generateAbilityGuidance();
        break;

      case "skill_training":
        response.advice = this._generateSkillGuidance();
        break;

      case "force_options":
        response.advice = this._generateForceGuidance();
        break;
    }

    return response;
  }

  async _generateBuildAssessment() {
    const themes = this.buildIntent.primaryThemes || [];
    const combatStyle = this.buildIntent.combatStyle || "mixed";
    const level = this.actor.system.level;

    let assessment = `You're currently level ${level}. `;

    if (themes.length > 0) {
      assessment += `Your build shows strong affinity for ${themes.slice(0, 2).join(" and ")} themes. `;
    }

    assessment += `Your combat style appears to be ${combatStyle}. `;

    if (this.buildIntent.prestigeAffinities && this.buildIntent.prestigeAffinities.length > 0) {
      const topPrestige = this.buildIntent.prestigeAffinities[0];
      assessment += `You're showing promise for ${topPrestige.className} (${Math.round(topPrestige.confidence * 100)}% match). `;
    }

    return assessment;
  }

  async _generateFeatSuggestions() {
    // Get all available feats from game
    const allFeats = game.items.filter(i => i.type === 'feat');

    // Filter to feats the actor doesn't have and can take
    const availableFeats = allFeats.filter(feat => {
      const hasFeat = this.actor.items.find(i => i.name === feat.name);
      return !hasFeat;
    });

    // Get suggestions from engine
    const suggestions = SuggestionEngine.suggestFeats(
      availableFeats.slice(0, 50), // Limit for performance
      this.actor,
      {},
      { buildIntent: this.buildIntent }
    );

    // Get top 5 suggested feats
    const topSuggestions = suggestions
      .filter(s => s.suggestion?.tier > 0)
      .sort((a, b) => b.suggestion.tier - a.suggestion.tier)
      .slice(0, 5);

    if (topSuggestions.length === 0) {
      return "I don't have specific feat recommendations at this time. Choose what feels right for your journey.";
    }

    let advice = "Here are my top feat recommendations:\n\n";
    topSuggestions.forEach((feat, idx) => {
      advice += `${idx + 1}. **${feat.name}** — ${feat.suggestion.reason}\n`;
    });

    return advice;
  }

  async _generateTalentSuggestions() {
    // Get character's class talents
    const classTalents = this.actor.items.filter(i => i.type === 'class' && i.system.talents);

    if (classTalents.length === 0) {
      return "You don't have any talent trees available yet. Focus on your class progression.";
    }

    // For now, provide general guidance
    // TODO: Integrate with talent suggestion engine when available
    let advice = "Based on your build direction:\n\n";

    if (this.buildIntent.combatStyle === 'melee') {
      advice += "Focus on talents that enhance melee combat effectiveness, survivability, and damage output.";
    } else if (this.buildIntent.combatStyle === 'ranged') {
      advice += "Focus on talents that improve accuracy, damage at range, and tactical positioning.";
    } else if (this.buildIntent.combatStyle === 'caster') {
      advice += "Focus on talents that expand your Force powers and improve their effectiveness.";
    } else {
      advice += "Focus on talents that complement your hybrid approach and provide versatility.";
    }

    return advice;
  }

  async _generateClassGuidance() {
    const prestigeAffinities = this.buildIntent.prestigeAffinities || [];

    if (prestigeAffinities.length === 0) {
      return "Continue developing your current class. When you're ready for a prestige class, I'll help guide you.";
    }

    let advice = "Based on your build, here are prestige classes that suit you:\n\n";

    prestigeAffinities.slice(0, 3).forEach((aff, idx) => {
      const confidence = Math.round(aff.confidence * 100);
      advice += `${idx + 1}. **${aff.className}** (${confidence}% match)\n`;
    });

    return advice;
  }

  _generateAbilityGuidance() {
    const combatStyle = this.buildIntent.combatStyle;

    let advice = "For your build, I recommend prioritizing:\n\n";

    if (combatStyle === 'melee') {
      advice += "**Strength** for damage and combat effectiveness\n";
      advice += "**Constitution** for survivability\n";
      advice += "**Dexterity** for defense and initiative";
    } else if (combatStyle === 'ranged') {
      advice += "**Dexterity** for accuracy and defense\n";
      advice += "**Wisdom** for perception and awareness\n";
      advice += "**Constitution** for survivability";
    } else if (combatStyle === 'caster') {
      advice += "**Charisma** or **Wisdom** for Force power effectiveness\n";
      advice += "**Constitution** for survivability\n";
      advice += "**Intelligence** for skills and knowledge";
    } else {
      advice += "**Versatility** — Balance your abilities to support your hybrid approach";
    }

    return advice;
  }

  _generateSkillGuidance() {
    const combatStyle = this.buildIntent.combatStyle;

    let advice = "Skills to consider based on your role:\n\n";

    if (combatStyle === 'melee') {
      advice += "Athletics, Endurance, Perception, Initiative";
    } else if (combatStyle === 'ranged') {
      advice += "Perception, Stealth, Survival, Mechanics";
    } else if (combatStyle === 'caster') {
      advice += "Use the Force, Knowledge (any), Perception, Persuasion";
    } else {
      advice += "Focus on skills that complement both your combat and non-combat capabilities";
    }

    return advice;
  }

  _generateForceGuidance() {
    if (!this.actor.system.forceSensitive) {
      return "You are not yet Force-sensitive. Focus on your current path.";
    }

    return "Study Force powers that align with your philosophy and combat style. Balance offensive, defensive, and utility powers for maximum versatility.";
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
