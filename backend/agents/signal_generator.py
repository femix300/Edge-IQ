"""
Agent 04: Signal Generator (Firestore Refactored)
==================================================
Original: agents/signal_generator.py

This is the orchestrator agent that ties together outputs from Agents 01-03
and produces the final Signal document.

Changes made:
- Replaced Signal.objects.create()  ->  fs.set(Collection.SIGNALS, ...)
- Reads market, quant_metrics, ai_analysis from Firestore instead of ORM.
- signal_doc_id is deterministic: {market_event_id}_signal for single active signal per market.
- Returns dict (not ORM object).
- Uses original field names (probability, confidence, reasoning, sources) for frontend compatibility.
"""

from utils.firebase_client import fs, Collection
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


def generate_signal(market_event_id: str, user_id: str = "anonymous", user_bankroll: float = 10000, outcome_id: str = None, outcome_title: str = None) -> dict:
    """
    Generate a complete trading signal for a market.

    Pipeline:
        1. Fetch market from Firestore
        2. Fetch latest quant_metrics from Firestore
        3. Fetch latest AI analysis from Firestore
        4. Calculate edge + Kelly criterion
        5. Write signal to Firestore

    Args:
        market_event_id: Firestore doc ID of the market
        outcome_id: Optional bayse_market_id for multi-dimensional events
        outcome_title: Optional title of the specific outcome

    Returns:
        Signal dict (the Firestore document).
    """
    from django.utils import timezone

    # 1. Fetch market
    market = fs.get(Collection.MARKETS, market_event_id)
    if not market:
        raise ValueError(f"Market {market_event_id} not found")

    # 2. Fetch quant metrics
    quant_doc_id = f"{market_event_id}_{outcome_id}" if outcome_id else market_event_id
    quant = fs.get(Collection.QUANT_METRICS, quant_doc_id) or {}

    # 3. Fetch AI analysis (using original field names)
    ai_filters = [("market_id", "==", market_event_id)]
    if outcome_title:
        ai_filters.append(("outcome_title", "==", outcome_title))
        
    ai_results = fs.query(
        Collection.AI_ANALYSES,
        filters=ai_filters,
        order_by=("analyzed_at", True),
        limit=1,
    )
    ai = ai_results[0] if ai_results else {}

    # After getting ai, add this line:
    model_used = ai.get("model_used", "unknown")

    # Debug logging
    if ai:
        logger.info(f"Found AI analysis: probability={ai.get('probability')}, confidence={ai.get('confidence')}")
    else:
        logger.warning(f"No AI analysis found for market {market_event_id}")

    # 4. Calculate signal parameters using original field names
    if outcome_id and market.get('is_multi_dimensional'):
        outcomes = market.get('outcomes', [])
        outcome = next((o for o in outcomes if o.get('bayse_market_id') == outcome_id), {})
        current_price = Decimal(str(outcome.get("current_price", 0)))
        _raw_implied = float(outcome.get("implied_probability", 50))
    else:
        current_price = Decimal(str(market.get("current_price", 0)))
        _raw_implied = float(market.get("implied_probability", 50))
        
    # Normalise: stored as fraction (0-1) → convert to percentage (0-100)
    implied_prob = Decimal(str(_raw_implied * 100 if _raw_implied <= 1.0 else _raw_implied))
    
    # Use original field names from Firestore
    ai_prob = Decimal(str(ai.get("probability", implied_prob)))
    confidence = int(ai.get("confidence", 50))
    reasoning = ai.get("reasoning", "")
    sources = ai.get("sources", "")

    # Edge = AI probability - market implied probability
    edge = ai_prob - implied_prob

    # Expected value per naira staked
    try:
        if edge > 0 and current_price > 0:
            ev = (ai_prob / 100) * (1 / current_price) - 1
        elif edge < 0 and current_price > 0 and current_price < 1:
            ev = ((100 - ai_prob) / 100) * (1 / (1 - current_price)) - 1
        else:
            ev = Decimal("0")
    except Exception:
        ev = Decimal("0")

    # Kelly Criterion: f* = (bp - q) / b
    bankroll = Decimal(str(user_bankroll))
    if current_price > 0 and current_price < 1 and edge != 0:
        if edge > 0:
            # Betting YES
            b = (1 / current_price) - 1
            p = ai_prob / 100
        else:
            # Betting NO
            price_no = Decimal("1") - current_price
            b = (1 / price_no) - 1
            p = Decimal("1") - (ai_prob / 100)
            
        q = Decimal("1") - p
        
        kelly_f = (b * p - q) / b if b != 0 else Decimal("0")
        kelly_f = max(Decimal("0"), min(Decimal("1"), kelly_f))
        kelly_pct = kelly_f * 100
        rec_conservative = bankroll * kelly_f * Decimal("0.25")
        rec_balanced = bankroll * kelly_f * Decimal("0.50")
        rec_aggressive = bankroll * kelly_f * Decimal("1.0")
    else:
        kelly_f = Decimal("0")
        kelly_pct = Decimal("0")
        rec_conservative = rec_balanced = rec_aggressive = Decimal("0")

    # Direction
    abs_edge = abs(float(edge))
    if edge > 0 and abs_edge >= 5:
        direction = "BUY"
    elif edge < 0 and abs_edge >= 5:
        direction = "SELL"
    else:
        direction = "WAIT"

    # Signal strength
    if abs_edge >= 25:
        strength = "strong"
    elif abs_edge >= 15:
        strength = "moderate"
    else:
        strength = "weak"

    # Confidence level
    if confidence >= 70:
        conf_level = "high"
    elif confidence >= 40:
        conf_level = "medium"
    else:
        conf_level = "low"

    # 5. Archive any existing active signal for this market
    _archive_existing_signal(market_event_id)

    # 5b. Save prediction to tracker (upsert — one prediction per market/outcome)
    try:
        from utils.firebase_client import Collection as _Collection
        pred_id = f"{market_event_id}_{outcome_id}_{user_id}" if outcome_id else f"{market_event_id}_{user_id}"  # deterministic — no duplicates
        existing = fs.get(_Collection.PREDICTIONS, pred_id)
        # Only save/update if not already resolved
        if not existing or existing.get("status") == "pending":
            prediction_doc = {
                "user_id": user_id,
                "market_id": market_event_id,
                "outcome_id": outcome_id,
                "market_title": market.get("title", ""),
                "outcome_title": outcome_title,
                "ai_probability": float(ai_prob.quantize(Decimal("0.01"))),
                "market_probability": float(implied_prob.quantize(Decimal("0.01"))),
                "predicted_outcome": "YES" if float(ai_prob) > 50 else "NO",
                "status": existing.get("status", "pending") if existing else "pending",
                "resolved_outcome": existing.get("resolved_outcome") if existing else None,
                "was_correct": existing.get("was_correct") if existing else None,
                "created_at": existing.get("created_at") if existing else timezone.now(),
                "updated_at": timezone.now(),
                "closes_at": market.get("closes_at"),
                "source": market.get("source", "unknown"),
            }
            fs.set(_Collection.PREDICTIONS, pred_id, prediction_doc)
            logger.info(f"Prediction upserted: {pred_id}")
    except Exception as e:
        logger.warning(f"Failed to save prediction: {e}")

    # 6. Write new signal to Firestore
    now = timezone.now()
    signal_doc_id = f"{market_event_id}_{outcome_id}_{user_id}" if outcome_id else f"{market_event_id}_{user_id}"
    signal_doc = {
        "user_id": user_id,
        "market_id": market_event_id,
        "outcome_id": outcome_id,
        "market_title": market.get("title", ""),
        "outcome_title": outcome_title,
        "market_event_id": market.get("bayse_event_id", ""),
        "direction": direction,
        "edge_score": float(edge.quantize(Decimal("0.01"))),
        "abs_edge_score": abs(float(edge.quantize(Decimal("0.01")))),
        "expected_value": float(ev.quantize(Decimal("0.000001"))),
        "market_probability": float(implied_prob.quantize(Decimal("0.01"))),
        "ai_probability": float(ai_prob.quantize(Decimal("0.01"))),
        "model_used": model_used,  # Add this to signal_doc
        "confidence": confidence,
        "confidence_level": conf_level,
        "kelly_percentage": float(kelly_pct.quantize(Decimal("0.01"))),
        "recommended_stake_conservative": float(rec_conservative.quantize(Decimal("0.01"))),
        "recommended_stake_balanced": float(rec_balanced.quantize(Decimal("0.01"))),
        "recommended_stake_aggressive": float(rec_aggressive.quantize(Decimal("0.01"))),
        "reasoning": reasoning,
        "news_context": sources,
        "is_active": True,
        "signal_strength": strength,
        "created_at": now,
        "expires_at": market.get("closes_at"),
        "quant_snapshot": {
            "momentum_score": quant.get("momentum_score"),
            "momentum_direction": quant.get("momentum_direction"),
            "volume_acceleration": quant.get("volume_acceleration"),
            "order_book_bias": quant.get("order_book_bias"),
        },
    }

    signal_doc["id"] = signal_doc_id
    fs.set(Collection.SIGNALS, signal_doc_id, signal_doc)
    logger.info(f"Signal generated: {market.get('title')} | {direction} | Edge: {float(edge):.1f}% | Kelly: {float(kelly_pct):.1f}%")

    return signal_doc


def _archive_existing_signal(market_event_id: str):
    """No-op: signals are per-user so no overwriting occurs."""
    pass


def get_active_signals(limit=20, min_edge=15, user_id: str = None) -> list[dict]:
    """
    Get active signals from Firestore (replaces ORM query).
    """
    # Fetch all active signals for the user
    filters = [("is_active", "==", True)]
    if user_id:
        filters.append(("user_id", "==", user_id))

    # Do not use order_by or additional filters in fs.query to avoid missing composite index errors
    raw_signals = fs.query(
        collection=Collection.SIGNALS,
        filters=filters,
        limit=500, # fetch a safe maximum
    )
    
    # Filter and sort in memory
    filtered_signals = []
    for sig in raw_signals:
        # Fallback to abs(edge_score) if abs_edge_score is missing from older docs
        abs_edge = sig.get("abs_edge_score")
        if abs_edge is None:
            raw_edge = sig.get("edge_score", 0)
            abs_edge = abs(float(raw_edge))
            
        if min_edge and abs_edge < min_edge:
            continue
            
        sig["_sort_key"] = abs_edge
        filtered_signals.append(sig)
        
    filtered_signals.sort(key=lambda x: x["_sort_key"], reverse=True)
    
    # Cleanup temporary sort key and apply limit
    for sig in filtered_signals:
        del sig["_sort_key"]
        
    return filtered_signals[:limit]


def deactivate_expired_signals() -> int:
    """
    Deactivate signals whose expires_at has passed.
    Returns count deactivated.
    """
    from django.utils import timezone
    from dateutil import parser
    
    now = timezone.now()
    count = 0
    
    # Get all active signals from Firestore
    active_signals = fs.query(
        Collection.SIGNALS,
        filters=[("is_active", "==", True)],
    )
    
    for signal_doc in active_signals:
        expires_at = signal_doc.get("expires_at")
        
        if not expires_at:
            continue
        
        # Convert string to datetime if needed (Firestore stores as string sometimes)
        if isinstance(expires_at, str):
            try:
                expires_at = parser.parse(expires_at)
            except Exception as e:
                logger.warning(f"Could not parse expires_at: {expires_at}")
                continue
        
        # Make timezone-aware if naive
        if timezone.is_naive(expires_at):
            expires_at = timezone.make_aware(expires_at)
        
        if expires_at <= now:
            signal_doc["is_active"] = False
            signal_doc["deactivated_at"] = now
            doc_id = signal_doc.get("id")
            if not doc_id:
                doc_id = f"{signal_doc.get('market_id')}_signal"
            fs.set(Collection.SIGNALS, doc_id, signal_doc)
            count += 1
            logger.info(f"Deactivated expired signal for market: {signal_doc.get('market_title')}")
    
    logger.info(f"Deactivated {count} expired signals in Firestore")
    return count