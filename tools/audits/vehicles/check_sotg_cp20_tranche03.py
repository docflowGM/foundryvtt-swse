#!/usr/bin/env python3
"""CP20 T03: fail-closed audit-only publication fidelity certification validator.
Never grants physical mounts, runtime attacks, production hydration or schema freeze.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path
from jsonschema import Draft202012Validator

parser = argparse.ArgumentParser()
parser.add_argument("--repo", type=Path, required=True)
parser.add_argument("--source-pdf", type=Path)
args = parser.parse_args()
root = args.repo.resolve()
audit = root / "data" / "audits" / "vehicles"

def read(name):
    return json.loads((audit / name).read_text(encoding="utf8"))

def gitblob(path):
    payload = path.read_bytes()
    return hashlib.sha1(b"blob " + str(len(payload)).encode() + b"\\0" + payload).hexdigest()

def equal(a, b, description):
    assert a == b, description

B = read("swse-sotg-cp20-tranche03-source-fidelity-certificates.json")
S = read("swse-sotg-cp20-source-fidelity-tranche03.schema.json")
L = read("swse-phase2b-sotg-cp16-per-entry-certification-ledger.json")
Q = read("swse-phase2b-sotg-cp17-strict-certification-work-queue.json")
O = read("swse-phase2c-sotg-cp18-evidence-observation-overlay.json")
T = read("swse-phase2b-sotg-cp19-tranche04-primary-source-review.json")
C = read("swse-sotg-cp20-controlled-source-corrections.json")
P = read("swse-phase2c-cp18-approved-two-layer-policy.json")
PR = [read(x) for x in ["swse-sotg-cp20-tranche01-source-fidelity-certificates.json", "swse-sotg-cp20-tranche02-source-fidelity-certificates.json"]]
expected_blobs = json.loads("{\"l\":{\"path\":\"data/audits/vehicles/swse-phase2b-sotg-cp16-per-entry-certification-ledger.json\",\"sha\":\"d08ca75b0b30e8b44896588edf3c5ce1cd335557\"},\"q\":{\"path\":\"data/audits/vehicles/swse-phase2b-sotg-cp17-strict-certification-work-queue.json\",\"sha\":\"9c7df34eefa54f456721ee18c6ee684ec214dbf6\"},\"o\":{\"path\":\"data/audits/vehicles/swse-phase2c-sotg-cp18-evidence-observation-overlay.json\",\"sha\":\"18b5df47516543e0646377b9eef71e4ef272026d\"},\"t\":{\"path\":\"data/audits/vehicles/swse-phase2b-sotg-cp19-tranche04-primary-source-review.json\",\"sha\":\"c73fcd8e6477fe0488c9a08588bd8d10656fbf3e\"},\"c\":{\"path\":\"data/audits/vehicles/swse-sotg-cp20-controlled-source-corrections.json\",\"sha\":\"eba65c4857d6fb79c5dc49a780dd2280dd59d89b\"},\"prior\":{\"path\":\"data/audits/vehicles/swse-sotg-cp20-tranche02-source-fidelity-certificates.json\",\"sha\":\"a5d0260aa09bc2d3f427467702faecdf331fcc95\"},\"s\":{\"path\":\"data/audits/vehicles/swse-sotg-cp20-source-fidelity-tranche02.schema.json\",\"sha\":\"36d85723a24b6b12b30684d4c6cdca6f08c6dfce\"}}")
expected_issues = json.loads("{\"48\":[{\"status\":\"REPRESENTATION_SCOPE_UNRESOLVED\",\"issue\":\"Imperial II: printed grouped attacks (5 heavy turbolaser batteries, 5 turbolaser batteries, 4 heavy ion cannon batteries and 2 tractor batteries) do not establish a physical correspondence to the adjacent narrative's twenty turbolaser batteries and ten tractor generators.\",\"sourcePrintedPages\":[96,97],\"runtimeDisposition\":\"NO_PHYSICAL_MOUNT_OR_STOCK_ATTACK_AUTHORITY\"}],\"59\":[{\"status\":\"REPRESENTATION_SCOPE_UNRESOLVED\",\"issue\":\"Home One is identified as a distinct MC80 subclass with different printed ship statistics. Applicability of general MC80 special shield-recharge and tactical SR aura rules remains scoped and unresolved; neither automatic inheritance nor denial is certified.\",\"sourcePrintedPages\":[114,115],\"runtimeDisposition\":\"NO_AUTOMATIC_CLASS_RULE_INHERITANCE_OR_STOCK_ATTACK_AUTHORITY\"}]}")
expected_counts = json.loads("{\"newSourceFidelityCertificates\":15,\"remainingSourceFidelityUncertified\":55,\"unchangedStrictMechanicalBacklog\":100,\"unchangedPriorPhysicalStrictCertificates\":4,\"brandNewPhysicalMountCertificates\":0,\"newAutomatedStockAttackPermissions\":0,\"provenanceRestoredWithoutMutatingOldLedger\":0}")
Draft202012Validator.check_schema(S)
validator = Draft202012Validator(S)
validator.validate(B)

equal(P["id"], B["policyId"], "Policy ID mismatch")
equal(P["decision"], "APPROVED", "CP18 policy not approved")
equal(B["sha256"], L["sourcePdfSha256"], "Source ID mismatch")
equal(B["sha256"], C["originalSourcePdfSha256"], "Correction source mismatch")
equal(B["sha256"], "e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0", "Wrong PDF")
equal(B["tranche"], {"queueFrom":46,"queueTo":60,"count":15}, "Tranche mismatch")
equal(B["counts"], expected_counts, "Certification counts incorrect")
equal(B["authorityBlobs"], expected_blobs, "Pinned source authority changed")
equal(B["correctionPath"], "data/audits/vehicles/swse-sotg-cp20-controlled-source-corrections.json", "Correction pointer changed")
equal(len(L["entries"]), 104, "CP16 ledger length changed")
equal(len(O["entries"]), 104, "CP18 overlay length changed")
equal(len(Q["workItems"]), 100, "CP17 queue length changed")
equal(len(T["entries"]), 15, "CP19 tranche length changed")
equal(len(B["certificates"]), 15, "CP20 tranche length changed")
equal(len(C["corrections"]), 4, "Approved correction count changed")
assert C["originalLedgerChanged"] is False and C["productionDataChanged"] is False
assert C["physicalOrRuntimeGrants"] == 0
assert B["auditOnly"] is True and B["rawSourceLedgerImmutable"] is True
assert B["v06SchemaFrozen"] is False and B["productionChangesMade"] is False
for key, info in expected_blobs.items():
    equal(gitblob(root / info["path"]), info["sha"], "Authority blob mutated: "+info["path"])
if args.source_pdf:
    h = hashlib.sha256()
    with args.source_pdf.open("rb") as source:
        for block in iter(lambda: source.read(1048576), b""):
            h.update(block)
    equal(h.hexdigest(), B["sha256"], "Wrong physical primary PDF")
prior_keys = []
for i, batch in enumerate(PR):
    assert batch["policyId"] == "SOTG-CP18-D01"
    assert batch["tranche"]["queueFrom"] == 16 + i * 15
    assert len(batch["certificates"]) == 15
    prior_keys.extend(c["sourceEntryKey"] for c in batch["certificates"])
assert len(set(prior_keys)) == len(prior_keys)
seen = set()
rows = 0
missing_original_row_pages = 0
pages = set()
correction_ids = []
for index, cert in enumerate(B["certificates"]):
    position = 46 + index
    item = Q["workItems"][position - 1]
    original = L["entries"][item["cp16LedgerIndex"]]
    view = O["entries"][item["cp16LedgerIndex"]]
    review = T["entries"][index]
    equal(cert["certificateId"], f"SOTG-SF-CP20-T03-{index+1:03d}", "Certificate ID")
    equal(cert["queuePosition"], position, "Queue position")
    equal(item["queuePosition"], position, "Original queue anchor")
    equal(cert["cp16Index"], item["cp16LedgerIndex"], "Original index")
    for source in (original, review, view):
        equal(source["sourceEntryKey"], item["sourceEntryKey"], "Stable source identity")
    equal(cert["sourceEntryKey"], item["sourceEntryKey"], "Certificate identity")
    assert cert["sourceEntryKey"] not in prior_keys and cert["sourceEntryKey"] not in seen
    seen.add(cert["sourceEntryKey"])
    equal(cert["printedName"], original["printedName"], "Printed name")
    equal(cert["printedStartPage"], original["printedStatblockStartPage"], "Printed start page")
    equal(review["printedStatblockStartPage"], original["printedStatblockStartPage"], "Review page")
    equal(cert["reviewedSourcePages"], original["reviewedPDFPages"], "Reviewed page authority")
    pages.update(original["reviewedPDFPages"])
    equal(original["endPageReviewStatus"], "PDF_VERIFIED", "Statblock not reviewed")
    equal(len(original["fieldGroups"]), 19, "Missing field state")
    assert all(x in ("PDF_VERIFIED", "SOURCE_SILENT_CONFIRMED") for x in original["fieldGroups"].values())
    equal(item["sourceConflictFieldGroups"], [], "Unresolved source conflict")
    equal(cert["originalFieldStates"], original["fieldGroups"], "Field states")
    equal(view["fieldGroups"], original["fieldGroups"], "CP18 field observation")
    equal(cert["publishedFacts"], original["printedFacts"], "Published stats")
    equal(cert["configurationRuleEvidence"], original["configurationAndRuleFindings"], "Rule evidence")
    equal(cert["discrepancyEvidence"], original["sourceEvidence"], "Printed source evidence")
    assert cert["certificationState"] == "SOURCE_FIDELITY_CERTIFIED_AUDIT_ONLY"
    assert cert["physicalMountCertified"] is False
    assert cert["foundryStockAttackTrusted"] is False
    assert cert["productionHydrationPermitted"] is False
    review_pages = review["renderedOriginalPdfPages"]
    assert set(review_pages).issubset(set(original["reviewedPDFPages"]))
    equal(cert["cp19ReviewPointer"], {
        "sourceEntryKey":review["sourceEntryKey"],
        "reviewDisposition":review["reviewCategory"],
        "verifiedPdfPages":review_pages
    }, "CP19 evidence pointer")
    equal(cert["unresolvedRuleScopeEvidence"], expected_issues.get(str(position), []), "Undeclared scoped ambiguity")
    raw = original["mountAndFiringGroups"]
    equal(cert["originalAttackGroupObservations"], raw, "Historical mount observations changed")
    equal(len(raw), len(view["attackGroups"]), "CP18 attack row count")
    equal(len(raw), len(review["originalMountAndAttackGroups"]), "CP19 attack row count")
    equal(len(raw), len(cert["sourceSilenceRowScope"]), "Row provenance count")
    rows += len(raw)
    projected = copy.deepcopy(raw)
    corrections = [x for x in C["corrections"] if x["sourceEntryKey"] == cert["sourceEntryKey"]]
    corrections_ids_for_ship = []
    for fix in corrections:
        assert fix["auditOnly"] is True
        equal(fix["cp16Index"], item["cp16LedgerIndex"], "Correction ship mismatch")
        assert fix["printedPage"] in original["reviewedPDFPages"]
        assert fix["attackGroupIndex"] < len(projected)
        equal(projected[fix["attackGroupIndex"]][fix["field"]], fix["originalValue"], "Correction preimage")
        projected[fix["attackGroupIndex"]][fix["field"]] = fix["sourceVerifiedValue"]
        corrections_ids_for_ship.append(fix["id"])
    equal(cert["auditCorrectionIds"], corrections_ids_for_ship, "Correction IDs")
    correction_ids.extend(corrections_ids_for_ship)
    equal(cert["certifiedAttackGroupObservations"], projected, "Unapproved attack change")
    for rowindex, historical in enumerate(raw):
        page_key_present = "sourcePage" in historical
        page = historical.get("sourcePage", original["printedStatblockStartPage"])
        rowinfo = cert["sourceSilenceRowScope"][rowindex]
        equal(rowinfo["rowIndex"], rowindex, "Row index")
        equal(rowinfo["originalRowPageStored"], page_key_present, "Original page-key state")
        equal(rowinfo["supplementalSourcePageEvidence"], not page_key_present, "Supplemental page provenance")
        equal(rowinfo["sourcePage"], page, "Printed row page")
        assert page in original["reviewedPDFPages"]
        equal(rowinfo["sourceSilent"], [
            key for key in ("hardwareCount", "firingArc", "batteryCount")
            if historical.get(key) == "SOURCE_SILENT_CONFIRMED"
        ], "Typed source silence was modified")
        missing_original_row_pages += int(not page_key_present)
        cp19row = review["originalMountAndAttackGroups"][rowindex]
        equal(cp19row["cp16RowIndex"], rowindex, "CP19 row anchor")
        equal(cp19row["row"], historical, "CP19 historical row")
        equal(cp19row["hasOriginalRowSourcePage"], page_key_present, "CP19 page-key state")
        cp18row = view["attackGroups"][rowindex]
        equal(cp18row["sourceRowIndex"], rowindex, "CP18 row anchor")
        for key in ("hardwareCount", "firingArc", "batteryCount"):
            field = cp18row["observations"][key]
            if key in historical:
                equal(field["rawValue"], historical[key], "CP18 raw field: "+key)
            else:
                equal(field["state"], "KEY_NOT_STORED", "Absent field promoted")
                assert "rawValue" not in field
equal(len(seen), 15, "Certificate uniqueness")
equal(rows, 38, "Attack row count")
equal(missing_original_row_pages, 0, "Unexpected historical row-page gap")
equal(sorted(pages), [94,95,96,97,98,101,103,106,107,108,109,111,112,113,114,115,118], "Printed source page set")
equal(correction_ids, [], "Unapproved correction projection")
assert sum(bool(x["fullFieldCertified"] and x["fullWeaponMountReconciled"]) for x in L["entries"]) == 4
for kind in ("grant_runtime","grant_mount","grant_hydration","change_state","change_source"):
    bad = copy.deepcopy(B)
    if kind == "grant_runtime": bad["certificates"][0]["foundryStockAttackTrusted"] = True
    if kind == "grant_mount": bad["certificates"][0]["physicalMountCertified"] = True
    if kind == "grant_hydration": bad["certificates"][0]["productionHydrationPermitted"] = True
    if kind == "change_state": bad["certificates"][0]["certificationState"] = "PHYSICAL_CERTIFIED"
    if kind == "change_source": bad["sha256"] = "deadbeef"
    assert not validator.is_valid(bad), "Fail-open schema: "+kind
print("PASS CP20 T03: 15 source-fidelity certificates, queue 46-60, 38 original attack rows")
print("PASS CP20 T03: no source-field corrections; typed source silence and ambiguity kept")
print("PASS CP20 T03: 45/100 certified cumulatively; 55 remaining")
print("PASS CP20 T03: immutable source Git blobs, zero physical mount/stock runtime/production grants")
