# Structured Format Guide

## Overview

The **Structured Format** transforms Polymarket data into a standardized table format perfect for sports betting analysis, data exports, and database imports.

## Output Format

Each market is "exploded" into multiple rows - one row per outcome.

### Columns

| Column | Description | Example |
|--------|-------------|---------|
| **Category** | Top-level category | Sports |
| **SubCategory1** | First subcategory | Soccer |
| **SubCategory2** | Second subcategory | Copa Libertadores |
| **Listing** | Match/event name | RAC vs FLA |
| **Date** | Event date (YYYY-MM-DD) | 2025-10-29 |
| **Time** | Event time (HH:MM, 24-hour) | 20:30 |
| **Timezone** | Timezone | America/Toronto |
| **Moneyline** | Outcome being bet on | RAC, DRAW, FLA |
| **Outcome** | YES or NO | YES |
| **Price** | Probability (integer %) | 31 |

## Example Output

For a soccer match: Racing vs Flamengo

```tsv
Category	SubCategory1	SubCategory2	Listing	Date	Time	Timezone	Moneyline	Outcome	Price
Sports	Soccer	Copa Libertadores	RAC vs FLA	2025-10-29	20:30	America/Toronto	RAC	YES	31
Sports	Soccer	Copa Libertadores	RAC vs FLA	2025-10-29	20:30	America/Toronto	RAC	NO	72
Sports	Soccer	Copa Libertadores	RAC vs FLA	2025-10-29	20:30	America/Toronto	DRAW	YES	30
Sports	Soccer	Copa Libertadores	RAC vs FLA	2025-10-29	20:30	America/Toronto	DRAW	NO	72
Sports	Soccer	Copa Libertadores	RAC vs FLA	2025-10-29	20:30	America/Toronto	FLA	YES	45
Sports	Soccer	Copa Libertadores	RAC vs FLA	2025-10-29	20:30	America/Toronto	FLA	NO	60
```

## How It Works

### 1. Market Type Detection

The script automatically detects the market type:

#### **3-Way Markets (Soccer with Draw)**
- Outcomes: Team1, Draw, Team2
- Creates: 6 rows (each outcome has YES/NO)
- Example: RAC, DRAW, FLA

#### **Binary Markets**
- Outcomes: Yes, No
- Creates: 2 rows
- Example: Will Bitcoin reach $100k?

#### **Multi-Outcome Markets**
- Outcomes: Multiple options
- Creates: 2 rows per outcome (YES/NO)
- Example: Tournament winner with 8 teams = 16 rows

### 2. Team Name Extraction

The script extracts team names from market questions:

```
"Will Racing beat Flamengo?" → "Racing vs Flamengo"
"RAC vs FLA" → "RAC vs FLA"
"Flamengo to beat Racing" → "Flamengo vs Racing"
```

**Supported patterns:**
- `Team1 vs Team2`
- `Team1 vs. Team2`
- `Team1 to beat Team2`
- 3-letter abbreviations: `RAC vs FLA`

### 3. Category Extraction

Categories are extracted from Polymarket tags:

```javascript
Tags: ["Sports", "Soccer", "Copa Libertadores"]
→ Category: Sports
→ SubCategory1: Soccer
→ SubCategory2: Copa Libertadores
```

### 4. Timezone Conversion

All dates/times are converted to **America/Toronto** timezone.

The script automatically adjusts for:
- UTC to Toronto conversion
- Daylight Saving Time (DST)
- March-November: UTC-4 (EDT)
- November-March: UTC-5 (EST)

### 5. Price Calculation

Prices are calculated as integer percentages:

```
API returns: 0.31 (31% probability)
Displayed as: 31

NO price = 100 - YES price
If RAC YES = 31, then RAC NO = 69
```

## Usage

### Step 1: Update Your Script
1. Copy the latest `PolymarketScraper.gs` code
2. Paste into your Apps Script editor
3. Save and refresh your Google Sheet

### Step 2: Use the Menu
1. Click **Polymarket** menu
2. Select **Structured Format (Recommended)**
3. Choose:
   - **📊 Copa Libertadores (Structured)** - For Copa Libertadores only
   - **📊 All Markets (Structured)** - For all active markets

### Step 3: View Results
Data appears in the structured format with proper columns.

## Functions

### Main Functions

```javascript
// Fetch Copa Libertadores in structured format
fetchCopaLibertadoresStructured()

// Fetch all markets in structured format
fetchMarketsStructured()

// Display any markets in structured format
displayMarketsStructured(sheet, markets)
```

### Helper Functions

```javascript
// Extract team names from question
extractMatchListing("RAC vs FLA")
// Returns: "RAC vs FLA"

// Create rows for a market
createMarketRows(category, subCat1, subCat2, listing, date, time, tz, outcomes, prices, question)
// Returns: Array of rows

// Convert to timezone
convertToTimezone(date, 'America/Toronto')
// Returns: Date object in Toronto time

// Format date
formatDate(date) // Returns: "2025-10-29"

// Format time
formatTime(date) // Returns: "20:30"
```

## Advanced Customization

### Change Timezone

Edit the `displayMarketsStructured` function:

```javascript
let timezone = 'America/New_York'; // Change this line
```

Update the `convertToTimezone` function to support your timezone.

### Modify Team Name Extraction

Edit the `extractMatchListing` function to add custom patterns:

```javascript
// Add new pattern
const customMatch = question.match(/YourPattern/);
if (customMatch) {
  return formatTeamNames(customMatch);
}
```

### Change Category Logic

Edit the category extraction in `displayMarketsStructured`:

```javascript
// Custom category mapping
if (tagLower.includes('your-sport')) {
  subCategory1 = 'Your Sport';
}
```

## Filtering Markets

### By Tag

1. Get tag ID from "Show Available Tags"
2. Put tag ID in cell A1
3. Run "All Markets (Structured)"

### By Keyword

Modify `fetchCopaLibertadoresStructured` to search for your keyword:

```javascript
return question.includes('your keyword') ||
       description.includes('your keyword');
```

## Export Options

### Export to CSV/TSV

1. File → Download → Comma-separated values (.csv)
2. Or: Tab-separated values (.tsv)

### Copy to Another Sheet

```javascript
function copyToSheet() {
  const source = SpreadsheetApp.getActiveSheet();
  const target = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Export');

  const data = source.getDataRange().getValues();
  target.getRange(1, 1, data.length, data[0].length).setValues(data);
}
```

## Use Cases

### 1. Sports Betting Analysis
- Track odds changes over time
- Compare prices across outcomes
- Identify arbitrage opportunities

### 2. Data Export
- Export to CSV for analysis in Excel/R/Python
- Import into databases
- Feed into BI tools

### 3. Tournament Tracking
- Monitor all Copa Libertadores matches
- Track team performance predictions
- Historical data collection

### 4. Automated Reports
- Combine with Google Sheets formulas
- Create pivot tables
- Build dashboards

## Tips

1. **Refresh Regularly**: Odds change frequently
   - Set up auto-refresh (see main README)
   - Or manually refresh before analysis

2. **Filter Smart**: Use specific tags/keywords
   - Reduces API calls
   - Faster processing
   - More relevant data

3. **Track History**: Create dated sheets
   ```
   Sheet: "Copa_2025-10-29_Morning"
   Sheet: "Copa_2025-10-29_Evening"
   ```

4. **Use Formulas**: Enhance the data
   ```
   =IF(I2="YES", J2, 100-J2) // Calculate true probability
   =J2/100 // Convert to decimal odds
   ```

5. **Pivot Tables**: Analyze patterns
   - Group by Listing (match)
   - Sum by Moneyline
   - Track price changes

## Comparison: Structured vs Original Format

### Structured Format
**Pros:**
- ✅ One row per outcome
- ✅ Easy to filter/analyze
- ✅ Database-friendly
- ✅ Consistent structure
- ✅ Sports betting standard

**Best for:**
- Data analysis
- Exports to other systems
- Sports betting workflows
- Multi-market comparison

### Original Format
**Pros:**
- ✅ One row per market
- ✅ Compact view
- ✅ See all outcomes at once
- ✅ Better for browsing

**Best for:**
- Quick overview
- Market discovery
- General exploration

## Troubleshooting

### Wrong timezone
→ Check `convertToTimezone()` function
→ Verify DST logic for your dates

### Team names not extracted
→ Check `extractMatchListing()` function
→ Add custom pattern for your market format

### Wrong categories
→ Run "Show Available Tags" to see actual tag names
→ Update category extraction logic

### Missing data
→ Check if markets have the required fields
→ Run debug function to see raw data

## Example Queries

### Find high-value bets
```
=FILTER(A:J, J:J>60, I:I="YES")
```

### Sum prices by match
```
=SUMIF(D:D, "RAC vs FLA", J:J)
```

### Count markets by category
```
=COUNTIF(C:C, "Copa Libertadores")
```

## Future Enhancements

Potential additions:
- [ ] More timezone support
- [ ] Custom team name mappings
- [ ] Historical price tracking
- [ ] Alert notifications
- [ ] Auto-categorization learning

---

**Need help?** Check the main README.md or TROUBLESHOOTING.md

**Want to customize?** All functions are well-commented in the code
