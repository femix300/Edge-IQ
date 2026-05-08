from django.urls import path
from .prediction_views import prediction_stats, resolve_predictions, manual_resolve_prediction, unresolve_all_predictions

urlpatterns = [
    path('stats/', prediction_stats),
    path('resolve/', resolve_predictions),
    path('manual-resolve/', manual_resolve_prediction),
    path('unresolve-all/', unresolve_all_predictions),
]
