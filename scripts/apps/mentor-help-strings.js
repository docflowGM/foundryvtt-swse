/**
 * Mentor Help Strings
 *
 * Central repository for all player-facing mentor system explanations.
 * Used for tooltips, modals, help text, and documentation.
 *
 * Usage:
 *   MentorHelpStrings.getSystemDescription()
 *   MentorHelpStrings.getTopicDescription("who_am_i_becoming")
 *   MentorHelpStrings.getMentorBio("miraj")
 */

export class MentorHelpStrings {
  static _strings = null;

  /**
   * Load strings from JSON data file
   */
  static async init() {
    if (this._strings) {return;}
    try {
      const response = await fetch('systems/foundryvtt-swse/data/mentor-ui-strings.json');
      this._strings = await response.json();
    } catch (err) {
      console.error('Failed to load mentor help strings:', err);
      this._strings = this._getDefaultStrings();
    }
  }

  /**
   * Get full system description
   */
  static getSystemDescription() {
    this._ensureLoaded();
    return this._strings.system.fullDescription;
  }

  /**
   * Get short system description
   */
  static getSystemShortDescription() {
    this._ensureLoaded();
    return this._strings.system.shortDescription;
  }

  /**
   * Get first-run modal text
   */
  static getFirstRunMessage() {
    this._ensureLoaded();
    return this._strings.system.firstRunMessage;
  }

  /**
   * Get footer text for UI
   */
  static getFooterText() {
    this._ensureLoaded();
    return this._strings.system.footerText;
  }

  /**
   * Get description for a dialogue topic
   */
  static getTopicDescription(topicKey) {
    this._ensureLoaded();
    const topic = this._strings.dialogueTopics[topicKey];
    return topic ? topic.description : 'Talk to your mentor about this.';
  }

  /**
   * Get tooltip for a dialogue topic
   */
  static getTopicTooltip(topicKey) {
    this._ensureLoaded();
    const topic = this._strings.dialogueTopics[topicKey];
    return topic ? topic.tooltip : '';
  }

  /**
   * Get title for a dialogue topic
   */
  static getTopicTitle(topicKey) {
    this._ensureLoaded();
    const topic = this._strings.dialogueTopics[topicKey];
    return topic ? topic.title : topicKey;
  }

  /**
   * Get all topic descriptions
   */
  static getAllTopics() {
    this._ensureLoaded();
    return this._strings.dialogueTopics;
  }

  /**
   * Get mentor bio/intro
   */
  static getMentorBio(mentorKey) {
    this._ensureLoaded();
    const mentor = this._strings.mentors[mentorKey];
    return mentor ? mentor.shortBio : 'A mentor with their own perspective';
  }

  /**
   * Get mentor's philosophy statement
   */
  static getMentorPhilosophy(mentorKey) {
    this._ensureLoaded();
    const mentor = this._strings.mentors[mentorKey];
    return mentor ? mentor.philosophy : 'Everyone has their own way.';
  }

  /**
   * Get mentor's voice style description
   */
  static getMentorVoiceStyle(mentorKey) {
    this._ensureLoaded();
    const mentor = this._strings.mentors[mentorKey];
    return mentor ? mentor.voiceStyle : 'Unique and authentic';
  }

  /**
   * Get mentor's values
   */
  static getMentorValues(mentorKey) {
    this._ensureLoaded();
    const mentor = this._strings.mentors[mentorKey];
    return mentor ? mentor.values : 'Their own principles';
  }

  /**
   * Get mentor tooltip
   */
  static getMentorTooltip(mentorKey) {
    this._ensureLoaded();
    const mentor = this._strings.mentors[mentorKey];
    return mentor ? mentor.tooltip : '';
  }

  /**
   * Get all mentor data
   */
  static getAllMentors() {
    this._ensureLoaded();
    return this._strings.mentors;
  }

  /**
   * Get FAQ answer by key
   */
  static getFAQAnswer(faqKey) {
    this._ensureLoaded();
    const faq = this._strings.faqs[faqKey];
    return faq ? faq.answer : '';
  }

  /**
   * Get all FAQs
   */
  static getAllFAQs() {
    this._ensureLoaded();
    return this._strings.faqs;
  }

  /**
   * Get random tip
   */
  static getRandomTip() {
    this._ensureLoaded();
    const tips = this._strings.tips;
    return tips[Math.floor(Math.random() * tips.length)];
  }

  /**
   * Get all tips
   */
  static getAllTips() {
    this._ensureLoaded();
    return this._strings.tips;
  }

  /**
   * Internal: ensure strings are loaded
   */
  static _ensureLoaded() {
    if (!this._strings) {
      this._strings = this._getDefaultStrings();
    }
  }

  /**
   * Fallback strings if JSON fails to load
   */
  static _getDefaultStrings() {
    return {
      system: {
        title: 'Mentor System',
        shortDescription: "Mentors don't give orders. They give perspective.",
        fullDescription: "Mentors exist to help you understand your character — not to control them. When you speak with a mentor, they reflect your choices back to you: how your abilities, talents, and actions are shaping who you are becoming. Different mentors value different things, so the same character may be seen very differently depending on who you ask. Talking to a mentor never costs anything and never forces a decision. You aren't being told what to do — you're being shown how your character currently appears, and what paths that suggest. What you do with that insight is always up to you.",
        firstRunMessage: 'Welcome to the Mentor System. Your mentors are here to help you understand your character through their own experience and values. Nothing is required, nothing is locked—only perspective. Click any mentor to begin.',
        footerText: "Mentors are mirrors, not masters. You're always in control."
      },
      dialogueTopics: {},
      mentors: {},
      faqs: {},
      tips: []
    };
  }
}

/**
 * Hook to initialize strings when game is ready
 */
Hooks.once('ready', () => {
  MentorHelpStrings.init();
});
