"""
API views for Backtesting
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import BacktestStrategy, BacktestResult
from .serializers import BacktestStrategySerializer, BacktestResultSerializer
import logging

logger = logging.getLogger(__name__)


class BacktestViewSet(viewsets.ViewSet):
    """
    API endpoints for backtesting
    """
    
    @action(detail=False, methods=['get'])
    def strategies(self, request):
        """
        Get all backtest strategies
        
        GET /api/backtest/strategies/
        """
        from django.contrib.auth.models import User
        
        user, _ = User.objects.get_or_create(username='default_user')
        strategies = BacktestStrategy.objects.filter(user=user)
        
        serializer = BacktestStrategySerializer(strategies, many=True)
        
        return Response({
            'success': True,
            'count': strategies.count(),
            'strategies': serializer.data,
        })
    
    @action(detail=False, methods=['get'])
    def results(self, request):
        """
        Get backtest results
        
        GET /api/backtest/results/
        """
        results = BacktestResult.objects.all().order_by('-created_at')[:20]
        
        serializer = BacktestResultSerializer(results, many=True)
        
        return Response({
            'success': True,
            'count': results.count(),
            'results': serializer.data,
        })
    
    @action(detail=False, methods=['post'])
    def run(self, request):
        """
        Run a backtest
        
        POST /api/backtest/run/
        Body: {
            "strategy_config": {
                "min_edge": 20,
                "min_momentum": 10,
                "categories": ["crypto"]
            },
            "initial_bankroll": 10000
        }
        
        Note: This is a placeholder - full implementation would require
        historical Bayse data which may not be available yet
        """
        return Response({
            'success': False,
            'message': 'Backtesting requires historical data - coming soon',
        }, status=status.HTTP_501_NOT_IMPLEMENTED)
