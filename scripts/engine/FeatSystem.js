
/* =======================================================================
   SWSE Feat System — Dynamic Feat Action Detection & UI Integration
   ======================================================================= */

export class FeatSystem {

    /* -------------------------------------------------------------
       Build featActions object for sheet UI
       ------------------------------------------------------------- */
    static buildFeatActions(actor) {
        const feats = actor.items.filter(i => i.type === "feat");
        const list = [];

        for (const f of feats) {
            const data = f.system ?? {};

            const entry = {
                _id: f.id,
                name: f.name,
                tags: data.tags || [],
                benefit: data.benefit || "",
                type: FeatSystem._detectType(data),
                typeLabel: FeatSystem._typeLabel(data),
                icon: FeatSystem._typeIcon(data),
                uses: data.uses,
                actions: FeatSystem._detectActions(data)
            };

            list.push(entry);
        }

        return {
            all: list
        };
    }

    /* -------------------------------------------------------------
       Detect overall feat type for UI grouping
       ------------------------------------------------------------- */
    static _detectType(data) {
        if (data.featType === "force") return "force";
        if (data.benefit?.match(/attack|melee|ranged|hit/i)) return "combat";
        if (data.benefit?.match(/stealth|perception|check|reroll/i)) return "skill";
        return "passive";
    }

    static _typeLabel(data) {
        return data.featType ? data.featType.toUpperCase() : "FEAT";
    }

    static _typeIcon(data) {
        if (data.featType === "force") return "fas fa-jedi";
        if (data.benefit?.match(/attack|melee|ranged/i)) return "fas fa-crosshairs";
        if (data.benefit?.match(/check|skill/i)) return "fas fa-dice-d20";
        return "fas fa-star";
    }

    /* -------------------------------------------------------------
       ACTION DETECTION ENGINE (Tags + Keywords)
       ------------------------------------------------------------- */
    static _detectActions(data) {
        const actions = {};

        const tags = data.tags || [];
        const text = (data.benefit || "").toLowerCase();

        // Skill Action
        const skillList = ["stealth","perception","pilot","use the force","utini"];
        for (const s of skillList) {
            if (tags.includes(s) || text.includes(s)) {
                actions.skill = { skillName: s };
                break;
            }
        }

        // Combat Attack
        if (tags.includes("melee") || tags.includes("ranged") ||
            text.includes("attack") || text.includes("hit")) {
            actions.attack = true;
        }

        // Condition Track
        if (tags.includes("condition track") || text.includes("condition track")) {
            actions.conditionTrack = true;
        }

        // Force Effects
        if (data.featType === "force" ||
            text.includes("force point") ||
            tags.includes("force")) {
            actions.force = true;
        }

        return actions;
    }
}
