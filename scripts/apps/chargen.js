// ============================================
// FILE: scripts/apps/chargen.js
// Narrative Character Generator for SWSE
// ============================================

export default class NarrativeCharGen extends Application {
    constructor(options = {}) {
        super(options);
        this.step = 0;
        this.data = {
            name: "",
            race: "",
            heroicClass: "",
            abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
            abilityMethod: "pointbuy",
            hp: 0,
            credits: 0,
            startingFeat: "",
            bonusFeat: "",
            trainedSkills: [],
            bonusSkill: "",
            items: [],
            lightsaber: false
        };
        this.steps = [
            "welcome",
            "name",
            "race",
            "class",
            "abilities",
            "hp",
            "credits",
            "feat",
            "skills",
            "items",
            "review"
        ];
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["swse", "chargen", "narrative"],
            template: "systems/swse/templates/apps/narrative-chargen.hbs",
            width: 700,
            height: 600,
            title: "Character Creation",
            resizable: true
        });
    }

    getData() {
        const context = super.getData();
        context.step = this.steps[this.step];
        context.data = this.data;
        context.prompt = this.getPrompt();
        context.options = this.getOptions();
        context.canGoBack = this.step > 0;
        context.canGoForward = this.canProceed();
        context.availableRaces = this.getAvailableRaces();
        context.availableSkills = this.getAvailableSkills();
        context.classSkillCount = this.getClassTrainedSkills();
        return context;
    }

    getPrompt() {
        const prompts = {
            welcome: "Greetings, traveler. The Force flows through all things, connecting the galaxy in ways we are only beginning to understand. Today, you begin your journey. Are you ready to forge your destiny among the stars?",
            name: "Every legend begins with a name. What shall you be called in the chronicles of the galaxy?",
            race: "The galaxy is home to countless species, each with their own strengths and traditions. What is your heritage?",
            class: "Many paths lie before you. Will you walk the path of the Force, master the art of war, navigate the shadows, explore the unknown, or lead through diplomacy and influence?",
            abilities: "Your natural talents define your potential. How have the Force and fate shaped your capabilities?",
            hp: "Your vitality and will to survive are crucial in this dangerous galaxy. Let us determine your resilience.",
            credits: "Every journey requires resources. What wealth do you begin with?",
            feat: "Through training and experience, you have developed special capabilities. What unique ability have you mastered?",
            skills: "Your class has prepared you in certain areas of expertise. Which skills have you honed through dedication? Training in a skill grants you a +5 bonus to all checks with that skill.",
            items: "You must equip yourself for the challenges ahead. What gear will you carry on your journey?",
            review: "Before your story begins, let us review the path you have chosen. Are you satisfied with these choices, or do you wish to reconsider?"
        };
        
        // Add class-specific dialogue after class selection
        if (this.steps[this.step] === "abilities" && this.data.heroicClass) {
            const classDialogue = {
                "Jedi": "Ah, a Jedi. You don't see many of them around these parts. What? Got bored of meditating all day?",
                "Scout": "A scout huh? You do know that there are other better paying jobs out there right?",
                "Scoundrel": "Scoundrel? Remind me to hide my wallet when you come around.",
                "Soldier": "A soldier, fancy yourself a man's man huh?",
                "Noble": "What is a noble doing around here? Aren't you supposed to be reading or something?"
            };
            return classDialogue[this.data.heroicClass] + " " + prompts.abilities;
        }
        
        return prompts[this.steps[this.step]] || "";
    }

    getAvailableRaces() {
        return [
            { value: "human", label: "Human", bonuses: "+1 Feat, +1 Skill" },
            { value: "twilek", label: "Twi'lek", bonuses: "+2 Charisma" },
            { value: "wookiee", label: "Wookiee", bonuses: "+2 Strength" },
            { value: "bothan", label: "Bothan", bonuses: "+2 Intelligence" },
            { value: "zabrak", label: "Zabrak", bonuses: "+2 Constitution" },
            { value: "rodian", label: "Rodian", bonuses: "+2 Dexterity, -2 Wisdom, -2 Charisma" },
            { value: "duros", label: "Duros", bonuses: "+2 Dexterity, +2 Intelligence, -2 Constitution" },
            { value: "ithorian", label: "Ithorian", bonuses: "+2 Wisdom, +2 Charisma, -2 Dexterity" },
            { value: "sullustan", label: "Sullustan", bonuses: "+2 Dexterity, -2 Constitution" },
            { value: "trandoshan", label: "Trandoshan", bonuses: "+2 Strength, -2 Dexterity" },
            { value: "gamorrean", label: "Gamorrean", bonuses: "+2 Strength, -2 Dexterity, -2 Intelligence" },
            { value: "gand", label: "Gand", bonuses: "+2 Wisdom, -2 Charisma" },
            { value: "ewok", label: "Ewok", bonuses: "+2 Dexterity, -2 Strength" },
            { value: "jawa", label: "Jawa", bonuses: "+2 Dexterity, -2 Strength" },
            { value: "chiss", label: "Chiss", bonuses: "+2 Dexterity, +2 Intelligence, -2 Charisma" }
        ];
    }

    getAvailableSkills() {
        return [
            { key: "acrobatics", label: "Acrobatics", ability: "dex", description: "Jump, tumble, flip, and perform athletic maneuvers in combat and exploration." },
            { key: "climb", label: "Climb", ability: "str", description: "Scale walls, cliffs, and other vertical surfaces." },
            { key: "deception", label: "Deception", ability: "cha", description: "Lie convincingly, create disguises, and mislead others." },
            { key: "endurance", label: "Endurance", ability: "con", description: "Resist fatigue, survive harsh environments, and endure physical hardship." },
            { key: "gather_information", label: "Gather Information", ability: "cha", description: "Learn rumors, find contacts, and discover information in settlements." },
            { key: "initiative", label: "Initiative", ability: "dex", description: "React quickly in combat to act before your enemies." },
            { key: "jump", label: "Jump", ability: "str", description: "Leap across gaps, jump over obstacles, and perform athletic jumps." },
            { key: "knowledge_bureaucracy", label: "Knowledge (Bureaucracy)", ability: "int", description: "Navigate legal systems, understand government structures, and work with officials." },
            { key: "knowledge_galactic_lore", label: "Knowledge (Galactic Lore)", ability: "int", description: "Recall historical events, famous people, and general galactic knowledge." },
            { key: "knowledge_life_sciences", label: "Knowledge (Life Sciences)", ability: "int", description: "Identify creatures, understand biology, and recall information about living things." },
            { key: "knowledge_physical_sciences", label: "Knowledge (Physical Sciences)", ability: "int", description: "Understand physics, chemistry, astronomy, and other hard sciences." },
            { key: "knowledge_social_sciences", label: "Knowledge (Social Sciences)", ability: "int", description: "Understand cultures, psychology, sociology, and behavioral sciences." },
            { key: "knowledge_tactics", label: "Knowledge (Tactics)", ability: "int", description: "Plan battles, understand military strategy, and recognize tactical situations." },
            { key: "knowledge_technology", label: "Knowledge (Technology)", ability: "int", description: "Understand computers, droids, starship systems, and advanced technology." },
            { key: "mechanics", label: "Mechanics", ability: "int", description: "Repair equipment, disable devices, build gadgets, and understand machinery." },
            { key: "perception", label: "Perception", ability: "wis", description: "Notice details, spot hidden enemies, and be aware of your surroundings." },
            { key: "persuasion", label: "Persuasion", ability: "cha", description: "Convince others, negotiate deals, and influence people through diplomacy." },
            { key: "pilot", label: "Pilot", ability: "dex", description: "Fly vehicles and starships, perform fancy maneuvers, and engage in vehicle combat." },
            { key: "ride", label: "Ride", ability: "dex", description: "Control mounts and beasts, whether riding a tauntaun or a bantha." },
            { key: "stealth", label: "Stealth", ability: "dex", description: "Move silently, hide from enemies, and remain undetected." },
            { key: "survival", label: "Survival", ability: "wis", description: "Track creatures, navigate wilderness, find food and shelter in the wild." },
            { key: "swim", label: "Swim", ability: "str", description: "Move through water, dive, and hold your breath underwater." },
            { key: "treat_injury", label: "Treat Injury", ability: "wis", description: "Heal wounds, stabilize dying characters, and provide medical care." },
            { key: "use_computer", label: "Use Computer", ability: "int", description: "Hack systems, slice security, search databases, and operate computers." },
            { key: "use_the_force", label: "Use the Force", ability: "cha", description: "Sense through the Force, activate Force powers, and resist Force effects." }
        ];
    }

    getOptions() {
        const currentStep = this.steps[this.step];
        
        switch(currentStep) {
            case "welcome":
                return [{ label: "Begin My Journey", value: "start" }];
                
            case "class":
                return [
                    { label: "Jedi - Guardian of peace and justice", value: "Jedi", hp: "1d10" },
                    { label: "Soldier - Master of combat", value: "Soldier", hp: "1d10" },
                    { label: "Scoundrel - Charming rogue", value: "Scoundrel", hp: "1d6" },
                    { label: "Scout - Wilderness expert", value: "Scout", hp: "1d8" },
                    { label: "Noble - Leader and diplomat", value: "Noble", hp: "1d6" }
                ];
                
            case "abilities":
                return [
                    { label: "Point Buy (25 points)", value: "pointbuy" },
                    { label: "Roll Dice (4d6 drop lowest)", value: "roll" }
                ];
                
            case "hp":
                return [
                    { label: "Roll for Hit Points", value: "roll" },
                    { label: "Take Maximum Hit Points", value: "max" }
                ];
                
            case "credits":
                return [
                    { label: "Roll for Starting Credits", value: "roll" },
                    { label: "Take Maximum Credits", value: "max" }
                ];
                
            default:
                return [];
        }
    }

    canProceed() {
        const step = this.steps[this.step];
        
        switch(step) {
            case "name":
                return this.data.name.trim().length > 0;
            case "race":
                return !!this.data.race;
            case "class":
                return !!this.data.heroicClass;
            case "abilities":
                return this.validateAbilities();
            case "feat":
                return !!this.data.startingFeat;
            case "skills":
                return this.validateSkills();
            default:
                return true;
        }
    }

    validateAbilities() {
        if (this.data.abilityMethod === "roll") return true;
        
        const costs = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 6, 15: 8, 16: 10, 17: 13, 18: 16 };
        let totalCost = 0;
        
        for (let ability in this.data.abilities) {
            const score = this.data.abilities[ability];
            if (score < 8 || score > 18) return false;
            totalCost += costs[score];
        }
        
        return totalCost === 25;
    }

    validateSkills() {
        const classSkills = this.getClassTrainedSkills();
        const required = this.data.race === "human" ? classSkills + 1 : classSkills;
        return this.data.trainedSkills.length === required;
    }

    getClassTrainedSkills() {
        const skillCounts = {
            "Jedi": 4,
            "Soldier": 3,
            "Scoundrel": 6,
            "Scout": 6,
            "Noble": 4
        };
        return skillCounts[this.data.heroicClass] || 4;
    }

    activateListeners(html) {
        super.activateListeners(html);
        
        html.find(".chargen-input").on("change", this._onInputChange.bind(this));
        html.find(".chargen-choice").click(this._onChoice.bind(this));
        html.find(".race-select").on("change", this._onRaceChange.bind(this));
        html.find(".skill-toggle").on("change", this._onSkillToggle.bind(this));
        html.find(".btn-next").click(this._onNext.bind(this));
        html.find(".btn-back").click(this._onBack.bind(this));
        html.find(".btn-finish").click(this._onFinish.bind(this));
        html.find(".btn-edit").click(this._onEdit.bind(this));
        html.find(".roll-abilities").click(this._onRollAbilities.bind(this));
        html.find(".roll-hp").click(this._onRollHP.bind(this));
        html.find(".roll-credits").click(this._onRollCredits.bind(this));
        html.find(".open-store").click(this._onOpenStore.bind(this));
    }

    _onInputChange(event) {
        const target = event.currentTarget;
        const field = target.dataset.field;
        const value = target.value;
        
        foundry.utils.setProperty(this.data, field, value);
        this.render();
    }

    _onRaceChange(event) {
        const race = event.currentTarget.value;
        this.data.race = race;
        this.render();
    }

    _onSkillToggle(event) {
        const skillKey = event.currentTarget.dataset.skill;
        const isChecked = event.currentTarget.checked;
        
        if (isChecked) {
            if (!this.data.trainedSkills.includes(skillKey)) {
                this.data.trainedSkills.push(skillKey);
            }
        } else {
            const index = this.data.trainedSkills.indexOf(skillKey);
            if (index > -1) {
                this.data.trainedSkills.splice(index, 1);
            }
        }
        
        this.render();
    }

    _onChoice(event) {
        const choice = event.currentTarget.dataset.value;
        const step = this.steps[this.step];
        
        switch(step) {
            case "class":
                this.data.heroicClass = choice;
                if (choice === "Jedi") this.data.lightsaber = true;
                break;
            case "abilities":
                this.data.abilityMethod = choice;
                if (choice === "roll") this._rollAbilities();
                break;
            case "hp":
                if (choice === "roll") {
                    this._rollHP();
                } else {
                    this._maxHP();
                }
                break;
            case "credits":
                if (choice === "roll") {
                    this._rollCredits();
                } else {
                    this._maxCredits();
                }
                break;
        }
        
        this.render();
    }

    async _rollAbilities() {
        for (let ability in this.data.abilities) {
            const rolls = [];
            for (let i = 0; i < 4; i++) {
                rolls.push(Math.floor(Math.random() * 6) + 1);
            }
            rolls.sort((a, b) => b - a);
            this.data.abilities[ability] = rolls[0] + rolls[1] + rolls[2];
        }
        
        ui.notifications.info("Abilities rolled!");
    }

    async _rollHP() {
        const hitDie = this.getClassHitDie();
        const conMod = Math.floor((this.data.abilities.con - 10) / 2);
        const roll = Math.floor(Math.random() * hitDie) + 1;
        this.data.hp = roll + conMod;
        
        ui.notifications.info(`Rolled ${roll} + ${conMod} CON = ${this.data.hp} HP`);
    }

    _maxHP() {
        const hitDie = this.getClassHitDie();
        const conMod = Math.floor((this.data.abilities.con - 10) / 2);
        this.data.hp = hitDie + conMod;
        
        ui.notifications.info(`Maximum HP: ${this.data.hp}`);
    }

    async _rollCredits() {
        const roll = Math.floor(Math.random() * 6) + 1;
        this.data.credits = roll * 1000;
        
        ui.notifications.info(`Rolled ${roll} x 1000 = ${this.data.credits} credits`);
    }

    _maxCredits() {
        this.data.credits = 6000;
        ui.notifications.info(`Starting with maximum 6000 credits`);
    }

    getClassHitDie() {
        const hitDice = {
            "Jedi": 10,
            "Soldier": 10,
            "Scoundrel": 6,
            "Scout": 8,
            "Noble": 6
        };
        return hitDice[this.data.heroicClass] || 6;
    }

    async _onNext(event) {
        event.preventDefault();
        
        if (!this.canProceed()) {
            ui.notifications.warn("Please complete this step before continuing.");
            return;
        }
        
        this.step++;
        this.render();
    }

    async _onBack(event) {
        event.preventDefault();
        this.step--;
        this.render();
    }

    async _onEdit(event) {
        event.preventDefault();
        const editStep = event.currentTarget.dataset.step;
        this.step = this.steps.indexOf(editStep);
        this.render();
    }

    async _onOpenStore(event) {
        event.preventDefault();
        
        const tempActor = await Actor.create({
            name: this.data.name,
            type: "character",
            system: { credits: this.data.credits }
        });
        
        const { SWSEStore } = await import("./store.js");
        const store = new SWSEStore(tempActor);
        await store.render(true);
        
        const originalClose = store.close.bind(store);
        store.close = async (options) => {
            this.data.items = tempActor.items.map(i => i.toObject());
            this.data.credits = tempActor.system.credits;
            await tempActor.delete();
            this.render();
            return originalClose(options);
        };
    }

    async _onFinish(event) {
        event.preventDefault();
        
        this.applyRacialBonuses();
        
        const actorData = {
            name: this.data.name,
            type: "character",
            system: {
                race: this.data.race,
                class: this.data.heroicClass,
                abilities: this.buildAbilities(),
                hp: {
                    value: this.data.hp,
                    max: this.data.hp
                },
                credits: this.data.credits,
                level: 1,
                forcePoints: { value: 5, max: 5 },
                destinyPoints: { value: 1, max: 1 }
            }
        };
        
        const actor = await Actor.create(actorData);
        
        const feats = [this.data.startingFeat];
        if (this.data.race === "human") feats.push(this.data.bonusFeat);
        
        for (const featName of feats) {
            await actor.createEmbeddedDocuments("Item", [{
                name: featName,
                type: "feat"
            }]);
        }
        
        const updates = {};
        for (const skillKey of this.data.trainedSkills) {
            updates[`system.skills.${skillKey}.trained`] = true;
        }
        await actor.update(updates);
        
        if (this.data.lightsaber) {
            await actor.createEmbeddedDocuments("Item", [{
                name: "Lightsaber",
                type: "weapon",
                system: { damage: "2d8", attackAttr: "str" }
            }]);
        }
        
        if (this.data.items.length > 0) {
            await actor.createEmbeddedDocuments("Item", this.data.items);
        }
        
        ui.notifications.info(`${actor.name} has been created!`);
        actor.sheet.render(true);
        this.close();
    }

    applyRacialBonuses() {
        const bonuses = {
            "twilek": { cha: 2 },
            "wookiee": { str: 2 },
            "bothan": { int: 2 },
            "zabrak": { con: 2 },
            "rodian": { dex: 2, wis: -2, cha: -2 },
            "duros": { dex: 2, int: 2, con: -2 },
            "ithorian": { wis: 2, cha: 2, dex: -2 },
            "sullustan": { dex: 2, con: -2 },
            "trandoshan": { str: 2, dex: -2 },
            "gamorrean": { str: 2, dex: -2, int: -2 },
            "gand": { wis: 2, cha: -2 },
            "ewok": { dex: 2, str: -2 },
            "jawa": { dex: 2, str: -2 },
            "chiss": { dex: 2, int: 2, cha: -2 }
        };
        
        const bonus = bonuses[this.data.race];
        if (bonus) {
            for (let ability in bonus) {
                this.data.abilities[ability] += bonus[ability];
            }
        }
    }

    buildAbilities() {
        const abilities = {};
        for (let key in this.data.abilities) {
            const base = this.data.abilities[key];
            abilities[key] = {
                base: base,
                racial: 0,
                temp: 0,
                total: base,
                mod: Math.floor((base - 10) / 2)
            };
        }
        return abilities;
    }
}