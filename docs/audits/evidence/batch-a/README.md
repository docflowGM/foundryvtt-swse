# Batch A audit evidence (research only)

**These files are read-only audit evidence. They are not data.** The generator (`tools/build-modification-runtime.mjs`), the validator, the status ledger, the specification records, the planner and any future loader (G8) must never read, import or package anything in this directory. They read only the files named in `docs/audits/modification-v2-runtime-schema.md`. A change to this directory must not be treated as a change to any certification status, blocker, registry claim or runtime definition.

## `swse_batch_a_typed_domain_crosswalk_232.csv`

| Item | Value |
|---|---|
| SHA-256 of the file as received (CRLF line endings) | `06cb541309859bfd157e3fe3b276219b50ec2678f3dda18bdec0d1f762d99fd9` |
| SHA-256 of the committed file (the repository's `.gitattributes` normalizes text to LF) | `01766f5a3e18467c7909c63faf1d80c3b1af9389c2a9f84a493de95310fb2c55` |
| Line-ending note | The two hashes differ only because of CRLF to LF normalization; the content is otherwise identical. To check the received file against the committed copy, compare after converting line endings |
| Rows | 232 (one per typed definition, `parentId::domain`) |
| Distinct parents | **185**. The registry has 186 parent records; the one without a row is `sv-droidification`, an excluded record with no in-scope typed domain |
| Produced by | The independent reviewer, reconstructed from registry v1.5 (a research inventory, not an approved specification) |
| Reconciled against | `data/modifications/runtime-definitions-v1.5.json` at `fb6d6db33`; results in `docs/audits/swse-v2-typed-domain-reconciliation-review.md` section 2 |

### What the columns are and are not

- `registry*` columns copy the immutable registry's existing claims (book, page, source role, slot kind and value, price kind and amount). They match the runtime file on all 232 rows. They are claims, not certified facts.
- `researchApplicationRoute`, `hostRestrictionResearchNote`, `reviewQuestions` and `sourceReviewEvidence` are research hypotheses and clues.
- `*Certification` columns are `NOT_CERTIFIED` on every row and mean only that this file asserts no certification. They are not the ledger's component statuses.
- `errataReviewFlag` and `provisionalErrataSlotCorrection` mark **unauthenticated** errata candidates. `provisionalErrataSlotCorrection` is not a slot value. Known defects: the Tech Specialist device-slot flag is attached to `sog-tech-improved-accuracy::weapon` (unrelated), and there is no row for Superior Protective Armor (not a registry definition).
- `action` is `RESEARCH_ONLY_NO_LIFT` on every row.

### Reviewer-reported findings versus repository statuses

The source observations in Batch A Reports 01-04 are the reviewer's visual inspection of the PDFs. The implementer has not seen those page images. A reviewer-reported finding does not create a repository `SOURCE_VERIFIED` component status; that status changes only through the repository's own process (specification records, ledger and an appended lift row with source and evidence, each independently reviewed). Nothing in this directory has done so.
