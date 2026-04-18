from django.contrib import admin
from .models import UserProfile, Trade, PortfolioSnapshot


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'bankroll', 'risk_tolerance', 'total_trades', 'win_rate', 'total_pnl']
    list_filter = ['risk_tolerance']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Trade)
class TradeAdmin(admin.ModelAdmin):
    list_display = ['user', 'market', 'direction', 'stake_amount', 'status', 'pnl', 'kelly_compliant', 'opened_at']
    list_filter = ['status', 'direction', 'kelly_compliant']
    readonly_fields = ['opened_at', 'closed_at']


@admin.register(PortfolioSnapshot)
class PortfolioSnapshotAdmin(admin.ModelAdmin):
    list_display = ['user', 'snapshot_date', 'total_value', 'total_pnl', 'win_rate']
    list_filter = ['snapshot_date']
    readonly_fields = ['created_at']