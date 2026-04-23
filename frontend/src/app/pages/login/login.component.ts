import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  readonly mode = signal<'login' | 'register'>('login');
  readonly isLoading = signal(false);
  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });
  readonly registerForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    is_seller: [false, [Validators.required]]
  });

  setMode(mode: 'login' | 'register'): void {
    this.mode.set(mode);
  }

  submit(): void {
    if (this.mode() === 'register') {
      this.register();
    } else {
      this.login();
    }
  }

  private login(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.notificationService.show('Введите корректные данные для входа.');
      return;
    }
    this.isLoading.set(true);
    this.authService.login(this.loginForm.getRawValue() as { email: string; password: string }).subscribe({
      next: ({ user }) => {
        this.notificationService.show('Добро пожаловать в BESPEAK.');
        this.router.navigateByUrl(user.is_seller ? '/seller/create' : '/customer/ai-stylist');
        this.isLoading.set(false);
      },
      error: (error: Error) => {
        this.notificationService.show(error.message || 'Ошибка авторизации.');
        this.isLoading.set(false);
      }
    });
  }

  private register(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.notificationService.show('Заполните все поля регистрации.');
      return;
    }

    this.isLoading.set(true);
    this.authService
      .register(
        this.registerForm.getRawValue() as {
          email: string;
          password: string;
          is_seller: boolean;
        }
      )
      .subscribe({
        next: ({ user }) => {
          this.notificationService.show('Аккаунт создан успешно.');
          this.router.navigateByUrl(user.is_seller ? '/seller/create' : '/customer/ai-stylist');
          this.isLoading.set(false);
        },
        error: (error: Error) => {
          this.notificationService.show(error.message || 'Ошибка регистрации.');
          this.isLoading.set(false);
        }
      });
  }
}
