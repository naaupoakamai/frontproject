from typing import Optional

from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models


class MarketplaceUserManager(UserManager):
    def create_seller(self, username: str, email: str, password: Optional[str] = None):
        user = self.create_user(username=username, email=email, password=password)
        user.is_seller = True
        user.save(update_fields=['is_seller'])
        return user


class User(AbstractUser):
    is_seller = models.BooleanField(default=False)

    objects = MarketplaceUserManager()


class Category(models.Model):
    name = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True)

    def __str__(self) -> str:
        return self.name


class Product(models.Model):
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    title = models.CharField(max_length=180)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.title


class SKU(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='skus')
    size = models.CharField(max_length=30)
    color = models.CharField(max_length=60)
    stock = models.PositiveIntegerField(default=0)

    def __str__(self) -> str:
        return f'{self.product.title} {self.size} {self.color}'


class Order(models.Model):
    class Status(models.TextChoices):
        NEW = 'new', 'New'
        PROCESSING = 'processing', 'Processing'
        SHIPPED = 'shipped', 'Shipped'

    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='orders')
    quantity = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f'Order #{self.id} - {self.product.title}'


class CartItem(models.Model):
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cart_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='cart_items')
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('buyer', 'product')

    def __str__(self) -> str:
        return f'Cart {self.buyer.username} - {self.product.title}'
