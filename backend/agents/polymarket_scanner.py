"""
Agent 01b: Polymarket Market Scanner
=====================================
Mirror of agents/market_scanner.py for Polymarket data source.

Key differences from market_scanner.py:
- Uses polymarket_client instead of bayse_client
- Firestore doc ID format: poly_{conditionId}  (no UUID collision with Bayse)
- Every market doc gets "source": "polymarket"
- bayse_event_id = poly_{conditionId}   (so existing code reading this field works)
- bayse_market_id = YES clobTokenId     (used for order book routing in quant_analyzer)
- No min_volume / min_liquidity filters by default (Polymarket volumes differ in scale)
- calculate_signal_potential() reused directly from market_scanner
"""

from services.polymarket_client import polymarket_client, PolymarketAPIError
from django.utils import timezone
from dateutil import parser
from utils.firebase_client import fs, Collection
import logging

logger = logging.getLogger(__name__)


def bulk_sync_markets_to_firestore(markets_data: list) -> bool:
    """
    Push multiple Polymarket markets to Firestore in a single batch operation.
    Identical pattern to market_scanner.bulk_sync_markets_to_firestore().
    """
    if not markets_data:
        return True

    # Deduplicate by bayse_event_id before batch write
    unique_markets = {}
    for market in markets_data:
        doc_id = market['bayse_event_id']
        if doc_id not in unique_markets:
            unique_markets[doc_id] = market

    if len(unique_markets) != len(markets_data):
        logger.warning(
            f"Deduplicated {len(markets_data) - len(unique_markets)} duplicate Polymarket markets"
        )

    return fs.batch_set(Collection.MARKETS, unique_markets, merge=True)


def scan_markets(max_results=50) -> list:
    """
    Scan Polymarket for active markets and push directly to Firestore.
    Signature matches market_scanner.scan_markets() so views.py can call both uniformly.

    Returns:
        List of market dicts (Firestore documents), ranked by signal_potential_score.
    """
    try:
        logger.info("=" * 70)
        logger.info("STARTING POLYMARKET SCAN")
        logger.info(f"  Max results: {max_results}")
        logger.info("=" * 70)

        # Fetch normalized markets from Polymarket client
        all_markets = polymarket_client.get_all_markets(limit=max_results)

        if not all_markets:
            logger.warning("Polymarket returned no markets")
            return []

        markets_to_sync = []
        skipped = 0

        for market in all_markets:
            try:
                # Parse closes_at for signal score calculation
                closes_at = parse_timestamp(market.get('closes_at'))

                # Calculate signal potential score (reuse same formula as Bayse scanner)
                signal_score = calculate_signal_potential(
                    volume=market.get('total_volume', 0),
                    liquidity=market.get('liquidity', 0),
                    closes_at=closes_at,
                )

                # Stamp timestamps, status, and score
                if closes_at and closes_at < timezone.now():
                    market['status'] = 'closed'

                market['signal_potential_score'] = signal_score
                market['last_scanned_at'] = timezone.now().isoformat()
                if not market.get('created_at'):
                    market['created_at'] = timezone.now().isoformat()

                markets_to_sync.append(market)
                logger.info(
                    f"  [QUEUED] {market.get('title', 'Untitled')[:60]} (score: {signal_score})"
                )

            except Exception as e:
                logger.error(
                    f"Error processing Polymarket market {market.get('bayse_event_id', '?')}: {e}"
                )
                skipped += 1
                continue

        # Batch write all markets at once — same pattern as market_scanner
        markets_saved = []
        if markets_to_sync:
            success = bulk_sync_markets_to_firestore(markets_to_sync)
            if success:
                markets_saved = markets_to_sync
                logger.info(f"Polymarket batch sync complete: {len(markets_saved)} markets saved")
            else:
                logger.error("Polymarket batch sync failed")

        logger.info(f"Polymarket scan complete: {len(markets_saved)} saved, {skipped} skipped")

        # Query Firestore for top Polymarket markets — same pattern as market_scanner
        top_markets = fs.query(
            collection=Collection.MARKETS,
            filters=[
                ("status", "in", ["open", "active"]),
                ("source", "==", "polymarket"),
            ],
            order_by=("signal_potential_score", True),  # descending
            limit=max_results,
        )
        return top_markets

    except PolymarketAPIError as e:
        logger.error(f"Polymarket API error during scan: {e}")
        return []
    except Exception as e:
        logger.exception(f"Unexpected error during Polymarket scan: {e}")
        return []


def calculate_signal_potential(volume, liquidity, closes_at):
    """
    Calculate signal potential score for ranking markets.
    Identical formula to market_scanner.calculate_signal_potential()
    so scores are comparable across Bayse and Polymarket markets.
    """
    score = 0

    volume_score = min(40, float(volume) / 5000)
    score += volume_score

    liquidity_score = min(30, float(liquidity) / 2000)
    score += liquidity_score

    if closes_at:
        time_remaining_hours = (closes_at - timezone.now()).total_seconds() / 3600
        if 0 < time_remaining_hours <= 24:
            time_score = 30   # closing within 24h — highest priority
        elif time_remaining_hours <= 48:
            time_score = 28   # closing within 48h — very high
        elif time_remaining_hours <= 168:
            time_score = 20   # closing within a week
        elif time_remaining_hours > 168:
            time_score = 10   # long-dated — low priority
        else:
            time_score = 0
        score += time_score

    return round(score, 2)


def parse_timestamp(timestamp_str):
    """
    Parse ISO 8601 timestamp string to datetime object.
    Identical to market_scanner.parse_timestamp().
    """
    if not timestamp_str:
        return None
    try:
        return parser.parse(timestamp_str)
    except Exception as e:
        logger.error(f"Error parsing timestamp '{timestamp_str}': {e}")
        return None
