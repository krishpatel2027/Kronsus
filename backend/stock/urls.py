from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'transactions', views.StockTransactionViewSet, basename='transaction')

urlpatterns = [
    path('', include(router.urls)),
    path('stock/adjust/', views.stock_adjustment, name='stock-adjustment'),
    path('sync/push/', views.sync_push, name='sync-push'),
]
