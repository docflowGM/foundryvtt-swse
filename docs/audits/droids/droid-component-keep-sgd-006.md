# SWSE Droid Component KEEP-006 — communications, processor, remote-control rules

**Date:** 2026-11-02. **Branch:** `audit/droid-publication-census-2026-10-29`.  
**Printed source:** *Scavenger's Guide to Droids*, pp.53,56,58-59,61 (PDF page number = printed +1), visually inspected, including Table 3-2.  
**JSON:** `data/audits/droids/component-keep-source-facts-sgd-006.json`.

## Scope and source facts

Eight existing component identities reviewed with printed costs, host classification, action/permission limits, and source page references. This is a **source review, not a full mechanical certification**.

| Component | Printed cost | Weight | Availability | Host and status |
|---|---|---|---|---|
| Communications Jammer | 5000  | 5 | Military | DROID_INTERNAL_COMMUNICATIONS_CANDIDATE |
| Remote Receiver Jammer | 2000  | 2 | Military | PORTABLE_BACKPACK_TRANSMITTER_HANDHELD_CONTROLLER_NOT_BODY |
| Remote Receiver Signal Booster | 500  | 2 | Licensed | RECEIVER_MODIFICATION |
| Droid Remote Control | 500  | 0.5 | - | DROID_CONTROL_ATTACHMENT_REQUIRES_CALLER |
| Hidden Core | 200 (protected 400) | 0 or 1 kg | Restricted | PROCESSOR_BACKUP_OR_SEPARATE_DATA_STORE |
| Personality Downloader | 5000 + minimum | 2 | Illegal | EXTERNAL_ILLEGAL_INVASIVE_DATAPORT_TOOL |
| Remote Starship Starter | 50  | 2 | - | DROID_SHIP_SIGNAL_ACCESSORY |
| Credit Reader | 50  | 1 | Licensed | DROID_INSTALLED_FINANCIAL_SENSOR |

## Source-mechanical findings

**Communications Jammer:** 5,000 cr / 5kg, Military (SGD pp56,59). Two different methods: hijack a facility communications computer (source +5 equipment Use Computer for slice/shutdown and defending that status against slicers), or jam local incoming/outgoing comlink signals within **1km** by **DC25 Use Computer**. Do not award the +5 on all Use Computer checks or treat jamming as automatic.

**Remote Receiver Jammer:** 2,000 cr / 2kg, Military (pp59,61). The source explicitly describes an **external backpack transmitter plus handheld computer controller**, not a droid-body system. Activator uses **standard action each turn** and rolls Use Computer. At start of a target droid's turn, only if it has a remote receiver **without backup processor**, compare activation check >= Will; on success target is flat-footed and cannot act until start of next turn. Printed narrative says extremely short range, but no exact square range in reviewed entry. Do not invent one.

**Remote Receiver Signal Booster:** 500 cr / 2kg, Licensed (pp59,61); extends ordinary receiver range **50%**. The receiving droid may try DC30 Use Computer to extend range up to **100% for an hour**. Whether that time-limited bonus stacks additively with the ordinary 50% is not explicit; record ambiguity, do not default to 2.5× base range. Printed description does not establish a global chargen ban.

**Droid Remote Control:** 500 cr / 0.5kg (pp53,59). Advanced restraining-bolt system: owner with droid caller moves droid at **half speed** via its existing locomotion; cannot compel use of equipment or other systems. Must distinguish owner permission, controller and target chassis. Not a substitute for Remote Processor.

**Hidden Core:** 200 cr standard, **400 cr** enhanced concealment; Restricted (pp53,59). Can be concealed in primary processor (**table weight dash**) or separate store (**1kg**). Recovery occurs after **1d6 days**, with **DC20 Use Computer** check using **d20+max(10, droid's actual Use Computer modifier)**. On failure retry at successive 1d6-day intervals. Detection needs explicit suspicion/search and Use Computer vs Will Defense; enhanced variant replaces this check's defense with **30**. Raw data omits the minimum +10 recovery modifier and treats its weight as fixed.

**Personality Downloader:** Custom construction **5,000+ credits**, **2kg+**, Illegal (pp53,59). Not a normal installable component: an external invasive tool physically plugs into dataport. Requires access (Locked Access matters), initial Use Computer vs Will, **five minutes** to suppress existing personality, further opposed Use Computer checks **every ten minutes** to maintain. Do not normalize printed minimum 5,000+ to exact every-case 5,000 quote, or make control permanent.

**Remote Starship Starter:** 50 cr / 2kg (pp53,59); permits signal for ship preflight and returns diagnostic data as free action. **No remote piloting** or free launch/attack/hyperspace privilege.

**Credit Reader:** 50 cr / 1kg, Licensed (pp56,58). Overlay-only, no raw price or weight; generic default part quote can fall back to zero. Scoped +5 Perception against forged financial documents/accounts and free-action counting of hard credits; not universal social detection.

## Cross-application acceptance contracts

Ten **unexecuted** fixtures reside in the machine packet. They exercise: jamming with/without backup processor; Hidden Core minimum recovery +10 and better actual skill; caller-limited movement; passive booster range; blocked personality installation without dataport access; Credit Reader price; scoped communications jam; preflight not autopilot. Each explicitly records Garage, PC chargen, follower, Store and Foundry as **NOT_TESTED**.

**Important architecture:** The portable jammer and Personality Downloader must not automatically enter a droid's `system.installedSystems`. The owner/controller on an existing remote-control attachment needs explicit proof. No production definition or actor was changed.

## Review counts and verification

8 additional source-fact rows; 11 typed findings; 10 source-expected acceptance specifications. Running source-fact tally **90** (KEEP track **63**). These are *row counts*, not unique mechanically certified KEEP identities, and none received complete source-mechanical, production, cross-app, or runtime certification.

In-memory schema/page checks performed. Reproducible structural validator after checkout:

```sh
node tools/audits/droids/verify_component_keep_source_facts_sgd_006.mjs
```

Node validator, CI suite and Foundry V13 runtime **not executed** during this source-only review.

**Next:** Core/SGD inventory crosscheck for duplicate prior rule rows, then SGD remaining shield/locomotion/control components; full 122-identity census must also be extended into other books before claiming authoritative published completeness. Keep the 234 stock-droid actor workstream independent.
