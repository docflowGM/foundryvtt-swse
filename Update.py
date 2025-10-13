import json

db_path = r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse\packs\classes.db"
print(f"Checking {db_path}...\n")

bad_entries = []
valid_count = 0

with open(db_path, "r", encoding="utf-8") as f:
    for i, line in enumerate(f, start=1):
        try:
            data = json.loads(line)
            if not data.get("name") or not data.get("type"):
                bad_entries.append((i, "Missing name or type"))
            elif data["type"] != "class":
                bad_entries.append((i, f"Incorrect type: {data['type']}"))
            else:
                valid_count += 1
        except Exception as e:
            bad_entries.append((i, f"JSON error: {e}"))

print(f"✅ Valid classes: {valid_count}")
if bad_entries:
    print(f"❌ Invalid entries: {len(bad_entries)}")
    for line_no, reason in bad_entries:
        print(f"  Line {line_no}: {reason}")
else:
    print("✅ All class entries valid!")
