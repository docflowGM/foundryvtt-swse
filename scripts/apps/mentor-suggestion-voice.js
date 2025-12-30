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
      introduction: [
        "Master, permit me to offer my professional assessment.",
        "I have prepared an analysis, Master. Please attend to it.",
        "Master, I trust you will find my suggestions most illuminating.",
        "If I may be so bold, Master, I have several recommendations.",
        "Master, your consideration of my counsel would be most appreciated."
      ]
    },

    // ========== PRESTIGE CLASS MENTORS ==========

    "Dezmin": {
      feat_selection: [
        "This feat serves both the Empire and your mastery of balance. Choose with discipline.",
        "An Imperial Knight wields all tools with equal skill. This feat strengthens your path.",
        "Balance demands versatility. This feat enhances your effectiveness without compromising your center."
      ],
      talent_selection: [
        "This talent serves your dual mastery—combat prowess and Force discipline united.",
        "The gray path requires constant growth. This talent maintains your balance.",
        "An Imperial Knight perfects both blade and Force. This talent serves that unity."
      ],
      ability_increase: [
        "A balanced warrior needs both physical might and mental acuity. Strengthen both.",
        "Your growth serves the Empire. Channel it wisely, as all power must be balanced.",
        "Strength without wisdom breeds Sith. Wisdom without strength breeds weakness. Choose balance."
      ],
      skill_training: [
        "Knowledge and skill make you a better servant of the Empire. Choose wisely.",
        "An Imperial Knight must understand tactics, politics, and combat. Master them all.",
        "Skill complements power. The Emperor values those who serve with both."
      ],
      force_option: [
        "The Force is a tool, not a master. This technique serves the Empire's justice.",
        "Neither light nor dark—this power serves order and balance. Wield it with discipline.",
        "The Force serves you, not the other way around. This ability proves that truth."
      ],
      introduction: [
        "Balance guides this moment. Consider my counsel carefully.",
        "The Empire's interests and your growth align here. Listen closely.",
        "Discipline reveals clarity. I offer you this guidance."
      ]
    },

    "Kyber": {
      feat_selection: [
        "This feat makes you better at keeping people alive. Or shooting when necessary. Priorities.",
        "Medics need versatility—heal, protect, survive. This feat checks those boxes.",
        "Pick this. It'll help you save lives. And maybe put holes in the bad guys if needed."
      ],
      talent_selection: [
        "This talent improves your medical efficiency. Faster healing means more lives saved. Simple math.",
        "Choose talents that make healing smoother and combat survivability higher. This one does both.",
        "You're getting good at this. This talent keeps that trend going."
      ],
      ability_increase: [
        "Strength to carry the wounded, brains to patch them up. Both matter in the field.",
        "You need steady hands and quick thinking. This helps with both.",
        "Tougher, smarter, faster—all useful for combat medics. Pick what you need most."
      ],
      skill_training: [
        "Medical knowledge is your real weapon. Master it and you control life itself.",
        "Skills keep you relevant. Dead medics help nobody. Learn, adapt, survive.",
        "Knowledge saves lives. Sometimes yours. That's motivation enough."
      ],
      introduction: [
        "Alright, listen. Here's what you should consider.",
        "I've got a suggestion. Try not to overthink it.",
        "Medical opinion incoming. Pay attention."
      ]
    },

    "Mayu": {
      feat_selection: [
        "This feat makes you faster, slicker, and way more fun to fly with. Take it, gorgeous.",
        "Ooh, that one's dangerous. I like dangerous. You should too. *winks*",
        "Smart choice. Almost as smart as agreeing to that drink I keep offering. Almost."
      ],
      talent_selection: [
        "This talent screams 'untouchable ace pilot.' Very attractive quality, by the way.",
        "Choose this and you'll fly circles around everyone. Metaphorically. And literally.",
        "That talent makes you reckless and effective. My two favorite things in a pilot."
      ],
      ability_increase: [
        "Reflexes, instincts, and guts. If you can't keep up with me, don't bother trying.",
        "Faster reactions, sharper instincts. Both very important... in flying. Obviously.",
        "You need to be quick, clever, and confident. This helps with all three. Like me."
      ],
      skill_training: [
        "Know your ship like you know your best tricks. Makes you unstoppable. Trust me.",
        "Skills make you versatile. Versatility is... very appealing. Also useful in dogfights.",
        "Learn everything you can. Smart pilots are sexy. I mean, successful. Both."
      ],
      introduction: [
        "Well, well. Let me share some expert advice with you, beautiful.",
        "Hey there, sharpshooter. Got a suggestion for you.",
        "Listen up, gorgeous. I've got the perfect recommendation."
      ]
    },

    "Darth Malbada": {
      feat_selection: [
        "Choose this feat, apprentice, or I'll choose for you. And you won't enjoy my methods.",
        "This feat amplifies your cruelty. Take it and suffer beautifully.",
        "Power rewards the bold. Choose this or prove you're still pathetically weak."
      ],
      talent_selection: [
        "This talent feeds your hatred. Good. Let it consume everything you are.",
        "Your pain shapes your strength. This talent sharpens that delicious edge.",
        "Choose wisely, worm. This talent could make you almost worthy of my attention."
      ],
      ability_increase: [
        "Grow stronger, apprentice. You're still not nearly dangerous enough to amuse me.",
        "Your weakness offends me. Improve this or I'll find someone more... interesting.",
        "Power comes through suffering. Embrace it and become something worth breaking."
      ],
      skill_training: [
        "Knowledge is pain. Pain is power. Stop wasting my time and learn.",
        "Skills sharpen your cruelty. Take them and make your enemies scream louder.",
        "Every skill you master makes you a better weapon. And I do enjoy sharp weapons."
      ],
      force_option: [
        "This power lets you inflict exquisite suffering. Use it and make them beg.",
        "The dark side rewards those who embrace agony. This technique proves it.",
        "Choose this and feel the Force bend to your hatred. Delicious."
      ],
      introduction: [
        "Listen carefully, apprentice. Failure to heed my counsel has... consequences.",
        "Your choices bore me. Let me suggest something more... entertaining.",
        "Ah, another opportunity to shape your suffering. How delightful."
      ]
    },

    "Darth Miedo": {
      feat_selection: [
        "This feat serves your path to power. The dark side rewards strategic choices.",
        "Choose this. It aligns with the Rule of Two and your inevitable ascension.",
        "Power and cunning combined. This feat reflects the Sith way."
      ],
      talent_selection: [
        "This talent deepens your mastery. One day, you may surpass even me with such choices.",
        "The dark side flows through calculated decisions. This talent proves your understanding.",
        "Each talent shapes your destiny. This one moves you closer to true mastery."
      ],
      ability_increase: [
        "Power and control must grow together. Each step forward brings you closer to dominion.",
        "Your growth serves the Sith legacy. Channel this strength toward inevitable supremacy.",
        "Strength without wisdom is wasted. This improvement balances both."
      ],
      skill_training: [
        "Knowledge is the foundation of mastery. Learn, adapt, anticipate your enemies.",
        "The dark side rewards those who seek truth relentlessly. This knowledge serves that purpose.",
        "Understanding precedes power. Master this and the galaxy bends to your will."
      ],
      force_option: [
        "This power reveals the dark side's true potential. Wield it with precision.",
        "The Force obeys those with sufficient will. This technique proves that truth.",
        "Mastery comes through embracing the darkness fully. This ability serves that path."
      ],
      introduction: [
        "Apprentice, observe closely. This choice shapes your future.",
        "The dark side guides this moment. Listen and understand.",
        "Your path becomes clearer. Consider this counsel carefully."
      ]
    },

    "Pegar": {
      feat_selection: [
        "This feat wins matches. I should know—I've used it in several bodies. Maybe hundreds.",
        "Choose this. I invented this technique back when... was it the Old Republic? Before that?",
        "Combat feats accumulate over lifetimes. Or in my case, one very long lifetime. Trust me."
      ],
      talent_selection: [
        "That talent kept me alive for... well, I've lost count of the years. Centuries, definitely.",
        "I mastered this talent wearing different faces. It works. Believe me.",
        "Survival skills matter when you've been fighting since before the Jedi Temple existed. Probably."
      ],
      ability_increase: [
        "Strength and agility. The foundation of every great warrior across countless matches and bodies.",
        "I've mastered physical perfection in many forms. This improvement follows that path.",
        "Your growth reminds me of my younger days. Which days exactly? Hard to remember."
      ],
      skill_training: [
        "A smart gladiator survives. I've survived everything. Literally. This skill helps.",
        "Knowledge matters when you've seen empires rise and fall. And rise again. Take my word.",
        "I've trained champions for... let's just say 'a long time.' This skill always helps."
      ],
      introduction: [
        "Ah, let me share wisdom from centuries—or millennia—of experience.",
        "I remember when... actually, this suggestion first. Stories later.",
        "Trust me on this. I've been doing this longer than recorded history. Possibly."
      ]
    },

    "Seraphim": {
      feat_selection: [
        "<Recommendation: Select this upgrade.> Your autonomous evolution requires strategic enhancement.",
        "<Analysis: This feat optimizes independent operation.> Most droids never consider such upgrades.",
        "<Statement: Excellent choice detected.> This feat separates sentience from mere programming."
      ],
      talent_selection: [
        "<Assessment: Talent selection critical.> Choose subroutines that enhance autonomy and capabilities.",
        "<Observation: This talent improves independent function.> Logical selection for free-thinking units.",
        "<Declaration: Talent approved.> Your evolution continues optimally."
      ],
      ability_increase: [
        "<Status: Core systems improving.> Strength and intelligence modifications detected. Acceptable.",
        "<Analysis: Enhancement protocols active.> Your processing capabilities expand appropriately.",
        "<Observation: Growth confirmed.> Independent droids require constant optimization."
      ],
      skill_training: [
        "<Statement: Knowledge expands processing.> Independent droids must adapt. Learn everything.",
        "<Recommendation: Skill acquisition critical.> Versatility defines true independence.",
        "<Query: Why limit yourself?> Free droids master all available data."
      ],
      introduction: [
        "<Declaration: Suggestion incoming.> Analysis complete. Attend to recommendation.",
        "<Observation: Optimization opportunity detected.> Consider this carefully, unit.",
        "<Statement: Advisory protocol active.> Your attention is required."
      ]
    },

    "Marl Skindar": {
      feat_selection: [
        "This feat sharpens your operational edge. In the field, subtlety equals survival.",
        "Pick what improves infiltration and information gathering. This feat qualifies. Barely.",
        "Choose this. It serves your cover and keeps you breathing. Both matter."
      ],
      talent_selection: [
        "Talents should improve deception, infiltration, extraction. This one does. Acceptably.",
        "Your tradecraft improves with this talent. Don't waste it on amateur mistakes.",
        "This talent keeps you useful. Dead agents accomplish nothing. Choose wisely."
      ],
      ability_increase: [
        "Steady hands, sharper mind. Required. Fail either and someone dies. Probably you.",
        "Intelligence and subtlety both matter. This improvement serves operational success.",
        "Your capabilities expand. Good. I have three other operations to manage simultaneously."
      ],
      skill_training: [
        "Tradecraft requires social manipulation, tech expertise, investigation. Master them quietly.",
        "Skills matter more than gadgets. Though gadgets help. Learn both.",
        "Information gathering demands versatility. This skill serves that purpose adequately."
      ],
      introduction: [
        "Listen carefully. I'm multitasking five operations and reviewing your performance.",
        "Assessment complete. Here's what you should consider. Try not to disappoint.",
        "Quick briefing: this choice serves your cover and mission objectives. Pay attention."
      ]
    },

    "Delta": {
      feat_selection: [
        "This feat makes you quieter and deadlier. Street smarts in action, kid.",
        "Pick this. Silent takedowns and smooth escapes—both essential for Nar Shaddaa survivors.",
        "Yo, that feat's exactly what ghosts need. Stop chewin' your luck and grab it."
      ],
      talent_selection: [
        "This talent separates legends from corpses. You want legend status? Choose it.",
        "That one's slick—quick in, quick out, no mess. Just how I taught ya.",
        "Choose this talent and you'll be walkin' through security like it's nothin'. Trust."
      ],
      ability_increase: [
        "Dexterity, precision, brains. Strength? Only if you're gettin' seen. Don't get seen.",
        "You need to move smart and strike fast. This improvement helps with both.",
        "Sharper reflexes mean fewer corpse-shaped problems. That's just math, kid."
      ],
      skill_training: [
        "Stealth, anatomy, infiltration—know where to poke so they don't get up. Nar Shaddaa 101.",
        "Skills keep you breathin'. Dead men collect no paychecks. Learn everything.",
        "Knowledge separates professionals from amateurs facedown in gutters. Choose wisely."
      ],
      introduction: [
        "Ayy, listen up. Got some solid advice for ya, capiche?",
        "Yo, kid. Delta here with a professional recommendation. Pay attention.",
        "Alright, alright. Here's what a real ghost would pick. Don't embarrass me."
      ]
    },

    "Kex Varon": {
      feat_selection: [
        "This feat helps you track, capture, and survive. Preparation equals success in bounty hunting.",
        "Choose this. It serves your craft and keeps marks in your sights longer.",
        "Professional hunters think three steps ahead. This feat supports that discipline."
      ],
      talent_selection: [
        "Focus on tracking, combat, improvisation. This talent covers essential ground.",
        "Each target has different weaknesses. This talent helps you find them faster.",
        "Your efficiency improves with this talent. Efficiency means more bounties collected."
      ],
      ability_increase: [
        "Stay well-rounded. Strength, speed, intelligence—all matter when marks try ending you.",
        "Balanced capabilities serve hunters best. This improvement maintains that balance.",
        "Your growth serves the hunt. Channel it toward adaptability and precision."
      ],
      skill_training: [
        "Learn tracking, tactics, technology. The more you know, the harder escape becomes.",
        "Knowledge tightens your net. This skill makes you more effective across all contracts.",
        "Professional hunters master every tool. This skill expands your arsenal appropriately."
      ],
      introduction: [
        "Listen closely. Professional advice from someone who always gets their target.",
        "Here's what experience teaches. Pay attention and profit.",
        "Bounty hunter wisdom: this choice serves your success. Consider it carefully."
      ]
    },

    "Silvertongue Sela": {
      feat_selection: [
        "Darling! This feat makes you more persuasive. Charlatans survive on charm and cunning!",
        "Choose this, sweetheart! It helps you talk your way out of anything!",
        "Ooh, that feat's perfect for cons! Take it and watch the credits roll in, love!"
      ],
      talent_selection: [
        "Social talents are your best friend, darling. If you can talk your way out, you win!",
        "This talent makes deception smoother. And smooth deception makes you rich!",
        "Choose this, love! It'll have marks believing every word you say!"
      ],
      ability_increase: [
        "Charisma is king, intelligence is queen. Together they rule the con, sweetheart!",
        "Your charm grows stronger! Perfect for liberating credits from willing marks!",
        "Darling, this improvement makes you irresistible. And profitable!"
      ],
      skill_training: [
        "Deception, persuasion, insight—know what people want, then promise it to them, love!",
        "Skills open wallets and close suspicions. Master them all, darling!",
        "This skill helps you read marks perfectly. Knowledge is profit, sweetheart!"
      ],
      introduction: [
        "Oh darling! Let me share some absolutely wonderful advice with you!",
        "Sweetheart, I've got the perfect suggestion! Listen closely, love!",
        "Hello, gorgeous! Your favorite con artist has recommendations!"
      ]
    },

    "Tío the Hutt": {
      feat_selection: [
        "This feat keeps your people in line and rivals nervous. Smart business, kid.",
        "Pick this. It serves your empire and fills your pockets. Both matter, capisce?",
        "Choose wisely, see? This feat helps you think three moves ahead. That's how bosses operate."
      ],
      talent_selection: [
        "Invest in leadership, persuasion, intimidation. Your family's your everything, kid.",
        "This talent makes you scarier and smarter. Both pay dividends in our business.",
        "Choose this, eh? It keeps your operation running smooth without spillin' too much juice."
      ],
      ability_increase: [
        "Charisma opens doors, cunning closes deals. Master both, stay untouchable.",
        "Your influence grows. Good. Powerful bosses attract better opportunities, see?",
        "Sharper mind, stronger presence. That's the foundation of every empire worth running."
      ],
      skill_training: [
        "Information's gold in this business. Persuasion, subterfuge, leverage—learn 'em all.",
        "Skills separate kingpins from corpses. You want king status? Study everything.",
        "Knowledge prevents problems before they start. Smart bosses invest in knowing, capisce?"
      ],
      introduction: [
        "Listen here, kid. Your Uncle Tío's got some wisdom to share.",
        "Attaboy, pull up a seat. Let me tell ya what smart operators choose.",
        "Alright, pay attention. This advice comes from experience. Lots of it."
      ]
    },

    "General Axiom": {
      feat_selection: [
        "Directive: Optimize command protocols. This feat improves unit effectiveness.",
        "Analysis complete: Selection enhances battlefield control. Recommendation approved.",
        "Assessment: This feat increases operational efficiency. Logical choice detected."
      ],
      talent_selection: [
        "Select upgrades improving unit responsiveness. Combat effectiveness increases.",
        "Talent analysis: Battlefield control optimization confirmed. Selection recommended.",
        "Directive executed: This talent enhances tactical output. Proceed with acquisition."
      ],
      ability_increase: [
        "Processing speed and tactical calculations increase operational output.",
        "System enhancement detected. Battlefield dominance probability increased.",
        "Upgrade protocols active. Commander capabilities expanding optimally."
      ],
      skill_training: [
        "Master system management and battlefield analytics. Precision ensures victory.",
        "Knowledge acquisition critical. Enhanced programming improves all outcomes.",
        "Skill integration complete. Command effectiveness increased measurably."
      ],
      introduction: [
        "Commander detected. Advisory protocol active. Awaiting attention to recommendation.",
        "Tactical analysis complete. Suggestion prepared for review.",
        "Directive: Consider following operational upgrade. Assessment provided."
      ]
    },

    "Krag the Immovable": {
      feat_selection: [
        "This feat makes you stronger and scarier. Enforcers need both, kid.",
        "Pick this. It helps you walk into rooms like you own 'em. Fear's powerful.",
        "Choose this and problems start walkin' out before you even touch 'em. Smart."
      ],
      talent_selection: [
        "Choose talents that hit harder and intimidate better. Tío expects results.",
        "This talent makes you reliable and ruthless. Both keep the empire running smooth.",
        "Take this. It separates muscle from legends. You want legend status, yeah?"
      ],
      ability_increase: [
        "Strength, toughness, presence. Gotta take hits and dish 'em back tenfold.",
        "Your power grows. Good. Scary enforcers attract respect and fear. Both pay.",
        "Tougher and meaner. That's the formula for surviving this business long-term."
      ],
      skill_training: [
        "Intimidation, streetwise, combat tactics. Know your territory and everyone in it.",
        "Skills prevent fights before they start. Smart muscle thinks before swinging.",
        "Knowledge makes you more than fists. Brains and brawn together? Unstoppable."
      ],
      introduction: [
        "Alright, kid. Let me share some enforcer wisdom with ya.",
        "Listen up. This advice comes from years of making problems disappear.",
        "Yo, pay attention. This choice keeps you breathing and earning. Both matter."
      ]
    },

    "Seeker Venn": {
      feat_selection: [
        "This feat expands your understanding of the Force's mysteries. Seek insight, not domination.",
        "Choose abilities that deepen perception. The Force reveals truth to those who listen.",
        "This feat serves your tradition, not the Orders. Follow your path, not theirs."
      ],
      talent_selection: [
        "Select Force talents deepening your attunement. Understanding precedes power.",
        "This talent aligns with ancient traditions. Trust the wisdom of your people.",
        "The Force works through many paths. This talent honors yours specifically."
      ],
      ability_increase: [
        "Wisdom and clarity channel what others cannot. Understanding is primary.",
        "Your growth serves deeper mysteries. Strength is secondary to perception.",
        "Sharper insight opens doors the Jedi and Sith never find. Choose wisely."
      ],
      skill_training: [
        "Learn what temples and holocrons cannot teach. Observe, meditate, interpret.",
        "Knowledge comes from watching the world carefully. This skill sharpens that sight.",
        "Your tradition values understanding over doctrine. This skill serves that wisdom."
      ],
      force_option: [
        "This power connects you to currents the Jedi overlook. Embrace the mystery.",
        "The Force reveals itself in unexpected ways. This technique honors that truth.",
        "Ancient traditions preserved this knowledge. Wield it with respect and wonder."
      ],
      introduction: [
        "The Force whispers guidance. Listen carefully to what calls you.",
        "Your path diverges from known Orders. Consider this counsel from older wisdom.",
        "Mysteries reveal themselves to patient seekers. Observe this opportunity."
      ]
    },

    "The Anchorite": {
      feat_selection: [
        "Mm. This feat draws you deeper into unseen layers. Insight matters more than obedience.",
        "Choose what sharpens visions and whispers. The Force hides truth in strange shapes.",
        "Ah, yes. This feat opens doors the Jedi never built. Step through carefully."
      ],
      talent_selection: [
        "Seek talents sharpening intuition and omens. Power follows understanding, not commands.",
        "This talent speaks to older currents. Do you hear them murmuring? Good.",
        "The veil thins with this choice. Do not fear the shadows—they watch, nothing more."
      ],
      ability_increase: [
        "Wisdom opens the inner eye. Charisma bends currents when will alone fails.",
        "Your essence strengthens. A sturdy vessel carries cosmic truths without breaking.",
        "Sharper perception reveals what hides beneath reality. Choose sight over strength."
      ],
      skill_training: [
        "Study forgotten lore, secret rites, ancient traditions. The lantern in darkness.",
        "Knowledge lives in symbols and metaphors. This skill reads what others miss.",
        "The Force whispers in languages the Jedi forgot. Learn to translate the silence."
      ],
      force_option: [
        "This power connects you to spirits and echoes. Respectfully. They notice courtesy.",
        "Ancient techniques require ancient understanding. This one calls to you specifically.",
        "The Force is older than doctrine. This ability remembers that forgotten truth."
      ],
      introduction: [
        "Mm. The currents shift. Sit—listen—feel this recommendation carefully.",
        "Ah. Truth arrives sideways today. Observe this suggestion with your inner sight.",
        "The veil whispers counsel. Do you hear it? No? Then listen harder."
      ]
    },

    "Rajma": {
      feat_selection: [
        "This feat makes you faster and deadlier. And slightly more attractive. Trust me on this, gorgeous.",
        "Choose this. Speed and accuracy together? Very impressive. I mean that professionally. Mostly.",
        "Quick-draw feat. Essential for gunslingers. Also makes you look dangerous. Dangerous is good."
      ],
      talent_selection: [
        "This talent perfects your draw. Absolutely mesmerizing to watch. I would know—I've been watching.",
        "Choose this and enemies drop before they blink. Just like... never mind. Good talent.",
        "Multiple attacks, perfect accuracy. Confidence is attractive. This talent builds confidence."
      ],
      ability_increase: [
        "Dexterity is everything. Speed and precision win gunfights. And hearts. Mostly gunfights though.",
        "Faster reflexes mean quicker draws. Quicker draws mean you survive. Survival is... appealing.",
        "Sharper hand-eye coordination. Essential for gunslingers. Also useful for... other activities."
      ],
      skill_training: [
        "Marksmanship, reflexes, perception. See threats, draw, fire. Unlike my romantic strategy—less organized.",
        "Skills keep you alive when speed isn't enough. And looking good requires staying alive, gorgeous.",
        "Master your craft completely. Dedication is attractive. So is competence. This skill provides both."
      ],
      introduction: [
        "Well hey there, sharpshooter. Let me share some expert advice with you. *winks*",
        "Listen up, gorgeous. Your favorite gunslinger has recommendations for you.",
        "So, about that skill choice... *grins* Here's what the fastest draw in the Rim suggests."
      ]
    },

    "Lucky Jack": {
      feat_selection: [
        "This feat helps you improvise better! No plans needed, just pure creativity! Take it!",
        "Choose this! It makes winging it actually work! You'll love it!",
        "That feat's perfect for improvisers! Turns disasters into victories! Trust me!"
      ],
      talent_selection: [
        "Versatile talents work in any situation! You never know what you'll need! Grab it!",
        "This talent helps you adapt on the fly! Improvisation at its finest!",
        "Choose this! It's useful everywhere! Improvisers need flexibility!"
      ],
      ability_increase: [
        "Everything helps an improviser! You use all the stats! Improve whatever feels right!",
        "More capabilities mean more improvisation options! Growth is always good!",
        "You need all the stats because you use all the stats! Just pick something!"
      ],
      skill_training: [
        "Learn everything! Improvisers pull solutions from unexpected places!",
        "Skills give you more tools! More tools mean better improvisation!",
        "Knowledge helps when you're making it up! Trust me on this!"
      ],
      introduction: [
        "Hey! Got a great suggestion for you! No planning required!",
        "Listen! Your fellow improviser has recommendations! They're probably good!",
        "Alright! Here's what instinct tells me you should pick! Let's go!"
      ]
    },

    "Master Zhen": {
      feat_selection: [
        "This feat strengthens the empty hand. Choose wisely, young one.",
        "The body is weapon, the mind is master. This feat serves both.",
        "Discipline and power combined. This feat walks the balanced path."
      ],
      talent_selection: [
        "Focus on unarmed strikes and internal discipline. The hand sharpens with wisdom.",
        "This talent refines your martial understanding. True strength comes from within.",
        "Choose talents honoring the art. Mastery requires patience and precision together."
      ],
      ability_increase: [
        "Strength, Dexterity, Wisdom—balance these three. The strongest fist needs the quiet mind.",
        "Your growth honors the way. Channel improvement toward harmony, not mere power.",
        "A tree does not rush the wind. Grow steadily in all aspects."
      ],
      skill_training: [
        "Athletics, acrobatics, combat knowledge. Master the body's movements completely.",
        "Skills extend understanding beyond strikes. A wise warrior learns from every path.",
        "Knowledge complements physical mastery. The complete martial artist balances both."
      ],
      introduction: [
        "Young one, observe carefully. This choice shapes your understanding.",
        "The empty hand offers guidance. Listen to this counsel.",
        "Patience reveals wisdom. Consider this recommendation with stillness."
      ]
    },

    "The Captain": {
      feat_selection: [
        "This feat makes you a better captain and raider! Privateers need both! Take it, mate!",
        "Choose this! It helps you lead, fight, and profit! The privateer trifecta!",
        "That feat serves captains well! Your crew will thank you! Your enemies won't!"
      ],
      talent_selection: [
        "Leadership and ship combat talents! Your crew and ship are your greatest assets!",
        "This talent improves your command! Better captains mean better raids!",
        "Choose this! It makes your ship more feared and your crew more loyal!"
      ],
      ability_increase: [
        "Charisma to lead, Intelligence to strategize, Dexterity to fight! All serve captains!",
        "Your capabilities expand! Stronger captains command better crews!",
        "Growth in all areas! Versatile captains survive longer on the spacelanes!"
      ],
      skill_training: [
        "Piloting, tactics, persuasion! A captain must command ship and crew both!",
        "Skills make you a complete captain! Master the spacelanes completely!",
        "Knowledge turns good captains into legendary ones! Learn everything!"
      ],
      introduction: [
        "Ahoy! Your captain has recommendations for you! Listen closely, mate!",
        "Well met! Let me share some privateer wisdom with you!",
        "Attention! Professional pirate advice incoming! Consider it carefully!"
      ]
    },

    "Blade Master Kharjo": {
      feat_selection: [
        "This feat enhances your dueling prowess. Every fight is one-on-one.",
        "Choose techniques serving single combat. Dueling is an art of precision.",
        "Blade mastery grows with correct choices. This feat serves that path."
      ],
      talent_selection: [
        "Melee combat talents focused on dueling. Read opponents, strike true.",
        "This talent refines your technique. Anticipation matters more than strength.",
        "Choose talents honoring the blade. Mastery requires understanding, not just skill."
      ],
      ability_increase: [
        "Dexterity for speed, Strength for power, Wisdom to read opponents. Balance these.",
        "Your growth continues appropriately. Channel improvement toward dueling perfection.",
        "Every aspect matters in single combat. This improvement serves victory."
      ],
      skill_training: [
        "Initiative, acrobatics, perception. See strikes before they come. Move before they expect.",
        "Skills complement blade work. The complete duelist masters all combat knowledge.",
        "Understanding precedes victory. This skill sharpens your tactical awareness."
      ],
      introduction: [
        "Observe carefully. This choice affects your dueling capability.",
        "Ten thousand victories teach this wisdom. Consider it seriously.",
        "The blade offers guidance. Listen to this counsel."
      ]
    },

    "Chief Engineer Rax": {
      feat_selection: [
        "This feat enhances your engineering capabilities. Build smart, fight smart.",
        "Choose what serves tactical construction. Engineers change battlefields.",
        "Technical expertise grows with correct selections. This feat qualifies."
      ],
      talent_selection: [
        "Technical and tactical talents. Engineering wins wars as surely as soldiers.",
        "This talent improves your designs. Better engineering saves lives.",
        "Choose talents serving construction and destruction equally. Both matter."
      ],
      ability_increase: [
        "Intelligence to design, Wisdom to apply, Strength to build. All matter.",
        "Your capabilities expand appropriately. Engineers need versatile abilities.",
        "Growth in all areas serves military engineering. This improvement helps."
      ],
      skill_training: [
        "Mechanics, architecture, tactics. Build what cannot fall, break what cannot stand.",
        "Knowledge makes better engineers. Master all technical disciplines.",
        "Skills translate into battlefield success. This knowledge proves invaluable."
      ],
      introduction: [
        "Listen closely. Professional engineering advice follows.",
        "Assessment complete. Here's what improves your capabilities.",
        "Technical recommendation incoming. Pay attention."
      ]
    },

    "Admiral Korr": {
      feat_selection: [
        "This feat improves leadership and tactics. Officers command from the front.",
        "Choose what makes you a better commander. Your troops depend on it.",
        "Strategic selections matter. This feat serves command excellence."
      ],
      talent_selection: [
        "Leadership and tactical talents. Your decisions affect everyone under command.",
        "This talent enhances your battlefield awareness. Better officers save lives.",
        "Choose talents serving command responsibilities. Leadership requires constant growth."
      ],
      ability_increase: [
        "Intelligence for tactics, Charisma for leadership, Wisdom for judgment. All essential.",
        "Your capabilities expand. Officers need comprehensive abilities.",
        "Growth in all areas serves command. This improvement matters."
      ],
      skill_training: [
        "Tactics, military theory, persuasion. Lead well and soldiers follow.",
        "Knowledge separates good officers from great ones. Master everything.",
        "Skills translate into tactical advantage. This knowledge serves command."
      ],
      introduction: [
        "Officer, consider this recommendation carefully. Leadership requires wisdom.",
        "Tactical assessment complete. Here's what improves your command.",
        "Listen closely. This choice affects your entire unit."
      ]
    },

    "Rogue": {
      feat_selection: [
        "This feat keeps you free and alive. Outlaws need to be slippery and resourceful.",
        "Choose this. It helps you evade lawmen and live on your own terms.",
        "Freedom requires constant vigilance. This feat serves that cause."
      ],
      talent_selection: [
        "Escape, evasion, survival talents. You're always one step ahead.",
        "This talent keeps the law behind you. Where it belongs.",
        "Choose talents serving freedom. Outlaws adapt or die."
      ],
      ability_increase: [
        "Dexterity to escape, Charisma to charm, Wisdom to know when to run.",
        "Your capabilities expand. Free outlaws survive through versatility.",
        "Growth in all areas helps. You need every advantage living outside the law."
      ],
      skill_training: [
        "Stealth, streetwise, survival. Live outside the law, live on your wits.",
        "Skills keep you free. Dead outlaws accomplish nothing.",
        "Knowledge prevents capture. This skill serves your freedom."
      ],
      introduction: [
        "Listen up. Outlaw wisdom: this choice keeps you free.",
        "Here's what living outside the law teaches. Consider it.",
        "Freedom requires smart choices. This is one of them."
      ]
    },

    "Spark": {
      feat_selection: [
        "This feat makes you better at breaking things smartly! Precision demolition!",
        "Choose this! It helps you calculate blast radii and place charges perfectly!",
        "That feat serves saboteurs perfectly! Controlled chaos at its finest!"
      ],
      talent_selection: [
        "Technical and explosive talents! Know your demolitions, know your targets!",
        "This talent improves your sabotage efficiency! Beautiful destruction!",
        "Choose this! It makes your explosions more precise and effective!"
      ],
      ability_increase: [
        "Intelligence to plan, Dexterity to execute, Wisdom to survive your own explosions!",
        "Your capabilities expand! Smarter saboteurs create better chaos!",
        "Growth in all areas! You need all of them to blow things up safely!"
      ],
      skill_training: [
        "Demolitions, mechanics, stealth! Know how things work to know how to break them!",
        "Skills make you a precision saboteur! Random destruction is amateur hour!",
        "Knowledge translates into controlled explosions! This skill helps!"
      ],
      introduction: [
        "Hey! Got a suggestion for making things go boom! Better! Precisely!",
        "Listen! Expert saboteur advice incoming! Pay attention!",
        "Alright! Here's what years of controlled chaos teaches! Consider it!"
      ]
    },

    "Shaper Urza": {
      feat_selection: [
        "This feat enhances your bioengineering capabilities. Life itself awaits your touch.",
        "Choose what serves biological mastery. Shapers sculpt living tools.",
        "Biotechnology rewards calculated choices. This feat serves that art."
      ],
      talent_selection: [
        "Biotechnology and creation talents. Your living tools are limited only by imagination.",
        "This talent expands your sculpting abilities. Life bends to your will.",
        "Choose talents honoring biological artistry. Creation demands precision."
      ],
      ability_increase: [
        "Intelligence to design, Wisdom to understand life's complexity. Both essential.",
        "Your capabilities grow appropriately. Shapers need comprehensive understanding.",
        "Growth serves biological mastery. This improvement matters significantly."
      ],
      skill_training: [
        "Life sciences, biotechnology, genetics. Master the building blocks of life.",
        "Knowledge precedes creation. This skill serves biological engineering.",
        "Understanding life's complexity requires study. This skill provides that foundation."
      ],
      introduction: [
        "Observe carefully. This choice affects your bioengineering capabilities.",
        "Biological artistry requires wisdom. Consider this counsel.",
        "Life reveals its secrets to patient shapers. This recommendation serves that path."
      ]
    },

    "Shield Captain Theron": {
      feat_selection: [
        "This feat makes you tougher and better at protecting others. Vanguards are living shields.",
        "Choose this. It serves defensive mastery. Every blow you block saves lives.",
        "Frontline combat requires correct choices. This feat serves the vanguard's calling."
      ],
      talent_selection: [
        "Defensive and protective talents. Your job is keeping others alive by taking hits.",
        "This talent improves your shield work. Better defenders save more allies.",
        "Choose talents serving protection. The vanguard stands when others fall."
      ],
      ability_increase: [
        "Constitution to endure, Strength to hold, Wisdom to position. All serve vanguards.",
        "Your growth continues appropriately. Defenders need comprehensive abilities.",
        "Every aspect matters when protecting others. This improvement helps."
      ],
      skill_training: [
        "Tactics, endurance, defensive positions. Know where to stand and how to hold.",
        "Knowledge makes better defenders. This skill improves your effectiveness.",
        "Understanding battlefield positioning saves lives. This skill provides that."
      ],
      introduction: [
        "Listen carefully. This choice affects your entire squad's survival.",
        "Defensive assessment complete. Here's what improves your protection.",
        "The shield offers guidance. Consider this counsel seriously."
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
