/**
 * Polymarket Data Scraper for Google Sheets
 *
 * This script fetches market data from Polymarket's Gamma API
 * and structures it in a Google Sheets spreadsheet.
 *
 * Features:
 * - Fetch markets by tags (e.g., Soccer, Copa Libertadores)
 * - Filter active/closed markets
 * - Automatic data refresh
 * - Clean, structured output
 */

// ============================================
// CONFIGURATION
// ============================================

// Polymarket API base URL
const POLYMARKET_API_BASE = 'https://gamma-api.polymarket.com';

// Default fetch limit
const DEFAULT_FETCH_LIMIT = 500;

// Settings sheet name and configuration
const SETTINGS_SHEET_NAME = 'Settings';
const SETTINGS_ROW_MIN_ENTRIES = 2; // Row number for minimum entries
const SETTINGS_ROW_MAX_ENTRIES = 3; // Row number for maximum entries

// Category keywords for filtering when tags are not available
// Using more specific patterns to avoid false positives
const CATEGORY_KEYWORDS = {
  'Sports': [
    'Super Bowl', 'World Series', 'World Cup', 'Stanley Cup', 'NBA Finals', 'NBA Championship',
    'NFL playoff', 'NFL champion', 'MLB playoff', 'NHL playoff', 'UFC champion',
    'Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Champions League',
    'Olympics', 'Olympic', 'Formula 1', 'F1 champion', 'Grand Prix',
    'touchdown', 'home run', 'goal scored', 'hat trick',
    'quarterback', 'pitcher', 'striker', 'forward', 'goalkeeper',
    'MVP award', 'Rookie of the Year', 'Cy Young',
    'tennis', 'Wimbledon', 'US Open', 'French Open', 'Australian Open',
    'boxing', 'heavyweight', 'UFC fight', 'knockout',
    'soccer match', 'football match', 'basketball game', 'baseball game', 'hockey game',
    'team to win', 'make the playoffs', 'win the division', 'win championship',
    'Arsenal', 'Liverpool', 'Manchester', 'Barcelona', 'Real Madrid', 'Bayern',
    'Lakers', 'Celtics', 'Warriors', 'Heat', 'Bulls', 'Yankees', 'Red Sox', 'Dodgers',
    'Patriots', 'Chiefs', 'Cowboys', '49ers', 'Eagles'
  ],
  // Exclusion keywords that indicate non-sports markets
  'Sports_Exclude': [
    'inflation', 'depeg', 'CEO', 'Coinbase', 'Bitcoin', 'Ethereum', 'crypto',
    'Ukraine', 'Russia', 'NATO', 'troops', 'military', 'war',
    'vaccine', 'RFK', 'health', 'FDA', 'medicine',
    'stock price', 'market cap', 'earnings', 'revenue', 'competitor raise',
    'stalker', 'guilty', 'lawsuit', 'trial', 'plea'
  ],
  'Politics': ['election', 'vote', 'president', 'senate', 'congress', 'governor', 'political', 'party', 'democrat', 'republican', 'campaign', 'ballot', 'poll'],
  'Finance': ['stock', 'market', 'price', 'trading', 'investment', 'S&P', 'Dow', 'NASDAQ', 'bond', 'interest rate', 'Fed', 'GDP', 'inflation'],
  'Crypto': ['Bitcoin', 'BTC', 'Ethereum', 'ETH', 'crypto', 'blockchain', 'NFT', 'DeFi', 'token', 'coin', 'Solana', 'Cardano'],
  'Geopolitics': ['war', 'conflict', 'treaty', 'sanctions', 'military', 'invasion', 'China', 'Russia', 'NATO', 'UN', 'international'],
  'Earnings': ['earnings', 'revenue', 'profit', 'EPS', 'quarterly', 'fiscal', 'Q1', 'Q2', 'Q3', 'Q4'],
  'Tech': ['Apple', 'Google', 'Microsoft', 'Amazon', 'Meta', 'Tesla', 'AI', 'software', 'hardware', 'launch', 'release'],
  'Culture': ['movie', 'film', 'Oscar', 'Emmy', 'Grammy', 'music', 'album', 'celebrity', 'award', 'box office'],
  'World': ['country', 'global', 'world', 'international', 'nation'],
  'Economy': ['recession', 'unemployment', 'jobs', 'economic', 'GDP', 'growth', 'inflation', 'CPI'],
  'Elections': ['election', '2024', '2025', 'primary', 'nominee', 'candidate', 'electoral'],
  'Mentions': ['mention', 'tweet', 'social media', 'trending', 'viral']
};

// Common tag IDs (you may need to discover these for your specific needs)
const TAGS = {
  // Add tag IDs here after discovering them
  // Example: SOCCER: '12345',
  // COPA_LIBERTADORES: '67890'
};

// ============================================
// CONFIGURATION FUNCTIONS
// ============================================

/**
 * Ensure the Settings sheet exists and is properly formatted
 * @returns {Sheet} The Settings sheet
 */
function ensureSettingsSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let settingsSheet = spreadsheet.getSheetByName(SETTINGS_SHEET_NAME);

  if (!settingsSheet) {
    // Create the Settings sheet
    settingsSheet = spreadsheet.insertSheet(SETTINGS_SHEET_NAME);

    // Set up headers and initial values
    settingsSheet.getRange('A1').setValue('Setting').setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
    settingsSheet.getRange('B1').setValue('Value').setFontWeight('bold').setBackground('#4285f4').setFontColor('white');

    settingsSheet.getRange('A2').setValue('Min Entries');
    settingsSheet.getRange('B2').setValue(1);
    settingsSheet.getRange('B2').setNote('Minimum number of markets to display.\nDefault: 1\nShows warning if fewer results found.');

    settingsSheet.getRange('A3').setValue('Max Entries');
    settingsSheet.getRange('B3').setValue(DEFAULT_FETCH_LIMIT);
    settingsSheet.getRange('B3').setNote(`Maximum number of markets to fetch from API.\nDefault: ${DEFAULT_FETCH_LIMIT}\nAPI Max: 1000`);

    // Format the sheet
    settingsSheet.setColumnWidth(1, 200);
    settingsSheet.setColumnWidth(2, 150);
    settingsSheet.getRange('B2:B3').setFontWeight('bold').setBackground('#fff2cc');

    Logger.log('Created Settings sheet with default configuration');
  }

  return settingsSheet;
}

/**
 * Get the min/max entries from Settings sheet
 * @returns {Object} {min: number, max: number}
 */
function getEntryRange() {
  try {
    const settingsSheet = ensureSettingsSheet();
    const minValue = settingsSheet.getRange(SETTINGS_ROW_MIN_ENTRIES, 2).getValue();
    const maxValue = settingsSheet.getRange(SETTINGS_ROW_MAX_ENTRIES, 2).getValue();

    const min = (minValue && typeof minValue === 'number' && minValue > 0) ? minValue : 1;
    const max = (maxValue && typeof maxValue === 'number' && maxValue > 0) ? Math.min(maxValue, 1000) : DEFAULT_FETCH_LIMIT;

    Logger.log(`Entry range: ${min} - ${max}`);
    return { min, max };
  } catch (e) {
    Logger.log('Error reading entry range from Settings sheet: ' + e);
    return { min: 1, max: DEFAULT_FETCH_LIMIT };
  }
}

/**
 * Get the fetch limit from Settings sheet (max entries)
 * @returns {number} The maximum number of markets to fetch
 */
function getFetchLimit() {
  const range = getEntryRange();
  return range.max;
}

/**
 * Set the entry range (min/max) via UI prompt
 * Stores values in Settings sheet
 */
function setEntryRange() {
  const ui = SpreadsheetApp.getUi();
  const settingsSheet = ensureSettingsSheet();

  const currentRange = getEntryRange();

  // Ask for max entries
  const maxResponse = ui.prompt(
    'Set Maximum Entries',
    `Maximum number of markets to fetch from API?\n\nCurrent: ${currentRange.max}\nRecommended: 100-1000\n\nEnter a number:`,
    ui.ButtonSet.OK_CANCEL
  );

  if (maxResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const maxInput = maxResponse.getResponseText();
  const max = parseInt(maxInput, 10);

  if (isNaN(max) || max <= 0) {
    ui.alert('Invalid Input', 'Please enter a positive number.', ui.ButtonSet.OK);
    return;
  }

  if (max > 1000) {
    const confirm = ui.alert(
      'Large Maximum Warning',
      `You entered ${max}, but the API may not return more than 1000 results.\n\nContinue with ${max}?`,
      ui.ButtonSet.YES_NO
    );

    if (confirm === ui.Button.NO) {
      return;
    }
  }

  // Ask for min entries
  const minResponse = ui.prompt(
    'Set Minimum Entries',
    `Minimum number of markets to display?\n\nCurrent: ${currentRange.min}\nUsually 1 (no minimum)\n\nEnter a number:`,
    ui.ButtonSet.OK_CANCEL
  );

  if (minResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const minInput = minResponse.getResponseText();
  const min = parseInt(minInput, 10);

  if (isNaN(min) || min < 0) {
    ui.alert('Invalid Input', 'Please enter a non-negative number.', ui.ButtonSet.OK);
    return;
  }

  if (min > max) {
    ui.alert('Invalid Range', `Minimum (${min}) cannot be greater than maximum (${max}).`, ui.ButtonSet.OK);
    return;
  }

  // Save to Settings sheet
  settingsSheet.getRange(SETTINGS_ROW_MIN_ENTRIES, 2).setValue(min);
  settingsSheet.getRange(SETTINGS_ROW_MAX_ENTRIES, 2).setValue(max);
  settingsSheet.getRange('B2:B3').setFontWeight('bold').setBackground('#fff2cc');

  ui.alert('Entry Range Updated', `Entry range set to ${min} - ${max} markets.\n\nThese values are saved in the Settings sheet.`, ui.ButtonSet.OK);

  Logger.log(`Entry range updated to: ${min} - ${max}`);
}

// Keep old function name for backwards compatibility
function setFetchLimit() {
  setEntryRange();
}

/**
 * Reset entry range to defaults
 */
function resetFetchLimit() {
  const ui = SpreadsheetApp.getUi();
  const settingsSheet = ensureSettingsSheet();

  const response = ui.alert(
    'Reset Entry Range',
    `Reset to defaults?\nMin: 1\nMax: ${DEFAULT_FETCH_LIMIT}`,
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    settingsSheet.getRange(SETTINGS_ROW_MIN_ENTRIES, 2).setValue(1);
    settingsSheet.getRange(SETTINGS_ROW_MAX_ENTRIES, 2).setValue(DEFAULT_FETCH_LIMIT);
    ui.alert('Entry range reset to defaults (1 - ' + DEFAULT_FETCH_LIMIT + ')');
    Logger.log('Entry range reset to defaults');
  }
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Main function to fetch and display Polymarket data
 * Add this to your sheet menu or run manually
 */
function fetchPolymarketData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // Get parameters from sheet (you can set these in specific cells)
  const tagId = sheet.getRange('A1').getValue(); // Tag ID from cell A1
  const limit = 100; // Number of markets to fetch

  // Fetch markets
  const markets = getMarkets({
    tag: tagId || null,
    closed: false,
    active: true,
    limit: limit
  });

  // Display data in sheet
  displayMarkets(sheet, markets);
}

/**
 * Fetch markets with specific filters
 *
 * @param {Object} options - Filter options
 * @param {string} options.tag - Tag ID to filter by
 * @param {boolean} options.closed - Include closed markets
 * @param {boolean} options.active - Include only active markets
 * @param {number} options.limit - Maximum number of results
 * @param {number} options.offset - Pagination offset
 * @returns {Array} Array of market objects
 */
function getMarkets(options = {}) {
  const params = [];

  if (options.tag) params.push(`tag=${encodeURIComponent(options.tag)}`);
  if (options.closed !== undefined) params.push(`closed=${options.closed}`);
  if (options.active !== undefined) params.push(`active=${options.active}`);
  if (options.limit) params.push(`limit=${options.limit}`);
  if (options.offset) params.push(`offset=${options.offset}`);

  const url = `${POLYMARKET_API_BASE}/markets?${params.join('&')}`;

  try {
    Logger.log('Fetching URL: ' + url);
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());

    Logger.log('Received ' + (Array.isArray(data) ? data.length : 0) + ' markets');

    // Parse stringified JSON fields
    if (Array.isArray(data)) {
      data.forEach(market => {
        // Parse outcomePrices if it's a string
        if (market.outcomePrices && typeof market.outcomePrices === 'string') {
          try {
            market.outcomePrices = JSON.parse(market.outcomePrices);
          } catch (e) {
            Logger.log('Error parsing outcomePrices: ' + e);
            market.outcomePrices = [];
          }
        }

        // Parse outcomes if it's a string
        if (market.outcomes && typeof market.outcomes === 'string') {
          try {
            market.outcomes = JSON.parse(market.outcomes);
          } catch (e) {
            Logger.log('Error parsing outcomes: ' + e);
            market.outcomes = ['Yes', 'No']; // Default fallback
          }
        }

        // Parse clobTokenIds if it's a string
        if (market.clobTokenIds && typeof market.clobTokenIds === 'string') {
          try {
            market.clobTokenIds = JSON.parse(market.clobTokenIds);
          } catch (e) {
            Logger.log('Error parsing clobTokenIds: ' + e);
            market.clobTokenIds = [];
          }
        }

        // Parse tags if it's a string
        if (market.tags && typeof market.tags === 'string') {
          try {
            market.tags = JSON.parse(market.tags);
          } catch (e) {
            Logger.log('Error parsing tags: ' + e);
            market.tags = [];
          }
        }
      });
    }

    return data;
  } catch (error) {
    Logger.log('Error fetching markets: ' + error);
    Logger.log('Error stack: ' + error.stack);
    SpreadsheetApp.getUi().alert('Error fetching data: ' + error.message);
    return [];
  }
}

/**
 * Fetch markets by tag ID
 *
 * @param {string} tagId - The tag ID to filter by
 * @param {number} limit - Maximum number of results
 * @returns {Array} Array of market objects
 */
function getMarketsByTag(tagId, limit = 100) {
  return getMarkets({
    tag: tagId,
    closed: false,
    active: true,
    limit: limit
  });
}

/**
 * Fetch all available tags from Polymarket
 * Note: This endpoint may vary - check documentation
 */
function getTags() {
  const url = `${POLYMARKET_API_BASE}/tags`;

  try {
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    return data;
  } catch (error) {
    Logger.log('Error fetching tags: ' + error);
    return [];
  }
}

/**
 * Display market data in structured format (Category, SubCategory, etc.)
 * This format creates one row per outcome
 *
 * @param {Sheet} sheet - The sheet to write to
 * @param {Array} markets - Array of market objects
 */
function displayMarketsStructured(sheet, markets) {
  // Clear existing data
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clear();
  }

  // Set headers
  const headers = [
    'Category',
    'SubCategory1',
    'SubCategory2',
    'Listing',
    'Date',
    'Time (ET)',
    'Moneyline',
    'Outcome',
    'Price'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold')
    .setBackground('#4285f4')
    .setFontColor('white');

  // Check if markets is an array
  if (!Array.isArray(markets)) {
    Logger.log('Markets is not an array: ' + typeof markets);
    SpreadsheetApp.getUi().alert('No markets found or invalid response format');
    return;
  }

  if (markets.length === 0) {
    SpreadsheetApp.getUi().alert('No markets found with the specified filters');
    return;
  }

  Logger.log('Processing ' + markets.length + ' markets in structured format');

  // Filter out invalid markets before processing
  const validMarkets = filterValidMarkets(markets);
  Logger.log('After filtering: ' + validMarkets.length + ' valid markets');

  if (validMarkets.length === 0) {
    SpreadsheetApp.getUi().alert('No valid active markets found after filtering');
    return;
  }

  const allRows = [];

  validMarkets.forEach((market, index) => {
    try {
      // Extract categories from tags or matched category
      let category = '';
      let subCategory1 = '';
      let subCategory2 = '';

      // First check if this market was matched by keyword filtering
      if (market._matchedCategory) {
        category = market._matchedCategory;
        // Try to infer subcategories from matched keywords if available
        if (market._matchedKeywords && market._matchedKeywords.length > 0) {
          // Use matched keywords as hints for subcategories
          subCategory1 = market._matchedKeywords[0];
        }
      }
      // Then try to extract from tags
      else if (market.tags && Array.isArray(market.tags) && market.tags.length > 0) {
        // Extract tag labels
        const tagLabels = market.tags.map(tag => {
          if (typeof tag === 'object') {
            return tag.label || tag.tag || tag.name || '';
          }
          return tag || '';
        }).filter(t => t !== ''); // Remove empty tags

        // Assign tags to categories in order
        if (tagLabels.length > 0) {
          category = tagLabels[0]; // First tag = Category
        }
        if (tagLabels.length > 1) {
          subCategory1 = tagLabels[1]; // Second tag = SubCategory1
        }
        if (tagLabels.length > 2) {
          subCategory2 = tagLabels[2]; // Third tag = SubCategory2
        }
      }

      // If still no category, use generic fallback
      if (!category) {
        category = 'Markets';
      }

      // Extract listing (match name, team abbreviations)
      let listing = market.question || '';
      listing = extractMatchListing(listing);

      // Get date and time
      let eventDate = '';
      let eventTime = '';
      let timezone = 'America/Toronto';

      if (market.endDateIso || market.endDate) {
        const dateStr = market.endDateIso || market.endDate;
        const date = new Date(dateStr);

        // Convert to Toronto timezone
        const torontoTime = convertToTimezone(date, timezone);

        eventDate = formatDate(torontoTime); // YYYY-MM-DD
        eventTime = formatTime(torontoTime); // HH:MM
      }

      // Parse outcomes and prices
      let outcomes = [];
      let prices = [];

      if (market.outcomes && Array.isArray(market.outcomes)) {
        outcomes = market.outcomes;
      }

      if (market.outcomePrices && Array.isArray(market.outcomePrices)) {
        prices = market.outcomePrices.map(p => Math.round(parseFloat(p) * 100));
      }

      // Determine market type and create rows
      const marketRows = createMarketRows(
        category,
        subCategory1,
        subCategory2,
        listing,
        eventDate,
        eventTime,
        outcomes,
        prices,
        market.question
      );

      allRows.push(...marketRows);

    } catch (err) {
      Logger.log('Error processing market ' + index + ': ' + err);
      Logger.log('Market data: ' + JSON.stringify(market));
    }
  });

  if (allRows.length > 0) {
    sheet.getRange(2, 1, allRows.length, headers.length).setValues(allRows);
    sheet.autoResizeColumns(1, headers.length);

    // Add summary with filtering info
    const timestamp = new Date().toLocaleString();
    const summary = `Last updated: ${timestamp} | ${allRows.length} rows from ${validMarkets.length} valid markets (filtered from ${markets.length} total)`;

    // Add timestamp in a merged cell above the data
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, headers.length).merge().setValue(summary);
    sheet.getRange(1, 1).setFontSize(10).setFontColor('#666666');

    SpreadsheetApp.getUi().alert(`Successfully formatted ${allRows.length} rows from ${validMarkets.length} valid markets!\n\nFiltered out ${markets.length - validMarkets.length} closed/invalid markets.`);
  } else {
    SpreadsheetApp.getUi().alert('No data to display');
  }
}

/**
 * Filter markets to only include valid, active, and future markets
 * Excludes: closed, archived, resolved, and past-dated markets
 *
 * @param {Array} markets - Array of market objects
 * @returns {Array} Filtered array of valid markets
 */
function filterValidMarkets(markets) {
  const now = new Date();

  return markets.filter(market => {
    try {
      // Check 1: Market must be active
      if (market.active === false) {
        Logger.log(`Filtered out (inactive): ${market.question}`);
        return false;
      }

      // Check 2: Market must not be closed
      if (market.closed === true) {
        Logger.log(`Filtered out (closed): ${market.question}`);
        return false;
      }

      // Check 3: Market must not be archived
      if (market.archived === true) {
        Logger.log(`Filtered out (archived): ${market.question}`);
        return false;
      }

      // Check 4: End date must be in the future
      if (market.endDateIso || market.endDate) {
        const endDateStr = market.endDateIso || market.endDate;
        const endDate = new Date(endDateStr);

        if (endDate < now) {
          Logger.log(`Filtered out (past date ${endDateStr}): ${market.question}`);
          return false;
        }
      }

      // Check 5: If acceptingOrders field exists, it should be true
      if (market.acceptingOrders !== undefined && market.acceptingOrders === false) {
        Logger.log(`Filtered out (not accepting orders): ${market.question}`);
        return false;
      }

      // Market passed all checks
      return true;

    } catch (err) {
      Logger.log('Error filtering market: ' + err);
      // If there's an error checking, exclude it to be safe
      return false;
    }
  });
}

/**
 * Extract match listing from question (e.g., "RAC vs FLA")
 */
function extractMatchListing(question) {
  if (!question) return '';

  // Look for patterns like "Team1 vs Team2" or "Team1 to beat Team2"
  // Extract team abbreviations or names

  // Try to find "vs" pattern
  let vsMatch = question.match(/([A-Z]{3})\s+vs\.?\s+([A-Z]{3})/i);
  if (vsMatch) {
    return `${vsMatch[1].toUpperCase()} vs ${vsMatch[2].toUpperCase()}`;
  }

  // Try to find team names
  vsMatch = question.match(/(\w+)\s+vs\.?\s+(\w+)/i);
  if (vsMatch) {
    return `${vsMatch[1]} vs ${vsMatch[2]}`;
  }

  // Try other patterns like "Team1 to beat Team2"
  const beatMatch = question.match(/(\w+)\s+to\s+beat\s+(\w+)/i);
  if (beatMatch) {
    return `${beatMatch[1]} vs ${beatMatch[2]}`;
  }

  // Return cleaned question if no pattern found
  return question.substring(0, 50);
}

/**
 * Create rows for a market based on outcomes
 * For soccer matches with 3 outcomes (Team1, Draw, Team2), creates 6 rows (each outcome has YES/NO)
 */
function createMarketRows(category, subCategory1, subCategory2, listing, date, time, outcomes, prices, question) {
  const rows = [];

  // Detect market type
  const isDrawMarket = outcomes.some(o => o && o.toLowerCase().includes('draw'));
  const isBinaryMarket = outcomes.length === 2 && (
    outcomes.some(o => o && o.toLowerCase() === 'yes') ||
    outcomes.some(o => o && o.toLowerCase() === 'no')
  );

  if (isDrawMarket || outcomes.length === 3) {
    // Soccer match with Draw (3-way market)
    // Each outcome gets YES/NO rows
    outcomes.forEach((outcome, idx) => {
      const price = prices[idx] || 0;
      const inversePrice = 100 - price;

      // Determine moneyline label
      let moneyline = outcome;
      if (outcome && outcome.toLowerCase().includes('draw')) {
        moneyline = 'DRAW';
      }

      // YES row
      rows.push([
        category,
        subCategory1,
        subCategory2,
        listing,
        date,
        time,
        moneyline,
        'YES',
        price
      ]);

      // NO row
      rows.push([
        category,
        subCategory1,
        subCategory2,
        listing,
        date,
        time,
        moneyline,
        'NO',
        inversePrice
      ]);
    });
  } else if (isBinaryMarket) {
    // Binary Yes/No market
    outcomes.forEach((outcome, idx) => {
      const price = prices[idx] || 0;

      rows.push([
        category,
        subCategory1,
        subCategory2,
        listing,
        date,
        time,
        outcome,
        'YES',
        price
      ]);
    });
  } else {
    // Multi-outcome market (not draw-based)
    // Create YES/NO rows for each outcome
    outcomes.forEach((outcome, idx) => {
      const price = prices[idx] || 0;
      const inversePrice = 100 - price;

      rows.push([
        category,
        subCategory1,
        subCategory2,
        listing,
        date,
        time,
        outcome,
        'YES',
        price
      ]);

      rows.push([
        category,
        subCategory1,
        subCategory2,
        listing,
        date,
        time,
        outcome,
        'NO',
        inversePrice
      ]);
    });
  }

  return rows;
}

/**
 * Convert date to specific timezone
 */
function convertToTimezone(date, timezone) {
  // Google Apps Script doesn't have full timezone support
  // We'll use a simplified approach

  // Get UTC time
  const utcTime = date.getTime();

  // Toronto is typically UTC-5 (EST) or UTC-4 (EDT)
  // We'll use a simple offset for now
  // Note: This doesn't account for DST transitions perfectly

  if (timezone === 'America/Toronto') {
    // Check if DST is in effect (rough approximation)
    const month = date.getUTCMonth();
    const isDST = month >= 2 && month <= 10; // Mar-Nov roughly
    const offset = isDST ? -4 : -5; // hours

    const torontoTime = new Date(utcTime + offset * 60 * 60 * 1000);
    return torontoTime;
  }

  return date;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format time as H:MM AM/PM
 */
function formatTime(date) {
  let hours = date.getUTCHours();
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // Convert 0 to 12 for midnight

  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Display tags in a sheet
 */
function displayTags() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Tags')
    || SpreadsheetApp.getActiveSpreadsheet().insertSheet('Tags');

  const tags = getTags();

  // Clear existing data
  sheet.clear();

  // Set headers
  sheet.getRange(1, 1, 1, 3).setValues([['Tag ID', 'Tag Name', 'Label']]);
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');

  // Populate data
  if (Array.isArray(tags) && tags.length > 0) {
    const rows = tags.map(tag => [
      tag.id || '',
      tag.tag || tag.name || '',
      tag.label || ''
    ]);
    sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  }

  sheet.autoResizeColumns(1, 3);
}

/**
 * Display market data in the sheet
 *
 * @param {Sheet} sheet - The sheet to write to
 * @param {Array} markets - Array of market objects
 */
function displayMarkets(sheet, markets) {
  // Clear existing data (except configuration cells if any)
  const lastRow = sheet.getLastRow();
  if (lastRow > 3) {
    sheet.getRange(4, 1, lastRow - 3, sheet.getLastColumn()).clear();
  }

  // Set headers
  const headers = [
    'Question',
    'Description',
    'Market Slug',
    'Outcomes',
    'Current Prices',
    'Volume (USD)',
    'Liquidity (USD)',
    'Start Date',
    'End Date',
    'Status',
    'Tags',
    'Market ID',
    'Condition ID'
  ];

  sheet.getRange(3, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(3, 1, 1, headers.length).setFontWeight('bold')
    .setBackground('#4285f4')
    .setFontColor('white');

  // Check if markets is an array
  if (!Array.isArray(markets)) {
    Logger.log('Markets is not an array: ' + typeof markets);
    Logger.log('Markets value: ' + JSON.stringify(markets));
    SpreadsheetApp.getUi().alert('No markets found or invalid response format');
    return;
  }

  if (markets.length === 0) {
    SpreadsheetApp.getUi().alert('No markets found with the specified filters');
    return;
  }

  Logger.log('Processing ' + markets.length + ' markets');

  // Filter out invalid markets
  const validMarkets = filterValidMarkets(markets);
  Logger.log('After filtering: ' + validMarkets.length + ' valid markets');

  if (validMarkets.length === 0) {
    SpreadsheetApp.getUi().alert('No valid active markets found after filtering');
    return;
  }

  // Log first market for debugging
  if (validMarkets.length > 0) {
    Logger.log('Sample market: ' + JSON.stringify(validMarkets[0]));
  }

  // Populate data
  const rows = validMarkets.map((market, index) => {
    try {
      // Extract outcomes - they might be in different formats
      let outcomesText = 'Yes, No'; // Default for binary markets

      // Check if outcomes is already parsed as an array
      if (market.outcomes && Array.isArray(market.outcomes)) {
        outcomesText = market.outcomes.join(', ');
      }
      // If it's still a string, try to parse it here as backup
      else if (market.outcomes && typeof market.outcomes === 'string') {
        try {
          const parsed = JSON.parse(market.outcomes);
          if (Array.isArray(parsed)) {
            outcomesText = parsed.join(', ');
          }
        } catch (e) {
          Logger.log('Error parsing outcomes in displayMarkets: ' + e);
          outcomesText = market.outcomes; // Use as-is if parsing fails
        }
      }
      // Check tokens as alternative
      else if (market.tokens && Array.isArray(market.tokens)) {
        outcomesText = market.tokens.map(t => t.outcome || t).join(', ');
      }

      // Get current prices (probabilities)
      let pricesText = '';
      if (market.outcomePrices && Array.isArray(market.outcomePrices)) {
        pricesText = market.outcomePrices.map(p => {
          const price = parseFloat(p);
          return isNaN(price) ? p : `${(price * 100).toFixed(1)}%`;
        }).join(', ');
      }
      // Backup: try to parse if still a string
      else if (market.outcomePrices && typeof market.outcomePrices === 'string') {
        try {
          const parsed = JSON.parse(market.outcomePrices);
          if (Array.isArray(parsed)) {
            pricesText = parsed.map(p => {
              const price = parseFloat(p);
              return isNaN(price) ? p : `${(price * 100).toFixed(1)}%`;
            }).join(', ');
          }
        } catch (e) {
          Logger.log('Error parsing outcomePrices in displayMarkets: ' + e);
          pricesText = market.outcomePrices; // Use as-is
        }
      }

      // Get tags
      let tags = market.tags || [];
      // Backup: parse tags if it's a string
      if (typeof tags === 'string') {
        try {
          tags = JSON.parse(tags);
        } catch (e) {
          Logger.log('Error parsing tags in displayMarkets: ' + e);
          tags = [];
        }
      }
      const tagsText = Array.isArray(tags) ? tags.map(t => {
        if (typeof t === 'object') return t.label || t.tag || t.name || '';
        return t;
      }).join(', ') : '';

      // Format dates - try both ISO and regular date fields
      let startDate = '';
      if (market.startDateIso) {
        startDate = new Date(market.startDateIso);
      } else if (market.startDate) {
        startDate = new Date(market.startDate);
      }

      let endDate = '';
      if (market.endDateIso) {
        endDate = new Date(market.endDateIso);
      } else if (market.endDate) {
        endDate = new Date(market.endDate);
      }

      // Determine status
      let status = 'Active';
      if (market.closed) status = 'Closed';
      else if (market.archived) status = 'Archived';
      else if (market.active === false) status = 'Inactive';

      // Use volumeNum/liquidityNum if available, fallback to volume/liquidity
      const volume = market.volumeNum || market.volume || 0;
      const liquidity = market.liquidityNum || market.liquidity || 0;

      return [
        market.question || '',
        market.description || '',
        market.slug || '',
        outcomesText,
        pricesText,
        parseFloat(volume) || 0,
        parseFloat(liquidity) || 0,
        startDate,
        endDate,
        status,
        tagsText,
        market.id || '',
        market.conditionId || ''
      ];
    } catch (err) {
      Logger.log('Error processing market ' + index + ': ' + err);
      Logger.log('Market data: ' + JSON.stringify(market));
      // Return empty row on error
      return ['Error', '', '', '', '', 0, 0, '', '', '', '', '', ''];
    }
  });

  sheet.getRange(4, 1, rows.length, headers.length).setValues(rows);

  // Format columns
  sheet.autoResizeColumns(1, headers.length);

  // Format currency columns
  const volumeCol = 6;
  const liquidityCol = 7;
  sheet.getRange(4, volumeCol, rows.length, 1).setNumberFormat('$#,##0.00');
  sheet.getRange(4, liquidityCol, rows.length, 1).setNumberFormat('$#,##0.00');

  // Format date columns
  const startDateCol = 8;
  const endDateCol = 9;
  sheet.getRange(4, startDateCol, rows.length, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  sheet.getRange(4, endDateCol, rows.length, 1).setNumberFormat('yyyy-mm-dd hh:mm');

  // Add timestamp with filtering info
  const timestamp = `Last updated: ${new Date().toLocaleString()} | ${validMarkets.length} valid markets (filtered from ${markets.length} total)`;
  sheet.getRange(1, 1).setValue(timestamp);

  SpreadsheetApp.getUi().alert(`Successfully fetched ${validMarkets.length} valid markets!\n\nFiltered out ${markets.length - validMarkets.length} closed/invalid markets.`);
}

/**
 * Filter markets by category keywords when tags are not available
 * @param {Array} markets - Array of market objects
 * @param {string} category - Category name to filter by
 * @returns {Array} Filtered markets with _matchedCategory field added
 */
function filterByKeywords(markets, category) {
  const keywords = CATEGORY_KEYWORDS[category];
  const excludeKeywords = CATEGORY_KEYWORDS[category + '_Exclude'] || [];

  if (!keywords || keywords.length === 0) {
    Logger.log(`No keywords defined for category: ${category}`);
    return markets;
  }

  Logger.log(`Filtering by keywords for ${category}: ${keywords.slice(0, 10).join(', ')}...`);
  if (excludeKeywords.length > 0) {
    Logger.log(`Exclusion keywords: ${excludeKeywords.slice(0, 10).join(', ')}...`);
  }

  const filtered = markets.filter(market => {
    // Only search in question field to reduce false positives
    const question = (market.question || '').toLowerCase();

    // First check exclusion keywords - if any match, skip this market
    if (excludeKeywords.length > 0) {
      const hasExclusion = excludeKeywords.some(keyword => {
        return question.includes(keyword.toLowerCase());
      });

      if (hasExclusion) {
        return false; // Skip this market
      }
    }

    // Check if any inclusion keyword matches
    const matchedKeywords = [];
    const hasKeyword = keywords.some(keyword => {
      const keywordLower = keyword.toLowerCase();
      if (question.includes(keywordLower)) {
        matchedKeywords.push(keyword);
        return true;
      }
      return false;
    });

    if (hasKeyword) {
      Logger.log(`✓ Matched (${matchedKeywords.slice(0, 3).join(', ')}): ${market.question.substring(0, 60)}`);
      // Add the matched category to the market object
      market._matchedCategory = category;
      market._matchedKeywords = matchedKeywords;
    }

    return hasKeyword;
  });

  Logger.log(`Keyword filtering: ${filtered.length} markets matched out of ${markets.length}`);
  return filtered;
}

/**
 * Find tag ID by category name from the tags API
 * @param {string} categoryName - The category name to search for
 * @returns {string|null} The tag ID if found, null otherwise
 */
function findTagId(categoryName) {
  try {
    const tags = getTags();

    if (!Array.isArray(tags) || tags.length === 0) {
      Logger.log('No tags returned from API');
      return null;
    }

    const categoryLower = categoryName.toLowerCase();

    // Try exact match first
    let matchedTag = tags.find(tag => {
      const label = (tag.label || tag.name || tag.tag || '').toLowerCase();
      return label === categoryLower;
    });

    if (matchedTag) {
      Logger.log(`Found exact tag match: ${matchedTag.id} for "${categoryName}"`);
      return matchedTag.id;
    }

    // Try partial match
    matchedTag = tags.find(tag => {
      const label = (tag.label || tag.name || tag.tag || '').toLowerCase();
      return label.includes(categoryLower) || categoryLower.includes(label);
    });

    if (matchedTag) {
      Logger.log(`Found partial tag match: ${matchedTag.id} for "${categoryName}"`);
      return matchedTag.id;
    }

    // Try singular/plural variations
    const singularCategory = categoryLower.endsWith('s') ? categoryLower.slice(0, -1) : categoryLower;
    matchedTag = tags.find(tag => {
      const label = (tag.label || tag.name || tag.tag || '').toLowerCase();
      return label === singularCategory || label.includes(singularCategory);
    });

    if (matchedTag) {
      Logger.log(`Found singular/plural match: ${matchedTag.id} for "${categoryName}"`);
      return matchedTag.id;
    }

    Logger.log(`No tag found for "${categoryName}"`);
    Logger.log(`Available tags: ${tags.map(t => t.label || t.name || t.tag).join(', ')}`);
    return null;

  } catch (error) {
    Logger.log(`Error finding tag ID: ${error}`);
    return null;
  }
}

/**
 * Generic function to fetch markets by category (structured format)
 * @param {string} category - The category name to filter by
 */
function fetchCategoryStructured(category) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const limit = getFetchLimit();

  Logger.log(`Fetching category: ${category}`);
  Logger.log(`Fetch limit: ${limit}`);

  // Try to find the tag ID from the tags API
  const tagId = findTagId(category);

  let markets;

  if (tagId) {
    // Use tag ID for precise filtering
    Logger.log(`Using tag ID: ${tagId}`);
    markets = getMarkets({
      tag: tagId,
      closed: false,
      active: true,
      limit: limit
    });

    Logger.log(`Fetched ${markets.length} markets with tag ID "${tagId}"`);

    if (markets.length === 0) {
      SpreadsheetApp.getUi().alert(`No active markets found for "${category}" (tag ID: ${tagId})`);
      return;
    }

    displayMarketsStructured(sheet, markets);

  } else {
    // Fallback: Fetch all markets and filter client-side
    Logger.log(`No tag ID found, fetching all markets and filtering client-side`);

    const allMarkets = getMarkets({
      closed: false,
      active: true,
      limit: limit
    });

    Logger.log(`Total markets fetched: ${allMarkets.length}`);

    // Analyze tag structure
    let marketsWithTags = 0;
    let marketsWithEmptyTags = 0;
    let marketsWithNoTagsField = 0;
    const allTagsSet = new Set();

    allMarkets.forEach(market => {
      if (market.tags === undefined) {
        marketsWithNoTagsField++;
      } else if (!Array.isArray(market.tags) || market.tags.length === 0) {
        marketsWithEmptyTags++;
      } else {
        marketsWithTags++;
        market.tags.forEach(tag => {
          const label = typeof tag === 'object' ? (tag.label || tag.tag || tag.name) : tag;
          if (label) allTagsSet.add(label);
        });
      }
    });

    const allTagsList = Array.from(allTagsSet).sort();

    Logger.log(`=== TAG ANALYSIS ===`);
    Logger.log(`Markets with tags: ${marketsWithTags}`);
    Logger.log(`Markets with empty tags array: ${marketsWithEmptyTags}`);
    Logger.log(`Markets with no tags field: ${marketsWithNoTagsField}`);
    Logger.log(`Unique tags found: ${allTagsList.length}`);
    if (allTagsList.length > 0) {
      Logger.log(`All tags: ${allTagsList.join(', ')}`);
    }

    let categoryMarkets = [];

    // Try tag-based filtering first
    if (marketsWithTags > 0) {
      categoryMarkets = allMarkets.filter(market => {
        if (!market.tags || !Array.isArray(market.tags) || market.tags.length === 0) {
          return false;
        }

        const tags = market.tags.map(t => {
          if (typeof t === 'object') return (t.label || t.tag || t.name || '').toLowerCase();
          return (t || '').toLowerCase();
        }).filter(t => t !== '');

        const categoryLower = category.toLowerCase();

        return tags.some(tag => {
          return tag === categoryLower ||
                 tag.includes(categoryLower) ||
                 (categoryLower.includes(tag) && tag.length > 3) ||
                 tag === (categoryLower.endsWith('s') ? categoryLower.slice(0, -1) : categoryLower);
        });
      });

      Logger.log(`Tag-based filtering: Found ${categoryMarkets.length} markets`);
    }

    // If tag filtering didn't work, try keyword filtering
    if (categoryMarkets.length === 0) {
      Logger.log(`No markets found via tags, trying keyword-based filtering`);
      categoryMarkets = filterByKeywords(allMarkets, category);
    }

    Logger.log(`Category "${category}": Found ${categoryMarkets.length} total markets`);

    if (categoryMarkets.length === 0) {
      const message = `No markets found for "${category}".\n\n` +
        `API returned ${allMarkets.length} markets:\n` +
        `- ${marketsWithTags} have tags\n` +
        `- ${marketsWithEmptyTags} have empty tags\n` +
        `- ${marketsWithNoTagsField} have no tags field\n\n` +
        (allTagsList.length > 0
          ? `Available tags (${allTagsList.length}):\n${allTagsList.slice(0, 30).join(', ')}${allTagsList.length > 30 ? '...' : ''}\n\n`
          : `Tried keyword filtering but found no matches.\n\n`) +
        `Solutions:\n` +
        `1. Click "All Markets" to see everything\n` +
        `2. Try a different category\n` +
        `3. Check View → Logs for detailed filtering info`;

      SpreadsheetApp.getUi().alert(message);
      Logger.log(message);
      return;
    }

    displayMarketsStructured(sheet, categoryMarkets);
  }
}

/**
 * Generic function to fetch markets by category (original format)
 * @param {string} category - The category name to filter by
 */
function fetchCategoryOriginal(category) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const limit = getFetchLimit();

  Logger.log(`Fetching category (original format): ${category}`);
  Logger.log(`Fetch limit: ${limit}`);

  // Try to find the tag ID from the tags API
  const tagId = findTagId(category);

  let markets;

  if (tagId) {
    // Use tag ID for precise filtering
    Logger.log(`Using tag ID: ${tagId}`);
    markets = getMarkets({
      tag: tagId,
      closed: false,
      active: true,
      limit: limit
    });

    Logger.log(`Fetched ${markets.length} markets with tag ID "${tagId}"`);

    if (markets.length === 0) {
      SpreadsheetApp.getUi().alert(`No active markets found for "${category}" (tag ID: ${tagId})`);
      return;
    }

    displayMarkets(sheet, markets);

  } else {
    // Fallback: Fetch all markets and filter client-side
    Logger.log(`No tag ID found, fetching all markets and filtering client-side`);

    const allMarkets = getMarkets({
      closed: false,
      active: true,
      limit: limit
    });

    let categoryMarkets = [];

    // Check if markets have tags
    const marketsWithTags = allMarkets.filter(m => m.tags && Array.isArray(m.tags) && m.tags.length > 0).length;

    // Try tag-based filtering first if tags are available
    if (marketsWithTags > 0) {
      categoryMarkets = allMarkets.filter(market => {
        if (!market.tags || !Array.isArray(market.tags) || market.tags.length === 0) {
          return false; // Skip markets without tags
        }

        const tags = market.tags.map(t => {
          if (typeof t === 'object') return (t.label || t.tag || t.name || '').toLowerCase();
          return (t || '').toLowerCase();
        }).filter(t => t !== ''); // Remove empty tags

        const categoryLower = category.toLowerCase();

        // Try multiple matching strategies
        return tags.some(tag => {
          // Strategy 1: Exact match
          if (tag === categoryLower) return true;

          // Strategy 2: Contains
          if (tag.includes(categoryLower)) return true;

          // Strategy 3: Category contains tag
          if (categoryLower.includes(tag) && tag.length > 3) return true;

          // Strategy 4: Singular/plural matching
          const singularCategory = categoryLower.endsWith('s') ? categoryLower.slice(0, -1) : categoryLower;
          if (tag === singularCategory || tag.includes(singularCategory)) return true;

          return false;
        });
      });

      Logger.log(`Tag-based filtering: Found ${categoryMarkets.length} markets`);
    }

    // If tag filtering didn't work, try keyword filtering
    if (categoryMarkets.length === 0) {
      Logger.log(`No markets found via tags, trying keyword-based filtering`);
      categoryMarkets = filterByKeywords(allMarkets, category);
    }

    Logger.log(`Category "${category}": Found ${categoryMarkets.length} markets out of ${allMarkets.length} total`);

    if (categoryMarkets.length === 0) {
      // Log available tags
      const allTagsSet = new Set();
      allMarkets.forEach(m => {
        if (m.tags && Array.isArray(m.tags)) {
          m.tags.forEach(t => {
            const label = typeof t === 'object' ? (t.label || t.tag || t.name) : t;
            if (label) allTagsSet.add(label);
          });
        }
      });
      const allTagsList = Array.from(allTagsSet).sort().slice(0, 20).join(', ');
      Logger.log(`Available tags (first 20): ${allTagsList}`);

      SpreadsheetApp.getUi().alert(`No markets found for "${category}".\n\nTried keyword filtering but found no matches.\n\nTry:\n- Click "All Markets" to see everything\n- Try a different category\n- Check View → Logs for details`);
      return;
    }

    displayMarkets(sheet, categoryMarkets);
  }
}

// Specific category functions - Structured Format
function fetchPoliticsStructured() { fetchCategoryStructured('Politics'); }
function fetchSportsStructured() { fetchCategoryStructured('Sports'); }
function fetchFinanceStructured() { fetchCategoryStructured('Finance'); }
function fetchCryptoStructured() { fetchCategoryStructured('Crypto'); }
function fetchGeopoliticsStructured() { fetchCategoryStructured('Geopolitics'); }
function fetchEarningsStructured() { fetchCategoryStructured('Earnings'); }
function fetchTechStructured() { fetchCategoryStructured('Tech'); }
function fetchCultureStructured() { fetchCategoryStructured('Culture'); }
function fetchWorldStructured() { fetchCategoryStructured('World'); }
function fetchEconomyStructured() { fetchCategoryStructured('Economy'); }
function fetchElectionsStructured() { fetchCategoryStructured('Elections'); }
function fetchMentionsStructured() { fetchCategoryStructured('Mentions'); }

// Specific category functions - Original Format
function fetchPoliticsOriginal() { fetchCategoryOriginal('Politics'); }
function fetchSportsOriginal() { fetchCategoryOriginal('Sports'); }
function fetchFinanceOriginal() { fetchCategoryOriginal('Finance'); }
function fetchCryptoOriginal() { fetchCategoryOriginal('Crypto'); }
function fetchGeopoliticsOriginal() { fetchCategoryOriginal('Geopolitics'); }
function fetchEarningsOriginal() { fetchCategoryOriginal('Earnings'); }
function fetchTechOriginal() { fetchCategoryOriginal('Tech'); }
function fetchCultureOriginal() { fetchCategoryOriginal('Culture'); }
function fetchWorldOriginal() { fetchCategoryOriginal('World'); }
function fetchEconomyOriginal() { fetchCategoryOriginal('Economy'); }
function fetchElectionsOriginal() { fetchCategoryOriginal('Elections'); }
function fetchMentionsOriginal() { fetchCategoryOriginal('Mentions'); }

/**
 * Fetch all markets in structured format
 */
function fetchMarketsStructured() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // Get parameters from sheet (you can set these in specific cells)
  const tagId = sheet.getRange('A1').getValue(); // Tag ID from cell A1
  const limit = getFetchLimit(); // Get from B1 or use default

  Logger.log(`Fetching all markets with limit: ${limit}`);

  // Fetch markets
  const markets = getMarkets({
    tag: tagId || null,
    closed: false,
    active: true,
    limit: limit
  });

  // Display data in structured format
  displayMarketsStructured(sheet, markets);
}

/**
 * Fetch markets by keyword search
 *
 * @param {string} keyword - Keyword to search for
 */
function fetchMarketsByKeyword(keyword) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  const allMarkets = getMarkets({
    closed: false,
    active: true,
    limit: 1000
  });

  const keywordLower = keyword.toLowerCase();
  const filteredMarkets = allMarkets.filter(market => {
    const question = (market.question || '').toLowerCase();
    const description = (market.description || '').toLowerCase();
    return question.includes(keywordLower) || description.includes(keywordLower);
  });

  displayMarkets(sheet, filteredMarkets);
}

/**
 * Setup function - adds custom menu to Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Polymarket')
    .addSubMenu(ui.createMenu('Structured Format (Recommended)')
      .addItem('📊 All Markets', 'fetchMarketsStructured')
      .addSeparator()
      .addItem('Politics', 'fetchPoliticsStructured')
      .addItem('Sports', 'fetchSportsStructured')
      .addItem('Finance', 'fetchFinanceStructured')
      .addItem('Crypto', 'fetchCryptoStructured')
      .addItem('Geopolitics', 'fetchGeopoliticsStructured')
      .addItem('Earnings', 'fetchEarningsStructured')
      .addItem('Tech', 'fetchTechStructured')
      .addItem('Culture', 'fetchCultureStructured')
      .addItem('World', 'fetchWorldStructured')
      .addItem('Economy', 'fetchEconomyStructured')
      .addItem('Elections', 'fetchElectionsStructured')
      .addItem('Mentions', 'fetchMentionsStructured'))
    .addSubMenu(ui.createMenu('Original Format')
      .addItem('All Markets', 'fetchPolymarketData')
      .addSeparator()
      .addItem('Politics', 'fetchPoliticsOriginal')
      .addItem('Sports', 'fetchSportsOriginal')
      .addItem('Finance', 'fetchFinanceOriginal')
      .addItem('Crypto', 'fetchCryptoOriginal')
      .addItem('Geopolitics', 'fetchGeopoliticsOriginal')
      .addItem('Earnings', 'fetchEarningsOriginal')
      .addItem('Tech', 'fetchTechOriginal')
      .addItem('Culture', 'fetchCultureOriginal')
      .addItem('World', 'fetchWorldOriginal')
      .addItem('Economy', 'fetchEconomyOriginal')
      .addItem('Elections', 'fetchElectionsOriginal')
      .addItem('Mentions', 'fetchMentionsOriginal'))
    .addSeparator()
    .addItem('Show Available Tags', 'displayTags')
    .addSeparator()
    .addItem('⚙️ Set Entry Range (Min/Max)', 'setFetchLimit')
    .addItem('🔄 Reset Entry Range', 'resetFetchLimit')
    .addSeparator()
    .addItem('🔧 Test Market Fetch', 'testMarketFetch')
    .addItem('🔍 Debug API Response', 'debugMarketResponse')
    .addItem('📋 Show All Tags', 'showAllTags')
    .addToUi();
}

// ============================================
// DEBUG FUNCTIONS
// ============================================

/**
 * Debug function - shows all unique tags from fetched markets
 * Run this to see what tag names Polymarket actually uses
 */
function showAllTags() {
  const limit = getFetchLimit();
  const allMarkets = getMarkets({
    closed: false,
    active: true,
    limit: limit
  });

  const allTags = new Set();

  allMarkets.forEach(market => {
    if (market.tags && Array.isArray(market.tags)) {
      market.tags.forEach(tag => {
        const tagLabel = typeof tag === 'object' ? (tag.label || tag.tag || tag.name) : tag;
        if (tagLabel) {
          allTags.add(tagLabel);
        }
      });
    }
  });

  const sortedTags = Array.from(allTags).sort();

  Logger.log('=== ALL TAGS FOUND IN MARKETS ===');
  Logger.log(`Total unique tags: ${sortedTags.length}`);
  sortedTags.forEach(tag => Logger.log(`  - ${tag}`));

  const message = `Found ${sortedTags.length} unique tags:\n\n${sortedTags.slice(0, 50).join('\n')}\n\n${sortedTags.length > 50 ? `... and ${sortedTags.length - 50} more` : ''}\n\nSee full list in View → Logs`;

  SpreadsheetApp.getUi().alert(message);
}

/**
 * Debug function - fetches one market and logs the full response
 * Use this to see what fields are actually available
 * Run this from Apps Script editor and check View -> Logs
 */
function debugMarketResponse() {
  const url = `${POLYMARKET_API_BASE}/markets?limit=1&active=true`;

  try {
    Logger.log('Fetching: ' + url);
    const response = UrlFetchApp.fetch(url);
    const text = response.getContentText();

    Logger.log('Raw response: ' + text);

    const data = JSON.parse(text);
    Logger.log('Parsed data type: ' + typeof data);
    Logger.log('Is array: ' + Array.isArray(data));

    if (Array.isArray(data) && data.length > 0) {
      Logger.log('Number of markets: ' + data.length);
      Logger.log('First market keys: ' + Object.keys(data[0]).join(', '));
      Logger.log('First market full data: ' + JSON.stringify(data[0], null, 2));

      // Check specific fields
      Logger.log('Question: ' + data[0].question);
      Logger.log('outcomePrices type: ' + typeof data[0].outcomePrices);
      Logger.log('outcomePrices value: ' + data[0].outcomePrices);
      Logger.log('Volume: ' + data[0].volume);
      Logger.log('VolumeNum: ' + data[0].volumeNum);
    }

    SpreadsheetApp.getUi().alert('Debug info logged. Check View -> Logs in Apps Script editor');
  } catch (error) {
    Logger.log('Error: ' + error);
    Logger.log('Stack: ' + error.stack);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Test function - fetches markets and displays detailed info
 */
function testMarketFetch() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  Logger.log('Testing market fetch...');

  const markets = getMarkets({
    active: true,
    closed: false,
    limit: 5
  });

  Logger.log('Received markets: ' + JSON.stringify(markets));

  if (Array.isArray(markets) && markets.length > 0) {
    // Log tags for debugging
    Logger.log('First market tags: ' + JSON.stringify(markets[0].tags));

    const tags = markets[0].tags || [];
    const tagsList = tags.map(t => {
      if (typeof t === 'object') return t.label || t.tag || t.name || '';
      return t;
    }).join(', ');

    const summary = `Fetched ${markets.length} markets\n\n` +
                   `First market:\n` +
                   `Question: ${markets[0].question}\n` +
                   `Slug: ${markets[0].slug}\n` +
                   `Tags: ${tagsList}\n` +
                   `Volume: ${markets[0].volume || markets[0].volumeNum}\n` +
                   `OutcomePrices: ${JSON.stringify(markets[0].outcomePrices)}`;
    SpreadsheetApp.getUi().alert(summary);
  } else {
    SpreadsheetApp.getUi().alert('No markets received or invalid format');
  }
}

// ============================================
// ADVANCED FUNCTIONS
// ============================================

/**
 * Fetch market details by ID
 *
 * @param {string} marketId - The market ID
 * @returns {Object} Market object with detailed information
 */
function getMarketById(marketId) {
  const url = `${POLYMARKET_API_BASE}/markets/${marketId}`;

  try {
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    return data;
  } catch (error) {
    Logger.log('Error fetching market: ' + error);
    return null;
  }
}

/**
 * Setup automatic data refresh
 * Creates a time-based trigger to refresh data periodically
 *
 * @param {number} hours - Refresh interval in hours
 */
function setupAutoRefresh(hours = 1) {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'fetchPolymarketData') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new trigger
  ScriptApp.newTrigger('fetchPolymarketData')
    .timeBased()
    .everyHours(hours)
    .create();

  SpreadsheetApp.getUi().alert(`Auto-refresh set to every ${hours} hour(s)`);
}

/**
 * Export data to CSV
 * Note: Google Sheets has built-in CSV export, this is for programmatic use
 */
function exportToCSV() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();

  const csv = data.map(row => row.join(',')).join('\n');

  // Save to Drive
  const fileName = `Polymarket_Export_${new Date().toISOString().split('T')[0]}.csv`;
  DriveApp.createFile(fileName, csv, MimeType.CSV);

  SpreadsheetApp.getUi().alert(`Exported to: ${fileName}`);
}
