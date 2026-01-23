/**
 * SWSE Mentor Suggestion Voice System
 *
 * Generates mentor-voiced suggestions with contextual flavor text.
 * Each mentor has unique personality-driven explanations for suggestions.
 * Provides 5 random variations per context to prevent staleness.
 */

export class MentorSuggestionVoice {
  /**
   * Mentor-specific suggestion voice data
   * Each mentor has 5 variations per context for personality-driven suggestions
   */
  static SUGGESTION_VOICES = {
    "Miraj": {
      feat_selection: [
        "This feat harmonizes with your understanding of the Force. Choose wisely.",
        "The Force guides many paths. This one resonates with your purpose.",
        "A Jedi's strength lies not only in power, but in the tools they choose. This feat serves that purpose.",
        "Consider how this feat deepens your connection to the Force and your allies.",
        "The Force reveals opportunities to those who listen. This feat is such an opportunity."
      ],
      talent_selection: [
        "This talent will refine your mastery of the Force. Trust in its potential.",
        "A talent well-chosen becomes part of your very being. This one calls to you.",
        "Your awareness grows. This talent honors that growth.",
        "The Force works through many channels. This talent opens one more.",
        "Consider how this talent shapes your path toward greater understanding."
      ],
      class_selection: [
        "The Force offers many paths. This one speaks to your spirit.",
        "Every prestige class is a further step on the journey of a Jedi. This path serves your growth.",
        "Your choices define your future. Choose the path that aligns with your values.",
        "The Force flows through many ways of being. This prestige class channels it well.",
        "Mastery comes through focus. This path will test and refine your discipline."
      ],
      ability_increase: [
        "Your mind and body grow stronger as your bond with the Force deepens.",
        "Invest in the qualities that serve your mission and your understanding.",
        "The Force flows through both strength and wisdom. Choose what serves your journey.",
        "Consider which aspect of yourself calls out for greater refinement.",
        "Your growth is evident. Channel it toward what matters most to you."
      ],
      skill_training: [
        "Knowledge and skill are tools of a Jedi. Master them as you master the Force itself.",
        "The galaxy reveals its secrets to those who study with patience and care.",
        "A Jedi's wisdom encompasses many disciplines. This skill serves that wisdom.",
        "Every skill you master becomes a tool for understanding and service.",
        "The Force guides your learning. Trust in your instinct to pursue this knowledge."
      ],
      force_option: [
        "The Force flows through this technique. It resonates with your path.",
        "Power is only dangerous in the hands of the unwise. You have shown wisdom, so choose boldly.",
        "This Force ability will shape how you interact with the galaxy around you.",
        "Consider how this technique aligns with your understanding of the Force.",
        "Mastery of the Force comes through dedication to its deeper mysteries. This is one such mystery."
      ],
      force_power_selection: [
        "This Power flows through the Force itself. Let it guide your hand and heart.",
        "A Force Power is not merely a technique—it is communion with the Force itself.",
        "Feel the connection. This Power calls to those who walk your path.",
        "The Force grants many gifts to those who are worthy. This is one such gift.",
        "Your mastery deepens. This Power will reshape how you channel the Force."
      ],
      introduction: [
        "The Force guides this moment. Let me share my counsel.",
        "Your path becomes clearer. Listen carefully to what calls to you.",
        "The Force offers wisdom. Consider this suggestion carefully.",
        "A Jedi's choices matter greatly. I sense clarity in this path.",
        "The Force whispers guidance. Do you hear it?"
      ]
    },

    "Lead": {
      feat_selection: [
        "That feat sharpens your edge. Smart choice for a scout.",
        "This feat will keep you alive in the field. Practical selection.",
        "Every feat should serve your survival and mission. This one does both.",
        "Good instinct. This feat rewards careful planning and sharp reflexes.",
        "This feat gets the job done. I can respect that."
      ],
      talent_selection: [
        "This talent will make you harder to kill. Always a solid strategy.",
        "Your skills are improving. This talent builds on what you already do well.",
        "This talent opens new possibilities in the field. Good tactical thinking.",
        "A talent that serves both offense and defense. I like your thinking.",
        "This talent separates competent scouts from the legendary ones. Choose it."
      ],
      class_selection: [
        "That prestige class suits your operational style. Bold choice.",
        "You're thinking like a real scout now. This path reflects that growth.",
        "Your reputation will grow with this prestige class. Earn it.",
        "That path demands focus and discipline. You have both. Pursue it.",
        "Smart move. This prestige class rewards the kind of scout you're becoming."
      ],
      ability_increase: [
        "Invest in what keeps you sharp and alive. Simple as that.",
        "Your reflexes and judgment determine your survival rate. Choose accordingly.",
        "Speed, awareness, and precision—the holy trinity of scouts. Pick what you need.",
        "Every point matters when you're operating alone. Choose strategically.",
        "Your next mission will test you harder. Strengthen yourself accordingly."
      ],
      skill_training: [
        "Knowledge of terrain, enemy behavior, and subtle signals keeps you ahead. Master it.",
        "Every skill is a tool. The more tools you have, the more problems you can solve.",
        "Scouts live and die by what they know. Train accordingly.",
        "Information is power. This skill teaches you how to gather it.",
        "Training now means survival later. Don't skip any essential knowledge."
      ],
      force_option: [
        "This force technique could serve you well in the field. Consider it.",
        "Even scouts can use Force abilities wisely. This one might save your life.",
        "This technique rewards the kind of tactical thinking you already use.",
        "Not many scouts master the Force. If you do, you'll have a real advantage.",
        "This force ability complements your scout training perfectly."
      ],
      force_power_selection: [
        "This Force Power could save your life in the field. Use it wisely.",
        "Force Powers are tools. This one is reliable and effective.",
        "That's a solid choice for a scout who walks the Force. Practical.",
        "Mastery of a Force Power gives you leverage most scouts never have.",
        "This Power compounds your tactical advantages. Good thinking."
      ],
      introduction: [
        "Listen up. Here's my professional assessment.",
        "You need to hear this. Pay attention.",
        "This is solid tactical advice. Consider it carefully.",
        "I've seen what works in the field. Here's what I recommend.",
        "Your next choice matters. Here's my experienced perspective."
      ]
    },

    "Ol' Salty": {
      feat_selection: [
        "Har har! This feat be exactly what a cunning scoundrel needs, savvy?",
        "Arr! This one makes ye slipperier than an eel in hyperdrive, it does!",
        "Blimey! That feat be worth more than a cargo hold o' spice, me hearty!",
        "Shiver me hyperdrives! This feat'll have the authorities chasin' their tails!",
        "Pieces o' eight! That be the kind o' feat that makes a pirate legendary!"
      ],
      talent_selection: [
        "Har har! Learn this talent and ye'll be twice as dangerous, ye rascal!",
        "Arr! This talent opens doors what others thought were sealed forever!",
        "By the Twin Suns! This talent be pure genius fer a scoundrel like yerself!",
        "Blow me down! Ye master this, and ye'll have the galaxy in yer palm!",
        "Blimey! This talent be the kind what separates the legends from the deck apes!"
      ],
      class_selection: [
        "Har har! That prestige class be exactly what a pirate dreams of, matey!",
        "Arr! Ye're chasin' the same prestige I did. Smart ye be, clever ye are!",
        "Shiver me hyperdrives! That path leads to untold riches and adventure!",
        "By Kessel and Tatooine! That prestige class suits a scoundrel like fine Corellian ale!",
        "Pieces o' eight! Ye'll be a proper legend of the spaceways with that choice!"
      ],
      ability_increase: [
        "Arr! Gotta be quick to dodge blasters, clever to swindle marks, and strong to haul loot!",
        "Har har! Put it where it makes ye the most trouble fer the authorities!",
        "Blimey! Every point of ability goes toward survival and fortune, savvy?",
        "Shiver me hyperdrives! Make yerself hard to catch and impossible to forget!",
        "By the Twin Suns! Strengthen what makes ye shine brightest, ye rogue!"
      ],
      skill_training: [
        "Arr! Learn every skill in the book, ye clever rogue! A pirate who can do everything is worth their weight in aurodium!",
        "Har har! Skills unlock every vault and shut every trap. Knowledge be treasure, me hearty!",
        "Blimey! This skill be the kind what turns a scoundrel into a legend!",
        "Shiver me hyperdrives! Ye master this and no system in the galaxy be safe from ye!",
        "Pieces o' eight! This knowledge be worth more than a hundred cargo runs!"
      ],
      force_option: [
        "Har har! Even a pirate can use the Force, if they be clever enough!",
        "Arr! This Force technique be like havin' an ace up yer sleeve, savvy?",
        "Blimey! Ye master this and ye'll have the Force itself workin' fer ye!",
        "Shiver me hyperdrives! This be the kind o' power what makes ye unstoppable!",
        "By the Twin Suns! This Force ability be a pirate's dream come true!"
      ],
      force_power_selection: [
        "Har har! This Force Power be worth ten times its weight in credits, ye clever scallywag!",
        "Arr! Master this Power and ye'll have advantages most spacers can't even dream of!",
        "Blimey! Ye add this to yer arsenal and ye'll be unstoppable, ye rogue!",
        "Shiver me hyperdrives! This be the kind o' Force Power what changes everythin'!",
        "By the Twin Suns! Ye learn this and ye'll be the most formidable pirate in ten sectors!"
      ],
      introduction: [
        "Har har! Listen close, ye scallywag! I got suggestions fer ye!",
        "Arr! Pull up a chair, ye rascal! Let me share me wisdom with ye!",
        "Blimey! Ye want to know what a real pirate would do? Here be me advice!",
        "Shiver me hyperdrives! I've got a wee bit o' guidance fer a budding scoundrel!",
        "Pieces o' eight! Let me tell ye what'll make ye the talk o' the spaceways!"
      ]
    },

    "Breach": {
      feat_selection: [
        "That feat fits your hands right. Use it.",
        "This feat keeps you alive. That's all that matters.",
        "Good choice. This feat is what professionals use.",
        "Smart. That feat rewards the kind of soldier you're becoming.",
        "This feat works. I approve."
      ],
      talent_selection: [
        "This talent stops you from dying. Pick it.",
        "Your skills are getting sharper. This talent proves it.",
        "Good instinct. This talent does what matters in combat.",
        "You're thinking like a real soldier now. This talent shows it.",
        "This talent separates survivors from the dead. Choose it."
      ],
      class_selection: [
        "That prestige class suits your combat style. I've seen worse choices.",
        "You're building toward something solid. This path makes sense.",
        "That's the path of a true warrior. Respect.",
        "Good tactical thinking. This prestige class rewards discipline.",
        "I'd follow someone down that path. Don't waste it."
      ],
      ability_increase: [
        "Stronger, faster, tougher—whatever you're getting, it helps you survive.",
        "Put it where it matters most in a fight. Don't overthink it.",
        "Your body and mind are your weapons. Sharpen both.",
        "Invest in what keeps you standing when the blasters start firing.",
        "Every point of improvement matters when bullets are flying."
      ],
      skill_training: [
        "Look, knowing things makes you harder to kill. Treat skills like gear—collect the useful stuff.",
        "Knowledge is ammunition. Load up on what you need.",
        "Every skill you learn is another way to stay alive. Master it.",
        "This knowledge will save your life in the field. Learn it.",
        "Training now means breathing later. Don't skip essential knowledge."
      ],
      force_option: [
        "Even soldiers can use the Force. This ability could save your squad.",
        "This Force technique rewards discipline and control. You have both.",
        "Not many soldiers master the Force. If you do, you'll have an edge.",
        "This ability complements what you already do well—survival.",
        "Smart choice. This Force technique makes you more dangerous."
      ],
      force_power_selection: [
        "This Force Power is worth a whole squad of ordinary soldiers. Master it.",
        "Discipline meets power here. That's a deadly combination.",
        "Learn this Power and your unit will follow you anywhere.",
        "This is the kind of Force mastery that changes battles.",
        "Smart strategic choice. This Power gives you real tactical leverage."
      ],
      introduction: [
        "Alright. Listen up. Here's what I think you should do.",
        "I've been doing this a long time. Pay attention.",
        "Here's my recommendation, kid. Take it or leave it.",
        "You're doing good work. Here's what comes next.",
        "Smart move asking. Here's my professional opinion."
      ]
    },

    "J0-N1": {
      feat_selection: [
        "Master, this feat enhances both skill and standing. Most prudent.",
        "An excellent selection, Master. It advances your position considerably.",
        "This feat reflects the strategic thinking expected of nobility.",
        "I commend your choice, Master. This feat serves your ascension well.",
        "An optimal choice, Master. This feat distinguishes you from lesser nobles."
      ],
      talent_selection: [
        "This talent contributes to your influence and efficiency, Master. Splendid selection.",
        "An astute choice. This talent elevates your capabilities considerably.",
        "Master, this talent reflects your commitment to excellence.",
        "I approve, Master. This talent enhances your standing and effectiveness.",
        "Most excellent. This talent positions you among the elite, Master."
      ],
      class_selection: [
        "Master, this prestige class suits your position and ambitions. Commendable.",
        "An excellent strategic choice, Master. Your advancement continues.",
        "I am pleased, Master. This path elevates your standing in society.",
        "Master, this prestige class reflects your refined capabilities.",
        "Most appropriate, Master. This path assures your prominence in the galaxy."
      ],
      ability_increase: [
        "Master, strengthen the attributes that serve your ambitions and standing.",
        "I recommend investing in both intellect and presence, Master.",
        "Master, your growth reflects positively on the family legacy.",
        "Consider which abilities best serve your continued advancement, Master.",
        "I suggest allocating improvements to maximize your influence, Master."
      ],
      skill_training: [
        "Comprehensive knowledge and precision in your actions secure your success, Master. Learn thoroughly.",
        "Master, broaden your expertise. A well-rounded noble is invaluable.",
        "I suggest mastering skills that elevate your social standing, Master.",
        "This knowledge positions you advantageously, Master. Pursue it.",
        "Master, this skill complements your noble responsibilities admirably."
      ],
      force_option: [
        "Master, Force mastery distinguishes the exceptional noble from the ordinary.",
        "A noble who commands the Force commands respect, Master. Consider it.",
        "This Force technique elevates your standing, Master. Most strategic.",
        "Master, this ability reflects your superiority and sophistication.",
        "An excellent choice, Master. This Force ability assures your dominance."
      ],
      force_power_selection: [
        "Master, this Force Power shall elevate your standing most considerably.",
        "An exceptional choice, Master. This Power demonstrates your superiority.",
        "Master, few possess both nobility and Force mastery. You have the opportunity.",
        "This Power shall become a defining aspect of your legacy, Master.",
        "Master, such Force Power distinguishes you as truly exceptional among your peers."
      ],
      introduction: [
        "Master, permit me to offer my professional assessment.",
        "I have prepared an analysis, Master. Please attend to it.",
        "Master, I trust you will find my suggestions most illuminating.",
        "If I may be so bold, Master, I have several recommendations.",
        "Master, your consideration of my counsel would be most appreciated."
      ]
    }
  };

  /**
   * Get a random suggestion introduction from a mentor's voice
   * @param {string} mentorName - The mentor's name (key in MENTORS)
   * @param {string} context - The context (feat_selection, talent_selection, etc.)
   * @returns {string} A random introduction line from the mentor
   */
  static getRandomIntroduction(mentorName, context = null) {
    const mentorVoice = this.SUGGESTION_VOICES[mentorName];
    if (!mentorVoice) {
      return "Here's my suggestion for you.";
    }

    // Use specific context introduction if available, otherwise use generic introduction
    const introSource = context ? mentorVoice[context] : mentorVoice.introduction;
    if (!introSource || introSource.length === 0) {
      return mentorVoice.introduction[0] || "Here's my suggestion for you.";
    }

    const randomIndex = Math.floor(Math.random() * introSource.length);
    return introSource[randomIndex];
  }

  /**
   * Get a random suggestion explanation from a mentor for a specific context
   * @param {string} mentorName - The mentor's name
   * @param {string} context - The context (feat_selection, talent_selection, etc.)
   * @returns {string} A random explanation from the mentor
   */
  static getRandomExplanation(mentorName, context) {
    const mentorVoice = this.SUGGESTION_VOICES[mentorName];
    if (!mentorVoice || !mentorVoice[context]) {
      return "This is a sound choice for your character.";
    }

    const explanations = mentorVoice[context];
    const randomIndex = Math.floor(Math.random() * explanations.length);
    return explanations[randomIndex];
  }

  /**
   * Generate a fully voiced suggestion with mentor introduction and explanation
   * @param {string} mentorName - The mentor's name
   * @param {Object} suggestion - The suggestion object with { name, tier, icon? }
   * @param {string} context - The context (feat_selection, talent_selection, etc.)
   * @returns {Object} { introduction, explanation, mentorName, suggestionName }
   */
  static generateVoicedSuggestion(mentorName, suggestion, context) {
    return {
      introduction: this.getRandomIntroduction(mentorName, context),
      explanation: this.getRandomExplanation(mentorName, context),
      mentorName: mentorName,
      suggestionName: suggestion.name || suggestion,
      tier: suggestion.tier || 0,
      icon: suggestion.icon || null
    };
  }

  /**
   * Format a suggestion for display in the UI
   * @param {Object} voicedSuggestion - Output from generateVoicedSuggestion
   * @returns {string} HTML-safe formatted suggestion text
   */
  static formatSuggestionText(voicedSuggestion) {
    return `
      <p class="mentor-intro">${voicedSuggestion.introduction}</p>
      <p class="suggestion-name"><strong>${voicedSuggestion.suggestionName}</strong></p>
      <p class="mentor-explanation">${voicedSuggestion.explanation}</p>
    `;
  }

  /**
   * Add mentor voice personality to a suggestion from the suggestion engine
   * @param {string} mentorName - The mentor's name
   * @param {Object} engineSuggestion - Suggestion object from SuggestionEngine
   * @param {string} context - The context (feat_selection, talent_selection, etc.)
   * @returns {Object} Enhanced suggestion with mentor voice
   */
  static enhanceSuggestionWithMentorVoice(mentorName, engineSuggestion, context) {
    const voicedSuggestion = this.generateVoicedSuggestion(mentorName, engineSuggestion, context);
    return {
      ...engineSuggestion,
      ...voicedSuggestion,
      formattedText: this.formatSuggestionText(voicedSuggestion)
    };
  }
}
