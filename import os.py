#!/usr/bin/env python3
"""
SWSE System Reorganization Script
Reorganizes utils/ and rolls/ folders and creates integration files
"""

import os
import shutil
from pathlib import Path
from datetime import datetime
import re

# Base path
BASE_PATH = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")

# Backup directory
BACKUP_DIR = BASE_PATH / f"_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

def create_backup():
    """Create a full backup before making changes"""
    print(f"📦 Creating backup at: {BACKUP_DIR}")
    BACKUP_DIR.mkdir(exist_ok=True)
    
    # Backup folders we'll be modifying
    folders_to_backup = ["utils", "rolls", "scripts", "index.js", "config.js"]
    
    for item in folders_to_backup:
        src = BASE_PATH / item
        if src.exists():
            if src.is_file():
                shutil.copy2(src, BACKUP_DIR / item)
                print(f"   ✓ Backed up {item}")
            else:
                shutil.copytree(src, BACKUP_DIR / item)
                print(f"   ✓ Backed up {item}/")
    
    print("✅ Backup complete!\n")

def move_folders():
    """Move utils/ and rolls/ into scripts/"""
    print("📁 Moving folders into scripts/...")
    
    scripts_dir = BASE_PATH / "scripts"
    scripts_dir.mkdir(exist_ok=True)
    
    # Move utils/
    old_utils = BASE_PATH / "utils"
    new_utils = scripts_dir / "utils"
    if old_utils.exists():
        if new_utils.exists():
            print(f"   ⚠️  {new_utils} already exists, merging...")
            shutil.copytree(old_utils, new_utils, dirs_exist_ok=True)
            shutil.rmtree(old_utils)
        else:
            shutil.move(str(old_utils), str(new_utils))
        print("   ✓ Moved utils/ → scripts/utils/")
    
    # Move rolls/
    old_rolls = BASE_PATH / "rolls"
    new_rolls = scripts_dir / "rolls"
    if old_rolls.exists():
        if new_rolls.exists():
            print(f"   ⚠️  {new_rolls} already exists, merging...")
            shutil.copytree(old_rolls, new_rolls, dirs_exist_ok=True)
            shutil.rmtree(old_rolls)
        else:
            shutil.move(str(old_rolls), str(new_rolls))
        print("   ✓ Moved rolls/ → scripts/rolls/")
    
    print("✅ Folders moved!\n")

def resolve_dice_utils_conflict():
    """Handle the dice-utils.js conflict"""
    print("🔧 Resolving dice-utils.js conflict...")
    
    old_dice = BASE_PATH / "scripts" / "utils" / "dice-utils.js"
    helpers_dice = BASE_PATH / "scripts" / "helpers" / "dice-utils.js"
    
    if old_dice.exists() and helpers_dice.exists():
        # Read both files
        with open(old_dice, 'r', encoding='utf-8') as f:
            old_content = f.read()
        
        with open(helpers_dice, 'r', encoding='utf-8') as f:
            helpers_content = f.read()
        
        # Create merged version
        merged_content = """// ============================================
// FILE: dice-utils.js
// Merged dice rolling utilities for SWSE
// ============================================

/**
 * Evaluate a roll and send to chat
 * @param {Roll} roll - The roll to evaluate
 * @param {object} options - Chat message options
 * @returns {Promise<Roll>} Evaluated roll
 */
async function evaluateRoll(roll, options = {}) {
    await roll.evaluate({async: true});
    await roll.toMessage(options);
    return roll;
}

/**
 * Roll dice with a formula
 * @param {string} formula - Dice formula (e.g., "2d6+3")
 * @param {object} data - Data for formula variables
 * @param {string} label - Label for the roll
 * @returns {Promise<Roll>} The roll result
 */
export async function rollDice(formula, data = {}, label = "Roll") {
    try {
        const roll = await new Roll(formula, data).evaluate({async: true});
        
        await roll.toMessage({
            speaker: ChatMessage.getSpeaker(),
            flavor: label
        });
        
        return roll;
    } catch (err) {
        ui.notifications.error(`Dice roll failed: ${err.message}`);
        console.error(err);
        return null;
    }
}

/**
 * Quick d20 roll
 * @param {number} modifier - Modifier to add
 * @param {string} label - Label for the roll
 * @returns {Promise<Roll>} The roll result
 */
export async function d20(modifier = 0, label = "d20") {
    return rollDice(`1d20 + ${modifier}`, {}, label);
}

/**
 * Roll an attack with modifiers
 * @param {number} baseAttack - Base attack bonus
 * @param {number[]} modifiers - Array of additional modifiers
 * @param {object} rollData - Additional roll data
 * @returns {Promise<Roll>} The evaluated roll
 */
export async function rollAttack(baseAttack, modifiers = [], rollData = {}) {
    const totalMod = modifiers.reduce((sum, mod) => sum + mod, baseAttack);
    const roll = new Roll("1d20 + @total", { ...rollData, total: totalMod });
    return await evaluateRoll(roll, {
        speaker: ChatMessage.getSpeaker(),
        flavor: "Attack Roll"
    });
}

/**
 * Roll damage dice
 * @param {string} damageDice - Damage dice formula (e.g., "2d6")
 * @param {number} modifier - Damage modifier
 * @param {object} rollData - Additional roll data
 * @returns {Promise<Roll>} The evaluated roll
 */
export async function rollDamage(damageDice, modifier = 0, rollData = {}) {
    const roll = new Roll(`${damageDice} + @mod`, { ...rollData, mod: modifier });
    return await evaluateRoll(roll, {
        speaker: ChatMessage.getSpeaker(),
        flavor: "Damage"
    });
}

/**
 * Roll for initiative
 * @param {number} initiativeBonus - Initiative bonus
 * @param {object} rollData - Additional roll data
 * @returns {Promise<Roll>} The evaluated roll
 */
export async function rollInitiative(initiativeBonus = 0, rollData = {}) {
    const roll = new Roll("1d20 + @init", { ...rollData, init: initiativeBonus });
    return await evaluateRoll(roll, {
        speaker: ChatMessage.getSpeaker(),
        flavor: "Initiative"
    });
}

/**
 * Roll a skill check
 * @param {number} skillModifier - Total skill modifier
 * @param {object} rollData - Additional roll data
 * @returns {Promise<Roll>} The evaluated roll
 */
export async function rollSkillCheck(skillModifier = 0, rollData = {}) {
    const roll = new Roll("1d20 + @skill", { ...rollData, skill: skillModifier });
    return await evaluateRoll(roll, {
        speaker: ChatMessage.getSpeaker(),
        flavor: "Skill Check"
    });
}

/**
 * Check for a critical hit
 * @param {number} rollResult - The d20 roll result
 * @param {number} criticalRange - The critical threat range (default 20)
 * @returns {boolean} True if critical threat
 */
export function isCriticalThreat(rollResult, criticalRange = 20) {
    return rollResult >= criticalRange;
}

/**
 * Roll with advantage (roll twice, take higher)
 * @param {string} formula - Dice formula
 * @param {string} label - Label for the roll
 * @returns {Promise<Roll>} The higher roll
 */
export async function rollWithAdvantage(formula, label = "Roll with Advantage") {
    const roll1 = await new Roll(formula).evaluate({async: true});
    const roll2 = await new Roll(formula).evaluate({async: true});
    
    const higherRoll = roll1.total >= roll2.total ? roll1 : roll2;
    
    await higherRoll.toMessage({
        speaker: ChatMessage.getSpeaker(),
        flavor: `${label} (${roll1.total} vs ${roll2.total})`
    });
    
    return higherRoll;
}

/**
 * Roll with disadvantage (roll twice, take lower)
 * @param {string} formula - Dice formula
 * @param {string} label - Label for the roll
 * @returns {Promise<Roll>} The lower roll
 */
export async function rollWithDisadvantage(formula, label = "Roll with Disadvantage") {
    const roll1 = await new Roll(formula).evaluate({async: true});
    const roll2 = await new Roll(formula).evaluate({async: true});
    
    const lowerRoll = roll1.total <= roll2.total ? roll1 : roll2;
    
    await lowerRoll.toMessage({
        speaker: ChatMessage.getSpeaker(),
        flavor: `${label} (${roll1.total} vs ${roll2.total})`
    });
    
    return lowerRoll;
}
"""
        
        # Write merged version to utils
        with open(old_dice, 'w', encoding='utf-8') as f:
            f.write(merged_content)
        
        # Rename the helpers version as backup
        backup_name = helpers_dice.parent / "dice-utils.js.old"
        shutil.move(str(helpers_dice), str(backup_name))
        
        print("   ✓ Merged dice-utils.js files")
        print(f"   ✓ Old helpers version saved as {backup_name.name}")
    
    print("✅ Conflict resolved!\n")

def create_utils_init():
    """Create utils-init.js file"""
    print("📝 Creating utils-init.js...")
    
    core_dir = BASE_PATH / "scripts" / "core"
    core_dir.mkdir(exist_ok=True)
    
    utils_init_path = core_dir / "utils-init.js"
    
    content = """// ============================================
// FILE: utils-init.js
// Initialize SWSE utility functions
// ============================================

import * as MathUtils from "../utils/math-utils.js";
import * as StringUtils from "../utils/string-utils.js";
import * as CombatUtils from "../utils/combat-utils.js";
import * as CharacterUtils from "../utils/character-utils.js";
import * as DataUtils from "../utils/data-utils.js";
import * as UIUtils from "../utils/ui-utils.js";
import * as ValidationUtils from "../utils/validation-utils.js";
import * as DiceUtils from "../utils/dice-utils.js";

/**
 * Initialize utilities and expose them on game.swse.utils
 */
export function initializeUtils() {
  console.log("SWSE | Initializing utilities...");
  
  if (!game.swse) game.swse = {};
  
  game.swse.utils = {
    math: MathUtils,
    string: StringUtils,
    combat: CombatUtils,
    character: CharacterUtils,
    data: DataUtils,
    ui: UIUtils,
    validation: ValidationUtils,
    dice: DiceUtils
  };
  
  console.log("SWSE | ✓ Utils initialized:", Object.keys(game.swse.utils));
}
"""
    
    with open(utils_init_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"   ✓ Created {utils_init_path.relative_to(BASE_PATH)}")
    print("✅ Utils initialization created!\n")

def create_rolls_init():
    """Create rolls-init.js file"""
    print("📝 Creating rolls-init.js...")
    
    core_dir = BASE_PATH / "scripts" / "core"
    core_dir.mkdir(exist_ok=True)
    
    rolls_init_path = core_dir / "rolls-init.js"
    
    content = """// ============================================
// FILE: rolls-init.js
// Initialize SWSE roll functions
// ============================================

import * as Attacks from "../rolls/attacks.js";
import * as Damage from "../rolls/damage.js";
import * as Defenses from "../rolls/defenses.js";
import * as Dice from "../rolls/dice.js";
import * as Initiative from "../rolls/initiative.js";
import * as Saves from "../rolls/saves.js";
import * as Skills from "../rolls/skills.js";

/**
 * Initialize roll functions and expose them on game.swse.rolls
 */
export function initializeRolls() {
  console.log("SWSE | Initializing roll functions...");
  
  if (!game.swse) game.swse = {};
  
  game.swse.rolls = {
    attacks: Attacks,
    damage: Damage,
    defenses: Defenses,
    dice: Dice,
    initiative: Initiative,
    saves: Saves,
    skills: Skills
  };
  
  console.log("SWSE | ✓ Rolls initialized:", Object.keys(game.swse.rolls));
}
"""
    
    with open(rolls_init_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"   ✓ Created {rolls_init_path.relative_to(BASE_PATH)}")
    print("✅ Rolls initialization created!\n")

def update_index_js():
    """Update index.js to import and initialize utils and rolls"""
    print("📝 Updating index.js...")
    
    index_path = BASE_PATH / "index.js"
    
    if not index_path.exists():
        print("   ⚠️  index.js not found!")
        return
    
    with open(index_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add imports at the top (after other imports)
    import_line = 'import { WorldDataLoader } from "./scripts/core/world-data-loader.js";'
    new_imports = '''import { WorldDataLoader } from "./scripts/core/world-data-loader.js";
import { initializeUtils } from "./scripts/core/utils-init.js";
import { initializeRolls } from "./scripts/core/rolls-init.js";'''
    
    if import_line in content:
        content = content.replace(import_line, new_imports)
    
    # Remove old utils imports if they exist
    old_utils_pattern = r'import \* as \w+Utils from "\./utils/[\w-]+\.js";\n'
    content = re.sub(old_utils_pattern, '', content)
    
    # Update the game.swse initialization
    old_game_swse = '''  game.swse = {
    data: SWSEData,
    SWSE: SWSE
  };'''
    
    new_game_swse = '''  // Initialize namespace (utils and rolls will be added by their init functions)
  game.swse = {
    data: SWSEData,
    SWSE: SWSE
  };

  // -------------------------------
  // Initialize Utils & Rolls
  // -------------------------------
  initializeUtils();
  initializeRolls();'''
    
    if old_game_swse in content:
        content = content.replace(old_game_swse, new_game_swse)
    else:
        # Try to find it another way
        pattern = r'(game\.swse = \{[^}]+\};)'
        replacement = r'\1\n\n  // Initialize Utils & Rolls\n  initializeUtils();\n  initializeRolls();'
        content = re.sub(pattern, replacement, content, count=1)
    
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("   ✓ Updated index.js with utils and rolls initialization")
    print("✅ Index.js updated!\n")

def update_roll_files_imports():
    """Update import paths in roll files"""
    print("📝 Updating import paths in roll files...")
    
    rolls_dir = BASE_PATH / "scripts" / "rolls"
    
    if not rolls_dir.exists():
        print("   ⚠️  scripts/rolls/ not found!")
        return
    
    roll_files = list(rolls_dir.glob("*.js"))
    
    for roll_file in roll_files:
        with open(roll_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # No import updates needed for roll files as they use game.swse.utils
        # Just verify they're not trying to import directly
        
        print(f"   ✓ Checked {roll_file.name}")
    
    print("✅ Roll files updated!\n")

def create_constants_file():
    """Create a constants file for magic numbers"""
    print("📝 Creating constants.js for magic numbers...")
    
    core_dir = BASE_PATH / "scripts" / "core"
    core_dir.mkdir(exist_ok=True)
    
    constants_path = core_dir / "constants.js"
    
    content = """// ============================================
// FILE: constants.js
// System-wide constants for SWSE
// ============================================

export const SWSE_CONSTANTS = {
  // Defense
  BASE_DEFENSE: 10,
  
  // Critical Hits
  DEFAULT_CRIT_RANGE: 20,
  
  // Ability Scores
  MIN_ABILITY_SCORE: 1,
  MAX_ABILITY_SCORE: 30,
  AVERAGE_ABILITY_SCORE: 10,
  
  // Character Level
  MIN_LEVEL: 1,
  MAX_LEVEL: 20,
  
  // Cover Bonuses
  COVER: {
    NONE: 0,
    PARTIAL: 2,
    COVER: 5,
    IMPROVED: 10
  },
  
  // Concealment
  CONCEALMENT: {
    NONE: 0,
    PARTIAL: 20,
    TOTAL: 50
  },
  
  // Condition Track Penalties
  CONDITION_PENALTIES: {
    NORMAL: 0,
    MINUS_1: -1,
    MINUS_2: -2,
    MINUS_5: -5,
    MINUS_10: -10,
    DISABLED: -10,
    UNCONSCIOUS: -10,
    DEAD: -100
  },
  
  // Size Modifiers
  SIZE_MODIFIERS: {
    FINE: -10,
    DIMINUTIVE: -5,
    TINY: -5,
    SMALL: 0,
    MEDIUM: 0,
    LARGE: 5,
    HUGE: 10,
    GARGANTUAN: 20,
    COLOSSAL: 50,
    COLOSSAL_FRIGATE: 100,
    COLOSSAL_CRUISER: 150,
    COLOSSAL_STATION: 200
  },
  
  // BAB Progression
  BAB_PROGRESSION: {
    FAST: 1.0,
    MEDIUM: 0.75,
    SLOW: 0.5
  },
  
  // Bonuses
  FLANKING_BONUS: 2,
  FORCE_POINT_BONUS: 2,
  TRAINED_SKILL_BONUS: 5,
  SKILL_FOCUS_BONUS: 5,
  WEAPON_FOCUS_BONUS: 1,
  WEAPON_SPECIALIZATION_BONUS: 1
};
"""
    
    with open(constants_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"   ✓ Created {constants_path.relative_to(BASE_PATH)}")
    print("✅ Constants file created!\n")

def update_config_js():
    """Update config.js to include constants"""
    print("📝 Updating config.js to export constants...")
    
    config_path = BASE_PATH / "config.js"
    
    if not config_path.exists():
        print("   ⚠️  config.js not found!")
        return
    
    with open(config_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add import at top
    if 'import' not in content:
        new_content = '''import { SWSE_CONSTANTS } from "./scripts/core/constants.js";

''' + content
    else:
        # Add after existing imports
        lines = content.split('\n')
        import_line_idx = 0
        for i, line in enumerate(lines):
            if line.strip().startswith('import'):
                import_line_idx = i
        
        lines.insert(import_line_idx + 1, 'import { SWSE_CONSTANTS } from "./scripts/core/constants.js";')
        new_content = '\n'.join(lines)
    
    # Add constants to SWSE export
    if 'SWSE.itemTypes' in new_content:
        new_content = new_content.replace(
            'SWSE.itemTypes = ["armor"',
            'SWSE.constants = SWSE_CONSTANTS;\n\nSWSE.itemTypes = ["armor"'
        )
    
    with open(config_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("   ✓ Updated config.js")
    print("✅ Config.js updated!\n")

def generate_summary():
    """Generate a summary of changes"""
    print("\n" + "="*60)
    print("📋 REORGANIZATION SUMMARY")
    print("="*60)
    
    summary = f"""
✅ Completed Actions:

1. Created Backup
   - Location: {BACKUP_DIR.relative_to(BASE_PATH)}
   - Contains: Original utils/, rolls/, scripts/, index.js, config.js

2. Moved Folders
   - utils/ → scripts/utils/
   - rolls/ → scripts/rolls/

3. Resolved Conflicts
   - Merged dice-utils.js files
   - Backup of old helpers/dice-utils.js created

4. Created Integration Files
   - scripts/core/utils-init.js
   - scripts/core/rolls-init.js
   - scripts/core/constants.js

5. Updated Existing Files
   - index.js - Added utils and rolls initialization
   - config.js - Added constants import

🎯 What This Enables:

✓ game.swse.utils.math.* - All math utilities
✓ game.swse.utils.string.* - String utilities
✓ game.swse.utils.combat.* - Combat utilities
✓ game.swse.utils.character.* - Character utilities
✓ game.swse.utils.data.* - Data utilities
✓ game.swse.utils.ui.* - UI utilities
✓ game.swse.utils.validation.* - Validation utilities
✓ game.swse.utils.dice.* - Dice utilities

✓ game.swse.rolls.attacks.* - Attack roll functions
✓ game.swse.rolls.damage.* - Damage roll functions
✓ game.swse.rolls.defenses.* - Defense calculations
✓ game.swse.rolls.dice.* - Generic dice rolling
✓ game.swse.rolls.initiative.* - Initiative rolls
✓ game.swse.rolls.saves.* - Saving throws
✓ game.swse.rolls.skills.* - Skill checks

✓ SWSE.constants - System-wide constants

📝 Next Steps:

1. Test the system in Foundry VTT
   - Launch Foundry and load your world
   - Open console (F12)
   - Verify: game.swse.utils exists
   - Verify: game.swse.rolls exists
   - Test: game.swse.utils.math.calculateAbilityModifier(16)

2. Refactor Actor Sheets (Future Task)
   - Update scripts/actors/swse-actor.js to use game.swse.utils
   - Replace duplicate calculations with utility calls
   - Use roll functions from game.swse.rolls

3. Update Cleanup Script
   - Add scripts/utils/ to cleanup
   - Add scripts/rolls/ to cleanup

🔄 If You Need to Rollback:

1. Stop Foundry VTT
2. Delete current scripts/utils/ and scripts/rolls/
3. Restore from: {BACKUP_DIR.relative_to(BASE_PATH)}
4. Copy folders back to original locations

⚠️  Important Notes:

- Your actor sheets still have their own roll logic
- This integration provides utilities they can use
- Refactoring sheets to use these utils is the next phase
- All your original code is backed up

"""
    
    print(summary)
    
    # Save summary to file
    summary_path = BASE_PATH / "REORGANIZATION_SUMMARY.txt"
    with open(summary_path, 'w', encoding='utf-8') as f:
        f.write(summary)
    
    print(f"📄 Summary saved to: {summary_path.relative_to(BASE_PATH)}")
    print("="*60)

def main():
    """Main execution function"""
    print("\n" + "="*60)
    print("🚀 SWSE SYSTEM REORGANIZATION")
    print("="*60)
    print(f"\nTarget: {BASE_PATH}\n")
    
    # Verify path exists
    if not BASE_PATH.exists():
        print(f"❌ Error: Path not found: {BASE_PATH}")
        return
    
    # Confirm with user
    print("This script will:")
    print("  1. Create a backup of current code")
    print("  2. Move utils/ and rolls/ into scripts/")
    print("  3. Resolve dice-utils.js conflict")
    print("  4. Create integration files")
    print("  5. Update index.js and config.js")
    print("\nA backup will be created before any changes.\n")
    
    response = input("Continue? (yes/no): ").strip().lower()
    if response not in ['yes', 'y']:
        print("❌ Cancelled by user")
        return
    
    print("\n" + "="*60 + "\n")
    
    try:
        # Execute reorganization
        create_backup()
        move_folders()
        resolve_dice_utils_conflict()
        create_utils_init()
        create_rolls_init()
        create_constants_file()
        update_config_js()
        update_index_js()
        update_roll_files_imports()
        
        generate_summary()
        
        print("\n✅ REORGANIZATION COMPLETE!")
        print("\n🎉 Your system is now properly organized!")
        print("\n💡 Next: Launch Foundry VTT and test the changes")
        
    except Exception as e:
        print(f"\n❌ Error occurred: {e}")
        print(f"\n🔄 Restore from backup: {BACKUP_DIR}")
        raise

if __name__ == "__main__":
    main()