/**
 * SWSE Mentor BuildIntent Survey System
 *
 * Post-class survey that asks players about their character design intent.
 * Questions are asked in the mentor's voice for immersion.
 * Answers populate BuildIntent biases to personalize suggestions.
 * Features typing animation for mentor text.
 */

import { MENTORS } from '../../engines/mentor/mentor-dialogues.js';
import { MentorTranslationIntegration } from '../../engines/mentor/mentor-translation-integration.js';
import { swseLogger } from '../../utils/logger.js';
import { seedMentorMemoryFromSurvey, getMentorMemory, setMentorMemory } from '../../engines/mentor/mentor-memory.js';
import { ActorEngine } from '../../governance/actor-engine/actor-engine.js';

/**
 * Survey questions with mentor voice variants
 * Each class has 4-5 questions that get voiced by the mentor
 */
export const MENTOR_VOICED_SURVEY = {
  'Jedi': {
    jedi_archetype_path: {
      question: (mentor) => `${mentor.name} asks: "Which path calls to you as a Jedi?"`,
      answers: [
        {
          text: 'Guardian - Frontline protector who endures and controls space',
          biases: { archetype: 'guardian', guardian: 0.4, survivability: 0.3 }
        },
        {
          text: 'Consular - Force-focused specialist emphasizing control and mastery',
          biases: { archetype: 'consular', forceFocus: 0.4, control: 0.3 }
        },
        {
          text: 'Sentinel - Balanced operative blending combat, awareness, and versatility',
          biases: { archetype: 'sentinel', balance: 0.3 }
        },
        {
          text: 'Duelist - Precision combatant who ends threats decisively',
          biases: { archetype: 'duelist', striker: 0.4, melee: 0.3 }
        },
        {
          text: 'Healer - Support-focused Force user dedicated to preservation and recovery',
          biases: { archetype: 'healer', forceFocus: 0.3, support: 0.3 }
        }
      ]
    },
    jedi_force_philosophy: {
      question: (mentor) => `${mentor.name} asks: "How do you view the Force?"`,
      answers: [
        {
          text: 'The Force is the source of all power - master it first',
          biases: { forceFocus: 0.4 }
        },
        {
          text: 'The Force is a tool to enhance my combat abilities',
          biases: { melee: 0.2, forceFocus: 0.2 }
        },
        {
          text: 'The Force guides my awareness and perception',
          biases: { awareness: 0.3 }
        },
        {
          text: 'Not yet decided',
          biases: {}
        }
      ]
    },
    jedi_role_focus: {
      question: (mentor) => `${mentor.name} asks: "In a group, what's your strongest contribution?"`,
      answers: [
        {
          text: 'Standing between allies and harm',
          biases: { guardian: 0.3, survivability: 0.2 }
        },
        {
          text: 'Controlling the battle through positioning and precision',
          biases: { control: 0.3 }
        },
        {
          text: 'Dealing decisive damage to threats',
          biases: { striker: 0.3, damage: 0.2 }
        },
        {
          text: 'Supporting and enabling team success',
          biases: { support: 0.3 }
        },
        {
          text: "I don't know yet",
          biases: {}
        }
      ]
    },
    jedi_future_path: {
      question: (mentor) => `${mentor.name} asks: "Which path calls to you as you grow in power?"`,
      answers: [
        {
          text: 'Jedi Knight/Master - A great defender of the light and keeper of peace',
          biases: { order: 0.4, guardian: 0.2, prestigeClass: 'Jedi Knight' }
        },
        {
          text: 'Sith Apprentice/Lord - Embracing power and dominion through the dark side',
          biases: { riskTolerance: 0.4, striker: 0.3, prestigeClass: 'Sith Apprentice' }
        },
        {
          text: 'Force Adept/Disciple - Independent mastery beyond the Order',
          biases: { pragmatic: 0.3, balance: 0.3, prestigeClass: 'Force Adept' }
        },
        {
          text: 'Imperial Knight - Serving empire and authority with the Force',
          biases: { authority: 0.3, control: 0.2, prestigeClass: 'Imperial Knight' }
        },
        {
          text: 'Still uncertain of my destiny',
          biases: {}
        }
      ]
    },
    jedi_ability_focus: {
      question: (mentor) => `${mentor.name} asks: "What Force disciplines fascinate you most?"`,
      answers: [
        {
          text: 'Telekinesis and moving objects with will alone',
          biases: { forceFocus: 0.3, control: 0.2 }
        },
        {
          text: 'Lightning and deadly Force techniques',
          biases: { forceFocus: 0.3, damage: 0.2 }
        },
        {
          text: 'Healing, protection, and defense',
          biases: { forceFocus: 0.2, support: 0.3 }
        },
        {
          text: 'Enhancing physical prowess - speed, strength, resilience',
          biases: { melee: 0.3, forceFocus: 0.2 }
        },
        {
          text: 'Many different disciplines equally',
          biases: { balance: 0.2 }
        }
      ]
    }
  },

  'Soldier': {
    soldier_archetype_path: {
      question: (mentor) => `${mentor.name} asks: "What's your Soldier's fighting philosophy?"`,
      answers: [
        {
          text: 'Commando - Front-line assault specialist with heavy firepower',
          biases: { archetype: 'commando', striker: 0.4, damage: 0.3 }
        },
        {
          text: 'Gunner - Master of ranged weapons and tactical positioning',
          biases: { archetype: 'gunner', ranged: 0.4 }
        },
        {
          text: 'Guardian - Defender who holds the line and protects allies',
          biases: { archetype: 'guardian', guardian: 0.4, survivability: 0.3 }
        },
        {
          text: 'Not quite sure',
          biases: {}
        }
      ]
    },
    soldier_combat_approach: {
      question: (mentor) => `${mentor.name} asks: "On the battlefield, you prefer to…"`,
      answers: [
        {
          text: 'Charge in and overwhelm enemies with force',
          biases: { striker: 0.3, melee: 0.2 }
        },
        {
          text: 'Rain fire from a secure position',
          biases: { ranged: 0.3 }
        },
        {
          text: 'Control the space and protect your team',
          biases: { guardian: 0.3, survivability: 0.2 }
        },
        {
          text: 'Adapt to what the moment demands',
          biases: { balance: 0.2 }
        },
        {
          text: "I don't know yet",
          biases: {}
        }
      ]
    },
    soldier_mechanical_priority: {
      question: (mentor) => `${mentor.name} asks: "What matters most to you?"`,
      answers: [
        {
          text: 'Dealing massive damage',
          biases: { damage: 0.3 }
        },
        {
          text: 'Never falling in battle',
          biases: { survivability: 0.3 }
        },
        {
          text: 'Commanding respect and leading others',
          biases: { leadership: 0.3 }
        },
        {
          text: 'Being effective in any situation',
          biases: { balance: 0.2 }
        }
      ]
    },
    soldier_advancement: {
      question: (mentor) => `${mentor.name} asks: "What does mastery look like for you?"`,
      answers: [
        {
          text: 'Elite Soldier - Specialized operative at the peak of tactical combat',
          biases: { striker: 0.3, damage: 0.3, prestigeClass: 'Elite Trooper' }
        },
        {
          text: 'Vanguard - Tank and frontline powerhouse who controls the battlefield',
          biases: { guardian: 0.4, survivability: 0.2, prestigeClass: 'Vanguard' }
        },
        {
          text: 'Ace Pilot - Master of vehicles and aerial/vehicle combat',
          biases: { striker: 0.3, control: 0.2, prestigeClass: 'Ace Pilot' }
        },
        {
          text: 'Martial Arts Master - Legendary unarmed and melee combatant',
          biases: { striker: 0.4, melee: 0.3, prestigeClass: 'Martial Arts Master' }
        },
        {
          text: 'Gladiator - Arena legend whose name strikes fear in hearts',
          biases: { striker: 0.3, damage: 0.3, prestigeClass: 'Gladiator' }
        }
      ]
    },
    soldier_weapon_mastery: {
      question: (mentor) => `${mentor.name} asks: "Which weapon system do you want to master?"`,
      answers: [
        {
          text: 'Heavy weapons - Rockets, grenades, explosive firepower',
          biases: { ranged: 0.3, damage: 0.2 }
        },
        {
          text: 'Precision rifles - Accuracy and controlled fire',
          biases: { ranged: 0.3, control: 0.2 }
        },
        {
          text: 'Automatic carbines - Rate of fire and suppression',
          biases: { ranged: 0.3, mobility: 0.2 }
        },
        {
          text: 'Melee weapons - Blades and hand-to-hand combat',
          biases: { melee: 0.3, striker: 0.2 }
        },
        {
          text: 'Mastery of all weapon types',
          biases: { balance: 0.2 }
        }
      ]
    }
  },

  'Scout': {
    scout_archetype_path: {
      question: (mentor) => `${mentor.name} asks: "Which Scout archetype calls to you?"`,
      answers: [
        {
          text: 'Tracker - Pursuit specialist who hunts across terrain and finds prey',
          biases: { archetype: 'tracker', striker: 0.4, survival: 0.2 }
        },
        {
          text: 'Infiltrator - Stealth operative who moves unseen through hostile territory',
          biases: { archetype: 'infiltrator', controller: 0.4, stealth: 0.3 }
        },
        {
          text: 'Striker - Swift combatant who hits hard and vanishes',
          biases: { archetype: 'striker', striker: 0.5, mobility: 0.2 }
        },
        {
          text: 'Still deciding',
          biases: {}
        }
      ]
    },
    scout_tactical_focus: {
      question: (mentor) => `${mentor.name} asks: "In the field, your strength is…"`,
      answers: [
        {
          text: 'Seeing what others miss - awareness and perception',
          biases: { awareness: 0.3 }
        },
        {
          text: 'Moving faster and further than enemies expect',
          biases: { mobility: 0.3 }
        },
        {
          text: 'Finding a way to survive anything',
          biases: { survival: 0.3 }
        },
        {
          text: "Striking enemies before they know you're there",
          biases: { stealth: 0.3 }
        },
        {
          text: "I don't know yet",
          biases: {}
        }
      ]
    },
    scout_engagement_style: {
      question: (mentor) => `${mentor.name} asks: "When you engage, you prefer to…"`,
      answers: [
        {
          text: 'Deal swift, overwhelming damage',
          biases: { striker: 0.3, damage: 0.2 }
        },
        {
          text: 'Attack and reposition before counterattack',
          biases: { mobility: 0.3 }
        },
        {
          text: 'Stay hidden and undetected',
          biases: { stealth: 0.3 }
        },
        {
          text: 'Read the situation and adapt',
          biases: { balance: 0.2 }
        },
        {
          text: "I don't know yet",
          biases: {}
        }
      ]
    },
    scout_future_calling: {
      question: (mentor) => `${mentor.name} asks: "Which prestige calls to you as a Scout?"`,
      answers: [
        {
          text: 'Pathfinder - Master explorer and guide through any wilderness or ruin',
          biases: { striker: 0.4, survival: 0.3, prestigeClass: 'Pathfinder' }
        },
        {
          text: 'Bounty Hunter - Tracker and professional who brings targets to justice',
          biases: { striker: 0.4, awareness: 0.2, prestigeClass: 'Bounty Hunter' }
        },
        {
          text: 'Infiltrator - Shadow operative moving unseen through enemy territory',
          biases: { stealth: 0.4, control: 0.2, prestigeClass: 'Infiltrator' }
        },
        {
          text: 'Saboteur - Expert in destruction and disabling critical systems',
          biases: { striker: 0.3, control: 0.2, prestigeClass: 'Saboteur' }
        },
        {
          text: 'Military Engineer - Tactical genius of terrain, fortifications, and combat infrastructure',
          biases: { control: 0.4, leadership: 0.2, prestigeClass: 'Military Engineer' }
        }
      ]
    },
    scout_expertise: {
      question: (mentor) => `${mentor.name} asks: "What kind of Scout expertise fascinates you?"`,
      answers: [
        {
          text: 'Tracking and hunting - Following any prey across any terrain',
          biases: { survival: 0.3, awareness: 0.2 }
        },
        {
          text: 'Infiltration - Bypassing defenses and moving unseen',
          biases: { stealth: 0.3, control: 0.2 }
        },
        {
          text: 'Swift strikes - Hit fast and hard before enemies react',
          biases: { striker: 0.3, mobility: 0.2 }
        },
        {
          text: 'Environmental mastery - Excellence in wilderness and dangerous places',
          biases: { survival: 0.3, awareness: 0.2 }
        },
        {
          text: 'All of the above equally',
          biases: { balance: 0.2 }
        }
      ]
    }
  },

  'Scoundrel': {
    scoundrel_archetype_path: {
      question: (mentor) => `${mentor.name} asks: "What kind of Scoundrel speaks to your heart?"`,
      answers: [
        {
          text: 'Charmer - Persuasion specialist who talks their way out of anything',
          biases: { archetype: 'charmer', controller: 0.4, social: 0.3 }
        },
        {
          text: 'Gambler - Risk-taker who makes luck and reads probability better than most',
          biases: { archetype: 'gambler', striker: 0.4 }
        },
        {
          text: "Thief - Precision specialist who takes what's not theirs with surgical skill",
          biases: { archetype: 'thief', striker: 0.4, stealth: 0.3 }
        },
        {
          text: 'Still deciding',
          biases: {}
        }
      ]
    },
    scoundrel_approach: {
      question: (mentor) => `${mentor.name} asks: "Your Scoundrel's strongest tool is…"`,
      answers: [
        {
          text: 'Words and persuasion',
          biases: { social: 0.3 }
        },
        {
          text: 'Speed and precision',
          biases: { striker: 0.3 }
        },
        {
          text: 'Stealth and invisibility',
          biases: { stealth: 0.3 }
        },
        {
          text: 'Quick thinking and improvisation',
          biases: { balance: 0.2 }
        },
        {
          text: "I don't know yet",
          biases: {}
        }
      ]
    },
    scoundrel_risk_tolerance: {
      question: (mentor) => `${mentor.name} asks: "In a tight spot, you…"`,
      answers: [
        {
          text: 'Talk or manipulate your way out',
          biases: { social: 0.3 }
        },
        {
          text: 'Make a daring play and hope it works',
          biases: { riskTolerance: 0.3 }
        },
        {
          text: 'Use preparation and cunning',
          biases: { control: 0.3 }
        },
        {
          text: 'Adapt based on the moment',
          biases: { balance: 0.2 }
        },
        {
          text: "I don't know yet",
          biases: {}
        }
      ]
    },
    scoundrel_ambition: {
      question: (mentor) => `${mentor.name} asks: "Which prestige speaks to your Scoundrel's heart?"`,
      answers: [
        {
          text: 'Assassin - Master of stealth killing and professional elimination',
          biases: { stealth: 0.4, striker: 0.3, prestigeClass: 'Assassin' }
        },
        {
          text: 'Outlaw - Legendary fugitive feared by authorities across the galaxy',
          biases: { striker: 0.3, pragmatic: 0.3, prestigeClass: 'Outlaw' }
        },
        {
          text: 'Master Privateer - Pirate captain commanding ships and plundering wealth',
          biases: { leadership: 0.3, striker: 0.2, prestigeClass: 'Master Privateer' }
        },
        {
          text: 'Gunslinger - Fastest draw and deadliest shot in known space',
          biases: { striker: 0.4, ranged: 0.3, prestigeClass: 'Gunslinger' }
        },
        {
          text: 'Ace Pilot - Master of ships and aerial combat supremacy',
          biases: { striker: 0.3, control: 0.2, prestigeClass: 'Ace Pilot' }
        }
      ]
    },
    scoundrel_tactics: {
      question: (mentor) => `${mentor.name} asks: "What's your specialty as a Scoundrel?"`,
      answers: [
        {
          text: 'Charisma and social engineering - Talking my way in and out',
          biases: { social: 0.3 }
        },
        {
          text: 'Deception and disguise - Becoming someone else entirely',
          biases: { stealth: 0.2, social: 0.2 }
        },
        {
          text: 'Theft and infiltration - Taking what I want undetected',
          biases: { stealth: 0.3 }
        },
        {
          text: 'Explosives and direct action - When subtlety fails',
          biases: { striker: 0.3, damage: 0.2 }
        },
        {
          text: 'A mix of all approaches',
          biases: { balance: 0.2 }
        }
      ]
    }
  },

  'Noble': {
    noble_archetype_path: {
      question: (mentor) => `${mentor.name} asks: "What kind of Noble will you become?"`,
      answers: [
        {
          text: 'Diplomat - Persuasion specialist who builds consensus and finds common ground',
          biases: { archetype: 'diplomat', controller: 0.4, social: 0.3 }
        },
        {
          text: 'Leader - Inspirational figure who commands respect and unites others',
          biases: { archetype: 'leader', leadership: 0.4 }
        },
        {
          text: 'Scoundrel - Cunning operator who plays by different rules',
          biases: { archetype: 'scoundrel', striker: 0.3, social: 0.2 }
        },
        {
          text: 'Still finding my path',
          biases: {}
        }
      ]
    },
    noble_approach: {
      question: (mentor) => `${mentor.name} asks: "How do you wield your power?"`,
      answers: [
        {
          text: 'Through inspiration and unity',
          biases: { leadership: 0.3 }
        },
        {
          text: 'Through negotiation and understanding',
          biases: { social: 0.3 }
        },
        {
          text: 'Through cunning and unconventional means',
          biases: { control: 0.2, social: 0.2 }
        },
        {
          text: 'Through presence and command',
          biases: { authority: 0.3 }
        },
        {
          text: "I don't know yet",
          biases: {}
        }
      ]
    },
    noble_role_in_combat: {
      question: (mentor) => `${mentor.name} asks: "In the chaos of battle, you…"`,
      answers: [
        {
          text: 'Lead from the front and inspire allies',
          biases: { leadership: 0.3 }
        },
        {
          text: 'Direct from the back with strategy',
          biases: { control: 0.3 }
        },
        {
          text: 'Support and enable others to succeed',
          biases: { support: 0.3 }
        },
        {
          text: 'Stay out of direct harm if possible',
          biases: { avoidance: 0.3 }
        },
        {
          text: "I don't know yet",
          biases: {}
        }
      ]
    },
    noble_future_station: {
      question: (mentor) => `${mentor.name} asks: "Which prestige path calls to you?"`,
      answers: [
        {
          text: 'Officer - Military leader commanding troops and controlling strategy',
          biases: { leadership: 0.4, guardian: 0.2, prestigeClass: 'Officer' }
        },
        {
          text: 'Melee Duelist - Master combatant of blade and personal prowess',
          biases: { striker: 0.4, melee: 0.3, prestigeClass: 'Melee Duelist' }
        },
        {
          text: 'Corporate Agent - Power through business, networks, and resources',
          biases: { control: 0.3, social: 0.3, prestigeClass: 'Corporate Agent' }
        },
        {
          text: 'Crime Lord - Building empire through cunning and shadow networks',
          biases: { striker: 0.2, control: 0.3, prestigeClass: 'Crime Lord' }
        },
        {
          text: 'Charlatan - Master manipulator and con artist of legendary skill',
          biases: { social: 0.4, pragmatic: 0.2, prestigeClass: 'Charlatan' }
        }
      ]
    },
    noble_core_value: {
      question: (mentor) => `${mentor.name} asks: "What value guides your Noble heart?"`,
      answers: [
        {
          text: 'Honor and duty - Serving a cause greater than myself',
          biases: { order: 0.3, leadership: 0.2 }
        },
        {
          text: 'Pragmatism and survival - Power and influence above all',
          biases: { pragmatic: 0.3, riskTolerance: 0.2 }
        },
        {
          text: 'Building connections - My network is my strength',
          biases: { social: 0.3, leadership: 0.2 }
        },
        {
          text: 'Personal ambition - Achieving excellence and recognition',
          biases: { striker: 0.2, authority: 0.2 }
        },
        {
          text: 'Still discovering who I am',
          biases: {}
        }
      ]
    }
  }
};

/**
 * MentorSurvey - Manages mentor-voiced BuildIntent surveys
 */
export class MentorSurvey {
  /**
   * Prompt the player to take a mentoring survey
   * @param {Actor} actor - The character actor
   * @param {string} mentorName - The mentor's name
   * @param {string} playerName - The player's character name
   * @returns {Promise<boolean>} true if player accepts survey, false otherwise
   */
  static async promptSurvey(actor, mentorName, playerName = '') {
    swseLogger.log(`[MENTOR-SURVEY] promptSurvey: START - Actor: ${actor.id} (${actor.name}), Mentor: "${mentorName}"`);
    const mentor = MENTORS[mentorName];
    if (!mentor) {
      swseLogger.error(`[MENTOR-SURVEY] ERROR: Mentor not found: "${mentorName}"`);
      swseLogger.error(`[MENTOR-SURVEY] Available mentors:`, Object.keys(MENTORS));
      return false;
    }
    swseLogger.log(`[MENTOR-SURVEY] promptSurvey: Mentor found: "${mentor.name}" (${mentor.title})`);

    return new Promise((resolve) => {
      try {
        swseLogger.log(`[MENTOR-SURVEY] promptSurvey: Building dialog content...`, {
          mentorName: mentor.name,
          mentorTitle: mentor.title,
          portraitUrl: mentor.portrait,
          playerName: playerName
        });

        const dialog = new SWSEDialogV2(
          {
            title: `${mentor.name} - Mentoring Survey`,
            content: `
              <div class="mentor-survey-container">
                <div class="mentor-intro-section">
                  <div class="mentor-portrait">
                    <img src="${mentor.portrait}" alt="${mentor.name}" />
                  </div>
                  <div class="mentor-intro-text">
                    <h2>${mentor.name}</h2>
                    <p class="mentor-title">${mentor.title}</p>
                    <p class="mentor-greeting">${mentor.description}</p>
                    ${playerName ? `<p class="mentor-address"><em>"Welcome, ${playerName}. I can help guide your journey."</em></p>` : ''}
                    <p class="survey-prompt">
                      I'd like to understand your character's goals and design philosophy better.
                      Would you be willing to answer a few quick questions? It will help me provide better mentorship.
                    </p>
                  </div>
                </div>
              </div>
            `,
            buttons: {
              accept: {
                icon: '<i class="fa-solid fa-check"></i>',
                label: "I'm ready",
                callback: () => {
                  swseLogger.log(`[MENTOR-SURVEY] promptSurvey: ✓ User clicked ACCEPT button`);
                  resolve(true);
                }
              },
              decline: {
                icon: '<i class="fa-solid fa-times"></i>',
                label: 'Maybe later',
                callback: () => {
                  swseLogger.log(`[MENTOR-SURVEY] promptSurvey: ✓ User clicked DECLINE button`);
                  resolve(false);
                }
              }
            },
            default: 'accept',
            render: (html) => {
              swseLogger.log(`[MENTOR-SURVEY] promptSurvey: Dialog render callback fired, html:`, { hasHtml: !!html, length: html?.length });
              const root = this.element;
              const greetingElement = root?.querySelector?.('.mentor-greeting');
              if (greetingElement) {
                const greetingText = greetingElement.textContent;
                greetingElement.textContent = '';
                MentorTranslationIntegration.render({
                  text: greetingText,
                  container: greetingElement,
                  mentor: MentorTranslationIntegration.normalizeMentorKey(this.currentMentorClass ?? 'default'),
                  topic: 'mentor_survey_greeting',
                  force: true
                });
              } else {
                swseLogger.warn(`[MENTOR-SURVEY] promptSurvey: Greeting element not found in rendered HTML`);
              }
            }
          },
          { classes: ['mentor-survey-dialog', 'holo-window'], width: 650, height: 'auto', resizable: true }
        );

        swseLogger.log(`[MENTOR-SURVEY] promptSurvey: ✓ Dialog object created`, {
          title: dialog.title,
          buttons: Object.keys(dialog.options?.buttons || {})
        });

        swseLogger.log(`[MENTOR-SURVEY] promptSurvey: Calling dialog.render(true)...`);
        const renderResult = dialog.render(true);
        swseLogger.log(`[MENTOR-SURVEY] promptSurvey: ✓ dialog.render(true) returned:`, { renderResult });
      } catch (err) {
        swseLogger.error(`[MENTOR-SURVEY] promptSurvey: EXCEPTION during dialog creation/render:`, err);
        swseLogger.error(`[MENTOR-SURVEY] promptSurvey: ERROR DETAILS`, {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
        resolve(false);
      }
    });
  }

  /**
   * Check if mentor survey has been completed for this actor
   * @param {Actor} actor - The character actor
   * @returns {boolean}
   */
  static hasSurveyBeenCompleted(actor) {
    const completed = actor.system?.swse?.mentorSurveyCompleted === true;
    swseLogger.log(`[MENTOR-SURVEY] hasSurveyBeenCompleted: Actor ${actor.id} (${actor.name}) - ${completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
    return completed;
  }

  /**
   * Get stored mentor biases from an actor
   * @param {Actor} actor - The character actor
   * @returns {Object} The stored biases or empty object
   */
  static getMentorBiases(actor) {
    const biases = actor.system?.swse?.mentorBuildIntentBiases || {};
    swseLogger.log(`[MENTOR-SURVEY] getMentorBiases: Retrieved biases for actor ${actor.id}:`, biases);
    return biases;
  }

  /**
   * Store survey data on the actor
   * @param {Actor} actor - The character actor
   * @param {Object} surveyAnswers - The survey answers
   * @param {Object} biases - The processed biases
   */
  static async storeSurveyData(actor, surveyAnswers, biases) {
    swseLogger.log(`[MENTOR-SURVEY] storeSurveyData: START - Actor: ${actor.id} (${actor.name})`);
    swseLogger.log(`[MENTOR-SURVEY] storeSurveyData: Storing ${Object.keys(surveyAnswers || {}).length} survey answers`);
    swseLogger.log(`[MENTOR-SURVEY] storeSurveyData: Storing biases:`, biases);

    const updates = {
      'system.swse.mentorBuildIntentBiases': biases,
      'system.swse.mentorSurveyCompleted': true,
      'system.swse.surveyResponses': surveyAnswers
    };

    try {
      await ActorEngine.updateActor(actor, updates);
      swseLogger.log(`[MENTOR-SURVEY] storeSurveyData: Survey data stored successfully`);

      try {
        const mentorId = actor.getFlag('foundryvtt-swse', 'level1Class');
        if (mentorId) {
          const seededMemory = seedMentorMemoryFromSurvey(biases);
          await setMentorMemory(actor, mentorId.toLowerCase(), seededMemory);
          swseLogger.log(`[MENTOR-SURVEY] storeSurveyData: Seeded mentor memory for ${mentorId}:`, seededMemory);
        }
      } catch (memErr) {
        swseLogger.error(`[MENTOR-SURVEY] ERROR seeding mentor memory:`, memErr);
      }
    } catch (err) {
      swseLogger.error(`[MENTOR-SURVEY] ERROR storing survey data:`, err);
      throw err;
    }
  }
}

/**
 * Get survey responses for an actor
 * @param {Actor} actor - The character actor
 * @returns {Object|null} The stored survey responses or null
 */
export function getSurveyResponses(actor) {
  return actor.system?.swse?.surveyResponses || null;
}

/**
 * Process survey answers and extract BuildIntent biases
 * @param {Object} surveyAnswers - The survey answers object
 * @returns {Object} Compiled biases for BuildIntent
 */
export function processSurveyAnswers(surveyAnswers) {
  swseLogger.log(`[MENTOR-SURVEY] processSurveyAnswers: Processing survey answers`);
  const biases = {};
  let prestigeClassTarget = null;

  if (!surveyAnswers) {
    return biases;
  }

  for (const answerId in surveyAnswers) {
    const answer = surveyAnswers[answerId];
    const answerBiases = answer.biases || {};

    if (answerBiases.prestigeClass && !prestigeClassTarget) {
      prestigeClassTarget = answerBiases.prestigeClass;
    }

    for (const biasKey in answerBiases) {
      if (biasKey !== 'prestigeClass') {
        biases[biasKey] = (biases[biasKey] || 0) + answerBiases[biasKey];
      }
    }
  }

  if (prestigeClassTarget) {
    biases.prestigeClassTarget = prestigeClassTarget;
    biases.prestigeClassBias = 0.8;
  }

  return biases;
}
