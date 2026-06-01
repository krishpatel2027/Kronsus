from django.db import models
from django.conf import settings


class StockTransaction(models.Model):
    INBOUND = 'IN'
    OUTBOUND = 'OUT'
    ADJUST = 'ADJUST'
    TRANSACTION_TYPES = (
        (INBOUND, 'Stock In'),
        (OUTBOUND, 'Stock Out'),
        (ADJUST, 'Adjustment'),
    )

    company = models.ForeignKey('users.Company', on_delete=models.CASCADE, related_name='stock_transactions')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, related_name='transactions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_transactions')
    quantity = models.IntegerField()
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    timestamp = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    offline_id = models.CharField(max_length=255, blank=True, null=True, unique=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['product', 'transaction_type']),
            models.Index(fields=['transaction_type']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['company']),
        ]

    def __str__(self):
        return f"{self.get_transaction_type_display()} {self.quantity} of {self.product.name}"
