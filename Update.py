import zipfile
import os
import json
import time
from pathlib import Path

# === CONFIG ===
BASE_DIR = Path(r"C:\Users\Owner\Documents\GitHub")
CSS_FILENAME = "swse-complete-styling.css"
CSS_CONTENT = """/* ============================================
   SWSE COMPLETE STYLING FIXES
   ============================================ */

/* (your CSS content goes here — truncated for brevity)
   You can paste the full CSS block from ChatGPT here if desired. */
"""

# === LOCATE ZIP ===
zip_files = sorted(BASE_DIR.glob("foundryvtt-swse*.zip"), key=os.path.getmtime, reverse=True)
if not zip_files:
    raise FileNotFoundError(f"❌ No foundryvtt-swse*.zip files found in {BASE_DIR}")
zip_path = zip_files[0]
print(f"📦 Using ZIP: {zip_path}")

# === EXTRACT ZIP ===
extract_dir = BASE_DIR / "foundryvtt-swse_extracted"
if extract_dir.exists():
    import shutil
    shutil.rmtree(extract_dir)
with zipfile.ZipFile(zip_path, "r") as zip_ref:
    zip_ref.extractall(extract_dir)
print("✅ Extracted ZIP.")

# === FIND REPO ROOT ===
subdirs = [d for d in extract_dir.iterdir() if d.is_dir()]
repo_root = subdirs[0] if subdirs else extract_dir
print(f"📂 Repo root detected: {repo_root}")

# === ADD CSS FILE ===
styles_dir = repo_root / "styles"
styles_dir.mkdir(parents=True, exist_ok=True)
css_path = styles_dir / CSS_FILENAME
css_path.write_text(CSS_CONTENT, encoding="utf-8")
print(f"✅ CSS added: {css_path}")

# === UPDATE system.json ===
system_json = repo_root / "system.json"
if not system_json.exists():
    raise FileNotFoundError(f"❌ system.json not found in {repo_root}")

with open(system_json, "r", encoding="utf-8") as f:
    data = json.load(f)

# Ensure "styles" field exists and includes our CSS
styles_list = data.get("styles", [])
if CSS_FILENAME not in styles_list and f"styles/{CSS_FILENAME}" not in styles_list:
    styles_list.append(f"styles/{CSS_FILENAME}")
data["styles"] = styles_list

# Backup and rewrite
backup_path = system_json.with_name(f"system.json.bak.{int(time.time())}")
os.rename(system_json, backup_path)
with open(system_json, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
print(f"✅ system.json updated and backed up → {backup_path.name}")

# === REPACKAGE FIXED ZIP ===
fixed_zip = BASE_DIR / "foundryvtt-swse-fixed.zip"
with zipfile.ZipFile(fixed_zip, "w", zipfile.ZIP_DEFLATED) as zipf:
    for root, _, files in os.walk(repo_root):
        for file in files:
            full_path = Path(root) / file
            arcname = full_path.relative_to(repo_root.parent)
            zipf.write(full_path, arcname)

print(f"✅ Updated ZIP created → {fixed_zip}")
print("🎉 Done! Your fixed system is ready.")
