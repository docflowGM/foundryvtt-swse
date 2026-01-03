/* ==========================================================================  
   SWSE Defense System
   Saga Edition Defense Engine
   - Reflex / Fortitude / Will
   - Armored Defense
   - Improved Armored Defense
   - Armor Mastery
   - Ability Selector
   - Class Bonus Auto + Override
   - Misc Auto + User Modifiers
   - Size Mod Logic
   - Full Auto Recalculation
   ========================================================================== */

export class DefenseSystem {

    /* -----------------------------------------------------------
       ENTRY POINT
       ----------------------------------------------------------- */
    static calculate(actor) {
        if (!actor.system?.defenses) return;

        const sys = actor.system;

        // Ensure structure integrity
        DefenseSystem._initializeDefenseSchema(sys);

        // Calculate each defense
        DefenseSystem._calcReflex(actor, sys);
        DefenseSystem._calcFortitude(actor, sys);
        DefenseSystem._calcWill(actor, sys);

        // Calculate flat-footed defense (Reflex - Dex bonus)
        DefenseSystem._calcFlatFooted(actor, sys);

        Hooks.call("swse:defenses:updated", actor);
    }

    /* -----------------------------------------------------------
       INITIAL SCHEMA SETUP
       Ensures misc auto/user objects exist so HBS never crashes.
       ----------------------------------------------------------- */
    static _initializeDefenseSchema(sys) {
        const defenseKeys = ["reflex", "fort", "will"];
        for (const key of defenseKeys) {
            if (!sys.defenses[key]) sys.defenses[key] = {};

            const d = sys.defenses[key];

            // Ability
            d.ability ??= "dex";

            // Overrides must always exist
            d.classBonus ??= 0;
            d.level ??= sys.level || 0;

            // Misc system
            if (!d.misc) d.misc = {};
            if (!d.misc.auto) d.misc.auto = {};
            if (!d.misc.user) d.misc.user = {};

            const auto = ["size", "species", "feats", "talents", "armor", "equipment", "other"];
            for (const k of auto) d.misc.auto[k] ??= 0;
            d.misc.user.extra ??= 0;
        }
    }

    /* ==========================================================================  
       REFLEX DEFENSE
       ========================================================================== */
    static _calcReflex(actor, sys) {
        const d = sys.defenses.reflex;

        const base = 10;
        const abilityMod = DefenseSystem._getAbilityMod(actor, d.ability);
        const sizeMod = DefenseSystem._getSizeMod(actor);

        // ---------------------------------------------------------------------
        // CLASS BONUS (Highest across all classes)
        // ---------------------------------------------------------------------
        const classBonus = DefenseSystem._getClassBonus(actor, "reflex");
        const classFinal = DefenseSystem._applyOverride(d.classBonus, classBonus);

        // ---------------------------------------------------------------------
        // Source Logic: Level, Armor, Armored Defense, Improved Armored Defense
        // ---------------------------------------------------------------------
        const lvl = sys.level ?? 0;
        const armorBonus = DefenseSystem._getArmorReflexBonus(actor);

        let sourceValue = 0;

        switch (d.source) {
            case "armor":
                sourceValue = armorBonus;
                break;

            case "armored":
                sourceValue = Math.max(lvl, armorBonus);
                break;

            case "improvedArmored":
                sourceValue = Math.max(armorBonus, lvl + Math.floor(armorBonus / 2));
                break;

            default: // level
                sourceValue = lvl;
                break;
        }

        // ---------------------------------------------------------------------
        // Equipment Bonus from Armor
        // SWSE Rule: Only apply if proficient with armor
        const equipmentBonus = DefenseSystem._getEquipmentBonus(actor);

        // Misc Bonuses
        // ---------------------------------------------------------------------
        const misc = DefenseSystem._computeMisc(d);

        // ---------------------------------------------------------------------
        // Final total
        // ---------------------------------------------------------------------
        d.sizeMod = sizeMod; // expose to sheet

        d.total = base +
                  sourceValue +
                  abilityMod +
                  classFinal +
                  sizeMod +
                  equipmentBonus +
                  misc;

        return d.total;
    }

    /* ==========================================================================  
       FORTITUDE DEFENSE
       ========================================================================== */
    static _calcFortitude(actor, sys) {
        const d = sys.defenses.fort;

        const base = 10;
        const abilityMod = DefenseSystem._getAbilityMod(actor, d.ability);

        const lvl = d.level ?? sys.level ?? 0;
        const classBonus = DefenseSystem._getClassBonus(actor, "fort");
        const classFinal = DefenseSystem._applyOverride(d.classBonus, classBonus);

        const equipmentBonus = DefenseSystem._getFortEquipmentBonus(actor);

        const misc = DefenseSystem._computeMisc(d);

        d.total = base + lvl + abilityMod + classFinal + equipmentBonus + misc;
        return d.total;
    }

    /* ==========================================================================
       WILL DEFENSE
       ========================================================================== */
    static _calcWill(actor, sys) {
        const d = sys.defenses.will;

        const base = 10;
        const abilityMod = DefenseSystem._getAbilityMod(actor, d.ability);

        const lvl = d.level ?? sys.level ?? 0;
        const classBonus = DefenseSystem._getClassBonus(actor, "will");
        const classFinal = DefenseSystem._applyOverride(d.classBonus, classBonus);

        const misc = DefenseSystem._computeMisc(d);

        d.total = base + lvl + abilityMod + classFinal + misc;
        return d.total;
    }

    /* ==========================================================================
       FLAT-FOOTED DEFENSE
       Flat-footed defense = Reflex Defense - Dexterity bonus
       This is used when a character is caught off-guard or surprised
       ========================================================================== */
    static _calcFlatFooted(actor, sys) {
        // Initialize flat-footed defense object if it doesn't exist
        if (!sys.defenses.flatFooted) {
            sys.defenses.flatFooted = { total: 10 };
        }

        const reflexTotal = sys.defenses.reflex?.total || 10;
        const dexMod = actor.system.abilities?.dex?.mod || 0;

        // Flat-footed = Reflex Defense - Dex modifier
        sys.defenses.flatFooted.total = reflexTotal - dexMod;

        return sys.defenses.flatFooted.total;
    }

    /* ==========================================================================
       HELPERS
       ========================================================================== */

    /* Ability Mod */
    static _getAbilityMod(actor, abilityKey) {
        const ability = actor.system.abilities?.[abilityKey];
        return ability?.mod ?? 0;
    }

    /* Size Mod */
    static _getSizeMod(actor) {
        const size = actor.system.size || "medium";
        const table = {
            colossal: -10,
            gargantuan: -5,
            huge: -2,
            large: -1,
            medium: 0,
            small: 1,
            tiny: 2,
            diminutive: 5,
            fine: 10
        };
        return table[size] ?? 0;
    }

    /* Armor Reflex Bonus */
    static _getArmorReflexBonus(actor) {
        const items = actor.items.filter(i => i.type === "armor" && i.system.equipped);
        if (items.length === 0) return 0;
        return items[0].system?.defenseBonus || items[0].system?.armorBonus || 0;
    }

    /* Equipment Bonus (applies to both Reflex and Fortitude) */
    static _getEquipmentBonus(actor) {
        const items = actor.items.filter(i => i.type === "armor" && i.system.equipped);
        if (items.length === 0) return 0;
        // Only gain equipment bonus if proficient with armor
        if (!DefenseSystem._isArmorProficient(actor)) return 0;
        return items[0].system?.equipmentBonus || 0;
    }

    /* Ft Equipment Bonus */
    static _getFortEquipmentBonus(actor) {
        return DefenseSystem._getEquipmentBonus(actor);
    }

    /* Check if character is proficient with equipped armor */
    static _isArmorProficient(actor) {
        const equippedArmor = actor?.items?.find(i => i.type === 'armor' && i.system.equipped);
        if (!equippedArmor) return true; // No armor, always proficient

        const armorType = equippedArmor.system.armorType?.toLowerCase() || 'light';

        const armorProficiencies = actor?.items?.filter(i =>
            (i.type === 'feat' || i.type === 'talent') &&
            i.name.toLowerCase().includes('armor proficiency')
        ) || [];

        // SWSE Rule: Each armor proficiency only covers its specific type
        for (const prof of armorProficiencies) {
            const profName = prof.name.toLowerCase();
            if (profName.includes('light') && armorType === 'light') return true;
            if (profName.includes('medium') && armorType === 'medium') return true;
            if (profName.includes('heavy') && armorType === 'heavy') return true;
        }

        return false;
    }

    /* Class Bonus (max across classes) */
    static _getClassBonus(actor, type) {
        const classes = actor.items.filter(i => i.type === "class");

        let maxBonus = 0;

        for (const cls of classes) {
            const bonus = cls.system?.defenses?.[type] ?? 0;
            if (bonus > maxBonus) maxBonus = bonus;
        }

        return maxBonus;
    }

    /* Override Logic */
    static _applyOverride(editValue, autoValue) {
        if (editValue !== undefined && editValue !== null) return Number(editValue);
        return autoValue;
    }

    /* Misc = sum(auto) + user.extra */
    static _computeMisc(d) {
        let total = 0;
        for (const k in d.misc.auto) total += Number(d.misc.auto[k] || 0);
        total += Number(d.misc.user.extra || 0);
        d.miscTotal = total;
        return total;
    }
}
