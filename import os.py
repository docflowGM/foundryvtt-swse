import json
import os
import hashlib
from pathlib import Path

repo_path = r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse"

def generate_id(name):
    """Generate a consistent 16-character ID from name"""
    return hashlib.md5(name.encode()).hexdigest()[:16]

def transform_vehicle(entry):
    """Transform vehicle data to match schema and Foundry v13 requirements"""
    system = entry.get("system", {})
    
    # Create new system structure
    new_system = {
        "name": system.get("name"),
        "type": system.get("vehicle_type"),
        "tags": system.get("tags", []),
        "crew": system.get("crew_size"),
        "passengers": system.get("passengers"),
        "cargo_capacity": system.get("cargo_capacity"),
        "consumables": system.get("consumables"),
        "speed": system.get("speed"),
        "maneuver": system.get("maneuver"),
        "carried_craft": system.get("carried_craft"),
        "hyperdrive_class": system.get("hyperdrive_class"),
        "backup_class": system.get("backup_class"),
        "cost": system.get("cost", {}),
        "sourcebook": system.get("sourcebook"),
        "page": system.get("page")
    }
    
    # Transform defenses
    defenses = system.get("defenses", {})
    new_system["reflexDefense"] = defenses.get("reflex")
    new_system["flatFooted"] = defenses.get("flat_footed")
    new_system["fortitudeDefense"] = defenses.get("fortitude")
    
    # Transform HP and damage values
    new_system["HP"] = system.get("hit_points")
    new_system["damageReduction"] = system.get("damage_reduction")
    new_system["damageThreshold"] = system.get("damage_threshold")
    
    # Transform weapons array
    weapons = system.get("weapons")
    if weapons and isinstance(weapons, list):
        new_weapons = []
        for weapon in weapons:
            if isinstance(weapon, dict) and weapon.get("name") not in [
                "Categories :", "Vehicles", "Planetary Vehicles", 
                "Ground Vehicles", "Speeders", "Add category",
                "Starships", "Space Stations", "The Mandalorians",
                "Mandalorian Vehicles", "Web Enhancements"
            ]:
                new_weapons.append(weapon)
        new_system["weapons"] = new_weapons if new_weapons else []
    else:
        new_system["weapons"] = []
    
    # Initialize crew positions for game system
    new_system["crewPositions"] = {
        "pilot": None,
        "shields": None,
        "engineer": None
    }
    
    # Initialize hull (for character sheet)
    hp = new_system["HP"]
    new_system["hull"] = {
        "value": hp if hp else 0,
        "max": hp if hp else 0
    }
    
    # Clean up None values
    new_system = {k: v for k, v in new_system.items() if v is not None}
    
    # Foundry v13 structure
    name = entry.get("name")
    return {
        "_id": entry.get("_id", generate_id(name)),
        "name": name,
        "type": entry.get("type", "vehicle"),
        "img": entry.get("img", "icons/svg/upgrade.svg"),
        "system": new_system,
        "effects": [],
        "folder": None,
        "sort": 0,
        "ownership": {"default": 0},
        "flags": {}
    }

# Process all .db files
for db_file in Path(repo_path).rglob("*.db"):
    print(f"Processing: {db_file}")
    
    entries = []
    with open(db_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    entry = json.loads(line)
                    transformed = transform_vehicle(entry)
                    entries.append(transformed)
                except json.JSONDecodeError as e:
                    print(f"Warning: Could not parse line in {db_file}: {e}")
    
    # Write back as single-line entries
    with open(db_file, 'w', encoding='utf-8') as f:
        for entry in entries:
            f.write(json.dumps(entry, ensure_ascii=False) + '\n')
    
    print(f"Completed: {db_file} ({len(entries)} entries)")

print("\nAll .db files processed and transformed!")