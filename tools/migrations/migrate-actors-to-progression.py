#!/usr/bin/env python3
"""
migrate-actors-to-progression.py

Scans a repo for Actor JSON exports and injects a minimal system.progression object if missing.
Use for repo-contained actor JSON files only. Does not touch Foundry DB.
"""
import os, json
REPO = r"C:\\Users\\Owner\\Documents\\GitHub\\foundryvtt-swse"

def safe_load_json(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print("skip", path, e)
        return None

def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("updated", path)

def ensure_progression(actor):
    system = actor.get("system", {})
    if system.get("progression") is None:
        prog = {}
        species = system.get("species") or system.get("details", {}).get("race")
        background = system.get("background") or system.get("details", {}).get("background")
        if species: prog["species"] = species
        if background: prog["background"] = background
        abilities = {}
        for k in ["str","dex","con","int","wis","cha"]:
            v = system.get("abilities", {}).get(k, {}).get("value")
            if v is not None:
                abilities[k] = v
        if abilities: prog["abilities"] = abilities
        # items with type 'class' -> classLevels
        classLevels = []
        for it in actor.get("items", []):
            t = it.get("type")
            if t and t.lower() in ("class","career","profession"):
                lvl = it.get("system", {}).get("level", 1)
                classLevels.append({"class": it.get("name"), "level": lvl})
        if classLevels: prog["classLevels"] = classLevels
        actor.setdefault("system", {})["progression"] = prog
        return True
    return False

def main():
    files = []
    for root, dirs, fs in os.walk(REPO):
        for f in fs:
            if f.endswith(".json") and ("actors" in root.lower() or "packs" in root.lower() or "actor" in f.lower()):
                files.append(os.path.join(root,f))
    print("Found", len(files), "candidate json files")
    for p in files:
        data = safe_load_json(p)
        if not data: continue
        changed = False
        if isinstance(data, dict) and data.get("type") == "Actor":
            if ensure_progression(data):
                changed = True
        elif isinstance(data, dict) and data.get("entries"):
            for e in data.get("entries"):
                if isinstance(e, dict) and e.get("type") == "Actor":
                    if ensure_progression(e):
                        changed = True
        elif isinstance(data, list):
            for e in data:
                if isinstance(e, dict) and e.get("type") == "Actor":
                    if ensure_progression(e):
                        changed = True
        if changed:
            write_json(p, data)
    print("Done.")

if __name__ == '__main__':
    main()
