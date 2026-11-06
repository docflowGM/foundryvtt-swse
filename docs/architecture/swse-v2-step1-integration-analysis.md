# SWSE V2 Step 1 - Integration Analysis (read-only; nothing here has been executed against `main`)

Observed 2026-11-06 with `git fetch` (exact SHAs below). Offline analysis only; nothing merged, no PR base changed.

## Ancestry

| Ref | SHA | In `origin/main`? | Ahead of main | Behind main | Merge-base with main |
|---|---|---|---|---|---|
| `origin/main` | `de196e5a4` (merge of #1109) | - | - | - | - |
| `integration/v2-vehicles-droids-2026-11` | `8ad8ca41e` | **yes** | 0 | 1 | itself |
| `feature/v2-unified-completion` (#1111) | `968b25702` | **yes** | 0 | 2 | itself |
| `audit/universal-vehicles-phase1` (#1092) | `e844aba1b` | **yes** | 0 | 337 | itself |
| #1112 `feature/v2-unified-wave-1` | `59ab2ab50` | no | 2 | 2 | `968b25702` |
| #1113 `...wave-2-guards` | `502810b6d` | no | 3 | 2 | `968b25702` |
| #1114 `...wave-2b-host-eligibility` | `e0d7a558a` | no | 5 | 2 | `968b25702` |
| #1115 `...gate-c3a-creation-ledger` | `b76c55de8` | no | 7 | 2 | `968b25702` |
| #1116 `...u0-convergence-audit` | `202082309` | no | 9 | 2 | `968b25702` |
| #1117 `...clean-break-convergence` | `7e1a753d6` | no | 15 | 2 | `968b25702` |
| #1118 `...vehicle-upgrade-writer-closure` | `8778d4474` (at this analysis) | no | 28 | 2 | `968b25702` |

## The two "missing" commits

`main` has two commits the stack lacks: `8ad8ca41e` (merge of #1111) and `de196e5a4` (merge of #1109). They are merge commits. **`git diff 968b25702 origin/main` is empty**: main's tree equals the stack's merge-base tree. A trial `git merge --no-commit --no-ff origin/main` of the #1118 head in a temporary worktree completed automatically with **no conflicts and no content change** (the worktree was removed; nothing was committed or pushed).

## Recommendation (not executed)

1. **Do not merge `main` into each stacked branch.** It would add up to seven merge commits and change no file.
2. **Retarget the bottom PR (#1112) to `main`** before merging: its current base, the integration branch, is already fully contained in `main`. Its diff against `main` equals its diff against the integration branch because the trees are identical. That is a PR-base change and belongs to the owner.
3. Merge bottom-up; after each merge the next PR's base is retargeted to `main` (GitHub does this when the head branch of the merged PR is deleted, or manually). After each merge, re-run the full local suite and require exact-head CI before the next.
4. If a linear history is preferred, a single merge of `origin/main` into the BOTTOM branch (then fast-forwarding each upper branch onto its parent) achieves the same with one commit; it rewrites no history and still changes no file. Choose this only if the policy requires the branches to show "0 behind".
5. Nothing is merged to `main` before Foundry v13 acceptance (see the implementation log's remaining items).

## What this analysis does not prove

Content equality of trees says nothing about runtime behavior; the stack has never been run in Foundry. A passing trial merge also does not test that `main`'s CI is green at `de196e5a4`.
