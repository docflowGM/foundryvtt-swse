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

import { MENTORS, getMentorForClass, getMentorKey } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js";
import { MentorSuggestionVoice } from "/systems/foundryvtt-swse/scripts/mentor/mentor-suggestion-voice.js";
import { BuildIntent } from "/systems/foundryvtt-swse/scripts/engine/suggestion/BuildIntent.js";
import { SuggestionEngineCoordinator } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionEngineCoordinator.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { MentorVoiceFilterV2 } from "/systems/foundryvtt-swse/scripts/mentor/mentor-voice-filter-v2.js";
import { MentorDialogueV2Integration } from "/systems/foundryvtt-swse/scripts/mentor/mentor-dialogue-v2-integration.js";
import { MentorStoryResolver } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-story-resolver.js";
import { renderJudgmentAtom } from "/systems/foundryvtt-swse/scripts/mentor/mentor-judgment-renderer.js";
import { getReasonTexts } from "/systems/foundryvtt-swse/scripts/mentor/mentor-reason-renderer.js";
import { DSPEngine } from "/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js";
import { getMentorContext, getArchetypeOptions } from "/systems/foundryvtt-swse/scripts/mentor/mentor-adapter.js";
import { BuildAnalysisEngine } from "/systems/foundryvtt-swse/scripts/engine/analysis/build-analysis-engine.js";

// V2 API base class
import SWSEFormApplicationV2 from "/systems/foundryvtt-swse/scripts/apps/base/swse-form-application-v2.js";

function mentorChatI18n(key, data = {}, fallback = '') {
  const i18n = globalThis.game?.i18n;
  try {
    const localized = data && Object.keys(data).length > 0
      ? i18n?.format?.(key, data)
      : i18n?.localize?.(key);
    return localized && localized !== key ? localized : (fallback || key);
  } catch (_err) {
    return fallback || key;
  }
}

function mentorTopicKey(topicKey, field = 'Title') {
  const map = {
    who_am_i_becoming: 'WhoAmI',
    paths_open: 'PathsOpen',
    doing_well: 'DoingWell',
    doing_wrong: 'DoingWrong',
    how_should_i_fight: 'HowFight',
    be_careful: 'Careful',
    what_lies_ahead: 'Ahead',
    how_would_you_play: 'PlayClass',
    mentor_story: 'Story'
  };
  return `SWSE.MentorChat.Topics.${map[topicKey] || 'WhoAmI'}.${field}`;
}

function mentorPathKey(pathName = '') {
  const key = String(pathName || '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .replace(/(?:^|\s)([A-Za-z0-9])/g, (_m, c) => c.toUpperCase());
  const aliases = { HeavyWeapons: 'HeavyWeapons' };
  return `SWSE.MentorChat.Paths.${aliases[key] || key || 'Default'}`;
}

const CHAT_TOPICS = [
  {
    key: 'who_am_i_becoming',
    titleKey: mentorTopicKey('who_am_i_becoming', 'Title'),
    icon: 'fa-mask',
    descriptionKey: mentorTopicKey('who_am_i_becoming', 'Description'),
    contextType: 'introduction',
    gatesAt: 1
  },
  {
    key: 'paths_open',
    titleKey: mentorTopicKey('paths_open', 'Title'),
    icon: 'fa-signs-post',
    descriptionKey: mentorTopicKey('paths_open', 'Description'),
    contextType: 'class_selection',
    gatesAt: 1
  },
  {
    key: 'doing_well',
    titleKey: mentorTopicKey('doing_well', 'Title'),
    icon: 'fa-thumbs-up',
    descriptionKey: mentorTopicKey('doing_well', 'Description'),
    contextType: 'introduction',
    gatesAt: 3
  },
  {
    key: 'doing_wrong',
    titleKey: mentorTopicKey('doing_wrong', 'Title'),
    icon: 'fa-triangle-exclamation',
    descriptionKey: mentorTopicKey('doing_wrong', 'Description'),
    contextType: 'introduction',
    gatesAt: 3
  },
  {
    key: 'how_should_i_fight',
    titleKey: mentorTopicKey('how_should_i_fight', 'Title'),
    icon: 'fa-shield',
    descriptionKey: mentorTopicKey('how_should_i_fight', 'Description'),
    contextType: 'introduction',
    gatesAt: 5
  },
  {
    key: 'be_careful',
    titleKey: mentorTopicKey('be_careful', 'Title'),
    icon: 'fa-warning',
    descriptionKey: mentorTopicKey('be_careful', 'Description'),
    contextType: 'introduction',
    gatesAt: 5
  },
  {
    key: 'what_lies_ahead',
    titleKey: mentorTopicKey('what_lies_ahead', 'Title'),
    icon: 'fa-sparkles',
    descriptionKey: mentorTopicKey('what_lies_ahead', 'Description'),
    contextType: 'class_selection',
    gatesAt: 6
  },
  {
    key: 'how_would_you_play',
    titleKey: mentorTopicKey('how_would_you_play', 'Title'),
    icon: 'fa-person',
    descriptionKey: mentorTopicKey('how_would_you_play', 'Description'),
    contextType: 'introduction',
    gatesAt: 1
  },
  {
    key: 'mentor_story',
    titleKey: mentorTopicKey('mentor_story', 'Title'),
    icon: 'fa-book',
    descriptionKey: mentorTopicKey('mentor_story', 'Description'),
    contextType: 'narrative',
    gatesAt: 1
  }
];

export class MentorChatDialog extends SWSEFormApplicationV2 {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(foundry.utils.deepClone(super.DEFAULT_OPTIONS ?? {}), {
      id: 'mentor-chat-dialog',
      classes: ['swse', 'mentor-chat-dialog'],
      template: 'systems/foundryvtt-swse/templates/apps/mentor-chat-dialog.hbs',
      width: 750,
      height: 650,
      resizable: true,
      draggable: true,
      scrollY: ['.mentor-list', '.chat-content']
    });

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.selectedMentor = null;
    this.currentTopic = null;
    this.currentResponse = null;
    this.buildIntent = null;
    this.mentorContext = null; // Cache mentor context
    this.buildAnalysis = null; // Cache build analysis
  }

  get title() {
    return mentorChatI18n('SWSE.MentorChat.WindowTitle', { name: this.actor.name }, `Talk to Your Mentors — ${this.actor.name}`);
  }

  async _prepareContext() {
    const data = await super._prepareContext();

    // Get all mentors unlocked via classes
    const unlockedMentors = this._getUnlockedMentors();
    if (!this.selectedMentor && unlockedMentors.length > 0) {
      this.selectedMentor = unlockedMentors[0];
      this.currentResponse = this._buildMentorGreeting(this.selectedMentor);
    }

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
    const mentorMap = new Map();
    const addMentorForClass = (className, unlockedBy = className) => {
      if (!className) return;
      const mentor = getMentorForClass(className);
      if (!mentor) return;
      const mentorKey = mentor?.mentorKey || getMentorKey(mentor);
      if (mentorKey && !mentorMap.has(mentorKey)) {
        mentorMap.set(mentorKey, {
          key: mentorKey,
          mentor: mentor,
          unlockedBy
        });
      }
    };

    const classItems = this.actor.items?.filter?.(i => i.type === 'class') || [];
    for (const classItem of classItems) {
      addMentorForClass(classItem.name, classItem.name);
    }

    const system = this.actor.system || {};
    const progressionLevels = system.progression?.classLevels;
    if (Array.isArray(progressionLevels)) {
      for (const entry of progressionLevels) {
        addMentorForClass(entry?.name || entry?.className || entry?.class || entry?.id, entry?.name || entry?.className || entry?.class || entry?.id);
      }
    } else if (progressionLevels && typeof progressionLevels === 'object') {
      for (const [className, entry] of Object.entries(progressionLevels)) {
        addMentorForClass(entry?.name || entry?.className || className, entry?.name || entry?.className || className);
      }
    }

    const systemClasses = system.classes;
    if (Array.isArray(systemClasses)) {
      for (const entry of systemClasses) addMentorForClass(entry?.name || entry?.className || entry?.id, entry?.name || entry?.className || entry?.id);
    } else if (systemClasses && typeof systemClasses === 'object') {
      for (const [className, entry] of Object.entries(systemClasses)) addMentorForClass(entry?.name || entry?.className || className, entry?.name || entry?.className || className);
    }

    addMentorForClass(system.className || system.details?.class || system.details?.className, system.className || system.details?.class || system.details?.className);

    return Array.from(mentorMap.values());
  }

  _buildMentorGreeting(mentorEntry) {
    const mentor = mentorEntry?.mentor || mentorEntry;
    const voiceData = MentorSuggestionVoice.SUGGESTION_VOICES[mentor?.name];
    const introductions = Array.isArray(voiceData?.introduction) ? voiceData.introduction : [];
    const introduction = introductions.length > 0
      ? introductions[Math.floor(Math.random() * introductions.length)]
      : mentorChatI18n('SWSE.MentorChat.GreetingFallback', { name: mentor?.name || mentorChatI18n('SWSE.MentorChat.GreetingFallbackUnknown') }, `${mentor?.name || 'Your mentor'} studies you for a moment, then waits for your question.`);

    return {
      introduction,
      advice: null
    };
  }

  /**
   * Get available chat topics for the selected mentor
   * @returns {Array} Array of available topics
   */
  _getAvailableTopics() {
    if (!this.selectedMentor) {return [];}

    const level = this.actor.system.level || 1;

    // Filter topics based on level gates
    return CHAT_TOPICS.filter(topic => {
      const gateLevel = topic.gatesAt || 1;
      return level >= gateLevel;
    }).map(topic => ({
      ...topic,
      title: mentorChatI18n(topic.titleKey, {}, topic.key),
      description: mentorChatI18n(topic.descriptionKey, {}, '')
    }));
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const root = this.element;
    root?.querySelectorAll?.('.mentor-card')?.forEach(el => el.addEventListener('click', this._onSelectMentor.bind(this)));
    root?.querySelectorAll?.('.topic-button')?.forEach(el => el.addEventListener('click', this._onSelectTopic.bind(this)));
    root?.querySelectorAll?.('.back-to-mentors')?.forEach(el => el.addEventListener('click', this._onBackToMentors.bind(this)));
    root?.querySelectorAll?.('.back-to-topics')?.forEach(el => el.addEventListener('click', this._onBackToTopics.bind(this)));
    root?.querySelectorAll?.('.path-option')?.forEach(el => el.addEventListener('click', this._onSelectPath.bind(this)));

  }

  async _onSelectMentor(event) {
    event.preventDefault();
    const mentorKey = event.currentTarget.dataset.mentor;

    this.selectedMentor = {
      key: mentorKey,
      mentor: MENTORS[mentorKey]
    };

    this.currentResponse = this._buildMentorGreeting(this.selectedMentor);

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

    this.currentTopic = this._getAvailableTopics().find(t => t.key === topicKey) || CHAT_TOPICS.find(t => t.key === topicKey);

    // Generate response based on topic
    try {
      this.currentResponse = await this._generateTopicResponse(this.currentTopic);
    } catch (err) {
      SWSELogger.error('Error generating mentor response:', err);
      this.currentResponse = {
        introduction: mentorChatI18n('SWSE.MentorChat.ErrorIntro'),
        advice: mentorChatI18n('SWSE.MentorChat.ErrorAdvice'),
        suggestions: []
      };
    }

    await this.render();
  }

  _onBackToTopics(event) {
    event.preventDefault();
    this.currentTopic = null;
    this.currentResponse = null;

    this.currentResponse = this._buildMentorGreeting(this.selectedMentor);

    this.render();
  }

  /**
   * Handle path selection from "What paths are open to me?" topic
   * Saves commitment to mentor memory and shows mentor reaction
   */
  async _onSelectPath(event) {
    event.preventDefault();
    const pathName = event.currentTarget.dataset.path;

    if (!pathName) {
      SWSELogger.warn('[Mentor Chat] No path name in event');
      return;
    }

    // Import mentor memory functions
    const { getMentorMemory, setMentorMemory } = await import('/systems/foundryvtt-swse/scripts/engine/mentor/mentor-memory.js');
    const { setCommittedPath } = await import('/systems/foundryvtt-swse/scripts/engine/mentor/mentor-memory.js');

    try {
      const mentorId = this.selectedMentor.key.toLowerCase();
      const memory = getMentorMemory(this.actor, mentorId);

      // Commit to the path
      const updatedMemory = setCommittedPath(memory, pathName);
      await setMentorMemory(this.actor, mentorId, updatedMemory);

      SWSELogger.log(`[Mentor Chat] Path selected: ${pathName} for mentor ${this.selectedMentor.mentor.name}`);

      // Show confirmation response from mentor
      this.currentResponse = {
        introduction: mentorChatI18n('SWSE.MentorChat.PathSelectedIntro', { path: pathName }, `Ah, **${pathName}**. A wise choice.`),
        advice: this._generatePathConfirmation(pathName),
        pathSelected: pathName
      };

      await this.render();

    } catch (err) {
      SWSELogger.error('[Mentor Chat] Error selecting path:', err);
      ui?.notifications?.error?.(mentorChatI18n('SWSE.MentorChat.PathSelectionFailed', { message: err.message }, `Failed to record path selection: ${err.message}`));
    }
  }

  /**
   * Generate mentor's reaction to a path selection
   */
  _generatePathConfirmation(pathName) {
    const mentorName = this.selectedMentor.mentor.name;

    // Generic mentor confirmation by path type
    const confirmations = {
      // Guardian paths
      'Guardian': 'This path will demand discipline and endurance. You must be willing to stand between harm and those you protect.',
      'Defender': 'You choose to be the wall. Remember: a wall that breaks serves no one. Build your strength accordingly.',

      // Striker paths
      'Striker': 'Offense is a commitment. You will excel at destruction, but you must guard against becoming careless.',
      'Gunslinger': 'Speed wins fights. But speed without accuracy is just noise. Master both.',
      'Heavy Weapons': 'Power demands respect. Respect demands control. Do not mistake one for the other.',

      // Controller/Utility paths
      'Consular': 'The Force speaks in many languages. Listen before you speak.',
      'Sentinel': 'Balance is harder than specialization. But it is far more valuable.',
      'Diplomat': 'Words are weapons. Use them wisely.',
      'Commander': 'Leadership is not about making the right choice. It is about living with the wrong ones.',

      // Scout paths
      'Tracker': 'Awareness is your first weapon. Everything else follows from it.',
      'Infiltrator': 'Shadows are not your home—they are your tools. Do not forget the difference.',
      'Pathfinder': 'You will show others the way. Make sure you know where it leads.',

      // Scoundrel paths
      'Charmer': 'Persuasion is power. But it is a power that turns on you when you believe your own lies.',
      'Smuggler': 'Freedom has a price. Make sure you can afford it.',

      // Noble paths
      'Aristocrat': 'Wealth is influence. Influence is power. And power without wisdom is just cruelty with a crown.',

      // Default
      'default': 'This path suits you. Walk it with purpose, not pride.'
    };

    const fallback = confirmations[pathName] || confirmations['default'];
    return mentorChatI18n(mentorPathKey(pathName), {}, fallback);
  }

  /**
   * Generate a mentor's response to a selected topic
   * Integrates with the suggestion engine for context-aware advice
   * Uses judgment atoms for semantic reaction selection
   * Wraps analysis with authentic mentor voices
   */
  async _generateTopicResponse(topic) {
    const mentorName = this.selectedMentor.mentor.name;
    const mentorId = this.selectedMentor.key.toLowerCase();

    // Analyze build intent if not already done
    if (!this.buildIntent) {
      this.buildIntent = await SuggestionEngineCoordinator.analyzeBuildIntent(this.actor, {});
    }

    // Generate context-specific analysis (raw data)
    const analysisData = MentorDialogueV2Integration.buildAnalysisData(
      this.actor,
      this.buildIntent,
      topic.key
    );
    let canonicalAnalysis = '';

    switch (topic.key) {
      case 'who_am_i_becoming':
        canonicalAnalysis = await this._generateIdentityReflection();
        break;

      case 'paths_open':
        const pathsData = await this._generateArchetypePaths();
        // Store paths for UI rendering
        this.currentResponse.availablePaths = pathsData.paths;
        canonicalAnalysis = pathsData.introduction;
        break;

      case 'doing_well':
        canonicalAnalysis = await this._generateSynergyAnalysis();
        break;

      case 'doing_wrong':
        canonicalAnalysis = await this._generateGapAnalysis();
        break;

      case 'how_should_i_fight':
        canonicalAnalysis = this._generateCombatRoleFraming();
        break;

      case 'be_careful':
        canonicalAnalysis = this._generateRiskAwareness();
        break;

      case 'what_lies_ahead':
        canonicalAnalysis = await this._generatePrestigePlanning();
        break;

      case 'how_would_you_play':
        canonicalAnalysis = this._generateMentorDoctrine();
        break;

      case 'mentor_story':
        // Story responses are resolved directly by MentorStoryResolver
        canonicalAnalysis = MentorStoryResolver.resolveStoryResponse(
          this.actor,
          this.selectedMentor.mentor,
          mentorName
        );
        break;
    }

    // Render judgment phrase using mentor voice
    try {
      const judgmentPhrase = await renderJudgmentAtom(
        mentorId,
        'neutral',
        'moderate'
      );

      // Store on analysisData for UI
      analysisData.judgmentPhrase = judgmentPhrase;
      analysisData.mentorReasons = [];
      analysisData.reasonTexts = [];
    } catch (err) {
      SWSELogger.warn('Error in mentor response determination:', err);
      analysisData.judgmentPhrase = '';
      analysisData.mentorReasons = [];
      analysisData.reasonTexts = [];
    }

    // Wrap analysis with mentor voice
    const voiceResponse = MentorVoiceFilterV2.applyVoice(
      mentorName,
      topic.key,
      analysisData
    );

    // Prepend judgment atom phrase to advice if it exists and is not silence
    let advice = voiceResponse;
    if (analysisData.judgmentPhrase && analysisData.judgmentPhrase.length > 0) {
      advice = analysisData.judgmentPhrase + '\n\n' + voiceResponse;
    }

    const response = {
      introduction: MentorVoiceFilterV2.getOpening(mentorName, topic.key, analysisData),
      advice: advice,
      suggestions: [],
      reasonTexts: analysisData.reasonTexts || []
    };

    return response;
  }

  /**
   * Get mentor context from engine outputs.
   * Caches the context to avoid recomputation.
   * @private
   */
  async _getMentorContext() {
    // Return cached context if available
    if (this.mentorContext) {
      return this.mentorContext;
    }

    // Analyze build intent if not already done
    if (!this.buildIntent) {
      this.buildIntent = await SuggestionEngineCoordinator.analyzeBuildIntent(this.actor, {});
    }

    // Run build analysis to get signals and archetype
    if (!this.buildAnalysis) {
      this.buildAnalysis = await BuildAnalysisEngine.analyze(this.actor);
    }

    // Get mentor memory for commitment state
    try {
      const { getMentorMemory } = await import('/systems/foundryvtt-swse/scripts/engine/mentor/mentor-memory.js');
      const mentorId = this.selectedMentor?.key?.toLowerCase();
      const mentorMemory = mentorId ? getMentorMemory(this.actor, mentorId) : {};

      // Build mentor context from engine outputs
      this.mentorContext = getMentorContext({
        actor: this.actor,
        buildIntent: this.buildIntent,
        analysis: this.buildAnalysis,
        mentorMemory
      });
    } catch (err) {
      SWSELogger.warn('[MentorChat] Error building mentor context:', err);
      this.mentorContext = getMentorContext({
        actor: this.actor,
        buildIntent: this.buildIntent,
        analysis: this.buildAnalysis
      });
    }

    return this.mentorContext;
  }

  /**
   * 1. "Who am I becoming?" — Identity Reflection
   * Uses detected archetype from BuildAnalysisEngine output.
   * Does NOT recompute role inference — uses engine's detected archetype.
   */
  async _generateIdentityReflection() {
    const level = this.actor.system.level;
    const mentorContext = await this._getMentorContext();

    if (!mentorContext) {
      return mentorChatI18n('SWSE.MentorChat.Analysis.FindingPath', { level }, `At level ${level}, you are still finding your path.`);
    }

    const primaryArchetype = mentorContext.archetype?.primary;
    const combatStyle = mentorContext.buildMechanics?.combatStyle || 'mixed';
    const themes = mentorContext.buildMechanics?.primaryThemes || [];

    let reflection = '';

    if (primaryArchetype) {
      reflection += mentorChatI18n('SWSE.MentorChat.Analysis.LevelArchetype', { level, name: primaryArchetype.name, description: primaryArchetype.description }, `At level ${level}, the galaxy sees you becoming a **${primaryArchetype.name}**.\n\n${primaryArchetype.description}\n\n`);
    } else {
      reflection += mentorChatI18n('SWSE.MentorChat.Analysis.ChartingOwnPath', { level }, `At level ${level}, you are charting your own path.\n\n`);
    }

    if (themes.length > 0) {
      reflection += mentorChatI18n('SWSE.MentorChat.Analysis.Themes', { themes: themes.slice(0, 2).join('** and **') }, `Your choices reveal strong themes: **${themes.slice(0, 2).join('** and **')}**. This shapes how you approach challenges and conflicts.\n\n`);
    }

    reflection += mentorChatI18n('SWSE.MentorChat.Analysis.CombatApproach', { style: combatStyle }, `Your combat approach is **${combatStyle}**. `);

    if (combatStyle === 'melee') {
      reflection += mentorChatI18n('SWSE.MentorChat.Analysis.CombatMelee');
    } else if (combatStyle === 'ranged') {
      reflection += mentorChatI18n('SWSE.MentorChat.Analysis.CombatRanged');
    } else if (combatStyle === 'caster') {
      reflection += mentorChatI18n('SWSE.MentorChat.Analysis.CombatCaster');
    } else {
      reflection += mentorChatI18n('SWSE.MentorChat.Analysis.CombatMixed');
    }

    // Check DSP saturation if available
    const dspSaturation = DSPEngine.getSaturation(this.actor);

    if (dspSaturation > 0.5) {
      reflection += mentorChatI18n('SWSE.MentorChat.Analysis.DarknessWarning');
    }

    return reflection;
  }

  /**
   * 2. "What paths are open to me?" — Archetype Exploration
   * Presents class-specific archetypes from class-archetypes.json
   * Never synthesizes descriptions — always retrieves from data source
   */
  async _generateArchetypePaths() {
    const classItems = this.actor.items.filter(i => i.type === 'class');
    const className = classItems.map(c => c.name).join(', ') || mentorChatI18n('SWSE.MentorChat.Analysis.Adventurer');

    let introduction = mentorChatI18n('SWSE.MentorChat.Analysis.PathsIntro');

    // Get actual archetype options from data source
    const pathList = getArchetypeOptions(className);

    if (pathList.length === 0) {
      introduction += mentorChatI18n('SWSE.MentorChat.Analysis.PathsUnavailable');
      return {
        introduction,
        paths: []
      };
    }

    introduction += mentorChatI18n('SWSE.MentorChat.Analysis.PathsConsider');

    // Convert archetype data to display format
    const paths = pathList.map(archetype => ({
      name: archetype.name,
      description: archetype.description || mentorChatI18n('SWSE.MentorChat.Analysis.UnknownArchetype')
    }));

    return {
      introduction,
      paths
    };
  }

  /**
   * 3. "What am I doing well?" — Synergy Analysis
   * Uses strength signals from BuildAnalysisEngine output.
   * Does NOT recompute ability alignment — uses engine's analysis.
   */
  async _generateSynergyAnalysis() {
    const mentorContext = await this._getMentorContext();

    if (!mentorContext) {
      return mentorChatI18n('SWSE.MentorChat.Analysis.SynergyFallback');
    }

    let analysis = mentorChatI18n('SWSE.MentorChat.Analysis.SynergyIntro');

    // Use strength signals from engine analysis (do NOT recompute)
    const strengthSignals = mentorContext.signals?.strengths || [];

    if (strengthSignals.length === 0) {
      analysis += mentorChatI18n('SWSE.MentorChat.Analysis.SynergyNone');
      return analysis;
    }

    // Display top strength signals
    strengthSignals.slice(0, 3).forEach(signal => {
      analysis += `✓ ${signal.evidence || signal.id}\n`;
    });

    // Prestige affinity from buildIntent (already computed by engine)
    const affinities = mentorContext.buildMechanics?.prestigeAffinities || [];
    if (affinities.length > 0) {
      const topPrestige = affinities[0];
      if (topPrestige.confidence >= 0.6) {
        analysis += mentorChatI18n('SWSE.MentorChat.Analysis.PrestigeAlignment', { className: topPrestige.className, percent: Math.round(topPrestige.confidence * 100) }, `\n✓ Your choices are building a clear path toward **${topPrestige.className}** (${Math.round(topPrestige.confidence * 100)}% alignment).\n`);
      }
    }

    analysis += mentorChatI18n('SWSE.MentorChat.Analysis.SynergyClosing');

    return analysis;
  }

  /**
   * 4. "What am I doing wrong?" — Gap Analysis
   * Uses conflict signals from BuildAnalysisEngine output.
   * Does NOT recompute defensive gaps or over-specialization — uses engine's analysis.
   */
  async _generateGapAnalysis() {
    const mentorContext = await this._getMentorContext();

    if (!mentorContext) {
      return mentorChatI18n('SWSE.MentorChat.Analysis.GapFallback');
    }

    let gaps = mentorChatI18n('SWSE.MentorChat.Analysis.GapIntro');

    // Use conflict signals from engine analysis (do NOT recompute)
    const conflictSignals = mentorContext.signals?.conflicts || [];

    if (conflictSignals.length === 0) {
      gaps = mentorChatI18n('SWSE.MentorChat.Analysis.GapNone');
      return gaps;
    }

    // Display conflict signals by severity
    const critical = conflictSignals.filter(s => s.severity === 'critical');
    const important = conflictSignals.filter(s => s.severity === 'important');
    const minor = conflictSignals.filter(s => s.severity === 'minor');

    if (critical.length > 0) {
      critical.slice(0, 2).forEach(signal => {
        gaps += `🔴 **${mentorChatI18n('SWSE.MentorChat.Analysis.Critical')}** ${signal.evidence || signal.id}\n`;
      });
    }

    if (important.length > 0) {
      important.slice(0, 2).forEach(signal => {
        gaps += `⚠️ ${signal.evidence || signal.id}\n`;
      });
    }

    // DSP drift warning
    const dspSaturation = DSPEngine.getSaturation(this.actor);

    if (dspSaturation > 0.3 && dspSaturation < 0.7) {
      gaps += mentorChatI18n('SWSE.MentorChat.Analysis.DarkDrift');
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

    let framing = mentorChatI18n('SWSE.MentorChat.Analysis.RoleIntro');

    if (combatStyle === 'melee') {
      framing += `**Your Role: Frontline Enforcer**\n\n`;
      framing += `• **Positioning:** Engage the most dangerous threats directly. Draw fire away from allies.\n`;
      framing += `• **Pacing:** Aggressive. Close distance quickly, control space, deny retreats.\n`;
      framing += `• **Priorities:** Eliminate high-damage enemies first. Protect vulnerable allies second.\n\n`;
      framing += `You are the anvil. Stand firm.`;
    } else if (combatStyle === 'ranged') {
      framing += `**Your Role: Precision Striker**\n\n`;
      framing += `• **Positioning:** Stay mobile. Use cover. Maintain firing lanes.\n`;
      framing += `• **Pacing:** Controlled. Pick targets deliberately. Reposition between volleys.\n`;
      framing += `• **Priorities:** Eliminate enemy ranged threats first. Exploit weakened foes second.\n\n`;
      framing += `You are the scalpel. Strike cleanly.`;
    } else if (combatStyle === 'caster') {
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
    const dspSaturation = DSPEngine.getSaturation(this.actor);

    let risks = mentorChatI18n('SWSE.MentorChat.Analysis.RiskIntro');

    // Combat style-specific risks
    if (combatStyle === 'melee') {
      risks += `**Overcommitment:** Charging into melee leaves you vulnerable to focus fire and area attacks. Know when to retreat.\n\n`;
      risks += `**Mobility Denial:** Slow speed or lack of initiative means enemies can kite you. You'll chase while they strike.\n`;
    } else if (combatStyle === 'ranged') {
      risks += `**Cover Dependence:** If enemies close distance or destroy your cover, you become fragile quickly.\n\n`;
      risks += `**Tunnel Vision:** Focusing on damage output while ignoring positioning gets you flanked or surrounded.\n`;
    } else if (combatStyle === 'caster') {
      risks += `**Resource Depletion:** The Force is finite. Spending power too early leaves you helpless when it matters most.\n\n`;
      risks += `**Fragility:** Low defenses mean a single focused assault can disable you before you act.\n`;
    } else {
      risks += `**Jack-of-All-Trades Trap:** Versatility without focus means you're competent at everything but exceptional at nothing.\n\n`;
      risks += `**Identity Drift:** Without a clear role, you risk making choices that contradict each other instead of synergizing.\n`;
    }

    // DSP-specific risks
    if (dspSaturation > 0.5) {
      risks += mentorChatI18n('SWSE.MentorChat.Analysis.RiskDarkCorruption');
    } else if (dspSaturation > 0.2) {
      risks += mentorChatI18n('SWSE.MentorChat.Analysis.RiskTemptation');
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
      return mentorChatI18n('SWSE.MentorChat.Analysis.PrestigeLow');
    }

    let planning = mentorChatI18n('SWSE.MentorChat.Analysis.PrestigeIntro');

    if (prestigeAffinities.length === 0) {
      planning += mentorChatI18n('SWSE.MentorChat.Analysis.PrestigeNone');
      return planning;
    }

    prestigeAffinities.slice(0, 3).forEach((aff, idx) => {
      const confidence = aff.confidence > 0 ? mentorChatI18n('SWSE.MentorChat.Analysis.Recommended') : '';
      planning += mentorChatI18n('SWSE.MentorChat.Analysis.PrestigePath', { className: aff.className, confidence }, `**${aff.className}** (${confidence}% alignment)\nThis path builds on your current direction. It will deepen what you've started, not redirect it.\n\n`);
    });

    planning += mentorChatI18n('SWSE.MentorChat.Analysis.PrestigeTradeoff');

    return planning;
  }

  /**
   * 8. "How would you play this class?" — Mentor Doctrine
   * Shows mentor's personal philosophy
   */
  _generateMentorDoctrine() {
    const mentorName = this.selectedMentor.mentor.name;
    const mentorClass = this.selectedMentor.key;

    let doctrine = mentorChatI18n('SWSE.MentorChat.Analysis.DoctrineIntro');

    // Mentor-specific doctrines
    if (mentorName === 'Miraj') {
      doctrine += `I value **balance**, **wisdom**, and **service**.\n\n`;
      doctrine += `I would prioritize the Force above all else—not for power, but for understanding. Every decision would ask: does this bring balance, or does it serve ego?\n\n`;
      doctrine += `I would invest in **Wisdom** and **Charisma**, train **Persuasion** and **Use the Force**, and never stop seeking knowledge.\n\n`;
      doctrine += `I would avoid the dark side not out of fear, but because I know where it leads.`;
    } else if (mentorName === 'Lead') {
      doctrine += `I value **efficiency**, **survival**, and **mission success**.\n\n`;
      doctrine += `I would build for adaptability—**Dexterity** and **Wisdom** first, skills that keep me alive and aware.\n\n`;
      doctrine += `I would master **Stealth**, **Perception**, and **Survival**. I'd never take a fight I could avoid, and I'd never leave a teammate behind.\n\n`;
      doctrine += `Flashy moves get you killed. Smart moves get you home.`;
    } else if (mentorName === "Ol' Salty") {
      doctrine += `I value **freedom**, **profit**, and **survival**.\n\n`;
      doctrine += `I'd max **Charisma** and **Dexterity**, charm me way out of most fights, and shoot me way out of the rest.\n\n`;
      doctrine += `I'd train **Deception**, **Persuasion**, and **Pilot**. Why fight when ye can talk yer way to riches?\n\n`;
      doctrine += `Rules be for fools. I play to win, and I don't mind bendin' a few laws along the way.`;
    } else if (mentorName === 'J0-N1') {
      doctrine += `I value **protocol**, **diplomacy**, and **precision**.\n\n`;
      doctrine += `I would prioritize **Intelligence** and **Charisma**, mastering etiquette, languages, and persuasion.\n\n`;
      doctrine += `Combat is crude and inefficient. I would invest in **Knowledge**, **Persuasion**, and **Deception** to avoid it entirely.\n\n`;
      doctrine += `Elegance is not weakness. It is the art of winning without violence.`;
    } else if (mentorName === 'Breach') {
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
      ui.notifications.error(mentorChatI18n('SWSE.MentorChat.NoCharacterSelected'));
      return;
    }

    const dialog = new MentorChatDialog(actor);
    dialog.render(true);
  }
}
