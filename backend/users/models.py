from django.db import models
from django.contrib.auth.models import AbstractUser


class Company(models.Model):
    name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class User(AbstractUser):
    email = models.EmailField(unique=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='users', null=True, blank=True)
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True)
    subscription_status = models.CharField(
        max_length=20,
        default='inactive',
        choices=[('active', 'Active'), ('inactive', 'Inactive'), ('past_due', 'Past Due'), ('canceled', 'Canceled')]
    )
    stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.company})"
