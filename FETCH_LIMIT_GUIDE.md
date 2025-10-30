# Setting Custom Fetch Limits

## Overview

You can now control how many markets to fetch by setting a custom fetch limit. This allows you to:
- **Fetch fewer markets** for faster loading (e.g., 50-100 markets)
- **Fetch more markets** for comprehensive data (e.g., 1000 markets)
- **Save on API calls** by fetching only what you need

## How to Set the Fetch Limit

### Method 1: Via Menu (Recommended)

1. Click **Polymarket** → **⚙️ Set Fetch Limit**
2. Enter the number of markets you want to fetch
3. Click **OK**

The limit is saved in cell **B1** and will be used for all future fetches.

### Method 2: Directly in Cell B1

1. Click on cell **B1** in your spreadsheet
2. Enter a number (e.g., `100`, `250`, `1000`)
3. Press Enter

The script will automatically use this value for all fetches.

## Default Limit

If you don't set a custom limit, the script uses the default: **500 markets**

## Reset to Default

To reset to the default limit:

1. Click **Polymarket** → **🔄 Reset Fetch Limit**
2. Click **Yes** to confirm

This clears cell B1 and reverts to fetching 500 markets.

## Recommendations

| Use Case | Recommended Limit | Why |
|----------|------------------|-----|
| Quick check | 50-100 | Fast loading, recent markets only |
| Regular use | 200-500 | Good balance of speed and coverage |
| Comprehensive | 500-1000 | Maximum data, slower but complete |
| Debugging | 5-10 | Quick testing without waiting |

## API Limits

⚠️ **Important Notes:**

- The Polymarket API may not return more than **1000 results** per request
- If you set a limit above 1000, you'll get a warning
- The script caps the limit at 1000 to avoid API errors
- Free tier: 1,000 API calls per hour

## Examples

### Example 1: Fetch 100 Sports Markets

1. Click **Polymarket** → **⚙️ Set Fetch Limit**
2. Enter `100`
3. Click **OK**
4. Click **Polymarket** → **Structured Format** → **Sports**
5. You'll get up to 100 sports markets

### Example 2: Fetch 1000 All Markets

1. Click **Polymarket** → **⚙️ Set Fetch Limit**
2. Enter `1000`
3. Click **OK** (you may see a warning, click **Yes**)
4. Click **Polymarket** → **Structured Format** → **📊 All Markets**
5. You'll get up to 1000 markets

### Example 3: Quick Debug with 10 Markets

1. Type `10` in cell **B1**
2. Click **Polymarket** → **🔧 Test Market Fetch**
3. Only 10 markets will be fetched for testing

## How It Works

**Behind the scenes:**

1. Every fetch function calls `getFetchLimit()`
2. `getFetchLimit()` checks cell **B1**:
   - If B1 has a valid number → uses that
   - If B1 is empty → uses default (500)
   - If B1 > 1000 → caps at 1000
3. The limit is passed to the API request
4. API returns up to that many markets

**Code example:**
```javascript
const limit = getFetchLimit(); // Gets from B1 or uses 500

const markets = getMarkets({
  tag: tagId,
  closed: false,
  active: true,
  limit: limit  // Uses your custom limit
});
```

## Checking Current Limit

To see what limit is currently set:

1. Look at cell **B1**:
   - If it has a number → that's your current limit
   - If it's empty → using default (500)
2. Click **Polymarket** → **⚙️ Set Fetch Limit** to see current limit in the prompt

## Cell B1 Formatting

When you set a limit via the menu:
- Cell B1 gets **bold** text
- Cell B1 gets **yellow** background (`#ffe599`)
- Cell B1 gets a note explaining what it's for

You can hover over B1 to see the note.

## Troubleshooting

### "No markets found" after setting high limit

- The category may not have that many markets
- Try a lower limit or "All Markets"

### Limit not working (still fetches 500)

- Make sure B1 contains a **number**, not text
- Try using the menu instead of typing in B1
- Refresh your sheet after updating

### Getting fewer markets than limit

This is normal! The limit is a **maximum**, not a guarantee:
- If a category only has 50 markets, you'll get 50 even if limit is 500
- Active + closed filters reduce the pool
- Some markets may be filtered out by validation checks

### Slow performance with high limits

- Fetching 1000 markets takes time
- API response time increases with limit
- Consider using a lower limit for faster results

## Best Practices

1. **Start small**: Try 100-200 first to test
2. **Increase as needed**: Only fetch more if you need comprehensive data
3. **Reset after large fetches**: Use **Reset Fetch Limit** to go back to default
4. **Check logs**: View → Logs shows how many markets were actually fetched
5. **Balance speed vs coverage**: More markets = slower but more complete

## Visual Indicator

Once you set a limit, cell B1 will look like this:

```
┌─────┬────────┐
│  A  │   B    │
├─────┼────────┤
│     │  250   │  ← Yellow background, bold
└─────┴────────┘
```

Hover over it to see: "Fetch limit: 250 markets"

## Integration with Other Features

The fetch limit applies to:

- ✅ **All category fetches** (Sports, Politics, etc.)
- ✅ **Structured Format** menus
- ✅ **Original Format** menus
- ✅ **All Markets** option
- ✅ **Debug functions** (Show All Tags, etc.)
- ✅ **Both formats** (structured and original)

It does NOT apply to:
- ❌ **Show Available Tags** (uses tags endpoint, not markets)
- ❌ **Debug API Response** (always fetches 1 for debugging)

---

**Questions?** Check the logs (View → Logs) to see what limit is being used for each fetch.
