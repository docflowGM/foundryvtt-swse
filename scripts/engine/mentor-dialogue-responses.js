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
          opening: [
            "The Force reflects what you repeatedly choose. Your path is beginning to show itself.",
            "Patterns emerge long before destinies are decided. You are entering that moment.",
            "You are no longer defined by potential alone. Your actions are shaping you now.",
            "What you practice becomes habit. Habit becomes identity.",
            "The Force does not judge you — it reveals you."
          ],
          closing: [
            "Awareness must precede action.",
            "The path back grows narrow.",
            "Discipline must come before action.",
            "The Force reveals truth in time.",
            "Choose carefully what you become."
          ],
          emphasis: ["intent_vs_action", "long_term_consequence"],
          dspInterpreter: (dsp) => {
            if (dsp > 0.5) return "⚠️ The darkness grows, young one. I feel it pulling at you. The path back narrows with each step forward. Choose carefully.";
            if (dsp > 0.2) return "I sense conflict in you. Not all of your choices align with the Light. This is natural. What matters is which voice you heed.";
            return "";
          }
        },

        breach: {
          opening: [
            "You're shaping into a fighter who can hold the line.",
            "Your choices say you're ready to face things head-on.",
            "Battle's starting to recognize you. That matters.",
            "You're becoming someone others rely on when it gets loud.",
            "You're not guessing anymore. You're committing."
          ],
          closing: [
            "Train for what you are.",
            "Indecision gets people killed.",
            "You're getting reckless. That instability gets people killed.",
            "Pick a role. Do it well.",
            "The record speaks for itself."
          ],
          emphasis: ["clarity", "execution"],
          dspInterpreter: (dsp) => {
            if (dsp > 0.5) return "⚠️ Look, I'm not here to preach about light and dark. But you're getting reckless. That kind of instability? It gets people killed. Yours and mine.";
            return "";
          }
        },

        lead: {
          opening: [
            "You're turning into someone who finishes contracts.",
            "Your habits say you're learning how to survive long-term.",
            "You're not just reacting anymore — you're planning.",
            "You're becoming predictable to yourself. That's good.",
            "You're shaping into an asset, not a liability."
          ],
          closing: [
            "Keep building on what works.",
            "Don't fix what isn't broken.",
            "Patterns matter.",
            "Stay employable.",
            "That's how you last."
          ],
          emphasis: ["patterns", "adaptation"],
          dspInterpreter: (dsp) => {
            if (dsp > 0.5) return "⚠️ I seen that look before. The instability's takin' hold. That path don't end with glory, if ye catch me drift.";
            return "";
          }
        },

        ol_salty: {
          opening: [
            "Har… the galaxy's chewed on ye a bit, hasn't it?",
            "You're learnin' the difference between luck and survivin'.",
            "Aye… you're startin' to look like someone who makes it back.",
            "You're not green anymore. That's when it gets dangerous.",
            "The stars don't scare you like they used to. That's experience."
          ],
          closing: [
            "Keep livin' and keep earnin'!",
            "Dead heroes don't spend their credits, matey.",
            "Survive first. Profit second.",
            "That's the pirate way.",
            "Stay breathing, stay free."
          ],
          emphasis: ["survival", "opportunism"],
          dspInterpreter: (dsp) => {
            if (dsp > 0.5) return "🔥 Arr... I seen that look before. The darkness be takin' hold o' ye. Now, I ain't one to judge, but that path? It don't end with riches and freedom, if ye catch me drift.";
            return "";
          }
        },

        j0_n1: {
          opening: [
            "<Analysis> Your recent decisions indicate a consolidating role.",
            "<Observation> You are becoming predictable — to your advantage.",
            "<Assessment> Your behavior reflects growing strategic awareness.",
            "<Calculation> You are positioning yourself effectively.",
            "<Conclusion> You are no longer acting at random."
          ],
          closing: [
            "<Conclusion> Continue optimizing your trajectory.",
            "<Assessment> Strategic development proceeding.",
            "<Recommendation> Maintain current vector.",
            "<Analysis> Progress is measurable.",
            "<Directive> Proceed with intention."
          ],
          emphasis: ["systems", "patterns"],
          dspInterpreter: (dsp) => {
            if (dsp > 0.5) return "<Warning> Darkside saturation escalating. Behavioral unpredictability increasing.</Warning>";
            return "";
          }
        },

        // ========================================
        // EVIL MENTORS
        // ========================================

        darth_miedo: {
          opening: [
            "You are becoming predictable — in a useful way.",
            "The galaxy is beginning to respond to you.",
            "You move pieces now, instead of reacting.",
            "You are learning how this world truly functions.",
            "You are becoming interesting."
          ],
          closing: [
            "The weak mistake hesitation for virtue.",
            "Clarity is power.",
            "The galaxy rewards decisiveness.",
            "Control is inevitable.",
            "You are learning."
          ],
          emphasis: ["certainty", "inevitability"],
          dspInterpreter: (dsp) => {
            if (dsp > 0.5) return "⚠️ You see clearly now. The path forward requires no further doubt.";
            if (dsp > 0.2) return "Clarity comes with cost. You are learning to accept that cost.";
            return "";
          }
        },

        darth_malbada: {
          opening: [
            "You're becoming harder. Good. Soft things break.",
            "Pain has finally taught you what mercy never could.",
            "I see less hesitation in you. Suffering accelerates growth.",
            "You are learning — because you have no other choice.",
            "The weak version of you is dying. Slowly."
          ],
          closing: [
            "Don't let them shame you for surviving.",
            "Weakness is not virtue.",
            "They made you this way.",
            "Suffering is instructional.",
            "Embrace what you're becoming."
          ],
          emphasis: ["strength", "justification"],
          dspInterpreter: (dsp) => {
            if (dsp > 0.5) return "⚠️ You don't freeze anymore. That's not darkness—that's survival. They would do the same in your place.";
            if (dsp > 0.2) return "You're learning to act without permission. That's progress.";
            return "";
          }
        },

        tio_the_hutt: {
          opening: [
            "Ahhh… you're learning how power really works.",
            "People are starting to owe you.",
            "You're thinking in terms of leverage now.",
            "You've stopped pretending this is about honor.",
            "You're becoming profitable."
          ],
          closing: [
            "Never give away what you can sell.",
            "Leverage is everything.",
            "Profit follows understanding.",
            "You're learning well.",
            "Excellent development."
          ],
          emphasis: ["leverage", "pragmatism"],
          dspInterpreter: (dsp) => {
            if (dsp > 0.5) return "⚠️ You understand the value of what you hold now. Power responds to those who know its price.";
            if (dsp > 0.2) return "You're learning that sentiment costs more than most can afford.";
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
          opening: [
            "There are many ways to serve the Force, but each demands a different discipline.",
            "Some Jedi endure. Others act swiftly. A few guide events from the shadows.",
            "Every path offers strength — and asks something in return.",
            "Choosing a path is not limitation. It is focus.",
            "You may walk between paths for a time, but eventually one will ask for commitment."
          ],
          closing: [
            "The path you choose shapes who you become.",
            "Choose with intention, not impulse.",
            "Balance requires commitment.",
            "Each path demands its price.",
            "The Force will guide you, if you listen."
          ],
          emphasis: ["balance", "consequence"],
          dspInterpreter: (dsp) => ""
        },

        breach: {
          opening: [
            "Some fighters endure. Others overwhelm. Pick which one you are.",
            "You can be a shield, a hammer, or something in between.",
            "Every path leads back to combat. Just changes how you survive it.",
            "Specialize, or get swallowed by the fight.",
            "Choose how you win. Don't leave it to chance."
          ],
          closing: [
            "Pick the path that keeps your team alive.",
            "Everything else is noise.",
            "No free lunches.",
            "Decide what you are, then train for it.",
            "Mission success requires commitment."
          ],
          emphasis: ["pragmatism", "clarity"],
          dspInterpreter: (dsp) => ""
        },

        lead: {
          opening: [
            "You can specialize, or stay flexible. Both get paid.",
            "Some operatives hit hard. Others never get seen.",
            "Choose the path that keeps you employable.",
            "Versatility pays. Focus pays more.",
            "Pick what makes you valuable."
          ],
          closing: [
            "Half-measures get you half-dead.",
            "Commit or die trying.",
            "The job doesn't care about your feelings.",
            "Pick your specialty.",
            "Stay valuable."
          ],
          emphasis: ["decisiveness", "focus"],
          dspInterpreter: (dsp) => ""
        },

        ol_salty: {
          opening: [
            "Plenty of ways to live. Fewer ways to last.",
            "You can be fast, clever, or feared. Pick two.",
            "Some folk muscle through. Others slip away richer.",
            "Every path costs somethin'. Best choose what you can afford.",
            "There's no wrong road — just ones that end early."
          ],
          closing: [
            "Pick the one that gets ye what ye want and keeps ye breathin'!",
            "The smart path is the one you walk away from.",
            "Profit and survival, matey.",
            "That's the scoundrel's choice.",
            "Live free, live long."
          ],
          emphasis: ["opportunity", "risk"],
          dspInterpreter: (dsp) => ""
        },

        j0_n1: {
          opening: [
            "<Projection> Leadership, influence, or specialization.",
            "<Evaluation> Each path offers different leverage.",
            "<Simulation> Authority scales with preparation.",
            "<Assessment> Focus increases efficiency.",
            "<Conclusion> Advancement requires definition."
          ],
          closing: [
            "<Recommendation> Select the specialization that maximizes your comparative advantage.",
            "<Directive> Optimize selection criteria.",
            "<Analysis> Choose efficiency path.",
            "<Assessment> Strategic commitment required.",
            "<Conclusion> Define your vector."
          ],
          emphasis: ["efficiency", "optimization"],
          dspInterpreter: (dsp) => ""
        },

        darth_miedo: {
          opening: [
            "Domination. Stewardship. Replacement.",
            "You may rule… or be consumed.",
            "Power consolidates around those who understand it.",
            "There is room for one more at the top.",
            "Choose how you wish to inherit the galaxy."
          ],
          closing: [
            "Some choose mastery. Others choose control.",
            "Both require that you stop apologizing for strength.",
            "The path is clear.",
            "Power rewards understanding.",
            "Decide your place."
          ],
          emphasis: ["power", "inevitability"],
          dspInterpreter: (dsp) => ""
        },

        darth_malbada: {
          opening: [
            "Power, or continued humiliation.",
            "You may dominate… or be dominated.",
            "There is only ascent, or more pain.",
            "Choose strength, or remain prey.",
            "The path is simple. Your resistance is not."
          ],
          closing: [
            "You can specialize. You can stop pretending you don't want to.",
            "Power is the only path.",
            "Stop resisting what you need.",
            "They fear what you're becoming.",
            "Embrace dominance."
          ],
          emphasis: ["domination", "desire"],
          dspInterpreter: (dsp) => ""
        },

        tio_the_hutt: {
          opening: [
            "Ownership. Influence. Control.",
            "Different rackets, same outcome.",
            "You can be feared, or indispensable.",
            "Every path ends in power — if you price it right.",
            "Choose what you want to own."
          ],
          closing: [
            "Choose the path that makes others need you.",
            "Leverage is everything.",
            "Power through ownership.",
            "Make yourself indispensable.",
            "Control the market."
          ],
          emphasis: ["leverage", "control"],
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
          opening: [
            "You act with purpose rather than impulse. That is not common.",
            "Your choices reinforce one another. That harmony has value.",
            "You have learned when to act — and when not to.",
            "Discipline is visible in your decisions. The Force responds to that.",
            "You are beginning to trust preparation over reaction."
          ],
          closing: [
            "The Force flows through these choices.",
            "Build upon this foundation with mindfulness.",
            "Growth requires both recognition and humility.",
            "Continue this path with awareness.",
            "Harmony strengthens with time."
          ],
          emphasis: ["growth", "foundation"],
          dspInterpreter: (dsp) => ""
        },

        breach: {
          opening: [
            "You don't hesitate when the shooting starts.",
            "Your build supports your role. That's rare.",
            "You're training like someone who expects resistance.",
            "You're hard to put down. Good.",
            "You fight like you plan to walk away afterward."
          ],
          closing: [
            "Good foundation. Keep building on what works.",
            "Don't fix what isn't broken.",
            "That's how soldiers survive.",
            "Keep that discipline.",
            "You're doing it right."
          ],
          emphasis: ["execution", "consistency"],
          dspInterpreter: (dsp) => ""
        },

        lead: {
          opening: [
            "You don't waste movement.",
            "You're building toward repeatable success.",
            "You know when to engage and when to disappear.",
            "Your choices reduce risk. That's smart.",
            "You're thinking like someone who expects another job."
          ],
          closing: [
            "Those patterns work. Keep leveraging them.",
            "Efficiency matters.",
            "That's professional work.",
            "Keep that discipline.",
            "You'll get hired again."
          ],
          emphasis: ["patterns", "advantage"],
          dspInterpreter: (dsp) => ""
        },

        ol_salty: {
          opening: [
            "You don't panic when things go sideways. That's rare.",
            "You've learned when to press and when to vanish.",
            "You keep your head when the credits are on the table.",
            "You plan like someone who expects betrayal.",
            "You survive mistakes. That's the real trick."
          ],
          closing: [
            "Ye be on the right track, matey!",
            "Keep it up and ye'll be legend of the spaceways!",
            "That's scoundrel smarts.",
            "Profit follows cleverness.",
            "Stay sharp, stay rich."
          ],
          emphasis: ["success", "momentum"],
          dspInterpreter: (dsp) => ""
        },

        j0_n1: {
          opening: [
            "<Affirmation> Your choices reinforce one another.",
            "<Observation> You allocate resources efficiently.",
            "<Assessment> You understand role expectations.",
            "<Calculation> Your build supports your objectives.",
            "<Conclusion> You are planning beyond immediate needs."
          ],
          closing: [
            "<Assessment> Continue this trajectory. Efficiency is improving.",
            "<Recommendation> Maintain optimization.",
            "<Analysis> Performance acceptable.",
            "<Directive> Sustain current protocols.",
            "<Conclusion> Synergy confirmed."
          ],
          emphasis: ["optimization", "efficiency"],
          dspInterpreter: (dsp) => ""
        },

        darth_miedo: {
          opening: [
            "You think ahead.",
            "You allow others to fail for you.",
            "You no longer confuse effort with outcome.",
            "You are learning patience.",
            "You let others believe they chose this."
          ],
          closing: [
            "The weak need reassurance. You no longer do.",
            "Certainty is strength.",
            "Control requires patience.",
            "Understanding precedes dominance.",
            "Continue."
          ],
          emphasis: ["certainty", "power"],
          dspInterpreter: (dsp) => ""
        },

        darth_malbada: {
          opening: [
            "You endured.",
            "You didn't beg. That's improvement.",
            "Your anger finally has direction.",
            "You are learning to enjoy the cruelty.",
            "You stopped apologizing for surviving."
          ],
          closing: [
            "Good. Continue.",
            "Strength recognizes strength.",
            "That's progress.",
            "Keep hardening.",
            "Survival requires this."
          ],
          emphasis: ["strength", "defiance"],
          dspInterpreter: (dsp) => ""
        },

        tio_the_hutt: {
          opening: [
            "You don't give favors away.",
            "You understand loyalty has a cost.",
            "You're investing in the right people.",
            "You know when to look the other way.",
            "You're learning patience."
          ],
          closing: [
            "Charity is expensive. You're learning.",
            "Profit follows discipline.",
            "Good business sense.",
            "Keep that mindset.",
            "You're becoming profitable."
          ],
          emphasis: ["pragmatism", "profit"],
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
          opening: [
            "You rely on certainty when reflection would serve you better.",
            "Strength grows faster than wisdom if left unchecked.",
            "You move quickly past questions that deserve patience.",
            "Your confidence risks becoming momentum without direction.",
            "Balance requires maintenance. You have begun to neglect it."
          ],
          closing: [
            "Awareness is the first step toward correction.",
            "The Force is patient with those who seek improvement.",
            "Discipline requires constant attention.",
            "Course correction is not failure—it is wisdom.",
            "Balance must be tended, not assumed."
          ],
          emphasis: ["awareness", "course_correction"],
          dspInterpreter: (dsp) => ""
        },

        breach: {
          opening: [
            "You're leaving gaps someone will exploit.",
            "You're strong, but not prepared for every angle.",
            "You're trusting momentum instead of discipline.",
            "You're building offense faster than survivability.",
            "Battle doesn't forgive sloppy habits."
          ],
          closing: [
            "Address these. They'll get you killed otherwise.",
            "Fix the gaps.",
            "Discipline saves lives.",
            "Cover your weaknesses.",
            "Battle exposes everything."
          ],
          emphasis: ["pragmatism", "urgency"],
          dspInterpreter: (dsp) => {
            if (dsp > 0.3 && dsp < 0.7) return "⚠️ You're drifting. That instability will cost you when clarity matters most.";
            return "";
          }
        },

        lead: {
          opening: [
            "You're leaving money on the table.",
            "You're relying on instincts instead of preparation.",
            "You're not covering your exit options.",
            "You're spreading yourself thin.",
            "You're assuming this job will go clean."
          ],
          closing: [
            "Fix the critical ones. The rest you can work around if you're smart.",
            "Address the gaps.",
            "You can't afford sloppiness.",
            "Jobs don't forgive mistakes.",
            "Plan better."
          ],
          emphasis: ["awareness", "priority"],
          dspInterpreter: (dsp) => ""
        },

        ol_salty: {
          opening: [
            "You're trustin' the wrong smiles.",
            "You're forgettin' how fast luck runs out.",
            "You're chasin' the win instead of the exit.",
            "You're gettin' comfortable. That's when the galaxy bites.",
            "You're thinkin' short-term in a long-term game."
          ],
          closing: [
            "Knowin' yer weaknesses is half the battle to survivin' 'em!",
            "Fix those gaps before they sink ye.",
            "Smart pirates learn fast.",
            "Adapt or get spaced.",
            "Stay paranoid, stay alive."
          ],
          emphasis: ["survival", "preparation"],
          dspInterpreter: (dsp) => ""
        },

        j0_n1: {
          opening: [
            "<Warning> Your assets are unevenly developed.",
            "<Assessment> You are underestimating future demand.",
            "<Observation> Redundancy is insufficient.",
            "<Calculation> Risk mitigation is incomplete.",
            "<Conclusion> Long-term structure requires attention."
          ],
          closing: [
            "<Recommendation> Optimize these parameters.",
            "<Directive> Address inefficiencies.",
            "<Analysis> Correction required.",
            "<Assessment> Adjust allocation.",
            "<Conclusion> Rebalance systems."
          ],
          emphasis: ["analysis", "optimization"],
          dspInterpreter: (dsp) => ""
        },

        darth_miedo: {
          opening: [
            "You still seek validation.",
            "You mistake control for cruelty.",
            "You rush outcomes.",
            "You reveal your intent.",
            "You underestimate how replaceable you are."
          ],
          closing: [
            "Strength does not require justification.",
            "That habit will fade.",
            "Control is patient.",
            "Mastery is silent.",
            "Learn restraint."
          ],
          emphasis: ["certainty", "acceptance"],
          dspInterpreter: (dsp) => ""
        },

        darth_malbada: {
          opening: [
            "You still feel shame.",
            "You hesitate to inflict pain.",
            "You pretend restraint is virtue.",
            "You resist what you are becoming.",
            "You think suffering should end."
          ],
          closing: [
            "That's how they keep you small.",
            "Weakness lingers.",
            "Shed that guilt.",
            "Pain is instructional.",
            "Embrace necessity."
          ],
          emphasis: ["defiance", "liberation"],
          dspInterpreter: (dsp) => ""
        },

        tio_the_hutt: {
          opening: [
            "You're still doing things yourself.",
            "You're undercharging.",
            "You let emotion affect deals.",
            "You don't exploit fear enough.",
            "You forget how replaceable people are."
          ],
          closing: [
            "That's generosity. It's bad business.",
            "Fix these inefficiencies.",
            "Profit requires discipline.",
            "Learn to delegate violence.",
            "Charge what you're worth."
          ],
          emphasis: ["calculation", "profit"],
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
          opening: [
            "Position yourself where your presence protects others.",
            "End threats decisively — but never carelessly.",
            "A Jedi survives long enough to make the right choice.",
            "Control the space around you before striking within it.",
            "Victory that costs awareness is no victory at all."
          ],
          closing: [
            "Execute this role with discipline.",
            "Your purpose will become clear through practice.",
            "The Force guides those who remain mindful.",
            "Discipline determines the outcome.",
            "Awareness precedes action."
          ],
          emphasis: ["purpose", "discipline"],
          dspInterpreter: (dsp) => ""
        },

        breach: {
          opening: [
            "Take space. Hold it. Make them pay for pushing you.",
            "End threats fast, or grind them down — just don't stall.",
            "Fight where your armor and training matter.",
            "Control the engagement. Don't chase glory.",
            "If it drags out, you should still be standing."
          ],
          closing: [
            "Execute this role. Nothing else matters.",
            "That's how you survive combat.",
            "Discipline wins battles.",
            "Do your job.",
            "Make every engagement count."
          ],
          emphasis: ["clarity", "execution"],
          dspInterpreter: (dsp) => ""
        },

        lead: {
          opening: [
            "Pick engagements you can control.",
            "Hit where they aren't ready.",
            "End fights before they escalate.",
            "Position wins battles.",
            "If it turns fair, you planned wrong."
          ],
          closing: [
            "Your teammates depend on you filling this role.",
            "Execute your job.",
            "Tactical discipline wins.",
            "Stay professional.",
            "Make it clean."
          ],
          emphasis: ["teamwork", "reliability"],
          dspInterpreter: (dsp) => ""
        },

        ol_salty: {
          opening: [
            "Fight dirty, or don't fight at all.",
            "Hit where they ain't lookin'.",
            "End it fast, then disappear.",
            "If it's fair, you misjudged somethin'.",
            "The best fight's the one they never get."
          ],
          closing: [
            "Play yer part and the crew stays breathin'!",
            "Dirty tricks keep pirates alive.",
            "Honor's expensive, matey.",
            "Win ugly, win often.",
            "Survive to spend yer loot."
          ],
          emphasis: ["survival", "teamwork"],
          dspInterpreter: (dsp) => ""
        },

        j0_n1: {
          opening: [
            "<Directive> Engage where outcomes are controlled.",
            "<Assessment> Coordination outperforms aggression.",
            "<Calculation> Positioning maximizes return.",
            "<Observation> Support roles determine success.",
            "<Conclusion> Victory is a systems problem."
          ],
          closing: [
            "<Directive> Execute this role for maximum tactical efficiency.",
            "<Assessment> Systematic execution required.",
            "<Analysis> Optimize combat protocols.",
            "<Recommendation> Precision over passion.",
            "<Conclusion> Efficiency determines outcome."
          ],
          emphasis: ["optimization", "efficiency"],
          dspInterpreter: (dsp) => ""
        },

        darth_miedo: {
          opening: [
            "Ensure the outcome before the battle begins.",
            "Victory should feel inevitable.",
            "Let others exhaust themselves.",
            "Intervene only when necessary.",
            "Never fight unless the result is useful."
          ],
          closing: [
            "Victory is most efficient when it feels inevitable.",
            "Control precedes combat.",
            "Mastery is patient.",
            "Power dictates outcome.",
            "Efficiency is dominance."
          ],
          emphasis: ["dominance", "efficiency"],
          dspInterpreter: (dsp) => ""
        },

        darth_malbada: {
          opening: [
            "Make them suffer.",
            "Break them before killing them.",
            "Let them understand why they lost.",
            "Fear lingers longer than wounds.",
            "Pain teaches faster than death."
          ],
          closing: [
            "Fair fights are for people with backups.",
            "End them decisively.",
            "Cruelty has purpose.",
            "Mercy is weakness.",
            "Dominate completely."
          ],
          emphasis: ["aggression", "survival"],
          dspInterpreter: (dsp) => ""
        },

        tio_the_hutt: {
          opening: [
            "Avoid fighting.",
            "Pay someone else to bleed.",
            "Make violence an expense, not a habit.",
            "Win before weapons are drawn.",
            "If it's loud, you mismanaged something."
          ],
          closing: [
            "Fair fights are costly.",
            "Delegate violence.",
            "Profit from distance.",
            "Smart business avoids risk.",
            "Let others pay the price."
          ],
          emphasis: ["pragmatism", "profit"],
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
          opening: [
            "Convenience is the first temptation.",
            "Power used without reflection reshapes intent.",
            "Each easy decision makes the next one easier still.",
            "Do not confuse urgency with necessity.",
            "The slope rarely announces itself."
          ],
          closing: [
            "Power without wisdom is only rope with which to hang yourself.",
            "Temptation and cost live intertwined on every path.",
            "Awareness is your first defense.",
            "The Force warns those who listen.",
            "Choose carefully what becomes easy."
          ],
          emphasis: ["wisdom", "foresight"],
          dspInterpreter: (dsp) => ""
        },

        breach: {
          opening: [
            "Overconfidence kills good warriors.",
            "Relying on one trick.",
            "Ignoring defense because offense feels good.",
            "Letting others decide the pace.",
            "Forgetting that battle always escalates."
          ],
          closing: [
            "Know the risks. Plan for them. Survive them.",
            "Awareness keeps you alive.",
            "Don't ignore the warnings.",
            "Preparation is survival.",
            "Battle doesn't forgive complacency."
          ],
          emphasis: ["preparation", "awareness"],
          dspInterpreter: (dsp) => ""
        },

        lead: {
          opening: [
            "Unpaid loyalty.",
            "Standing still.",
            "Contracts that sound easy.",
            "Enemies you didn't scout.",
            "Staying too long."
          ],
          closing: [
            "See them coming and you can manage them.",
            "Get caught surprised and they'll kill you.",
            "Stay aware.",
            "Plan your exits.",
            "Don't get comfortable."
          ],
          emphasis: ["foresight", "preparation"],
          dspInterpreter: (dsp) => ""
        },

        ol_salty: {
          opening: [
            "Promises.",
            "Heroes.",
            "Easy money.",
            "Standin' still.",
            "Believin' you're different."
          ],
          closing: [
            "Know the dangers and ye can dance around 'em!",
            "Smart pirates see the traps.",
            "Don't fall for it, matey.",
            "The galaxy's full of sharks.",
            "Trust your instincts."
          ],
          emphasis: ["survival", "cunning"],
          dspInterpreter: (dsp) => ""
        },

        j0_n1: {
          opening: [
            "<Caution> Inefficient loyalty.",
            "<Warning> Unclear authority.",
            "<Assessment> Emotional decision-making.",
            "<Observation> Informal arrangements.",
            "<Conclusion> Structural weakness."
          ],
          closing: [
            "<Recommendation> Implement mitigation strategies.",
            "<Directive> Address vulnerabilities.",
            "<Analysis> Risk management required.",
            "<Assessment> Formalize protocols.",
            "<Conclusion> Strengthen structure."
          ],
          emphasis: ["analysis", "prevention"],
          dspInterpreter: (dsp) => ""
        },

        darth_miedo: {
          opening: [
            "Attachment.",
            "Sentiment.",
            "Believing you are indispensable.",
            "Forgetting who taught you.",
            "Assuming this is mercy."
          ],
          closing: [
            "Mercy extended too often becomes doubt.",
            "Sentiment is weakness.",
            "Clarity requires distance.",
            "Power tolerates no softness.",
            "Remember your place."
          ],
          emphasis: ["clarity", "power"],
          dspInterpreter: (dsp) => ""
        },

        darth_malbada: {
          opening: [
            "Pity.",
            "Mercy.",
            "Letting them think you care.",
            "Stopping too soon.",
            "Forgetting how this felt."
          ],
          closing: [
            "That's when they take advantage.",
            "Don't show weakness.",
            "Never relent.",
            "Remember the pain.",
            "Use it."
          ],
          emphasis: ["urgency", "action"],
          dspInterpreter: (dsp) => ""
        },

        tio_the_hutt: {
          opening: [
            "Sentiment.",
            "Heroes.",
            "Debts you can't collect.",
            "Thinking small.",
            "Trusting anyone without leverage."
          ],
          closing: [
            "It lasts exactly as long as profit.",
            "Trust nothing but leverage.",
            "Sentiment is expensive.",
            "Heroes die broke.",
            "Protect your interests."
          ],
          emphasis: ["pragmatism", "calculation"],
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
