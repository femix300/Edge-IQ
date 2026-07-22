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

        # Sort: resolved first (correct → wrong), then pending
        predictions.sort(key=lambda p: (
            0 if p.get("status") == "resolved" and p.get("was_correct") else
            1 if p.get("status") == "resolved" else
            2
        ))

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
            "recent_predictions": predictions,
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
    For each pending Polymarket prediction, queries the Polymarket CLOB API
    directly by conditionId to check if that specific market has resolved.

    Uses https://clob.polymarket.com/markets/{conditionId} which returns the
    exact market with tokens[].winner=true for the winning outcome.

    Note: The Gamma API (/markets?conditionId=X) does NOT filter by conditionId
    and returns unrelated markets. The CLOB API is the only reliable way to
    look up a specific market by conditionId.
    """
    import requests
    import concurrent.futures

    CLOB_URL = "https://clob.polymarket.com"

    try:
        docs = list(
            fs.db.collection(Collection.PREDICTIONS)
            .where("status", "==", "pending")
            .stream()
        )

        logger.info(f"resolve_predictions: checking {len(docs)} pending predictions")

        updated = 0
        skipped_non_poly = 0
        skipped_not_resolved = 0
        errors = 0

        def process_doc(doc):
            p = doc.to_dict()
            market_id = p.get("market_id", "")
            source = p.get("source", "unknown")

            if source != "polymarket" or not market_id.startswith("poly_0x"):
                return {"type": "skip_non_poly"}

            condition_id = market_id[len("poly_"):]

            try:
                resp = requests.get(
                    f"{CLOB_URL}/markets/{condition_id}",
                    timeout=10,
                )
                resp.raise_for_status()
                market = resp.json()

                if not market.get("closed", False):
                    return {"type": "skip_not_resolved", "title": p.get("market_title")}

                tokens = market.get("tokens", [])
                winner_token = next(
                    (t for t in tokens if t.get("winner") is True), None
                )

                if not winner_token:
                    return {"type": "skip_not_resolved", "title": p.get("market_title")}

                winner = winner_token.get("outcome", "").upper()
                if winner not in ("YES", "NO"):
                    return {"type": "skip_not_resolved"}

                predicted_outcome = p.get("predicted_outcome", "YES")
                was_correct = predicted_outcome == winner

                return {
                    "type": "resolved",
                    "doc_id": doc.id,
                    "title": p.get("market_title"),
                    "winner": winner,
                    "predicted_outcome": predicted_outcome,
                    "was_correct": was_correct,
                }
            except requests.exceptions.Timeout:
                return {"type": "error", "condition_id": condition_id, "error": "Timeout"}
            except Exception as e:
                return {"type": "error", "condition_id": condition_id, "error": str(e)}

        batch = fs.db.batch()
        batch_count = 0

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            results = list(executor.map(process_doc, docs))

        for res in results:
            if res["type"] == "skip_non_poly":
                skipped_non_poly += 1
            elif res["type"] == "skip_not_resolved":
                skipped_not_resolved += 1
                if "title" in res:
                    logger.debug(f"Closed but no winner yet: {res['title']!r}")
            elif res["type"] == "error":
                errors += 1
                logger.warning(f"Error for {res.get('condition_id', '')}: {res['error']}")
            elif res["type"] == "resolved":
                doc_ref = fs.db.collection(Collection.PREDICTIONS).document(res["doc_id"])
                batch.update(doc_ref, {
                    "status": "resolved",
                    "resolved_outcome": res["winner"],
                    "was_correct": res["was_correct"],
                })
                updated += 1
                batch_count += 1
                logger.info(
                    f"Resolved '{res['title']}': "
                    f"predicted={res['predicted_outcome']} actual={res['winner']} "
                    f"correct={res['was_correct']}"
                )
                
                if batch_count >= 500:
                    batch.commit()
                    batch = fs.db.batch()
                    batch_count = 0

        if batch_count > 0:
            batch.commit()

        # Bust stats cache
        global _stats_cache
        _stats_cache = {"data": None, "ts": 0}

        skipped_total = skipped_non_poly + skipped_not_resolved
        message = (
            f"Resolved {updated} prediction(s). "
            f"{skipped_not_resolved} still pending (not yet resolved on Polymarket). "
            f"{skipped_non_poly} skipped (non-Polymarket, use manual resolve)."
        )
        if errors:
            message += f" {errors} API error(s)."

        logger.info(f"resolve_predictions complete: {message}")
        return Response({
            "success": True,
            "updated": updated,
            "skipped": skipped_total,
            "skipped_non_polymarket": skipped_non_poly,
            "skipped_not_resolved_yet": skipped_not_resolved,
            "errors": errors,
            "message": message,
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
        # Stream doc IDs first, then use batch to update them
        docs = list(fs.db.collection(Collection.PREDICTIONS).stream())
        count = 0
        
        batch = fs.db.batch()
        batch_count = 0

        for doc in docs:
            batch.update(doc.reference, {
                "status": "pending",
                "resolved_outcome": None,
                "was_correct": None,
            })
            count += 1
            batch_count += 1
            
            if batch_count >= 500:
                batch.commit()
                batch = fs.db.batch()
                batch_count = 0
                
        if batch_count > 0:
            batch.commit()

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
