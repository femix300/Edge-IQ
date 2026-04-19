"""
Serializers for Market data
"""
from rest_framework import serializers
from .models import Market, QuantMetrics, PriceHistory


class PriceHistorySerializer(serializers.ModelSerializer):
    """Serializer for price history points"""
    
    class Meta:
        model = PriceHistory
        fields = ['price', 'volume', 'timestamp']


class QuantMetricsSerializer(serializers.ModelSerializer):
    """Serializer for quantitative metrics"""
    
    class Meta:
        model = QuantMetrics
        fields = [
            'momentum_score',
            'momentum_direction',
            'price_change_1h',
            'price_change_6h',
            'price_change_24h',
            'volume_acceleration',
            'volume_trend',
            'bid_ask_spread',
            'order_book_bias',
            'bid_depth',
            'ask_depth',
            'calculated_at',
        ]


class MarketListSerializer(serializers.ModelSerializer):
    """Serializer for market list view"""
    
    time_remaining_hours = serializers.SerializerMethodField()
    has_active_signal = serializers.SerializerMethodField()
    
    class Meta:
        model = Market
        fields = [
            'id',
            'bayse_event_id',
            'title',
            'category',
            'current_price',
            'implied_probability',
            'volume_24h',
            'liquidity',
            'status',
            'signal_potential_score',
            'time_remaining_hours',
            'has_active_signal',
            'closes_at',
        ]
    
    def get_time_remaining_hours(self, obj):
        """Calculate hours until market closes"""
        return obj.time_remaining
    
    def get_has_active_signal(self, obj):
        """Check if market has an active signal"""
        return obj.signals.filter(is_active=True).exists()


class MarketDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed market view"""
    
    latest_quant_metrics = serializers.SerializerMethodField()
    price_history = serializers.SerializerMethodField()
    time_remaining_hours = serializers.SerializerMethodField()
    
    class Meta:
        model = Market
        fields = [
            'id',
            'bayse_event_id',
            'bayse_market_id',
            'title',
            'description',
            'category',
            'current_price',
            'implied_probability',
            'volume_24h',
            'total_volume',
            'liquidity',
            'status',
            'signal_potential_score',
            'opens_at',
            'closes_at',
            'time_remaining_hours',
            'latest_quant_metrics',
            'price_history',
            'created_at',
            'updated_at',
        ]
    
    def get_latest_quant_metrics(self, obj):
        """Get most recent quant metrics"""
        try:
            latest = obj.quant_metrics.latest()
            return QuantMetricsSerializer(latest).data
        except QuantMetrics.DoesNotExist:
            return None
    
    def get_price_history(self, obj):
        """Get recent price history"""
        history = obj.price_history.all()[:100]  # Last 100 points
        return PriceHistorySerializer(history, many=True).data
    
    def get_time_remaining_hours(self, obj):
        """Calculate hours until market closes"""
        return obj.time_remaining
