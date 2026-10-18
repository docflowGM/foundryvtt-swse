#!/usr/bin/env python3
"""CP18 lossless-source-evidence policy and normalization proof; NO certifications or production write."""
import argparse
import copy
import hashlib
import json
from collections import Counter
from pathlib import Path
from jsonschema import Draft202012Validator

parser = argparse.ArgumentParser()
parser.add_argument("--repo", type=Path, required=True)
parser.add_argument("--source-pdf", type=Path)
args = parser.parse_args()
root = args.repo.resolve()
d = root / "data" / "audits" / "vehicles"

def load(path):
    return json.loads(path.read_text(encoding="utf-8"))

def audit(name):
    return load(d / name)

def blob_sha(path):
    data = path.read_bytes()
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()

policy = audit("swse-phase2c-cp18-approved-two-layer-policy.json")
contract = audit("swse-phase2c-cp18-evidence-normalization-contract.json")
candidate = audit("swse-phase2c-cp18-evidence-envelope.schema.json")
overlay = audit("swse-phase2c-sotg-cp18-evidence-observation-overlay.json")
ledgerfile = d / "swse-phase2b-sotg-cp16-per-entry-certification-ledger.json"
backlogfile = d / "swse-phase2b-sotg-cp16-book-source-closure-mount-backlog.json"
discoveryfile = d / "swse-phase2c-vehicle-v06-pressure-cases-cp16.json"
ledger, backlog, discovery = map(load, (ledgerfile, backlogfile, discoveryfile))
cp17 = audit("swse-phase2b-sotg-cp17-independent-baseline.json")
queue = audit("swse-phase2b-sotg-cp17-strict-certification-work-queue.json")
v05 = audit("swse-phase0b-vehicle.schema.json")
v05blank = audit("swse-phase0b-vehicle.blank.json")
assert policy["id"] == contract["policyId"] == overlay["policyId"] == "SOTG-CP18-D01"
assert policy["decision"] == "APPROVED" and policy["approvalSource"] == "OWNER_EXPLICIT_CHAT_INSTRUCTION_2026-10-18"
assert policy["baselineCommit"] == "e90f0ae04a7c3ebc0a42221e624f8e568fa295d7"
assert set(policy["reconcilesWith"]) == {"P2C-D01", "P2C-D02", "P2C-D03"}
assert len(discovery["cases"]) == discovery["count"] == 155
assert cp17["authority"]["ledger"]["blobSha"] == overlay["sourceLedgerBlobSha"] == blob_sha(ledgerfile)
assert cp17["authority"]["mountBacklog"]["blobSha"] == blob_sha(backlogfile)
assert cp17["authority"]["schemaDiscovery"]["blobSha"] == blob_sha(discoveryfile)
expected_pdf_hash = cp17["authority"]["sourcePdfSha256"]
assert overlay["sourcePdfSha256"] == ledger["sourcePdfSha256"] == backlog["sourcePdfSha256"] == expected_pdf_hash
if args.source_pdf:
    sha = hashlib.sha256()
    with args.source_pdf.open("rb") as pdf:
        for chunk in iter(lambda: pdf.read(1024 * 1024), b""):
            sha.update(chunk)
    assert sha.hexdigest() == expected_pdf_hash, "Wrong primary source PDF"
assert contract["generatedOverlayPath"] == "data/audits/vehicles/swse-phase2c-sotg-cp18-evidence-observation-overlay.json"
assert contract["candidateEnvelopeSchemaPath"] == "data/audits/vehicles/swse-phase2c-cp18-evidence-envelope.schema.json"
assert overlay["productionMutationAuthorized"] is False

Draft202012Validator.check_schema(candidate)
validator = Draft202012Validator(candidate)
validator.validate(overlay)
MISSING = object()
VALID_STATES = set(policy["evidenceStatePolicy"])
FIELDS = ("hardwareCount", "firingArc", "batteryCount")
BLOCKED = "BLOCKED_UNTIL_SOURCE_SUPPORTED_MOUNT_IDENTITY_AND_REQUIRED_GEOMETRY"

def observation(value, present, page, pointer):
    if not present:
        state = "KEY_NOT_STORED"
    elif value == "SOURCE_SILENT_CONFIRMED":
        state = "SOURCE_SILENT_CONFIRMED"
    elif value is None:
        state = "RECORDED_NULL_UNRESOLVED"
    elif value == "None":
        state = "EXPLICIT_NONE"
    elif isinstance(value, (int, float)) and not isinstance(value, bool) and value == 0:
        state = "PRINTED_ZERO"
    elif isinstance(value, str):
        state = "RECORDED_DESCRIPTIVE_TEXT"
    else:
        state = "PRINTED_VALUE"
    suggestion = {
        "SOURCE_SILENT_CONFIRMED": "not-stated",
        "KEY_NOT_STORED": "not-yet-reviewed",
        "RECORDED_NULL_UNRESOLVED": "unclear-source",
        "RECORDED_DESCRIPTIVE_TEXT": "unclear-source",
    }.get(state)
    assert state in VALID_STATES
    return dict(state=state, **({"rawValue": value} if present else {}),
                sourcePrintedPage=page, ledgerJsonPointer=pointer,
                v05FieldStateSuggestion=suggestion, v05PhysicalMountBinding=BLOCKED)

def reconstruct():
    assert len(ledger["entries"]) == len(backlog["entries"]) == 104
    by_key = {e["sourceEntryKey"]: e for e in backlog["entries"]}
    assert len(by_key) == 104
    items = []
    counted = Counter()
    for i, e in enumerate(ledger["entries"]):
        b = by_key[e["sourceEntryKey"]]
        assert (b["printedName"], b["printedStatblockStartPage"]) == (e["printedName"], e["printedStatblockStartPage"])
        assert e["endPageReviewStatus"] == "PDF_VERIFIED" and e["reviewedPDFPages"]
        assert len(e["mountAndFiringGroups"]) == b["mountGroupCount"]
        assert e["fullFieldCertified"] == e["fullWeaponMountReconciled"]
        assert b["strictFieldCertified"] == b["strictWeaponMountReconciled"] == e["fullFieldCertified"]
        groups = []
        for j, row in enumerate(e["mountAndFiringGroups"]):
            obs = {}
            for field in FIELDS:
                present = field in row
                value = row[field] if present else MISSING
                obs[field] = observation(value, present, row["sourcePage"], f"/entries/{i}/mountAndFiringGroups/{j}/{field}")
                counted[obs[field]["state"]] += 1
            groups.append(dict(
                sourceRowIndex=j, sourcePage=row["sourcePage"], weaponLabel=row["weaponLabel"],
                stationRaw=row["station"], sourceRowLedgerJsonPointer=f"/entries/{i}/mountAndFiringGroups/{j}",
                physicalAutomationAuthority=False, observations=obs
            ))
        items.append(dict(
            sourceEntryKey=e["sourceEntryKey"], printedName=e["printedName"],
            printedStatblockStartPage=e["printedStatblockStartPage"], cp16LedgerIndex=i,
            reviewedPDFPages=e["reviewedPDFPages"], fieldGroups=e["fieldGroups"],
            sourceConflictFieldGroups=b["sourceConflictFieldGroups"],
            sourceFidelityCertification="PENDING_INDIVIDUAL_EVIDENCE_AND_SCHEMA_GATE",
            historicalPhysicalSourceCertificate=e["fullFieldCertified"] and e["fullWeaponMountReconciled"],
            newPhysicalSourceCertificateGranted=False,
            automatedStockAttackAuthorityGranted=False,
            attackGroups=groups
        ))
    return items, dict(counted)

built, totals = reconstruct()
assert overlay["entries"] == built, "Evidence mapping drift, fields or raw values are not lossless"
assert overlay["summary"]["fieldObservationStates"] == totals
assert sum(totals.values()) == 258 * 3
assert totals == {"SOURCE_SILENT_CONFIRMED":611, "PRINTED_VALUE":146,
                  "KEY_NOT_STORED":10, "RECORDED_DESCRIPTIVE_TEXT":6, "PRINTED_ZERO":1}
assert len(queue["workItems"]) == 100
assert sum(len(e["attackGroups"]) for e in built) == 258
assert sum(e["historicalPhysicalSourceCertificate"] for e in built) == 4
assert overlay["summary"] == {
    "sourceEntries": 104, "attackGroups": 258, "existingStrictCertificates": 4,
    "sourceFidelityCertificatesGrantedCp18": 0, "physicalMountCertificatesGrantedCp18": 0,
    "runtimeTrustedStockGroupsGrantedCp18": 0, "fieldObservationStates": totals
}
assert all(not e["newPhysicalSourceCertificateGranted"] and not e["automatedStockAttackAuthorityGranted"] for e in built)
assert all(e["sourceFidelityCertification"] == "PENDING_INDIVIDUAL_EVIDENCE_AND_SCHEMA_GATE" for e in built)
assert policy["implementationBoundaries"]["sourceFidelityCertificatesNewlyGranted"] == 0
assert policy["implementationBoundaries"]["physicalCertificatesNewlyGranted"] == 0
assert policy["implementationBoundaries"]["trustedStockWeaponGroupsNewlyGranted"] == 0
assert policy["implementationBoundaries"]["cp16LedgerImmutable"]
assert policy["implementationBoundaries"]["cp17BaselineImmutable"]
assert not policy["implementationBoundaries"]["productionHydrationAuthorized"]
assert not policy["implementationBoundaries"]["foundryRuntimeMutationAuthorized"]
assert policy["implementationBoundaries"]["v06UniversalSchemaStatus"] == "NOT_YET_IMPLEMENTED_OR_FROZEN"

# Lossless distinctions; synthetic-only tests do not mint canonical claims.
pointer = "/entries/0/mountAndFiringGroups/0/hardwareCount"
sample = [
    (MISSING, False, "KEY_NOT_STORED", False),
    ("SOURCE_SILENT_CONFIRMED", True, "SOURCE_SILENT_CONFIRMED", True),
    (0, True, "PRINTED_ZERO", True),
    ("None", True, "EXPLICIT_NONE", True),
    (None, True, "RECORDED_NULL_UNRESOLVED", True),
    ("forward-firing", True, "RECORDED_DESCRIPTIVE_TEXT", True),
    (-17, True, "PRINTED_VALUE", True),
    (2, True, "PRINTED_VALUE", True),
]
for value, present, state, has_raw in sample:
    obs = observation(value, present, 56, pointer)
    assert obs["state"] == state and ("rawValue" in obs) == has_raw
    if has_raw:
        assert obs["rawValue"] == value
    validator.validate(obs) if False else None  # envelope $defs validation below
    Draft202012Validator({"$ref":"#/$defs/observation","$defs":candidate["$defs"]}).validate(obs)
# Fail closed on mismatched state/raw consistency.
v = Draft202012Validator({"$ref":"#/$defs/observation","$defs":candidate["$defs"]})
missing_with_raw = observation(MISSING, False, 56, pointer)
missing_with_raw["rawValue"] = None
assert not v.is_valid(missing_with_raw)
silent_without_raw = observation("SOURCE_SILENT_CONFIRMED", True, 56, pointer)
silent_without_raw.pop("rawValue")
assert not v.is_valid(silent_without_raw)
false_zero = observation(0, True, 56, pointer)
false_zero["rawValue"] = 1
assert not v.is_valid(false_zero)

# Current universal v0.5 schema is a DRAFT, and physical mount fields are not attack-group facts.
assert v05["$id"] == "swse.vehicle.phase0b.draft-0.5"
assert v05["$defs"]["weaponMount"]["properties"]["firingArc"]["type"] == ["string", "null"]
group_def = v05["$defs"]["fireGroup"]["properties"]
assert "hardwareCount" not in group_def and "firingArc" not in group_def
assert "weaponsPerBattery" in group_def and "batteryCount" not in group_def
field_state_enum = set(v05["properties"]["fieldStates"]["additionalProperties"]["enum"])
assert set(["not-stated","not-applicable","explicitly-none","unclear-source","not-yet-reviewed"]) <= field_state_enum
assert "weaponMounts" in v05["properties"]["armament"]["properties"]
# V0.5 can validate a minimal draft source attack group without certifying a physical mount.
pilot = copy.deepcopy(v05blank)
pilot["identity"] = {"sourceEntryKey": built[0]["sourceEntryKey"], "name": built[0]["printedName"]}
pilot["publication"] = {"book":"Starships of the Galaxy","page":built[0]["printedStatblockStartPage"]}
pilot["armament"] = {"firingGroups":[{"groupKey":"source-attack-group-0","mountKeys":[], "label":built[0]["attackGroups"][0]["weaponLabel"],"groupKind":"unknown","batteryMembershipStatus":"not-stated"}]}
pilot["fieldStates"] = {"/armament/weaponMounts":"not-stated"}
pilot["rules"]["reviewStatus"] = "partial-source-probe"
Draft202012Validator(v05).validate(pilot)
assert not pilot["armament"]["firingGroups"][0]["mountKeys"]
assert "weaponMounts" not in pilot["armament"]
assert pilot["rules"]["reviewStatus"] != "certified"
print("PASS CP18: explicit owner approval and inherited P2C-D01/D02/D03 compatible")
print("PASS CP18: JSON Schema verified; all 104 source records and 258 groups deterministically reconstructed")
print("PASS CP18: 774 raw field observations including 611 source silent, 10 historical absent keys, and 1 printed zero")
print("PASS CP18: absent vs explicit none vs zero vs null vs descriptive vs source-silent preserved")
print("PASS CP18: source-fidelity certification remains per-ship; no new certificates or operational authorization")
print("PASS CP18: v0.5 accepts only a mountless draft firegroup; source evidence sidecar needed for lossless v0.6 design")
print("LIMIT: CP18 does not re-adjudicate printed conflicts or establish source-supported physical geometry")
