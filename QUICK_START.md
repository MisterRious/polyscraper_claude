# Quick Start Guide

## 5-Minute Setup

### 1. Open Google Sheets
Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet.

### 2. Open Apps Script
Click: **Extensions** → **Apps Script**

### 3. Copy the Code
1. Open the file `PolymarketScraper.gs` in this repository
2. Copy all the code
3. Paste it into the Apps Script editor (replace any existing code)
4. Click **Save**

### 4. Authorize
1. Click **Run** → **onOpen**
2. Click **Review Permissions** when prompted
3. Choose your Google account
4. Click **Advanced** → **Go to [Project Name] (unsafe)**
5. Click **Allow**

### 5. Use It!
1. Close Apps Script tab
2. Refresh your Google Sheet
3. Click **Polymarket** menu → **Structured Format** → Choose a category (e.g., **Sports**)

Done! Your data will appear in the sheet in structured format.

---

## Common Commands

### Fetch Markets by Category (Structured Format)
```
Menu: Polymarket → Structured Format (Recommended) → [Choose Category]

Available Categories:
- All Markets
- Politics
- Sports
- Finance
- Crypto
- Geopolitics
- Earnings
- Tech
- Culture
- World
- Economy
- Elections
- Mentions
```

### Fetch All Active Markets
```
Menu: Polymarket → Structured Format → All Markets
```

### See Available Categories
```
Menu: Polymarket → Show Available Tags
```

---

## What You'll See

| Column | Example |
|--------|---------|
| **Question** | "Will Flamengo win the Copa Libertadores?" |
| **Outcomes** | "Yes, No" |
| **Current Prices** | "35.5%, 64.5%" |
| **Volume** | "$125,430.00" |
| **End Date** | "2025-11-29" |

---

## Need Help?

- Check `README.md` for full documentation
- View logs: In Apps Script, go to **View** → **Logs**
- Test API manually: Visit `https://gamma-api.polymarket.com/markets`

---

## Pro Tips

1. **Use Specific Tags**: Instead of fetching all markets, use tag IDs for faster results
2. **Set Up Auto-Refresh**: Run `setupAutoRefresh()` to update data automatically
3. **Filter by Keyword**: Edit `fetchMarketsByKeyword()` to search for specific terms
4. **Track Changes**: Create multiple sheets to see how odds change over time

---

## Troubleshooting

**"No markets found"**
→ Try "Fetch Copa Libertadores" instead (uses keyword search)

**"Error fetching data"**
→ Check internet connection and verify API is up

**Authorization issues**
→ Repeat step 4 above

**Data not updating**
→ Click Polymarket → Refresh Data manually

---

## Example: Finding Tag IDs

1. Click: **Polymarket → Show Available Tags**
2. A new "Tags" sheet will open
3. Find your category (e.g., "Soccer")
4. Note the Tag ID
5. Put Tag ID in cell A1
6. Click: **Polymarket → Fetch Markets**

That's it! Enjoy tracking your markets.
