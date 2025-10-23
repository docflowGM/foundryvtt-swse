#!/usr/bin/env python3
"""
SWSE Foundry VTT - Apply Uniform Holo Theme
Applies consistent holo datapad styling across all character sheets
"""

import os
import re
from pathlib import Path

# Base path to your repo
REPO_PATH = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")

# Holo theme header addition for templates
HOLO_HEADER_LOGO = '''
    {{!-- Holographic Frame Header --}}
    <div class="holo-frame-top">
        <img class="sw-logo" src="systems/swse/assets/ui/logo.png" alt="Star Wars Saga Edition"/>
    </div>'''

# CSS for holo frame and logo
HOLO_FRAME_CSS = '''
/* ============================================
   HOLOGRAPHIC FRAME & LOGO
   ============================================ */
.holo-frame-top {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
    background: linear-gradient(135deg, rgba(26, 77, 122, 0.8), rgba(44, 95, 141, 0.8));
    border-bottom: 2px solid #0af;
    box-shadow: 0 0 20px rgba(0, 170, 255, 0.3);
}

.holo-frame-top::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #00ffff, transparent);
    animation: holo-border-pulse 2s ease-in-out infinite;
}

@keyframes holo-border-pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
}

.sw-logo {
    max-width: 200px;
    height: auto;
    filter: drop-shadow(0 0 10px rgba(0, 217, 255, 0.5));
    animation: logo-glow 3s ease-in-out infinite;
}

@keyframes logo-glow {
    0%, 100% { filter: drop-shadow(0 0 10px rgba(0, 217, 255, 0.5)); }
    50% { filter: drop-shadow(0 0 20px rgba(0, 217, 255, 0.8)); }
}
'''


def ensure_holo_class(content, sheet_type):
    """Add holo-theme class to form element if not present"""
    # Pattern to match the opening form tag
    form_pattern = r'<form\s+class="([^"]*)"'
    
    def add_holo_class(match):
        classes = match.group(1)
        if 'holo-theme' not in classes:
            classes += ' holo-theme'
        return f'<form class="{classes}"'
    
    return re.sub(form_pattern, add_holo_class, content)


def add_holo_header(content):
    """Add holographic header with logo after opening form tag"""
    # Check if holo-frame-top already exists
    if 'holo-frame-top' in content:
        return content
    
    # Find the position after the opening form tag
    form_match = re.search(r'<form[^>]*>\s*', content)
    if form_match:
        insert_pos = form_match.end()
        return content[:insert_pos] + HOLO_HEADER_CSS + '\n    ' + content[insert_pos:]
    
    return content


def update_template_file(filepath):
    """Update a template file with holo theme"""
    print(f"Processing: {filepath}")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Determine sheet type from filename
        filename = os.path.basename(filepath)
        sheet_type = filename.replace('-sheet.hbs', '').replace('.hbs', '')
        
        # Add holo-theme class
        content = ensure_holo_class(content, sheet_type)
        
        # Add holo header with logo
        content = add_holo_header(content)
        
        # Only write if content changed
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  ✓ Updated {filename}")
            return True
        else:
            print(f"  - No changes needed for {filename}")
            return False
            
    except Exception as e:
        print(f"  ✗ Error processing {filepath}: {e}")
        return False


def update_css_file(filepath):
    """Update CSS file with holo frame styles"""
    print(f"Processing CSS: {filepath}")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Check if holo frame CSS already exists
        if 'holo-frame-top' not in content:
            # Add holo frame CSS at the end
            content += '\n\n' + HOLO_FRAME_CSS
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  ✓ Added holo frame CSS")
            return True
        else:
            print(f"  - Holo frame CSS already present")
            return False
            
    except Exception as e:
        print(f"  ✗ Error processing {filepath}: {e}")
        return False


def consolidate_holo_theme():
    """Ensure all sheets use the enhanced holo theme consistently"""
    
    # Main CSS files to update
    css_files = [
        REPO_PATH / "styles" / "character-sheet.css",
        REPO_PATH / "styles" / "unified-sheets.css",
    ]
    
    # Template files to update
    template_patterns = [
        REPO_PATH / "templates" / "actors" / "*-sheet.hbs",
        REPO_PATH / "templates" / "items" / "item-sheet.hbs",
        REPO_PATH / "templates" / "sheets" / "*-sheet.hbs",
    ]
    
    print("=" * 60)
    print("SWSE Holo Theme Application")
    print("=" * 60)
    
    # Update CSS files
    print("\n[1/2] Updating CSS Files...")
    css_updated = 0
    for css_file in css_files:
        if css_file.exists():
            if update_css_file(css_file):
                css_updated += 1
    
    print(f"\nCSS Files Updated: {css_updated}/{len(css_files)}")
    
    # Update template files
    print("\n[2/2] Updating Template Files...")
    templates_updated = 0
    total_templates = 0
    
    for pattern in template_patterns:
        for template_file in Path().glob(str(pattern)):
            total_templates += 1
            if update_template_file(template_file):
                templates_updated += 1
    
    print(f"\nTemplate Files Updated: {templates_updated}/{total_templates}")
    
    print("\n" + "=" * 60)
    print("Holo Theme Application Complete!")
    print("=" * 60)
    
    # Create a summary CSS file that can be imported
    create_summary_css()


def create_summary_css():
    """Create a comprehensive holo theme CSS file"""
    summary_path = REPO_PATH / "styles" / "swse-holo-complete.css"
    
    css_content = '''/* ══════════════════════════════════════════════════════════
   STAR WARS SAGA EDITION - COMPLETE HOLO THEME
   Unified holographic datapad styling for all sheets
   ══════════════════════════════════════════════════════════ */

/* Apply to all SWSE sheets */
.swse.sheet.holo-theme,
.swse.character-sheet.holo-theme,
.swse.npc-sheet.holo-theme,
.swse.droid-sheet.holo-theme,
.swse.vehicle-sheet.holo-theme,
.swse.item-sheet.holo-theme {
  position: relative;
  overflow: hidden;
  background: radial-gradient(circle at center, #0a0f1a 20%, #05080e 80%);
  color: #9ed0ff;
  border: 2px solid #1c4b8e;
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.3), inset 0 0 10px rgba(17, 34, 51, 0.8);
  font-family: "Orbitron", "Roboto", sans-serif;
  animation: holo-flicker 1.2s ease-in-out;
}

/* Keep content above grid layers */
.holo-theme form,
.holo-theme .sheet-body-wrapper,
.holo-theme .sheet-body {
  position: relative;
  z-index: 5;
}

''' + HOLO_FRAME_CSS + '''

/* ─────────────── Inputs & Textareas ─────────────── */
.holo-theme input,
.holo-theme textarea,
.holo-theme select {
  background: rgba(0, 30, 60, 0.4);
  color: #b5daff;
  border: 1px solid #0af;
  border-radius: 4px;
  padding: 4px 6px;
  transition: all 0.2s ease;
}

.holo-theme input:focus,
.holo-theme textarea:focus,
.holo-theme select:focus {
  border-color: #00c6ff;
  box-shadow: 0 0 8px #00c6ff;
  outline: none;
  background: rgba(0, 40, 80, 0.6);
}

.holo-theme input::placeholder {
  color: rgba(181, 218, 255, 0.5);
}

/* ─────────────── Headers ─────────────── */
.holo-theme .sheet-header {
  background: linear-gradient(135deg, rgba(26, 77, 122, 0.8), rgba(44, 95, 141, 0.8));
  border-bottom: 2px solid #0af;
  box-shadow: 0 0 20px rgba(0, 170, 255, 0.3);
}

.holo-theme .charname input,
.holo-theme h1,
.holo-theme h2,
.holo-theme h3 {
  color: #9ed0ff;
  text-shadow: 0 0 10px rgba(0, 170, 255, 0.5);
}

.holo-theme .section-header {
  color: #00c6ff;
  border-bottom-color: #0af;
  text-shadow: 0 0 5px rgba(0, 170, 255, 0.6);
}

.holo-theme .section-header-black {
  background: linear-gradient(to right, #000, #1a1a1a, #000);
  color: #00ff88;
  text-align: center;
  padding: 6px;
  font-weight: bold;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 2px;
  border-bottom: 2px solid #00a8cc;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.8);
}

/* ─────────────── Tabs Navigation ─────────────── */
.holo-theme .sheet-tabs {
  display: flex;
  border-bottom: 1px solid #0af;
  justify-content: space-around;
  margin-bottom: 0.5em;
  background: rgba(0, 20, 40, 0.6);
}

.holo-theme .sheet-tabs .item {
  padding: 0.4em 0.8em;
  cursor: pointer;
  color: #9ed0ff;
  text-transform: uppercase;
  transition: all 0.2s ease;
  border: none;
  background: transparent;
}

.holo-theme .sheet-tabs .item:hover {
  color: #fff;
  text-shadow: 0 0 6px #00baff;
  background: rgba(0, 170, 255, 0.1);
}

/* Active tab pulsing holo glow */
@keyframes holo-tab-pulse {
  0%, 100% {
    text-shadow: 0 0 8px #00f0ff, 0 0 15px rgba(0, 170, 255, 0.2);
    box-shadow: 0 2px 10px rgba(0, 170, 255, 0.2);
  }
  50% {
    text-shadow: 0 0 15px #00f0ff, 0 0 25px rgba(0, 170, 255, 0.67);
    box-shadow: 0 2px 15px rgba(0, 170, 255, 0.47);
  }
}

.holo-theme .sheet-tabs .item.active {
  color: #fff;
  border-bottom: 2px solid #00e6ff;
  background: rgba(0, 170, 255, 0.15);
  animation: holo-tab-pulse 3s ease-in-out infinite;
}

/* ─────────────── Buttons ─────────────── */
.holo-theme button,
.holo-theme .holo-btn {
  background: linear-gradient(90deg, #002f6c, #003f8f);
  border: 1px solid #00baff;
  color: #b5daff;
  border-radius: 6px;
  padding: 6px 12px;
  transition: 0.2s;
  cursor: pointer;
  text-shadow: 0 0 5px rgba(0, 170, 255, 0.3);
}

.holo-theme button:hover,
.holo-theme .holo-btn:hover {
  background: #00aaff;
  color: #fff;
  box-shadow: 0 0 10px #00cfff;
  animation: holo-pulse 1.5s infinite ease-in-out;
  transform: translateY(-1px);
}

@keyframes holo-pulse {
  0%, 100% { box-shadow: 0 0 10px rgba(0, 243, 255, 0.33); }
  50% { box-shadow: 0 0 20px rgba(0, 243, 255, 0.6); }
}

/* ─────────────── Stats & Values ─────────────── */
.holo-theme .ability-modifier,
.holo-theme .defense-value,
.holo-theme .stat-value,
.holo-theme .def-val,
.holo-theme .modifier-value {
  color: #00ff88;
  text-shadow: 0 0 8px rgba(0, 255, 136, 0.6);
}

.holo-theme .rollable:hover {
  color: #00ffff;
  text-shadow: 0 0 15px rgba(0, 255, 255, 0.8);
  transform: scale(1.1);
}

/* ─────────────── Boxes & Containers ─────────────── */
.holo-theme .ability,
.holo-theme .defense,
.holo-theme .resource-box,
.holo-theme .stat-box,
.holo-theme .item,
.holo-theme .npc-weapon,
.holo-theme .vehicle-weapon,
.holo-theme .datapad-section {
  background: rgba(0, 20, 40, 0.6);
  border: 1px solid rgba(0, 170, 255, 0.4);
  border-radius: 6px;
  box-shadow: 0 0 10px rgba(0, 170, 255, 0.1);
}

.holo-theme .ability:hover,
.holo-theme .item:hover {
  border-color: #0af;
  box-shadow: 0 0 15px rgba(0, 170, 255, 0.3);
}

/* ─────────────── Tables ─────────────── */
.holo-theme table,
.holo-theme .holo-table {
  width: 100%;
  border-collapse: collapse;
}

.holo-theme th,
.holo-theme td,
.holo-theme .holo-table th,
.holo-theme .holo-table td {
  border-bottom: 1px solid rgba(0, 77, 128, 0.5);
  padding: 6px 8px;
  color: #9ed0ff;
}

.holo-theme th {
  color: #00c6ff;
  text-shadow: 0 0 5px rgba(0, 170, 255, 0.5);
  background: rgba(0, 170, 255, 0.1);
}

.holo-theme tr:hover {
  background: rgba(0, 170, 255, 0.1);
}

/* ─────────────── Skills ─────────────── */
.holo-theme .skill-row,
.holo-theme .skill-data-row {
  border-bottom-color: rgba(0, 170, 255, 0.2);
}

.holo-theme .skill-row:hover,
.holo-theme .skill-data-row:hover {
  background: rgba(0, 170, 255, 0.15);
}

.holo-theme .skill-total {
  color: #00ff88;
  text-shadow: 0 0 5px rgba(0, 255, 136, 0.5);
}

/* ─────────────── Holographic Grid Overlay ─────────────── */
.holo-theme::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image:
    linear-gradient(90deg, rgba(0, 180, 255, 0.08) 1px, transparent 1px),
    linear-gradient(0deg, rgba(0, 180, 255, 0.08) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
  mix-blend-mode: screen;
  opacity: 0.25;
  animation: holo-grid-move 20s linear infinite;
  z-index: 0;
}

@keyframes holo-grid-move {
  from { background-position: 0 0, 0 0; }
  to { background-position: 200px 200px, 200px 200px; }
}

/* ─────────────── Holographic Glow Wave ─────────────── */
.holo-theme::after {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(circle at center, rgba(0,255,255,0.05) 0%, transparent 70%);
  mix-blend-mode: screen;
  animation: holo-wave 12s ease-in-out infinite;
  opacity: 0.2;
  pointer-events: none;
  z-index: 1;
}

@keyframes holo-wave {
  0%, 100% { transform: scale(1); opacity: 0.15; }
  50% { transform: scale(1.05); opacity: 0.3; }
}

/* ─────────────── Holo Boot-up Flicker ─────────────── */
@keyframes holo-flicker {
  0% { opacity: 0; filter: brightness(0.5); }
  15% { opacity: 1; filter: brightness(1.2); }
  30% { opacity: 0.7; filter: brightness(0.8); }
  50% { opacity: 1; filter: brightness(1); }
  75% { opacity: 0.9; filter: brightness(1.3); }
  100% { opacity: 1; filter: brightness(1); }
}

/* ─────────────── Scrollbar (Datapad style) ─────────────── */
.holo-theme ::-webkit-scrollbar {
  width: 8px;
}

.holo-theme ::-webkit-scrollbar-track {
  background: rgba(0, 20, 40, 0.6);
}

.holo-theme ::-webkit-scrollbar-thumb {
  background: #0077bb;
  border-radius: 10px;
  box-shadow: 0 0 5px rgba(0, 170, 255, 0.5);
}

.holo-theme ::-webkit-scrollbar-thumb:hover {
  background: #00cfff;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.7);
}

/* ─────────────── Special Effects ─────────────── */
.holo-theme .profile-img,
.holo-theme .character-portrait {
  border-color: #0af;
  box-shadow: 0 0 15px rgba(0, 170, 255, 0.5);
}

.holo-theme .editor-content {
  background: rgba(0, 20, 40, 0.4);
  border: 1px solid rgba(0, 170, 255, 0.3);
  color: #b5daff;
}

/* Add subtle scan line effect */
.holo-theme .sheet-body::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.3), transparent);
  animation: holo-scan 4s linear infinite;
  pointer-events: none;
  z-index: 100;
}

@keyframes holo-scan {
  from { transform: translateY(0); }
  to { transform: translateY(600px); }
}
'''
    
    print(f"\nCreating comprehensive holo theme CSS at: {summary_path}")
    with open(summary_path, 'w', encoding='utf-8') as f:
        f.write(css_content)
    print("  ✓ Created swse-holo-complete.css")


if __name__ == "__main__":
    consolidate_holo_theme()