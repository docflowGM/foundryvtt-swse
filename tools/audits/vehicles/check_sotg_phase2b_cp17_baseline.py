#!/usr/bin/env python3
"""Read-only CP17 certification baseline/queue integrity check (not a sourcebook close-read)."""
import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument("--repo", type=Path, required=True)
p.add_argument("--source-pdf", type=Path)
a = p.parse_args()
root = a.repo.resolve()
d = root / "data" / "audits" / "vehicles"

def read(name):
    return json.loads((d / name).read_text(encoding="utf-8"))

def git_blob_sha(path):
    data = path.read_bytes()
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()

lfile = "swse-phase2b-sotg-cp16-per-entry-certification-ledger.json"
bfile = "swse-phase2b-sotg-cp16-book-source-closure-mount-backlog.json"
pfile = "swse-phase2c-vehicle-v06-pressure-cases-cp16.json"
ledger, backlog, pressure = [read(name) for name in (lfile, bfile, pfile)]
baseline = read("swse-phase2b-sotg-cp17-independent-baseline.json")
work = read("swse-phase2b-sotg-cp17-strict-certification-work-queue.json")
source_commit = "318c635e07577f9d04f9e1707908bf4590528758"
assert baseline["sourceCommitSha"] == work["sourceCommitSha"] == source_commit
assert baseline["authority"]["ledger"]["blobSha"] == git_blob_sha(d / lfile)
assert baseline["authority"]["mountBacklog"]["blobSha"] == git_blob_sha(d / bfile)
assert baseline["authority"]["schemaDiscovery"]["blobSha"] == git_blob_sha(d / pfile)
expected_hash = "e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0"
assert ledger["sourcePdfSha256"] == backlog["sourcePdfSha256"] == baseline["authority"]["sourcePdfSha256"] == work["sourcePdfSha256"] == expected_hash
if a.source_pdf:
    h = hashlib.sha256()
    with a.source_pdf.open("rb") as pdf:
        for chunk in iter(lambda: pdf.read(1024 * 1024), b""):
            h.update(chunk)
    assert h.hexdigest() == expected_hash, "Wrong printed sourcebook PDF"

le = ledger["entries"]
be = backlog["entries"]
assert len(le) == len(be) == 104
by_key = {e["sourceEntryKey"]: e for e in be}
assert len(by_key) == 104
assert {e["sourceEntryKey"] for e in le} == set(by_key)
assert pressure["count"] == len(pressure["cases"]) == 155
certified = []
queue = []
stats = Counter()
tracks = Counter()
for idx, entry in enumerate(le):
    k = entry["sourceEntryKey"]
    old = by_key[k]
    assert entry["printedName"] == old["printedName"]
    assert entry["printedStatblockStartPage"] == old["printedStatblockStartPage"]
    assert entry["reviewedPDFPages"] and entry["endPageReviewStatus"] == "PDF_VERIFIED"
    assert old["primaryPdfCloseReadCompleted"] is True
    weapons = entry["mountAndFiringGroups"]
    assert len(weapons) == old["mountGroupCount"]
    stats["attackGroups"] += len(weapons)
    for f in ("hardwareCount", "firingArc", "batteryCount"):
        silent = [i for i, w in enumerate(weapons) if w.get(f) == "SOURCE_SILENT_CONFIRMED"]
        missing = [i for i, w in enumerate(weapons) if f not in w]
        assert silent == old["mountRowSourceSilentByField"].get(f, [])
        assert missing == old["mountRowLegacyMissingFieldByField"].get(f, [])
        stats[f + "SourceSilent"] += len(silent)
        stats[f + "LegacyMissing"] += len(missing)
    cert = entry["fullFieldCertified"] and entry["fullWeaponMountReconciled"]
    assert entry["fullFieldCertified"] == entry["fullWeaponMountReconciled"]
    assert old["strictFieldCertified"] == old["strictWeaponMountReconciled"] == cert
    if cert:
        certified.append({"sourceEntryKey": k, "printedName": entry["printedName"], "printedStatblockStartPage": entry["printedStatblockStartPage"]})
        continue
    has_conflict = bool(old["sourceConflictFieldGroups"])
    has_missing = any(old["mountRowLegacyMissingFieldByField"].values())
    has_silent = any(old["mountRowSourceSilentByField"].values())
    track = ("P0_SOURCE_CONFLICT" if has_conflict else "P1_LEGACY_MISSING_FIELDS" if has_missing
             else "P2_PHYSICAL_SOURCE_SILENCE" if has_silent else "P3_FIELD_SOURCE_SILENCE_OR_OTHER_GAP")
    tracks[track] += 1
    stats["sourceConflictEntries"] += int(has_conflict)
    queue.append({
        "priorityTrack": track, "cp16LedgerIndex": idx, "sourceEntryKey": k,
        "printedName": entry["printedName"], "printedStatblockStartPage": entry["printedStatblockStartPage"],
        "reviewedPDFPages": entry["reviewedPDFPages"],
        "fieldGroupExceptions": {x: v for x, v in entry["fieldGroups"].items() if v != "PDF_VERIFIED"},
        "mountGroupCount": len(weapons), "sourceConflictFieldGroups": old["sourceConflictFieldGroups"],
        "sourceSilentMountRowIndices": old["mountRowSourceSilentByField"],
        "legacyMissingMountRowIndices": old["mountRowLegacyMissingFieldByField"],
        "blockingFindingStatuses": list(dict.fromkeys(x["status"] for x in entry["blockingFindings"])),
        "nextAction": old["nextAction"], "certificationState": "UNCERTIFIED",
        "workState": "QUEUED", "certificationGranted": False,
    })
queue.sort(key=lambda x: (x["priorityTrack"], x["printedStatblockStartPage"], x["cp16LedgerIndex"]))
for pos, row in enumerate(queue, 1):
    row["queuePosition"] = pos
expected_counts = {
    "bookSourceEntries": 104, "closeReadComplete": 104, "strictlyCertified": 4,
    "remainingUncertified": 100, "attackGroups": 258,
    "hardwareCountSourceSilent": 228, "firingArcSourceSilent": 251,
    "batteryCountSourceSilent": 132, "hardwareCountLegacyMissing": 2,
    "firingArcLegacyMissing": 1, "batteryCountLegacyMissing": 7,
    "sourceConflictEntries": 12, "schemaDiscoveryCases": 155,
    "priorityTracks": dict(tracks),
}
assert dict(tracks) == {"P0_SOURCE_CONFLICT": 12, "P1_LEGACY_MISSING_FIELDS": 3,
                        "P2_PHYSICAL_SOURCE_SILENCE": 84, "P3_FIELD_SOURCE_SILENCE_OR_OTHER_GAP": 1}
assert len(certified) == 4 and len(queue) == 100
assert certified == baseline["existingStrictCertificates"]
assert expected_counts == baseline["counts"]
assert work["queueCount"] == 100 and work["workItems"] == queue
assert baseline["decisions"]["sourceSilentHandling"] == "PENDING_OWNER_POLICY_NO_INFERRED_VALUE"
assert baseline["decisions"]["runtimeStockAttackAuthority"] == "NOT_GRANTED"
assert baseline["decisions"]["productionHydration"] == "NOT_AUTHORIZED"
assert work["policyStatus"] == "OWNER_ADJUDICATION_PENDING"
print("PASS CP17: immutable CP16 source blob SHA readback; authoritative PDF hash")
print("PASS CP17: 104 source-reviewed, 4 strict certificates, 100 queued, 258 attack groups")
print("PASS CP17: exact source-silence / legacy-missing tallies and 155 schema cases")
print("PASS CP17: every queue row/position/priority deterministically reconstructs")
print("PASS CP17: no new certificates, no runtime trust, no hydration or schema freeze")
print("LIMIT: CP17 is a structural evidence baseline, not 100 additional mechanical certificates")
