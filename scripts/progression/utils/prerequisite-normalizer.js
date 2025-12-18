/**
 * Converts ANY prerequisite string into a structured prerequisite object.
 * This object is what PrerequisiteValidator will evaluate.
 */

const ABILITY_MAP = {
    "str": "str", "strength": "str",
    "dex": "dex", "dexterity": "dex",
    "con": "con", "constitution": "con",
    "int": "int", "intelligence": "int",
    "wis": "wis", "wisdom": "wis",
    "cha": "cha", "charisma": "cha"
};

export function normalizePrerequisiteString(raw) {
    if (!raw || raw === "null") return { raw: "", parsed: [] };

    const clean = raw
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const parts = clean.split(/[,;]+/).map(p => p.trim());

    const parsed = [];

    for (let p of parts) {
        const lower = p.toLowerCase();

        // ----------------------------------------------------------
        // 1. Ability prerequisite: STR 13, Dex 15, etc.
        // ----------------------------------------------------------
        const abilityMatch = lower.match(/(str|dex|con|int|wis|cha)[^\d]*([\d]+)/);
        if (abilityMatch) {
            parsed.push({
                type: "ability",
                ability: ABILITY_MAP[abilityMatch[1]],
                minimum: Number(abilityMatch[2])
            });
            continue;
        }

        // ----------------------------------------------------------
        // 2. BAB requirement: BAB +6
        // ----------------------------------------------------------
        const babMatch = lower.match(/bab\s*\+?(\d+)/);
        if (babMatch) {
            parsed.push({
                type: "bab",
                minimum: Number(babMatch[1])
            });
            continue;
        }

        // ----------------------------------------------------------
        // 3. Skill prerequisite: "Trained in Use the Force"
        // ----------------------------------------------------------
        const skillMatch = lower.match(/trained in ([a-z\s]+)/);
        if (skillMatch) {
            parsed.push({
                type: "skill_trained",
                skill: normalizeSkillName(skillMatch[1])
            });
            continue;
        }

        // Skill ranks: "Perception 5 ranks"
        const rankMatch = lower.match(/([a-z\s]+)\s+(\d+)\s+ranks/);
        if (rankMatch) {
            parsed.push({
                type: "skill_ranks",
                skill: normalizeSkillName(rankMatch[1]),
                ranks: Number(rankMatch[2])
            });
            continue;
        }

        // ----------------------------------------------------------
        // 4. Feat prerequisite
        // ----------------------------------------------------------
        if (lower.includes("weapon focus") ||
            lower.includes("mobility") ||
            lower.includes("two-weapon fighting") ||
            lower.includes("point blank shot") ||
            lower.includes("skill focus") ||
            lower.includes("dodge") ||
            lower.includes("power attack")
        ) {
            parsed.push({
                type: "feat",
                name: normalizeFeatName(p)
            });
            continue;
        }

        // ----------------------------------------------------------
        // 5. Talent prerequisite
        // ----------------------------------------------------------
        if (lower.includes("talent")) {
            parsed.push({
                type: "talent",
                name: normalizeTalentName(p)
            });
            continue;
        }

        // ----------------------------------------------------------
        // 6. Force Technique / Secret prerequisites
        // ----------------------------------------------------------
        if (lower.includes("force secret")) {
            parsed.push({ type: "force_secret" });
            continue;
        }
        if (lower.includes("force technique")) {
            parsed.push({ type: "force_technique" });
            continue;
        }

        // ----------------------------------------------------------
        // 7. Force-sensitive prerequisite
        // ----------------------------------------------------------
        if (lower.includes("force sensitive")) {
            parsed.push({ type: "force_sensitive" });
            continue;
        }

        // ----------------------------------------------------------
        // 8. Class Level Requirement: "Jedi level 7"
        // ----------------------------------------------------------
        const classLevelMatch = lower.match(/([a-z\s]+)\s+level\s+(\d+)/);
        if (classLevelMatch) {
            parsed.push({
                type: "class_level",
                className: capitalizeWords(classLevelMatch[1].trim()),
                minimum: Number(classLevelMatch[2])
            });
            continue;
        }

        // ----------------------------------------------------------
        // 9. Alignment requirements (rare but exist)
        // ----------------------------------------------------------
        if (lower.includes("dark side") || lower.includes("light side")) {
            parsed.push({
                type: "alignment",
                alignment: capitalizeWords(p)
            });
            continue;
        }

        // ----------------------------------------------------------
        // 10. Default fallback → treat as feat name
        // ----------------------------------------------------------
        parsed.push({
            type: "feat",
            name: normalizeFeatName(p)
        });
    }

    return {
        raw,
        parsed
    };
}


// --------------------------------------------------------------
// HELPERS
// --------------------------------------------------------------

function normalizeSkillName(name) {
    return name.trim().replace(/\s+/g, "_").toLowerCase();
}

function normalizeFeatName(name) {
    return capitalizeWords(name.replace(/\s+/g, " ").trim());
}

function normalizeTalentName(name) {
    return capitalizeWords(name.replace(/talent\s*/i, "").trim());
}

function capitalizeWords(str) {
    return str.replace(/\b\w/g, c => c.toUpperCase());
}
