#!/usr/bin/env python3
"""
Add Store Button to SWSE Character Sheet
Automatically integrates the store button into the character sheet and wires up the handler
"""

import shutil
from pathlib import Path
from datetime import datetime

REPO_PATH = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")
BACKUP_DIR = REPO_PATH / "store_button_backup" / datetime.now().strftime("%Y%m%d_%H%M%S")

class StoreButtonAdder:
    def __init__(self):
        self.repo_path = REPO_PATH
        self.backup_dir = BACKUP_DIR
        self.actions = []
        self.warnings = []
    
    def create_backup(self):
        """Backup files we'll modify"""
        print("Creating backup...")
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        files_to_backup = [
            "templates/actor/character-sheet.hbs",
            "scripts/swse-actor.js"
        ]
        
        for file_path in files_to_backup:
            src = self.repo_path / file_path
            if src.exists():
                dst = self.backup_dir / file_path
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)
                print(f"  ✓ Backed up: {file_path}")
            else:
                self.warnings.append(f"File not found: {file_path}")
        
        print("✓ Backup complete\n")
    
    def add_button_to_template(self):
        """Add store button to character sheet template"""
        print("Adding store button to character sheet...")
        
        template_path = self.repo_path / "templates" / "actor" / "character-sheet.hbs"
        
        if not template_path.exists():
            self.warnings.append("Character sheet template not found!")
            return False
        
        with open(template_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if button already exists
        if 'open-store-btn' in content or 'Galactic Trade Exchange' in content:
            print("  ℹ Store button already exists in template")
            return True
        
        # Store button HTML
        store_button_html = '''
                <!-- Store Access -->
                <section class="store-section">
                    <button type="button" class="open-store-btn">
                        <i class="fas fa-shopping-cart"></i> Galactic Trade Exchange
                    </button>
                </section>
'''
        
        # Try to find a good location - look for credits or force points section
        insertion_points = [
            ('<!-- Force Points & Dark Side -->', 'after'),
            ('<section class="force-section">', 'after_close'),
            ('name="system.credits"', 'after_section'),
            ('<!-- Level Up Button -->', 'before'),
            ('<section class="level-up-section">', 'before'),
            ('</div>\n    </div>\n</form>', 'before_last')  # Fallback - before closing tags
        ]
        
        inserted = False
        for marker, position in insertion_points:
            if marker in content:
                if position == 'after':
                    # Insert after the marker line
                    lines = content.split('\n')
                    for i, line in enumerate(lines):
                        if marker in line:
                            lines.insert(i + 1, store_button_html)
                            content = '\n'.join(lines)
                            inserted = True
                            print(f"  ✓ Inserted button after '{marker[:50]}...'")
                            break
                
                elif position == 'after_close':
                    # Find the closing </section> tag after the marker
                    idx = content.find(marker)
                    if idx != -1:
                        # Find next </section>
                        close_idx = content.find('</section>', idx)
                        if close_idx != -1:
                            insert_pos = close_idx + len('</section>')
                            content = content[:insert_pos] + '\n' + store_button_html + content[insert_pos:]
                            inserted = True
                            print(f"  ✓ Inserted button after section containing '{marker[:50]}...'")
                            break
                
                elif position == 'after_section':
                    # Find the line, then find the next </section> or </div>
                    idx = content.find(marker)
                    if idx != -1:
                        # Find containing section close
                        close_idx = content.find('</section>', idx)
                        if close_idx == -1:
                            close_idx = content.find('</div>', idx)
                        if close_idx != -1:
                            insert_pos = close_idx + len('</section>')
                            content = content[:insert_pos] + '\n' + store_button_html + content[insert_pos:]
                            inserted = True
                            print(f"  ✓ Inserted button after section containing '{marker[:50]}...'")
                            break
                
                elif position == 'before':
                    # Insert before the marker
                    idx = content.find(marker)
                    if idx != -1:
                        content = content[:idx] + store_button_html + '\n' + content[idx:]
                        inserted = True
                        print(f"  ✓ Inserted button before '{marker[:50]}...'")
                        break
                
                elif position == 'before_last':
                    # Insert before the marker (fallback)
                    idx = content.rfind(marker)
                    if idx != -1:
                        content = content[:idx] + store_button_html + '\n' + content[idx:]
                        inserted = True
                        print(f"  ✓ Inserted button before closing tags (fallback)")
                        break
                
                if inserted:
                    break
        
        if not inserted:
            self.warnings.append(
                "Could not find suitable insertion point in template.\n"
                "  Please add the store button manually - see backup guide."
            )
            return False
        
        # Write updated template
        with open(template_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        self.actions.append("Added store button to character-sheet.hbs")
        print()
        return True
    
    def add_handler_to_actor_sheet(self):
        """Add store button handler to SWSEActorSheet"""
        print("Adding store button handler to actor sheet...")
        
        actor_js = self.repo_path / "scripts" / "swse-actor.js"
        
        if not actor_js.exists():
            self.warnings.append("swse-actor.js not found!")
            return False
        
        with open(actor_js, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if handler already exists
        if '_onOpenStore' in content:
            print("  ℹ Store handler already exists")
            return True
        
        # Find the activateListeners method
        if 'activateListeners(html)' not in content:
            self.warnings.append("Could not find activateListeners method in swse-actor.js")
            return False
        
        # Add listener in activateListeners
        listener_line = "    html.find('.open-store-btn').click(this._onOpenStore.bind(this));\n"
        
        # Find activateListeners method and add at the end, before the closing brace
        lines = content.split('\n')
        in_activate_listeners = False
        insert_index = -1
        brace_count = 0
        
        for i, line in enumerate(lines):
            if 'activateListeners(html)' in line:
                in_activate_listeners = True
                brace_count = 0
                continue
            
            if in_activate_listeners:
                # Count braces to find method end
                brace_count += line.count('{') - line.count('}')
                
                # When we close the method (brace_count becomes 0), insert before this line
                if brace_count == 0 and '}' in line:
                    insert_index = i
                    break
        
        if insert_index > 0:
            # Insert the listener call
            lines.insert(insert_index, '\n    // Store button')
            lines.insert(insert_index + 1, listener_line)
            self.actions.append("Added store button listener to activateListeners()")
            print("  ✓ Added listener to activateListeners()")
        else:
            self.warnings.append("Could not find insertion point in activateListeners method")
            return False
        
        # Now add the _onOpenStore method at the end of the class
        # Find the last method or the end of the class
        store_handler = '''
  async _onOpenStore(event) {
    event.preventDefault();
    if (game.swse?.openStore) {
      game.swse.openStore(this.actor);
    } else {
      ui.notifications.warn("Store system not available. Ensure store.js is loaded.");
    }
  }
'''
        
        # Find the last closing brace of the class (before export or EOF)
        class_end_index = -1
        for i in range(len(lines) - 1, -1, -1):
            line = lines[i].strip()
            if line == '}' and i > 0:
                # Check if this might be the class closing brace
                # Look back for class definition
                found_class = False
                for j in range(i, max(0, i - 100), -1):
                    if 'class SWSEActorSheet' in lines[j]:
                        found_class = True
                        break
                
                if found_class:
                    class_end_index = i
                    break
        
        if class_end_index > 0:
            # Insert the new method before the closing brace
            lines.insert(class_end_index, store_handler)
            self.actions.append("Added _onOpenStore() method to SWSEActorSheet")
            print("  ✓ Added _onOpenStore() method")
        else:
            self.warnings.append("Could not find class end to add _onOpenStore method")
            return False
        
        # Write back
        content = '\n'.join(lines)
        with open(actor_js, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print()
        return True
    
    def create_manual_guide(self):
        """Create a manual guide in case automatic insertion fails"""
        guide = """# Manual Store Button Integration

If the automatic script couldn't add the button, follow these steps:

## 1. Add Button to Character Sheet

Edit `templates/actor/character-sheet.hbs`

Find a good location (near credits or force points) and add:

```handlebars
<!-- Store Access -->
<section class="store-section">
    <button type="button" class="open-store-btn">
        <i class="fas fa-shopping-cart"></i> Galactic Trade Exchange
    </button>
</section>
```

## 2. Add Handler to Actor Sheet

Edit `scripts/swse-actor.js`

### In activateListeners() method:

Add this line before the closing brace:

```javascript
activateListeners(html) {
    super.activateListeners(html);
    
    // ... existing listeners ...
    
    // Store button
    html.find('.open-store-btn').click(this._onOpenStore.bind(this));
}
```

### Add new method to the class:

Before the class closing brace, add:

```javascript
async _onOpenStore(event) {
    event.preventDefault();
    if (game.swse?.openStore) {
        game.swse.openStore(this.actor);
    } else {
        ui.notifications.warn("Store system not available. Ensure store.js is loaded.");
    }
}
```

## 3. Optional: Add CSS Styling

Edit `styles/swse-components.css` or create a new CSS file:

```css
.store-section {
    margin: 10px 0;
    text-align: center;
}

.open-store-btn {
    background: linear-gradient(135deg, #1e3a8a, #3b82f6);
    color: #fff;
    border: 2px solid #60a5fa;
    padding: 10px 20px;
    font-size: 14px;
    font-weight: bold;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.open-store-btn:hover {
    background: linear-gradient(135deg, #3b82f6, #60a5fa);
    box-shadow: 0 0 10px #3b82f6;
    transform: translateY(-2px);
}

.open-store-btn i {
    margin-right: 5px;
}
```

## 4. Test

In Foundry console:

```javascript
const char = game.actors.contents[0];
game.swse.openStore(char);
```
"""
        
        guide_file = self.backup_dir / "MANUAL_BUTTON_INTEGRATION.md"
        with open(guide_file, 'w', encoding='utf-8') as f:
            f.write(guide)
        
        return guide_file
    
    def run(self):
        """Execute the button addition"""
        print("="*70)
        print("Add Store Button to SWSE Character Sheet")
        print("="*70)
        print()
        
        if not self.repo_path.exists():
            print(f"❌ Repository not found: {self.repo_path}")
            return False
        
        try:
            # Backup
            self.create_backup()
            
            # Add button to template
            template_success = self.add_button_to_template()
            
            # Add handler to actor sheet
            handler_success = self.add_handler_to_actor_sheet()
            
            # Create manual guide
            guide_file = self.create_manual_guide()
            
            # Report
            print("="*70)
            if template_success and handler_success:
                print("✓ Store Button Integration Complete!")
            else:
                print("⚠ Partial Integration - Manual Steps Required")
            print("="*70)
            print()
            print(f"Backup: {self.backup_dir}")
            print(f"Manual Guide: {guide_file}")
            print()
            
            if self.actions:
                print("ACTIONS PERFORMED:")
                for action in self.actions:
                    print(f"  ✓ {action}")
                print()
            
            if self.warnings:
                print("WARNINGS:")
                for warning in self.warnings:
                    print(f"  ⚠ {warning}")
                print()
            
            print("NEXT STEPS:")
            print("1. Start Foundry VTT")
            print("2. Open a character sheet")
            print("3. Look for 'Galactic Trade Exchange' button")
            print("4. Click it to test the store!")
            print()
            print("OR test via console:")
            print("  game.swse.openStore(game.actors.contents[0])")
            print()
            
            if not (template_success and handler_success):
                print(f"⚠ Some steps failed - see manual guide: {guide_file}")
                print()
            
            return True
            
        except Exception as e:
            print(f"\n❌ Error: {e}")
            print(f"Restore from: {self.backup_dir}")
            raise


def main():
    adder = StoreButtonAdder()
    success = adder.run()
    return 0 if success else 1


if __name__ == "__main__":
    exit(main())