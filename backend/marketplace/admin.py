from django.contrib import admin

from .models import CartItem, Category, Order, Product, SKU, User

admin.site.register(User)
admin.site.register(Category)
admin.site.register(Product)
admin.site.register(SKU)
admin.site.register(Order)
admin.site.register(CartItem)
