# Chargen Fix - Next Steps Checklist

## Two Fixes Applied
- ✅ P1: App ID fix (chargen-main.js) - APPLIED
- ✅ P0: Template HTML comments fix (chargen.hbs) - APPLIED

## REQUIRED: Full Foundry Restart

This is the critical next step. **Browser refresh is NOT sufficient.**

### Restart Steps

- [ ] **Step 1**: Close Foundry VTT completely
  - Use File menu → Exit, or Alt+F4, or close window
  - Make sure it's fully closed (check task manager if unsure)

- [ ] **Step 2**: Wait 5 seconds
  - This ensures all processes fully terminate

- [ ] **Step 3**: Reopen Foundry VTT
  - Click Foundry VTT icon/executable

- [ ] **Step 4**: Load your world
  - Wait for world to fully load

## OPTIONAL: Clear Browser Cache

If you encounter any issues after restart:

- [ ] **Chrome/Edge**: Ctrl+Shift+Delete → Select "All time" → Check "Cached images and files" → Click "Clear data"
- [ ] **Firefox**: Ctrl+Shift+Delete → Check "Cache" → Click "Clear Now"
- [ ] **Safari**: Click "Develop" menu → "Empty Caches"

## Test After Restart

- [ ] Open a character sheet
- [ ] Click "Chargen" button
- [ ] Verify chargen opens WITHOUT errors
- [ ] Verify Name step appears
- [ ] Try advancing to next step

## Success Indicators

✅ **You should see**:
- Chargen window opens successfully
- "Character Generator" in the window title
- Name step displayed
- No error messages about template or rendering

❌ **If you see**:
- Template validation error
- Wrong app title
- JavaScript errors in console
- → See "Troubleshooting" section below

## Quick Console Verification (Optional)

After chargen opens, run this in browser console (F12):

```javascript
const app = [...foundry.applications.instances.values()].find(a => a.id === 'chargen');
console.log({
  id: app?.id,
  title: app?.title,
  status: (app?.id === 'chargen' && app?.title === 'Character Generator') ? '✅ CORRECT' : '❌ WRONG'
});
```

Should output:
```
{
  id: "chargen",
  title: "Character Generator",
  status: "✅ CORRECT"
}
```

## Troubleshooting Quick Links

| Problem | Likely Cause | Action |
|---------|-------------|--------|
| Template validation error still showing | Server didn't reload template | Verify Foundry fully closed before restart; clear browser cache |
| Wrong app ID (mentor-chat-dialog) | JavaScript not reloaded | Verify Foundry fully closed; check task manager; restart again |
| Name step doesn't appear | Template render issue | Check browser console for JavaScript errors |
| Steps won't progress | Chargen logic issue (unlikely) | Check browser F12 console for errors; steps were working earlier |

## If Everything Works ✅

You're done! Both issues are fixed:
1. App ID and title are correct
2. Template renders without validation error
3. Chargen functionality works normally

## If Something Still Fails ❌

Please collect:
1. The exact error message shown
2. Browser console output (F12 → Console tab)
3. Foundry server log (if available)
4. Screenshot of the error

Then refer to SESSION_SUMMARY_ALL_FIXES.md for detailed troubleshooting.

---

## Files That Were Changed

- `/scripts/apps/chargen/chargen-main.js` - Added `static DEFAULT_OPTIONS`
- `/templates/apps/chargen.hbs` - Moved HTML comments inside root wrapper

**Everything else is unchanged.**

---

## Technical Summary (For Reference)

**P1 Fix**: Added explicit `id: 'chargen'` to DEFAULT_OPTIONS to prevent inheritance of wrong ID from parent class

**P0 Fix**: Moved HTML comments from before to inside root wrapper div, so comments aren't separate root nodes that fail validation

Both fixes are minimal, targeted, and follow established patterns in the codebase.
