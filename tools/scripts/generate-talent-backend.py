#!/usr/bin/env python3
# ======================================================================
# SWSE Talent System Generator Script
# COMPLETE (Parts 1-4 Assembled)
#
# Generates the complete backend talent engine for the FoundryVTT SWSE
# system, including:
#   - TalentNode.js
#   - TalentTreeGraph.js
#   - PrerequisiteEnricher.js
#   - RuleEngine.js
#   - TalentTreeRegistry.js
#   - Updated talent-registry-ui.js
#   - init-talents.js
#   - system.json ES module patching (auto-backup)
# ======================================================================

import os
import json
import datetime
import shutil

# ======================================================================
# PART 1 OF 4
# ======================================================================

# ------------------------------------------------------------
# CONFIGURATION CONSTANTS
# ------------------------------------------------------------

ROOT_DIR = "."               # project root
SYSTEM_JSON_PATH = "./system.json"
TALENT_DIR = "./scripts/progression/talents"
PROGRESSION_DIR = "./scripts/progression"
APPS_DIR = "./scripts/apps"
UTILS_DIR = "./scripts/progression/utils"

# This dictionary will be filled in Part 2 + Part 3 with JS source text.
JS_FILES = {}

# ------------------------------------------------------------
# UTILITY: ENSURE DIRECTORY EXISTS
# ------------------------------------------------------------

def ensure_dir(path):
    """
    Creates the directory if it does not already exist.
    """
    if not os.path.exists(path):
        print(f"[DIR] Creating directory: {path}")
        os.makedirs(path, exist_ok=True)
    else:
        print(f"[DIR] OK: {path}")

# ------------------------------------------------------------
# UTILITY: WRITE FILE SAFELY
# ------------------------------------------------------------

def write_file(path, content):
    """
    Writes a file to disk, ensuring parent directories exist.
    Overwrites safely, reporting status.
    """
    ensure_dir(os.path.dirname(path))

    # If file exists, create a timestamped backup.
    if os.path.exists(path):
        timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        backup_path = f"{path}.bak.{timestamp}"
        shutil.copy2(path, backup_path)
        print(f"[BACKUP] Existing file backed up to: {backup_path}")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"[WRITE] {path} written successfully.")

# ------------------------------------------------------------
# UTILITY: BACKUP system.json
# ------------------------------------------------------------

def backup_system_json():
    """
    Makes a timestamped backup of system.json before editing.
    """
    if not os.path.exists(SYSTEM_JSON_PATH):
        raise FileNotFoundError("system.json not found at project root!")

    timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = f"{SYSTEM_JSON_PATH}.bak.{timestamp}"

    shutil.copy2(SYSTEM_JSON_PATH, backup_path)
    print(f"[SYSTEM.JSON] Backup created → {backup_path}")

    return backup_path

# ------------------------------------------------------------
# UTILITY: LOAD system.json
# ------------------------------------------------------------

def load_system_json():
    if not os.path.exists(SYSTEM_JSON_PATH):
        raise FileNotFoundError("system.json not found at ROOT")

    with open(SYSTEM_JSON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

# ------------------------------------------------------------
# UTILITY: SAVE system.json
# ------------------------------------------------------------

def save_system_json(system_data):
    """
    Saves the given JSON structure back into system.json.
    """
    with open(SYSTEM_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(system_data, f, indent=2)

    print("[SYSTEM.JSON] Updated successfully.")

# ------------------------------------------------------------
# HELPER: ESCAPE JS CONTENT FOR PYTHON TRIPLE STRINGS
# ------------------------------------------------------------

def normalize_js(js_text):
    """
    Ensures JS content has correct line endings and no stray invisible characters.
    """
    return js_text.replace("\r\n", "\n").replace("\r", "\n")

# ------------------------------------------------------------
# PLACEHOLDER STRUCTURE (FILLED IN PART 2 + PART 3)
# ------------------------------------------------------------

def register_js_file(name, js_source):
    """
    Registers a JS source file for generation.
    """
    JS_FILES[name] = normalize_js(js_source)
    print(f"[REGISTER] Queued JS file: {name}")

# ------------------------------------------------------------
# STEP: CREATE ALL DIRECTORIES
# ------------------------------------------------------------

def create_all_directories():
    ensure_dir(TALENT_DIR)
    ensure_dir(PROGRESSION_DIR)
    ensure_dir(APPS_DIR)
    ensure_dir(UTILS_DIR)
    print("[DIR] All required directories ensured.")

# ------------------------------------------------------------
# STEP: WRITE ALL JS FILES (AFTER PART 2 + 3 ADD THEM)
# ------------------------------------------------------------

def write_all_js_files():
    print(f"[WRITE] Writing {len(JS_FILES)} JavaScript files...")

    for filename, content in JS_FILES.items():
        write_file(filename, content)

    print("[WRITE] All JS files written.")

# ======================================================================
# PART 2 OF 4 — Talent Engine Generators
# ======================================================================

# ------------------------------------------------------------
# TalentNode.js
# ------------------------------------------------------------

register_js_file(
    "./scripts/progression/talents/TalentNode.js",
    r"""
// ======================================================================
// TalentNode.js
// Represents a normalized, prerequisite-enriched talent node.
// ======================================================================

export class TalentNode {
  constructor(talentDocument) {
    this.id = talentDocument.id;
    this.name = talentDocument.name;
    this.tree = talentDocument.system?.talent_tree ?? "Unknown";

    // Raw prerequisite string
    this.rawPrereq = talentDocument.system?.prerequisites ?? "";

    // Structured prerequisite array (generated by PrerequisiteEnricher)
    this.prereq = [];

    // Forward and backward edges for graph traversal
    this.requires = new Set();   // talents THIS one depends on
    this.unlocks = new Set();    // talents that depend on THIS one
  }

  addRequirement(talentId) {
    this.requires.add(talentId);
  }

  addUnlock(talentId) {
    this.unlocks.add(talentId);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      tree: this.tree,
      rawPrereq: this.rawPrereq,
      prereq: this.prereq,
      requires: Array.from(this.requires),
      unlocks: Array.from(this.unlocks)
    };
  }
}
"""
)

# ------------------------------------------------------------
# TalentTreeGraph.js
# ------------------------------------------------------------

register_js_file(
    "./scripts/progression/talents/TalentTreeGraph.js",
    r"""
// ======================================================================
// TalentTreeGraph.js
// Constructs a directed acyclic graph (DAG) of TalentNodes for each tree.
// ======================================================================

import { TalentNode } from "./TalentNode.js";

export class TalentTreeGraph {
  constructor(treeName) {
    this.treeName = treeName;
    this.nodes = new Map(); // id → TalentNode
  }

  addTalent(doc) {
    const node = new TalentNode(doc);
    this.nodes.set(node.id, node);
    return node;
  }

  /**
   * Establish directional edges:
   * If Talent A requires Talent B → B.unlocks.add(A), A.requires.add(B)
   */
  linkRequirement(talentId, requiredTalentId) {
    const a = this.nodes.get(talentId);
    const b = this.nodes.get(requiredTalentId);
    if (!a || !b) return;

    a.addRequirement(b.id);
    b.addUnlock(a.id);
  }

  /**
   * Produce an ordered list (topological sort)
   * Useful for UI layout, debugging, rule evaluation.
   */
  topologicalSort() {
    const inDegree = new Map();
    const result = [];
    const queue = [];

    // Count in-degrees
    for (const [id, node] of this.nodes) {
      inDegree.set(id, node.requires.size);
    }

    // Zero in-degree → queue
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    while (queue.length > 0) {
      const id = queue.shift();
      result.push(id);

      const node = this.nodes.get(id);
      for (const childId of node.unlocks) {
        inDegree.set(childId, inDegree.get(childId) - 1);
        if (inDegree.get(childId) === 0) {
          queue.push(childId);
        }
      }
    }

    return result;
  }

  toJSON() {
    const obj = {};
    for (const [id, node] of this.nodes) {
      obj[id] = node.toJSON();
    }
    return obj;
  }
}
"""
)

# ------------------------------------------------------------
# PrerequisiteEnricher.js
# ------------------------------------------------------------

register_js_file(
    "./scripts/progression/utils/PrerequisiteEnricher.js",
    r"""
// ======================================================================
// PrerequisiteEnricher.js
// Converts prerequisite strings into structured prerequisite objects.
// Integrates the existing prerequisite-normalizer.js
// ======================================================================

import { normalizePrerequisiteString } from "./prerequisite-normalizer.js";

export class PrerequisiteEnricher {
  /**
   * Accepts a Foundry Document and enriches its TalentNode prereq array.
   */
  static enrich(node) {
    if (!node || !node.rawPrereq) {
      node.prereq = [];
      return node;
    }

    try {
      const normalized = normalizePrerequisiteString(node.rawPrereq);
      node.prereq = normalized.parsed ?? [];
    } catch (err) {
      console.warn(`[PrerequisiteEnricher] Failed to normalize ${node.name}`, err);
      node.prereq = [];
    }

    return node;
  }
}
"""
)

# ------------------------------------------------------------
# RuleEngine.js
# ------------------------------------------------------------

register_js_file(
    "./scripts/progression/RuleEngine.js",
    r"""
// ======================================================================
// RuleEngine.js
// Determines whether an actor qualifies for a TalentNode.
//
// NOTE:
// This is intentionally backend + deterministic.
// The UI should NOT perform any logic itself.
// ======================================================================

export class RuleEngine {
  constructor(actor, pending = {}) {
    this.actor = actor;
    this.pending = pending; // talents hypothetically chosen during level-up
  }

  /**
   * MAIN ENTRY: checks "is this talent pick legal?"
   */
  qualifies(node) {
    if (!node.prereq || node.prereq.length === 0) {
      return true;
    }

    for (const req of node.prereq) {
      if (!this._checkRequirement(req)) {
        return false;
      }
    }
    return true;
  }

  // ----------------------------------------------------------
  // INTERNAL REQUIREMENT CHECKERS
  // ----------------------------------------------------------

  _checkRequirement(req) {
    switch (req.type) {
      case "ability":
        return this._checkAbility(req);

      case "bab":
        return this._checkBAB(req);

      case "skill_trained":
        return this._checkSkillTrained(req);

      case "skill_ranks":
        return this._checkSkillRanks(req);

      case "feat":
        return this._checkFeat(req);

      case "talent":
        return this._checkTalent(req);

      case "force_secret":
        return this._hasForceSecret();

      case "force_technique":
        return this._hasForceTechnique();

      case "force_sensitive":
        return this._hasForceSensitive();

      case "class_level":
        return this._checkClassLevel(req);

      case "alignment":
        return this._checkAlignment(req);

      default:
        console.warn("[RuleEngine] Unknown prerequisite type:", req);
        return false;
    }
  }

  _checkAbility(req) {
    const ability = this.actor.system?.abilities?.[req.ability];
    if (!ability) return false;
    return (ability?.value ?? 0) >= req.minimum;
  }

  _checkBAB(req) {
    const bab = this.actor.system?.attributes?.bab ?? 0;
    return bab >= req.minimum;
  }

  _checkSkillTrained(req) {
    const skill = this.actor.items.find(i =>
      i.type === "skill" &&
      i.system?.key?.toLowerCase() === req.skill
    );
    return Boolean(skill && skill.system?.trained);
  }

  _checkSkillRanks(req) {
    const skill = this.actor.items.find(i =>
      i.type === "skill" &&
      i.system?.key?.toLowerCase() === req.skill
    );
    return Boolean(skill && (skill.system?.ranks ?? 0) >= req.ranks);
  }

  _checkFeat(req) {
    const feats = this.actor.items.filter(i => i.type === "feat");
    const names = feats.map(f => f.name.toLowerCase());
    return names.includes(req.name.toLowerCase());
  }

  _checkTalent(req) {
    // Pending talents count as already acquired
    const pendingNames = Object.values(this.pending ?? {}).map(p =>
      p.name.toLowerCase()
    );

    const talents = this.actor.items.filter(i => i.type === "talent");
    const names = talents.map(t => t.name.toLowerCase());

    return names.includes(req.name.toLowerCase()) ||
           pendingNames.includes(req.name.toLowerCase());
  }

  _hasForceSecret() {
    return Boolean(this.actor.items.find(i => i.type === "force_secret"));
  }

  _hasForceTechnique() {
    return Boolean(this.actor.items.find(i => i.type === "force_technique"));
  }

  _hasForceSensitive() {
    return Boolean(this.actor.items.find(i => i.type === "feat" &&
      i.name.toLowerCase().includes("force sensitive")));
  }

  _checkClassLevel(req) {
    const levels = this.actor.items.filter(i => i.type === "class");
    for (const cls of levels) {
      if (cls.name.toLowerCase() === req.className.toLowerCase()) {
        return (cls.system?.level ?? 0) >= req.minimum;
      }
    }
    return false;
  }

  _checkAlignment(req) {
    const align = this.actor.system?.alignment ??
                  this.actor.system?.forceAlignment ??
                  "";
    return align.toLowerCase().includes(req.alignment.toLowerCase());
  }
}
"""
)

# ======================================================================
# PART 3 OF 4 — Registry + Updated UI Wrapper + Init Script
# ======================================================================

# ------------------------------------------------------------
# TalentTreeRegistry.js
# ------------------------------------------------------------

register_js_file(
    "./scripts/progression/talents/TalentTreeRegistry.js",
    r"""
// ======================================================================
// TalentTreeRegistry.js
// Backend registry that builds enriched talent trees using:
//  - TalentTreeGraph
//  - PrerequisiteEnricher
// ======================================================================

import { TalentTreeGraph } from "./TalentTreeGraph.js";
import { PrerequisiteEnricher } from "../utils/PrerequisiteEnricher.js";

export class TalentTreeRegistry {
  static trees = new Map(); // treeName → TalentTreeGraph

  // ------------------------------------------------------------
  // Build registry from compendium
  // ------------------------------------------------------------
  static async build() {
    const pack = game.packs.get("foundryvtt-swse.talents");
    if (!pack) {
      console.warn("[TalentTreeRegistry] Compendium not found.");
      this.trees = new Map();
      return;
    }

    const docs = await pack.getDocuments();
    this.trees = new Map();

    // Group by tree name
    const grouped = {};
    for (const d of docs) {
      const tree = d.system?.talent_tree ?? "Unknown";
      if (!grouped[tree]) grouped[tree] = [];
      grouped[tree].push(d);
    }

    // Build graph per tree
    for (const treeName of Object.keys(grouped)) {
      const graph = new TalentTreeGraph(treeName);

      // 1. Add nodes
      for (const doc of grouped[treeName]) {
        const node = graph.addTalent(doc);
        PrerequisiteEnricher.enrich(node);
      }

      // 2. Link talent → required talent edges
      for (const node of graph.nodes.values()) {
        for (const req of node.prereq) {
          if (req.type === "talent") {
            const targetName = req.name.toLowerCase();
            const requiredNode = [...graph.nodes.values()]
              .find(n => n.name.toLowerCase() === targetName);
            if (requiredNode) {
              graph.linkRequirement(node.id, requiredNode.id);
            }
          }
        }
      }

      this.trees.set(treeName, graph);
    }

    console.log(
      `[TalentTreeRegistry] Loaded ${this.trees.size} trees from compendium.`
    );
  }

  // ------------------------------------------------------------
  // Accessors
  // ------------------------------------------------------------

  static getTreeNames() {
    return [...this.trees.keys()];
  }

  static getTree(name) {
    return this.trees.get(name);
  }

  static getTalentByName(name) {
    const lower = name.toLowerCase();
    for (const graph of this.trees.values()) {
      for (const node of graph.nodes.values()) {
        if (node.name.toLowerCase() === lower) return node;
      }
    }
    return null;
  }
}
"""
)

# ------------------------------------------------------------
# Updated talent-registry-ui.js (UI wrapper around backend)
# ------------------------------------------------------------

register_js_file(
    "./scripts/apps/talent-registry-ui.js",
    r"""
// ======================================================================
// talent-registry-ui.js
//
// UI wrapper over TalentTreeRegistry + RuleEngine
// Provides:
//   listTreesForActor(actor)
//   get(treeName)
//   getTreeNames()
// ======================================================================

import { TalentTreeRegistry } from "../progression/talents/TalentTreeRegistry.js";
import { RuleEngine } from "../progression/RuleEngine.js";

export const TalentRegistryUI = {

  /**
   * Returns [{ treeName, talents: [{name, id, isQualified}] }]
   */
  listTreesForActor(actor, pending = {}) {
    const result = [];

    for (const treeName of TalentTreeRegistry.getTreeNames()) {
      const graph = TalentTreeRegistry.getTree(treeName);
      if (!graph) continue;

      const ruleEngine = new RuleEngine(actor, pending);
      const talents = [];

      for (const node of graph.nodes.values()) {
        const qualified = ruleEngine.qualifies(node);
        talents.push({
          name: node.name,
          id: node.id,
          isQualified: qualified,
          prereq: node.prereq,
          requires: [...node.requires],
          unlocks: [...node.unlocks]
        });
      }

      result.push({ treeName, talents });
    }

    return result;
  },

  /**
   * Get a specific talent node by name
   */
  get(name) {
    return TalentTreeRegistry.getTalentByName(name);
  },

  getTree(name) {
    const graph = TalentTreeRegistry.getTree(name);
    if (!graph) return [];
    return [...graph.nodes.values()];
  },

  getTreeNames() {
    return TalentTreeRegistry.getTreeNames();
  }
};

console.log("[TalentRegistryUI] Module loaded.");
"""
)

# ------------------------------------------------------------
# Initialization Hook — init-talents.js
# ------------------------------------------------------------

register_js_file(
    "./init-talents.js",
    r"""
// ======================================================================
// init-talents.js
// Loads all backend talent registries during system initialization.
// ======================================================================

import { TalentTreeRegistry } from "./scripts/progression/talents/TalentTreeRegistry.js";

Hooks.once("ready", async () => {
  console.log("[SWSE] Building TalentTreeRegistry...");
  await TalentTreeRegistry.build();
  console.log("[SWSE] Talent trees ready.");
});
"""
)

# ======================================================================
# PART 4 OF 4 — system.json patcher + final orchestration
# ======================================================================

# ------------------------------------------------------------
# SYSTEM.JSON PATCHER — insert our ES modules
# ------------------------------------------------------------

def patch_system_json():
    """
    Inserts all generated JS files into system.json under "esmodules".
    Ensures:
      - no duplicates
      - correct load order
    """
    print("[SYSTEM.JSON] Patching system.json...")

    backup_system_json()
    system_data = load_system_json()

    # Ensure esmodules exists
    if "esmodules" not in system_data:
        system_data["esmodules"] = []

    esmods = system_data["esmodules"]

    # ------------------------------------------------------------
    # Define REQUIRED LOAD ORDER
    #
    # 1. Talent Engine (graph, node, prerequisites, rule engine)
    # 2. Backend registry
    # 3. UI wrapper registry
    # 4. Init hook
    # ------------------------------------------------------------
    module_order = [
        "./scripts/progression/talents/TalentNode.js",
        "./scripts/progression/talents/TalentTreeGraph.js",
        "./scripts/progression/utils/PrerequisiteEnricher.js",
        "./scripts/progression/RuleEngine.js",
        "./scripts/progression/talents/TalentTreeRegistry.js",
        "./scripts/apps/talent-registry-ui.js",
        "./init-talents.js"
    ]

    # ------------------------------------------------------------
    # Remove any duplicates from system.json
    # ------------------------------------------------------------
    cleaned = []
    existing = set()
    for entry in esmods:
        if entry not in existing:
            cleaned.append(entry)
            existing.add(entry)

    esmods = cleaned

    # ------------------------------------------------------------
    # Append modules in correct order
    # ------------------------------------------------------------
    for module_path in module_order:
        if module_path not in esmods:
            print(f"[SYSTEM.JSON] Adding ES module → {module_path}")
            esmods.append(module_path)
        else:
            print(f"[SYSTEM.JSON] Already present → {module_path}")

    # Save back
    system_data["esmodules"] = esmods
    save_system_json(system_data)
    print("[SYSTEM.JSON] Patch complete.")

# ------------------------------------------------------------
# FINAL MAIN ORCHESTRATION
# ------------------------------------------------------------

def main():
    print("====================================================")
    print("  SWSE Talent Backend Generator")
    print("  (Parts 1–4 assembled successfully)")
    print("====================================================")

    # Create required directories
    create_all_directories()

    # JS_FILES has been populated across Parts 2 and 3
    write_all_js_files()

    # Modify manifest
    patch_system_json()

    print("====================================================")
    print("  ✔ GENERATION COMPLETE")
    print("  ✔ You may now reload Foundry VTT")
    print("====================================================")

# ------------------------------------------------------------
# AUTO-RUN IF EXECUTED DIRECTLY
# ------------------------------------------------------------

if __name__ == "__main__":
    main()
