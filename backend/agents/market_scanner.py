"""
Agent 01: Market Scanner
Fetches and filters active markets from Bayse API
"""
from services.bayse_client import bayse_client, BayseAPIError
from markets.models import Market
from django.utils import timezone
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


def scan_markets(status='active', min_volume=1000, min_liquidity=500, max_results=20):
    """
    Scan Bayse for active markets and store in database
    
    Args:
        status: Market status filter ('active', 'resolved', etc.)
        min_volume: Minimum 24h volume threshold
        min_liquidity: Minimum liquidity threshold
        max_results: Maximum number of markets to return
        
    Returns:
        List of Market objects ranked by signal potential
    """
    try:
        logger.info(f"Starting market scan - Status: {status}, Min Volume: {min_volume}")
        
        # Fetch events from Bayse API
        events_data = bayse_client.get_all_events(status=status, limit=100)
        
        if not events_data:
            logger.warning("No events returned from Bayse API")
            return []
        
        # Handle different response structures
        events = events_data if isinstance(events_data, list) else events_data.get('events', [])
        
        logger.info(f"Fetched {len(events)} events from Bayse")
        
        markets_created = []
        
        for event in events:
            try:
                # Extract event data
                event_id = event.get('id')
                title = event.get('title', 'Untitled Event')
                description = event.get('description', '')
                category = map_category(event.get('category', 'other'))
                
                # Get market data (events can have multiple markets, we'll use the first one)
                markets_data = event.get('markets', [])
                if not markets_data:
                    continue
                
                market_data = markets_data[0]  # Primary market
                market_id = market_data.get('id')
                
                # Extract price and volume data
                current_price = Decimal(str(market_data.get('last_price', 0.5)))
                volume_24h = Decimal(str(market_data.get('volume_24h', 0)))
                total_volume = Decimal(str(market_data.get('total_volume', 0)))
                liquidity = Decimal(str(market_data.get('liquidity', 0)))
                
                # Filter by volume and liquidity
                if volume_24h < min_volume or liquidity < min_liquidity:
                    continue
                
                # Parse timestamps
                closes_at = parse_timestamp(market_data.get('closes_at'))
                opens_at = parse_timestamp(market_data.get('opens_at'))
                
                # Calculate implied probability
                implied_prob = bayse_client.calculate_implied_probability(current_price)
                
                # Calculate signal potential score
                signal_score = calculate_signal_potential(
                    volume_24h=volume_24h,
                    liquidity=liquidity,
                    closes_at=closes_at
                )
                
                # Create or update market in database
                market, created = Market.objects.update_or_create(
                    bayse_event_id=event_id,
                    defaults={
                        'bayse_market_id': market_id,
                        'title': title,
                        'description': description,
                        'category': category,
                        'current_price': current_price,
                        'implied_probability': implied_prob,
                        'volume_24h': volume_24h,
                        'total_volume': total_volume,
                        'liquidity': liquidity,
                        'status': status,
                        'opens_at': opens_at,
                        'closes_at': closes_at,
                        'signal_potential_score': signal_score,
                        'last_scanned_at': timezone.now(),
                    }
                )
                
                markets_created.append(market)
                action = "Created" if created else "Updated"
                logger.info(f"{action} market: {title} (Score: {signal_score})")
                
            except Exception as e:
                logger.error(f"Error processing event {event.get('id')}: {str(e)}")
                continue
        
        # Get top markets by signal potential
        top_markets = Market.objects.filter(
            status='active'
        ).order_by('-signal_potential_score')[:max_results]
        
        logger.info(f"Market scan complete. {len(markets_created)} markets processed, {len(top_markets)} top markets returned")
        
        return list(top_markets)
        
    except BayseAPIError as e:
        logger.error(f"Bayse API error during market scan: {str(e)}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error during market scan: {str(e)}")
        return []


def calculate_signal_potential(volume_24h, liquidity, closes_at):
    """
    Calculate signal potential score for ranking markets
    
    Higher score = more likely to have good trading signals
    
    Args:
        volume_24h: 24-hour trading volume
        liquidity: Market liquidity
        closes_at: Market closing timestamp
        
    Returns:
        Signal potential score (0-100)
    """
    try:
        score = 0
        
        # Volume component (max 40 points)
        volume_score = min(40, float(volume_24h) / 1000)
        score += volume_score
        
        # Liquidity component (max 30 points)
        liquidity_score = min(30, float(liquidity) / 1000)
        score += liquidity_score
        
        # Time remaining component (max 30 points)
        if closes_at:
            time_remaining_hours = (closes_at - timezone.now()).total_seconds() / 3600
            
            # Peak signal potential is 24-72 hours before close
            if 24 <= time_remaining_hours <= 72:
                time_score = 30
            elif time_remaining_hours > 72:
                time_score = 20
            elif time_remaining_hours < 24:
                time_score = max(0, 15 - (24 - time_remaining_hours))  # Decreasing
            else:
                time_score = 0
            
            score += time_score
        
        return round(score, 2)
        
    except Exception as e:
        logger.error(f"Error calculating signal potential: {str(e)}")
        return 0


def map_category(bayse_category):
    """
    Map Bayse categories to our internal categories
    
    Args:
        bayse_category: Category from Bayse API
        
    Returns:
        Standardized category
    """
    category_map = {
        'cryptocurrency': 'crypto',
        'crypto': 'crypto',
        'bitcoin': 'crypto',
        'ethereum': 'crypto',
        'sports': 'sports',
        'football': 'sports',
        'basketball': 'sports',
        'soccer': 'sports',
        'politics': 'politics',
        'elections': 'politics',
        'entertainment': 'entertainment',
        'movies': 'entertainment',
        'music': 'entertainment',
    }
    
    category_lower = str(bayse_category).lower()
    return category_map.get(category_lower, 'other')


def parse_timestamp(timestamp_str):
    """
    Parse timestamp string to datetime object
    
    Args:
        timestamp_str: ISO format timestamp string
        
    Returns:
        datetime object or None
    """
    if not timestamp_str:
        return None
    
    try:
        from dateutil import parser
        return parser.parse(timestamp_str)
    except Exception:
        return None


def get_top_markets(limit=20, category=None):
    """
    Get top markets from database (cached results)
    
    Args:
        limit: Number of markets to return
        category: Filter by category (optional)
        
    Returns:
        QuerySet of top markets
    """
    queryset = Market.objects.filter(status='active')
    
    if category:
        queryset = queryset.filter(category=category)
    
    return queryset.order_by('-signal_potential_score')[:limit]
