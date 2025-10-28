#!/usr/bin/env python3
"""
Vehicle Database Cleanup Script
Standardizes vehicle entries, creates readable IDs, and converts to proper format
"""

import os
import json
import glob
import re
from pathlib import Path

REPO_PATH = r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse"

def slugify(text):
    """Convert text to a URL-friendly slug for IDs"""
    # Convert to lowercase
    text = text.lower()
    # Replace spaces and special chars with hyphens
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    # Remove leading/trailing hyphens
    text = text.strip('-')
    return text

def generate_vehicle_id(name):
    """Generate a readable ID from vehicle name"""
    slug = slugify(name)
    # Prefix with 'veh-' for vehicle
    return f"veh-{slug}"

def clean_weapons(weapons_list):
    """Clean up weapons array - remove category entries"""
    if not weapons_list:
        return []
    
    cleaned = []
    skip_terms = ['categories', 'vehicles', 'planetary', 'ground', 'speeders', 
                  'add category', 'starship', 'starfighters', 'capital ships']
    
    for weapon in weapons_list:
        if isinstance(weapon, dict):
            name = weapon.get('name', '').lower().strip()
            # Skip if it's a category entry
            if name and not any(term in name for term in skip_terms) and name != '':
                cleaned.append(weapon)
        elif isinstance(weapon, str) and weapon.strip():
            # If it's just a string, convert to dict
            cleaned.append({'name': weapon.strip()})
    
    return cleaned

def parse_passengers_cargo(passenger_str):
    """Separate passengers from cargo if combined"""
    if not passenger_str:
        return None, None
    
    passenger_str = str(passenger_str)
    
    if 'Cargo:' in passenger_str or 'cargo:' in passenger_str:
        parts = re.split(r'[Cc]argo:', passenger_str)
        passengers = parts[0].strip()
        cargo = parts[1].strip() if len(parts) > 1 else None
        return passengers, cargo
    
    return passenger_str, None

def convert_json_to_db_format(json_entry):
    """Convert vehicles.json format to .db format"""
    
    # Generate readable ID
    vehicle_id = generate_vehicle_id(json_entry.get('name', 'unknown'))
    
    # Parse passengers and cargo
    passengers_raw = json_entry.get('passengers', '')
    passengers, cargo_from_passengers = parse_passengers_cargo(passengers_raw)
    
    # Get cargo capacity (prefer explicit, fall back to parsed)
    cargo_capacity = json_entry.get('cargo_capacity') or cargo_from_passengers or ''
    
    # Clean weapons
    weapons = clean_weapons(json_entry.get('weapons', []))
    
    # Get defenses
    defenses = json_entry.get('defenses', {})
    
    # Build the standardized entry
    entry = {
        "_id": vehicle_id,
        "name": json_entry.get('name', ''),
        "type": "vehicle",  # Changed from equipment
        "img": json_entry.get('img', 'icons/svg/item-bag.svg'),
        "system": {
            "name": json_entry.get('name', ''),
            "type": json_entry.get('vehicle_type', 'Vehicle'),
            "size": json_entry.get('size', 'Large'),
            "tags": json_entry.get('tags', ['vehicle']),
            
            # Crew
            "crew": json_entry.get('crew_size', '1 (skilled)'),
            "passengers": passengers,
            "crewPositions": {
                "pilot": None,
                "copilot": None,
                "gunner": None,
                "engineer": None,
                "shields": None,
                "commander": None
            },
            
            # Cargo & Resources
            "cargo_capacity": cargo_capacity,
            "consumables": json_entry.get('consumables', '1 Day'),
            
            # Performance
            "speed": json_entry.get('speed', ''),
            "max_velocity": json_entry.get('max_velocity'),
            "maneuver": json_entry.get('maneuver', '+0'),
            "initiative": json_entry.get('initiative', '+0'),
            
            # Hull & Shields
            "hull": {
                "value": json_entry.get('hit_points', 0),
                "max": json_entry.get('hit_points', 0)
            },
            "shields": {
                "value": 0,
                "max": json_entry.get('shield_rating', 0)
            },
            
            # Defense Stats
            "reflexDefense": defenses.get('reflex', 15),
            "flatFooted": defenses.get('flat_footed', 12),
            "fortitudeDefense": defenses.get('fortitude', 18),
            "damageThreshold": json_entry.get('damage_threshold', 20),
            "damageReduction": json_entry.get('damage_reduction', 5),
            
            # Combat
            "baseAttackBonus": json_entry.get('base_attack_bonus', '+0'),
            "weapons": weapons,
            
            # Systems
            "senses": json_entry.get('senses', 'Standard sensors'),
            "hyperdrive_class": json_entry.get('hyperdrive_class'),
            "backup_class": json_entry.get('backup_class'),
            "carried_craft": json_entry.get('carried_craft'),
            
            # Cost
            "cost": json_entry.get('cost', {"new": 0, "used": 0}),
            
            # Meta
            "sourcebook": json_entry.get('sourcebook'),
            "page": json_entry.get('page'),
            "description": json_entry.get('description', ''),
            "crewNotes": ''
        },
        "effects": [],
        "folder": None,
        "sort": 0,
        "ownership": {"default": 0},
        "flags": {}
    }
    
    return entry

def standardize_db_entry(db_entry):
    """Standardize an existing .db entry"""
    
    # Generate readable ID from name
    if 'name' in db_entry:
        new_id = generate_vehicle_id(db_entry['name'])
        db_entry['_id'] = new_id
    
    # Change type to vehicle
    if db_entry.get('type') == 'equipment':
        db_entry['type'] = 'vehicle'
    
    # Ensure all required fields exist in system
    if 'system' in db_entry:
        system = db_entry['system']
        
        # Add missing crew positions
        if 'crewPositions' not in system or not isinstance(system['crewPositions'], dict):
            system['crewPositions'] = {
                "pilot": None,
                "copilot": None,
                "gunner": None,
                "engineer": None,
                "shields": None,
                "commander": None
            }
        else:
            # Ensure all positions exist
            positions = system['crewPositions']
            for pos in ['pilot', 'copilot', 'gunner', 'engineer', 'shields', 'commander']:
                if pos not in positions:
                    positions[pos] = None
        
        # Clean weapons
        if 'weapons' in system:
            system['weapons'] = clean_weapons(system['weapons'])
        
        # Ensure type field exists
        if 'type' not in system:
            system['type'] = 'Vehicle'
        
        # Ensure size exists
        if 'size' not in system:
            system['size'] = 'Large'
    
    return db_entry

def process_json_file(json_path):
    """Process a vehicles.json file"""
    print(f"\nProcessing JSON: {os.path.basename(json_path)}")
    
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Handle both single object and array
        if isinstance(data, dict):
            entries = [data]
        elif isinstance(data, list):
            entries = data
        else:
            print(f"  ✗ Unknown JSON structure")
            return
        
        # Convert each entry
        converted = []
        for entry in entries:
            if 'name' in entry:  # Only process if it has a name
                converted.append(convert_json_to_db_format(entry))
        
        # Write as .db format (one line per entry)
        output_path = json_path.replace('.json', '.db')
        with open(output_path, 'w', encoding='utf-8') as f:
            for entry in converted:
                f.write(json.dumps(entry, separators=(',', ':')) + '\n')
        
        print(f"  ✓ Converted {len(converted)} entries")
        print(f"  ✓ Saved to: {os.path.basename(output_path)}")
        
    except Exception as e:
        print(f"  ✗ Error: {e}")

def process_db_file(db_path):
    """Process a .db file to standardize entries"""
    print(f"\nProcessing DB: {os.path.basename(db_path)}")
    
    try:
        entries = []
        
        # Read all entries
        with open(db_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        entry = json.loads(line)
                        # Standardize the entry
                        entry = standardize_db_entry(entry)
                        entries.append(entry)
                    except json.JSONDecodeError as e:
                        print(f"  ✗ Failed to parse line: {e}")
        
        # Write back
        with open(db_path, 'w', encoding='utf-8') as f:
            for entry in entries:
                f.write(json.dumps(entry, separators=(',', ':')) + '\n')
        
        print(f"  ✓ Standardized {len(entries)} entries")
        
        # Show some example IDs
        if entries:
            print(f"  Example IDs:")
            for entry in entries[:3]:
                print(f"    • {entry['_id']} ({entry['name']})")
        
    except Exception as e:
        print(f"  ✗ Error: {e}")

def main():
    print("=" * 70)
    print("VEHICLE DATABASE CLEANUP & STANDARDIZATION")
    print("=" * 70)
    
    # Find all vehicle-related files
    json_files = []
    db_files = []
    
    # Search for files
    packs_dir = os.path.join(REPO_PATH, "packs")
    if os.path.exists(packs_dir):
        json_files = glob.glob(os.path.join(packs_dir, "**", "vehicles*.json"), recursive=True)
        json_files.extend(glob.glob(os.path.join(packs_dir, "**", "*vehicle*.json"), recursive=True))
        json_files.extend(glob.glob(os.path.join(packs_dir, "**", "*ship*.json"), recursive=True))
        
        db_files = glob.glob(os.path.join(packs_dir, "**", "vehicles*.db"), recursive=True)
        db_files.extend(glob.glob(os.path.join(packs_dir, "**", "*vehicle*.db"), recursive=True))
        db_files.extend(glob.glob(os.path.join(packs_dir, "**", "*ship*.db"), recursive=True))
        db_files.extend(glob.glob(os.path.join(packs_dir, "**", "equipment*.db"), recursive=True))
    
    # Also check data directory
    data_dir = os.path.join(REPO_PATH, "data")
    if os.path.exists(data_dir):
        json_files.extend(glob.glob(os.path.join(data_dir, "**", "*.json"), recursive=True))
    
    # Remove duplicates
    json_files = list(set(json_files))
    db_files = list(set(db_files))
    
    print(f"\nFound {len(json_files)} JSON files")
    print(f"Found {len(db_files)} DB files")
    
    # Process JSON files (convert to DB format)
    if json_files:
        print("\n" + "=" * 70)
        print("CONVERTING JSON FILES TO DB FORMAT")
        print("=" * 70)
        for json_file in json_files:
            process_json_file(json_file)
    
    # Process DB files (standardize)
    if db_files:
        print("\n" + "=" * 70)
        print("STANDARDIZING DB FILES")
        print("=" * 70)
        for db_file in db_files:
            process_db_file(db_file)
    
    print("\n" + "=" * 70)
    print("CLEANUP COMPLETE")
    print("=" * 70)
    print("\nChanges made:")
    print("  • IDs changed to readable format (e.g., 'veh-74-z-speeder-bike')")
    print("  • Type changed from 'equipment' to 'vehicle'")
    print("  • All entries formatted as single lines")
    print("  • Weapons cleaned (removed category entries)")
    print("  • Passengers and cargo separated")
    print("  • All crew positions added")
    print("  • JSON files converted to DB format")
    print("\nYou can now use these files in Foundry VTT")

if __name__ == "__main__":
    main()