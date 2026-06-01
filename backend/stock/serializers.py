from rest_framework import serializers
from .models import StockTransaction


class StockTransactionSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = StockTransaction
        fields = [
            'id', 'company', 'product', 'product_name', 'product_sku', 'user',
            'quantity', 'transaction_type', 'timestamp', 'notes', 'offline_id'
        ]
        read_only_fields = ['company', 'user', 'timestamp']
