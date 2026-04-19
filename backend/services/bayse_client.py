"""
Bayse API Client
Handles all interactions with the Bayse prediction market API
"""
import requests
from decimal import Decimal
from decouple import config
import logging

logger = logging.getLogger(__name__)


def _get_cache():
    """Lazy import to avoid Django setup issues"""
    from django.core.cache import cache
    return cache


class BayseAPIError(Exception):
    """Custom exception for Bayse API errors"""
    pass


class BayseClient:
    """
    Client for interacting with Bayse API
    Base URL: https://relay.bayse.markets
    """

    def __init__(self):
        self.base_url = config('BAYSE_API_BASE_URL',
                               default='https://relay.bayse.markets')
        self.public_key = config('BAYSE_PUBLIC_KEY', default='')
        self.secret_key = config('BAYSE_SECRET_KEY', default='')
        self.timeout = 15  # seconds

    def _get_headers(self):
        """Generate headers for API requests"""
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }

        # Public key is optional - if not provided, get public data only
        if self.public_key:
            headers['X-Public-Key'] = self.public_key

        return headers

    def _make_request(self, method, endpoint, params=None, data=None):
        """
        Make HTTP request to Bayse API with error handling
        """
        url = f"{self.base_url}{endpoint}"
        headers = self._get_headers()

        try:
            logger.info(f"Bayse API Request: {method} {url}")
            if params:
                logger.info(f"  Params: {params}")

            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                json=data,
                timeout=self.timeout
            )

            logger.info(f"Bayse API Response: {response.status_code}")

            # Check for errors
            if response.status_code >= 400:
                logger.error(
                    f"Bayse API Error: {response.status_code} - {response.text}")
                raise BayseAPIError(
                    f"API returned {response.status_code}: {response.text}")

            return response.json()

        except requests.exceptions.Timeout:
            logger.error(f"Bayse API Timeout for {endpoint}")
            raise BayseAPIError(f"Request to {endpoint} timed out")
        except requests.exceptions.RequestException as e:
            logger.error(f"Bayse API Request Error: {str(e)}")
            raise BayseAPIError(f"Request failed: {str(e)}")

    def _get_cached(self, cache_key, fetch_function, timeout=60):
        """
        Get data from cache or fetch and cache it
        """
        cache = _get_cache()
        data = cache.get(cache_key)

        if data is None:
            data = fetch_function()
            if data is not None:
                cache.set(cache_key, data, timeout)
                logger.info(f"Cached data for key: {cache_key}")
        else:
            logger.info(f"Retrieved from cache: {cache_key}")

        return data

    # ==================== MARKET DATA ENDPOINTS ====================

    def get_all_events(self, status='open', category=None, page=1, size=50):
        """
        Fetch all prediction market events

        Args:
            status: 'open', 'closed', 'resolved', 'cancelled', 'paused', 'draft'
            category: Filter by category (optional)
            page: Page number (default 1)
            size: Results per page (default 50, max 100)

        Returns:
            Dictionary with 'events' and 'pagination'
        """
        params = {
            'page': page,
            'size': min(size, 100),  # Cap at 100
        }

        if status:
            params['status'] = status
        if category:
            params['category'] = category

        cache_key = f"bayse_events_{status}_{category}_{page}_{size}"

        return self._get_cached(
            cache_key,
            lambda: self._make_request('GET', '/v1/pm/events', params=params),
            timeout=60
        )

    def get_event_detail(self, event_id):
        """
        Get detailed information about a specific event

        Args:
            event_id: Bayse event ID

        Returns:
            Event object with full details
        """
        cache_key = f"bayse_event_{event_id}"

        return self._get_cached(
            cache_key,
            lambda: self._make_request('GET', f'/v1/pm/events/{event_id}'),
            timeout=60
        )

    def calculate_implied_probability(self, price):
        """
        Convert price to implied probability

        Args:
            price: Current market price (0-1 range)

        Returns:
            Probability as percentage (0-100)
        """
        if isinstance(price, str):
            price = Decimal(price)
        return float(price * 100)


# Global instance
bayse_client = BayseClient()
