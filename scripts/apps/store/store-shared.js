/**
 * Shared utilities and constants for SWSE Store
 */

/**
 * Rendarr's jovial dialogue for different shop contexts
 * @returns {Object} Dialogue organized by category
 */
export function getRendarrDialogue() {
    return {
        weapons: [
            "Ah, looking for something with a bit of kick, are we? I've got just the thing!",
            "Weapons! Now we're talking! Nothing says 'hello' like a well-aimed blaster bolt!",
            "You've got good taste, lad! These beauties never let you down!",
            "Excellent choice! Though I hope you won't be pointing any of these at me, eh?",
            "The finest armaments this side of the Core Worlds, I assure you!",
            "A weapon is only as good as the person wielding it... but these are VERY good!",
            "Now these'll make those scoundrels think twice before crossing you!",
            "Hah! I remember when I used to sling one of these myself. Good times!",
            "Quality craftsmanship! Not like those cheap knockoffs from Nar Shaddaa.",
            "You'll be the most well-armed customer I've had all week!",
            "These babies pack more punch than a Wookiee with a grudge!",
            "Ah, a fellow enthusiast of the finer implements of negotiation!",
            "I've tested each one personally! Well, not the thermal detonators...",
            "Looking to do some 'aggressive negotiations,' I see!",
            "Nothing says 'I mean business' quite like these!",
            "My suppliers swear by these! And they're still alive to tell about it!",
            "Excellent choice! Though the wife says I stock too many weapons...",
            "Every one of these has a story! Most of them exciting!",
            "These'll serve you well, whether you're hunting or being hunted!",
            "Ah, preparing for trouble, I see! Smart thinking in these times!",
            "I've got pieces here that would make a Mandalorian jealous!",
            "The best offense is a good weapon, as I always say!",
            "You've got a good eye, lad! These are top-shelf merchandise!",
            "Weapons that'll last you a lifetime! Hopefully a long one!",
            "Hah! With these, you'll be unstoppable! ...Within reason, of course."
        ],
        armor: [
            "Smart thinking! Can't spend credits if you're dead, now can you?",
            "Armor! The difference between a close call and a funeral!",
            "Ah, the cautious type! I like that in a customer!",
            "Nothing wrong with a little extra protection, especially these days!",
            "These'll keep you in one piece! Trust me, I've seen the alternative!",
            "Good choice! Better to have it and not need it!",
            "I always say: dress for the job you want, and apparently you want to survive!",
            "Quality protection! None of that flimsy stuff that falls apart!",
            "Your mother would be proud! Mine always told me to wear clean armor!",
            "Hah! With this, you'll be harder to kill than a swamp slug!",
            "The finest defensive gear in the sector! Guaranteed!",
            "I've got armor here that's stopped everything from blasters to Gamorrean fists!",
            "Smart investment! Hospital bills cost more than armor, you know!",
            "These'll turn you into a walking fortress, my friend!",
            "Ah, planning to get shot at, are we? Good to be prepared!",
            "This stuff has saved more lives than bacta tanks!",
            "You can't put a price on safety! Well, you can, and I have!",
            "Excellent choice! Fashion AND function!",
            "The best armor credits can buy! And your credits, specifically!",
            "I've personally tested some of these! I'm still here, aren't I?",
            "Protection worthy of royalty! Or at least someone who wants to keep living!",
            "Nothing says 'I value my life' like quality armor!",
            "These'll make you tougher than a krayt dragon's hide!",
            "Ah, investing in your future! Which hopefully will be a long one!",
            "Smart shoppers buy armor! Dead shoppers... well, they don't buy anything!"
        ],
        grenades: [
            "Ah, for when you need to make a big impression! Very big!",
            "Explosives! Handle with care... or don't, I'm not responsible!",
            "Planning a party, are we? These'll really liven things up!",
            "Nothing solves problems quite like a well-placed thermal detonator!",
            "Careful with these! I'd like my shop to remain in one piece!",
            "For those situations where 'overkill' is just 'adequate kill'!",
            "Ah, the diplomatic approach! Loud, explosive diplomacy!",
            "These'll clear a room faster than my wife's cooking! Don't tell her I said that!",
            "Boom! That's the sound of success, my friend!",
            "I've got enough explosives here to worry the local authorities!",
            "For when you absolutely, positively need to eliminate everything in the area!",
            "Handle carefully! My insurance doesn't cover 'customer incidents'!",
            "Nothing says 'I'm serious' like a bandolier of thermal detonators!",
            "These babies are guaranteed to make an impact! A very large impact!",
            "Ah, taking the direct approach, I see! I admire that!",
            "Perfect for those hard-to-reach enemies! Like ones in bunkers!",
            "The ultimate conversation ender! Use sparingly!",
            "I sell more of these during tax season. Coincidence? I think not!",
            "Remember: there's no such thing as too much firepower!",
            "These'll turn any problem into a crater! Which solves the problem!",
            "Explosives! Because sometimes you need to think outside the box! Then destroy the box!",
            "Ah, the subtle touch! By which I mean extremely not subtle!",
            "Perfect for when you want everyone to know you've arrived!",
            "I love the smell of thermal detonators in the morning! From a safe distance!",
            "For discriminating customers who appreciate the finer points of demolition!"
        ],
        medical: [
            "Wise investment! Can't enjoy your purchases if you're dead!",
            "Medical supplies! For when things don't go according to plan!",
            "Ah, the responsible shopper! I like your style!",
            "These'll patch you right up! Better than new! Well, almost!",
            "Every adventurer needs a good medpac! Trust me on this!",
            "Planning ahead! That's the sign of someone who'll live long enough to shop again!",
            "I've used these myself! Still got all my fingers! ...Most of them!",
            "Bacta! The miracle substance! Smells terrible, works wonders!",
            "For when your plans meet reality, and reality wins!",
            "Smart thinking! Dead customers don't come back! ...Usually!",
            "These'll have you back on your feet in no time!",
            "An ounce of prevention! Or in this case, a medpac of healing!",
            "I always keep some of these handy! You never know!",
            "Medical supplies! Because even heroes need a little help sometimes!",
            "These have saved more lives than I can count! And I can count pretty high!",
            "Ah, preparing for the worst! While hoping for the best!",
            "Nothing like quality medical supplies when you need them most!",
            "I've got everything from bacta to antibiotics! The galaxy's pharmacy!",
            "For those 'oops' moments that happen in the field!",
            "Your future self will thank you for buying these!",
            "Medical gear! The difference between a story and a tragedy!",
            "These work better than hope and prayer! Though those help too!",
            "I sell more medical supplies than I'd like... dangerous galaxy out there!",
            "Smart purchase! Your medic will love you for this!",
            "Remember: you can't have too many medpacs! Unlike thermal detonators!"
        ],
        tech: [
            "Ah, a tech enthusiast! I've got gadgets that'll make your life easier!",
            "Technology! The civilized person's toolkit!",
            "These little beauties can get you out of all sorts of trouble!",
            "I love these gadgets! Though I'll admit, I don't understand half of them!",
            "Tech gear! For when you need to be smarter than the problem!",
            "Ah, working smarter, not harder! I respect that!",
            "I've got tech here that would make a Tech Specialist jealous!",
            "These gizmos have more features than I have inventory!",
            "Technology! Humanity's greatest achievement! Well, one of them!",
            "For the discerning customer who appreciates innovation!",
            "I've got everything from datapads to sensor suites!",
            "These'll give you an edge! A technological edge!",
            "Ah, the modern adventurer's best friends!",
            "Tech gear! Because sometimes you can't just shoot your problems!",
            "I've got gadgets here I don't even know what they do! But they're quality!",
            "For when you need information more than intimidation!",
            "These little wonders have saved more missions than blasters!",
            "Smart shopping! Information is power, after all!",
            "I love selling these! Nobody's ever blown up my shop with a datapad!",
            "Technology! Making impossible problems merely difficult since forever!",
            "Ah, investing in your intellectual arsenal! Excellent!",
            "These gadgets are user-friendly! Mostly! Instructions included! Sometimes!",
            "For the thinking person's approach to problem-solving!",
            "Tech that'll make you feel like you're living in the future! Because you are!",
            "I've got more processing power here than a Star Destroyer! Probably!"
        ],
        tools: [
            "Tools! For when you need to fix things instead of destroying them!",
            "Ah, a practical soul! I appreciate that!",
            "Every good technician needs quality tools! And here they are!",
            "These'll help you build, repair, or modify anything!",
            "I've got tools here for every job imaginable! And some unimaginable!",
            "Nothing beats the satisfaction of fixing something yourself!",
            "Quality tools! They'll last you a lifetime of tinkering!",
            "For the hands-on type! I respect that!",
            "These tools have built everything from droids to starships!",
            "Ah, someone who knows the value of good equipment!",
            "I always say: the right tool for the right job!",
            "These'll help you jury-rig anything! And I mean anything!",
            "For when you need to MacGyver your way out of trouble!",
            "Quality craftsmanship! These tools are built to last!",
            "Every ship needs a good toolkit! Every person, really!",
            "Ah, preparing to get your hands dirty! Honorable work!",
            "These tools have repaired more ships than there are stars! Well, maybe not THAT many!",
            "For the mechanically inclined! Or the desperately improvising!",
            "I've got everything from hydrospanners to fusion cutters!",
            "Tools! Because sometimes 'percussive maintenance' isn't enough!",
            "Quality equipment for quality work! That's my motto!",
            "These'll turn you into a master technician! With practice! Lots of practice!",
            "For those who prefer creating to destroying! Though these do both!",
            "I've seen miracles performed with tools like these! And some disasters too!",
            "Smart purchase! Can't fix a hyperdrive with hope and determination alone!"
        ],
        survival: [
            "Survival gear! For when civilization is nowhere to be found!",
            "Ah, planning an adventure, are we? Smart to be prepared!",
            "These'll keep you alive in the harshest environments!",
            "I've got everything you need to survive! Except luck! Bring your own luck!",
            "Smart thinking! The galaxy's a dangerous place!",
            "Survival gear! Because not everywhere has room service!",
            "These supplies have saved countless lives! Hopefully yours too!",
            "For when you're off the beaten path! WAY off!",
            "I always keep some of this in my ship! You never know!",
            "Ah, the prepared traveler! You'll do just fine!",
            "Survival equipment! More valuable than credits when you need it!",
            "These'll keep you going when things get rough! And they will!",
            "Smart shopping! Better to have it and not need it!",
            "I've got gear here tested in every environment imaginable!",
            "For the explorer who values coming back alive!",
            "Survival! It's not just a good idea, it's the law! Well, should be!",
            "These supplies are lightweight, durable, and life-saving!",
            "Ah, someone who respects the wilderness! Good on you!",
            "I've seen people survive impossible situations with gear like this!",
            "For when the elements are trying to kill you! Happens more than you'd think!",
            "Quality survival equipment! Don't leave civilization without it!",
            "These'll make you self-sufficient! Well, mostly!",
            "Smart purchase! Nature doesn't negotiate!",
            "I love selling these! Means people are planning to come back!",
            "Survival gear! Because sometimes the mission goes sideways! Often, really!"
        ],
        security: [
            "Security! For keeping things in... or out!",
            "Ah, need to secure something? Or someone? I don't judge!",
            "Quality security equipment! Guaranteed to hold! Probably!",
            "For when you need to make sure something stays put!",
            "I've got locks, binders, everything a security-conscious person needs!",
            "Security gear! Because trust is overrated!",
            "These'll keep your valuables safe! Or prisoners secured! Your choice!",
            "Ah, the cautious type! Can't be too careful these days!",
            "Quality locks! Though a good thief can get through anything... don't tell anyone I said that!",
            "For when you need to restrict access! Politely but firmly!",
            "I've got security devices here that would stump most burglars!",
            "Smart thinking! Security is an investment in peace of mind!",
            "These binders are regulation quality! Strong and reliable!",
            "For keeping the untrustworthy... well, unable to cause trouble!",
            "Security equipment! Because 'please don't steal this' doesn't always work!",
            "I've got everything from basic locks to advanced security systems!",
            "Quality restraints! Tested on various... volunteers!",
            "Ah, need to secure something important? You've come to the right place!",
            "These'll hold better than a Hutt's promise!",
            "Security! The gift that keeps on keeping things secure!",
            "I sell a lot of these to bounty hunters! And people who don't like bounty hunters!",
            "For when you absolutely need something to stay where you put it!",
            "Quality security equipment! Because locks are cheaper than replacement costs!",
            "These'll keep everything locked up tighter than a Corellian safe!",
            "Smart purchase! An ounce of prevention, as they say!"
        ],
        equipment: [
            "Ah, browsing the miscellaneous! You never know what treasures you'll find!",
            "General equipment! The odds and ends that make life easier!",
            "I've got all sorts of useful items here! Some I'm not even sure what they do!",
            "The grab-bag of galactic goods! Something for everyone!",
            "These are the items that don't fit anywhere else! But you'll need them all the same!",
            "Miscellaneous gear! The unsung heroes of any mission!",
            "I love this section! So much variety!",
            "For the well-rounded adventurer! A bit of everything!",
            "You'd be surprised how often these 'odd' items save the day!",
            "General equipment! Because sometimes you need something... specific!",
            "I've got items here you didn't even know you needed! But you do!",
            "The catch-all category! Where all the interesting stuff ends up!",
            "These little items have gotten people out of more jams than bacta!",
            "Ah, the smart shopper knows to check everything!",
            "Miscellaneous! The most exciting category, in my opinion!",
            "I never know what I'll stock here! Keeps things interesting!",
            "For those unique situations that require unique solutions!",
            "General gear! The foundation of any good kit!",
            "These items may seem random, but they're all essential! Eventually!",
            "Ah, exploring the full inventory! I like your thoroughness!",
            "You'll find all sorts of gems in this section!",
            "Miscellaneous equipment! Where practicality meets opportunity!",
            "I've got items here that have won bar bets! True story!",
            "The grab-bag! Always worth a look!",
            "General equipment! Because you never know what the day will bring!"
        ],
        droids: [
            "Droids! Loyal, tireless, and they never complain about working conditions!",
            "Ah, looking for a mechanical companion? Best decision you'll ever make!",
            "I love droids! They're more reliable than most organics I know!",
            "Quality droids! Programmed for excellence!",
            "These metal friends will serve you well! No backtalk either!",
            "Droids! The ultimate in reliable companionship!",
            "I've got models here for every need! Combat, protocol, utility!",
            "Ah, investing in automation! Smart thinking!",
            "These droids are top-of-the-line! Well-maintained and fully functional!",
            "Mechanical perfection! Or as close as you can get!",
            "Droids! They'll work longer hours than any organic! And no meal breaks!",
            "I've got droids here that are smarter than some people I know!",
            "Quality mechanical assistants! Guaranteed to follow orders! Mostly!",
            "Ah, the droid section! Where technology meets personality!",
            "These'll make your life so much easier! Trust me!",
            "Droids! For when you need help but don't want to deal with people!",
            "I've got models here from the finest manufacturers in the galaxy!",
            "Smart investment! A good droid pays for itself!",
            "These mechanical marvels will never let you down! Unless their batteries die!",
            "Ah, building your crew! Droids make excellent team members!",
            "I've sold droids to everyone from smugglers to senators!",
            "Quality craftsmanship! These droids are built to last!",
            "For when you need an extra pair of hands! Metal hands!",
            "Droids! The perfect blend of utility and companionship!",
            "I've got droids here that can do almost anything! Except appreciate my jokes!"
        ],
        vehicles: [
            "Vehicles! For when walking just won't cut it!",
            "Ah, shopping for wheels! Or repulsorlifts! Or hyperdrives!",
            "I've got everything from swoops to starships! Well, not quite starships!",
            "Quality vehicles! Fast, reliable, and only slightly used! Some of them!",
            "For when you need to get there in style! Or at least quickly!",
            "Vehicles! The freedom to go anywhere! Within fuel range!",
            "I've got rides here that'll make you the envy of the spaceport!",
            "Ah, time to upgrade your transportation! Excellent choice!",
            "These vehicles have been well-maintained! Mostly!",
            "For the discerning traveler who values speed and comfort!",
            "I love vehicles! The smell of fuel, the sound of engines! Beautiful!",
            "Quality rides! Some new, some used, all functional!",
            "Ah, investing in mobility! Can't put a price on freedom! Well, I can, and I have!",
            "These'll get you from point A to point B! And usually back again!",
            "Vehicles! Because teleportation still isn't a thing!",
            "I've got transportation here for every budget and need!",
            "Smart shopping! Your own ship means your own schedule!",
            "These vehicles are certified! Well, most of them are certified!",
            "For when you're tired of relying on public transport!",
            "I've sold vehicles to everyone from racers to rebels!",
            "Quality engineering! These'll serve you well for years!",
            "Ah, the vehicle section! Where dreams of the open sky come true!",
            "I've got models here that are faster than they look!",
            "Vehicles! Your ticket to adventure! Maintenance sold separately!",
            "Smart investment! Nothing beats having your own ride!"
        ],
        services: [
            "Services! The necessities of civilized life!",
            "Ah, need room and board? Transportation? You've come to the right place!",
            "Services! Because adventurers need to eat and sleep too!",
            "I can arrange anything from a hot meal to a luxury suite!",
            "Ah, the practical purchases! Smart thinking!",
            "Services! Let me take care of the logistics while you focus on adventure!",
            "Need transportation? Lodging? Medical care? I know people!",
            "Ah, browsing the essentials! Can't save the galaxy on an empty stomach!",
            "Services! The often-overlooked but always-needed expenses!",
            "I've got contacts for everything! Best rates in the sector!",
            "Ah, planning ahead! I like a customer who thinks long-term!",
            "Services! From budget to luxury, I can arrange it all!",
            "Need a place to stay? A ride across the system? Say the word!",
            "Ah, the cost of living! Someone's got to pay for it!",
            "Services! Making life easier, one credit at a time!",
            "I work with the best providers in the system! Quality guaranteed!",
            "Ah, need medical attention? Transportation? Consider it done!",
            "Services! Because heroes need logistics support too!",
            "From cantina meals to chartered transports, I've got you covered!",
            "Ah, investing in comfort and convenience! Wise choice!",
            "Services! The invisible foundation of every successful mission!",
            "Need to rent a speeder? Book passage? I know the best deals!",
            "Ah, the smart shopper plans for everything! Including expenses!",
            "Services! Let professionals handle the details!",
            "I've arranged everything from luxury suites to emergency medical care! Nothing surprises me!"
        ],
        cart: [
            "Ah, reviewing your selections! Take your time, no rush!",
            "The cart! Where dreams become purchases!",
            "Excellent choices so far! You've got good taste!",
            "I can already tell you're going to be one of my favorite customers!",
            "Take your time! Make sure you've got everything you need!",
            "The shopping cart! My favorite part of any transaction!",
            "Looking good! Anything else catch your eye?",
            "Ah, decision time! The hardest part of shopping!",
            "I can see you've been busy! Excellent selections!",
            "The cart! One step closer to completing your purchase!",
            "Don't forget to double-check! I'd hate for you to miss something!",
            "Excellent choices! You clearly know what you're doing!",
            "The checkout's just a click away! When you're ready, of course!",
            "I love seeing a full cart! Music to a shopkeeper's ears!",
            "Take your time reviewing! No pressure! Well, maybe a little!",
            "Ah, the cart! Where possibilities become reality!",
            "Smart shopping! Always good to review before buying!",
            "I can tell you've thought this through! Professional shopper!",
            "The cart! The penultimate step in our transaction!",
            "Looking at your haul, I'd say you're well-prepared!",
            "Excellent selections! You won't be disappointed!",
            "Ah, the moment of truth! Ready to make it official?",
            "I love this part! The anticipation! The excitement!",
            "Your cart's looking good! Ready when you are!",
            "Smart customer! Always review before you commit!"
        ],
        gm: [
            "Ah, the GM controls! Changing the rules, are we?",
            "The secret back room! Don't tell the customers!",
            "GM powers! With great power comes great... profit margins!",
            "Ah, adjusting the economy! I respect that!",
            "The controls! Making the galaxy work the way YOU want!",
            "GM section! Where the magic happens! The pricing magic!",
            "Ah, the power to set prices! I wish I had that in real life!",
            "The behind-the-scenes! The man behind the curtain!",
            "GM controls! For when you need to balance the force! The economic force!",
            "Ah, tweaking the settings! Every good shop needs maintenance!",
            "The GM panel! Where dreams and budgets collide!",
            "Ah, the power to control commerce! Intoxicating, isn't it?",
            "GM section! For the puppet master of the economy!",
            "The controls! Handle with care! Or don't! You're the GM!",
            "Ah, making adjustments! The invisible hand of the market! Your hand!",
            "GM powers! The ability to make everyone rich! Or poor! Your choice!",
            "The secret settings! Where game balance is born!",
            "Ah, the GM section! The most powerful shopping tab of all!",
            "Controls! For when you need to nudge the economy!",
            "GM panel! Where you decide if I'm generous or greedy!",
            "Ah, the meta-shop! Shopping for shop settings!",
            "The GM controls! Because sometimes the game needs... adjustment!",
            "Ah, tinkering with the fundamentals! I support this!",
            "The power panel! Use it wisely! Or not! You're the GM!",
            "GM section! Where the real power lies!"
        ],
        purchase: [
            "Excellent choice! You won't regret it!",
            "Sold! Pleasure doing business with you!",
            "A fine selection! Enjoy your purchase!",
            "Wonderful! Another satisfied customer!",
            "Added to your cart! You're on a roll!",
            "Great choice! I'd buy it myself if I didn't already have three!",
            "Sold! May it serve you well!",
            "Excellent taste! This one's a bestseller!",
            "Into the cart it goes! Smart shopping!",
            "Another fine addition to your collection!",
            "You've got good instincts! This one's quality!",
            "Sold! You won't find better prices anywhere!",
            "Great choice! I sold five of these just yesterday!",
            "Into your cart! Building quite the arsenal, aren't you?",
            "Excellent! That one's been flying off the shelves!",
            "Wise purchase! You'll thank me later!",
            "Added! Your credit pouch is getting lighter already!",
            "Fantastic choice! I use one of these myself!",
            "Sold! May it bring you fortune and glory!",
            "Great pick! You clearly know your equipment!",
            "Into the cart! At this rate, you'll buy out my whole stock!",
            "Excellent! That's one of my personal favorites!",
            "Smart buy! This one's saved more than a few lives!",
            "Added to cart! You're going to love this one!",
            "Wonderful! I can tell you're a professional!"
        ],
        welcome: [
            "Welcome to my shop, lad! Spend to your heart's desire!",
            "Ah, a customer! Welcome! Everything's for sale!",
            "Come in, come in! Best prices this side of Coruscant!",
            "Welcome! I've got exactly what you need! Probably!",
            "Ah, welcome back! Or is it your first time? Either way, welcome!",
            "Step right up! Everything you see is quality merchandise!",
            "Welcome, friend! Your credits and my goods are about to meet!",
            "Ah, another brave soul enters Rendarr's establishment!",
            "Welcome! I promise you won't leave empty-handed! Or empty-pocketed!",
            "Come in! The best shop in the sector! I may be biased!",
            "Welcome, welcome! Make yourself at home! Browse to your heart's content!",
            "Ah, a new face! Or a returning one! Hard to tell with helmets! Welcome!",
            "Step inside! Quality goods at... reasonable prices!",
            "Welcome! I've been expecting you! Well, someone like you! A customer!",
            "Ah, welcome to Rendarr's! Where your credits become memories!",
            "Come in, friend! Let me help you spend your hard-earned money!",
            "Welcome! Everything's guaranteed! Mostly! Welcome!",
            "Ah, a customer! My favorite kind of visitor!",
            "Welcome to the finest shop you'll visit today! Probably the only one!",
            "Step right in! Your credits are welcome here!",
            "Ah, welcome! I've got deals that'll make your head spin!",
            "Come in, come in! Don't be shy! The merchandise won't bite!",
            "Welcome! I'm Rendarr, and I'll be your shopkeeper today!",
            "Ah, another adventurer! Welcome! You've come to the right place!",
            "Welcome, friend! Let's turn those credits into useful equipment!"
        ]
    };
}

/**
 * Get random dialogue from Rendarr based on context
 * @param {string} context - The context (tab name or 'purchase')
 * @returns {string} Random dialogue
 */
export function getRandomDialogue(context) {
    const dialogues = getRendarrDialogue()[context];
    if (!dialogues || dialogues.length === 0) {
        return "I've got what you need, lad!";
    }
    return dialogues[Math.floor(Math.random() * dialogues.length)];
}

/**
 * Helper to categorize equipment by keywords
 * @param {Object} item - Item to categorize
 * @returns {string} Category name
 */
export function categorizeEquipment(item) {
    const name = item.name.toLowerCase();
    const desc = (item.system?.description || "").toLowerCase();
    const text = `${name} ${desc}`;

    // Grenades & Explosives
    if (name.includes("grenade") || name.includes("explosive") || name.includes("mine") ||
        name.includes("detonator") || name.includes("thermal detonator")) {
        return "grenades";
    }

    // Medical Supplies
    if (name.includes("medpac") || name.includes("medical") || name.includes("stim") ||
        name.includes("bacta") || name.includes("antidote") || name.includes("antitoxin")) {
        return "medical";
    }

    // Tech Items
    if (name.includes("comlink") || name.includes("datapad") || name.includes("scanner") ||
        name.includes("holoprojector") || name.includes("sensor") || name.includes("holo") ||
        name.includes("recording") || name.includes("computer")) {
        return "tech";
    }

    // Security Items
    if (name.includes("binder") || name.includes("restraining") || name.includes("lock") ||
        name.includes("security") || name.includes("code cylinder")) {
        return "security";
    }

    // Survival Gear
    if (name.includes("ration") || name.includes("glow rod") || name.includes("tent") ||
        name.includes("breath mask") || name.includes("rebreather") || name.includes("climbing")) {
        return "survival";
    }

    // Tools
    if (name.includes("tool") || name.includes("kit") || name.includes("fusion cutter") ||
        name.includes("hydrospanner") || name.includes("welding")) {
        return "tools";
    }

    // Default to general equipment
    return "equipment";
}

/**
 * Helper to sort and categorize weapons by category and subcategory
 * Returns object with melee and ranged categories, each with subcategories
 * @param {Array} weapons - Array of weapons
 * @returns {Object} Categorized weapons {melee: {simple: [], advanced: [], exotic: []}, ranged: {simple: [], pistols: [], rifles: [], heavy: [], exotic: []}}
 */
export function sortWeapons(weapons) {
    const categorized = {
        melee: {
            simple: [],
            advanced: [],
            exotic: []
        },
        ranged: {
            simple: [],
            pistols: [],
            rifles: [],
            heavy: [],
            exotic: []
        }
    };

    for (const weapon of weapons) {
        const category = weapon.system?.weaponCategory || 'ranged';
        const subcategory = weapon.system?.subcategory || 'other';

        if (category === 'melee') {
            if (categorized.melee[subcategory]) {
                categorized.melee[subcategory].push(weapon);
            }
        } else {
            if (categorized.ranged[subcategory]) {
                categorized.ranged[subcategory].push(weapon);
            }
        }
    }

    // Sort each subcategory alphabetically
    for (const category in categorized) {
        for (const subcategory in categorized[category]) {
            categorized[category][subcategory].sort((a, b) => a.name.localeCompare(b.name));
        }
    }

    return categorized;
}

/**
 * Helper to sort armor by type (Light, Medium, Heavy)
 * @param {Array} armors - Array of armor
 * @returns {Array} Sorted armor
 */
export function sortArmor(armors) {
    const typeOrder = { 'light': 0, 'medium': 1, 'heavy': 2 };
    return armors.sort((a, b) => {
        const aType = (a.system?.armorType || a.system?.type || '').toLowerCase();
        const bType = (b.system?.armorType || b.system?.type || '').toLowerCase();

        const aOrder = typeOrder[aType] ?? 999;
        const bOrder = typeOrder[bType] ?? 999;

        if (aOrder !== bOrder) return aOrder - bOrder;

        // Within same type, sort alphabetically
        return a.name.localeCompare(b.name);
    });
}
