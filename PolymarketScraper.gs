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

// Common tag IDs (you may need to discover these for your specific needs)
const TAGS = {
  // Add tag IDs here after discovering them
  // Example: SOCCER: '12345',
  // COPA_LIBERTADORES: '67890'
};

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
    'Time',
    'Timezone',
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
      // Extract categories from tags
      let category = '';
      let subCategory1 = '';
      let subCategory2 = '';

      if (market.tags && Array.isArray(market.tags) && market.tags.length > 0) {
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

      // If no tags, try to infer from question/description
      if (!category) {
        const question = (market.question || '').toLowerCase();
        if (question.includes('copa libertadores') || question.includes('soccer') || question.includes('football')) {
          category = 'Sports';
          subCategory1 = 'Soccer';
          if (question.includes('copa libertadores')) {
            subCategory2 = 'Copa Libertadores';
          }
        } else {
          category = 'Markets'; // Generic fallback
        }
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
        timezone,
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
function createMarketRows(category, subCategory1, subCategory2, listing, date, time, timezone, outcomes, prices, question) {
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
        timezone,
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
        timezone,
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
        timezone,
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
        timezone,
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
        timezone,
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
 * Format time as HH:MM (24-hour)
 */
function formatTime(date) {
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
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
 * Fetch Copa Libertadores markets in structured format
 */
function fetchCopaLibertadoresStructured() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // Search for markets with "Copa Libertadores" in the question
  // Fetch more initially to ensure we get enough after filtering
  const allMarkets = getMarkets({
    closed: false,
    active: true,
    limit: 500
  });

  // Filter for Copa Libertadores
  const copaMarkets = allMarkets.filter(market => {
    const question = (market.question || '').toLowerCase();
    const description = (market.description || '').toLowerCase();
    const tags = (market.tags || []).map(t => {
      if (typeof t === 'object') return (t.label || t.tag || t.name || '').toLowerCase();
      return (t || '').toLowerCase();
    });

    return question.includes('copa libertadores') ||
           description.includes('copa libertadores') ||
           tags.some(tag => tag.includes('copa libertadores') || tag.includes('libertadores'));
  });

  displayMarketsStructured(sheet, copaMarkets);
}

/**
 * Fetch Copa Libertadores markets in original format (for backward compatibility)
 */
function fetchCopaLibertadores() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  const allMarkets = getMarkets({
    closed: false,
    active: true,
    limit: 1000
  });

  const copaMarkets = allMarkets.filter(market => {
    const question = (market.question || '').toLowerCase();
    const description = (market.description || '').toLowerCase();
    const tags = (market.tags || []).map(t => {
      if (typeof t === 'object') return (t.label || t.tag || t.name || '').toLowerCase();
      return (t || '').toLowerCase();
    });

    return question.includes('copa libertadores') ||
           description.includes('copa libertadores') ||
           tags.some(tag => tag.includes('copa libertadores') || tag.includes('libertadores'));
  });

  displayMarkets(sheet, copaMarkets);
}

/**
 * Fetch all markets in structured format
 */
function fetchMarketsStructured() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // Get parameters from sheet (you can set these in specific cells)
  const tagId = sheet.getRange('A1').getValue(); // Tag ID from cell A1
  const limit = 500; // Number of markets to fetch

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
      .addItem('📊 Copa Libertadores (Structured)', 'fetchCopaLibertadoresStructured')
      .addItem('📊 All Markets (Structured)', 'fetchMarketsStructured'))
    .addSubMenu(ui.createMenu('Original Format')
      .addItem('Fetch Markets', 'fetchPolymarketData')
      .addItem('Fetch Copa Libertadores', 'fetchCopaLibertadores'))
    .addSeparator()
    .addItem('Show Available Tags', 'displayTags')
    .addSeparator()
    .addItem('🔧 Test Market Fetch', 'testMarketFetch')
    .addItem('🔍 Debug API Response', 'debugMarketResponse')
    .addToUi();
}

// ============================================
// DEBUG FUNCTIONS
// ============================================

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
