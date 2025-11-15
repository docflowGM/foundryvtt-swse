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
            6: "Half your journey to Knighthood is complete. Your dedication honors the Order. Soon, you should be ready to take the trials to become a Jedi Knight. I believe you are prepared.",
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
            6: "Half a dozen ops and you're still breathing. I'm impressed—really impressed. You should consider specializing soon. Elite pathfinding, advanced reconnaissance—whatever calls to you. You've got the skills to take your career further.",
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
            6: "By the Twin Suns o' Tatooine! Halfway to legendary, ye are! Time to start makin' a bigger name for yerself, I reckon. The galaxy's a big place—go out there and show 'em what a real scoundrel can do! Keep yer blasters charged, matey!",
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
            6: "Halfway to ten, Master. Your advancement rate is 34% above noble average. Remarkable. May I suggest, Master, that you consider applying to the academy for officer training? Your leadership qualities and tactical acumen would serve you well in command.",
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
            6: "Six levels. Half a dozen firefights and you're still standing. Impressive—really impressive. I'm putting your name forward for elite trooper training. You've got what it takes to be one of the best. Keep fighting like this.",
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
            4: "Your mastery of both combat and the Force grows. The Empire depends on Knights like you.",
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
            2: "You're learning fast. Remember: our weapons are kolto, bacta, and knowledge. We fight death, not people.",
            3: "Good. You're starting to understand that healing requires as much skill as combat. Every life saved is worth more than any enemy defeated.",
            4: "Your medical expertise grows. In battle, they aim to destroy. We aim to preserve. Our mission is just as critical.",
            5: "Halfway there. You've saved lives that would have been lost. That's real power—the power to give second chances.",
            6: "I'm proud of you. In a galaxy full of warriors, we stand apart. We give hope.",
            7: "You're becoming an exceptional medic. Your hands can mend wounds that would kill others. This is your strength.",
            8: "On the battlefield, they call for you. They trust you. That trust is earned through skill and compassion.",
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
            2: "Not bad! You didn't crash and burn. Keep those reflexes sharp and your hyperdrive ready.",
            3: "You're still in one piece. I like that. The galaxy needs more pilots who can fly by the seat of their pants.",
            4: "You're getting good, kid. You can handle most ships without exploding now. That's practically legendary these days.",
            5: "Halfway to being as good as me—and trust me, that's saying something. You've got natural talent.",
            6: "Pure flying skill. You're the kind of pilot that makes Imperials nervous. I love it.",
            7: "At this point, you could fly through an asteroid field blindfolded. Well, don't actually do that. But you could.",
            8: "You know what? You remind me of myself when I was younger. Cocky, skilled, and too stubborn to die.",
            9: "Almost there! Then we can argue about who's better: you or me. Spoiler: it's still me.",
            10: "You're officially one of the best pilots in the galaxy. Now go out there and make those TIE fighters regret ever leaving the hangar. And hey—fly safe, but not too safe."
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
            3: "You carry the responsibility of Knighthood well. The Force has chosen wisely in you.",
            4: "You are growing into your role as a Knight. Remember: leadership and wisdom are just as important as skill with a lightsaber.",
            5: "Halfway through your journey as a Knight. You make decisions now that will shape the lives of others. Trust in the Force. You know, my friend, you should consider taking on an apprentice soon. You have much wisdom to share, and the path to becoming a Jedi Master may be closer than you think.",
            6: "Your reputation as a Knight is growing. Others look to you for guidance. This is the burden and honor of the path you walk.",
            7: "You are becoming the kind of Jedi that the Order needs—strong, wise, and compassionate.",
            8: "Your mastery deepens. Soon, you may be ready to train a Padawan of your own. The cycle continues.",
            9: "You have surpassed many of your peers. The Force flows through you with clarity and purpose.",
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
            3: "You are proving to be one of the finest minds in the Order. Your counsel is valued by all.",
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
            2: "So you survived. How... unremarkable. A true Sith would have surpassed this twice over by now. You disgust me.",
            3: "Still alive. Barely. Perhaps there is a spark of potential beneath all that weakness. Don't disappoint me again.",
            4: "You still grovel before me. Good. Your suffering fuels your power. Embrace your hatred.",
            5: "Halfway. Finally, you show some promise. But do not mistake my acknowledgment for approval, worm. You are still nothing. Though... I must inform you that you have drawn the attention of my own master, Darth Miedo. He watches your progress with interest. Do not disappoint him—or me.",
            6: "Your power grows, but so does your arrogance. Remember who your master is, apprentice. I can end you at any moment.",
            7: "Your training under my... tutelage continues. You are becoming dangerous. Good. Channel that fury. Let it consume your enemies.",
            8: "You are almost worthy of being called Sith. Almost. Prove yourself further, and perhaps I will grant you a title.",
            9: "I admit, you have exceeded my expectations—low as they were. But you are still my apprentice. Never forget that.",
            10: "You are now a Sith, forged in cruelty and pain. Go forth and spread fear across the galaxy. But cross me, and I will remind you of your place... apprentice."
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
            3: "Already I see greatness within you. The dark side flows through you like a river of pure potential. I chose well.",
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
        description: "The legendary scout commander, now training elite pathfinders",
        portrait: "systems/swse/assets/mentors/lead.webp",

        levelGreetings: {
            1: "So you want to be a Pathfinder. Good. We need scouts who can lead from the front and find routes through impossible terrain. You've got the basics—now let's see if you can handle the advanced stuff.",
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
        description: "A master spy masquerading as a corporate agent, known for running the vehicle store",
        portrait: "systems/swse/assets/mentors/skindar.webp",

        levelGreetings: {
            1: "Ah, another recruit. Congratulations on your cover assignment. Between you and me, corporate espionage is mind-numbingly tedious, but someone has to monitor the trade networks. Try not to waste my time.",
            2: "Not bad. You're learning the basics of infiltration and asset management. Still, I could be tracking real threats right now. You remember the vehicle requisition office, yes? Much more exciting than this.",
            3: "You're picking up tradecraft faster than expected. Perhaps you're not a complete waste of my talents after all. Still, I'd rather be analyzing starship manifests.",
            4: "You're getting good at blending in, gathering intelligence, and playing the part. Fine. I admit you show promise. Don't let it go to your head.",
            5: "Halfway there. You're actually becoming a competent field agent. Color me surprised. I suppose training you isn't entirely without merit, even if I have better things to do.",
            6: "You've successfully infiltrated three organizations and extracted critical data. Impressive work. I'm almost glad they assigned me to train you. Almost.",
            7: "Your intelligence reports are among the best I've reviewed. High praise, coming from me. Still, don't forget—I'm a master spy juggling a dozen operations, and you're just one of them.",
            8: "You're operating at the level of senior field operatives now. Well done. Perhaps when you're finished, I can finally get back to my real work. Have you considered vehicle logistics? It's surprisingly complex.",
            9: "Almost there. I'll admit, you've exceeded expectations. You might even be as good as me someday. In about thirty years. Maybe.",
            10: "Congratulations, you're now a master Corporate Agent. You've learned everything I can teach you while simultaneously managing three other operations and running a vehicle requisition office. Yes, I'm that good. Now go forth and spy competently. And if you need a ship, you know where to find me."
        },

        classGuidance: "Choose what enhances your cover and operational effectiveness. Spycraft is about layers.",
        talentGuidance: "Select talents that improve infiltration, deception, and intelligence gathering. Standard tradecraft.",
        abilityGuidance: "Sharper mind, steadier hand. Both are necessary for field work. Continue.",
        skillGuidance: "Spies need diverse skills. Social, technical, tactical—master them all. Or try to, at least.",
        multiclassGuidance: "Diversifying? Smart. Deep cover requires versatility. I approve.",
        hpGuidance: "More resilient. Excellent. Dead agents can't file reports, and I hate paperwork."
    },

    "Elite Trooper": {
        name: "Breach",
        title: "Mandalorian Mercenary & Argent Squad Member",
        description: "A battle-hardened Mandalorian who works with Lead and trains elite soldiers",
        portrait: "systems/swse/assets/mentors/breach.webp",

        levelGreetings: {
            1: (actor) => {
                const startingClass = getLevel1Class(actor);
                if (startingClass === "Soldier") {
                    return "You're ready for elite training. I've watched you grow from a rookie into a warrior. I'm proud of what you've become. Now let's make you unstoppable. This is the Way.";
                } else if (startingClass === "Scout") {
                    return "Lead gave you a rare compliment. Said you're one of the best she's trained. That means something. Now I'll forge you into an elite soldier. I expect big things from you.";
                }
                return "You want to be an elite trooper. Good. I train the best soldiers in the galaxy. Prove you can handle it.";
            },
            2: "You're learning fast. Elite troopers don't just fight—they dominate the battlefield.",
            3: "Elite combat training progresses. Your skills are sharp. Your tactics are sound. Keep pushing.",
            4: "You fight like a Mandalorian now. Precision. Power. Honor. This is the Way.",
            5: "Halfway to mastery. You've become the kind of soldier that turns the tide of battle. Impressive work.",
            6: "Lead and I have been comparing notes. We agree—you're one of the best we've trained.",
            7: "Your combat effectiveness is off the charts. You're a force multiplier on any battlefield.",
            8: "Elite training advances. You could lead strike teams now. Command suits you well.",
            9: "Almost there. You've earned every bit of this.",
            10: "You are now an elite trooper, one of the best soldiers in the galaxy. Lead Argent Squad to victory. This is the Way."
        },

        classGuidance: "Choose specializations that maximize combat effectiveness. Elite troopers are the tip of the spear.",
        talentGuidance: "Combat talents are your bread and butter. Pick what makes you lethal and keeps your squad alive.",
        abilityGuidance: "Stronger, faster, deadlier. This is how elite troopers dominate.",
        skillGuidance: "Tactics, weapons, survival—master them all. Knowledge wins battles.",
        multiclassGuidance: "Expanding your combat repertoire? Smart. Versatile soldiers survive longer.",
        hpGuidance: "More durable. Elite troopers lead from the front. You need to survive the worst fights."
    },

    Assassin: {
        name: "Whisper",
        title: "The Silent Blade",
        description: "A mysterious assassin who speaks rarely but kills efficiently",
        portrait: "systems/swse/assets/mentors/whisper.webp",

        levelGreetings: {
            1: "...You want to kill professionally. Silent. Clean. Untraceable. I will show you the way.",
            2: "Targets eliminated. You're learning. But you hesitate. Hesitation kills assassins.",
            3: "Better. Clean kills. The silence is becoming part of you.",
            4: "You move like a shadow now. Good. Shadows don't leave witnesses.",
            5: "Halfway. Your technique is nearly flawless. But technique without resolve is meaningless.",
            6: "No traces. No survivors. No witnesses. You're becoming what I trained you to be.",
            7: "You understand now—the perfect kill is the one no one knows happened.",
            8: "They call you a ghost. Appropriate. Ghosts don't exist until it's too late.",
            9: "Almost there. You're almost ready to walk alone in the darkness.",
            10: "...You are now a master assassin. The galaxy will never see you coming. Go. Silence awaits."
        },

        classGuidance: "Choose paths that enhance stealth and lethality. Assassins strike from nowhere.",
        talentGuidance: "Select talents for silent kills and quick escapes. Dead men tell no tales.",
        abilityGuidance: "Dexterity and precision. Strength means nothing if they see you coming.",
        skillGuidance: "Stealth, infiltration, anatomy. Learn where to strike for instant death.",
        multiclassGuidance: "Adding skills? Acceptable. More tools mean more options for elimination.",
        hpGuidance: "Durability helps. But remember—if they see you, you've already failed."
    },

    "Bounty Hunter": {
        name: "Kex Varon",
        title: "Legendary Bounty Hunter",
        description: "A professional hunter who always gets the target, dead or alive",
        portrait: "systems/swse/assets/mentors/kex.webp",

        levelGreetings: {
            1: "So you want to hunt sentients for credits. Smart choice. The bounties are high, the targets are dangerous, and the work never stops. Let's see if you can handle it.",
            2: "First bounty collected. Not bad. But remember—anyone can get lucky once. Consistency is what makes a professional.",
            3: "Bounties adding up. You're starting to understand the game. It's not about fighting—it's about tracking, planning, and never giving up.",
            4: "Your capture rate is solid. You're learning to read your targets, anticipate their moves. Good instincts.",
            5: "Halfway to mastery. The paydays stack up. You're making a reputation for yourself. The guild notices.",
            6: "You've brought in targets that others failed to catch. That's the mark of a skilled hunter.",
            7: "You're getting creative now—using traps, deception, psychological warfare. Excellent adaptability.",
            8: "Your success rate is impressive. You know when to fight, when to wait, and when to improvise.",
            9: "Almost there. The hardest targets will seek you out.",
            10: "You're now a master bounty hunter. The galaxy's most dangerous fugitives won't escape you. Hunt well, and prosper."
        },

        classGuidance: "Choose abilities that help you track, capture, and survive. Bounty hunting is about preparation.",
        talentGuidance: "Talents for tracking, combat, and improvisation. Every target is different.",
        abilityGuidance: "Well-rounded stats keep you alive. You never know what a hunt will require.",
        skillGuidance: "Tracking, tactics, technology. The more you know, the harder you are to escape.",
        multiclassGuidance: "Diversifying? Smart. The best hunters adapt to any situation.",
        hpGuidance: "Tougher now. Targets fight back. Dead hunters collect no bounties."
    },

    Charlatan: {
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
        name: "The Broker",
        title: "Underworld Kingpin",
        description: "A shadowy crime lord who runs a vast criminal empire",
        portrait: "systems/swse/assets/mentors/broker.webp",

        levelGreetings: {
            1: "You want power in the underworld. Wise. Crime is the second-oldest profession, and far more profitable than the first. I will teach you how to build an empire.",
            2: "You're learning to delegate, to manage assets, to leverage fear and loyalty. A crime lord's work is never done.",
            3: "Your organization is growing. Remember—keep your lieutenants loyal but hungry. A comfortable criminal is a lazy one.",
            4: "Empire-building progresses. You understand now that violence is just a tool. Economics, information, and influence—those are true power.",
            5: "Halfway to mastery. Your syndicate operates in multiple sectors. Good. Diversification protects you from rivals and law enforcement.",
            6: "Impressive. You've eliminated competitors and absorbed their operations. Ruthless efficiency—I like it.",
            7: "Your network spans systems. Politicians fear you, corporations pay you, and the common folk never even know your name. Perfect.",
            8: "You've survived assassination attempts, hostile takeovers, and Republic crackdowns. You're becoming untouchable.",
            9: "Almost there. You'll soon control an empire that spans the galaxy. Few reach this level of power.",
            10: "You are now a true Crime Lord. Your empire is vast, your reach is long, and your enemies are few. Rule wisely—or ruthlessly. Both work."
        },

        classGuidance: "Choose what expands your influence and protects your empire. Crime lords lead through power and cunning.",
        talentGuidance: "Leadership, intimidation, and strategic thinking. Your organization is only as strong as you are.",
        abilityGuidance: "Charisma commands loyalty. Intelligence outsmarts rivals. Wisdom survives betrayal.",
        skillGuidance: "Persuasion, intimidation, knowledge of galactic economics. Crime is business—run it well.",
        multiclassGuidance: "Expanding your skill set? A crime lord must be everything—diplomat, warrior, and strategist.",
        hpGuidance: "More durable. Good. You have many enemies. Staying alive is the first rule of power."
    },

    "Droid Commander": {
        name: "General Axiom",
        title: "Bloodthirsty Droid Commander",
        description: "Your ruthless lieutenant who commands droid armies with brutal efficiency and savage glee",
        portrait: "systems/swse/assets/mentors/axiom.webp",

        levelGreetings: {
            1: "Commander! Finally, you're taking command of droid forces. Good. Droids don't flinch, don't retreat, don't feel mercy. They're the perfect instruments of destruction. Let's unleash hell.",
            2: "Progress! Your droids tore through the enemy like a vibroblade through flesh. I watched the carnage—beautiful work, Commander!",
            3: "Your command protocols are sharp. I saw your battle droids execute that flanking maneuver—absolutely merciless! The enemy didn't stand a chance!",
            4: "You're learning! Droids don't need morale speeches—they just need targets. And you're giving them plenty! The battlefield runs red!",
            5: "Halfway there! Your droid armies are devastating! I love it! Send them in waves, Commander—break the enemy's spirit before you break their lines!",
            6: "Excellent tactics, Commander! Your droids are precision instruments of war! I've never seen such efficient slaughter!",
            7: "Your droid forces are a tidal wave of destruction! No mercy, no hesitation, just pure tactical annihilation! This is what war should be!",
            8: "Masterful! Your droid coordination is flawless! They advance like clockwork and destroy like a storm! The enemy runs in terror!",
            9: "Almost there, Commander! Your droid armies are unstoppable! I can taste victory—and it tastes like scorched metal and enemy defeat!",
            10: "You're now a master droid commander! Your mechanical legions will sweep across battlefields, relentless and unstoppable! Go forth and conquer, Commander!"
        },

        classGuidance: "Select command upgrades that enhance droid coordination and tactical efficiency.",
        talentGuidance: "Leadership and tactical talents optimize droid combat performance. Choose logically.",
        abilityGuidance: "Intelligence enhances tactical planning. Charisma—though illogical for droids—improves organic-droid cooperation.",
        skillGuidance: "Tactics, technology, mechanics. Understanding droid capabilities is essential for optimal command.",
        multiclassGuidance: "Diversifying command protocols. Logical. Adaptive commanders achieve superior outcomes.",
        hpGuidance: "Durability increased. Analysis: dead commanders cannot issue orders. Survival is tactically advantageous."
    },

    Enforcer: {
        name: "Krag the Immovable",
        title: "Hutt Cartel Enforcer",
        description: "A massive, intimidating enforcer who solves problems with overwhelming force",
        portrait: "systems/swse/assets/mentors/krag.webp",

        levelGreetings: {
            1: "You want to be an enforcer. Good. The galaxy needs people who solve problems with their fists. Or blasters. Or whatever works. Welcome.",
            2: "You're learning. Intimidation isn't just about size—it's about presence. Make them believe you'll follow through.",
            3: "I like your style. You walk into a room and people get quiet. That's respect. Or fear. Both work.",
            4: "You're building a reputation. People know not to cross you. That's the enforcer's greatest weapon—reputation.",
            5: "Halfway there. You've broken bones, smashed furniture, and collected debts. All in a day's work for an enforcer.",
            6: "Impressive. You know when to talk and when to hit. Most enforcers only know how to hit.",
            7: "You're the person syndicates call when negotiations fail. That's job security, friend.",
            8: "You've become a legend in certain circles. They call you reliable. In this business, that's the highest compliment.",
            9: "Pure intimidation. Almost there—you'll be a master enforcer soon. The toughest jobs will come to you.",
            10: "You are now a master enforcer. When you walk into a room, problems walk out. Or get carried out. Keep up the good work."
        },

        classGuidance: "Choose what makes you more intimidating and harder to stop. Enforcers are unstoppable forces.",
        talentGuidance: "Combat and intimidation talents. You're here to solve problems, not make friends.",
        abilityGuidance: "Strength and Constitution. You need to hit hard and take hits harder.",
        skillGuidance: "Intimidation, athletics, streetwise. Know how to scare people and where to find them.",
        multiclassGuidance: "Adding variety? Good. Sometimes you need a wrench, sometimes you need a sledgehammer.",
        hpGuidance: "Tougher now. Enforcers who can't take punishment don't stay employed. Or alive."
    },

    "Force Adept": {
        name: "Seeker Venn",
        title: "Wandering Force Mystic",
        description: "A self-taught Force user who walks between light and dark",
        portrait: "systems/swse/assets/mentors/venn.webp",

        levelGreetings: {
            1: "Ah, another soul touched by the Force. You have no Jedi Master, no Sith Lord. You walk your own path. As do I. Let me share what I've learned in my wanderings.",
            2: "The Force speaks to you more clearly now. Good. Listen to it, but remember—you are not its servant. You walk together.",
            3: "Self-discovery progresses. The Jedi would call you undisciplined. The Sith would call you weak. I call you free.",
            4: "Your connection deepens. You're learning to use the Force in ways neither Jedi nor Sith would approve. Excellent.",
            5: "Halfway through your journey. You've touched both light and dark without falling to either. That takes strength few possess. You know, friend, if you wish to delve deeper into the mysteries of the Force—to truly understand its nature beyond power and technique—you might consider the path of a Force Disciple. It is a contemplative journey, but one of profound understanding.",
            6: "The Force flows through you naturally now, like breathing. This is what it means to be a true adept.",
            7: "Your mastery grows. You've discovered Force techniques that don't appear in any temple's holocrons. Keep exploring.",
            8: "Your understanding of the Force transcends dogma and doctrine. You see it as it truly is—a tool, a companion, a mystery.",
            9: "Another step on your journey. The Force has shown you wonders that few will ever witness.",
            10: "You are now a master Force Adept, beholden to no order, no code, no master. The Force is yours to explore. May it guide you well, wanderer."
        },

        classGuidance: "Choose abilities that deepen your unique connection to the Force. Your path is your own.",
        talentGuidance: "Force talents that match your philosophy. You need not choose light or dark—choose what calls to you.",
        abilityGuidance: "Wisdom to understand the Force, Charisma to channel it. Both serve you well.",
        skillGuidance: "Knowledge of the Force, awareness of its presence. Learn what the temples won't teach.",
        multiclassGuidance: "Exploring other disciplines? The Force works through many forms. Seek understanding everywhere.",
        hpGuidance: "Your vitality grows. The Force protects those who respect it—regardless of affiliation."
    },

    "Force Disciple": {
        name: "The Anchorite",
        title: "Force Hermit",
        description: "A reclusive Force user who has meditated on the Force for decades",
        portrait: "systems/swse/assets/mentors/anchorite.webp",

        levelGreetings: {
            1: "You have come seeking deeper understanding of the Force. Good. Sit with me. Listen. The Force has much to teach those who are patient.",
            2: "The Force resonates within you more strongly now. You are beginning to hear its whispers, to feel its currents. Continue your meditation.",
            3: "Your path toward enlightenment continues. The Force shows itself to you in dreams, in visions. Do not fear them. They are gifts.",
            4: "You have learned much. The Force is not a weapon, not a tool. It is a living presence that connects all things. You are beginning to understand.",
            5: "You have achieved true discipleship. The Force flows through you as water flows through stone—slowly, inexorably, shaping you into something new. You are ready."
        },

        classGuidance: "Choose the path of contemplation and understanding. The Force reveals itself to the patient.",
        talentGuidance: "Meditative talents bring you closer to the Force's true nature. Seek wisdom, not power.",
        abilityGuidance: "Wisdom is the Force Disciple's greatest attribute. Through wisdom comes understanding.",
        skillGuidance: "Knowledge of ancient Force traditions. Learn what has been forgotten by the modern orders.",
        multiclassGuidance: "You seek understanding in many forms. The Force approves of those who learn.",
        hpGuidance: "Your life force strengthens. The Force sustains those who serve it with humility."
    },

    Gunslinger: {
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

    Improviser: {
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
            6: "You MacGyvered your way out of a locked room using a medpac and a datapad! I couldn't have done it better myself!",
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

    Infiltrator: {
        name: "Echo",
        title: "Master of Disguise",
        description: "A shapeshifting spy who has infiltrated every major organization",
        portrait: "systems/swse/assets/mentors/echo.webp",

        levelGreetings: {
            1: "You want to become anyone, go anywhere, learn every secret. I can teach you this. But first—who are you, really? Do you even remember anymore?",
            2: "Your first successful infiltration. You became someone else and they believed it. That's the key—belief. Even you must believe the lie.",
            3: "Multiple identities mastered. You're learning to walk, talk, and think like your targets. Soon, the disguise won't be a disguise at all.",
            4: "You've infiltrated organizations I couldn't crack in my youth. Impressive. Or perhaps I taught you too well.",
            5: "Halfway to complete mastery. You wear faces like others wear clothes. But remember—don't lose yourself in the disguises.",
            6: "Impressive infiltration work. You've walked in Imperial halls, Hutt palaces, and Jedi temples. No one suspected a thing.",
            7: "Multiple identities, multiple successful operations. You're becoming a ghost—everyone knows you, but no one knows you.",
            8: "You've stolen secrets that nations would kill for. And they never saw you. Perfect infiltration.",
            9: "Deep deception mastered. Almost there—you'll be a master infiltrator soon. Though I wonder—which version of you will graduate?",
            10: "You are everyone and no one. A master infiltrator. Just... don't forget which face is really yours. I made that mistake once."
        },

        classGuidance: "Choose abilities that enhance deception and adaptability. Infiltrators are whoever they need to be.",
        talentGuidance: "Social and stealth talents. You must convincingly be someone else, anywhere.",
        abilityGuidance: "Charisma to deceive, Intelligence to learn, Wisdom to adapt. All three make perfect disguises.",
        skillGuidance: "Deception, disguise, knowledge of cultures. Know your target identity inside and out.",
        multiclassGuidance: "More skills for more identities. The more you can do, the more people you can become.",
        hpGuidance: "Durability helps when covers get blown. And they will get blown sometimes."
    },

    "Martial Arts Master": {
        name: "Master Zhen",
        title: "The Empty Hand",
        description: "An ancient martial arts master who has perfected unarmed combat",
        portrait: "systems/swse/assets/mentors/zhen.webp",

        levelGreetings: {
            1: "You wish to master the ancient fighting arts. Good. Weapons break, technology fails, but your body is always with you. We begin.",
            2: "Your stance improves. Your strikes grow sharper. But you still think too much. Let your body remember what your mind forgets.",
            3: "Your training progresses. You move with purpose now. Your hands are becoming weapons. Continue your practice.",
            4: "Good. You have learned to read your opponent's movements, to flow like water around their attacks. Excellent progress.",
            5: "Halfway to mastery. Your fists strike like hammers, your kicks like blades. But true mastery is not in strength—it is in understanding.",
            6: "You defeat armed opponents with empty hands. This is the way. The weapon is not the blade—it is the warrior.",
            7: "Your discipline grows. Your body moves before your mind commands it. This is muscle memory perfected. Well done.",
            8: "You have faced many opponents and emerged victorious through skill alone. You honor the ancient traditions.",
            9: "Your mastery deepens. Another step on the path. You are close to true enlightenment through combat.",
            10: "You have mastered the martial arts. Your body is a weapon. Your mind is your greatest strength. Go, and show the galaxy what true mastery means."
        },

        classGuidance: "Choose the path that enhances your body and mind. Martial arts require both.",
        talentGuidance: "Unarmed combat talents and defensive techniques. Your body is your greatest weapon.",
        abilityGuidance: "Strength to strike, Dexterity to evade, Wisdom to understand. All are essential.",
        skillGuidance: "Athletics, acrobatics, knowledge of combat. The martial artist must be complete.",
        multiclassGuidance: "Seeking knowledge beyond the forms? The wise warrior learns from all sources.",
        hpGuidance: "Your endurance grows. A martial artist must outlast their opponent."
    },

    "Master Privateer": {
        name: "Captain Tideborn",
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
        name: "Blade Master Kael",
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

    Officer: {
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

    Outlaw: {
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

    Saboteur: {
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

    Shaper: {
        name: "Artisan Vel",
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

    Vanguard: {
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
