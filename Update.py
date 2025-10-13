import os
import re
import shutil

# === CONFIGURATION ===
BASE_DIR = r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse"
CHARGEN_PATH = os.path.join(BASE_DIR, "scripts", "chargen", "chargen.js")
HELPERS_PATH = os.path.join(BASE_DIR, "scripts", "helpers", "handlebars-helpers.js")
BACKUP_DIR = os.path.join(BASE_DIR, "backups")

# === ENSURE BACKUP DIR EXISTS ===
os.makedirs(BACKUP_DIR, exist_ok=True)

# === BACKUP ORIGINAL FILES ===
for path in (CHARGEN_PATH, HELPERS_PATH):
    if os.path.exists(path):
        shutil.copy2(path, os.path.join(BACKUP_DIR, os.path.basename(path)))
        print(f"✅ Backed up: {path}")
    else:
        print(f"⚠️ Missing file (skipped backup): {path}")

# === PATCH chargen.js ===
if os.path.exists(CHARGEN_PATH):
    with open(CHARGEN_PATH, "r", encoding="utf-8") as f:
        chargen_js = f.read()

    # 1️⃣ Replace mergeObject() with foundry.utils.mergeObject()
    chargen_js = re.sub(
        r"(?<!foundry\.utils\.)mergeObject",
        "foundry.utils.mergeObject",
        chargen_js
    )

    # 2️⃣ Wrap pack.getDocuments() in try/catch safely
    if "getDocuments();" in chargen_js and "filter(d => d.name && d.type)" not in chargen_js:
        chargen_js = re.sub(
            r"const\s+docs\s*=\s*await\s*pack\.getDocuments\(\);",
            """let docs = [];
try {
  const rawDocs = await pack.getDocuments();
  docs = rawDocs.filter(d => d.name && d.type);
} catch (err) {
  console.warn(`Failed to load ${packName}:`, err);
}""",
            chargen_js
        )

    with open(CHARGEN_PATH, "w", encoding="utf-8") as f:
        f.write(chargen_js)

    print("✅ Updated chargen.js with safer compendium loading and modern mergeObject usage.")

# === PATCH handlebars-helpers.js ===
if os.path.exists(HELPERS_PATH):
    with open(HELPERS_PATH, "r", encoding="utf-8") as f:
        helpers_js = f.read()

    # Add mathFloor helper if missing
    if "mathFloor" not in helpers_js:
        math_helper = """
/** ============================================
 * SWSE Added Helper: mathFloor
 * ============================================ */
Handlebars.registerHelper("mathFloor", function(value) {
  return Math.floor(value);
});
"""
        helpers_js += math_helper
        with open(HELPERS_PATH, "w", encoding="utf-8") as f:
            f.write(helpers_js)
        print("✅ Added mathFloor helper to handlebars-helpers.js")
    else:
        print("ℹ️ mathFloor helper already exists; no change made.")
else:
    print("⚠️ No handlebars-helpers.js found; skipping helper patch.")

print("\n🎉 All done! You can now reload Foundry (F5) to test:")
print("   - Species should appear correctly in Character Generator.")
print("   - mergeObject warnings should be gone.")
print("   - Actor sheet should render without 'mathFloor' errors.")
