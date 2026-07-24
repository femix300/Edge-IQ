"""
Celery tasks for market operations
"""
from celery import shared_task
from django.core.cache import cache
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@shared_task
def async_scan_markets(status='open', min_volume=0, min_liquidity=0, max_results=50):
    """
    Run market scanner in background
    """
    from agents.market_scanner import scan_markets as bayse_scan
    from agents.polymarket_scanner import scan_markets as poly_scan
    
    logger.info(f"Starting background market scan (status={status})...")
    
    try:
        bayse_results = bayse_scan(
            status=status,
            min_volume=min_volume,
            min_liquidity=min_liquidity,
            max_results=max_results
        )
        poly_results = poly_scan(max_results=max_results)
        result = bayse_results + poly_results
        
        cache.set('last_scan_result', result, 300)
        cache.set('last_scan_time', str(timezone.now()), 300)
        
        logger.info(f"Background scan complete: {len(result)} markets found")
        return {'markets_found': len(result), 'status': 'success'}
        
    except Exception as e:
        logger.error(f"Background scan failed: {str(e)}")
        return {'markets_found': 0, 'status': 'error', 'error': str(e)}


@shared_task
def async_analyze_market(market_id, user_bankroll=10000):
    """
    Run full analysis pipeline in background
    """
    from agents.quant_analyzer import analyze_market
    from agents.ai_probability import estimate_probability
    from agents.signal_generator import generate_signal
    
    logger.info(f"Starting background analysis for market {market_id}...")
    
    try:
        quant_metrics = analyze_market(market_id)
        ai_result = estimate_probability(market_id)
        result = generate_signal(market_event_id=market_id, user_bankroll=user_bankroll)
        
        # Trigger quota check in background (non-blocking) after a pipeline run
        async_check_quotas.delay()
        
        cache_key = f"analysis_result_{market_id}"
        cache.set(cache_key, result, 3600)
        
        logger.info(f"Background analysis complete for market {market_id}")
        return {'market_id': market_id, 'status': 'success', 'result': result}
        
    except Exception as e:
        logger.error(f"Background analysis failed for market {market_id}: {str(e)}")
        return {'market_id': market_id, 'status': 'error', 'error': str(e)}


@shared_task
def periodic_market_scan():
    """
    Run every 5 minutes to keep markets fresh
    """
    from agents.market_scanner import scan_markets as bayse_scan
    from agents.polymarket_scanner import scan_markets as poly_scan
    
    logger.info("Periodic market scan started...")
    
    try:
        bayse_results = bayse_scan(status='open', max_results=50)
        poly_results = poly_scan(max_results=50)
        result = bayse_results + poly_results
        logger.info(f"Periodic scan complete: {len(result)} markets")
        return {'markets_found': len(result), 'timestamp': str(timezone.now())}
        
    except Exception as e:
        logger.error(f"Periodic scan failed: {str(e)}")
        return {'markets_found': 0, 'error': str(e)}

@shared_task
def async_check_quotas():
    """
    Runs the quota checker concurrently in the background.
    """
    from services.gemini_client import gemini_client
    
    logger.info("Starting background quota check...")
    try:
        result = gemini_client.check_model_quotas()
        logger.info("Background quota check completed successfully.")
        return {'status': 'success', 'models': result}
    except Exception as e:
        logger.error(f"Background quota check failed: {str(e)}")
        return {'status': 'error', 'error': str(e)}
