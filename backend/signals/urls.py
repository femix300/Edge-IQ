"""
URL routing for Signals API
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SignalViewSet

router = DefaultRouter()
router.register(r'', SignalViewSet, basename='signal')

urlpatterns = [
    path('', include(router.urls)),
]