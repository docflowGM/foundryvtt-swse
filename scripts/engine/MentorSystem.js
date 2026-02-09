// scripts/engine/MentorSystem.js
import { swseLogger } from '../utils/logger.js';
import { createChatMessage } from '../core/document-api-v13.js';

/**
 * MentorSystem - Async, fault-tolerant narrative guidance system
 *
 * Provides in-character mentor advice during character progression without
 * blocking or affecting core mechanics. Operates asynchronously via events.
 *
 * Key Principles:
 * - Async: Never blocks progression flow
 * - Fault-tolerant: Errors never propagate to main app
 * - Event-driven: Listens to hooks, doesn't interrupt
 * - Optional: Can be disabled, core mechanics unaffected
 * - Cacheable: Reuses suggestions for repeated contexts
 *
 * Architecture:
 * - Authored Content: Hand-written mentor lines for common scenarios
 * - AI Generated: Dynamic advice for complex/rare combinations
 * - Fallback: Generic encouragement if generation fails
 *
 * Usage:
 *   const mentor = new MentorSystem(actor);
 *   mentor.enable();
 *   // Mentor listens to hooks and posts advice asynchronously
 */
export class MentorSystem {
  constructor(actor) {
    if (!actor) {
      throw new Error('MentorSystem requires a valid actor');
    }

    this.actor = actor;
    this.enabled = false;
    this.mentorId = null;

    // Suggestion cache (context hash -> suggestion)
    this.cache = new Map();

    // Authored content library
    this.authoredContent = null;

    // AI generation settings
    this.aiEnabled = game.settings?.get('foundryvtt-swse', 'enableAIMentor') ?? false;
    this.aiProvider = null;

    // Error tracking (for debugging)
    this.errorCount = 0;
    this.lastError = null;

    swseLogger.log(`[MENTOR] MentorSystem created for ${actor.name}`);
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize the mentor system
   * Loads authored content and sets up hooks
   */
  async initialize() {
    swseLogger.log(`[MENTOR] Initializing mentor system for ${this.actor.name}`);

    try {
      // Load authored content
      await this._loadAuthoredContent();

      // Determine mentor identity
      await this._determineMentorIdentity();

      // Initialize AI provider if enabled
      if (this.aiEnabled) {
        await this._initializeAIProvider();
      }

      swseLogger.log(`[MENTOR] Mentor system initialized`);
    } catch (err) {
      swseLogger.error('[MENTOR] Failed to initialize:', err);
      this.enabled = false;
    }
  }

  /**
   * Enable the mentor system
   * Registers event listeners
   */
  enable() {
    if (this.enabled) {
      swseLogger.warn('[MENTOR] Already enabled');
      return;
    }

    swseLogger.log('[MENTOR] Enabling mentor system');

    // Register hook listeners (async, non-blocking)
    this._registerHooks();

    this.enabled = true;
  }

  /**
   * Disable the mentor system
   * Unregisters event listeners
   */
  disable() {
    if (!this.enabled) {
      return;
    }

    swseLogger.log('[MENTOR] Disabling mentor system');

    // Unregister hooks
    this._unregisterHooks();

    this.enabled = false;
  }

  // ============================================================================
  // EVENT LISTENERS - Async, non-blocking
  // ============================================================================

  /**
   * Register hook listeners for progression events
   * @private
   */
  _registerHooks() {
    // Listen for class selection
    this._hookClassSelected = Hooks.on('swse:classSelected', async (data) => {
      await this._onClassSelected(data);
    });

    // Listen for talent selection
    this._hookTalentSelected = Hooks.on('swse:talentSelected', async (data) => {
      await this._onTalentSelected(data);
    });

    // Listen for feat selection
    this._hookFeatSelected = Hooks.on('swse:featSelected', async (data) => {
      await this._onFeatSelected(data);
    });

    // Listen for level-up completed
    this._hookLevelUpCompleted = Hooks.on('swse:levelUp:committed', async (data) => {
      await this._onLevelUpCompleted(data);
    });

    // Listen for chargen completed
    this._hookChargenCompleted = Hooks.on('swse:chargen:sessionCompleted', async (data) => {
      await this._onChargenCompleted(data);
    });

    swseLogger.log('[MENTOR] Registered hook listeners');
  }

  /**
   * Unregister hook listeners
   * @private
   */
  _unregisterHooks() {
    if (this._hookClassSelected) {Hooks.off('swse:classSelected', this._hookClassSelected);}
    if (this._hookTalentSelected) {Hooks.off('swse:talentSelected', this._hookTalentSelected);}
    if (this._hookFeatSelected) {Hooks.off('swse:featSelected', this._hookFeatSelected);}
    if (this._hookLevelUpCompleted) {Hooks.off('swse:levelUp:committed', this._hookLevelUpCompleted);}
    if (this._hookChargenCompleted) {Hooks.off('swse:chargen:sessionCompleted', this._hookChargenCompleted);}

    swseLogger.log('[MENTOR] Unregistered hook listeners');
  }

  // ============================================================================
  // EVENT HANDLERS - With fault tolerance
  // ============================================================================

  /**
   * Handle class selection event
   * @private
   */
  async _onClassSelected(data) {
    if (!this.enabled) {return;}

    try {
      const context = {
        event: 'classSelected',
        actor: this.actor,
        classId: data.classId,
        level: data.level || 1
      };

      const suggestion = await this._generateSuggestion(context);
      if (suggestion) {
        await this._postSuggestion(suggestion);
      }
    } catch (err) {
      this._handleError('_onClassSelected', err);
    }
  }

  /**
   * Handle talent selection event
   * @private
   */
  async _onTalentSelected(data) {
    if (!this.enabled) {return;}

    try {
      const context = {
        event: 'talentSelected',
        actor: this.actor,
        talentId: data.talentId,
        talentTree: data.talentTree
      };

      const suggestion = await this._generateSuggestion(context);
      if (suggestion) {
        await this._postSuggestion(suggestion);
      }
    } catch (err) {
      this._handleError('_onTalentSelected', err);
    }
  }

  /**
   * Handle feat selection event
   * @private
   */
  async _onFeatSelected(data) {
    if (!this.enabled) {return;}

    try {
      const context = {
        event: 'featSelected',
        actor: this.actor,
        featId: data.featId
      };

      const suggestion = await this._generateSuggestion(context);
      if (suggestion) {
        await this._postSuggestion(suggestion);
      }
    } catch (err) {
      this._handleError('_onFeatSelected', err);
    }
  }

  /**
   * Handle level-up completed event
   * @private
   */
  async _onLevelUpCompleted(data) {
    if (!this.enabled) {return;}

    try {
      const context = {
        event: 'levelUpCompleted',
        actor: this.actor,
        newLevel: data.newLevel,
        classId: data.classId,
        choices: data.choices
      };

      const suggestion = await this._generateSuggestion(context);
      if (suggestion) {
        await this._postSuggestion(suggestion);
      }
    } catch (err) {
      this._handleError('_onLevelUpCompleted', err);
    }
  }

  /**
   * Handle chargen completed event
   * @private
   */
  async _onChargenCompleted(data) {
    if (!this.enabled) {return;}

    try {
      const context = {
        event: 'chargenCompleted',
        actor: this.actor,
        level: 1
      };

      const suggestion = await this._generateSuggestion(context);
      if (suggestion) {
        await this._postSuggestion(suggestion);
      }
    } catch (err) {
      this._handleError('_onChargenCompleted', err);
    }
  }

  // ============================================================================
  // SUGGESTION GENERATION - Authored + AI hybrid
  // ============================================================================

  /**
   * Generate a suggestion for the given context
   * Tries authored content first, then AI if enabled
   * @private
   */
  async _generateSuggestion(context) {
    swseLogger.log(`[MENTOR] Generating suggestion for: ${context.event}`);

    // Check cache first
    const cacheKey = this._getCacheKey(context);
    if (this.cache.has(cacheKey)) {
      swseLogger.log('[MENTOR] Using cached suggestion');
      return this.cache.get(cacheKey);
    }

    let suggestion = null;

    // Try authored content first
    suggestion = await this._getAuthoredSuggestion(context);

    // If no authored content, try AI (if enabled)
    if (!suggestion && this.aiEnabled) {
      suggestion = await this._getAISuggestion(context);
    }

    // If still no suggestion, use generic fallback
    if (!suggestion) {
      suggestion = this._getGenericFallback(context);
    }

    // Cache the suggestion
    if (suggestion) {
      this.cache.set(cacheKey, suggestion);
    }

    return suggestion;
  }

  /**
   * Get authored suggestion from content library
   * @private
   */
  async _getAuthoredSuggestion(context) {
    if (!this.authoredContent) {
      return null;
    }

    try {
      // Look up authored content for this event type
      const eventContent = this.authoredContent[context.event];
      if (!eventContent) {return null;}

      // Match by class/talent/feat if applicable
      let matchedContent = null;

      if (context.classId && eventContent[context.classId]) {
        matchedContent = eventContent[context.classId];
      } else if (context.talentId && eventContent[context.talentId]) {
        matchedContent = eventContent[context.talentId];
      } else if (context.featId && eventContent[context.featId]) {
        matchedContent = eventContent[context.featId];
      } else if (eventContent.generic) {
        matchedContent = eventContent.generic;
      }

      if (!matchedContent) {return null;}

      // If it's an array, pick a random one
      const text = Array.isArray(matchedContent)
        ? matchedContent[Math.floor(Math.random() * matchedContent.length)]
        : matchedContent;

      return {
        type: 'authored',
        text,
        mentor: this.mentorId
      };
    } catch (err) {
      swseLogger.error('[MENTOR] Error getting authored suggestion:', err);
      return null;
    }
  }

  /**
   * Get AI-generated suggestion
   * @private
   */
  async _getAISuggestion(context) {
    if (!this.aiProvider) {
      return null;
    }

    try {
      swseLogger.log('[MENTOR] Generating AI suggestion...');

      // Build prompt
      const prompt = this._buildAIPrompt(context);

      // Call AI provider (with timeout)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI generation timeout')), 5000)
      );

      const generationPromise = this.aiProvider.generate(prompt);

      const text = await Promise.race([generationPromise, timeoutPromise]);

      if (!text) {return null;}

      return {
        type: 'ai',
        text,
        mentor: this.mentorId
      };
    } catch (err) {
      swseLogger.warn('[MENTOR] AI generation failed:', err);
      return null;
    }
  }

  /**
   * Get generic fallback suggestion
   * @private
   */
  _getGenericFallback(context) {
    const genericMessages = [
      "An interesting choice. Let's see where this path leads.",
      "I see you're forging your own path. Bold move.",
      'Your build is taking shape nicely.',
      'This choice shows promise.',
      "I'm curious to see how this develops."
    ];

    const text = genericMessages[Math.floor(Math.random() * genericMessages.length)];

    return {
      type: 'fallback',
      text,
      mentor: this.mentorId
    };
  }

  /**
   * Build AI prompt from context
   * @private
   */
  _buildAIPrompt(context) {
    // Build a prompt that matches the mentor's voice
    const mentorVoice = this._getMentorVoice();

    let prompt = `You are ${mentorVoice.name}, ${mentorVoice.description}.\n\n`;
    prompt += `The player just ${this._describeEvent(context)}.\n\n`;
    prompt += `Provide a brief (1-2 sentences) comment that:\n`;
    prompt += `- Matches your ${mentorVoice.tone} tone\n`;
    prompt += `- References the choice specifically\n`;
    prompt += `- Offers narrative flavor, not mechanical advice\n`;
    prompt += `- Stays in character\n\n`;
    prompt += `Response:`;

    return prompt;
  }

  /**
   * Describe event for AI prompt
   * @private
   */
  _describeEvent(context) {
    switch (context.event) {
      case 'classSelected':
        return `selected the ${context.classId} class`;
      case 'talentSelected':
        return `chose the ${context.talentId} talent`;
      case 'featSelected':
        return `selected the ${context.featId} feat`;
      case 'levelUpCompleted':
        return `reached level ${context.newLevel} as a ${context.classId}`;
      case 'chargenCompleted':
        return `completed character creation`;
      default:
        return `made a choice`;
    }
  }

  // ============================================================================
  // MENTOR IDENTITY
  // ============================================================================

  /**
   * Determine which mentor this character has
   * @private
   */
  async _determineMentorIdentity() {
    // Try to get from actor flags first
    const storedMentor = this.actor.getFlag('swse', 'mentor');
    if (storedMentor) {
      this.mentorId = storedMentor;
      swseLogger.log(`[MENTOR] Using stored mentor: ${this.mentorId}`);
      return;
    }

    // Otherwise, determine from starting class
    const progression = this.actor.system.progression || {};
    const classLevels = progression.classLevels || [];

    if (classLevels.length === 0) {
      this.mentorId = 'generic';
      return;
    }

    const firstClass = classLevels[0].class;

    // Map classes to mentors
    const mentorMap = {
      'jedi': 'jedi-master',
      'soldier': 'veteran-sergeant',
      'scout': 'experienced-scout',
      'scoundrel': 'cunning-mentor',
      'noble': 'political-advisor'
    };

    this.mentorId = mentorMap[firstClass.toLowerCase()] || 'generic';

    // Store for future use
    await this.actor.setFlag('swse', 'mentor', this.mentorId);

    swseLogger.log(`[MENTOR] Determined mentor: ${this.mentorId}`);
  }

  /**
   * Get mentor voice characteristics
   * @private
   */
  _getMentorVoice() {
    const voices = {
      'jedi-master': {
        name: 'Master Vhonte',
        description: 'a wise Jedi Master',
        tone: 'calm and philosophical'
      },
      'veteran-sergeant': {
        name: 'Sergeant Kaar',
        description: 'a battle-hardened military veteran',
        tone: 'direct and pragmatic'
      },
      'experienced-scout': {
        name: 'Scout Rhen',
        description: 'an experienced wilderness scout',
        tone: 'observant and practical'
      },
      'cunning-mentor': {
        name: 'Zara',
        description: 'a cunning and resourceful mentor',
        tone: 'clever and opportunistic'
      },
      'political-advisor': {
        name: 'Senator Thane',
        description: 'a shrewd political advisor',
        tone: 'diplomatic and strategic'
      },
      'generic': {
        name: 'Your Mentor',
        description: 'an experienced guide',
        tone: 'encouraging and supportive'
      }
    };

    return voices[this.mentorId] || voices['generic'];
  }

  // ============================================================================
  // CONTENT MANAGEMENT
  // ============================================================================

  /**
   * Load authored content library
   * @private
   */
  async _loadAuthoredContent() {
    try {
      // For now, use inline content
      // In the future, this could load from JSON files
      this.authoredContent = {
        classSelected: {
          jedi: [
            'The Force is strong with you. This path requires discipline and wisdom.',
            "A Jedi's journey is never easy, but it is always meaningful."
          ],
          soldier: [
            'A solid choice. Combat training will serve you well.',
            'Every great warrior started where you stand now.'
          ],
          scout: [
            'The wilderness calls to you. Trust your instincts.',
            "A scout's eyes see what others miss. Remember that."
          ],
          generic: [
            "An interesting path you've chosen.",
            "This class suits you. Let's see what you make of it."
          ]
        },
        talentSelected: {
          generic: [
            'That talent will serve you well.',
            'A wise choice for your build.'
          ]
        },
        featSelected: {
          generic: [
            'That feat complements your abilities nicely.',
            'I see the strategy behind that choice.'
          ]
        },
        levelUpCompleted: {
          generic: [
            "You've grown stronger. Well done.",
            'Each level brings new challenges and new strengths.',
            'Your journey continues. Stay vigilant.'
          ]
        },
        chargenCompleted: {
          generic: [
            'Your path begins here. May the Force be with you.',
            'Remember this moment. This is where your legend begins.',
            "You're ready. Trust in your training."
          ]
        }
      };

      swseLogger.log('[MENTOR] Authored content loaded');
    } catch (err) {
      swseLogger.error('[MENTOR] Failed to load authored content:', err);
      this.authoredContent = {};
    }
  }

  /**
   * Initialize AI provider
   * @private
   */
  async _initializeAIProvider() {
    // Placeholder for AI provider initialization
    // In the future, this could integrate with Claude API, OpenAI, etc.
    swseLogger.log('[MENTOR] AI provider initialization skipped (not implemented)');
    this.aiProvider = null;
  }

  // ============================================================================
  // OUTPUT
  // ============================================================================

  /**
   * Post suggestion to chat
   * @private
   */
  async _postSuggestion(suggestion) {
    if (!suggestion) {return;}

    try {
      const mentorVoice = this._getMentorVoice();

      const content = `
        <div class="swse-mentor-suggestion ${suggestion.type}">
          <div class="mentor-header">
            <strong>${mentorVoice.name}</strong>
            <span class="mentor-type">${suggestion.type}</span>
          </div>
          <div class="mentor-message">
            ${suggestion.text}
          </div>
        </div>
      `;

      await createChatMessage({
        speaker: { alias: mentorVoice.name },
        content,
        whisper: [game.user.id], // Only to the player
        flags: {
          swse: {
            type: 'mentorSuggestion',
            suggestionType: suggestion.type
          }
        }
      });

      swseLogger.log('[MENTOR] Posted suggestion to chat');
    } catch (err) {
      swseLogger.warn('[MENTOR] Failed to post suggestion:', err);
    }
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  /**
   * Generate cache key from context
   * @private
   */
  _getCacheKey(context) {
    const parts = [
      context.event,
      context.classId || '',
      context.talentId || '',
      context.featId || '',
      context.level || ''
    ];
    return parts.join('|');
  }

  /**
   * Clear the suggestion cache
   */
  clearCache() {
    this.cache.clear();
    swseLogger.log('[MENTOR] Cache cleared');
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  /**
   * Handle errors without propagating
   * @private
   */
  _handleError(source, error) {
    this.errorCount++;
    this.lastError = { source, error, timestamp: Date.now() };

    swseLogger.error(`[MENTOR] Error in ${source}:`, error);

    // Don't throw - just log and continue
    // The mentor system should NEVER break the main app
  }

  /**
   * Get error statistics (for debugging)
   */
  getErrorStats() {
    return {
      errorCount: this.errorCount,
      lastError: this.lastError
    };
  }
}

export default MentorSystem;
