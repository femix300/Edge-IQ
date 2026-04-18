"""
Bayse API Client
Handles all interactions with the Bayse prediction market API
"""
import requests
import hmac
import hashlib
import time
from decimal import Decimal
from decouple import config
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)


class BayseAPIError(Exception):
    """Custom exception for Bayse API errors"""
    pass


class BayseClient:
    """
    Client for interacting with Bayse API
    Docs: https://docs.bayse.markets/
    """
    
    def __init__(self):
        self.base_url = config('BAYSE_API_BASE_URL', default='https://relay.bayse.markets/')
        self.public_key = config('BAYSE_PUBLIC_KEY', default='')
        self.secret_key = config('BAYSE_SECRET_KEY', default='')
        self.timeout = 10  # seconds
        
    def _get_headers(self, require_auth=False):
        """Generate headers for API requests"""
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
        
        if self.public_key:
            headers['X-Public-Key'] = self.public_key
            
        # For write endpoints, add HMAC signature
        if require_auth and self.secret_key:
            timestamp = str(int(time.time()))
            # Implement HMAC signing if needed for write operations
            pass
            
        return headers
    
    def _make_request(self, method, endpoint, params=None, data=None, require_auth=False):
        """
        Make HTTP request to Bayse API with error handling and retry logic
        """
        url = f"{self.base_url}{endpoint}"
        headers = self._get_headers(require_auth=require_auth)
        
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                json=data,
                timeout=self.timeout
            )
            
            # Log the request
            logger.info(f"Bayse API {method} {endpoint} - Status: {response.status_code}")
            
            # Check for errors
            if response.status_code >= 400:
                logger.error(f"Bayse API Error: {response.status_code} - {response.text}")
                raise BayseAPIError(f"API returned {response.status_code}: {response.text}")
            
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
    
    def get_all_events(self, status='active', category=None, limit=100):
        """
        Fetch all prediction market events
        
        Args:
            status: 'active', 'resolved', 'cancelled', or None for all
            category: Filter by category (optional)
            limit: Max number of events to return
            
        Returns:
            List of event objects
        """
        params = {'limit': limit}
        
        if status:
            params['status'] = status
        if category:
            params['category'] = category
        
        cache_key = f"bayse_events_{status}_{category}_{limit}"
        
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
            Event object with full details and markets
        """
        cache_key = f"bayse_event_{event_id}"
        
        return self._get_cached(
            cache_key,
            lambda: self._make_request('GET', f'/v1/pm/events/{event_id}'),
            timeout=60
        )
    
    def get_price_history(self, event_id, market_id=None, interval='1h', limit=100):
        """
        Get historical price data for charting and analysis
        
        Args:
            event_id: Bayse event ID
            market_id: Specific market ID (optional)
            interval: Time interval ('1m', '5m', '1h', '1d')
            limit: Number of data points
            
        Returns:
            List of price points with timestamp, price, volume
        """
        params = {
            'interval': interval,
            'limit': limit
        }
        
        if market_id:
            params['market_id'] = market_id
        
        cache_key = f"bayse_price_history_{event_id}_{market_id}_{interval}_{limit}"
        
        return self._get_cached(
            cache_key,
            lambda: self._make_request('GET', f'/v1/pm/events/{event_id}/price-history', params=params),
            timeout=60
        )
    
    def get_ticker(self, market_id):
        """
        Get current ticker data (price, volume, 24h change)
        
        Args:
            market_id: Bayse market ID
            
        Returns:
            Ticker object with current price and volume data
        """
        cache_key = f"bayse_ticker_{market_id}"
        
        # Shorter cache for live data
        return self._get_cached(
            cache_key,
            lambda: self._make_request('GET', f'/v1/pm/markets/{market_id}/ticker'),
            timeout=30
        )
    
    def get_order_book(self, event_id, market_id=None, depth=20):
        """
        Get order book data (bids and asks)
        
        Args:
            event_id: Bayse event ID
            market_id: Specific market ID (optional)
            depth: Number of price levels to return
            
        Returns:
            Order book with bids and asks arrays
        """
        params = {'depth': depth}
        
        if market_id:
            params['market_id'] = market_id
        
        cache_key = f"bayse_orderbook_{event_id}_{market_id}_{depth}"
        
        return self._get_cached(
            cache_key,
            lambda: self._make_request('GET', '/v1/pm/books', params=params),
            timeout=30
        )
    
    def get_recent_trades(self, market_id, limit=50):
        """
        Get recent trade history
        
        Args:
            market_id: Bayse market ID
            limit: Number of trades to return
            
        Returns:
            List of recent trades with price, size, timestamp
        """
        params = {'limit': limit, 'market_id': market_id}
        
        cache_key = f"bayse_trades_{market_id}_{limit}"
        
        return self._get_cached(
            cache_key,
            lambda: self._make_request('GET', '/v1/pm/trades', params=params),
            timeout=30
        )
    
    def get_quote(self, event_id, market_id, side, size):
        """
        Get a quote for a potential trade
        
        Args:
            event_id: Bayse event ID
            market_id: Market ID
            side: 'buy' or 'sell'
            size: Amount to trade
            
        Returns:
            Quote with expected price and fees
        """
        data = {
            'market_id': market_id,
            'side': side,
            'size': size
        }
        
        # Don't cache quotes - always get fresh
        return self._make_request('POST', f'/v1/pm/events/{event_id}/markets/{market_id}/quote', data=data)
    
    # ==================== PORTFOLIO ENDPOINTS ====================
    
    def get_portfolio(self, user_id=None):
        """
        Get user's portfolio positions
        
        Args:
            user_id: User identifier (optional)
            
        Returns:
            Portfolio data with open positions
        """
        params = {}
        if user_id:
            params['user_id'] = user_id
            
        return self._make_request('GET', '/v1/pm/portfolio', params=params, require_auth=True)
    
    def get_order_history(self, user_id=None, status=None, limit=50):
        """
        Get user's order history
        
        Args:
            user_id: User identifier (optional)
            status: Filter by order status
            limit: Number of orders to return
            
        Returns:
            List of historical orders
        """
        params = {'limit': limit}
        
        if user_id:
            params['user_id'] = user_id
        if status:
            params['status'] = status
            
        return self._make_request('GET', '/v1/pm/orders', params=params, require_auth=True)
    
    # ==================== HELPER METHODS ====================
    
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
    
    def get_market_summary(self, event_id):
        """
        Get a complete summary of a market including all data points
        
        Returns:
            Dictionary with event details, price history, order book, recent trades
        """
        try:
            event = self.get_event_detail(event_id)
            
            # Extract market ID from event
            market_id = None
            if event.get('markets') and len(event['markets']) > 0:
                market_id = event['markets'][0].get('id')
            
            summary = {
                'event': event,
                'price_history': None,
                'ticker': None,
                'order_book': None,
                'recent_trades': None,
            }
            
            if market_id:
                summary['price_history'] = self.get_price_history(event_id, market_id)
                summary['ticker'] = self.get_ticker(market_id)
                summary['order_book'] = self.get_order_book(event_id, market_id)
                summary['recent_trades'] = self.get_recent_trades(market_id)
            
            return summary
            
        except Exception as e:
            logger.error(f"Error fetching market summary for {event_id}: {str(e)}")
            raise


# Global instance
bayse_client = BayseClient()