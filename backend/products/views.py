from rest_framework import viewsets, permissions
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from .models import Product
from .serializers import ProductSerializer
from users.permissions import IsCompanyMember, HasActiveSubscription


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember, HasActiveSubscription]
    pagination_class = StandardResultsSetPagination
    serializer_class = ProductSerializer

    def get_queryset(self):
        queryset = Product.objects.filter(company=self.request.user.company)

        search = self.request.query_params.get('search', None)
        if search is not None:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(sku__icontains=search)
            )

        return queryset

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)
