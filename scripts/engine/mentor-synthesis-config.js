/**
 * Mentor Synthesis Configuration
 *
 * Maps every mentor in the system to core voices and axes.
 * Non-core mentors are synthesized from these assignments without rewriting dialogue.
 *
 * Structure per mentor:
 * {
 *   primaryVoice: "miraj" | "breach" | "lead" | "ol_salty" | "j0_n1" | "darth_miedo" | "darth_malbada" | "tio_the_hutt",
 *   secondaryVoice: optional,
 *   tertiaryVoice: optional,
 *   corruptionAxis: "Domination" | "Temptation" | "Exploitation" | "Nihilism" | null
 * }
 */

export const MentorSynthesisConfig = {
  // ========================================
  // CORE MENTORS (Fully Authored)
  // ========================================
  core: [
    "miraj",
    "breach",
    "lead",
    "ol_salty",
    "j0_n1",
    "darth_miedo",
    "darth_malbada",
    "tio_the_hutt"
  ],

  // ========================================
  // FORCE / PHILOSOPHICAL MENTORS
  // ========================================
  force_mentors: {
    anchorite: {
      title: "The Anchorite",
      primaryVoice: "miraj",
      secondaryVoice: "venn",
      corruptionAxis: null,
      description: "Ascetic mystic. Withdrawal from conflict, deep communion with Force."
    },
    venn: {
      title: "Venn",
      primaryVoice: "miraj",
      secondaryVoice: "j0_n1",
      corruptionAxis: null,
      description: "Seeker. Philosophical curiosity, questions all assumptions."
    },
    seraphim: {
      title: "Seraphim",
      primaryVoice: "miraj",
      secondaryVoice: "anchorite",
      corruptionAxis: null,
      description: "Idealized Force morality. Almost religious in conviction."
    },
    urza: {
      title: "Urza",
      primaryVoice: "miraj",
      secondaryVoice: "darth_miedo",
      corruptionAxis: "Domination",
      description: "Zealous Force absolutism. Power through conviction."
    },
    axiom: {
      title: "Axiom",
      primaryVoice: "miraj",
      secondaryVoice: "darth_miedo",
      corruptionAxis: "Domination",
      description: "Force-as-law. Inevitability framing."
    }
  },

  // ========================================
  // SITH / DARK FORCE MENTORS
  // ========================================
  sith_mentors: {
    korr: {
      title: "Korr",
      primaryVoice: "darth_miedo",
      secondaryVoice: "breach",
      corruptionAxis: "Domination",
      description: "Brutal dark enforcer. Strength through violence."
    },
    delta_assassin: {
      title: "Delta Assassin",
      primaryVoice: "darth_malbada",
      secondaryVoice: "lead",
      corruptionAxis: "Nihilism",
      description: "Surgical killer. Moral emptiness, perfect execution."
    },
    infiltrator: {
      title: "Infiltrator",
      primaryVoice: "darth_malbada",
      secondaryVoice: "lead",
      corruptionAxis: "Temptation",
      description: "Dark operative. Pragmatism over ideology."
    }
  },

  // ========================================
  // MILITARY / COMBAT MENTORS
  // ========================================
  military_mentors: {
    captain: {
      title: "Captain",
      primaryVoice: "j0_n1",
      secondaryVoice: "breach",
      corruptionAxis: null,
      description: "Command authority. Discipline and order."
    },
    krag: {
      title: "Krag",
      primaryVoice: "breach",
      secondaryVoice: "darth_miedo",
      corruptionAxis: "Domination",
      description: "Heavy assault specialist. Brute force pragmatism."
    },
    theron: {
      title: "Theron",
      primaryVoice: "breach",
      secondaryVoice: "lead",
      corruptionAxis: null,
      description: "Veteran tactician. Measured aggression."
    },
    zhen: {
      title: "Zhen",
      primaryVoice: "breach",
      secondaryVoice: "miraj",
      corruptionAxis: null,
      description: "Elite warrior. Honor through combat mastery."
    }
  },

  // ========================================
  // SCOUT / TACTICAL / STEALTH MENTORS
  // ========================================
  scout_mentors: {
    rogue: {
      title: "Rogue",
      primaryVoice: "lead",
      secondaryVoice: "ol_salty",
      corruptionAxis: null,
      description: "Lone operator. Distrustful survivalist."
    },
    spark: {
      title: "Spark",
      primaryVoice: "lead",
      secondaryVoice: "ol_salty",
      corruptionAxis: null,
      description: "Speed specialist. Improvisation under control."
    },
    whisper: {
      title: "Whisper",
      primaryVoice: "lead",
      secondaryVoice: "darth_malbada",
      corruptionAxis: "Nihilism",
      description: "Psychological stealth. Erasure and invisibility."
    }
  },

  // ========================================
  // CRIMINAL / UNDERWORLD MENTORS
  // ========================================
  criminal_mentors: {
    skindar: {
      title: "Skindar",
      primaryVoice: "tio_the_hutt",
      secondaryVoice: "breach",
      corruptionAxis: "Exploitation",
      description: "Crime lord. Intimidation as currency."
    },
    pegar: {
      title: "Pegár",
      primaryVoice: "ol_salty",
      secondaryVoice: "lead",
      corruptionAxis: null,
      description: "Smuggler. Pragmatic adaptability."
    },
    jack: {
      title: "Jack",
      primaryVoice: "ol_salty",
      secondaryVoice: "breach",
      corruptionAxis: null,
      description: "Opportunist gunman. Wit and quick reflexes."
    },
    rax: {
      title: "Rax",
      primaryVoice: "tio_the_hutt",
      secondaryVoice: "j0_n1",
      corruptionAxis: "Exploitation",
      description: "Ruthless fixer. Everything solves for profit."
    },
    kex_varon: {
      title: "Kex Varon",
      primaryVoice: "tio_the_hutt",
      secondaryVoice: "j0_n1",
      corruptionAxis: "Exploitation",
      description: "Crime strategist. Systemic exploitation."
    },
    rajma: {
      title: "Rajma",
      primaryVoice: "j0_n1",
      secondaryVoice: "tio_the_hutt",
      corruptionAxis: "Exploitation",
      description: "Information broker. Data as leverage."
    }
  },

  // ========================================
  // SOCIAL / LEADERSHIP / INTELLECTUAL MENTORS
  // ========================================
  social_mentors: {
    sela: {
      title: "Sela",
      primaryVoice: "j0_n1",
      secondaryVoice: "miraj",
      corruptionAxis: null,
      description: "Diplomat. Ethical leadership and coalition."
    },
    mayu: {
      title: "Mayu",
      primaryVoice: "j0_n1",
      secondaryVoice: "ol_salty",
      corruptionAxis: null,
      description: "Political operator. Maneuvering and advantage."
    },
    kyber: {
      title: "Kyber",
      primaryVoice: "j0_n1",
      secondaryVoice: "miraj",
      corruptionAxis: null,
      description: "Medic. Pragmatic healing and triage."
    }
  },

  // ========================================
  // GET ALL MENTORS (Helper)
  // ========================================
  getAllMentors() {
    return {
      ...Object.entries(this.force_mentors).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
      ...Object.entries(this.sith_mentors).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
      ...Object.entries(this.military_mentors).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
      ...Object.entries(this.scout_mentors).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
      ...Object.entries(this.criminal_mentors).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
      ...Object.entries(this.social_mentors).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
    };
  },

  /**
   * Get a mentor's synthesis config by ID
   */
  getMentorConfig(mentorId) {
    const allMentors = this.getAllMentors();
    return allMentors[mentorId] || null;
  },

  /**
   * Check if a mentor is a core mentor
   */
  isCoreMentor(mentorId) {
    return this.core.includes(mentorId);
  },

  /**
   * Get mentors by corruption axis
   */
  getMentorsByAxis(axis) {
    const allMentors = this.getAllMentors();
    return Object.entries(allMentors)
      .filter(([_, config]) => config.corruptionAxis === axis)
      .map(([id, config]) => ({ id, ...config }));
  },

  /**
   * Get mentors by primary voice
   */
  getMentorsByPrimaryVoice(voiceId) {
    const allMentors = this.getAllMentors();
    return Object.entries(allMentors)
      .filter(([_, config]) => config.primaryVoice === voiceId)
      .map(([id, config]) => ({ id, ...config }));
  }
};
