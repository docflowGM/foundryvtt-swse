/**
 * Character Generator Application
 * Provides a step-by-step character creation interface for SWSE
 */

// ===========================================
// CONSTANTS
// ===========================================

const CHARGEN_CONSTANTS = {
    POINT_BUY_POOL: 32,
    MIN_ABILITY_SCORE: 8,
    MAX_ABILITY_SCORE: 18,
    DEFAULT_ABILITY_SCORE: 10,
    ORGANIC_ROLL_DICE: "24d6",
    ORGANIC_KEEP_COUNT: 18,
    ORGANIC_GROUPS: 6,
    STANDARD_ROLL: "4d6kh3",
    STANDARD_ROLL_COUNT: 6
};

/**
 * Calculate point-buy cost for ability scores
 * @param {number} from - Starting value
 * @param {number} to - Ending value
 * @returns {number} Total cost
 */
function calculatePointBuyCost(from, to) {
    const costForIncrement = (v) => {
        if (v < 12) return 1;
        if (v < 14) return 2;
        return 3;
    };
    
    let cost = 0;
    for (let v = from; v < to; v++) {
        cost += costForIncrement(v);
    }
    return cost;
}

/**
 * Calculate ability modifier from total score
 * @param {number} score - Ability score
 * @returns {number} Modifier
 */
function calculateAbilityModifier(score) {
    return Math.floor((score - 10) / 2);
}

// ===========================================
// CHARACTER GENERATOR CLASS
// ===========================================

export default class CharacterGenerator extends Application {
    constructor(actor = null, options = {}) {
        super(options);
        this.actor = actor;
        this.characterData = this._initializeCharacterData();
        this.currentStep = this.actor ? "class" : "name";
        
        // Caches for compendium data
        this._packs = {
            species: null,
            feats: null,
            talents: null,
            classes: null
        };
        this._skillsJson = null;
        this._loadingError = null;
    }

    /**
     * Initialize default character data structure
     * @returns {Object} Character data object
     * @private
     */
    _initializeCharacterData() {
        const defaultAbility = {
            base: CHARGEN_CONSTANTS.DEFAULT_ABILITY_SCORE,
            racial: 0,
            temp: 0,
            total: CHARGEN_CONSTANTS.DEFAULT_ABILITY_SCORE,
            mod: 0
        };
        
        return {
            name: "",
            species: "",
            classes: [],
            abilities: {
                str: {...defaultAbility},
                dex: {...defaultAbility},
                con: {...defaultAbility},
                int: {...defaultAbility},
                wis: {...defaultAbility},
                cha: {...defaultAbility}
            },
            skills: {},
            feats: [],
            talents: [],
            powers: [],
            level: 1,
            hp: { value: 1, max: 1, temp: 0 },
            forcePoints: { value: 0, max: 0, die: "1d6" },
            destinyPoints: { value: 1 },
            secondWind: { uses: 1, max: 1, misc: 0, healing: 0 },
            defenses: {
                fortitude: { base: 10, classBonus: 0, misc: 0, total: 10 },
                reflex: { base: 10, classBonus: 0, misc: 0, total: 10 },
                will: { base: 10, classBonus: 0, misc: 0, total: 10 }
            },
            bab: 0,
            speed: { base: 6 },
            damageThresholdMisc: 0
        };
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["swse", "chargen"],
            template: "systems/swse/templates/apps/chargen.html",
            width: 900,
            height: 700,
            title: "Character Generator",
            resizable: true,
            closeOnSubmit: false
        });
    }

    /**
     * Load data from compendiums
     * @private
     */
    async _loadData() {
        try {
            const packNames = {
                species: "swse.species",
                feats: "swse.feats",
                talents: "swse.talents",
                classes: "swse.classes"
            };
            
            for (const [k, packName] of Object.entries(packNames)) {
                try {
                    const pack = game.packs.get(packName);
                    if (!pack) {
                        console.warn(`SWSE CharGen | Pack not found: ${packName}`);
                        this._packs[k] = [];
                        continue;
                    }
                    const docs = await pack.getDocuments();
                    this._packs[k] = docs.map(d => d.toObject());
                } catch (err) {
                    console.error(`SWSE CharGen | Failed to load pack ${packName}:`, err);
                    this._packs[k] = [];
                }
            }

            // Load skills
            try {
                const resp = await fetch("systems/swse/data/skills.json");
                if (resp.ok) {
                    this._skillsJson = await resp.json();
                } else {
                    console.warn("SWSE CharGen | skills.json not found, using defaults");
                    this._skillsJson = this._getDefaultSkills();
                }
            } catch (e) {
                console.warn("SWSE CharGen | Failed to load skills.json:", e);
                this._skillsJson = this._getDefaultSkills();
            }
        } catch (err) {
            console.error("SWSE CharGen | Critical error loading data:", err);
            this._loadingError = "Failed to load character generation data. Please refresh and try again.";
            ui.notifications.error(this._loadingError);
        }
    }

    /**
     * Get default skills list
     * @returns {Array} Default skills
     * @private
     */
    _getDefaultSkills() {
        return [
            { key: "acrobatics", name: "Acrobatics", ability: "dex", trained: false },
            { key: "climb", name: "Climb", ability: "str", trained: false },
            { key: "deception", name: "Deception", ability: "cha", trained: false },
            { key: "endurance", name: "Endurance", ability: "con", trained: false },
            { key: "gatherInfo", name: "Gather Information", ability: "cha", trained: false },
            { key: "initiative", name: "Initiative", ability: "dex", trained: false },
            { key: "jump", name: "Jump", ability: "str", trained: false },
            { key: "mechanics", name: "Mechanics", ability: "int", trained: false },
            { key: "perception", name: "Perception", ability: "wis", trained: false },
            { key: "persuasion", name: "Persuasion", ability: "cha", trained: false },
            { key: "pilot", name: "Pilot", ability: "dex", trained: false },
            { key: "stealth", name: "Stealth", ability: "dex", trained: false },
            { key: "survival", name: "Survival", ability: "wis", trained: false },
            { key: "swim", name: "Swim", ability: "str", trained: false },
            { key: "treatInjury", name: "Treat Injury", ability: "wis", trained: false },
            { key: "useComputer", name: "Use Computer", ability: "int", trained: false },
            { key: "useTheForce", name: "Use the Force", ability: "cha", trained: false }
        ];
    }

    async getData() {
        const context = super.getData();
        
        // Load data if not already loaded
        if (!this._packs.species) {
            await this._loadData();
        }
        
        context.characterData = this.characterData;
        context.currentStep = this.currentStep;
        context.isLevelUp = !!this.actor;
        context.packs = this._packs;
        context.skillsJson = this._skillsJson || [];
        context.halfLevel = Math.floor(this.characterData.level / 2);
        context.loadingError = this._loadingError;
        
        return context;
    }

    activateListeners(html) {
        super.activateListeners(html);
        
        // Navigation
        html.find('.next-step').click(this._onNextStep.bind(this));
        html.find('.prev-step').click(this._onPrevStep.bind(this));
        html.find('.finish').click(this._onFinish.bind(this));

        // Selections
        html.find('.select-species').click(this._onSelectSpecies.bind(this));
        html.find('.select-class').click(this._onSelectClass.bind(this));
        html.find('.select-feat').click(this._onSelectFeat.bind(this));
        html.find('.select-talent').click(this._onSelectTalent.bind(this));

        // Name input
        html.find('input[name="character-name"]').change((ev) => {
            this.characterData.name = ev.target.value.trim();
        });

        // Step-specific listeners
        if (this.currentStep === "abilities") {
            this._bindAbilitiesUI(html[0]);
        }

        if (this.currentStep === "skills") {
            this._bindSkillsUI(html[0]);
        }

        // Class change
        html.find('[name="class_select"]').change(async (ev) => {
            await this._onClassChanged(ev, html[0]);
        });
    }

    /**
     * Get step progression based on context
     * @returns {Array<string>} Array of step names
     * @private
     */
    _getSteps() {
        if (this.actor) {
            return ["class", "feats", "talents", "skills", "summary"];
        }
        return ["name", "species", "abilities", "class", "feats", "talents", "skills", "summary"];
    }

    /**
     * Advance to next step
     * @param {Event} event - Click event
     * @private
     */
    async _onNextStep(event) {
        event.preventDefault();
        
        // Validate current step
        if (!this._validateCurrentStep()) {
            return;
        }
        
        const steps = this._getSteps();
        const idx = steps.indexOf(this.currentStep);
        
        if (idx >= 0 && idx < steps.length - 1) {
            this.currentStep = steps[idx + 1];
            
            // Auto-calculate derived values when moving to summary
            if (this.currentStep === "summary") {
                this._finalizeCharacter();
            }
            
            await this.render();
        }
    }

    /**
     * Go back to previous step
     * @param {Event} event - Click event
     * @private
     */
    async _onPrevStep(event) {
        event.preventDefault();
        
        const steps = this._getSteps();
        const idx = steps.indexOf(this.currentStep);
        
        if (idx > 0) {
            this.currentStep = steps[idx - 1];
            await this.render();
        }
    }

    /**
     * Validate current step before proceeding
     * @returns {boolean} True if valid
     * @private
     */
    _validateCurrentStep() {
        switch (this.currentStep) {
            case "name":
                if (!this.characterData.name || this.characterData.name.trim() === "") {
                    ui.notifications.warn("Please enter a character name.");
                    return false;
                }
                break;
                
            case "species":
                if (!this.characterData.species) {
                    ui.notifications.warn("Please select a species.");
                    return false;
                }
                break;
                
            case "class":
                if (this.characterData.classes.length === 0) {
                    ui.notifications.warn("Please select a class.");
                    return false;
                }
                break;
                
            case "abilities":
                // Validate all abilities are within range
                for (const [key, ability] of Object.entries(this.characterData.abilities)) {
                    const base = Number(ability.base || CHARGEN_CONSTANTS.DEFAULT_ABILITY_SCORE);
                    if (base < CHARGEN_CONSTANTS.MIN_ABILITY_SCORE || 
                        base > CHARGEN_CONSTANTS.MAX_ABILITY_SCORE) {
                        ui.notifications.warn(
                            `${key.toUpperCase()} must be between ${CHARGEN_CONSTANTS.MIN_ABILITY_SCORE} and ${CHARGEN_CONSTANTS.MAX_ABILITY_SCORE}.`
                        );
                        return false;
                    }
                }
                break;
        }
        
        return true;
    }

    /**
     * Select species and apply racial bonuses
     * @param {Event} event - Click event
     * @private
     */
    async _onSelectSpecies(event) {
        event.preventDefault();
        
        const speciesKey = event.currentTarget.dataset.species;
        if (!speciesKey) {
            ui.notifications.warn("Invalid species selection.");
            return;
        }
        
        this.characterData.species = speciesKey;
        
        try {
            // Apply racial bonuses
            const bonuses = await this._getRacialBonuses(speciesKey);
            for (const [k, v] of Object.entries(bonuses || {})) {
                if (this.characterData.abilities[k]) {
                    this.characterData.abilities[k].racial = Number(v || 0);
                }
            }
            
            this._recalcAbilities();
            await this._onNextStep(event);
        } catch (err) {
            console.error("SWSE CharGen | Error selecting species:", err);
            ui.notifications.error("Failed to apply species bonuses.");
        }
    }

    /**
     * Get racial ability bonuses for a species
     * @param {string} speciesName - Name or ID of species
     * @returns {Object} Bonuses object
     * @private
     */
    async _getRacialBonuses(speciesName) {
        if (!this._packs.species) await this._loadData();
        
        const found = this._packs.species.find(
            s => s.name === speciesName || s._id === speciesName
        );
        
        return (found && found.system && found.system.bonuses) ? 
            found.system.bonuses : {};
    }

    /**
     * Select class and apply class-based values
     * @param {Event} event - Click event
     * @private
     */
    async _onSelectClass(event) {
        event.preventDefault();
        
        const className = event.currentTarget.dataset.class;
        if (!className) {
            ui.notifications.warn("Invalid class selection.");
            return;
        }
        
        try {
            // Find class document
            const classDoc = this._packs.classes.find(
                c => c.name === className || c._id === className
            );
            
            if (!classDoc) {
                ui.notifications.error(`Class "${className}" not found.`);
                return;
            }
            
            // Add class with level 1
            this.characterData.classes.push({ name: className, level: 1 });
            
            // Set class-based values
            if (classDoc.system) {
                // Base Attack Bonus
                this.characterData.bab = Number(classDoc.system.babProgression) || 0;
                
                // Hit Points (class HD + CON mod)
                const hitDie = Number(classDoc.system.hitDie) || 6;
                const conMod = this.characterData.abilities.con.mod || 0;
                this.characterData.hp.max = hitDie + conMod;
                this.characterData.hp.value = this.characterData.hp.max;
                
                // Defense bonuses
                if (classDoc.system.defenses) {
                    this.characterData.defenses.fortitude.classBonus = 
                        Number(classDoc.system.defenses.fortitude) || 0;
                    this.characterData.defenses.reflex.classBonus = 
                        Number(classDoc.system.defenses.reflex) || 0;
                    this.characterData.defenses.will.classBonus = 
                        Number(classDoc.system.defenses.will) || 0;
                }
                
                // Trained skills available
                this.characterData.trainedSkillsAllowed = 
                    Number(classDoc.system.trainedSkills) || 0;
                
                // Force Points (if Force-sensitive class)
                if (classDoc.system.forceSensitive) {
                    this.characterData.forcePoints.max = 
                        5 + Math.floor(this.characterData.level / 2);
                    this.characterData.forcePoints.value = 
                        this.characterData.forcePoints.max;
                    this.characterData.forcePoints.die = "1d6";
                }
            }
            
            // Recalculate defenses
            this._recalcDefenses();
            
            await this._onNextStep(event);
        } catch (err) {
            console.error("SWSE CharGen | Error selecting class:", err);
            ui.notifications.error("Failed to apply class features.");
        }
    }

    /**
     * Handle class dropdown change
     * @param {Event} event - Change event
     * @param {HTMLElement} htmlRoot - Root HTML element
     * @param {boolean} initial - Whether this is initial load
     * @private
     */
    async _onClassChanged(event, htmlRoot, initial = false) {
        await this._loadData();
        
        const classNode = (htmlRoot || this.element[0]).querySelector('[name="class_select"]');
        if (!classNode) return;
        
        const cls = classNode.value;
        const classDoc = this._packs.classes.find(c => c.name === cls || c._id === cls);
        const trained = classDoc && classDoc.system ? 
            Number(classDoc.system.trainedSkills || 0) : 0;
        
        this.characterData.trainedSkillsAllowed = trained;
        
        if (!initial) {
            await this.render();
        }
    }

    /**
     * Select a feat
     * @param {Event} event - Click event
     * @private
     */
    async _onSelectFeat(event) {
        event.preventDefault();
        
        const id = event.currentTarget.dataset.featid;
        if (!id) {
            ui.notifications.warn("Invalid feat selection.");
            return;
        }
        
        const feat = this._packs.feats.find(f => f._id === id || f.name === id);
        
        if (!feat) {
            ui.notifications.warn("Feat not found.");
            return;
        }
        
        if (this.characterData.feats.find(f => f.name === feat.name)) {
            ui.notifications.info("You already have this feat.");
            return;
        }
        
        this.characterData.feats.push(feat);
        
        const needed = this._getFeatsNeeded();
        if (this.characterData.feats.length >= needed) {
            await this._onNextStep(event);
        } else {
            await this.render();
        }
    }

    /**
     * Select a talent
     * @param {Event} event - Click event
     * @private
     */
    async _onSelectTalent(event) {
        event.preventDefault();
        
        const id = event.currentTarget.dataset.talentid;
        if (!id) {
            ui.notifications.warn("Invalid talent selection.");
            return;
        }
        
        const tal = this._packs.talents.find(t => t._id === id || t.name === id);
        
        if (!tal) {
            ui.notifications.warn("Talent not found.");
            return;
        }
        
        if (this.characterData.talents.find(t => t.name === tal.name)) {
            ui.notifications.info("You already have this talent.");
            return;
        }
        
        this.characterData.talents.push(tal);
        await this._onNextStep(event);
    }

    /**
     * Calculate number of feats needed for current level
     * @returns {number} Number of feats
     * @private
     */
    _getFeatsNeeded() {
        const lvl = this.characterData.level || 1;
        return Math.ceil(lvl / 2);
    }

    // ========================================
    // ABILITIES UI
    // ========================================
    
    /**
     * Bind ability score generation UI
     * @param {HTMLElement} root - Root HTML element
     * @private
     */
    _bindAbilitiesUI(root) {
        const doc = root || this.element[0];
        const ablist = ["str", "dex", "con", "int", "wis", "cha"];
        
        // Point buy system
        let pool = CHARGEN_CONSTANTS.POINT_BUY_POOL;

        const updatePointRemaining = () => {
            const el = doc.querySelector("#point-remaining");
            if (el) el.textContent = pool;
        };

        const initPointBuy = () => {
            pool = CHARGEN_CONSTANTS.POINT_BUY_POOL;
            ablist.forEach(a => {
                const inp = doc.querySelector(`[name="ability_${a}"]`);
                if (inp) inp.value = CHARGEN_CONSTANTS.MIN_ABILITY_SCORE;
                
                const plus = doc.querySelector(`[data-plus="${a}"]`);
                const minus = doc.querySelector(`[data-minus="${a}"]`);
                
                if (plus) plus.onclick = () => adjustAttribute(a, +1);
                if (minus) minus.onclick = () => adjustAttribute(a, -1);
            });
            updatePointRemaining();
            recalcPreview();
        };

        const adjustAttribute = (ab, delta) => {
            const el = doc.querySelector(`[name="ability_${ab}"]`);
            if (!el) return;
            
            let cur = Number(el.value || CHARGEN_CONSTANTS.MIN_ABILITY_SCORE);
            const newVal = Math.max(
                CHARGEN_CONSTANTS.MIN_ABILITY_SCORE,
                Math.min(CHARGEN_CONSTANTS.MAX_ABILITY_SCORE, cur + delta)
            );
            
            const costNow = calculatePointBuyCost(CHARGEN_CONSTANTS.MIN_ABILITY_SCORE, cur);
            const costNew = calculatePointBuyCost(CHARGEN_CONSTANTS.MIN_ABILITY_SCORE, newVal);
            const deltaCost = costNew - costNow;
            
            if (deltaCost > pool) {
                ui.notifications.warn("Not enough point-buy points remaining.");
                return;
            }
            
            pool -= deltaCost;
            el.value = newVal;
            this.characterData.abilities[ab].base = newVal;
            updatePointRemaining();
            recalcPreview();
        };

        // Standard array roll
        const rollStandard = async () => {
            try {
                const results = [];
                for (let i = 0; i < CHARGEN_CONSTANTS.STANDARD_ROLL_COUNT; i++) {
                    const r = new Roll(CHARGEN_CONSTANTS.STANDARD_ROLL).evaluate({ async: false });
                    results.push({ total: r.total });
                }
                
                const container = doc.querySelector("#roll-results");
                if (container) {
                    container.innerHTML = "";
                    results.forEach(res => {
                        const btn = document.createElement("button");
                        btn.type = "button";
                        btn.className = "assign-roll";
                        btn.textContent = `${res.total}`;
                        btn.dataset.value = res.total;
                        btn.onclick = () => assignRollToNext(res.total);
                        container.appendChild(btn);
                    });
                    ui.notifications.info(
                        "Standard rolls generated  click a result then click an ability to assign."
                    );
                }
            } catch (err) {
                console.error("SWSE CharGen | Error rolling standard array:", err);
                ui.notifications.error("Failed to generate ability rolls.");
            }
        };

        const assignRollToNext = (val) => {
            let target = doc.querySelector(".ability-input:focus");
            if (!target) {
                const inputs = ablist
                    .map(a => doc.querySelector(`[name="ability_${a}"]`))
                    .filter(Boolean);
                inputs.sort((x, y) => Number(x.value) - Number(y.value));
                target = inputs[0];
            }
            
            if (target) {
                const ability = target.name.replace("ability_", "");
                target.value = val;
                this.characterData.abilities[ability].base = val;
                recalcPreview();
            }
        };

        // Organic roll
        const rollOrganic = async () => {
            try {
                const r = new Roll(CHARGEN_CONSTANTS.ORGANIC_ROLL_DICE).evaluate({ async: false });
                const rolls = r.dice[0].results
                    .map(x => x.result)
                    .sort((a, b) => b - a);
                const kept = rolls.slice(0, CHARGEN_CONSTANTS.ORGANIC_KEEP_COUNT);
                
                const groups = [];
                for (let i = 0; i < CHARGEN_CONSTANTS.ORGANIC_GROUPS; i++) {
                    groups.push(kept.slice(i * 3, (i + 1) * 3));
                }
                
                const container = doc.querySelector("#organic-groups");
                if (container) {
                    container.innerHTML = "";
                    groups.forEach((g, idx) => {
                        const div = document.createElement("div");
                        div.className = "organic-group";
                        const s = g.reduce((a, b) => a + b, 0);
                        div.textContent = `${g.join(", ")} = ${s}`;
                        div.dataset.sum = s;
                        div.onclick = () => selectOrganicGroup(div);
                        container.appendChild(div);
                    });
                    ui.notifications.info(
                        "Organic roll completed  click a group, then click an ability to assign."
                    );
                }
                doc._selectedOrganic = null;
            } catch (err) {
                console.error("SWSE CharGen | Error rolling organic:", err);
                ui.notifications.error("Failed to generate organic rolls.");
            }
        };

        const selectOrganicGroup = (div) => {
            doc.querySelectorAll(".organic-group").forEach(d => 
                d.classList.remove("selected-group")
            );
            div.classList.add("selected-group");
            doc._selectedOrganic = Number(div.dataset.sum);
            
            ablist.forEach(a => {
                const input = doc.querySelector(`[name="ability_${a}"]`);
                if (input) {
                    input.onclick = () => {
                        if (doc._selectedOrganic == null) return;
                        
                        input.value = doc._selectedOrganic;
                        this.characterData.abilities[a].base = doc._selectedOrganic;
                        recalcPreview();
                        doc.querySelectorAll(".organic-group").forEach(d => 
                            d.classList.remove("selected-group")
                        );
                        doc._selectedOrganic = null;
                    };
                }
            });
        };

        const recalcPreview = () => {
            ablist.forEach(a => {
                const inp = doc.querySelector(`[name="ability_${a}"]`);
                const display = doc.querySelector(`#display_${a}`);
                const base = Number(inp?.value || CHARGEN_CONSTANTS.DEFAULT_ABILITY_SCORE);
                const racial = Number(this.characterData.abilities[a].racial || 0);
                const temp = Number(this.characterData.abilities[a].temp || 0);
                const total = base + racial + temp;
                const mod = calculateAbilityModifier(total);
                
                this.characterData.abilities[a].base = base;
                this.characterData.abilities[a].total = total;
                this.characterData.abilities[a].mod = mod;
                
                if (display) {
                    display.textContent = `Total: ${total} (Mod: ${mod >= 0 ? "+" : ""}${mod})`;
                }
            });
            
            // Update Second Wind preview
            const hpMax = Number(doc.querySelector('[name="hp_max"]')?.value || 1);
            const conTotal = this.characterData.abilities.con.total || 10;
            const conMod = calculateAbilityModifier(conTotal);
            const misc = Number(doc.querySelector('[name="sw_misc"]')?.value || 0);
            const heal = Math.max(Math.floor(hpMax / 4), conMod) + misc;
            this.characterData.secondWind.healing = heal;
            
            const swPreview = doc.querySelector("#sw_heal_preview");
            if (swPreview) swPreview.textContent = heal;
        };

        // Wire buttons
        const stdBtn = doc.querySelector("#std-roll-btn");
        if (stdBtn) stdBtn.onclick = rollStandard;
        
        const orgBtn = doc.querySelector("#org-roll-btn");
        if (orgBtn) orgBtn.onclick = rollOrganic;
        
        const pbInit = doc.querySelector("#pb-init");
        if (pbInit) pbInit.onclick = initPointBuy;

        // Initialize point buy by default
        initPointBuy();
    }

    // ========================================
    // SKILLS UI
    // ========================================
    
    /**
     * Bind skills selection UI
     * @param {HTMLElement} root - Root HTML element
     * @private
     */
    _bindSkillsUI(root) {
        const doc = root || this.element[0];
        const skillsContainer = doc.querySelector("#skills-list");
        if (!skillsContainer) return;
        
        const maxTrained = this.characterData.trainedSkillsAllowed || 0;
        let trainedCount = 0;
        
        // Count current trained skills
        for (const skill of this._skillsJson) {
            if (this.characterData.skills[skill.key]?.trained) {
                trainedCount++;
            }
        }
        
        // Update counter display
        const updateCounter = () => {
            const counter = doc.querySelector("#trained-counter");
            if (counter) counter.textContent = `${trainedCount} / ${maxTrained}`;
        };
        updateCounter();
        
        // Render skills
        skillsContainer.innerHTML = "";
        for (const skill of this._skillsJson) {
            const skillData = this.characterData.skills[skill.key] || 
                { trained: false, focus: false, misc: 0 };
            
            const row = document.createElement("div");
            row.className = "skill-row";
            
            const label = document.createElement("label");
            label.textContent = skill.name;
            
            const trainedCheck = document.createElement("input");
            trainedCheck.type = "checkbox";
            trainedCheck.checked = skillData.trained;
            trainedCheck.onchange = (ev) => {
                if (ev.target.checked && trainedCount >= maxTrained) {
                    ui.notifications.warn(
                        `Maximum trained skills (${maxTrained}) reached!`
                    );
                    ev.target.checked = false;
                    return;
                }
                
                if (ev.target.checked) trainedCount++;
                else trainedCount--;
                
                if (!this.characterData.skills[skill.key]) {
                    this.characterData.skills[skill.key] = {};
                }
                this.characterData.skills[skill.key].trained = ev.target.checked;
                updateCounter();
            };
            
            const focusCheck = document.createElement("input");
            focusCheck.type = "checkbox";
            focusCheck.checked = skillData.focus;
            focusCheck.onchange = (ev) => {
                if (!this.characterData.skills[skill.key]) {
                    this.characterData.skills[skill.key] = {};
                }
                this.characterData.skills[skill.key].focus = ev.target.checked;
            };
            
            row.appendChild(label);
            row.appendChild(document.createTextNode(" Trained: "));
            row.appendChild(trainedCheck);
            row.appendChild(document.createTextNode(" Focus: "));
            row.appendChild(focusCheck);
            
            skillsContainer.appendChild(row);
        }
    }

    /**
     * Recalculate ability scores and modifiers
     * @private
     */
    _recalcAbilities() {
        for (const [k, v] of Object.entries(this.characterData.abilities)) {
            const base = Number(v.base || CHARGEN_CONSTANTS.DEFAULT_ABILITY_SCORE);
            const racial = Number(v.racial || 0);
            const temp = Number(v.temp || 0);
            v.total = base + racial + temp;
            v.mod = calculateAbilityModifier(v.total);
        }
    }

    /**
     * Recalculate defense values
     * @private
     */
    _recalcDefenses() {
        const halfLevel = Math.floor(this.characterData.level / 2);
        
        // Fortitude: 10 + level/2 + CON or STR (whichever is higher) + class bonus + misc
        const fortAbility = Math.max(
            this.characterData.abilities.con.mod || 0,
            this.characterData.abilities.str.mod || 0
        );
        this.characterData.defenses.fortitude.total = 
            10 + halfLevel + fortAbility + 
            this.characterData.defenses.fortitude.classBonus + 
            this.characterData.defenses.fortitude.misc;
        
        // Reflex: 10 + level/2 + DEX + class bonus + misc
        this.characterData.defenses.reflex.total = 
            10 + halfLevel + (this.characterData.abilities.dex.mod || 0) + 
            this.characterData.defenses.reflex.classBonus + 
            this.characterData.defenses.reflex.misc;
        
        // Will: 10 + level/2 + WIS + class bonus + misc
        this.characterData.defenses.will.total = 
            10 + halfLevel + (this.characterData.abilities.wis.mod || 0) + 
            this.characterData.defenses.will.classBonus + 
            this.characterData.defenses.will.misc;
    }

    /**
     * Finalize character before creation
     * @private
     */
    _finalizeCharacter() {
        // Final recalculations
        this._recalcAbilities();
        this._recalcDefenses();
        
        // Second Wind
        const conMod = this.characterData.abilities.con.mod || 0;
        const hpMax = this.characterData.hp.max;
        this.characterData.secondWind.healing = Math.max(
            Math.floor(hpMax / 4), 
            conMod
        ) + (this.characterData.secondWind.misc || 0);
        
        // Damage Threshold = Fortitude Defense
        this.characterData.damageThreshold = this.characterData.defenses.fortitude.total;
    }

    // ========================================
    // FINISH & CREATE ACTOR
    // ========================================
    
    /**
     * Finish character creation
     * @param {Event} event - Click event
     * @private
     */
    async _onFinish(event) {
        event.preventDefault();
        
        // Show confirmation dialog
        const confirmed = await Dialog.confirm({
            title: "Create Character",
            content: `<p>Are you sure you want to create <strong>${this.characterData.name}</strong>?</p>`,
            defaultYes: true
        });
        
        if (!confirmed) return;
        
        try {
            this._finalizeCharacter();
            
            if (this.actor) {
                await this._updateActor();
            } else {
                await this._createActor();
            }
            
            this.close();
        } catch (err) {
            console.error("SWSE CharGen | Error finishing character:", err);
            ui.notifications.error("Failed to create character. See console for details.");
        }
    }

    /**
     * Create new actor from character data
     * @private
     */
    async _createActor() {
        const system = {
            level: this.characterData.level,
            race: this.characterData.species,
            abilities: this.characterData.abilities,
            skills: this.characterData.skills,
            hp: this.characterData.hp,
            forcePoints: this.characterData.forcePoints,
            destinyPoints: this.characterData.destinyPoints,
            secondWind: this.characterData.secondWind,
            defenses: this.characterData.defenses,
            classes: this.characterData.classes,
            bab: this.characterData.bab,
            speed: this.characterData.speed,
            damageThresholdMisc: this.characterData.damageThresholdMisc || 0,
            weapons: []
        };
        
        const actorData = {
            name: this.characterData.name || "Unnamed Character",
            type: "character",
            system: system,
            prototypeToken: { 
                name: this.characterData.name || "Unnamed Character",
                actorLink: true
            }
        };
        
        try {
            const created = await Actor.create(actorData);
            
            if (!created) {
                throw new Error("Actor creation returned null");
            }
            
            // Create embedded items (feats, talents, powers)
            const items = [
                ...(this.characterData.feats || []),
                ...(this.characterData.talents || []),
                ...(this.characterData.powers || [])
            ];
            
            if (items.length > 0) {
                await created.createEmbeddedDocuments("Item", items);
            }
            
            // Save character generation data to flags for reference
            await created.setFlag("swse", "chargenData", this.characterData);
            
            // Open the character sheet
            created.sheet.render(true);
            
            ui.notifications.info(
                `Character ${this.characterData.name} created successfully!`
            );
        } catch (err) {
            console.error("SWSE CharGen | Actor creation failed:", err);
            throw err;
        }
    }

    /**
     * Update existing actor (level up)
     * @private
     */
    async _updateActor() {
        try {
            const newLevel = (this.actor.system.level || 1) + 1;
            const updates = { "system.level": newLevel };
            
            // Recalculate HP for new level
            const conMod = this.actor.system.abilities.con.mod || 0;
            const classDoc = this._packs.classes.find(c => 
                c.name === this.characterData.classes[0]?.name
            );
            const hitDie = classDoc?.system?.hitDie || 6;
            const hpGain = Math.floor(hitDie / 2) + 1 + conMod;
            
            updates["system.hp.max"] = this.actor.system.hp.max + hpGain;
            updates["system.hp.value"] = this.actor.system.hp.value + hpGain;
            
            await this.actor.update(updates);
            
            // Add new feats/talents/powers
            const items = [
                ...(this.characterData.feats || []),
                ...(this.characterData.talents || []),
                ...(this.characterData.powers || [])
            ];
            
            if (items.length > 0) {
                await this.actor.createEmbeddedDocuments("Item", items);
            }
            
            ui.notifications.info(
                `${this.actor.name} leveled up to level ${newLevel}!`
            );
        } catch (err) {
            console.error("SWSE CharGen | Level up failed:", err);
            throw err;
        }
    }

    /**
     * Close handler with unsaved changes warning
     * @param {Object} options - Close options
     * @override
     */
    async close(options = {}) {
        // Check if character creation is in progress
        if (this.currentStep !== "name" && !this.actor && this.characterData.name) {
            const confirmed = await Dialog.confirm({
                title: "Unsaved Character",
                content: "<p>You have an unsaved character. Are you sure you want to close?</p>",
                defaultYes: false
            });
            
            if (!confirmed) return;
        }
        
        return super.close(options);
    }
}
