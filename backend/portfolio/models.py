"""
Portfolio models - user trade tracking
"""
from django.db import models
from django.contrib.auth.models import User
from signals.models import Signal
from markets.models import Market
# Create your models here.

class UserProfile(models.Model):
    """
    Extended user profile with trading preferences
    """
    RISK_TOLERANCE_CHOICES = [
        ('conservative', 'Conservative (25% Kelly)'),
        ('balanced', 'Balanced (50% Kelly)'),
        ('aggressive', 'Aggressive (100% Kelly)'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Trading settings
    bankroll = models.DecimalField(max_digits=15, decimal_places=2, default=10000)
    risk_tolerance = models.CharField(max_length=20, choices=RISK_TOLERANCE_CHOICES, default='balanced')
    
    # Performance tracking
    total_trades = models.IntegerField(default=0)
    winning_trades = models.IntegerField(default=0)
    total_pnl = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"
    
    @property
    def win_rate(self):
        """Calculate win rate percentage"""
        if self.total_trades == 0:
            return 0
        return (self.winning_trades / self.total_trades) * 100
    
    @property
    def kelly_multiplier(self):
        """Get Kelly fraction multiplier based on risk tolerance"""
        multipliers = {
            'conservative': 0.25,
            'balanced': 0.5,
            'aggressive': 1.0,
        }
        return multipliers.get(self.risk_tolerance, 0.5)

class Trade(models.Model):
    """
    Individual trade (simulated or real)
    """
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('closed', 'Closed'),
        ('won', 'Won'),
        ('lost', 'Lost'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trades')
    signal = models.ForeignKey(Signal, on_delete=models.CASCADE, related_name='trades')
    market = models.ForeignKey(Market, on_delete=models.CASCADE, related_name='trades')
    
    # Trade details
    direction = models.CharField(max_length=10)  # BUY, SELL
    stake_amount = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Prices
    entry_price = models.DecimalField(max_digits=10, decimal_places=6)
    exit_price = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    
    # Performance
    pnl = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    roi = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)  # %
    
    # Kelly compliance
    recommended_stake = models.DecimalField(max_digits=15, decimal_places=2)
    kelly_compliant = models.BooleanField(default=False)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    
    # Timestamps
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-opened_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'opened_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.direction} {self.market.title}"
    
    def calculate_pnl(self):
        """Calculate profit/loss for closed trade"""
        if not self.exit_price:
            return None
        
        if self.direction == 'BUY':
            self.pnl = (self.exit_price - self.entry_price) * self.stake_amount
        else:  # SELL
            self.pnl = (self.entry_price - self.exit_price) * self.stake_amount
        
        self.roi = (self.pnl / self.stake_amount) * 100 if self.stake_amount > 0 else 0
        return self.pnl
    
    def check_kelly_compliance(self):
        """Check if stake was within 10% of Kelly recommendation"""
        if self.recommended_stake > 0:
            variance = abs(self.stake_amount - self.recommended_stake) / self.recommended_stake
            self.kelly_compliant = variance <= 0.1
        return self.kelly_compliant

class PortfolioSnapshot(models.Model):
    """
    Daily snapshot of portfolio performance
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='snapshots')
    
    # Portfolio metrics
    total_value = models.DecimalField(max_digits=15, decimal_places=2)
    total_pnl = models.DecimalField(max_digits=15, decimal_places=2)
    win_rate = models.DecimalField(max_digits=5, decimal_places=2)
    
    # Quant metrics
    sharpe_ratio = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)
    max_drawdown = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Timestamp
    snapshot_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-snapshot_date']
        unique_together = ['user', 'snapshot_date']
    
    def __str__(self):
        return f"{self.user.username} - {self.snapshot_date}"