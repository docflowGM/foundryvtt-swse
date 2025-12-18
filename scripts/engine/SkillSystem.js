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

            // Category ’ array of actions
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
       - Converts "knowledge_tactics" ’ "Knowledge (Tactics)"
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

        const abilityMod = actor.system.abilities?.[s.selectedAbility]?.mod ?? 0;
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
