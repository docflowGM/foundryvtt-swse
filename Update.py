import json
import os
import zipfile
from pathlib import Path

# === CONFIG ===
repo_dir = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")
zip_path = repo_dir.with_suffix(".zip")  # Automatically finds foundryvtt-swse.zip
system_dir = repo_dir  # Folder where FoundryVTT expects your system

# === CONTENT ===

swse_fixes_css = """/* ============================================
   SWSE COMPLETE STYLING FIXES
   ============================================ */
... (YOUR LONG CSS CONTENT HERE — paste full version) ...
"""

swse_npc_js = """// ============================================
// FILE: scripts/swse-npc.js
// ============================================
import { SWSEActorSheet } from "./swse-actor.js";
... (rest of your JS code from npc file) ...
"""

load_templates_js = """// ============================================
// FILE: scripts/load-templates.js (UPDATED)
// ============================================
export async function preloadHandlebarsTemplates() {
  const templatePaths = [
    "systems/swse/templates/actor/character-sheet.hbs",
    "systems/swse/templates/actor/droid-sheet.hbs",
    "systems/swse/templates/actor/vehicle-sheet.hbs",
    "systems/swse/templates/actor/npc-sheet.hbs",
    "systems/swse/templates/item/item-sheet.hbs",
    "systems/swse/templates/partials/ability-block.hbs",
    "systems/swse/templates/partials/defense-block.hbs",
    "systems/swse/templates/partials/item-entry.hbs",
    "systems/swse/templates/apps/chargen.hbs"
  ];

  console.log("SWSE | Preloading Handlebars templates...");
  try {
    await loadTemplates(templatePaths);
    console.log(`SWSE | Successfully preloaded ${templatePaths.length} templates`);
  } catch (err) {
    console.error("SWSE | Error preloading templates:", err);
  }
  return true;
}
"""

# === SCRIPT LOGIC ===
def write_file(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"✅ Wrote: {path.relative_to(system_dir)}")

def update_system_json():
    json_path = system_dir / "system.json"
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    styles = data.get("styles", [])
    fix_style = "styles/swse-fixes.css"
    if fix_style not in styles:
        styles.append(fix_style)
        data["styles"] = styles

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print("✅ Updated system.json with swse-fixes.css")

def main():
    print("🚀 Updating local SWSE system...")

    # Write new/updated files
    write_file(system_dir / "styles" / "swse-fixes.css", swse_fixes_css)
    write_file(system_dir / "scripts" / "swse-npc.js", swse_npc_js)
    write_file(system_dir / "scripts" / "load-templates.js", load_templates_js)

    # Update system.json
    update_system_json()

    print("\n✅ Update complete! Your local SWSE system is ready for FoundryVTT reload.")

if __name__ == "__main__":
    main()
