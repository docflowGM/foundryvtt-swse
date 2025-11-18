/**
 * SWSE Store Application
 * Provides a holographic marketplace interface for buying and selling items
 */

import CharacterGenerator from './chargen.js';
import { VehicleModificationApp } from './vehicle-modification-app.js';

export class SWSEStore extends FormApplication {
    constructor(actor, options = {}) {
        super(actor, options);
        this.actor = actor;

        // Shopping cart state
        this.cart = {
            items: [],      // Regular items
            droids: [],     // Droid actors to purchase
            vehicles: []    // Vehicle actors to purchase
        };

        // Track cart total for animations
        this.cartTotal = 0;

        // Store items by ID for quick lookup
        this.itemsById = new Map();
    }

    /**
     * Rendarr's jovial dialogue for different shop contexts
     * @returns {Object} Dialogue organized by category
     */
    static get rendarrDialogue() {
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
    static getRandomDialogue(context) {
        const dialogues = this.rendarrDialogue[context];
        if (!dialogues || dialogues.length === 0) {
            return "I've got what you need, lad!";
        }
        return dialogues[Math.floor(Math.random() * dialogues.length)];
    }

    /**
     * Update Rendarr's dialogue in the UI
     * @param {HTMLElement} html - The app's HTML element
     * @param {string} message - The message to display
     * @private
     */
    _updateRendarrDialogue(html, message) {
        const messageEl = html.find('.holo-message');
        if (messageEl.length) {
            messageEl.text(`"${message}"`);
        }
    }

    /**
     * Animate a number counting up or down
     * @param {HTMLElement} element - The element to update
     * @param {number} start - Starting value
     * @param {number} end - Ending value
     * @param {number} duration - Duration in milliseconds
     * @private
     */
    _animateNumber(element, start, end, duration = 500) {
        const startTime = Date.now();
        const difference = end - start;

        const updateNumber = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smooth animation
            const easeProgress = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            const currentValue = Math.round(start + (difference * easeProgress));
            element.textContent = currentValue.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            }
        };

        requestAnimationFrame(updateNumber);
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "swse-store",
            template: "systems/swse/templates/apps/store/store.hbs",
            width: 900,
            height: 700,
            title: "Galactic Trade Exchange",
            resizable: true,
            closeOnSubmit: false,
            classes: ["swse", "swse-store"]
        });
    }

    /**
     * Get data for template rendering
     * @returns {Object} Template data
     */
    async getData() {
        const actor = this.object;
        const isGM = game.user.isGM;

        // Get all items from world items
        const worldItems = game.items.filter(i => {
            // Include all items - cost filtering can be added as a setting later
            return true;
        });

        // Load items from compendium packs
        const packItems = [];
        const packNames = ['swse.weapons', 'swse.armor', 'swse.equipment'];
        for (const packName of packNames) {
            const pack = game.packs.get(packName);
            if (pack) {
                const documents = await pack.getDocuments();
                // Include all items from compendium - many items have cost "0" that need to be displayed
                packItems.push(...documents);
            }
        }

        // Combine world items and pack items
        const allItems = [...worldItems, ...packItems];

        // Store items by ID for quick lookup
        this.itemsById.clear();
        allItems.forEach(item => {
            this.itemsById.set(item.id, item);
        });

        // Get all actors from world that could be droids or vehicles
        const worldActors = game.actors.filter(a => {
            return (a.type === "droid" || a.type === "vehicle" || a.system?.isDroid)
                && (a.system?.cost ?? 0) > 0;
        });

        // Load vehicles and droids from compendium packs
        const packActors = [];
        const actorPackNames = ['swse.vehicles', 'swse.droids'];
        for (const packName of actorPackNames) {
            const pack = game.packs.get(packName);
            if (pack) {
                const documents = await pack.getDocuments();
                // Include actors with cost > 0
                packActors.push(...documents.filter(a => (a.system?.cost ?? 0) > 0));
            }
        }

        // Combine world actors and pack actors
        const allActors = [...worldActors, ...packActors];

        // Store actors by ID for quick lookup (for availability filtering)
        allActors.forEach(actor => {
            this.itemsById.set(actor.id, actor);
        });

        // Helper to categorize equipment by keywords
        const categorizeEquipment = (item) => {
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
        };

        // Get equipment items and categorize them
        const equipmentItems = allItems.filter(i => i.type === "equipment" || i.type === "item");

        // Calculate final cost helper
        const markup = Number(game.settings.get("swse", "storeMarkup")) || 0;
        const discount = Number(game.settings.get("swse", "storeDiscount")) || 0;
        const calculateFinalCost = (baseCost) => {
            return Math.round(baseCost * (1 + markup / 100) * (1 - discount / 100));
        };

        // Add calculated final cost to each item
        const addFinalCost = (item) => {
            const baseCost = Number(item.system?.cost) || 0;
            return {
                ...item,
                id: item.id || item._id,  // Preserve ID for item selection
                _id: item._id || item.id, // Preserve both ID formats
                finalCost: calculateFinalCost(baseCost)
            };
        };

        // Categorize items and add final costs
        const categories = {
            weapons: allItems.filter(i => i.type === "weapon").map(addFinalCost),
            armor: allItems.filter(i => i.type === "armor").map(addFinalCost),
            grenades: equipmentItems.filter(i => categorizeEquipment(i) === "grenades").map(addFinalCost),
            medical: equipmentItems.filter(i => categorizeEquipment(i) === "medical").map(addFinalCost),
            tech: equipmentItems.filter(i => categorizeEquipment(i) === "tech").map(addFinalCost),
            security: equipmentItems.filter(i => categorizeEquipment(i) === "security").map(addFinalCost),
            survival: equipmentItems.filter(i => categorizeEquipment(i) === "survival").map(addFinalCost),
            tools: equipmentItems.filter(i => categorizeEquipment(i) === "tools").map(addFinalCost),
            equipment: equipmentItems.filter(i => categorizeEquipment(i) === "equipment").map(addFinalCost),
            vehicles: allActors.filter(a => a.type === "vehicle" || a.system?.isVehicle).map(a => ({
                ...a,
                finalCost: calculateFinalCost(Number(a.system?.cost) || 0),
                finalCostUsed: calculateFinalCost((Number(a.system?.cost) || 0) * 0.5)
            })),
            droids: allActors.filter(a => a.type === "droid" || a.system?.isDroid).map(a => ({
                ...a,
                finalCost: calculateFinalCost(Number(a.system?.cost) || 0)
            })),
            services: [
                {
                    name: "Dining",
                    icon: "fas fa-utensils",
                    items: [
                        { id: "dining-budget", name: "Budget Meal", cost: 2, notes: "Simple rations or cheap cantina fare" },
                        { id: "dining-average", name: "Average Meal", cost: 10, notes: "Standard restaurant or cantina meal" },
                        { id: "dining-upscale", name: "Upscale Meal", cost: 50, notes: "Fine dining experience" },
                        { id: "dining-luxurious", name: "Luxurious Meal", cost: 150, notes: "Premium culinary experience" }
                    ]
                },
                {
                    name: "Lodging",
                    icon: "fas fa-bed",
                    items: [
                        { id: "lodging-budget", name: "Budget Lodging (per day)", cost: 20, notes: "Basic sleeping quarters" },
                        { id: "lodging-average", name: "Average Lodging (per day)", cost: 50, notes: "Standard hotel room" },
                        { id: "lodging-upscale", name: "Upscale Lodging (per day)", cost: 100, notes: "Comfortable accommodations" },
                        { id: "lodging-luxurious", name: "Luxurious Lodging (per day)", cost: 200, notes: "Premium suite with amenities" }
                    ]
                },
                {
                    name: "Medical Care",
                    icon: "fas fa-heartbeat",
                    items: [
                        { id: "medical-medpac", name: "Medpac Treatment", cost: 300, notes: "Professional medical attention" },
                        { id: "medical-bacta", name: "Bacta Tank (per hour)", cost: 300, notes: "Advanced healing immersion" },
                        { id: "medical-surgery", name: "Surgery (per hour)", cost: 500, notes: "Surgical procedures" },
                        { id: "medical-longterm", name: "Long-term Care (per day)", cost: 300, notes: "Extended medical monitoring" },
                        { id: "medical-disease", name: "Treat Disease (per day)", cost: 500, notes: "Disease treatment regimen" },
                        { id: "medical-radiation", name: "Treat Radiation (per day)", cost: 1000, notes: "Radiation sickness treatment" },
                        { id: "medical-poison", name: "Treat Poison (per hour)", cost: 100, notes: "Antitoxin and monitoring" }
                    ]
                },
                {
                    name: "Transportation",
                    icon: "fas fa-shuttle-van",
                    items: [
                        { id: "transport-taxi", name: "Local Taxi", cost: 10, notes: "Short-distance local transport" },
                        { id: "transport-steerage", name: "Passage: Steerage (up to 5 days)", cost: 500, notes: "Basic interplanetary travel" },
                        { id: "transport-average", name: "Passage: Average (up to 5 days)", cost: 1000, notes: "Standard passenger transport" },
                        { id: "transport-upscale", name: "Passage: Upscale (5 days)", cost: 2000, notes: "Comfortable travel accommodations" },
                        { id: "transport-luxurious", name: "Passage: Luxurious (5 days)", cost: 5000, notes: "First-class travel experience" },
                        { id: "transport-charter", name: "Chartered Space Transport (up to 5 days)", cost: 10000, notes: "Private vessel charter" }
                    ]
                },
                {
                    name: "Monthly Upkeep / Lifestyle",
                    icon: "fas fa-home",
                    items: [
                        { id: "upkeep-selfsufficient", name: "Self-Sufficient", cost: 100, notes: "Minimal expenses, living off the land" },
                        { id: "upkeep-impoverished", name: "Impoverished", cost: 200, notes: "Barely scraping by" },
                        { id: "upkeep-struggling", name: "Struggling", cost: 500, notes: "Making ends meet with difficulty" },
                        { id: "upkeep-average", name: "Average", cost: 1000, notes: "Standard middle-class lifestyle" },
                        { id: "upkeep-comfortable", name: "Comfortable", cost: 2000, notes: "Above-average quality of life" },
                        { id: "upkeep-wealthy", name: "Wealthy", cost: 5000, notes: "Affluent lifestyle" },
                        { id: "upkeep-luxurious", name: "Luxurious", cost: 10000, notes: "Elite upper-class living" }
                    ]
                },
                {
                    name: "Vehicle Rental",
                    icon: "fas fa-car",
                    items: [
                        { id: "rental-speederbike", name: "Speeder Bike (per day)", cost: 20, notes: "Fast personal transport" },
                        { id: "rental-landspeeder", name: "Landspeeder: Average (per day)", cost: 50, notes: "Standard ground vehicle" },
                        { id: "rental-landspeeder-luxury", name: "Landspeeder: Luxury (per day)", cost: 100, notes: "High-end ground vehicle" },
                        { id: "rental-airspeeder", name: "Airspeeder (per day)", cost: 500, notes: "Flying vehicle rental" },
                        { id: "rental-shuttle-interplanetary", name: "Shuttle: Interplanetary (per day)", cost: 1000, notes: "Short-range space transport" },
                        { id: "rental-shuttle-interstellar", name: "Shuttle: Interstellar (per day)", cost: 2000, notes: "Long-range space transport" }
                    ]
                }
            ]
        };

        return {
            actor,
            categories,
            isGM,
            markup,
            discount,
            credits: actor.system?.credits || 0,
            rendarrImage: "systems/swse/assets/icons/rendarr.webp",
            rendarrWelcome: SWSEStore.getRandomDialogue('welcome')
        };
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Category filter dropdown
        html.find("#shop-category-filter").change(this._onCategoryFilterChange.bind(this));

        // Availability filter dropdown
        html.find("#shop-availability-filter").change(this._onAvailabilityFilterChange.bind(this));

        // Cart and GM buttons
        html.find(".view-cart-btn").click(this._onShopTabClick.bind(this));
        html.find(".gm-settings-btn").click(this._onShopTabClick.bind(this));

        // Item purchasing
        html.find(".buy-item").click(this._onAddItemToCart.bind(this));

        // Service purchasing
        html.find(".buy-service").click(this._onBuyService.bind(this));

        // Droid/Vehicle purchasing
        html.find(".buy-droid").click(this._onBuyDroid.bind(this));
        html.find(".buy-vehicle").click(this._onBuyVehicle.bind(this));
        html.find(".create-custom-droid").click(this._onCreateCustomDroid.bind(this));
        html.find(".create-custom-starship").click(this._onCreateCustomStarship.bind(this));

        // Cart management
        html.find("#checkout-cart").click(this._onCheckout.bind(this));
        html.find("#clear-cart").click(this._onClearCart.bind(this));

        // GM settings
        html.find(".save-gm").click(this._onSaveGM.bind(this));
    }

    /**
     * Handle category filter dropdown change
     * @param {Event} event - Change event
     * @private
     */
    _onCategoryFilterChange(event) {
        event.preventDefault();
        const tabName = event.currentTarget.value;
        const doc = this.element[0];

        // Switch active panel
        doc.querySelectorAll('.shop-panel').forEach(p => p.classList.remove('active'));
        const panel = doc.querySelector(`[data-panel="${tabName}"]`);
        if (panel) panel.classList.add('active');

        // Update Rendarr's dialogue based on the category
        const dialogue = SWSEStore.getRandomDialogue(tabName);
        this._updateRendarrDialogue($(doc), dialogue);

        // Apply availability filter to the new panel
        const availabilityFilter = doc.querySelector("#shop-availability-filter")?.value || "all";
        this._applyAvailabilityFilter(doc, availabilityFilter);
    }

    /**
     * Handle availability filter dropdown change
     * @param {Event} event - Change event
     * @private
     */
    _onAvailabilityFilterChange(event) {
        event.preventDefault();
        const availabilityFilter = event.currentTarget.value;
        const doc = this.element[0];

        // Apply filter to all visible items in the active panel
        this._applyAvailabilityFilter(doc, availabilityFilter);
    }

    /**
     * Apply availability filter to currently visible items
     * @param {HTMLElement} doc - The document element
     * @param {string} filterValue - The availability filter value ("all", "Licensed", "Restricted", etc.)
     * @private
     */
    _applyAvailabilityFilter(doc, filterValue) {
        // Get the active panel
        const activePanel = doc.querySelector('.shop-panel.active');
        if (!activePanel) return;

        // Get all product items in the active panel
        const productItems = activePanel.querySelectorAll('.product-item');

        productItems.forEach(item => {
            // Get the item ID and look up its availability
            const itemId = item.dataset.itemId || item.dataset.actorId;
            if (!itemId) {
                // If no ID, show the item by default
                item.style.display = '';
                return;
            }

            // Look up the item in our itemsById map
            const itemData = this.itemsById.get(itemId);
            if (!itemData) {
                // Item not found in map, show it by default
                item.style.display = '';
                return;
            }

            // Get the availability from the item's system data
            const availability = itemData.system?.availability || itemData.system?.sourcebook?.availability || '';

            // Show or hide based on filter
            if (filterValue === 'all') {
                // Show all items
                item.style.display = '';
            } else {
                // Check if the availability string contains the filter value
                // Handle cases like "Military, Rare" or "Restricted, Rare"
                const availabilityLower = availability.toLowerCase();
                const filterLower = filterValue.toLowerCase();

                if (availabilityLower.includes(filterLower)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            }
        });

        // If all items are hidden, show the empty message
        const visibleItems = activePanel.querySelectorAll('.product-item[style=""]').length;
        const emptyMessage = activePanel.querySelector('.empty-message');

        if (visibleItems === 0 && !emptyMessage) {
            // Create temporary empty message if all items are filtered out
            const tempEmptyMessage = document.createElement('div');
            tempEmptyMessage.className = 'empty-message temp-empty-message';
            tempEmptyMessage.innerHTML = `
                <i class="fas fa-filter"></i>
                <p>No items match the selected availability filter.</p>
            `;
            const productsList = activePanel.querySelector('.products-list');
            if (productsList) {
                productsList.appendChild(tempEmptyMessage);
            }
        } else if (visibleItems > 0) {
            // Remove temporary empty message if items are visible
            const tempEmptyMessage = activePanel.querySelector('.temp-empty-message');
            if (tempEmptyMessage) {
                tempEmptyMessage.remove();
            }
        }
    }

    /**
     * Handle shop tab clicks (cart and GM buttons)
     * @param {Event} event - Click event
     * @private
     */
    _onShopTabClick(event) {
        event.preventDefault();
        const tabName = event.currentTarget.dataset.tab;
        const doc = this.element[0];

        // Switch active panel
        doc.querySelectorAll('.shop-panel').forEach(p => p.classList.remove('active'));
        const panel = doc.querySelector(`[data-panel="${tabName}"]`);
        if (panel) panel.classList.add('active');

        // Update cart display if switching to cart tab
        if (tabName === 'cart') {
            this._updateCartDisplay(doc);
        }

        // Update Rendarr's dialogue based on the tab
        const dialogue = SWSEStore.getRandomDialogue(tabName);
        this._updateRendarrDialogue($(doc), dialogue);
    }

    /**
     * Calculate final cost with markup/discount
     * @param {number} baseCost - Base cost of item
     * @returns {number} Final cost
     * @private
     */
    _calculateFinalCost(baseCost) {
        const markup = Number(game.settings.get("swse", "storeMarkup")) || 0;
        const discount = Number(game.settings.get("swse", "storeDiscount")) || 0;
        return Math.round(baseCost * (1 + markup / 100) * (1 - discount / 100));
    }

    /**
     * Add item to shopping cart
     * @param {Event} event - Click event
     * @private
     */
    async _onAddItemToCart(event) {
        event.preventDefault();

        const itemId = event.currentTarget.dataset.itemId;
        if (!itemId) {
            ui.notifications.warn("Invalid item selection.");
            return;
        }

        // Try to get from world items first, then from our cached map
        let item = game.items.get(itemId);
        if (!item) {
            item = this.itemsById.get(itemId);
        }

        if (!item) {
            ui.notifications.error("Item not found.");
            return;
        }

        const baseCost = Number(item.system?.cost) || 0;
        const finalCost = this._calculateFinalCost(baseCost);

        // Add to cart
        this.cart.items.push({
            id: itemId,
            name: item.name,
            img: item.img,
            cost: finalCost,
            item: item
        });

        ui.notifications.info(`${item.name} added to cart.`);
        this._updateCartCount();

        // Update Rendarr's dialogue
        const dialogue = SWSEStore.getRandomDialogue('purchase');
        this._updateRendarrDialogue(this.element, dialogue);
    }

    /**
     * Purchase a service (immediate credit deduction)
     * @param {Event} event - Click event
     * @private
     */
    async _onBuyService(event) {
        event.preventDefault();

        const button = event.currentTarget;
        const serviceName = button.dataset.name;
        const serviceCost = Number(button.dataset.cost) || 0;

        if (!serviceName) {
            ui.notifications.warn("Invalid service selection.");
            return;
        }

        const actor = this.object;
        const currentCredits = Number(actor.system?.credits) || 0;

        // Check if actor has enough credits
        if (currentCredits < serviceCost) {
            ui.notifications.error(`Insufficient credits! You need ${serviceCost} credits but only have ${currentCredits}.`);
            return;
        }

        // Deduct credits immediately
        const newCredits = currentCredits - serviceCost;
        await actor.update({ "system.credits": newCredits });

        ui.notifications.info(`${serviceName} purchased for ${serviceCost} credits.`);

        // Update Rendarr's dialogue
        const dialogue = SWSEStore.getRandomDialogue('purchase');
        this._updateRendarrDialogue(this.element, dialogue);

        // Re-render to update credit display
        this.render(false);
    }

    /**
     * Buy a droid (creates actor and assigns ownership)
     * @param {Event} event - Click event
     * @private
     */
    async _onBuyDroid(event) {
        event.preventDefault();

        const actorId = event.currentTarget.dataset.actorId;
        if (!actorId) {
            ui.notifications.warn("Invalid droid selection.");
            return;
        }

        // Try to get from world actors first
        let droidTemplate = game.actors.get(actorId);

        // If not found in world, search compendiums
        if (!droidTemplate) {
            const pack = game.packs.get('swse.droids');
            if (pack) {
                droidTemplate = await pack.getDocument(actorId);
            }
        }

        if (!droidTemplate) {
            ui.notifications.error("Droid not found.");
            return;
        }

        const baseCost = Number(droidTemplate.system.cost) || 0;
        const finalCost = this._calculateFinalCost(baseCost);
        const credits = Number(this.actor.system.credits) || 0;

        if (credits < finalCost) {
            ui.notifications.warn(
                `Not enough credits! Need ${finalCost.toLocaleString()}, have ${credits.toLocaleString()}.`
            );
            return;
        }

        // Confirm purchase
        const confirmed = await Dialog.confirm({
            title: "Confirm Droid Purchase",
            content: `<p>Purchase <strong>${droidTemplate.name}</strong> for <strong>${finalCost.toLocaleString()}</strong> credits?</p>
                     <p>A new droid actor will be created and assigned to you.</p>`,
            defaultYes: true
        });

        if (!confirmed) return;

        try {
            // Deduct credits
            await this.actor.update({ "system.credits": credits - finalCost });

            // Create droid actor with player ownership
            const droidData = droidTemplate.toObject();
            droidData.name = `${droidTemplate.name} (${this.actor.name}'s)`;
            droidData.ownership = {
                default: 0,
                [game.user.id]: 3  // Owner permission
            };

            const newDroid = await Actor.create(droidData);

            ui.notifications.info(`${droidTemplate.name} purchased! Check your actors list.`);
            this.render();
        } catch (err) {
            console.error("SWSE Store | Droid purchase failed:", err);
            ui.notifications.error("Failed to complete droid purchase.");
        }
    }

    /**
     * Buy a vehicle (new or used, creates actor)
     * @param {Event} event - Click event
     * @private
     */
    async _onBuyVehicle(event) {
        event.preventDefault();

        const actorId = event.currentTarget.dataset.actorId;
        const condition = event.currentTarget.dataset.condition; // "new" or "used"

        if (!actorId) {
            ui.notifications.warn("Invalid vehicle selection.");
            return;
        }

        // Try to get from world actors first
        let vehicleTemplate = game.actors.get(actorId);

        // If not found in world, search compendiums
        if (!vehicleTemplate) {
            const pack = game.packs.get('swse.vehicles');
            if (pack) {
                vehicleTemplate = await pack.getDocument(actorId);
            }
        }

        if (!vehicleTemplate) {
            ui.notifications.error("Vehicle not found.");
            return;
        }

        const baseCost = Number(vehicleTemplate.system.cost) || 0;
        const conditionMultiplier = condition === "used" ? 0.5 : 1.0;
        const finalCost = this._calculateFinalCost(baseCost * conditionMultiplier);
        const credits = Number(this.actor.system.credits) || 0;

        if (credits < finalCost) {
            ui.notifications.warn(
                `Not enough credits! Need ${finalCost.toLocaleString()}, have ${credits.toLocaleString()}.`
            );
            return;
        }

        // Confirm purchase
        const confirmed = await Dialog.confirm({
            title: "Confirm Vehicle Purchase",
            content: `<p>Purchase <strong>${condition === "used" ? "Used" : "New"} ${vehicleTemplate.name}</strong> for <strong>${finalCost.toLocaleString()}</strong> credits?</p>
                     <p>A new vehicle actor will be created and assigned to you.</p>`,
            defaultYes: true
        });

        if (!confirmed) return;

        try {
            // Deduct credits
            await this.actor.update({ "system.credits": credits - finalCost });

            // Create vehicle actor with player ownership
            const vehicleData = vehicleTemplate.toObject();
            vehicleData.name = `${condition === "used" ? "(Used) " : ""}${vehicleTemplate.name}`;
            vehicleData.ownership = {
                default: 0,
                [game.user.id]: 3  // Owner permission
            };

            // Mark as used if applicable
            if (condition === "used" && vehicleData.system) {
                vehicleData.system.condition = "used";
            }

            const newVehicle = await Actor.create(vehicleData);

            ui.notifications.info(`${vehicleTemplate.name} purchased! Check your actors list.`);
            this.render();
        } catch (err) {
            console.error("SWSE Store | Vehicle purchase failed:", err);
            ui.notifications.error("Failed to complete vehicle purchase.");
        }
    }

    /**
     * Launch custom droid builder
     * @param {Event} event - Click event
     * @private
     */
    async _onCreateCustomDroid(event) {
        event.preventDefault();

        const credits = Number(this.actor.system.credits) || 0;

        if (credits < 1000) {
            ui.notifications.warn("You need at least 1,000 credits to build a custom droid.");
            return;
        }

        // Confirm
        const confirmed = await Dialog.confirm({
            title: "Build Custom Droid",
            content: `<p>Enter the droid construction system?</p>
                     <p>You will design a non-heroic droid at level ${this.actor.system.level || 1}.</p>
                     <p><strong>Minimum cost:</strong> 1,000 credits</p>`,
            defaultYes: true
        });

        if (!confirmed) return;

        try {
            // Close this store window
            this.close();

            // Launch character generator in droid-building mode
            const chargen = new CharacterGenerator(null, {
                droidBuilderMode: true,
                ownerActor: this.actor,
                droidLevel: this.actor.system.level || 1,
                availableCredits: credits
            });

            chargen.render(true);
        } catch (err) {
            console.error("SWSE Store | Failed to launch droid builder:", err);
            ui.notifications.error("Failed to open droid builder.");
        }
    }

    /**
     * Launch custom starship builder
     * @param {Event} event - Click event
     * @private
     */
    async _onCreateCustomStarship(event) {
        event.preventDefault();

        const credits = Number(this.actor.system.credits) || 0;

        if (credits < 5000) {
            ui.notifications.warn("You need at least 5,000 credits to build a custom starship.");
            return;
        }

        // Confirm
        const confirmed = await Dialog.confirm({
            title: "Build Custom Starship",
            content: `<p>Enter the starship modification system with Marl Skindar?</p>
                     <p>You will select a stock ship and customize it with modifications.</p>
                     <p><strong>Minimum cost:</strong> 5,000 credits (Light Fighter)</p>
                     <p><em>Warning: Marl will judge your choices harshly.</em></p>`,
            defaultYes: true
        });

        if (!confirmed) return;

        try {
            // Close this store window
            this.close();

            // Launch vehicle modification app
            await VehicleModificationApp.open(this.actor);
        } catch (err) {
            console.error("SWSE Store | Failed to launch starship builder:", err);
            ui.notifications.error("Failed to open starship builder.");
        }
    }

    /**
     * Update cart item count badge
     * @private
     */
    _updateCartCount() {
        const doc = this.element[0];
        const cartCountEl = doc.querySelector('#cart-count');
        if (!cartCountEl) return;

        const totalCount = this.cart.items.length + this.cart.droids.length + this.cart.vehicles.length;
        cartCountEl.textContent = totalCount;
    }

    /**
     * Update cart display
     * @param {HTMLElement} doc - Document element
     * @private
     */
    _updateCartDisplay(doc) {
        const cartItemsList = doc.querySelector('#cart-items-list');
        const cartSubtotal = doc.querySelector('#cart-subtotal');
        const cartTotal = doc.querySelector('#cart-total');
        const cartRemaining = doc.querySelector('#cart-remaining');
        const remainingPreview = doc.querySelector('#remaining-credits-preview');

        if (!cartItemsList) return;

        cartItemsList.innerHTML = '';
        let total = 0;

        // Render items
        for (const item of this.cart.items) {
            total += item.cost;
            cartItemsList.innerHTML += `
                <div class="cart-item">
                    <div class="item-icon">
                        <img src="${item.img}" alt="${item.name}" width="32" height="32"/>
                    </div>
                    <div class="item-details">
                        <div class="item-name">${item.name}</div>
                    </div>
                    <div class="item-price">
                        <span class="price-amount">${item.cost.toLocaleString()} cr</span>
                    </div>
                    <button type="button" class="remove-from-cart" data-type="item" data-index="${this.cart.items.indexOf(item)}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
        }

        // Render droids
        for (const droid of this.cart.droids) {
            total += droid.cost;
            cartItemsList.innerHTML += `
                <div class="cart-item">
                    <div class="item-icon">
                        <img src="${droid.img}" alt="${droid.name}" width="32" height="32"/>
                    </div>
                    <div class="item-details">
                        <div class="item-name">${droid.name}</div>
                        <div class="item-specs">Droid</div>
                    </div>
                    <div class="item-price">
                        <span class="price-amount">${droid.cost.toLocaleString()} cr</span>
                    </div>
                    <button type="button" class="remove-from-cart" data-type="droid" data-index="${this.cart.droids.indexOf(droid)}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
        }

        // Render vehicles
        for (const vehicle of this.cart.vehicles) {
            total += vehicle.cost;
            cartItemsList.innerHTML += `
                <div class="cart-item">
                    <div class="item-icon">
                        <img src="${vehicle.img}" alt="${vehicle.name}" width="32" height="32"/>
                    </div>
                    <div class="item-details">
                        <div class="item-name">${vehicle.name}</div>
                        <div class="item-specs">${vehicle.condition === "used" ? "Used " : ""}Vehicle</div>
                    </div>
                    <div class="item-price">
                        <span class="price-amount">${vehicle.cost.toLocaleString()} cr</span>
                    </div>
                    <button type="button" class="remove-from-cart" data-type="vehicle" data-index="${this.cart.vehicles.indexOf(vehicle)}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
        }

        // Empty cart message
        if (this.cart.items.length === 0 && this.cart.droids.length === 0 && this.cart.vehicles.length === 0) {
            cartItemsList.innerHTML = `
                <div class="cart-empty-message">
                    <i class="fas fa-box-open"></i>
                    <p>Your cart is empty. Browse the shop to add items!</p>
                </div>
            `;
        }

        // Update totals with animation
        const previousTotal = this.cartTotal || 0;
        if (cartSubtotal) this._animateNumber(cartSubtotal, previousTotal, total, 400);
        if (cartTotal) this._animateNumber(cartTotal, previousTotal, total, 400);
        this.cartTotal = total;

        // Update remaining credits preview
        const currentCredits = Number(this.actor.system?.credits) || 0;
        const remainingCredits = currentCredits - total;
        if (cartRemaining) {
            cartRemaining.textContent = remainingCredits.toLocaleString();

            // Color code based on affordability
            if (remainingPreview) {
                if (remainingCredits < 0) {
                    remainingPreview.style.color = '#ff4444'; // Red for insufficient funds
                } else if (remainingCredits < currentCredits * 0.1) {
                    remainingPreview.style.color = '#ffaa00'; // Orange for low funds
                } else {
                    remainingPreview.style.color = '#44ff44'; // Green for good
                }
            }
        }

        // Re-bind remove buttons
        doc.querySelectorAll('.remove-from-cart').forEach(btn => {
            btn.addEventListener('click', this._onRemoveFromCart.bind(this));
        });
    }

    /**
     * Remove item from cart
     * @param {Event} event - Click event
     * @private
     */
    _onRemoveFromCart(event) {
        event.preventDefault();

        const type = event.currentTarget.dataset.type;
        const index = parseInt(event.currentTarget.dataset.index);

        if (type === "item") {
            this.cart.items.splice(index, 1);
        } else if (type === "droid") {
            this.cart.droids.splice(index, 1);
        } else if (type === "vehicle") {
            this.cart.vehicles.splice(index, 1);
        }

        const doc = this.element[0];
        this._updateCartDisplay(doc);
        this._updateCartCount();
    }

    /**
     * Clear entire cart
     * @param {Event} event - Click event
     * @private
     */
    _onClearCart(event) {
        event.preventDefault();

        this.cart.items = [];
        this.cart.droids = [];
        this.cart.vehicles = [];

        const doc = this.element[0];
        this._updateCartDisplay(doc);
        this._updateCartCount();

        ui.notifications.info("Cart cleared.");
    }

    /**
     * Checkout and purchase all items in cart
     * @param {Event} event - Click event
     * @private
     */
    async _onCheckout(event) {
        event.preventDefault();

        const actor = this.object;
        const credits = Number(actor.system.credits) || 0;

        // Calculate total
        let total = 0;
        for (const item of this.cart.items) total += item.cost;
        for (const droid of this.cart.droids) total += droid.cost;
        for (const vehicle of this.cart.vehicles) total += vehicle.cost;

        if (total === 0) {
            ui.notifications.warn("Your cart is empty.");
            return;
        }

        if (credits < total) {
            ui.notifications.warn(
                `Not enough credits! Need ${total.toLocaleString()}, have ${credits.toLocaleString()}.`
            );
            return;
        }

        // Confirm purchase
        const confirmed = await Dialog.confirm({
            title: "Complete Purchase",
            content: `<p>Complete purchase for <strong>${total.toLocaleString()}</strong> credits?</p>
                     <p>This will add ${this.cart.items.length} item(s), ${this.cart.droids.length} droid(s), and ${this.cart.vehicles.length} vehicle(s).</p>`,
            defaultYes: true
        });

        if (!confirmed) return;

        try {
            // Animate credits countdown in wallet display
            const walletCreditsEl = this.element[0].querySelector('.remaining-credits');
            if (walletCreditsEl) {
                this._animateNumber(walletCreditsEl, credits, credits - total, 600);
            }

            // Deduct credits
            await actor.update({ "system.credits": credits - total });

            // Add regular items to actor
            const itemsToCreate = this.cart.items.map(cartItem => cartItem.item.toObject());
            if (itemsToCreate.length > 0) {
                await actor.createEmbeddedDocuments("Item", itemsToCreate);
            }

            // Create droid actors
            for (const droid of this.cart.droids) {
                const droidData = droid.actor.toObject();
                droidData.name = `${droid.name} (${actor.name}'s)`;
                droidData.ownership = {
                    default: 0,
                    [game.user.id]: 3
                };
                await Actor.create(droidData);
            }

            // Create vehicle actors
            for (const vehicle of this.cart.vehicles) {
                const vehicleData = vehicle.actor.toObject();
                vehicleData.name = `${vehicle.condition === "used" ? "(Used) " : ""}${vehicle.name}`;
                vehicleData.ownership = {
                    default: 0,
                    [game.user.id]: 3
                };
                if (vehicle.condition === "used" && vehicleData.system) {
                    vehicleData.system.condition = "used";
                }
                await Actor.create(vehicleData);
            }

            ui.notifications.info(`Purchase complete! Spent ${total.toLocaleString()} credits.`);

            // Clear cart
            this.cart.items = [];
            this.cart.droids = [];
            this.cart.vehicles = [];
            this.cartTotal = 0;

            // Wait for animation to complete before re-rendering
            setTimeout(() => this.render(), 700);
        } catch (err) {
            console.error("SWSE Store | Checkout failed:", err);
            ui.notifications.error("Failed to complete purchase.");
        }
    }

    /**
     * Save GM settings
     * @param {Event} event - Click event
     * @private
     */
    async _onSaveGM(event) {
        event.preventDefault();

        if (!game.user.isGM) {
            ui.notifications.error("Only GMs can modify store settings.");
            return;
        }

        try {
            const markup = parseInt(this.element.find("input[name='markup']").val()) || 0;
            const discount = parseInt(this.element.find("input[name='discount']").val()) || 0;

            // Validate ranges
            if (markup < -100 || markup > 1000) {
                ui.notifications.warn("Markup must be between -100% and 1000%.");
                return;
            }

            if (discount < 0 || discount > 100) {
                ui.notifications.warn("Discount must be between 0% and 100%.");
                return;
            }

            await game.settings.set("swse", "storeMarkup", markup);
            await game.settings.set("swse", "storeDiscount", discount);

            ui.notifications.info("Store settings updated.");
            this.render();
        } catch (err) {
            console.error("SWSE Store | Failed to save settings:", err);
            ui.notifications.error("Failed to save store settings.");
        }
    }
}
