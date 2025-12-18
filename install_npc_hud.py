import os
import shutil
from datetime import datetime
import base64

# =============================================================================
#  SWSE NPC LEVEL 3 HUD INSTALLER
#  This script installs:
#   - NPC Summary HUD (HBS templates)
#   - NPC Level-3 CSS
#   - NPC Level-3 JS logic
#   - Required UI assets (scanner ring, threat icons)
# =============================================================================

# Root folder of the repo (script should be placed anywhere inside repo)
ROOT = os.path.dirname(os.path.abspath(__file__))

# Target directories
NPC_DIR = os.path.join(
    ROOT, "templates", "actors", "npc"
)

CSS_DIR = os.path.join(
    ROOT, "styles"
)

JS_DIR = os.path.join(
    ROOT, "scripts"
)

ASSET_DIR = os.path.join(
    ROOT, "assets", "ui"
)

# -----------------------------------------------------------------------------
# Utility Functions
# -----------------------------------------------------------------------------

def ensure_directories():
    """Ensure all required directories exist."""
    os.makedirs(NPC_DIR, exist_ok=True)
    os.makedirs(CSS_DIR, exist_ok=True)
    os.makedirs(JS_DIR, exist_ok=True)
    os.makedirs(ASSET_DIR, exist_ok=True)

def backup(path):
    """Backup existing file with timestamp suffix."""
    if os.path.exists(path):
        ts = datetime.now().strftime("%Y%m%d-%H%M%S")
        shutil.copy2(path, f"{path}.bak-{ts}")

def write_text(path, text):
    """Write a plain-text file such as HBS, CSS, JS."""
    backup(path)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text.strip() + "\n")
    print(f"✓ Wrote {path}")

def write_binary(path, data_bytes):
    """Write binary files (PNG assets)."""
    backup(path)
    with open(path, "wb") as f:
        f.write(data_bytes)
    print(f"✓ Wrote asset {path}")

# =============================================================================
# File Registry (filled in later parts)
# =============================================================================

NPC_TEMPLATES = {}   # name.hbs → content
NPC_ASSETS = {}      # name.png → bytes
NPC_CSS = ""         # npc-level3.css content
NPC_JS = ""          # npc-level3.js content

# =============================================================================
# PART 2 — NPC HBS TEMPLATES
# =============================================================================

NPC_TEMPLATES = {

    # ----------------------------------------------------------
    # NPC SUMMARY HUD (main wrapper for the Summary tab)
    # ----------------------------------------------------------
    "npc-summary-hud.hbs": r"""
<div class="npc-level3">

  {{!-- Portrait Block --}}
  <div class="npc-left-panel">
    {{> "systems/foundryvtt-swse/templates/actors/npc/npc-image.hbs" actor=actor }}
    {{> "systems/foundryvtt-swse/templates/actors/npc/npc-core-stats.hbs" actor=actor }}
  </div>

  {{!-- Extended Info --}}
  <div class="npc-right-panel">

    {{!-- Weapons --}}
    {{> "systems/foundryvtt-swse/templates/actors/npc/npc-weapon-block.hbs" actor=actor }}

    {{!-- Talents --}}
    {{> "systems/foundryvtt-swse/templates/actors/npc/npc-talent-block.hbs" actor=actor }}

    {{!-- Specials --}}
    {{> "systems/foundryvtt-swse/templates/actors/npc/npc-specials-block.hbs" actor=actor }}

    {{!-- GM Diagnostics --}}
    {{> "systems/foundryvtt-swse/templates/actors/npc/npc-diagnostics-block.hbs" actor=actor }}

  </div>

</div>
""",

    # ----------------------------------------------------------
    # NPC PORTRAIT + SCANNER + THREAT RING
    # ----------------------------------------------------------
    "npc-image.hbs": r"""
<div class="npc-image-frame">

  {{!-- Threat Ring --}}
  <div class="npc-threat-ring threat-{{actor.flags.swse.threatLevel}}">
  </div>

  {{!-- Scanner --}}
  <div class="npc-scanner">
    <img src="/systems/foundryvtt-swse/assets/ui/scanner-ring.png">
  </div>

  {{!-- Portrait --}}
  <img class="npc-portrait"
       src="{{actor.img}}"
       alt="{{actor.name}}">

</div>
""",

    # ----------------------------------------------------------
    # NPC CORE STATS (Combat quick reference)
    # ----------------------------------------------------------
    "npc-core-stats.hbs": r"""
<div class="npc-core-stats">

  <div class="npc-stat">
    <span class="label">HP:</span>
    <span class="value">{{system.health.value}} / {{system.health.max}}</span>
  </div>

  <div class="npc-stat">
    <span class="label">Defenses:</span>
    <span class="value">
      Ref {{system.defenses.reflex}},
      Fort {{system.defenses.fortitude}},
      Will {{system.defenses.will}}
    </span>
  </div>

  <div class="npc-stat">
    <span class="label">DT:</span>
    <span class="value">{{system.damageThreshold}}</span>
  </div>

  <div class="npc-stat">
    <span class="label">Init:</span>
    <span class="value">{{system.initiative.total}}</span>
  </div>

  <div class="npc-stat">
    <span class="label">Perception:</span>
    <span class="value">{{system.skills.perception.total}}</span>
  </div>

  <div class="npc-stat">
    <span class="label">BAB:</span>
    <span class="value">{{system.attacks.bab}}</span>
  </div>

</div>
""",

    # ----------------------------------------------------------
    # NPC WEAPON BLOCK (collapsible)
    # ----------------------------------------------------------
    "npc-weapon-block.hbs": r"""
<div class="npc-block collapsible" data-npc-block="weapons">

  <div class="npc-block-header">
    <span>Weapons</span>
    <span class="toggle-icon">▼</span>
  </div>

  <div class="npc-block-content">
    {{#each actor.items}}
      {{#if (eq this.type "weapon")}}
        <div class="npc-weapon-entry">
          <strong>{{this.name}}</strong> —
          {{this.system.attackBonus}} to hit,
          {{this.system.damage}} dmg,
          {{this.system.range}} sq
        </div>
      {{/if}}
    {{/each}}
  </div>

</div>
""",

    # ----------------------------------------------------------
    # NPC TALENT BLOCK
    # ----------------------------------------------------------
    "npc-talent-block.hbs": r"""
<div class="npc-block collapsible" data-npc-block="talents">

  <div class="npc-block-header">
    <span>Talents</span>
    <span class="toggle-icon">▼</span>
  </div>

  <div class="npc-block-content">
    {{#each actor.items}}
      {{#if (eq this.type "talent")}}
        <div class="npc-talent-entry">
          <strong>{{this.name}}</strong>
          — {{this.system.description}}
        </div>
      {{/if}}
    {{/each}}
  </div>

</div>
""",

    # ----------------------------------------------------------
    # NPC SPECIAL ABILITIES BLOCK
    # ----------------------------------------------------------
    "npc-specials-block.hbs": r"""
<div class="npc-block collapsible" data-npc-block="specials">

  <div class="npc-block-header">
    <span>Special Abilities</span>
    <span class="toggle-icon">▼</span>
  </div>

  <div class="npc-block-content">
    {{#each system.specialQualities}}
      <div class="npc-special-entry">
        <strong>{{this.name}}</strong> — {{this.description}}
      </div>
    {{/each}}
  </div>

</div>
""",

    # ----------------------------------------------------------
    # NPC GM-ONLY DIAGNOSTICS
    # ----------------------------------------------------------
    "npc-diagnostics-block.hbs": r"""
{{#if (eq actor.isOwner true)}}
<div class="npc-block collapsible" data-npc-block="diagnostics">

  <div class="npc-block-header">
    <span>GM Diagnostics</span>
    <span class="toggle-icon">▼</span>
  </div>

  <div class="npc-block-content">
    <div><strong>Resistances:</strong> {{system.resistances}}</div>
    <div><strong>Immunities:</strong> {{system.immunities}}</div>
    <div><strong>Active Conditions:</strong> {{system.conditions}}</div>
  </div>

</div>
{{/if}}
""",
}

# =============================================================================
# PART 3 — NPC CSS (Hologram HUD Styling)
# =============================================================================

NPC_CSS = r"""
/* Root Layout */
.npc-level3 {
  display: flex;
  gap: 16px;
}

/* LEFT PANEL */
.npc-left-panel {
  width: 260px;
}

/* RIGHT PANEL */
.npc-right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Portrait Frame */
.npc-image-frame {
  position: relative;
  width: 100%;
  height: 280px;
  overflow: hidden;
  border: 1px solid rgba(0,200,255,0.25);
  background: rgba(0, 20, 40, 0.4);
  border-radius: 6px;
}

.npc-portrait {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Scanner Ring */
.npc-scanner img {
  position: absolute;
  width: 180%;
  top: -40%;
  left: -40%;
  opacity: 0.22;
  animation: npc-scan-rotate 20s linear infinite;
}

@keyframes npc-scan-rotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* Threat Ring */
.npc-threat-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  box-shadow: inset 0 0 22px rgba(0,0,0,0.8);
  pointer-events:none;
}

.threat-minion  { border: 2px solid #888; }
.threat-standard { border: 2px solid #00c0ff; }
.threat-elite   { border: 2px solid #ffd860; }
.threat-boss    { border: 2px solid #ff4040; }

/* Core Stats List */
.npc-core-stats {
  margin-top: 10px;
  padding: 8px;
  background: rgba(0, 40, 70, 0.35);
  border: 1px solid rgba(0,200,255,0.25);
  border-radius: 6px;
}

.npc-stat {
  display: flex;
  justify-content: space-between;
  color: #cfefff;
  margin: 3px 0;
}

/* Collapsible Blocks */
.npc-block {
  border: 1px solid rgba(0,200,255,0.25);
  background: rgba(0, 25, 45, 0.35);
  border-radius: 6px;
}

.npc-block-header {
  padding: 6px 8px;
  display: flex;
  justify-content: space-between;
  cursor: pointer;
  font-weight: bold;
  color: #bde8ff;
  background: rgba(0,50,80,0.3);
}

.npc-block-content {
  padding: 8px;
  display: none;
}

.npc-block.open .npc-block-content {
  display: block;
}
"""

# =============================================================================
# PART 4 — NPC JavaScript (npc-level3.js)
# =============================================================================

NPC_JS = r"""
Hooks.on("ready", () => {

  Hooks.on("renderActorSheet", (sheet, html, data) => {

    if (!sheet.actor || sheet.actor.type !== "npc") return;

    // Collapse logic
    html.find(".npc-block-header").click(ev => {
      const block = ev.currentTarget.closest(".npc-block");
      block.classList.toggle("open");
    });

    // Threat ring auto-logic
    const actor = sheet.actor;
    let manual = actor.getFlag("swse","threatLevel");
    if (!manual) {
      let role = actor.system.role || actor.system.type;
      let cr = Number(actor.system.challenge || 1);

      let level = "standard";

      if (role) {
        if (role == "minion") level = "minion";
        else if (role == "elite") level = "elite";
        else if (role == "boss") level = "boss";
      } else {
        if (cr <= 3) level = "minion";
        else if (cr <= 8) level = "standard";
        else if (cr <= 14) level = "elite";
        else level = "boss";
      }

      actor.setFlag("swse","threatLevel", level);
    }

  });
});
"""

# =============================================================================
# PART 5 — NPC Assets (Base64 PNGs)
# =============================================================================

# NOTE: These are placeholder 1×1 PNGs. Replace with real assets later.
# Base64 to bytes:
def _b64(s): return base64.b64decode(s)

NPC_ASSETS = {

    "scanner-ring.png": _b64(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAoMBC9otEJkAAAAASUVORK5CYII="
    ),

    "threat-minion.png": _b64(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAoMBC9otEJkAAAAASUVORK5CYII="
    ),

    "threat-standard.png": _b64(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAoMBC9otEJkAAAAASUVORK5CYII="
    ),

    "threat-elite.png": _b64(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAoMBC9otEJkAAAAASUVORK5CYII="
    ),

    "threat-boss.png": _b64(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAoMBC9otEJkAAAAASUVORK5CYII="
    ),
}

# =============================================================================
# Installer Logic
# =============================================================================

def install_templates():
    for filename, content in NPC_TEMPLATES.items():
        path = os.path.join(NPC_DIR, filename)
        write_text(path, content)

def install_css():
    global NPC_CSS
    path = os.path.join(CSS_DIR, "npc-level3.css")
    write_text(path, NPC_CSS)

def install_js():
    global NPC_JS
    path = os.path.join(JS_DIR, "npc-level3.js")
    write_text(path, NPC_JS)

def install_assets():
    for filename, data in NPC_ASSETS.items():
        path = os.path.join(ASSET_DIR, filename)
        write_binary(path, data)

def main():
    print("=== Installing NPC Level-3 HUD ===")
    ensure_directories()
    install_templates()
    install_css()
    install_js()
    install_assets()
    print("=== NPC Level-3 HUD installation complete ===")

if __name__ == "__main__":
    main()
