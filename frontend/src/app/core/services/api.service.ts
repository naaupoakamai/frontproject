import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, delay, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  is_seller: boolean;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  is_seller: boolean;
}

export interface RegisterResponse {
  user: UserProfile;
  access: string;
  refresh: string;
}

export interface Product {
  id: number;
  brand: string;
  price: string;
  image: string;
  category?: string;
  size?: string;
  numericPrice?: number;
}

export interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

interface BackendProduct {
  id: number;
  seller?: UserProfile;
  category?: number;
  category_name?: string;
  title: string;
  description?: string;
  price: string;
}

interface AISearchResponse {
  query: string;
  matched_product_ids: number[];
  products: BackendProduct[];
}

export interface AISearchResult {
  query: string;
  products: Product[];
}

export interface Category {
  id: number;
  name: string;
  description: string;
}

export interface SellerOrder {
  id: number;
  buyer: UserProfile;
  product: number;
  product_title: string;
  quantity: number;
  status: string;
  total_price: string;
  created_at: string;
}

export interface CreateOrderRequest {
  product: number;
  quantity: number;
}

export interface CartItem {
  id: number;
  product: number;
  product_title: string;
  product_price: string;
  quantity: number;
  line_total: string;
  created_at: string;
}

export interface SellerProduct {
  id: number;
  title: string;
  description: string;
  category: number;
  category_name: string;
  price: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly fallbackImages = [
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=80'
  ];

  getChatMessages(): Observable<ChatMessage[]> {
    const fallbackMessages: ChatMessage[] = [
      { role: 'assistant', content: 'Опишите настроение и событие — подберу точные образы.' },
      { role: 'user', content: 'Нужен минималистичный total black для вечернего ужина.' },
      { role: 'assistant', content: 'Подбираю структурированные силуэты и чистые линии.' }
    ];

    return this.http
      .post<AISearchResponse>(`${this.baseUrl}/ai-search/`, {
        query: 'Нужен минималистичный черный образ для вечернего ужина.'
      })
      .pipe(
        map((response) => {
          const productsPreview = response.products.slice(0, 3).map((item) => item.title).join(', ');
          return [
            { role: 'assistant' as const, content: 'Опишите настроение и событие — подберу точные образы.' },
            { role: 'user' as const, content: response.query },
            {
              role: 'assistant' as const,
              content: productsPreview
                ? `Нашла релевантные позиции: ${productsPreview}.`
                : 'Пока нет точных совпадений, уточните детали образа.'
            }
          ];
        }),
        catchError(() => of(fallbackMessages).pipe(delay(300)))
    );
  }

  aiSearch(query: string): Observable<AISearchResult> {
    return this.http.post<AISearchResponse>(`${this.baseUrl}/ai-search/`, { query }).pipe(
      map((response) => ({
        query: response.query,
        products: response.products.map((product, index) => ({
          id: product.id,
          brand: product.title.toUpperCase(),
          price: `$${product.price}`,
          image: this.fallbackImages[index % this.fallbackImages.length],
          category: product.category_name || 'Other',
          numericPrice: Number(product.price)
        }))
      }))
    );
  }

  getProducts(): Observable<Product[]> {
    return this.http.get<BackendProduct[]>(`${this.baseUrl}/products/`).pipe(
      map((products) =>
        products.map((product, index) => ({
          id: product.id,
          brand: product.title.toUpperCase(),
          price: `$${product.price}`,
          image: this.fallbackImages[index % this.fallbackImages.length],
          category: product.category_name || ['Outerwear', 'Dresses', 'Knitwear'][index % 3],
          size: ['XS', 'S', 'M', 'L'][index % 4],
          numericPrice: Number(product.price)
        }))
      ),
      catchError(() =>
        of([
          { id: 1, brand: 'THE ROW', price: '$890', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80' },
          { id: 2, brand: 'JIL SANDER', price: '$620', image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80' },
          { id: 3, brand: 'TOTEME', price: '$540', image: 'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=900&q=80' },
          { id: 4, brand: 'LOEWE', price: '$760', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=80' }
        ]).pipe(delay(350))
      )
    );
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.baseUrl}/categories/`);
  }

  createProduct(payload: {
    category: number;
    title: string;
    brand: string;
    description: string;
    price: string;
  }): Observable<BackendProduct> {
    const normalizedPayload = {
      category: payload.category,
      title: `${payload.brand} ${payload.title}`.trim(),
      description: payload.description,
      price: payload.price
    };
    return this.http.post<BackendProduct>(`${this.baseUrl}/products/`, normalizedPayload);
  }

  getSellerProducts(userId: number): Observable<SellerProduct[]> {
    return this.http.get<BackendProduct[]>(`${this.baseUrl}/products/`).pipe(
      map((products) =>
        products
          .filter((product) => product.seller?.id === userId)
          .map((product) => ({
            id: product.id,
            title: product.title,
            description: product.description || '',
            category: product.category || 0,
            category_name: product.category_name || '',
            price: product.price
          }))
      )
    );
  }

  updateProduct(
    productId: number,
    payload: { category: number; title: string; brand: string; description: string; price: string }
  ): Observable<SellerProduct> {
    const normalizedPayload = {
      category: payload.category,
      title: `${payload.brand} ${payload.title}`.trim(),
      description: payload.description,
      price: payload.price
    };
    return this.http.patch<SellerProduct>(`${this.baseUrl}/products/${productId}/`, normalizedPayload);
  }

  deleteProduct(productId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/products/${productId}/`);
  }

  getSellerOrders(): Observable<SellerOrder[]> {
    return this.http.get<SellerOrder[]>(`${this.baseUrl}/seller/orders/`);
  }

  createOrder(payload: CreateOrderRequest): Observable<SellerOrder> {
    return this.http.post<SellerOrder>(`${this.baseUrl}/orders/`, payload);
  }

  getCartItems(): Observable<CartItem[]> {
    return this.http.get<CartItem[]>(`${this.baseUrl}/cart/`);
  }

  addToCart(payload: { product: number; quantity: number }): Observable<CartItem> {
    return this.http.post<CartItem>(`${this.baseUrl}/cart/add/`, payload);
  }

  removeFromCart(itemId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/cart/${itemId}/`);
  }

  checkoutCart(): Observable<SellerOrder[]> {
    return this.http.post<SellerOrder[]>(`${this.baseUrl}/cart/checkout/`, {});
  }
}
