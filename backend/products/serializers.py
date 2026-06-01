from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'company', 'name', 'sku', 'barcode', 'description', 'current_stock', 'reorder_level', 'created_at']
        read_only_fields = ['company', 'created_at']
