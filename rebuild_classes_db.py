import json
import os
import uuid
import shutil

# === CONFIGURATION ===
BASE_DIR = r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse"

PACKS = {
    "classes": {"json": os.path.join(BASE_DIR, "data", "classes.json")},
    "species": {"json": os.path.join(BASE_DIR, "data", "species.json")},
    "feats": {"json": os.path.join(BASE_DIR, "data", "feats.json")},
    "talents": {"json": os.path.join(BASE_DIR, "data", "talents.json")},
}

PACK_DIR = os.path.join(BASE_DIR, "packs")
os.makedirs(PACK_DIR, exist_ok=True)

def normalize_entry(name, entry_type, data):
    """Wraps the entry in FoundryVTT format"""
    # If the JSON has no 'system' key, treat the full object as system data
    if "system" in data:
        sys_data = data["system"]
    else:
        sys_data = data

    # Remove duplicate nesting if necessary
    for key in ["_id", "type", "name"]:
        sys_data.pop(key, None)

    return {
        "_id": str(uuid.uuid4()),
        "name": name.strip() if name else "Unnamed",
        "type": entry_type,
        "img": "icons/svg/book.svg",
        "system": sys_data
    }

def rebuild_compendium(key, entry_type):
    json_path = PACKS[key]["json"]
    db_path = os.path.join(PACK_DIR, f"{key}.db")
    backup_path = db_path + ".bak"

    if not os.path.exists(json_path):
        print(f"⚠️  Missing JSON for {key}: {json_path}")
        return

    # Backup old DB
    if os.path.exists(db_path):
        shutil.copy2(db_path, backup_path)
        print(f"✅ Backed up old {key}.db to {backup_path}")

    # Load JSON
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"❌ Failed to load {json_path}: {e}")
        return

    # Convert dict to list if needed
    if isinstance(data, dict):
        items = []
        for k, v in data.items():
            if isinstance(v, dict):
                v["name"] = v.get("name", k)
                items.append(v)
        data = items

    valid_entries = []
    for entry in data:
        name = entry.get("name") or entry.get("Name") or "Unnamed"
        valid_entries.append(normalize_entry(name, entry_type, entry))

    # Write to .db (one object per line)
    try:
        with open(db_path, "w", encoding="utf-8") as f:
            for e in valid_entries:
                f.write(json.dumps(e, ensure_ascii=False) + "\n")
        print(f"✅ Rebuilt {key}.db with {len(valid_entries)} entries.")
    except Exception as e:
        print(f"❌ Failed to write {key}.db: {e}")

# === EXECUTE REBUILD ===
print("🔧 Rebuilding all SWSE compendiums...\n")

rebuild_compendium("classes", "class")
rebuild_compendium("species", "species")
rebuild_compendium("feats", "feat")
rebuild_compendium("talents", "talent")

print("\n🎉 All compendiums rebuilt successfully!")
print("➡️ Reload Foundry (F5) and test Character Generator.")
print("   - Classes, Species, Feats, and Talents should now appear correctly.")
