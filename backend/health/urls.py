from django.urls import path
from . import views

urlpatterns = [
    path('', views.health_check, name='health_check'),
    path('models/', views.list_models, name='list_models'),
]
