from rest_framework import serializers

from .models import CartItem, Category, Order, Product, SKU, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_seller']


class SKUSerializer(serializers.ModelSerializer):
    class Meta:
        model = SKU
        fields = ['id', 'size', 'color', 'stock']


class ProductSerializer(serializers.ModelSerializer):
    seller = UserSerializer(read_only=True)
    skus = SKUSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'seller',
            'category',
            'category_name',
            'title',
            'description',
            'price',
            'skus',
            'created_at',
            'updated_at',
        ]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description']


class AISearchRequestSerializer(serializers.Serializer):
    query = serializers.CharField(max_length=500)


class AISearchResponseSerializer(serializers.Serializer):
    query = serializers.CharField()
    matched_product_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=True)


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True)
    is_seller = serializers.BooleanField(default=False)
    username = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def create(self, validated_data):
        email = validated_data['email']
        base_username = validated_data.get('username') or email.split('@')[0]
        username = base_username
        suffix = 1
        while User.objects.filter(username=username).exists():
            suffix += 1
            username = f'{base_username}{suffix}'
        return User.objects.create_user(
            username=username,
            email=email,
            password=validated_data['password'],
            is_seller=validated_data['is_seller'],
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class OrderSerializer(serializers.ModelSerializer):
    buyer = UserSerializer(read_only=True)
    product_title = serializers.CharField(source='product.title', read_only=True)
    seller_id = serializers.IntegerField(source='product.seller_id', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'buyer', 'product', 'product_title', 'seller_id', 'quantity', 'status', 'total_price', 'created_at']


class CreateOrderSerializer(serializers.Serializer):
    product = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, default=1)


class CartItemSerializer(serializers.ModelSerializer):
    product_title = serializers.CharField(source='product.title', read_only=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_title', 'product_price', 'quantity', 'line_total', 'created_at']

    def get_line_total(self, obj):
        return obj.product.price * obj.quantity


class AddToCartSerializer(serializers.Serializer):
    product = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, default=1)
