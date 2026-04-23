import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, ChatMessage, Product } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html'
})
export class CustomerComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notificationService = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly activeTab = signal<'ai-stylist' | 'catalog'>('ai-stylist');
  readonly chatInput = signal('');
  readonly selectedCategory = signal<'all' | string>('all');
  readonly maxPrice = signal(1500);

  readonly messages = signal<ChatMessage[]>([]);
  readonly aiProducts = signal<Product[]>([]);
  readonly products = signal<Product[]>([]);
  readonly isLoading = signal(true);
  readonly categoryOptions = signal<string[]>(['all']);

  ngOnInit(): void {
    const initialView = this.route.snapshot.data['view'] === 'catalog' ? 'catalog' : 'ai-stylist';
    this.activeTab.set(initialView);
    this.loadData();
  }

  setActiveTab(tab: 'ai-stylist' | 'catalog'): void {
    this.activeTab.set(tab);
    this.router.navigateByUrl(tab === 'ai-stylist' ? '/customer/ai-stylist' : '/customer/catalog');
  }

  updateCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  updateMaxPrice(price: number): void {
    this.maxPrice.set(price);
  }

  sendChatMessage(): void {
    const message = this.chatInput().trim();
    if (!message) {
      return;
    }
    this.messages.update((current) => [...current, { role: 'user', content: message }]);
    this.chatInput.set('');
    this.api.aiSearch(message).subscribe({
      next: (response) => {
        this.aiProducts.set(response.products);
        const preview = response.products.slice(0, 3).map((item) => item.brand).join(', ');
        this.messages.update((current) => [
          ...current,
          {
            role: 'assistant',
            content: preview ? `Найдено: ${preview}. Откройте каталог для просмотра.` : 'По запросу пока нет совпадений.'
          }
        ]);
      },
      error: () => {
        this.messages.update((current) => [
          ...current,
          { role: 'assistant', content: 'Ошибка AI-поиска. Попробуйте уточнить запрос.' }
        ]);
      }
    });
  }

  placeOrder(productId: number): void {
    this.api.addToCart({ product: productId, quantity: 1 }).subscribe({
      next: () => {
        this.notificationService.show('Товар добавлен в корзину.');
      },
      error: () => this.notificationService.show('Не удалось добавить товар в корзину.')
    });
  }

  getFilteredProducts(): Product[] {
    return this.products().filter((product) => {
      const categoryMatch = this.selectedCategory() === 'all' || product.category === this.selectedCategory();
      const priceMatch = (product.numericPrice || 0) <= this.maxPrice();
      return categoryMatch && priceMatch;
    });
  }

  private loadData(): void {
    this.api.getChatMessages().subscribe({
      next: (messages) => this.messages.set(messages),
      error: () => this.notificationService.show('Не удалось загрузить диалог.')
    });

    this.api.getProducts().subscribe({
      next: (products) => {
        this.products.set(products);
        const categories = ['all', ...new Set(products.map((item) => item.category || 'Other'))];
        this.categoryOptions.set(categories);
        this.isLoading.set(false);
      },
      error: () => {
        this.notificationService.show('Каталог временно недоступен.');
        this.isLoading.set(false);
      }
    });

  }
}
