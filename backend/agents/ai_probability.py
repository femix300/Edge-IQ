"""
Agent 03: AI Probability Agent
Uses Gemini to estimate true probability
"""
from services.gemini_client import gemini_client
import logging

logger = logging.getLogger(__name__)


def _get_market_model():
    """Lazy import to avoid Django setup issues"""
    from markets.models import Market
    return Market


def _get_ai_analysis_model():
    """Lazy import to avoid Django setup issues"""
    from signals.models import AIAnalysis
    return AIAnalysis


def estimate_probability(market_id, market_context=None):
    """
    Use Gemini AI to estimate true probability of a market outcome

    Args:
        market_id: Database ID of Market object
        market_context: Optional dict with current market data

    Returns:
        Dictionary with AI probability estimate
    """
    try:
        # Get market from database
        Market = _get_market_model()
        market = Market.objects.get(id=market_id)
        logger.info(f"Estimating probability for: {market.title}")

        # Prepare context if not provided
        if not market_context:
            market_context = {
                'current_price': float(market.current_price),
                'implied_probability': float(market.implied_probability),
                'volume_24h': float(market.volume_24h),
            }

        # Call Gemini API
        result = gemini_client.estimate_probability(
            event_title=market.title,
            event_description=market.description,
            market_context=market_context
        )

        # Store AI analysis in database
        save_ai_analysis(market, result)

        logger.info(
            f"AI Probability: {result['probability']}% (Confidence: {result['confidence']}%)")
        logger.info(f"Reasoning: {result['reasoning']}")

        return result

    except Market.DoesNotExist:
        logger.error(f"Market with ID {market_id} not found")
        raise ValueError(f"Market {market_id} not found")
    except Exception as e:
        logger.error(
            f"Error estimating probability for market {market_id}: {str(e)}")
        raise


def save_ai_analysis(market, analysis_result):
    """
    Save AI analysis to database

    Args:
        market: Market object
        analysis_result: Dictionary from Gemini
    """
    try:
        AIAnalysis = _get_ai_analysis_model()
        AIAnalysis.objects.create(
            market=market,
            estimated_probability=analysis_result['probability'],
            confidence_score=int(analysis_result['confidence']),
            reasoning_summary=analysis_result['reasoning'],
            sources_consulted=analysis_result.get('sources_consulted', ''),
            model_used='gemini-2.5-flash',
            search_grounding_used=True,
        )
        logger.info(f"Saved AI analysis for {market.title}")
    except Exception as e:
        logger.error(f"Error saving AI analysis: {str(e)}")


def get_latest_ai_analysis(market):
    """
    Get the most recent AI analysis for a market

    Args:
        market: Market object

    Returns:
        AIAnalysis object or None
    """
    try:
        return market.ai_analyses.latest()
    except _get_ai_analysis_model().DoesNotExist:
        return None
