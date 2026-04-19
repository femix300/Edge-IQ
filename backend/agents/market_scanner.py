"""
Agent 01: Market Scanner
Fetches and filters active markets from Bayse API
"""
from services.bayse_client import bayse_client, BayseAPIError
from markets.models import Market
from django.utils import timezone
from decimal import Decimal
from dateutil import parser
import logging

logger = logging.getLogger(__name__)


def scan_markets(status='open', min_volume=0, min_liquidity=0, max_results=20):
    """
    Scan Bayse for active markets and store in database
    
    Args:
        status: Market status filter ('open', 'closed', etc.)
        min_volume: Minimum total volume threshold
        min_liquidity: Minimum liquidity threshold
        max_results: Maximum number of markets to return
        
    Returns:
        List of Market objects ranked by signal potential
    """
    try:
        logger.info(f"=" * 70)
        logger.info(f"STARTING MARKET SCAN")
        logger.info(f"  Status: {status}")
        logger.info(f"  Min Volume: {min_volume}")
        logger.info(f"  Min Liquidity: {min_liquidity}")
        logger.info(f"=" * 70)
        
        # Fetch events from Bayse API
        response = bayse_client.get_all_events(status=status, size=50)
        
        logger.info(f"\n📡 Bayse API Response:")
        logger.info(f"  Type: {type(response)}")
        logger.info(f"  Keys: {list(response.keys()) if isinstance(response, dict) else 'N/A'}")
        
        if not response:
            logger.warning("❌ No data returned from Bayse API")
            return []
        
        # Extract events array
        events = response.get('events', [])
        pagination = response.get('pagination', {})
        
        logger.info(f"\n📊 Found {len(events)} events")
        logger.info(f"  Pagination: Page {pagination.get('page')}/{pagination.get('lastPage')}, Total: {pagination.get('totalCount')}")
        
        if not events:
            logger.warning("❌ Events array is empty")
            return []
        
        markets_created = []
        skipped = 0
        
        for idx, event in enumerate(events, 1):
            try:
                logger.info(f"\n{'─' * 70}")
                logger.info(f"Event {idx}/{len(events)}")
                logger.info(f"{'─' * 70}")
                
                # Extract event data
                event_id = event.get('id')
                title = event.get('title', 'Untitled Event')
                description = event.get('description', '')
                category = map_category(event.get('category', 'other'))
                
                logger.info(f"📌 Title: {title}")
                logger.info(f"   ID: {event_id}")
                logger.info(f"   Category: {category}")
                
                # Extract volume and liquidity from event level
                total_volume = Decimal(str(event.get('totalVolume', 0)))
                liquidity = Decimal(str(event.get('liquidity', 0)))
                
                logger.info(f"   Total Volume: {total_volume}")
                logger.info(f"   Liquidity: {liquidity}")
                
                # Filter by volume and liquidity
                if total_volume < min_volume:
                    logger.info(f"   ⏭️  Skipped: volume {total_volume} < {min_volume}")
                    skipped += 1
                    continue
                
                if liquidity < min_liquidity:
                    logger.info(f"   ⏭️  Skipped: liquidity {liquidity} < {min_liquidity}")
                    skipped += 1
                    continue
                
                # Get markets array
                markets_data = event.get('markets', [])
                
                if not markets_data:
                    logger.info(f"   ⚠️  No markets found for this event")
                    skipped += 1
                    continue
                
                logger.info(f"   Markets: {len(markets_data)}")
                
                # Use first market
                market_data = markets_data[0]
                market_id = market_data.get('id')
                
                # Get price from outcome1Price (YES price)
                current_price = Decimal(str(market_data.get('outcome1Price', 0.5)))
                
                logger.info(f"   Market ID: {market_id}")
                logger.info(f"   Current Price: {current_price}")
                
                # Parse timestamps
                closing_date = event.get('closingDate')
                resolution_date = event.get('resolutionDate')
                opening_date = event.get('openingDate')
                
                closes_at = parse_timestamp(closing_date)
                resolved_at = parse_timestamp(resolution_date)
                opens_at = parse_timestamp(opening_date)
                
                if closes_at:
                    logger.info(f"   Closes: {closes_at}")
                
                # Calculate implied probability
                implied_prob = bayse_client.calculate_implied_probability(current_price)
                
                # Calculate signal potential score
                signal_score = calculate_signal_potential(
                    volume=total_volume,
                    liquidity=liquidity,
                    closes_at=closes_at
                )
                
                logger.info(f"   Implied Probability: {implied_prob}%")
                logger.info(f"   Signal Score: {signal_score}")
                
                # Create or update market in database
                market, created = Market.objects.update_or_create(
                    bayse_event_id=str(event_id),
                    defaults={
                        'bayse_market_id': str(market_id) if market_id else '',
                        'title': title,
                        'description': description,
                        'category': category,
                        'current_price': current_price,
                        'implied_probability': implied_prob,
                        'volume_24h': 0,  # Bayse doesn't provide 24h volume
                        'total_volume': total_volume,
                        'liquidity': liquidity,
                        'status': status if status else event.get('status', 'open'),
                        'opens_at': opens_at,
                        'closes_at': closes_at,
                        'resolved_at': resolved_at,
                        'signal_potential_score': signal_score,
                        'last_scanned_at': timezone.now(),
                    }
                )
                
                markets_created.append(market)
                action = "✅ CREATED" if created else "🔄 UPDATED"
                logger.info(f"   {action} in database")
                
            except Exception as e:
                logger.error(f"❌ Error processing event {event.get('id', 'unknown')}: {str(e)}")
                import traceback
                traceback.print_exc()
                skipped += 1
                continue
        
        # Summary
        logger.info(f"\n{'=' * 70}")
        logger.info(f"SCAN COMPLETE")
        logger.info(f"  Events processed: {len(events)}")
        logger.info(f"  Markets created/updated: {len(markets_created)}")
        logger.info(f"  Skipped: {skipped}")
        logger.info(f"{'=' * 70}\n")
        
        # Get top markets by signal potential
        top_markets = Market.objects.filter(
            status__in=['open', 'active']
        ).order_by('-signal_potential_score')[:max_results]
        
        logger.info(f"Returning {len(top_markets)} top markets\n")
        
        return list(top_markets)
        
    except BayseAPIError as e:
        logger.error(f"Bayse API error during market scan: {str(e)}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error during market scan: {str(e)}")
        import traceback
        traceback.print_exc()
        return []


def calculate_signal_potential(volume, liquidity, closes_at):
    """
    Calculate signal potential score for ranking markets
    
    Args:
        volume: Total trading volume
        liquidity: Market liquidity
        closes_at: Market closing timestamp
        
    Returns:
        Signal potential score (0-100)
    """
    try:
        score = 0
        
        # Volume component (max 40 points)
        volume_score = min(40, float(volume) / 5000)
        score += volume_score
        
        # Liquidity component (max 30 points)
        liquidity_score = min(30, float(liquidity) / 2000)
        score += liquidity_score
        
        # Time remaining component (max 30 points)
        if closes_at:
            time_remaining_hours = (closes_at - timezone.now()).total_seconds() / 3600
            
            # Peak signal potential is 24-168 hours (1-7 days) before close
            if 24 <= time_remaining_hours <= 168:
                time_score = 30
            elif time_remaining_hours > 168:
                time_score = 20
            elif time_remaining_hours > 0:
                time_score = max(0, time_remaining_hours / 24 * 30)
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
    """
    if not bayse_category:
        return 'other'
    
    category_lower = str(bayse_category).lower()
    
    category_map = {
        'crypto': 'crypto',
        'cryptocurrency': 'crypto',
        'sports': 'sports',
        'football': 'sports',
        'soccer': 'sports',
        'politics': 'politics',
        'entertainment': 'entertainment',
    }
    
    return category_map.get(category_lower, 'other')


def parse_timestamp(timestamp_str):
    """
    Parse ISO 8601 timestamp string to datetime object
    """
    if not timestamp_str:
        return None
    
    try:
        return parser.parse(timestamp_str)
    except Exception as e:
        logger.error(f"Error parsing timestamp '{timestamp_str}': {str(e)}")
        return None


def get_top_markets(limit=20, category=None):
    """
    Get top markets from database
    """
    queryset = Market.objects.filter(status__in=['open', 'active'])
    
    if category:
        queryset = queryset.filter(category=category)
    
    return queryset.order_by('-signal_potential_score')[:limit]