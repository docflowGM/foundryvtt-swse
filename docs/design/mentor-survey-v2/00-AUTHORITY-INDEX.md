# Mentor Survey V2 — Authority Index

**Status:** Phase A consolidation. Verified against GitHub on 2026-11-15.
**Scope:** Level 1 (Q1–Q5), Foundation-Class Multiclass (Q1–Q6), Prestige (Q1–Q6).
**Implementation rule:** Only the documents in this directory are authoritative for implementation. The upstream rolling designs are *historical source material*; where they conflict with these documents, these documents win and the conflict is recorded in `06-CONTENT-STATUS-AND-BLOCKERS.md` or the rules register.

## 1. Authoritative documents (this directory)

| Doc | Governs |
|---|---|
| `01-SHARED-ARCHITECTURE-CONTRACT.md` | Authority lanes, lifecycle, persistence, Q6 reflection engine, content gate, tag-mapping boundary |
| `02-L1-SPEC.md` | Level 1 survey |
| `03-MULTICLASS-SPEC.md` | Foundation-class multiclass survey |
| `04-PRESTIGE-SPEC.md` | Prestige survey |
| `05-TRACEABILITY-MATRIX.md` | Requirement → source → implementation → test |
| `06-CONTENT-STATUS-AND-BLOCKERS.md` | Approval/certification state of every content family; missing artifacts; blockers |

## 2. Upstream source branches (verified HEADs, 2026-11-15)

| Branch | HEAD | Role |
|---|---|---|
| `main` | `8efa6808a8f12e80a85cea9132bf8c06aeefed5a` | Runtime baseline |
| `docs/l1-adaptive-mentor-survey-q1-q5-20261113` | `ff7f605a340c82b1389845d1b1a61ebc8e30c3a5` | L1 rolling design **v0.19** + Q1–Q5 banks |
| `docs/l1-adaptive-mentor-survey-design` | `17fd6820b…` | L1 v0.10 — **superseded** by v0.19 |
| `design/multiclass-mentor-survey-q1-q6-v011` | `eb531a6b0fc5482edd62eedfea4dfebd312946ee` | Multiclass rolling design v0.11 (Q1–Q6, Q6 Pass A/B) |
| `design/prestige-q2-character-synthesis-v08` | `228a7dc01e75d926728b7f015cac4ec66bdd15b7` | Prestige Q2 v0.8, Q3 v0.1, Q4, Q5, Q6 handoff (rolling design v0.26 is identical on `design/prestige-q1-crossbook-audit-v026` @ `0f56de3a4…`) |
| `docs/mentor-survey-rolling-design-v0-9-20261113` | `1d56ae4279c53fa2f1a7ead2c312b4ef73ec7e79` | Shared cross-survey design v0.9 (§9 and §13 are owner-confirmed) |

The upstream branches are not merged to `main`. Their content is summarized and bound into these specs; runtime content packs record the source commit and section for every record (`sourceRef`).

## 3. Supersession rules applied

1. **L1:** v0.19 supersedes v0.10 and every earlier checkpoint. Inside v0.19, the order of precedence is: v0.18 "locked Q4" checkpoint → v0.19 Q5 checkpoint → v0.12 Q2 layout (§12) → v0.13 Q3/Q4 structure (§13) → older §3/§8B text (historical). The old "Q3 and Q4 are symmetric career situations" wording is **superseded**: Q3 is keyed by class + Q1 answer; Q4 is keyed by the exact Q2 parent (see conflict C-01 in `06`).
2. **Multiclass:** The later "Q2 top-four existing-scores contract", "Q3 owner-approved investment depth", "250-scenario Q4 expansion" and "Q6 Pass A/B" sections supersede the earlier Q2/Q3/Q4 working proposals inside the same file. The "125 bias × class Q2 library" supersedes "MC-Q2-ARCHETYPE-LIBRARY-05" sizing.
3. **Prestige:** Rolling design §8 (Q1 *class-discovery* pivot) supersedes the retrospective Q1 of §§1–7. The legacy four-question survey (`prestigeMeaning / commitmentDepth / specialization / profileReading`) and its bias-pruning semantics are **retired**.
4. **Cross-survey:** v0.9 §9 and §13 are the only owner-confirmed cross-survey contracts. Numeric constants anywhere in the rolling documents are illustrative and are **not** implemented.
5. **Editorial tone:** newly authored editorial text avoids em dashes (owner instruction, Prestige Q6 handoff). Imported text is preserved verbatim from the source; no rewriting.

## 4. Approval taxonomy (used in every content record)

| Class | Meaning | May ship to players by default |
|---|---|---|
| `owner_approved_architecture` | Structure/behavior approved by owner | n/a (code) |
| `owner_approved_text` | Individual wording explicitly approved | yes, once its survey passes the release gate |
| `draft_text` | Authored, **not** line-approved | **no** (editorial preview only) |
| `certified_mechanic` | Mechanical claim certified against printed source and V2 authority | yes |
| `unverified_mechanic` | Mechanical claim not certified | **never** presented as ownership or legality |
| `legacy_behavior` | Existing implementation | retired by cutover |

A drafting pass is never treated as approval ("drafting completion is NOT approval", Prestige Q6 handoff §5).
