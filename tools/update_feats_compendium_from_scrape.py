"""
Update SWSE Foundry feats.db from scraped SWSE Fandom feat data.

Inputs, by default next to this script:
  - feats.db
  - swse_feats.json

Outputs:
  - feats.updated.db
  - feat_compendium_update_report.csv
  - feat_compendium_update_report.json
  - feat_compendium_unmatched_db.csv
  - feat_compendium_unmatched_scrape.csv

What it updates when a feat name matches:
  - system.description.value = full structured HTML description
  - system.benefit = exact Effect text from the scraped page
  - system.prerequisite = backchecked prerequisite text from the scraped page
  - system.special = exact Special text, when present
  - system.normalText = exact Normal text, when present
  - system.shortSummary = quick player-facing summary
  - system.referenceBooks = list of scraped reference books
  - system.sourceUrl = SWSE Fandom source URL

It preserves ids, flags, effects, tags, structured prerequisites, execution mappings,
and all other existing Foundry fields.
"""

from __future__ import annotations

import csv
import html
import json
import re
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

SCRIPT_DIR = Path(__file__).resolve().parent
INPUT_DB = SCRIPT_DIR / "feats.db"
INPUT_SCRAPE = SCRIPT_DIR / "swse_feats.json"
OUTPUT_DB = SCRIPT_DIR / "feats.updated.db"
REPORT_CSV = SCRIPT_DIR / "feat_compendium_update_report.csv"
REPORT_JSON = SCRIPT_DIR / "feat_compendium_update_report.json"
UNMATCHED_DB_CSV = SCRIPT_DIR / "feat_compendium_unmatched_db.csv"
UNMATCHED_SCRAPE_CSV = SCRIPT_DIR / "feat_compendium_unmatched_scrape.csv"

SOURCE_SUFFIXES_TO_DROP = {
    "gaw", "kotOR", "kotor", "sotg", "totg", "fu", "tfu", "cw", "saga", "core"
}


def stable_key(name: str) -> str:
    """Normalize a feat name for direct matching while preserving meaningful parentheticals."""
    value = str(name or "").strip().lower()
    value = value.replace("’", "'").replace("‘", "'")
    # Drop parenthetical source disambiguators such as "Staggering Attack (GaW)".
    value = re.sub(
        r"\s*\((gaw|kotor|kotOR|sotg|totg|fu|tfu|cw|saga|core)\)\s*$",
        "",
        value,
        flags=re.IGNORECASE,
    )
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def clean_inline(text: Any) -> str:
    value = "" if text is None else str(text)
    value = value.replace("\xa0", " ").replace("\r\n", "\n").replace("\r", "\n")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\s+([,.;:!?\)])", r"\1", value)
    value = re.sub(r"([\(\[\{])\s+", r"\1", value)
    value = value.replace(" ,", ",")
    value = value.replace(" .", ".")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def _flush_chunk(chunks: List[List[str]], chunk: List[str]) -> None:
    if chunk:
        chunks.append(chunk[:])
        chunk.clear()


def split_raw_chunks(text: Any) -> List[List[str]]:
    value = "" if text is None else str(text)
    value = value.replace("\xa0", " ").replace("\r\n", "\n").replace("\r", "\n")
    chunks: List[List[str]] = []
    chunk: List[str] = []
    for raw_line in value.split("\n"):
        line = raw_line.strip()
        if not line:
            _flush_chunk(chunks, chunk)
            continue
        chunk.append(line)
    _flush_chunk(chunks, chunk)
    return chunks


def normalize_chunk(lines: Iterable[str]) -> str:
    lines = [clean_inline(line) for line in lines if clean_inline(line)]
    if not lines:
        return ""

    # Preserve bullet lists and pipe-table rows rather than flattening them into one sentence.
    has_bullets = any(line.startswith("- ") for line in lines)
    pipe_count = sum(1 for line in lines if "|" in line)
    has_table = pipe_count >= 2

    if has_bullets:
        out: List[str] = []
        current = ""
        for line in lines:
            if line.startswith("- "):
                if current:
                    out.append(current)
                current = line
            elif current:
                current = f"{current} {line}"
            else:
                out.append(line)
        if current:
            out.append(current)
        return "\n".join(out)

    if has_table:
        return "\n".join(lines)

    return clean_inline(" ".join(lines))


def clean_text(text: Any) -> str:
    chunks = [normalize_chunk(chunk) for chunk in split_raw_chunks(text)]
    chunks = [chunk for chunk in chunks if chunk]
    return "\n\n".join(chunks).strip()


def blocks_from_text(text: Any) -> List[str]:
    return [normalize_chunk(chunk) for chunk in split_raw_chunks(text) if normalize_chunk(chunk)]


def extract_reference_books(record: Dict[str, Any]) -> List[str]:
    found: List[str] = []
    for entry in record.get("referenceBooks") or []:
        cleaned = clean_text(entry)
        if cleaned and cleaned not in found:
            found.append(cleaned)

    raw = clean_text(record.get("rawText", ""))
    for match in re.findall(r"Reference Book:\s*(.*?)(?=\n\n|\n(?:See also|Prerequisites?|Prerequisite|Effect|Normal|Special):|$)", raw, flags=re.I | re.S):
        cleaned = clean_text(match)
        if cleaned and cleaned not in found:
            found.append(cleaned)

    for section in record.get("sections") or []:
        content = clean_text(section.get("content", ""))
        for match in re.findall(r"Reference Book:\s*(.*?)(?=\n\n|\n(?:See also|Prerequisites?|Prerequisite|Effect|Normal|Special):|$)", content, flags=re.I | re.S):
            cleaned = clean_text(match)
            if cleaned and cleaned not in found:
                found.append(cleaned)
    return found


def extract_intro(record: Dict[str, Any]) -> str:
    blocks = blocks_from_text(record.get("rawText", ""))
    intro: List[str] = []
    started = False
    for block in blocks:
        lower = block.lower()
        if lower.startswith("reference book:"):
            continue
        if lower.startswith("see also:"):
            started = True
            continue
        if re.match(r"^(prerequisites?|effect|benefit|normal|special):", block, flags=re.I):
            break
        if lower.startswith("additional "):
            break
        # Some pages begin with a disambiguation note; keep it out of the player description.
        if lower.startswith("this article details") or lower.startswith("you may be looking"):
            continue
        if started or block:
            intro.append(block)
    return "\n\n".join(intro).strip()


def paragraph_html(block: str) -> str:
    block = block.strip()
    if not block:
        return ""

    lines = [line.strip() for line in block.split("\n") if line.strip()]

    if lines and all(line.startswith("- ") for line in lines):
        items = []
        for line in lines:
            text = html.escape(line[2:].strip())
            # Bold common leading labels in bullet items, such as "Add Emplacement:".
            text = re.sub(r"^([^:]{1,60}:)", r"<strong>\1</strong>", text)
            items.append(f"<li>{text}</li>")
        return "<ul>" + "".join(items) + "</ul>"

    if len(lines) >= 2 and all("|" in line for line in lines):
        rows = []
        for idx, line in enumerate(lines):
            cells = [html.escape(cell.strip()) for cell in line.split("|")]
            tag = "th" if idx == 0 else "td"
            rows.append("<tr>" + "".join(f"<{tag}>{cell}</{tag}>" for cell in cells) + "</tr>")
        return '<table class="swse-rules-table"><tbody>' + "".join(rows) + "</tbody></table>"

    safe = html.escape(block)
    # Bold common inline rule labels when they start a paragraph.
    safe = re.sub(r"^(Prerequisites?|Effect|Benefit|Normal|Special|Reference Book|Q|A):", r"<strong>\1:</strong>", safe)
    return f"<p>{safe}</p>"


def text_to_html(text: Any) -> str:
    return "\n".join(paragraph_html(block) for block in blocks_from_text(text) if block).strip()


def make_section_html(title: str, content: str) -> str:
    title = clean_inline(title)
    content = clean_text(content)
    if not title or not content:
        return ""
    return f"<h4>{html.escape(title)}</h4>\n{text_to_html(content)}"


def make_description_html(record: Dict[str, Any], prereq: str, effect: str, normal: str, special: str) -> str:
    pieces: List[str] = ['<div class="swse-feat-description">']

    refs = extract_reference_books(record)
    if refs:
        pieces.append(f"<p><strong>Reference Book:</strong> {html.escape('; '.join(refs))}</p>")

    source_url = clean_inline(record.get("url", ""))
    if source_url:
        pieces.append(f"<p><strong>Source:</strong> {html.escape(source_url)}</p>")

    intro = extract_intro(record)
    if intro:
        pieces.append(text_to_html(intro))

    if prereq and prereq.lower() != "none":
        pieces.append(f"<p><strong>Prerequisites:</strong> {html.escape(prereq)}</p>")
    else:
        pieces.append("<p><strong>Prerequisites:</strong> None</p>")

    if effect:
        pieces.append("<h4>Effect</h4>")
        pieces.append(text_to_html(effect))

    if normal:
        pieces.append("<h4>Normal</h4>")
        pieces.append(text_to_html(normal))

    if special:
        pieces.append("<h4>Special</h4>")
        pieces.append(text_to_html(special))

    for section in record.get("sections") or []:
        sec_html = make_section_html(section.get("heading", ""), section.get("content", ""))
        if sec_html:
            pieces.append(sec_html)

    pieces.append("</div>")
    return "\n".join(piece for piece in pieces if piece).strip()


def first_sentence(text: str, max_len: int = 220) -> str:
    text = clean_inline(text)
    if len(text) <= max_len:
        return text
    match = re.search(r"^(.{40,220}?[.!?])\s", text)
    if match:
        return match.group(1).strip()
    return text[: max_len - 1].rsplit(" ", 1)[0].strip() + "…"


def quick_summary(record: Dict[str, Any], effect: str) -> str:
    for key in ("indexBenefit", "benefit"):
        value = clean_text(record.get(key, ""))
        if value:
            return first_sentence(value)
    return first_sentence(effect)


def choose_prerequisite(record: Dict[str, Any]) -> str:
    for key in ("prerequisitesText", "indexPrerequisites"):
        value = clean_text(record.get(key, ""))
        if value:
            return "None" if value.lower() in {"none", "n/a", "—", "-"} else value
    prereqs = [clean_text(value) for value in record.get("prerequisites") or [] if clean_text(value)]
    if prereqs:
        return ", ".join(prereqs)
    return "None"


def normalize_for_compare(value: Any) -> str:
    value = clean_text(value).lower()
    value = re.sub(r"\bfeat\b", "", value)
    value = re.sub(r"[^a-z0-9+]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def load_db(path: Path) -> List[Dict[str, Any]]:
    docs = []
    with path.open("r", encoding="utf-8") as handle:
        for line_no, line in enumerate(handle, start=1):
            stripped = line.strip()
            if not stripped:
                continue
            try:
                docs.append(json.loads(stripped))
            except json.JSONDecodeError as exc:
                raise RuntimeError(f"Invalid JSON on line {line_no} of {path}: {exc}") from exc
    return docs


def load_scrape(path: Path) -> List[Dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise RuntimeError(f"Expected {path} to contain a JSON list")
    return data


def write_db(path: Path, docs: Iterable[Dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for doc in docs:
            handle.write(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n")


def write_csv(path: Path, rows: List[Dict[str, Any]]) -> None:
    fieldnames: List[str] = []
    for row in rows:
        for key in row.keys():
            if key not in fieldnames:
                fieldnames.append(key)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def main() -> None:
    if not INPUT_DB.exists():
        raise SystemExit(f"Missing input DB: {INPUT_DB}")
    if not INPUT_SCRAPE.exists():
        raise SystemExit(f"Missing scrape JSON: {INPUT_SCRAPE}")

    docs = load_db(INPUT_DB)
    scraped = load_scrape(INPUT_SCRAPE)

    scrape_by_key: Dict[str, Dict[str, Any]] = {}
    scrape_duplicates: Dict[str, List[str]] = {}
    for record in scraped:
        key = stable_key(record.get("name", ""))
        if not key:
            continue
        if key in scrape_by_key:
            scrape_duplicates.setdefault(key, [scrape_by_key[key].get("name", "")]).append(record.get("name", ""))
            # Prefer the record with a stronger effect/body.
            old_score = len(clean_text(scrape_by_key[key].get("rawText", "")))
            new_score = len(clean_text(record.get("rawText", "")))
            if new_score > old_score:
                scrape_by_key[key] = record
        else:
            scrape_by_key[key] = record

    matched_keys = set()
    report_rows: List[Dict[str, Any]] = []
    unmatched_db_rows: List[Dict[str, Any]] = []

    updated_count = 0
    prereq_changed_count = 0

    for doc in docs:
        name = doc.get("name", "")
        key = stable_key(name)
        system = doc.setdefault("system", {})
        old_prereq = clean_text(system.get("prerequisite", ""))
        old_benefit = clean_text(system.get("benefit", ""))
        old_summary = clean_text(system.get("shortSummary", ""))

        record = scrape_by_key.get(key)

        if not record:
            # Still make sure every feat has a quick summary from existing data.
            if not system.get("shortSummary"):
                system["shortSummary"] = first_sentence(old_benefit or clean_text(system.get("description", {}).get("value", "")))
            unmatched_db_rows.append({
                "name": name,
                "existingPrerequisite": old_prereq,
                "existingBenefit": old_benefit,
                "sourcebook": system.get("sourcebook", ""),
                "note": "No matching entry in swse_feats.json; left existing description/rules text unchanged.",
            })
            report_rows.append({
                "name": name,
                "status": "db_only_not_updated",
                "oldPrerequisite": old_prereq,
                "newPrerequisite": old_prereq,
                "prerequisiteChanged": "no",
                "oldBenefit": old_benefit,
                "newEffect": old_benefit,
                "oldSummary": old_summary,
                "newSummary": system.get("shortSummary", ""),
                "sourceUrl": "",
            })
            continue

        matched_keys.add(key)

        new_prereq = choose_prerequisite(record)
        effect = clean_text(record.get("effect", ""))
        normal = clean_text(record.get("normal", ""))
        special = clean_text(record.get("special", ""))
        refs = extract_reference_books(record)
        summary = quick_summary(record, effect)
        description_html = make_description_html(record, new_prereq, effect, normal, special)

        if normalize_for_compare(old_prereq or "None") != normalize_for_compare(new_prereq or "None"):
            prereq_changed = "yes"
            prereq_changed_count += 1
        else:
            prereq_changed = "no"

        # Preserve all existing Foundry logic/mapping fields; only refresh content-facing fields.
        system["prerequisite"] = new_prereq
        system["prerequisitesText"] = new_prereq
        if effect:
            system["benefit"] = effect
        if normal:
            system["normalText"] = normal
        elif "normalText" in system:
            system["normalText"] = ""
        if special:
            system["special"] = special
        elif "special" in system:
            system["special"] = ""
        system["shortSummary"] = summary
        system["referenceBooks"] = refs
        if refs and not system.get("sourcebook"):
            system["sourcebook"] = refs[0]
        if record.get("url"):
            system["sourceUrl"] = record.get("url")

        desc = system.get("description")
        if isinstance(desc, dict):
            desc["value"] = description_html
            system["description"] = desc
        else:
            system["description"] = {"value": description_html}

        # Keep a compact provenance breadcrumb without disturbing existing flags.
        flags = doc.setdefault("flags", {})
        swse_flags = flags.setdefault("swse", {})
        swse_flags["featContentRefresh"] = {
            "source": "swse_feats.json",
            "sourceUrl": record.get("url", ""),
            "updatedFields": [
                "system.description.value",
                "system.benefit",
                "system.prerequisite",
                "system.special",
                "system.normalText",
                "system.shortSummary",
            ],
        }

        updated_count += 1
        report_rows.append({
            "name": name,
            "status": "updated",
            "oldPrerequisite": old_prereq,
            "newPrerequisite": new_prereq,
            "prerequisiteChanged": prereq_changed,
            "oldBenefit": old_benefit,
            "newEffect": effect,
            "oldSummary": old_summary,
            "newSummary": summary,
            "sourceUrl": record.get("url", ""),
        })

    unmatched_scrape_rows = []
    db_keys = {stable_key(doc.get("name", "")) for doc in docs}
    for record in scraped:
        key = stable_key(record.get("name", ""))
        if key not in db_keys:
            unmatched_scrape_rows.append({
                "name": record.get("name", ""),
                "url": record.get("url", ""),
                "prerequisites": choose_prerequisite(record),
                "summary": quick_summary(record, clean_text(record.get("effect", ""))),
                "note": "Scraped entry did not match a feat document in feats.db.",
            })

    write_db(OUTPUT_DB, docs)
    write_csv(REPORT_CSV, report_rows)
    write_csv(UNMATCHED_DB_CSV, unmatched_db_rows)
    write_csv(UNMATCHED_SCRAPE_CSV, unmatched_scrape_rows)

    report_json = {
        "inputDb": str(INPUT_DB),
        "inputScrape": str(INPUT_SCRAPE),
        "outputDb": str(OUTPUT_DB),
        "dbDocuments": len(docs),
        "scrapedRecords": len(scraped),
        "updatedDocuments": updated_count,
        "dbOnlyDocumentsLeftUnchanged": len(unmatched_db_rows),
        "scrapeOnlyRecords": len(unmatched_scrape_rows),
        "prerequisiteTextChanged": prereq_changed_count,
        "duplicateScrapeKeys": scrape_duplicates,
        "reports": {
            "csv": str(REPORT_CSV),
            "unmatchedDb": str(UNMATCHED_DB_CSV),
            "unmatchedScrape": str(UNMATCHED_SCRAPE_CSV),
        },
    }
    with REPORT_JSON.open("w", encoding="utf-8") as handle:
        json.dump(report_json, handle, indent=2, ensure_ascii=False)

    print("SWSE feat compendium content refresh complete")
    print(f"  DB documents: {len(docs)}")
    print(f"  Scraped records: {len(scraped)}")
    print(f"  Updated documents: {updated_count}")
    print(f"  DB-only documents left unchanged: {len(unmatched_db_rows)}")
    print(f"  Scrape-only records not applied: {len(unmatched_scrape_rows)}")
    print(f"  Prerequisite display text changed: {prereq_changed_count}")
    print(f"  Output DB: {OUTPUT_DB}")
    print(f"  Report CSV: {REPORT_CSV}")


if __name__ == "__main__":
    main()
