# Troubleshooting Guide

## Issue: Headers appear but no data

This is the most common issue. Here's how to fix it:

### Step 1: Run the Debug Function

1. In your Google Sheet, click **Polymarket** menu → **🔍 Debug API Response**
2. This will show you a popup with info about the first market
3. In Apps Script editor, go to **View** → **Logs** to see detailed output

### Step 2: Run the Test Function

1. Click **Polymarket** menu → **🔧 Test Market Fetch**
2. This will show a popup with summary info about what was fetched

### Step 3: Check the Logs

In the Apps Script editor:
1. Click **Extensions** → **Apps Script**
2. Click **View** → **Logs** (or press Ctrl/Cmd + Enter)
3. Look for:
   - "Received X markets" - should show a number > 0
   - Any error messages
   - The sample market data

### Common Causes & Fixes

#### 1. API Access Issue
**Symptom**: Error message about network or access denied
**Fix**: The API might be blocking requests. Try:
- Wait a few minutes and try again
- Check if you're behind a firewall
- Verify the API is up: https://gamma-api.polymarket.com/markets?limit=1

#### 2. Stringified JSON Not Parsed
**Symptom**: Prices show as `["0.5","0.5"]` instead of `50%, 50%`
**Fix**: The updated script now handles this automatically

#### 3. No Active Markets Match Filter
**Symptom**: "No markets found" message
**Fix**:
- Remove filters - just click **Fetch Markets** without entering a tag ID
- Try "Fetch Copa Libertadores" which searches by keyword
- Use the Tag ID from the "Show Available Tags" function

#### 4. Wrong Field Names
**Symptom**: All columns are empty except headers
**Fix**: The updated script uses the correct field names from the API

### Manual Debug Steps

If the debug functions don't help, try this:

1. **Check raw API response**:
   ```javascript
   function manualTest() {
     const url = 'https://gamma-api.polymarket.com/markets?limit=2&active=true';
     const response = UrlFetchApp.fetch(url);
     Logger.log(response.getContentText());
   }
   ```
   Run this and check View → Logs

2. **Verify data structure**:
   ```javascript
   function checkStructure() {
     const markets = getMarkets({active: true, limit: 1});
     Logger.log('Type: ' + typeof markets);
     Logger.log('Is Array: ' + Array.isArray(markets));
     Logger.log('Length: ' + (markets ? markets.length : 'null'));
     if (markets && markets.length > 0) {
       Logger.log('Keys: ' + Object.keys(markets[0]));
     }
   }
   ```

### Understanding the Logs

When you run the debug function, you should see output like this:

```
Fetching: https://gamma-api.polymarket.com/markets?limit=1&active=true
Parsed data type: object
Is array: true
Number of markets: 1
First market keys: id, question, slug, description, outcomePrices, ...
Question: Will Bitcoin reach $100k in 2025?
outcomePrices type: string
outcomePrices value: ["0.35","0.65"]
Volume: 125430.50
```

**Good signs:**
- "Is array: true"
- "Number of markets: 1" (or higher)
- "Question" shows actual text
- "outcomePrices" has values

**Bad signs:**
- "Is array: false"
- "Number of markets: 0"
- Errors about parsing or network

### Still Not Working?

1. **Check your Apps Script version**:
   - The script uses modern JavaScript (const, arrow functions)
   - Make sure your Apps Script runtime is V8 (check in Project Settings)

2. **Simplify the request**:
   Try the absolute simplest request:
   ```javascript
   function simpleTest() {
     const markets = getMarkets({limit: 10});
     Logger.log('Got ' + markets.length + ' markets');
     displayMarkets(SpreadsheetApp.getActiveSheet(), markets);
   }
   ```

3. **Check for script errors**:
   - In Apps Script editor, click **Run** → **debugMarketResponse**
   - Look for any syntax errors highlighted in red

4. **Verify permissions**:
   - Make sure you've authorized the script
   - Try re-running the authorization (Run → onOpen)

### Get More Help

If you're still stuck, collect this info:

1. Run `debugMarketResponse()` and copy the logs
2. Note any error messages
3. Check what happens when you visit this URL in your browser:
   https://gamma-api.polymarket.com/markets?limit=1&active=true

The API should return JSON data. If you see "Access denied" or an error, the API might be blocking your access.

### Alternative: Use Events Endpoint

If the markets endpoint isn't working, try events:

```javascript
function fetchEvents() {
  const url = 'https://gamma-api.polymarket.com/events?active=true&limit=10';
  const response = UrlFetchApp.fetch(url);
  const events = JSON.parse(response.getContentText());
  Logger.log(JSON.stringify(events, null, 2));
}
```

Events group related markets together and might have different access requirements.

## Other Common Issues

### Issue: "Script timeout" error
**Cause**: Fetching too many markets at once
**Fix**: Reduce the `limit` parameter to 50 or less

### Issue: Dates showing as numbers
**Cause**: Google Sheets date formatting
**Fix**: Select the date columns → Format → Number → Date time

### Issue: Tags not showing
**Cause**: Tags might not be included in the response
**Fix**: This is normal - not all markets have tags

### Issue: Prices sum to more than 100%
**Cause**: This is normal in prediction markets (bid-ask spread)
**Fix**: No fix needed - this reflects the market spread

### Issue: Volume/Liquidity showing as 0
**Cause**: New markets with little activity
**Fix**: This is correct - these markets just don't have much volume yet

## Contact

If you've tried everything and it still doesn't work:
1. Check Polymarket's official documentation: https://docs.polymarket.com
2. Verify the API is operational
3. Check if your network/organization blocks API requests
4. Try from a different network or computer

## Update Log

- **2025-10-29**: Added debug functions and improved error handling
- **2025-10-29**: Fixed stringified JSON parsing for outcomePrices
- **2025-10-29**: Added comprehensive logging
- **2025-10-29**: Updated field names to match actual API response
