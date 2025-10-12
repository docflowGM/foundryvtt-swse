export default class CharacterGenerator extends Application {
    constructor(actor = null, options = {}) {
        super(options);
        this.actor = actor;
        this.characterData = {
            name: "",
            species: "",
            classes: [],
            abilities: {
                str: {base: 10, racial: 0, modifier: 0},
                dex: {base: 10, racial: 0, modifier: 0},
                con: {base: 10, racial: 0, modifier: 0},
                int: {base: 10, racial: 0, modifier: 0},
                wis: {base: 10, racial: 0, modifier: 0},
                cha: {base: 10, racial: 0, modifier: 0}
            },
            skills: {},
            feats: [],
            talents: [],
            powers: [],
            level: 1
        };
        this.currentStep = "name";
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["swse", "chargen"],
            template: "systems/swse/templates/chargen/chargen.html",
            width: 700,
            height: 600,
            title: "Character Generator",
            resizable: true
        });
    }

    getData() {
        const context = super.getData();
        context.characterData = this.characterData;
        context.currentStep = this.currentStep;
        context.isLevelUp = this.actor !== null;
        return context;
    }

    activateListeners(html) {
        super.activateListeners(html);
        
        html.find('.next-step').click(this._onNextStep.bind(this));
        html.find('.prev-step').click(this._onPrevStep.bind(this));
        html.find('.finish').click(this._onFinish.bind(this));
        html.find('.select-species').click(this._onSelectSpecies.bind(this));
        html.find('.select-class').click(this._onSelectClass.bind(this));
        html.find('.select-feat').click(this._onSelectFeat.bind(this));
        html.find('.select-talent').click(this._onSelectTalent.bind(this));
    }

    async _onNextStep(event) {
        event.preventDefault();
        
        const steps = this._getSteps();
        const currentIndex = steps.indexOf(this.currentStep);
        
        if (currentIndex < steps.length - 1) {
            this.currentStep = steps[currentIndex + 1];
            this.render();
        }
    }

    async _onPrevStep(event) {
        event.preventDefault();
        
        const steps = this._getSteps();
        const currentIndex = steps.indexOf(this.currentStep);
        
        if (currentIndex > 0) {
            this.currentStep = steps[currentIndex - 1];
            this.render();
        }
    }

    _getSteps() {
        if (this.actor) {
            // Level up flow
            return ["class", "feats", "talents", "skills"];
        } else {
            // New character flow
            return ["name", "species", "abilities", "class", "feats", "talents", "skills"];
        }
    }

    async _onSelectSpecies(event) {
        event.preventDefault();
        const species = event.currentTarget.dataset.species;
        this.characterData.species = species;
        
        // Apply racial ability bonuses
        const racialBonuses = this._getRacialBonuses(species);
        for (let [ability, bonus] of Object.entries(racialBonuses)) {
            this.characterData.abilities[ability].racial = bonus;
        }
        
        this._onNextStep(event);
    }

    async _onSelectClass(event) {
        event.preventDefault();
        const className = event.currentTarget.dataset.class;
        
        this.characterData.classes.push({
            name: className,
            level: 1
        });
        
        // Show available feats for this class/level
        await this._showFeatSelection(className, this.characterData.level);
    }

    async _showFeatSelection(className, level) {
        // Get available feats based on class and level
        const availableFeats = await this._getAvailableFeats(className, level);
        
        if (availableFeats.length === 0) {
            this._onNextStep(new Event('click'));
            return;
        }
        
        this.currentStep = "feats";
        this.availableFeats = availableFeats;
        this.render();
    }

    async _getAvailableFeats(className, level) {
        const feats = game.items.filter(i => i.type === "feat");
        
        // Filter feats based on prerequisites
        return feats.filter(feat => {
            const prereqs = feat.system.prerequisites || {};
            
            // Check level requirement
            if (prereqs.level && level < prereqs.level) return false;
            
            // Check class requirement
            if (prereqs.class && prereqs.class !== className) return false;
            
            // Check if already have feat
            if (this.characterData.feats.some(f => f.name === feat.name)) return false;
            
            return true;
        });
    }

    async _onSelectFeat(event) {
        event.preventDefault();
        const featId = event.currentTarget.dataset.featId;
        const feat = game.items.get(featId);
        
        if (feat) {
            this.characterData.feats.push(feat.toObject());
            
            // Check if more feats needed
            const featsNeeded = this._getFeatsNeeded();
            if (this.characterData.feats.length >= featsNeeded) {
                // Move to talent selection
                await this._showTalentSelection();
            } else {
                this.render();
            }
        }
    }

    async _showTalentSelection() {
        const className = this.characterData.classes[this.characterData.classes.length - 1].name;
        const level = this.characterData.level;
        
        const availableTalents = await this._getAvailableTalents(className, level);
        
        if (availableTalents.length === 0) {
            this._onNextStep(new Event('click'));
            return;
        }
        
        this.currentStep = "talents";
        this.availableTalents = availableTalents;
        this.render();
    }

    async _getAvailableTalents(className, level) {
        const talents = game.items.filter(i => i.type === "talent");
        
        return talents.filter(talent => {
            const prereqs = talent.system.prerequisites || {};
            
            // Check if talent is for this class
            if (prereqs.class && prereqs.class !== className) return false;
            
            // Check if already have talent
            if (this.characterData.talents.some(t => t.name === talent.name)) return false;
            
            return true;
        });
    }

    async _onSelectTalent(event) {
        event.preventDefault();
        const talentId = event.currentTarget.dataset.talentId;
        const talent = game.items.get(talentId);
        
        if (talent) {
            this.characterData.talents.push(talent.toObject());
            this._onNextStep(event);
        }
    }

    _getFeatsNeeded() {
        // Characters get a feat at 1st level and every odd level
        const level = this.characterData.level;
        return Math.ceil(level / 2);
    }

    _getRacialBonuses(species) {
        const bonuses = {
            "Human": {},
            "Twi'lek": {cha: 2},
            "Wookiee": {str: 2},
            "Bothan": {int: 2},
            "Zabrak": {con: 2}
        };
        
        return bonuses[species] || {};
    }

    async _onFinish(event) {
        event.preventDefault();
        
        if (this.actor) {
            // Update existing actor
            await this._updateActor();
        } else {
            // Create new actor
            await this._createActor();
        }
        
        this.close();
    }

    async _createActor() {
        const actorData = {
            name: this.characterData.name,
            type: "character",
            system: {
                abilities: this.characterData.abilities,
                skills: this.characterData.skills,
                level: this.characterData.level,
                species: this.characterData.species,
                class: this.characterData.classes[0]?.name || "",
                experience: 0,
                destiny: 1
            }
        };
        
        const actor = await Actor.create(actorData);
        
        // Add feats, talents, and powers
        const items = [
            ...this.characterData.feats,
            ...this.characterData.talents,
            ...this.characterData.powers
        ];
        
        if (items.length > 0) {
            await actor.createEmbeddedDocuments("Item", items);
        }
        
        actor.sheet.render(true);
    }

    async _updateActor() {
        // Level up existing actor
        const newLevel = this.actor.system.level + 1;
        
        await this.actor.update({
            "system.level": newLevel
        });
        
        // Add new feats, talents, and powers
        const items = [
            ...this.characterData.feats,
            ...this.characterData.talents,
            ...this.characterData.powers
        ];
        
        if (items.length > 0) {
            await this.actor.createEmbeddedDocuments("Item", items);
        }
    }
}