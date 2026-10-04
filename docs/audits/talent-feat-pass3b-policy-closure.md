# Pass 3B — Policy-Driven Bulk Closure

Execution of existing owner policy only. Every derived decision cites its controlling policy ID and carries decisionSource `OWNER_POLICY_DERIVED`. Findings the policies do not mechanically govern remain unresolved and are grouped in the consolidated policy-gap report.

- Starting unresolved record-level findings: **223**
- Resolved through existing owner policy: **27** (ADD 10, NO_CHANGE 17)
- Unresolved record-level findings: **196**
- Consolidated policy gaps: **48**
- Tag-definition questions: 12 starting, 2 policy-resolved, 10 remaining
- Tag-convention questions: 14 starting, 0 policy-resolved, 14 remaining
- Ontology gaps recorded (PHASE3_ONTOLOGY_GAP): 3
- Cumulative owner overlay: 152 decisions (63 ADD, 89 NO_CHANGE)
- Working authority: 54 records with additions, 63 additions, 0 removals, tag instances 11281

## Policy-derived decisions

| Action | Domain | Name | ID | Tag | Policies | Rule |
| --- | --- | --- | --- | --- | --- | --- |
| NO_CHANGE | TALENT | Device Jammer | `5db4343762664d95` | `shields` | REFERENCE_ONLY_POLICY | REFERENCE_ONLY |
| NO_CHANGE | FEAT | Zero Range | `0dbd1d12c0b99725` | `vehicle` | NEGATIVE_EXCLUSION_POLICY | NEGATIVE_EXCLUSION |
| NO_CHANGE | FEAT | Return Fire | `80c52cf7838095c1` | `vehicle` | NEGATIVE_EXCLUSION_POLICY | NEGATIVE_EXCLUSION |
| NO_CHANGE | TALENT | Personalized Modifications | `111b0a9d1f8d5111` | `vehicle` | REFERENCE_ONLY_POLICY | REFERENCE_ONLY |
| NO_CHANGE | TALENT | Device Jammer | `5db4343762664d95` | `vehicle` | NEGATIVE_EXCLUSION_POLICY | NEGATIVE_EXCLUSION |
| NO_CHANGE | TALENT | Cover Bracing | `c59e7eba84e6d4eb` | `vehicle` | REFERENCE_ONLY_POLICY | REFERENCE_ONLY |
| NO_CHANGE | TALENT | Sentinel Strike | `cf2d518039afd828` | `dark_side` | NEGATIVE_EXCLUSION_POLICY | NEGATIVE_EXCLUSION |
| ADD | FEAT | Improved Rapid Strike | `cb6aea7e256e4c8c` | `lightsaber` | CLOSED_SCOPE_POLICY + DIRECT_OPERATIVE_MECHANIC_POLICY | CLOSED_DIRECT |
| NO_CHANGE | FEAT | Weapon Proficiency | `ecc2471ac96ec2d4` | `lightsaber` | OPEN_GENERIC_SCOPE_POLICY | OPEN_GENERIC_SCOPE |
| ADD | TALENT | Noble Fencing Style | `00c3231e4a4173fa` | `lightsaber` | CLOSED_SCOPE_POLICY + DIRECT_OPERATIVE_MECHANIC_POLICY | CLOSED_DIRECT |
| NO_CHANGE | TALENT | Accurate Blow | `32df92c3114b5c94` | `lightsaber` | OPEN_GENERIC_SCOPE_POLICY | OPEN_GENERIC_SCOPE |
| NO_CHANGE | TALENT | Empower Weapon | `5218d5971b78119b` | `lightsaber` | REFERENCE_ONLY_POLICY | REFERENCE_ONLY |
| NO_CHANGE | TALENT | Champion | `a7aea0411eb4fbc0` | `lightsaber` | NEGATIVE_EXCLUSION_POLICY | NEGATIVE_EXCLUSION |
| NO_CHANGE | TALENT | Transfer Essence | `c1be1f29c00436d5` | `lightsaber` | REFERENCE_ONLY_POLICY | REFERENCE_ONLY |
| NO_CHANGE | FEAT | Weapon Proficiency | `ecc2471ac96ec2d4` | `melee` | OPEN_GENERIC_SCOPE_POLICY | OPEN_GENERIC_SCOPE |
| ADD | TALENT | Nimble Dodge | `913a0ca43e032caa` | `melee` | CLOSED_SCOPE_POLICY + DIRECT_OPERATIVE_MECHANIC_POLICY | CLOSED_DIRECT |
| ADD | TALENT | Block | `9379daa94a228c04` | `melee` | CLOSED_SCOPE_POLICY + DIRECT_OPERATIVE_MECHANIC_POLICY | CLOSED_DIRECT |
| ADD | TALENT | Cover Escape | `fcd7c1e0bd15df71` | `melee` | CLOSED_SCOPE_POLICY + DIRECT_OPERATIVE_MECHANIC_POLICY | CLOSED_DIRECT |
| NO_CHANGE | FEAT | Weapon Proficiency | `ecc2471ac96ec2d4` | `pistol` | OPEN_GENERIC_SCOPE_POLICY | OPEN_GENERIC_SCOPE |
| ADD | TALENT | Cover Fire | `049820827d7ef32b` | `pistol` | CLOSED_SCOPE_POLICY + DIRECT_OPERATIVE_MECHANIC_POLICY | CLOSED_DIRECT |
| NO_CHANGE | TALENT | Greater Weapon Specialization | `e9820b341bf94de1` | `pistol` | OPEN_GENERIC_SCOPE_POLICY | OPEN_GENERIC_SCOPE |
| ADD | TALENT | Beloved | `444c032c563c18a1` | `ranged` | CLOSED_SCOPE_POLICY + DIRECT_OPERATIVE_MECHANIC_POLICY | CLOSED_DIRECT |
| ADD | TALENT | Deflect | `72c644f7a09b1186` | `ranged` | CLOSED_SCOPE_POLICY + DIRECT_OPERATIVE_MECHANIC_POLICY | CLOSED_DIRECT |
| ADD | TALENT | Shield Gauntlet Defense | `852bca9332684a2b` | `ranged` | CLOSED_SCOPE_POLICY + DIRECT_OPERATIVE_MECHANIC_POLICY | CLOSED_DIRECT |
| ADD | TALENT | Intimidating Defense | `de751f28fc269c85` | `ranged` | CLOSED_SCOPE_POLICY + DIRECT_OPERATIVE_MECHANIC_POLICY | CLOSED_DIRECT |
| NO_CHANGE | FEAT | Triple Crit | `3d4a4e93ced26712` | `unarmed` | REFERENCE_ONLY_POLICY | REFERENCE_ONLY |
| NO_CHANGE | FEAT | Weapon Focus | `c41814601364b643` | `unarmed` | REFERENCE_ONLY_POLICY | REFERENCE_ONLY |

## Tag questions resolved by existing policy

- TAG_DEFINITION `battlefield_control`: PASS3B_POLICY_RESOLVED by BATTLEFIELD_CONTROL_POLICY
- TAG_DEFINITION `reliability`: PASS3B_POLICY_RESOLVED by RELIABILITY_POLICY

## Ontology gaps (PHASE3_ONTOLOGY_GAP, preserved for Phase 3D)

- Condition Track movement: 16 feats / 79 talents mention the wording; no tag is created.
- Full-round action: 9 feats / 47 talents mention the wording; no tag is created.
- Recurring ion mechanics (no ion tag; ion != stun): 4 feats / 3 talents mention the wording; no tag is created.
