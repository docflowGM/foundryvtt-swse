from __future__ import annotations

import re
import sys
from pathlib import Path

DEFAULT_REPO = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")
TEMPLATE_REL = Path("templates/actors/character/v2/character-sheet.hbs")

DESTINY_FIELD_BLOCK = '''        <div class="header-field">
          <label>Destiny Points:</label>
          <span class="destiny-display">{{destinyPointsValue}} / {{destinyPointsMax}}</span>
        </div>
'''

OLD_RESOURCE_BLOCK = '''      <!-- RESOURCE STRIP: Compact HP / FP / DP Display -->
      <div class="header-resources-strip">
        <div class="resource-item resource-item--hp">
          <span class="resource-label">HP</span>
          <div class="resource-bar {{healthPanel.hp.stateClass}}">
            <div class="resource-bar__fill {{healthPanel.hp.stateClass}}" style="width: {{healthPanel.hp.percent}}%;"></div>
            <span class="resource-bar__text">{{healthPanel.hp.value}} / {{healthPanel.hp.max}}</span>
          </div>
        </div>
        <div class="resource-item">
          <span class="resource-label">FP</span>
          <span class="resource-value">{{forcePointsValue}} / {{forcePointsMax}}</span>
        </div>
        <div class="resource-item">
          <span class="resource-label">DP</span>
          <span class="resource-value">{{destinyPointsValue}} / {{destinyPointsMax}}</span>
        </div>
      </div>

      <!-- HEADER SECOND WIND: Condensed control -->
      {{#if headerSecondWind.canUse}}
      <div class="header-second-wind">
        <div class="sw-label">Second Wind</div>
        <div class="sw-uses">{{headerSecondWind.usesRemaining}} use{{#unless (eq headerSecondWind.usesRemaining 1)}}s{{/unless}}</div>
        <div class="sw-healing">Heals <span class="healing-amount">{{headerSecondWind.healingAmount}} HP</span></div>
        <button type="button" class="sw-use-btn" data-action="use-second-wind" {{#unless headerSecondWind.canUse}}disabled{{/unless}}>Use</button>
      </div>
      {{/if}}
'''

NEW_RESOURCE_BLOCK = '''      <!-- TACTICAL RESOURCE STRIP: compact HP / XP / FP / DP / Second Wind -->
      <div class="header-tactical-strip">
        <div class="tactical-resource tactical-resource--hp">
          <span class="tactical-resource__label">HP</span>
          <div class="resource-bar resource-bar--hp {{healthPanel.hp.stateClass}}">
            <div class="resource-bar__fill resource-bar__fill--hp {{healthPanel.hp.stateClass}}" style="width: {{healthPanel.hp.percent}}%;"></div>
            <span class="resource-bar__text">{{healthPanel.hp.value}} / {{healthPanel.hp.max}}</span>
          </div>
        </div>

        <div class="tactical-resource tactical-resource--xp">
          <span class="tactical-resource__label">XP</span>
          <div class="resource-bar resource-bar--xp {{xpData.stateClass}}">
            <div class="resource-bar__fill resource-bar__fill--xp {{xpData.stateClass}}" style="width: {{xpPercent}}%;"></div>
            <span class="resource-bar__text">{{xpData.total}} / {{xpData.nextLevelAt}} • {{xpPercent}}%</span>
          </div>
        </div>

        <div class="tactical-resource tactical-resource--fp">
          <span class="tactical-resource__label">FP</span>
          <span class="tactical-resource__value">{{forcePointsValue}} / {{forcePointsMax}}</span>
        </div>

        <div class="tactical-resource tactical-resource--dp">
          <span class="tactical-resource__label">DP</span>
          <span class="tactical-resource__value">{{destinyPointsValue}} / {{destinyPointsMax}}</span>
        </div>

        <div class="tactical-resource tactical-resource--sw">
          <div class="tactical-resource__sw-head">
            <span class="tactical-resource__label">Second Wind</span>
            <span class="tactical-resource__meta">Uses: {{headerSecondWind.usesRemaining}}</span>
          </div>
          <div class="tactical-resource__sw-body">
            <span class="tactical-resource__meta">Heals {{headerSecondWind.healingAmount}} HP</span>
            <button type="button" class="sw-use-btn" data-action="use-second-wind" {{#unless headerSecondWind.canUse}}disabled{{/unless}}>Use</button>
          </div>
        </div>
      </div>
'''

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

.swse-sheet .header-tactical-strip {{
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

.swse-sheet .tactical-resource {{
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  gap: 4px !important;
  min-width: 0 !important;
}}

.swse-sheet .tactical-resource__label {{
  font-size: 0.68rem !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.08em !important;
  color: rgba(164, 245, 255, 0.88) !important;
}}

.swse-sheet .tactical-resource__value,
.swse-sheet .tactical-resource__meta {{
  font-size: 0.82rem !important;
  font-weight: 700 !important;
  color: #9dfcff !important;
}}

.swse-sheet .tactical-resource__sw-head,
.swse-sheet .tactical-resource__sw-body {{
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 8px !important;
}}

.swse-sheet .resource-bar {{
  position: relative !important;
  min-height: 24px !important;
  height: 24px !important;
  background: rgba(0, 10, 18, 0.88) !important;
  border: 1px solid rgba(0, 255, 200, 0.24) !important;
  border-radius: 6px !important;
  overflow: hidden !important;
  display: block !important;
}}

.swse-sheet .resource-bar__fill {{
  position: absolute !important;
  inset: 0 auto 0 0 !important;
  display: block !important;
  height: 100% !important;
  z-index: 0 !important;
  opacity: 1 !important;
  border-radius: 5px 0 0 5px !important;
  transition: width 240ms ease !important;
}}

.swse-sheet .resource-bar__fill.resource-bar__fill--hp.state--healthy,
.swse-sheet .resource-bar__fill.resource-bar__fill--hp.healthy {{
  background: linear-gradient(90deg, #7a1f10 0%, #a94718 18%, #cc7a1c 38%, #9aa61a 58%, #5f9c1d 78%, #2d7a1f 100%) !important;
}}

.swse-sheet .resource-bar__fill.resource-bar__fill--hp.state--wounded,
.swse-sheet .resource-bar__fill.resource-bar__fill--hp.state--damaged,
.swse-sheet .resource-bar__fill.resource-bar__fill--hp.wounded,
.swse-sheet .resource-bar__fill.resource-bar__fill--hp.damaged {{
  background: linear-gradient(90deg, #7a1f10 0%, #ad4e15 45%, #d78e1a 100%) !important;
}}

.swse-sheet .resource-bar__fill.resource-bar__fill--hp.state--critical,
.swse-sheet .resource-bar__fill.resource-bar__fill--hp.state--dead,
.swse-sheet .resource-bar__fill.resource-bar__fill--hp.critical,
.swse-sheet .resource-bar__fill.resource-bar__fill--hp.dead {{
  background: linear-gradient(90deg, #6d0c0c 0%, #a81d1d 55%, #d8442b 100%) !important;
}}

.swse-sheet .resource-bar__fill.resource-bar__fill--xp,
.swse-sheet .resource-bar__fill.resource-bar__fill--xp.state--in-progress,
.swse-sheet .resource-bar__fill.resource-bar__fill--xp.state--nearly-ready,
.swse-sheet .resource-bar__fill.resource-bar__fill--xp.state--ready-levelup {{
  background: linear-gradient(90deg, rgba(0, 185, 255, 0.82), rgba(0, 255, 255, 0.5)) !important;
}}

.swse-sheet .resource-bar__text {{
  position: relative !important;
  z-index: 1 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 100% !important;
  padding: 0 8px !important;
  font-size: 0.82rem !important;
  font-weight: 800 !important;
  color: #d9ffff !important;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.22) !important;
  white-space: nowrap !important;
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

  .swse-sheet .header-tactical-strip {{
    grid-template-columns: 1fr 1fr 70px 70px !important;
  }}

  .swse-sheet .tactical-resource--sw {{
    grid-column: 1 / -1;
  }}
}}
'''


def patch_character_sheet(template_path: Path) -> tuple[bool, list[str]]:
    text = template_path.read_text(encoding="utf-8")
    original = text
    notes: list[str] = []

    if DESTINY_FIELD_BLOCK in text:
        text = text.replace(DESTINY_FIELD_BLOCK, "")
        notes.append("Removed duplicate Destiny Points header field")
    else:
        notes.append("Duplicate Destiny Points header field already removed or not found")

    if OLD_RESOURCE_BLOCK in text:
        text = text.replace(OLD_RESOURCE_BLOCK, NEW_RESOURCE_BLOCK)
        notes.append("Replaced old header resource strip with tactical strip")
    elif NEW_RESOURCE_BLOCK in text:
        notes.append("Tactical strip markup already present")
    else:
        raise RuntimeError("Could not locate header resource block to replace")

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
