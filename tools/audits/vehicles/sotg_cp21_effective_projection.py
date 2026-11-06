#!/usr/bin/env python3
"""Read-only effective SotG CP21 projection.

Not a Foundry runtime adapter or pack writer. It produces an owner-adjudicated
view of one CP16 source entry, retaining unmodified printed evidence and
continuing to deny physical-mount/automated-stock-attack permissions.
"""
from copy import deepcopy

APPROVED = "APPROVED"
AUDIT_CONSUMABLE = "APPROVED_AUDIT_CONSUMABLE_NOT_RUNTIME_GRANTED"


def _node(root, pointer):
    if not isinstance(pointer, str) or not pointer.startswith("/") or pointer == "/":
        raise ValueError("Invalid effective field pointer")
    keys = pointer.split("/")[1:]
    current = root
    for key in keys[:-1]:
        key = key.replace("~1", "/").replace("~0", "~")
        if not isinstance(current, dict) or key not in current:
            raise ValueError("Missing effective parent field")
        current = current[key]
    final = keys[-1].replace("~1", "/").replace("~0", "~")
    if not isinstance(current, dict) or final not in current:
        raise ValueError("Effective field was not present in printed source")
    return current, final


def project_effective_ship(source_record, decision):
    """Apply only explicitly approved changes into copies; never mutate source."""
    if source_record.get("sourceEntryKey") != decision.get("sourceEntryKey"):
        raise ValueError("Source identity mismatch")
    if decision.get("approvalState") != APPROVED:
        raise ValueError("Owner approval is required")
    if decision.get("effectiveProjectionState") != AUDIT_CONSUMABLE:
        raise ValueError("No trusted runtime projection granted")
    if any(decision.get(k) is not False for k in (
        "physicalMountCertificateGranted",
        "foundryAutomatedAttackGranted",
        "productionHydrationPermitted",
    )):
        raise ValueError("Physical/runtime authorization is separate")

    original_facts = deepcopy(source_record["printedFacts"])
    original_groups = deepcopy(source_record["mountAndFiringGroups"])
    effective_facts = deepcopy(original_facts)
    effective_groups = deepcopy(original_groups)

    for override in decision.get("fieldOverrides", []):
        parent, key = _node(effective_facts, override["path"])
        if parent[key] != override["originalValue"]:
            raise ValueError("Stale or falsified printed field preimage")
        parent[key] = deepcopy(override["newValue"])

    for override in decision.get("attackGroupOverrides", []):
        index = override["rowIndex"]
        if not isinstance(index, int) or isinstance(index, bool) or index < 0 or index >= len(effective_groups):
            raise ValueError("Invalid historical weapon row")
        row = effective_groups[index]
        field = override["field"]
        original_present = override["originalPresent"]
        if original_present:
            if field not in row or row[field] != override.get("originalValue"):
                raise ValueError("Attack row printed preimage mismatch")
        elif field in row or "originalValue" in override:
            raise ValueError("Missing source key was silently promoted")
        row[field] = deepcopy(override["newValue"])

    for policy in decision["policies"]:
        if policy.get("runtimePermission") is not False:
            raise ValueError("An interpretation is not a runtime authorization")

    return {
        "sourceEntryKey": source_record["sourceEntryKey"],
        "decisionId": decision["decisionId"],
        "originalPrintedFacts": original_facts,
        "originalAttackGroups": original_groups,
        "effectiveFacts": effective_facts,
        "effectiveAttackGroups": effective_groups,
        "printedAlternatives": deepcopy(decision["printedAlternatives"]),
        "policies": deepcopy(decision["policies"]),
        "legacyMissingRowKeys": deepcopy(decision["legacyMissingRowKeys"]),
        "unresolvedCanonicalScopes": deepcopy(decision["unresolvedCanonicalScopes"]),
        "approvalState": APPROVED,
        "physicalMountCertified": False,
        "foundryStockAttackTrusted": False,
        "productionHydrationPermitted": False,
        "provenanceLevel": AUDIT_CONSUMABLE,
    }
