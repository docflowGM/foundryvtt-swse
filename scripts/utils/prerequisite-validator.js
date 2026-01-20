/**
 * SWSE Unified Prerequisite Validator
 * Evaluates all normalized prerequisite objects created by prerequisite-normalizer.js
 * Falls back to parsing strings if not yet normalized
 */

export class PrerequisiteValidator {

    /**
     * Primary entry point for talents
     */
    static checkTalentPrerequisites(talent, actor, pending = {}) {
        // Support both normalized and legacy formats
        const prereqData = talent.system?.prerequisites;

        // If already normalized to { raw, parsed } format, use parsed
        if (prereqData?.parsed) {
            return this._checkParsedPrerequisites(
                prereqData.parsed,
                actor,
                pending,
                talent.name
            );
        }

        // Fallback: parse legacy string/array format
        return this._checkLegacyTalentPrerequisites(talent, actor, pending);
    }

    /**
     * Primary entry point for feats
     */
    static checkFeatPrerequisites(feat, actor, pending = {}) {
        // Support both normalized and legacy formats
        const prereqData = feat.system?.prerequisite;

        // If already normalized to { raw, parsed } format, use parsed
        if (prereqData?.parsed) {
            return this._checkParsedPrerequisites(
                prereqData.parsed,
                actor,
                pending,
                feat.name
            );
        }

        // Fallback: parse legacy string format
        return this._checkLegacyFeatPrerequisites(feat, actor, pending);
    }

    /**
     * Primary entry point for classes (prestige or base)
     */
    static checkClassPrerequisites(classDoc, actor, pending = {}) {
        // Support both normalized and legacy formats
        const prereqData = classDoc.system?.prerequisites;

        // If already normalized to { raw, parsed } format, use parsed
        if (prereqData?.parsed) {
            return this._checkParsedPrerequisites(
                prereqData.parsed,
                actor,
                pending,
                classDoc.name
            );
        }

        // Fallback: parse legacy string format
        return this._checkLegacyClassPrerequisites(classDoc, actor, pending);
    }

    /**
     * Core validation function for ANY parsed prerequisite list
     */
    static _checkParsedPrerequisites(parsed, actor, pending, nameForError) {
        if (!parsed || parsed.length === 0) {
            return { valid: true, reasons: [] };
        }

        const reasons = [];

        for (const prereq of parsed) {
            switch (prereq.type) {

                // --------------------------------------------------------
                // ABILITY SCORE REQUIREMENT
                // --------------------------------------------------------
                case "ability": {
                    const ability = actor.system.attributes[prereq.ability]?.total ?? 10;
                    if (ability < prereq.minimum) {
                        reasons.push(
                            `${nameForError} requires ${prereq.ability.toUpperCase()} ${prereq.minimum} (you have ${ability})`
                        );
                    }
                    break;
                }

                // --------------------------------------------------------
                // BAB REQUIREMENT
                // --------------------------------------------------------
                case "bab": {
                    const bab = actor.system.bab?.total || actor.system.bab || 0;
                    if (bab < prereq.minimum) {
                        reasons.push(
                            `${nameForError} requires BAB +${prereq.minimum} (you have +${bab})`
                        );
                    }
                    break;
                }

                // --------------------------------------------------------
                // SKILL TRAINING REQUIREMENT
                // --------------------------------------------------------
                case "skill_trained": {
                    const trained =
                        actor.system.skills?.[prereq.skill]?.trained ||
                        (pending.selectedSkills || []).some(s => s.key === prereq.skill);

                    if (!trained) {
                        reasons.push(
                            `${nameForError} requires training in ${prereq.skill}`
                        );
                    }
                    break;
                }

                // --------------------------------------------------------
                // SKILL RANK REQUIREMENT (ranked systems)
                // --------------------------------------------------------
                case "skill_ranks": {
                    const ranks =
                        actor.system.skills?.[prereq.skill]?.ranks ||
                        0;

                    if (ranks < prereq.ranks) {
                        reasons.push(
                            `${nameForError} requires ${prereq.ranks} ranks in ${prereq.skill} (you have ${ranks})`
                        );
                    }
                    break;
                }

                // --------------------------------------------------------
                // FEAT REQUIREMENT
                // --------------------------------------------------------
                case "feat": {
                    const hasFeat =
                        actor.items.some(i => i.type === "feat" && i.name === prereq.name) ||
                        (pending.selectedFeats || []).some(f => f.name === prereq.name);

                    if (!hasFeat) {
                        reasons.push(`${nameForError} requires the feat ${prereq.name}`);
                    }
                    break;
                }

                // --------------------------------------------------------
                // TALENT REQUIREMENT
                // --------------------------------------------------------
                case "talent": {
                    const hasTalent =
                        actor.items.some(i => i.type === "talent" && i.name === prereq.name) ||
                        (pending.selectedTalents || []).some(t => t.name === prereq.name);

                    if (!hasTalent) {
                        reasons.push(`${nameForError} requires the talent ${prereq.name}`);
                    }
                    break;
                }

                // --------------------------------------------------------
                // FORCE SENSITIVE REQUIREMENT
                // --------------------------------------------------------
                case "force_sensitive": {
                    const hasFS =
                        actor.items.some(i => i.type === "feat" && i.name === "Force Sensitivity") ||
                        (pending.selectedFeats || []).some(f => f.name === "Force Sensitivity");

                    if (!hasFS) {
                        reasons.push(`${nameForError} requires Force Sensitivity`);
                    }
                    break;
                }

                // --------------------------------------------------------
                // FORCE TECHNIQUE COUNT
                // --------------------------------------------------------
                case "force_technique": {
                    const known =
                        actor.items.filter(i => i.type === "feat" && i.system?.tags?.includes("force_technique")).length;

                    if (known < 1) {
                        reasons.push(`${nameForError} requires knowing a Force Technique`);
                    }
                    break;
                }

                // --------------------------------------------------------
                // FORCE SECRET COUNT
                // --------------------------------------------------------
                case "force_secret": {
                    const known =
                        actor.items.filter(i => i.type === "feat" && i.system?.tags?.includes("force_secret")).length;

                    if (known < 1) {
                        reasons.push(`${nameForError} requires knowing a Force Secret`);
                    }
                    break;
                }

                // --------------------------------------------------------
                // CLASS LEVEL REQUIREMENT
                // --------------------------------------------------------
                case "class_level": {
                    const classItem = actor.items.find(
                        i => i.type === "class" && i.name === prereq.className
                    );
                    const level = classItem?.system?.level || 0;

                    if (level < prereq.minimum) {
                        reasons.push(
                            `${nameForError} requires ${prereq.className} level ${prereq.minimum} (you have ${level})`
                        );
                    }
                    break;
                }

                // --------------------------------------------------------
                // ALIGNMENT REQUIREMENT (light/dark side)
                // --------------------------------------------------------
                case "alignment": {
                    const lightSide = actor.system.force?.lightSideScore || 0;
                    const darkSide = actor.system.force?.darkSideScore || 0;

                    if (prereq.alignment.includes("Dark") && lightSide > darkSide) {
                        reasons.push(`${nameForError} requires Dark Side alignment`);
                    }
                    if (prereq.alignment.includes("Light") && darkSide > lightSide) {
                        reasons.push(`${nameForError} requires Light Side alignment`);
                    }
                    break;
                }

                // --------------------------------------------------------
                // DEFAULT CASE (should never occur if normalization works)
                // --------------------------------------------------------
                default:
                    console.warn("Unknown prerequisite type:", prereq);
                    break;
            }
        }

        return {
            valid: reasons.length === 0,
            reasons
        };
    }

    // ================================================================
    // LEGACY SUPPORT — Parse raw strings if not yet normalized
    // ================================================================

    /**
     * Legacy talent prerequisite checking
     */
    static _checkLegacyTalentPrerequisites(talent, actor, pendingData = {}) {
        let prereqData = talent.system?.prerequisites || talent.system?.prereqassets || "";

        // Handle both array and string formats
        let prereqTalentNames = [];
        if (Array.isArray(prereqData)) {
            // Array format from JSON data
            prereqTalentNames = prereqData.map(p => String(p).trim()).filter(p => p);
        } else if (typeof prereqData === 'string') {
            // String format - check if empty
            if (!prereqData || prereqData.trim() === "" || prereqData === "null") {
                return { valid: true, reasons: [] };
            }

            // Smart split: prefer semicolons and " or "/, then " and ", avoid splitting commas within talent names
            // First normalize by replacing " or " with semicolon
            let normalized = prereqData.replace(/\s+or\s+/gi, ';');

            // Split by semicolon first (unambiguous delimiter)
            if (normalized.includes(';')) {
                prereqTalentNames = normalized
                    .split(';')
                    .map(p => p.trim())
                    .filter(p => p);
            } else {
                // No semicolons - try " and " as delimiter (less ambiguous than comma)
                // Only split on " and " when surrounded by spaces to avoid matching "Command"
                prereqTalentNames = normalized
                    .split(/\s+and\s+/i)
                    .map(p => p.trim())
                    .filter(p => p && p.toLowerCase() !== 'and');

                // If we still have only one item and it contains a comma, warn but try splitting
                // This is the problematic case: "Talent A, Talent B" where comma is the delimiter
                if (prereqTalentNames.length === 1 && prereqTalentNames[0].includes(',')) {
                    // Check if comma is likely a delimiter (followed by capital letter or common words)
                    const commaPattern = /,\s+(?=[A-Z]|the\s|a\s)/;
                    if (commaPattern.test(prereqTalentNames[0])) {
                        // Looks like comma is a delimiter
                        prereqTalentNames = prereqTalentNames[0]
                            .split(',')
                            .map(p => p.trim())
                            .filter(p => p);
                    }
                    // Otherwise keep as single talent name (comma is part of the name)
                }
            }
        } else {
            // No prerequisites
            return { valid: true, reasons: [] };
        }

        // If no prerequisites after parsing, talent is available
        if (prereqTalentNames.length === 0) {
            return { valid: true, reasons: [] };
        }

        const reasons = [];

        // Get character's existing talents
        const characterTalents = actor.items.filter(i => i.type === 'talent').map(t => t.name);

        // Also check pending talents from character creation or level-up
        const pendingTalents = pendingData.selectedTalents || [];
        const allTalents = [...characterTalents, ...pendingTalents.map(t => t.name || t)];

        // Check each prerequisite talent
        for (const prereqName of prereqTalentNames) {
            if (!allTalents.includes(prereqName)) {
                reasons.push(`Requires talent: ${prereqName}`);
            }
        }

        return {
            valid: reasons.length === 0,
            reasons: reasons
        };
    }

    /**
     * Legacy feat prerequisite checking
     */
    static _checkLegacyFeatPrerequisites(feat, actor, pendingData = {}) {
        // Note: Feats use "prerequisite" (singular), not "prerequisites"
        const prereqString = feat.system?.prerequisite || "";

        // If no prerequisites, feat is available to everyone
        if (!prereqString || prereqString.trim() === "" || prereqString === "null") {
            return { valid: true, reasons: [] };
        }

        const reasons = [];
        const prereqs = this._parseLegacyPrerequisites(prereqString);

        // Check each type of prerequisite
        for (const prereq of prereqs) {
            const check = this._checkSingleLegacyPrerequisite(prereq, actor, pendingData);
            if (!check.valid) {
                reasons.push(check.reason);
            }
        }

        return {
            valid: reasons.length === 0,
            reasons: reasons
        };
    }

    /**
     * Legacy class prerequisite checking
     */
    static _checkLegacyClassPrerequisites(classDoc, actor, pendingData = {}) {
        const prereqString = classDoc.system?.prerequisites || "";

        // If no prerequisites, class is available
        if (!prereqString || prereqString.trim() === "" || prereqString === "null") {
            return { valid: true, reasons: [] };
        }

        const reasons = [];
        const prereqs = this._parseLegacyPrerequisites(prereqString);

        // Check each type of prerequisite
        for (const prereq of prereqs) {
            const check = this._checkSingleLegacyPrerequisite(prereq, actor, pendingData);
            if (!check.valid) {
                reasons.push(check.reason);
            }
        }

        return {
            valid: reasons.length === 0,
            reasons: reasons
        };
    }

    static _parseLegacyPrerequisites(prereqString) {
        const prereqs = [];

        // Check if string contains OR logic
        const hasOr = /\s+or\s+/i.test(prereqString);

        if (hasOr) {
            // Split by OR first to handle OR groups
            const orGroups = prereqString.split(/\s+or\s+/i).map(p => p.trim()).filter(p => p);

            // Each OR group might have multiple AND conditions
            const parsedGroups = orGroups.map(group => {
                const andParts = group.split(/[,;]|(?:\s+and\s+)/i).map(p => p.trim()).filter(p => p);
                return andParts.map(part => this._parseLegacyPrerequisitePart(part)).filter(p => p);
            });

            return [{
                type: 'or_group',
                groups: parsedGroups
            }];
        } else {
            // Standard AND logic (split by comma, semicolon, or "and")
            const parts = prereqString.split(/[,;]|(?:\s+and\s+)/i).map(p => p.trim()).filter(p => p);

            for (const part of parts) {
                const prereq = this._parseLegacyPrerequisitePart(part);
                if (prereq) {
                    prereqs.push(prereq);
                }
            }
        }

        return prereqs;
    }

    static _parseLegacyPrerequisitePart(part) {
        part = part.trim();

        // Ability score pattern: "Dex 13", "Strength 15+", "Con 13 or higher"
        const abilityPattern = /^(str|dex|con|int|wis|cha|strength|dexterity|constitution|intelligence|wisdom|charisma)\s+(\d+)(\+|or higher)?/i;
        const abilityMatch = part.match(abilityPattern);
        if (abilityMatch) {
            const abilityMap = {
                'str': 'str', 'strength': 'str',
                'dex': 'dex', 'dexterity': 'dex',
                'con': 'con', 'constitution': 'con',
                'int': 'int', 'intelligence': 'int',
                'wis': 'wis', 'wisdom': 'wis',
                'cha': 'cha', 'charisma': 'cha'
            };
            return {
                type: 'ability',
                ability: abilityMap[abilityMatch[1].toLowerCase()],
                value: parseInt(abilityMatch[2], 10)
            };
        }

        // BAB pattern: "BAB +1", "Base Attack Bonus +6", "+3 base attack bonus"
        const babPattern = /(?:bab|base attack bonus)\s*\+?\s*(\d+)|(\d+)\s*(?:bab|base attack bonus)/i;
        const babMatch = part.match(babPattern);
        if (babMatch) {
            return {
                type: 'bab',
                value: parseInt(babMatch[1] || babMatch[2], 10)
            };
        }

        // Character level pattern: "Character level 3rd", "3rd level", "Level 5"
        const levelPattern = /(?:character\s+)?level\s+(\d+)(?:st|nd|rd|th)?|(\d+)(?:st|nd|rd|th)?\s+level/i;
        const levelMatch = part.match(levelPattern);
        if (levelMatch) {
            return {
                type: 'level',
                value: parseInt(levelMatch[1] || levelMatch[2], 10)
            };
        }

        // Class level pattern: "Soldier 1", "Jedi 3", "Scout level 5"
        const classLevelPattern = /^([A-Za-z\s]+?)\s+(?:level\s+)?(\d+)$/i;
        const classLevelMatch = part.match(classLevelPattern);
        if (classLevelMatch) {
            const className = classLevelMatch[1].trim();
            // Check if it's a known class name (not a feat name)
            const knownClasses = ['Jedi', 'Noble', 'Scoundrel', 'Scout', 'Soldier', 'Beast', 'Force Adept',
                                 'Ace Pilot', 'Crime Lord', 'Elite Trooper', 'Force Disciple', 'Gunslinger',
                                 'Jedi Knight', 'Jedi Master', 'Officer', 'Sith Apprentice', 'Sith Lord'];
            if (knownClasses.some(c => c.toLowerCase() === className.toLowerCase())) {
                return {
                    type: 'class',
                    className: className,
                    level: parseInt(classLevelMatch[2], 10)
                };
            }
        }

        // Skill rank pattern: "Stealth 5 ranks", "Use the Force 10 ranks", "Mechanics 1 rank"
        const skillRankPattern = /^(.+?)\s+(\d+)\s+ranks?$/i;
        const skillRankMatch = part.match(skillRankPattern);
        if (skillRankMatch) {
            return {
                type: 'skill_rank',
                skillName: skillRankMatch[1].trim(),
                ranks: parseInt(skillRankMatch[2], 10)
            };
        }

        // Skill training pattern: "Trained in Use the Force", "Trained in Mechanics"
        const skillPattern = /trained\s+in\s+(.+)/i;
        const skillMatch = part.match(skillPattern);
        if (skillMatch) {
            return {
                type: 'skill',
                skillName: skillMatch[1].trim()
            };
        }

        // Force Sensitive
        if (part.toLowerCase().includes('force sensitive') || part.toLowerCase().includes('force sensitivity')) {
            return {
                type: 'force_sensitive'
            };
        }

        // Otherwise, assume it's a feat name
        return {
            type: 'feat',
            featName: part
        };
    }

    static _checkSingleLegacyPrerequisite(prereq, actor, pendingData = {}) {
        switch (prereq.type) {
            case 'or_group':
                return this._checkOrGroupPrereq(prereq, actor, pendingData);
            case 'ability':
                return this._checkAbilityPrereq(prereq, actor, pendingData);
            case 'bab':
                return this._checkBABPrereq(prereq, actor, pendingData);
            case 'level':
                return this._checkLevelPrereq(prereq, actor, pendingData);
            case 'class':
                return this._checkClassLevelPrereq(prereq, actor, pendingData);
            case 'skill':
                return this._checkSkillPrereq(prereq, actor, pendingData);
            case 'skill_rank':
                return this._checkSkillRankPrereq(prereq, actor, pendingData);
            case 'force_sensitive':
                return this._checkForceSensitivePrereq(prereq, actor, pendingData);
            case 'feat':
                return this._checkFeatPrereq(prereq, actor, pendingData);
            default:
                return { valid: true };
        }
    }

    static _checkOrGroupPrereq(prereq, actor, pendingData) {
        const validGroups = [];
        const failedGroups = [];

        for (const group of prereq.groups) {
            const groupResults = group.map(p => this._checkSingleLegacyPrerequisite(p, actor, pendingData));
            const allValid = groupResults.every(r => r.valid);

            if (allValid) {
                validGroups.push(group);
            } else {
                const failures = groupResults.filter(r => !r.valid).map(r => r.reason);
                failedGroups.push(failures);
            }
        }

        if (validGroups.length > 0) {
            return { valid: true };
        }

        const groupDescriptions = prereq.groups.map((group, i) => {
            if (group.length === 1) {
                return failedGroups[i][0] || 'Unknown requirement';
            }
            return failedGroups[i].join(' AND ');
        });

        return {
            valid: false,
            reason: `Requires one of: (${groupDescriptions.join(') OR (')})`
        };
    }

    static _checkAbilityPrereq(prereq, actor, pendingData) {
        const abilityScore = actor.system.attributes[prereq.ability]?.total || 10;
        const pendingIncreases = pendingData.abilityIncreases || {};
        const finalScore = abilityScore + (pendingIncreases[prereq.ability] || 0);

        if (finalScore < prereq.value) {
            return {
                valid: false,
                reason: `Requires ${prereq.ability.toUpperCase()} ${prereq.value}+ (you have ${finalScore})`
            };
        }
        return { valid: true };
    }

    static _checkBABPrereq(prereq, actor, pendingData) {
        const bab = actor.system.bab || 0;

        if (bab < prereq.value) {
            return {
                valid: false,
                reason: `Requires BAB +${prereq.value} (you have +${bab})`
            };
        }
        return { valid: true };
    }

    static _checkLevelPrereq(prereq, actor, pendingData) {
        const level = actor.system.level || 1;

        if (level < prereq.value) {
            return {
                valid: false,
                reason: `Requires character level ${prereq.value} (you are level ${level})`
            };
        }
        return { valid: true };
    }

    static _checkClassLevelPrereq(prereq, actor, pendingData) {
        const classItems = actor.items.filter(i => i.type === 'class');
        const classLevels = {};

        for (const classItem of classItems) {
            const className = classItem.name;
            classLevels[className.toLowerCase()] = (classItem.system.level || 1);
        }

        const requiredClass = prereq.className.toLowerCase();
        const currentLevel = classLevels[requiredClass] || 0;

        if (currentLevel < prereq.level) {
            return {
                valid: false,
                reason: `Requires ${prereq.className} level ${prereq.level} (you have ${currentLevel})`
            };
        }
        return { valid: true };
    }

    static _checkSkillPrereq(prereq, actor, pendingData) {
        const skillMap = {
            'acrobatics': 'acrobatics',
            'climb': 'climb',
            'deception': 'deception',
            'endurance': 'endurance',
            'gather information': 'gatherInformation',
            'initiative': 'initiative',
            'jump': 'jump',
            'knowledge': 'knowledge',
            'mechanics': 'mechanics',
            'perception': 'perception',
            'persuasion': 'persuasion',
            'pilot': 'pilot',
            'ride': 'ride',
            'stealth': 'stealth',
            'survival': 'survival',
            'swim': 'swim',
            'treat injury': 'treatInjury',
            'use computer': 'useComputer',
            'use the force': 'useTheForce'
        };

        const skillKey = skillMap[prereq.skillName.toLowerCase()];
        if (!skillKey) {
            return { valid: true };
        }

        const isTrained = actor.system.skills[skillKey]?.trained || false;
        const pendingSkills = pendingData.selectedSkills || [];
        const isPendingTrained = pendingSkills.some(s => s.key === skillKey);

        if (!isTrained && !isPendingTrained) {
            return {
                valid: false,
                reason: `Requires training in ${prereq.skillName}`
            };
        }
        return { valid: true };
    }

    static _checkSkillRankPrereq(prereq, actor, pendingData) {
        const skillMap = {
            'acrobatics': 'acrobatics',
            'climb': 'climb',
            'deception': 'deception',
            'endurance': 'endurance',
            'gather information': 'gatherInformation',
            'initiative': 'initiative',
            'jump': 'jump',
            'knowledge': 'knowledge',
            'mechanics': 'mechanics',
            'perception': 'perception',
            'persuasion': 'persuasion',
            'pilot': 'pilot',
            'ride': 'ride',
            'stealth': 'stealth',
            'survival': 'survival',
            'swim': 'swim',
            'treat injury': 'treatInjury',
            'use computer': 'useComputer',
            'use the force': 'useTheForce'
        };

        const skillKey = skillMap[prereq.skillName.toLowerCase()];
        if (!skillKey) {
            return { valid: true };
        }

        const currentRanks = actor.system.skills[skillKey]?.ranks || 0;
        const pendingRanks = pendingData.skillRanks?.[skillKey] || 0;
        const totalRanks = currentRanks + pendingRanks;

        if (totalRanks < prereq.ranks) {
            return {
                valid: false,
                reason: `Requires ${prereq.ranks} ranks in ${prereq.skillName} (you have ${totalRanks})`
            };
        }
        return { valid: true };
    }

    static _checkForceSensitivePrereq(prereq, actor, pendingData) {
        const hasForceSensitivityFeat = actor.items.some(i =>
            i.type === 'feat' && i.name.toLowerCase().includes('force sensitivity')
        );

        const hasForceSensitiveClass = actor.items.some(i =>
            i.type === 'class' && i.system?.forceSensitive === true
        );

        const pendingClass = pendingData.selectedClass;
        const pendingForceSensitive = pendingClass?.system?.forceSensitive === true;

        const pendingFeats = pendingData.selectedFeats || [];
        const pendingForceSensitivityFeat = pendingFeats.some(f =>
            f.name.toLowerCase().includes('force sensitivity')
        );

        if (!hasForceSensitivityFeat && !hasForceSensitiveClass && !pendingForceSensitive && !pendingForceSensitivityFeat) {
            return {
                valid: false,
                reason: 'Requires Force Sensitivity'
            };
        }
        return { valid: true };
    }

    static _checkFeatPrereq(prereq, actor, pendingData) {
        const hasFeat = actor.items.some(i =>
            i.type === 'feat' && i.name.toLowerCase() === prereq.featName.toLowerCase()
        );

        const pendingFeats = pendingData.selectedFeats || [];
        const hasPendingFeat = pendingFeats.some(f =>
            f?.name && f.name.toLowerCase() === prereq.featName.toLowerCase()
        );

        if (!hasFeat && !hasPendingFeat) {
            return {
                valid: false,
                reason: `Requires feat: ${prereq.featName}`
            };
        }
        return { valid: true };
    }

    /**
     * Filter a list of feats to only those the character qualifies for
     */
    static filterQualifiedFeats(feats, actor, pendingData = {}) {
        return feats.map(feat => {
            const check = this.checkFeatPrerequisites(feat, actor, pendingData);
            return {
                ...feat,
                isQualified: check.valid,
                prerequisiteReasons: check.reasons
            };
        });
    }

    /**
     * Filter a list of talents to only those the character qualifies for
     */
    static filterQualifiedTalents(talents, actor, pendingData = {}) {
        return talents.map(talent => {
            const check = this.checkTalentPrerequisites(talent, actor, pendingData);
            return {
                ...talent,
                isQualified: check.valid,
                prerequisiteReasons: check.reasons
            };
        });
    }
}
