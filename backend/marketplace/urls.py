from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ProductDetailAPIView,
    ProductListCreateAPIView,
    SellerOrderListAPIView,
    add_to_cart_view,
    ai_search_view,
    category_list,
    cart_list_view,
    checkout_cart_view,
    create_order_view,
    login_view,
    logout_view,
    me_view,
    product_sku_list,
    register_view,
    remove_cart_item_view,
)

urlpatterns = [
    path('auth/register/', register_view, name='register'),
    path('auth/login/', login_view, name='login'),
    path('auth/me/', me_view, name='me'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', logout_view, name='logout'),
    path('products/', ProductListCreateAPIView.as_view(), name='product_list_create'),
    path('products/<int:pk>/', ProductDetailAPIView.as_view(), name='product_detail'),
    path('seller/orders/', SellerOrderListAPIView.as_view(), name='seller_orders'),
    path('orders/', create_order_view, name='create_order'),
    path('cart/', cart_list_view, name='cart_list'),
    path('cart/add/', add_to_cart_view, name='add_to_cart'),
    path('cart/<int:item_id>/', remove_cart_item_view, name='remove_cart_item'),
    path('cart/checkout/', checkout_cart_view, name='checkout_cart'),
    path('categories/', category_list, name='category_list'),
    path('products/<int:product_id>/skus/', product_sku_list, name='product_skus'),
    path('ai-search/', ai_search_view, name='ai_search'),
]
