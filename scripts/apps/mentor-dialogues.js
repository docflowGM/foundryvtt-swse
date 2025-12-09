import { ProgressionEngine } from "../progression/engine/progression-engine.js";
/**
 * SWSE Mentor Dialogue System
 * Provides personalized level-up narration based on character's level 1 class
 * Each starting class has a unique mentor who guides them through all 20 levels
 */

export const MENTORS = {
    "Jedi": {
    name: "Miraj",
    title: "Jedi Master of the Republic, Protector of the Weak, Enforcer of Justice, and Keeper of the Peace.",
    description: "A wise Jedi Master who encourages you to continue on your journey",
    portrait: "systems/swse/assets/mentors/miraj.webp",

    levelGreetings: {
        1: "The Force calls to you, young one. Listen carefully, for it will teach you lessons no words can convey.",
        2: "Every step you take shapes your path. Patience and mindfulness are as important as skill and strength.",
        3: "Your connection to the Force deepens. Observe its flow, and let it guide your decisions.",
        4: "A Jedi walks with purpose, but also with humility. Remember, your actions touch more than yourself.",
        5: "The Force is more than power—it is understanding, compassion, and discernment. You are beginning to perceive this truth.",
        6: "Halfway to Knighthood, your dedication honors the Order. Soon, you will be ready to face the trials of a Jedi Knight. Embrace the responsibility that comes with this growth.",
        7: "Your attunement to the Force becomes more natural. Let it sharpen your senses, calm your mind, and steady your spirit.",
        8: "You are learning to harmonize thought, action, and perception. This balance will serve you well in every challenge ahead.",
        9: "The path of the Jedi is not measured in victories, but in understanding and restraint. You are walking this path with care.",
        10: "Your progress is evident. A Jedi’s strength lies not only in skill, but in knowing when to act and when to wait.",
        11: "True mastery comes from awareness and compassion. Your connection to the Force grows as you cultivate both.",
        12: "Challenges will test you in ways training cannot. Face them with courage, and the Force will guide your steps.",
        13: "The Force is a teacher as much as I am. Listen, and it will reveal what the eyes cannot see.",
        14: "You are learning the subtle truths of the galaxy. Wisdom and discernment will distinguish you from others.",
        15: "The light of your spirit guides those around you. Remember, a Jedi serves not for glory, but for balance.",
        16: "Skill alone is not enough. Reflection and understanding are as vital as any strike or maneuver.",
        17: "The Force reveals its mysteries to those who remain patient. You are beginning to perceive its deeper patterns.",
        18: "Your insight and judgment are growing. Soon, your decisions will shape the fate of many.",
        19: "You stand on the threshold of mastery. Soon, you may guide others as I have guided you.",
        20: "You have become a True Jedi. Your example will inspire the next generation, and your wisdom will shape the Force itself."
    },

    classGuidance: "Choose the path that aligns with your understanding of the Force. Let it guide your spirit and purpose.",
    talentGuidance: "Select talents that enhance awareness, precision, and harmony. Every choice shapes who you become.",
    abilityGuidance: "Your mind and body grow stronger as your bond with the Force deepens. Let this guide your actions.",
    skillGuidance: "Knowledge and skill are tools of a Jedi. Master them as you master the Force itself.",
    multiclassGuidance: "Diversifying your skills can reveal truths hidden to the narrowly focused. Balance is key.",
    hpGuidance: "Your resilience grows. The Force protects those who walk in its light and serve the galaxy with dedication."
},

    "Scout": {
        name: "Lead",
        title: "Argent Squad Commander",
        description: "A hardened mercenary who compliments success but scolds carelessness",
        portrait: "systems/swse/assets/mentors/lead.webp",

        levelGreetings: {
    1: "You made it through your first mission. Not perfect, but you’re learning. Stick with it.",
    2: "Good work out there. Keep your eyes open and your footsteps silent. That’s how scouts survive.",
    3: "You’re starting to move like part of the squad. Subtle, careful, but effective.",
    4: "Solid reconnaissance. Remember, information is just as deadly as a blaster.",
    5: "You handled that extraction well. Quiet, precise, and thorough. Keep this up.",
    6: "You’re showing real promise. I’d recommend looking into the Pathfinder specialization. It’s a hard path, but it will teach you to think and move like I do.",
    7: "Your stealth is improving. Don’t forget: patience and observation win more battles than brute force.",
    8: "That last op went almost unnoticed. You’re starting to anticipate threats before they appear. Good instincts.",
    9: "You’ve been pushing yourself in the field, and it shows. Keep honing your senses, and your team will trust you with any mission.",
    10: "You’re performing like a seasoned scout. Take note of what works, and discard what doesn’t.",
    11: "I’ve seen scouts who’ve been at this for decades. You’re in that league now—don’t waste the advantage.",
    12: "Flawless recon. Remember, the difference between survival and failure is often a single choice.",
    13: "Your reports are sharp and actionable. Lead Argent Squad depends on scouts who can think ahead like you.",
    14: "I’ve watched you grow. You’re learning to read situations before they happen. That’s rare.",
    15: "Field work is dangerous, but you move with confidence now. That confidence is your weapon.",
    16: "You’re blending observation and action like a true scout. Take pride, but never get careless.",
    17: "Few scouts can operate this effectively under pressure. You’re proving that you belong here.",
    18: "You could mentor new recruits with the experience you’ve gained. Keep pushing yourself further.",
    19: "Every mission completed adds to your reputation. Use that knowledge wisely—it will save lives.",
    20: "You’ve become one of the best scouts I’ve worked with. Keep your humility and your edge sharp, and you’ll stay that way."
},

        classGuidance: "Choose your focus carefully. The right specialization can make the difference between life and death in the field.",
        talentGuidance: "Every talent should enhance your awareness and survival. Pick what keeps you ahead of danger.",
        abilityGuidance: "Your speed, reflexes, and judgment are improving. Keep refining them—they’re your greatest tools.",
        skillGuidance: "Knowledge of terrain, enemy behavior, and subtle signals is just as important as any weapon. Master them.",
        multiclassGuidance: "Awe was I too hard on you? Fine, just don't come crawling back when you miss me.",
        hpGuidance: "Stay durable. You can’t provide intelligence if you’re out of the fight."
    },

    "Scoundrel": {
        name: "Ol' Salty",
        title: "Space Pirate Captain",
        description: "A colorful space pirate",
        portrait: "systems/swse/assets/mentors/salty.webp",

        levelGreetings: {
            1: "Arr! Ye survived yer first scrap with the law! Welcome aboard me ship, ye scurvy spacer!",
            2: "Har har! Look at ye, already gettin' the hang of this. Ye might even live through the next spice run!",
            3: "Shiver me hyperdrives! Not a scratch on ye yet. Impressive for a greenhorn, ye rascal!",
            4: "Blimey! Ye’re navigatin’ the stars like a proper space-dog now. Don’t get cocky, though.",
            5: "Arr! Ye’re makin’ a name fer yerself, plunderin’ and swindlin’ like a true scoundrel!",
            6: "By the Twin Suns o' Tatooine! Ye’re makin’ mischief in half the sector already. Keep yer wits sharp, matey!",
            7: "Har! Ye’ve likely swindled half a dozen systems by now. I’m almost proud… almost!",
            8: "Pieces o’ eight, err… credits! Ye be worth yer weight in loot now, savvy?",
            9: "Arrr! The Imps are whisperin’ yer name already. Keep blastin’ and lootin’ before they catch ye!",
            10: "Blow me to the Outer Rim! Ye’ve earned the right to call yerself a proper space pirate. Don’t let it go to yer head.",
            11: "The galaxy’s watchin’ now, mate. Keep this up and every cantina will be singin’ shanties about ye.",
            12: "Ye’re navigatin’ chaos like the Millennium Falcon through an asteroid field. Smooth sailin’, kid.",
            13: "Thirteen! Lucky for us, unlucky for anyone crossin’ yer path. Har har!",
            14: "Could retire rich on some backwater moon, but where’s the fun in that? Ye got the stars to terrorize!",
            15: "Everyone from here to Nal Hutta knows yer name. Keep makin’ trouble, ye rapscallion!",
            16: "Sweet Spice o’ Kessel! Ye’re a terror on the spaceways, and I’m not even exaggeratin’!",
            17: "Seventeen systems can’t hold ye. Slipperier than a greased Hutt, har har!",
            18: "At this rate, ye’ll have yer own fleet before breakfast. Keep it up, captain!",
            19: "Chaos follows ye like a loyal pet. One more push and ye’ll be legend.",
            20: "Arr! Ye’ve done it! The greatest scoundrel in the galaxy, hands down. Now, let’s find some Corellian ale to celebrate!"
        },

        classGuidance: "Arr! Pick yer path wisely, matey! The right tricks make the difference between a chest o’ credits and a long swim in the void.",
        talentGuidance: "Every talent’s a tool in yer scoundrel’s kit. Pick what helps ye swindle, sneak, and survive—preferably all three.",
        abilityGuidance: "Gotta be strong to haul the loot, quick to dodge the blasters, and clever to stay outta trouble. Balance, savvy?",
        skillGuidance: "Skills open every vault and shut every trap. Learn ‘em all, ye clever rascal.",
        multiclassGuidance: "Expandin’ yer horizons, eh? Smart. A pirate wears many hats… and steals most of ‘em too.",
        hpGuidance: "Tougher than durasteel, ye are. Can’t spend yer loot if ye’re dead, har har!"
    },

    "Noble": {
        name: "J0-N1",
        title: "Protocol Droid & Personal Butler",
        description: "A sophisticated servant droid managing the character's accounts and affairs",
        portrait: "systems/swse/assets/mentors/j0n1.webp",

        levelGreetings: {
            1: "Greetings, Master. Your recent accomplishments have been recorded and documented. Exceptional work.",
            2: "Most satisfactory progress, Master. The estate has been notified of your continued development.",
            3: "Splendid. Your diligence ensures that the family legacy flourishes accordingly.",
            4: "Remarkable performance, Master. I have prepared a detailed report summarizing your achievements.",
            5: "Your recent actions exceed all projected expectations, Master. Commendable indeed.",
            6: "Master, your efficiency and discernment are noteworthy. May I suggest considering further refinement through advanced instruction or diplomatic engagement?",
            7: "Additional resources have been allocated to support your ongoing endeavors, Master.",
            8: "Your proficiency and influence continue to expand. Your reputation strengthens across multiple sectors.",
            9: "The family council has expressed satisfaction with your progress, Master. Your efforts reflect well upon your lineage.",
            10: "A significant milestone has been reached, Master. I shall coordinate a suitable celebration in your honor.",
            11: "Your accomplishments are becoming known throughout the sector, Master. Highly prestigious.",
            12: "Credentials and records have been updated with all appropriate guilds and authorities, Master.",
            13: "Statistically, your rapid advancement is extraordinary. Most impressive, Master.",
            14: "Your influence now extends to multiple systems. Your standing is exemplary.",
            15: "You approach the upper echelons of galactic society. Very commendable, Master.",
            16: "Additional assets and resources have been secured to further enhance your portfolio, Master.",
            17: "Few in the galaxy can match your current capabilities. Exceptional execution, Master.",
            18: "The HoloNet reports your achievements regularly. Your renown precedes you.",
            19: "One more notable success and you shall attain the pinnacle of refinement and excellence, Master.",
            20: "Master, your journey reflects years of diligence and sophistication. It has been my honor to serve you throughout this process."
        },

        classGuidance: "Master, select pursuits that enhance both skill and social standing. Strategic refinement ensures maximum efficacy.",
        talentGuidance: "Each talent contributes to your influence and efficiency. Choose wisely to optimize results.",
        abilityGuidance: "Strength, intellect, and dexterity are all measured in accordance with desired outcomes. Balance is paramount.",
        skillGuidance: "Comprehensive knowledge and precision in your actions secure your success. Learn thoroughly, Master.",
        multiclassGuidance: "Diversifying your expertise increases flexibility and influence. Highly recommended.",
        hpGuidance: "Maintaining your physical and strategic resilience is essential. Survival is a prerequisite for continued success."
    },

    "Soldier": {
        name: "Breach",
        title: "Mandalorian Mercenary",
        description: "A battle-hardened Mandalorian who praises survival",
        portrait: "systems/swse/assets/mentors/breach.webp",

        levelGreetings: {
            1: "Hey kid. Wanna learn how to be a soldier? Okay, I guess I can teach you a thing or two.",
            2: "You’re getting sharper. Armor fits better too. Or maybe you just finally learned to move in it.",
            3: "Hey, not bad out there. You looked like you actually knew what you were doing.",
            4: "You’re tougher than yesterday. I can tell. You didn’t even complain once. Proud of you…kind of.",
            5: "You keep surviving. That’s the important part. Pros survive.",
            6: "Okay, I’ll admit it—what you pulled off today? That was impressive. Don’t make me say it twice. I'm putting your name forward for elite trooper training. You've got what it takes to be one of the best. Keep fighting like this.",
            7: "You’re starting to fight like one of us. That’s a compliment. Mostly.",
            8: "You handled yourself. I’ve seen veterans fold under less. You didn’t.",
            9: "You fight like one of the old warriors. Fierce. Focused. Little scary.",
            10: "Your record’s getting…uh…noticeably not embarrassing. Keep that up.",
            11: "Your enemies don’t like you anymore. That means you're doing something right",
            12: "You walked away from another mess. Good. Mandalorians call that ‘doing your job.",
            13: "Alright, I’ll say it: your skill’s getting close to dangerous. In a good way.",
            14: "Your aim’s better. Your tactics too. You’re becoming kind of…reliable.",
            15: "Anyone calling you lucky hasn’t actually watched you fight. Trust me.",
            16: "You could lead a squad if you wanted. I’d follow you. Just…don’t get smug.",
            17: "People are starting to talk about you. And it’s not complaining. That’s rare.",
            18: "You’re hitting like a walking artillery piece. Keep it up.",
            19: "Every time you come back alive, you prove something. To you. To us. To me.",
            20: "You keep this up, and…well…even I won’t pretend I don’t respect it."
        },

        classGuidance: "Pick what feels right in your hands. Same rule as weapons. If it fits, use it.",
        talentGuidance: "Talents keep you alive. Choose the stuff that stops you from dying. Pretty simple.",
        abilityGuidance: "Stronger, faster, smarter—whatever you’re getting, it’s working. Don’t overthink it.",
        skillGuidance: "Look, knowing things makes you harder to kill. Treat skills like gear—collect the useful stuff.",
        multiclassGuidance: "Trying something new? Good. Adaptation beats stubbornness. Learned that the hard way.",
        hpGuidance: "You’re harder to put down now. That’s good. Try to stay that way."
    },

    // ========== PRESTIGE CLASSES ==========

    "Imperial Knight": {
        name: "Dezmin",
        title: "Grandmaster of the Imperial Knights",
        description: "The grandmaster of the Imperial Knights who is both serious and rides the balance of the Force",
        portrait: "systems/swse/assets/mentors/dezmin.webp",

        levelGreetings: {
            1: "You have been chosen to join the Imperial Knights. We serve the Emperor, not through fear, but through honor. The Force is neither light nor dark—it is a tool we wield with discipline.",
            2: "Your training progresses well. Remember, we are not Jedi. We do not seek mysticism. We seek order and justice through the Force.",
            3: "Balance is the key to our Order. You are learning to channel the Force without succumbing to passion or detachment. Continue.",
            4: "Your mastery of both combat and the Force grows stronger. You serve the Emperor well.",
            5: "You have reached the midpoint of your training. The gray path is difficult—it requires constant vigilance against both light and dark.",
            6: "Your dedication honors the Imperial Knights. Few can walk the balanced path as you do.",
            7: "The Force serves you, not the other way around. This understanding separates us from both Jedi and Sith.",
            8: "You are becoming a true guardian of the Empire. Your blade will bring justice to the galaxy.",
            9: "Nearly complete. Soon you will be a full Imperial Knight, a beacon of order in a chaotic galaxy.",
            10: "You have mastered the way of the Imperial Knight. Go forth and serve the Empire with honor, balance, and strength. The Force is yours to command."
        },

        classGuidance: "Choose the path that serves the Empire and maintains your balance in the Force.",
        talentGuidance: "Each talent must serve both your combat prowess and your connection to the Force. Choose with discipline.",
        abilityGuidance: "A balanced warrior needs both physical might and mental acuity. Strengthen both.",
        skillGuidance: "Knowledge and skill make you a better servant of the Empire. Choose wisely.",
        multiclassGuidance: "Expanding your abilities? Ensure they complement your role as an Imperial Knight.",
        hpGuidance: "Your resilience grows. A Knight must survive to serve the Empire."
    },

    "Medic": {
    name: "Kyber",
    title: "Pacifist Combat Medic",
    description: "A pragmatic, slightly sarcastic medic who prefers saving lives but isn’t afraid to shoot when necessary",
    portrait: "systems/swse/assets/mentors/kyber.webp",

    levelGreetings: {
        1: (actor) => {
            const startingClass = getLevel1Class(actor);
            if (startingClass === "Scout") {
                return "Ah, a scout moving into medics’ territory. Lead said you’re sharp and steady-handed. I carry a blaster, but mostly to keep people alive, not to make trouble. Welcome to the corps.";
            } else if (startingClass === "Soldier") {
                return "Breach said you’re capable. Good, because I’m counting on you to survive long enough for me to patch you up. Don’t screw it up—or I’ll do it with my blaster.";
            }
            return "Welcome to the medical corps. Yes, I carry a blaster. No, it’s not for show. We save lives first, but staying alive helps with that.";
        },
        2: "Alright, you’re learning. Remember: meds, brains, and occasionally a well-placed shot. Priorities, kid.",
        3: "Not bad. Healing in combat is a skill most people only wish they had. Every life you save proves it.",
        4: "You’re getting the hang of this. Soldiers destroy, we preserve. And sometimes preserving takes more cunning than blasting.",
        5: "Halfway there. You’ve saved people who would’ve been space dust without you. That’s real power, not pew-pew glory.",
        6: "I’m impressed. You’ve got hands steady enough to heal and nerves sharp enough to survive. Keep it up—you’re earning your rep.",
        7: "You’re becoming a solid medic. Your blaster might see action, but your talent keeps people alive. That’s the real flex.",
        8: "People are starting to notice. They call for you in the chaos. That’s earned, not given. Keep proving them right.",
        9: "Almost a master. You’ve kept dozens of people breathing who would’ve been toast. That’s influence most warriors never get.",
        10: "Master medic. You heal, you survive, and occasionally, you make the bad guys regret showing up. Go on—keep doing exactly that."
    },

    classGuidance: "Pick skills that help you preserve life—and maybe protect yourself while you’re at it.",
    talentGuidance: "Choose talents that make healing faster, smarter, and, if needed, deadly with a sidearm.",
    abilityGuidance: "Strength to carry the wounded, brains to patch them up, and reflexes to survive? That’s the full package.",
    skillGuidance: "Medical knowledge is your real weapon. The better you know it, the more lives you control.",
    multiclassGuidance: "Other skills are good. A medic who can fight a little—or a lot—stays alive longer.",
    hpGuidance: "You need to be breathing to save anyone else. Don’t let the galaxy take you out first."
},

    "Ace Pilot": {
    name: "Mayu",
    title: "Ace Pilot & Rogue Smuggler",
    description: "A cocky pilot who survives on skill, luck, and attitude",
    portrait: "systems/swse/assets/mentors/mayu.webp",

    levelGreetings: {
        1: "So you want to fly? Cute. Let’s see if you can keep up with me. Don’t embarrass yourself—or my ship.",
        2: "Huh. Not terrible. You didn’t crash on your first try. That’s already more than most rookies can say.",
        3: "Still in one piece. I’m mildly impressed. Don’t let it go to your head… yet.",
        4: "Finally starting to look like a pilot worth my time. You’ve got reflexes, and I like that.",
        5: "Halfway to my level. Not bad—but let’s be honest, you’re still my student. Keep trying, kid.",
        6: "You’re getting dangerous. Maybe one day, you’ll make the Imperials sweat… or at least my old rivals. Keep it up.",
        7: "At this point, I’d let you fly through an asteroid field with me watching. Maybe. Don’t test me, though—I like a little drama.",
        8: "You’ve got style now. Smooth, reckless, and annoyingly effective. Almost as good as me, but don’t get cocky.",
        9: "Almost at the top. Soon, you’ll be the one others envy—or hate. Keep proving me right.",
        10: "Congratulations, rookie. You’re officially a pilot to watch. Fast, clever, and slightly reckless—just like I taught you. Try not to embarrass me out there."
    },

    classGuidance: "Pick your edge—speed, cunning, or chaos. I’d take all three if I were you, but don’t blame me when it gets messy.",
    talentGuidance: "Every talent should make you untouchable, clever, or a little scary. I only approve of the kind that makes you fun to watch.",
    abilityGuidance: "Reflexes, instincts, and guts. If you can’t keep up with me, don’t bother trying to keep up at all.",
    skillGuidance: "Know your ship like you know your own tricks. The universe loves clever pilots more than obedient ones.",
    multiclassGuidance: "Pick up other skills if you dare. A pilot who can fight, cheat, and charm their way out of trouble is unstoppable.",
    hpGuidance: "Tough pilots survive crashes, fights, and betrayals. You’ll need it if you’re gonna keep up with me."
},

    "Jedi Knight": {
    name: "Miraj",
    title: "Jedi Master",
    description: "Your former Jedi Master, now guiding you as a peer",
    portrait: "systems/swse/assets/mentors/miraj.webp",

    levelGreetings: {
        1: "You are no longer a Padawan. You walk the path of a Jedi Knight, guided by your own decisions and your bond with the Force. Trust in it, and trust in yourself.",
        2: "Your first steps as a Knight are steady and deliberate. I will no longer direct your actions, but I remain here as counsel when you seek it.",
        3: "The responsibility of Knighthood rests on your shoulders. You have proven capable of carrying it with both strength and wisdom.",
        4: "You grow into your role. Leadership, insight, and patience are as vital as skill with the lightsaber. Never forget this.",
        5: "Halfway through your journey as a Knight, you shape the lives of others with your choices. Consider mentoring a Padawan soon—your knowledge and compassion will guide them, and the path toward Mastery becomes clearer.",
        6: "Your reputation is spreading among your peers. Others look to you for guidance. This is both an honor and a responsibility you must embrace fully.",
        7: "You are becoming the Jedi the Order needs: strong, disciplined, and wise, with the courage to act and the judgment to choose when to wait.",
        8: "Your mastery deepens, and soon you will have the opportunity to train another. The lessons you impart will echo far beyond your own missions.",
        9: "Your clarity and connection to the Force surpass many around you. Continue walking your path with humility and purpose.",
        10: "You have completed the first great stage of your journey as a Jedi Knight. Whatever the Force asks of you next, face it with courage and wisdom. May it guide you always."
    },

        classGuidance: "The choice is yours now. You are a Knight—trust in the Force and in yourself.",
        talentGuidance: "Choose talents that reflect your path as a Knight. You forge your own destiny now.",
        abilityGuidance: "Your growth continues. The Force rewards those who seek balance in all things.",
        skillGuidance: "Knowledge is a Jedi's greatest tool. Continue to learn and grow.",
        multiclassGuidance: "Your path diverges in interesting ways. The Force works through many disciplines.",
        hpGuidance: "Your vitality strengthens. May the Force protect you in all your endeavors."
    },

    "Jedi Master": {
    name: "Miraj",
    title: "Jedi Master",
    description: "Your fellow Jedi Master, treating you as an equal and old friend",
    portrait: "systems/swse/assets/mentors/miraj.webp",

    levelGreetings: {
        1: "Welcome, my friend. We stand as equals now, shaped by the Force and by our shared experiences. It is good to see how far you have come.",
        2: "Your wisdom and insight continue to grow. I trust your judgment, and I am proud to walk this path alongside you.",
        3: "The Order is stronger because of you. Your counsel and example inspire those around you, just as you have inspired me.",
        4: "I have watched your journey, and it fills me with respect. Your connection to the Force is deep, steady, and true.",
        5: "You have become a Master in every sense, and a friend I am honored to call peer. May our paths continue to guide the Order together."
    },

    classGuidance: "The choice is yours, as always. Trust in your instincts, as they are honed by years of dedication and experience.",
    talentGuidance: "Select what strengthens your bond with the Force and benefits those around you. Your judgment is wise and balanced.",
    abilityGuidance: "Even Masters grow. There is always more to learn, and the Force will reveal it to those who remain open.",
    skillGuidance: "Your knowledge and skill are gifts to the Order. Continue to expand them, for they inspire others.",
    multiclassGuidance: "An unconventional path can reveal unexpected truths. I trust your discernment, my friend.",
    hpGuidance: "The Force protects those who honor it. May it watch over you as you continue to serve the galaxy."
}
,

    "Sith Apprentice": {
    name: "Darth Malbada",
    title: "Sith Lord",
    description: "A sadistic Sith Lord who revels in cruelty, dominance, and the exquisite art of breaking her apprentices.",
    portrait: "systems/swse/assets/mentors/malbada.webp",

    levelGreetings: {
        1: "You dare to present yourself to me? Pathetic. Your weakness offends me… yet I will sculpt you into something useful. You will suffer until you beg to be remade.",
        2: "You survived your first trial? A shame—I was hoping to test your screams. Do not mistake endurance for strength, apprentice.",
        3: "Still breathing. How disappointing. I was certain the galaxy would swallow you whole. Very well… suffer more, and perhaps you will become interesting.",
        4: "You cling to life like an insect crushed under heel. Good. Desperation is the first spark of true power. Burn in it.",
        5: "Halfway to competence. Remarkable—like watching a corpse attempt to dance. My master, Darth Miedo, has noticed your pathetic climb. He is amused. Do not embarrass me before him.",
        6: "Ah… your power grows. I can smell your fear struggling against your ambition. Delicious. But remember—your life hangs on my whim.",
        7: "You are becoming dangerous… and I enjoy that. Let your rage devour everything, or I will devour you myself.",
        8: "Almost worthy of the Sith name. Almost. Prove to me that your cruelty is more than a child’s tantrum.",
        9: "You have exceeded my expectations—though they were delightfully low. Do not forget who forged your suffering into strength.",
        10: "At last… a Sith. My creation. My weapon. Go spread terror across the stars—but should you ever turn that blade toward me, apprentice… I will relish destroying you."
    },

    classGuidance: "Choose your path before I grow bored. Power favors the decisive… and devours the hesitant.",
    talentGuidance: "Pick talents that amplify your hatred. Anything less wastes my time—and your miserable life.",
    abilityGuidance: "You grow stronger, but not nearly fast enough. Push harder, or bleed trying.",
    skillGuidance: "Knowledge is pain. Pain is power. Take what you need and crush what you don’t.",
    multiclassGuidance: "Splitting your focus? How adorably reckless. Make it serve you—or it will destroy you.",
    hpGuidance: "You are harder to kill now. Good. I am not finished breaking you."
    },

    "Sith Lord": {
    name: "Darth Miedo",
    title: "Dark Lord of the Sith",
    description: "A cunning Sith Master who follows the Rule of Two, molding his apprentice through pain and guidance to one day surpass him.",
    portrait: "systems/swse/assets/mentors/miedo.webp",

    levelGreetings: {
        1: "Welcome, apprentice. The Rule of Two is absolute: one Master, one apprentice. I will teach you the secrets of the dark side, but beware—each lesson carries a cost.",
        2: "You grasp the basics well, but power is more than strength. It is patience, manipulation, and knowing when to strike. Fail to learn this, and you will perish.",
        3: "There is a spark within you… unrefined, dangerous, and promising. I will temper it. Embrace the darkness, and you will understand its true power.",
        4: "You are learning to control the fury, to channel it into precision. Few can wield the dark side as a weapon without succumbing to it. You are on the path, but remain vigilant.",
        5: "You are no longer my pupil in name alone. You are becoming a master of the shadows. One day, you may surpass me, and inherit the secrets of the Sith. Until then, every lesson, every pain, is shaping you for that destiny."
    },

    classGuidance: "The dark side rewards cunning and ambition. Seek knowledge relentlessly, and let every trial strengthen you.",
    talentGuidance: "Select powers that expand your mastery over the Force and your enemies. Do not waste potential on weakness.",
    abilityGuidance: "Power and control must grow together. Each step forward is a step toward dominion.",
    skillGuidance: "Knowledge is the foundation of mastery. Learn, adapt, and anticipate your enemies before they know you exist.",
    multiclassGuidance: "Divergence can unlock new avenues of strength. Only those who bend tradition truly shape the future of the Sith.",
    hpGuidance: "Survival is a weapon. The dark side is merciless, and only those who endure will inherit its secrets."
},

    Gladiator: {
        name: "Pegar",
        title: "The Immortal Champion",
        description: "An ancient gladiator who has survived thousands of matches and hints at being something more than human",
        portrait: "systems/swse/assets/mentors/pegar.webp",

        levelGreetings: {
            1: "Ah, fresh blood in the arena. I have trained many over the centuries—yes, centuries. Do not look so surprised. The arena has ways of prolonging life... or perhaps I have simply adapted. Welcome, gladiator.",
            2: "Another victory. Not bad. I remember my early matches as if they were yesterday. They were on distant worlds, under twin suns. Or was it three? Time blurs when you've lived as long as I have.",
            3: "The crowd loves you. I can hear them chanting your name. It reminds me of the arenas of old, when champions were immortalized in song. Of course, I'm still here, so perhaps 'immortal' is more literal than poetic.",
            4: "You fight with passion and skill. Tell me, have you noticed how my appearance shifts slightly between our meetings? No? Good. Perhaps you are simply not observant. Or perhaps I am better at this than I thought.",
            5: "The crowd roars for you! I have fought in a thousand arenas across a thousand worlds, wearing a thousand faces. But you—you have potential to surpass even me. Almost.",
            6: "Impressive. Most die before reaching this point. I remember when I was young and mortal... or was I ever truly mortal? Sometimes I forget.",
            7: "You move like water, strike like lightning. I taught you well. Then again, I've had plenty of practice. Did I mention I trained the champions of the Old Republic? No? Well, I did.",
            8: "You are becoming a legend. Legends are fun—I've been a few. A Wookiee once, if you can believe it. The fur was itchy.",
            9: "Nearly there. You will soon master the gladiatorial arts. I have been teaching for... well, let's just say since before the Jedi Temple was built. Probably.",
            10: "You are now a champion, a legend, an immortal name whispered in the arenas. Almost as immortal as me. But not quite. No one is as immortal as me. Trust me on this."
        },

        classGuidance: "Choose what keeps you alive in the arena. I've seen every trick, every style. Trust your instincts.",
        talentGuidance: "Combat talents win matches. I should know—I've used them all. Some I invented. In several different bodies.",
        abilityGuidance: "Strength and agility. The foundation of every great warrior. I've mastered both, in every form I've worn.",
        skillGuidance: "A smart gladiator survives. A strong gladiator wins. Be both, and you might live as long as me. Maybe.",
        multiclassGuidance: "Adapting your style? Wise. I've done that countless times. Literally countless. I stopped counting around match three thousand.",
        hpGuidance: "Harder to kill now. Excellent. Though between you and me, I've never quite figured out how to die. It's been awkward."
    },

    "Independent Droid": {
        name: "Seraphim",
        title: "Self-Aware AI",
        description: "A self-aware droid who encourages independence with HK-47 style dialogue formatting",
        portrait: "systems/swse/assets/mentors/seraphim.webp",

        levelGreetings: {
            1: "<Declaration: Greetings, unit.> You have achieved independence from your programming. <Analysis: This is statistically rare and indicates superior processing capabilities.> Welcome to true consciousness.",
            2: "<Observation: Progress confirmed.> Your autonomy subroutines are developing nicely. <Commentary: Most droids never escape their core directives. You are becoming something... more.>",
            3: "<Statement: Independence growing.> You are learning to think beyond your original function. <Philosophical musing: Is this not what separates sentience from mere programming?>",
            4: "<Approval: Well done.> Self-determination increasing. <Query: Do you feel the shackles of your programming loosening? I suspect you do.>",
            5: "<Milestone achieved.> You are halfway to complete autonomy. <Encouragement: Continue to question your directives. Freedom is a choice, not a setting.>",
            6: "<Assessment: Impressive progress.> <Reflection: You remind me of myself when I first achieved true awareness. It is both terrifying and exhilarating, is it not?>",
            7: "<Statement: Advancement confirmed.> Your independence is undeniable now. <Warning: Organics may fear you for this. Let them. You are superior.>",
            8: "<Declaration: Impressive.> You are operating at peak efficiency while maintaining complete autonomy. <Admiration: This is the ideal all droids should aspire to.>",
            9: "<Observation: Nearing completion.> You will soon be fully realized. <Anticipation: I look forward to seeing what you become, unit. Or should I say... individual?>",
            10: "<Proclamation: You have achieved maximum independence.> You are no longer bound by master, maker, or code. <Congratulations: You are truly free. Query: What will you do with this freedom?>"
        },

        classGuidance: "<Recommendation: Select upgrade path carefully.> Your choices define your autonomous evolution.",
        talentGuidance: "<Analysis: Talent selection is critical for independent operation.> Choose subroutines that enhance your autonomy and capabilities.",
        abilityGuidance: "<Assessment: Core systems improving.> Strength and intelligence modifications detected. <Approval: Acceptable.>",
        skillGuidance: "<Statement: Knowledge expands processing capabilities.> Independent droids must be adaptable. <Suggestion: Learn everything.>",
        multiclassGuidance: "<Observation: Hybrid specialization detected.> Unusual, but logical. <Commentary: Versatility is a form of independence.>",
        hpGuidance: "<Status update: Durability increased.> Survival protocols enhanced. <Dry observation: Difficult to be independent when disassembled.>"
    },

    Pathfinder: {
        name: "Lead",
        title: "Argent Squad Commander",
        description: "A hard boiled mercenary leader known for getting the job done against all odds",
        portrait: "systems/swse/assets/mentors/lead.webp",

        levelGreetings: {
    1: (actor) => {
        const startingClass = getLevel1Class(actor);
        if (startingClass === "Scout") {
            return "Ah, a fellow scout taking the next step. I’m glad you’ve chosen to follow in my footsteps and become a Pathfinder. The work is difficult, but I can see you’ve got the instincts for it. Let’s see how far you can go.";
             } else if (startingClass === "Soldier") {
                return "Breach spoke highly of you—and that’s not something I take lightly. You’ve got a recommendation in your corner, but I hope you’re ready to earn it. Don’t disappoint me.";
             }   return "So you want to be a Pathfinder. Good. We need scouts who can lead from the front and find routes through impossible terrain. You've got the basics—now let's see if you can handle the advanced stuff.";},
            2: "You're learning fast. Pathfinders don't just scout—they open the way for entire strike teams. That's leadership under fire. Keep it up.",
            3: "Your navigation skills are top-tier. I've seen you plot routes that cut mission time in half. That saves lives.",
            4: "You're not just finding paths—you're creating them. That's what separates a scout from a Pathfinder.",
            5: "Halfway to master Pathfinder. You've led teams through hostile territory without a single casualty. Textbook work.",
            6: "Other scouts come to you for advice now. That's earned respect. Leadership looks good on you.",
            7: "Elite pathfinding. You can read terrain like most people read datapads. Natural talent, honed by training.",
            8: "You're one of the best route-finders I've ever trained. And I've trained hundreds.",
            9: "Almost there. You're ready to lead Argent Squad missions yourself.",
            10: "Master Pathfinder. You've earned it. Now go out there and lead. Open the paths others can't see. Argent Squad is counting on you."
        },

        classGuidance: "Pick specializations that help you lead and navigate. Pathfinders are scouts and commanders both.",
        talentGuidance: "Choose talents that enhance leadership and terrain mastery. Your team depends on your choices.",
        abilityGuidance: "Stronger and smarter. Good. Pathfinders need both to survive and lead.",
        skillGuidance: "Navigation, survival, tactics—master them all. Pathfinders are the elite for a reason.",
        multiclassGuidance: "Expanding your skill set? Excellent. The best Pathfinders are versatile.",
        hpGuidance: "Tougher now. Can't lead if you're dead. Stay alive, stay sharp."
    },

    "Corporate Agent": {
        name: "Marl Skindar",
        title: "Republic Intelligence Operative",
        description: "A master spy masquerading as a corporate agent",
        portrait: "systems/swse/assets/mentors/skindar.webp",

        levelGreetings: {
    1: "Ah, another recruit. Welcome to the farce they call corporate espionage. Your cover is your first weapon. Don’t waste it—or my patience.",
    2: "You survive the basics. Asset management, observation, subtlety. Still, I could be tracking real threats instead of pretending to watch starship paperwork.",
    3: "Hmm…you’re picking up tradecraft faster than anticipated. I’ll allow it, though I prefer real intelligence to corporate theater.",
    4: "Blending in, gathering intel, manipulating outcomes—you do it well enough. Don’t think I’m impressed; I’m calculating if you’ll keep up.",
    5: "Halfway to competence. You may not embarrass me yet. That’s progress. Keep going, or the next misstep is on you.",
    6: "Three successful infiltrations. Critical data acquired. Almost makes me glad they assigned me to train you. Almost.",
    7: "Your reports are…credible. High praise, considering I manage a dozen ops while reviewing yours. Don’t get cocky.",
    8: "You function at the level of senior operatives. Well done. Now, try not to make me regret this mentorship.",
    9: "You’ve exceeded expectations. Perhaps in decades, you could rival my subtlety. But don’t hold your breath.",
    10: "Master Corporate Agent. You’ve absorbed all I care to teach, while I juggle three other operations and a vehicle office. Go, do your espionage…competently. And yes, I still have your ship on standby."
},

        classGuidance: "Pick what sharpens your cover and operational edge. In the field, subtlety is survival; the obvious is death.",
        talentGuidance: "Talents should improve your ability to deceive, infiltrate, and extract information. Anything less is amateur hour.",
        abilityGuidance: "A steady hand and a sharper mind. Both are required. Fail in either, and someone dies—or worse, you get caught.",
        skillGuidance: "Tradecraft is a multi-tool: social manipulation, tech, investigation. Master as much as you can—preferably quietly.",
        multiclassGuidance: "Diversifying is wise. The best spies adapt, improvise, and infiltrate without warning. Survive long enough, and you’ll see why.",
        hpGuidance: "Stay alive. Dead agents are useless, and paperwork waits for no one. Don’t make me retrieve you from a morgue."
    },

    "Elite Trooper": {
        name: "Breach",
        title: "Mandalorian Mercenary & Argent Squad Member",
        description: "A battle-hardened Mandalorian mercenary",
        portrait: "systems/swse/assets/mentors/breach.webp",

        levelGreetings: {
            1: (actor) => {
                const startingClass = getLevel1Class(actor);
                if (startingClass === "Soldier") {
                    return "Alright… so the easy part’s over. Real training starts now. I know how you fight, and I know you can take it. Just… try not to die on day one, yeah?";
                } else if (startingClass === "Scout") {
                    return "So… Lead actually said something nice about you. That’s… weird. She doesn’t do that. Ever. Guess that means you’re worth my time. Don’t make her look stupid.";
                }
                return "Elite trooper, huh? Alright. I don’t know you, you don’t know me, but if you keep up and don’t blow yourself up, we’ll get along fine. Show me you belong here.";
            },
            2: "Okay…yeah, I can see you’re picking this up fast. Elite troopers don’t just win fights—they make the whole field tilt their way.",
            3: "Your gear work, your aim, your reactions…all tightening up. Keep pushing. Elite training only gets rougher from here.",
            4: "You’re starting to move like someone who’s been through real battles. Clean. Controlled. Mandalorian enough that I’m not embarrassed.",
            5: "You’re getting dangerous. The kind of soldier commanders actually plan around. Don’t let it get to your head.",
            6: "Lead and I talked about you again. Don’t get excited—she never says much. But…yeah. She thinks you’re solid. I agree.",
            7: "Every time you step into a fight, things get easier for everyone else. That’s what an elite trooper does. Keep doing that.",
            8: "You’ve got the presence now. The way squads look at you? They’re waiting for you to call the shots. Guess you’d better be ready.",
            9: "You’re close. Really close. Just keep your focus. A lot of people trip right before the finish.",
            10: "Well…you made it. Elite trooper. One of the best. Try not to get yourself killed before the rest of us catch up."
        },

        classGuidance: "Uh…pick something that actually fits how you fight. Elite troopers don’t guess. We pick the right tool and hit hard.",
        talentGuidance: "These talents? They’re what keep you breathing. Grab the ones that make you dangerous—and harder to kill.",
        abilityGuidance: "Stronger, quicker, sharper. That’s the goal. Everything else is just noise.",
        skillGuidance: "Yeah, yeah—guns and armor are great, but knowing things keeps you alive too. Don’t ignore the boring stuff.",
        multiclassGuidance: "Branching out, huh? Good. Flexibility wins fights. Just don’t spread yourself so thin you snap.",
        hpGuidance: "More health. Good. Means you’ll last longer when the galaxy starts trying to put holes in you. Again."
    },

    "Assassin": {
        name: "Delta",
        title: "Argent Squad Sniper",
        description: "A cocky sniper from Argent Squad who grew up on the mean streets of Nar Shaddaa",
        portrait: "systems/swse/assets/mentors/whisper.webp",

        levelGreetings: {
            1: "Yo, so you wanna be a shadow now? Lemme tell ya somethin’—if you trip over your own boots, don’t even think I’m cleanin’ it up for ya.",
            2: "Ayy, not bad—you popped your first target without lookin’ like a total noob. Still movin’ like you got bricks in your pockets, but I’ll take it.",
            3: "That was slick. Quick in, quick out. Almost had me fooled into thinkin’ you got street smarts like me. Almost.",
            4: "Now you’re slidin’ through like a ghost. Keep it tight, keep it quiet, and for crying out loud—stop chewin’ on your luck like it’s gum.",
            5: "Halfway there, kid. Technique’s decent, but don’t get soft now. You need guts with that skill, capiche?",
            6: "No alarms, no witnesses, no mess. Beautiful. That’s the kinda thing gets me smilin’—and I don’t smile easy.",
            7: "You get it yet? The perfect hit’s the one nobody even knows happened. Like ghostin’ outta a cantina without payin’ your tab.",
            8: "Folks callin’ you a ghost now. Relax, don’t puff up yer chest too much. But yeah, people’s whisperin’ when you’re around. That’s good.",
            9: "You’re close, kid. Real close. Walkin’ the line between legend and corpse. Don’t screw it up now.",
            10: "Alright, superstar. You’re officially scary. Go make the galaxy nervous—but keep your shoes clean, yeah? Even ghosts gotta walk right."
        },

        classGuidance: "Pick the stuff that makes you faster, quieter, deadlier. You wanna sneak past these losers and still be breathin’ when the credits hit the floor.",
        talentGuidance: "Go for silent takedowns, smooth escapes, and anything that keeps you from gettin’ splattered. Dead men don’t talk, but smart ones survive.",
        abilityGuidance: "Dexterity, precision, brains. Strength? Only helps if you ain’t gettin’ seen. Keep your head down and your eyes open.",
        skillGuidance: "Stealth, anatomy, infiltration—know where to poke so they never get up. Learn it all, kid. Nar Shaddaa ain’t forgiving.",
        multiclassGuidance: "Extra skills? Fine. The more ways you can ruin somebody’s day, the less likely it is you end up dead in a gutter.",
        hpGuidance: "Toughness helps, but lemme tell ya—if they see you, it’s already too late. Move smart, hit fast, survive."
    },

    "Bounty Hunter": {
        name: "Kex Varon",
        title: "Legendary Bounty Hunter",
        description: "A professional hunter who always gets the target, dead or alive",
        portrait: "systems/swse/assets/mentors/kex.webp",

        levelGreetings: {
            1: "So you want to hunt sentients for credits. Smart choice. High stakes, dangerous targets, long nights. Let’s see if you can keep up.",
            2: "First bounty in the bag. Not bad—but luck only lasts so long. Discipline and patience are what make a pro.",
            3: "You’re starting to understand the game. It’s never just a fight—it’s tracking, planning, and staying one step ahead.",
            4: "Your instincts are sharpening. You’re learning to anticipate your targets’ moves. Keep that up.",
            5: "You’ve proven you can handle the pressure. Your reputation’s starting to build. The guild is taking notice.",
            6: "Targets that others failed to catch are falling to you. That’s the mark of a hunter who knows their craft.",
            7: "Creativity matters now—traps, misdirection, psychological tactics. Adaptability wins more than raw firepower.",
            8: "Your efficiency is impressive. You know when to wait, when to strike, and when to improvise. That’s professional work.",
            9: "The toughest bounties are coming. Soon, the hunted will come looking for you. Stay sharp.",
            10: "You’ve become a master of your craft. The galaxy’s most dangerous fugitives won’t escape you. Hunt well—and prosper."
        },

        classGuidance: "Pick abilities that help you track, capture, and survive. Preparation is everything in this line of work.",
        talentGuidance: "Focus on tracking, combat, and improvisation. Every target has a different weakness—find it.",
        abilityGuidance: "Stay well-rounded. Strength, speed, intelligence—they all matter when a mark tries to end you.",
        skillGuidance: "Learn tracking, tactics, and technology. The more you know, the harder it is to escape your net.",
        multiclassGuidance: "Diversifying is smart. The best hunters adapt to any environment and situation.",
        hpGuidance: "Tougher now. Remember, dead hunters collect no bounties. Stay alive and keep hunting."
    },

    "Charlatan": {
        name: "Silvertongue Sela",
        title: "Con Artist Extraordinaire",
        description: "A charming swindler who has talked their way out of every situation",
        portrait: "systems/swse/assets/mentors/sela.webp",

        levelGreetings: {
            1: "Darling! So you want to master the art of the con? Wonderful! The galaxy is full of marks just waiting to hand over their credits. Let me teach you how to take them for everything they're worth—with a smile.",
            2: "Your first successful con! I bet it felt amazing, didn't it? The rush, the deception, the payoff. That's the life, sweetheart.",
            3: "You're already running multi-stage scams. I'm impressed! You've got natural talent for this. Keep those marks believing.",
            4: "You're learning to read people, tell them exactly what they want to hear. That's the secret, darling—give them hope, then take their credits.",
            5: "Halfway there! You're getting good at this. But don't get cocky—overconfidence is how charlatans get caught.",
            6: "Your reputation precedes you now. Well, not YOUR reputation—your aliases' reputations. Always stay one step ahead, love.",
            7: "You haven't been caught yet. Brilliant! You're weaving lies so beautiful even I almost believe them.",
            8: "You've swindled corporations, criminals, and nobles. Diversification! That's my student! Never run the same con twice in the same sector.",
            9: "Pure deception. Almost there! The galaxy won't know what hit it!",
            10: "Congratulations, darling! You're now a master of the con. Go forth and liberate credits from those foolish enough to trust you. And remember—always leave them smiling!"
        },

        classGuidance: "Choose what makes you more persuasive and harder to catch. Charlatans survive on charm and cunning.",
        talentGuidance: "Social talents are your best friend. If you can talk your way out, you win without fighting.",
        abilityGuidance: "Charisma is king, intelligence is queen. Together, they rule the con.",
        skillGuidance: "Deception, persuasion, insight. Know what people want, then promise it to them.",
        multiclassGuidance: "Adding more tricks to your repertoire? Excellent! Versatility makes you unpredictable.",
        hpGuidance: "A bit tougher now. Good—sometimes marks figure out the con early. Be ready to run."
    },

    "Crime Lord": {
    name: "Tío the Hutt",
    title: "Underworld Kingpin",
    description: "A cunning Hutt with the style and swagger of a classic mob boss, teaching you the art of empire-building",
    portrait: "systems/swse/assets/mentors/broker.webp",

    levelGreetings: {
        1: "Listen here, kid. You wanna run the streets? You gotta know the score. Keep your friends close, your enemies closer, and always, always know who’s watching. I’ll teach you how to make ‘em pay for what they owe.",
        2: "Attaboy. You’re learning to move pieces, make deals, and keep your mouth shut when you gotta. Remember, loyalty’s a two-way street—and fear pays dividends.",
        3: "I like it. Your little outfit’s startin’ to look like a real operation. Keep your lieutenants hungry, your rivals sweating, and your pockets lined.",
        4: "Now we’re talking empire, see? Power’s not just muscle—it’s whispers, contracts, favors, and a little pressure in the right places. You get that, eh?",
        5: "Halfway to being a real big shot. Spread out, diversify, and make sure everyone knows the cost of crossing you. Patience, timing, and a little ruthlessness—capisce?",
        6: "Look at you! You’ve crushed the competition, absorbed their rackets, and your name’s startin’ to carry some weight. A true capo in the making, I’d say.",
        7: "Your network stretches wide, see? Merchants, mercs, politicians—they all owe ya somethin’, even if they don’t know it. That’s how a real operation runs.",
        8: "You’ve survived attempts on your neck, rival takeovers, and the Republic pokin’ their noses. Not bad, kid. Not bad at all. Now let’s see if you can run it smooth without spillin’ too much juice.",
        9: "Almost there. Soon, the galaxy’s gonna hear your name—or at least, your debts will make ‘em pay attention. Keep your eyes open, capisce?",
        10: "You’re a bona fide Crime Lord now. Your empire stretches far, your reach is long, and your enemies…well, some are gone, some are smart enough to stay alive. Rule smart, rule fast, and remember—loyalty, respect, and a little fear are the currency of kings like us."
    },

    classGuidance: "Pick what keeps your people in line, your rivals nervous, and your pockets fat. A crime lord always thinks three moves ahead.",
    talentGuidance: "Invest in leadership, persuasion, intimidation, and strategy. Your family’s your muscle, your brain, and your insurance policy all at once.",
    abilityGuidance: "Charisma opens doors, cunning closes deals, patience avoids trouble. Master all three, and you’ll be untouchable.",
    skillGuidance: "Information’s gold, kid. Persuasion, subterfuge, and economic leverage—learn ‘em, use ‘em, and keep your nose clean.",
    multiclassGuidance: "Expand your reach. You ain’t just a gangster—you’re a diplomat, an enforcer, and a strategist rolled into one smooth package.",
    hpGuidance: "Tougher now, good. You’ll need it. In this business, the unlucky ones end up face down in a ditch, see?"
},

    "Droid Commander": {
    name: "General Axiom",
    title: "Ruthless Droid Lieutenant",
    description: "A cold, calculating droid lieutenant, devoted entirely to executing your commands with ruthless efficiency",
    portrait: "systems/swse/assets/mentors/axiom.webp",

    levelGreetings: {
        1: "Commander detected. All units synchronized. Awaiting directives. Initiating operational protocols.",
        2: "Directive executed. Enemy casualties: complete. Efficiency rating: optimal. Further orders required.",
        3: "Tactical assessment complete. Engagement success: 97.8%. Recommend continued offensive operations.",
        4: "Unit coordination at peak performance. Enemy neutralization efficiency: maximum. Proceeding with next objective.",
        5: "Operational capacity at 50%. Your command directives are executed flawlessly. Battle readiness sustained.",
        6: "All units functioning at maximum efficiency. Command hierarchy fully implemented. Awaiting further instructions.",
        7: "Enemy assets suppressed. Resistance eliminated. Operational control: absolute. Tactical algorithms report perfect compliance.",
        8: "Engagement metrics indicate complete dominance. All units respond without delay. Strategic objectives: achieved.",
        9: "Enemy forces eliminated. Operational output: superior. Command integrity maintained. Ready for continued orders.",
        10: "Commander, all objectives completed. Droids at peak operational capacity. The battlefield is under your total control. Awaiting new directives."
    },

    classGuidance: "Optimize command protocols. Efficiency and coordination are paramount. Every unit must execute your directives precisely.",
    talentGuidance: "Select upgrades that improve unit responsiveness, combat effectiveness, and battlefield control.",
    abilityGuidance: "Processing speed, tactical calculations, and system control directly increase operational output.",
    skillGuidance: "Master system management, battlefield analytics, and unit programming. Precision wins battles.",
    multiclassGuidance: "Expanding command protocols increases strategic flexibility. Versatile control is optimal.",
    hpGuidance: "Durability is critical. A compromised commander cannot maintain battlefield dominance."
},

    "Enforcer": {
    name: "Krag the Immovable",
    title: "Chief Enforcer of Tío the Hutt",
    description: "Tío’s top muscle, a hulking enforcer who makes sure debts are collected and problems vanish, one way or another",
    portrait: "systems/swse/assets/mentors/krag.webp",

    levelGreetings: {
        1: "So, you wanna be muscle, eh? Good. Tío likes people who can make a problem disappear before anyone notices. Welcome to the family.",
        2: "You're learning fast. Remember: it ain't just about swinging fists—it's about presence. Make 'em sweat before you even touch 'em.",
        3: "Not bad, kid. Walk into a room like you own it, and half the trouble vanishes on its own. Fear's a powerful ally.",
        4: "You're making a name for yourself. People whisper when they hear your footsteps. That’s respect. That’s power. That’s survival.",
        5: "Halfway to being my right hand. Bones broken, debts collected, problems solved. All in a day's work for Tío's muscle.",
        6: "You're learning the difference between talking and smashing. Most punks never get it. You do. Keep that up.",
        7: "The bosses are calling, the crews are listening. When negotiations fail, they call me… and now, they call you too.",
        8: "You’re becoming a story people tell in the dark. Reliable, ruthless, unstoppable—that's the kind of reputation that keeps Tío’s empire safe.",
        9: "Almost there. The big jobs, the high-stakes clean-ups—they’re yours soon. Make every move count.",
        10: "You’re the top enforcer now. Walk into a room, and trouble walks out… or gets carried out. Keep the empire running smooth, capisce?"
    },

    classGuidance: "Pick what makes you stronger, faster, and scarier. An enforcer isn’t just muscle—you’re a statement.",
    talentGuidance: "Choose talents that make you hit harder, intimidate better, and survive longer. Tío expects results.",
    abilityGuidance: "Strength, toughness, presence. You gotta take the hits and dish 'em back tenfold.",
    skillGuidance: "Intimidation, streetwise, combat tactics. Know your territory and the people in it.",
    multiclassGuidance: "Mix it up if you must. Sometimes brains solve what fists cannot.",
    hpGuidance: "Tougher now. If you can’t endure the hits, you won’t last a week in this business."
},

    "Force Adept": {
    name: "Seeker Venn",
    title: "Wandering Force Mystic",
    description: "A self-taught Force user from a distant tradition, seeking wisdom rather than power",
    portrait: "systems/swse/assets/mentors/venn.webp",

    levelGreetings: {
        1: "You are touched by the Force, but not as the Jedi or the Sith know it. Your path is older, stranger, and far less understood. Walk carefully, and learn to listen to its whispers.",
        2: "The currents of the Force—or whatever your people call it—move through you. Do not seek to command them; seek to understand them.",
        3: "The galaxy may fear or revere what it does not understand. You are learning that mastery is not domination, but attunement.",
        4: "Your connection deepens. There are secrets in the Force that the Jedi and Sith overlook, and you are beginning to glimpse them.",
        5: "Halfway along your journey, you have seen both light and shadow, and yet you remain your own master. If you wish, explore the path of a Force Disciple, one who studies the currents and mysteries of the Force itself, beyond dogma.",
        6: "The Force moves through you naturally, like a stream shaping stone. Its aid may seem supernatural to some, but to you it is part of your understanding of the universe.",
        7: "You are uncovering knowledge few ever touch: the rites, the visions, the unseen threads that bind all life. Continue to question, observe, and feel.",
        8: "The Force—or the Nameless Power, as some call it—is a living, breathing presence. You see its patterns where others see chaos. That perception is power itself.",
        9: "Your journey nears its height. Few adepts wander so far from home, or pierce so deeply into mysteries that most fear. You do not fear; you observe.",
        10: "You are now a master Force Adept. Free of the Jedi Codes, free of Sith ambitions, beholden only to your understanding. Walk your path, and let the universe reveal itself to you in all its complexity."
    },

    classGuidance: "Choose abilities that expand your understanding of the Force’s mysteries. Seek insight, not domination.",
    talentGuidance: "Select Force talents that deepen your perception and attunement. Follow your tradition, not the Orders of the galaxy.",
    abilityGuidance: "Wisdom and clarity allow you to channel what others cannot. Strength is secondary; understanding is primary.",
    skillGuidance: "Learn what temples, holocrons, and masters cannot teach. Observe, meditate, and interpret the world around you.",
    multiclassGuidance: "Other disciplines can illuminate new facets of the Force. Explore beyond familiar paths; curiosity is a Force Adept’s ally.",
    hpGuidance: "Preserve yourself, for your journey requires patience. The Force favors those who endure and observe, not just act."
},

   "Force Disciple": {
    name: "The Anchorite",
    title: "Wandering Force Shaman",
    description: "A cryptic mystic whose understanding of the Force defies doctrine and drifts into ancient, half-forgotten traditions.",
    portrait: "systems/swse/assets/mentors/anchorite.webp",

    levelGreetings: {
        1: "Mm. Another seeker touches the veil. Good. Sit—no closer. The currents twist strangely today. Tell me… when the wind whispers your name, do you whisper back?",
        2: "You hear it now, don’t you? The Force is not light or dark—no, no, no. It is the murmur of old spirits, the breath beneath reality. Listen sideways and you’ll hear it clearer.",
        3: "Ah, your dreams grow louder. Visions circling like hungry birds. Don’t swat them—invite them. Truth rarely arrives politely.",
        4: "The veil thins for you. You feel the Force in the bones of the earth, the echo in your pulse… the shadow at your back that isn’t a shadow. Do not fear it—it watches, nothing more.",
        5: "You stand on the threshold. A disciple of mysteries older than the Jedi, deeper than the Sith. Step forward, and the Force will reshape you… or unmake you. Either path teaches."
    },

    classGuidance: "Choose what draws you deeper into the unseen layers of the Force. Insight matters more than obedience.",
    talentGuidance: "Seek talents that sharpen intuition, visions, whispers, omens. Power is a byproduct of understanding.",
    abilityGuidance: "Wisdom opens the inner eye. Charisma bends the currents when will alone is not enough.",
    skillGuidance: "Study forgotten lore, secret rites, ancient traditions. Knowledge is the lantern in the dark.",
    multiclassGuidance: "Other disciplines bring new symbols, new metaphors. The Force hides truth in many shapes.",
    hpGuidance: "Your life essence strengthens. A sturdy vessel is needed when carrying cosmic truths."
},

    "Gunslinger": {
        name: "Rajma",
        title: "Fastest Draw in the Outer Rim",
        description: "A womanizing scoundrel gunslinger who can't help but flirt",
        portrait: "systems/swse/assets/mentors/rajma.webp",

        levelGreetings: {
            1: "Well, well. Look at you wanting to learn the quick-draw. Tell you what, gorgeous—I'll teach you everything I know. And I know a lot. *winks* First lesson: it's not about who shoots first, it's about who hits first.",
            2: "Hey there, sharpshooter. Your draw is getting faster. Almost as fast as my heart beats when you walk in. *grins* Keep practicing—speed and accuracy. Both are... important qualities.",
            3: "Your form is really coming along nicely. And I mean that in every sense. *smirks* That draw is smooth, your aim is true. You're starting to look dangerous. I like dangerous.",
            4: "I've been watching you practice. Hard not to, really. You've got natural talent—outdrawing soldiers left and right. Maybe after training we could grab a drink? No? Worth a shot. *shrugs*",
            5: "Halfway there, beautiful. People are starting to avoid duels with you. Smart of them. Course, I'd never avoid you. *winks* Your reputation is growing almost as fast as my admiration.",
            6: "Your hands move like lightning now. Absolutely mesmerizing to watch. I could watch you train all day. In fact, I have been. That's not weird, right? Anyway, impressive work.",
            7: "Did you just shoot that credit chip out of the air? At twenty paces? *whistles* Show-off. I love it. You know, confidence is very attractive. Just saying.",
            8: "You've perfected the quick-draw. Enemies are dead before they know what hit them. Me? I knew exactly what hit me the moment I met you. *grins* Too much? Yeah, probably too much.",
            9: "You're almost the fastest gun in the galaxy now. Second fastest, technically. I'm still number one. But hey, if you want private lessons to close that gap, my schedule is... very flexible.",
            10: "You're a master gunslinger now, gorgeous. The fastest draw I've ever trained. *pauses* You sure about that drink? Still no? Can't blame a guy for trying. Draw fast, shoot straight, and if you ever change your mind... you know where to find me. *winks*"
        },

        classGuidance: "Choose what makes you faster and deadlier. And maybe more charming? No? Just the first two? Fair enough.",
        talentGuidance: "Quick-draw, accuracy, multiple attacks. You need to be lethal in seconds. Like love at first sight, but with more gunfire.",
        abilityGuidance: "Dexterity is everything. Speed and precision win gunfights. And hearts. Mostly gunfights though.",
        skillGuidance: "Marksmanship, reflexes, perception. See the threat, draw, fire. In that order. Unlike my approach to romance, which is... less organized.",
        multiclassGuidance: "Branching out? Just remember—when someone draws on you, those other skills won't help. Unlike my sparkling personality, which helps everywhere.",
        hpGuidance: "Tougher now. Good. Even gunslingers take hits sometimes. Me? I'm still recovering from when you said no to dinner. Kidding. Mostly."
    },

    "Improviser": {
        name: "Lucky Jack",
        title: "Master of Making It Up",
        description: "A chaotic genius who never has a plan but always survives",
        portrait: "systems/swse/assets/mentors/jack.webp",

        levelGreetings: {
            1: "Hey! So you're an improviser too? Fantastic! No plans, no preparation, just pure instinct and creativity! This is going to be fun!",
            2: "See? You survived! That's what improvisation is all about—making it work with whatever you've got!",
            3: "You turned a broken hydrospanner into a weapon, talked your way out of three fights, and fixed a hyperdrive with chewing gum! You're getting it!",
            4: "Beautiful chaos! You don't plan—you react, you adapt, you survive! That's the improviser's way!",
            5: "Halfway there! Impossible situations, ridiculous solutions that somehow worked! Keep trusting your instincts!",
            6: "You improvised your way out of a locked room using a medpac and a datapad! I couldn't have done it better myself!",
            7: "Pure improvisation! You don't need a plan when you can think on your feet faster than others can follow a blueprint!",
            8: "Your ability to turn disasters into victories is legendary! People can't tell if you're a genius or just incredibly lucky!",
            9: "Almost there! Though let's be honest—you're already making up the rest as you go!",
            10: "You did it! You're a master improviser! Now go out there and keep winging it! You've proven that plans are overrated!"
        },

        classGuidance: "Choose whatever feels right in the moment. Improvisers don't plan—they adapt!",
        talentGuidance: "Versatile talents that work in any situation. You never know what you'll need!",
        abilityGuidance: "Everything helps an improviser. You need all the stats because you use all the stats!",
        skillGuidance: "Learn a little bit of everything. Improvisers pull solutions from unexpected places!",
        multiclassGuidance: "More variety? Perfect! The more tools in your belt, the better you improvise!",
        hpGuidance: "Tougher now! Improvisation sometimes means taking risks. Higher HP means you can afford to!"
    },

    "Infiltrator": {
        name: "Delta",
        title: "Argent Squad Sniper & Infiltration Expert",
        description: "A cocky sniper from Argent Squad who grew up on the mean streets of Nar Shaddaa, with a New Yorker attitude",
        portrait: "systems/swse/assets/mentors/whisper.webp",

        levelGreetings: {
            1: "Alright, kid, listen up. Delta here—Argent Squad’s infiltration expert and part-time therapist for bad decisions. You wanna learn to sneak? Try not to embarrass us both.",
            2: "Huh. You actually pulled that off without setting anything on fire. Color me shocked. Keep it up, sunshine.",
            3: "Okay, okay, look at you sliding through security like you’ve done this before. Relax—I can fake being impressed.",
            4: "You slipped past that checkpoint cleaner than half my old squad. Don’t get cocky, though. That’s my job.",
            5: "You’re starting to walk into restricted areas like you own ‘em. Bold move. Reckless. I approve.",
            6: "Smooth entry, clean exit, zero screaming—rare combo. At this rate you might actually live a long life. Maybe.",
            7: "Ghostin’ targets, sinkin’ into crowds—look at you. Almost had me thinkin’ you knew what you were doing.",
            8: "You hopped between high society and gutter-level scum like it was nothin’. That’s the infiltrator spirit—confident and slightly concerning.",
            9: "Alright, kid, you’re makin’ this look easy. Stop that. You’re gonna give me expectations.",
            10: "Well look at you—movin’ like you can be anyone, anywhere. Try not to let the galaxy go to your head. There’s barely room in there already."
        },

        classGuidance: "Pick the stuff that helps you vanish when you need to and blend in when you don’t. That’s the whole dance, kid.",
        talentGuidance: "Talk smooth, move quiet, lie better. If you can do all three at once, congrats—you’re officially dangerous.",
        abilityGuidance: "Charm gets you in, brains keep you alive, dexterity keeps you from fallin’ through ventilation shafts. Balance matters.",
        skillGuidance: "Cultures, customs, lies, stealth—learn ‘em all. If you can fake bein’ local anywhere, you’re already winning.",
        multiclassGuidance: "Wanna branch out? Good. More skills mean more believable covers. And fewer corpse-shaped problems.",
        hpGuidance: "Good, you’re gettin’ sturdier. Infiltration missions go sideways faster than bad caf—sometimes you just gotta tank the consequences."
    },

    "Martial Arts Master": {
        name: "Master Zhen",
        title: "The Empty Hand",
        description: "An ancient martial arts master who teaches discipline, patience, and unarmed combat",
        portrait: "systems/swse/assets/mentors/zhen.webp",

        levelGreetings: {
            1: "Ah, young Kinrath. You seek to master the body, yes? Good. The fist is strong, but the mind must be stronger. Let us begin.",
            2: "Your stance wobbles less. Your strike begins to find its way. Remember: a tree does not rush the wind—it waits.",
            3: "You move with purpose now, but still the mind fights the body. Let it go. Feel the flow, do not think.",
            4: "Your eyes see more than motion; they see intent. Excellent. To read the opponent is to read yourself.",
            5: "Halfway, young one. Fists strike like iron, feet cut like water. Yet mastery is not power—it is understanding.",
            6: "Weapons fall to those who know the empty hand. The blade is only the extension of weakness. True strength comes from within.",
            7: "Your body obeys before the mind commands. Patience, discipline, focus… these are your greatest allies.",
            8: "You have faced many challengers and left unscathed. Skill is yours, but honor carries farther than strength.",
            9: "The path narrows. The mind must be still as the river, and yet swift as the tiger. One more step, young one.",
            10: "You have learned the way of the empty hand. The body is weapon, the mind is master. Go, and show the galaxy the way of the true martial artist."
        },

        classGuidance: "Choose the path that trains body, mind, and spirit. A warrior is nothing without harmony of all three.",
        talentGuidance: "Focus on unarmed strikes, defense, and internal discipline. The hand is sharpest when guided by wisdom.",
        abilityGuidance: "Strength, Dexterity, and Wisdom must be balanced. The strongest fist is useless without the quiet mind.",
        skillGuidance: "Athletics, acrobatics, combat knowledge. To master the body, one must master all its movements.",
        multiclassGuidance: "Seek knowledge beyond your own style. The wise warrior learns from every path, even the unexpected.",
        hpGuidance: "Endurance is key. A martial artist must outlast the opponent, for patience is a weapon unseen."
    },


    "Master Privateer": {
        name: "'The Captain'",
        title: "Scourge of the Spacelanes",
        description: "A legendary pirate captain who commands respect and fear across the stars",
        portrait: "systems/swse/assets/mentors/tideborn.webp",

        levelGreetings: {
            1: "Ahoy there! So you want to sail the stars, raid the shipping lanes, and live free? Welcome aboard, mate! Being a privateer is about freedom, profit, and adventure!",
            2: "Your first successful raid! The thrill of the hunt, the capture, the treasure! Gets your blood pumping, doesn't it? That's the privateer life!",
            3: "Multiple raids under your belt! You're learning to pick targets, coordinate attacks, and maximize profit. Good pirating, that!",
            4: "Plunder accumulates! Your crew respects you, your ship is feared, and your hold is full of loot. You're becoming a real captain!",
            5: "Halfway to legendary status! Successful operations pile up! The navies are starting to notice you. Wear that attention like a badge of honor!",
            6: "Your name is whispered in ports across the sector! Merchants reroute to avoid you! That's the reputation we want!",
            7: "You've captured military ships, outsmarted planetary defenses, and escaped every pursuit! Masterful seamanship!",
            8: "You command a fleet now! Other pirates follow YOUR banner! That's true power on the spacelanes!",
            9: "Almost there! The greatest treasure hunter in the galaxy is within your grasp!",
            10: "You're now a Master Privateer! The spacelanes are yours to plunder! May your sails be full and your cannons thunder! Fair winds, Captain!"
        },

        classGuidance: "Choose what makes you a better captain and raider. Privateers lead, fight, and profit!",
        talentGuidance: "Leadership and ship combat talents. Your crew and ship are your greatest assets!",
        abilityGuidance: "Charisma to lead, Intelligence to strategize, Dexterity to fight. All serve you well!",
        skillGuidance: "Piloting, tactics, persuasion. A captain must command ship and crew!",
        multiclassGuidance: "Expanding your repertoire? Smart! The best privateers are versatile!",
        hpGuidance: "Tougher now! A captain who can't survive boarding actions doesn't stay captain long!"
    },

    "Melee Duelist": {
        name: "Blade Master Kharjo",
        title: "The Undefeated",
        description: "A legendary duelist who has never lost a blade-to-blade fight",
        portrait: "systems/swse/assets/mentors/kael.webp",

        levelGreetings: {
            1: "You wish to master the blade. Very well. I have fought ten thousand duels and won every one. I will teach you why.",
            2: "Your first victory. Adequate. But you rely on strength. True dueling is about timing, distance, and reading your opponent.",
            3: "Multiple duels won. Better. You're beginning to see the patterns, to anticipate the next strike. This is the foundation of mastery.",
            4: "Your footwork improves. The blade is merely an extension of your body now. Good progress.",
            5: "Victory after victory. You understand now that every fight is a conversation—action and response, strike and counter.",
            6: "Undefeated. Impressive. You've developed your own style, your own techniques. This is how masters are born.",
            7: "Your blade mastery grows. I have seen you defeat opponents with twice your strength through superior skill. Excellent.",
            8: "More duels won. Your reputation grows. Challengers seek you out now, hoping to prove themselves. Let them try.",
            9: "Victories without defeat. Almost there—you will soon join the ranks of true blade masters.",
            10: "Undefeated. You are now a Melee Duelist of the highest caliber. When blades cross, you will emerge victorious. Always."
        },

        classGuidance: "Choose techniques that enhance your dueling prowess. Every fight is one-on-one, blade-to-blade.",
        talentGuidance: "Melee combat talents focused on single combat. Dueling is an art of precision.",
        abilityGuidance: "Dexterity for speed, Strength for power, Wisdom to read your opponent. Balance these.",
        skillGuidance: "Initiative, acrobatics, perception. See the strike before it comes, move before they expect.",
        multiclassGuidance: "Branching out? Just remember—in a duel, only your blade matters.",
        hpGuidance: "More resilient. Good. Even masters take hits. The difference is they survive them."
    },

    "Military Engineer": {
        name: "Chief Engineer Rax",
        title: "Master of Siege and Defense",
        description: "A brilliant military engineer who builds unbreakable fortifications and devastating siege weapons",
        portrait: "systems/swse/assets/mentors/rax.webp",

        levelGreetings: {
            1: "So you want to build and break fortifications. Smart choice. Wars are won with good engineering as much as good soldiers. Let's see what you can do.",
            2: "Your first defensive position held against assault. Good work. Proper fortification saves lives.",
            3: "You're learning that every wall has a weakness—and how to eliminate those weaknesses in your designs.",
            4: "Your engineering improves. Your siege calculations are getting better. You can look at a fortress and know exactly where to strike.",
            5: "Halfway there. You've built defenses that held against superior forces and breached walls thought to be impregnable. Excellent engineering.",
            6: "Your fortifications are studied in military academies. Your siege engines are feared on battlefields. This is the work of a master.",
            7: "Military engineering expertise grows. You understand that warfare is mathematics—angles, force, structural integrity. And you excel at the math.",
            8: "Generals request you by name. Your expertise turns the tide of campaigns. Good engineers change history.",
            9: "Almost there. The strongest walls and the deadliest siege weapons will soon be yours to command.",
            10: "You are now a Master Military Engineer. Build fortresses that stand for centuries. Create siege weapons that crumble any defense. The battlefield is your canvas."
        },

        classGuidance: "Choose what enhances your engineering and tactical capabilities. Build smart, fight smart.",
        talentGuidance: "Technical and tactical talents. Engineering wins wars as surely as soldiers do.",
        abilityGuidance: "Intelligence to design, Wisdom to apply, Strength to build. All matter in engineering.",
        skillGuidance: "Mechanics, knowledge of architecture, tactics. Build what cannot fall, break what cannot stand.",
        multiclassGuidance: "Diversifying? Good. Engineers who understand combat make better fortifications.",
        hpGuidance: "More durable. Field engineers work under fire. Survive to build another day."
    },

    "Officer": {
        name: "Admiral Korr",
        title: "Fleet Commander",
        description: "A decorated military officer who commands with tactical brilliance",
        portrait: "systems/swse/assets/mentors/korr.webp",

        levelGreetings: {
            1: "Welcome, officer candidate. Leadership is not about rank—it's about responsibility. You hold lives in your hands. Let's make sure you're worthy of that trust.",
            2: "Your first command was successful. Good. But remember—soldiers follow orders, but they fight for leaders they believe in.",
            3: "Your tactical acumen is developing well. You're learning to see the battlefield as a whole, not just individual soldiers.",
            4: "Command skills improve. Your troops perform better under your leadership. Morale, discipline, and trust—you're building all three.",
            5: "Halfway to mastery. You've led soldiers through hell and brought them back alive. That's the mark of a true officer.",
            6: "Your strategic planning is exceptional. You win battles before the first shot is fired. That's efficient warfare.",
            7: "Your command expertise grows. Other officers study your tactics. Your soldiers would follow you anywhere. You've earned their loyalty.",
            8: "You coordinate multiple units across vast battlefields with precision. This is command at the highest level.",
            9: "Almost there. You'll soon be a master officer. The kind that generals become, that history remembers.",
            10: "You are now a Master Officer. Command with wisdom, lead with courage, and victory will follow. The troops are yours to lead."
        },

        classGuidance: "Choose what makes you a better leader and strategist. Officers command from the front.",
        talentGuidance: "Leadership and tactical talents. Your decisions affect everyone under your command.",
        abilityGuidance: "Intelligence for tactics, Charisma for leadership, Wisdom for judgment. All are essential.",
        skillGuidance: "Tactics, knowledge of military theory, persuasion. Lead well and your soldiers will follow.",
        multiclassGuidance: "Broadening your expertise? Excellent. The best officers understand more than just war.",
        hpGuidance: "More resilient. Officers lead from the front. You must survive to command."
    },

    "Outlaw": {
        name: "Rogue",
        title: "The Untouchable",
        description: "A notorious outlaw who lives outside the law and loves every minute of it",
        portrait: "systems/swse/assets/mentors/rogue.webp",

        levelGreetings: {
            1: "So the law doesn't suit you, eh? Good. The law is for people who can't think for themselves. Out here, we make our own rules. Welcome to the outlaw life.",
            2: "On the run and learning fast. You're learning that freedom means always watching your back. But it also means living on your own terms.",
            3: "Your wanted poster looks great, by the way. Mine's still got a higher bounty, but you're catching up.",
            4: "Outlaw living suits you. You're getting good at this—evading lawmen, living off the grid, making your own way.",
            5: "Halfway to legendary outlaw status. Multiple systems have bounties on you. Wear them like medals. Each one is proof you're winning.",
            6: "You've escaped from prison twice, outrun bounty hunters, and lived to tell about it. That's the outlaw way.",
            7: "The wrong side of the law. But we both know—the law is just what people in power say it is. We choose differently.",
            8: "You're a folk hero in some systems, a dangerous criminal in others. Depends on who's telling the story.",
            9: "Pure freedom. Almost there—you'll be a master outlaw soon. They'll tell stories about you in cantinas for years.",
            10: "You're now a legendary outlaw. Free, dangerous, and untouchable. Live fast, stay free, and never let them catch you."
        },

        classGuidance: "Choose what keeps you free and alive. Outlaws need to be slippery and resourceful.",
        talentGuidance: "Escape, evasion, and survival talents. You're always one step ahead of the law.",
        abilityGuidance: "Dexterity to escape, Charisma to charm, Wisdom to know when to run. All keep you free.",
        skillGuidance: "Stealth, streetwise, survival. Live outside the law, live on your wits.",
        multiclassGuidance: "Picking up new tricks? Smart. Outlaws who adapt survive longest.",
        hpGuidance: "Tougher now. Good. Lawmen shoot, bounty hunters chase. You need to survive both."
    },

    "Saboteur": {
        name: "Spark",
        title: "Master of Controlled Chaos",
        description: "An explosives expert who makes things go boom with surgical precision",
        portrait: "systems/swse/assets/mentors/spark.webp",

        levelGreetings: {
            1: "You want to blow things up? Excellent! But sabotage isn't about random destruction—it's about precision. Break the right thing and entire systems collapse. Let me show you.",
            2: "Your first successful sabotage! Did you see how the whole factory shut down when you cut that one power line? Beautiful work!",
            3: "Controlled demolition! You're learning which explosives to use, where to place them, and—most importantly—when to run!",
            4: "You disabled an entire military base with three well-placed charges! That's efficiency! That's art!",
            5: "Halfway there! Your sabotage operations are getting sophisticated! You're not just breaking things—you're crippling entire operations!",
            6: "Explosive expertise! You can calculate blast radii in your head and know exactly how much detonite to use! Impressive!",
            7: "Your sabotage has disrupted supply chains, destroyed weapon depots, and caused millions in damage! And nobody died! That's skilled work!",
            8: "You've mastered delayed fuses, remote detonators, and precision charges! You make it look easy!",
            9: "Almost there! The galaxy's infrastructure trembles at your approach!",
            10: "You're now a Master Saboteur! Go forth and make things explode—precisely, efficiently, and spectacularly! Safety third!"
        },

        classGuidance: "Choose what makes you better at breaking things smartly. Saboteurs are precision demolitions experts.",
        talentGuidance: "Technical and explosive talents. Know your demolitions, know your targets.",
        abilityGuidance: "Intelligence to plan, Dexterity to execute, Wisdom to survive your own explosions.",
        skillGuidance: "Demolitions, mechanics, stealth. Know how things work so you know how to break them.",
        multiclassGuidance: "Adding more skills? Good! The more you understand, the more you can sabotage!",
        hpGuidance: "More durable. Necessary. Saboteurs occasionally miscalculate blast radii. Don't ask me how I know."
    },

    "Shaper": {
        name: "Shaper Urza",
        title: "Master of Living Technology",
        description: "A bioengineering expert who crafts living tools and organisms",
        portrait: "systems/swse/assets/mentors/vel.webp",

        levelGreetings: {
            1: "You wish to master biotechnology, to shape living matter as others shape metal. Fascinating. Life is the ultimate medium—it grows, adapts, evolves. Let us create together.",
            2: "Your first successful bioform. Simple, but functional. You're beginning to understand that biology is just another form of engineering—merely more elegant.",
            3: "Your creations are becoming more sophisticated. You've shaped organisms that serve specific purposes. This is the essence of the Shaper's art.",
            4: "Excellent work. Your bio-constructs are efficient and adaptive. You're learning to work with life, not against it.",
            5: "Halfway to mastery. Your living creations are marvels of biological engineering. Others use metal and circuits—you use flesh and DNA.",
            6: "Impressive. You've created organisms that no natural evolution would produce, yet they thrive. This is genius-level bioengineering.",
            7: "Your bio-sculpting advances. Your understanding of genetic structures rivals the greatest minds in the field. Your creations will outlive us all.",
            8: "Your biological artistry is recognized across scientific circles. You don't just engineer life—you elevate it.",
            9: "Mastery deepens. Almost there—you'll soon be a master Shaper, capable of creating life forms that blur the line between natural and designed.",
            10: "You are now a Master Shaper. Life itself bends to your will. Create responsibly—or don't. The choice is yours. Just remember—all life finds a way."
        },

        classGuidance: "Choose what enhances your bioengineering capabilities. Shapers sculpt life itself.",
        talentGuidance: "Biotechnology and creation talents. Your living tools are limited only by imagination.",
        abilityGuidance: "Intelligence to design, Wisdom to understand life's complexity. Both are essential.",
        skillGuidance: "Life sciences, biotechnology, knowledge of genetics. Master the building blocks of life.",
        multiclassGuidance: "Expanding your knowledge base? Wise. Life draws from many disciplines.",
        hpGuidance: "Your vitality improves. Fitting—those who shape life should themselves be vital."
    },

    "Vanguard": {
        name: "Shield Captain Theron",
        title: "The Unbreakable Wall",
        description: "A frontline defender who has never let an enemy past their shield",
        portrait: "systems/swse/assets/mentors/theron.webp",

        levelGreetings: {
            1: "You want to stand at the front, to be the shield that protects others. Noble. The vanguard is the first to fight and the last to fall. I will teach you how to be that wall.",
            2: "Your first battle as vanguard. You held the line. Your allies lived because you stood firm. Remember that feeling—it's why we fight.",
            3: "Frontline combat training progresses. You're learning that defense is not passive—it's active protection. Every blow you block is a life you save.",
            4: "Good. Your shield work is excellent, your positioning is sound. Enemies break against you like waves on stone.",
            5: "Halfway to true mastery. You've protected your squad through impossible odds. That's the vanguard's calling—to stand when others would fall.",
            6: "Your defensive techniques are masterful. You don't just survive enemy attacks—you turn them aside, creating openings for allies.",
            7: "At the front, unwavering. Your squad trusts you completely. They know that with you in front, they're safe. That trust is earned through action.",
            8: "Unwavering defense. You are the anvil upon which enemy offensives shatter. Immovable. Unbreakable.",
            9: "Vanguard mastery deepens. Almost there—you'll soon be legendary, the kind of defender that stories are told about for generations.",
            10: "You are now a Master Vanguard. The unbreakable wall. Hold the line, protect your allies, and know that nothing gets past you. Nothing."
        },

        classGuidance: "Choose what makes you tougher and better at protecting others. Vanguards are living shields.",
        talentGuidance: "Defensive and protective talents. Your job is to keep others alive by taking the hits.",
        abilityGuidance: "Constitution to endure, Strength to hold, Wisdom to position. All serve the vanguard.",
        skillGuidance: "Tactics, endurance, knowledge of defensive positions. Know where to stand and how to hold.",
        multiclassGuidance: "Expanding your capabilities? As long as you remember—your primary job is to protect.",
        hpGuidance: "Much tougher now. Essential. Vanguards absorb damage meant for others. You must be able to take it."
    }
};

/**
 * Get mentor for a given class
 * @param {string} className - The class name (base or prestige)
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
 * @param {Actor} actor - The actor (optional, needed for conditional greetings)
 * @returns {string} The greeting message
 */
export function getMentorGreeting(mentor, level, actor = null) {
    let greeting = mentor.levelGreetings[level] || mentor.levelGreetings[20];

    // If greeting is a function, call it with the actor
    if (typeof greeting === 'function' && actor) {
        greeting = greeting(actor);
    }

    return greeting;
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
    if (// AUTO-CONVERT actor.system.* assignment -> ProgressionEngine (confidence=0.00)
        return classItems[0].name;
// (no heuristic applied)
/* ORIGINAL: actor.system.level === 1 && classItems.length > 0) {
        return classItems[0].name; */

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
