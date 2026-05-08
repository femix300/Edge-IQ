from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SignalViewSet
from .prediction_views import prediction_stats, resolve_predictions

router = DefaultRouter()
router.register('', SignalViewSet, basename='signal')

urlpatterns = [
    # Custom actions must be defined BEFORE the router
    path('calibration-curve/', SignalViewSet.as_view({'get': 'calibration_curve'}), name='calibration-curve'),
    path('accuracy-metrics/', SignalViewSet.as_view({'get': 'accuracy_metrics'}), name='accuracy-metrics'),
    path('resolved-markets/', SignalViewSet.as_view({'get': 'resolved_markets'}), name='resolved-markets'),
    path('active/', SignalViewSet.as_view({'get': 'active'}), name='signal-active'),
    path('stats/', SignalViewSet.as_view({'get': 'stats'}), name='signal-stats'),
    path('cleanup/', SignalViewSet.as_view({'post': 'cleanup'}), name='signal-cleanup'),
    
    path('prediction-stats/', prediction_stats),
    path('resolve-predictions/', resolve_predictions),
    # Router must be last to catch everything else
    path('', include(router.urls)),
]