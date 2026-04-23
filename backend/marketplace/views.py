import json
import os

from django.shortcuts import get_object_or_404
from openai import OpenAI
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CartItem, Category, Order, Product, SKU, User
from .permissions import IsSellerOwnerOrReadOnly
from .serializers import (
    AISearchRequestSerializer,
    AISearchResponseSerializer,
    AddToCartSerializer,
    CartItemSerializer,
    CategorySerializer,
    CreateOrderSerializer,
    LoginSerializer,
    OrderSerializer,
    ProductSerializer,
    RegisterSerializer,
    SKUSerializer,
    UserSerializer,
)


class ProductListCreateAPIView(APIView):
    permission_classes = [IsSellerOwnerOrReadOnly]

    def get(self, request):
        products = Product.objects.select_related('seller', 'category').prefetch_related('skus').all()
        return Response(ProductSerializer(products, many=True).data)

    def post(self, request):
        serializer = ProductSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(seller=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ProductDetailAPIView(APIView):
    permission_classes = [IsSellerOwnerOrReadOnly]

    def get_object(self, pk):
        return get_object_or_404(
            Product.objects.select_related('seller', 'category').prefetch_related('skus'),
            pk=pk,
        )

    def get(self, request, pk):
        product = self.get_object(pk)
        self.check_object_permissions(request, product)
        return Response(ProductSerializer(product).data)

    def put(self, request, pk):
        product = self.get_object(pk)
        self.check_object_permissions(request, product)
        serializer = ProductSerializer(product, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(seller=product.seller)
        return Response(serializer.data)

    def patch(self, request, pk):
        product = self.get_object(pk)
        self.check_object_permissions(request, product)
        serializer = ProductSerializer(product, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(seller=product.seller)
        return Response(serializer.data)

    def delete(self, request, pk):
        product = self.get_object(pk)
        self.check_object_permissions(request, product)
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SellerOrderListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_seller:
            return Response({'detail': 'Only sellers can view this endpoint.'}, status=status.HTTP_403_FORBIDDEN)

        orders = (
            Order.objects.select_related('buyer', 'product')
            .filter(product__seller=request.user)
            .order_by('-created_at')
        )
        return Response(OrderSerializer(orders, many=True).data)


@api_view(['GET'])
def category_list(request):
    categories = Category.objects.all()
    return Response(CategorySerializer(categories, many=True).data)


@api_view(['GET'])
def product_sku_list(request, product_id):
    skus = SKU.objects.filter(product_id=product_id)
    return Response(SKUSerializer(skus, many=True).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data['email']
    if User.objects.filter(email=email).exists():
        return Response({'detail': 'Email already exists.'}, status=status.HTTP_400_BAD_REQUEST)
    user = serializer.save()
    token_serializer = TokenObtainPairSerializer(data={'username': user.username, 'password': request.data['password']})
    token_serializer.is_valid(raise_exception=True)
    return Response(
        {
            'user': UserSerializer(user).data,
            'access': token_serializer.validated_data['access'],
            'refresh': token_serializer.validated_data['refresh'],
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = get_object_or_404(User, email=serializer.validated_data['email'])
    token_serializer = TokenObtainPairSerializer(
        data={'username': user.username, 'password': serializer.validated_data['password']}
    )
    token_serializer.is_valid(raise_exception=True)
    return Response(
        {
            'user': UserSerializer(user).data,
            'access': token_serializer.validated_data['access'],
            'refresh': token_serializer.validated_data['refresh'],
        }
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response(UserSerializer(request.user).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    refresh_token = request.data.get('refresh')
    if not refresh_token:
        return Response({'detail': 'Refresh token is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        token = RefreshToken(refresh_token)
        token.blacklist()
    except Exception:
        return Response({'detail': 'Invalid refresh token.'}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'detail': 'Logged out successfully.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order_view(request):
    if request.user.is_seller:
        return Response({'detail': 'Sellers cannot create purchase orders.'}, status=status.HTTP_403_FORBIDDEN)

    serializer = CreateOrderSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    product = get_object_or_404(Product, pk=serializer.validated_data['product'])
    quantity = serializer.validated_data['quantity']
    total_price = product.price * quantity
    order = Order.objects.create(
        buyer=request.user,
        product=product,
        quantity=quantity,
        total_price=total_price,
    )
    return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cart_list_view(request):
    if request.user.is_seller:
        return Response({'detail': 'Cart is only for buyers.'}, status=status.HTTP_403_FORBIDDEN)
    items = CartItem.objects.select_related('product').filter(buyer=request.user).order_by('-created_at')
    return Response(CartItemSerializer(items, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_to_cart_view(request):
    if request.user.is_seller:
        return Response({'detail': 'Cart is only for buyers.'}, status=status.HTTP_403_FORBIDDEN)
    serializer = AddToCartSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    product = get_object_or_404(Product, pk=serializer.validated_data['product'])
    quantity = serializer.validated_data['quantity']
    cart_item, created = CartItem.objects.get_or_create(
        buyer=request.user,
        product=product,
        defaults={'quantity': quantity},
    )
    if not created:
        cart_item.quantity += quantity
        cart_item.save(update_fields=['quantity'])
    return Response(CartItemSerializer(cart_item).data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_cart_item_view(request, item_id):
    if request.user.is_seller:
        return Response({'detail': 'Cart is only for buyers.'}, status=status.HTTP_403_FORBIDDEN)
    item = get_object_or_404(CartItem, pk=item_id, buyer=request.user)
    item.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def checkout_cart_view(request):
    if request.user.is_seller:
        return Response({'detail': 'Cart is only for buyers.'}, status=status.HTTP_403_FORBIDDEN)
    cart_items = CartItem.objects.select_related('product').filter(buyer=request.user)
    if not cart_items.exists():
        return Response({'detail': 'Cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)

    created_orders = []
    for cart_item in cart_items:
        order = Order.objects.create(
            buyer=request.user,
            product=cart_item.product,
            quantity=cart_item.quantity,
            total_price=cart_item.product.price * cart_item.quantity,
        )
        created_orders.append(order)

    cart_items.delete()
    return Response(OrderSerializer(created_orders, many=True).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_search_view(request):
    input_serializer = AISearchRequestSerializer(data=request.data)
    input_serializer.is_valid(raise_exception=True)
    query = input_serializer.validated_data['query']

    products = Product.objects.select_related('category').all()
    if not products:
        return Response({'query': query, 'matched_product_ids': [], 'products': []})

    catalog_text = '\n'.join(
        [
            f'ID:{product.id}; title:{product.title}; category:{product.category.name}; description:{product.description}; price:{product.price}'
            for product in products
        ]
    )

    matched_ids = _ask_openai_for_matches(query=query, catalog_text=catalog_text)
    matched_products = Product.objects.filter(id__in=matched_ids).select_related('seller', 'category').prefetch_related('skus')
    output_serializer = AISearchResponseSerializer(
        {'query': query, 'matched_product_ids': list(matched_products.values_list('id', flat=True))}
    )
    return Response({**output_serializer.data, 'products': ProductSerializer(matched_products, many=True).data})


def _ask_openai_for_matches(query: str, catalog_text: str) -> list[int]:
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        return _local_match_fallback(query, catalog_text)

    client = OpenAI(api_key=api_key)
    try:
        completion = client.chat.completions.create(
            model='gpt-4o',
            temperature=0.1,
            response_format={'type': 'json_object'},
            messages=[
                {
                    'role': 'system',
                    'content': 'Ты эксперт-стилист. Выбери лучшие товары из списка по запросу клиента.',
                },
                {
                    'role': 'user',
                    'content': (
                        f'Запрос клиента: {query}\n'
                        'Верни JSON строго вида {"matched_product_ids":[1,2,3]}.\n'
                        f'Список товаров:\n{catalog_text}'
                    ),
                },
            ],
        )
        content = completion.choices[0].message.content or '{}'
        parsed = json.loads(content)
        ids = parsed.get('matched_product_ids', [])
        return [int(item) for item in ids if str(item).isdigit()]
    except Exception:
        return _local_match_fallback(query, catalog_text)


def _local_match_fallback(query: str, catalog_text: str) -> list[int]:
    query_tokens = {token.lower() for token in query.split() if token.strip()}
    scored: list[tuple[int, int]] = []

    for line in catalog_text.split('\n'):
        if not line.strip():
            continue
        try:
            product_id_text = line.split(';')[0].replace('ID:', '').strip()
            product_id = int(product_id_text)
        except (ValueError, IndexError):
            continue

        line_lower = line.lower()
        score = sum(1 for token in query_tokens if token in line_lower)
        if score > 0:
            scored.append((product_id, score))

    scored.sort(key=lambda pair: pair[1], reverse=True)
    return [product_id for product_id, _ in scored[:8]]
