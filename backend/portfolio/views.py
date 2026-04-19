"""
API views for Portfolio
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.utils import timezone
from django.contrib.auth.models import User
from .models import UserProfile, Trade, PortfolioSnapshot
from .serializers import (
    UserProfileSerializer,
    TradeSerializer,
    TradeCreateSerializer,
    PortfolioSnapshotSerializer,
)
from signals.models import Signal
from .analytics import calculate_portfolio_metrics
import logging
from decimal import Decimal

logger = logging.getLogger(__name__)


class TradePagination(PageNumberPagination):
    """Custom pagination for trades"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class PortfolioViewSet(viewsets.ViewSet):
    """
    API endpoints for portfolio management
    """
    
    @action(detail=False, methods=['get'])
    def profile(self, request):
        """
        Get user profile
        
        GET /api/portfolio/profile/
        
        For now, returns a default profile
        TODO: Add authentication
        """
        # Get or create default user profile
        user, _ = User.objects.get_or_create(username='default_user')
        profile, _ = UserProfile.objects.get_or_create(user=user)
        
        serializer = UserProfileSerializer(profile)
        return Response({
            'success': True,
            'profile': serializer.data,
        })
    
    @action(detail=False, methods=['post'])
    def update_profile(self, request):
        """
        Update user profile settings
        
        POST /api/portfolio/update_profile/
        Body: {
            "bankroll": 10000,
            "risk_tolerance": "balanced"
        }
        """
        try:
            user, _ = User.objects.get_or_create(username='default_user')
            profile, _ = UserProfile.objects.get_or_create(user=user)
            
            # Update fields
            if 'bankroll' in request.data:
                profile.bankroll = request.data['bankroll']
            
            if 'risk_tolerance' in request.data:
                risk = request.data['risk_tolerance']
                if risk in ['conservative', 'balanced', 'aggressive']:
                    profile.risk_tolerance = risk
            
            profile.save()
            
            serializer = UserProfileSerializer(profile)
            return Response({
                'success': True,
                'profile': serializer.data,
            })
            
        except Exception as e:
            logger.error(f"Error updating profile: {str(e)}")
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def trades(self, request):
        """
        Get user's trade history
        
        GET /api/portfolio/trades/?status=open
        """
        user, _ = User.objects.get_or_create(username='default_user')
        
        trades = Trade.objects.filter(user=user)
        
        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            trades = trades.filter(status=status_filter)
        
        trades = trades.order_by('-opened_at')
        
        serializer = TradeSerializer(trades, many=True)
        
        return Response({
            'success': True,
            'count': trades.count(),
            'trades': serializer.data,
        })
    
    @action(detail=False, methods=['post'])
    def simulate_trade(self, request):
        """
        Record a simulated trade
        
        POST /api/portfolio/simulate_trade/
        Body: {
            "signal_id": 123,
            "stake_amount": 1500
        }
        """
        try:
            serializer = TradeCreateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            signal_id = serializer.validated_data['signal_id']
            stake_amount = serializer.validated_data['stake_amount']
            
            # Get signal
            signal = Signal.objects.get(id=signal_id)
            
            # Get user
            user, _ = User.objects.get_or_create(username='default_user')
            profile, _ = UserProfile.objects.get_or_create(user=user)
            
            # Validate stake doesn't exceed bankroll
            if stake_amount > profile.bankroll:
                return Response({
                    'success': False,
                    'error': 'Stake exceeds available bankroll',
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Determine recommended stake based on risk tolerance
            if profile.risk_tolerance == 'conservative':
                recommended = signal.recommended_stake_conservative
            elif profile.risk_tolerance == 'aggressive':
                recommended = signal.recommended_stake_aggressive
            else:
                recommended = signal.recommended_stake_balanced
            
            # Create trade
            trade = Trade.objects.create(
                user=user,
                signal=signal,
                market=signal.market,
                direction=signal.direction,
                stake_amount=stake_amount,
                entry_price=signal.market.current_price,
                recommended_stake=recommended,
                status='open',
            )
            
            # Check Kelly compliance
            trade.check_kelly_compliance()
            trade.save()
            
            # Update profile
            profile.total_trades += 1
            profile.bankroll -= stake_amount  # Deduct stake
            profile.save()
            
            serializer = TradeSerializer(trade)
            
            return Response({
                'success': True,
                'trade': serializer.data,
                'message': 'Trade recorded successfully',
            })
            
        except Signal.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Signal not found',
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error simulating trade: {str(e)}")
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def close_trade(self, request):
        """
        Close an open trade
        
        POST /api/portfolio/close_trade/
        Body: {
            "trade_id": 123,
            "exit_price": 0.75
        }
        """
        try:
            trade_id = request.data.get('trade_id')
            exit_price = request.data.get('exit_price')

            # in order to fix unsupported operand issue
            trade_id = int(request.data.get('trade_id'))
            exit_price = Decimal(str(request.data.get('exit_price')))
            
            trade = Trade.objects.get(id=trade_id, status='open')
            
            # Set exit price and calculate PnL
            trade.exit_price = exit_price
            trade.calculate_pnl()
            
            # Determine if won or lost
            if trade.pnl > 0:
                trade.status = 'won'
            else:
                trade.status = 'lost'
            
            trade.closed_at = timezone.now()
            trade.save()
            
            # Update user profile
            profile = trade.user.profile
            profile.total_pnl += trade.pnl
            profile.bankroll += (trade.stake_amount + trade.pnl)  # Return stake + profit/loss
            
            if trade.status == 'won':
                profile.winning_trades += 1
            
            profile.save()
            
            serializer = TradeSerializer(trade)
            
            return Response({
                'success': True,
                'trade': serializer.data,
                'message': f'Trade closed - {"Win" if trade.pnl > 0 else "Loss"}',
            })
            
        except Trade.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Trade not found or already closed',
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error closing trade: {str(e)}")
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """
        Get portfolio analytics
        
        GET /api/portfolio/analytics/
        """
        try:
            user, _ = User.objects.get_or_create(username='default_user')
            
            metrics = calculate_portfolio_metrics(user)
            
            return Response({
                'success': True,
                'analytics': metrics,
            })
            
        except Exception as e:
            logger.error(f"Error calculating analytics: {str(e)}")
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
