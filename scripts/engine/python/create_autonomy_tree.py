#!/usr/bin/env python3
"""
CREATE AUTONOMY TALENT TREE

Creates the missing Autonomy Talent Tree for Independent Droid class.
Adds 7 talents to talents.db and creates tree entry in talent_trees.db.

Source: SWSE Force Unleashed Campaign Guide
"""

import json
import uuid
from pathlib import Path

BASE = Path("packs")

# Define the 7 Autonomy talents
AUTONOMY_TALENTS = [
    {
        "name": "Defensive Electronics",
        "benefit": "When someone tries to Reprogram you, add your Independent Droid Class Level to your Will Defense.",
        "description": "You defend your independence from all. When someone tries to Reprogram you, add your Independent Droid Class Level to your Will Defense.",
    },
    {
        "name": "Ion Resistance 10",
        "benefit": "You gain Damage Reduction 10 against Ion damage.",
        "description": "You gain Damage Reduction 10 against Ion damage.",
    },
    {
        "name": "Soft Reset",
        "benefit": "You are adept at rerouting your internal electronics. If you are moved to the bottom of the Condition Track by any means other than taking damage exceeding your Damage Threshold, you automatically move +1 step along the Condition Track after being disabled for 2 rounds.",
        "description": "You are adept at rerouting your internal electronics. If you are moved to the bottom of the Condition Track by any means other than taking damage exceeding your Damage Threshold, you automatically move +1 step along the Condition Track after being disabled for 2 rounds.",
    },
    {
        "name": "Modification Specialist",
        "benefit": "You have become skilled at Reprogramming and modifying your own Droid Systems. You do not incur the normal -5 penalty on Mechanics and Use Computer checks to Reprogram yourself or perform self-modifications.",
        "description": "You have become skilled at Reprogramming and modifying your own Droid Systems. You do not incur the normal -5 penalty on Mechanics and Use Computer checks to Reprogram yourself or perform self-modifications.",
    },
    {
        "name": "Repair Self",
        "benefit": "When you Repair yourself, you Repair 1 additional Hit Point for each point by which your Mechanics check exceeds the DC.",
        "description": "When you Repair yourself, you Repair 1 additional Hit Point for each point by which your Mechanics check exceeds the DC.",
    },
    {
        "name": "Just a Droid",
        "benefit": "You are adept at passing yourself off as an ordinary Droid. You can use each of the following Actions once per encounter.",
        "description": "You are adept at passing yourself off as an ordinary Droid. You can use each of the following Actions once per encounter: Just Another Droid (use Stealth when in plain sight), Just a Normal Droid (reroll Deception for Deceptive Appearance).",
        "prerequisites": [],
    },
    {
        "name": "Swift Droid",
        "benefit": "You move quickly when caught. You can make a Swift Action as a Reaction after failing a Deception check or a Stealth check.",
        "description": "You move quickly when caught. You can make a Swift Action as a Reaction after failing a Deception check or a Stealth check.",
        "prerequisites": [{"type": "talent", "value": "Any two Talents from the Autonomy Talent Tree"}],
    },
]

print("=" * 70)
print("CREATE AUTONOMY TALENT TREE")
print("=" * 70)

# Load existing data
print("\n[1/4] Loading existing data...")
talents = []
with open(BASE / "talents.db") as f:
    for line in f:
        if line.strip():
            talents.append(json.loads(line))

trees = []
with open(BASE / "talent_trees.db") as f:
    for line in f:
        if line.strip():
            trees.append(json.loads(line))

print(f"  ✓ Loaded {len(talents)} talents, {len(trees)} trees")

# Create new talent entries
print("\n[2/4] Creating Autonomy talents...")
autonomy_talent_ids = []

for talent_data in AUTONOMY_TALENTS:
    talent_id = str(uuid.uuid4())

    talent = {
        "_id": talent_id,
        "name": talent_data["name"],
        "type": "talent",
        "img": "icons/svg/item-bag.svg",
        "system": {
            "talent_tree": "Autonomy",
            "benefit": talent_data.get("benefit", ""),
            "description": talent_data.get("description", ""),
            "prerequisites": talent_data.get("prerequisites", []),
            "class": "Independent Droid",
            "category": "Independent Droid",
            "tree": "Autonomy",
        },
        "effects": [],
        "folder": None,
        "sort": 0,
        "ownership": {"default": 0},
        "flags": {}
    }

    talents.append(talent)
    autonomy_talent_ids.append(talent_id)
    print(f"  + {talent_data['name']} ({talent_id})")

print(f"  ✓ Created {len(autonomy_talent_ids)} talents")

# Create tree entry
print("\n[3/4] Creating Autonomy tree...")
autonomy_tree_id = str(uuid.uuid4())

autonomy_tree = {
    "_id": autonomy_tree_id,
    "name": "Autonomy",
    "type": "talenttree",
    "img": "icons/svg/item-bag.svg",
    "system": {
        "talent_tree": "Autonomy",
        "description": "You are able to resist any attempts to curb your independence and can fight back against anyone that tries to suppress your personality.",
        "talentIds": autonomy_talent_ids,
        "tags": ["droid"],  # Add droid tag since it's droid-exclusive
        "costNumeric": None,
    },
    "effects": [],
    "folder": None,
    "sort": 0,
    "ownership": {"default": 0},
    "flags": {}
}

trees.append(autonomy_tree)
print(f"  ✓ Created Autonomy tree ({autonomy_tree_id})")
print(f"    - talentIds: {len(autonomy_talent_ids)} talents")
print(f"    - tags: ['droid']")

# Update Independent Droid class to add autonomy
print("\n[4/4] Updating Independent Droid class...")
with open(BASE / "classes.db") as f:
    classes = [json.loads(line) for line in f if line.strip()]

for cls in classes:
    if cls.get("name") == "Independent Droid":
        # Add autonomy to talentTreeIds
        tree_ids = cls.get("system", {}).get("talentTreeIds", [])
        if "autonomy" not in tree_ids:
            tree_ids.append("autonomy")
            cls["system"]["talentTreeIds"] = tree_ids
            print(f"  ✓ Updated Independent Droid")
            print(f"    - talentTreeIds: {tree_ids}")
        break

# Save all data
print("\nSaving data...")
with open(BASE / "talents.db", "w") as f:
    for talent in talents:
        f.write(json.dumps(talent) + "\n")
print("  ✓ Saved talents.db")

with open(BASE / "talent_trees.db", "w") as f:
    for tree in trees:
        f.write(json.dumps(tree) + "\n")
print("  ✓ Saved talent_trees.db")

with open(BASE / "classes.db", "w") as f:
    for cls in classes:
        f.write(json.dumps(cls) + "\n")
print("  ✓ Saved classes.db")

print("\n" + "=" * 70)
print("✅ AUTONOMY TALENT TREE CREATED")
print("=" * 70)
print(f"Talents created: {len(autonomy_talent_ids)}")
print(f"Tree ID: autonomy")
print(f"Independent Droid now has full access to:")
print(f"  - specialized_droid")
print(f"  - elite_droid")
print(f"  - autonomy (NEW)")
