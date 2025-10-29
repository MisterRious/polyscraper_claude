# Market Validation & Filtering

## Overview

The script now automatically filters out closed, resolved, and past-dated markets to ensure you only see **active, valid, and tradeable** markets.

## What Gets Filtered Out

### ❌ Excluded Markets

The script automatically removes markets that meet any of these criteria:

1. **Inactive Markets** - `active === false`
   - Markets that are no longer active

2. **Closed Markets** - `closed === true`
   - Markets that have been closed for trading

3. **Archived Markets** - `archived === true`
   - Markets that have been archived by Polymarket

4. **Past-Dated Markets** - `endDate < now`
   - Markets with end dates in the past
   - Example: 2024-06-17 market when current date is 2025-10-29

5. **Not Accepting Orders** - `acceptingOrders === false`
   - Markets that are not currently accepting new orders

### ✅ Included Markets

Only markets that pass ALL these checks:
- ✅ `active === true` (or undefined)
- ✅ `closed === false` (or undefined)
- ✅ `archived === false` (or undefined)
- ✅ `endDate >= now` (future date)
- ✅ `acceptingOrders === true` (or undefined)

## How It Works

### Automatic Filtering

Every time you fetch markets, the script:

1. **Fetches** markets from Polymarket API (up to 500)
2. **Filters** using `filterValidMarkets()` function
3. **Logs** each filtered market with the reason
4. **Displays** only valid markets in your sheet
5. **Reports** how many were filtered out

### Example

```
Initial fetch: 500 markets
After filtering: 387 valid markets
Filtered out: 113 closed/invalid markets
```

You'll see this information in:
- The alert popup
- The summary row at top of sheet
- The Apps Script logs (View → Logs)

## Viewing Filter Results

### In the Sheet

At the top of your data, you'll see a summary row:

```
Last updated: 2025-10-29 15:30:45 | 387 rows from 387 valid markets (filtered from 500 total)
```

This tells you:
- When data was last updated
- How many rows were generated
- How many markets passed validation
- How many were filtered out

### In the Alert

When the script completes, you'll see:

```
Successfully formatted 2,322 rows from 387 valid markets!

Filtered out 113 closed/invalid markets.
```

### In the Logs

To see detailed filtering reasons:

1. Go to **Extensions** → **Apps Script**
2. Click **View** → **Logs**
3. Look for entries like:

```
Filtered out (closed): Will Bitcoin reach $100k by Dec 2024?
Filtered out (past date 2024-06-17T00:00:00Z): Copa Libertadores Final
Filtered out (inactive): Old market example
```

## Benefits

### 🎯 Accurate Data
- Only see markets you can actually trade on
- No confusion from old, resolved markets
- Data reflects current market conditions

### ⚡ Better Performance
- Fewer rows to process
- Faster spreadsheet rendering
- More focused data set

### 📊 Cleaner Analysis
- No skewing from closed markets
- Better for trend analysis
- Easier to spot opportunities

### 🔄 Real-Time Ready
- Perfect for auto-refresh setups
- Data stays current automatically
- No manual cleanup needed

## Examples

### Before Filtering
```
500 markets fetched
├─ 387 active, valid markets ✅
├─ 45 closed markets ❌
├─ 38 past-dated markets ❌
├─ 20 archived markets ❌
└─ 10 not accepting orders ❌
```

### After Filtering
```
387 valid markets displayed ✅
All closed/invalid markets removed
```

## Use Cases

### Sports Betting
Only see upcoming matches, not past games
- ✅ Tomorrow's Copa Libertadores match
- ❌ Last week's resolved match

### Political Markets
Only see current election markets
- ✅ 2025 election predictions
- ❌ 2024 resolved elections

### Crypto Markets
Only see active price predictions
- ✅ Bitcoin $100k by 2026?
- ❌ Bitcoin $100k by 2024? (already resolved)

## Technical Details

### Filter Function

```javascript
function filterValidMarkets(markets) {
  const now = new Date();

  return markets.filter(market => {
    // Check 1: Active
    if (market.active === false) return false;

    // Check 2: Not closed
    if (market.closed === true) return false;

    // Check 3: Not archived
    if (market.archived === true) return false;

    // Check 4: Future date
    if (market.endDate < now) return false;

    // Check 5: Accepting orders
    if (market.acceptingOrders === false) return false;

    return true; // Passed all checks
  });
}
```

### Applied To

- `displayMarketsStructured()` - Structured format
- `displayMarkets()` - Original format
- Both formats automatically filter

### Error Handling

If any check fails due to error:
- Market is excluded (safe default)
- Error is logged
- Other markets continue processing

## Troubleshooting

### Issue: Too many markets filtered out

**Possible causes:**
- API returning many closed markets
- Date range includes past events
- Markets in your category are mostly resolved

**Solutions:**
- Try different tag/category
- Check if you're fetching old markets
- Review logs to see why markets were filtered

### Issue: Expected market not showing

**Check:**
1. Is the market closed? (Check on Polymarket.com)
2. Has the end date passed?
3. Is it archived?
4. Check logs for filtering reason

**Debug:**
```javascript
// Run test function to see raw data
testMarketFetch()
// Check logs to see all fields
```

### Issue: Want to see filtered markets

To temporarily disable filtering:

1. Open Apps Script
2. Comment out the filtering line:
```javascript
// const validMarkets = filterValidMarkets(markets);
const validMarkets = markets; // Show all markets
```
3. Save and run

**Not recommended for production use!**

## Customization

### Add Custom Filters

Edit the `filterValidMarkets()` function:

```javascript
// Example: Only markets with > $10k volume
if (market.volume < 10000) {
  Logger.log(`Filtered out (low volume): ${market.question}`);
  return false;
}

// Example: Only sports markets
if (!market.tags.some(t => t.label === 'Sports')) {
  return false;
}

// Example: Only next 7 days
const sevenDaysFromNow = new Date(now.getTime() + 7*24*60*60*1000);
if (market.endDate > sevenDaysFromNow) {
  return false;
}
```

### Adjust Date Range

To include markets ending within X hours:

```javascript
// Allow markets ending in next 2 hours (for live events)
const cutoffTime = new Date(now.getTime() - 2*60*60*1000);
if (endDate < cutoffTime) return false;
```

### Disable Specific Checks

Comment out checks you don't want:

```javascript
// Don't filter archived markets
// if (market.archived === true) return false;
```

## Best Practices

1. **Keep filtering enabled** - Ensures data quality
2. **Check logs periodically** - Understand what's being filtered
3. **Monitor filter counts** - Large counts may indicate issues
4. **Review summary row** - Quick validation check
5. **Use appropriate fetch limits** - More markets = more likely to filter some out

## API Considerations

The filtering happens **after** fetching from API:
- API still returns all markets (up to limit)
- Filtering happens client-side in script
- You're charged API calls for all fetched markets (even filtered ones)

To optimize:
- Use API filters when possible (active=true, closed=false)
- Then apply additional client-side filtering
- This reduces unnecessary API calls

## Future Enhancements

Potential additions:
- [ ] Configurable filter settings in sheet
- [ ] Filter by minimum volume/liquidity
- [ ] Filter by date range (next 7 days, etc.)
- [ ] Filter by probability range
- [ ] Save filtered markets to separate sheet
- [ ] Weekly digest of filtered markets

---

**Bottom line:** The script now automatically ensures you only see valid, active, tradeable markets. No more old or closed entries!
