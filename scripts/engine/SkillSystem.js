/* ==========================================================================
   Enhanced SWSE SkillSystem.js
   - Extra Skill Uses (Compendium)
   - Combat Actions Integration
   - Holo Card Metadata
   - Favorites System
   - GM Tools
   - Breakdown Roll Support
   - DC Awareness
   - Category Grouping
   - Hover Previews
   - Knowledge Specializations
   - Custom Skills
   ========================================================================== */

export class SkillSystem {

    /* ======================================================================
       MAIN ENTRY POINT
       ====================================================================== */
    static async buildSkillActions(actor) {

        const sysSkills = actor.system.skills || {};
        const actionMap = {};

        // Load extra skill uses from compendium
        const extraUses = await SkillSystem._loadExtraSkillUses();

        // Create bucket for each known/custom skill
        for (const [key, data] of Object.entries(sysSkills)) {
            actionMap[key] = SkillSystem._emptySkillGroup(key, data);
        }

        // Merge combat actions (CombatActionsMapper)
        SkillSystem._mergeCombatActions(actor, actionMap);

        // Merge extra-skill-uses (Compendium)
        SkillSystem._mergeExtraUses(extraUses, actionMap);

        // Merge programmatic skill uses (skill-uses.js)
        SkillSystem._mergeProgrammaticSkillUses(actor, actionMap);

        // Finalize (favorites, categories, GM tools)
        SkillSystem._finalizeGroups(actor, actionMap);

        return actionMap;
    }

    /* ======================================================================
       LOAD EXTRA SKILL USES FROM PACK
       ====================================================================== */
    static async _loadExtraSkillUses() {
        const pack = game.packs.get("foundryvtt-swse.extraskilluses");
        if (!pack) return [];

        const index = await pack.getIndex();
        const docs = await Promise.all(index.map(i => pack.getDocument(i._id)));

        return docs.map(doc => ({
            _id: doc.id,
            name: doc.name,
            ...doc.system
        }));
    }

    /* ======================================================================
       CREATE EMPTY SKILL GROUP BUCKET
       ====================================================================== */
    static _emptySkillGroup(key, data) {
        return {
            key,
            label: data.label || SkillSystem._labelFromKey(key),

            abilityOverride: data.selectedAbility || null,

            // Lists of actions
            combatActions: [],
            extraUses: [],

            // Category � array of actions
            categories: {},

            // Favorites (loaded from game.settings)
            favorites: [],

            // Post-merge flag
            hasActions: false,

            // For GM quick controls
            gmTools: true,

            // For breakdown tooltip population
            breakdown: {}
        };
    }

    /* ======================================================================
       MERGE COMBAT ACTIONS
       ====================================================================== */
    static _mergeCombatActions(actor, actionMap) {
        const CAM = game.swse?.CombatActionsMapper;
        if (!CAM) return;

        const map = CAM.getActionsFor(actor) || {};

        for (const [skillKey, list] of Object.entries(map)) {
            if (!actionMap[skillKey]) {
                // Ensure group exists for custom skill keys
                actionMap[skillKey] = SkillSystem._emptySkillGroup(skillKey, {
                    label: SkillSystem._labelFromKey(skillKey)
                });
            }
            actionMap[skillKey].combatActions.push(...list);
        }
    }

    /* ======================================================================
       MERGE EXTRA SKILL USES
       ====================================================================== */
    static _mergeExtraUses(extraUses, actionMap) {
        for (const use of extraUses) {
            const key = SkillSystem._detectSkill(use);

            if (!actionMap[key]) {
                actionMap[key] = SkillSystem._emptySkillGroup(key, {
                    label: SkillSystem._labelFromKey(key)
                });
            }

            const entry = {
                name: use.application,
                dc: use.DC,
                time: use.time,
                effect: use.effect,
                category: SkillSystem._detectCategory(use),
                raw: use
            };

            actionMap[key].extraUses.push(entry);
        }
    }

    /* ======================================================================
       MERGE PROGRAMMATIC SKILL USES
       ====================================================================== */
    static _mergeProgrammaticSkillUses(actor, actionMap) {
        // Access the programmatic skill use classes from global namespace
        const SWSE = globalThis.SWSE || game.swse || {};

        // Define programmatic skill uses with their configurations
        const programmaticUses = [
            // ==== JUMP ====
            { skillKey: 'jump', name: 'Long Jump', dc: 'distance × 3', time: 'part of movement',
              effect: 'Leap horizontally; DC doubled without running start', category: 'Movement',
              handler: SWSE.JumpUses?.longJump },
            { skillKey: 'jump', name: 'High Jump', dc: 'distance × 12', time: 'part of movement',
              effect: 'Leap vertically; DC halved with pole, doubled without running start', category: 'Movement',
              handler: SWSE.JumpUses?.highJump },
            { skillKey: 'jump', name: 'Jump Down', dc: '15', time: 'reaction',
              effect: 'Reduce falling damage by 3m, +3m per 10 over DC', category: 'Movement',
              handler: SWSE.JumpUses?.jumpDown },

            // ==== KNOWLEDGE ====
            { skillKey: 'knowledge', name: 'Common Knowledge', dc: '10', time: 'reaction',
              effect: 'Recall general info anyone might know', category: 'Recall',
              handler: SWSE.KnowledgeUses?.commonKnowledge },
            { skillKey: 'knowledge', name: 'Expert Knowledge', dc: '15-30', time: 'reaction',
              effect: 'Recall specialized expert knowledge', category: 'Recall',
              handler: SWSE.KnowledgeUses?.expertKnowledge },

            // ==== MECHANICS ====
            { skillKey: 'mechanics', name: 'Disable Device', dc: 'varies', time: 'full-round',
              effect: 'Disable mechanical or electronic device', category: 'Technical',
              handler: SWSE.MechanicsUses?.disableDevice },
            { skillKey: 'mechanics', name: 'Jury-Rig', dc: '25', time: 'full-round',
              effect: 'Temporarily repair disabled device', category: 'Technical',
              handler: SWSE.MechanicsUses?.juryRig },
            { skillKey: 'mechanics', name: 'Repair', dc: 'varies', time: '1 hour',
              effect: 'Repair damaged vehicle or device', category: 'Technical',
              handler: SWSE.MechanicsUses?.repair },

            // ==== PERCEPTION ====
            { skillKey: 'perception', name: 'Avoid Surprise', dc: 'varies', time: 'reaction',
              effect: 'Notice ambush or surprise attack', category: 'Awareness',
              handler: SWSE.PerceptionUses?.avoidSurprise },
            { skillKey: 'perception', name: 'Notice Targets', dc: 'opposed', time: 'reaction',
              effect: 'Spot hidden or stealthed targets', category: 'Awareness',
              handler: SWSE.PerceptionUses?.noticeTargets },
            { skillKey: 'perception', name: 'Search', dc: 'varies', time: 'full-round',
              effect: 'Search area for hidden objects or clues', category: 'Awareness',
              handler: SWSE.PerceptionUses?.search },

            // ==== PERSUASION ====
            { skillKey: 'persuasion', name: 'Change Attitude', dc: 'opposed', time: 'full-round',
              effect: 'Improve or worsen NPC attitude', category: 'Social',
              handler: SWSE.PersuasionUses?.changeAttitude },
            { skillKey: 'persuasion', name: 'Intimidate', dc: 'opposed', time: 'standard',
              effect: 'Force target to become friendly or flee', category: 'Social',
              handler: SWSE.PersuasionUses?.intimidate },
            { skillKey: 'persuasion', name: 'Haggle', dc: 'varies', time: '10 min',
              effect: 'Negotiate better prices', category: 'Social',
              handler: SWSE.PersuasionUses?.haggle },

            // ==== PILOT ====
            { skillKey: 'pilot', name: 'Increase Vehicle Speed', dc: '20', time: 'swift',
              effect: 'Increase speed by +1 square, +1 per 5 over DC', category: 'Vehicle',
              handler: SWSE.PilotUses?.increaseVehicleSpeed },
            { skillKey: 'pilot', name: 'Fly Casual', dc: 'opposed', time: 'swift',
              effect: 'Appear routine to avoid suspicion', category: 'Vehicle',
              handler: SWSE.PilotUses?.flyCasual },

            // ==== RIDE ====
            { skillKey: 'ride', name: 'Guide with Knees', dc: '10', time: 'free',
              effect: 'Control mount hands-free', category: 'Mounted',
              handler: SWSE.RideUses?.guideWithKnees },
            { skillKey: 'ride', name: 'Soft Fall', dc: '15', time: 'reaction',
              effect: 'Reduce fall damage when dismounting', category: 'Mounted',
              handler: SWSE.RideUses?.softFall },

            // ==== USE THE FORCE ====
            { skillKey: 'useTheForce', name: 'Force Trance', dc: '15', time: 'swift',
              effect: 'Enter meditative state for bonuses', category: 'Force',
              handler: SWSE.UseTheForceUses?.forceTrance, requiresForce: true },
            { skillKey: 'useTheForce', name: 'Move Light Object', dc: '15', time: 'standard',
              effect: 'Telekinetically move object ≤10kg', category: 'Force',
              handler: SWSE.UseTheForceUses?.moveLightObject, requiresForce: true },
            { skillKey: 'useTheForce', name: 'Search Your Feelings', dc: '15', time: 'swift',
              effect: 'Gain insight into current situation', category: 'Force',
              handler: SWSE.UseTheForceUses?.searchYourFeelings, requiresForce: true },
            { skillKey: 'useTheForce', name: 'Sense Force', dc: '15', time: 'standard',
              effect: 'Detect Force-sensitive beings nearby', category: 'Force',
              handler: SWSE.UseTheForceUses?.senseForce, requiresForce: true },
            { skillKey: 'useTheForce', name: 'Sense Surroundings', dc: '15', time: 'swift',
              effect: 'Ignore cover/concealment for Perception', category: 'Force',
              handler: SWSE.UseTheForceUses?.senseSurroundings, requiresForce: true },
            { skillKey: 'useTheForce', name: 'Telepathy', dc: 'varies', time: 'standard',
              effect: 'Send/receive thoughts', category: 'Force',
              handler: SWSE.UseTheForceUses?.telepathy, requiresForce: true }
        ];

        for (const use of programmaticUses) {
            if (!use.handler) continue; // Skip if handler not available

            // Skip Force-requiring uses if actor doesn't have Force Sensitivity
            if (use.requiresForce && !SkillSystem._canUseTheForce(actor)) {
                continue;
            }

            const key = use.skillKey;
            if (!actionMap[key]) {
                actionMap[key] = SkillSystem._emptySkillGroup(key, {
                    label: SkillSystem._labelFromKey(key)
                });
            }

            const entry = {
                name: use.name,
                dc: use.dc,
                time: use.time,
                effect: use.effect,
                category: use.category || 'Programmatic',
                isProgrammatic: true,
                handler: use.handler
            };

            actionMap[key].extraUses.push(entry);
        }
    }

    /* ======================================================================
       CHECK FORCE SENSITIVITY
       ====================================================================== */
    static _canUseTheForce(actor) {
        if (!actor) return false;

        // Droids can never use the Force
        if (actor.type === 'droid' || actor.system?.isDroid) {
            return false;
        }

        // Check for Force Sensitivity feat
        const hasForceSensitivityFeat = actor.items.some(i =>
            i.type === 'feat' && (
                i.name.toLowerCase().includes('force sensitivity') ||
                i.name.toLowerCase().includes('force sensitive')
            )
        );

        if (hasForceSensitivityFeat) {
            return true;
        }

        // Check for Force-sensitive class
        const hasForceSensitiveClass = actor.items.some(i =>
            i.type === 'class' && i.system?.forceSensitive === true
        );

        if (hasForceSensitiveClass) {
            return true;
        }

        // Check if Use the Force skill is trained (implies Force Sensitivity)
        const utfSkill = actor.system?.skills?.useTheForce;
        if (utfSkill?.trained) {
            return true;
        }

        return false;
    }

    /* ======================================================================
       SKILL DETECTION ENGINE
       - Keyword-based auto detection
       - Manual override table (Option C)
       - Supports freeform Knowledge skills
       ====================================================================== */
    static _detectSkill(use) {
        const text = (use.application + " " + use.description).toLowerCase();

        // Manual override table
        const MANUAL = {
            "feint": "deception",
            "group feint": "deception",
            "cheat": "deception",

            "snipe": "stealth",
            "sneak": "stealth",
            "create a diversion": "stealth",
            "conceal": "stealth",

            "analysis": "knowledge_analysis",
            "alternate story": "knowledge_story",

            "astrogate": "use_computer",
            "access information": "use_computer",

            "jury-rig": "mechanics",
            "modify droid": "mechanics",
            "disable device": "mechanics",
            "repair": "mechanics"
        };

        for (const [kw, result] of Object.entries(MANUAL)) {
            if (text.includes(kw)) return result;
        }

        // Keyword matching
        const KW = [
            ["stealth", "stealth"],
            ["hide", "stealth"],

            ["perception", "perception"],
            ["spot", "perception"],
            ["listen", "perception"],

            ["jump", "acrobatics"],
            ["climb", "athletics"],
            ["swim", "athletics"],

            ["pilot", "pilot"],
            ["dogfight", "pilot"],
            ["drive", "pilot"],

            ["use computer", "use_computer"],
            ["search", "perception"],

            ["treat", "treat_injury"],
            ["heal", "treat_injury"],
            ["first aid", "treat_injury"],

            ["droid", "mechanics"],
            ["tech", "mechanics"],

            ["persuasion", "persuasion"],
            ["haggle", "persuasion"],
            ["intimidate", "persuasion"],

            ["survival", "survival"],
            ["track", "survival"],

            ["knowledge", "knowledge"],
            ["use the force", "use_the_force"]
        ];

        for (const [kw, skill] of KW) {
            if (text.includes(kw)) return skill;
        }

        // Fallback
        return "general";
    }

    /* ======================================================================
       CATEGORY DETECTION
       - Used for collapsible category cards
       ====================================================================== */
    static _detectCategory(use) {
        const text = (use.application + " " + use.description).toLowerCase();

        if (text.includes("droid")) return "Droid Operations";
        if (text.includes("vehicle") || text.includes("pilot")) return "Vehicle / Starship";
        if (text.includes("repair") || text.includes("jury") || text.includes("disable"))
            return "Tech / Repair";
        if (text.includes("survival") || text.includes("track") || text.includes("navigate"))
            return "Environmental";
        if (text.includes("feint") || text.includes("persuasion") || text.includes("social"))
            return "Social";
        if (text.includes("use the force") || text.includes("utf") || text.includes("force"))
            return "Force-Assisted";

        return "General";
    }

    /* ======================================================================
       LABEL NORMALIZER
       - Converts "knowledge_tactics" � "Knowledge (Tactics)"
       ====================================================================== */
    static _labelFromKey(key) {
        if (key.startsWith("knowledge")) {
            const parts = key.split("_").slice(1);
            if (parts.length) {
                const spec = parts.join(" ").replace(/\b\w/g, c => c.toUpperCase());
                return `Knowledge (${spec})`;
            }
            return "Knowledge";
        }

        return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    }

    /* ======================================================================
       BREAKDOWN BUILDER (for roll cards + tooltips)
       ====================================================================== */
    static buildBreakdown(actor, skillKey) {
        const s = actor.system.skills?.[skillKey];
        if (!s) return null;

        const abilityMod = actor.system.attributes?.[s.selectedAbility]?.mod ?? 0;
        const trained    = s.trained ? 5 : 0;
        const focus      = s.focused ? 5 : 0;
        const misc       = s.miscMod ?? 0;
        const half       = actor.system.halfLevel ?? 0;

        const total = abilityMod + trained + focus + misc + half;

        return { abilityMod, trained, focus, misc, half, total };
    }

    /* ======================================================================
       GET SKILL TOTAL
       ====================================================================== */
    static getSkillTotal(actor, skillKey) {
        const b = SkillSystem.buildBreakdown(actor, skillKey);
        return b?.total ?? 0;
    }

    /* ======================================================================
       ROLL BASIC SKILL
       ====================================================================== */
    static async rollSkill(actor, skillKey) {
        const breakdown = SkillSystem.buildBreakdown(actor, skillKey);

        return game.swse.RollEngine.skillCheck(actor, skillKey, {
            dc: null,
            breakdown,
            abilityMod: breakdown.abilityMod
        });
    }

    /* ======================================================================
       ROLL SKILL ACTION
       ====================================================================== */
    static async rollSkillAction(actor, skillKey, action) {
        const md = SkillSystem.buildActionMetadata(action);
        const breakdown = SkillSystem.buildBreakdown(actor, skillKey);

        return game.swse.RollEngine.skillCheck(actor, skillKey, {
            dc: md.dc,
            breakdown,
            abilityMod: breakdown.abilityMod,
            action: md
        });
    }

    /* ======================================================================
       ROLL OPPOSED CHECK (Deception vs Perception, etc.)
       ====================================================================== */
    static async rollOpposed(actor, skillKey, target, targetSkill) {
        return game.swse.RollEngine.rollOpposed(actor, skillKey, target, targetSkill);
    }

    /* ======================================================================
       ACTION METADATA (for previews + roll cards)
       ====================================================================== */
    static buildActionMetadata(action) {
        if (!action) return {};

        return {
            name: action.name,
            dc: action.dc || null,
            time: action.time || null,
            effect: action.effect || null,
            summary:
                (action.dc ? `DC ${action.dc}. ` : "") +
                (action.time ? `Time: ${action.time}. ` : "") +
                (action.effect ? `${action.effect}` : "")
        };
    }

    /* ======================================================================
       FAVORITES (star icons per action)
       ====================================================================== */
    static toggleFavorite(skillKey, actionName) {
        const store = game.settings.get("foundryvtt-swse", "skillFavorites") || {};
        store[skillKey] = store[skillKey] || [];

        const idx = store[skillKey].indexOf(actionName);
        if (idx >= 0) store[skillKey].splice(idx, 1);
        else store[skillKey].push(actionName);

        game.settings.set("foundryvtt-swse", "skillFavorites", store);
    }

    /* ======================================================================
       HOVER PREVIEW METADATA
       ====================================================================== */
    static buildHoverPreview(action) {
        if (!action) return "";

        return `
            <strong>${action.name}</strong><br>
            ${action.dc ? `DC: ${action.dc}<br>` : ""}
            ${action.time ? `Time: ${action.time}<br>` : ""}
            ${action.effect || ""}
        `;
    }

    /* ======================================================================
       GM QUICK TOOLS
       ====================================================================== */
    static gmToolsFor(skillKey) {
        return [
            { name: "Roll Public", type: "public" },
            { name: "Roll Secret", type: "secret" },
            { name: "Opposed Check", type: "opposed" }
        ];
    }

    /* ======================================================================
       FINAL PUBLIC API  SKILL SUMMARY
       ====================================================================== */
    static summarizeSkill(actor, skillKey) {
        const b = SkillSystem.buildBreakdown(actor, skillKey);
        if (!b) return "";

        return `
            Ability Mod: ${b.abilityMod}<br>
            Half Level: ${b.half}<br>
            Trained: ${b.trained}<br>
            Focus: ${b.focus}<br>
            Misc: ${b.misc}<br>
            <strong>Total: ${b.total}</strong>
        `;
    }

    /* ======================================================================
       FINALIZE SKILL GROUPS (Favorites, Categories, GM Tools)
       ====================================================================== */
    static _finalizeGroups(actor, actionMap) {

        for (const [key, data] of Object.entries(actionMap)) {

            // Organize extra skill uses into categories
            for (const extra of data.extraUses) {
                if (!data.categories[extra.category]) {
                    data.categories[extra.category] = [];
                }
                data.categories[extra.category].push(extra);
            }

            // Favorites: mark actions with a star
            const favStore = game.settings.get("foundryvtt-swse", "skillFavorites") || {};
            data.favorites = favStore[key] || [];

            // Determine if any actions exist
            data.hasActions = (
                data.combatActions.length > 0 ||
                data.extraUses.length > 0
            );
        }
    }
}
