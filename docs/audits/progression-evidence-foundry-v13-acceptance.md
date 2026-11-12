# Progression Evidence - Foundry V13 acceptance addendum (Checkpoints A-E)

**Status: PREPARED, NOT RUN.** Nothing below has been executed in Foundry V13. Node tests use stubs for ActorEngine, the permission model, AppV2 and the DOM; they cannot certify any item here.
This addendum extends `reconciliation-v2-foundry-v13-acceptance.md` (same world setup, fixtures and pass/fail conventions; a case is PASS only with attached evidence). SHA under test: ______ ; Foundry build: ______ ; GM: ______ ; Player A (owner): ______ ; Player B (owner of another actor / observer): ______.

## Fixtures
- **P1** level-8 non-droid character, no ability-increase history (legacy).
- **P2** level-8 character finished through the Level-Up shell at level 8 (system record; check whether `verification.state` is `verified`).
- **P3** level-8 character with a system record of only 1 increase (short record).
- **P4** droid (level >= 4) and **P5** character with a Nonheroic class level >= 4 (count rules deferred RECON-002/003).
- **P6** world with house rule `allow_stacked_two` on (and one with it off).

## Cases
| # | Needs | Steps | Expected |
|---|---|---|---|
| E-1 | Player A on P1 | Open sheet header. | A neutral **Review Progress** button is present; the red `!` is NOT shown for missing history. Same on a droid sheet (P4). |
| E-2 | Player A on P1 | Click Review Progress. | Overlay opens; "Review Progress" lists Level 4/8 rows as **Not verified** with "not an error" wording; no row in the findings table. |
| E-3 | Player A on P1 | Already Applied on Level 8; leave confirm unchecked, press Record. | Refused with "Confirmation is required"; nothing written (inspect `system.progression.abilityIncreaseHistory`). |
| E-4 | Player A on P1 | Already Applied, enter two different abilities, confirm. | Row becomes **Manually acknowledged**; record has `source:'manual-attestation'`, `appliedBySystem:false`, `evidence:'player-confirmed'`; **no ability score, HP or derived value changed** (compare before/after); `lastAbilityIncrease` unchanged; header still no `!`. |
| E-5 | Player A on P1 (Level 4) | Already Applied with only one of two increases. | **Partially acknowledged**, "remainder not verified"; no finding, no `!`. Repeat for the remainder -> Manually acknowledged. |
| E-6 | Player A | Enter the same ability twice with the house rule off; enter an ability twice beyond the cap; enter more than the entitlement. | Each refused with explanation, history unchanged. |
| E-7 | Player A | Correct own statement; then Withdraw it. | Original kept as superseded/withdrawn (inactive, shown), replacement counts; after withdrawal row returns to Not verified. |
| E-8 | Player B (not author) | Open P1 overlay (if permitted to view). | No Correct/Withdraw controls on Player A's record; a forced call returns NOT_AUTHORIZED. |
| E-9 | GM | Supersede Player A's statement; withdraw another GM's GM-authorized statement. | Replacement `gm-authorized`, original preserved with attribution; unrelated active statements still count. |
| E-10 | Player A on P1 | **Apply Increases** on an untouched level. | Opens the focused reconcile route (existing progression authority); after finalize, record is a system record. On a level that already has any record, Apply is not offered. |
| E-11 | Player A on P2 | Open Review Progress. | **System verified** (or Not verified if the record has no verification block - report which). |
| E-12 | Player A on P3 | Open Review Progress. | Short system record: Partially acknowledged/Not verified, never "Confirmed mechanical discrepancy". |
| E-13 | GM on P4/P5 | Open Review Progress. | Rows say the count is a pending rules question; no Already Applied / Apply controls. |
| E-14 | Player A | Click **Ignore** on any unrelated finding, reopen Review Progress. | Ignore changes no completion state. |
| E-15 | Two clients | Both prepare Already Applied for the same level, same moment. | Record whichever outcome occurs. KNOWN LIMITATION: no compare-and-set; document duplicates or stale overwrites. |
| E-16 | Player A | After E-4, refresh the sheet and reopen the overlay without reloading. | Row reflects the write immediately (memo keyed on actor modification stamp). |
| E-17 | Player without Update permission on the actor | Try Already Applied. | Refused (fail closed). |
| E-18 | Any | Browser console during E-1..E-17. | No errors from the evidence handlers or the overlay VM. |

## Not covered / do not claim
Q8 (optional "associate this direct ability edit with an entitlement") is not implemented. Cross-client concurrency, real permission levels, real AppV2 dialog rendering (`SWSEDialogV2.prompt` callback argument shape: element vs jQuery), and visual layout are runtime-only. RECON-001..007 and HP-001 remain open rules questions (`docs/audits/swse-rules-decisions-pending.md`).
