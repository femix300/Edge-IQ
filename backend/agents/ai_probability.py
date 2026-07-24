"""
Agent 03: AI Probability Agent (Firestore Refactored)
======================================================
Original: agents/ai_probability.py

Changes made:
- Replaced Market.objects.get()       ->  fs.get(Collection.MARKETS, ...)
- Replaced AIAnalysis.objects.create() ->  fs.set(Collection.AI_ANALYSES, ...)
- Input market_id is now the Firestore doc ID (bayse_event_id).
- Returns dict with AI analysis result + Firestore doc ID.
- Now properly captures and stores the actual Gemini model used (after auto-failover)
- Uses original field names (probability, confidence, reasoning, sources) for frontend compatibility
"""

from services.gemini_client import gemini_client
from utils.firebase_client import fs, Collection
import logging

logger = logging.getLogger(__name__)


def estimate_probability(market_event_id: str, market_context: dict | None = None, outcome_title: str | None = None):
    """
    Use Gemini AI to estimate true probability of a market outcome.
    Reads market from Firestore, writes AIAnalysis back to Firestore.

    Args:
        market_event_id: Firestore doc ID (= bayse_event_id)
        market_context: Optional pre-fetched market data dict
        outcome_title: Title of the specific outcome for multi-dimensional markets

    Returns:
        Dict with probability, confidence, reasoning + firestore_doc_id
    """
    try:
        from django.utils import timezone
        import datetime
        
        now = timezone.now()

        # --- 1. Read market from Firestore FIRST (needed for edge calculation) ---
        if market_context:
            market = market_context
        else:
            market = fs.get(Collection.MARKETS, market_event_id)

        if not market:
            logger.error(f"Market {market_event_id} not found in Firestore")
            raise ValueError(f"Market {market_event_id} not found")

        title = market.get("title", "Unknown")
        description = market.get("description", "")
        
        # For multi-dimensional markets: find the specific outcome's description
        # and use it instead of the parent market's description
        if outcome_title:
            outcomes = market.get("outcomes", [])
            matched_outcome = None
            for o in outcomes:
                if o.get("title") == outcome_title:
                    matched_outcome = o
                    break
            if matched_outcome and matched_outcome.get("description"):
                description = matched_outcome["description"]
                logger.info(f"Using outcome-specific description for '{outcome_title}': {description[:100]}")
            else:
                # Fallback: clear the parent description to prevent AI from being misled
                # Use outcome_title directly as context instead
                description = f"This is a YES/NO question asking: {outcome_title}"
                logger.info(f"No outcome-specific description found for '{outcome_title}', using derived description.")
        
        prompt_title = f"{title} - Outcome: {outcome_title}" if outcome_title else title
        
        if not market_context:
            # For specific outcomes, use the outcome's own price/probability
            if outcome_title and matched_outcome:
                market_context = {
                    "current_price": float(matched_outcome.get("current_price", market.get("current_price", 0))),
                    "implied_probability": float(matched_outcome.get("implied_probability", market.get("implied_probability", 0))),
                    "volume_24h": float(market.get("volume_24h", 0)),
                }
            else:
                market_context = {
                    "current_price": float(market.get("current_price", 0)),
                    "implied_probability": float(market.get("implied_probability", 0)),
                    "volume_24h": float(market.get("volume_24h", 0)),
                }
            
        current_implied_pct = market_context["implied_probability"] * 100
        
        # --- 2. Check Cache (4 hours) ---
        # Cache key should include outcome_title to avoid collision
        cache_filters = [("market_id", "==", market_event_id)]
        if outcome_title:
            cache_filters.append(("outcome_title", "==", outcome_title))
            
        latest_ai = fs.query(
            Collection.AI_ANALYSES,
            filters=cache_filters,
            order_by=("analyzed_at", True),
            limit=1,
        )
        if latest_ai:
            cached = latest_ai[0]
            analyzed_at = cached.get("analyzed_at")
            if analyzed_at:
                if isinstance(analyzed_at, str):
                    from dateutil import parser
                    try:
                        analyzed_at = parser.parse(analyzed_at)
                    except Exception:
                        pass
                
                if isinstance(analyzed_at, datetime.datetime):
                    if timezone.is_naive(analyzed_at):
                        analyzed_at = timezone.make_aware(analyzed_at)
                        
                    age = now - analyzed_at
                    if age.total_seconds() < 4 * 3600:  # 4 hours
                        cached_prob = cached.get("probability", 50)
                        edge = abs(cached_prob - current_implied_pct)
                        
                        if edge >= 5:
                            logger.info(f"Using cached AI analysis for {market_event_id} ({outcome_title}) (age: {age.total_seconds()/60:.1f} mins) because edge is {edge:.1f}% (>= 5%)")
                            
                            # Add a 5-second delay so the frontend "analyzing" state doesn't disappear too quickly
                            import time
                            time.sleep(5)
                            
                            return {
                                "probability": cached_prob,
                                "confidence": cached.get("confidence", 0),
                                "reasoning": cached.get("reasoning", ""),
                                "sources_consulted": cached.get("sources", ""),
                                "firestore_doc_id": cached.get("id"),
                                "market_event_id": market_event_id,
                                "model_used": cached.get("model_used", "cached"),
                            }
                        else:
                            logger.info(f"Discarding cached AI analysis for {market_event_id} ({outcome_title}) because edge is only {edge:.1f}% (< 5%). Re-running analysis.")

        logger.info(f"Estimating probability for: {prompt_title}")

        # Call Gemini - this now returns the actual model used in result['model_used']
        result = gemini_client.estimate_probability(
            event_title=prompt_title,
            event_description=description,
            market_context=market_context,
        )

        # Debug logging - show which model was actually used
        actual_model = result.get('model_used', 'unknown')
        logger.info(f"AI Result using model: {actual_model}")
        logger.info(f"AI Result: probability={result.get('probability')}, confidence={result.get('confidence')}")

        # Save AI analysis to Firestore (includes the actual model used)
        doc_id = save_ai_analysis(market_event_id, title, result, actual_model, outcome_title)

        # Debug logging
        logger.info(f"AI Analysis saved to Firestore with ID: {doc_id}")

        logger.info(f"AI Probability: {result['probability']}% (Confidence: {result['confidence']}%) using {actual_model}")
        logger.info(f"Reasoning: {result.get('reasoning', 'N/A')[:200]}...")

        return {
            **result,
            "firestore_doc_id": doc_id,
            "market_event_id": market_event_id,
            "model_used": actual_model,
        }

    except Exception as e:
        logger.exception(f"Error estimating probability for {market_event_id}: {e}")
        raise


def save_ai_analysis(market_event_id: str, market_title: str, result: dict, model_used: str = None, outcome_title: str = None) -> str:
    """
    Save AI analysis to Firestore. Document ID includes timestamp for history.
    Returns the Firestore doc ID.

    Uses original field names for frontend compatibility.
    """
    try:
        from django.utils import timezone
        now = timezone.now()
        # Use outcome_title in doc_id to avoid collision between dimensions analyzed at the same time
        doc_id = f"{market_event_id}_{outcome_title}_{now.isoformat()}" if outcome_title else f"{market_event_id}_{now.isoformat()}"

        # Use the actual model passed from estimate_probability, or fallback
        actual_model = model_used or result.get("model_used", "gemini-flash-latest")

        doc = {
            "market_id": market_event_id,
            "market_title": market_title,
            "outcome_title": outcome_title,
            "probability": result.get("probability", 50),           # Original field name
            "confidence": result.get("confidence", 0),              # Original field name
            "reasoning": result.get("reasoning", ""),               # Original field name
            "sources": result.get("sources_consulted", ""),         # Original field name
            "model_used": actual_model,
            "search_grounding_used": result.get("search_grounding", True),
            "analyzed_at": now,
        }

        fs.set(Collection.AI_ANALYSES, doc_id, doc)
        logger.info(f"Saved AI analysis with model {actual_model}: {doc_id}")
        return doc_id

    except Exception as e:
        logger.error(f"Error saving AI analysis: {e}")
        return ""


def get_latest_ai_analysis(market_event_id: str) -> dict | None:
    """
    Get the most recent AI analysis for a market from Firestore.
    Returns dict with original field names.
    """
    results = fs.query(
        collection=Collection.AI_ANALYSES,
        filters=[("market_id", "==", market_event_id)],
        order_by=("analyzed_at", True),
        limit=1,
    )
    if results:
        # Ensure field names are original format
        doc = results[0]
        return {
            "probability": doc.get("probability", 50),
            "confidence": doc.get("confidence", 0),
            "reasoning": doc.get("reasoning", ""),
            "sources": doc.get("sources", ""),
            "model_used": doc.get("model_used", ""),
            "analyzed_at": doc.get("analyzed_at"),
            "market_id": doc.get("market_id"),
            "market_title": doc.get("market_title"),
        }
    return None