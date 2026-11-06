#!/usr/bin/env python3
"""CP20 SotG first fifteen SOURCE-FIDELITY audit certificates.

Read-only verification. Never grants installed physical mount / Foundry stock
attack authority. Original CP16, CP17, CP18 and CP19 evidence is immutable.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path

from jsonschema import Draft202012Validator

p = argparse.ArgumentParser()
p.add_argument("--repo", type=Path, required=True)
p.add_argument("--source-pdf", type=Path)
args = p.parse_args()
root = args.repo.resolve()
d = root / "data" / "audits" / "vehicles"

def get(name):
    return json.loads((d / name).read_text(encoding="utf-8"))

def blob_sha(path):
    raw = path.read_bytes()
    return hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()

B = get("swse-sotg-cp20-tranche01-source-fidelity-certificates.json")
C = get("swse-sotg-cp20-controlled-source-corrections.json")
S = get("swse-sotg-cp20-source-fidelity-certificate.schema.json")
L = get("swse-phase2b-sotg-cp16-per-entry-certification-ledger.json")
Q = get("swse-phase2b-sotg-cp17-strict-certification-work-queue.json")
O = get("swse-phase2c-sotg-cp18-evidence-observation-overlay.json")
T = get("swse-phase2b-sotg-cp19-tranche02-primary-source-review.json")
F = get("swse-phase2b-sotg-cp19-full-100-ship-source-review-closeout.json")
P = get("swse-phase2c-cp18-approved-two-layer-policy.json")
Draft202012Validator.check_schema(S)
Draft202012Validator(S).validate(B)
assert P["id"] == "SOTG-CP18-D01" == B["policyId"]
assert P["decision"] == "APPROVED"
assert len(L["entries"]) == len(O["entries"]) == 104
assert len(Q["workItems"]) == 100
assert len(T["entries"]) == 15
assert B["sha256"] == C["originalSourcePdfSha256"] == L["sourcePdfSha256"] == Q["sourcePdfSha256"]
assert B["sha256"] == "e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0"
assert B["authorityBlobs"] == {
    "l": {"path": "data/audits/vehicles/swse-phase2b-sotg-cp16-per-entry-certification-ledger.json", "sha": "d08ca75b0b30e8b44896588edf3c5ce1cd335557"},
    "q": {"path": "data/audits/vehicles/swse-phase2b-sotg-cp17-strict-certification-work-queue.json", "sha": "9c7df34eefa54f456721ee18c6ee684ec214dbf6"},
    "o": {"path": "data/audits/vehicles/swse-phase2c-sotg-cp18-evidence-observation-overlay.json", "sha": "18b5df47516543e0646377b9eef71e4ef272026d"},
    "t": {"path": "data/audits/vehicles/swse-phase2b-sotg-cp19-tranche02-primary-source-review.json", "sha": "0613ba9a0e1ef82efc0b773c66fbfc592f06cf57"},
    "c": {"path": "data/audits/vehicles/swse-phase2b-sotg-cp19-full-100-ship-source-review-closeout.json", "sha": "8b9307825ac6c3ce583d0a91f977ae7f3c6f97ec"}
}
for entry in B["authorityBlobs"].values():
    assert blob_sha(root / entry["path"]) == entry["sha"], entry["path"] + " changed"
assert C["originalCp16LedgerBlobSha"] == B["authorityBlobs"]["l"]["sha"]
assert C["closeoutBlobSha"] == B["authorityBlobs"]["c"]["sha"]
assert C["originalCloseoutAliasInvalid"] == "sotg-acclamator-ii-class-assault-ship"
assert C["actualAcclamatorSourceEntryKey"] == L["entries"][1]["sourceEntryKey"]
assert C["originalLedgerChanged"] is False
assert C["productionDataChanged"] is False
assert len(C["corrections"]) == 4
if args.source_pdf:
    digest = hashlib.sha256()
    with args.source_pdf.open("rb") as fp:
        for block in iter(lambda: fp.read(1048576), b""):
            digest.update(block)
    assert digest.hexdigest() == B["sha256"], "Wrong original scanned sourcebook"

canonical = [
    ("sotg-rothana-heavy-engineering-acclamator-ii-class-transgalactic-military-assault-ship", 57, 1, "hardwareCount", "SOURCE_SILENT_CONFIRMED", 2),
    ("sotg-slave-i", 85, 1, "damage", "10d10x2", "8d10x2"),
    ("sotg-hapan-battle-dragon", 93, 5, "hardwareCount", "SOURCE_SILENT_CONFIRMED", 4),
    ("sotg-nebula-class-star-destroyer", 119, 2, "damage", "11d10x5 ion", "3d10x5 ion"),
]
seen_correction_ids = set()
for i, (key, page, row, field, old, new) in enumerate(canonical):
    claim = C["corrections"][i]
    assert claim["id"] == f"SOTG-CP20-C{i+1:02d}"
    assert claim["sourceEntryKey"] == key
    assert claim["printedPage"] == page
    assert claim["attackGroupIndex"] == row
    assert claim["field"] == field
    assert claim["originalValue"] == old
    assert claim["sourceVerifiedValue"] == new
    assert claim["auditOnly"] is True
    assert claim["cp16Index"] >= 0
    src = L["entries"][claim["cp16Index"]]
    assert src["sourceEntryKey"] == key
    assert src["mountAndFiringGroups"][row][field] == old
    assert page in src["reviewedPDFPages"]
    assert claim["id"] not in seen_correction_ids
    seen_correction_ids.add(claim["id"])

assert len(C["narrativeClassification"]) == 1
narr = C["narrativeClassification"][0]
assert narr["sourceEntryKey"] == "sotg-sienar-fleet-systems-tie-in-fighter"
assert narr["oldState"] == "SOURCE_SILENT_CONFIRMED"
assert narr["newEvidence"] == "EXPLICITLY_ABSENT_IN_NARRATIVE_BUT_STATBLOCK_KEY_NOT_PRINTED"
assert narr["auditOnly"] is True
assert len(C["pendingSemantics"]) == 1
assert C["pendingSemantics"][0]["resultingAttack"] == -15
assert C["pendingSemantics"][0]["globalPenalty"] == -20
assert C["pendingSemantics"][0]["adjudicated"] is False

previous = {row["sourceEntryKey"]: row for row in T["entries"]}
assert len(previous) == 15
assert len(B["certificates"]) == 15
used = set()
supplemental_pages = 0
applied_ids = []
ambiguous_scopes = 0
rows_seen = 0
for i, cert in enumerate(B["certificates"]):
    q = Q["workItems"][i + 15]
    src = L["entries"][q["cp16LedgerIndex"]]
    prior = previous[src["sourceEntryKey"]]
    old = O["entries"][q["cp16LedgerIndex"]]
    assert cert["certificateId"] == f"SOTG-SF-CP20-{i+1:03d}"
    assert cert["queuePosition"] == q["queuePosition"] == 16 + i
    assert cert["cp16Index"] == q["cp16LedgerIndex"]
    assert cert["sourceEntryKey"] == q["sourceEntryKey"] == src["sourceEntryKey"]
    assert cert["sourceEntryKey"] == old["sourceEntryKey"] == prior["sourceEntryKey"]
    assert cert["sourceEntryKey"] not in used
    used.add(cert["sourceEntryKey"])
    assert cert["printedName"] == src["printedName"]
    assert cert["printedStartPage"] == src["printedStatblockStartPage"]
    assert cert["reviewedSourcePages"] == src["reviewedPDFPages"]
    assert src["endPageReviewStatus"] == "PDF_VERIFIED"
    assert all(status in ("PDF_VERIFIED", "SOURCE_SILENT_CONFIRMED") for status in src["fieldGroups"].values())
    assert len(src["fieldGroups"]) == 19
    assert q["sourceConflictFieldGroups"] == []
    assert cert["originalFieldStates"] == src["fieldGroups"]
    assert cert["publishedFacts"] == src["printedFacts"]
    assert cert["configurationRuleEvidence"] == src["configurationAndRuleFindings"]
    assert cert["discrepancyEvidence"] == src.get("sourceEvidence")
    assert cert["originalAttackGroupObservations"] == src["mountAndFiringGroups"]
    assert cert["cp19ReviewPointer"] == {
        "sourceEntryKey": prior["sourceEntryKey"],
        "reviewDisposition": prior["reviewDisposition"],
        "verifiedPdfPages": prior["visualPdfPages"],
    }
    assert prior["sourceMechanicsReview"] and prior["certification"]["sourceReviewComplete"] is True
    assert cert["unresolvedRuleScopeEvidence"] == [
        item for item in src["configurationAndRuleFindings"] if item["status"] != "PDF_VERIFIED"
    ]
    ambiguous_scopes += len(cert["unresolvedRuleScopeEvidence"])
    assert cert["certificationState"] == "SOURCE_FIDELITY_CERTIFIED_AUDIT_ONLY"
    assert cert["physicalMountCertified"] is False
    assert cert["foundryStockAttackTrusted"] is False
    assert cert["productionHydrationPermitted"] is False
    assert len(cert["sourceSilenceRowScope"]) == len(src["mountAndFiringGroups"])
    assert len(cert["certifiedAttackGroupObservations"]) == len(src["mountAndFiringGroups"])
    assert len(old["attackGroups"]) == len(src["mountAndFiringGroups"])
    rows_seen += len(src["mountAndFiringGroups"])
    reconstructed = copy.deepcopy(src["mountAndFiringGroups"])
    expected_ids = []
    for correction in C["corrections"]:
        if correction["sourceEntryKey"] == cert["sourceEntryKey"]:
            idx, field = correction["attackGroupIndex"], correction["field"]
            assert reconstructed[idx][field] == correction["originalValue"]
            reconstructed[idx][field] = correction["sourceVerifiedValue"]
            expected_ids.append(correction["id"])
    assert cert["auditCorrectionIds"] == expected_ids
    applied_ids.extend(expected_ids)
    assert cert["certifiedAttackGroupObservations"] == reconstructed, "unapproved published fact mutation"
    for j, original_row in enumerate(src["mountAndFiringGroups"]):
        scope = cert["sourceSilenceRowScope"][j]
        assert scope["rowIndex"] == j
        has_original_page = "sourcePage" in original_row
        assert scope["originalRowPageStored"] == has_original_page
        assert scope["supplementalSourcePageEvidence"] != has_original_page
        assert scope["sourcePage"] == original_row.get("sourcePage", src["printedStatblockStartPage"])
        assert scope["sourcePage"] in cert["reviewedSourcePages"]
        assert scope["sourceSilent"] == [
            f for f in ("hardwareCount", "firingArc", "batteryCount")
            if original_row.get(f) == "SOURCE_SILENT_CONFIRMED"
        ]
        if not has_original_page:
            supplemental_pages += 1
        assert old["attackGroups"][j]["sourceRowIndex"] == j
        for field in ("hardwareCount", "firingArc", "batteryCount"):
            observed = old["attackGroups"][j]["observations"][field]
            if field not in original_row:
                assert observed["state"] == "KEY_NOT_STORED"
                assert "rawValue" not in observed
            else:
                assert observed["rawValue"] == original_row[field]

assert applied_ids == ["SOTG-CP20-C01"]
assert supplemental_pages == 1, "Historical Delta-7 absent sourcePage must remain distinct"
assert ambiguous_scopes == 2, "B-wing family scope remains expressly unresolved"
assert rows_seen == 39
assert B["counts"] == {
    "newSourceFidelityCertificates": 15,
    "remainingSourceFidelityUncertified": 85,
    "unchangedStrictMechanicalBacklog": 100,
    "unchangedPriorPhysicalStrictCertificates": 4,
    "brandNewPhysicalMountCertificates": 0,
    "newAutomatedStockAttackPermissions": 0,
    "provenanceRestoredWithoutMutatingOldLedger": 1,
}
assert sum(bool(e["fullFieldCertified"] and e["fullWeaponMountReconciled"]) for e in L["entries"]) == 4
assert F["counts"]["cp19QueueShipReviewsComplete"] == 100
assert B["auditOnly"] is True
assert B["rawSourceLedgerImmutable"] is True
assert B["v06SchemaFrozen"] is False
assert B["productionChangesMade"] is False

# Deliberately hostile mutations must fail the same schema.
schema_validator = Draft202012Validator(S)
for sabotage in ("operational", "fake_cert", "wrong_source"):
    forged = copy.deepcopy(B)
    if sabotage == "operational":
        forged["certificates"][0]["foundryStockAttackTrusted"] = True
    elif sabotage == "fake_cert":
        forged["certificates"][0]["certificationState"] = "PHYSICAL_MOUNT_CERTIFIED"
    else:
        forged["sha256"] = "invalid"
    assert not schema_validator.is_valid(forged), "fail-closed certification invariant broken"

print("PASS CP20: 15 independently cross-linked source-fidelity audit certificates, queue 16-30")
print("PASS CP20: 39 published attack rows roundtrip against immutable CP16, CP18 and CP19")
print("PASS CP20: four source-verified corrections recorded; only Acclamator II applied to its audit projection")
print("PASS CP20: original Acclamator stable identity corrected; TIE/In and Skipray semantics remain explicitly scoped")
print("PASS CP20: one missing historical row-page key preserved, 2 B-wing scope ambiguities retained")
print("PASS CP20: adversarial certificate mutations rejected; zero physical or runtime trust grants")
print("LIMIT: source-fidelity audit certificate is not a universal v0.6 vehicle schema or production hydration permission")
