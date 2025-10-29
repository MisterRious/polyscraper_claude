# Polymarket API Reference

## Base URL
```
https://gamma-api.polymarket.com
```

## Endpoints

### 1. Get Markets
```
GET /markets
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Filter by active status |
| `closed` | boolean | Filter by closed status |
| `archived` | boolean | Filter by archived status |
| `tag` | string | Filter by tag ID |
| `limit` | integer | Number of results (default: 100, max: 500) |
| `offset` | integer | Pagination offset |
| `clob_token_ids` | string | Filter by token IDs |
| `condition_ids` | string | Filter by condition IDs |
| `start_date_min` | datetime | Minimum start date |
| `start_date_max` | datetime | Maximum start date |
| `end_date_min` | datetime | Minimum end date |
| `end_date_max` | datetime | Maximum end date |
| `volume_num_min` | number | Minimum volume |
| `volume_num_max` | number | Maximum volume |
| `liquidity_num_min` | number | Minimum liquidity |
| `liquidity_num_max` | number | Maximum liquidity |

**Example Request:**
```
GET https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=10
```

**Example Response:**
```json
[
  {
    "id": "0x1234...",
    "question": "Will Flamengo win the Copa Libertadores 2025?",
    "slug": "will-flamengo-win-copa-libertadores-2025",
    "description": "This market will resolve to Yes if...",
    "outcomes": ["Yes", "No"],
    "outcomePrices": [0.355, 0.645],
    "volume": 125430.50,
    "liquidity": 45000.00,
    "startDate": "2025-01-15T00:00:00Z",
    "endDate": "2025-11-29T23:59:59Z",
    "active": true,
    "closed": false,
    "archived": false,
    "new": false,
    "featured": true,
    "submitted_by": "polymarket",
    "enableOrderBook": true,
    "orderBook": "...",
    "orderMinSize": 10,
    "volumeNum": 125430.50,
    "liquidityNum": 45000.00,
    "endDateIso": "2025-11-29T23:59:59.000Z",
    "startDateIso": "2025-01-15T00:00:00.000Z",
    "image": "https://...",
    "icon": "https://...",
    "tags": [
      {
        "id": "sports",
        "label": "Sports",
        "slug": "sports"
      },
      {
        "id": "soccer",
        "label": "Soccer",
        "slug": "soccer"
      }
    ],
    "conditionId": "0xabcd...",
    "marketMakerAddress": "0x...",
    "clobTokenIds": ["123...", "456..."],
    "tokens": [
      {
        "token_id": "123...",
        "outcome": "Yes",
        "price": 0.355
      },
      {
        "token_id": "456...",
        "outcome": "No",
        "price": 0.645
      }
    ],
    "rewards": {
      "min_size": 10,
      "max_spread": 0.02,
      "event_start_date": "2025-11-29T00:00:00.000Z",
      "event_end_date": "2025-11-29T23:59:59.000Z"
    }
  }
]
```

### 2. Get Market by ID
```
GET /markets/{marketId}
```

**Example Request:**
```
GET https://gamma-api.polymarket.com/markets/0x1234...
```

**Response:** Single market object (same structure as above)

### 3. Get Events
```
GET /events
```

Events are collections of related markets (e.g., "Copa Libertadores 2025" might be an event containing multiple match markets).

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | boolean | Filter by active status |
| `closed` | boolean | Filter by closed status |
| `archived` | boolean | Filter by archived status |
| `limit` | integer | Number of results |
| `offset` | integer | Pagination offset |

**Example Request:**
```
GET https://gamma-api.polymarket.com/events?active=true&limit=10
```

**Example Response:**
```json
[
  {
    "id": "copa-libertadores-2025",
    "title": "Copa Libertadores 2025",
    "slug": "copa-libertadores-2025",
    "description": "Markets for the 2025 Copa Libertadores tournament",
    "markets": ["0x1234...", "0x5678..."],
    "marketCount": 25,
    "volume": 2500000.00,
    "liquidity": 500000.00,
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-11-29T23:59:59Z",
    "active": true,
    "closed": false,
    "archived": false,
    "tags": ["sports", "soccer"],
    "image": "https://...",
    "icon": "https://..."
  }
]
```

### 4. Get Tags
```
GET /tags
```

**Example Request:**
```
GET https://gamma-api.polymarket.com/tags
```

**Example Response:**
```json
[
  {
    "id": "sports",
    "label": "Sports",
    "slug": "sports"
  },
  {
    "id": "soccer",
    "label": "Soccer",
    "slug": "soccer"
  },
  {
    "id": "copa-libertadores",
    "label": "Copa Libertadores",
    "slug": "copa-libertadores"
  }
]
```

## Market Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique market identifier |
| `question` | string | The market question |
| `slug` | string | URL-friendly identifier |
| `description` | string | Detailed market description |
| `outcomes` | array | Possible outcomes (e.g., ["Yes", "No"]) |
| `outcomePrices` | array | Current probabilities for each outcome (0-1) |
| `volume` | number | Total trading volume in USD |
| `liquidity` | number | Available liquidity in USD |
| `startDate` | datetime | When the market opened |
| `endDate` | datetime | When the market closes/resolves |
| `active` | boolean | Whether the market is currently active |
| `closed` | boolean | Whether the market is closed for trading |
| `archived` | boolean | Whether the market is archived |
| `new` | boolean | Whether this is a newly created market |
| `featured` | boolean | Whether the market is featured |
| `enableOrderBook` | boolean | Whether CLOB trading is enabled |
| `tags` | array | Categories/tags for the market |
| `conditionId` | string | Blockchain condition identifier |
| `clobTokenIds` | array | ERC1155 token IDs for outcomes |
| `tokens` | array | Detailed token information for each outcome |

## Rate Limits

- **Free Tier**: 1,000 calls per hour
- **No authentication required** for public market data
- **Premium tiers** available for higher volume

## Error Responses

```json
{
  "error": "Invalid tag ID",
  "message": "The provided tag ID does not exist",
  "statusCode": 400
}
```

Common status codes:
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (market/event doesn't exist)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Best Practices

1. **Cache Results**: Don't fetch the same data repeatedly
2. **Use Filters**: Always use filters to reduce response size
3. **Pagination**: Use `limit` and `offset` for large datasets
4. **Error Handling**: Always check for errors and handle them gracefully
5. **Rate Limiting**: Implement exponential backoff if you hit rate limits

## Example API Calls

### Get all active soccer markets
```
GET /markets?tag=soccer&active=true&closed=false&limit=100
```

### Get Copa Libertadores event with all markets
```
GET /events?tag=copa-libertadores&active=true
```

### Get markets ending in the next 7 days
```javascript
const now = new Date();
const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

GET /markets?end_date_min=${now.toISOString()}&end_date_max=${in7Days.toISOString()}
```

### Get high-volume markets (>$100k)
```
GET /markets?volume_num_min=100000&active=true&limit=50
```

## Additional Resources

- **Official Docs**: [docs.polymarket.com](https://docs.polymarket.com)
- **GitHub Examples**: [github.com/Polymarket](https://github.com/Polymarket)
- **API Status**: Check if the API is operational by visiting the base URL
- **Discord**: Join Polymarket's Discord for developer support

## Testing the API

You can test the API directly in your browser or using curl:

```bash
# Test basic connectivity
curl https://gamma-api.polymarket.com/markets?limit=1

# Get active markets
curl "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=5"

# Get markets by tag
curl "https://gamma-api.polymarket.com/markets?tag=soccer&limit=10"

# Get all tags
curl https://gamma-api.polymarket.com/tags
```

## Notes

- All timestamps are in ISO 8601 format (UTC)
- Prices are represented as decimals (0-1), where 1 = 100%
- Volume and liquidity are in USD
- The API returns JSON by default
- No API key is required for read-only access
- Market IDs are blockchain-based (Ethereum addresses or hashes)

---

**Last Updated**: October 2025

For the most current API documentation, visit [docs.polymarket.com](https://docs.polymarket.com).
