"""
Updated patcher for character sheet v2 with modern resource bars.
Handles the current template structure using resource-segment-bar elements.
"""
from __future__ import annotations

import sys
from pathlib import Path

DEFAULT_REPO = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")
TEMPLATE_REL = Path("templates/actors/character/v2/character-sheet.hbs")

# The duplicate Destiny Points field in the metadata grid
DUPLICATE_DESTINY_FIELD = '''        <div class="header-field">
          <label>Destiny Points:</label>
          <span class="destiny-display">{{destinyPointsValue}} / {{destinyPointsMax}}</span>
        </div>
'''

# Simpler variant with different whitespace
DUPLICATE_DESTINY_SIMPLE = '''<div class="header-field">
          <label>Destiny Points:</label>
          <span class="destiny-display">{{destinyPointsValue}} / {{destinyPointsMax}}</span>
        </div>'''

OVERRIDE_MARKER = "/* SWSE PATCH: compact tactical header + flat tab rail */"
OVERRIDE_CSS = f'''
{OVERRIDE_MARKER}
.swse-sheet .sheet-header {{
  display: grid !important;
  grid-template-columns: 84px minmax(0, 1fr) 76px !important;
  gap: 10px !important;
  align-items: start !important;
  padding: 8px 10px !important;
  margin-bottom: 4px !important;
}}

.swse-sheet .sheet-header-left {{
  min-width: 0;
}}

.swse-sheet .sheet-header-left .profile-img {{
  width: 72px !important;
  height: 72px !important;
  object-fit: cover;
}}

.swse-sheet .sheet-header-center {{
  gap: 6px !important;
  min-width: 0 !important;
}}

.swse-sheet .sheet-header-meta-grid {{
  grid-template-columns: repeat(3, minmax(120px, 1fr)) !important;
  gap: 6px 10px !important;
}}

.swse-sheet .header-field label {{
  font-size: 0.7rem !important;
  line-height: 1.1 !important;
  margin-bottom: 1px !important;
}}

.swse-sheet .header-field input,
.swse-sheet .header-field .field-with-button {{
  min-height: 28px !important;
  font-size: 0.84rem !important;
}}

.swse-sheet .header-select-btn {{
  width: 22px !important;
  height: 22px !important;
  min-width: 22px !important;
  min-height: 22px !important;
  padding: 0 !important;
}}

.swse-sheet .sheet-header-right {{
  display: grid !important;
  grid-template-columns: 1fr !important;
  gap: 5px !important;
  align-self: start !important;
  justify-self: end !important;
  margin: 0 !important;
}}

.swse-sheet .swse-stat {{
  min-width: 68px !important;
  padding: 6px 2px !important;
}}

.swse-sheet .swse-stat .label {{
  font-size: 0.7rem !important;
}}

.swse-sheet .swse-stat .value {{
  font-size: 1.15rem !important;
}}

.swse-sheet .header-resources-strip {{
  display: grid !important;
  grid-template-columns: minmax(180px, 1.35fr) minmax(180px, 1.15fr) 78px 78px minmax(160px, 1fr);
  gap: 8px 10px !important;
  align-items: center !important;
  padding: 8px 10px !important;
  margin-top: 4px !important;
  background: linear-gradient(135deg, rgba(0, 96, 72, 0.22), rgba(0, 56, 44, 0.16)) !important;
  border: 1px solid rgba(0, 255, 180, 0.18) !important;
  border-radius: 8px !important;
}}

.swse-sheet .resource-item {{
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  gap: 4px !important;
  min-width: 0 !important;
}}

.swse-sheet .resource-label {{
  font-size: 0.68rem !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.08em !important;
  color: rgba(164, 245, 255, 0.88) !important;
}}

.swse-sheet .resource-value {{
  font-size: 0.82rem !important;
  font-weight: 700 !important;
  color: #9dfcff !important;
}}

.swse-sheet .resource-segment-bar {{
  position: relative !important;
  min-height: 24px !important;
  height: 24px !important;
  background: rgba(0, 10, 18, 0.88) !important;
  border: 1px solid rgba(0, 255, 200, 0.24) !important;
  border-radius: 6px !important;
  overflow: hidden !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 1px !important;
  padding: 2px 4px !important;
}}

.swse-sheet .resource-segment {{
  flex: 1 1 auto !important;
  height: 100% !important;
  background: rgba(0, 100, 80, 0.4) !important;
  border: 1px solid rgba(0, 200, 150, 0.2) !important;
  border-radius: 3px !important;
  transition: background 240ms ease !important;
}}

.swse-sheet .resource-segment.is-filled {{
  background: linear-gradient(90deg, #7a1f10 0%, #a94718 18%, #cc7a1c 38%, #9aa61a 58%, #5f9c1d 78%, #2d7a1f 100%) !important;
}}

.swse-sheet .resource-segment-bar--xp .resource-segment.is-filled {{
  background: linear-gradient(90deg, rgba(0, 185, 255, 0.82), rgba(0, 255, 255, 0.5)) !important;
}}

.swse-sheet .resource-bar__text {{
  position: absolute !important;
  inset: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 0.72rem !important;
  font-weight: 800 !important;
  color: #d9ffff !important;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.22) !important;
  white-space: nowrap !important;
  z-index: 1 !important;
}}

.swse-sheet .header-second-wind {{
  display: grid !important;
  grid-template-columns: auto 1fr auto !important;
  gap: 8px !important;
  align-items: center !important;
  padding: 8px 10px !important;
  margin-top: 4px !important;
  background: rgba(0, 96, 72, 0.12) !important;
  border: 1px solid rgba(0, 255, 180, 0.12) !important;
  border-radius: 6px !important;
}}

.swse-sheet .header-second-wind.is-empty {{
  display: none !important;
}}

.swse-sheet .sw-label {{
  font-size: 0.7rem !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  color: rgba(164, 245, 255, 0.88) !important;
}}

.swse-sheet .sw-uses {{
  font-size: 0.72rem !important;
  color: #9dfcff !important;
}}

.swse-sheet .healing-amount {{
  font-weight: 800 !important;
  color: #a4f5ff !important;
}}

.swse-sheet .sw-use-btn {{
  min-height: 22px !important;
  padding: 3px 10px !important;
  border-radius: 5px !important;
  border: 1px solid rgba(0, 255, 170, 0.32) !important;
  background: rgba(0, 96, 72, 0.24) !important;
  color: #9dfcff !important;
  font-size: 0.74rem !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.06em !important;
  cursor: pointer !important;
}}

.swse-sheet .sw-use-btn:disabled {{
  opacity: 0.5 !important;
  cursor: not-allowed !important;
}}

.swse-sheet .sheet-actions {{
  padding: 6px 10px !important;
  gap: 6px !important;
}}

.swse-sheet .sheet-tabs,
.swse-sheet .sheet-tabs.tabs {{
  display: grid !important;
  grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
  gap: 6px !important;
  padding: 6px 10px 0 !important;
  background: transparent !important;
  background-image: none !important;
  border: none !important;
  box-shadow: none !important;
  position: relative !important;
  isolation: isolate !important;
}}

.swse-sheet .sheet-tabs::before,
.swse-sheet .sheet-tabs::after,
.swse-sheet .sheet-tabs.tabs::before,
.swse-sheet .sheet-tabs.tabs::after,
.swse-sheet .sheet-tabs svg,
.swse-sheet .sheet-tabs .svg-art-layer,
.swse-sheet .sheet-tabs .svg-panel-frame,
.swse-sheet .sheet-tabs [class*="svg"] {{
  display: none !important;
  content: none !important;
  background: none !important;
  background-image: none !important;
}}

.swse-sheet .sheet-tabs .item,
.swse-sheet .sheet-tabs a {{
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 34px !important;
  padding: 6px 10px !important;
  margin: 0 !important;
  background: rgba(0, 8, 18, 0.82) !important;
  border: 1px solid rgba(0, 255, 200, 0.18) !important;
  border-radius: 8px !important;
  box-shadow: inset 0 0 0 1px rgba(0, 180, 255, 0.08) !important;
  color: rgba(212, 245, 255, 0.78) !important;
  text-transform: uppercase !important;
  letter-spacing: 0.04em !important;
  text-decoration: none !important;
  cursor: pointer !important;
}}

.swse-sheet .sheet-tabs .item.active,
.swse-sheet .sheet-tabs a.active {{
  color: #8ffcff !important;
  border-color: rgba(0, 255, 200, 0.36) !important;
  background: linear-gradient(180deg, rgba(0, 50, 78, 0.44), rgba(0, 16, 30, 0.92)) !important;
  box-shadow: 0 0 14px rgba(0, 255, 200, 0.12), inset 0 0 0 1px rgba(124, 232, 255, 0.1) !important;
}}

.swse-sheet .sheet-tabs .item:hover,
.swse-sheet .sheet-tabs a:hover {{
  color: #d9ffff !important;
  border-color: rgba(0, 255, 200, 0.3) !important;
}}

@media (max-width: 1200px) {{
  .swse-sheet .sheet-header {{
    grid-template-columns: 72px minmax(0, 1fr) 70px !important;
  }}

  .swse-sheet .header-resources-strip {{
    grid-template-columns: 1fr 1fr 70px 70px !important;
  }}
}}
'''


def patch_character_sheet(template_path: Path) -> tuple[bool, list[str]]:
    text = template_path.read_text(encoding="utf-8")
    original = text
    notes: list[str] = []

    # Remove duplicate Destiny Points field from the metadata grid
    if DUPLICATE_DESTINY_FIELD in text:
        text = text.replace(DUPLICATE_DESTINY_FIELD, "")
        notes.append("Removed duplicate Destiny Points header field")
    elif DUPLICATE_DESTINY_SIMPLE in text:
        text = text.replace(DUPLICATE_DESTINY_SIMPLE, "")
        notes.append("Removed duplicate Destiny Points header field (variant)")
    else:
        notes.append("Duplicate Destiny Points header field already removed or not found")

    # Add CSS override if not already present
    if OVERRIDE_MARKER not in text:
        if "</style>" not in text:
            raise RuntimeError("Could not find closing </style> tag in character-sheet.hbs")
        text = text.replace("</style>", OVERRIDE_CSS + "\n</style>")
        notes.append("Appended compact header / tab rail override CSS")
    else:
        notes.append("Override CSS already present")

    changed = text != original
    if changed:
        template_path.write_text(text, encoding="utf-8", newline="\n")
    return changed, notes


def main() -> int:
    repo = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_REPO
    repo = repo.expanduser().resolve()
    template_path = repo / TEMPLATE_REL

    if not template_path.exists():
        print(f"ERROR: Could not find template file: {template_path}")
        return 1

    changed, notes = patch_character_sheet(template_path)

    print(f"Patched: {template_path}")
    print(f"Changed: {'yes' if changed else 'no'}")
    for note in notes:
        print(f" - {note}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
