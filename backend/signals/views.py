"""
API views for Signals
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.utils import timezone
from .models import Signal
from .serializers import SignalSerializer, SignalListSerializer
from agents.signal_generator import get_active_signals, deactivate_expired_signals
import logging

logger = logging.getLogger(__name__)


class SignalPagination(PageNumberPagination):
    """Custom pagination for signals"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50


class SignalViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoints for trading signals
    
    list: Get all active signals
    retrieve: Get detailed signal info
    active: Get top active signals
    """
    
    queryset = Signal.objects.all()
    pagination_class = SignalPagination
    
    def get_serializer_class(self):
        """Use different serializers for list vs detail"""
        if self.action == 'list' or self.action == 'active':
            return SignalListSerializer
        return SignalSerializer
    
    def get_queryset(self):
        """Filter signals based on query params"""
        queryset = Signal.objects.all()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', 'true')
        if is_active.lower() == 'true':
            queryset = queryset.filter(is_active=True, expires_at__gt=timezone.now())
        
        # Filter by direction
        direction = self.request.query_params.get('direction')
        if direction:
            queryset = queryset.filter(direction=direction.upper())
        
        # Filter by minimum edge
        min_edge = self.request.query_params.get('min_edge')
        if min_edge:
            queryset = queryset.filter(edge_score__gte=min_edge)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(market__category=category)
        
        # Filter by signal strength
        strength = self.request.query_params.get('strength')
        if strength:
            queryset = queryset.filter(signal_strength=strength)
        
        # Order by edge score (strongest first)
        queryset = queryset.order_by('-edge_score', '-created_at')
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Get top active signals
        
        GET /api/signals/active/?limit=10&min_edge=20
        
        Returns:
            Top active signals ranked by edge score
        """
        limit = int(request.query_params.get('limit', 20))
        min_edge = float(request.query_params.get('min_edge', 15))
        
        signals = get_active_signals(limit=limit, min_edge=min_edge)
        serializer = SignalListSerializer(signals, many=True)
        
        return Response({
            'success': True,
            'count': len(signals),
            'signals': serializer.data,
        })
    
    @action(detail=False, methods=['post'])
    def cleanup(self, request):
        """
        Deactivate expired signals
        
        POST /api/signals/cleanup/
        
        Returns:
            Number of signals deactivated
        """
        try:
            count = deactivate_expired_signals()
            
            return Response({
                'success': True,
                'deactivated_count': count,
                'message': f'Deactivated {count} expired signals',
            })
            
        except Exception as e:
            logger.error(f"Error during signal cleanup: {str(e)}")
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get signal statistics
        
        GET /api/signals/stats/
        
        Returns:
            Aggregate statistics about signals
        """
        from django.db.models import Count, Avg, Max, Min
        
        active_signals = Signal.objects.filter(is_active=True, expires_at__gt=timezone.now())
        
        stats = {
            'total_active': active_signals.count(),
            'by_direction': {
                'BUY': active_signals.filter(direction='BUY').count(),
                'SELL': active_signals.filter(direction='SELL').count(),
                'WAIT': active_signals.filter(direction='WAIT').count(),
            },
            'by_strength': {
                'strong': active_signals.filter(signal_strength='strong').count(),
                'moderate': active_signals.filter(signal_strength='moderate').count(),
                'weak': active_signals.filter(signal_strength='weak').count(),
            },
            'edge_stats': active_signals.aggregate(
                avg_edge=Avg('edge_score'),
                max_edge=Max('edge_score'),
                min_edge=Min('edge_score'),
            ),
            'confidence_stats': active_signals.aggregate(
                avg_confidence=Avg('confidence'),
                max_confidence=Max('confidence'),
                min_confidence=Min('confidence'),
            ),
        }
        
        return Response({
            'success': True,
            'stats': stats,
        })
