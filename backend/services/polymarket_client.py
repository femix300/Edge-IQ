"""
Polymarket API Client
Handles all interactions with Polymarket's two public APIs:
  - Gamma API: https://gamma-api.polymarket.com  (market listing + detail)
  - CLOB API:  https://clob.polymarket.com       (order book + price history)

No authentication required for read operations.
Follows the same _get_cached / _make_request pattern as bayse_client.py.
"""
import requests
import time
from decouple import config
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)


class PolymarketAPIError(Exception):
    """Custom exception for Polymarket API errors"""
    pass


class PolymarketClient:
    """
    Client for interacting with Polymarket's public APIs.

    Key design decisions for EdgeIQ compatibility:
    - bayse_event_id  = poly_{conditionId}   → Firestore doc ID (no collision with Bayse UUIDs)
    - bayse_market_id = clobTokenIds[0]      → YES token ID, used for order book + price history
    - source          = "polymarket"          → Routes agents and views to this client
    """

    def __init__(self):
        self.gamma_base_url = config(
            'POLYMARKET_GAMMA_URL', default='https://gamma-api.polymarket.com'
        )
        self.clob_base_url = config(
            'POLYMARKET_CLOB_URL', default='https://clob.polymarket.com'
        )
        self.timeout = 15  # seconds — same as BayseClient

    def _make_request(self, base_url, endpoint, params=None):
        """
        Make HTTP GET request with error handling.
        Mirrors BayseClient._make_request() structure.
        """
        url = f"{base_url}{endpoint}"

        try:
            logger.info(f"Polymarket API Request: GET {url}")
            if params:
                logger.info(f"  Params: {params}")

            response = requests.get(
                url=url,
                params=params,
                timeout=self.timeout
            )

            logger.info(f"Polymarket API Response: {response.status_code}")

            if response.status_code >= 400:
                logger.error(f"Polymarket API Error: {response.status_code} - {response.text}")
                raise PolymarketAPIError(
                    f"API returned {response.status_code}: {response.text}"
                )

            return response.json()

        except requests.exceptions.Timeout:
            logger.error(f"Polymarket API Timeout for {endpoint}")
            raise PolymarketAPIError(f"Request to {endpoint} timed out")
        except requests.exceptions.RequestException as e:
            logger.error(f"Polymarket API Request Error: {str(e)}")
            raise PolymarketAPIError(f"Request failed: {str(e)}")

    def _get_cached(self, cache_key, fetch_function, timeout=60):
        """
        Get data from Django cache or fetch and cache it.
        Identical pattern to BayseClient._get_cached().
        """
        data = cache.get(cache_key)

        if data is None:
            data = fetch_function()
            if data is not None:
                cache.set(cache_key, data, timeout)
                logger.info(f"Cached data for key: {cache_key}")
        else:
            logger.info(f"Retrieved from cache: {cache_key}")

        return data

    # ------------------------------------------------------------------ #
    #  Internal helpers                                                    #
    # ------------------------------------------------------------------ #

    def _map_category(self, tags):
        """
        Map Polymarket tags array to EdgeIQ internal categories.
        Tags can be a list of strings OR list of dicts with a 'label' key.
        """
        if not tags:
            return 'other'

        # Normalise to list of lowercase strings
        if tags and isinstance(tags[0], dict):
            tag_strings = [t.get('label', '') for t in tags]
        else:
            tag_strings = tags

        tags_lower = [str(t).lower() for t in tag_strings]

        if any(t in tags_lower for t in ['politics', 'election', 'elections', 'government']):
            return 'politics'
        if any(t in tags_lower for t in ['sports', 'soccer', 'football', 'basketball', 'nba', 'nfl']):
            return 'sports'
        if any(t in tags_lower for t in ['crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'defi']):
            return 'crypto'
        if any(t in tags_lower for t in ['entertainment', 'pop culture', 'awards', 'oscars', 'music']):
            return 'entertainment'
        return 'other'

    def _normalize_market(self, raw: dict) -> dict:
        """
        Convert a raw Polymarket Gamma API market object into the exact
        Firestore document shape that EdgeIQ uses everywhere.

        Firestore field      Polymarket source
        ─────────────────────────────────────────────────────────
        bayse_event_id    ←  poly_{conditionId}
        bayse_market_id   ←  clobTokenIds[0]  (YES token)
        title             ←  question
        description       ←  description
        category          ←  derived from tags[]
        current_price     ←  outcomePrices[0]  (YES price, decimal 0-1)
        implied_probability← current_price * 100
        volume_24h        ←  volume24hr
        total_volume      ←  volume
        liquidity         ←  liquidity
        status            ←  active=true & closed=false → "open"
        opens_at          ←  startDate
        closes_at         ←  endDate
        source            ←  "polymarket"  (hardcoded)
        """
        condition_id = raw.get('conditionId') or raw.get('id', '')
        doc_id = f"poly_{condition_id}"

        # YES price — outcomePrices[0] is always YES
        outcome_prices = raw.get('outcomePrices') or ['0.5', '0.5']
        try:
            yes_price = float(outcome_prices[0])
        except (ValueError, TypeError, IndexError):
            yes_price = 0.5

        # YES token ID — used for CLOB order book and price history calls
        clob_token_ids = raw.get('clobTokenIds') or []
        yes_token_id = clob_token_ids[0] if clob_token_ids else None

        # Volumes — already USD floats from Gamma API
        try:
            total_volume = float(raw.get('volume') or 0)
        except (ValueError, TypeError):
            total_volume = 0.0

        try:
            volume_24h = float(raw.get('volume24hr') or 0)
        except (ValueError, TypeError):
            volume_24h = 0.0

        try:
            liquidity = float(raw.get('liquidity') or 0)
        except (ValueError, TypeError):
            liquidity = 0.0

        # Status
        is_active = raw.get('active', False)
        is_closed = raw.get('closed', True)
        status = 'open' if (is_active and not is_closed) else 'closed'

        # Tags
        tags = raw.get('tags') or []

        return {
            # IDs stored in Bayse-compatible fields so ALL existing code works unchanged
            'bayse_event_id': doc_id,
            'bayse_market_id': yes_token_id,

            # Content
            'title': raw.get('question') or raw.get('title', 'Untitled'),
            'description': raw.get('description') or raw.get('groupItemTitle', ''),
            'category': self._map_category(tags),

            # Price / probability
            'current_price': yes_price,
            'implied_probability': round(yes_price * 100, 1),

            # Volume / liquidity
            'volume_24h': volume_24h,
            'total_volume': total_volume,
            'liquidity': liquidity,

            # Status / dates
            'status': status,
            'opens_at': raw.get('startDate'),
            'closes_at': raw.get('endDate'),
            'resolved_at': raw.get('resolutionTime') if is_closed else None,

            # Signal scoring — will be calculated by agents after scan
            'signal_potential_score': 0,

            # Timestamps — last_scanned_at set by scanner at write time
            'last_scanned_at': None,
            'created_at': raw.get('createdAt'),

            # Source — CRITICAL for routing in quant_analyzer and views
            'source': 'polymarket',

            # Polymarket-specific extras (useful for deep dive / display)
            'external_id': condition_id,
            'slug': raw.get('slug'),
            'image': raw.get('image'),
        }

    # ------------------------------------------------------------------ #
    #  Public API methods                                                  #
    # ------------------------------------------------------------------ #

    def get_all_markets(self, limit=100) -> list:
        """
        Fetch open Polymarket markets and return normalized list.
        GET /markets?closed=false&active=true&limit={limit}
        """
        params = {
            'closed': 'false',
            'active': 'true',
            'limit': min(limit, 100),
        }

        cache_key = f"polymarket_markets_{limit}"

        try:
            raw_data = self._get_cached(
                cache_key,
                lambda: self._make_request(self.gamma_base_url, '/markets', params=params),
                timeout=60
            )
        except PolymarketAPIError as e:
            logger.error(f"get_all_markets failed: {e}")
            return []

        if not raw_data:
            logger.warning("Polymarket get_all_markets returned empty response")
            return []

        # Gamma API returns a list directly — guard against dict wrapper just in case
        markets_list = raw_data if isinstance(raw_data, list) else raw_data.get('data', [])

        normalized = []
        for raw_market in markets_list:
            try:
                normalized.append(self._normalize_market(raw_market))
            except Exception as e:
                logger.warning(
                    f"Failed to normalize market {raw_market.get('conditionId', '?')}: {e}"
                )
                continue

        logger.info(f"Polymarket: fetched and normalized {len(normalized)} markets")
        return normalized

    def get_market_detail(self, condition_id: str) -> dict | None:
        """
        Fetch a single market by conditionId.
        GET /markets/{conditionId}
        """
        cache_key = f"polymarket_market_{condition_id}"

        try:
            raw = self._get_cached(
                cache_key,
                lambda: self._make_request(self.gamma_base_url, f'/markets/{condition_id}'),
                timeout=60
            )
        except PolymarketAPIError as e:
            logger.warning(f"get_market_detail failed for {condition_id}: {e}")
            return None

        if not raw:
            return None

        return self._normalize_market(raw)

    def get_price_history(self, condition_id: str, token_id: str) -> list:
        """
        Fetch YES price history for a market.
        Returns list of {price, timestamp, marketId} dicts — same shape as bayse_client.get_price_history().

        GET /prices-history?market={condition_id}&startTs={unix}&endTs={unix}&fidelity=60

        Args:
            condition_id: Polymarket conditionId (stored in external_id / Firestore doc ID suffix)
            token_id:     YES clobTokenId (stored in bayse_market_id field)
        """
        if not condition_id or not token_id:
            logger.warning("get_price_history: missing condition_id or token_id")
            return []

        # Last 30 days
        end_ts = int(time.time())
        start_ts = end_ts - (30 * 24 * 60 * 60)

        params = {
            'market': condition_id,
            'startTs': start_ts,
            'endTs': end_ts,
            'fidelity': 60,  # hourly resolution
        }

        cache_key = f"polymarket_price_history_{condition_id}"

        try:
            raw = self._get_cached(
                cache_key,
                lambda: self._make_request(self.clob_base_url, '/prices-history', params=params),
                timeout=60
            )
        except PolymarketAPIError as e:
            logger.warning(f"Price history not available for {condition_id}: {e}")
            return []

        if not raw:
            return []

        # CLOB returns {"history": [{"t": unix_ts, "p": 0.62}, ...]}
        history = raw.get('history') if isinstance(raw, dict) else raw

        if not history or not isinstance(history, list):
            return []

        normalized = []
        for point in history:
            try:
                normalized.append({
                    'price': float(point.get('p', 0)),
                    'timestamp': point.get('t'),
                    'marketId': condition_id,   # matches Bayse format for agent compatibility
                })
            except (ValueError, TypeError):
                continue

        logger.info(f"Polymarket: {len(normalized)} price history points for {condition_id}")
        return normalized

    def get_order_book(self, token_id: str) -> dict:
        """
        Fetch order book for a YES outcome token.
        Returns {bids: [{price, quantity}], asks: [{price, quantity}]}
        — same shape as bayse_client.get_order_book().

        GET /book?token_id={token_id}

        Args:
            token_id: YES clobTokenId (stored in bayse_market_id field)
        """
        if not token_id:
            logger.error("get_order_book requires token_id")
            return {}

        params = {'token_id': token_id}
        cache_key = f"polymarket_orderbook_{token_id}"

        try:
            raw = self._get_cached(
                cache_key,
                lambda: self._make_request(self.clob_base_url, '/book', params=params),
                timeout=30
            )
        except PolymarketAPIError as e:
            logger.warning(f"Order book not available for token {token_id}: {e}")
            return {}

        if not raw:
            return {}

        # CLOB returns {"bids": [{"price": "0.62", "size": "100"}, ...], "asks": [...]}
        # Normalise to match Bayse format: {bids: [{price, quantity}], asks: [{price, quantity}]}
        def parse_side(side_list):
            result = []
            for entry in (side_list or []):
                try:
                    result.append({
                        'price': float(entry.get('price', 0)),
                        'quantity': float(entry.get('size', 0)),
                    })
                except (ValueError, TypeError):
                    continue
            return result

        return {
            'bids': parse_side(raw.get('bids', [])),
            'asks': parse_side(raw.get('asks', [])),
        }


# Global instance — mirrors bayse_client singleton pattern
polymarket_client = PolymarketClient()
