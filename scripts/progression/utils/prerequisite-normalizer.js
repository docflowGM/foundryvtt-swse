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

// Common species names (case-insensitive)
const SPECIES_NAMES = [
    "Abyssin", "Adnerem", "Aqualish", "Arcona", "Balosar", "Barabel", "Bith",
    "Bothan", "Caamasi", "Cerean", "Chagrian", "Chalactan", "Chiss", "Clawdite",
    "Coway", "Defel", "Devaronian", "Drall", "Dressellian", "Duinuogwuin", "Duros",
    "Echani", "Elomin", "Ewok", "Falleen", "Farghul", "Feeorin", "Ferroan",
    "Gamorrean", "Gand", "Givin", "Gossam", "Gran", "Gung an", "Hapan", "Human",
    "Iktotchi", "Ishi Tib", "Ithorian", "Jawa", "Kaleesh", "Kel Dor", "Khil",
    "Killik", "Klatooinian", "Kubaz", "Kushiban", "Lannik", "Miraluka", "Mon Calamari",
    "Mustafarian", "Muun", "Nautolan", "Neimoidian", "Nikto", "Noghri", "Nosaurian",
    "Omwati", "Pau'an", "Quarren", "Rodian", "Sakiyan", "Selkath", "Selonian",
    "Shistavanen", "Skakoan", "Squib", "Ssi-ruu", "Sullustan", "T'surr", "Talz",
    "Togorian", "Togruta", "Toydarian", "Trandoshan", "Tusken Raider", "Twi'lek",
    "Ugnaught", "Umbaran", "Verpine", "Vratix", "Weequay", "Wookiee", "Wroonian",
    "Yevetha", "Yuzzum", "Zabrak"
];

// Weapon groups for proficiency/focus/specialization
const WEAPON_GROUPS = [
    "advanced melee weapons", "exotic weapons", "heavy weapons", "lightsabers",
    "pistols", "rifles", "simple weapons"
];

// Armor types
const ARMOR_TYPES = ["light", "medium", "heavy"];

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
        // 3. Skill ranks: "Ride 1 rank" → convert to "trained" (SWSE has no ranks)
        // ----------------------------------------------------------
        const rankMatch = lower.match(/([a-z\s]+)\s+(\d+)\s+ranks?/);
        if (rankMatch) {
            // In SWSE, skills are trained/untrained, so treat rank requirement as trained
            parsed.push({
                type: "skill_trained",
                skill: normalizeSkillName(rankMatch[1])
            });
            continue;
        }

        // ----------------------------------------------------------
        // 4. Skill prerequisite: "Trained in Use the Force"
        // ----------------------------------------------------------
        // Check for OR conditions first
        if (lower.includes("trained in") && lower.includes(" or ")) {
            const skillOrMatch = p.match(/Trained in (.+)/i);
            if (skillOrMatch) {
                const skillsRaw = skillOrMatch[1];
                const skills = skillsRaw.split(" or ").map(s => s.trim());
                parsed.push({
                    type: "or",
                    conditions: skills.map(skill => ({
                        type: "skill_trained",
                        skill: normalizeSkillName(skill)
                    }))
                });
                continue;
            }
        }

        // Regular single skill trained
        const skillMatch = lower.match(/trained in ([a-z\s]+)/);
        if (skillMatch) {
            parsed.push({
                type: "skill_trained",
                skill: normalizeSkillName(skillMatch[1])
            });
            continue;
        }

        // ----------------------------------------------------------
        // 4. Feat prerequisite (EXPANDED to handle all feats)
        // ----------------------------------------------------------
        // Check for common feat patterns
        const featPatterns = [
            "feat", "weapon focus", "weapon specialization", "dual weapon",
            "quick draw", "double attack", "weapon finesse", "force training",
            "tech specialist", "multiattack", "martial arts", "weapon proficiency",
            "coordinated attack", "mobility", "two-weapon fighting", "point blank shot",
            "skill focus", "dodge", "power attack"
        ];

        const isFeat = featPatterns.some(pattern => lower.includes(pattern));
        if (isFeat && !lower.includes("trained in")) {
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
            // Skip malformed prerequisite descriptions that start with "Prerequisites:"
            if (lower.startsWith("prerequisites:")) {
                continue;
            }
            parsed.push({
                type: "talent",
                name: normalizeTalentName(p)
            });
            continue;
        }

        // ----------------------------------------------------------
        // 6. Force Power prerequisite (e.g., "Vital Transfer", "Mind Trick")
        // ----------------------------------------------------------
        // Check for common force power names
        const forcePowerPatterns = [
            "vital transfer", "mind trick", "farseeing", "force perception",
            "illusion", "battle meditation", "healing boost", "soothe",
            "influence savant", "telekinetic savant"
        ];

        const isForcePower = forcePowerPatterns.some(pattern => lower.includes(pattern));
        if (isForcePower) {
            parsed.push({
                type: "force_power",
                name: p.trim()
            });
            continue;
        }

        // ----------------------------------------------------------
        // 7. Force Technique / Secret prerequisites
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
        // 8. "Any One Force Technique" pattern
        // ----------------------------------------------------------
        if (lower.includes("any one force technique")) {
            parsed.push({ type: "any_force_technique" });
            continue;
        }

        // ----------------------------------------------------------
        // 9. Force-sensitive prerequisite
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
        // 10. Non-Droid requirement
        // ----------------------------------------------------------
        if (lower === "non-droid") {
            parsed.push({ type: "non_droid" });
            continue;
        }

        // ----------------------------------------------------------
        // 11. Species Trait requirement
        // ----------------------------------------------------------
        if (lower.includes("species trait")) {
            const traitMatch = p.match(/(.+?)\s+Species Trait/i);
            if (traitMatch) {
                parsed.push({
                    type: "species_trait",
                    trait: traitMatch[1].trim()
                });
            }
            continue;
        }

        // ----------------------------------------------------------
        // 12. Weapon Proficiency
        // ----------------------------------------------------------
        if (lower.includes("weapon proficiency") || lower.includes("proficient with")) {
            const groupMatch = p.match(/\(([^)]+)\)/);
            const weaponGroup = groupMatch ? groupMatch[1] : "selected weapon group";
            parsed.push({
                type: "weapon_proficiency",
                group: weaponGroup
            });
            continue;
        }

        // ----------------------------------------------------------
        // 13. Weapon Focus
        // ----------------------------------------------------------
        if (lower.includes("weapon focus")) {
            // Try to extract from parentheses first
            let groupMatch = p.match(/\(([^)]+)\)/);
            let weaponGroup;

            if (groupMatch) {
                weaponGroup = groupMatch[1];
            } else {
                // Try "with X" pattern
                const withMatch = p.match(/with (.+)/i);
                weaponGroup = withMatch ? withMatch[1].trim() : "selected weapon group";
            }

            parsed.push({
                type: "weapon_focus",
                group: weaponGroup
            });
            continue;
        }

        // ----------------------------------------------------------
        // 14. Weapon Specialization
        // ----------------------------------------------------------
        if (lower.includes("weapon specialization")) {
            const groupMatch = p.match(/\(([^)]+)\)/);
            const weaponGroup = groupMatch ? groupMatch[1] : "selected weapon group";
            parsed.push({
                type: "weapon_specialization",
                group: weaponGroup
            });
            continue;
        }

        // ----------------------------------------------------------
        // 15. Armor Proficiency
        // ----------------------------------------------------------
        if (lower.includes("armor proficiency")) {
            const typeMatch = p.match(/\(([^)]+)\)/);
            const armorType = typeMatch ? typeMatch[1].toLowerCase() : null;

            // Handle "light or medium"
            if (armorType && armorType.includes(" or ")) {
                const types = armorType.split(" or ").map(t => t.trim());
                parsed.push({
                    type: "or",
                    conditions: types.map(t => ({
                        type: "armor_proficiency",
                        armorType: t
                    }))
                });
            } else if (armorType) {
                parsed.push({
                    type: "armor_proficiency",
                    armorType: armorType
                });
            }
            continue;
        }

        // ----------------------------------------------------------
        // 16. OR conditions for feats (e.g., "Block or Deflect")
        // ----------------------------------------------------------
        if (lower.includes(" or ")) {
            // Handle feat OR conditions (e.g., "Block or Deflect")
            // Only if it looks like feat names (doesn't contain armor/weapon/skill keywords)
            if (!lower.includes("armor") && !lower.includes("weapon") && !lower.includes("trained in")) {
                const parts = p.split(" or ").map(s => s.trim());
                if (parts.length === 2 && parts.every(part => part.length > 0)) {
                    parsed.push({
                        type: "or",
                        conditions: parts.map(name => ({
                            type: "feat",
                            name: normalizeFeatName(name)
                        }))
                    });
                    continue;
                }
            }
        }

        // ----------------------------------------------------------
        // 17. "any other X talent" pattern
        // ----------------------------------------------------------
        const anyOtherMatch = lower.match(/any\s+other\s+([a-z\s]+)\s+talent/i);
        if (anyOtherMatch) {
            parsed.push({
                type: "any_talent_from_tree",
                tree: capitalizeWords(anyOtherMatch[1].trim())
            });
            continue;
        }

        // ----------------------------------------------------------
        // 18. Species requirement (check against known species)
        // ----------------------------------------------------------
        const speciesMatch = SPECIES_NAMES.find(species =>
            lower === species.toLowerCase() ||
            p.trim() === species
        );
        if (speciesMatch) {
            parsed.push({
                type: "species",
                name: speciesMatch
            });
            continue;
        }

        // ----------------------------------------------------------
        // 19. Default fallback → treat as feat name
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
