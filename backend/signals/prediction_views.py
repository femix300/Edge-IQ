"""
EdgeIQ Prediction Tracker
Saves and retrieves real EdgeIQ predictions for calibration
"""
import logging
import time
from rest_framework.decorators import api_view
from rest_framework.response import Response
from utils.firebase_client import fs, Collection

logger = logging.getLogger(__name__)

_stats_cache = {"data": None, "ts": 0}
CACHE_TTL = 300  # 5 minutes


@api_view(['GET'])
def prediction_stats(request):
    """
    GET /api/signals/prediction-stats/
    Returns EdgeIQ's real prediction track record
    """
    global _stats_cache
    if _stats_cache["data"] and time.time() - _stats_cache["ts"] < CACHE_TTL:
        return Response(_stats_cache["data"])

    try:
        # Fetch all predictions
        docs = fs.db.collection(Collection.PREDICTIONS).order_by(
            "created_at", direction="DESCENDING"
        ).limit(500).stream()

        predictions = []
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            predictions.append(d)

        total = len(predictions)
        resolved = [p for p in predictions if p.get("status") == "resolved"]
        pending = [p for p in predictions if p.get("status") == "pending"]
        correct = [p for p in resolved if p.get("was_correct") == True]

        accuracy = round(len(correct) / len(resolved) * 100, 1) if resolved else None

        # Build calibration bins from resolved predictions only
        bins = {b: {"count": 0, "wins": 0} for b in range(0, 100, 10)}
        for p in resolved:
            ai_prob = p.get("ai_probability", 50)
            bf = min(int(ai_prob / 10) * 10, 90)
            bins[bf]["count"] += 1
            if p.get("resolved_outcome") == "YES":
                bins[bf]["wins"] += 1

        calibration_points = []
        for bf, data in sorted(bins.items()):
            if data["count"] > 0:
                actual = round(data["wins"] / data["count"] * 100, 1)
                calibration_points.append({
                    "bin": f"{bf}-{bf+10}%",
                    "predicted": bf + 5,
                    "actual": actual,
                    "count": data["count"],
                })

        response_data = {
            "success": True,
            "stats": {
                "total": total,
                "resolved": len(resolved),
                "pending": len(pending),
                "correct": len(correct),
                "accuracy": accuracy,
            },
            "calibration_points": calibration_points,
            "recent_predictions": predictions[:20],
        }
        _stats_cache["data"] = response_data
        _stats_cache["ts"] = time.time()
        return Response(response_data)

    except Exception as e:
        logger.error(f"Prediction stats error: {e}")
        return Response({"success": False, "error": str(e)}, status=500)


@api_view(['POST'])
def resolve_predictions(request):
    """
    POST /api/signals/resolve-predictions/
    Matches pending predictions against Polymarket resolved markets
    and updates their status automatically
    """
    try:
        import sys
        sys.path.insert(0, 'backend') if 'backend' not in sys.path[0] else None
        from services.polymarket_resolved import fetch_resolved_markets

        resolved_markets = fetch_resolved_markets(400)
        resolved_map = {m["id"]: m for m in resolved_markets}
        resolved_by_question = {m["question"].lower().strip(): m for m in resolved_markets}

        # Get pending predictions
        docs = fs.db.collection(Collection.PREDICTIONS).where(
            "status", "==", "pending"
        ).stream()

        updated = 0
        for doc in docs:
            p = doc.to_dict()
            market_id = p.get("market_id", "")
            title = p.get("market_title", "").lower().strip()

            resolved = resolved_map.get(market_id) or resolved_by_question.get(title)
            if not resolved:
                continue

            actual_outcome = resolved["winner"]
            predicted_outcome = p.get("predicted_outcome", "YES")
            was_correct = predicted_outcome == actual_outcome

            fs.update(Collection.PREDICTIONS, doc.id, {
                "status": "resolved",
                "resolved_outcome": actual_outcome,
                "was_correct": was_correct,
            })
            updated += 1

        # Bust cache so next stats call returns fresh data
        global _stats_cache
        _stats_cache = {"data": None, "ts": 0}

        return Response({
            "success": True,
            "updated": updated,
            "message": f"Resolved {updated} pending predictions"
        })

    except Exception as e:
        logger.error(f"Resolve predictions error: {e}")
        return Response({"success": False, "error": str(e)}, status=500)


@api_view(['POST'])
def manual_resolve_prediction(request):
    """
    POST /api/predictions/manual-resolve/
    Body: { "prediction_id": "...", "outcome": "YES" | "NO" }
    Manually resolve a prediction for markets we can't auto-resolve (e.g. Bayse)
    """
    try:
        prediction_id = request.data.get("prediction_id")
        outcome = request.data.get("outcome", "").upper()

        if not prediction_id or outcome not in ("YES", "NO"):
            return Response({"success": False, "error": "prediction_id and outcome (YES/NO) required"}, status=400)

        doc_ref = fs.db.collection(Collection.PREDICTIONS).document(prediction_id)
        doc = doc_ref.get()
        if not doc.exists:
            return Response({"success": False, "error": "Prediction not found"}, status=404)

        p = doc.to_dict()
        predicted = p.get("predicted_outcome", "YES")
        was_correct = predicted == outcome

        doc_ref.update({
            "status": "resolved",
            "resolved_outcome": outcome,
            "was_correct": was_correct,
        })

        # Bust cache
        global _stats_cache
        _stats_cache = {"data": None, "ts": 0}

        return Response({
            "success": True,
            "prediction_id": prediction_id,
            "outcome": outcome,
            "was_correct": was_correct,
            "message": f"Resolved as {outcome} — prediction was {'✓ correct' if was_correct else '✗ wrong'}"
        })
    except Exception as e:
        logger.error(f"Manual resolve error: {e}")
        return Response({"success": False, "error": str(e)}, status=500)


@api_view(['POST'])
def unresolve_all_predictions(request):
    """
    POST /api/predictions/unresolve-all/
    Resets ALL predictions back to pending so Sync can re-resolve fresh.
    """
    try:
        docs = list(fs.db.collection(Collection.PREDICTIONS).stream())
        count = 0
        for doc in docs:
            doc.reference.update({
                "status": "pending",
                "resolved_outcome": None,
                "was_correct": None,
            })
            count += 1

        global _stats_cache
        _stats_cache = {"data": None, "ts": 0}

        return Response({
            "success": True,
            "reset": count,
            "message": f"Reset {count} predictions to pending"
        })
    except Exception as e:
        logger.error(f"Unresolve all error: {e}")
        return Response({"success": False, "error": str(e)}, status=500)
