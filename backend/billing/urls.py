from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'subscription', views.SubscriptionViewSet, basename='subscription')

urlpatterns = [
    path('', include(router.urls)),
    path('webhooks/stripe/', views.SubscriptionViewSet.as_view({'post': 'stripe_webhook'}), name='stripe_webhook'),
]
