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
      opening: this._selectDialogue(mentorVoice.opening, analysisData),
      analysis: responses.canonicalAnalysis(analysisData),
      closing: this._selectDialogue(mentorVoice.closing, analysisData),
      emphasis: mentorVoice.emphasis || [],
      dspWarning: mentorVoice.dspInterpreter(analysisData.dspSaturation || 0)
    };
  }

  static _sanitizeMentorName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  /**
   * Randomly select from a dialogue pool
   * Supports three formats:
   * - Function: calls with data
   * - Array: picks random element
   * - String: returns as-is
   * @param {string|array|function} content - Dialogue content
   * @param {object} data - Context data for functions
   * @returns {string}
   */
  static _selectDialogue(content, data = {}) {
    // If it's a function, call it
    if (typeof content === 'function') {
      return content(data);
    }

    // If it's an array, pick random
    if (Array.isArray(content)) {
      return content[Math.floor(Math.random() * content.length)];
    }

    // Otherwise return as-is
    return content;
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
          opening: [
            "If you continue as you are, greater responsibility will follow.",
            "Specialization brings clarity — and consequence.",
            "Future paths will demand more than skill alone.",
            "What you become will matter to others, whether you intend it or not.",
            "The Force will ask you to define yourself more clearly."
          ],
          closing: [
            "The future belongs to those patient enough to build it with intention.",
            "Awareness shapes destiny.",
            "Your choices write what comes next.",
            "The Force guides those who prepare.",
            "Define yourself before you are defined."
          ],
          emphasis: ["foresight", "intentionality"],
          dspInterpreter: (dsp) => ""
        },

        breach: {
          opening: [
            "Harder fights. Stronger enemies.",
            "Command. Responsibility. Bigger stakes.",
            "Battles where retreat isn't an option.",
            "Specialization that defines how you survive.",
            "War doesn't slow down — you either adapt or fall."
          ],
          closing: [
            "Plan ahead. Good operators know where they're going.",
            "Prepare for what's coming.",
            "The fight only gets harder.",
            "Specialization is inevitable.",
            "Adapt or die."
          ],
          emphasis: ["planning", "strategy"],
          dspInterpreter: (dsp) => ""
        },

        lead: {
          opening: [
            "Bigger contracts. Higher risk.",
            "Leadership roles.",
            "Jobs where planning matters more than firepower.",
            "Specialization that defines your reputation.",
            "Choices that decide who hires you next."
          ],
          closing: [
            "Your next moves will determine if you follow that path or cut a new one.",
            "Plan accordingly.",
            "Reputation matters.",
            "Stay valuable.",
            "The money follows quality work."
          ],
          emphasis: ["pattern", "agency"],
          dspInterpreter: (dsp) => ""
        },

        ol_salty: {
          opening: [
            "Bigger scores. Bigger knives in the dark.",
            "Reputations that follow you.",
            "Jobs where walkin' away is the smart play.",
            "Choices you can't buy your way out of.",
            "The moment the galaxy remembers your name."
          ],
          closing: [
            "The future's got riches waitin' for those clever enough to see 'em comin'!",
            "Plan ahead, profit ahead.",
            "Fortune favors the prepared, matey.",
            "See it coming, claim it first.",
            "The future's yours if you're smart."
          ],
          emphasis: ["opportunity", "preparation"],
          dspInterpreter: (dsp) => ""
        },

        j0_n1: {
          opening: [
            "<Projection> Increased responsibility.",
            "<Assessment> Organizational leadership.",
            "<Calculation> Political consequences.",
            "<Observation> Expanded influence.",
            "<Conclusion> Strategic visibility."
          ],
          closing: [
            "<Analysis> Plan accordingly.",
            "<Directive> Prepare for escalation.",
            "<Recommendation> Strategic positioning.",
            "<Assessment> Future requires structure.",
            "<Conclusion> Advancement imminent."
          ],
          emphasis: ["forecasting", "optimization"],
          dspInterpreter: (dsp) => ""
        },

        darth_miedo: {
          opening: [
            "Greater authority.",
            "Heavier consequences.",
            "Fewer peers.",
            "A test you will not see coming.",
            "A decision about succession."
          ],
          closing: [
            "Those who refuse are replaced by those who do not.",
            "Power demands commitment.",
            "The future is inevitable.",
            "Prepare accordingly.",
            "Control or be controlled."
          ],
          emphasis: ["inevitability", "power"],
          dspInterpreter: (dsp) => ""
        },

        darth_malbada: {
          opening: [
            "More power. More suffering.",
            "Enemies who scream louder.",
            "Opportunities to hurt those who deserve it.",
            "Tests you will not enjoy — at first.",
            "A future carved from agony."
          ],
          closing: [
            "You won't need to justify yourself forever.",
            "Power silences critics.",
            "Strength is inevitable.",
            "Embrace what's coming.",
            "Pain refines."
          ],
          emphasis: ["strength", "liberation"],
          dspInterpreter: (dsp) => ""
        },

        tio_the_hutt: {
          opening: [
            "Bigger empires.",
            "More profitable enemies.",
            "Political influence.",
            "Luxury purchased with fear.",
            "A seat no one questions."
          ],
          closing: [
            "And much bigger returns.",
            "Profit scales with power.",
            "The future is lucrative.",
            "Build your empire.",
            "Wealth buys everything."
          ],
          emphasis: ["opportunity", "profit"],
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
          opening: [
            "I would build toward endurance before brilliance.",
            "I would survive long enough for wisdom to matter.",
            "I would favor preparation over reaction.",
            "I would let patience decide battles others rush into.",
            "I would remain calm when power feels most tempting."
          ],
          closing: [
            "This is not the only way. But it is *a* way.",
            "Centuries of Jedi have tested this path.",
            "Discipline shapes destiny.",
            "The Force rewards patience.",
            "Balance endures when passion fades."
          ],
          emphasis: ["philosophy", "discipline"],
          dspInterpreter: (dsp) => ""
        },

        breach: {
          opening: [
            "I'd build to outlast the fight.",
            "I'd train for worst-case scenarios.",
            "I'd make sure every hit against me costs them.",
            "I'd never rely on luck.",
            "I'd be the last one standing."
          ],
          closing: [
            "That's Mandalorian practicality. It works.",
            "Everything else is luxury.",
            "Simple. Effective. Proven.",
            "This is the Way.",
            "Survive first. Win second."
          ],
          emphasis: ["pragmatism", "execution"],
          dspInterpreter: (dsp) => ""
        },

        lead: {
          opening: [
            "I'd stay flexible until the money justified commitment.",
            "I'd build for mobility and awareness.",
            "I'd never fight fair.",
            "I'd always have an exit.",
            "I'd make sure the job pays enough to be worth it."
          ],
          closing: [
            "That's how Argent Squad survives.",
            "Flexibility, awareness, and precision.",
            "Professional. Profitable. Alive.",
            "That's the mercenary way.",
            "Get paid. Stay breathing."
          ],
          emphasis: ["adaptation", "awareness"],
          dspInterpreter: (dsp) => ""
        },

        ol_salty: {
          opening: [
            "I'd always keep a ship ready.",
            "I'd never fight fair.",
            "I'd make sure someone owed me.",
            "I'd leave before things got poetic.",
            "I'd live long enough to laugh about it."
          ],
          closing: [
            "Freedom and profit, matey! That's how ol' Salty plays this game!",
            "Live free, die rich.",
            "That's the pirate code.",
            "Laugh all the way to the bank.",
            "Survive with style, matey."
          ],
          emphasis: ["opportunism", "survival"],
          dspInterpreter: (dsp) => ""
        },

        j0_n1: {
          opening: [
            "<Preference> I would build redundancy.",
            "<Directive> I would control information flow.",
            "<Assessment> I would formalize authority.",
            "<Calculation> I would minimize volatility.",
            "<Conclusion> I would ensure continuity."
          ],
          closing: [
            "<Doctrine> Logic, precision, and relentless self-improvement. This is the superior approach.",
            "<Assessment> Systematic superiority.",
            "<Analysis> Efficiency prevails.",
            "<Recommendation> Optimize everything.",
            "<Conclusion> Logic is optimal."
          ],
          emphasis: ["logic", "efficiency"],
          dspInterpreter: (dsp) => ""
        },

        darth_miedo: {
          opening: [
            "I would build toward certainty.",
            "I would design outcomes, not fights.",
            "I would let others think they are safe.",
            "I would groom my replacement… carefully.",
            "I would ensure inevitability."
          ],
          closing: [
            "When I strike, the outcome is already decided.",
            "Mastery is patient.",
            "Control precedes action.",
            "Power is inevitable.",
            "This is the way."
          ],
          emphasis: ["inevitability", "mastery"],
          dspInterpreter: (dsp) => ""
        },

        darth_malbada: {
          opening: [
            "I would build toward inevitability.",
            "I would never spare them.",
            "I would let cruelty do the work.",
            "I would grow stronger on their pain.",
            "I would make suffering instructional."
          ],
          closing: [
            "No one questions power that works.",
            "Strength speaks.",
            "Cruelty is efficient.",
            "Dominance is final.",
            "This is the way."
          ],
          emphasis: ["strength", "autonomy"],
          dspInterpreter: (dsp) => ""
        },

        tio_the_hutt: {
          opening: [
            "I would own the battlefield.",
            "I would never pull the trigger.",
            "I would buy loyalty wholesale.",
            "I would make violence optional.",
            "I would let others die for my profits."
          ],
          closing: [
            "I'd own the person who does.",
            "Leverage is everything.",
            "Profit without risk.",
            "That's real power.",
            "Smart business."
          ],
          emphasis: ["leverage", "control"],
          dspInterpreter: (dsp) => ""
        }
      }
    },

    // ========================================
    // 9. "WHAT IS YOUR STORY?" — Mentor Self-Disclosure
    // ========================================
    mentor_story: {
      systemIntent: "Reveal mentor backstory based on trust, alignment, and player progression",
      canonicalAnalysis: (data) => {
        // This topic uses MentorStoryResolver instead
        return "";
      },

      mentors: {
        miraj: {
          opening: [
            "You ask about my past. That is... a profound question.",
            "I sense you wish to understand more than just my teachings.",
            "My journey has been long. Perhaps it is time to share part of it."
          ],
          closing: [
            "Remember, the path I walked is mine alone. Yours is still being written.",
            "What matters is not where I came from, but where the Force guides us both.",
            "These memories are old. Focus on the present moment."
          ],
          emphasis: [],
          dspInterpreter: (dsp) => ""
        },

        breach: {
          opening: [
            "You want to know where I come from? Fair question.",
            "Not many ask. Most don't care. You seem different.",
            "Alright, kid. Here's some truth for you."
          ],
          closing: [
            "That's the short version. The rest is classified.",
            "Now you know a little. Don't waste it.",
            "That's all you get from me. Focus on your own story."
          ],
          emphasis: [],
          dspInterpreter: (dsp) => ""
        },

        lead: {
          opening: [
            "My past? That's operational history you don't have clearance for.",
            "I might tell you. Depends if you've earned it.",
            "Alright, I'll tell you something. Don't broadcast it."
          ],
          closing: [
            "That's the sanitized version. The rest stays classified.",
            "Now you know why I am the way I am.",
            "Remember that when you're in the field."
          ],
          emphasis: [],
          dspInterpreter: (dsp) => ""
        },

        ol_salty: {
          opening: [
            "Har! Ye want ol' Salty's tale? Pull up a chair, matey!",
            "Not many ask these days. Seems ye got some respect fer an old pirate.",
            "Arrr, I got stories that'll make yer hair stand on end!"
          ],
          closing: [
            "That's the tale, savvy? Those were the days!",
            "Don't tell anyone—ruins the legend if folks know the truth, eh?",
            "That's how ol' Salty came to be. And that's all ye need know."
          ],
          emphasis: [],
          dspInterpreter: (dsp) => ""
        },

        j0_n1: {
          opening: [
            "<Query> You wish to understand my origins and function?",
            "<Assessment> That is... an unexpected request, Master.",
            "<Response> I suppose transparency is warranted. Very well."
          ],
          closing: [
            "<Conclusion> This is the nature of my existence.",
            "<Note> My past informs my present service.",
            "<Directive> Does this answer satisfy your inquiry, Master?"
          ],
          emphasis: [],
          dspInterpreter: (dsp) => ""
        },

        darth_miedo: {
          opening: [
            "You ask about my past? How... quaint.",
            "Most fear to know where I came from.",
            "Perhaps I will tell you. Perhaps I will let you wonder."
          ],
          closing: [
            "That is the truth that shaped me.",
            "Now you understand the cost of power.",
            "Don't make my mistakes. And don't pity me."
          ],
          emphasis: [],
          dspInterpreter: (dsp) => ""
        },

        darth_malbada: {
          opening: [
            "You want to know about Malbada? Fine.",
            "Not many survive asking me personal questions.",
            "Listen, and understand what strength requires."
          ],
          closing: [
            "That is the truth. Brutal and undeniable.",
            "This is what survival costs.",
            "Now stop wasting my time with sentiment."
          ],
          emphasis: [],
          dspInterpreter: (dsp) => ""
        },

        tio_the_hutt: {
          opening: [
            "You want to know Tio's history? Interesting negotiation.",
            "Not everyone gets to hear such things.",
            "Perhaps we can come to an arrangement..."
          ],
          closing: [
            "That is how Tio became what Tio is.",
            "Profitable. Powerful. Alive.",
            "Remember this if you ever cross me, hmmm?"
          ],
          emphasis: [],
          dspInterpreter: (dsp) => ""
        }
      }
    }
  };
}
