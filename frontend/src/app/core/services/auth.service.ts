import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'bespeak_jwt';
const REFRESH_TOKEN_KEY = 'bespeak_jwt_refresh';
const USER_KEY = 'bespeak_user';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  is_seller: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  is_seller: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  access: string;
  refresh: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  setRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setUser(user: AuthUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  getUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }

  isSeller(): boolean {
    return Boolean(this.getUser()?.is_seller);
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/register/`, payload).pipe(
      tap((response) => {
        this.setToken(response.access);
        this.setRefreshToken(response.refresh);
        this.setUser(response.user);
      })
    );
  }

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login/`, payload).pipe(
      tap((response) => {
        this.setToken(response.access);
        this.setRefreshToken(response.refresh);
        this.setUser(response.user);
      })
    );
  }

  logoutRequest(): Observable<{ detail: string }> {
    const refresh = this.getRefreshToken();
    return this.http.post<{ detail: string }>(`${this.baseUrl}/auth/logout/`, { refresh });
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  isAuthenticated(): boolean {
    return Boolean(this.getToken());
  }
}
