import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, Category, SellerProduct } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-seller',
  imports: [ReactiveFormsModule],
  templateUrl: './seller.component.html'
})
export class SellerComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly activeTab = signal<'inventory' | 'create'>('inventory');
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly products = signal<SellerProduct[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly editingProductId = signal<number | null>(null);
  readonly salesMap = signal<Record<number, number>>({});

  readonly productForm = this.fb.group({
    category: [null as number | null, [Validators.required]],
    title: ['', [Validators.required, Validators.minLength(3)]],
    brand: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    price: ['', [Validators.required]]
  });

  ngOnInit(): void {
    const initialView = this.route.snapshot.data['view'] === 'create' ? 'create' : 'inventory';
    this.activeTab.set(initialView);
    this.loadDashboard();
  }

  setTab(tab: 'inventory' | 'create'): void {
    this.activeTab.set(tab);
    this.router.navigateByUrl(tab === 'create' ? '/seller/create' : '/seller/inventory');
  }

  createProduct(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      this.notificationService.show('Заполните форму создания товара корректно.');
      return;
    }

    this.isSubmitting.set(true);
    this.api
      .createProduct(
        this.productForm.getRawValue() as {
          category: number;
          title: string;
          brand: string;
          description: string;
          price: string;
        }
      )
      .subscribe({
        next: () => {
          this.notificationService.show('Карточка товара создана.');
          this.productForm.reset();
          this.loadDashboard();
          this.activeTab.set('inventory');
          this.isSubmitting.set(false);
        },
        error: (error: Error) => {
          this.notificationService.show(error.message || 'Не удалось создать товар.');
          this.isSubmitting.set(false);
        }
      });
  }

  startEdit(product: SellerProduct): void {
    const [brand, ...restTitle] = product.title.split(' ');
    this.editingProductId.set(product.id);
    this.productForm.patchValue({
      category: product.category,
      title: restTitle.join(' ') || product.title,
      brand: brand || '',
      description: product.description,
      price: product.price
    });
    this.activeTab.set('create');
  }

  saveEdit(): void {
    if (!this.editingProductId() || this.productForm.invalid) {
      this.notificationService.show('Проверьте форму редактирования.');
      return;
    }
    this.isSubmitting.set(true);
    this.api
      .updateProduct(
        this.editingProductId()!,
        this.productForm.getRawValue() as {
          category: number;
          title: string;
          brand: string;
          description: string;
          price: string;
        }
      )
      .subscribe({
        next: () => {
          this.notificationService.show('Товар обновлен.');
          this.cancelEdit();
          this.loadDashboard();
          this.isSubmitting.set(false);
        },
        error: (error: Error) => {
          this.notificationService.show(error.message || 'Ошибка обновления товара.');
          this.isSubmitting.set(false);
        }
      });
  }

  deleteProduct(productId: number): void {
    this.api.deleteProduct(productId).subscribe({
      next: () => {
        this.notificationService.show('Товар удален.');
        this.loadDashboard();
      },
      error: (error: Error) => this.notificationService.show(error.message || 'Не удалось удалить товар.')
    });
  }

  cancelEdit(): void {
    this.editingProductId.set(null);
    this.productForm.reset();
  }

  private loadDashboard(): void {
    this.isLoading.set(true);
    this.api.getCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.notificationService.show('Не удалось загрузить категории.')
    });
    const currentUser = this.authService.getUser();
    const userId = currentUser?.id || 0;
    this.api.getSellerProducts(userId).subscribe({
      next: (products) => {
        this.products.set(products);
        this.api.getSellerOrders().subscribe({
          next: (orders) => {
            const map: Record<number, number> = {};
            for (const order of orders) {
              map[order.product] = (map[order.product] || 0) + order.quantity;
            }
            this.salesMap.set(map);
            this.isLoading.set(false);
          },
          error: () => {
            this.salesMap.set({});
            this.isLoading.set(false);
          }
        });
      },
      error: () => {
        this.notificationService.show('Не удалось загрузить inventory.');
        this.isLoading.set(false);
      }
    });
  }
}
