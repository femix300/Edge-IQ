"""
Agent 03: AI Probability Agent
Uses Gemini to estimate true probability
"""
from services.gemini_client import gemini_client
from signals.models import AIAnalysis
from markets.models import Market
import logging

logger = logging.getLogger(__name__)


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
        
        logger.info(f"AI Probability: {result['probability']}% (Confidence: {result['confidence']}%)")
        logger.info(f"Reasoning: {result['reasoning']}")
        
        return result
        
    except Market.DoesNotExist:
        logger.error(f"Market with ID {market_id} not found")
        raise ValueError(f"Market {market_id} not found")
    except Exception as e:
        logger.error(f"Error estimating probability for market {market_id}: {str(e)}")
        raise


def save_ai_analysis(market, analysis_result):
    """
    Save AI analysis to database
    
    Args:
        market: Market object
        analysis_result: Dictionary from Gemini
    """
    try:
        AIAnalysis.objects.create(
            market=market,
            estimated_probability=analysis_result['probability'],
            confidence_score=int(analysis_result['confidence']),
            reasoning_summary=analysis_result['reasoning'],
            sources_consulted=analysis_result.get('sources_consulted', ''),
            model_used='gemini-1.5-flash',
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
    except AIAnalysis.DoesNotExist:
        return None
