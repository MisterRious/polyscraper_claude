# Tag-Based Filtering Fix

## Problem

When clicking category menu items like "Sports", "Politics", etc., the script either:
1. Returned wrong markets (e.g., "Caitlin Clark stalker" for Sports)
2. Returned no markets at all

## Root Cause

The script was trying to filter markets by matching category names (like "Sports") against tag labels in market data, but:
1. Polymarket's actual tag names might differ from our menu labels
2. Some markets had no tags or empty tag arrays
3. Text-based matching on question/description caused false positives

## Solution

Implemented a **two-tier tag filtering approach**:

### Tier 1: API-Level Filtering (Preferred)

1. **Query the `/tags` endpoint** to get official tag IDs
2. **Match category name to tag ID** using flexible matching:
   - Exact match: "Sports" → tag with label "Sports"
   - Partial match: "Sports" → tag with label "Sports & Betting"
   - Singular/plural: "Sports" → tag with label "Sport"
3. **Use tag ID in API request** for server-side filtering:
   ```javascript
   getMarkets({ tag: tagId, closed: false, active: true, limit: 500 })
   ```

**Benefits:**
- ✅ Uses official Polymarket tag IDs
- ✅ Server-side filtering (faster, more accurate)
- ✅ No false positives from text matching
- ✅ Works even if tag names differ from menu labels

### Tier 2: Client-Side Filtering (Fallback)

If no tag ID is found in Tier 1:

1. **Fetch all active markets** (up to 500)
2. **Filter client-side** by matching tag labels
3. **Show comprehensive diagnostics** if no matches found

**Benefits:**
- ✅ Works even if `/tags` endpoint fails
- ✅ Provides detailed error messages with available tags
- ✅ Helps users understand why no results were found

## Code Changes

### New Function: `findTagId(categoryName)`

```javascript
function findTagId(categoryName) {
  const tags = getTags(); // Fetch from /tags endpoint

  // Try exact match
  let match = tags.find(tag => tag.label.toLowerCase() === categoryName.toLowerCase());
  if (match) return match.id;

  // Try partial match
  match = tags.find(tag =>
    tag.label.toLowerCase().includes(categoryName.toLowerCase()) ||
    categoryName.toLowerCase().includes(tag.label.toLowerCase())
  );
  if (match) return match.id;

  // Try singular/plural variations
  // ...

  return null; // No match found
}
```

### Updated Functions

Both `fetchCategoryStructured()` and `fetchCategoryOriginal()` now:

1. **Call `findTagId()`** first
2. **If tag ID found**: Use it in API request
3. **If tag ID not found**: Fall back to client-side filtering

## Expected Behavior Now

### Scenario 1: Tag Exists in Polymarket API

```
User clicks: Sports
Script: Calls /tags, finds tag ID "sports-betting"
Script: Calls /markets?tag=sports-betting&closed=false&active=true&limit=500
Result: ✅ Shows all sports markets using official tag
```

### Scenario 2: Tag Doesn't Exist in API

```
User clicks: Sports
Script: Calls /tags, no match found for "Sports"
Script: Falls back to fetching all markets
Script: Filters client-side by tag labels
Result: Either shows matches or comprehensive error message
```

### Scenario 3: No Markets Have Tags

```
User clicks: Sports
Script: Tries both tiers, finds no tagged markets
Result: Shows diagnostic message:
  - How many markets fetched
  - How many have tags vs. empty tags
  - List of available tags
  - Suggestions for next steps
```

## Testing

### Test Case 1: Sports Category

**Before:**
- Returned "Caitlin Clark stalker" (false positive)
- Or returned "No markets found" with empty tag list

**After:**
1. Queries `/tags` for "Sports" tag
2. If found, uses tag ID for precise filtering
3. If not found, shows available tags to user

### Test Case 2: Politics Category

**Expected:**
1. Finds "Politics" tag in `/tags` endpoint
2. Uses tag ID to fetch political markets
3. Displays results in structured format

### Test Case 3: Custom Category (e.g., "Crypto")

**Expected:**
1. Looks for "Crypto", "Cryptocurrency", "Bitcoin", etc.
2. Uses first match found
3. Falls back to client-side if no tag ID

## Debugging

If categories still don't work:

1. **Check logs** (View → Logs in Apps Script):
   ```
   Fetching category: Sports
   Found exact tag match: sports-betting for "Sports"
   Using tag ID: sports-betting
   Fetched 123 markets with tag ID "sports-betting"
   ```

2. **Run "Show Available Tags"** menu item:
   - Creates a new sheet showing all official tags
   - Reveals actual tag names used by Polymarket

3. **Run "📋 Show All Tags"** menu item:
   - Shows popup with all unique tags from current markets
   - Helps identify tag naming patterns

## Benefits of This Approach

1. **Accuracy**: Uses official Polymarket tag IDs, no guessing
2. **Performance**: Server-side filtering when possible
3. **Reliability**: Fallback ensures something always happens
4. **Transparency**: Comprehensive error messages guide users
5. **Maintainability**: Adapts to Polymarket's tag changes automatically

## Future Enhancements

Potential improvements:

- [ ] Cache tag IDs to reduce API calls
- [ ] Auto-update menu items based on available tags
- [ ] Allow users to specify custom tag IDs in sheet cells
- [ ] Support multiple tag filtering (e.g., Sports + Soccer)
- [ ] Add tag hierarchy support (parent/child tags)

---

**Last Updated**: 2025-10-30

**Related Files**:
- `PolymarketScraper.gs` - Main script with updated filtering logic
- `API_REFERENCE.md` - Polymarket API documentation
- `TROUBLESHOOTING.md` - Debug guide
