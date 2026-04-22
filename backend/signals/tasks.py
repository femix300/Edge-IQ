"""
Celery tasks for signal operations
"""
from celery import shared_task
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@shared_task
def async_generate_signal(market_id, user_bankroll=10000, min_edge_threshold=15):
    """
    Generate signal in background
    """
    from agents.signal_generator import generate_signal
    from agents.quant_analyzer import analyze_market
    from agents.ai_probability import estimate_probability
    
    logger.info(f"Generating signal for market {market_id}...")
    
    try:
        quant_metrics = analyze_market(market_id)
        ai_probability = estimate_probability(market_id)
        signal = generate_signal(
            market_id=market_id,
            quant_metrics=quant_metrics,
            ai_probability=ai_probability,
            user_bankroll=user_bankroll,
            min_edge_threshold=min_edge_threshold
        )
        
        result = {
            'market_id': market_id,
            'signal_id': signal.id if signal else None,
            'direction': signal.direction if signal else None,
            'edge_score': signal.edge_score if signal else None,
            'generated': signal is not None
        }
        
        logger.info(f"Signal generated: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Signal generation failed: {str(e)}")
        return {'market_id': market_id, 'error': str(e)}


@shared_task
def async_deactivate_expired_signals():
    """
    Deactivate expired signals (run daily)
    """
    from agents.signal_generator import deactivate_expired_signals
    
    count = deactivate_expired_signals()
    logger.info(f"Deactivated {count} expired signals")
    return {'deactivated_count': count}
