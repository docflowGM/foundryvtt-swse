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

/**
 * Survey questions with mentor voice variants
 * Each class has 4-5 questions that get voiced by the mentor
 */
export const MENTOR_VOICED_SURVEY = {
  "Jedi": {
    jedi_combat_role: {
      question: (mentor) => `${mentor.name} asks: "When conflict breaks out, how does your Jedi contribute most?"`,
      answers: [
        {
          text: "Engaging enemies directly with a lightsaber",
          biases: { combatStyle: "lightsaber", melee: 0.3 }
        },
        {
          text: "Controlling the battlefield with the Force",
          biases: { control: 0.3, forceFocus: 0.3 }
        },
        {
          text: "Supporting allies with the Force",
          biases: { support: 0.3, forceFocus: 0.2 }
        },
        {
          text: "Avoiding direct confrontation when possible",
          biases: { avoidance: 0.3 }
        },
        {
          text: "Mixed / not sure",
          biases: {}
        }
      ]
    },
    jedi_force_emphasis: {
      question: (mentor) => `${mentor.name} asks: "How central is the Force to your character's identity?"`,
      answers: [
        {
          text: "The Force defines everything I do",
          biases: { forceFocus: 0.4 }
        },
        {
          text: "The Force supports my combat skills",
          biases: { forceFocus: 0.2 }
        },
        {
          text: "The Force is situational",
          biases: { forceFocus: 0.1 }
        },
        {
          text: "Minimal Force use",
          biases: { forceFocus: -0.1 }
        },
        {
          text: "Not sure",
          biases: {}
        }
      ]
    },
    jedi_mechanical_focus: {
      question: (mentor) => `${mentor.name} asks: "What do you want to feel strongest at?"`,
      answers: [
        {
          text: "Raw damage",
          biases: { damage: 0.3 }
        },
        {
          text: "Control and positioning",
          biases: { control: 0.3 }
        },
        {
          text: "Survivability",
          biases: { survivability: 0.3 }
        },
        {
          text: "Utility and versatility",
          biases: { utility: 0.3 }
        },
        {
          text: "Balance",
          biases: { balance: 0.2 }
        }
      ]
    },
    jedi_specialization: {
      question: (mentor) => `${mentor.name} asks: "Do you imagine your Jedi as…"`,
      answers: [
        {
          text: "A focused specialist",
          biases: { specialization: 0.3 }
        },
        {
          text: "A flexible generalist",
          biases: { generalist: 0.3 }
        },
        {
          text: "Somewhere in between",
          biases: { balance: 0.2 }
        },
        {
          text: "Not sure",
          biases: {}
        }
      ]
    },
    jedi_philosophy: {
      question: (mentor) => `${mentor.name} asks: "Which approach best fits your Jedi?"`,
      answers: [
        {
          text: "Traditional discipline",
          biases: { order: 0.2 }
        },
        {
          text: "Pragmatic adaptability",
          biases: { pragmatic: 0.2 }
        },
        {
          text: "Emotionally driven",
          biases: { riskTolerance: 0.2 }
        },
        {
          text: "Evolving / unsure",
          biases: {}
        }
      ]
    }
  },

  "Soldier": {
    soldier_combat_style: {
      question: (mentor) => `${mentor.name} asks: "How do you picture your Soldier fighting most often?"`,
      answers: [
        {
          text: "Front-line combat",
          biases: { melee: 0.3, survivability: 0.2 }
        },
        {
          text: "Mobile skirmishing",
          biases: { mobility: 0.3 }
        },
        {
          text: "Ranged fire support",
          biases: { ranged: 0.3 }
        },
        {
          text: "Tactical command",
          biases: { leadership: 0.3 }
        },
        {
          text: "Mixed / not sure",
          biases: {}
        }
      ]
    },
    soldier_weapon_pref: {
      question: (mentor) => `${mentor.name} asks: "Which weapons feel right for this character?"`,
      answers: [
        {
          text: "Rifles or heavy weapons",
          biases: { ranged: 0.3 }
        },
        {
          text: "Pistols",
          biases: { ranged: 0.2, mobility: 0.2 }
        },
        {
          text: "Melee or unarmed",
          biases: { melee: 0.3 }
        },
        {
          text: "A mix",
          biases: { balance: 0.2 }
        },
        {
          text: "Not sure",
          biases: {}
        }
      ]
    },
    soldier_priority: {
      question: (mentor) => `${mentor.name} asks: "What matters more to you in a fight?"`,
      answers: [
        {
          text: "Hitting harder",
          biases: { damage: 0.3 }
        },
        {
          text: "Staying standing",
          biases: { survivability: 0.3 }
        },
        {
          text: "Controlling enemies",
          biases: { control: 0.3 }
        },
        {
          text: "Balance",
          biases: { balance: 0.2 }
        }
      ]
    },
    soldier_team_role: {
      question: (mentor) => `${mentor.name} asks: "What role do you want to fill on the team?"`,
      answers: [
        {
          text: "Primary damage dealer",
          biases: { damage: 0.3 }
        },
        {
          text: "Defender / protector",
          biases: { survivability: 0.3 }
        },
        {
          text: "Tactical support",
          biases: { leadership: 0.3 }
        },
        {
          text: "Flexible contributor",
          biases: { balance: 0.2 }
        },
        {
          text: "Not sure",
          biases: {}
        }
      ]
    }
  },

  "Scout": {
    scout_primary_role: {
      question: (mentor) => `${mentor.name} asks: "What role does your Scout fill most often?"`,
      answers: [
        {
          text: "Recon and awareness",
          biases: { awareness: 0.3 }
        },
        {
          text: "Mobility and positioning",
          biases: { mobility: 0.3 }
        },
        {
          text: "Survival and tracking",
          biases: { survival: 0.3 }
        },
        {
          text: "Ranged support",
          biases: { ranged: 0.3 }
        },
        {
          text: "Mixed / not sure",
          biases: {}
        }
      ]
    },
    scout_combat_style: {
      question: (mentor) => `${mentor.name} asks: "When combat happens, you prefer to…"`,
      answers: [
        {
          text: "Strike from range",
          biases: { ranged: 0.3 }
        },
        {
          text: "Control positioning and movement",
          biases: { control: 0.3 }
        },
        {
          text: "Avoid direct combat",
          biases: { avoidance: 0.3 }
        },
        {
          text: "Adapt to the situation",
          biases: { balance: 0.2 }
        },
        {
          text: "Not sure",
          biases: {}
        }
      ]
    },
    scout_exploration: {
      question: (mentor) => `${mentor.name} asks: "Outside of combat, what do you want to excel at?"`,
      answers: [
        {
          text: "Perception and awareness",
          biases: { awareness: 0.3 }
        },
        {
          text: "Movement and terrain",
          biases: { mobility: 0.3 }
        },
        {
          text: "Survival challenges",
          biases: { survival: 0.3 }
        },
        {
          text: "A mix",
          biases: { balance: 0.2 }
        },
        {
          text: "Not sure",
          biases: {}
        }
      ]
    },
    scout_specialization: {
      question: (mentor) => `${mentor.name} asks: "Do you want your Scout to be…"`,
      answers: [
        {
          text: "Highly specialized",
          biases: { specialization: 0.3 }
        },
        {
          text: "Broadly capable",
          biases: { generalist: 0.3 }
        },
        {
          text: "Somewhere in between",
          biases: { balance: 0.2 }
        },
        {
          text: "Not sure",
          biases: {}
        }
      ]
    }
  },

  "Scoundrel": {
    scoundrel_edge: {
      question: (mentor) => `${mentor.name} asks: "What's your Scoundrel's biggest advantage?"`,
      answers: [
        {
          text: "Stealth and surprise",
          biases: { stealth: 0.3 }
        },
        {
          text: "Tricks and misdirection",
          biases: { control: 0.3 }
        },
        {
          text: "Social manipulation",
          biases: { social: 0.3 }
        },
        {
          text: "Versatility",
          biases: { balance: 0.2 }
        },
        {
          text: "Not sure",
          biases: {}
        }
      ]
    },
    scoundrel_combat: {
      question: (mentor) => `${mentor.name} asks: "When fighting breaks out, you prefer…"`,
      answers: [
        {
          text: "Striking from ambush",
          biases: { stealth: 0.3, damage: 0.2 }
        },
        {
          text: "Ranged skirmishing",
          biases: { ranged: 0.3 }
        },
        {
          text: "Avoiding combat",
          biases: { avoidance: 0.3 }
        },
        {
          text: "Mixed tactics",
          biases: { balance: 0.2 }
        }
      ]
    },
    scoundrel_ooc: {
      question: (mentor) => `${mentor.name} asks: "Where do you want to shine outside combat?"`,
      answers: [
        {
          text: "Deception and manipulation",
          biases: { social: 0.3 }
        },
        {
          text: "Skills and clever solutions",
          biases: { utility: 0.3 }
        },
        {
          text: "Social situations",
          biases: { social: 0.3 }
        },
        {
          text: "A mix",
          biases: { balance: 0.2 }
        },
        {
          text: "Not sure",
          biases: {}
        }
      ]
    },
    scoundrel_risk: {
      question: (mentor) => `${mentor.name} asks: "How risky do you want your Scoundrel to be?"`,
      answers: [
        {
          text: "High-risk, high-reward",
          biases: { riskTolerance: 0.3 }
        },
        {
          text: "Careful and opportunistic",
          biases: { control: 0.2 }
        },
        {
          text: "Balanced",
          biases: { balance: 0.2 }
        },
        {
          text: "Not sure",
          biases: {}
        }
      ]
    }
  },

  "Noble": {
    noble_leadership: {
      question: (mentor) => `${mentor.name} asks: "How does your Noble influence others?"`,
      answers: [
        {
          text: "Inspiring leadership",
          biases: { leadership: 0.3 }
        },
        {
          text: "Commanding authority",
          biases: { authority: 0.3 }
        },
        {
          text: "Subtle manipulation",
          biases: { social: 0.3 }
        },
        {
          text: "Social dominance",
          biases: { social: 0.3 }
        },
        {
          text: "Not sure",
          biases: {}
        }
      ]
    },
    noble_combat: {
      question: (mentor) => `${mentor.name} asks: "In combat, your Noble usually…"`,
      answers: [
        {
          text: "Supports allies",
          biases: { support: 0.3 }
        },
        {
          text: "Directs from the back",
          biases: { control: 0.3 }
        },
        {
          text: "Gets directly involved",
          biases: { balance: 0.2 }
        },
        {
          text: "Avoids combat",
          biases: { avoidance: 0.3 }
        },
        {
          text: "Not sure",
          biases: {}
        }
      ]
    },
    noble_ooc: {
      question: (mentor) => `${mentor.name} asks: "Outside of combat, what matters most?"`,
      answers: [
        {
          text: "Social influence",
          biases: { social: 0.3 }
        },
        {
          text: "Knowledge and planning",
          biases: { utility: 0.3 }
        },
        {
          text: "Managing people and resources",
          biases: { leadership: 0.3 }
        },
        {
          text: "A mix",
          biases: { balance: 0.2 }
        },
        {
          text: "Not sure",
          biases: {}
        }
      ]
    },
    noble_specialization: {
      question: (mentor) => `${mentor.name} asks: "Do you want your Noble to be…"`,
      answers: [
        {
          text: "A focused leader",
          biases: { specialization: 0.3 }
        },
        {
          text: "A versatile problem-solver",
          biases: { generalist: 0.3 }
        },
        {
          text: "Somewhere in between",
          biases: { balance: 0.2 }
        },
        {
          text: "Not sure",
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
   * @returns {Promise<boolean>} true if player accepts survey, false otherwise
   */
  static async promptSurvey(actor, mentorName) {
    swseLogger.log(`[MENTOR-SURVEY] promptSurvey: START - Actor: ${actor.id} (${actor.name}), Mentor: "${mentorName}"`);
    const mentor = MENTORS[mentorName];
    if (!mentor) {
      swseLogger.error(`[MENTOR-SURVEY] ERROR: Mentor not found: "${mentorName}"`);
      swseLogger.error(`[MENTOR-SURVEY] Available mentors:`, Object.keys(MENTORS));
      return false;
    }
    swseLogger.log(`[MENTOR-SURVEY] promptSurvey: Mentor found: "${mentor.name}" (${mentor.title})`);

    return new Promise((resolve) => {
      const dialog = new Dialog(
        {
          title: `${mentorName}'s Mentoring Survey`,
          content: `
            <div class="mentor-survey-prompt">
              <div class="mentor-portrait">
                <img src="${mentor.portrait}" alt="${mentor.name}" />
              </div>
              <div class="mentor-intro">
                <h3>${mentor.name}</h3>
                <p>${mentor.title}</p>
                <p class="survey-question">
                  I'd like to understand your character's goals and design philosophy better.
                  Would you be willing to answer a few quick questions? It will help me provide better mentorship.
                </p>
              </div>
            </div>
          `,
          buttons: {
            accept: {
              icon: '<i class="fas fa-check"></i>',
              label: "I'm ready",
              callback: () => {
                resolve(true);
              }
            },
            decline: {
              icon: '<i class="fas fa-times"></i>',
              label: "Maybe later",
              callback: () => {
                resolve(false);
              }
            }
          },
          default: "accept",
          render: (html) => {
            // Add typing animation to the survey question
            const questionElement = html.find('.survey-question')[0];
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
    });
  }

  /**
   * Show the mentor survey questions
   * @param {Actor} actor - The character actor
   * @param {string} classKey - The starting class (Jedi, Soldier, Scout, etc.)
   * @param {string} mentorName - The mentor's name
   * @returns {Promise<Object>} The survey answers or null if dismissed
   */
  static async showSurvey(actor, classKey, mentorName) {
    swseLogger.log(`[MENTOR-SURVEY] showSurvey: START - Actor: ${actor.id} (${actor.name}), Class: "${classKey}", Mentor: "${mentorName}"`);
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

      const renderQuestion = (index) => {
        if (index >= questionIds.length) {
          // All questions answered
          swseLogger.log(`[MENTOR-SURVEY] showSurvey: All questions answered, resolving survey`);
          swseLogger.log(`[MENTOR-SURVEY] showSurvey: Survey answers:`, Object.keys(answers));
          resolve(answers);
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
              `<label><input type="radio" name="answer" value="${i}" /> ${opt.text}</label>`
          )
          .join('');

        const dialog = new Dialog(
          {
            title: `${mentorName}'s Mentoring - Question ${index + 1} of ${questionIds.length}`,
            content: `
              <div class="mentor-survey-content">
                <p class="mentor-question">${question}</p>
                <div class="survey-answers">
                  ${answerHtml}
                </div>
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
              cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel",
                callback: () => {
                  resolve(null);
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

      renderQuestion(0);
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
