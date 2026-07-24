"""
API views for Markets — Firestore-only (Cloud Run compatible)
"""
from utils.firebase_client import fs, Collection
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.utils import timezone
from services.bayse_client import bayse_client
from agents.market_scanner import scan_markets, get_top_markets
from agents.signal_generator import generate_signal
from .tasks import async_scan_markets, async_analyze_market
from celery.result import AsyncResult
import logging
import uuid
from django.core.cache import cache

logger = logging.getLogger(__name__)


class MarketPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class MarketViewSet(viewsets.GenericViewSet):
    """
    list:      GET  /api/markets/
    retrieve:  GET  /api/markets/{firestore_doc_id}/
    scan:      POST /api/markets/scan/
    analyze:   POST /api/markets/{firestore_doc_id}/analyze/
    top:       GET  /api/markets/top/
    price_history: GET /api/markets/price_history/
    order_book:    GET /api/markets/order_book/
    """
    def _get_uid_from_request(self, request):
        """Extract Firebase UID from Authorization header or request.user."""
        if request.user.is_authenticated:
            return str(request.user.username)
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                from firebase_admin import auth as firebase_auth
                token = auth_header[7:]
                decoded = firebase_auth.verify_id_token(token, check_revoked=False)
                return decoded.get("uid", "anonymous")
            except:
                pass
        return "anonymous"

    pagination_class = MarketPagination

    # ── list ──────────────────────────────────────────────────────────
    def list(self, request):
        """GET /api/markets/?status=open&category=sports"""
        status_filter = request.query_params.get('status', 'open')
        category = request.query_params.get('category')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 100))

        try:
            market_version = cache.get("market_version", 0)
            cache_key = f"market_list_v{market_version}_{status_filter}_{category}_{page}_{page_size}"
            cached_response = cache.get(cache_key)
            if cached_response:
                return Response(cached_response)
        except Exception:
            cache_key = None  # Cache unavailable — proceed without it

        statuses = [s.strip() for s in status_filter.split(',') if s.strip()]

        def build_filters(source):
            f = []
            if statuses:
                if len(statuses) == 1:
                    f.append(("status", "==", statuses[0]))
                else:
                    f.append(("status", "in", statuses))
            if category:
                f.append(("category", "==", category))
            f.append(("source", "==", source))
            return f

        def safe_score(m):
            try:
                return float(m.get("signal_potential_score") or 0)
            except (TypeError, ValueError):
                return 0.0

        # Query each source separately so neither crowds out the other
        bayse_markets = fs.query(
            collection=Collection.MARKETS,
            filters=build_filters("bayse"),
            order_by=("signal_potential_score", True),
            limit=100,
        )
        poly_markets = fs.query(
            collection=Collection.MARKETS,
            filters=build_filters("polymarket"),
            order_by=("signal_potential_score", True),
            limit=100,
        )

        # Merge, deduplicate by doc id
        seen = set()
        markets = []
        for m in bayse_markets + poly_markets:
            doc_id = m.get("bayse_event_id") or m.get("id", "")
            if doc_id and doc_id not in seen:
                seen.add(doc_id)
                m["id"] = doc_id
                m["time_remaining_hours"] = m.get("time_remaining") or m.get("time_remaining_hours") or 0
                if not m.get("source"):
                    m["source"] = "bayse"
                markets.append(m)

        # Sort merged list by signal_potential_score descending
        markets.sort(key=safe_score, reverse=True)

        # Paginate
        start = (page - 1) * page_size
        end = start + page_size
        page_data = markets[start:end]

        response_data = {
            "count": len(markets),
            "next": f"/api/markets/?page={page+1}&page_size={page_size}" if end < len(markets) else None,
            "previous": f"/api/markets/?page={page-1}&page_size={page_size}" if page > 1 else None,
            "results": page_data,
        }
        try:
            if cache_key:
                cache.set(cache_key, response_data, timeout=60 * 5)  # 5 minutes
        except Exception:
            pass
        return Response(response_data)

    # ── retrieve ──────────────────────────────────────────────────────
    def retrieve(self, request, pk=None):
        """GET /api/markets/{firestore_doc_id}/"""
        market = fs.get(Collection.MARKETS, pk)
        if not market:
            return Response({"error": "Market not found"}, status=404)

        market["id"] = market.get("bayse_event_id", pk)
        market["time_remaining_hours"] = market.get("time_remaining", 0)

        # Attach latest quant metrics
        metrics = fs.query(
            Collection.QUANT_METRICS,
            filters=[("market_id", "==", pk)],
            order_by=("calculated_at", True),
            limit=1,
        )
        market["latest_quant_metrics"] = metrics[0] if metrics else None

        return Response(market)

    # ── scan ──────────────────────────────────────────────────────────
    @action(detail=False, methods=['post'])
    def scan(self, request):
        """POST /api/markets/scan/ — trigger Agent 01 market scanner"""
        try:
            # Invalidate market list cache
            version = cache.get("market_version", 0)
            cache.set("market_version", version + 1, timeout=None)

            max_results = int(request.data.get('max_results', 20))
            min_volume = float(request.data.get('min_volume', 0))
            min_liquidity = float(request.data.get('min_liquidity', 0))

            source = request.data.get('source', 'all')
            markets = []
            
            if source in ['all', 'polymarket']:
                from agents.polymarket_scanner import scan_markets as poly_scan
                markets.extend(poly_scan(max_results=max_results))
                
            if source in ['all', 'bayse']:
                markets.extend(scan_markets(
                    max_results=max_results,
                    min_volume=min_volume,
                    min_liquidity=min_liquidity,
                ))

            def safe_score(m):
                try:
                    return float(m.get("signal_potential_score") or 0)
                except (TypeError, ValueError):
                    return 0.0
                    
            markets.sort(key=safe_score, reverse=True)
            if source == 'all':
                markets = markets[:max_results * 2]

            return Response({
                "success": True,
                "count": len(markets),
                "markets": markets,
                "scanned_at": timezone.now(),
            })
        except Exception as e:
            logger.error(f"Market scan failed: {e}")
            return Response({"success": False, "error": str(e)}, status=500)

    @action(detail=True, methods=['post'])
    def analyze(self, request, pk=None):
        """POST /api/markets/{pk}/analyze/ — full 4-agent pipeline"""
        try:
            from agents.quant_analyzer import analyze_market
            from agents.ai_probability import estimate_probability
            from services.gemini_client import gemini_client

            market = fs.get(Collection.MARKETS, pk)
            if not market:
                return Response({"success": False, "error": "Market not found"}, status=404)

            user_bankroll = float(request.data.get('user_bankroll', 10000))

            # Sync latest market data
            market["id"] = market.get("bayse_event_id", pk)
            fs.set(Collection.MARKETS, pk, market, merge=True)

            # Agent 02: Quant
            quant_metrics = analyze_market(pk)

            # Agent 03: AI
            ai_result = estimate_probability(pk)

            # Agent 04: Signal
            signal_doc = generate_signal(market_event_id=pk, user_id=self._get_uid_from_request(request), user_bankroll=user_bankroll)

            # Latest AI analysis
            latest_ai = fs.query(
                Collection.AI_ANALYSES,
                filters=[("market_id", "==", pk)],
                order_by=("analyzed_at", True),
                limit=1,
            )
            
            # Check API Quotas concurrently in the background after pipeline to ensure robustness for next request
            from markets.tasks import async_check_quotas
            async_check_quotas.delay()

            return Response({
                "success": True,
                "market": market,
                "quant_metrics": quant_metrics,
                "ai_analysis": latest_ai[0] if latest_ai else None,
                "signal": signal_doc,
                "analyzed_at": timezone.now(),
            })
        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            return Response({"success": False, "error": str(e)}, status=500)

    # ── check_quotas ──────────────────────────────────────────────────
    @action(detail=False, methods=['post', 'get'])
    def check_quotas(self, request):
        """POST/GET /api/markets/check_quotas/ — triggers background quota checking"""
        from markets.tasks import async_check_quotas
        async_check_quotas.delay()
        return Response({
            "success": True,
            "message": "Background quota check started."
        })

    # ── top ───────────────────────────────────────────────────────────
    @action(detail=False, methods=['get'])
    def top(self, request):
        """GET /api/markets/top/?limit=10&category=crypto"""
        limit = int(request.query_params.get('limit', 20))
        category = request.query_params.get('category')

        markets = get_top_markets(limit=limit, category=category)

        # Deduplicate
        seen = set()
        unique = []
        for m in markets:
            eid = m.get("bayse_event_id")
            if eid not in seen:
                seen.add(eid)
                m["id"] = eid
                m["time_remaining_hours"] = m.get("time_remaining") or m.get("time_remaining_hours") or 0
                unique.append(m)

        return Response({"success": True, "count": len(unique), "markets": unique})

    # ── price_history ─────────────────────────────────────────────────
    @action(detail=False, methods=['get'])
    def price_history(self, request):
        """GET /api/markets/price_history/?event_id=..."""
        event_id = request.query_params.get('event_id')
        if not event_id:
            return Response({"error": "event_id required"}, status=400)
        try:
            market = fs.get(Collection.MARKETS, event_id)
            source = market.get('source', 'bayse') if market else 'bayse'
            if source == 'polymarket':
                from services.polymarket_client import polymarket_client
                token_id = market.get('bayse_market_id')
                condition_id = event_id.replace('poly_', '') if event_id.startswith('poly_') else event_id
                history = polymarket_client.get_price_history(condition_id, token_id)
            else:
                history = bayse_client.get_price_history(event_id)
            return Response(history if history else [])
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    # ── order_book ────────────────────────────────────────────────────
    @action(detail=False, methods=['get'])
    def order_book(self, request):
        """GET /api/markets/order_book/?event_id=..."""
        event_id = request.query_params.get('event_id')
        if not event_id:
            return Response({"error": "event_id required"}, status=400)
        try:
            market = fs.get(Collection.MARKETS, event_id)
            source = market.get('source', 'bayse') if market else 'bayse'
            if source == 'polymarket':
                from services.polymarket_client import polymarket_client
                token_id = market.get('bayse_market_id') if market else None
                ob = polymarket_client.get_order_book(token_id) if token_id else {}
            else:
                outcome_id = bayse_client.get_outcome_id(event_id)
                if not outcome_id:
                    return Response({"error": "No active order book"}, status=404)
                ob = bayse_client.get_order_book(outcome_id)
            return Response(ob if ob else {})
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    # ── async helpers ─────────────────────────────────────────────────
    @action(detail=False, methods=['post'])
    def scan_async(self, request):
        """POST /api/markets/scan_async/"""
        task = async_scan_markets.delay(
            status=request.data.get('status', 'open'),
            min_volume=request.data.get('min_volume', 0),
            min_liquidity=request.data.get('min_liquidity', 0),
            max_results=request.data.get('max_results', 50),
        )
        return Response({
            "success": True,
            "task_id": task.id,
            "status_url": f"/api/markets/task_status/{task.id}/",
        })

    @action(detail=True, methods=['post'])
    def analyze_async(self, request, pk=None):
        """POST /api/markets/{pk}/analyze_async/"""
        task = async_analyze_market.delay(
            market_id=pk,
            user_bankroll=request.data.get('user_bankroll', 10000),
        )
        return Response({
            "success": True,
            "task_id": task.id,
            "status_url": f"/api/markets/task_status/{task.id}/",
        })

    @action(detail=False, methods=['get'])
    def task_status(self, request):
        """GET /api/markets/task_status/?task_id=xxx"""
        task_id = request.query_params.get('task_id')
        if not task_id:
            return Response({"error": "task_id required"}, status=400)
        task = AsyncResult(task_id)
        return Response({
            "task_id": task_id,
            "status": task.status,
            "ready": task.ready(),
            "result": task.result if task.ready() else None,
            "error": str(task.info) if task.failed() else None,
        })
