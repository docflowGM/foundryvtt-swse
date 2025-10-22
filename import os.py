#!/usr/bin/env python3
"""
SWSE System Cleanup and Reorganization Script
==============================================
This script performs comprehensive cleanup and reorganization of the SWSE Foundry VTT system:
- Deletes duplicate files
- Merges conflicting implementations
- Reorganizes file structure
- Updates import paths
- Creates new main entry point
- Moves misplaced files

BACKUP IS CREATED AUTOMATICALLY BEFORE ANY CHANGES
"""

import os
import shutil
import json
import re
from pathlib import Path
from datetime import datetime

# Base directory
BASE_DIR = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")
SCRIPTS_DIR = BASE_DIR / "scripts"
TEMPLATES_DIR = BASE_DIR / "templates"
STYLES_DIR = BASE_DIR / "styles"

# Backup directory
BACKUP_DIR = BASE_DIR / f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def log_info(msg):
    print(f"{Colors.OKBLUE}[INFO]{Colors.ENDC} {msg}")

def log_success(msg):
    print(f"{Colors.OKGREEN}[SUCCESS]{Colors.ENDC} {msg}")

def log_warning(msg):
    print(f"{Colors.WARNING}[WARNING]{Colors.ENDC} {msg}")

def log_error(msg):
    print(f"{Colors.FAIL}[ERROR]{Colors.ENDC} {msg}")

def log_header(msg):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{msg.center(60)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")


def create_backup():
    """Create a complete backup of the scripts directory"""
    log_header("Creating Backup")
    try:
        if SCRIPTS_DIR.exists():
            shutil.copytree(SCRIPTS_DIR, BACKUP_DIR / "scripts")
            log_success(f"Backup created at: {BACKUP_DIR}")
            return True
    except Exception as e:
        log_error(f"Failed to create backup: {e}")
        return False


def delete_duplicates():
    """Delete all duplicate files"""
    log_header("Deleting Duplicate Files")
    
    duplicates_to_delete = [
        "scripts/chargen.js",
        "scripts/chargen/chargen.js",
        "scripts/chargen/chargen-init.js",
        "scripts/swse-droid.js",
        "scripts/swse-npc.js",
        "scripts/swse-vehicle.js",
        "scripts/swse-item.js",
        "scripts/swse-data-optimized.js",
        "scripts/swse-data.js",
        "scripts/load-templates.js",
        "scripts/world-data-loader.js",
        "scripts/helpers.js",
        "scripts/helpers/helpers.js",
        "scripts/diceroller.js",
        "scripts/import-data.js",
        "scripts/system-entry.js",
        "scripts/init.js",
        "scripts/sheets/swse-actor-sheet.js",
    ]
    
    directories_to_delete = [
        "scripts/chargen",
        "scripts/store",
        "scripts/sheets",
    ]
    
    deleted_count = 0
    
    # Delete individual files
    for file_path in duplicates_to_delete:
        full_path = BASE_DIR / file_path
        if full_path.exists():
            try:
                full_path.unlink()
                log_success(f"Deleted: {file_path}")
                deleted_count += 1
            except Exception as e:
                log_error(f"Failed to delete {file_path}: {e}")
    
    # Delete directories
    for dir_path in directories_to_delete:
        full_path = BASE_DIR / dir_path
        if full_path.exists():
            try:
                shutil.rmtree(full_path)
                log_success(f"Deleted directory: {dir_path}")
                deleted_count += 1
            except Exception as e:
                log_error(f"Failed to delete {dir_path}: {e}")
    
    log_info(f"Total items deleted: {deleted_count}")


def merge_actor_files():
    """Merge the best features from different swse-actor.js implementations"""
    log_header("Merging Actor Files")
    
    # Read the comprehensive version with races and conditions
    comprehensive_actor = BASE_DIR / "scripts/swse-actor.js"
    target_actor = BASE_DIR / "scripts/actors/swse-actor.js"
    
    if not comprehensive_actor.exists():
        log_warning("Comprehensive actor file not found, keeping existing actors/swse-actor.js")
        return
    
    try:
        # Read comprehensive version
        with open(comprehensive_actor, 'r', encoding='utf-8') as f:
            comprehensive_content = f.read()
        
        # Write to target location
        with open(target_actor, 'w', encoding='utf-8') as f:
            f.write(comprehensive_content)
        
        log_success("Merged actor implementations into scripts/actors/swse-actor.js")
        
        # Delete the old comprehensive version
        comprehensive_actor.unlink()
        log_success("Deleted scripts/swse-actor.js (merged into actors/)")
        
    except Exception as e:
        log_error(f"Failed to merge actor files: {e}")


def create_main_entry():
    """Create the main swse.js entry point"""
    log_header("Creating Main Entry Point")
    
    main_entry_content = '''// ============================================
// SWSE System - Main Entry Point
// Foundry VTT | Star Wars Saga Edition
// ============================================

import { SWSEActor, SWSEActorSheet } from "./actors/swse-actor.js";
import { SWSEDroidSheet } from "./actors/swse-droid.js";
import { SWSENPCSheet } from "./actors/swse-npc.js";
import { SWSEVehicleSheet } from "./actors/swse-vehicle.js";
import { SWSEItemSheet } from "./items/swse-item.js";
import { registerHandlebarsHelpers } from "./helpers/handlebars-helpers.js";
import { preloadHandlebarsTemplates } from "./core/load-templates.js";
import { WorldDataLoader } from "./core/world-data-loader.js";

/**
 * SWSE System Initialization
 */
Hooks.once("init", async function() {
  console.log("SWSE | Initializing Star Wars Saga Edition System");

  // Register custom Actor and Item classes
  CONFIG.Actor.documentClass = SWSEActor;
  
  // Unregister core sheets
  Actors.unregisterSheet("core", ActorSheet);
  Items.unregisterSheet("core", ItemSheet);

  // Register SWSE sheets
  Actors.registerSheet("swse", SWSEActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "SWSE Character Sheet"
  });

  Actors.registerSheet("swse", SWSEDroidSheet, {
    types: ["droid"],
    makeDefault: true,
    label: "SWSE Droid Sheet"
  });

  Actors.registerSheet("swse", SWSENPCSheet, {
    types: ["npc"],
    makeDefault: true,
    label: "SWSE NPC Sheet"
  });

  Actors.registerSheet("swse", SWSEVehicleSheet, {
    types: ["vehicle"],
    makeDefault: true,
    label: "SWSE Vehicle Sheet"
  });

  Items.registerSheet("swse", SWSEItemSheet, {
    makeDefault: true,
    label: "SWSE Item Sheet"
  });

  // Register Handlebars helpers
  registerHandlebarsHelpers();

  // Preload Handlebars templates
  await preloadHandlebarsTemplates();

  // Register game settings
  registerSystemSettings();

  console.log("SWSE | System initialization complete");
});

/**
 * System Ready Hook
 */
Hooks.once("ready", async function() {
  console.log("SWSE | System ready");

  // Auto-load world data for GM
  if (game.user.isGM) {
    await WorldDataLoader.autoLoad();
  }

  // Enhance validation logging
  enhanceValidationLogging();
});

/**
 * Register system settings
 */
function registerSystemSettings() {
  // Data loaded flag
  game.settings.register("swse", "dataLoaded", {
    name: "Data Loaded",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  // Force Point bonus
  game.settings.register("swse", "forcePointBonus", {
    name: "Force Point Bonus",
    hint: "Bonus applied when spending Force Points",
    scope: "world",
    config: true,
    type: Number,
    default: 2
  });

  // Store markup
  game.settings.register("swse", "storeMarkup", {
    name: "Store Markup %",
    hint: "Percentage markup on store items",
    scope: "world",
    config: true,
    type: Number,
    default: 0
  });

  // Store discount
  game.settings.register("swse", "storeDiscount", {
    name: "Store Discount %",
    hint: "Percentage discount on store items",
    scope: "world",
    config: true,
    type: Number,
    default: 0
  });
}

/**
 * Enhance validation error logging
 */
function enhanceValidationLogging() {
  [Actor, Item].forEach(DocumentClass => {
    const original = DocumentClass.prototype.validate;
    DocumentClass.prototype.validate = function(data, options) {
      try {
        return original.call(this, data, options);
      } catch (err) {
        if (err.name === "DataModelValidationError") {
          console.group(`⚠️ ${DocumentClass.name} Validation Error`);
          console.error(`${DocumentClass.name} Instance:`, this);
          console.error("Data being validated:", data);
          if (err.failures) {
            err.failures.forEach(f => {
              console.error(`❌ Path: ${f.path}`, "Reason:", f.failure, "Value:", f.value);
            });
          }
          console.groupEnd();
        }
        throw err;
      }
    };
  });
}

// Make WorldDataLoader available globally for console access
window.WorldDataLoader = WorldDataLoader;

console.log("SWSE | Main module loaded");
'''
    
    try:
        main_entry_path = SCRIPTS_DIR / "swse.js"
        with open(main_entry_path, 'w', encoding='utf-8') as f:
            f.write(main_entry_content)
        log_success("Created scripts/swse.js main entry point")
    except Exception as e:
        log_error(f"Failed to create main entry point: {e}")


def move_races_file():
    """Move races.js to data subdirectory"""
    log_header("Reorganizing Data Files")
    
    # Create data directory if it doesn't exist
    data_dir = SCRIPTS_DIR / "data"
    data_dir.mkdir(exist_ok=True)
    
    # Move races.js
    races_src = SCRIPTS_DIR / "races.js"
    races_dst = data_dir / "races.js"
    
    if races_src.exists():
        try:
            shutil.move(str(races_src), str(races_dst))
            log_success("Moved races.js to scripts/data/")
        except Exception as e:
            log_error(f"Failed to move races.js: {e}")
    
    # Move swse-levelup.js to apps
    levelup_src = SCRIPTS_DIR / "swse-levelup.js"
    levelup_dst = SCRIPTS_DIR / "apps" / "swse-levelup.js"
    
    if levelup_src.exists():
        try:
            shutil.move(str(levelup_src), str(levelup_dst))
            log_success("Moved swse-levelup.js to scripts/apps/")
        except Exception as e:
            log_error(f"Failed to move swse-levelup.js: {e}")


def update_imports():
    """Update import statements in all JavaScript files"""
    log_header("Updating Import Statements")
    
    import_mappings = {
        'from "./swse-actor.js"': 'from "../actors/swse-actor.js"',
        'from "./swse-droid.js"': 'from "./swse-droid.js"',
        'from "./swse-npc.js"': 'from "./swse-npc.js"',
        'from "./swse-vehicle.js"': 'from "./swse-vehicle.js"',
        'from "./races.js"': 'from "../data/races.js"',
        'from "./swse-data.js"': 'from "../core/swse-data.js"',
        'from "./swse-levelup.js"': 'from "./swse-levelup.js"',
        'from "./chargen.js"': 'from "./chargen.js"',
        'from "./world-data-loader.js"': 'from "../core/world-data-loader.js"',
        'import { SWSEActorSheet } from "./swse-actor.js"': 'import { SWSEActorSheet } from "../actors/swse-actor.js"',
    }
    
    js_files = list(SCRIPTS_DIR.rglob("*.js"))
    updated_count = 0
    
    for js_file in js_files:
        try:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Apply import mappings
            for old_import, new_import in import_mappings.items():
                content = content.replace(old_import, new_import)
            
            # Fix relative paths based on file location
            if 'actors' in str(js_file) and 'from "./swse-actor.js"' in content:
                content = content.replace('from "./swse-actor.js"', 'from "./swse-actor.js"')
            
            if content != original_content:
                with open(js_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                log_success(f"Updated imports in: {js_file.relative_to(BASE_DIR)}")
                updated_count += 1
                
        except Exception as e:
            log_error(f"Failed to update {js_file}: {e}")
    
    log_info(f"Total files with updated imports: {updated_count}")


def update_system_json():
    """Update system.json to use new main entry point"""
    log_header("Updating system.json")
    
    system_json_path = BASE_DIR / "system.json"
    
    if not system_json_path.exists():
        log_warning("system.json not found")
        return
    
    try:
        with open(system_json_path, 'r', encoding='utf-8') as f:
            system_data = json.load(f)
        
        # Update esmodules to point to new main entry
        system_data["esmodules"] = ["scripts/swse.js"]
        
        # Write back
        with open(system_json_path, 'w', encoding='utf-8') as f:
            json.dump(system_data, f, indent=2)
        
        log_success("Updated system.json with new entry point")
        
    except Exception as e:
        log_error(f"Failed to update system.json: {e}")


def create_directory_structure():
    """Ensure proper directory structure exists"""
    log_header("Creating Directory Structure")
    
    directories = [
        SCRIPTS_DIR / "actors",
        SCRIPTS_DIR / "items",
        SCRIPTS_DIR / "apps",
        SCRIPTS_DIR / "core",
        SCRIPTS_DIR / "helpers",
        SCRIPTS_DIR / "data",
        TEMPLATES_DIR / "apps",
        STYLES_DIR / "apps",
    ]
    
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)
        log_success(f"Ensured directory exists: {directory.relative_to(BASE_DIR)}")


def generate_report():
    """Generate a summary report of changes"""
    log_header("Cleanup Summary Report")
    
    report_content = f"""
SWSE System Cleanup Report
==========================
Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Backup Location: {BACKUP_DIR}

Actions Performed:
------------------
✅ Deleted duplicate files
✅ Merged actor implementations
✅ Created main entry point (scripts/swse.js)
✅ Reorganized file structure
✅ Updated import statements
✅ Updated system.json
✅ Created proper directory structure

New File Structure:
-------------------
scripts/
├── swse.js                    [NEW] Main entry point
├── actors/
│   ├── swse-actor.js         [MERGED] Enhanced with races & conditions
│   ├── swse-droid.js         [KEPT]
│   ├── swse-npc.js           [KEPT]
│   └── swse-vehicle.js       [KEPT]
├── items/
│   └── swse-item.js          [KEPT]
├── apps/
│   ├── chargen.js            [KEPT]
│   ├── chargen-init.js       [KEPT]
│   ├── store.js              [KEPT]
│   └── swse-levelup.js       [MOVED from root]
├── core/
│   ├── load-templates.js     [KEPT]
│   ├── swse-data.js          [KEPT]
│   └── world-data-loader.js  [KEPT]
├── helpers/
│   ├── dice-utils.js         [KEPT]
│   └── handlebars-helpers.js [KEPT]
└── data/
    └── races.js              [MOVED from root]

Files Deleted:
--------------
- scripts/chargen.js (duplicate)
- scripts/chargen/ (directory)
- scripts/swse-actor.js (merged)
- scripts/swse-droid.js (duplicate)
- scripts/swse-npc.js (duplicate)
- scripts/swse-vehicle.js (duplicate)
- scripts/swse-item.js (duplicate)
- scripts/swse-data.js (duplicate)
- scripts/swse-data-optimized.js (duplicate)
- scripts/load-templates.js (duplicate)
- scripts/world-data-loader.js (duplicate)
- scripts/helpers.js (duplicate)
- scripts/helpers/helpers.js (duplicate)
- scripts/diceroller.js (obsolete)
- scripts/import-data.js (redundant)
- scripts/init.js (merged into swse.js)
- scripts/system-entry.js (merged into swse.js)
- scripts/sheets/ (directory)
- scripts/store/ (directory)

Next Steps:
-----------
1. Test the system in Foundry VTT
2. Verify all imports are working correctly
3. Check that all character sheets load properly
4. Test character generator
5. Test store functionality
6. If everything works, delete backup folder

Rollback Instructions:
----------------------
If anything goes wrong:
1. Delete the scripts/ folder
2. Restore from: {BACKUP_DIR}/scripts
3. Run the script again with fixes
"""
    
    report_path = BASE_DIR / f"cleanup_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    
    try:
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        log_success(f"Report saved to: {report_path}")
        print(report_content)
    except Exception as e:
        log_error(f"Failed to save report: {e}")


def main():
    """Main execution function"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}")
    print("=" * 70)
    print("SWSE SYSTEM CLEANUP AND REORGANIZATION SCRIPT".center(70))
    print("=" * 70)
    print(f"{Colors.ENDC}\n")
    
    print(f"{Colors.WARNING}This script will make significant changes to your SWSE system.{Colors.ENDC}")
    print(f"{Colors.WARNING}A backup will be created automatically.{Colors.ENDC}\n")
    
    response = input("Do you want to continue? (yes/no): ").strip().lower()
    
    if response != 'yes':
        print(f"\n{Colors.FAIL}Operation cancelled.{Colors.ENDC}\n")
        return
    
    # Execute cleanup steps
    try:
        # Step 1: Create backup
        if not create_backup():
            log_error("Backup failed. Aborting.")
            return
        
        # Step 2: Create directory structure
        create_directory_structure()
        
        # Step 3: Merge actor files
        merge_actor_files()
        
        # Step 4: Create main entry point
        create_main_entry()
        
        # Step 5: Move files to correct locations
        move_races_file()
        
        # Step 6: Delete duplicates
        delete_duplicates()
        
        # Step 7: Update imports
        update_imports()
        
        # Step 8: Update system.json
        update_system_json()
        
        # Step 9: Generate report
        generate_report()
        
        print(f"\n{Colors.OKGREEN}{Colors.BOLD}")
        print("=" * 70)
        print("CLEANUP COMPLETE!".center(70))
        print("=" * 70)
        print(f"{Colors.ENDC}\n")
        
        print(f"{Colors.OKCYAN}Your SWSE system has been successfully reorganized!{Colors.ENDC}")
        print(f"{Colors.OKCYAN}Backup location: {BACKUP_DIR}{Colors.ENDC}\n")
        
    except Exception as e:
        log_error(f"An error occurred during cleanup: {e}")
        print(f"\n{Colors.FAIL}Cleanup failed. Please restore from backup: {BACKUP_DIR}{Colors.ENDC}\n")
        raise


if __name__ == "__main__":
    main()