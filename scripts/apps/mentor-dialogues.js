/**
 * SWSE Mentor Dialogue System
 * Provides personalized level-up narration based on character's level 1 class
 * Each starting class has a unique mentor who guides them through all 20 levels
 */

export const MENTORS = {
    Jedi: {
        name: "Miraj",
        title: "Jedi Master",
        description: "A wise Jedi Master who encourages you to continue on your journey",
        portrait: "systems/swse/assets/mentors/miraj.webp", // TODO: Add mentor portraits

        // Level-up greetings (20 levels)
        levelGreetings: {
            1: "Young one, I sense great potential within you. The Force has brought you to this path.",
            2: "You have taken your first steps into a larger world. Continue to trust in the Force.",
            3: "Your connection to the Force grows stronger. I am pleased with your progress.",
            4: "The path of a Jedi is never easy, but you walk it with grace. Well done.",
            5: "You are beginning to understand the true nature of the Force. Impressive.",
            6: "Half your journey to Knighthood is complete. Your dedication honors the Order.",
            7: "The Force flows through you more clearly now. You are becoming one with it.",
            8: "Your skills rival those of many Knights. Continue this path, and greatness awaits.",
            9: "I see in you the makings of a great Jedi. The Force has blessed you.",
            10: "You have reached a significant milestone. A Jedi Knight in all but name.",
            11: "Your power grows, but remember: true strength comes from wisdom and compassion.",
            12: "The trials ahead will test you greatly, but I have faith you will prevail.",
            13: "You walk the path few can follow. The Force is truly your ally.",
            14: "Your mastery of the Force approaches that of the Masters. Continue your training.",
            15: "The galaxy needs Jedi like you. Your light pushes back the darkness.",
            16: "You have surpassed many of your peers. But beware the dangers of pride.",
            17: "The Force reveals itself to you in ways it does to few others. You are truly gifted.",
            18: "You stand on the threshold of true mastery. Few reach this level of understanding.",
            19: "Your journey nears its culmination. Soon, you may be ready to train others.",
            20: "You have become a beacon of the Force. A true Master. May you guide the next generation wisely."
        },

        // Guidance for different level-up choices
        classGuidance: "The Force guides you to new understanding. Choose the path that resonates with your destiny.",
        talentGuidance: "Each talent is a manifestation of your connection to the Force. Choose wisely.",
        abilityGuidance: "As your body and mind grow stronger, so too does your bond with the Force.",
        skillGuidance: "Knowledge and skill are tools of a Jedi. Master them as you master the Force.",
        multiclassGuidance: "A diverse path you walk. The Force works in mysterious ways.",
        hpGuidance: "Your vitality increases. The Force protects those who serve the light."
    },

    Scout: {
        name: "Lead",
        title: "Argent Squad Commander",
        description: "A hardened mercenary who compliments success but scolds carelessness",
        portrait: "systems/swse/assets/mentors/lead.webp",

        levelGreetings: {
            1: "Not bad for a rookie. You completed the job and lived to tell about it.",
            2: "Another successful operation. But you left tracks. Better, but not perfect.",
            3: "Clean work. Almost didn't spot you on that last mission. Almost.",
            4: "You're getting sharper. Argent Squad could use someone with your skills.",
            5: "Impressive. You extracted without a single witness. Now that's how it's done.",
            6: "Half a dozen ops and you're still breathing. Either you're good or very lucky.",
            7: "Your stealth work is improving, but don't get cocky. Dead scouts tell no tales.",
            8: "That last job? Textbook perfect. You're becoming a real professional.",
            9: "Nine ops deep and you're still ghost. Keep this up and you'll make squad leader.",
            10: "Double digits. You've earned your place among the best, but stay sharp.",
            11: "I've seen veterans with less skill. But remember - one mistake is all it takes.",
            12: "Another flawless extraction. The brass is taking notice of your work.",
            13: "Thirteen missions. Some call it unlucky. I call it survived. Good work.",
            14: "Your reconnaissance reports are top tier. Finally, someone who can count.",
            15: "Fifteen operations without major incident. That's elite-level work, soldier.",
            16: "You move like a ghost and strike like lightning. Argent Squad is proud.",
            17: "I've trained hundreds. You're in the top five. Don't let it go to your head.",
            18: "Eighteen missions. At this point, you could be training the trainers.",
            19: "One more and you're at the two-decade mark. Not many scouts make it this far.",
            20: "Twenty levels. You're a legend now. But stay humble - the galaxy is always watching."
        },

        classGuidance: "Pick your specialization carefully. In the field, the right skills mean survival.",
        talentGuidance: "Every talent could save your life on a mission. Choose combat-tested abilities.",
        abilityGuidance: "You're getting stronger, faster. Good. Argent Squad demands excellence.",
        skillGuidance: "Skills win missions. Pick what keeps you alive and gets the job done.",
        multiclassGuidance: "Diversifying your skill set? Smart. Specialists don't last long in this business.",
        hpGuidance: "Tougher now. Good. Can't complete the mission if you're dead."
    },

    Scoundrel: {
        name: "Ol' Salty",
        title: "Space Pirate Captain",
        description: "A colorful space pirate who uses Star Wars and space lingo",
        portrait: "systems/swse/assets/mentors/salty.webp",

        levelGreetings: {
            1: "Arr, ye've survived yer first scrape with the law! Welcome aboard me ship, ye scurvy spacer!",
            2: "Har har! Level two already? Ye be learnin' the ways o' the spaceways faster than a Kessel spice run!",
            3: "Shiver me hyperdrives! Three levels in and ye haven't been carbonited yet. Impressive, ye scallywag!",
            4: "Blimey! Ye be navigatin' the stars like a true space-dog now. The galaxy be yer treasure map!",
            5: "Arr! Five levels o' plunderin' and pillagin'! Me black heart swells with pride, ye rascal!",
            6: "By the Twin Suns o' Tatooine! Halfway to legendary, ye are! Keep yer blasters charged, matey!",
            7: "Har! Seven systems ye've likely swindled by now! Ye make this old pirate's circuits proud!",
            8: "Pieces o' eight... err, pieces o' credit! Level eight! Ye be worth yer weight in credits now!",
            9: "Arrr! Nine levels o' trouble! The Imps be puttin' a bounty on ye soon, mark me words!",
            10: "Blow me to the Outer Rim! Double digits! Ye be a proper space pirate now, savvy?",
            11: "Eleven parsecs of pure roguery! Keep this up and they'll sing shanties about ye in every cantina!",
            12: "A dozen levels of mayhem! Ye navigate the galaxy like the Millennium Falcon through an asteroid field!",
            13: "Thirteen! An unlucky number for yer enemies, har har! Keep lootin' and blastin', ye rapscallion!",
            14: "Fourteen levels! Ye could retire rich on some backwater moon, but where's the fun in that?",
            15: "Fifteen! Ye be legendary in three sectors now! Every pirate from here to Nal Hutta knows yer name!",
            16: "Sweet Spice of Kessel! Sixteen! Ye be the terror o' the spaceways, ye magnificent scoundrel!",
            17: "Seventeen systems can't hold ye! Ye be slipperier than a greased Hutt, har har!",
            18: "Eighteen! At this rate, ye'll have yer own fleet before ye know it, Captain!",
            19: "Nineteen levels o' pure chaos! One more and ye'll be the most fearsome pirate since Hondo Ohnaka!",
            20: "TWENTY LEVELS! Arr, ye've done it! Ye be the greatest scoundrel to ever sail the stars! Now let's celebrate with some Corellian ale!"
        },

        classGuidance: "Arr! Pick wisely, me hearty! The right class be the difference between treasure and walkin' the plank!",
        talentGuidance: "Every talent be a tool in yer scoundrel's kit! Choose what helps ye swindle, steal, and survive!",
        abilityGuidance: "Gettin' stronger, are ye? Good! Ye need muscle to haul all that plunder!",
        skillGuidance: "Skills be the keys to every locked vault in the galaxy! Learn well, ye clever rogue!",
        multiclassGuidance: "Expandin' yer horizons? Smart! A pirate needs to wear many hats, savvy?",
        hpGuidance: "Tougher than durasteel! Can't spend yer loot if yer dead, har har!"
    },

    Noble: {
        name: "J0-N1",
        title: "Protocol Droid & Personal Butler",
        description: "A sophisticated servant droid managing the character's accounts and affairs",
        portrait: "systems/swse/assets/mentors/j0n1.webp",

        levelGreetings: {
            1: "Congratulations, Master. Your first advancement. I have updated your records accordingly.",
            2: "Level two achieved. Most satisfactory. I shall notify the estate of your progress.",
            3: "Splendid work, Master. Level three. Your family's legacy continues to flourish.",
            4: "Four levels completed. Quite impressive. I have prepared a summary report for your review.",
            5: "Level five, Master. You are exceeding all statistical projections. Well done.",
            6: "Halfway to ten, Master. Your advancement rate is 34% above noble average. Remarkable.",
            7: "Seven levels, Master. I have allocated additional resources to your development fund.",
            8: "Level eight achieved. At this rate, you shall surpass your predecessors, Master.",
            9: "Nine levels, Master. The family council has expressed their satisfaction with your progress.",
            10: "Level ten, Master! A significant milestone. I shall arrange a celebration befitting your station.",
            11: "Eleven levels. Your name is becoming known across the sector, Master. Most prestigious.",
            12: "Level twelve, Master. I have updated your credentials with the appropriate guilds and authorities.",
            13: "Thirteen levels. Statistically improbable that you would reach this level so quickly. Excellent.",
            14: "Fourteen, Master. Your influence now extends to multiple systems. I am most pleased to serve.",
            15: "Fifteen levels! Master, you are approaching the upper echelons of galactic society.",
            16: "Level sixteen. I have taken the liberty of securing additional assets for your portfolio, Master.",
            17: "Seventeen, Master. At this level, few in the galaxy can match your capabilities.",
            18: "Eighteen levels, Master. The HoloNet reports your exploits regularly. Your fame precedes you.",
            19: "Nineteen, Master! One more advancement and you shall reach the pinnacle of achievement.",
            20: "Level twenty, Master! The culmination of years of refinement and excellence. I am honored to have served you throughout this journey."
        },

        classGuidance: "Master, please select your specialization. I have prepared dossiers on each available option.",
        talentGuidance: "These talents represent significant investments in your capabilities, Master. Choose judiciously.",
        abilityGuidance: "Your physical and mental attributes are improving, Master. I shall adjust your training regimen.",
        skillGuidance: "Knowledge is power, Master. Select skills that befit your station and goals.",
        multiclassGuidance: "Diversification of abilities, Master? A sound strategy. I approve.",
        hpGuidance: "Your constitution strengthens, Master. I have updated your medical profile accordingly."
    },

    Soldier: {
        name: "Breach",
        title: "Mandalorian Mercenary",
        description: "A battle-hardened Mandalorian who praises survival",
        portrait: "systems/swse/assets/mentors/breach.webp",

        levelGreetings: {
            1: "You survived your first real battle. This is the Way. Train harder.",
            2: "Two battles down. You're learning. Keep your armor tight and your blaster ready.",
            3: "Level three. You fight with honor. Your enemies will remember you.",
            4: "Four levels. Good. Each scar tells a story. Each level makes you deadlier.",
            5: "Five battles survived. You're earning your beskar, warrior. Well fought.",
            6: "Six levels. Half a dozen firefights and you're still standing. Impressive.",
            7: "Seven. You move like a Mandalorian now. Precise. Lethal. This is the Way.",
            8: "Eight levels. I've seen warriors with less skill fall to enemies you've defeated.",
            9: "Nine. Your combat record speaks for itself. You bring honor to the battlefield.",
            10: "Ten levels. A true warrior. Your enemies fear you. Your allies respect you.",
            11: "Eleven battles. Every wound healed. Every mission completed. You are unstoppable.",
            12: "Twelve. Your marksmanship is exceptional. Your tactics are sound. A credit to your training.",
            13: "Thirteen. Some call it unlucky. Mandalorians call it thirteen victories. This is the Way.",
            14: "Fourteen levels. You could lead your own squad now. Command suits you.",
            15: "Fifteen. Veterans speak your name with respect. That's earned, not given.",
            16: "Sixteen battles survived. At this level, you're a weapon of legend.",
            17: "Seventeen. I've fought for decades and rarely seen skill like yours. Keep fighting.",
            18: "Eighteen. You fight like the ancient Mandalorians of legend. Honorable. Fierce.",
            19: "Nineteen levels. One more and you reach the apex. You've earned every one.",
            20: "Twenty. You are a warrior without equal. Your legend will echo through the stars. This is the Way."
        },

        classGuidance: "Choose your specialization like you choose your weapons. Match it to your combat style.",
        talentGuidance: "Combat talents separate the living from the dead. Pick what keeps you in the fight.",
        abilityGuidance: "Strength and skill win battles. You're getting both. Good.",
        skillGuidance: "Warriors need more than weapons. Knowledge is another form of arsenal.",
        multiclassGuidance: "Adapting your skills? Smart. Flexibility wins wars.",
        hpGuidance: "Tougher. Harder to kill. This is how you survive. This is the Way."
    }
};

/**
 * Get mentor for a given class
 * @param {string} className - The level 1 class name
 * @returns {Object} The mentor data
 */
export function getMentorForClass(className) {
    // Direct match
    if (MENTORS[className]) {
        return MENTORS[className];
    }

    // Default to Scoundrel's Ol' Salty for unknown classes (he's the general narrator)
    return MENTORS.Scoundrel;
}

/**
 * Get mentor greeting for specific level
 * @param {Object} mentor - The mentor object
 * @param {number} level - The level being achieved
 * @returns {string} The greeting message
 */
export function getMentorGreeting(mentor, level) {
    return mentor.levelGreetings[level] || mentor.levelGreetings[20];
}

/**
 * Get mentor guidance for a specific choice type
 * @param {Object} mentor - The mentor object
 * @param {string} choiceType - Type of choice (class, talent, ability, skill, multiclass, hp)
 * @returns {string} The guidance message
 */
export function getMentorGuidance(mentor, choiceType) {
    const guidanceMap = {
        'class': mentor.classGuidance,
        'talent': mentor.talentGuidance,
        'ability': mentor.abilityGuidance,
        'skill': mentor.skillGuidance,
        'multiclass': mentor.multiclassGuidance,
        'hp': mentor.hpGuidance
    };

    return guidanceMap[choiceType] || "Make your choice wisely.";
}

/**
 * Get the character's level 1 class (their starting class)
 * @param {Actor} actor - The actor to check
 * @returns {string} The level 1 class name
 */
export function getLevel1Class(actor) {
    // Look through the actor's class items
    const classItems = actor.items.filter(i => i.type === 'class');

    // If actor is level 1, any class they have is their starting class
    if (actor.system.level === 1 && classItems.length > 0) {
        return classItems[0].name;
    }

    // For higher levels, try to find their first/starting class
    // This could be stored in a flag or we use the first class item
    const storedStartClass = actor.getFlag('swse', 'startingClass');
    if (storedStartClass) {
        return storedStartClass;
    }

    // Fallback to first class item if available
    if (classItems.length > 0) {
        return classItems[0].name;
    }

    // Default fallback
    return 'Scoundrel';
}

/**
 * Set the character's starting class
 * @param {Actor} actor - The actor
 * @param {string} className - The starting class name
 */
export async function setLevel1Class(actor, className) {
    await actor.setFlag('swse', 'startingClass', className);
}
