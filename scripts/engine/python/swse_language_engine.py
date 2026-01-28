"""
swse_language_engine.py

Automatically loads:
 - species language data from foundryvtt-swse/data/species-languages.json
 - full choosable language list from foundryvtt-swse/data/languages.json

Supports:
 - Basic language logic
 - Species language rules (read dynamically)
 - Understand-only species
 - INT-mod language bonus
 - Linguist feat (multiple stacks, RAW)
 - Choosable language pool
 - CLI language picker (optional)
"""

import json
import os
import sys
from typing import Dict, List, Set


# ============================================================
# 1. LOAD DATA FROM MODULE FOLDERS
# ============================================================

def load_json(path: str) -> Dict:
    if not os.path.exists(path):
        raise FileNotFoundError(f"Language data not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_master_data(
    species_path="data/species-languages.json",
    languages_path="data/languages.json"
) -> Dict:
    """
    Loads:
      - SPECIES_LANGUAGES from species-languages.json
      - CHOOSABLE_LANGUAGES from languages.json
    """
    species_data = load_json(species_path)
    languages_data = load_json(languages_path)

    # Extract all languages from categories
    all_languages = []
    if "categories" in languages_data:
        for category in languages_data["categories"].values():
            all_languages.extend(category.get("languages", []))

    # Remove duplicates and sort
    all_languages = sorted(set(all_languages))

    master = {
        "SPECIES_LANGUAGES": species_data,
        "CHOOSABLE_LANGUAGES": all_languages
    }
    return master


# ============================================================
# 2. CHOOSABLE POOL LOGIC
# ============================================================

def build_choosable_pool(master: Dict) -> List[str]:
    pool = master["CHOOSABLE_LANGUAGES"]
    return sorted(set(pool), key=lambda x: (0 if x == "Basic" else 1, x.lower()))


# ============================================================
# 3. LANGUAGE ASSIGNMENT ENGINE
# ============================================================

def assign_languages(
    species: str,
    int_mod: int,
    master: Dict,
    linguist_feat_count: int = 0
) -> Dict:
    """
    Dynamically assigns:
      - Species languages (from JSON)
      - Basic (unless species prohibits)
      - Understand-only languages (from JSON)
      - INT bonus languages
      - Linguist feat (1 + INT mod per instance)
    """

    species_map = master["SPECIES_LANGUAGES"]
    species_data = species_map.get(species, species_map.get("Human", {"languages": ["Basic"], "canSpeakAll": True}))

    known = set()
    understands_only = set()

    # Species languages
    for lang in species_data.get("languages", []):
        known.add(lang)

    # Basic (unless species forbids)
    if species_data.get("canSpeakAll", True):
        known.add("Basic")

    # Understand-only languages
    for u in species_data.get("understands", []):
        understands_only.add(u)

    # INT bonus languages
    int_bonus = max(0, int_mod)

    # Linguist Feat (RAW)
    per_feat = max(1, 1 + int_mod)
    linguist_bonus = linguist_feat_count * per_feat

    # Total bonus language slots
    bonus_slots = int_bonus + linguist_bonus

    # Choosable pool filtering
    choosable = set(build_choosable_pool(master))
    choosable -= known

    return {
        "known": sorted(known),
        "understands_only": sorted(understands_only),
        "bonus_slots": bonus_slots,
        "choosable": sorted(choosable),
        "int_bonus": int_bonus,
        "linguist_bonus": linguist_bonus,
        "linguist_feat_count": linguist_feat_count
    }


# ============================================================
# 4. APPLY CHOSEN LANGUAGES
# ============================================================

def apply_player_choices(base: Dict, chosen: List[str]) -> Dict:
    if len(chosen) > base["bonus_slots"]:
        raise ValueError("Too many chosen languages.")

    for lang in chosen:
        if lang not in base["choosable"]:
            raise ValueError(f"Invalid choice: {lang}")

    final = sorted(set(base["known"]) | set(chosen))

    return {
        "languages": final,
        "understands_only": base["understands_only"]
    }


# ============================================================
# 5. CLI PICKER (Optional)
# ============================================================

def cli_pick_languages(choosable: List[str], slots: int) -> List[str]:
    if slots == 0:
        return []

    print(f"\nChoose {slots} bonus language(s):")
    for idx, lang in enumerate(choosable, 1):
        print(f"{idx}. {lang}")

    chosen = []
    while len(chosen) < slots:
        try:
            val = int(input(f"Pick {len(chosen)+1}/{slots}: ")) - 1
            if val < 0 or val >= len(choosable):
                print("Invalid selection.")
                continue
            if choosable[val] in chosen:
                print("Already selected.")
                continue
            chosen.append(choosable[val])
        except:
            print("Enter a valid number.")
    return chosen


# ============================================================
# 6. COMPLETE AUTOMATION PIPELINE
# ============================================================

def build_character_languages(
    species: str,
    int_mod: int,
    linguist_feat_count: int = 0,
    auto_pick: bool = False,
    species_path="data/species-languages.json",
    languages_path="data/languages.json"
) -> Dict:
    """
    Loads data dynamically and runs full language assignment.
    """

    master = load_master_data(species_path, languages_path)

    assignment = assign_languages(
        species,
        int_mod,
        master,
        linguist_feat_count=linguist_feat_count
    )

    # Automatically pick OR ask the user
    if auto_pick:
        chosen = assignment["choosable"][:assignment["bonus_slots"]]
    else:
        chosen = cli_pick_languages(assignment["choosable"], assignment["bonus_slots"])

    return apply_player_choices(assignment, chosen)


# ============================================================
# 7. STANDALONE EXECUTION
# ============================================================

if __name__ == "__main__":
    print("\n=== SWSE Automatic Language System (Dynamic) ===\n")

    species = input("Species: ").strip()
    int_mod = int(input("Intelligence modifier: "))
    linguist_feat_count = int(input("Times Linguist feat taken: "))

    result = build_character_languages(species, int_mod, linguist_feat_count, auto_pick=False)

    print("\n=== RESULTING LANGUAGES ===")
    print("Speaks:", ", ".join(result["languages"]))
    if result["understands_only"]:
        print("Understands Only:", ", ".join(result["understands_only"]))
    print("============================================\n")
