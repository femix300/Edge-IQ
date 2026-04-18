"""
API views for Markets
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.utils import timezone
from .models import Market
from .serializers import MarketListSerializer, MarketDetailSerializer
from agents.market_scanner import scan_markets, get_top_markets
from agents.signal_generator import run_full_analysis_pipeline
import logging

logger = logging.getLogger(__name__)


class MarketPagination(PageNumberPagination):
    """Custom pagination for markets"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class MarketViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoints for markets
    
    list: Get all active markets
    retrieve: Get detailed market info
    scan: Trigger market scan
    analyze: Run full 4-agent analysis
    """
    
    queryset = Market.objects.all()
    pagination_class = MarketPagination
    
    def get_serializer_class(self):
        """Use different serializers for list vs detail"""
        if self.action == 'list':
            return MarketListSerializer
        return MarketDetailSerializer
    
    def get_queryset(self):
        """Filter markets based on query params"""
        queryset = Market.objects.all()
        
        # Filter by status
        status_filter = self.request.query_params.get('status', 'active')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        # Filter by minimum volume
        min_volume = self.request.query_params.get('min_volume')
        if min_volume:
            queryset = queryset.filter(volume_24h__gte=min_volume)
        
        # Order by signal potential score
        queryset = queryset.order_by('-signal_potential_score', '-volume_24h')
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def scan(self, request):
        """
        Trigger Agent 01: Market Scanner
        
        POST /api/markets/scan/
        
        Returns:
            List of scanned markets
        """
        try:
            logger.info("Triggering market scan via API")
            
            # Get parameters from request
            max_results = int(request.data.get('max_results', 20))
            min_volume = float(request.data.get('min_volume', 1000))
            
            # Run scanner
            markets = scan_markets(
                max_results=max_results,
                min_volume=min_volume
            )
            
            # Serialize and return
            serializer = MarketListSerializer(markets, many=True)
            
            return Response({
                'success': True,
                'count': len(markets),
                'markets': serializer.data,
                'scanned_at': timezone.now(),
            })
            
        except Exception as e:
            logger.error(f"Error during market scan: {str(e)}")
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def analyze(self, request, pk=None):
        """
        Run full 4-agent analysis pipeline
        
        POST /api/markets/{id}/analyze/
        
        Body:
            {
                "user_bankroll": 10000  (optional)
            }
        
        Returns:
            Complete analysis with quant metrics, AI probability, and signal
        """
        try:
            market = self.get_object()
            logger.info(f"Running full analysis for market: {market.title}")
            
            # Get user bankroll from request
            user_bankroll = float(request.data.get('user_bankroll', 10000))
            
            # Run the pipeline
            result = run_full_analysis_pipeline(
                market_id=market.id,
                user_bankroll=user_bankroll
            )
            
            # Prepare response
            from signals.serializers import SignalSerializer
            
            response_data = {
                'success': True,
                'market': MarketDetailSerializer(market).data,
                'quant_metrics': result['quant_metrics'],
                'ai_analysis': {
                    'probability': result['ai_analysis']['probability'],
                    'confidence': result['ai_analysis']['confidence'],
                    'reasoning': result['ai_analysis']['reasoning'],
                    'key_factors': result['ai_analysis'].get('key_factors', []),
                },
                'signal': None,
                'analyzed_at': timezone.now(),
            }
            
            # Add signal if generated
            if result['signal']:
                response_data['signal'] = SignalSerializer(result['signal']).data
            else:
                response_data['message'] = 'No signal generated - edge below threshold'
            
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Error during analysis: {str(e)}")
            import traceback
            traceback.print_exc()
            
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def top(self, request):
        """
        Get top markets by signal potential
        
        GET /api/markets/top/?limit=10&category=crypto
        
        Returns:
            Top markets ranked by signal potential
        """
        limit = int(request.query_params.get('limit', 20))
        category = request.query_params.get('category')
        
        markets = get_top_markets(limit=limit, category=category)
        serializer = MarketListSerializer(markets, many=True)
        
        return Response({
            'success': True,
            'count': len(markets),
            'markets': serializer.data,
        })
