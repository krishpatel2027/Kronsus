from django.db import models


class Product(models.Model):
    company = models.ForeignKey('users.Company', on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100)
    barcode = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True)
    current_stock = models.IntegerField(default=0)
    reorder_level = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('company', 'sku')

    def __str__(self):
        return f"{self.name} ({self.sku})"
