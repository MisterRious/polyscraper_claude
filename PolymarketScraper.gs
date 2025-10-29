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
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    return data;
  } catch (error) {
    Logger.log('Error fetching markets: ' + error);
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
    Logger.log('Markets is not an array:', markets);
    SpreadsheetApp.getUi().alert('No markets found or invalid response format');
    return;
  }

  if (markets.length === 0) {
    SpreadsheetApp.getUi().alert('No markets found with the specified filters');
    return;
  }

  // Populate data
  const rows = markets.map(market => {
    const outcomes = market.outcomes || market.tokens || [];
    const outcomesText = outcomes.map(o => o.outcome || o).join(', ');

    // Get current prices (probabilities)
    const prices = market.outcomePrices || [];
    const pricesText = prices.map(p => `${(p * 100).toFixed(1)}%`).join(', ');

    // Get tags
    const tags = market.tags || [];
    const tagsText = tags.map(t => t.label || t).join(', ');

    // Format dates
    const startDate = market.startDate ? new Date(market.startDate) : '';
    const endDate = market.endDate ? new Date(market.endDate) : '';

    // Determine status
    let status = 'Active';
    if (market.closed) status = 'Closed';
    else if (market.archived) status = 'Archived';
    else if (!market.active) status = 'Inactive';

    return [
      market.question || market.title || '',
      market.description || '',
      market.slug || '',
      outcomesText,
      pricesText,
      market.volume || 0,
      market.liquidity || 0,
      startDate,
      endDate,
      status,
      tagsText,
      market.id || market.market_id || '',
      market.conditionId || market.condition_id || ''
    ];
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

  // Add timestamp
  sheet.getRange(1, 1).setValue(`Last updated: ${new Date().toLocaleString()}`);

  SpreadsheetApp.getUi().alert(`Successfully fetched ${markets.length} markets!`);
}

/**
 * Fetch Copa Libertadores markets specifically
 * Note: You'll need to find the correct tag ID for Copa Libertadores
 */
function fetchCopaLibertadores() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // Search for markets with "Copa Libertadores" in the question
  // Since we don't have the exact tag ID, we'll fetch all soccer markets
  // and filter manually

  const allMarkets = getMarkets({
    closed: false,
    active: true,
    limit: 1000 // Fetch more to increase chances of finding Copa Libertadores
  });

  // Filter for Copa Libertadores
  const copaMarkets = allMarkets.filter(market => {
    const question = (market.question || '').toLowerCase();
    const description = (market.description || '').toLowerCase();
    const tags = (market.tags || []).map(t => (t.label || t).toLowerCase());

    return question.includes('copa libertadores') ||
           description.includes('copa libertadores') ||
           tags.some(tag => tag.includes('copa libertadores'));
  });

  displayMarkets(sheet, copaMarkets);
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
    .addItem('Fetch Markets', 'fetchPolymarketData')
    .addItem('Fetch Copa Libertadores', 'fetchCopaLibertadores')
    .addItem('Show Available Tags', 'displayTags')
    .addSeparator()
    .addItem('Refresh Data', 'fetchPolymarketData')
    .addToUi();
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
