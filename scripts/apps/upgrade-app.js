/**
 * SWSE Item Upgrade Application
 * Provides interactive upgrade management for weapons, armor, and equipment
 * Features three different NPCs: Delta (weapons), Breach (armor), Rendarr (equipment)
 */

export class SWSEUpgradeApp extends FormApplication {
    constructor(item, options = {}) {
        super(item, options);
        this.item = item;
        this.itemType = item.type;

        // Determine which NPC to use based on item type
        this.npc = this._getNPCForItemType(this.itemType);
    }

    /**
     * Get NPC configuration based on item type
     */
    _getNPCForItemType(itemType) {
        switch (itemType) {
            case 'weapon':
                return {
                    name: 'Delta',
                    title: 'Weapons Specialist',
                    image: 'systems/swse/assets/icons/mentor.webp',
                    upgradeType: 'Weapon Upgrade',
                    personality: 'cocky',
                    accent: 'new-yorker'
                };
            case 'armor':
                return {
                    name: 'Breach',
                    title: 'Armor Technician',
                    image: 'systems/swse/assets/icons/breach.webp',
                    upgradeType: 'Armor Upgrade',
                    personality: 'professional',
                    accent: 'standard'
                };
            case 'equipment':
            default:
                return {
                    name: 'Rendarr',
                    title: 'Equipment Merchant',
                    image: 'systems/swse/assets/icons/rendarr.webp',
                    upgradeType: 'Universal Upgrade',
                    personality: 'friendly',
                    accent: 'merchant'
                };
        }
    }

    /**
     * Delta's cocky New Yorker dialogue
     */
    static get deltaDialogue() {
        return {
            welcome: [
                "Alright, alright, let's see what you got here, yeah? Delta's the name, weapon mods are the game, ya know?",
                "Hey there! Need to soup up that piece you're carryin'? You came to the right place, friend!",
                "Ah, another customer! Delta here - best weapons tech in the sector, if I do say so myself. And I do!",
                "Welcome, welcome! Looking to add some bite to your blaster? I gotcha covered, ya know?",
                "Yo! Delta at your service. Let's make that weapon of yours sing, yeah?"
            ],
            examining: [
                "Let me take a look at this beauty... Not bad, not bad at all, ya know?",
                "Hmm, yeah, I can work with this. Got some ideas already!",
                "Oh, this is a good foundation! We can do some real damage with this, trust me!",
                "Alright, let's see what we're workin' with here... Yeah, yeah, I see the potential!",
                "Nice piece! Could use some Delta magic though, am I right?"
            ],
            installing: [
                "Hold on, hold on, let me work my magic here... There we go!",
                "Just gotta... yeah, perfect! See? Told ya I'm good, right?",
                "This ain't my first rodeo, ya know? Watch a professional at work!",
                "Easy peasy! Been doin' this since before you were born, probably!",
                "And... done! Beautiful work, if I do say so myself. And I do!"
            ],
            success: [
                "BAM! Now that's what I'm talkin' about! Your weapon just got a serious upgrade, ya know?",
                "There we go! Smooth as butter. You're gonna love this, trust me!",
                "Ha! Perfect installation. You picked the right tech for the job, friend!",
                "And that's how it's done! Delta delivers, every single time!",
                "Woo! Look at that beauty! You're all set, champ!"
            ],
            noCredits: [
                "Whoa, whoa, hold up there, big spender! You ain't got enough credits for that! What'd ya think, I run a charity here?",
                "Haha, nice try, pal! Come back when you got the credits, yeah? This ain't a pawn shop!",
                "Credits first, upgrades second, ya know? That's how business works! Don't they teach you nothin'?",
                "You're a little light in the wallet there, friend! Maybe try sellin' some of that junk you're carryin' around?",
                "Broke, huh? Well, credits don't grow on trees, ya know! Go earn some and come back when you're serious!"
            ],
            noSlots: [
                "Whoa, whoa, hold up! You're outta upgrade slots here, ya know? Can't fit nothin' else on this thing! What'd ya expect, magic?",
                "Eh, sorry pal, but this baby's maxed out! No room for more mods! Maybe if you'd bought better gear to start with, yeah?",
                "Can't do it, friend! You've already packed this thing full. It's upgrade slots or nothin'! Should've planned ahead!",
                "Yeah, no dice! This weapon's got all the upgrades it can handle already! You can't just cram infinite mods on there, ya know!"
            ],
            removing: [
                "You sure? I mean, I put good work into that! But hey, you're the boss, ya know?",
                "Alright, alright, pullin' it out now. Shame though, it was a good fit!",
                "If you say so! Removin' the upgrade... there ya go!",
                "Your call, friend! Out it goes. Easy come, easy go, yeah?"
            ]
        };
    }

    /**
     * Breach's professional dialogue
     */
    static get breachDialogue() {
        return {
            welcome: [
                "Greetings. I am Breach. I will assist you with armor modifications.",
                "Welcome. State the nature of your armor upgrade requirements.",
                "Breach reporting. Ready to optimize your protective systems.",
                "I am prepared to enhance your armor's capabilities. Proceed.",
                "Armor modification services initialized. How may I assist?"
            ],
            examining: [
                "Analyzing armor composition... Assessment complete.",
                "Scanning for upgrade compatibility... Confirmed.",
                "Evaluating structural integrity. Acceptable parameters detected.",
                "Diagnostic complete. Multiple upgrade pathways available.",
                "Armor analysis in progress... Systems nominal."
            ],
            installing: [
                "Commencing installation sequence...",
                "Integrating upgrade module. Stand by.",
                "Processing modification. Please remain stationary.",
                "Installation in progress. Estimated completion: moments.",
                "Applying enhancement. Systems synchronizing..."
            ],
            success: [
                "Installation complete. Armor efficiency increased by measurable parameters.",
                "Upgrade successfully integrated. All systems operating within optimal ranges.",
                "Modification complete. Your armor's defensive capabilities have been enhanced.",
                "Installation successful. Running post-integration diagnostics... All clear.",
                "Process complete. Armor upgrade fully functional."
            ],
            noCredits: [
                "Transaction denied. Insufficient credit balance detected. Financial resources inadequate.",
                "Payment failure. Your credit account lacks required funds. Recommend acquiring additional resources.",
                "Unable to process. Credit shortage detected. Perhaps you should reconsider your financial management protocols.",
                "Negative. Your available credits: insufficient. Required credits: more than you possess.",
                "Transaction aborted. Credit deficiency identified. I suggest prioritizing resource acquisition before equipment enhancement."
            ],
            noSlots: [
                "Upgrade capacity exceeded. No available modification slots detected. Physical limitations cannot be circumvented.",
                "Unable to proceed. Armor has reached maximum upgrade threshold. Further modifications: impossible.",
                "Installation not possible. All upgrade slots currently occupied. Your planning was... suboptimal.",
                "Insufficient space. Armor upgrade limit has been reached. Structural integrity would be compromised by additional modifications."
            ],
            removing: [
                "Acknowledged. Initiating removal sequence.",
                "Understood. Extracting upgrade module now.",
                "Confirmed. Reversing modification process.",
                "Processing removal request. Stand by."
            ]
        };
    }

    /**
     * Rendarr's friendly merchant dialogue (reused from store)
     */
    static get rendarrDialogue() {
        return {
            welcome: [
                "Ah, back again! Looking to upgrade your gear? Excellent choice, excellent choice!",
                "Welcome, friend! Rendarr's equipment upgrades at your service!",
                "Ah, hello there! Need to soup up some equipment? I've got just the thing!",
                "Welcome back! Let's see what we can do to improve that equipment of yours!",
                "Greetings! Looking to add some modifications? You've come to the right place!"
            ],
            examining: [
                "Let me take a look at this... Ah yes, plenty of potential here!",
                "Hmm, not bad, not bad at all! I can work with this!",
                "Ooh, this is a quality piece! We can make it even better!",
                "Interesting, interesting... I've got some ideas already!",
                "Ah, I see what we're working with! Good foundation!"
            ],
            installing: [
                "Just a moment, just a moment... There we go!",
                "Let me get this installed for you... Perfect!",
                "This won't take long at all... And done!",
                "Hold still while I work my magic... Beautiful!",
                "Let's get this in place... Excellent!"
            ],
            success: [
                "There we are! Good as new! Better than new, even!",
                "All done! That should serve you well, my friend!",
                "Perfect! Another satisfied customer!",
                "Wonderful! You're all set! That's quality work, if I do say so myself!",
                "Done and done! Pleasure doing business with you!"
            ],
            noCredits: [
                "Oh my! I'm afraid you don't have quite enough credits for that! Perhaps you could come back when you're a bit more... flush?",
                "Ah, friend, I wish I could help, but this is a business! You'll need more credits than that, I'm afraid!",
                "Hmm, yes, well... your credit pouch seems a bit light there! Maybe you should sell some of that excess equipment?",
                "I'm sorry, but that upgrade costs more than you currently possess! Credits don't grow on trees, you know!",
                "Ooh, awkward! Seems you're a bit short on credits, friend! Come back when your pockets are heavier!"
            ],
            noSlots: [
                "Oh dear, I'm afraid this equipment is fully upgraded already! No more room, I'm afraid! Should've thought about that earlier, hmm?",
                "Ah, unfortunately you've reached the upgrade limit on this one! Can't fit a star destroyer in a cargo hold, you know!",
                "Sorry, friend, but there's no space left for additional modifications! Perhaps next time buy equipment with more slots?",
                "I wish I could help, but this equipment can't take any more upgrades! It's maxed out! You've hit the ceiling!"
            ],
            removing: [
                "You want it removed? Well, if you're sure... There you go!",
                "Alright, alright, I'll take it out. Your choice, of course!",
                "As you wish! Removing the upgrade now...",
                "If that's what you want! Out it comes!"
            ]
        };
    }

    /**
     * Get random dialogue for NPC
     */
    _getDialogue(context) {
        let dialogues;
        switch (this.npc.name) {
            case 'Delta':
                dialogues = SWSEUpgradeApp.deltaDialogue[context];
                break;
            case 'Breach':
                dialogues = SWSEUpgradeApp.breachDialogue[context];
                break;
            case 'Rendarr':
            default:
                dialogues = SWSEUpgradeApp.rendarrDialogue[context];
                break;
        }

        if (!dialogues || dialogues.length === 0) {
            return "Ready to proceed.";
        }
        return dialogues[Math.floor(Math.random() * dialogues.length)];
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "swse-upgrade-app",
            template: "systems/swse/templates/apps/upgrade/upgrade-app.hbs",
            width: 700,
            height: 600,
            title: "Item Upgrades",
            resizable: true,
            closeOnSubmit: false,
            classes: ["swse", "swse-upgrade-app"]
        });
    }

    /**
     * Get data for template rendering
     */
    async getData() {
        const item = this.object;
        const system = item.system;

        // Calculate used and available slots
        const installedUpgrades = system.installedUpgrades || [];
        const usedSlots = installedUpgrades.reduce((sum, upgrade) => sum + (upgrade.slotsUsed || 1), 0);
        const totalSlots = system.upgradeSlots || 1;
        const availableSlots = totalSlots - usedSlots;

        // Get available upgrades from game items
        const availableUpgrades = await this._getAvailableUpgrades();

        return {
            item,
            system,
            npc: this.npc,
            installedUpgrades,
            availableUpgrades,
            totalSlots,
            usedSlots,
            availableSlots,
            welcomeMessage: this._getDialogue('welcome'),
            examinMsg: this._getDialogue('examining')
        };
    }

    /**
     * Get list of compatible upgrades for this item
     */
    async _getAvailableUpgrades() {
        const upgrades = [];

        // Search world items
        const worldUpgrades = game.items.filter(i => i.type === 'equipment');

        // Load from compendium
        const pack = game.packs.get('swse.equipment');
        let compendiumUpgrades = [];
        if (pack) {
            compendiumUpgrades = await pack.getDocuments();
        }

        // Combine and filter by upgrade type
        const allItems = [...worldUpgrades, ...compendiumUpgrades];

        for (const upgrade of allItems) {
            const tags = upgrade.system?.tags || [];
            const category = tags[0] || '';

            // Filter based on item type
            if (this.itemType === 'weapon' && category === 'Weapon Upgrade') {
                upgrades.push(this._formatUpgrade(upgrade));
            } else if (this.itemType === 'armor' && category === 'Armor Upgrade') {
                upgrades.push(this._formatUpgrade(upgrade));
            } else if (this.itemType === 'equipment' && category === 'Universal Upgrade') {
                upgrades.push(this._formatUpgrade(upgrade));
            }
        }

        return upgrades;
    }

    /**
     * Format upgrade for display
     */
    _formatUpgrade(upgrade) {
        const cost = this._calculateUpgradeCost(upgrade);
        return {
            id: upgrade.id,
            name: upgrade.name,
            baseCost: Number(upgrade.system?.cost) || 0,
            calculatedCost: cost,
            slotsRequired: upgrade.system?.upgradeSlots !== undefined ? upgrade.system.upgradeSlots : 1,
            availability: upgrade.system?.availability || 'Standard',
            description: upgrade.system?.description || '',
            notes: upgrade.system?.notes || ''
        };
    }

    /**
     * Calculate upgrade cost (handles special cases like "100% of weapon cost")
     */
    _calculateUpgradeCost(upgrade) {
        const baseCost = Number(upgrade.system?.cost) || 0;

        // Special case: Bayonet ring costs 100% of weapon cost
        if (upgrade.id === 'upgrade-weapon-bayonet-ring' && this.itemType === 'weapon') {
            return Number(this.item.system?.cost) || 0;
        }

        return baseCost;
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Install upgrade button
        html.find(".install-upgrade").click(this._onInstallUpgrade.bind(this));

        // Remove upgrade button
        html.find(".remove-upgrade").click(this._onRemoveUpgrade.bind(this));

        // Close button
        html.find(".close-btn").click(() => this.close());
    }

    /**
     * Handle installing an upgrade
     */
    async _onInstallUpgrade(event) {
        event.preventDefault();

        const button = event.currentTarget;
        const upgradeId = button.dataset.upgradeId;
        const upgradeName = button.dataset.upgradeName;
        const upgradeCost = Number(button.dataset.upgradeCost);
        const slotsRequired = Number(button.dataset.slotsRequired);

        // Check if actor has enough credits
        const actor = this.item.actor;
        if (!actor) {
            ui.notifications.error("This item must be owned by a character to install upgrades.");
            return;
        }

        const currentCredits = Number(actor.system?.credits) || 0;
        if (currentCredits < upgradeCost) {
            ui.notifications.error(this._getDialogue('noCredits'));
            return;
        }

        // Check if enough upgrade slots available
        const installedUpgrades = this.item.system.installedUpgrades || [];
        const usedSlots = installedUpgrades.reduce((sum, u) => sum + (u.slotsUsed || 1), 0);
        const availableSlots = (this.item.system.upgradeSlots || 1) - usedSlots;

        if (slotsRequired > availableSlots) {
            ui.notifications.warn(this._getDialogue('noSlots'));
            return;
        }

        // Find the upgrade item
        let upgradeItem = game.items.get(upgradeId);
        if (!upgradeItem) {
            const pack = game.packs.get('swse.equipment');
            if (pack) {
                upgradeItem = await pack.getDocument(upgradeId);
            }
        }

        if (!upgradeItem) {
            ui.notifications.error("Upgrade not found.");
            return;
        }

        // Deduct credits
        await actor.update({ "system.credits": currentCredits - upgradeCost });

        // Add upgrade to item
        const newUpgrade = {
            id: upgradeId,
            name: upgradeName,
            cost: upgradeCost,
            slotsUsed: slotsRequired,
            description: upgradeItem.system?.description || ''
        };

        const updatedUpgrades = [...installedUpgrades, newUpgrade];
        await this.item.update({ "system.installedUpgrades": updatedUpgrades });

        ui.notifications.info(this._getDialogue('success'));

        // Re-render the app
        this.render(false);
    }

    /**
     * Handle removing an upgrade
     */
    async _onRemoveUpgrade(event) {
        event.preventDefault();

        const button = event.currentTarget;
        const upgradeIndex = Number(button.dataset.upgradeIndex);

        const installedUpgrades = this.item.system.installedUpgrades || [];
        if (upgradeIndex < 0 || upgradeIndex >= installedUpgrades.length) {
            ui.notifications.error("Invalid upgrade selection.");
            return;
        }

        const upgrade = installedUpgrades[upgradeIndex];

        // Confirm removal
        const confirmed = await Dialog.confirm({
            title: "Remove Upgrade",
            content: `<p>${this._getDialogue('removing')}</p><p>Remove <strong>${upgrade.name}</strong>? This will not refund credits.</p>`,
            yes: () => true,
            no: () => false
        });

        if (!confirmed) return;

        // Remove the upgrade
        const updatedUpgrades = installedUpgrades.filter((_, index) => index !== upgradeIndex);
        await this.item.update({ "system.installedUpgrades": updatedUpgrades });

        ui.notifications.info(`${upgrade.name} removed.`);

        // Re-render
        this.render(false);
    }
}
