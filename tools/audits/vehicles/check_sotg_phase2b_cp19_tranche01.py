#!/usr/bin/env python3
"""Validate the 15-ship CP19 original-PDF source-review tranche without granting certification."""
import argparse
import hashlib
import json
from pathlib import Path
from collections import Counter

p = argparse.ArgumentParser()
p.add_argument("--repo", type=Path, required=True)
p.add_argument("--source-pdf", type=Path)
args = p.parse_args()
d = args.repo.resolve() / "data" / "audits" / "vehicles"
load = lambda filename: json.loads((d / filename).read_text(encoding="utf-8"))

def git_blob(path):
    raw = path.read_bytes()
    return hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()

fn_ledger = "swse-phase2b-sotg-cp16-per-entry-certification-ledger.json"
fn_queue = "swse-phase2b-sotg-cp17-strict-certification-work-queue.json"
ledger, queue = load(fn_ledger), load(fn_queue)
policy = load("swse-phase2c-cp18-approved-two-layer-policy.json")
review = load("swse-phase2b-sotg-cp19-tranche01-primary-source-review.json")
base = load("swse-phase2b-sotg-cp17-independent-baseline.json")
assert review["schema"] == "swse.vehicle.sotg.cp19.tranche01.primary-pdf-source-conflict-review.v1"
assert review["approvedPolicy"] == policy["id"] == "SOTG-CP18-D01"
assert policy["decision"] == "APPROVED"
assert review["sourceBook"] == "Starships of the Galaxy"
assert review["sourcePdfSha256"] == ledger["sourcePdfSha256"] == base["authority"]["sourcePdfSha256"]
assert review["sourceLedgerBlobSha"] == base["authority"]["ledger"]["blobSha"] == git_blob(d / fn_ledger)
assert review["sourceQueueBlobSha"] == git_blob(d / fn_queue)
assert review["sourceLedgerPath"].endswith(fn_ledger)
assert review["sourceQueuePath"].endswith(fn_queue)
if args.source_pdf:
    h = hashlib.sha256()
    with args.source_pdf.open("rb") as f:
        for chunk in iter(lambda: f.read(1048576), b""):
            h.update(chunk)
    assert h.hexdigest() == review["sourcePdfSha256"], "wrong sourcebook PDF"

assert review["trancheNumber"] == 1
assert review["trancheSize"] == 15
assert review["trancheSelection"] == "FIRST_15_CP17_WORK_QUEUE_POSITIONS"
assert len(review["entries"]) == 15 and len(queue["workItems"]) == 100
assert len(ledger["entries"]) == 104
assert len({e["sourceEntryKey"] for e in review["entries"]}) == 15
assert review["sourceReviewMethod"].startswith("19 individual visually rendered")
assert sum(bool(e["fullFieldCertified"] and e["fullWeaponMountReconciled"]) for e in ledger["entries"]) == 4
counts = Counter()
read_pages = set()
missing_source_page_rows = 0

for idx, entry in enumerate(review["entries"]):
    queued = queue["workItems"][idx]
    source = ledger["entries"][queued["cp16LedgerIndex"]]
    assert entry["trancheIndex"] == idx + 1 == entry["cp17QueuePosition"] == queued["queuePosition"]
    assert entry["sourceEntryKey"] == queued["sourceEntryKey"] == source["sourceEntryKey"]
    assert entry["cp16LedgerIndex"] == queued["cp16LedgerIndex"]
    assert entry["printedName"] == queued["printedName"] == source["printedName"]
    assert entry["statblockStartPage"] == queued["printedStatblockStartPage"] == source["printedStatblockStartPage"]
    assert entry["cp17PriorityTrack"] == queued["priorityTrack"]
    assert entry["earlierConflictFieldGroups"] == queued["sourceConflictFieldGroups"]
    assert entry["visualVerification"] == "RENDERED_ORIGINAL_SOURCE_PDF_PAGE_CLOSE_READ"
    assert entry["cp19ReviewComplete"] is True
    assert entry["canonicalConflictResolved"] is False
    assert entry["sourceFidelityCertified"] is False
    assert entry["newPhysicalMountCertificateGranted"] is False
    assert entry["stockRuntimeAttackAuthorityGranted"] is False
    assert entry["visualPdfPages"] == sorted(set(entry["visualPdfPages"]))
    assert source["printedStatblockStartPage"] in entry["visualPdfPages"]
    assert set(entry["visualPdfPages"]).issubset(set(source["reviewedPDFPages"]) | {59,61,63,65,72,99,100,101,104,105,110,116,117,139,141,142,143,152,153})
    read_pages.update(entry["visualPdfPages"])
    assert entry["finding"] and entry["disposition"] and entry["publicationClaims"]
    for claim in entry["publicationClaims"]:
        assert claim["location"].startswith("/")
        assert claim["printedPage"] in entry["visualPdfPages"]
        assert isinstance(claim["observed"], str) and claim["observed"]
    actual_missing = [n for n,g in enumerate(source["mountAndFiringGroups"]) if "sourcePage" not in g]
    provenance = entry["rowPageProvenance"]
    assert provenance["sourcePrintedStatblockStartPageIsNotRowPageProvenance"] is True
    assert provenance["historicalMissingRowSourcePageKeys"] == actual_missing
    missing_source_page_rows += len(actual_missing)
    counts[entry["cp17PriorityTrack"]] += 1

assert len(read_pages) == 19
assert read_pages == {59,61,63,65,72,99,100,101,104,105,110,116,117,139,141,142,143,152,153}
assert counts == {"P0_SOURCE_CONFLICT":12,"P1_LEGACY_MISSING_FIELDS":3}
assert missing_source_page_rows == 7, "Delta-7 p60 missing row belongs to a later tranche, not these 15"
assert [entry["disposition"] for entry in review["entries"][:12]] == [
    "DUAL_PRINTED_VALUES_UNRESOLVED",
    "DUAL_ATTACK_PROFILE_VALUES_UNRESOLVED",
    "SELF_CONTRADICTORY_DEFENSE_LINE_UNRESOLVED",
    "WEAPON_ROW_VS_RULE_AREA_UNRESOLVED",
    "DUAL_PRINTED_VALUES_UNRESOLVED",
    "INITIATIVE_AND_PAYLOAD_TERMINOLOGY_UNRESOLVED",
    "TRACTOR_GROUP_LABEL_SCOPE_UNRESOLVED",
    "CLASSIFICATION_AND_PAYLOAD_TERMINOLOGY_UNRESOLVED",
    "DUAL_SUPERLASER_ATTACK_VALUES_UNRESOLVED",
    "DUAL_PERCEPTION_VALUES_UNRESOLVED",
    "DUAL_INITIATIVE_VALUES_UNRESOLVED",
    "TORPEDO_QUALIFIER_UNRESOLVED",
]
assert review["entries"][12]["disposition"] == "LEGACY_MISSING_WEAPON_KEYS_AND_PAGE_PROVENANCE"
assert review["entries"][13]["disposition"] == "LEGACY_MISSING_WEAPON_KEYS_AND_PAGE_PROVENANCE"
assert review["entries"][14]["disposition"] == "NARRATIVE_SINGULAR_VS_TABLE_PLURAL_AND_LEGACY_KEYS"

# Sentinels: retain incompatible printed source observations, rather than silently editing them.
def claims(pos):
    return [x["observed"] for x in review["entries"][pos-1]["publicationClaims"]]
assert claims(1) == ["Init +12", "Initiative +8"]
assert claims(2) == ["5 point-defense light laser cannon batteries +16","Atk +14",
                     "2 point-defense double light laser cannon batteries +14","Atk +12"]
assert claims(3) == ["Ref 16", "flat-footed 47"]
assert claims(4) == ["4x4 square starship-scale area attack","3x3-square starship-scale area"]
assert claims(5) == ["Init +2", "Initiative +8"]
assert claims(6)[0:2] == ["Init +10","Initiative +6"]
assert "6 plasma torpedoes" in claims(6)
assert claims(7) == ["tractor beam battery +8","Tractor beam (3 gunners)"]
assert "6,000 medium concussion missiles" in claims(8)
assert "Heavy concussion missile battery" in claims(8)
assert claims(9) == ["superlaser +7**","Superlaser Atk +15"]
assert claims(10) == ["Senses Perception +5","Perception +6"]
assert claims(11)[0:2] == ["Init +7","Initiative +4"]
assert "12 proton torpedoes" in claims(12)
assert claims(15) == ["only a single laser cannon","Light laser cannons (gunner)"]

assert review["counts"] == {
 "entriesVisuallyReviewed":15, "sourceConflictEntriesReviewed":12,
 "legacyMissingFieldEntriesReviewed":3, "originalSourceEntriesTotal":104,
 "remainingQueueNotYetReviewedInCp19":85, "unresolvedStrictMechanicalCertifications":100,
 "newSourceFidelityCertificates":0, "newPhysicalMountCertificates":0,
 "newRuntimeStockAttackAuthorities":0,
}
assert review["originalPublishedSourceNotModified"] is True
assert review["cp16SourceLedgerMutated"] is False
assert review["productionHydrationAuthorized"] is False
assert review["universalSchemaFrozen"] is False
print("PASS CP19-T1: 15/15 original-PDF reviews, 12 prior source conflicts, 3 legacy missing-field records")
print("PASS CP19-T1: 19 individual page locators, 7 historic sourcePage-absent attack rows preserved")
print("PASS CP19-T1: Recusant, Pellaeon, Immobilizer, Eclipse, K-wing and XJ3 dispute sentinels")
print("PASS CP19-T1: immutable CP16 ledger and CP17 queue Git blob hashes")
print("PASS CP19-T1: 0 new certificates, 0 runtime stock grants, no frozen schema or hydration")
print("LIMIT: Validator checks evidence transcription structure, not independent optical fidelity of printed pages")
