/**
 * Mentor Reflective Dialogue UI Dialog
 *
 * Provides a beautiful dialog interface for accessing mentor reflective topics.
 * Players can choose a topic, and the mentor provides a personalized response
 * based on their character state, mentor memory, and DSP saturation.
 *
 * Usage:
 *   MentorReflectiveDialog.show(actor, mentorId);
 */

import { generateReflectiveDialogue } from './mentor-reflective-dialogue.js';
import { getMentorMemory, setMentorMemory, setCommittedPath, setTargetClass } from '../engine/mentor-memory.js';
import { MENTORS } from './mentor-dialogues.js';

// V2 API base class
import SWSEFormApplicationV2 from './base/swse-form-application-v2.js';

const TOPICS = [
  {
    key: "who_am_i_becoming",
    title: "Who am I becoming?",
    icon: "fa-mask",
    description: "Reflect on your evolving role and identity",
    gatesAt: 1
  },
  {
    key: "paths_open",
    title: "What paths are open to me?",
    icon: "fa-signs-post",
    description: "Explore archetype directions within your class",
    gatesAt: 1,
    prestigeOnly: false
  },
  {
    key: "doing_well",
    title: "What am I doing well?",
    icon: "fa-thumbs-up",
    description: "Receive affirmation and analysis of your choices",
    gatesAt: 3
  },
  {
    key: "doing_wrong",
    title: "What am I doing wrong?",
    icon: "fa-triangle-exclamation",
    description: "Identify gaps and inconsistencies in your build",
    gatesAt: 3
  },
  {
    key: "how_should_i_fight",
    title: "How should I fight?",
    icon: "fa-shield",
    description: "Learn your optimal combat role",
    gatesAt: 5
  },
  {
    key: "be_careful",
    title: "What should I be careful of?",
    icon: "fa-warning",
    description: "Understand risks and over-specialization traps",
    gatesAt: 5
  },
  {
    key: "what_lies_ahead",
    title: "What lies ahead?",
    icon: "fa-sparkles",
    description: "Explore prestige class options and planning",
    gatesAt: 6
  },
  {
    key: "how_would_you_play",
    title: "How would you play this class?",
    icon: "fa-person",
    description: "Experience your mentor's personal philosophy",
    gatesAt: 1
  }
];

export class MentorReflectiveDialog extends SWSEFormApplicationV2 {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "mentor-reflective-dialog",
      classes: ["swse", "mentor-reflective-dialog"],
      template: "systems/foundryvtt-swse/templates/apps/mentor-reflective-dialog.hbs",
      width: 700,
      height: 600,
      resizable: true,
      draggable: true,
      scrollY: [".dialog-content"]
    });
  }

  constructor(actor, mentorId, options = {}) {
    super({}, options);
    this.actor = actor;
    this.mentorId = mentorId;
    this.currentTopic = null;
    this.currentDialogue = null;
  }

  get title() {
    const mentor = MENTORS[this.mentorId];
    return `${mentor?.name || "Your Mentor"} — Reflective Guidance`;
  }

  async _prepareContext() {
    const data = await super._prepareContext();

    const mentor = MENTORS[this.mentorId];
    const memory = getMentorMemory(this.actor, this.mentorId.toLowerCase());

    // Filter available topics based on level
    const availableTopics = TOPICS.filter(topic => {
      return this.actor.system.level >= topic.gatesAt;
    });

    data.actor = this.actor;
    data.mentor = mentor;
    data.mentorMemory = memory;
    data.topics = availableTopics;
    data.currentTopic = this.currentTopic;
    data.currentDialogue = this.currentDialogue;

    return data;
  }

  async _onRender(html, options) {
    await super._onRender(html, options);

    // Topic selection
    html.find('.topic-button').click(this._onSelectTopic.bind(this));

    // Dialogue actions
    html.find('.commit-path-btn').click(this._onCommitPath.bind(this));
    html.find('.set-target-class-btn').click(this._onSetTargetClass.bind(this));

    // Navigation
    html.find('.back-to-topics').click(this._onBackToTopics.bind(this));
  }

  async _onSelectTopic(event) {
    event.preventDefault();
    const topicKey = event.currentTarget.dataset.topic;

    this.currentTopic = TOPICS.find(t => t.key === topicKey);

    // Generate dialogue
    try {
      this.currentDialogue = await generateReflectiveDialogue(
        this.actor,
        this.mentorId,
        topicKey
      );
    } catch (err) {
      console.error('Error generating dialogue:', err);
      this.currentDialogue = {
        content: {
          observation: "An error occurred. Please try again.",
          suggestion: "",
          respectClause: ""
        }
      };
    }

    await this.render();
  }

  _onBackToTopics(event) {
    event.preventDefault();
    this.currentTopic = null;
    this.currentDialogue = null;
    this.render();
  }

  async _onCommitPath(event) {
    event.preventDefault();
    const pathName = event.currentTarget.dataset.path;

    let memory = getMentorMemory(this.actor, this.mentorId.toLowerCase());
    memory = setCommittedPath(memory, pathName);
    await setMentorMemory(this.actor, this.mentorId.toLowerCase(), memory);

    ui.notifications.info(`You have committed to the ${pathName} path. Your mentor will remember this.`);
    await this.render();
  }

  async _onSetTargetClass(event) {
    event.preventDefault();

    // Show a simple dialog to select prestige class
    const dialog = new Dialog({
      title: "Set Target Prestige Class",
      content: `
        <div class="form-group">
          <label>Which prestige class do you aspire to reach?</label>
          <input type="text" id="target-class-input" placeholder="e.g., Jedi Master, Sith Lord" value="" style="width: 100%; margin: 10px 0;" />
        </div>
      `,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: "Set Target",
          callback: async (html) => {
            const targetClass = html.find('#target-class-input').val();
            if (targetClass) {
              let memory = getMentorMemory(this.actor, this.mentorId.toLowerCase());
              memory = setTargetClass(memory, targetClass);
              await setMentorMemory(this.actor, this.mentorId.toLowerCase(), memory);

              ui.notifications.info(`Your mentor knows your ambition: ${targetClass}`);
              await this.render();
            }
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "confirm"
    });

    dialog.render(true);
  }

  async _updateObject(event, formData) {
    // Not used - handled via listeners
  }

  /**
   * Show the reflective dialogue dialog for an actor and mentor
   * @static
   * @param {Actor} actor - The character
   * @param {string} mentorId - The mentor class key
   */
  static show(actor, mentorId) {
    if (!actor || !mentorId) {
      ui.notifications.error("Mentor or character not found.");
      return;
    }

    const dialog = new MentorReflectiveDialog(actor, mentorId);
    dialog.render(true);
  }
}

/**
 * Menu entry for accessing mentor reflective dialogue
 * Can be called from actor sheet or levelup dialog
 */
export async function openMentorReflectiveDialog(actor) {
  if (!actor) {
    ui.notifications.error("No character selected.");
    return;
  }

  // Get the actor's mentor
  const level1Class = actor.getFlag('swse', 'level1Class');
  if (!level1Class || !MENTORS[level1Class]) {
    ui.notifications.warn("This character does not have a mentor assigned.");
    return;
  }

  MentorReflectiveDialog.show(actor, level1Class);
}

/**
 * Add a Mentor button to actor sheets
 * Hook into the Foundry actor sheet rendering
 */
export function setupMentorDialogueHooks() {
  Hooks.on('renderActorSheet', (sheet, html, data) => {
    // Check if this is a character (not NPC)
    if (sheet.actor.type !== 'character') return;

    // Add mentor button to the header
    const headerButtons = html.find('.window-title');
    if (headerButtons.length > 0) {
      const mentorBtn = $(
        `<button class="mentor-reflective-btn" title="Open Mentor Dialogue">
          <i class="fas fa-head-side-virus"></i>
        </button>`
      );

      mentorBtn.click((e) => {
        e.preventDefault();
        openMentorReflectiveDialog(sheet.actor);
      });

      html.find('.window-controls').prepend(mentorBtn);
    }
  });
}

// Auto-setup hooks on module load
if (typeof Hooks !== 'undefined') {
  Hooks.once('ready', setupMentorDialogueHooks);
}
