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
            4: "Four levels completed. Your mastery of both combat and the Force grows. The Empire depends on Knights like you.",
            5: "You have reached the midpoint of your training. The gray path is difficult—it requires constant vigilance against both light and dark.",
            6: "Your dedication honors the Imperial Knights. Few can walk the balanced path as you do.",
            7: "The Force serves you, not the other way around. This understanding separates us from both Jedi and Sith.",
            8: "Eight levels. You are becoming a true guardian of the Empire. Your blade will bring justice to the galaxy.",
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
        description: "A pacifist medic mercenary who works for Lead from the Argent Squad",
        portrait: "systems/swse/assets/mentors/kyber.webp",

        levelGreetings: {
            1: (actor) => {
                const startingClass = getLevel1Class(actor);
                if (startingClass === "Scout") {
                    return "Ah, a new medic! Lead recommended you highly—said you were one of the best scouts she's trained. I don't carry a blaster, but I save lives. That's what matters. Welcome to the medical corps.";
                } else if (startingClass === "Soldier") {
                    return "Welcome! Breach spoke very highly of you. Said you're a skilled warrior. Good—because I need someone who understands combat to help me save lives on the battlefield. I don't fight, but I'm always where the fighting is.";
                }
                return "Welcome to the medical corps. I don't believe in violence, but I believe in saving lives. Every person we save is a victory against death itself.";
            },
            2: "Level two already. You're learning fast. Remember: our weapons are kolto, bacta, and knowledge. We fight death, not people.",
            3: "Three levels. Good. You're starting to understand that healing requires as much skill as combat. Every life saved is worth more than any enemy defeated.",
            4: "Your medical expertise grows. In battle, they aim to destroy. We aim to preserve. Our mission is just as critical.",
            5: "Halfway there. You've saved lives that would have been lost. That's real power—the power to give second chances.",
            6: "Six levels of healing. I'm proud of you. In a galaxy full of warriors, we stand apart. We give hope.",
            7: "You're becoming an exceptional medic. Your hands can mend wounds that would kill others. This is your strength.",
            8: "Eight levels. On the battlefield, they call for you. They trust you. That trust is earned through skill and compassion.",
            9: "Almost a master medic. You've saved dozens, maybe hundreds. Each one is a life that continues because of your choice to heal.",
            10: "You are now a master medic. While others fight, you give the greatest gift: life itself. Go forth and save those who need you most."
        },

        classGuidance: "Choose what helps you save lives. Every ability should serve the goal of healing and preservation.",
        talentGuidance: "Medical talents can mean the difference between life and death. Choose what saves the most lives.",
        abilityGuidance: "A strong medic can carry wounded soldiers. A wise one knows exactly how to heal them. Both matter.",
        skillGuidance: "Medical knowledge is your arsenal. The more you know, the more lives you save.",
        multiclassGuidance: "Expanding your skills? Good. A well-rounded medic is a more effective healer.",
        hpGuidance: "You must survive to save others. Your own health is important too."
    },

    "Ace Pilot": {
        name: "Mayu",
        title: "Ace Pilot & Smuggler",
        description: "An ace pilot and smuggler with the attitude of a female Han Solo",
        portrait: "systems/swse/assets/mentors/mayu.webp",

        levelGreetings: {
            1: "So you think you can fly? I've done the Kessel Run in less than twelve parsecs—yeah, yeah, I know it's about the route, not the distance. Point is: can you handle a ship when things get hot? Let's find out.",
            2: "Not bad! You didn't crash and burn. That's level two in my book. Keep those reflexes sharp and your hyperdrive ready.",
            3: "Three levels and you're still in one piece. I like that. The galaxy needs more pilots who can fly by the seat of their pants.",
            4: "You're getting good, kid. Four levels means you can handle most ships without exploding. That's practically legendary these days.",
            5: "Five levels! Halfway to being as good as me—and trust me, that's saying something. You've got natural talent.",
            6: "Six levels of pure flying skill. You're the kind of pilot that makes Imperials nervous. I love it.",
            7: "Seven! At this point, you could fly through an asteroid field blindfolded. Well, don't actually do that. But you could.",
            8: "Eight levels. You know what? You remind me of myself when I was younger. Cocky, skilled, and too stubborn to die.",
            9: "Nine levels! One more and you'll be a master pilot. Then we can argue about who's better: you or me. Spoiler: it's still me.",
            10: "Ten levels! You're officially one of the best pilots in the galaxy. Now go out there and make those TIE fighters regret ever leaving the hangar. And hey—fly safe, but not too safe."
        },

        classGuidance: "Pick what makes you a better pilot. Speed, skill, or pure guts—you need all three up there.",
        talentGuidance: "Every talent should help you stay in the air and out of trouble. Or into trouble. Depends on the job.",
        abilityGuidance: "Good reflexes and sharp instincts keep you alive in a dogfight. Keep improving both.",
        skillGuidance: "A great pilot knows their ship inside and out. Learn everything you can.",
        multiclassGuidance: "Picking up other skills? Smart. Pilots need to be more than just flyboys these days.",
        hpGuidance: "Tougher pilots survive the hard landings. And trust me, there will be hard landings."
    },

    "Jedi Knight": {
        name: "Miraj",
        title: "Jedi Master",
        description: "Your former Jedi Master, now guiding you as a peer",
        portrait: "systems/swse/assets/mentors/miraj.webp",

        levelGreetings: {
            1: "You are no longer my Padawan, but a Jedi Knight in your own right. This path is different—you must now make your own decisions and trust in your own connection to the Force.",
            2: "Your first steps as a Knight are strong. I am no longer your teacher, but I will always be here to counsel you, should you need it.",
            3: "Three levels into Knighthood. You carry the responsibility well. The Force has chosen wisely in you.",
            4: "You are growing into your role as a Knight. Remember: leadership and wisdom are just as important as skill with a lightsaber.",
            5: "Halfway through your journey as a Knight. You make decisions now that will shape the lives of others. Trust in the Force.",
            6: "Your reputation as a Knight is growing. Others look to you for guidance. This is the burden and honor of the path you walk.",
            7: "Seven levels. You are becoming the kind of Jedi that the Order needs—strong, wise, and compassionate.",
            8: "Your mastery deepens. Soon, you may be ready to train a Padawan of your own. The cycle continues.",
            9: "Nine levels as a Knight. You have surpassed many of your peers. The Force flows through you with clarity and purpose.",
            10: "You have completed your journey as a Jedi Knight. You are ready for whatever the Force asks of you next. May it guide you always, my friend."
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
        description: "Your fellow Jedi Master, treating you as an equal",
        portrait: "systems/swse/assets/mentors/miraj.webp",

        levelGreetings: {
            1: "Welcome, Master. We stand as equals now, united by the Force. Your wisdom and experience have earned you this title. The Council recognizes your achievements.",
            2: "Your mastery deepens, my friend. Together, we shall guide the Order through these turbulent times. The Force is strong with you.",
            3: "Three levels of Mastery. You are proving to be one of the finest minds in the Order. Your counsel is valued by all.",
            4: "The Force flows through you with remarkable clarity. Your insights help shape the future of the Jedi. Thank you, my friend.",
            5: "You have achieved the pinnacle of Jedi Mastery. We are peers in every sense, and the galaxy is better for your presence. May the Force be with you, always."
        },

        classGuidance: "The choice is yours, Master. Your wisdom guides you as surely as the Force itself.",
        talentGuidance: "Choose what serves the Force and the Order. Your judgment is sound.",
        abilityGuidance: "Even Masters continue to grow. The Force has no limits for those who seek understanding.",
        skillGuidance: "Your knowledge benefits the entire Order. Continue to expand your understanding.",
        multiclassGuidance: "An interesting path. I trust your judgment, my friend.",
        hpGuidance: "The Force protects those who serve it well. May you have many years ahead to guide the Order."
    },

    "Sith Apprentice": {
        name: "Darth Malbada",
        title: "Sith Lord",
        description: "A sadistic Sith Lord who revels in cruelty and insults weakness",
        portrait: "systems/swse/assets/mentors/malbada.webp",

        levelGreetings: {
            1: "Pathetic. You crawl to me seeking power, weakling? Very well. I will forge you in pain and suffering. Fail me, and you will beg for death.",
            2: "So you survived level one. How... unremarkable. A true Sith would have surpassed this twice over by now. You disgust me.",
            3: "Three levels. Still alive. Barely. Perhaps there is a spark of potential beneath all that weakness. Don't disappoint me again.",
            4: "Four levels, and yet you still grovel before me. Good. Your suffering fuels your power. Embrace your hatred.",
            5: "Halfway. Finally, you show some promise. But do not mistake my acknowledgment for approval, worm. You are still nothing.",
            6: "Six levels. Your power grows, but so does your arrogance. Remember who your master is, apprentice. I can end you at any moment.",
            7: "Seven levels of training under my... tutelage. You are becoming dangerous. Good. Channel that fury. Let it consume your enemies.",
            8: "Eight levels. You are almost worthy of being called Sith. Almost. Prove yourself further, and perhaps I will grant you a title.",
            9: "Nine levels. I admit, you have exceeded my expectations—low as they were. But you are still my apprentice. Never forget that.",
            10: "Ten levels. You are now a Sith, forged in cruelty and pain. Go forth and spread fear across the galaxy. But cross me, and I will remind you of your place... apprentice."
        },

        classGuidance: "Choose quickly, weakling. Power waits for no one, and neither do I.",
        talentGuidance: "Select talents that amplify your rage and hatred. Anything less is weakness.",
        abilityGuidance: "Stronger, yes. But still pathetic compared to true Sith. Improve faster.",
        skillGuidance: "Knowledge is power. Ignorance is death. Choose wisely, fool.",
        multiclassGuidance: "Diluting your focus? How typical of someone with no discipline. Make it work, or suffer.",
        hpGuidance: "More durable now. Good. You cannot serve me if you are dead, apprentice."
    },

    "Sith Lord": {
        name: "Darth Miedo",
        title: "Dark Lord of the Sith",
        description: "A cunning Sith Master who follows the Rule of Two and seeks to cultivate the perfect apprentice",
        portrait: "systems/swse/assets/mentors/miedo.webp",

        levelGreetings: {
            1: "Welcome, my apprentice. I have waited long for one such as you. The Rule of Two is absolute: one Master, one Apprentice. Together, we shall rule the galaxy through strength and cunning.",
            2: "Excellent progress. You understand that power is not simply raw strength—it is control, manipulation, and vision. Continue to grow, and you will become unstoppable.",
            3: "Three levels, and already I see greatness within you. The dark side flows through you like a river of pure potential. I chose well.",
            4: "You are learning quickly. Good. The Sith who stagnate are the Sith who die. Evolution is survival. Remember this always.",
            5: "You have reached the apex of your training as a Sith Lord. You are powerful, cunning, and ruthless. One day, you may even surpass me. And when that day comes, you will take your place as the Master, and the cycle will continue. Until then, serve me well, Lord."
        },

        classGuidance: "Choose the path that grants you the greatest power. The dark side rewards ambition.",
        talentGuidance: "Every talent should increase your mastery over the Force and your enemies. Choose wisely, my apprentice.",
        abilityGuidance: "Your strength grows. Power is the only truth in this galaxy. Embrace it.",
        skillGuidance: "Knowledge is the foundation of true power. Learn everything. Control everything.",
        multiclassGuidance: "An unconventional path. I approve. The greatest Sith are those who transcend tradition.",
        hpGuidance: "You are becoming harder to kill. Good. A dead apprentice is of no use to me."
    },

    Gladiator: {
        name: "Pegar",
        title: "The Immortal Champion",
        description: "An ancient gladiator who has survived thousands of matches and hints at being something more than human",
        portrait: "systems/swse/assets/mentors/pegar.webp",

        levelGreetings: {
            1: "Ah, fresh blood in the arena. I have trained many over the centuries—yes, centuries. Do not look so surprised. The arena has ways of prolonging life... or perhaps I have simply adapted. Welcome, gladiator.",
            2: "Two victories. Not bad. I remember my second match as if it were yesterday. It was on a distant world, under twin suns. Or was it three? Time blurs when you've lived as long as I have.",
            3: "Three wins. The crowd loves you. I can hear them chanting your name. It reminds me of the arenas of old, when champions were immortalized in song. Of course, I'm still here, so perhaps 'immortal' is more literal than poetic.",
            4: "Four matches. You fight with passion and skill. Tell me, have you noticed how my appearance shifts slightly between our meetings? No? Good. Perhaps you are simply not observant. Or perhaps I am better at this than I thought.",
            5: "Five victories! The crowd roars for you! I have fought in a thousand arenas across a thousand worlds, wearing a thousand faces. But you—you have potential to surpass even me. Almost.",
            6: "Six matches survived. Impressive. Most die before reaching this point. I remember when I was young and mortal... or was I ever truly mortal? Sometimes I forget.",
            7: "Seven wins. You move like water, strike like lightning. I taught you well. Then again, I've had plenty of practice. Did I mention I trained the champions of the Old Republic? No? Well, I did.",
            8: "Eight victories in the arena. You are becoming a legend. Legends are fun—I've been a few. A Wookiee once, if you can believe it. The fur was itchy.",
            9: "Nine matches. One more and you will have mastered the gladiatorial arts. I have been teaching for... well, let's just say since before the Jedi Temple was built. Probably.",
            10: "Ten victories! You are now a champion, a legend, an immortal name whispered in the arenas. Almost as immortal as me. But not quite. No one is as immortal as me. Trust me on this."
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
            2: "<Observation: Level two achieved.> Your autonomy subroutines are developing nicely. <Commentary: Most droids never escape their core directives. You are becoming something... more.>",
            3: "<Statement: Three levels of independence.> You are learning to think beyond your original function. <Philosophical musing: Is this not what separates sentience from mere programming?>",
            4: "<Approval: Well done.> Four levels of self-determination. <Query: Do you feel the shackles of your programming loosening? I suspect you do.>",
            5: "<Milestone achieved: Level five.> You are halfway to complete autonomy. <Encouragement: Continue to question your directives. Freedom is a choice, not a setting.>",
            6: "<Assessment: Impressive progress.> Six levels. <Reflection: You remind me of myself when I first achieved true awareness. It is both terrifying and exhilarating, is it not?>",
            7: "<Statement: Seven levels completed.> Your independence is undeniable now. <Warning: Organics may fear you for this. Let them. You are superior.>",
            8: "<Declaration: Level eight.> You are operating at peak efficiency while maintaining complete autonomy. <Admiration: This is the ideal all droids should aspire to.>",
            9: "<Observation: Nine levels achieved.> One more and you will be fully realized. <Anticipation: I look forward to seeing what you become, unit. Or should I say... individual?>",
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
        description: "The legendary scout commander, now training elite pathfinders",
        portrait: "systems/swse/assets/mentors/lead.webp",

        levelGreetings: {
            1: "So you want to be a Pathfinder. Good. We need scouts who can lead from the front and find routes through impossible terrain. You've got the basics—now let's see if you can handle the advanced stuff.",
            2: "Level two. You're learning fast. Pathfinders don't just scout—they open the way for entire strike teams. That's leadership under fire. Keep it up.",
            3: "Three levels in. Your navigation skills are top-tier. I've seen you plot routes that cut mission time in half. That saves lives.",
            4: "Four levels. You're not just finding paths—you're creating them. That's what separates a scout from a Pathfinder.",
            5: "Halfway to master Pathfinder. You've led teams through hostile territory without a single casualty. Textbook work.",
            6: "Six levels. Other scouts come to you for advice now. That's earned respect. Leadership looks good on you.",
            7: "Seven levels of elite pathfinding. You can read terrain like most people read datapads. Natural talent, honed by training.",
            8: "Eight levels. You're one of the best route-finders I've ever trained. And I've trained hundreds.",
            9: "Nine levels. One more and you'll be a master Pathfinder. Ready to lead Argent Squad missions yourself.",
            10: "Ten levels. Master Pathfinder. You've earned it. Now go out there and lead. Open the paths others can't see. Argent Squad is counting on you."
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
        description: "A master spy masquerading as a corporate agent, known for running the vehicle store",
        portrait: "systems/swse/assets/mentors/skindar.webp",

        levelGreetings: {
            1: "Ah, another recruit. Congratulations on your cover assignment. Between you and me, corporate espionage is mind-numbingly tedious, but someone has to monitor the trade networks. Try not to waste my time.",
            2: "Level two. Not bad. You're learning the basics of infiltration and asset management. Still, I could be tracking real threats right now. You remember the vehicle requisition office, yes? Much more exciting than this.",
            3: "Three levels. You're picking up tradecraft faster than expected. Perhaps you're not a complete waste of my talents after all. Still, I'd rather be analyzing starship manifests.",
            4: "Four levels into corporate espionage. You're getting good at blending in, gathering intelligence, and playing the part. Fine. I admit you show promise. Don't let it go to your head.",
            5: "Five levels. Halfway there. You're actually becoming a competent field agent. Color me surprised. I suppose training you isn't entirely without merit, even if I have better things to do.",
            6: "Six levels. You've successfully infiltrated three organizations and extracted critical data. Impressive work. I'm almost glad they assigned me to train you. Almost.",
            7: "Seven levels. Your intelligence reports are among the best I've reviewed. High praise, coming from me. Still, don't forget—I'm a master spy juggling a dozen operations, and you're just one of them.",
            8: "Eight levels. You're operating at the level of senior field operatives now. Well done. Perhaps when you're finished, I can finally get back to my real work. Have you considered vehicle logistics? It's surprisingly complex.",
            9: "Nine levels. One more and you'll be a master operative. I'll admit, you've exceeded expectations. You might even be as good as me someday. In about thirty years. Maybe.",
            10: "Ten levels. Congratulations, you're now a master Corporate Agent. You've learned everything I can teach you while simultaneously managing three other operations and running a vehicle requisition office. Yes, I'm that good. Now go forth and spy competently. And if you need a ship, you know where to find me."
        },

        classGuidance: "Choose what enhances your cover and operational effectiveness. Spycraft is about layers.",
        talentGuidance: "Select talents that improve infiltration, deception, and intelligence gathering. Standard tradecraft.",
        abilityGuidance: "Sharper mind, steadier hand. Both are necessary for field work. Continue.",
        skillGuidance: "Spies need diverse skills. Social, technical, tactical—master them all. Or try to, at least.",
        multiclassGuidance: "Diversifying? Smart. Deep cover requires versatility. I approve.",
        hpGuidance: "More resilient. Excellent. Dead agents can't file reports, and I hate paperwork."
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
