# Changelog

## [2025-10-30] - Tag Filtering System Overhaul

### Fixed
- **Category filtering now works accurately** - Categories like "Sports", "Politics", etc. no longer return wrong markets or no results
- **Eliminated false positives** - No more markets like "Caitlin Clark stalker" appearing in Sports category
- **Missing markets issue resolved** - Markets are now found using official Polymarket tag IDs

### Added
- **Two-tier tag filtering system**:
  - **Tier 1 (Preferred)**: Queries `/tags` endpoint to get official tag IDs, then uses those for server-side API filtering
  - **Tier 2 (Fallback)**: If no tag ID found, fetches all markets and filters client-side with comprehensive diagnostics

- **New function: `findTagId(categoryName)`**:
  - Searches official Polymarket tags endpoint
  - Matches with exact, partial, and singular/plural variations
  - Returns tag ID for precise API filtering

- **Comprehensive error diagnostics**:
  - Shows how many markets have tags vs. empty tags
  - Lists all available tags when no matches found
  - Provides actionable solutions in error messages

- **Documentation**:
  - `TAG_FILTERING_FIX.md` - Technical explanation of the fix
  - `TESTING_THE_FIX.md` - Step-by-step testing guide
  - Updated `README.md` with troubleshooting section

### Changed
- **Updated `fetchCategoryStructured()`** to use two-tier approach
- **Updated `fetchCategoryOriginal()`** to use two-tier approach
- **Improved logging** throughout tag matching process

### Technical Details

**Before:**
```javascript
// Fetched all markets, then filtered by text matching on tags
const categoryMarkets = allMarkets.filter(market => {
  const tagText = market.tags.join(' ');
  return tagText.includes(category);
});
// Problem: Caused false positives and missed markets with different tag names
```

**After:**
```javascript
// First try to get official tag ID
const tagId = findTagId(category); // "Sports" → "sports-betting"

if (tagId) {
  // Use tag ID for server-side filtering
  markets = getMarkets({ tag: tagId, closed: false, active: true, limit: 500 });
} else {
  // Fallback to client-side with improved matching
  // Plus comprehensive diagnostics
}
```

**Benefits:**
- ✅ Uses official Polymarket tag IDs for accuracy
- ✅ Server-side filtering improves performance
- ✅ Fallback ensures robustness
- ✅ Better error messages guide users

### Migration Guide

If you're updating from a previous version:

1. **Copy the latest `PolymarketScraper.gs`** into your Apps Script editor
2. **Save** the script
3. **Refresh** your Google Sheet
4. **Test** by clicking any category menu item
5. **Check logs** (View → Logs) to see the tag matching process

No changes to menu structure or user interface.

### Breaking Changes

None - fully backward compatible.

### Known Issues

None currently. If the `/tags` endpoint is slow or unavailable, the script will automatically fall back to client-side filtering.

### Future Enhancements

Potential improvements for future versions:
- [ ] Cache tag IDs to reduce API calls
- [ ] Auto-update menu items based on available tags
- [ ] Support multiple tag filtering (e.g., Sports + Soccer)
- [ ] Add tag hierarchy support (parent/child tags)
- [ ] Custom tag mapping configuration

---

## [2025-10-29] - Market Validation and Filtering

### Added
- **Market validation system** - Automatically filters out closed, archived, and past-dated markets
- **`filterValidMarkets()` function** - Checks 5 validation criteria:
  1. `active === true`
  2. `closed === false`
  3. `archived === false`
  4. `endDate >= now` (future date)
  5. `acceptingOrders === true`

### Changed
- **Increased fetch limit** from 100 to 500 markets
- **Fixed category extraction** to use actual tag values instead of hardcoded "Sports"/"Soccer"

### Documentation
- Added `MARKET_VALIDATION.md` - Complete guide to market filtering

---

## [2025-10-29] - Structured Format Implementation

### Added
- **Structured output format** - One row per outcome, perfect for sports betting analysis
- **Columns**: Category, SubCategory1, SubCategory2, Listing, Date, Time, Timezone, Moneyline, Outcome, Price
- **Market type detection**:
  - 3-way markets (soccer with draw)
  - Binary markets (yes/no)
  - Multi-outcome markets

### Features
- **Team name extraction** from questions
- **Timezone conversion** to America/Toronto with DST handling
- **Integer percentage pricing** (0.35 → 35)
- **Category extraction** from first 3 tags

### Menu
- **Structured Format submenu** with 12 categories
- **Original Format submenu** for compact view

### Documentation
- Added `STRUCTURED_FORMAT.md` - Complete format guide

---

## [2025-10-29] - Initial Release

### Features
- Fetch markets from Polymarket Gamma API
- Display in Google Sheets
- Tag-based filtering
- Original format output
- Debug functions

### Documentation
- `README.md` - Main documentation
- `API_REFERENCE.md` - Polymarket API details
- `TROUBLESHOOTING.md` - Debug guide
- `QUICK_START.md` - Fast setup guide

---

**For detailed technical information, see:**
- [TAG_FILTERING_FIX.md](TAG_FILTERING_FIX.md) - Latest fix explanation
- [TESTING_THE_FIX.md](TESTING_THE_FIX.md) - Testing guide
- [README.md](README.md) - Main documentation
