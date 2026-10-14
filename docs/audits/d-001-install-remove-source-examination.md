# D-001 — Source examination: installing and removing an upgrade

**Status: `PENDING_SOURCE_VERIFICATION` (unchanged). Nothing in this note is certified.** It records what the repository's OCR text layer of *Scum and Villainy* shows for the install/remove procedure, what is legible, what is not, and what is needed to certify the rule. It lifts no blocker, makes no ruling and changes no production behavior.

## 1. Evidence examined

| Item | Value |
|---|---|
| Source | *Scum and Villainy*, section "Installing Upgrades" (registry procedure `sv-install-remove-upgrade`, registry printed page 39) |
| Text layer | `reference/sourcebooks/Scum and Villainy_djvu.txt`, SHA-256 prefix `3621af76a89cbc50`, lines 2328-2357 (install/remove text and cost-time table) |
| Authority of that file | Its own README: an OCR/DjVu export used as a *searchable source layer*; "when OCR … or tables … is ambiguous, the corresponding PDF remains the final source authority"; do not silently correct source text from general knowledge |
| PDF page image | **Not available in this environment.** No printed-page marker exists in the OCR, so the page number rests on the registry's claim |

## 2. What the OCR shows (raw, uncorrected) and how far it can be read

Raw OCR, lines 2328-2357 (garbling is the OCR's, reproduced as found):

```
INSTALLING UPGRADES:
tect of stating mann nd enogia an overhead wrk. Te
ieount ive ad Mechanic heck DC eqeseepnds on the nmber
1 voyage pm egaed ard the quay of te uprae eommercay
ght eset)
'Rucci upgrade cots twice a much 3 commercial ought
grade After the time late sboe mes Mechanic ches agua te
Speoprate DC. Ona utes, the apyade isa ad frcining
Povey Oa he wpgrage des werk proper you may attempt
'Relechais heck aga bt exc ey regures tesa amount tine
acta af at much the gia atten.
Removing a upgrade eqs the ae aunt of ine bt reduce the
MechoncsBCby& Ons arth uprade hasbeen ences bt rt
Feed you map tet te Mechanic check gan wtih egret
Seamount ol tun) yu donne about removing the uprade tet,
esti the ine rene othe ert wer cement or example, ram
yt hur or rf 1 mite) bat he parade automaticaly
estoyedon a fad check. Once he vga soe remove [ot
festroe the upgrade st twat orp becomes rate aa,
UPGRADE COMMERCIALLY
Pots souGHT ScRAToH-BUIT
° 1 1 ois 5 howe
1 '20 fowr 025,140 (Bhows)
rover 1301 4ay(8hows) OCS, wee as
```

| Element | Readable from OCR? | Reading (NOT certified) |
|---|---|---|
| Install time and the Mechanics check DC depend on the number of upgrade points and whether the upgrade is commercially bought or scratch-built | Mostly ("Mechanic heck DC … depends on the n[umber] … upgrade [points] … commercially [bought]/scratch") | Structural only |
| A scratch-built upgrade costs twice as much as a commercially bought one | Fairly ("cots twice a much 3 commercial ought") | Needs PDF confirmation of the exact wording |
| After the time elapses a Mechanics check against the appropriate DC; success installs it working properly | Partly | Needs PDF |
| On failure the upgrade does not work properly; a retry is allowed, requiring the same amount of time and a cost qualifier ("… as much …") | Partly; the cost qualifier is illegible | Needs PDF |
| Removing an upgrade takes the same time, with the Mechanics DC reduced by a number | **Number unreadable** ("by&") | Needs PDF |
| A destroyed-on-failed-check consequence for removal, and what happens to a removed upgrade | Partly; the conditions and the "removed/destroyed" outcomes are interleaved and garbled | Needs PDF |
| The table of upgrade points versus time, DC and cost for commercially bought and scratch-built | **Illegible.** Row labels, hour counts, DC values and credit multipliers cannot be recovered | Needs PDF |

## 3. Conclusion

The OCR confirms the **shape** of the procedure that the registry outline already states (time and DC from upgrade points and quality, scratch-built at twice the cost, a Mechanics check, retry on failure, a reduced DC for removal, destruction on a failed removal check). It does **not** supply the numeric values (hours, DC, the removal reduction, the retry cost, the table), and several consequences are garbled. Under the project's rule that OCR ambiguity is settled by the PDF and never by recollection of the rules, **no value can be certified from this layer.** D-001 therefore stays `PENDING_SOURCE_VERIFICATION`; it is a research gap, not a rules ambiguity, and no owner decision is requested.

## 4. What is needed to close D-001

1. Read the Installing Upgrades text and the cost/time table from the *Scum and Villainy* PDF (registry printed page 39; confirm the printed page number and whether the table is on the same page).
2. Record in this note, for each rule: exact wording, printed page, table identity, and the numeric values, as a verified transcription.
3. Only then author specification records (`installProcedure`, per `docs/audits/modification-v2-runtime-schema.md` section 5) and append a register "Blocker lifted" row with `source=` and `evidence=` (the generator rejects any lift without both).
4. The related outlines on adjacent pages (stripping pp. 37-38; size increase pp. 38-39: D-002, D-003) are separate entries with their own examination; this note does not cover them. The OCR near them is similarly degraded.

## 5. What this changes

Nothing in production, in the registry, the ledger, the specification records or the generated runtime file. The register receives one appended "Source examination log" row on D-001 pointing here.
