#!/usr/bin/env python3
"""CP20 tranche 02: fifteen SotG publication SOURCE-FIDELITY audit certificates.

This is a fail-closed, non-production verification. No physical weapon mount
or Foundry stock-attack authority can be granted by the evidence certificates.
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

def read(filename):
    return json.loads((d / filename).read_text(encoding="utf-8"))

def blob_sha(path):
    data = path.read_bytes()
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()

B = read("swse-sotg-cp20-tranche02-source-fidelity-certificates.json")
S = read("swse-sotg-cp20-source-fidelity-tranche02.schema.json")
L = read("swse-phase2b-sotg-cp16-per-entry-certification-ledger.json")
Q = read("swse-phase2b-sotg-cp17-strict-certification-work-queue.json")
O = read("swse-phase2c-sotg-cp18-evidence-observation-overlay.json")
T = read("swse-phase2b-sotg-cp19-tranche03-primary-source-review.json")
C = read("swse-sotg-cp20-controlled-source-corrections.json")
PR = read("swse-sotg-cp20-tranche01-source-fidelity-certificates.json")
PS = read("swse-sotg-cp20-source-fidelity-certificate.schema.json")
P = read("swse-phase2c-cp18-approved-two-layer-policy.json")
Draft202012Validator.check_schema(S)
v = Draft202012Validator(S)
v.validate(B)

assert P["id"] == B["policyId"] == PR["policyId"] == "SOTG-CP18-D01"
assert P["decision"] == "APPROVED"
assert B["sha256"] == L["sourcePdfSha256"] == C["originalSourcePdfSha256"]
assert B["sha256"] == "e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0"
assert B["tranche"] == {"queueFrom":31,"queueTo":45,"count":15}
assert B["correctionPath"] == "data/audits/vehicles/swse-sotg-cp20-controlled-source-corrections.json"
assert len(L["entries"]) == len(O["entries"]) == 104
assert len(Q["workItems"]) == 100
assert len(T["entries"]) == len(PR["certificates"]) == len(B["certificates"]) == 15
assert PR["tranche"]["queueFrom"] == 16 and PR["tranche"]["queueTo"] == 30
assert C["originalLedgerChanged"] is False and C["productionDataChanged"] is False
assert C["physicalOrRuntimeGrants"] == 0

expected_blobs = {
"l":("data/audits/vehicles/swse-phase2b-sotg-cp16-per-entry-certification-ledger.json","d08ca75b0b30e8b44896588edf3c5ce1cd335557"),
"q":("data/audits/vehicles/swse-phase2b-sotg-cp17-strict-certification-work-queue.json","9c7df34eefa54f456721ee18c6ee684ec214dbf6"),
"o":("data/audits/vehicles/swse-phase2c-sotg-cp18-evidence-observation-overlay.json","18b5df47516543e0646377b9eef71e4ef272026d"),
"t":("data/audits/vehicles/swse-phase2b-sotg-cp19-tranche03-primary-source-review.json","ad4e95864c402cd83a447a8bfece26e8e40f6c50"),
"c":("data/audits/vehicles/swse-sotg-cp20-controlled-source-corrections.json","eba65c4857d6fb79c5dc49a780dd2280dd59d89b"),
"prior":("data/audits/vehicles/swse-sotg-cp20-tranche01-source-fidelity-certificates.json","ee6996b3b5e0442a891d6970b29e1c3c853fa45b"),
"s":("data/audits/vehicles/swse-sotg-cp20-source-fidelity-certificate.schema.json","dbeca191835c154210f0901a0ab29cfd72441bc1"),
}
assert B["authorityBlobs"] == {
    k:{"path":path,"sha":sha} for k,(path,sha) in expected_blobs.items()
}
for path,sha in expected_blobs.values():
    assert blob_sha(root/path) == sha, "Authority changed: "+path
assert C["originalCp16LedgerBlobSha"] == expected_blobs["l"][1]
assert C["closeoutBlobSha"] == "8b9307825ac6c3ce583d0a91f977ae7f3c6f97ec"
if args.source_pdf:
    h = hashlib.sha256()
    with args.source_pdf.open("rb") as fp:
        for block in iter(lambda: fp.read(1048576), b""):
            h.update(block)
    assert h.hexdigest() == B["sha256"], "Original PDF SHA256 does not match"

original_keys = set(x["sourceEntryKey"] for x in PR["certificates"])
assert len(original_keys) == 15
primary_review_by_key = {x["sourceEntryKey"]:x for x in T["entries"]}
assert len(primary_review_by_key) == 15
correction_by_key = {}
for c in C["corrections"]:
    correction_by_key.setdefault(c["sourceEntryKey"], []).append(c)
assert len(C["corrections"]) == 4
assert len(correction_by_key) == 4
assert C["corrections"][1]["sourceEntryKey"] == "sotg-slave-i"
assert C["corrections"][1]["sourceVerifiedValue"] == "8d10x2"
assert C["corrections"][2]["sourceEntryKey"] == "sotg-hapan-battle-dragon"
assert C["corrections"][2]["sourceVerifiedValue"] == 4

seen = set()
total_groups = 0
missing_historic_page_keys = 0
unresolved_rule_scopes = 0
projected_corrections = []
all_pages = set()
for idx, cert in enumerate(B["certificates"]):
    q = Q["workItems"][idx+30]
    s = L["entries"][q["cp16LedgerIndex"]]
    reviewed = primary_review_by_key.get(q["sourceEntryKey"])
    observed = O["entries"][q["cp16LedgerIndex"]]
    assert reviewed is not None
    assert cert["queuePosition"] == q["queuePosition"] == 31+idx
    assert cert["certificateId"] == f"SOTG-SF-CP20-T02-{idx+1:03d}"
    assert cert["sourceEntryKey"] == q["sourceEntryKey"] == s["sourceEntryKey"]
    assert cert["sourceEntryKey"] == reviewed["sourceEntryKey"] == observed["sourceEntryKey"]
    assert cert["sourceEntryKey"] not in seen and cert["sourceEntryKey"] not in original_keys
    seen.add(cert["sourceEntryKey"])
    assert cert["cp16Index"] == q["cp16LedgerIndex"]
    assert cert["printedName"] == s["printedName"]
    assert cert["printedStartPage"] == s["printedStatblockStartPage"]
    assert cert["reviewedSourcePages"] == s["reviewedPDFPages"]
    all_pages.update(s["reviewedPDFPages"])
    assert s["endPageReviewStatus"] == "PDF_VERIFIED"
    assert all(f in ("PDF_VERIFIED","SOURCE_SILENT_CONFIRMED") for f in s["fieldGroups"].values())
    assert len(s["fieldGroups"]) == 19
    assert q["sourceConflictFieldGroups"] == []
    assert cert["originalFieldStates"] == s["fieldGroups"]
    assert cert["publishedFacts"] == s["printedFacts"]
    assert cert["configurationRuleEvidence"] == s["configurationAndRuleFindings"]
    assert cert["discrepancyEvidence"] == s.get("sourceEvidence")
    assert cert["originalAttackGroupObservations"] == s["mountAndFiringGroups"]
    assert cert["cp19ReviewPointer"] == {
        "sourceEntryKey":reviewed["sourceEntryKey"],
        "reviewDisposition":reviewed["reviewType"],
        "verifiedPdfPages":reviewed["renderedPdfPages"]
    }
    assert reviewed["primarySourceReview"] == "ORIGINAL_RENDERED_PDF_PAGE_CLOSE_READ"
    assert reviewed["certification"]["reviewed"] is True
    assert reviewed["certification"]["sourceFidelityCertificateGranted"] is False
    assert cert["unresolvedRuleScopeEvidence"] == [
        item for item in s["configurationAndRuleFindings"] if item["status"] != "PDF_VERIFIED"
    ]
    unresolved_rule_scopes += len(cert["unresolvedRuleScopeEvidence"])
    assert cert["certificationState"] == "SOURCE_FIDELITY_CERTIFIED_AUDIT_ONLY"
    assert cert["physicalMountCertified"] is False
    assert cert["foundryStockAttackTrusted"] is False
    assert cert["productionHydrationPermitted"] is False
    assert len(cert["sourceSilenceRowScope"]) == len(s["mountAndFiringGroups"])
    assert len(cert["certifiedAttackGroupObservations"]) == len(s["mountAndFiringGroups"])
    assert len(observed["attackGroups"]) == len(s["mountAndFiringGroups"])
    assert len(reviewed["attackGroupSnapshots"]) == len(s["mountAndFiringGroups"])
    total_groups += len(s["mountAndFiringGroups"])
    projected = copy.deepcopy(s["mountAndFiringGroups"])
    expected_corrections = []
    for c in correction_by_key.get(s["sourceEntryKey"], []):
        assert c["auditOnly"] is True
        assert c["cp16Index"] == q["cp16LedgerIndex"]
        assert c["printedPage"] in cert["reviewedSourcePages"]
        row,field = c["attackGroupIndex"],c["field"]
        assert projected[row][field] == c["originalValue"]
        projected[row][field] = c["sourceVerifiedValue"]
        expected_corrections.append(c["id"])
    assert cert["auditCorrectionIds"] == expected_corrections
    projected_corrections += expected_corrections
    assert cert["certifiedAttackGroupObservations"] == projected, "Unapproved source mutation"
    for j, raw in enumerate(s["mountAndFiringGroups"]):
        scope = cert["sourceSilenceRowScope"][j]
        assert scope["rowIndex"] == j
        has_source_page = "sourcePage" in raw
        assert scope["originalRowPageStored"] == has_source_page
        assert scope["supplementalSourcePageEvidence"] != has_source_page
        assert scope["sourcePage"] == raw.get("sourcePage",s["printedStatblockStartPage"])
        assert scope["sourcePage"] in s["reviewedPDFPages"]
        assert scope["sourceSilent"] == [
            field for field in ("hardwareCount","firingArc","batteryCount")
            if raw.get(field) == "SOURCE_SILENT_CONFIRMED"
        ]
        if not has_source_page: missing_historic_page_keys += 1
        assert reviewed["attackGroupSnapshots"][j]["cp16RowIndex"] == j
        assert reviewed["attackGroupSnapshots"][j]["sourceLedgerRow"] == raw
        assert observed["attackGroups"][j]["sourceRowIndex"] == j
        for field in ("hardwareCount","firingArc","batteryCount"):
            obs = observed["attackGroups"][j]["observations"][field]
            if field not in raw:
                assert obs["state"] == "KEY_NOT_STORED"
                assert "rawValue" not in obs
            else:
                assert obs["rawValue"] == raw[field]

assert len(seen) == 15 and total_groups == 40
assert missing_historic_page_keys == 0
assert unresolved_rule_scopes == 0
assert projected_corrections == ["SOTG-CP20-C02","SOTG-CP20-C03"]
assert sorted(all_pages) == [77,78,79,80,81,82,83,84,85,86,87,90,91,92,93]
assert B["counts"] == {
    "newSourceFidelityCertificates":15,
    "remainingSourceFidelityUncertified":70,
    "unchangedStrictMechanicalBacklog":100,
    "unchangedPriorPhysicalStrictCertificates":4,
    "brandNewPhysicalMountCertificates":0,
    "newAutomatedStockAttackPermissions":0,
    "provenanceRestoredWithoutMutatingOldLedger":0,
}
assert B["auditOnly"] is True and B["rawSourceLedgerImmutable"] is True
assert B["v06SchemaFrozen"] is False and B["productionChangesMade"] is False
assert sum(bool(x["fullFieldCertified"] and x["fullWeaponMountReconciled"]) for x in L["entries"]) == 4

# The JSON Schema must fail closed on hostile authority escalation.
for bad_case in ("grant_stock_attack","grant_physical","falsify_certificate","replace_source_pdf"):
    forged = copy.deepcopy(B)
    if bad_case == "grant_stock_attack":
        forged["certificates"][0]["foundryStockAttackTrusted"] = True
    if bad_case == "grant_physical":
        forged["certificates"][0]["physicalMountCertified"] = True
    if bad_case == "falsify_certificate":
        forged["certificates"][0]["certificationState"] = "PHYSICAL_CERTIFIED"
    if bad_case == "replace_source_pdf":
        forged["sha256"] = "not-a-sha256"
    assert not v.is_valid(forged), bad_case + " improperly passed schema"

print("PASS CP20 T02: 15 publication source-fidelity audit certificates, queue 31-45")
print("PASS CP20 T02: 40 raw attack groups reconstructed, 15 verified PDF pages")
print("PASS CP20 T02: Slave I 8d10x2 mines and Hapan four mass-pulse tubes projected from approved audit corrections")
print("PASS CP20 T02: 30/100 source-fidelity certificates cumulative; 70 remaining")
print("PASS CP20 T02: immutable CP16/CP17/CP18/CP19 and prior CP20 verified by pinned Git blobs")
print("PASS CP20 T02: no extra physical-mount certificates, stock attack grants, production edits or schema freeze")
print("LIMIT: audit certificate reflects publication-source fidelity, not Foundry runtime operational verification")
