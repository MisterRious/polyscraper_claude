# Polymarket Google Sheets Scraper

A Google Apps Script to fetch and display Polymarket prediction market data directly in Google Sheets. Perfect for tracking Copa Libertadores matches, soccer markets, or any other Polymarket predictions.

## Features

- 📊 **Two output formats**: Structured (recommended) and Original
- 🎯 **Structured Format**: One row per outcome, perfect for sports betting analysis
- ⚽ Filter by tags (Sports, Soccer, Copa Libertadores, etc.)
- 🔄 Automatic data refresh
- 📅 Track odds, volume, liquidity, and dates
- 🎨 Clean, formatted spreadsheet output
- 🔍 Keyword search functionality
- 🌍 Timezone conversion (America/Toronto)
- 📈 Integer percentage pricing

## Installation

### Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it something like "Polymarket Copa Libertadores Tracker"

### Step 2: Add the Script

1. In your Google Sheet, click **Extensions** → **Apps Script**
2. Delete any default code in the editor
3. Copy the entire contents of `PolymarketScraper.gs` and paste it into the Apps Script editor
4. Click **Save** (disk icon) and name your project (e.g., "Polymarket Scraper")

### Step 3: First Run

1. Click **Run** → **onOpen** to set up the custom menu
2. You'll be prompted to authorize the script - click **Review Permissions**
3. Choose your Google account
4. Click **Advanced** → **Go to [Your Project Name] (unsafe)**
5. Click **Allow**

### Step 4: Refresh Your Sheet

1. Close the Apps Script tab
2. Refresh your Google Sheet
3. You should now see a **"Polymarket"** menu in the menu bar

## Usage

### Quick Start: Fetch Copa Libertadores Data (Structured Format)

1. Click **Polymarket** menu → **Structured Format (Recommended)** → **📊 Copa Libertadores (Structured)**
2. The script will fetch all markets related to Copa Libertadores
3. Data will be displayed in structured format (one row per outcome)

**Example output:**
```
Category | SubCategory1 | SubCategory2      | Listing     | Date       | Time  | Moneyline | Outcome | Price
Sports   | Soccer       | Copa Libertadores | RAC vs FLA  | 2025-10-29 | 20:30 | RAC       | YES     | 31
Sports   | Soccer       | Copa Libertadores | RAC vs FLA  | 2025-10-29 | 20:30 | RAC       | NO      | 72
Sports   | Soccer       | Copa Libertadores | RAC vs FLA  | 2025-10-29 | 20:30 | DRAW      | YES     | 30
...
```

**See [STRUCTURED_FORMAT.md](STRUCTURED_FORMAT.md) for complete documentation.**

### Fetch Markets by Tag

If you know the specific tag ID for a category:

1. In cell **A1**, enter the tag ID (e.g., for sports/soccer)
2. Click **Polymarket** menu → **Fetch Markets**

### Discover Available Tags

1. Click **Polymarket** menu → **Show Available Tags**
2. A new sheet called "Tags" will be created with all available categories
3. Find the tag ID for your desired category (e.g., Soccer, Copa Libertadores)
4. Use that tag ID in cell A1 when fetching markets

### Custom Keyword Search

To search for specific markets by keyword:

1. Open Apps Script (Extensions → Apps Script)
2. Find the function `fetchMarketsByKeyword`
3. Run it from the script editor with your keyword, or modify the code to add it to the menu

### Automatic Refresh

To set up automatic data refresh:

1. Open Apps Script
2. Run the function `setupAutoRefresh` from the script editor
3. Specify refresh interval (default: 1 hour)

## Output Formats

The script supports two output formats:

### 🎯 Structured Format (Recommended for Sports)

**Best for:** Sports betting, data analysis, exports to other systems

One row per outcome with these columns:

| Column | Description | Example |
|--------|-------------|---------|
| Category | Top-level category | Sports |
| SubCategory1 | First subcategory | Soccer |
| SubCategory2 | Second subcategory | Copa Libertadores |
| Listing | Match name | RAC vs FLA |
| Date | Event date (YYYY-MM-DD) | 2025-10-29 |
| Time | Event time (HH:MM) | 20:30 |
| Timezone | Timezone | America/Toronto |
| Moneyline | Outcome being bet on | RAC, DRAW, FLA |
| Outcome | YES or NO | YES |
| Price | Probability (%) | 31 |

**Features:**
- Automatically extracts team names
- Converts to Toronto timezone
- Creates multiple rows per market (one per outcome)
- Perfect for CSV export and database import

**See:** [STRUCTURED_FORMAT.md](STRUCTURED_FORMAT.md) for complete guide

### 📋 Original Format (Compact View)

**Best for:** Quick overview, browsing markets

The original format creates a table with the following columns:

| Column | Description |
|--------|-------------|
| **Question** | The market question/title |
| **Description** | Detailed description of the market |
| **Market Slug** | URL-friendly identifier |
| **Outcomes** | Possible outcomes (e.g., Yes/No, Team A/Team B) |
| **Current Prices** | Current probability/odds for each outcome |
| **Volume (USD)** | Total trading volume |
| **Liquidity (USD)** | Available liquidity in the market |
| **Start Date** | When the market opened |
| **End Date** | When the market closes/event occurs |
| **Status** | Active, Closed, Archived, or Inactive |
| **Tags** | Categories/tags for the market |
| **Market ID** | Unique market identifier |
| **Condition ID** | Blockchain condition identifier |

## Example: Copa Libertadores

Here's what the output might look like for Copa Libertadores matches:

```
Question: Will Flamengo win the Copa Libertadores 2025?
Outcomes: Yes, No
Current Prices: 35.5%, 64.5%
Volume: $125,430.00
End Date: 2025-11-29
Status: Active
Tags: Sports, Soccer, Copa Libertadores
```

## Finding Tag IDs

Polymarket uses tag IDs to categorize markets. To find the right tag ID:

### Method 1: Use the Script
1. Click **Polymarket** menu → **Show Available Tags**
2. Look for tags like "Soccer", "Sports", "Copa Libertadores"
3. Note the Tag ID

### Method 2: Manual API Call
1. Visit: `https://gamma-api.polymarket.com/tags`
2. Search for relevant tags in the JSON response
3. Note the tag ID

### Method 3: Check Polymarket URL
1. Go to Polymarket website: `https://polymarket.com`
2. Navigate to Sports → Soccer → Copa Libertadores
3. Check the URL or page source for tag IDs

## Common Tag IDs

*Note: These may change. Use the "Show Available Tags" function to get current IDs.*

- Sports: *TBD - use Show Available Tags*
- Soccer/Football: *TBD*
- Copa Libertadores: *TBD*

## Advanced Usage

### Custom Filters

You can modify the `getMarkets()` function parameters:

```javascript
const markets = getMarkets({
  tag: 'YOUR_TAG_ID',      // Filter by tag
  closed: false,            // Only active markets
  active: true,             // Must be active
  limit: 100,              // Number of results
  offset: 0                // For pagination
});
```

### Fetch Specific Market

To get details for a specific market:

```javascript
function myCustomFunction() {
  const marketId = 'YOUR_MARKET_ID';
  const market = getMarketById(marketId);
  Logger.log(market);
}
```

### Export to CSV

Run the `exportToCSV()` function to save the current data as a CSV file in your Google Drive.

## API Reference

This script uses the Polymarket Gamma Markets API:

- **Base URL**: `https://gamma-api.polymarket.com`
- **Markets Endpoint**: `/markets`
- **Tags Endpoint**: `/tags`
- **Documentation**: [docs.polymarket.com](https://docs.polymarket.com)

### Rate Limits

Polymarket's free API tier allows:
- Up to 1,000 calls per hour for non-trading queries
- No authentication required for public market data

## Troubleshooting

### "No markets found"
- Check your tag ID is correct
- Try fetching without filters first
- Use "Fetch Copa Libertadores" which searches by keyword

### "Error fetching data"
- Check your internet connection
- Verify the API is accessible: `https://gamma-api.polymarket.com/markets`
- Check Apps Script logs: View → Logs

### Authorization errors
- Re-run the authorization process (Step 3 in Installation)
- Make sure you've allowed all required permissions

### Data not updating
- Click Polymarket → Refresh Data
- Check if auto-refresh trigger is set up
- Verify the script hasn't hit rate limits

## Customization

### Change Output Columns

Edit the `headers` array in the `displayMarkets()` function:

```javascript
const headers = [
  'Question',
  'Outcomes',
  'Current Prices',
  // Add or remove columns as needed
];
```

### Modify Filtering Logic

Edit the filter in `fetchCopaLibertadores()` or create your own function:

```javascript
function fetchMyCustomMarkets() {
  const markets = getMarkets({ /* your filters */ });
  const filtered = markets.filter(market => {
    // Your custom logic
    return true; // or false
  });
  displayMarkets(sheet, filtered);
}
```

### Add to Menu

Add your custom function to the menu in `onOpen()`:

```javascript
ui.createMenu('Polymarket')
  .addItem('My Custom Function', 'fetchMyCustomMarkets')
  .addToUi();
```

## Sample Spreadsheet Structure

```
Row 1: Last updated: 2025-10-29 15:30:45
Row 2: [Empty]
Row 3: [Headers - Bold, Blue Background]
Row 4+: [Market Data]
```

## Tips

1. **Refresh Regularly**: Market odds change frequently. Set up auto-refresh or refresh manually before important decisions.

2. **Filter Wisely**: Use specific tags instead of fetching all markets to reduce API calls and improve performance.

3. **Track Over Time**: Create multiple sheets with timestamps to track how odds change over time.

4. **Combine Data**: Use Google Sheets formulas to analyze trends, calculate arbitrage opportunities, etc.

5. **Mobile Access**: Access your sheet from Google Sheets mobile app for on-the-go tracking.

## Example Use Cases

- 📊 Track Copa Libertadores match odds
- ⚽ Monitor soccer tournament predictions
- 📈 Analyze market trends and volume
- 🔔 Set up conditional formatting for odds changes
- 📱 Create a mobile dashboard for live events
- 🤖 Build automated trading strategies (advanced)

## Contributing

Found a bug or want to add a feature? Feel free to modify the script and share improvements!

## Disclaimer

This script is for educational and informational purposes only. It simply fetches publicly available data from Polymarket's API. Always verify information directly on Polymarket's website before making any decisions.

Polymarket is a prediction market platform. Trading on prediction markets involves risk. This script does not execute trades, provide financial advice, or guarantee accuracy of data.

## Resources

- [Polymarket Website](https://polymarket.com)
- [Polymarket Documentation](https://docs.polymarket.com)
- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Polymarket Gamma API](https://gamma-api.polymarket.com)

## License

Free to use and modify for personal and educational purposes.

---

**Last Updated**: October 2025

For questions or issues, please refer to the Polymarket documentation or Google Apps Script community forums.
