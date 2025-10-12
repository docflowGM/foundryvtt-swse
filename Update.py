import os
import shutil
from pathlib import Path

# ======================================
# CONFIGURATION
# ======================================
REPO_PATH = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")
PACKS_PATH = REPO_PATH / "packs"

# Mapping of desired compendium names
TARGET_FILES = {
    "classes": "classes.db",
    "npc-classes": "npc-classes.db",
    "prestige-classes": "prestige-classes.db",
    "talents": "talents.db",
    "feats": "feats.db",
    "species": "species.db",
    "equipment": "equipment.db",
    "weapons": "weapons.db",
    "armor": "armor.db",
    "force-powers": "force-powers.db",
    "vehicles": "vehicles.db",
    "npc": "npc.db"
}

# ======================================
# CLEANUP LOGIC
# ======================================
def clean_packs_folder():
    """Normalize and clean duplicate or misnamed .db files in /packs."""
    print("🔧 Cleaning and organizing packs folder...")
    PACKS_PATH.mkdir(exist_ok=True)

    # Collect all .db files
    db_files = list(PACKS_PATH.rglob("*.db"))
    print(f"Found {len(db_files)} .db files.")

    # Step 1. Move nested files (e.g., armor/heavy.db → packs/armor.db)
    armor_subdir = PACKS_PATH / "armor"
    if armor_subdir.exists():
        armor_merged = PACKS_PATH / "armor.db"
        with open(armor_merged, "wb") as merged:
            for file in armor_subdir.glob("*.db"):
                print(f"🧩 Merging armor file: {file.name}")
                with open(file, "rb") as src:
                    shutil.copyfileobj(src, merged)
        shutil.rmtree(armor_subdir)
        print("✅ Armor subdirectory merged into armor.db")

    # Step 2. Delete duplicates (swse-*, *-db.db, etc.)
    for db in db_files:
        name = db.name.lower()
        if name.startswith("swse-") or "-db.db" in name:
            print(f"🗑 Removing duplicate or invalid file: {db.name}")
            db.unlink(missing_ok=True)

    # Step 3. Rename known incorrect files
    rename_map = {
        "forcepowers.db": "force-powers.db",
        "droids.db": "npc.db"
    }
    for old_name, new_name in rename_map.items():
        old_path = PACKS_PATH / old_name
        new_path = PACKS_PATH / new_name
        if old_path.exists():
            print(f"✏️ Renaming {old_name} → {new_name}")
            old_path.rename(new_path)

    # Step 4. Ensure all required .db files exist
    for _, filename in TARGET_FILES.items():
        file_path = PACKS_PATH / filename
        if not file_path.exists():
            print(f"📄 Creating empty {filename}")
            file_path.touch()

    print("✅ Pack cleanup complete!\n")


# ======================================
# UPDATE SYSTEM.JSON
# ======================================
def update_system_json():
    """Inject proper 'packs' list into system.json"""
    import json

    system_json = REPO_PATH / "system.json"
    if not system_json.exists():
        print("❌ system.json not found.")
        return

    print("📝 Updating system.json with clean 'packs' list...")

    with open(system_json, "r", encoding="utf-8") as f:
        data = json.load(f)

    packs_list = [
        { "name": k, "label": k.replace("-", " ").title(), "path": f"packs/{v}",
          "type": "Item" if k not in ["vehicles", "npc"] else "Actor",
          "system": "swse" }
        for k, v in TARGET_FILES.items()
    ]
    data["packs"] = packs_list

    with open(system_json, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print("✅ system.json successfully updated.\n")


# ======================================
# MAIN
# ======================================
if __name__ == "__main__":
    print("🚀 Starting SWSE Pack Cleanup Utility...")
    clean_packs_folder()
    update_system_json()
    print("🎉 Done! Your /packs folder and system.json are now fully aligned and clean.")
