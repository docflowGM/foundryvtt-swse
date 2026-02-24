# Phase 10: UI Hardening & Polish

## Overview

Phase 10 focuses on user experience hardening and polish. The core commerce system is complete (Phases 1-9), but user-facing aspects need refinement:

- Clear, actionable error messages
- Visual feedback during transactions
- Prevention of duplicate submissions
- Proper cleanup after transactions
- Retry mechanisms for transient failures
- Progress indicators for long operations

---

## Phase 10 Objectives

### Objective 1: Improved Error Messages

**Current State:**
- Generic error messages: "Purchase failed: Error message"
- Technical jargon not user-friendly
- Unclear remediation steps

**Target State:**
- Clear, specific error messages
- Plain language (no technical jargon)
- Actionable next steps
- Categorized by error type

**Implementation:**

#### 1.1 Error Message Mapping

Create error message translator in `store-engine.js`:

```javascript
static _translateErrorMessage(error) {
  // Input: error object or string
  // Output: user-friendly message with remediation

  const messages = {
    'Insufficient credits': {
      user: 'You don\'t have enough credits. Need {need}, have {have}.',
      remedy: 'Sell items or earn more credits, then try again.'
    },
    'Actor no longer exists': {
      user: 'Character was deleted during purchase.',
      remedy: 'Refresh your sheet and try again.'
    },
    'Invalid credit state': {
      user: 'Character credit data is corrupted.',
      remedy: 'Contact GM to repair character data.'
    },
    'Factory failed': {
      user: 'Could not create item. Template may be invalid.',
      remedy: 'Check with GM that item templates are correct.'
    },
    'Insufficient permissions': {
      user: 'You don\'t have permission to complete this purchase.',
      remedy: 'Only character owners can make purchases.'
    }
  };

  // Smart categorization: check error against known patterns
  for (const [key, msg] of Object.entries(messages)) {
    if (error.message?.includes(key)) {
      return {
        message: msg.user,
        remedy: msg.remedy,
        level: 'error'
      };
    }
  }

  // Fallback for unknown errors
  return {
    message: 'Purchase failed. Please try again.',
    remedy: 'If this persists, contact the GM.',
    level: 'error'
  };
}
```

#### 1.2 UI Error Display

Update `store-checkout.js` purchase completion:

```javascript
if (!result.success) {
  const { message, remedy, level } = StoreEngine._translateErrorMessage(
    result.error
  );

  // Show main error
  ui.notifications.error(message);

  // Show remedy as info
  if (remedy) {
    ui.notifications.info(`Next step: ${remedy}`);
  }

  // Log for debugging
  SWSELogger.warn('Store purchase failed', {
    error: result.error,
    remedy: remedy,
    transactionId: result.transactionId
  });

  return;
}
```

---

### Objective 2: Prevent Duplicate Submissions

**Current State:**
- Checkout button can be clicked multiple times rapidly
- May cause double-deductions or duplicate actors
- No visual indication that purchase is in progress

**Target State:**
- Checkout button disabled during transaction
- Visual feedback (spinner, text change)
- Prevent rapid re-clicks
- Clear enabled state when complete

**Implementation:**

#### 2.1 Disable Button During Transaction

In `store-checkout.js` checkout function (line 779):

```javascript
const handleConfirm = async () => {
    // PART 1: Disable buttons immediately
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Processing...';  // Visual feedback
    }
    if (cancelBtn) cancelBtn.disabled = true;

    cleanupListeners();

    try {
        // PART 2: Execute engine transaction
        const result = await StoreEngine.purchase({...});

        // PART 3: Re-enable after completion
        if (!result.success) {
            ui.notifications.error(`Purchase failed: ${result.error}`);

            // Re-enable for retry
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Confirm Trade';
            }
            if (cancelBtn) cancelBtn.disabled = false;

            store.exitCheckoutMode();
            return;
        }

        // PART 4: Success - clear UI
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Purchase Complete!';
        }

        ui.notifications.info(`Purchase successful!`);

        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            store.exitCheckoutMode();
        }, 3000);

    } catch (err) {
        // Error handling...

        // PART 5: Re-enable on exception
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm Trade';
        }
        if (cancelBtn) cancelBtn.disabled = false;
    }
};
```

#### 2.2 Add Progress Indicator

If checkout takes > 2 seconds, show progress:

```javascript
// Show progress indicator after 2 seconds
const progressTimer = setTimeout(() => {
    if (confirmBtn && confirmBtn.disabled) {
        confirmBtn.innerHTML = '<span class="spinner"></span> Processing...';
    }
}, 2000);

// Clear timer on completion
const cleanup = () => clearTimeout(progressTimer);
```

---

### Objective 3: Proper Cart Clearing

**Current State:**
- Cart may linger after purchase
- UI may show cleared cart but actor still has items
- Confusing if user tries to purchase again immediately

**Target State:**
- Cart cleared atomically with purchase
- UI reflects actual state
- No discrepancy between UI and actor data

**Implementation:**

#### 3.1 Clear Cart After Success

In `store-checkout.js` after successful purchase:

```javascript
if (result.success) {
    // Step 1: Clear cart data
    store.cart = {
        items: [],
        droids: [],
        vehicles: []
    };

    // Step 2: Update UI immediately
    store.render();

    // Step 3: Force sheet re-render (see Objective 4)
    if (game.user.character) {
        game.user.character.sheet?.render(false);
    }

    // Step 4: Notify user
    ui.notifications.info(`Purchased ${itemCount} item(s). Check your actor sheet!`);

    // Step 5: Auto-dismiss checkout after delay
    setTimeout(() => {
        store.exitCheckoutMode();
    }, 3000);
}
```

#### 3.2 Prevent Partial Cart State

Ensure cart is only cleared AFTER purchase succeeds:

```javascript
// DO NOT clear cart in handleConfirm start
// Only clear AFTER result.success === true
// This ensures retry is possible if needed
```

---

### Objective 4: Sheet Re-render Verification

**Current State:**
- Character sheet may not reflect new items immediately
- User refreshes page to see items
- Confusion about where items appeared

**Target State:**
- Sheet re-renders automatically after purchase
- Items appear immediately in possessions/hangar
- No refresh needed

**Implementation:**

#### 4.1 Force Sheet Render

In `StoreEngine.purchase()` after successful plan application:

```javascript
// After credit deduction + item grants complete
try {
    // Force re-render of actor sheet
    if (freshActor && freshActor.sheet) {
        // Use false to not auto-pop (sheet may be background)
        await freshActor.sheet.render(false);
    }
} catch (err) {
    SWSELogger.warn('Failed to re-render sheet (non-critical)', {
        actor: freshActor.id,
        error: err.message
    });
    // Non-critical: don't fail purchase if render fails
}
```

#### 4.2 Verify Item Visibility

Add verification after creation:

```javascript
// After items created, verify visible in sheet
const verifyItems = () => {
    const possessions = freshActor.system.possessions || [];
    const itemCount = possessions.length;

    if (itemCount !== expectedCount) {
        SWSELogger.warn('Item count mismatch after purchase', {
            expected: expectedCount,
            actual: itemCount
        });
        // Non-critical warning
    }

    return itemCount === expectedCount;
};
```

---

### Objective 5: Transient Error Retry Logic

**Current State:**
- Network errors fail immediately
- No automatic retry
- User must manually retry

**Target State:**
- Automatic retry for transient errors (< 3 times)
- Exponential backoff (1s, 2s, 4s)
- User notified of retries
- Clear message when unrecoverable

**Implementation:**

#### 5.1 Add Retry Wrapper

Create `store-engine.js` helper:

```javascript
static async executeWithRetry(
    purchaseContext,
    maxAttempts = 3,
    baseDelayMs = 1000
) {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const result = await this.purchase(purchaseContext);

            if (result.success) {
                return result; // Success
            }

            // Non-transient error (insufficient funds, etc.)
            return result;

        } catch (err) {
            lastError = err;

            const isTransient = this._isTransientError(err);
            if (!isTransient || attempt === maxAttempts) {
                // Non-transient or final attempt
                throw err;
            }

            // Transient error: retry with backoff
            const delayMs = baseDelayMs * Math.pow(2, attempt - 1);

            SWSELogger.info(`Purchase retry attempt ${attempt}/${maxAttempts}`, {
                error: err.message,
                delayMs
            });

            // Notify user
            if (attempt === 2) {
                ui.notifications.info('Network issue, retrying...');
            }

            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    throw new Error(`Purchase failed after ${maxAttempts} attempts: ${lastError.message}`);
}

static _isTransientError(error) {
    const message = error.message || '';

    // Network errors
    if (message.includes('ECONNREFUSED')) return true;
    if (message.includes('ETIMEDOUT')) return true;
    if (message.includes('network')) return true;

    // Foundry temporary issues
    if (message.includes('temporarily unavailable')) return true;

    // NOT transient
    return false;
}
```

#### 5.2 Use Retry in Checkout

In `store-checkout.js`:

```javascript
const result = await StoreEngine.executeWithRetry({
    actor: store.actor,
    items: store.cart,
    totalCost: total,
    itemGrantCallback: async (purchasingActor, cartItems) => {
        const plans = [];
        plans.push(...createItemPlans(store.cart.items));
        plans.push(...createDroidPlans(store.cart.droids));
        plans.push(...createVehiclePlans(store.cart.vehicles, store.itemsById));
        return plans;
    }
});

if (!result.success) {
    const { message, remedy } = StoreEngine._translateErrorMessage(result.error);
    ui.notifications.error(message);
    if (remedy) ui.notifications.info(`Next step: ${remedy}`);
    return;
}
```

---

### Objective 6: Progress Indicators for Long Operations

**Current State:**
- No indication of purchase progress
- User unclear if system is working
- Long waits (5+ seconds) feel broken

**Target State:**
- Progress indicator after 2 seconds
- Detailed status messages
- Estimated completion time

**Implementation:**

#### 6.1 Add Progress Tracking

In `StoreEngine.purchase()`:

```javascript
// Log progress milestones
const progressLog = {
    started: Date.now(),
    creditsDeducted: null,
    itemsGranted: null,
    completed: null
};

try {
    // Step 1: Validate (< 100ms)
    progressLog.validated = Date.now();
    SWSELogger.debug('Purchase step 1: Validated', {
        elapsed: progressLog.validated - progressLog.started
    });

    // Step 2: Re-read fresh actor (< 100ms)
    const freshActor = game.actors.get(actor.id);
    progressLog.actorLoaded = Date.now();

    // Step 3: Deduct credits (< 500ms)
    await freshActor.update({ 'system.credits': newCredits });
    progressLog.creditsDeducted = Date.now();
    SWSELogger.debug('Purchase step 2: Credits deducted', {
        elapsed: progressLog.creditsDeducted - progressLog.started
    });

    // Step 4: Grant items (variable, 1-5s for many items)
    if (itemGrantCallback) {
        await applyPlans(...);
    }
    progressLog.itemsGranted = Date.now();
    SWSELogger.debug('Purchase step 3: Items granted', {
        elapsed: progressLog.itemsGranted - progressLog.started
    });

    // Step 5: Final verification (< 100ms)
    progressLog.completed = Date.now();
    SWSELogger.info('Purchase completed', {
        totalElapsed: progressLog.completed - progressLog.started,
        steps: progressLog
    });

} catch (err) {
    SWSELogger.error('Purchase failed', {
        elapsed: Date.now() - progressLog.started,
        failurePoint: progressLog
    });
    throw err;
}
```

#### 6.2 UI Progress Display

In `store-checkout.js`:

```javascript
// Listen to logs and update UI
const originalLog = SWSELogger.debug;
const progressMessages = [];

SWSELogger.debug = function(msg, context) {
    if (msg.startsWith('Purchase step')) {
        progressMessages.push({
            message: msg,
            elapsed: context.elapsed
        });

        // Update UI if visible
        if (confirmBtn && confirmBtn.disabled) {
            const stepNum = progressMessages.length;
            confirmBtn.textContent = `Processing step ${stepNum}/3...`;
        }
    }
    return originalLog.call(this, msg, context);
};
```

---

## Implementation Checklist

### Part 1: Error Message Hardening
- [ ] Create error message mapper in StoreEngine
- [ ] Categorize error types (insufficient funds, permission, validation, etc.)
- [ ] Add remediation suggestions for each error type
- [ ] Update checkout UI to display friendly messages
- [ ] Test error scenarios and verify messages

### Part 2: Button State Management
- [ ] Disable confirm button when transaction starts
- [ ] Change button text to "Processing..."
- [ ] Re-enable button on failure (for retry)
- [ ] Disable button on success and change text
- [ ] Add loading spinner (CSS-based)
- [ ] Test rapid clicks (should be prevented)

### Part 3: Cart Management
- [ ] Clear cart after successful purchase
- [ ] Update UI to reflect empty cart
- [ ] Prevent cart updates during transaction
- [ ] Handle partial cart updates
- [ ] Test cart state consistency

### Part 4: Sheet Re-rendering
- [ ] Force actor sheet re-render after purchase
- [ ] Handle sheet not being open (graceful failure)
- [ ] Verify items appear in sheet
- [ ] Add logging for re-render success/failure
- [ ] Test with multiple open sheets

### Part 5: Retry Logic
- [ ] Create executeWithRetry() wrapper
- [ ] Detect transient errors
- [ ] Implement exponential backoff
- [ ] Log retry attempts
- [ ] Notify user of retries
- [ ] Test with simulated network failures

### Part 6: Progress Indicators
- [ ] Add progress milestones to purchase()
- [ ] Log timing for each step
- [ ] Display progress in UI
- [ ] Show estimated completion time
- [ ] Test with slow network (throttled)

---

## Files to Modify

### `scripts/engines/store/store-engine.js`
- Add `_translateErrorMessage()`
- Add `_isTransientError()`
- Add `executeWithRetry()`
- Add progress logging

### `scripts/apps/store/store-checkout.js`
- Update `checkout()` button handling
- Implement button disabling
- Clear cart after success
- Add progress UI updates
- Add retry logic

### Optional: `styles/store.css` (if CSS overrides needed)
- Add spinner animation
- Style disabled button state
- Add progress indicator styling

---

## Success Criteria

### ✓ Error Messages
- [ ] All error messages are user-friendly
- [ ] All error messages include remedy
- [ ] No technical jargon in error text
- [ ] Users understand what went wrong

### ✓ Button State
- [ ] Button disabled during transaction
- [ ] Button text changes ("Processing...")
- [ ] Button re-enabled on failure
- [ ] Button shows completion state
- [ ] Multiple rapid clicks prevented

### ✓ Cart Management
- [ ] Cart empty after successful purchase
- [ ] Cart preserved on failed purchase
- [ ] UI matches actor data
- [ ] No discrepancy between UI and state

### ✓ Sheet Updates
- [ ] New items visible immediately
- [ ] No refresh needed by user
- [ ] Possessions/hangar updated
- [ ] Actor sheet reflects purchase

### ✓ Retry Logic
- [ ] Transient errors retry automatically
- [ ] Backoff prevents thundering herd
- [ ] User notified of retries
- [ ] Final error is clear

### ✓ Progress Feedback
- [ ] UI responsive during transaction
- [ ] Progress visible for long operations
- [ ] No unclear waits
- [ ] Clear completion indication

---

## Testing After Phase 10

All items from Phase 9 manual testing should still pass, plus:

### New Tests
- [ ] Purchase with all error conditions (insufficient funds, etc.)
- [ ] Verify friendly error messages
- [ ] Rapid-click prevention (click button 5 times fast)
- [ ] Cart clears after purchase
- [ ] Sheet updates immediately
- [ ] Retry on transient failure
- [ ] Progress indicator appears for long operations
- [ ] Button state transitions correct

---

## Performance Goals

- Store load: < 2 seconds
- Single item purchase: < 3 seconds
- Multi-item checkout: < 5 seconds
- Sheet re-render: < 1 second
- Button response: instant
- Error message display: < 500ms

---

## Rollout Plan

### 1. Merge to main
- All Phase 10 changes merged
- Code review complete
- Tests passing

### 2. Deploy to live
- Announce changes to users
- Monitor for issues
- Adjust error messages based on feedback

### 3. Monitor metrics
- Error rate
- Average transaction time
- User feedback
- Support tickets

---

## Summary

Phase 10 transforms the commerce system from "working" to "polished":

- **Clarity:** Users understand what happened and why
- **Reliability:** Transient failures retry automatically
- **Visibility:** Progress is clear and feedback is immediate
- **Robustness:** Button state prevents duplicate submissions
- **Trust:** Fast, responsive UI builds user confidence

After Phase 10, the commerce system is enterprise-grade and production-ready.

---

## Commit Message Template

```
Phase 10: UI Hardening & Polish

IMPROVEMENTS:
- Add error message translator with user-friendly messages
- Implement retry logic for transient failures (exponential backoff)
- Disable checkout button during transaction (prevent duplicates)
- Auto-clear cart after successful purchase
- Force actor sheet re-render after purchase
- Add progress logging and indicators
- Improve error remediation suggestions

CHANGES:
- scripts/engines/store/store-engine.js:
  - Add _translateErrorMessage() for friendly errors
  - Add _isTransientError() for transient detection
  - Add executeWithRetry() for automatic retries
  - Add progress logging to purchase()

- scripts/apps/store/store-checkout.js:
  - Disable confirm button during transaction
  - Clear cart after successful purchase
  - Add progress UI updates
  - Use executeWithRetry for purchase

SUCCESS CRITERIA:
✅ Error messages are user-friendly
✅ Button state prevents duplicate submissions
✅ Transient errors retry automatically
✅ Progress is visible for long operations
✅ Sheet updates immediately
✅ Cart clears after purchase

All Phase 9 tests still passing + new Phase 10 tests.
```

---

## Next Steps

1. Review this plan with stakeholders
2. Implement Part 1 (Error Messages)
3. Implement Part 2 (Button State)
4. Implement Part 3 (Cart Management)
5. Implement Part 4 (Sheet Re-render)
6. Implement Part 5 (Retry Logic)
7. Implement Part 6 (Progress Indicators)
8. Test all scenarios
9. Deploy to production
10. Monitor and adjust

Phase 10 is the final polish phase. After this, the commerce system is complete.
