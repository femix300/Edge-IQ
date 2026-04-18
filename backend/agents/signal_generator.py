"""
Agent 04: Signal & Risk Agent
Generates trade signals with edge scoring and Kelly sizing
"""
from signals.models import Signal
from markets.models import Market
from utils.calculations import (
    calculate_edge,
    calculate_expected_value,
    calculate_kelly_stake,
    calculate_decimal_odds,
)
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


def generate_signal(market_id, quant_metrics, ai_probability, 
                   user_bankroll=10000, min_edge_threshold=15):
    """
    Generate a trading signal by comparing market vs AI probability
    
    Args:
        market_id: Database ID of Market object
        quant_metrics: Dictionary from Agent 02
        ai_probability: Dictionary from Agent 03
        user_bankroll: User's available capital
        min_edge_threshold: Minimum edge to generate signal (percentage points)
        
    Returns:
        Signal object if edge is sufficient, None otherwise
    """
    try:
        # Get market from database
        market = Market.objects.get(id=market_id)
        logger.info(f"Generating signal for: {market.title}")
        
        # Extract probabilities
        market_prob = float(market.implied_probability)
        ai_prob = float(ai_probability['probability'])
        confidence = int(ai_probability['confidence'])
        
        # Calculate edge
        edge = calculate_edge(ai_prob, market_prob)
        
        logger.info(f"Market Probability: {market_prob}%")
        logger.info(f"AI Probability: {ai_prob}%")
        logger.info(f"Edge: {edge} percentage points")
        
        # Check if edge meets threshold
        if abs(edge) < min_edge_threshold:
            logger.info(f"Edge {edge} below threshold {min_edge_threshold} - no signal generated")
            return None
        
        # Determine direction
        if edge > 0:
            direction = 'BUY'  # AI thinks outcome more likely than market
        elif edge < 0:
            direction = 'SELL'  # AI thinks outcome less likely than market
        else:
            direction = 'WAIT'
        
        # Calculate Expected Value
        # For prediction markets, payout is typically (1 - entry_price) for a winning YES bet
        current_price = float(market.current_price)
        
        if direction == 'BUY':
            potential_payout = 1 - current_price
            win_prob = ai_prob / 100
            loss_prob = 1 - win_prob
            ev = calculate_expected_value(win_prob, potential_payout, loss_prob, 1.0)
        elif direction == 'SELL':
            potential_payout = current_price
            win_prob = (100 - ai_prob) / 100
            loss_prob = 1 - win_prob
            ev = calculate_expected_value(win_prob, potential_payout, loss_prob, 1.0)
        else:
            ev = 0
        
        # Calculate decimal odds
        odds = calculate_decimal_odds(current_price)
        
        # Calculate Kelly stakes for different risk tolerances
        kelly_stakes = calculate_kelly_stake(
            bankroll=user_bankroll,
            edge=abs(edge) / 100,  # Convert to decimal
            odds=odds,
            risk_tolerance='balanced'
        )
        
        # Create signal object
        signal_data = {
            'market': market,
            'direction': direction,
            'edge_score': abs(edge),
            'expected_value': Decimal(str(ev)),
            'market_probability': Decimal(str(market_prob)),
            'ai_probability': Decimal(str(ai_prob)),
            'confidence': confidence,
            'reasoning': ai_probability['reasoning'],
            'news_context': ai_probability.get('sources_consulted', ''),
            'kelly_percentage': Decimal(str((kelly_stakes['balanced'] / user_bankroll) * 100)),
            'recommended_stake_conservative': Decimal(str(kelly_stakes['conservative'])),
            'recommended_stake_balanced': Decimal(str(kelly_stakes['balanced'])),
            'recommended_stake_aggressive': Decimal(str(kelly_stakes['aggressive'])),
            'is_active': True,
            'expires_at': timezone.now() + timedelta(hours=24),
        }
        
        # Save signal to database
        signal = Signal.objects.create(**signal_data)
        
        logger.info(f"✅ Signal generated: {direction} - Edge: {edge}% - EV: {ev}")
        logger.info(f"   Kelly Stakes: Conservative: ₦{kelly_stakes['conservative']}, Balanced: ₦{kelly_stakes['balanced']}, Aggressive: ₦{kelly_stakes['aggressive']}")
        
        return signal
        
    except Market.DoesNotExist:
        logger.error(f"Market with ID {market_id} not found")
        raise ValueError(f"Market {market_id} not found")
    except Exception as e:
        logger.error(f"Error generating signal for market {market_id}: {str(e)}")
        raise


def run_full_analysis_pipeline(market_id, user_bankroll=10000):
    """
    Run all 4 agents in sequence to generate a complete signal
    
    This is the main entry point for signal generation
    
    Args:
        market_id: Database ID of Market object
        user_bankroll: User's available capital
        
    Returns:
        Dictionary with complete analysis results
    """
    from agents.quant_analyzer import analyze_market
    from agents.ai_probability import estimate_probability
    
    try:
        logger.info(f"🚀 Starting full analysis pipeline for market {market_id}")
        
        # AGENT 02: Quantitative Analysis
        logger.info("📊 Running Agent 02: Quantitative Analysis...")
        quant_metrics = analyze_market(market_id)
        
        # AGENT 03: AI Probability Estimation
        logger.info("🤖 Running Agent 03: AI Probability Estimation...")
        ai_probability = estimate_probability(market_id)
        
        # AGENT 04: Signal Generation
        logger.info("💡 Running Agent 04: Signal Generation...")
        signal = generate_signal(
            market_id=market_id,
            quant_metrics=quant_metrics,
            ai_probability=ai_probability,
            user_bankroll=user_bankroll
        )
        
        # Prepare complete response
        result = {
            'quant_metrics': quant_metrics,
            'ai_analysis': ai_probability,
            'signal': signal,
        }
        
        if signal:
            logger.info(f"✅ Pipeline complete - Signal generated")
        else:
            logger.info(f"✅ Pipeline complete - No signal (edge too small)")
        
        return result
        
    except Exception as e:
        logger.error(f"Error in analysis pipeline: {str(e)}")
        raise


def get_active_signals(limit=20, min_edge=15):
    """
    Get all active signals ranked by edge score
    
    Args:
        limit: Maximum number of signals to return
        min_edge: Minimum edge score filter
        
    Returns:
        QuerySet of Signal objects
    """
    return Signal.objects.filter(
        is_active=True,
        edge_score__gte=min_edge,
        expires_at__gt=timezone.now()
    ).order_by('-edge_score')[:limit]


def deactivate_expired_signals():
    """
    Mark expired signals as inactive
    Should be run periodically as a background task
    """
    expired_count = Signal.objects.filter(
        is_active=True,
        expires_at__lte=timezone.now()
    ).update(is_active=False)
    
    logger.info(f"Deactivated {expired_count} expired signals")
    return expired_count
