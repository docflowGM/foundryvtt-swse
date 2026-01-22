/**
 * SWSE Mentor BuildIntent Survey System
 *
 * Post-class survey that asks players about their character design intent.
 * Questions are asked in the mentor's voice for immersion.
 * Answers populate BuildIntent biases to personalize suggestions.
 * Features typing animation for mentor text.
 */

import { MENTORS } from './mentor-dialogues.js';
import { TypingAnimation } from '../utils/typing-animation.js';
import { swseLogger } from '../utils/logger.js';
import { seedMentorMemoryFromSurvey, getMentorMemory, setMentorMemory } from '../engine/mentor-memory.js';

/**
 * Survey questions with mentor voice variants
 * Each class has 4-5 questions that get voiced by the mentor
 */
export const MENTOR_VOICED_SURVEY = {
  "Jedi": {
    jedi_archetype_path: {
      question: (mentor) => `${mentor.name} asks: "Which path calls to you as a Jedi?"`,
      answers: [
        {
          text: "Guardian - Frontline protector who endures and controls space",
          biases: { archetype: "guardian", guardian: 0.4, survivability: 0.3 }
        },
        {
          text: "Consular - Force-focused specialist emphasizing control and mastery",
          biases: { archetype: "consular", forceFocus: 0.4, control: 0.3 }
        },
        {
          text: "Sentinel - Balanced operative blending combat, awareness, and versatility",
          biases: { archetype: "sentinel", balance: 0.3 }
        },
        {
          text: "Duelist - Precision combatant who ends threats decisively",
          biases: { archetype: "duelist", striker: 0.4, melee: 0.3 }
        },
        {
          text: "Healer - Support-focused Force user dedicated to preservation and recovery",
          biases: { archetype: "healer", forceFocus: 0.3, support: 0.3 }
        }
      ]
    },
    jedi_force_philosophy: {
      question: (mentor) => `${mentor.name} asks: "How do you view the Force?"`,
      answers: [
        {
          text: "The Force is the source of all power - master it first",
          biases: { forceFocus: 0.4 }
        },
        {
          text: "The Force is a tool to enhance my combat abilities",
          biases: { melee: 0.2, forceFocus: 0.2 }
        },
        {
          text: "The Force guides my awareness and perception",
          biases: { awareness: 0.3 }
        },
        {
          text: "Not yet decided",
          biases: {}
        }
      ]
    },
    jedi_role_focus: {
      question: (mentor) => `${mentor.name} asks: "In a group, what's your strongest contribution?"`,
      answers: [
        {
          text: "Standing between allies and harm",
          biases: { guardian: 0.3, survivability: 0.2 }
        },
        {
          text: "Controlling the battle through positioning and precision",
          biases: { control: 0.3 }
        },
        {
          text: "Dealing decisive damage to threats",
          biases: { striker: 0.3, damage: 0.2 }
        },
        {
          text: "Supporting and enabling team success",
          biases: { support: 0.3 }
        }
      ]
    }
  },

  "Soldier": {
    soldier_archetype_path: {
      question: (mentor) => `${mentor.name} asks: "What's your Soldier's fighting philosophy?"`,
      answers: [
        {
          text: "Commando - Front-line assault specialist with heavy firepower",
          biases: { archetype: "commando", striker: 0.4, damage: 0.3 }
        },
        {
          text: "Gunner - Master of ranged weapons and tactical positioning",
          biases: { archetype: "gunner", ranged: 0.4 }
        },
        {
          text: "Guardian - Defender who holds the line and protects allies",
          biases: { archetype: "guardian", guardian: 0.4, survivability: 0.3 }
        },
        {
          text: "Not quite sure",
          biases: {}
        }
      ]
    },
    soldier_combat_approach: {
      question: (mentor) => `${mentor.name} asks: "On the battlefield, you prefer to…"`,
      answers: [
        {
          text: "Charge in and overwhelm enemies with force",
          biases: { striker: 0.3, melee: 0.2 }
        },
        {
          text: "Rain fire from a secure position",
          biases: { ranged: 0.3 }
        },
        {
          text: "Control the space and protect your team",
          biases: { guardian: 0.3, survivability: 0.2 }
        },
        {
          text: "Adapt to what the moment demands",
          biases: { balance: 0.2 }
        }
      ]
    },
    soldier_mechanical_priority: {
      question: (mentor) => `${mentor.name} asks: "What matters most to you?"`,
      answers: [
        {
          text: "Dealing massive damage",
          biases: { damage: 0.3 }
        },
        {
          text: "Never falling in battle",
          biases: { survivability: 0.3 }
        },
        {
          text: "Commanding respect and leading others",
          biases: { leadership: 0.3 }
        },
        {
          text: "Being effective in any situation",
          biases: { balance: 0.2 }
        }
      ]
    }
  },

  "Scout": {
    scout_archetype_path: {
      question: (mentor) => `${mentor.name} asks: "Which Scout archetype calls to you?"`,
      answers: [
        {
          text: "Tracker - Pursuit specialist who hunts across terrain and finds prey",
          biases: { archetype: "tracker", striker: 0.4, survival: 0.2 }
        },
        {
          text: "Infiltrator - Stealth operative who moves unseen through hostile territory",
          biases: { archetype: "infiltrator", controller: 0.4, stealth: 0.3 }
        },
        {
          text: "Striker - Swift combatant who hits hard and vanishes",
          biases: { archetype: "striker", striker: 0.5, mobility: 0.2 }
        },
        {
          text: "Still deciding",
          biases: {}
        }
      ]
    },
    scout_tactical_focus: {
      question: (mentor) => `${mentor.name} asks: "In the field, your strength is…"`,
      answers: [
        {
          text: "Seeing what others miss - awareness and perception",
          biases: { awareness: 0.3 }
        },
        {
          text: "Moving faster and further than enemies expect",
          biases: { mobility: 0.3 }
        },
        {
          text: "Finding a way to survive anything",
          biases: { survival: 0.3 }
        },
        {
          text: "Striking enemies before they know you're there",
          biases: { stealth: 0.3 }
        }
      ]
    },
    scout_engagement_style: {
      question: (mentor) => `${mentor.name} asks: "When you engage, you prefer to…"`,
      answers: [
        {
          text: "Deal swift, overwhelming damage",
          biases: { striker: 0.3, damage: 0.2 }
        },
        {
          text: "Attack and reposition before counterattack",
          biases: { mobility: 0.3 }
        },
        {
          text: "Stay hidden and undetected",
          biases: { stealth: 0.3 }
        },
        {
          text: "Read the situation and adapt",
          biases: { balance: 0.2 }
        }
      ]
    }
  },

  "Scoundrel": {
    scoundrel_archetype_path: {
      question: (mentor) => `${mentor.name} asks: "What kind of Scoundrel speaks to your heart?"`,
      answers: [
        {
          text: "Charmer - Persuasion specialist who talks their way out of anything",
          biases: { archetype: "charmer", controller: 0.4, social: 0.3 }
        },
        {
          text: "Gambler - Risk-taker who makes luck and reads probability better than most",
          biases: { archetype: "gambler", striker: 0.4 }
        },
        {
          text: "Thief - Precision specialist who takes what's not theirs with surgical skill",
          biases: { archetype: "thief", striker: 0.4, stealth: 0.3 }
        },
        {
          text: "Still deciding",
          biases: {}
        }
      ]
    },
    scoundrel_approach: {
      question: (mentor) => `${mentor.name} asks: "Your Scoundrel's strongest tool is…"`,
      answers: [
        {
          text: "Words and persuasion",
          biases: { social: 0.3 }
        },
        {
          text: "Speed and precision",
          biases: { striker: 0.3 }
        },
        {
          text: "Stealth and invisibility",
          biases: { stealth: 0.3 }
        },
        {
          text: "Quick thinking and improvisation",
          biases: { balance: 0.2 }
        }
      ]
    },
    scoundrel_risk_tolerance: {
      question: (mentor) => `${mentor.name} asks: "In a tight spot, you…"`,
      answers: [
        {
          text: "Talk or manipulate your way out",
          biases: { social: 0.3 }
        },
        {
          text: "Make a daring play and hope it works",
          biases: { riskTolerance: 0.3 }
        },
        {
          text: "Use preparation and cunning",
          biases: { control: 0.3 }
        },
        {
          text: "Adapt based on the moment",
          biases: { balance: 0.2 }
        }
      ]
    }
  },

  "Noble": {
    noble_archetype_path: {
      question: (mentor) => `${mentor.name} asks: "What kind of Noble will you become?"`,
      answers: [
        {
          text: "Diplomat - Persuasion specialist who builds consensus and finds common ground",
          biases: { archetype: "diplomat", controller: 0.4, social: 0.3 }
        },
        {
          text: "Leader - Inspirational figure who commands respect and unites others",
          biases: { archetype: "leader", leadership: 0.4 }
        },
        {
          text: "Scoundrel - Cunning operator who plays by different rules",
          biases: { archetype: "scoundrel", striker: 0.3, social: 0.2 }
        },
        {
          text: "Still finding my path",
          biases: {}
        }
      ]
    },
    noble_approach: {
      question: (mentor) => `${mentor.name} asks: "How do you wield your power?"`,
      answers: [
        {
          text: "Through inspiration and unity",
          biases: { leadership: 0.3 }
        },
        {
          text: "Through negotiation and understanding",
          biases: { social: 0.3 }
        },
        {
          text: "Through cunning and unconventional means",
          biases: { control: 0.2, social: 0.2 }
        },
        {
          text: "Through presence and command",
          biases: { authority: 0.3 }
        }
      ]
    },
    noble_role_in_combat: {
      question: (mentor) => `${mentor.name} asks: "In the chaos of battle, you…"`,
      answers: [
        {
          text: "Lead from the front and inspire allies",
          biases: { leadership: 0.3 }
        },
        {
          text: "Direct from the back with strategy",
          biases: { control: 0.3 }
        },
        {
          text: "Support and enable others to succeed",
          biases: { support: 0.3 }
        },
        {
          text: "Stay out of direct harm if possible",
          biases: { avoidance: 0.3 }
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
  static async promptSurvey(actor, mentorName, playerName = "") {
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

        const dialog = new Dialog(
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
                    ${playerName ? `<p class="mentor-address"><em>"Welcome, ${playerName}. I can help guide your journey."</em></p>` : ""}
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
                icon: '<i class="fas fa-check"></i>',
                label: "I'm ready",
                callback: () => {
                  swseLogger.log(`[MENTOR-SURVEY] promptSurvey: ✓ User clicked ACCEPT button`);
                  resolve(true);
                }
              },
              decline: {
                icon: '<i class="fas fa-times"></i>',
                label: "Maybe later",
                callback: () => {
                  swseLogger.log(`[MENTOR-SURVEY] promptSurvey: ✓ User clicked DECLINE button`);
                  resolve(false);
                }
              }
            },
            default: "accept",
            render: (html) => {
              swseLogger.log(`[MENTOR-SURVEY] promptSurvey: Dialog render callback fired, html:`, { hasHtml: !!html, length: html?.length });
              // Add typing animation to the greeting
              const greetingElement = html.find('.mentor-greeting')[0];
              if (greetingElement) {
                swseLogger.log(`[MENTOR-SURVEY] promptSurvey: Starting typing animation...`);
                const greetingText = greetingElement.textContent;
                TypingAnimation.typeText(greetingElement, greetingText, {
                  speed: 45,
                  skipOnClick: true
                });
              } else {
                swseLogger.warn(`[MENTOR-SURVEY] promptSurvey: Greeting element not found in rendered HTML`);
              }
            }
          },
          { classes: ['mentor-survey-dialog', 'holo-window'] }
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
   * Show the mentor survey questions
   * @param {Actor} actor - The character actor
   * @param {string} classKey - The starting class (Jedi, Soldier, Scout, etc.)
   * @param {string} mentorName - The mentor's name
   * @returns {Promise<Object>} The survey answers or null if dismissed
   */
  static async showSurvey(actor, classKey, mentorName, isResuming = false) {
    swseLogger.log(`[MENTOR-SURVEY] showSurvey: START - Actor: ${actor.id} (${actor.name}), Class: "${classKey}", Mentor: "${mentorName}", Resuming: ${isResuming}`);
    const mentor = MENTORS[mentorName];
    const questions = MENTOR_VOICED_SURVEY[classKey];

    swseLogger.log(`[MENTOR-SURVEY] showSurvey: Mentor lookup:`, mentor ? 'FOUND' : 'NOT FOUND');
    swseLogger.log(`[MENTOR-SURVEY] showSurvey: Questions for "${classKey}":`, questions ? `FOUND (${Object.keys(questions).length} questions)` : 'NOT FOUND');

    if (!mentor || !questions) {
      swseLogger.error(`[MENTOR-SURVEY] ERROR: Mentor or questions not found for ${classKey}/${mentorName}`);
      return null;
    }

    return new Promise((resolve) => {
      const questionIds = Object.keys(questions);
      const answers = {};
      swseLogger.log(`[MENTOR-SURVEY] showSurvey: Starting survey with ${questionIds.length} questions:`, questionIds);

      const showSkipConfirmation = (isAtIntroduction = true) => {
        const skipText = isAtIntroduction
          ? `${mentor.name} studies you for a moment.`
          : `${mentor.name} nods understandingly.`;

        const skipMessage = isAtIntroduction
          ? `"I understand. Sometimes clarity comes when you need it, not when I ask for it. When you are ready to discuss your path, I will be here. There is no shame in taking your time."`
          : `"There is wisdom in knowing when to pause. Continue when you are ready. I will remember what you have already shared."`;

        const dialog = new Dialog(
          {
            title: `Survey Deferred`,
            content: `
              <div class="mentor-survey-content holo-content">
                <div class="mentor-skip-acknowledgment">
                  <p style="margin-bottom: 1.5rem; font-style: italic; color: #ccc;">${skipText}</p>
                  <p class="mentor-skip-text" style="margin: 1.5rem 0; font-size: 1.05em;">${skipMessage}</p>
                  <p style="margin-top: 1.5rem; color: #999; font-size: 0.9em;">
                    You can return to this survey anytime you wish. Your mentor will be waiting.
                  </p>
                </div>
              </div>
            `,
            buttons: {
              continue: {
                icon: '<i class="fas fa-arrow-right"></i>',
                label: "Continue",
                callback: () => {
                  swseLogger.log(`[MENTOR-SURVEY] showSurvey: User acknowledged skip confirmation`);
                  resolve(null);
                }
              }
            },
            default: "continue",
            render: (html) => {
              // Add typing animation to mentor's skip message
              const skipElement = html.find('.mentor-skip-text')[0];
              if (skipElement) {
                const skipText = skipElement.textContent;
                TypingAnimation.typeText(skipElement, skipText, {
                  speed: 45,
                  skipOnClick: true
                });
              }
            }
          },
          { classes: ['mentor-survey-dialog'] }
        );

        dialog.render(true);
      };

      const showIntroduction = (isResuming = false) => {
        let introText, mentorGreeting;

        if (isResuming) {
          introText = `${mentor.name} welcomes you back.`;
          mentorGreeting = `"I am pleased you have returned. Let us continue where we left off. Your path is still being written, and I am honored to help you understand it."`;
        } else {
          introText = `${mentor.name}, ${mentor.title.toLowerCase()}, settles in to speak with you.`;
          mentorGreeting = `"I am here to guide your journey. Before we proceed, I would like to understand your vision for the path ahead. Your answers will help me offer counsel tailored to who you truly wish to become."`;
        }

        const dialog = new Dialog(
          {
            title: isResuming ? `Resume Your Mentoring` : `Meet Your Mentor`,
            content: `
              <div class="mentor-survey-content holo-content">
                <div class="mentor-introduction">
                  <p style="margin-bottom: 1.5rem; font-style: italic; color: #ccc;">${introText}</p>
                  <p class="mentor-greeting" style="margin: 1.5rem 0; font-size: 1.1em;">${mentorGreeting}</p>
                  <p style="margin-top: 1.5rem; color: #999; font-size: 0.9em;">
                    ${isResuming
                      ? "Take your time. We have all the questions ahead of us still."
                      : "Take your time answering the questions ahead. There are no wrong answers—only the truth of who you are and who you wish to become."}
                  </p>
                </div>
              </div>
            `,
            buttons: {
              begin: {
                icon: '<i class="fas fa-arrow-right"></i>',
                label: isResuming ? "Continue Survey" : "Begin Survey",
                callback: () => {
                  swseLogger.log(`[MENTOR-SURVEY] showSurvey: User ${isResuming ? 'resumed' : 'began'} survey`);
                  renderQuestion(0);
                }
              },
              skip: {
                icon: '<i class="fas fa-forward"></i>',
                label: "Skip Survey",
                callback: () => {
                  swseLogger.log(`[MENTOR-SURVEY] showSurvey: User skipped survey at ${isResuming ? 'resume' : 'introduction'}`);
                  showSkipConfirmation(!isResuming);
                }
              }
            },
            default: "begin",
            render: (html) => {
              // Add typing animation to mentor's greeting
              const greetingElement = html.find('.mentor-greeting')[0];
              if (greetingElement) {
                const greetingText = greetingElement.textContent;
                TypingAnimation.typeText(greetingElement, greetingText, {
                  speed: 45,
                  skipOnClick: true
                });
              }
            }
          },
          { classes: ['mentor-survey-dialog'] }
        );

        dialog.render(true);
      };

      const showConclusion = () => {
        const conclusionText = `${mentor.name} nods with understanding.`;
        const mentorConclusion = `"Your answers speak volumes about who you are becoming. I will use what I have learned to guide you toward choices that align with your vision. As we progress, remember: the path is as important as the destination. I am here to help you walk it well."`;

        const dialog = new Dialog(
          {
            title: `Survey Complete`,
            content: `
              <div class="mentor-survey-content holo-content">
                <div class="mentor-conclusion">
                  <p style="margin-bottom: 1.5rem; font-style: italic; color: #ccc;">${conclusionText}</p>
                  <p class="mentor-conclusion-text" style="margin: 1.5rem 0; font-size: 1.05em;">${mentorConclusion}</p>
                  <p style="margin-top: 1.5rem; color: #999; font-size: 0.9em;">
                    Your mentor will now personalize their suggestions based on your goals and intentions.
                  </p>
                </div>
              </div>
            `,
            buttons: {
              finish: {
                icon: '<i class="fas fa-check"></i>',
                label: "Continue",
                callback: () => {
                  swseLogger.log(`[MENTOR-SURVEY] showSurvey: User finished survey`);
                  resolve(answers);
                }
              }
            },
            default: "finish",
            render: (html) => {
              // Add typing animation to mentor's conclusion
              const conclusionElement = html.find('.mentor-conclusion-text')[0];
              if (conclusionElement) {
                const conclusionText = conclusionElement.textContent;
                TypingAnimation.typeText(conclusionElement, conclusionText, {
                  speed: 45,
                  skipOnClick: true
                });
              }
            }
          },
          { classes: ['mentor-survey-dialog'] }
        );

        dialog.render(true);
      };

      const renderQuestion = (index) => {
        if (index >= questionIds.length) {
          // All questions answered - show conclusion
          swseLogger.log(`[MENTOR-SURVEY] showSurvey: All questions answered, showing conclusion`);
          swseLogger.log(`[MENTOR-SURVEY] showSurvey: Survey answers:`, Object.keys(answers));
          showConclusion();
          return;
        }

        const questionId = questionIds[index];
        const questionData = questions[questionId];
        const question = questionData.question(mentor);
        const answerOptions = questionData.answers;
        swseLogger.log(`[MENTOR-SURVEY] showSurvey: Rendering question ${index + 1}/${questionIds.length} - ID: "${questionId}"`);

        const answerHtml = answerOptions
          .map(
            (opt, i) =>
              `<label class="survey-answer-box">
                <input type="radio" name="answer" value="${i}" />
                <span class="answer-text">${opt.text}</span>
              </label>`
          )
          .join('');

        const dialog = new Dialog(
          {
            title: `${mentorName}'s Mentoring - Question ${index + 1} of ${questionIds.length}`,
            content: `
              <div class="mentor-survey-content holo-content">
                <p class="mentor-question">${question}</p>
                <div class="survey-answers">
                  ${answerHtml}
                </div>
                <p class="survey-hint" style="margin-top: 1rem; font-size: 0.9em; color: #999; font-style: italic;">
                  You can skip this survey at any time. You'll be able to complete it later if desired.
                </p>
              </div>
            `,
            buttons: {
              next: {
                icon: '<i class="fas fa-arrow-right"></i>',
                label: index === questionIds.length - 1 ? "Finish" : "Next",
                callback: (html) => {
                  const selectedIndex = parseInt(html.find('input[name="answer"]:checked').val(), 10);
                  swseLogger.log(`[MENTOR-SURVEY] showSurvey: Answer selected for question ${index + 1} - index: ${selectedIndex}`);
                  if (selectedIndex !== undefined) {
                    answers[questionId] = {
                      questionId: questionId,
                      answerIndex: selectedIndex,
                      answerText: answerOptions[selectedIndex].text,
                      biases: answerOptions[selectedIndex].biases
                    };
                    swseLogger.log(`[MENTOR-SURVEY] showSurvey: Answer recorded - "${answerOptions[selectedIndex].text}", biases:`, answerOptions[selectedIndex].biases);
                    renderQuestion(index + 1);
                  } else {
                    swseLogger.warn(`[MENTOR-SURVEY] WARNING: No answer selected for question ${index + 1}`);
                    ui.notifications.warn("Please select an answer before continuing.");
                  }
                }
              },
              skip: {
                icon: '<i class="fas fa-forward"></i>',
                label: "Skip Survey",
                callback: () => {
                  swseLogger.log(`[MENTOR-SURVEY] showSurvey: User skipped survey at question ${index + 1}/${questionIds.length}`);
                  showSkipConfirmation(false);
                }
              }
            },
            default: "next",
            render: (html) => {
              // Add typing animation to the question
              const questionElement = html.find('.mentor-question')[0];
              if (questionElement) {
                const questionText = questionElement.textContent;
                TypingAnimation.typeText(questionElement, questionText, {
                  speed: 45,
                  skipOnClick: true
                });
              }
            }
          },
          { classes: ['mentor-survey-dialog'] }
        );

        dialog.render(true);
      };

      showIntroduction(isResuming);
    });
  }

  /**
   * Process survey answers and extract BuildIntent biases
   * @param {Object} surveyAnswers - The survey answers object
   * @returns {Object} Compiled biases for BuildIntent
   */
  static processSurveyAnswers(surveyAnswers) {
    swseLogger.log(`[MENTOR-SURVEY] processSurveyAnswers: Processing survey answers`);
    swseLogger.log(`[MENTOR-SURVEY] processSurveyAnswers: Questions answered:`, surveyAnswers ? Object.keys(surveyAnswers).length : 0);

    const biases = {};

    if (!surveyAnswers) {
      swseLogger.log(`[MENTOR-SURVEY] processSurveyAnswers: No survey answers provided, returning empty biases`);
      return biases;
    }

    // Aggregate all biases from answers
    for (const answerId in surveyAnswers) {
      const answer = surveyAnswers[answerId];
      const answerBiases = answer.biases || {};
      swseLogger.log(`[MENTOR-SURVEY] processSurveyAnswers: "${answerId}" - biases:`, answerBiases);

      for (const biasKey in answerBiases) {
        biases[biasKey] = (biases[biasKey] || 0) + answerBiases[biasKey];
      }
    }

    swseLogger.log(`[MENTOR-SURVEY] processSurveyAnswers: Final compiled biases:`, biases);
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
      "system.swse.mentorBuildIntentBiases": biases,
      "system.swse.mentorSurveyCompleted": true,
      "system.swse.surveyResponses": surveyAnswers
    };

    try {
      await actor.update(updates);
      swseLogger.log(`[MENTOR-SURVEY] storeSurveyData: Survey data stored successfully`);

      // Seed mentor memory from survey answers
      // This connects L1 survey to mentor dialogue personalization
      try {
        const mentorId = actor.getFlag('swse', 'level1Class');
        if (mentorId) {
          const seededMemory = seedMentorMemoryFromSurvey(biases);
          await setMentorMemory(actor, mentorId.toLowerCase(), seededMemory);
          swseLogger.log(`[MENTOR-SURVEY] storeSurveyData: Seeded mentor memory for ${mentorId}:`, seededMemory);
        }
      } catch (memErr) {
        swseLogger.error(`[MENTOR-SURVEY] ERROR seeding mentor memory:`, memErr);
        // Don't throw - mentor seeding is optional enhancement
      }
    } catch (err) {
      swseLogger.error(`[MENTOR-SURVEY] ERROR storing survey data:`, err);
      throw err;
    }
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
   * Check if mentor survey has been completed for this actor
   * @param {Actor} actor - The character actor
   * @returns {boolean}
   */
  static hasSurveyBeenCompleted(actor) {
    const completed = actor.system?.swse?.mentorSurveyCompleted === true;
    swseLogger.log(`[MENTOR-SURVEY] hasSurveyBeenCompleted: Actor ${actor.id} (${actor.name}) - ${completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
    return completed;
  }
}



// ============================================================
// EXPANDED MENTOR DIALOGUE OPTIONS (AUTO-GENERATED)
// ============================================================

export const EXPANDED_MENTOR_OPTIONS = [
  {
    key: "strengths",
    label: "What am I doing well"
  },
  {
    key: "weaknesses",
    label: "What am I neglecting"
  },
  {
    key: "next_steps",
    label: "What should I prepare for next"
  }
];



// ============================================================
// CONTEXT-AWARE MENTOR FALLBACK RESPONSES (AUTO-GENERATED)
// ============================================================

function getContextAwareFallback(actor, mentorKey) {
  const background =
    actor?.flags?.swse?.background?.name ||
    actor?.system?.background ||
    actor?.background ||
    null;

  switch (mentorKey) {
    case "story":
      if (background) {
        return `Before you ever chose this path, your life was shaped by your background as ${background}. That history still echoes in how you act, what you fear, and what you strive to protect.`;
      }
      return "Every journey begins before the moment you recognize it. Even if you cannot name it yet, your past still guides you.";

    case "strengths":
      return "Your recent choices show focus and intent. You are building a foundation that will support you when the path grows difficult.";

    case "weaknesses":
      return "Every path leaves something unattended. Look closely at what you have not invested in — that is often where growth waits.";

    case "next_steps":
      return "Think beyond your next choice. Preparation now determines which paths will still be open to you later.";

    default:
      return "Your path is still forming. With reflection and commitment, clarity will come.";
  }
}

// ------------------------------------------------------------
// OVERRIDE GENERIC DEFAULT RESPONSE
// ------------------------------------------------------------

const __originalMentorResponse = MentorSurvey.getResponse?.bind(MentorSurvey);

MentorSurvey.getResponse = function(actor, mentorKey, context) {
  const response = __originalMentorResponse
    ? __originalMentorResponse(actor, mentorKey, context)
    : null;

  if (
    !response ||
    typeof response !== "string" ||
    response.includes("I don't have any specific guidance")
  ) {
    return getContextAwareFallback(actor, mentorKey);
  }

  return response;
};


// Named export wrapper for chargen integration
export function maybeOpenMentorSurvey(actor) {
  return MentorSurvey.maybeOpenSurvey(actor);
}
