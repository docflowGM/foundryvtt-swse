/**
 * cursor-authority.js
 *
 * Enforces SWSE cursor pack across all UI surfaces including the main board/canvas.
 *
 * Handles two cursor control layers:
 * 1. CSS layer — declarative cursor rules for static UI elements
 * 2. JS layer — reactive cursor updates when Foundry/tools dynamically change cursors
 *
 * Problem: Foundry may override cursor state via JS during tool changes, drag operations,
 * or other interactions. This module ensures SWSE cursors are reapplied/enforced.
 *
 * Solution: Hook into Foundry's tool/interaction state changes and synchronize board
 * cursor to match the SWSE cursor pack variables.
 */

export class CursorAuthority {
  static CURSOR_VARS = {
    default: '--swse-cursor-default',
    hover: '--swse-cursor-hover',
    select: '--swse-cursor-select',
    grab: '--swse-cursor-grab',
    grabbing: '--swse-cursor-grabbing',
    precision: '--swse-cursor-precision',
    text: '--swse-cursor-text',
    forbidden: '--swse-cursor-forbidden',
  };

  /**
   * Initialize cursor authority system.
   * Call this during system initialization (index.js or main entry point).
   */
  static initialize() {
    console.log('[CursorAuthority] Initializing SWSE cursor enforcement');

    // Apply initial board cursor
    this.applyBoardCursor('default');

    // Hook into Foundry's tool/layer events
    this._hookToolEvents();

    // Hook into Foundry's canvas interaction events
    this._hookCanvasEvents();

    // Listen for dynamic cursor changes and reapply SWSE cursor
    this._observeCursorChanges();

    console.log('[CursorAuthority] Initialization complete');
  }

  /**
   * Apply SWSE cursor to board element
   */
  static applyBoardCursor(cursorType = 'default') {
    const boardEl = document.getElementById('board');
    if (!boardEl) {
      console.warn('[CursorAuthority] Board element (#board) not found');
      return;
    }

    const varName = this.CURSOR_VARS[cursorType] ?? this.CURSOR_VARS.default;
    const cursorValue = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();

    if (cursorValue) {
      boardEl.style.cursor = cursorValue;
      console.debug(`[CursorAuthority] Applied cursor to board: ${cursorType}`);
    } else {
      console.warn(`[CursorAuthority] Failed to resolve CSS variable ${varName}`);
    }
  }

  /**
   * Hook into Foundry's tool system events
   * Updates cursor when active tool changes
   */
  static _hookToolEvents() {
    // Hook on game ready to access canvas/tools
    Hooks.on('ready', () => {
      if (canvas?.app) {
        // Tool change event
        Hooks.on('canvasReady', () => {
          console.log('[CursorAuthority] Canvas ready — applying cursor');
          this.applyBoardCursor('default');
        });

        // Detect tool changes if canvas exposes them
        if (canvas.app?.view) {
          canvas.app.view.addEventListener('pointerenter', () => {
            this.applyBoardCursor('default');
          });
        }
      }
    });
  }

  /**
   * Hook into canvas interaction events
   * Updates cursor for hover/drag/selection states
   */
  static _hookCanvasEvents() {
    Hooks.on('ready', () => {
      const boardEl = document.getElementById('board');
      if (!boardEl) return;

      // Track mouse over board for hover state
      boardEl.addEventListener('mouseenter', () => {
        this.applyBoardCursor('default');
      });

      // Track mouse leaving board
      boardEl.addEventListener('mouseleave', () => {
        this.applyBoardCursor('default');
      });

      // Track dragging on board
      boardEl.addEventListener('dragstart', () => {
        this.applyBoardCursor('grabbing');
      });

      boardEl.addEventListener('dragend', () => {
        this.applyBoardCursor('default');
      });

      // Listen for pointer events on canvas for more granular control
      if (canvas?.app?.view) {
        canvas.app.view.addEventListener('pointerdown', () => {
          this.applyBoardCursor('grabbing');
        });

        canvas.app.view.addEventListener('pointerup', () => {
          this.applyBoardCursor('default');
        });

        canvas.app.view.addEventListener('pointermove', () => {
          this.applyBoardCursor('default');
        });
      }
    });
  }

  /**
   * Observe for external cursor changes and reapply SWSE cursor
   * Detects if Foundry or other systems try to override cursor
   */
  static _observeCursorChanges() {
    Hooks.on('ready', () => {
      const boardEl = document.getElementById('board');
      if (!boardEl) return;

      // Use MutationObserver to detect style changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            // Check if cursor was overridden
            const currentCursor = boardEl.style.cursor;
            if (currentCursor && !currentCursor.includes('swse-cursor')) {
              console.debug('[CursorAuthority] Detected external cursor override, reapplying SWSE cursor');
              this.applyBoardCursor('default');
            }
          }
        });
      });

      observer.observe(boardEl, {
        attributes: true,
        attributeFilter: ['style'],
      });

      console.debug('[CursorAuthority] MutationObserver attached to board element');
    });
  }

  /**
   * Emergency reset — force all cursors back to SWSE
   * Useful if cursor state gets corrupted or Foundry interferes heavily
   */
  static forceReset() {
    console.log('[CursorAuthority] Force reset initiated');

    // Reset board
    this.applyBoardCursor('default');

    // Reset all app windows
    document.querySelectorAll('.application, .app, .swse-window').forEach((el) => {
      el.style.cursor = 'var(--swse-cursor-default)';
    });

    // Reset all buttons
    document.querySelectorAll('button, [role="button"]').forEach((el) => {
      el.style.cursor = 'var(--swse-cursor-hover)';
    });

    console.log('[CursorAuthority] Force reset complete');
  }

  /**
   * Debug method — log current cursor state across all major surfaces
   */
  static debugCursorState() {
    console.group('[CursorAuthority] Current Cursor State');

    const board = document.getElementById('board');
    if (board) {
      console.log('Board cursor:', board.style.cursor || '(inherited)');
    }

    const shells = document.querySelectorAll('.progression-shell');
    console.log(`Progression shells: ${shells.length} found`);
    if (shells.length > 0) {
      console.log('First shell cursor:', shells[0].style.cursor || '(inherited)');
    }

    const buttons = document.querySelectorAll('button');
    console.log(`Buttons: ${buttons.length} found`);
    if (buttons.length > 0) {
      console.log('First button cursor:', buttons[0].style.cursor || '(inherited)');
    }

    // Log CSS variable values
    const root = getComputedStyle(document.documentElement);
    Object.entries(this.CURSOR_VARS).forEach(([type, varName]) => {
      const value = root.getPropertyValue(varName).trim();
      console.log(`${varName}:`, value || '(undefined)');
    });

    console.groupEnd();
  }
}

// Auto-initialize on Foundry ready
Hooks.once('init', () => {
  CursorAuthority.initialize();
});
