/**
 * Mentor Dialogue Responses — Topic-Based System
 *
 * Maps each of 8 dialogue topics to mentor-specific voice wrappers.
 * Each mentor provides authentic voice for analysis (opening, closing, emphasis).
 *
 * Structure:
 * - topic → canonical analysis + mentor voices
 * - Each mentor: opening wrapper, closing wrapper, emphasis lines, DSP interpreter
 * - No rewriting of core analysis — only authentic mentor framing
 *
 * Mentors (5 Core + Fallback):
 * 1. Miraj (Jedi) — Philosophical, reflective, Force-focused
 * 2. J0-N1 (Noble/Droid) — Analytical, formal, systematic
 * 3. Breach (Soldier) — Blunt, direct, pragmatic
 * 4. Lead (Scout) — Tactical, observational, dry
 * 5. Ol' Salty (Scoundrel) — Boisterous, irreverent, survival-focused
 */

export class MentorDialogueResponses {
  /**
   * Get mentor-voiced response for a dialogue topic
   * @param {string} mentorName - The mentor's name
   * @param {string} topicKey - The dialogue topic key
   * @param {Object} analysisData - The canonical analysis data (from suggestion engine)
   * @returns {Object} { opening, analysis, closing, emphasis, dspWarning }
   */
  static getTopicResponse(mentorName, topicKey, analysisData = {}) {
    const responses = this.TOPIC_RESPONSES[topicKey];
    if (!responses) {
      return this._getFallbackResponse(topicKey, analysisData);
    }

    const mentorVoice = responses.mentors[this._sanitizeMentorName(mentorName)];
    if (!mentorVoice) {
      return this._getFallbackResponse(topicKey, analysisData);
    }

    return {
      opening: mentorVoice.opening(analysisData),
      analysis: responses.canonicalAnalysis(analysisData),
      closing: mentorVoice.closing(analysisData),
      emphasis: mentorVoice.emphasis || [],
      dspWarning: mentorVoice.dspInterpreter(analysisData.dspSaturation || 0)
    };
  }

  static _sanitizeMentorName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  /**
   * Convert level to narrative stage with mentor-specific perspective
   * Randomizes from mentor-appropriate progression language
   */
  static _getLevelNarrative(level, mentorName = null) {
    const sanitized = mentorName ? this._sanitizeMentorName(mentorName) : null;

    // Mentor-specific progression narratives
    const progressionMaps = {
      miraj: {
        early: [
          "The Force awakens within you",
          "Your path has just begun",
          "The Light guides your first steps"
        ],
        mid_early: [
          "The Force grows within you",
          "Your connection deepens",
          "You've learned discipline"
        ],
        mid: [
          "You've proven your connection",
          "The Force flows through your choices",
          "Your understanding clarifies"
        ],
        mid_late: [
          "Your path becomes clear",
          "The Force speaks through your actions",
          "Wisdom marks your steps"
        ],
        late: [
          "You've become something remarkable",
          "The Force recognizes your commitment",
          "You walk a path few understand"
        ],
        transcendent: [
          "You've transcended ordinary understanding",
          "The Force itself bends to your will",
          "You've become a beacon to others"
        ]
      },

      breach: {
        early: [
          "You're green but learning",
          "Combat hardens your resolve",
          "You've seen your first action"
        ],
        mid_early: [
          "You've seen some action",
          "Your record's building",
          "Combat's taught you lessons"
        ],
        mid: [
          "You've proven yourself in the field",
          "Your record speaks volumes",
          "You've survived real conflict"
        ],
        mid_late: [
          "Your combat experience is undeniable",
          "You've become a reliable operator",
          "The record shows your skill"
        ],
        late: [
          "You've become a seasoned fighter",
          "Few can match your record",
          "You've survived what kills most soldiers"
        ],
        transcendent: [
          "You've become a legend in the field",
          "Your record is legendary",
          "You're among the best I've seen"
        ]
      },

      lead: {
        early: [
          "You're finding your footing",
          "The patterns are starting to show",
          "You've learned to observe"
        ],
        mid_early: [
          "You're reading situations better",
          "Patterns are becoming clear",
          "You're learning what matters"
        ],
        mid: [
          "You've learned to read people and terrain",
          "The patterns are obvious to you now",
          "Your instincts sharpen"
        ],
        mid_late: [
          "You see what others miss",
          "The patterns guide you naturally",
          "Your tactical sense is solid"
        ],
        late: [
          "You've become exceptionally perceptive",
          "Few read a situation like you do",
          "You understand things instinctively"
        ],
        transcendent: [
          "You see ten steps ahead now",
          "Pattern recognition is second nature",
          "You've become a true strategist"
        ]
      },

      ol_salty: {
        early: [
          "Luck's startin' to favor ye",
          "Ye've got yer first tales to tell",
          "Ye've survived yer first real test"
        ],
        mid_early: [
          "Luck's been kind to ye, matey",
          "Ye've got some real stories now",
          "Ye're buildin' quite the reputation"
        ],
        mid: [
          "Ye've cheated death more'n once",
          "The galaxy knows yer name now",
          "Yer luck's held strong"
        ],
        mid_late: [
          "Ye've become a name worth knowin'",
          "Luck ain't the only thing carryin' ye",
          "Ye've got the swagger to match"
        ],
        late: [
          "Ye've become a legend 'round these parts",
          "Few have survived what ye have",
          "Yer reputation precedes ye"
        ],
        transcendent: [
          "Ye've become a galactic legend, matey",
          "Stories about ye span the stars",
          "Ye've earned yerself eternal glory"
        ]
      },

      j0_n1: {
        early: [
          "Capability parameters initializing",
          "Performance metrics improving",
          "Optimization beginning"
        ],
        mid_early: [
          "Capability indexes rising",
          "Performance efficiency increasing",
          "Optimization accelerating"
        ],
        mid: [
          "You have achieved notable capability development",
          "Performance parameters exceed baseline",
          "Efficiency gains are measurable"
        ],
        mid_late: [
          "Your capability development is substantial",
          "Performance metrics exceed standard operations",
          "Optimization efficiency is exceptional"
        ],
        late: [
          "You have achieved exceptional capability status",
          "Your performance metrics are outstanding",
          "Few systems approach your efficiency"
        ],
        transcendent: [
          "You have transcended normal operational parameters",
          "Your performance is nearly optimal",
          "You operate at peak capability thresholds"
        ]
      }
    };

    // Get mentor-specific map or fall back to neutral
    const map = sanitized && progressionMaps[sanitized] ? progressionMaps[sanitized] : progressionMaps.miraj;

    // Determine level band and pick random option
    let band;
    if (level <= 1) band = "early";
    else if (level <= 3) band = "mid_early";
    else if (level <= 5) band = "mid";
    else if (level <= 7) band = "mid_late";
    else if (level <= 10) band = "late";
    else band = "transcendent";

    const options = map[band];
    return options[Math.floor(Math.random() * options.length)];
  }

  static _getFallbackResponse(topicKey, analysisData) {
    return {
      opening: "Let me share my thoughts on this.",
      analysis: "I don't have specific guidance at the moment.",
      closing: "Consider your path carefully.",
      emphasis: [],
      dspWarning: ""
    };
  }

  // ========================================
  // TOPIC RESPONSES — 8 DIALOGUE TOPICS
  // ========================================

  static TOPIC_RESPONSES = {
    // ========================================
    // 1. "WHO AM I BECOMING?" — Identity Reflection
    // ========================================
    who_am_i_becoming: {
      systemIntent: "Reflect character identity, inferred role, DSP saturation",
      canonicalAnalysis: (data) => {
        const { level, inferredRole, primaryThemes, combatStyle, dspSaturation } = data;
        let analysis = `You are level ${level}. Your recent choices indicate a tendency toward **${inferredRole || 'adventurer'}**`;

        if (primaryThemes && primaryThemes.length > 0) {
          analysis += `, with emphasis on **${primaryThemes.slice(0, 2).join("** and **")}**`;
        }

        analysis += `. Your path is becoming more defined, though it remains your choice to continue or change direction.`;

        return analysis;
      },

      mentors: {
        miraj: {
          opening: (data) => `Young one, ${MentorDialogueResponses._getLevelNarrative(data.level, "miraj").toLowerCase()}. I sense your path taking shape. The Force reveals you as a **${data.inferredRole}**—not a title you chose, but one you are *becoming*.`,
          closing: (data) => {
            const dsp = data.dspSaturation || 0;
            if (dsp > 0.5) return "Awareness must precede action. The path back grows narrow.";
            return "Discipline must come before action.";
          },
          emphasis: ["intent_vs_action", "long_term_consequence"],
          dspInterpreter: (dsp) => {
            if (dsp > 0.5) return "⚠️ The darkness grows, young one. I feel it pulling at you. The path back narrows with each step forward. Choose carefully.";
            if (dsp > 0.2) return "I sense conflict in you. Not all of your choices align with the Light. This is natural. What matters is which voice you heed.";
            return "";
          }
        },

        breach: {
          opening: (data) => `${MentorDialogueResponses._getLevelNarrative(data.level, "breach")}. You're becoming a **${data.inferredRole}**. Your record speaks for itself.`,
          closing: (data) => {
            const dsp = data.dspSaturation || 0;
            if (dsp > 0.5) return "You're getting reckless. That instability gets people killed.";
            return "Train for what you are.";
          },
          emphasis: ["clarity", "execution"],
          dspInterpreter: (dsp) => {
            if (dsp > 0.5) return "⚠️ Look, I'm not here to preach about light and dark. But you're getting reckless. That kind of instability? It gets people killed. Yours and mine.";
            return "";
          }
        },

        lead: {
          opening: (data) => `Not bad at all. ${MentorDialogueResponses._getLevelNarrative(data.level, "lead").toLowerCase()}, and you're shaping up as a **${data.inferredRole}**. That's what your choices say about you.`,
          closing: (data) => "Keep building on what works. Don't fix what isn't broken.",
          emphasis: ["patterns", "adaptation"],
          dspInterpreter: (dsp) => {
            if (dsp > 0.5) return "⚠️ I seen that look before. The instability's takin' hold. That path don't end with glory, if ye catch me drift.";
            return "";
          }
        },

        ol_salty: {
          opening: (data) => `Har har! ${MentorDialogueResponses._getLevelNarrative(data.level, "ol_salty").toLowerCase()}, and still kickin', are ye? The galaxy's got ye pegged as a **${data.inferredRole}**, savvy? That's what yer choices be tellin' all of us!`,
          closing: (data) => {
            const dsp = data.dspSaturation || 0;
            if (dsp > 0.5) return "Dead heroes don't spend their credits, matey. Think on that.";
            return "Keep livin' and keep earnin'!";
          },
          emphasis: ["survival", "opportunism"],
          dspInterpreter: (dsp) => {
            if (dsp > 0.5) return "🔥 Arr... I seen that look before. The darkness be takin' hold o' ye. Now, I ain't one to judge, but that path? It don't end with riches and freedom, if ye catch me drift.";
            return "";
          }
        },

        j0_n1: {
          opening: (data) => `<Observation> Your development status: ${MentorDialogueResponses._getLevelNarrative(data.level, "j0_n1").toLowerCase()}. <Analysis> Behavioral patterns indicate specialization as a **${data.inferredRole}**.`,
          closing: (data) => "<Conclusion> Continue optimizing your trajectory.</Conclusion>",
          emphasis: ["systems", "patterns"],
          dspInterpreter: (dsp) => {
            if (dsp > 0.5) return "<Warning> Darkside saturation escalating. Behavioral unpredictability increasing.</Warning>";
            return "";
          }
        }
      }
    },

    // ========================================
    // 2. "WHAT PATHS ARE OPEN?" — Archetypes
    // ========================================
    paths_open: {
      systemIntent: "Present class-specific archetypes and their tradeoffs",
      canonicalAnalysis: (data) => {
        const { mentorClass } = data;
        return `Every path within your class demands sacrifice. What you choose to master determines what you must forsake. These are not equal choices—each leads to different strengths and different weaknesses.`;
      },

      mentors: {
        miraj: {
          opening: (data) => `The Force reveals many paths, young one. Each demands sacrifice—what you gain in one area, you surrender in another. This is balance.`,
          closing: (data) => `The path you choose shapes who you become. Choose with intention, not impulse.`,
          emphasis: ["balance", "consequence"],
          dspInterpreter: (dsp) => ""
        },

        breach: {
          opening: (data) => `Listen up. Every class has specializations. Each one trades something for something else. No free lunches.`,
          closing: (data) => `Pick the path that keeps your team alive and the mission successful. Everything else is noise.`,
          emphasis: ["pragmatism", "clarity"],
          dspInterpreter: (dsp) => ""
        },

        lead: {
          opening: (data) => `Every specialization has trade-offs. Figure out what kind of operator you want to be, then commit.`,
          closing: (data) => `Half-measures get you half-dead.`,
          emphasis: ["decisiveness", "focus"],
          dspInterpreter: (dsp) => ""
        },

        ol_salty: {
          opening: (data) => `Har har! So ye want to know what kinds o' scallywag ye can become? Let ol' Salty tell ye! Each path's got its profits and its perils!`,
          closing: (data) => `Pick the one that gets ye what ye want and keeps ye breathin'! Arr!`,
          emphasis: ["opportunity", "risk"],
          dspInterpreter: (dsp) => ""
        },

        j0_n1: {
          opening: (data) => `<Analysis> Multiple specialization vectors available. Each optimizes for different tactical parameters.`,
          closing: (data) => `<Recommendation> Select the specialization that maximizes your comparative advantage.`,
          emphasis: ["efficiency", "optimization"],
          dspInterpreter: (dsp) => ""
        }
      }
    },

    // ========================================
    // 3. "WHAT AM I DOING WELL?" — Synergies
    // ========================================
    doing_well: {
      systemIntent: "Highlight good synergies and reinforce effective choices",
      canonicalAnalysis: (data) => {
        const { strengths } = data;
        let analysis = `Your build demonstrates effective synergies. `;
        if (strengths && strengths.length > 0) {
          analysis += `Specifically: **${strengths.map(s => s.aspect).slice(0, 2).join("**, **")}**`;
        }
        analysis += `. These choices compound positively.`;
        return analysis;
      },

      mentors: {
        miraj: {
          opening: (data) => `Let me reflect on your strengths, for it is important to recognize growth.`,
          closing: (data) => `The Force flows through these choices. They form a foundation. Build upon it with mindfulness.`,
          emphasis: ["growth", "foundation"],
          dspInterpreter: (dsp) => ""
        },

        breach: {
          opening: (data) => `Here's what's working:\n`,
          closing: (data) => `Good foundation. Keep building on what works. Don't fix what isn't broken.`,
          emphasis: ["execution", "consistency"],
          dspInterpreter: (dsp) => ""
        },

        lead: {
          opening: (data) => `Your synergies are solid. Let me break down what's effective.`,
          closing: (data) => `Those patterns work. Keep leveraging them.`,
          emphasis: ["patterns", "advantage"],
          dspInterpreter: (dsp) => ""
        },

        ol_salty: {
          opening: (data) => `Har! Let me tell ye what ye be doin' right, ye clever rascal!`,
          closing: (data) => `Ye be on the right track, matey! Keep it up and ye'll be legend of the spaceways!`,
          emphasis: ["success", "momentum"],
          dspInterpreter: (dsp) => ""
        },

        j0_n1: {
          opening: (data) => `<Analysis> Your synergy index registers positive correlation.`,
          closing: (data) => `<Assessment> Continue this trajectory. Efficiency is improving.`,
          emphasis: ["optimization", "efficiency"],
          dspInterpreter: (dsp) => ""
        }
      }
    },

    // ========================================
    // 4. "WHAT AM I DOING WRONG?" — Course Correction
    // ========================================
    doing_wrong: {
      systemIntent: "Identify gaps and inefficiencies without judgment",
      canonicalAnalysis: (data) => {
        const { gaps } = data;
        let analysis = `Every build has weaknesses. `;
        if (gaps && gaps.length > 0) {
          analysis += `Specifically: **${gaps.map(g => g.aspect).slice(0, 2).join("**, **")}**`;
        } else {
          analysis += `Your current choices show no obvious problems at this level.`;
        }
        return analysis;
      },

      mentors: {
        miraj: {
          opening: (data) => `The Light reveals all things, including our failings.`,
          closing: (data) => `Awareness is the first step toward correction. The Force is patient with those who seek improvement.`,
          emphasis: ["awareness", "course_correction"],
          dspInterpreter: (dsp) => ""
        },

        breach: {
          opening: (data) => `Every build has weaknesses. Let me point out yours.`,
          closing: (data) => `Address these. They'll get you killed otherwise.`,
          emphasis: ["pragmatism", "urgency"],
          dspInterpreter: (dsp) => {
            if (dsp > 0.3 && dsp < 0.7) return "⚠️ You're drifting. That instability will cost you when clarity matters most.";
            return "";
          }
        },

        lead: {
          opening: (data) => `You've got gaps. Better to know them now than discover them in the field.`,
          closing: (data) => `Fix the critical ones. The rest you can work around if you're smart.`,
          emphasis: ["awareness", "priority"],
          dspInterpreter: (dsp) => ""
        },

        ol_salty: {
          opening: (data) => `Every scallywag's got weak spots. Ye're no exception, savvy?`,
          closing: (data) => `Knowin' yer weaknesses is half the battle to survivin' 'em!`,
          emphasis: ["survival", "preparation"],
          dspInterpreter: (dsp) => ""
        },

        j0_n1: {
          opening: (data) => `<Assessment> Inefficiencies detected in your current configuration.`,
          closing: (data) => `<Recommendation> Optimize these parameters.`,
          emphasis: ["analysis", "optimization"],
          dspInterpreter: (dsp) => ""
        }
      }
    },

    // ========================================
    // 5. "HOW SHOULD I FIGHT?" — Combat Role
    // ========================================
    how_should_i_fight: {
      systemIntent: "Frame battlefield role and priorities without specific tactics",
      canonicalAnalysis: (data) => {
        const { combatStyle } = data;
        let role = "Adaptive Tactician";
        if (combatStyle === "melee") role = "Frontline Enforcer";
        else if (combatStyle === "ranged") role = "Precision Striker";
        else if (combatStyle === "caster") role = "Force Conduit";

        return `Your role in combat is that of the **${role}**. This role defines your priorities and your position on the battlefield.`;
      },

      mentors: {
        miraj: {
          opening: (data) => `The Force shapes your role in conflict. Listen to what it demands of you.`,
          closing: (data) => `Execute this role with discipline. Your purpose will become clear through practice.`,
          emphasis: ["purpose", "discipline"],
          dspInterpreter: (dsp) => ""
        },

        breach: {
          opening: (data) => `Your role in combat defines your priorities.`,
          closing: (data) => `Execute this role. Nothing else matters.`,
          emphasis: ["clarity", "execution"],
          dspInterpreter: (dsp) => ""
        },

        lead: {
          opening: (data) => `Here's your role. Understand it, own it, and execute it.`,
          closing: (data) => `Your teammates depend on you filling this role. Don't let them down.`,
          emphasis: ["teamwork", "reliability"],
          dspInterpreter: (dsp) => ""
        },

        ol_salty: {
          opening: (data) => `Listen up, matey! Here's what the fight needs from ye!`,
          closing: (data) => `Play yer part and the crew stays breathin'!`,
          emphasis: ["survival", "teamwork"],
          dspInterpreter: (dsp) => ""
        },

        j0_n1: {
          opening: (data) => `<Analysis> Your optimal battlefield position is defined by your combat parameters.`,
          closing: (data) => `<Directive> Execute this role for maximum tactical efficiency.`,
          emphasis: ["optimization", "efficiency"],
          dspInterpreter: (dsp) => ""
        }
      }
    },

    // ========================================
    // 6. "WHAT SHOULD I BE CAREFUL OF?" — Risk Awareness
    // ========================================
    be_careful: {
      systemIntent: "Warn about risks, traps, and consequences",
      canonicalAnalysis: (data) => {
        const { risks } = data;
        let analysis = `These are the dangers your current path creates. `;
        if (risks && risks.length > 0) {
          analysis += `Specifically: **${risks.map(r => r.type).slice(0, 2).join("**, **")}**. `;
        }
        analysis += `Awareness of these risks is the first defense against them.`;
        return analysis;
      },

      mentors: {
        miraj: {
          opening: (data) => `Temptation and cost live intertwined on every path. You must see both.`,
          closing: (data) => `Remember this always: power without wisdom is only rope with which to hang yourself.`,
          emphasis: ["wisdom", "foresight"],
          dspInterpreter: (dsp) => ""
        },

        breach: {
          opening: (data) => `These are the dangers you face.`,
          closing: (data) => `Know the risks. Plan for them. Survive them.`,
          emphasis: ["preparation", "awareness"],
          dspInterpreter: (dsp) => ""
        },

        lead: {
          opening: (data) => `Every choice has consequences. These are the ones you're creating.`,
          closing: (data) => `See them coming and you can manage them. Get caught surprised and they'll kill you.`,
          emphasis: ["foresight", "preparation"],
          dspInterpreter: (dsp) => ""
        },

        ol_salty: {
          opening: (data) => `Watch out, matey. Even the best scallywags run into trouble if they ain't careful.`,
          closing: (data) => `Know the dangers and ye can dance around 'em!`,
          emphasis: ["survival", "cunning"],
          dspInterpreter: (dsp) => ""
        },

        j0_n1: {
          opening: (data) => `<Warning> Threat vectors identified in your current trajectory.`,
          closing: (data) => `<Recommendation> Implement mitigation strategies.`,
          emphasis: ["analysis", "prevention"],
          dspInterpreter: (dsp) => ""
        }
      }
    },

    // ========================================
    // 7. "WHAT LIES AHEAD?" — Future Planning
    // ========================================
    what_lies_ahead: {
      systemIntent: "Hint at prestige classes and long-term options",
      canonicalAnalysis: (data) => {
        const { targetClass, targetConfidence } = data;
        let analysis = `Your choices are creating trajectories. `;
        if (targetClass) {
          analysis += `Specifically, your path suggests potential in **${targetClass}**`;
          if (targetConfidence) {
            analysis += ` (${Math.round(targetConfidence * 100)}% alignment)`;
          }
          analysis += `. But many paths remain possible.`;
        } else {
          analysis += `Many futures remain open to you.`;
        }
        return analysis;
      },

      mentors: {
        miraj: {
          opening: (data) => `The future is not fixed, but your choices write it gradually. Let me show you what your path suggests.`,
          closing: (data) => `Remember: the future belongs to those patient enough to build it with intention.`,
          emphasis: ["foresight", "intentionality"],
          dspInterpreter: (dsp) => ""
        },

        breach: {
          opening: (data) => `Your choices are already pointing somewhere. Here's where they lead.`,
          closing: (data) => `Plan ahead. Good operators know where they're going before they start moving.`,
          emphasis: ["planning", "strategy"],
          dspInterpreter: (dsp) => ""
        },

        lead: {
          opening: (data) => `I've seen this pattern before. Here's where it usually leads.`,
          closing: (data) => `Your next moves will determine if you follow that path or cut a new one.`,
          emphasis: ["pattern", "agency"],
          dspInterpreter: (dsp) => ""
        },

        ol_salty: {
          opening: (data) => `Ye be buildin' toward somethin', matey. Let me tell ye where the wind's blowin' ye!`,
          closing: (data) => `The future's got riches waitin' for those clever enough to see 'em comin'!`,
          emphasis: ["opportunity", "preparation"],
          dspInterpreter: (dsp) => ""
        },

        j0_n1: {
          opening: (data) => `<Projection> Current trajectory vectors suggest future specialization pathways.`,
          closing: (data) => `<Analysis> Plan accordingly.`,
          emphasis: ["forecasting", "optimization"],
          dspInterpreter: (dsp) => ""
        }
      }
    },

    // ========================================
    // 8. "HOW WOULD YOU PLAY THIS?" — Doctrine
    // ========================================
    how_would_you_play: {
      systemIntent: "Show mentor's personal priorities and philosophy",
      canonicalAnalysis: (data) => {
        return `Every mentor brings personal conviction to their craft. Mine are shaped by my experience and my values. What you're about to hear is my bias—and it's intentional. I don't claim objectivity here. I claim earned perspective.`;
      },

      mentors: {
        miraj: {
          opening: (data) => `You ask how I would walk this path? With discipline. With purpose. With the understanding that every choice has weight.`,
          closing: (data) => `This is not the only way. But it is *a* way, tested by centuries of Jedi before me.`,
          emphasis: ["philosophy", "discipline"],
          dspInterpreter: (dsp) => ""
        },

        breach: {
          opening: (data) => `I'd keep it simple. Train hard, hit hard, survive harder. No fancy theories.`,
          closing: (data) => `That's Mandalorian practicality. It works. Everything else is luxury.`,
          emphasis: ["pragmatism", "execution"],
          dspInterpreter: (dsp) => ""
        },

        lead: {
          opening: (data) => `I'd stay aware. Read the situation, adapt to it, and never get caught in a predictable pattern.`,
          closing: (data) => `That's how Argent Squad survives. Flexibility, awareness, and precision.`,
          emphasis: ["adaptation", "awareness"],
          dspInterpreter: (dsp) => ""
        },

        ol_salty: {
          opening: (data) => `Me? I'd make luck work for me! Take risks, but calculated ones. Know when to run and when to fight!`,
          closing: (data) => `Freedom and profit, matey! That's how ol' Salty plays this game!`,
          emphasis: ["opportunism", "survival"],
          dspInterpreter: (dsp) => ""
        },

        j0_n1: {
          opening: (data) => `<Personal Analysis> I would optimize all parameters systematically. Emotion is inefficiency.`,
          closing: (data) => `<Doctrine> Logic, precision, and relentless self-improvement. This is the superior approach.`,
          emphasis: ["logic", "efficiency"],
          dspInterpreter: (dsp) => ""
        }
      }
    }
  };
}
