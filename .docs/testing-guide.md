# Testing Guide

This guide helps you verify all the UI improvements are working correctly.

## Prerequisites

Make sure you have the application running locally. See [local-development.md](./local-development.md) for setup instructions.

## Test Checklist

### 1. Scrolling ✓

**Test**: 
- Open the Changelog page
- Scroll down through the content
- Verify the header stays fixed at the top
- Verify the sidebar stays fixed on the left
- Verify the main content scrolls smoothly

**Expected**: Content should scroll independently while header and sidebar remain fixed.

---

### 2. Filters on Summary Components ✓

**Test**:
1. Go to Changelog page
2. Note the numbers in the three summary cards (Campaign Start, Update, End)
3. Apply a filter (e.g., select an Account Manager)
4. Observe the summary card numbers change
5. Clear the filter and verify numbers return to original values

**Expected**: Summary cards should update based on active filters.

**Repeat for**:
- Calendar page (Live, Finished, Scheduled cards)
- Banners page (Banner Start, Update, End cards)

---

### 3. Improved Diffs Column ✓

**Test**:
1. Go to Changelog page
2. Expand the "Campaign Update" section
3. Look at the "Changes" column
4. Verify each change shows:
   - Field name (e.g., "CAMPAIGN END")
   - Old value (with strikethrough)
   - Arrow (→)
   - New value (bold)
5. Verify each field has a different color:
   - min_basket_size: Blue
   - campaign_id: Purple
   - cost_share_percentage: Amber
   - bonus_max_value: Green
   - campaign_start: Cyan
   - campaign_end: Rose

**Expected**: Changes should be clearly displayed with field name, old value, new value, and color coding.

---

### 4. Dark Mode ✓

**Test**:
1. Look at the top-right corner of the header
2. Click the sun/moon icon to toggle theme
3. Verify the theme changes:
   - First click: Dark mode
   - Second click: System mode (follows OS preference)
   - Third click: Light mode
4. Refresh the page and verify theme persists
5. Check all pages in dark mode:
   - Cards should have proper contrast
   - Text should be readable
   - Colors should look good
   - Charts should be visible

**Expected**: Theme should toggle smoothly and persist across page refreshes.

---

### 5. Color Palette ✓

**Test**:
1. Compare colors across light and dark modes
2. Verify colors are consistent with shadcn design:
   - Green tones for "start" actions
   - Cyan tones for "update" actions
   - Rose tones for "end" actions
3. Check table badges:
   - Spend Objective: Violet background
   - Bonus Type: Orange background
   - Banner Action: Green/Cyan/Rose based on type

**Expected**: Colors should be softer and more professional than before, with good contrast in both light and dark modes.

---

### 6. Colored Table Chips ✓

**Test**:
1. Open any data table (Changelog, Calendar, or Banners)
2. Look at the "Spend Objective" column - should have violet badges
3. Look at the "Bonus Type" column - should have orange badges
4. Look at the "Banner Action" column - should have colored badges:
   - Start: Green
   - Update: Cyan
   - End: Rose
5. Verify colors work in both light and dark modes

**Expected**: Each field type should have a consistent, distinct color.

---

### 7. Local Development Setup ✓

**Test**:
1. Stop the application if running
2. Follow the instructions in `.docs/local-development.md`
3. Start backend: `python backend/app.py`
4. Start frontend: `cd frontend && npm run dev`
5. Verify both servers start successfully
6. Access the application and verify it works

**Expected**: Simple, straightforward startup process without hidden log files or PID tracking.

---

## Common Issues

### Theme not persisting
- Check browser localStorage for `campaign-tracker-theme` key
- Clear localStorage and try again

### Filters not working
- Check browser console for errors
- Verify API is returning data correctly

### Colors look wrong
- Make sure you're using the latest code
- Try hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
- Check if dark mode is enabled when you expect light mode (or vice versa)

### Scrolling not working
- Check if content is long enough to scroll
- Try resizing the browser window
- Check browser console for CSS errors

## Browser Compatibility

Tested on:
- Chrome 120+
- Firefox 120+
- Safari 17+
- Edge 120+

## Reporting Issues

If you find any issues:
1. Note which test failed
2. Take a screenshot if visual
3. Check browser console for errors
4. Note your browser and OS version
